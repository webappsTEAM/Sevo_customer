# HS-E-01 — a rating cannot be attributed to a technician

## What's there today
`ServiceRequest` carries a "current technician" snapshot
(`technician_id`/`name`/`phone`/`photo`/`rating` via `BookingAssignment`,
kept live by the webhook handlers wired up in Stage 1 — see
`workforce_integration/views.py`'s `WorkforceWebhookView`). `ServiceFeedback`
(the customer's post-job rating) has no technician reference at all — only
a `OneToOneField` to `ServiceRequest`.

## Why this is a real gap
A booking can be reassigned (technician declines, gets swapped, a
reschedule moves it to someone else). `BookingAssignment`/the SR snapshot
reflects whoever is *currently* assigned, not necessarily who actually did
the job the customer is rating. Reading "which technician does this
5-star review belong to" off the current snapshot at report-generation
time can silently misattribute a rating to the wrong person once any
reassignment has happened on that booking.

## Why it isn't fixed in this pass
Closing this properly needs a schema change — a `technician_id` (and ideally
a name snapshot, for when the technician record itself changes later) added
to `ServiceFeedback`, populated at whichever point in the job lifecycle is
authoritative (job completion, not booking creation) from
`BookingAssignment`, plus a migration and — for feedback rows that already
exist — a backfill decision (best-effort from current assignment data, or
leave historical rows unattributed and only fix it going forward).

That's a Django migration against a live, shared production table
(`service_requests_servicerequest` and friends are already flagged in the
original gap analysis, X-04, as having schema drift between the two apps'
ORMs). This session has no way to run `makemigrations`/`migrate` against
the real database or verify the migration applies cleanly — every fix
applied so far was chosen specifically to avoid that risk (see also
STAGE1_STATE_MACHINE_RECONCILIATION.md and HS_B_01_PRICE_VALIDATION_NOTE.md
for the same reasoning). Writing a migration file blind, without a way to
confirm it applies against the actual schema, is a real risk of breaking
deploys — worse than leaving the attribution gap open one more stage.

## Recommended next step
Whoever runs `python manage.py makemigrations` against the real database
should add:
- `ServiceFeedback.technician_id` (CharField, blank/indexed) and
  `technician_name_snapshot` (CharField, blank) — snapshot, not FK, matching
  the pattern `BookingAssignment` already uses for the same cross-app
  reason (no local FK to the vendor app's `Employee` table).
- Populate both at the point feedback becomes requestable (job marked
  `completed`), from `BookingAssignment`'s value at that moment — not
  read lazily from whatever the SR's *current* assignment is later.
