# Goods & Transport — Implementation Plan

**Scope (confirmed with TL):** two flows, not three verticals.
- **Flow A — Packers & Movers** (`PackersMoversBookingHosurPage.jsx`)
- **Flow B — Goods Transport** = Truck + Two Wheeler together (`MiniTruckBookingHosurPage.jsx`, `TwoWheelerBookingHosurPage.jsx`)

This plan does not treat `CALTRACK_PHASE_14_TRANSPORT_AND_MOVERS.md`'s Part A recommendation ("build Movers, treat Transport as a separate decision") as binding — TL has confirmed both flows are in scope. It also does not treat the doc's Part D entity set (Vehicle fleet, Trip, TripStop, Consignment, ManifestItem, EWayBill, InsurancePolicy) as something to build wholesale — that's ~255 days per the doc's own Part K estimate, and several pieces (e-way bill exemption, GST RCM mechanics) are marked `[COUNSEL]`, i.e. blocked on legal review, not engineering.

---

## Where things stood before this pass

**Frontend:** three large, working booking-page components already existed, routed and linked from the landing page modal. Hardcoded Hosur pricing, mocked OTP login, zero calls to the Django backend.

**Backend:** nothing. No `Vehicle`, `Trip`, or equivalent model anywhere in the repo. The general booking engine (`service_requests.ServiceRequest`) existed and already supports arbitrary `service_category` values plus a flexible `cart_data` JSON field, but had no way to record a second address (pickup + drop) or which vehicle class / route a booking was for.

**Discrepancy found and not yet resolved:** the architecture doc's Part B claims Phase 5A already gave `ServiceRequest` (called `Booking` in the doc) an N-cardinality `Address` model via `AddressLink`, a `max_assignments` field, and a nullable `vehicle_id`, "zero migration required." None of that exists on `ServiceRequest` — `address` is a single `TextField`. Flag this to TL; this plan does not assume Phase 5A happened.

---

## Phase 1 — Backend foundation (done this pass)

New Django app `backend/logistics/`, registered in `INSTALLED_APPS` and mounted at `/api/logistics/`.

| Model | Purpose | Replaces |
|---|---|---|
| `ServiceTier` | Vehicle class (3 Wheeler, Tata Ace, 2 Wheeler, 2 Wheeler Electric) or movers package (1BHK, 2BHK/3BHK, Villa/Office) | The hardcoded vehicle/package card arrays in all 3 JSX files |
| `Lane` | Fixed-fare route ("Popular Routes from Hosur") | The hardcoded route tables in all 3 JSX files |
| `ServiceArea` | "Areas We Serve" — one shared list per city, reused across all 3 categories (verified identical across all three PDFs) | The hardcoded area-chip list, currently duplicated 3x |

All three are **global/public models, no `company` FK** — same convention as the existing `service_requests.CatalogCategory`/`CatalogService`, documented in `backend/common/MODEL_CLASSIFICATION.md` (updated this pass).

Endpoints (public, `AllowAny` — these feed pre-login marketing/booking pages):
```
GET /api/logistics/tiers/?category=truck&city=hosur
GET /api/logistics/lanes/?category=two_wheeler&city=hosur
GET /api/logistics/areas/?city=hosur
```
`category` is one of `truck`, `two_wheeler`, `packers_movers`.

`ServiceRequest` (`backend/service_requests/models.py`) gained three optional fields, additive only, no impact on existing categories:
- `drop_address` (TextField) — `address` continues to mean pickup
- `logistics_tier` (FK → `logistics.ServiceTier`, nullable)
- `logistics_lane` (FK → `logistics.Lane`, nullable)

These were also added to `ServiceRequestPublicCreateSerializer`'s field list (optional, `required=False`) so the public booking endpoint can accept them once the frontend is wired.

Seed data: `python manage.py seed_logistics_hosur` populates all of the above with the exact figures transcribed from the three PDFs (idempotent, safe to re-run). Two truck lanes were illegible in the PDF export (partially covered by a floating header) and were deliberately left out rather than guessed — add them by hand once confirmed.

**Migrations were generated (`logistics/migrations/0001_initial.py`, `service_requests/migrations/0020_servicerequest_drop_address_and_more.py`) but not applied** — this sandbox can't reach the Supabase Postgres host in `.env`. Run against your real dev DB:
```
cd backend
python manage.py migrate
python manage.py seed_logistics_hosur
```

---

## Phase 2 — Frontend: fix rule violations, then wire to the backend

Do these two together per file, not as separate passes — you'll be touching the same JSX either way.

1. **Replace Tailwind + hardcoded hex with CLAUDE.md's inline-style + CSS-variable convention.** All three pages currently use Tailwind utility classNames (250–360 occurrences each) and hardcoded hex colors (100–220 each), zero `var(--...)` usage. This is the most visible rule violation and will get flagged in review regardless of the backend work.
2. **Extract shared components** into `frontend/src/components/` — the three pages duplicate ~80% of their structure (OTP modal, dimension-diagram SVGs, fare/tier cards, FAQ accordion, areas-served chip list, footer). One shared `<TierCard>`, `<LaneTable>`, `<AreasServedList>`, `<OtpLoginModal>` set replaces three near-identical copies and means the API wiring below only has to be written once.
3. **Replace hardcoded arrays with `fetch`/`axios` calls** to the three new endpoints above.
4. **Wire the booking submission** ("Get Estimate" / "Select & Book" / "Check Prices") to `POST /api/booking/` (existing `service_requests` public create endpoint — check `service_requests/urls.py` for the exact path), sending `drop_address`, `logistics_tier`, `logistics_lane` alongside the existing fields.
5. Decide what to do with the mocked OTP flow — check `accounts/` for an existing phone-OTP endpoint (`accounts.OTPAuditLog` exists per `MODEL_CLASSIFICATION.md`, suggesting OTP infra is real elsewhere in the app) before building a new one.

---

## Phase 3 — Server-side fare integrity (before this goes live)

Right now (even after Phase 2) a submitted `total_amount` would still be whatever the client sends. Before this handles real payments: compute/validate the fare server-side from `ServiceTier.starting_price` / `Lane.fare` in a service function under `service_requests/services/` (never inline in a view, per CLAUDE.md), rejecting bookings where the client-submitted amount doesn't match. This is a standard trust-boundary fix, not exotic.

---

## Explicitly out of scope for now

- `Vehicle` fleet records, `Trip`/`TripStop`, live GPS trip tracking — no fleet exists yet to track.
- E-way bill generation/compliance, GST RCM tax handling — blocked on `[COUNSEL]` in the source doc. Don't build against assumptions here; a wrong RCM determination is a real tax liability.
- Insurance/claims, `ManifestItem` condition evidence — only relevant once Packers & Movers has a real crew/insurance vendor relationship, not for an MVP booking flow.
- Multi-stop routing / N-address bookings — current model handles exactly 2 addresses (pickup, drop), matching what the actual UI collects. Revisit only if a real multi-stop requirement shows up.

---

## Open items for TL

1. Confirm where (if anywhere) the Phase 5A `Address`/`AddressLink`/`max_assignments` structural work actually lives — it isn't on `ServiceRequest`.
2. Confirm the two illegible truck lanes in the seed data, or supply the correct figures.
3. Confirm whether phone-OTP auth already exists (`accounts.OTPAuditLog` suggests it might) before Phase 2 builds a new one.
4. Confirm payment flow expectations (COD vs online) for these two categories — `ServiceRequest.PaymentMethod` already supports both.
