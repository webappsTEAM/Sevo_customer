# SEVO — Daily Essentials Frontend: Implementation Plan

Status: **Draft — ready for review**
Scope: Customer web frontend only (`Calservices/Customer/frontend`)
Builds on: The already-implemented backend from `DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md` (`carts` app, `GroceryOrder`/`GroceryOrderItem`, `/api/carts/...`, `/api/orders/...`) — verified working, all tests passing.
Does not cover: The Flutter mobile app (`Customer/Mobile App`), which has no Daily Essentials UI at all today and was deliberately excluded from this plan's scope.

---

## 0. What already exists today (as found in the codebase)

Before proposing changes, here's the honest starting point — the frontend already has a real "Daily Essentials" *UI*, it's just entirely disconnected from the backend built for it:

- **`VegetableFullScreenPage.jsx`** (`/vegetables` route) already fetches the live catalog from `GET /api/catalog/services/?service_slug=vegetables&status=ACTIVE`, and already reads `pkg.in_stock` / `pkg.max_quantity` from that response — the exact fields added to `CatalogServiceSerializer` in the recent backend fix. That fix wasn't just closing a stale test; it was filling in fields this page was already trying to consume.
- **Cart state** (`foodCart`) is a plain `{ "Item Name (unit)": quantity }` object, held in local component state in `LandingPage-1.jsx`, mirrored to `localStorage["calservice_veg_food_cart"]`, and passed between pages via React Router's `location.state`. It is keyed by **display name**, not `package_id` — the backend's `Cart`/`CartItem` model has no way to resolve it reliably.
- **`VegCartDrawerModal.jsx`** renders this cart (quantities, tip, totals) purely from that local object — no network calls at all.
- **Checkout** happens inside `BookingPage.jsx`, gated by an `isQuickCommerce` flag that already renders a visually distinct flow from the regular services checkout — so the "two carts feel separate" part of the UX already exists. But on submit, it `POST`s to `/api/booking/` with `service_category: "vegetables_quick_delivery"`, which creates a `ServiceRequest` (the old single-cart model), not a `GroceryOrder`. It never touches `/api/carts/...` or `/api/orders/...`.
- **On failure, the error is swallowed**: `catch (e) { res = { success: true, request_id: <fake random id> } }` — a failed checkout (including a real insufficient-stock rejection) currently shows the customer a fabricated success screen.

So this plan is a *rewiring* effort, not a from-scratch build: replace the plumbing under an already-built UI, not replace the UI.

---

## 1. Approved architecture (frontend translation)

Same two-cart rule the backend enforces, translated into what the UI must do:

```
                    LandingPage-1.jsx
                           |
              ┌────────────┴────────────┐
              |                         |
      Services selection      VegetableFullScreenPage /
      (existing flow,         VegCartDrawerModal
       untouched)             (Daily Essentials cart)
              |                         |
      services cart state      NEW: synced to
      (local, unchanged)       GET/POST/PATCH/DELETE
              |                /api/carts/daily_essentials/...
              |                         |
              └────────────┬────────────┘
                            |
                   BookingPage.jsx checkout
                            |
              Both carts have items at checkout?
                 ┌──────────┴──────────┐
                No                    Yes
                 |                     |
        existing single-cart    NEW: explicit confirm UI
        call OR grocery-only    ("Check out both?" — never
        call, whichever cart    inferred silently) →
        has items               POST /api/orders/checkout/
                                 with explicit cart_types
```

Key rules carried over from the backend plan, restated for frontend:

- The frontend must never silently combine both carts into one request. If both have items when the customer opens checkout, they must be asked which to check out — mirroring the backend's refusal to infer this from cart state alone.
- A grocery-checkout failure (insufficient stock) must be shown as a real error, with the item(s) named, never masked as a success.
- Cart state must survive a page reload and a re-login on the same account — which local-only state cannot do. The backend `Cart` is the new source of truth once the customer is authenticated.

---

## 2. Phases

### Phase 0 — Confirm the prerequisite backend fields are live (no code)

**Why first:** Phase 1 below depends on `in_stock`/`max_quantity` actually arriving in the catalog response. This was just fixed backend-side; confirm it's deployed before building UI logic on top of it.

**Work:** Hit `GET /api/catalog/services/?service_slug=vegetables&status=ACTIVE` against the environment the frontend will point at and confirm each item carries `in_stock` (bool) and `max_quantity` (int or null).

**Output:** Green light to proceed; no frontend files touched.

---

### Phase 1 — Cart state: from name-keyed local object to `package_id`-keyed, backend-synced cart

**Why:** `CartItem` on the backend is keyed by `package` (FK), not by name string. The current `foodCart = { "Tomato (500g)": 2 }` shape has no reliable way to become a `package_id`. `VegetableFullScreenPage.jsx` already has `pkg.id` in its fetched catalog items — Phase 1 is about carrying that id through into the cart, everywhere the cart is read or written.

**Work:**
- Introduce a small `dailyEssentialsCart` hook/service (e.g. `hooks/useDailyEssentialsCart.js`) that wraps the four endpoints: `GET /api/carts/daily_essentials/`, `POST .../items/`, `PATCH .../items/{id}/`, `DELETE .../items/{id}/`.
- Change the cart's shape from `{name: qty}` to a list of `{ id (CartItem id), package_id, name, unit, quantity, unit_price_snapshot, customization }`, sourced from the backend response rather than reconstructed client-side.
- On every add/increment/decrement/remove action (currently local `setFoodCart` calls in `VegetableFullScreenPage.jsx`, `VegCartDrawerModal.jsx`, `VegetableProductDetailPage.jsx`, `VegetableRecipeModal.jsx`, `VegetableRecommendationSection.jsx`, `RecipeDetails.jsx`), call the matching backend endpoint and update local state from its response — optimistic update, roll back on error.
- On page load / login, `GET` the active cart and hydrate state from it instead of (or in addition to, as an offline fallback) `localStorage`.
- Map "custom packs" / family-saver selections into `CartItem.customization` (the JSON field the backend model already reserves for exactly this).
- Keep `localStorage["calservice_veg_food_cart"]` only as a short-lived optimistic cache for the pre-hydration render, not as the source of truth.

**Files touched:** new `src/hooks/useDailyEssentialsCart.js` (or `src/services/dailyEssentialsCartService.js`), `ui/pages/VegetableFullScreenPage.jsx`, `ui/components/VegCartDrawerModal.jsx`, `ui/components/vegetables/VegetableProductDetailPage.jsx`, `ui/components/vegetables/VegetableRecipeModal.jsx`, `ui/components/vegetables/VegetableRecommendationSection.jsx`, `ui/components/vegetables/RecipeDetails.jsx`, `ui/pages/LandingPage-1.jsx` (cart initialization).

**Output:** Adding/removing vegetables persists to the backend `Cart`/`CartItem` and survives reload/re-login. Checkout is not yet wired — this phase only proves the cart layer works, same "prove it first" sequencing the backend plan used for its own Phase 1.

---

### Phase 2 — Wire Daily Essentials checkout to `GroceryCheckoutView`

**Why:** The quick-commerce checkout branch in `BookingPage.jsx` currently fabricates a `ServiceRequest` through the wrong endpoint, and hides real failures.

**Work:**
- Replace the `POST /api/booking/` call (the `service_category: "vegetables_quick_delivery"` payload) with `POST /api/orders/grocery/checkout/`, sending only `{ delivery_address }` — no `latitude`/`longitude`/zone fields needed, since `GroceryCheckoutView` doesn't require them.
- Remove the `catch (e) { res = { success: true, request_id: fake } }` fallback. On a real failure, especially a 400 from `InsufficientStockError`, show the actual message ("This quantity is no longer available...") and the named item(s), and leave the customer on the cart/checkout screen instead of the confirmation screen.
- On success, clear the local cart mirror from the real (now-emptied) backend cart state, not by hand.
- Update the order-confirmation screen to use the real `GroceryOrder.order_number` (prefixed `GRO...`) instead of the previous fabricated `VEG-HOS-######` id.

**Files touched:** `ui/pages/BookingPage.jsx` (the `isQuickCommerce` checkout branch), shared error-toast/banner component (reused, not new).

**Output:** A real `GroceryOrder` + `GroceryOrderItem` rows are created on submit, stock is actually reserved, and insufficient-stock is a visible, honest error.

---

### Phase 3 — Explicit "check out both?" confirmation

**Why:** The backend's `CheckoutView` deliberately refuses to infer `cart_types` from cart state — it requires the frontend to ask. Today's UI has no such moment because it never had two persisted carts to compare in the first place.

**Work:**
- At the point the customer opens checkout, check whether both a non-empty services selection and a non-empty `daily_essentials` cart exist simultaneously.
- If only one is non-empty, proceed with that cart type alone (`cart_types: ["services"]` or `["daily_essentials"]`) via `POST /api/orders/checkout/`.
- If both are non-empty, show an explicit confirmation step ("Check out your service booking and your grocery order together?") before calling `POST /api/orders/checkout/` with `cart_types: ["services", "daily_essentials"]`.
- Render the response's two independent outcomes (`service_order`, `grocery_order`) separately — a grocery failure must not be shown as blocking or rolling back a successful service booking, and vice versa, matching what the backend already guarantees.

**Files touched:** `ui/pages/BookingPage.jsx` (checkout entry point), a new lightweight confirmation component if one doesn't already fit an existing modal pattern in the codebase.

**Output:** The first customer-visible behavior change in this plan — same as Phase 4 being the go/no-go gate in the backend plan. Everything before this phase is additive and low-risk; this phase is where it should get a final review before shipping.

---

### Phase 4 — Merged "My Orders" view

**Why:** `MyOrdersView` (`GET /api/orders/my/`) already exists and merges `Order` and `GroceryOrder` server-side. The frontend's existing "My Bookings" panel (`apiRequest('/booking/my-bookings/')` inside `BookingPage.jsx`) only shows service bookings today.

**Work:**
- Add a call to `GET /api/orders/my/` alongside (or instead of, once verified equivalent) the existing `/booking/my-bookings/` call.
- Render each entry using the type-specific detail payload the endpoint already returns (`order_type`, `status_label`, `total_amount`, etc.), with a visual distinction between a service booking and a grocery order (icon/badge is enough — no need to fork the whole list UI).

**Files touched:** `ui/pages/BookingPage.jsx` (the my-bookings panel), or a new dedicated `MyOrdersPage.jsx` if the existing panel is judged too service-specific to extend cleanly — worth a quick look at that panel's current structure before deciding which.

**Output:** Customers see grocery orders in the same history view as service bookings, sorted together by date.

---

### Phase 5 — Cleanup of the superseded path

**Why:** Once Phases 1–4 are live and verified, the old `vegetables_quick_delivery` → `/api/booking/` → `ServiceRequest` path becomes dead code that only adds confusion (and lets a regression silently revert to it).

**Work:** Remove the `service_category: "vegetables_quick_delivery"` payload branch and its associated fallback logic from `BookingPage.jsx`, after confirming nothing else depends on that `service_category` value (e.g. admin dashboards, reports) — worth an explicit grep before deleting, not assumed.

**Files touched:** `ui/pages/BookingPage.jsx`.

**Output:** One checkout path per cart type, no legacy fallback left to silently mask failures again.

---

## 3. Sequencing and risk

| Phase | Touches live customer behavior? | Depends on |
|---|---|---|
| 0 | No (verification only) | Backend `in_stock`/`max_quantity` fix |
| 1 | No (cart persistence only, not checkout) | Phase 0 |
| 2 | Yes — this is the first customer-visible change | Phase 1 |
| 3 | Yes — changes checkout UX when both carts are non-empty | Phase 2 |
| 4 | No (new read-only view) | Backend `MyOrdersView` (already live) |
| 5 | No net change (removes now-dead code) | Phases 2–3 verified in production |

Phase 1 and Phase 4 are safe to build and ship independently of each other and of Phase 2/3 — same low-risk, build-and-verify-first posture the backend plan used for its own additive phases. Phase 2 is the real gate: it's the first point real orders start flowing through the new backend instead of the old one, so it's worth a deliberate go/no-go review (parity check against a handful of manual Phase-2-only test checkouts) before Phase 3 layers the combined-checkout UX on top.

---

## 4. Not yet covered by this plan (flagged, separate decisions)

- **Delivery slot / address picker UX for groceries** — `GroceryCheckoutView` takes a plain `delivery_address` string; today's quick-commerce flow already has an address picker (`SelectServiceAddressDrawer.jsx`) built for the services flow. Whether to reuse it as-is or adapt it for grocery-specific delivery windows is a UX decision, not detailed here.
- **Order state display for the Phase 5 fulfillment states** (PACKED / OUT_FOR_DELIVERY / DELIVERED) — the backend state machine exists but has no API endpoint yet (only callable from Python/shell today). A frontend "track my grocery order" view needs that endpoint built first; out of scope for this plan.
- **Mobile app (Flutter)** — deliberately excluded from this plan's scope per your direction; would need its own separate plan if pursued.
- **Whether `/booking/my-bookings/` and `/api/orders/my/` should be fully merged into one call, or kept as two calls rendered together** — a decision worth making once Phase 4 is scoped in detail, not before.
