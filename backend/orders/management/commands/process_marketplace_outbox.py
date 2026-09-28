"""
orders/management/commands/process_marketplace_outbox.py

Processes queued MarketplaceOrderOutbox records (ORDER_INTAKE and ORDER_CANCEL)
with exponential backoff and idempotency.
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from orders.models import (
    MarketplaceOrder,
    MarketplaceOrderOutbox,
    MarketplaceOrderEvent,
)
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

logger = logging.getLogger("orders.marketplace.outbox")

BACKOFF_SECONDS = [15, 60, 300, 900, 3600]
MAX_RETRIES = 5


def process_outbox_queue(limit=50):
    """
    Core processor function for outbox queue.
    Can be called by management command or Celery worker.
    """
    now = timezone.now()
    pending_items = (
        MarketplaceOrderOutbox.objects.filter(
            status=MarketplaceOrderOutbox.Status.PENDING,
        )
        .filter(Q(next_retry_at__isnull=True) | Q(next_retry_at__lte=now))
        .order_by("created_at")[:limit]
    )

    processed_count = 0
    failed_count = 0

    for item in pending_items:
        with transaction.atomic():
            # Row-level lock
            locked_item = (
                MarketplaceOrderOutbox.objects.select_for_update()
                .filter(id=item.id, status=MarketplaceOrderOutbox.Status.PENDING)
                .first()
            )
            if not locked_item:
                continue

            order = MarketplaceOrder.objects.select_for_update().filter(
                order_number=locked_item.source_order_id
            ).first()

            if not order:
                logger.error(f"Outbox item {locked_item.id} refers to missing order {locked_item.source_order_id}")
                locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                locked_item.last_error = "Order not found"
                locked_item.save(update_fields=["status", "last_error", "updated_at"])
                failed_count += 1
                continue

            if locked_item.event_type == MarketplaceOrderOutbox.EventType.ORDER_INTAKE:
                # Race condition guard: If order is already cancelled or pending cancellation, skip intake
                if order.status == MarketplaceOrder.Status.CANCELLED or order.cancellation_pending:
                    logger.info(f"Skipping intake outbox for cancelled/pending-cancel order {order.order_number}")
                    locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                    locked_item.last_error = "cancelled before intake"
                    locked_item.save(update_fields=["status", "last_error", "updated_at"])
                    continue

                payload = locked_item.payload or {}
                res = MarketplaceIntegrationClient.intake_order(
                    source_order_id=locked_item.source_order_id,
                    seller_id=payload.get("seller_id", order.seller_id),
                    customer_name=payload.get("customer_name", order.customer_name),
                    customer_phone=payload.get("customer_phone", order.customer_phone),
                    customer_email=payload.get("customer_email", order.customer_email),
                    fulfilment_type=payload.get("fulfilment_type", "DELIVERY"),
                    delivery_address=payload.get("delivery_address", {"formatted": order.delivery_address}),
                    payment_snapshot=payload.get("payment_snapshot", {}),
                    items=payload.get("items", []),
                )

                if res.get("success"):
                    vendor_order_data = res.get("data", {}).get("order", {})
                    order.vendor_order_id = vendor_order_data.get("id")
                    order.vendor_order_number = vendor_order_data.get("order_number", "")
                    order.vendor_intake_synced = True
                    order.vendor_intake_response = res.get("data", {})
                    order.save(update_fields=["vendor_order_id", "vendor_order_number", "vendor_intake_synced", "vendor_intake_response", "updated_at"])

                    locked_item.status = MarketplaceOrderOutbox.Status.PROCESSED
                    locked_item.processed_at = timezone.now()
                    locked_item.save(update_fields=["status", "processed_at", "updated_at"])
                    processed_count += 1

                elif res.get("status_code") in [400, 404, 409, 422]:
                    # Permanent business failure
                    locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                    locked_item.last_error = res.get("message", "Business rejection from vendor")
                    locked_item.save(update_fields=["status", "last_error", "updated_at"])

                    order.status = MarketplaceOrder.Status.CANCELLED
                    order.cancellation_reason = res.get("message") or "Rejected during vendor intake retry"
                    order.save(update_fields=["status", "cancellation_reason", "updated_at"])
                    failed_count += 1

                else:
                    # Retryable failure
                    locked_item.retry_count += 1
                    locked_item.last_error = res.get("message", "Network error")
                    if locked_item.retry_count >= MAX_RETRIES:
                        locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                        failed_count += 1
                    else:
                        delay = BACKOFF_SECONDS[min(max(0, locked_item.retry_count - 1), len(BACKOFF_SECONDS) - 1)]
                        locked_item.next_retry_at = timezone.now() + timedelta(seconds=delay)
                    locked_item.save(update_fields=["retry_count", "last_error", "next_retry_at", "status", "updated_at"])

            elif locked_item.event_type == MarketplaceOrderOutbox.EventType.ORDER_CANCEL:
                payload = locked_item.payload or {}
                res = MarketplaceIntegrationClient.cancel_order(
                    source_order_id=locked_item.source_order_id,
                    cancellation_reason=payload.get("cancellation_reason", "Customer cancelled order"),
                    cancelled_by=payload.get("cancelled_by", "CUSTOMER"),
                )

                if res.get("success") or res.get("status_code") == 404:
                    # Vendor confirmed or vendor never had the order (404 -> treat as released)
                    order.status = MarketplaceOrder.Status.CANCELLED
                    order.cancelled_by = payload.get("cancelled_by", "CUSTOMER")
                    order.cancellation_reason = payload.get("cancellation_reason", "Customer cancelled order")
                    order.cancelled_at = timezone.now()
                    order.cancellation_pending = False
                    order.save(update_fields=["status", "cancelled_by", "cancellation_reason", "cancelled_at", "cancellation_pending", "updated_at"])

                    locked_item.status = MarketplaceOrderOutbox.Status.PROCESSED
                    locked_item.processed_at = timezone.now()
                    locked_item.save(update_fields=["status", "processed_at", "updated_at"])
                    processed_count += 1

                elif res.get("status_code") == 400:
                    # Vendor rejected cancellation (already handed over/delivered)
                    locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                    locked_item.last_error = res.get("message", "Vendor rejected cancellation")
                    locked_item.save(update_fields=["status", "last_error", "updated_at"])

                    order.cancellation_pending = False
                    order.save(update_fields=["cancellation_pending", "updated_at"])
                    failed_count += 1

                else:
                    # Retryable failure
                    locked_item.retry_count += 1
                    locked_item.last_error = res.get("message", "Network error")
                    if locked_item.retry_count >= MAX_RETRIES:
                        locked_item.status = MarketplaceOrderOutbox.Status.FAILED
                        order.cancellation_pending = False
                        order.save(update_fields=["cancellation_pending", "updated_at"])
                        failed_count += 1
                    else:
                        delay = BACKOFF_SECONDS[min(max(0, locked_item.retry_count - 1), len(BACKOFF_SECONDS) - 1)]
                        locked_item.next_retry_at = timezone.now() + timedelta(seconds=delay)
                    locked_item.save(update_fields=["retry_count", "last_error", "next_retry_at", "status", "updated_at"])

    return {"processed": processed_count, "failed": failed_count}


class Command(BaseCommand):
    help = "Processes pending MarketplaceOrderOutbox items with exponential backoff."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50, help="Max number of items to process")

    def handle(self, *args, **options):
        limit = options["limit"]
        self.stdout.write(f"Processing up to {limit} pending marketplace outbox items...")
        result = process_outbox_queue(limit=limit)
        self.stdout.write(
            self.style.SUCCESS(
                f"Completed: processed {result['processed']} items, {result['failed']} failures."
            )
        )
