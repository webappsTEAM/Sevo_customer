# CalServices ⇄ Vendor (Workforce) App — Integration Handover

**Audience:** the developer of the separate Vendor/Workforce application.
**Purpose:** the complete, current contract between CalServices (this backend) and your app, so bookings, technician dispatch, tracking, payments-sync, and the new vendor skill-approval flow all work end-to-end.

## 0. How to read this document

There are two Django projects, two databases, no shared code, and no cross-app foreign keys anywhere. Every integration point below is either:

- **Inbound** — you call an endpoint on CalServices. Base path: `https://<calservices-host>/api/workforce-integration/...` (there's also one admin-only piece under `/api/settings/...` — see §5).
- **Outbound** — CalServices calls an endpoint on your app. Base path: `{WORKFORCE_API_BASE_URL}/...` — that env var lives on the CalServices side and must point at your app's public base URL.

Everything is JSON over HTTPS. There is no shared session/cookie auth in either direction — auth is a shared secret (§1).

If you only read one section before wiring things up, read §1 (auth) and §4 (outbound calls CalServices makes to you) — §4 is where the actual bugs/gaps live today.

---

## 1. Authentication

One shared secret, set identically on both sides:

```
WORKFORCE_WEBHOOK_SECRET=<same value on both apps>
```

**Calls you make to CalServices** (inbound, §2 and §3): send it as a header, any one of these is accepted:

```
X-Workforce-Webhook-Secret: <secret>
X-Workforce-Secret: <secret>
```

or, on `/webhook/` specifically, an HMAC-SHA256 signature over the raw request body instead:

```
X-Workforce-Signature: <hex hmac_sha256(secret, raw_body)>
```

or, on `/bookings/from-quote/` specifically, a bearer token is also accepted:

```
Authorization: Bearer <secret>
```

A request with none of these, or a value that doesn't match, gets `401 Unauthorized`. There's no per-vendor API key — it's one shared secret for the whole integration, same as it is today.

**Calls CalServices makes to you** (outbound, §4): CalServices sends

```
Authorization: Bearer <WORKFORCE_API_KEY or WORKFORCE_WEBHOOK_SECRET, depending on the call — see §4>
X-CalServices-Source: calservices-platform
```

Which of the two secrets is used depends on the specific call — flagged per-endpoint in §4, because this is one of the places where the two sides have historically drifted (see the Known Gaps note on `WORKFORCE_API_KEY`).

**In DEBUG/local dev only**, CalServices falls back to a well-known placeholder secret (`dev-insecure-workforce-webhook-secret-local-testing-only`) if `WORKFORCE_WEBHOOK_SECRET` isn't set. In production it hard-fails startup if the var is missing — so if your staging/prod integration returns 401 everywhere, check that var is actually set (and identical) on both sides first.

---

## 2. Inbound — the booking lifecycle webhook (the one you'll use the most)

```
POST /api/workforce-integration/webhook/
```

This is a single endpoint for every job-lifecycle event. Send one event per state change, as soon as it happens on your side.

### Envelope

```json
{
  "event": "employee_accepted",
  "event_id": "your-own-unique-id-per-event",
  "sequence": 3,
  "booking_id": "SR-000123",
  "payload": { "...": "event-specific fields, see below" }
}
```

- `booking_id` — required. Either CalServices' `request_id` (e.g. `"SR-000123"`) or its numeric internal id. This is what everything is looked up by.
- `event` — required. One of the event names in the table below.
- `event_id` — **strongly recommended**. If you omit it, CalServices derives one by hashing `event + booking_id + sequence + workforce_job_id + status`, which only dedupes correctly if those fields are stable and present — send your own real, unique id per event instead.
- `sequence` — optional integer, used only as part of the fallback `event_id` derivation above.
- `payload` — the event-specific fields. Also accepted as `data` instead of `payload`, or flattened directly onto the top-level object if you don't want to nest it — CalServices checks `payload`, then `data`, then falls back to the whole request body.
- `company_id` / `tenant_id` (optional, inside payload or top-level) — if the booking has a `company_id` on the CalServices side and you send a mismatched one, the webhook is rejected with `403`. Omit it if you don't track this.

### Idempotency

Every event is deduplicated by `event_id`. Re-sending the same `event_id` after it was already fully processed returns `200 {"success": true, "duplicate": true}` and does nothing else — safe to retry blindly on network failure. **This is on you to get right**: reuse a stable id per logical event when you retry, don't generate a new one.

### Response

```json
{
  "success": true,
  "event": "employee_accepted",
  "booking_id": "SR-000123",
  "status": "accepted",
  "is_accepted": true
}
```

`status` is the booking's resulting CalServices status. Errors: `400` (missing `event`/`booking_id`, or malformed JSON), `401` (bad/missing secret), `403` (tenant mismatch), `404` (booking not found), `500` (something threw — the event is marked `FAILED` server-side and you should retry it later).

### Event reference

Every event below is safe to send even if the booking isn't in the exact state you'd expect — CalServices only applies the state transition if the booking's current status makes it valid, and silently ignores an out-of-order one rather than erroring (logged, not rejected). Send events as your own state machine produces them; don't try to suppress "out of order" ones on your end.

| `event` (any of these aliases) | What it does on CalServices | Key `payload` fields |
|---|---|---|
| `technician.assigned` / `job.assigned` / `employee_notified` | Creates an "offered" assignment record. Booking → `assigned` (if it was `confirmed`/`reviewed`). **Does not** yet expose technician info to the customer. | `vendor` `{id, name, logo, verified}`, `technician` `{id, name, photo, phone, rating, verified}`, `workforce_job_id`, `assignment_id` |
| `employee_accepted` / `job.accepted` / `technician.accepted` | Marks the assignment accepted. **This is the first event that populates technician name/phone/photo/rating onto the customer-visible booking** — send it as soon as your technician accepts, with full technician details. Booking → `accepted`. Triggers the customer "technician assigned" notification. | `technician` `{name, phone, photo, rating}` (also accepts `employee_name`/`tech_name`/`mobile`/`contact`/`avatar`/`image` as fallback field names), `workforce_job_id`, `assignment_id` |
| `employee_rejected` / `job.rejected` / `assignment_expired` / `job.expired` | Clears technician info from the customer view, booking → back to `confirmed` for redispatch. | `reason` (free text, shown internally) |
| `booking.dispatch_delayed` / `job.dispatch_delayed` / `dispatch.delayed` | **Informational only** — does not change booking status. Pushes a "still matching you" message to the live tracking screen. Use this when you're still searching for a technician after several failed offer cycles. | `message` (optional custom text), `failed_offer_cycles` (int) |
| `technician.delayed` / `job.technician_delayed` | A technician is already assigned but running late. Pushes a delay message + sends a (deduplicated) delay email to the customer. | `reason`, `delay_count` (int), `rescheduled_date`, `message` |
| `employee_on_the_way` / `job.on_the_way` | Booking → `on_the_way`. Updates technician GPS if given. Sends "on the way" notification; also notifies the drop-off recipient for Goods & Transport bookings. | `location` `{latitude, longitude}` |
| `employee_arrived` / `job.arrived` | Booking → `arrived`. Updates GPS if given. | `location` `{latitude, longitude}` |
| `service_started` / `job.in_progress` | Booking → `in_progress`. | — |
| `service_completed` / `job.completed` | Booking → `completed`. Marks the assignment completed. **Runs fare reconciliation** (see below) and processes referral rewards. | `actual_distance_km` / `distance_km` / `trip_distance_km` (optional, Goods & Transport only — see Fare Reconciliation) |
| `technician.location_updated` / `location.updated` / `gps.location` | Records a GPS fix (ordered/deduplicated server-side — a fix that arrives late but is chronologically older than what's already stored is dropped, so send `captured_at`/`timestamp`/`updated_at` on every fix). | `location` `{latitude, longitude, accuracy, heading, speed}`, `captured_at` (ISO datetime — **send this**, it's how stale/out-of-order GPS packets get rejected instead of moving the customer's map pin backwards) |
| `work_extension.created` / `additional_work.requested` / `job.extension_requested` | Creates a pending-admin-review work extension (extra work found on site). | `items`/`line_items`: `[{name, quantity, cost}]`, `technician_estimate`, `requires_specialist` (bool), `required_skill` |
| `payment.collected` / `payment.paid` / `job.payment_collected` | Marks the booking's payment as `PAID` (for COD/on-site collection). | `amount`, `collected_by_name`, `collection_method` (e.g. `CASH`/`UPI`), `transaction_reference`/`receipt_id`/`payment_id` |
| `specialist.requested` / `job.specialist_required` | Appends an escalation note to the booking's description (internal-facing only). | `required_skill`, `reason` |
| `job.completion_proof_submitted` / `completion_proof.uploaded` | Records proof-of-delivery. Idempotent per (booking, stop, kind, value) — safe to resubmit after a network retry, won't duplicate. | `photo_url`/`proof_image`/`image_url`, `signature_url`/`signature_image`, `recipient_name`, `recipient_phone`, `otp_verified` (bool), `notes`, `location` `{latitude, longitude}`, `stop_id`/`trip_stop_id` or `stop_sequence` (multi-stop Goods & Transport only) |
| `logistics.leg_changed` / `job.leg_changed` / `trip.leg_changed` | **Goods & Transport only** (ignored otherwise). Advances the trip leg. `leg == "DELIVERED"` also triggers final fare reconciliation. | `leg` (string, your leg enum — invalid values are logged and dropped, not errored) |
| `trip.stop_arrived` / `trip.stop_completed` / `job.stop_progress` | **Multi-stop Goods & Transport only.** Records arrival/completion timestamps on one stop. Idempotent — won't rewrite an already-recorded timestamp. | `stop_id`/`trip_stop_id` or `stop_sequence`, `completed` (bool, or use event name `trip.stop_completed`) |
| `job.rescheduled` / `appointment.rescheduled` | Booking → `rescheduled`, updates the date/time, logs a `JobReschedule` record. | `new_date` (required for this to do anything), `new_time`/`preferred_time`, `reason` |

### Fare reconciliation (Goods & Transport)

On `service_completed` **and again** on `leg == "DELIVERED"` (both are safe to fire — reconciliation is idempotent, keyed on the booking), CalServices recomputes the final fare from server-side facts only: recorded stops, admin-approved extra work, the minimum fare in the locked quote, and — **only if you send it** — `actual_distance_km` (accepted as `actual_distance_km`, `distance_km`, or `trip_distance_km`). If you never send a measured distance, the final fare reconciles everything except distance variance and leaves the quoted distance component as-is. **If your app measures real trip distance, send it on the `DELIVERED` leg-change event or the `service_completed` event — this is currently not being sent, so distance-based fare variance is not being captured today.**

---

## 3. Inbound — the other endpoints you call

### 3.1 Available slots

```
GET /api/workforce-integration/slots/?category=<cat>&date=<YYYY-MM-DD>&lat=<lat>&lng=<lng>
```

No auth required (public `AllowAny`). CalServices calls *your* equivalent for this (see §4.6) — this endpoint on the CalServices side exists so the customer booking UI can ask CalServices, which proxies to you. You don't need to call this one yourself; documented here for completeness.

### 3.2 Booking from an accepted quote

```
POST /api/workforce-integration/bookings/from-quote/
```

Call this once your side has an accepted quote (e.g. after an on-site inspection) and you want CalServices to create the follow-up billable booking (a child `ServiceRequest`, "SR-B") linked to the original inspection booking.

```json
{
  "quote_number": "Q-000456",
  "parent_request_id": "SR-000123",
  "total_amount": 2499.00,
  "cart_data": [ { "name": "AC Gas Refill", "price": 1999, "quantity": 1 } ],
  "service_category": "hvac",
  "preferred_date": "2026-09-15",
  "preferred_time": "afternoon"
}
```

`quote_number` and `parent_request_id` are required; everything else falls back to the parent booking's own values if omitted. Idempotent on `quote_number` — resubmitting the same one returns the already-created booking instead of duplicating it.

```json
{ "success": true, "request_id": "SR-000789", "tracking_token": "..." }
```

Note: if the parent booking's inspection fee was already paid, CalServices automatically deducts up to ₹49 of it from the new booking's total — you don't need to account for that on your side.

### 3.3 Browse the catalog (new)

```
GET /api/workforce-integration/catalog/
```

Auth required (§1 header). Returns active categories with their active services nested — this is what your vendor-facing "which skills can I offer" picker should be built from.

```json
{
  "success": true,
  "data": [
    {
      "id": 4,
      "name": "AC & Appliance",
      "slug": "ac-appliance",
      "services": [
        { "id": 12, "name": "Fridge", "slug": "fridge", "category": 4, "category_name": "AC & Appliance", "is_active": true, "image": "...", "sort_order": 0, "...": "full Service record, all fields" },
        { "id": 13, "name": "AC Service & Cleaning", "...": "..." }
      ]
    }
  ]
}
```

### 3.4 Submit / check vendor skill-approval requests (new)

```
GET  /api/workforce-integration/vendor-capabilities/?vendor_id=<your-vendor-id>&status=PENDING
POST /api/workforce-integration/vendor-capabilities/
```

Auth required (§1 header) on both. This is the **read side** — see §5 for where an admin actually approves/rejects.

**GET** — returns that vendor's own requests, any status unless you filter:

```json
{ "success": true, "data": [
  { "id": 7, "vendor_id": "V-901", "vendor_name": "Ravi Kumar", "service": 12, "service_name": "Fridge", "category_id": 4, "category_name": "AC & Appliance", "status": "PENDING", "note": "5 yrs AC repair experience", "decision_note": "", "decided_by": "", "decided_at": null, "requested_at": "2026-09-10T09:00:00Z" }
] }
```

Poll this per-vendor (or per-vendor-per-service) to know when an admin has approved/rejected — there is currently **no push notification** from CalServices when a decision is made; this is the only way to find out. **Before letting a vendor accept jobs under a given Service, check that a row here exists with `status: "APPROVED"` for that `vendor_id` + `service`.** That's the entire contract — CalServices does nothing else with the decision on its own side.

**POST** — vendor submits a request for one or more services:

```json
{
  "vendor_id": "V-901",
  "vendor_name": "Ravi Kumar",
  "service_ids": [12, 13],
  "note": "5 yrs AC repair experience"
}
```

(`service_id` singular also accepted for a one-off request.) Creates a `PENDING` row per `service_id` not already requested by this vendor. Re-submitting a `service_id` that already has a row (any status — pending, approved, or rejected) is a no-op for that row — it will **not** reset an already-decided request back to pending. Response echoes every row (new + pre-existing) plus counts:

```json
{ "success": true, "data": [ /* VendorCapabilityRequest rows */ ], "created_count": 1, "already_existing_count": 1 }
```

---

## 4. Outbound — calls CalServices makes to your app

**This is where the actual integration gaps are today.** Every URL below is `{WORKFORCE_API_BASE_URL}/...` where that base URL is set in CalServices' own environment — confirm with the CalServices team exactly what it's pointed at in each environment (local/staging/prod), and make sure these routes exist and accept the auth described.

| # | CalServices calls | Auth header sent | Your route must be | Status |
|---|---|---|---|---|
| 4.1 | `POST /jobs/dispatch/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Accept the booking payload (§4.1 below), return `{workforce_job_id: "..."}` with HTTP 200/201 | Working — but confirm `WORKFORCE_API_KEY`'s value is actually the one your app checks; see Known Gaps. |
| 4.2 | `POST /jobs/{workforce_job_id}/customer-cancel-sync/` | `Authorization: Bearer <WORKFORCE_WEBHOOK_SECRET>` | Release/cancel the job on your side when the **customer** (not the technician) cancels | Fixed on our side this cycle — previously called the wrong URL+auth (`/jobs/{id}/cancel/` with the API key, which is your *technician self-cancel* endpoint). **Please confirm `customer-cancel-sync` actually exists on your side and accepts the webhook secret** — if it doesn't exist yet, this silently no-ops today (logged, not surfaced). |
| 4.3 | `POST /jobs/{workforce_job_id}/clawback-sync/` | `Authorization: Bearer <WORKFORCE_WEBHOOK_SECRET>` | Claw back the technician's earnings ledger entry for a refunded job | Same as 4.2 — **please confirm this route exists on your side.** If missing, a fully refunded customer can leave a paid-out technician with no reconciling entry. |
| 4.4 | `POST /jobs/{workforce_job_id}/reschedule/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Update the job's schedule when the customer reschedules | **Known broken today.** Your existing route at this path (`WorkforceJobRescheduleView`) only accepts an authenticated vendor session/JWT, not this static API key — every call fails auth and CalServices silently falls back (`{"success": true, "fallback": true}`), so your side never actually hears about customer reschedules through this call. In practice the two apps share a database so you'll see the new `preferred_date`/`preferred_time` directly on the booking row regardless — but if you want the push notification to fire your own internal reschedule flow, **you need a small dedicated endpoint that accepts the shared secret**, mirroring 4.2/4.3. Flagging this explicitly since you asked to get the endpoints working correctly. |
| 4.5 | `POST /jobs/{workforce_job_id}/extension-decision/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Record whether the customer approved/declined a work extension | `{workforce_job_id, booking_id, extension_id, decision: "accepted"|"declined", notes, decided_at}` |
| 4.6 | `GET /capacity/slots/?category=&date=&lat=&lng=` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Return `{"slots": [{slot, label, available}, ...]}` | If this fails/times out (4s timeout), CalServices silently serves a hardcoded generic slot list instead — you won't see an error, just fewer real bookings reflecting your real capacity. |
| 4.7 | `GET /jobs/{booking_id}/live-tracking/` then `GET /customer/jobs/{booking_id}/tracking/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Return technician tracking payload, `{technician: {...}}` or `{technician_name: ...}` at the top level (or nested under `data`) | Tried in order, first one that responds 200 with usable technician data wins. Result cached 2s server-side. 1-second timeout per candidate — keep this fast. |
| 4.8 | `POST /technicians/{technician_id}/feedback/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Record the customer's rating against the technician's profile | `{booking_id, workforce_job_id, technician_id, rating, comments, submitted_at}` |
| 4.9 | `GET /customer/quote-token/{token}/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Return quote details by public token | Used for a customer-facing quote lookup page |
| 4.10 | `GET /customer/bookings/{booking_id}/quote/` | `Authorization: Bearer <WORKFORCE_API_KEY>` | Return quote details for a booking | Result cached 60s server-side |

### 4.1 detail — the dispatch payload

```json
{
  "booking_id": "SR-000123",
  "category": "hvac",
  "title": "AC not cooling",
  "description": "...",
  "notes": "",
  "customer": { "name": "...", "phone": "...", "email": "..." },
  "location": { "address": "...", "drop_address": "", "latitude": 12.9, "longitude": 77.6 },
  "schedule": { "preferred_date": "2026-09-15", "preferred_time": "afternoon" },
  "payment": { "total_amount": 999.0, "payment_method": "ONLINE", "payment_status": "PENDING" },
  "cart_data": [ { "...": "line items as stored on the booking" } ],
  "start_otp": "1234",
  "tracking_token": "..."
}
```

Your response **must** include `workforce_job_id` (or `job_id`) — if it's missing, CalServices treats the whole dispatch as failed (`retryable: true`) even on a 200/201 response.

### Known Gaps summary (please action these)

1. **`WORKFORCE_API_KEY`** — used for 4.1, 4.4–4.10. Confirm your app actually validates this specific value; historically it's been a value your app "has never actually been configured to recognize" per our own code comments, meaning several of these calls may be failing auth silently today with CalServices falling back to safe defaults. Worth a joint test pass per row in the table above.
2. **4.2 / 4.3 routes** (`customer-cancel-sync`, `clawback-sync`) — confirm these exist and accept `WORKFORCE_WEBHOOK_SECRET`. These were only recently pointed at correctly on our side; if your routes aren't live yet, cancellations/refunds aren't reaching you at all right now.
3. **4.4 reschedule** — needs a new endpoint on your side accepting the shared secret if you want an explicit push (see above); today it relies entirely on shared-database visibility.
4. **GPS ordering** — always send `captured_at`/`timestamp` on location events (event `technician.location_updated` etc.) — fixes get silently dropped if they look older than what's already stored, which is correct behavior but only works if you send real timestamps.
5. **Distance-based fare variance** — not applied today because no measured distance is ever sent on `service_completed` or the `DELIVERED` leg event. Send `actual_distance_km` on either if you want it captured.

---

## 5. Admin approval endpoints (CalServices side only — not for your app to call)

For context/completeness: once a vendor submits a capability request via §3.4, a CalServices admin reviews it in their own admin panel (`Catalog → Vendor Approvals`), which calls:

```
GET  /api/settings/catalog/v2/vendor-capabilities/?status=PENDING      (staff-session auth)
POST /api/settings/catalog/v2/vendor-capabilities/<id>/decide/         { "status": "APPROVED"|"REJECTED", "decision_note": "..." }
```

These require a logged-in CalServices staff session — your app has no reason to call them, listed here only so it's clear where the decision in §3.4's GET actually comes from.

---

## 6. Data model reference

- **`ServiceRequest`** — the booking. Looked up by `request_id` (string, e.g. `"SR-000123"`) or numeric `id`. Has `workforce_job_id` and `external_assignment_id` as its only links back to your side — plain strings, no FK.
- **`BookingAssignment`** — one row per offer/acceptance cycle for a booking (`OFFERED` → `ACCEPTED`/`REJECTED`/`EXPIRED`/`COMPLETED`).
- **`VendorCapabilityRequest`** (new) — one row per (`vendor_id`, `service`) pair, `PENDING`/`APPROVED`/`REJECTED`. `vendor_id` is just whatever id your app uses for itself — no FK, by design (separate databases).
- **`TripStop` / `DeliveryProof`** — Goods & Transport multi-stop tracking and proof-of-delivery, written only via the webhook events in §2.

No field in any CalServices model is a foreign key into your database, and vice versa — every cross-reference is a plain string/int id (`vendor_id`, `workforce_job_id`, `technician_id`, `booking_id`). This is deliberate (two separate Django projects, two separate databases) — don't try to introduce a shared-DB join anywhere.

---

## 7. Environment variables (must match on both sides)

| Variable | Set on | Purpose |
|---|---|---|
| `WORKFORCE_WEBHOOK_SECRET` | Both apps, same value | Auth for §2, §3, and the "sync" calls in §4 (4.2, 4.3) |
| `WORKFORCE_API_KEY` | CalServices (sent), your app (must validate) | Auth for most of §4's other calls — see Known Gap #1 |
| `WORKFORCE_API_BASE_URL` | CalServices only | Your app's base URL, e.g. `https://vendor.example.com/api/workforce` |

---

*Generated from the CalServices backend as of 2026-09-10 (`workforce_integration/views.py`, `workforce_integration/services.py`, `service_requests/models.py`). If either side's code changes, re-check this doc against the source rather than assuming it's still accurate — several of the Known Gaps above exist precisely because the two sides drifted from an earlier version of this same contract.*
