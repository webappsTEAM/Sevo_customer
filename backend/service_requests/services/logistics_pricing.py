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

from decimal import Decimal, ROUND_HALF_UP

LOGISTICS_CATEGORIES = {
    "goods_transport_truck",
    "goods_transport_two_wheeler",
    "packers_movers",
}

# GT-B-01: which categories get real distance-based pricing.
#
# Packers & Movers is deliberately excluded. CALTRACK_PHASE_14 PART H
# splits pricing in two: H.1 "Goods Transport - deterministic" is the
# distance formula implemented below, while H.2 "Relocation -
# survey-driven" is volume/inventory/crew-based and starts with a
# physical survey booking. Pricing a relocation by road distance would
# be wrong, not merely incomplete, so packers_movers stays on the
# existing flat tier price until H.2 is actually built.
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
        actual = (getattr(obj, "category", "") or "").strip()
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
        minimum_fare_applied  bool
        distance_source     str -- "google_maps" | "straight_line_estimate"
        currency            str
    """


def quote_logistics_fare(
    *,
    tier,
    pickup_lat,
    pickup_lng,
    drop_lat,
    drop_lng,
    stop_count=STANDARD_STOP_COUNT,
):
    """
    Compute a real, itemised, distance-based fare for one goods-transport
    booking, per CALTRACK_PHASE_14 H.1.

    Returns a LogisticsFareBreakdown, or None when this tier isn't
    configured for distance pricing (no per_km_rate) or the coordinates
    needed to measure a distance aren't available. Returning None is the
    signal to fall back to the existing flat lookup -- it is never a
    reason to trust a client-supplied amount.

    Distance comes from services/routing.get_route_eta(), which uses the
    Google Maps Distance Matrix road network when it can and a
    straight-line estimate when it can't. Which one was used is reported
    in `distance_source` and stored on the booking, so a fare computed
    from an estimate is auditable as such rather than silently
    indistinguishable from a real road distance.
    """
    if tier is None:
        return None
    per_km_rate = getattr(tier, "per_km_rate", None)
    if per_km_rate is None:
        return None
    if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
        return None

    # Imported here rather than at module import time: this module is
    # imported by views.py at startup, and routing.py pulls in `requests`
    # plus the cache framework, which the flat-pricing path never needs.
    from .routing import get_route_eta

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
        # Documented fallback: a tier that has a per-km rate but no explicit
        # base keeps using its existing starting_price as the fixed
        # component, so switching a tier to distance pricing is a one-field
        # change rather than a required re-entry of every price.
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

    subtotal = _money(base_fare + distance_charge + loading + stop_charge)

    surge = getattr(tier, "surge_multiplier", None)
    surge = _money(surge) if surge is not None else Decimal("1.00")
    if surge <= 0:
        # A zero/negative multiplier would zero out or invert the fare;
        # treat a misconfigured value as "no surge" rather than charging
        # nothing.
        surge = Decimal("1.00")
    total = _money(subtotal * surge)

    minimum_fare = getattr(tier, "minimum_fare", None)
    minimum_applied = False
    if minimum_fare is not None:
        minimum_fare = _money(minimum_fare)
        if total < minimum_fare:
            total = minimum_fare
            minimum_applied = True

    return LogisticsFareBreakdown(
        total=total,
        base_fare=base_fare,
        distance_km=distance_km,
        chargeable_km=chargeable_km,
        distance_charge=distance_charge,
        loading_unloading=loading,
        additional_stops=additional_stops,
        additional_stop_charge=stop_charge,
        subtotal=subtotal,
        surge_multiplier=surge,
        minimum_fare_applied=minimum_applied,
        distance_source=route.get("source"),
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
):
    """
    GT-B-01. Returns (fare, breakdown_or_None).

    Resolution order, most specific first:
      1. A distance-based quote, when the category is distance-priced,
         the selected tier has a per_km_rate, and we have real pickup and
         drop coordinates. This is the Porter-style path.
      2. A selected Lane's fixed fare (a pre-agreed point-to-point route
         price -- deliberately still wins over a tier's flat starting
         price, unchanged from before).
      3. The tier's flat starting_price.
      4. Nothing resolvable -> UnresolvedLogisticsFareError.

    Note (2) sits *below* (1): a lane fare is a flat pre-agreed number,
    so where a tier is genuinely configured for distance pricing and we
    can measure the trip, the measured fare is the more accurate one.
    Where distance pricing isn't configured, behaviour is byte-identical
    to the previous resolve_logistics_fare().

    submitted_amount is still never trusted for a logistics category --
    it is only ever passed through for non-logistics bookings, exactly as
    before.
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return submitted_amount, None

    # Same gate as the flat resolver, applied before the distance formula
    # too -- otherwise a mismatched tier would be caught only on the flat
    # fall-through path and would sail through distance pricing, which is
    # the path that actually computes most goods-transport fares.
    assert_catalog_matches_category(
        service_category, tier=logistics_tier, lane=logistics_lane
    )

    if service_category in DISTANCE_PRICED_CATEGORIES:
        breakdown = quote_logistics_fare(
            tier=logistics_tier,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            drop_lat=drop_lat,
            drop_lng=drop_lng,
            stop_count=stop_count,
        )
        if breakdown is not None:
            return breakdown["total"], breakdown

    # Fall through to the original flat resolver rather than duplicating
    # its lane-beats-tier ordering and its
    # "raise rather than trust the client" guarantee in two places. That
    # function stays the single definition of flat logistics pricing and
    # keeps its own test coverage.
    return resolve_logistics_fare(
        service_category=service_category,
        logistics_tier=logistics_tier,
        logistics_lane=logistics_lane,
        submitted_amount=submitted_amount,
    ), None
