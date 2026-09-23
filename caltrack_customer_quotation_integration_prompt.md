# sevo CUSTOMER — QUOTATION INTEGRATION IMPLEMENTATION PROMPT

## GOAL

Implement the Customer-side integration for the existing sevo Workforce Estimation + Quotation system.

The Workforce side already supports:

Customer booking → ESTIMATION job → employee inspection → quotation → quote sent to customer → customer decision → WORK booking.

Now make the Customer app work correctly with that existing system.

IMPORTANT:
- Inspect the actual Customer codebase before changing anything.
- Inspect the shared PostgreSQL schema and existing Workforce API contract.
- Reuse existing booking, auth, socket, notification, and state-management systems.
- Do not create duplicate quotation tables, booking systems, sockets, or notification systems.
- Do not use fake/mock quotation data.
- Do not hardcode service IDs in frontend logic.
- Do not guess endpoint names, table names, socket events, or model fields.
- Do not mark work complete until the real database and running frontend are tested.

---

# 1. TARGET FLOW

CUSTOMER
  ↓
Select quotation-based service
  ↓
Booking created as ESTIMATION
  ↓
WORKFORCE employee receives estimation job
  ↓
Employee completes GPS + OTP + selfie + photos + inspection
  ↓
Workforce creates WorkforceQuote
  ↓
Quote status = SENT_TO_CUSTOMER
  ↓
Customer receives realtime notification
  ↓
Customer opens quotation
  ↓
Customer reviews backend-calculated amount
  ↓
ACCEPT / DECLINE / REQUEST CHANGES
  ↓
If ACCEPT:
actual WORK booking is created
  ↓
Customer sees booking
  ↓
Workforce receives WORK job
  ↓
Existing dispatch continues

---

# 2. AUDIT FIRST — DO NOT CODE BLINDLY

Before implementation inspect:

Customer:
- service catalog
- booking flow
- ServiceRequest API/model usage
- booking detail page
- authentication
- notifications
- sockets/realtime
- API client
- React state/query system
- routing

Shared database:
- service_requests_servicerequest
- request_kind
- parent_request_id
- quote_number
- existing status fields
- customer relationship
- service relationship

Workforce:
- WorkforceQuote
- WorkforceQuoteItem
- WorkforceQuoteMeasurement
- WorkforceQuotePhoto
- WorkforcePaintingQuote
- WorkforceMasonQuote
- quote status/state machine
- customer quote API
- customer decision API
- conversion logic
- existing realtime events

Do not modify anything until this audit is complete.

First produce a short contract summary containing the ACTUAL:
- booking endpoint
- quote list endpoint
- quote detail endpoint
- decision endpoint
- conversion behavior
- socket mechanism
- notification mechanism
- shared DB fields

Use repository names, not assumed names.

---

# 3. SERVICE CLASSIFICATION

Current quotation-based services:

Painting:
91 Interior Painting
92 Exterior Painting
93 Waterproofing
94 Wood & Metal
95 Texture Decor

Mason:
35 Brick & Block Work
36 Plastering & Wall Repair
37 Wall & Partition Construction
38 Wall Breaking & Demolition

But the Customer frontend MUST NOT hardcode these IDs.

Use the authoritative service catalog field:

pricing_mode = "QUOTATION"

Fixed services remain:

pricing_mode = "FIXED"

For quotation services, booking UI must clearly say:

"Inspection and quotation required."

Do not display a fake final work price.

---

# 4. CUSTOMER BOOKING

Use the existing real booking API/service.

Quotation-based booking must produce:

request_kind = ESTIMATION

Do not directly insert database rows from frontend.

Do not create an EstimationRequest table.

Do not change fixed-price booking behavior.

Expected:

Customer booking
→ ServiceRequest
→ request_kind = ESTIMATION
→ pricing_mode = QUOTATION

If existing backend logic already derives request_kind from pricing_mode, reuse it.

---

# 5. CUSTOMER QUOTE LIST + DETAIL

Add or extend the existing Customer quote/estimate area using existing routing and UI conventions.

Quote list must show lightweight data:
- quote number
- service
- amount
- version
- status
- date

Use backend pagination.

Quote detail must show:
- quote number
- version
- service
- status
- inspection summary where permitted
- measurements where permitted
- photos/evidence where permitted
- line items
- subtotal
- discount
- tax
- total
- net payable
- valid until

The displayed amount MUST come from the backend.

Never trust a frontend-calculated total as authoritative.

---

# 6. QUOTE DATA OWNERSHIP

Workforce owns:

workforce_quote
workforce_quote_item
workforce_quote_measurement
workforce_quote_photo
workforce_painting_quote
workforce_mason_quote

Do NOT duplicate these quotation tables on Customer side.

Customer consumes the secure customer quotation API.

There must not be two independently editable quotation records.

---

# 7. QUOTE STATUS

Customer-visible states should include where applicable:

SENT_TO_CUSTOMER
CUSTOMER_ACCEPTED
CHANGES_REQUESTED
DECLINED
EXPIRED
SUPERSEDED
CONVERSION_PENDING
CONVERTED

Buttons must depend on backend status.

SENT_TO_CUSTOMER:
Accept / Request Changes / Decline

EXPIRED:
No acceptance

SUPERSEDED:
No acceptance; show latest version

CUSTOMER_ACCEPTED:
Show accepted state

CONVERSION_PENDING:
Show booking confirmation pending

CONVERTED:
Show actual WORK booking

---

# 8. ACCEPT QUOTATION

Use the real backend decision API.

Do not create the WORK booking only in frontend state.

Flow:

Customer clicks ACCEPT
→ backend validates customer
→ validates quote
→ validates status
→ validates expiry
→ records acceptance
→ creates/converts WORK ServiceRequest using existing backend logic
→ returns authoritative result
→ frontend displays result

Expected relationship:

ESTIMATION ServiceRequest
+
accepted WorkforceQuote
→
WORK ServiceRequest
request_kind = WORK
quote_number = accepted quote number

Follow the actual shared schema if parent_request_id is also required.

If Workforce already owns conversion, reuse that existing conversion contract. Do not implement a second conversion algorithm in Customer.

---

# 9. ACCEPT MUST BE IDEMPOTENT

Customer may double-click, retry, refresh, or lose network after the server succeeds.

Never create two WORK bookings for one accepted quote.

If backend already has idempotency, reuse it.

If not, implement idempotency in the backend decision/conversion path, not only in React.

Database should protect against duplicate conversion where appropriate.

Expected:

First ACCEPT → SR-XXXX
Second ACCEPT → same SR-XXXX

Never create another WORK request for the same quote.

---

# 10. REQUEST CHANGES

Customer selects:

REQUEST CHANGES

Require a note.

Example:

"Please include balcony painting."

Expected:

V1
→ CHANGES_REQUESTED
→ Workforce notified
→ Workforce creates V2
→ V1 remains historical
→ V2 becomes active
→ Customer receives V2

Never overwrite V1.

---

# 11. DECLINE

Customer selects DECLINE.

Require confirmation.

Expected:

SENT_TO_CUSTOMER
→ DECLINED

No WORK booking is created.

---

# 12. EXPIRY

Backend valid_until is authoritative.

Frontend may disable Accept when expired, but backend MUST also reject acceptance.

Handle QUOTE_EXPIRED cleanly.

Do not implement expiry using only a frontend timer.

---

# 13. REALTIME / SOCKET RULE

CRITICAL:

DATABASE = source of truth
API = authoritative state
SOCKET = realtime notification

Do not make socket payload the permanent source of truth.

Correct:

Workforce
→ database transaction
→ commit
→ socket event
→ Customer receives event
→ invalidate/refetch quote query
→ API
→ latest database state
→ Customer UI

Socket payload should be lightweight unless existing architecture requires otherwise.

---

# 14. SOCKET EVENTS

First inspect existing socket event names and reuse them.

For new events, follow existing conventions.

Useful events include:

QUOTE_SENT
QUOTE_UPDATED
QUOTE_REVISED
QUOTE_EXPIRED
QUOTE_ACCEPTED
QUOTE_DECLINED
QUOTE_CHANGES_REQUESTED
WORK_BOOKING_CREATED
WORK_BOOKING_UPDATED

Every important event should have an event_id if the existing event architecture supports it.

Customer must tolerate duplicate events.

Events must be scoped to the authenticated customer.

Never broadcast one customer's quotation to other customers.

---

# 15. SOCKET RECONNECT + MISSED EVENTS

Handle:
- disconnect
- reconnect
- browser refresh
- tab wake
- mobile/network changes
- expired auth
- missed events

On reconnect/app resume, refetch relevant active quotation/booking state.

If socket delivery fails:

opening My Quotes must still retrieve the quote from the API.

Required property:

SOCKET FAILURE ≠ DATA LOSS

---

# 16. SOCKET DUPLICATES / OUT-OF-ORDER

Events may arrive:
- twice
- late
- out of order

Use event_id, quote version, status, or existing project mechanism.

For important quote events:

socket event
→ invalidate/refetch
→ render latest backend state

Never blindly replace current state with an old socket payload.

---

# 17. STATE MANAGEMENT

Reuse the existing Customer data layer.

If React Query/TanStack Query exists:

socket event
→ invalidate relevant query
→ refetch

Use actual query keys from the project.

Do not introduce another state-management library.

Do not use 1-second polling.

Prefer:
- realtime updates
- refetch on screen focus
- refetch on reconnect
- manual refresh where useful

---

# 18. NOTIFICATIONS

Reuse the existing notification system.

When quotation is sent:
Customer receives the existing notification mechanism.

Example:

"Your Interior Painting quotation is ready."

Opening the notification should lead to the quote.

If socket fails, notification/database state still allows discovery.

If notification fails, My Quotes still retrieves the quote.

Do not build a second notification framework.

---

# 19. WORK BOOKING AFTER ACCEPTANCE

Do not display "Booking Confirmed" until the backend confirms that the WORK ServiceRequest exists.

Use states such as:

CUSTOMER_ACCEPTED
→ CONVERSION_PENDING
→ CONVERTED

Customer UI:

"Quotation accepted."
"Creating your service booking..."

Then:

"Booking confirmed."

Show actual booking ID and status.

Do not show "Work Started" until Workforce reports it.

---

# 20. DATABASE CONSISTENCY

After acceptance verify:

ESTIMATION ServiceRequest
→ accepted WorkforceQuote
→ WORK ServiceRequest

The accepted quote number must link correctly to the WORK request.

No:
- duplicate WORK booking
- orphan quote
- orphan WORK booking
- WORK booking without accepted quote

Do not create unnecessary duplicate tables.

---

# 21. SECURITY

Customer can access only their own:
- bookings
- quotations
- notifications
- work bookings

Never trust customer_id from URL/body/socket.

Use authenticated identity.

Test:

Customer A → Customer B quote = rejected
Customer A → Customer B booking = rejected
Customer A → Customer B acceptance = rejected
Customer changes quote amount = rejected

Customer must not modify:
- quote amount
- line-item rates
- tax
- vendor calculations
- quote status

---

# 22. PERFORMANCE

Keep APIs and realtime fast.

Quote list:
- pagination
- lightweight serializer
- no N+1

Quote detail:
- efficient related loading

Socket:
- small payloads
- no full quote payload unless required

Avoid:
- 1-second polling
- duplicate API calls
- loading every quote/photo at app startup
- N+1 queries

Inspect existing ORM/query behavior before optimizing.

---

# 23. ERROR HANDLING

Handle:

QUOTE_NOT_FOUND
QUOTE_EXPIRED
QUOTE_SUPERSEDED
QUOTE_ALREADY_ACCEPTED
QUOTE_ALREADY_DECLINED
CHANGES_ALREADY_REQUESTED
CONVERSION_PENDING
WORK_BOOKING_CREATION_FAILED
NETWORK_ERROR
AUTH_ERROR
PERMISSION_DENIED

If ACCEPT times out:

Do not blindly show failure.

Fetch latest quote/booking state.

If accepted → show accepted.
If conversion pending → show pending.
If converted → show booking.

---

# 24. DEVELOPMENT OTP

Customer OTP must eventually be real Customer ↔ Workforce communication.

Do not permanently use a fake OTP.

For local development only, if an existing test/development OTP mechanism exists, use it.

If none exists, add a clearly development-only mechanism.

Production must use real backend OTP validation.

Customer must never directly set otp_verified=true.

---

# 25. IMPLEMENTATION ORDER

Follow this order:

PHASE 1 — Audit
Inspect Customer + Workforce + DB contracts.

PHASE 2 — Booking
Make quotation-based booking produce ESTIMATION correctly.

PHASE 3 — Quote Read
Implement quote list/detail using existing secure API.

PHASE 4 — Quote UI
Build Customer quotation screen.

PHASE 5 — Decisions
Implement Accept / Decline / Request Changes.

PHASE 6 — Conversion
Reuse/verify accepted quote → WORK conversion.

PHASE 7 — Realtime
Integrate socket events with query invalidation/refetch.

PHASE 8 — Recovery
Implement reconnect and missed-event reconciliation.

PHASE 9 — Notifications
Connect quote and booking notifications.

PHASE 10 — Security
Customer ownership and tenant isolation.

PHASE 11 — Performance
Pagination, efficient queries, lightweight socket events.

PHASE 12 — Testing
API + integration + frontend/manual E2E.

Do not jump to later phases while earlier phases are broken.

---

# 26. MANUAL E2E TEST

After implementation, use the real running applications.

1. Customer login.
2. Select Interior Painting.
3. Confirm UI says inspection/quotation required.
4. Create booking.
5. Verify booking is ESTIMATION.
6. Workforce receives estimation job.
7. Workforce completes verification/inspection.
8. Workforce creates quotation.
9. Customer receives notification/socket update.
10. Customer opens quote.
11. Customer sees backend amount.
12. Customer accepts.
13. Backend creates WORK booking.
14. Customer sees WORK booking.
15. Workforce sees WORK job.
16. Existing dispatch continues.

Also test:
- Request Changes → V2
- Decline → no WORK booking
- Expired quote → cannot accept
- Socket disconnected → quote still appears after reconnect/API refresh
- Double Accept → exactly one WORK booking

---

# 27. DO NOT USE MOCK DATA

Final verification must use:

real Customer frontend
+
real Workforce backend
+
real PostgreSQL
+
real APIs
+
real socket/realtime

No fake quote cards.
No hardcoded totals.
No fake booking status.
No local-only quotation records.
No direct database writes from frontend.

---

# 28. COMPLETION CHECKLIST

Do not say COMPLETE until actually verified:

[ ] Customer audit completed
[ ] Shared DB contract verified
[ ] Pricing mode comes from backend
[ ] QUOTATION booking creates ESTIMATION
[ ] Fixed booking unchanged
[ ] Quote list works
[ ] Quote detail works
[ ] Backend amount displayed
[ ] Accept works
[ ] Decline works
[ ] Request Changes works
[ ] Quote versions preserved
[ ] Expired quote blocked
[ ] Accepted quote converts to WORK
[ ] Conversion idempotent
[ ] No duplicate WORK booking
[ ] Socket update works
[ ] Socket scoped to customer
[ ] Duplicate events handled
[ ] Reconnect works
[ ] Missed events recover through API
[ ] Query invalidation works
[ ] Notifications work
[ ] Customer ownership enforced
[ ] Quote amount cannot be manipulated
[ ] No N+1 introduced
[ ] Pagination works
[ ] Manual E2E passes

---

# 29. FINAL REPORT

After implementation report only actual results.

## Files changed
List actual files.

## Database
List actual changes.

## APIs
List actual endpoints.

## Realtime
List actual socket events.

## Customer UI
List actual screens/components.

## Booking
Explain ESTIMATION → WORK.

## Security
Explain ownership checks.

## Performance
Explain query/polling/socket behavior.

## Tests
Show exact commands and results.

## Manual E2E
Report:

Customer booking: PASS/FAIL
Estimation job: PASS/FAIL
Quotation received: PASS/FAIL
Quote detail: PASS/FAIL
Accept: PASS/FAIL
WORK booking: PASS/FAIL
Request Changes: PASS/FAIL
Decline: PASS/FAIL
Socket reconnect: PASS/FAIL
Duplicate acceptance: PASS/FAIL

Anything not tested must be marked NOT TESTED.

---

# FINAL ARCHITECTURE

DATABASE
= source of truth

API
= authoritative state

SOCKET
= realtime notification

CUSTOMER
= booking + quotation decision

WORKFORCE
= estimation + quotation generation + work execution

Never make frontend/socket state the permanent source of truth.

Never duplicate quotation data unnecessarily.

Never create duplicate work bookings.

Never bypass backend validation.

Implement against the actual current codebase, not assumed filenames/endpoints.
