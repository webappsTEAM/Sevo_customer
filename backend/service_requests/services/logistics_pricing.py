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

    The four `rate_*`/`free_km` keys exist so that reconciliation can
    re-price a delivered trip entirely from the quote, without reading the
    tier again. A tier's rates are administrator-editable; a booking's
    are not.
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
        # ── rates as they stood when this quote was made ──────────────────
        # The breakdown recorded what was CHARGED but not what it was charged
        # AT, which forced fare reconciliation to go back to the live tier
        # for anything the quote had not already spent money on -- so an
        # admin changing a rate silently re-priced bookings taken before the
        # change. These three lock the rate card into the quote itself.
        #
        # `rate_minimum_fare` is the per-trip floor, distinct from
        # `minimum_fare_applied` above, which only says whether it bit.
        # `rate_per_km` is stored even though it can usually be recovered
        # from distance_charge / chargeable_km, because that division is
        # undefined for a trip entirely inside free_km.
        rate_per_km=_money(per_km_rate),
        rate_additional_stop=per_stop,
        rate_minimum_fare=_money(minimum_fare) if minimum_fare is not None else None,
        free_km=free_km,
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
    cart_data=None,
):
    """
    GT-B-01. Returns (fare, breakdown_or_None).

    Resolution order, most specific first:
      1. A distance-based quote, when the category is distance-priced,
         the selected tier has a per_km_rate, and we have real pickup and
         drop coordinates. This is the Porter-style path.
      2. A Packers & Movers relocation quote, based on inventory volume (CFT),
         vehicle sizing, packing tiers, floor labor, and dismantling/reassembly.
      3. A selected Lane's fixed fare (a pre-agreed point-to-point route
         price -- deliberately still wins over a tier's flat starting
         price, unchanged from before).
      4. The tier's flat starting_price.
      5. Nothing resolvable -> UnresolvedLogisticsFareError.

    submitted_amount is still never trusted for a logistics category --
    it is only ever passed through for non-logistics bookings, exactly as
    before.
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return submitted_amount, None

    # Same gate as the flat resolver, applied before the quote formulas
    # too -- otherwise a mismatched tier would be caught only on the flat
    # fall-through path and would sail through distance pricing.
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

        if isinstance(cart_data, list) and len(cart_data) > 0:
            c0 = cart_data[0] if isinstance(cart_data[0], dict) else {}
            quote_id = c0.get("quote_id")
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

        if quote_id:
            from .packers_movers_pricing import verify_packers_movers_quote
            is_valid, cached_quote, err_msg = verify_packers_movers_quote(quote_id, submitted_total=submitted_amount)
            if is_valid and cached_quote:
                return _money(cached_quote["total"]), cached_quote

        # Compute on-the-fly quote from inventory line items if coordinates are available
        if inventory_items and None not in (pickup_lat, pickup_lng, drop_lat, drop_lng):
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
            )
            return _money(computed_quote["total"]), computed_quote

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
