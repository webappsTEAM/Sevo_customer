"""
service_requests/services/logistics_pricing.py

Server-side fare integrity for Goods Transport / Packers & Movers bookings.

The three logistics booking pages (Mini Truck, Two Wheeler, Packers &
Movers) compute a fare client-side for display, but per
GOODS_AND_TRANSPORT_IMPLEMENTATION_PLAN.md (Phase 3), the value that
actually gets recorded as `ServiceRequest.total_amount` must come from the
server's own `logistics.ServiceTier` / `logistics.Lane` records — a
client-submitted amount for these categories is never trusted outright.

Business logic on purpose lives here, not in BookingCreateView — CLAUDE.md:
"Business logic: NEVER in views — always in a service function."
"""

import hashlib
import logging
import uuid
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

LOGISTICS_CATEGORIES = {
    "goods_transport_truck",
    "goods_transport_two_wheeler",
    "packers_movers",
    # The bare slug was missing here and present in all three of the other
    # logistics category sets -- the vendor's LOGISTICS_SERVICE_CATEGORIES,
    # this app's LOGISTICS_STOP_CATEGORIES (the multi-stop trip editor's
    # gate) and vendor_views' copy. It is a live value, not a legacy one:
    # it has its own "GT" request-id prefix in models.py and the generic
    # booking page emits it as a category slug.
    #
    # Being absent HERE specifically meant resolve_logistics_fare returned
    # the submitted amount unchanged for those bookings -- so a
    # goods_transport booking was priced by whatever the client sent, while
    # the vendor side treated the same booking as logistics for dispatch,
    # legs and stops. This set is the one that decides whether a client
    # total is trusted, which made it the worst of the four to be missing
    # from.
    #
    # Deliberately NOT added to DISTANCE_PRICED_CATEGORIES below: the bare
    # slug does not say whether the trip is a truck or a two-wheeler, so
    # there is no tier category to validate it against. It resolves through
    # the flat lane/tier lookup, or raises UnresolvedLogisticsFareError and
    # gets a clean 400 -- never a trusted client amount.
    "goods_transport",
}

# GT-B-01: which categories get real distance-based pricing.
# Packers & Movers is excluded from DISTANCE_PRICED_CATEGORIES because
# it is volume/inventory/crew-based.
# P&M supports instant authoritative estimates when all required
# catalog, vehicle, city configuration and routing inputs are available.
# Moves requiring survey/review remain non-payable estimates until final
# quotation. Dedicated logic is implemented in packers_movers_pricing.py.
DISTANCE_PRICED_CATEGORIES = {
    "goods_transport_truck",
    "goods_transport_two_wheeler",
}

# Standard trip shape the additional-stop charge is measured against:
# one pickup + one drop. H.1: "additional_stop_charge x (stops - 2)".
STANDARD_STOP_COUNT = 2

# The booking's service_category and the catalogue's LogisticsCategory are
# two different vocabularies for the same thing, and nothing was checking
# they agreed. A tier id is just a number in the request body, so a caller
# could ask for a `goods_transport_truck` booking while naming a
# two_wheeler tier and be charged the scooter fare for a truck -- the
# customer picks the price by picking the tier, and the price was never
# checked against what was actually being booked.
SERVICE_CATEGORY_TO_TIER_CATEGORY = {
    "goods_transport_truck": "truck",
    "goods_transport_two_wheeler": "two_wheeler",
    "packers_movers": "packers_movers",
}


class UnresolvedLogisticsFareError(Exception):
    """
    Fixes GT-B-01: raised instead of silently trusting submitted_amount when
    a logistics booking has neither a resolvable Lane nor ServiceTier. The
    caller (BookingCreateView) is expected to catch this and return a 400
    telling the customer to pick a valid route/tier, rather than recording
    an unverified, client-supplied price.
    """
    pass


class LogisticsCatalogMismatchError(UnresolvedLogisticsFareError):
    """
    The tier or lane named does not belong to the category being booked, or
    is no longer active.

    Subclasses UnresolvedLogisticsFareError deliberately: every caller
    already handles that by refusing the booking with "pick a valid
    route/tier", which is exactly the right outcome here too. Callers that
    want to say something more specific can catch this first.
    """
    pass


def expected_tier_category(service_category):
    """The catalogue category a booking of `service_category` must use."""
    return SERVICE_CATEGORY_TO_TIER_CATEGORY.get((service_category or "").strip())


def assert_catalog_matches_category(service_category, *, tier=None, lane=None):
    """
    Raise unless every catalogue record supplied belongs to this booking's
    category and is still active.

    Checked for tiers AND lanes: a lane carries a flat fare and the same
    category column, so the same substitution works there.

    Silent on a category this mapping doesn't know: non-logistics bookings
    never reach the fare resolver's logistics branch, and a new logistics
    category should fail by being added here, not by being rejected in
    production before anyone notices.
    """
    expected = expected_tier_category(service_category)
    if expected is None:
        return

    for label, obj in (("tier", tier), ("lane", lane)):
        if obj is None:
            continue
        actual = getattr(obj, "category", None)
        if actual is None:
            # The object does not model a category at all, so there is
            # nothing to compare. Real ServiceTier/Lane instances always
            # carry one -- both the quote endpoint and the booking
            # serializer resolve them from the database by primary key -- so
            # this only exempts duck-typed stand-ins, never a live record.
            # A record with the attribute present but EMPTY is still
            # refused below.
            continue
        actual = (actual or "").strip()
        if actual != expected:
            raise LogisticsCatalogMismatchError(
                f"The selected {label} is a '{actual}' {label}, but this booking is "
                f"'{service_category}' (expects '{expected}')."
            )
        if not getattr(obj, "is_active", True):
            raise LogisticsCatalogMismatchError(
                f"The selected {label} is no longer available."
            )

_PAISE = Decimal("0.01")


def _money(value):
    """Quantise to 2dp with half-up rounding -- money, never float."""
    return Decimal(value).quantize(_PAISE, rounding=ROUND_HALF_UP)


def resolve_logistics_fare(*, service_category, logistics_tier, logistics_lane, submitted_amount):
    """
    Returns the fare that should actually be recorded on the ServiceRequest.

    - Not a logistics booking (service_category not in LOGISTICS_CATEGORIES)
      → submitted_amount passes through unchanged; this function only
      governs the three logistics categories.
    - Logistics booking with a resolvable `Lane` → the lane's fare wins.
      A lane (a specific route) is the more specific selection when both
      are present, so it takes priority over the tier's generic starting
      price.
    - Logistics booking with only a resolvable `ServiceTier` → the tier's
      starting_price wins.
    - Logistics booking with neither → raises UnresolvedLogisticsFareError.
      Previously this fell back to trusting submitted_amount outright; this
      is exactly the client-trusted-price gap the payment fixes elsewhere
      in this pass (HS-C-01) closed for the payment-verification path, so
      the same standard applies here now that logistics bookings are a live
      feature rather than an MVP slice with unreliable tier/lane data.
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return submitted_amount

    # Before reading a price off either record, confirm it is a record this
    # booking is entitled to price from. Without this, the tier/lane id in
    # the request body chooses the fare with nothing checking it belongs to
    # the category being booked.
    assert_catalog_matches_category(
        service_category, tier=logistics_tier, lane=logistics_lane
    )

    if logistics_lane is not None:
        return logistics_lane.fare
    if logistics_tier is not None:
        return logistics_tier.starting_price
    raise UnresolvedLogisticsFareError(
        f"Cannot verify a fare for '{service_category}' without a resolvable logistics tier or lane."
    )


class LogisticsFareBreakdown(dict):
    """
    The itemised result of quote_logistics_fare().

    A plain dict subclass so it serialises straight to JSON for the quote
    endpoint and can be snapshotted onto the booking, but named so its
    role is obvious at call sites. Keys:

        total               Decimal -- the fare to charge
        base_fare           Decimal
        distance_km         Decimal -- what was actually charged for
        chargeable_km       Decimal -- distance_km minus free_km, floored at 0
        distance_charge     Decimal
        loading_unloading   Decimal
        additional_stops    int
        additional_stop_charge  Decimal
        subtotal            Decimal -- before surge
        surge_multiplier    Decimal
        minimum_fare_applied  bool -- whether the floor actually bit
        rate_per_km         Decimal -- the per-km rate this quote used
        rate_additional_stop  Decimal -- the per-stop rate this quote used
        rate_minimum_fare   Decimal|None -- the floor this quote used
        free_km             Decimal -- the allowance this quote used
        distance_source     str -- "google_maps" | "straight_line_estimate"
        currency            str
        vehicle_class       str -- ServiceTier.VehicleClass at quote time
                            (two_wheeler/three_wheeler/truck/pickup/heavy_truck)
        weight_class        str -- ServiceTier.WeightClass at quote time
                            (light/heavy, blank where not applicable)

    The four `rate_*`/`free_km` keys exist so that reconciliation can
    re-price a delivered trip entirely from the quote, without reading the
    tier again. A tier's rates are administrator-editable; a booking's
    are not.

    GT audit Update 14: vehicle_class/weight_class exist for the same
    reason -- the purchased tier's vehicle classification must not be
    reconstructed later from the (mutable, admin-editable) ServiceTier row,
    since that could change after the booking was made. Snapshotting it
    here, alongside the rate fields that already follow this rule, is what
    lets the Vendor-side dispatch engine (automatic_dispatch.py) validate
    the ACTUAL purchased requirement instead of only the coarse
    service_category string it used before this fix.
    """


def tier_display_starting_fare(tier):
    """
    The lowest fare a customer can actually be quoted on this tier -- what a
    "Starting from" card should say.

    A distance-priced tier (per_km_rate set) is quoted by quote_logistics_fare
    from base_fare (falling back to starting_price), loading/unloading and the
    surge multiplier, then floored at minimum_fare. starting_price is only a
    mirror of the Package base price and is NOT what that formula reads once
    base_fare is set, so showing it can advertise a fare no quote will ever
    produce. This runs the same steps for a zero-chargeable-km, standard
    two-stop, no-cargo trip -- the cheapest booking that exists.

    A flat tier (per_km_rate unset) is priced straight off starting_price by
    resolve_logistics_fare, so that value is already the truth.
    """
    if getattr(tier, "per_km_rate", None) is None:
        return _money(tier.starting_price)
    base_fare = getattr(tier, "base_fare", None)
    if base_fare is None:
        base_fare = tier.starting_price
    subtotal = _money(base_fare) + _money(getattr(tier, "loading_unloading_charge", 0) or 0)
    surge = getattr(tier, "surge_multiplier", None)
    surge = _money(surge) if surge is not None else Decimal("1.00")
    if surge <= 0:
        surge = Decimal("1.00")
    total = _money(subtotal * surge)
    minimum_fare = getattr(tier, "minimum_fare", None)
    if minimum_fare is not None and total < _money(minimum_fare):
        total = _money(minimum_fare)
    return total


def quote_logistics_fare(
    *,
    tier,
    pickup_lat,
    pickup_lng,
    drop_lat,
    drop_lng,
    stop_count=STANDARD_STOP_COUNT,
    cargo_summary=None,
    waypoints=None,
):
    """
    Compute a real, itemised, distance-based fare for one goods-transport
    booking, per sevo_PHASE_14 H.1. Supports multi-stop ordered routes
    via waypoints=[(lat, lng), ...].
    """
    if tier is None:
        return None
    per_km_rate = getattr(tier, "per_km_rate", None)
    if per_km_rate is None:
        return None
    if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
        return None

    from .routing import get_route_eta

    if waypoints and isinstance(waypoints, list) and len(waypoints) > 0:
        points = [(pickup_lat, pickup_lng)]
        for wp in waypoints:
            if isinstance(wp, dict) and str(wp.get("stop_type", "")).upper() in ("PICKUP", "DROP"):
                continue
            if isinstance(wp, (list, tuple)) and len(wp) >= 2:
                points.append((wp[0], wp[1]))
            elif isinstance(wp, dict) and "lat" in wp and "lng" in wp:
                points.append((wp["lat"], wp["lng"]))
            elif isinstance(wp, dict) and "latitude" in wp and "longitude" in wp:
                points.append((wp["latitude"], wp["longitude"]))
        points.append((drop_lat, drop_lng))

        total_distance = Decimal("0.00")
        total_duration = 0
        all_sources = []
        for i in range(len(points) - 1):
            p1 = points[i]
            p2 = points[i + 1]
            leg = get_route_eta(p1[0], p1[1], p2[0], p2[1])
            if leg is None:
                return None
            total_distance += _money(str(leg["distance_km"]))
            total_duration += leg.get("duration_seconds", 0)
            all_sources.append(leg.get("source"))

        overall_source = "google_maps" if all(s == "google_maps" for s in all_sources) else "straight_line_estimate"
        route = {
            "distance_km": float(total_distance),
            "duration_seconds": total_duration,
            "source": overall_source,
        }
        # Bug found: this only corrected stop_count UP to match the actual
        # routed waypoints (points, built from the real `waypoints` argument
        # a few lines above -- the authoritative list once we're in this
        # multi-stop branch), never down. A caller-supplied stop_count
        # greater than the real waypoint count stayed inflated, so
        # additional_stop_charge below could bill for stops that were never
        # actually routed. points is authoritative here; always sync to it.
        stop_count = len(points)
    else:
        route = get_route_eta(pickup_lat, pickup_lng, drop_lat, drop_lng)
        if route is None:
            return None

    distance_km = _money(str(route["distance_km"]))
    free_km = _money(getattr(tier, "free_km", 0) or 0)
    chargeable_km = distance_km - free_km
    if chargeable_km < 0:
        chargeable_km = Decimal("0.00")

    base_fare = getattr(tier, "base_fare", None)
    if base_fare is None:
        base_fare = tier.starting_price
    base_fare = _money(base_fare)

    distance_charge = _money(chargeable_km * _money(per_km_rate))
    loading = _money(getattr(tier, "loading_unloading_charge", 0) or 0)

    try:
        stops = int(stop_count)
    except (TypeError, ValueError):
        stops = STANDARD_STOP_COUNT
    additional_stops = max(0, stops - STANDARD_STOP_COUNT)
    per_stop = _money(getattr(tier, "additional_stop_charge", 0) or 0)
    stop_charge = _money(per_stop * additional_stops)

    special_handling = Decimal("0.00")
    is_cargo_fit = True
    cargo_fit_reason = "Cargo fits safely within vehicle capacity."
    if cargo_summary:
        from .cargo_fitment import evaluate_vehicle_fitment
        is_cargo_fit, cargo_fit_reason = evaluate_vehicle_fitment(tier, cargo_summary)
        special_handling = _money(cargo_summary.get("special_handling_charge", 0) or 0)

    subtotal = _money(base_fare + distance_charge + loading + stop_charge + special_handling)

    surge = getattr(tier, "surge_multiplier", None)
    surge = _money(surge) if surge is not None else Decimal("1.00")
    if surge <= 0:
        surge = Decimal("1.00")
    total = _money(subtotal * surge)

    minimum_fare = getattr(tier, "minimum_fare", None)
    minimum_applied = False
    if minimum_fare is not None:
        minimum_fare = _money(minimum_fare)
        if total < minimum_fare:
            total = minimum_fare
            minimum_applied = True

    source = route.get("source")
    is_authoritative = (source == "google_maps")
    is_estimate = not is_authoritative
    estimate_notice = (
        "Road routing unavailable; this fare is an estimate based on straight-line distance and is subject to actual road distance verification."
        if is_estimate else None
    )

    now = timezone.now()
    created_at = now.isoformat()
    expires_at = (now + timedelta(minutes=15)).isoformat()
    quote_id = f"gtq_{uuid.uuid4().hex[:16]}"

    # Canonicalize waypoints for cryptographic quote binding
    canonical_waypoints = []
    if waypoints and isinstance(waypoints, list):
        for wp in waypoints:
            if isinstance(wp, (list, tuple)) and len(wp) >= 2:
                canonical_waypoints.append((round(float(wp[0]), 5), round(float(wp[1]), 5)))
            elif isinstance(wp, dict) and ("lat" in wp or "latitude" in wp):
                w_lat = wp.get("lat") if "lat" in wp else wp.get("latitude")
                w_lng = wp.get("lng") if "lng" in wp else wp.get("longitude")
                if w_lat is not None and w_lng is not None:
                    canonical_waypoints.append((round(float(w_lat), 5), round(float(w_lng), 5)))

    # Canonicalize cargo summary binding server-authoritative GoodsItem attributes
    cargo_hash_str = ""
    if cargo_summary and isinstance(cargo_summary, dict):
        items = cargo_summary.get("items") or []
        items_sorted = sorted(
            [
                f"{it.get('item_id')}:{it.get('item_slug')}:{it.get('quantity')}:"
                f"{it.get('unit_cft')}:{it.get('unit_weight_kg')}:{int(bool(it.get('is_fragile')))}:"
                f"{int(bool(it.get('requires_special_handling')))}:{it.get('special_handling_charge')}:"
                f"{int(bool(it.get('is_two_wheeler_compatible', True)))}"
                for it in items if isinstance(it, dict)
            ]
        )
        cargo_hash_str = ";".join(items_sorted)

    canonical_route_str = f"{round(float(pickup_lat), 5)},{round(float(pickup_lng), 5)}->{round(float(drop_lat), 5)},{round(float(drop_lng), 5)}"
    wp_str = ";".join(f"{p[0]},{p[1]}" for p in canonical_waypoints)
    raw_hash_str = f"{getattr(tier, 'id', '')}:{canonical_route_str}:{wp_str}:{cargo_hash_str}:{chargeable_km}:{total}:{stops}"
    quote_hash = hashlib.sha256(raw_hash_str.encode("utf-8")).hexdigest()[:16]

    cached_data = {
        "quote_id": quote_id,
        "quote_hash": quote_hash,
        "total": str(total),
        "tier_id": getattr(tier, "id", None),
        "tier_name": getattr(tier, "name", ""),
        "tier_slug": getattr(tier, "slug", ""),
        "vehicle_class": getattr(tier, "vehicle_class", "") or "",
        "weight_class": getattr(tier, "weight_class", "") or "",
        "pickup_lat": float(pickup_lat) if pickup_lat is not None else None,
        "pickup_lng": float(pickup_lng) if pickup_lng is not None else None,
        "drop_lat": float(drop_lat) if drop_lat is not None else None,
        "drop_lng": float(drop_lng) if drop_lng is not None else None,
        "waypoints": canonical_waypoints,
        "created_at": created_at,
        "expires_at": expires_at,
        "distance_km": str(distance_km),
        "chargeable_km": str(chargeable_km),
        "stops": stops,
        "cargo_hash": cargo_hash_str,
    }

    breakdown = LogisticsFareBreakdown(
        quote_id=quote_id,
        quote_hash=quote_hash,
        created_at=created_at,
        quoted_at=created_at,
        expires_at=expires_at,
        tier_id=getattr(tier, "id", None),
        tier_name=getattr(tier, "name", ""),
        vehicle_class=getattr(tier, "vehicle_class", "") or "",
        weight_class=getattr(tier, "weight_class", "") or "",
        pickup_lat=str(pickup_lat) if pickup_lat is not None else None,
        pickup_lng=str(pickup_lng) if pickup_lng is not None else None,
        drop_lat=str(drop_lat) if drop_lat is not None else None,
        drop_lng=str(drop_lng) if drop_lng is not None else None,
        total=total,
        base_fare=base_fare,
        distance_km=distance_km,
        chargeable_km=chargeable_km,
        distance_charge=distance_charge,
        loading_unloading=loading,
        stops=stops,
        additional_stops=additional_stops,
        additional_stop_charge=stop_charge,
        special_handling=special_handling,
        special_handling_charge=special_handling,
        is_cargo_fit=is_cargo_fit,
        cargo_fit_reason=cargo_fit_reason,
        cargo_summary=cargo_summary,
        subtotal=subtotal,
        surge_multiplier=surge,
        minimum_fare_applied=minimum_applied,
        rate_per_km=_money(per_km_rate),
        rate_additional_stop=per_stop,
        rate_minimum_fare=_money(minimum_fare) if minimum_fare is not None else None,
        free_km=free_km,
        distance_source=source,
        is_authoritative=is_authoritative,
        is_estimate=is_estimate,
        estimate_notice=estimate_notice,
        currency=getattr(tier, "currency", "INR") or "INR",
    )
    cached_data["breakdown"] = dict(breakdown)
    try:
        cache.set(f"gt_quote_{quote_id}", cached_data, timeout=900)
    except Exception as cache_err:
        logger.warning("Could not cache logistics quote %s: %s", quote_id, cache_err)

    return breakdown


# GT audit Update 18 -- which vehicle classes a booking can actually be
# fulfilled with.
#
# Mirrored here rather than imported: the Vendor app is a separate Django
# project sharing only a database, exactly as with the rank tables in its
# automatic_dispatch.py. This set is the Customer-side statement of the
# Vendor's _EMPLOYEE_VEHICLE_TYPE_RANK keys -- the vehicle types a
# technician can actually have on file.
#
# ServiceTier.VehicleClass also offers "heavy_truck", and Vendor's
# Vehicle.VehicleType has no member that satisfies it: no rank, no
# equivalence, nothing. A heavy_truck booking would be accepted, charged,
# and then never dispatchable to anyone. Inventing a mapping (equating it
# with "truck", say) would mean a customer who paid for a heavy truck gets
# a smaller vehicle, which is the precise failure the compatibility work
# exists to prevent. So it is refused at booking time instead.
#
# If a heavy-truck fleet is onboarded later, the fix is to add the vehicle
# type on the Vendor side and add it here -- not to widen an equivalence.
DISPATCHABLE_VEHICLE_CLASSES = {
    "two_wheeler",
    "three_wheeler",
    "pickup",
    "truck",
}

# The goods-transport categories whose compatibility is decided by vehicle
# CLASS. Packers & Movers is deliberately absent: its tiers are relocation
# packages (1BHK, Villa) that legitimately carry no vehicle_class, and its
# compatibility runs on payload_kg instead -- see packers_movers_pricing.
_CLASS_CLASSIFIED_CATEGORIES = {
    "goods_transport_truck",
    "goods_transport_two_wheeler",
    "goods_transport",
}


def assert_gt_booking_is_classifiable(service_category, tier):
    """
    GT audit Update 18 -- a new goods-transport booking must know which
    vehicle it needs before it can be taken.

    Two ways a booking could previously reach the Vendor side with nothing
    to dispatch against:

      1. Lane-only. A Lane models a route and a fare; it has no tier, no
         vehicle and no class. A booking carrying only a lane left the
         Vendor's Gate 3 with no vehicle_class to enforce, so the
         fine-grained compatibility check skipped and any vehicle in the
         coarse category bucket could take the job. Resolving a lane to
         "some" tier would be inventing a vehicle the customer never chose,
         so the booking is refused instead and the customer picks a vehicle.

      2. A tier whose vehicle_class is blank, or is a class no vendor
         vehicle can satisfy (see DISPATCHABLE_VEHICLE_CLASSES).

    Fails CLOSED in both cases, and only for NEW bookings -- this runs in
    the booking-time fare resolver, so bookings already in the database are
    untouched and keep their existing backward-compatible handling on the
    Vendor side.
    """
    if service_category not in _CLASS_CLASSIFIED_CATEGORIES:
        return

    if tier is None:
        raise UnresolvedLogisticsFareError(
            "Please choose a vehicle for this trip. A goods-transport booking "
            "has to record which vehicle class it needs before it can be "
            "assigned to a driver."
        )

    vehicle_class = str(getattr(tier, "vehicle_class", "") or "").strip().lower()
    if not vehicle_class:
        raise UnresolvedLogisticsFareError(
            f"The selected vehicle ('{getattr(tier, 'name', '')}') has no vehicle "
            "classification configured, so this booking could not be matched to a "
            "driver. Please choose another vehicle or contact support."
        )

    if vehicle_class not in DISPATCHABLE_VEHICLE_CLASSES:
        raise UnresolvedLogisticsFareError(
            f"'{getattr(tier, 'name', '') or vehicle_class}' is not available for "
            "booking right now -- no driver currently operates a vehicle of this "
            "class, so the trip could not be fulfilled. Please choose another "
            "vehicle."
        )


def classification_only_snapshot(*, service_category, tier, total, source):
    """
    GT audit Update 16 -- the classification-only fare snapshot.

    quote_logistics_fare() returns a full LogisticsFareBreakdown, which
    since Update 14 carries the purchased tier's vehicle_class/weight_class
    so the Vendor dispatch engine can validate the ACTUAL purchased
    requirement instead of only the coarse service_category string.

    But two live goods-transport paths never reach that function and
    previously returned a bare fare with NO breakdown at all:

      1. a distance-priced tier whose route could not be measured (no
         coordinates, or the routing provider returned nothing) where a
         configured Lane fare exists, and
      2. a goods-transport tier that is not distance-priced at all
         (per_km_rate unset), plus the bare "goods_transport" slug, which
         resolve through the flat lane/tier lookup at the bottom of
         resolve_logistics_fare_v2().

    A booking made through either path was written to the database with an
    empty fare_breakdown, so the Vendor side's fine-grained Gate 3 check
    found no vehicle_class key and -- by its documented
    do-not-strand-legacy-bookings rule -- silently skipped, leaving only
    the coarse category check. That made the Update 14/15 fix bypassable by
    booking a configured route rather than a measured trip.

    This returns the SAME immutable classification keys the full breakdown
    carries, for the flat-priced paths, WITHOUT inventing any pricing: the
    total is the fare the existing resolvers already decided, and the
    classification is copied off the tier that was actually purchased, at
    purchase time.

    Returns None when no ServiceTier is in scope (a lane-only booking).
    There is no vehicle classification anywhere in the system for such a
    booking -- Lane models a route and a fare, not a vehicle -- so this
    fabricates nothing; see the audit notes for that residual.
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return None
    if tier is None:
        return None
    vehicle_class = getattr(tier, "vehicle_class", "") or ""
    weight_class = getattr(tier, "weight_class", "") or ""
    if not vehicle_class:
        # The tier exists but carries no classification. Returning a
        # snapshot with an empty vehicle_class would be indistinguishable
        # from "absent" to the Vendor gate, so return None and let the
        # pre-existing coarse check stand, exactly as before this fix --
        # never a fabricated class.
        return None
    return LogisticsFareBreakdown(
        total=total,
        vehicle_class=vehicle_class,
        weight_class=weight_class,
        tier_id=getattr(tier, "id", None),
        capacity_label=getattr(tier, "capacity_label", "") or "",
        pricing_mode=source,
        distance_source=source,
        currency=getattr(tier, "currency", "INR") or "INR",
    )


def resolve_logistics_fare_v2(
    *,
    service_category,
    logistics_tier,
    logistics_lane,
    submitted_amount,
    pickup_lat=None,
    pickup_lng=None,
    drop_lat=None,
    drop_lng=None,
    stop_count=STANDARD_STOP_COUNT,
    cart_data=None,
    waypoints=None,
):
    """
    GT-B-01. Returns (fare, breakdown_or_None).
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return submitted_amount, None

    assert_catalog_matches_category(
        service_category, tier=logistics_tier, lane=logistics_lane
    )
    # Update 18: refuse a new goods-transport booking that could not be
    # dispatched to anyone. Runs before any pricing so a refused booking
    # never produces a fare, and before the flat paths too, which is where
    # the lane-only case lives.
    assert_gt_booking_is_classifiable(service_category, logistics_tier)

    if service_category in DISTANCE_PRICED_CATEGORIES:
        submitted_quote_id = None
        submitted_quote_hash = None
        submitted_expires_at = None
        cargo_summary = None
        extracted_waypoints = waypoints
        if cart_data:
            from .cargo_fitment import resolve_cargo_payload
            raw_items = []
            goods_type = None
            if isinstance(cart_data, list) and len(cart_data) > 0:
                first = cart_data[0] if isinstance(cart_data[0], dict) else {}
                submitted_quote_id = first.get("quote_id")
                submitted_quote_hash = first.get("quote_hash")
                submitted_expires_at = first.get("expires_at")
                if "cargo_items" in first or "items" in first or "goods_type" in first:
                    raw_items = first.get("cargo_items") or first.get("items") or []
                    goods_type = first.get("goods_type") or first.get("category")
                elif any("item_id" in it or "item_slug" in it or "slug" in it for it in cart_data if isinstance(it, dict)):
                    raw_items = cart_data
                    goods_type = first.get("goods_type") or first.get("category")
                if not extracted_waypoints:
                    extracted_waypoints = first.get("waypoints") or first.get("stops") or first.get("trip_stops")
            elif isinstance(cart_data, dict):
                submitted_quote_id = cart_data.get("quote_id")
                submitted_quote_hash = cart_data.get("quote_hash")
                submitted_expires_at = cart_data.get("expires_at")
                raw_items = cart_data.get("cargo_items") or cart_data.get("items") or []
                goods_type = cart_data.get("goods_type") or cart_data.get("category")
                if not extracted_waypoints:
                    extracted_waypoints = cart_data.get("waypoints") or cart_data.get("stops") or cart_data.get("trip_stops")

            if raw_items or goods_type:
                target_city = getattr(logistics_tier, "city", None)
                cargo_summary = resolve_cargo_payload(cargo_items=raw_items, goods_category_slug=goods_type, city=target_city)

        if submitted_expires_at:
            try:
                exp_dt = timezone.datetime.fromisoformat(str(submitted_expires_at))
                if timezone.is_naive(exp_dt):
                    exp_dt = timezone.make_aware(exp_dt)
                if timezone.now() > exp_dt:
                    raise UnresolvedLogisticsFareError(
                        f"Logistics quote has expired (valid until {submitted_expires_at}). Please recalculate the fare."
                    )
            except (ValueError, TypeError):
                raise UnresolvedLogisticsFareError("Submitted quote expiry timestamp is invalid or malformed.")

        cached_quote = None
        if submitted_quote_id:
            cached_quote = cache.get(f"gt_quote_{submitted_quote_id}")
            if not cached_quote:
                has_coords = None not in (pickup_lat, pickup_lng, drop_lat, drop_lng)
                if not (has_coords and logistics_tier is not None):
                    raise UnresolvedLogisticsFareError(
                        f"Logistics quote '{submitted_quote_id}' has expired or is invalid. Please calculate a fresh quote."
                    )
                logger.info(
                    "Logistics quote '%s' not found in cache (evicted or server reloaded); "
                    "re-verifying authoritatively with tier #%s and coordinates.",
                    submitted_quote_id,
                    getattr(logistics_tier, "id", None),
                )

            if cached_quote:
                if cached_quote.get("expires_at"):
                    try:
                        exp_dt = timezone.datetime.fromisoformat(str(cached_quote["expires_at"]))
                        if timezone.is_naive(exp_dt):
                            exp_dt = timezone.make_aware(exp_dt)
                        if timezone.now() > exp_dt:
                            raise UnresolvedLogisticsFareError(
                                f"Logistics quote '{submitted_quote_id}' has expired. Please recalculate the fare."
                            )
                    except (ValueError, TypeError):
                        raise UnresolvedLogisticsFareError("Quote expiry timestamp is invalid or malformed.")

                # 1. Authoritative Tier Verification: Cannot use quote from a different vehicle
                quoted_tier_id = cached_quote.get("tier_id")
                if quoted_tier_id and logistics_tier and str(quoted_tier_id) != str(logistics_tier.id):
                    raise UnresolvedLogisticsFareError(
                        f"Quote tier mismatch: quote '{submitted_quote_id}' was generated for tier #{quoted_tier_id}, but tier #{logistics_tier.id} ({getattr(logistics_tier, 'name', '')}) was selected."
                    )

                # 2. Authoritative Route Verification: Cannot substitute arbitrary coordinates
                q_p_lat = cached_quote.get("pickup_lat")
                q_p_lng = cached_quote.get("pickup_lng")
                q_d_lat = cached_quote.get("drop_lat")
                q_d_lng = cached_quote.get("drop_lng")
                if None not in (pickup_lat, pickup_lng, q_p_lat, q_p_lng):
                    if abs(float(pickup_lat) - float(q_p_lat)) > 0.005 or abs(float(pickup_lng) - float(q_p_lng)) > 0.005:
                        raise UnresolvedLogisticsFareError(
                            "Quote route mismatch: pickup location does not match quoted route. Please recalculate fare."
                        )
                if None not in (drop_lat, drop_lng, q_d_lat, q_d_lng):
                    if abs(float(drop_lat) - float(q_d_lat)) > 0.005 or abs(float(drop_lng) - float(q_d_lng)) > 0.005:
                        raise UnresolvedLogisticsFareError(
                            "Quote route mismatch: destination location does not match quoted route. Please recalculate fare."
                        )

                # 3. Canonical Waypoints & Waypoint Ordering Verification
                curr_canonical_wp = []
                if extracted_waypoints and isinstance(extracted_waypoints, list):
                    for wp in extracted_waypoints:
                        if isinstance(wp, (list, tuple)) and len(wp) >= 2:
                            curr_canonical_wp.append((round(float(wp[0]), 5), round(float(wp[1]), 5)))
                        elif isinstance(wp, dict) and ("lat" in wp or "latitude" in wp):
                            w_lat = wp.get("lat") if "lat" in wp else wp.get("latitude")
                            w_lng = wp.get("lng") if "lng" in wp else wp.get("longitude")
                            if w_lat is not None and w_lng is not None:
                                curr_canonical_wp.append((round(float(w_lat), 5), round(float(w_lng), 5)))

                cached_wp = [tuple(p) for p in cached_quote.get("waypoints", [])]
                if curr_canonical_wp != cached_wp:
                    raise UnresolvedLogisticsFareError(
                        "Quote route mismatch: waypoints or waypoint ordering do not match quoted route. Please recalculate fare."
                    )

                # 4. Stop Count Verification
                # A quote's `stops` counts the whole route (pickup + every
                # intermediate stop + drop). The booking request only lists the
                # intermediate stops, so when it carries any, the count to
                # compare is derived from them; comparing the caller's default
                # (2) rejected every legitimate multi-stop booking that carried
                # its own quote. The waypoint list itself was already verified
                # against the quote above.
                request_stops = (
                    STANDARD_STOP_COUNT + len(curr_canonical_wp) if curr_canonical_wp else stop_count
                )
                if cached_quote.get("stops") is not None and request_stops != cached_quote.get("stops"):
                    raise UnresolvedLogisticsFareError(
                        f"Quote stop count mismatch: quote was generated for {cached_quote.get('stops')} stops, but request has {request_stops}. Please recalculate fare."
                    )

                # 5. Cargo Identity & Quantities Verification (binding server-authoritative GoodsItem attributes)
                curr_cargo_hash_str = ""
                if cargo_summary and isinstance(cargo_summary, dict):
                    items = cargo_summary.get("items") or []
                    items_sorted = sorted(
                        [
                            f"{it.get('item_id')}:{it.get('item_slug')}:{it.get('quantity')}:"
                            f"{it.get('unit_cft')}:{it.get('unit_weight_kg')}:{int(bool(it.get('is_fragile')))}:"
                            f"{int(bool(it.get('requires_special_handling')))}:{it.get('special_handling_charge')}:"
                            f"{int(bool(it.get('is_two_wheeler_compatible', True)))}"
                            for it in items if isinstance(it, dict)
                        ]
                    )
                    curr_cargo_hash_str = ";".join(items_sorted)

                if cached_quote.get("cargo_hash") and curr_cargo_hash_str != cached_quote.get("cargo_hash"):
                    raise UnresolvedLogisticsFareError(
                        "Quote cargo mismatch: cargo items, quantities, or catalog specifications have changed since quotation. Please recalculate fare."
                    )

                # 6. Cryptographic Signature Verification
                if submitted_quote_hash and cached_quote.get("quote_hash"):
                    if str(submitted_quote_hash).strip() != str(cached_quote["quote_hash"]).strip():
                        raise UnresolvedLogisticsFareError(
                            "Quote integrity error: quote hash signature mismatch. Please recalculate fare."
                        )

                # 7. Submitted Amount / Total Verification
                if submitted_amount is not None:
                    try:
                        sub_dec = _money(submitted_amount)
                        cached_dec = _money(cached_quote["total"])
                        if sub_dec != cached_dec:
                            raise UnresolvedLogisticsFareError(
                                f"Quote total mismatch: submitted amount ({sub_dec}) does not match locked quote total ({cached_dec})."
                            )
                    except (InvalidOperation, TypeError):
                        raise UnresolvedLogisticsFareError(f"Invalid submitted amount format: '{submitted_amount}'.")

        if cargo_summary and not cargo_summary.get("is_valid", True):
            errs = cargo_summary.get("validation_errors") or [{}]
            first_err = errs[0]
            raise UnresolvedLogisticsFareError(f"{first_err.get('code', 'CARGO_VALIDATION_ERROR')}: {first_err.get('error', 'Invalid cargo payload.')}")

        if cargo_summary and cargo_summary.get("has_prohibited", False):
            raise UnresolvedLogisticsFareError(cargo_summary.get("prohibited_reason") or "Prohibited cargo cannot be transported.")

        if submitted_quote_id and cached_quote:
            # Verified quote price lock: use the authoritative locked quote snapshot
            if cached_quote.get("breakdown") and isinstance(cached_quote["breakdown"], dict):
                locked_breakdown = LogisticsFareBreakdown(cached_quote["breakdown"])
            else:
                locked_breakdown = LogisticsFareBreakdown(
                    quote_id=submitted_quote_id,
                    quote_hash=cached_quote.get("quote_hash"),
                    created_at=cached_quote.get("created_at"),
                    quoted_at=cached_quote.get("created_at"),
                    expires_at=cached_quote.get("expires_at"),
                    tier_id=cached_quote.get("tier_id") or getattr(logistics_tier, "id", None),
                    tier_name=cached_quote.get("tier_name") or getattr(logistics_tier, "name", ""),
                    vehicle_class=cached_quote.get("vehicle_class") or getattr(logistics_tier, "vehicle_class", ""),
                    weight_class=cached_quote.get("weight_class") or getattr(logistics_tier, "weight_class", ""),
                    pickup_lat=str(pickup_lat) if pickup_lat is not None else None,
                    pickup_lng=str(pickup_lng) if pickup_lng is not None else None,
                    drop_lat=str(drop_lat) if drop_lat is not None else None,
                    drop_lng=str(drop_lng) if drop_lng is not None else None,
                    total=_money(cached_quote["total"]),
                    distance_km=_money(cached_quote.get("distance_km", "0")),
                    chargeable_km=_money(cached_quote.get("chargeable_km", "0")),
                    stops=cached_quote.get("stops", stop_count),
                    currency=getattr(logistics_tier, "currency", "INR") or "INR",
                    is_authoritative=cached_quote.get("is_authoritative", True),
                    is_estimate=cached_quote.get("is_estimate", False),
                    distance_source=cached_quote.get("distance_source", "google_maps"),
                )
            if not locked_breakdown.get("is_cargo_fit", True):
                reason = locked_breakdown.get("cargo_fit_reason") or "Selected vehicle cannot safely carry this cargo."
                raise UnresolvedLogisticsFareError(f"VEHICLE_CAPACITY_EXCEEDED: {reason}")
            return _money(cached_quote["total"]), locked_breakdown

        breakdown = quote_logistics_fare(
            tier=logistics_tier,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            drop_lat=drop_lat,
            drop_lng=drop_lng,
            stop_count=stop_count,
            cargo_summary=cargo_summary,
            waypoints=extracted_waypoints,
        )
        if breakdown is not None:
            if not breakdown.get("is_cargo_fit", True):
                reason = breakdown.get("cargo_fit_reason") or "Selected vehicle cannot safely carry this cargo."
                raise UnresolvedLogisticsFareError(f"VEHICLE_CAPACITY_EXCEEDED: {reason}")
            if submitted_quote_id and submitted_amount is not None:
                try:
                    sub_dec = _money(submitted_amount)
                    calc_dec = _money(breakdown["total"])
                    if sub_dec != calc_dec:
                        raise UnresolvedLogisticsFareError(
                            f"Quote total mismatch: submitted amount ({sub_dec}) does not match authoritative calculated total ({calc_dec}). Please calculate a fresh quote."
                        )
                except (InvalidOperation, TypeError):
                    raise UnresolvedLogisticsFareError(f"Invalid submitted amount format: '{submitted_amount}'.")
            if submitted_quote_id:
                breakdown["quote_id"] = submitted_quote_id
            if submitted_expires_at:
                breakdown["expires_at"] = submitted_expires_at
            return breakdown["total"], breakdown

        # Precedence Rule (Sections 11 & 12):
        # 1. Authoritative distance-based GT quote (computed above if coordinates provided).
        # 2. Explicit configured lane fare if a specific Lane was booked.
        # 3. For distance-priced tiers, never fall back to starting_price as a final payable fare.
        if getattr(logistics_tier, "per_km_rate", None) is not None:
            if logistics_lane is not None:
                # Update 16: the fare is the lane's, unchanged, but the
                # booking still records WHICH vehicle class was purchased so
                # Vendor dispatch can enforce it.
                return logistics_lane.fare, classification_only_snapshot(
                    service_category=service_category,
                    tier=logistics_tier,
                    total=logistics_lane.fare,
                    source="configured_lane_fare",
                )
            raise UnresolvedLogisticsFareError(
                f"Coordinates required to calculate authoritative distance-based fare for '{service_category}'."
            )

    if service_category == "packers_movers":
        # Extract quote parameters or verified quote_id from cart_data
        quote_id = None
        inventory_items = None
        packing_tier = "standard"
        pickup_floor = 0
        pickup_has_lift = True
        drop_floor = 0
        drop_has_lift = True
        relocation_type = "Within City"
        dismantling_req = True
        unpacking_req = False

        tier_id = getattr(logistics_tier, "id", None)
        city = getattr(logistics_tier, "city", None)
        if isinstance(cart_data, list) and len(cart_data) > 0:
            c0 = cart_data[0] if isinstance(cart_data[0], dict) else {}
            quote_id = c0.get("quote_id")
            c_tier = c0.get("tier_id") or c0.get("selected_tier_id")
            if tier_id is not None and c_tier is not None and str(tier_id) != str(c_tier):
                raise UnresolvedLogisticsFareError(
                    f"Quote tier mismatch: booking tier #{tier_id} differs from cart tier #{c_tier}."
                )
            tier_id = tier_id or c_tier
            c_city = c0.get("city")
            if city is not None and c_city is not None and str(city).strip().lower() != str(c_city).strip().lower():
                raise UnresolvedLogisticsFareError(
                    f"Quote city mismatch: booking city '{city}' differs from cart city '{c_city}'."
                )
            city = city or c_city
            inventory_items = c0.get("inventory") or c0.get("items")
            packing_tier = c0.get("packing_tier") or "standard"
            pickup_floor = c0.get("pickup_floor", 0)
            pickup_has_lift = c0.get("pickup_has_lift", True)
            drop_floor = c0.get("drop_floor", 0)
            drop_has_lift = c0.get("drop_has_lift", True)
            relocation_type = c0.get("relocation_type") or "Within City"
            if "dismantling_required" in c0:
                dismantling_req = bool(c0.get("dismantling_required"))
            if "unpacking_required" in c0:
                unpacking_req = bool(c0.get("unpacking_required"))
        elif isinstance(cart_data, dict):
            quote_id = cart_data.get("quote_id")
            c_tier = cart_data.get("tier_id") or cart_data.get("selected_tier_id")
            if tier_id is not None and c_tier is not None and str(tier_id) != str(c_tier):
                raise UnresolvedLogisticsFareError(
                    f"Quote tier mismatch: booking tier #{tier_id} differs from cart tier #{c_tier}."
                )
            tier_id = tier_id or c_tier
            c_city = cart_data.get("city")
            if city is not None and c_city is not None and str(city).strip().lower() != str(c_city).strip().lower():
                raise UnresolvedLogisticsFareError(
                    f"Quote city mismatch: booking city '{city}' differs from cart city '{c_city}'."
                )
            city = city or c_city
            inventory_items = cart_data.get("inventory") or cart_data.get("items")
            packing_tier = cart_data.get("packing_tier") or "standard"
            pickup_floor = cart_data.get("pickup_floor", 0)
            pickup_has_lift = cart_data.get("pickup_has_lift", True)
            drop_floor = cart_data.get("drop_floor", 0)
            drop_has_lift = cart_data.get("drop_has_lift", True)
            relocation_type = cart_data.get("relocation_type") or "Within City"
            if "dismantling_required" in cart_data:
                dismantling_req = bool(cart_data.get("dismantling_required"))
            if "unpacking_required" in cart_data:
                unpacking_req = bool(cart_data.get("unpacking_required"))

        if tier_id:
            from logistics.models import ServiceTier
            tier_obj = ServiceTier.objects.filter(id=tier_id).first()
            if tier_obj:
                if not city:
                    city = getattr(tier_obj, "city", None)
                elif tier_obj.city and str(city).strip().lower() != str(tier_obj.city).strip().lower():
                    raise UnresolvedLogisticsFareError(
                        f"Selected tier #{tier_id} belongs to '{tier_obj.city}', but city '{city}' was requested."
                    )

        current_req = {
            "tier_id": tier_id,
            "city": city,
            "pickup_lat": pickup_lat,
            "pickup_lng": pickup_lng,
            "drop_lat": drop_lat,
            "drop_lng": drop_lng,
            "inventory": inventory_items,
            "packing_tier": packing_tier,
            "dismantling_required": dismantling_req,
            "unpacking_required": unpacking_req,
            "pickup_floor": pickup_floor,
            "pickup_has_lift": pickup_has_lift,
            "drop_floor": drop_floor,
            "drop_has_lift": drop_has_lift,
            "relocation_type": relocation_type,
        }

        if quote_id:
            from .packers_movers_pricing import verify_packers_movers_quote
            is_valid, cached_quote, err_msg = verify_packers_movers_quote(
                quote_id,
                submitted_total=submitted_amount,
                current_request=current_req,
            )
            if not is_valid:
                raise UnresolvedLogisticsFareError(err_msg or f"Quote '{quote_id}' is invalid or requires survey/review.")
            if cached_quote:
                if tier_id and str(cached_quote.get("tier_id")) != str(tier_id):
                    raise UnresolvedLogisticsFareError(
                        f"Quote tier mismatch: quote was generated for tier #{cached_quote.get('tier_id')}, but tier #{tier_id} was requested."
                    )
                return _money(cached_quote["total"]), cached_quote

        # P1-7: If quote_id is absent, we must have a selected ServiceTier to recompute.
        # Silently auto-selecting a different vehicle or proceeding without a tier is prohibited.
        if not quote_id and not tier_id:
            raise UnresolvedLogisticsFareError(
                "Packers & Movers booking requires a selected ServiceTier or verified quote_id."
            )

        # Compute on-the-fly quote from inventory line items if coordinates are available
        if inventory_items and None not in (pickup_lat, pickup_lng, drop_lat, drop_lng):
            if not city:
                raise UnresolvedLogisticsFareError("Packers & Movers booking requires an authoritative city.")
            from .packers_movers_pricing import compute_packers_movers_quote
            computed_quote = compute_packers_movers_quote(
                pickup_lat=pickup_lat,
                pickup_lng=pickup_lng,
                drop_lat=drop_lat,
                drop_lng=drop_lng,
                inventory=inventory_items,
                packing_tier=packing_tier,
                dismantling_required=dismantling_req,
                unpacking_required=unpacking_req,
                pickup_floor=pickup_floor,
                pickup_has_lift=pickup_has_lift,
                drop_floor=drop_floor,
                drop_has_lift=drop_has_lift,
                relocation_type=relocation_type,
                city=city,
                service_tier_id=tier_id,
            )
            if not computed_quote.get("is_authoritative", False) or computed_quote.get("is_estimate", False):
                survey_status = computed_quote.get("survey_status") or "SURVEY_REQUIRED"
                reason = computed_quote.get("estimate_notice") or computed_quote.get("review_reason") or "Pre-move survey required."
                raise UnresolvedLogisticsFareError(f"Packers & Movers booking requires survey/review ({survey_status}: {reason}) and cannot be finalized as an instant booking.")
            
            # P1-7: Verify that the resulting quote tier equals the booking tier
            computed_tier_id = computed_quote.get("tier_id")
            if tier_id and computed_tier_id and str(computed_tier_id) != str(tier_id):
                raise UnresolvedLogisticsFareError(
                    f"P&M vehicle mismatch: Selected tier '{tier_id}' differs from computed tier '{computed_tier_id}'. Automatic vehicle replacement is prohibited."
                )
            computed_city = computed_quote.get("city")
            if city and computed_city and str(city).strip().lower() != str(computed_city).strip().lower():
                raise UnresolvedLogisticsFareError(
                    f"P&M city mismatch: Selected city '{city}' differs from computed city '{computed_city}'."
                )
            if computed_quote.get("total") is None:
                raise UnresolvedLogisticsFareError("Packers & Movers booking cannot be finalized without an authoritative fare.")
            return _money(computed_quote["total"]), computed_quote

    # Fall through to the original flat resolver rather than duplicating
    # its lane-beats-tier ordering and its
    # "raise rather than trust the client" guarantee in two places. That
    # function stays the single definition of flat logistics pricing and
    # keeps its own test coverage.
    flat_fare = resolve_logistics_fare(
        service_category=service_category,
        logistics_tier=logistics_tier,
        logistics_lane=logistics_lane,
        submitted_amount=submitted_amount,
    )
    # Update 16: same reasoning as the lane branch above -- a flat-priced
    # goods-transport booking must still snapshot the purchased vehicle
    # class, or the Vendor-side compatibility gate has nothing to enforce.
    return flat_fare, classification_only_snapshot(
        service_category=service_category,
        tier=logistics_tier,
        total=flat_fare,
        source="flat_tier_or_lane_fare",
    )
