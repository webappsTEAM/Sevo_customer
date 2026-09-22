# State machine vocabulary reconciliation (X-03)

## The problem

Both apps run their own `apply_transition()` against the **same** `status`
column on the shared `service_requests_servicerequest` table (Customer app:
`service_requests/state_machine.py`; vendor app: `service_requests/state_machine.py`).
Each has its own `ALLOWED_TRANSITIONS` dict, and the two vocabularies have
diverged -- some statuses only one side knows about, and some names differ
`lower_case` vs `Title Case` in principle (in practice both actually persist
lowercase strings to the DB, so no case mismatch exists at rest, but the
Python model layer represents them differently: Customer uses a `TextChoices`
enum, vendor uses bare strings).

This document is diagnosis + a reconciliation recommendation only -- no enum
values are renamed in either app by this pass, because doing so touches a
live, shared production column with no way to verify the change against the
real database from this session.

## Exact vocabularies (as read from both `state_machine.py` files this session)

**Vendor-only** (not in Customer's `ServiceRequest.Status` enum at all):
`offering`, `dispatching`, `redispatching`, `en_route`, `service_started`, `reassigned`

**Customer-only** (not in vendor's `ALLOWED_TRANSITIONS` dict at all):
`pending_payment`, `waiting_for_payment`, `reviewed`, `awaiting_verification`,
`verified`, `feedback_pending`, `feedback_received`, `rework_requested`,
`rescheduled`, `rejected`, `closed`

**Shared** (present, spelled identically, in both):
`draft`, `new_request`, `unassigned`, `confirmed`, `assigned`, `received`,
`accepted`, `on_the_way`, `arrived`, `in_progress`, `proof_submitted`,
`follow_up_required`, `completed`, `cancelled`, `unable_to_complete`

## Why this is a real risk, not just untidiness

- If the vendor app ever writes `en_route`, `service_started`,
  `offering`, `dispatching`, `redispatching`, or `reassigned` to the shared
  column, the Customer app's own `apply_transition()` -- the thing every
  Customer-side status write is supposed to go through -- has **no entry**
  for those keys in `ALLOWED_TRANSITIONS`. Any subsequent Customer-side
  transition attempt from one of those states falls through to
  `ALLOWED_TRANSITIONS.get(current_status, set())` -> an empty set -> every
  transition looks illegal until something moves the row to a status
  Customer recognizes again.
- The reverse is also true: if the Customer app ever moves a booking to
  `pending_payment`, `reviewed`, `awaiting_verification`, `verified`,
  `rework_requested`, `rescheduled`, or `closed`, the vendor app's
  dispatch/eligibility queries (which filter on specific status strings,
  e.g. `DISPATCHABLE_STATUSES` in `automatic_dispatch.py`) will not
  recognize the booking as something they should act on, and it will
  silently sit un-dispatched.
- This session's webhook-wiring pass (X-01) only maps the *shared* subset
  (`accepted`, `on_the_way`/`en_route`, `arrived`, `in_progress`,
  `completed` -- see `_CUSTOMER_WEBHOOK_EVENT_MAP` in the vendor app's
  `state_machine.py`) precisely because the unshared statuses have no
  agreed meaning on the other side yet.

## Recommended reconciliation approaches (pick one, needs a decision -- not made here)

1. **Single canonical enum, shared package.** Define one
   `ServiceRequestStatus` enum in a small package both Django projects
   install (even as a vendored/copied module, since these are separate
   codebases with `managed=False` cross-references already establishing a
   coupling). Both `ALLOWED_TRANSITIONS` dicts import from it. Highest
   long-term consistency, but is a real migration: every reference to a
   status string in either codebase needs to be checked against the new
   canonical spelling.
2. **Explicit translation layer at the integration boundary.** Keep both
   vocabularies as they are, but every cross-app touchpoint (the new
   webhook sender/receiver from this pass, plus anywhere either app reads
   the other's writes) goes through a small bidirectional mapping table
   (like `_CUSTOMER_WEBHOOK_EVENT_MAP`, generalized to cover status reads
   too, not just webhook event names). Lower migration cost, but the two
   `ALLOWED_TRANSITIONS` dicts keep drifting independently unless someone
   enforces the mapping stays in sync by hand.
3. **Narrow the vendor-only statuses down to the shared subset.** `offering`,
   `dispatching`, `redispatching`, `reassigned`, and `en_route` all read as
   vendor-internal *sub-states* of statuses Customer already has
   (`unassigned`, `on_the_way`). If they are genuinely internal
   choreography that never needs to be visible to the customer, the vendor
   app could stop writing them to the *shared* status column entirely and
   track them in a vendor-only field instead (it already has several --
   `WorkforceJobOffer.status`, `EmployeeJob.status` -- that could absorb
   this), leaving the shared column using only the already-shared
   vocabulary. This is the cleanest fix but requires knowing whether
   anything outside the vendor app currently depends on seeing those
   intermediate states on the shared column.

None of these should be started without confirming with whoever owns the
production database that a live audit of what values are *actually* present
in the `status` column right now agrees with what's in these two files --
the code is the intended vocabulary, not necessarily the deployed one.
