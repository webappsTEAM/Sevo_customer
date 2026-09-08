# HS-C-04 / HS-C-05 — cancellation and refunds never touch a payment gateway

## What's there
A full `RefundRequest` admin workflow exists: create → approve
(full/partial) → send to finance → (a `admin_complete_refund` service
function that marks status COMPLETED). `RefundRequest.gateway_reference`
is already a field on the model.

## What's actually missing
1. `admin_complete_refund()` is never called from any view — grepped every
   view in `service_requests/views.py` (`AdminRefundActionView`, the only
   candidate, is a stub that just forwards to the detail GET). So there is
   no exposed way to ever mark a refund COMPLETED through the API today —
   the workflow's last real step is "sent to finance", after which
   whatever happens is entirely outside this system (someone processes the
   refund by hand via the Razorpay dashboard or a bank transfer, and
   nothing in the app ever finds out).
2. `gateway_reference` is never written by any code path — so even if
   completion were wired up, there's currently no mechanism requiring
   proof a refund gateway call actually happened before the system
   considers the refund done.
3. Cancellation (`CustomerBookingCancelView`) doesn't create a
   `RefundRequest` or call the gateway automatically either — a cancelled,
   already-paid booking requires a customer or admin to separately go
   create a refund request through the flow above.

## Why this isn't fixed in this pass
Unlike the earlier fixes this session (rejecting bad data, adding a
missing status check, retrying on a DB collision), actually calling
Razorpay's refund API moves real money. Getting it wrong — refunding the
wrong payment, the wrong amount, or twice — is a materially different
class of mistake than a booking-form validation bug, and this session has
no Razorpay sandbox credentials or a way to execute a test call to verify
the integration actually works before it would run against production
mistakenly. That's a stricter bar than the "can't verify against a live
DB" reasoning used elsewhere (HS-E-01, HS-B-03) — here the downside of
being wrong is an actual incorrect financial transaction, not just a
broken deploy.

## Recommended next step (needs your sign-off, not just review)
- Wire `AdminRefundActionView`'s `complete` action (or a new dedicated
  endpoint) to actually call `razorpay_client.payment.refund(payment_id,
  {"amount": ...})` using the `Payment.gateway_order_id`/payment id
  captured by the Stage 0 payment fixes, store the gateway's refund id in
  `RefundRequest.gateway_reference`, and only allow status COMPLETED once
  that call succeeds.
- Have `CustomerBookingCancelView` auto-create a `RefundRequest` for an
  already-paid cancellation instead of requiring a separate manual step.
- Test both against Razorpay's sandbox/test mode with real test credentials
  before this touches production — which needs your Razorpay test
  credentials and a way to run it, neither of which this session has.
