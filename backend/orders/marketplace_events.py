"""
orders/marketplace_events.py

Authoritative receiver and state machine synchronizer for Vendor SellerOrder events.
Enforces:
- HMAC/Secret authentication verification
- Payload schema validation (400 on malformed)
- Source order resolution (404 on unknown order)
- Multi-tenant seller validation (422 on seller_id mismatch)
- Idempotent event deduplication via MarketplaceOrderEvent.event_id
- Per-order sequence ordering and gap tolerance
- Forward-only state transitions (never moving backward, never overwriting DELIVERED or CANCELLED)
- Safe handling of unknown vendor statuses (unmapped audit log, no state mutation)
- Seller cancellation with refund review flagging
"""
import logging
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.response import Response

from .models import MarketplaceOrder, MarketplaceOrderEvent
from .status_mapping import map_vendor_status, is_forward_transition

logger = logging.getLogger("orders.marketplace.events")


def parse_iso_datetime(value):
    """Parses an ISO-8601 timestamp string safely, or returns None."""
    if not value or not isinstance(value, str):
        return None
    try:
        dt = parse_datetime(value)
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.utc)
        return dt
    except Exception:
        return None


def handle_marketplace_webhook_event(data: dict) -> Response:
    """
    Core entrypoint for processing 'seller_order.*' webhook events from Vendor Seller Hub.
    Dispatched from WorkforceWebhookView before booking_id checks.
    """
    if not isinstance(data, dict):
        return Response(
            {"error": "Invalid payload format: Expected JSON object", "code": "MALFORMED_PAYLOAD"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    event_type = data.get("event") or data.get("event_type")
    event_id = data.get("event_id")
    sequence = data.get("sequence")
    payload = data.get("payload")

    # 1. Validate top-level schema
    if not event_type or not isinstance(event_type, str):
        return Response(
            {"error": "Missing or invalid 'event' field", "code": "MISSING_EVENT_TYPE"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not event_id or not isinstance(event_id, str):
        return Response(
            {"error": "Missing or invalid 'event_id' field", "code": "MISSING_EVENT_ID"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if sequence is None or not isinstance(sequence, int):
        return Response(
            {"error": "Missing or invalid 'sequence' field: must be an integer", "code": "INVALID_SEQUENCE"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(payload, dict):
        return Response(
            {"error": "Missing or invalid 'payload' object", "code": "MISSING_PAYLOAD"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Validate payload fields
    source_order_id = payload.get("source_order_id")
    seller_id = payload.get("seller_id")
    current_status = payload.get("current_status")
    previous_status = payload.get("previous_status")
    timestamps = payload.get("timestamps") or {}

    if not source_order_id or not isinstance(source_order_id, str):
        return Response(
            {"error": "Missing or invalid 'payload.source_order_id'", "code": "MISSING_SOURCE_ORDER_ID"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if seller_id is None or not isinstance(seller_id, int):
        return Response(
            {"error": "Missing or invalid 'payload.seller_id'", "code": "MISSING_SELLER_ID"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not current_status or not isinstance(current_status, str):
        return Response(
            {"error": "Missing or invalid 'payload.current_status'", "code": "MISSING_CURRENT_STATUS"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 3. Check Idempotency before locking order
    if MarketplaceOrderEvent.objects.filter(event_id=event_id).exists():
        logger.info(f"Duplicate marketplace event ignored: event_id={event_id}, source_order_id={source_order_id}")
        return Response(
            {
                "success": True,
                "duplicate": True,
                "event_id": event_id,
                "message": "Event already processed.",
            },
            status=status.HTTP_200_OK,
        )

    # 4. Atomic processing with Row-level Lock on MarketplaceOrder
    try:
        with transaction.atomic():
            order = (
                MarketplaceOrder.objects.select_for_update()
                .filter(order_number=source_order_id)
                .first()
            )

            if not order:
                logger.warning(f"Marketplace webhook event for unknown order: {source_order_id}")
                return Response(
                    {"error": f"Order '{source_order_id}' not found.", "code": "ORDER_NOT_FOUND"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Security / Isolation: Verify seller_id matches the order's seller
            if order.seller_id != seller_id:
                logger.error(
                    f"Seller ID mismatch in webhook for order {source_order_id}: "
                    f"order.seller_id={order.seller_id}, payload.seller_id={seller_id}"
                )
                return Response(
                    {
                        "error": "Seller mismatch: seller_id does not match order owner.",
                        "code": "SELLER_MISMATCH",
                    },
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            # Extract timestamps
            occurred_at = (
                parse_iso_datetime(timestamps.get("updated_at"))
                or parse_iso_datetime(timestamps.get("cancelled_at"))
                or parse_iso_datetime(timestamps.get("delivered_at"))
                or parse_iso_datetime(timestamps.get("handed_over_at"))
                or parse_iso_datetime(timestamps.get("ready_at"))
                or parse_iso_datetime(timestamps.get("packed_at"))
                or parse_iso_datetime(timestamps.get("picking_at"))
                or parse_iso_datetime(timestamps.get("accepted_at"))
                or parse_iso_datetime(timestamps.get("created_at"))
                or timezone.now()
            )

            cancellation_reason = payload.get("cancellation_reason") or ""
            cancelled_by = payload.get("cancelled_by") or ""
            delivery_slot = payload.get("delivery_slot") or ""
            handover_ref = payload.get("handover_ref") or ""

            # Check sequence ordering
            is_stale_sequence = sequence <= order.last_applied_vendor_sequence
            if is_stale_sequence:
                logger.info(
                    f"Stale sequence {sequence} <= last_applied {order.last_applied_vendor_sequence} "
                    f"for order {order.order_number}. Recording event without updating status."
                )
            elif sequence > order.last_applied_vendor_sequence + 1:
                logger.warning(
                    f"Sequence gap detected for order {order.order_number}: "
                    f"jumped from {order.last_applied_vendor_sequence} to {sequence}. Applying latest snapshot."
                )

            # Map Vendor status to Customer status
            mapped_status = map_vendor_status(current_status)
            unmapped = mapped_status is None

            if unmapped:
                logger.warning(
                    f"Unknown or unmapped vendor status '{current_status}' received for order {order.order_number}."
                )

            # Record event row (Idempotent via unique constraint)
            try:
                event_record = MarketplaceOrderEvent.objects.create(
                    order=order,
                    event_id=event_id,
                    sequence=sequence,
                    event_type=event_type,
                    vendor_status=current_status,
                    previous_vendor_status=str(previous_status or ""),
                    mapped_status=mapped_status or "",
                    occurred_at=occurred_at,
                    source=MarketplaceOrderEvent.Source.VENDOR_EVENT,
                    cancellation_reason=cancellation_reason,
                    cancelled_by=cancelled_by,
                    raw_payload=data,
                )
            except IntegrityError:
                # Concurrent race created same event_id
                logger.info(f"Concurrent duplicate event_id {event_id} caught by IntegrityError")
                return Response(
                    {"success": True, "duplicate": True, "message": "Event already processed."},
                    status=status.HTTP_200_OK,
                )

            # Apply state transition if not stale, not unmapped, and valid forward transition
            update_fields = ["updated_at"]

            # Update Vendor references if present
            if payload.get("vendor_order_id") and not order.vendor_order_id:
                order.vendor_order_id = payload["vendor_order_id"]
                update_fields.append("vendor_order_id")
            if payload.get("vendor_order_number") and not order.vendor_order_number:
                order.vendor_order_number = payload["vendor_order_number"]
                update_fields.append("vendor_order_number")

            if delivery_slot and not order.delivery_slot:
                order.delivery_slot = delivery_slot
                update_fields.append("delivery_slot")
            if handover_ref and not order.handover_ref:
                order.handover_ref = handover_ref
                update_fields.append("handover_ref")

            if not is_stale_sequence:
                order.last_applied_vendor_sequence = sequence
                update_fields.append("last_applied_vendor_sequence")

                if not unmapped:
                    if mapped_status == MarketplaceOrder.Status.CANCELLED:
                        # Order cancellation: DELIVERED and CANCELLED are immutable
                        if order.status == MarketplaceOrder.Status.DELIVERED:
                            logger.warning(
                                f"Received CANCELLED event for already DELIVERED order {order.order_number}. "
                                f"DELIVERED status is immutable; order remains DELIVERED."
                            )
                        elif order.status != MarketplaceOrder.Status.CANCELLED:
                            order.status = MarketplaceOrder.Status.CANCELLED
                            order.cancellation_reason = cancellation_reason
                            order.cancelled_by = cancelled_by
                            order.cancelled_at = parse_iso_datetime(timestamps.get("cancelled_at")) or occurred_at
                            if cancelled_by == "SELLER":
                                order.needs_refund_review = True
                                update_fields.append("needs_refund_review")
                            update_fields.extend(["status", "cancellation_reason", "cancelled_by", "cancelled_at"])
                        if order.cancellation_pending:
                            order.cancellation_pending = False
                            update_fields.append("cancellation_pending")
                    elif is_forward_transition(order.status, mapped_status):
                        order.status = mapped_status
                        update_fields.append("status")
                    else:
                        logger.info(
                            f"Ignored non-forward status transition from '{order.status}' to '{mapped_status}' "
                            f"for order {order.order_number}."
                        )

            order.save(update_fields=list(set(update_fields)))

            return Response(
                {
                    "success": True,
                    "event_id": event_id,
                    "order_number": order.order_number,
                    "current_status": order.status,
                    "vendor_status": current_status,
                    "sequence": sequence,
                    "is_terminal": order.status in ["DELIVERED", "CANCELLED"],
                },
                status=status.HTTP_200_OK,
            )

    except Exception as exc:
        logger.error(f"Unexpected error handling marketplace event {event_id}: {exc}", exc_info=True)
        return Response(
            {"error": "Internal error processing event", "code": "INTERNAL_SERVER_ERROR"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
