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
    - Logistics booking with neither → falls back to submitted_amount.
      There's nothing authoritative to check it against yet — this can
      happen if the frontend didn't resolve a tier/lane id (e.g. it fell
      back to its static data because /api/logistics/ was unreachable).
      Once every booking reliably carries a tier or lane id, this branch
      should be tightened to reject the booking instead of trusting it.
    """
    if service_category not in LOGISTICS_CATEGORIES:
        return submitted_amount

    if logistics_lane is not None:
        return logistics_lane.fare
    if logistics_tier is not None:
        return logistics_tier.starting_price
    return submitted_amount
