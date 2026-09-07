"""
backend/inventory/tasks.py

Celery tasks for inventory automation including daily 4:00 AM vegetable stock reset.
"""
import logging
from celery import shared_task
from django.conf import settings
from django.utils import timezone
from inventory.models import InventoryItem
from inventory.services.vegetable_stock_service import apply_daily_reset

logger = logging.getLogger(__name__)


@shared_task(name="inventory.tasks.daily_vegetable_stock_reset")
def daily_vegetable_stock_reset():
    """
    Scheduled job running at 4:00 AM in settings.TIME_ZONE.
    Iterates all InventoryItem rows with a linked vegetable_package
    AND default_daily_quantity_grams not null.
    Each item is wrapped in its own try/except so one failure doesn't block the rest.
    """
    logger.info("Starting daily vegetable stock reset job at %s", timezone.now())
    items = InventoryItem.objects.filter(
        vegetable_package__isnull=False,
        default_daily_quantity_grams__isnull=False,
    ).select_related("org")

    success_count = 0
    failure_count = 0

    for item in items:
        try:
            applied = apply_daily_reset(item, item.org, force=False)
            if applied:
                success_count += 1
                logger.info("Successfully applied daily reset for item %s (ID: %s)", item.name, item.id)
            else:
                logger.info("Daily reset already applied or skipped for item %s (ID: %s)", item.name, item.id)
        except Exception as exc:
            failure_count += 1
            logger.error(
                "Failed to apply daily stock reset for item %s (ID: %s): %s",
                item.name, item.id, exc, exc_info=True
            )

    logger.info(
        "Finished daily vegetable stock reset. Successes: %d, Failures: %d, Total Processed: %d",
        success_count, failure_count, len(items)
    )
    return {"successes": success_count, "failures": failure_count, "total": len(items)}
