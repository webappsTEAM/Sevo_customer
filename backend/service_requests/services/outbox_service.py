"""
service_requests/services/outbox_service.py

Reliable event publishing service implementing the Transactional Outbox pattern.
Guarantees at-least-once event delivery to WebSocket and external consumers.
"""
import logging
import uuid
from typing import Dict, Any, Optional
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from service_requests.models import EventOutbox

logger = logging.getLogger("service_requests.outbox")


class OutboxService:
    @staticmethod
    def record_event(
        aggregate_type: str,
        aggregate_id: str,
        event_type: str,
        payload: Dict[str, Any],
        version: int = 1,
    ) -> EventOutbox:
        """
        Record a domain event within the caller's active database transaction.
        """
        event_id = uuid.uuid4()
        enriched_payload = {
            "event_id": str(event_id),
            "event_type": event_type,
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "version": version,
            "timestamp": timezone.now().isoformat(),
            **payload,
        }

        outbox_event = EventOutbox.objects.create(
            event_id=event_id,
            aggregate_type=aggregate_type,
            aggregate_id=str(aggregate_id),
            aggregate_version=version,
            event_type=event_type,
            payload=enriched_payload,
            status=EventOutbox.Status.PENDING,
        )
        logger.info(
            f"[Outbox] Recorded event {event_type} for {aggregate_type}:{aggregate_id} (version={version})"
        )
        return outbox_event

    @staticmethod
    def publish_single_event(outbox_event: EventOutbox) -> bool:
        """
        Publish a single outbox event to channels / WebSocket subscribers.
        Marks the event PUBLISHED on success, or FAILED on error.
        """
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                aggregate_id = outbox_event.aggregate_id
                clean_id = str(aggregate_id).replace("#", "").strip()

                group_names = [
                    f"tracking_{clean_id}",
                ]
                req_id = outbox_event.payload.get("request_id")
                if req_id and req_id != clean_id:
                    group_names.append(f"tracking_{req_id}")

                unique_groups = list(dict.fromkeys(group_names))
                for group in unique_groups:
                    async_to_sync(channel_layer.group_send)(
                        group,
                        {
                            "type": "job_updated",
                            "data": outbox_event.payload,
                            "event_type": outbox_event.event_type,
                        },
                    )

            outbox_event.status = EventOutbox.Status.PUBLISHED
            outbox_event.published_at = timezone.now()
            outbox_event.save(update_fields=["status", "published_at", "updated_at"] if hasattr(outbox_event, "updated_at") else ["status", "published_at"])
            logger.info(f"[Outbox] Published event {outbox_event.event_type} ({outbox_event.event_id})")
            return True
        except Exception as exc:
            outbox_event.retry_count += 1
            outbox_event.last_error = str(exc)
            outbox_event.status = EventOutbox.Status.FAILED
            outbox_event.save(update_fields=["status", "retry_count", "last_error"])
            logger.error(f"[Outbox] Failed to publish event {outbox_event.event_id}: {exc}")
            return False

    @classmethod
    def publish_pending_events(cls, max_count: int = 50) -> int:
        """
        Worker function to publish batches of pending or retryable failed events.
        """
        events = EventOutbox.objects.filter(
            status__in=[EventOutbox.Status.PENDING, EventOutbox.Status.FAILED],
            retry_count__lt=5,
        ).order_by("created_at")[:max_count]

        published_count = 0
        for event in events:
            if cls.publish_single_event(event):
                published_count += 1
        return published_count
