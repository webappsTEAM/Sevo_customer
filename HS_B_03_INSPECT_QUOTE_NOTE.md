# HS-B-03 — inspect-then-quote flow is modelled but unreachable

## What's there
The customer app has a route (`/api/booking/quote/<token>/` →
`CustomerQuoteDetailView`) and a client method
(`WorkforceIntegrationService.get_quote_by_token()`) that calls
`{WORKFORCE_API_BASE_URL}/customer/quote-token/{token}/` on the vendor app.
A sibling method, `get_quote_by_booking_id()`, calls a similar
vendor-side lookup by booking id.

## Why it's unreachable
Neither endpoint exists on the vendor side (confirmed by grep across
`vendor/backend/workforce_api/urls.py` and `views.py` — no match for
`quote-token` or `customer/quote`). There is also no model anywhere in
either app for a "Quote" (an inspection-based estimate a technician
produces before the customer commits to a price) and nothing that would
ever generate the `token` this flow is keyed on in the first place. This
isn't a wiring bug like X-02 (where the target model/data existed and only
the endpoint was missing) — the whole feature (technician inspects the
job on-site, submits a quote, customer reviews and accepts/declines before
work proceeds) doesn't exist yet on the vendor side.

## Why it isn't built in this pass
This needs: a new `Quote` model on the vendor side (with its own
migration), a technician-facing "submit inspection quote" action, the two
missing customer-facing GET endpoints, and a decision on where in the
`ALLOWED_TRANSITIONS` state machine (X-03) an "awaiting quote" /
"quote received" status would sit — which touches the same shared
`status` column already flagged as having no verified live-database
inventory of what values are safe to introduce. That's new schema plus a
state-machine change, not a patch to existing code, so it's out of scope
for this backend-only remediation pass without a live database or product
sign-off on the inspection-quote UX.

## Recommended next step
Decide, with a live view of the database, whether inspect-then-quote is a
feature still wanted for the home-services flow at all before building it
— it may be that flat package pricing (already working) has superseded
the need for it, in which case the dead route/client method should simply
be removed instead.
