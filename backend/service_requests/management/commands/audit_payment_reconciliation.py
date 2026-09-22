"""
python manage.py audit_payment_reconciliation [--limit N] [--json]

HS-C-03/HS-C-06: "payment state reconciliation across three divergent
enums" -- this codebase actually carries THREE separate payment status
vocabularies that are never automatically kept in sync with each other:

  1. ServiceRequest.payment_status (this app, mirrored read-only in the
     vendor app) -- lowercase: pending/processing/collected/paid/failed/
     cancelled/refunded/partially_refunded. What the customer-facing UI
     reads.
  2. RefundRequest.status (this app only, RefundStatus) -- uppercase
     PENDING/INFO_REQUESTED/APPROVED_FULL/APPROVED_PARTIAL/REJECTED/
     SENT_TO_FINANCE/COMPLETED. A separate approval workflow that is
     NEVER written back onto ServiceRequest.payment_status by any code
     path found in this codebase -- a completed refund does not
     automatically flip the booking to "refunded"/"partially_refunded".
  3. workforce_api.JobPayment.payment_status (vendor app only, its own
     docstring calls it "the authoritative payment state machine") --
     uppercase PENDING/AUTHORIZED/PAID/CASH_PENDING/FAILED/REFUNDED/
     CANCELLED. This app cannot see it directly (JobPayment lives only in
     the vendor app's database models) -- see
     audit_jobpayment_reconciliation.py in the vendor app for that half.

This command is READ-ONLY. It does not write to the database, correct
any records, or resolve any of the divergences it finds -- it exists
purely to surface, in one report, every place these numbers /
booking-status pairs disagree with each other so a human can decide the
correct action per case (this is money -- an automated "fix" here is
exactly the kind of thing that should not happen unattended).

Findings reported:
  A. ServiceRequest.payment_status is refunded/partially_refunded, but
     there is no RefundRequest at all, or the most recent one is not
     COMPLETED. (Booking says refunded, but there's no completed refund
     approval on file for it.)
  B. A RefundRequest is COMPLETED, but the parent ServiceRequest's
     payment_status was never updated to refunded/partially_refunded.
     (A refund was approved and marked done, but the booking still shows
     its old paid/collected status.)
  C. A RefundRequest's approved_amount/paid_amount exceeds the booking's
     total_amount -- a sanity check independent of status vocabulary.
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Read-only audit of payment_status vs RefundRequest.status divergence (HS-C-03/HS-C-06)."

    REFUNDED_PAYMENT_STATUSES = {"refunded", "partially_refunded"}

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200, help="Stop after reporting this many findings per category (still counts the true total).")
        parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON instead of a human report.")

    def handle(self, *args, **options):
        from service_requests.models import ServiceRequest, RefundRequest, RefundStatus

        limit = options["limit"]
        as_json = options["json"]

        findings_a = []  # payment_status says refunded, no completed RefundRequest
        findings_b = []  # RefundRequest completed, payment_status not updated
        findings_c = []  # refund amount exceeds booking total

        # --- A: payment_status refunded/partially_refunded without a completed refund ---
        refunded_bookings = ServiceRequest.objects.filter(
            payment_status__in=self.REFUNDED_PAYMENT_STATUSES
        ).only("id", "request_id", "payment_status", "total_amount")
        for sr in refunded_bookings.iterator():
            latest = (
                RefundRequest.objects.filter(booking_id=sr.id)
                .order_by("-created_at")
                .only("status", "refund_id", "created_at")
                .first()
            )
            if latest is None or latest.status != RefundStatus.COMPLETED:
                findings_a.append({
                    "booking_id": sr.id,
                    "request_id": sr.request_id,
                    "payment_status": sr.payment_status,
                    "latest_refund_status": latest.status if latest else None,
                    "latest_refund_id": latest.refund_id if latest else None,
                })

        # --- B: completed refund, payment_status never flipped ---
        completed_refunds = (
            RefundRequest.objects.filter(status=RefundStatus.COMPLETED)
            .select_related("booking")
            .only("id", "refund_id", "approved_amount", "paid_amount", "requested_amount",
                  "booking__id", "booking__request_id", "booking__payment_status", "booking__total_amount")
        )
        for rr in completed_refunds.iterator():
            sr = rr.booking
            if sr.payment_status not in self.REFUNDED_PAYMENT_STATUSES:
                findings_b.append({
                    "booking_id": sr.id,
                    "request_id": sr.request_id,
                    "payment_status": sr.payment_status,
                    "refund_id": rr.refund_id,
                    "approved_amount": str(rr.approved_amount) if rr.approved_amount is not None else None,
                })

            # --- C: refund amount sanity check, piggybacked on the same query ---
            paid_or_approved = rr.paid_amount or rr.approved_amount or rr.requested_amount or 0
            if sr.total_amount is not None and paid_or_approved and paid_or_approved > sr.total_amount:
                findings_c.append({
                    "booking_id": sr.id,
                    "request_id": sr.request_id,
                    "refund_id": rr.refund_id,
                    "refund_amount": str(paid_or_approved),
                    "booking_total": str(sr.total_amount),
                })

        result = {
            "A_refunded_status_without_completed_refund": {
                "total": len(findings_a),
                "sample": findings_a[:limit],
            },
            "B_completed_refund_status_not_reflected": {
                "total": len(findings_b),
                "sample": findings_b[:limit],
            },
            "C_refund_amount_exceeds_booking_total": {
                "total": len(findings_c),
                "sample": findings_c[:limit],
            },
        }

        if as_json:
            import json
            self.stdout.write(json.dumps(result, indent=2, default=str))
            return

        self.stdout.write(self.style.MIGRATE_HEADING("HS-C-03/HS-C-06 payment reconciliation audit (read-only)"))
        self.stdout.write("")
        self.stdout.write(f"A. payment_status is refunded/partially_refunded but no COMPLETED refund on file: {len(findings_a)}")
        for f in findings_a[:limit]:
            self.stdout.write(f"     booking {f['request_id']} (id={f['booking_id']}) payment_status={f['payment_status']!r} latest_refund_status={f['latest_refund_status']!r}")
        self.stdout.write("")
        self.stdout.write(f"B. RefundRequest COMPLETED but booking payment_status was never updated: {len(findings_b)}")
        for f in findings_b[:limit]:
            self.stdout.write(f"     booking {f['request_id']} (id={f['booking_id']}) payment_status={f['payment_status']!r} refund={f['refund_id']} approved_amount={f['approved_amount']}")
        self.stdout.write("")
        self.stdout.write(f"C. Refund amount exceeds booking total_amount: {len(findings_c)}")
        for f in findings_c[:limit]:
            self.stdout.write(f"     booking {f['request_id']} (id={f['booking_id']}) refund={f['refund_id']} refund_amount={f['refund_amount']} booking_total={f['booking_total']}")
        self.stdout.write("")
        total = len(findings_a) + len(findings_b) + len(findings_c)
        if total == 0:
            self.stdout.write(self.style.SUCCESS("No divergences found."))
        else:
            self.stdout.write(self.style.WARNING(f"{total} total divergence(s) found -- this command made no changes. Review each case before deciding how to correct it."))
