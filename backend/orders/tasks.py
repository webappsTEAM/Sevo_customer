"""
orders/tasks.py

Celery tasks for asynchronous marketplace order outbox processing and reconciliation.
"""
import logging
from celery import shared_task
from .management.commands.process_marketplace_outbox import process_outbox_queue
from .management.commands.reconcile_marketplace_orders import reconcile_stale_orders

logger = logging.getLogger("orders.marketplace.tasks")


@shared_task(name="orders.process_marketplace_outbox_task")
def process_marketplace_outbox_task():
    """
    Periodic task to process pending marketplace outbox items (intakes and cancellations).
    """
    try:
        res = process_outbox_queue(limit=100)
        logger.info(f"Marketplace outbox task finished: processed={res['processed']}, failed={res['failed']}")
        return res
    except Exception as exc:
        logger.error(f"Error in marketplace outbox task: {exc}", exc_info=True)
        return {"error": str(exc)}


@shared_task(name="orders.reconcile_marketplace_orders_task")
def reconcile_marketplace_orders_task():
    """
    Periodic task to reconcile stale active marketplace orders with Vendor.
    """
    try:
        res = reconcile_stale_orders(stale_minutes=10, limit=50)
        logger.info(f"Marketplace reconcile task finished: reconciled={res['reconciled']}, errors={res['errors']}")
        return res
    except Exception as exc:
        logger.error(f"Error in marketplace reconcile task: {exc}", exc_info=True)
        return {"error": str(exc)}
