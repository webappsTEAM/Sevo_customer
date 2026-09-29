"""Durable Customer -> Workforce dispatch delivery.

The Customer application owns booking creation.  This module records one
delivery intent against that booking in the same database transaction and
delivers it at-least-once to Workforce.  Workforce must therefore keep using
the booking request_id as its idempotency key.
"""
import logging

from django.db import transaction
from django.utils import timezone

from service_requests.models import EventOutbox, ServiceRequest

logger = logging.getLogger("service_requests.dispatch_outbox")

EVENT_TYPE = "workforce.dispatch_requested"
MAX_RETRIES = 5


def request_workforce_dispatch(service_request):
    """Persist (or return) the single dispatch intent for a booking.

    The parent ServiceRequest is locked first, which makes the lookup/create
    safe even though EventOutbox is shared with other domain events and cannot
    have a global unique constraint for this particular event type.
    """
    booking_id = getattr(service_request, "pk", service_request)
    with transaction.atomic():
        booking = ServiceRequest.objects.select_for_update().filter(pk=booking_id).first()
        if not booking:
            raise ServiceRequest.DoesNotExist(f"Service request {booking_id} does not exist")

        if booking.workforce_job_id or booking.dispatch_status == ServiceRequest.DispatchStatus.DISPATCHED:
            return None

        event = (
            EventOutbox.objects.select_for_update()
            .filter(
                aggregate_type="ServiceRequest",
                aggregate_id=str(booking.request_id),
                event_type=EVENT_TYPE,
                status__in=[EventOutbox.Status.PENDING, EventOutbox.Status.FAILED],
            )
            .order_by("created_at")
            .first()
        )
        if event:
            return event

        return EventOutbox.objects.create(
            aggregate_type="ServiceRequest",
            aggregate_id=str(booking.request_id),
            event_type=EVENT_TYPE,
            payload={
                "service_request_id": booking.pk,
                "request_id": booking.request_id,
                "idempotency_key": booking.request_id,
            },
            status=EventOutbox.Status.PENDING,
        )


def queue_workforce_dispatch(service_request):
    """Create durable intent, then ask Celery to deliver it after commit.

    If publishing to the broker is unavailable, the durable row remains for
    the periodic processor; this function deliberately never performs an HTTP
    call in the booking request transaction.
    """
    event = request_workforce_dispatch(service_request)
    if not event:
        return None

    def enqueue():
        import threading
        try:
            from service_requests.services.workforce_dispatch_outbox import deliver_workforce_dispatch_event as deliver
            threading.Thread(target=deliver, args=(str(event.event_id),), daemon=True).start()
        except Exception:
            logger.exception(
                "Could not enqueue workforce dispatch event %s; periodic outbox processing will retry it.",
                event.event_id,
            )

    transaction.on_commit(enqueue)
    return event


def deliver_workforce_dispatch_event(event_id):
    """Deliver a single intent.  Return data is safe for Celery/admin use."""
    from workforce_integration.services import WorkforceIntegrationService

    # Keep the *outbox event* lock while crossing the network boundary so two
    # Customer workers cannot deliver the same intent concurrently.  Do not
    # lock the shared ServiceRequest row here: the Vendor dispatch endpoint
    # locks that row as part of its own state machine.  Holding both sides of
    # the same shared row caused Customer -> Vendor calls to wait until the
    # HTTP timeout (a cross-service database deadlock).  Vendor remains
    # idempotent by request_id, while this event lock serializes delivery.
    with transaction.atomic():
        event = EventOutbox.objects.select_for_update().filter(event_id=event_id).first()
        if not event:
            return {"success": False, "error": "Dispatch event not found"}
        if event.event_type != EVENT_TYPE:
            return {"success": False, "error": "Unexpected event type"}
        if event.status == EventOutbox.Status.PUBLISHED:
            return {"success": True, "duplicate": True}
        if event.retry_count >= MAX_RETRIES:
            return {"success": False, "exhausted": True, "error": event.last_error or "Retry limit reached"}

        booking = ServiceRequest.objects.filter(pk=event.payload.get("service_request_id")).first()
        if not booking:
            event.status = EventOutbox.Status.IGNORED
            event.last_error = "Booking no longer exists"
            event.save(update_fields=["status", "last_error"])
            return {"success": False, "ignored": True, "error": event.last_error}

        if booking.workforce_job_id or booking.dispatch_status == ServiceRequest.DispatchStatus.DISPATCHED:
            event.status = EventOutbox.Status.PUBLISHED
            event.published_at = timezone.now()
            event.last_error = ""
            event.save(update_fields=["status", "published_at", "last_error"])
            return {"success": True, "duplicate": True, "workforce_job_id": booking.workforce_job_id}

        if booking.status not in {
            ServiceRequest.Status.CONFIRMED,
            ServiceRequest.Status.REVIEWED,
            ServiceRequest.Status.UNASSIGNED,
            ServiceRequest.Status.NEW_REQUEST,
        }:
            event.status = EventOutbox.Status.IGNORED
            event.last_error = f"Booking status {booking.status!r} is not dispatchable"
            event.save(update_fields=["status", "last_error"])
            return {"success": False, "ignored": True, "error": event.last_error}

        booking.dispatch_attempts += 1
        booking.last_dispatched_at = timezone.now()
        result = WorkforceIntegrationService.dispatch_job(booking)
        if result.get("success"):
            booking.dispatch_status = ServiceRequest.DispatchStatus.DISPATCHED
            booking.last_dispatch_error = ""
            booking.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
            event.status = EventOutbox.Status.PUBLISHED
            event.published_at = timezone.now()
            event.last_error = ""
            event.save(update_fields=["status", "published_at", "last_error"])
            return result

        error = str(result.get("message") or result.get("error") or "Workforce dispatch failed")[:1000]
        event.retry_count += 1
        event.last_error = error
        event.status = EventOutbox.Status.FAILED
        event.save(update_fields=["retry_count", "last_error", "status"])
        booking.dispatch_status = (
            ServiceRequest.DispatchStatus.FAILED
            if event.retry_count >= MAX_RETRIES else ServiceRequest.DispatchStatus.PENDING_RETRY
        )
        booking.last_dispatch_error = error[:500]
        booking.save(update_fields=["dispatch_status", "dispatch_attempts", "last_dispatch_error", "last_dispatched_at", "updated_at"])
        logger.error("Workforce dispatch event %s failed: %s", event.event_id, error)
        return {"success": False, "error": error, "exhausted": event.retry_count >= MAX_RETRIES}


def process_pending_workforce_dispatches(limit=50):
    """Recovery sweep called by Celery Beat or the management command."""
    event_ids = list(
        EventOutbox.objects.filter(
            event_type=EVENT_TYPE,
            status__in=[EventOutbox.Status.PENDING, EventOutbox.Status.FAILED],
            retry_count__lt=MAX_RETRIES,
        )
        .order_by("created_at")
        .values_list("event_id", flat=True)[:limit]
    )
    results = [deliver_workforce_dispatch_event(event_id) for event_id in event_ids]
    return {
        "processed": len(results),
        "delivered": sum(1 for item in results if item.get("success")),
        "failed": sum(1 for item in results if not item.get("success")),
    }
