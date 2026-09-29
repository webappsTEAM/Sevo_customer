from celery import shared_task
import logging

logger = logging.getLogger("service_requests.dispatch")


@shared_task
def async_dispatch_service_request(service_request_id: int):
    """Compatibility entry point for legacy callers.

    It now creates a durable intent rather than treating Celery delivery as the
    source of truth.  The outbox processor owns retries and status updates.
    """
    from service_requests.models import ServiceRequest
    from service_requests.services.workforce_dispatch_outbox import (
        deliver_workforce_dispatch_event,
        request_workforce_dispatch,
    )

    booking = ServiceRequest.objects.filter(pk=service_request_id).first()
    if not booking:
        logger.warning("async_dispatch_service_request: ServiceRequest ID %s not found.", service_request_id)
        return {"success": False, "error": "Booking not found"}
    event = request_workforce_dispatch(booking)
    if not event:
        return {"success": True, "duplicate": True, "workforce_job_id": booking.workforce_job_id or None}
    return deliver_workforce_dispatch_event(str(event.event_id))


@shared_task
def deliver_workforce_dispatch_event(event_id: str):
    from service_requests.services.workforce_dispatch_outbox import deliver_workforce_dispatch_event as deliver
    return deliver(event_id)


@shared_task(name="service_requests.process_pending_workforce_dispatches")
def process_pending_workforce_dispatches_task():
    from service_requests.services.workforce_dispatch_outbox import process_pending_workforce_dispatches
    return process_pending_workforce_dispatches(limit=50)


@shared_task
def generate_due_amc_bookings():
    """
    HS-B-07: generates one ServiceRequest for every BookingSeries whose
    next_run_date has arrived. See generate_due_bookings() in
    service_requests/services/__init__.py for the full generation logic
    and its "no backdated catch-up" rule.
    """
    from service_requests.services import generate_due_bookings
    created, failed = generate_due_bookings()
    return f"AMC generation: {len(created)} booking(s) created, {len(failed)} series failed."


@shared_task
def expire_unpaid_online_bookings_task():
    """Schedule from the admin's periodic tasks (e.g. every 5 minutes)."""
    from service_requests.services.payment_expiry import expire_unpaid_online_bookings
    return expire_unpaid_online_bookings()
