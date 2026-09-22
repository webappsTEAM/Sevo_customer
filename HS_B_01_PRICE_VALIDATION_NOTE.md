# HS-B-01 — home-services price validation: what shipped and what's still open

## What shipped this pass
1. `ServiceRequestPublicCreateSerializer.validate_total_amount()` — rejects
   `total_amount <= 0` and anything above a Rs. 10,00,000 sanity ceiling.
2. `BookingCreateView.post()` — for non-logistics categories, checks that the
   submitted `total_amount` is internally consistent with the submitted
   `cart_data` line items (`sum(price * quantity)`), within a tolerance of
   `max(Rs.5, 1% of cart total)`. A mismatch beyond that is rejected with a
   400 asking the customer to refresh and rebook.

## Why this is a partial fix, not a full one
The gap descriptor (HS-B-01) asks for `total_amount` to be recomputed
server-side from `CatalogCategory` / `Service` / `Package` / `AddOn` prices
and the booking rejected/corrected if it diverges — the same treatment
`resolve_logistics_fare()` (GT-B-01) already gives logistics bookings.

That isn't possible for home-services bookings today because `cart_data`
(the JSONField the frontend submits) only carries
`{"name": ..., "price": ..., "quantity": ...}` per line item — there is no
`package_id` / `addon_id` referencing the actual `Package`/`AddOn` rows.
Matching by `name` alone was considered and rejected for this pass:
`Package.name` is not guaranteed unique across services, names can drift
from what's in `cart_data` (typos, frontend copy changes, add-ons folded
into a combined line item), and a live DB session to check what real
`cart_data` payloads actually contain wasn't available to validate the
matching logic against production data. Shipping a name-matching recompute
untested against real data risks rejecting legitimate bookings outright —
a worse outcome than the price-tampering gap it would close, on a
live app with real customers already booking.

What shipped instead is a self-consistency check: it can't verify the
`cart_data` prices themselves came from the catalog, but it does catch the
common bug/attack pattern where `total_amount` and `cart_data` disagree
(e.g. a client that mutates the total field but not the cart list it
computed it from).

## What would close this properly
Add `package_id` (and `addon_ids`) to each `cart_data` line item on the
frontend at add-to-cart time, and have `BookingCreateView` resolve those IDs
against `Package`/`AddOn` and recompute the expected total server-side —
mirroring exactly what `resolve_logistics_fare()` does for logistics lanes
and tiers today. That's a frontend schema change + a backend recompute
function, not a backend-only patch, so it wasn't attempted in this pass.
