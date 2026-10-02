"""
backend/inventory/tasks.py

Celery tasks for inventory automation.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="inventory.tasks.daily_vegetable_stock_reset")
def daily_vegetable_stock_reset():
    """
    Deprecated: Automatic daily stock resets have been disabled in favor of persistent stock.
    Stock carries over indefinitely until changed via Restock, Adjustment, Sale, Cancellation, or Claim.
    """
    logger.info("inventory.tasks.daily_vegetable_stock_reset is deprecated and disabled. Stock is persistent.")
    return {"status": "disabled", "message": "Vegetable stock is persistent; daily reset is disabled."}
