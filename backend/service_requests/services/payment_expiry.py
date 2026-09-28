"""
Release logistics bookings that were created for online/wallet payment but never paid.

Such a booking sits in WAITING_FOR_PAYMENT, is not dispatched, and (before this) stayed there
forever -- cluttering the customer's bookings and the admin queue. After the window it is
cancelled with no fee (no money was taken). A payment that lands afterwards is already handled by
PaymentVerifyView (it raises a refund request for a cancelled booking).
"""
import logging
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

LOGISTICS = ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers")


def payment_window_minutes():
    try:
        return max(int(getattr(settings, "GT_ONLINE_PAYMENT_WINDOW_MINUTES", 30)), 1)
    except (TypeError, ValueError):
        return 30


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
        except Exception:
            logger.exception("Could not expire unpaid booking %s", sr.pk)
    return cancelled
