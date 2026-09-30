"""
Release logistics bookings that were created for online/wallet payment but never paid.

Such a booking sits in WAITING_FOR_PAYMENT, is not dispatched, and (before this) stayed there
forever -- cluttering the customer's bookings and the admin queue. After the window it is
cancelled with no fee (any wallet part-payment is returned to the wallet). A payment that lands afterwards is already handled by
PaymentVerifyView (it raises a refund request for a cancelled booking).
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

LOGISTICS = ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers")


def payment_window_minutes():
    from service_requests.services.gt_operations import ops
    return max(int(ops("online_payment_window_minutes")), 1)


def expire_unpaid_online_bookings(now=None):
    from service_requests.models import ServiceRequest
    from service_requests.state_machine import apply_transition

    now = now or timezone.now()
    cutoff = now - timedelta(minutes=payment_window_minutes())
    stale = ServiceRequest.objects.filter(
        service_category__in=LOGISTICS,
        payment_method=ServiceRequest.PaymentMethod.ONLINE,
        status=ServiceRequest.Status.WAITING_FOR_PAYMENT,
        created_at__lt=cutoff,
    )
    cancelled = 0
    for sr in stale:
        try:
            sr.cancellation_reason = ServiceRequest.CancellationReason.PRICE_OR_PAYMENT
            apply_transition(sr, ServiceRequest.Status.CANCELLED, ServiceRequest.PaymentStatus.CANCELLED)
            sr.save()
            cancelled += 1
            _return_wallet_part_payment(sr)
            _tell_customer(sr)
        except Exception:
            logger.exception("Could not expire unpaid booking %s", sr.pk)
    return cancelled


def _tell_customer(sr):
    """One SMS per expired booking (event key makes a repeated sweep a no-op)."""
    phone = (getattr(sr, "phone", "") or "").strip()
    if not phone:
        return
    try:
        from service_requests.notifications import send_sms_notification
        send_sms_notification(
            mobile_number=phone,
            message=(f"SEVO: Booking {sr.request_id} was cancelled because the online payment was not completed "
                     f"in time. No amount was charged. You can book again anytime."),
            event_key=f"booking:{sr.request_id}:payment-expired",
            service_request=sr,
            preference_field="booking_confirmations",
        )
    except Exception:
        logger.warning("Could not send payment-expiry SMS for booking %s", sr.pk, exc_info=True)


def _return_wallet_part_payment(sr):
    """A wallet + online split leaves the wallet part spent while the rest was never paid. When the
    booking expires that money goes straight back. Idempotent per booking."""
    from decimal import Decimal
    from django.db.models import Sum
    from service_requests.models import Payment, ServiceRequest, WalletTransaction
    from service_requests.services import credit_wallet
    try:
        if WalletTransaction.objects.filter(reference_type="payment_expiry", reference_id=str(sr.request_id)).exists():
            return
        spent = Payment.objects.filter(
            service_request=sr, gateway="wallet", status=ServiceRequest.PaymentStatus.PAID,
        ).aggregate(t=Sum("amount"))["t"] or Decimal("0")
        if spent > 0 and sr.customer_id:
            credit_wallet(
                sr.customer, Decimal(str(spent)), WalletTransaction.Reason.REFUND,
                note=f"Wallet part-payment returned: booking {sr.request_id} expired unpaid.",
                reference_type="payment_expiry", reference_id=str(sr.request_id),
            )
    except Exception:
        logger.exception("Could not return wallet part-payment for expired booking %s", sr.pk)
