"""
Prepaid (online / wallet) trips whose final fare differs from what was paid.

The fare is finalised at DELIVERED (fare_reconciliation), after an online payment was already
taken. Two outcomes, both handled through machinery that already exists:

  final fare BELOW what was paid  -> a RefundRequest (reason OVERCHARGED) for the difference,
                                     which goes through the normal admin approval + gateway/wallet
                                     refund. It is never refunded automatically without review.
  final fare ABOVE what was paid  -> the customer sees a balance due and pays it through the
                                     ordinary payment order (_amount_due already returns
                                     total - paid).

Cash-on-service trips are untouched: the driver collects whatever the final fare is.
"""
import logging
from decimal import Decimal

from django.db.models import Sum

logger = logging.getLogger(__name__)

_CENT = Decimal("0.01")


def paid_total(sr):
    from service_requests.models import Payment, ServiceRequest
    v = Payment.objects.filter(
        service_request=sr,
        status__in=[ServiceRequest.PaymentStatus.PAID, ServiceRequest.PaymentStatus.COLLECTED],
    ).aggregate(t=Sum("amount"))["t"]
    return Decimal(str(v or 0))


def refunded_total(sr):
    from service_requests.models import RefundRequest, RefundStatus
    v = RefundRequest.objects.filter(booking=sr, status=RefundStatus.COMPLETED).aggregate(t=Sum("approved_amount"))["t"]
    return Decimal(str(v or 0))


def _is_prepaid(sr):
    return str(sr.payment_method or "").upper() == "ONLINE"


def balance_due(sr):
    """Amount still owed on a prepaid trip whose final fare rose above what was paid."""
    if not _is_prepaid(sr):
        return Decimal("0.00")
    paid = paid_total(sr)
    if paid <= 0:
        return Decimal("0.00")
    due = Decimal(str(sr.total_amount or 0)) - paid
    return due.quantize(_CENT) if due > 0 else Decimal("0.00")


def settle_prepaid_variance(sr):
    """
    Called right after the final fare is set. Returns "REFUND_REQUESTED", "BALANCE_DUE" or None.
    Idempotent: a retried DELIVERED event never opens a second refund for the same difference.
    """
    if not _is_prepaid(sr):
        return None
    paid = paid_total(sr)
    if paid <= 0:
        return None
    total = Decimal(str(sr.total_amount or 0))
    diff = (paid - refunded_total(sr) - total).quantize(_CENT)

    if diff > 0:
        from service_requests.models import RefundReason, RefundRequest, RefundStatus, RefundType
        open_states = [s for s in RefundStatus.values if s not in (RefundStatus.REJECTED, RefundStatus.COMPLETED)]
        if RefundRequest.objects.filter(booking=sr, reason=RefundReason.OVERCHARGED, status__in=open_states).exists():
            return "REFUND_REQUESTED"
        import service_requests.services as sr_services
        sr_services.create_refund_request(
            booking=sr, customer=sr.customer, amount=diff, reason=RefundReason.OVERCHARGED,
            additional_notes=f"Auto-created: final fare Rs. {total} is below the prepaid Rs. {paid}.",
            refund_type=RefundType.PARTIAL,
        )
        return "REFUND_REQUESTED"
    if diff < 0:
        return "BALANCE_DUE"
    return None
