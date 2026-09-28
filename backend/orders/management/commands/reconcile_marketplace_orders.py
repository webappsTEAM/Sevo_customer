"""
orders/management/commands/reconcile_marketplace_orders.py

Periodic reconciliation job for stale active MarketplaceOrder records.
Queries Sevo-vendor status endpoint (/api/workforce/marketplace/orders/<source_order_id>/status/)
and reconciles Customer order state using sequence-aware forward-only rules.
"""
import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from orders.models import MarketplaceOrder, MarketplaceOrderEvent
from orders.status_mapping import map_vendor_status, is_forward_transition
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

logger = logging.getLogger("orders.marketplace.reconcile")


def parse_iso_dt(val):
    if not val:
        return None
    try:
        dt = parse_datetime(str(val))
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.utc)
        return dt
    except Exception:
        return None


def reconcile_stale_orders(stale_minutes=10, limit=50):
    """
    Reconciles stale non-terminal marketplace orders against Vendor status endpoint.
    """
    cutoff = timezone.now() - timedelta(minutes=stale_minutes)
    stale_orders = (
        MarketplaceOrder.objects.filter(
            status__in=[
                MarketplaceOrder.Status.CONFIRMED,
                MarketplaceOrder.Status.PACKING,
                MarketplaceOrder.Status.READY_FOR_PICKUP,
                MarketplaceOrder.Status.OUT_FOR_DELIVERY,
            ]
        )
        | MarketplaceOrder.objects.filter(cancellation_pending=True)
    ).filter(updated_at__lte=cutoff).order_by("updated_at")[:limit]

    reconciled_count = 0
    skipped_count = 0
    error_count = 0

    for item in stale_orders:
        try:
            res = MarketplaceIntegrationClient.fetch_order_status(item.order_number)
            if not res.get("success"):
                if res.get("status_code") == 404:
                    logger.warning(f"Reconcile: Order {item.order_number} not found on vendor (404)")
                else:
                    logger.warning(f"Reconcile: Vendor status endpoint returned error for {item.order_number}: {res.get('message')}")
                error_count += 1
                continue

            data = res.get("data", {})
            v_seller_id = data.get("seller_id")
            if v_seller_id and v_seller_id != item.seller_id:
                logger.error(f"Reconcile: Seller mismatch for {item.order_number}: expected {item.seller_id}, got {v_seller_id}")
                error_count += 1
                continue

            v_status = data.get("current_status")
            v_seq = int(data.get("last_event_sequence") or 0)
            mapped_status = map_vendor_status(v_status)

            with transaction.atomic():
                order = (
                    MarketplaceOrder.objects.select_for_update()
                    .filter(id=item.id)
                    .first()
                )
                if not order:
                    continue

                update_fields = ["updated_at"]

                # Update Vendor identifiers if missing
                if data.get("vendor_order_id") and not order.vendor_order_id:
                    order.vendor_order_id = data["vendor_order_id"]
                    update_fields.append("vendor_order_id")
                if data.get("vendor_order_number") and not order.vendor_order_number:
                    order.vendor_order_number = data["vendor_order_number"]
                    update_fields.append("vendor_order_number")
                if data.get("delivery_slot") and not order.delivery_slot:
                    order.delivery_slot = data["delivery_slot"]
                    update_fields.append("delivery_slot")
                if data.get("handover_ref") and not order.handover_ref:
                    order.handover_ref = data["handover_ref"]
                    update_fields.append("handover_ref")

                if v_seq > order.last_applied_vendor_sequence:
                    order.last_applied_vendor_sequence = v_seq
                    update_fields.append("last_applied_vendor_sequence")

                # Handle state transition
                if mapped_status == MarketplaceOrder.Status.CANCELLED:
                    if order.status != MarketplaceOrder.Status.CANCELLED:
                        order.status = MarketplaceOrder.Status.CANCELLED
                        order.cancellation_reason = data.get("cancellation_reason") or "Cancelled by vendor"
                        order.cancelled_by = data.get("cancelled_by") or "SELLER"
                        order.cancelled_at = parse_iso_dt(data.get("cancelled_at")) or timezone.now()
                        if order.cancelled_by == "SELLER":
                            order.needs_refund_review = True
                            update_fields.append("needs_refund_review")
                        update_fields.extend(["status", "cancellation_reason", "cancelled_by", "cancelled_at"])
                    if order.cancellation_pending:
                        order.cancellation_pending = False
                        update_fields.append("cancellation_pending")
                elif mapped_status and is_forward_transition(order.status, mapped_status):
                    order.status = mapped_status
                    update_fields.append("status")
                    if order.cancellation_pending:
                        order.cancellation_pending = False
                        update_fields.append("cancellation_pending")
                else:
                    skipped_count += 1

                order.save(update_fields=list(set(update_fields)))

                # Record reconcile audit event
                event_id = f"evt_rec_{order.order_number}_{v_seq}_{int(timezone.now().timestamp())}"
                MarketplaceOrderEvent.objects.get_or_create(
                    event_id=event_id,
                    defaults={
                        "order": order,
                        "sequence": v_seq,
                        "event_type": "reconcile.status_synced",
                        "vendor_status": v_status or "",
                        "mapped_status": mapped_status or "",
                        "occurred_at": timezone.now(),
                        "source": MarketplaceOrderEvent.Source.RECONCILE,
                        "cancellation_reason": data.get("cancellation_reason") or "",
                        "cancelled_by": data.get("cancelled_by") or "",
                        "raw_payload": data,
                    }
                )
                reconciled_count += 1

        except Exception as err:
            logger.error(f"Reconcile error for order {item.order_number}: {err}", exc_info=True)
            error_count += 1

    return {"reconciled": reconciled_count, "skipped": skipped_count, "errors": error_count}


class Command(BaseCommand):
    help = "Reconciles stale non-terminal marketplace orders against Vendor status endpoint."

    def add_arguments(self, parser):
        parser.add_argument("--stale-minutes", type=int, default=10, help="Minimum inactive minutes to consider stale")
        parser.add_argument("--limit", type=int, default=50, help="Max orders to reconcile per run")

    def handle(self, *args, **options):
        stale_minutes = options["stale_minutes"]
        limit = options["limit"]
        self.stdout.write(f"Running marketplace reconciliation (stale_minutes={stale_minutes}, limit={limit})...")
        res = reconcile_stale_orders(stale_minutes=stale_minutes, limit=limit)
        self.stdout.write(
            self.style.SUCCESS(
                f"Reconciliation completed: {res['reconciled']} reconciled, {res['skipped']} unchanged, {res['errors']} errors."
            )
        )
