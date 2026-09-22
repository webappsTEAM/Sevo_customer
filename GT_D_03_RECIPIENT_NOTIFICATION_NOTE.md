# GT-D-03 — the person receiving the goods is never told anything

## What's there
`ServiceRequest.drop_address` (Text field) captures the destination
address for a Goods & Transport booking. There is no field anywhere for
the recipient/consignee's name or phone number.

## Why it isn't fixed in this pass
Unlike GT-B-04 (fixed this pass — `description` already existed as a
usable field, just wasn't required), there's genuinely no existing field
to notify a recipient through here — no phone number is captured for
anyone but the person who made the booking. Closing this needs new fields
(`drop_contact_name`, `drop_contact_phone` at minimum) via a migration
against the live shared database, which this session can't run or verify
-- same reasoning as HS-E-01 and HS-B-03.

## Recommended next step
Add `drop_contact_name`/`drop_contact_phone` to `ServiceRequest` (or a
small related model if a booking can have multiple drop points later),
collect them in the booking form for logistics categories the same way
GT-B-04's `description` requirement was added, and send an SMS/email to
that contact when the vendor app reports `employee_on_the_way` /
`service_completed` for a logistics booking (the notification
infrastructure for this already exists per HS-D-06's
notify_technician_on_the_way -- it would need a second recipient, not new
machinery).
