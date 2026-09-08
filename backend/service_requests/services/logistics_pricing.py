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

LOGISTICS_CATEGORIES = {
    "goods_transport_truck",
    "goods_transport_two_wheeler",
    "packers_movers",
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

    if logistics_lane is not None:
        return logistics_lane.fare
    if logistics_tier is not None:
        return logistics_tier.starting_price
    raise UnresolvedLogisticsFareError(
        f"Cannot verify a fare for '{service_category}' without a resolvable logistics tier or lane."
    )
