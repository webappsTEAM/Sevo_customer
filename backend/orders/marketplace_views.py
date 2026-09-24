"""
orders/marketplace_views.py

Hardened checkout, order detail/tracking, and cancellation views for Seller Hub Marketplace.
Enforces:
- Double-submit protection via cart locking and idempotency key
- Cart preservation on Vendor business rejections (409 stock, 409 PRICE_CHANGED, 400/404)
- Network error recovery with retryable outbox
- Vendor-first cancellation preventing local cancel after handover/delivery
- Cancellation pending status during vendor outages
- Multi-tenant customer isolation
"""
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from carts.models import Cart, CartType, CartStatus
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

from .models import (
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceOrderOutbox,
    MarketplaceOrderEvent,
    _generate_marketplace_order_number,
)
from .serializers import (
    MarketplaceOrderSerializer,
    MarketplaceCheckoutSerializer,
)

PRICE_CHANGE_ERROR_CODE = "PRICE_CHANGED"


def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400, errors=None, **kwargs):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    for k, v in kwargs.items():
        body[k] = v
    return Response(body, status=status_code)


class MarketplaceCheckoutView(APIView):
    """
    POST /api/orders/marketplace/checkout/
    Hardened checkout flow:
    - Atomically locks Cart
    - Checks idempotency key to prevent double submit
    - Validates cart against Vendor
    - Intakes order to Vendor before marking cart checked out
    - Preserves cart on business rejections (stock / price changed / unapproved)
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = MarketplaceCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)

        valid_data = serializer.validated_data
        delivery_address = valid_data["delivery_address"]
        customer_name = str(valid_data.get("customer_name") or getattr(request.user, "get_full_name", lambda: "")() or getattr(request.user, "username", "") or "")
        customer_phone = str(valid_data.get("customer_phone") or getattr(request.user, "phone", "") or "")
        customer_email = str(valid_data.get("customer_email") or getattr(request.user, "email", "") or "")
        payment_method = valid_data.get("payment_method", "UPI")
        payment_txn_id = valid_data.get("payment_transaction_id", "")
        fulfilment_type = valid_data.get("fulfilment_type", "DELIVERY")

        # Double-submit protection: Idempotency Key
        idempotency_key = (
            request.headers.get("X-Idempotency-Key")
            or request.headers.get("Idempotency-Key")
            or request.META.get("HTTP_X_IDEMPOTENCY_KEY")
            or request.META.get("HTTP_IDEMPOTENCY_KEY")
            or request.data.get("idempotency_key")
            or ""
        )

        if idempotency_key:
            existing_order = MarketplaceOrder.objects.filter(
                customer=request.user,
                idempotency_key=idempotency_key,
            ).exclude(status=MarketplaceOrder.Status.CANCELLED).first()

            if existing_order:
                return _success(
                    MarketplaceOrderSerializer(existing_order).data,
                    message="Order already placed.",
                    status_code=status.HTTP_200_OK,
                )

        with transaction.atomic():
            # 1. Lock active Cart row
            cart = Cart.objects.select_for_update().filter(
                customer=request.user,
                cart_type=CartType.MARKETPLACE,
                status=CartStatus.ACTIVE,
            ).prefetch_related("items").first()

            if cart is None or not cart.items.exists():
                return _error("Your marketplace cart is empty.", status.HTTP_400_BAD_REQUEST)

            if not idempotency_key:
                idempotency_key = f"cart_{cart.id}_{cart.updated_at.isoformat()}"
                # Check if order with derived idempotency key was already created
                existing_order = MarketplaceOrder.objects.filter(
                    customer=request.user,
                    idempotency_key=idempotency_key,
                ).exclude(status=MarketplaceOrder.Status.CANCELLED).first()

                if existing_order:
                    return _success(
                        MarketplaceOrderSerializer(existing_order).data,
                        message="Order already placed.",
                        status_code=status.HTTP_200_OK,
                    )

            cart_items = list(cart.items.all())

            # 2. Authoritative Pre-Checkout Validation with Vendor Backend
            validation_items = [
                {
                    "product_id": ci.seller_product_id,
                    "requested_quantity": ci.quantity,
                    "expected_unit_price": str(ci.unit_price_snapshot),
                }
                for ci in cart_items
            ]

            val_res = MarketplaceIntegrationClient.validate_cart(seller_id=None, items=validation_items)
            if not val_res.get("success") or not val_res.get("is_valid"):
                err_list = val_res.get("validation", {}).get("errors", [])
                err_msg = err_list[0].get("message") if (err_list and isinstance(err_list[0], dict)) else "Items in your cart are no longer available or prices have changed."
                return _error(err_msg, status.HTTP_400_BAD_REQUEST, errors=err_list)

            # Map validated warehouse info back to cart items if missing
            val_items_map = {item.get("product_id"): item for item in val_res.get("validation", {}).get("items", [])}
            for ci in cart_items:
                v_data = val_items_map.get(ci.seller_product_id)
                if v_data:
                    if not ci.warehouse_id and v_data.get("warehouse_id"):
                        ci.warehouse_id = v_data.get("warehouse_id")
                    if not ci.warehouse_name and v_data.get("warehouse_name"):
                        ci.warehouse_name = v_data.get("warehouse_name")
                    if not ci.seller_id and v_data.get("company_id"):
                        ci.seller_id = v_data.get("company_id")
                    if not ci.seller_name and v_data.get("seller_name"):
                        ci.seller_name = v_data.get("seller_name")

            # 3. Group cart items by warehouse (one consolidated delivery per warehouse)
            warehouse_groups = {}
            for ci in cart_items:
                wh_key = ci.warehouse_id if ci.warehouse_id is not None else 0
                if wh_key not in warehouse_groups:
                    warehouse_groups[wh_key] = {
                        "warehouse_id": ci.warehouse_id,
                        "warehouse_name": ci.warehouse_name or "Default Fulfilment Centre",
                        "items": [],
                    }
                warehouse_groups[wh_key]["items"].append(ci)

            is_sandbox = getattr(settings, "PAYMENT_SANDBOX_MODE", False)
            payment_status = "PAID" if is_sandbox else (valid_data.get("payment_status") or "PENDING")

            now = timezone.now()
            created_orders = []
            pending_intakes = []

            for wh_key, wh_data in warehouse_groups.items():
                delivery_group_id = f"DG-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
                wh_items = wh_data["items"]

                # Group items within this warehouse by distinct seller
                seller_groups = {}
                for item in wh_items:
                    s_id = item.seller_id or 1
                    if s_id not in seller_groups:
                        seller_groups[s_id] = {
                            "seller_id": s_id,
                            "seller_name": item.seller_name or f"Seller #{s_id}",
                            "items": [],
                        }
                    seller_groups[s_id]["items"].append(item)

                for s_id, s_data in seller_groups.items():
                    s_items = s_data["items"]
                    subtotal = sum((ci.unit_price_snapshot * ci.quantity for ci in s_items), Decimal("0.00"))
                    delivery_fee = Decimal("0.00")
                    total_amount = subtotal + delivery_fee
                    source_order_id = _generate_marketplace_order_number()

                    intake_items = [
                        {
                            "product_id": ci.seller_product_id,
                            "quantity": ci.quantity,
                            "unit_price": str(ci.unit_price_snapshot),
                        }
                        for ci in s_items
                    ]

                    payment_snapshot = {
                        "method": payment_method,
                        "transaction_id": payment_txn_id,
                        "status": payment_status,
                        "paid_amount": str(total_amount),
                    }

                    order = MarketplaceOrder.objects.create(
                        order_number=source_order_id,
                        delivery_group_id=delivery_group_id,
                        warehouse_id=wh_data["warehouse_id"],
                        warehouse_name=wh_data["warehouse_name"],
                        customer=request.user,
                        seller_id=s_id,
                        seller_name=s_data["seller_name"],
                        status=MarketplaceOrder.Status.CONFIRMED,
                        total_amount=total_amount,
                        subtotal_amount=subtotal,
                        delivery_fee=delivery_fee,
                        delivery_address=delivery_address,
                        customer_name=customer_name,
                        customer_phone=customer_phone,
                        customer_email=customer_email,
                        payment_method=payment_method,
                        payment_status=payment_status,
                        payment_transaction_id=payment_txn_id,
                        idempotency_key=f"{idempotency_key}_{source_order_id}",
                    )

                    MarketplaceOrderItem.objects.bulk_create([
                        MarketplaceOrderItem(
                            order=order,
                            seller_product_id=ci.seller_product_id,
                            product_title=ci.product_title,
                            product_sku=ci.product_sku,
                            product_brand=ci.product_brand,
                            unit=ci.unit,
                            pack_size=ci.pack_size,
                            product_image=ci.product_image,
                            quantity=ci.quantity,
                            unit_price_snapshot=ci.unit_price_snapshot,
                            mrp_snapshot=ci.mrp_snapshot,
                            line_amount=ci.unit_price_snapshot * ci.quantity,
                        )
                        for ci in s_items
                    ])

                    outbox = MarketplaceOrderOutbox.objects.create(
                        event_type=MarketplaceOrderOutbox.EventType.ORDER_INTAKE,
                        source_order_id=source_order_id,
                        payload={
                            "seller_id": s_id,
                            "delivery_group_id": delivery_group_id,
                            "warehouse_id": wh_data["warehouse_id"],
                            "warehouse_name": wh_data["warehouse_name"],
                            "customer_name": customer_name,
                            "customer_phone": customer_phone,
                            "customer_email": customer_email,
                            "fulfilment_type": fulfilment_type,
                            "delivery_address": delivery_address,
                            "payment_snapshot": payment_snapshot,
                            "items": intake_items,
                        },
                        status=MarketplaceOrderOutbox.Status.PENDING,
                    )

                    created_orders.append(order)
                    pending_intakes.append({
                        "order": order,
                        "outbox": outbox,
                        "seller_id": s_id,
                        "delivery_group_id": delivery_group_id,
                        "warehouse_id": wh_data["warehouse_id"],
                        "warehouse_name": wh_data["warehouse_name"],
                        "source_order_id": source_order_id,
                        "customer_name": customer_name,
                        "customer_phone": customer_phone,
                        "customer_email": customer_email,
                        "fulfilment_type": fulfilment_type,
                        "delivery_address": delivery_address,
                        "payment_snapshot": payment_snapshot,
                        "intake_items": intake_items,
                    })

        # 4. Synchronous Intake Calls to Vendor for each sub-order
        all_succeeded = True
        business_rejection = None

        for item in pending_intakes:
            intake_res = MarketplaceIntegrationClient.intake_order(
                source_order_id=item["source_order_id"],
                seller_id=item["seller_id"],
                customer_name=item["customer_name"],
                customer_phone=item["customer_phone"],
                customer_email=item["customer_email"],
                fulfilment_type=item["fulfilment_type"],
                delivery_address={"formatted": item["delivery_address"]},
                payment_snapshot=item["payment_snapshot"],
                items=item["intake_items"],
                delivery_group_id=item["delivery_group_id"],
                warehouse_id=item["warehouse_id"],
                warehouse_name=item["warehouse_name"],
            )

            order = item["order"]
            outbox = item["outbox"]

            if intake_res.get("success"):
                vendor_order_data = intake_res.get("data", {}).get("order", {})
                with transaction.atomic():
                    order.vendor_order_id = vendor_order_data.get("id")
                    order.vendor_order_number = vendor_order_data.get("order_number", "")
                    order.vendor_intake_synced = True
                    order.vendor_intake_response = intake_res.get("data", {})
                    order.save(update_fields=["vendor_order_id", "vendor_order_number", "vendor_intake_synced", "vendor_intake_response", "updated_at"])

                    outbox.status = MarketplaceOrderOutbox.Status.PROCESSED
                    outbox.processed_at = timezone.now()
                    outbox.save(update_fields=["status", "processed_at", "updated_at"])
            elif intake_res.get("status_code") in [400, 404, 409, 422]:
                business_rejection = intake_res
                all_succeeded = False
                with transaction.atomic():
                    order.status = MarketplaceOrder.Status.CANCELLED
                    order.cancellation_reason = intake_res.get("message") or "Seller rejected order intake"
                    order.save(update_fields=["status", "cancellation_reason", "updated_at"])

                    outbox.status = MarketplaceOrderOutbox.Status.FAILED
                    outbox.last_error = intake_res.get("message", "Business rejection")
                    outbox.save(update_fields=["status", "last_error", "updated_at"])
            else:
                # Network failure
                with transaction.atomic():
                    outbox.last_error = intake_res.get("message", "Temporary network failure")
                    outbox.next_retry_at = timezone.now() + timedelta(seconds=15)
                    outbox.save(update_fields=["last_error", "next_retry_at", "updated_at"])

        if business_rejection:
            # Preserve active cart for customer
            with transaction.atomic():
                cart.status = CartStatus.ACTIVE
                cart.save(update_fields=["status", "updated_at"])

            err_code = business_rejection.get("error") or ""
            if err_code == PRICE_CHANGE_ERROR_CODE or "PRICE_CHANGED" in str(business_rejection.get("message", "")):
                return _error(
                    "Product prices have changed on the seller side. Please review your updated cart.",
                    status_code=status.HTTP_409_CONFLICT,
                    error="PRICE_CHANGED",
                    details=business_rejection.get("details"),
                )

            return _error(
                business_rejection.get("message", "Seller rejected order placement."),
                status_code=business_rejection.get("status_code", status.HTTP_400_BAD_REQUEST),
                details=business_rejection.get("details"),
            )

        # Mark cart checked out
        with transaction.atomic():
            cart.status = CartStatus.CHECKED_OUT
            cart.save(update_fields=["status", "updated_at"])

        primary_order = created_orders[0] if created_orders else None
        serialized_orders = [MarketplaceOrderSerializer(o).data for o in created_orders]

        delivery_count = len(warehouse_groups)
        split_notice = (
            f"Your order will arrive in {delivery_count} separate deliveries because items ship from different warehouses."
            if delivery_count > 1 else ""
        )

        resp_data = MarketplaceOrderSerializer(primary_order).data if primary_order else {}
        resp_data["orders"] = serialized_orders
        resp_data["delivery_count"] = delivery_count
        resp_data["multi_warehouse"] = delivery_count > 1
        resp_data["multi_warehouse_notice"] = split_notice

        return _success(
            resp_data,
            message=f"Order placed successfully across {len(created_orders)} seller sub-orders in {delivery_count} consolidated delivery group(s).",
            status_code=status.HTTP_201_CREATED,
        )


class MarketplaceOrderDetailView(APIView):
    """
    GET /api/orders/marketplace/<str:order_number>/
    Order details and tracking status with events timeline and delivery group siblings.
    """
    permission_classes = [IsCustomer]

    def get(self, request, order_number):
        order = MarketplaceOrder.objects.filter(
            order_number=order_number,
            customer=request.user,
        ).prefetch_related("items", "events").first()

        if not order:
            return _error("Order not found.", status.HTTP_404_NOT_FOUND)

        order_data = MarketplaceOrderSerializer(order).data

        # If order belongs to a delivery group, include all sibling orders
        if order.delivery_group_id:
            siblings = list(MarketplaceOrder.objects.filter(
                delivery_group_id=order.delivery_group_id,
                customer=request.user,
            ).prefetch_related("items", "events"))

            order_data["delivery_group"] = {
                "delivery_group_id": order.delivery_group_id,
                "warehouse_id": order.warehouse_id,
                "warehouse_name": order.warehouse_name,
                "orders_count": len(siblings),
                "orders": [MarketplaceOrderSerializer(s).data for s in siblings],
                "all_delivered": all(s.status == MarketplaceOrder.Status.DELIVERED for s in siblings),
                "all_handed_over": all(s.status in [MarketplaceOrder.Status.HANDED_OVER, MarketplaceOrder.Status.DELIVERED] for s in siblings),
            }

        return _success(order_data)


class MarketplaceOrderCancelView(APIView):
    """
    POST /api/orders/marketplace/<str:order_number>/cancel/
    Cancels an eligible order:
    - If order never reached Vendor (not vendor_intake_synced), cancel locally and fail intake outbox row
    - Calls Vendor first to release stock reservations if synced
    - If Vendor returns 404 (Vendor never had the order), treats as released and cancels locally
    - If Vendor rejects (already handed over/delivered), prevents local cancel
    - If Vendor is unreachable, marks cancellation pending with retryable outbox
    """
    permission_classes = [IsCustomer]

    def post(self, request, order_number):
        reason = request.data.get("cancellation_reason") or "Customer cancelled order"

        with transaction.atomic():
            order = MarketplaceOrder.objects.select_for_update().filter(
                order_number=order_number,
                customer=request.user,
            ).first()

            if not order:
                return _error("Order not found.", status.HTTP_404_NOT_FOUND)

            if order.status == MarketplaceOrder.Status.CANCELLED:
                return _success({"already_cancelled": True, "status": "CANCELLED"}, message="Order is already cancelled.")

            if order.status in [MarketplaceOrder.Status.OUT_FOR_DELIVERY, MarketplaceOrder.Status.DELIVERED]:
                return _error("Order cannot be cancelled as it is already being delivered.", status.HTTP_400_BAD_REQUEST)

            # Check if order was never received by Vendor
            if not order.vendor_intake_synced:
                order.status = MarketplaceOrder.Status.CANCELLED
                order.cancellation_reason = reason
                order.cancelled_by = "CUSTOMER"
                order.cancelled_at = timezone.now()
                order.cancellation_pending = False
                order.save(update_fields=["status", "cancellation_reason", "cancelled_by", "cancelled_at", "cancellation_pending", "updated_at"])

                # Mark pending intake outbox row so it will never be sent
                MarketplaceOrderOutbox.objects.filter(
                    source_order_id=order.order_number,
                    event_type=MarketplaceOrderOutbox.EventType.ORDER_INTAKE,
                    status=MarketplaceOrderOutbox.Status.PENDING,
                ).update(
                    status=MarketplaceOrderOutbox.Status.FAILED,
                    last_error="cancelled before intake",
                    next_retry_at=None,
                    updated_at=timezone.now(),
                )

                return _success(
                    MarketplaceOrderSerializer(order).data,
                    message="Order cancelled locally before seller intake.",
                )

            # 1. Release Vendor stock reservation
            cancel_res = MarketplaceIntegrationClient.cancel_order(
                source_order_id=order.order_number,
                cancellation_reason=reason,
                cancelled_by="CUSTOMER",
            )

            if cancel_res.get("success") or cancel_res.get("status_code") == 404:
                # Confirmed by vendor or vendor never had the order (404 -> treat as released)
                order.status = MarketplaceOrder.Status.CANCELLED
                order.cancellation_reason = reason
                order.cancelled_by = "CUSTOMER"
                order.cancelled_at = timezone.now()
                order.cancellation_pending = False
                order.save(update_fields=["status", "cancellation_reason", "cancelled_by", "cancelled_at", "cancellation_pending", "updated_at"])

                MarketplaceOrderOutbox.objects.create(
                    event_type=MarketplaceOrderOutbox.EventType.ORDER_CANCEL,
                    source_order_id=order.order_number,
                    payload={"cancellation_reason": reason, "cancelled_by": "CUSTOMER"},
                    status=MarketplaceOrderOutbox.Status.PROCESSED,
                    processed_at=timezone.now(),
                )

                msg = "Order cancelled and inventory reservation released." if cancel_res.get("success") else "Order cancelled (seller had no record of order)."
                return _success(MarketplaceOrderSerializer(order).data, message=msg)

            elif cancel_res.get("status_code") == 400:
                # Vendor rejected because order is already handed over or delivered
                return _error(
                    cancel_res.get("message") or "Order cannot be cancelled as seller has already dispatched or handed over.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )

            else:
                # Vendor temporary outage / timeout: Mark cancellation pending with outbox retry
                order.cancellation_pending = True
                order.cancellation_reason = reason
                order.save(update_fields=["cancellation_pending", "cancellation_reason", "updated_at"])

                MarketplaceOrderOutbox.objects.create(
                    event_type=MarketplaceOrderOutbox.EventType.ORDER_CANCEL,
                    source_order_id=order.order_number,
                    payload={"cancellation_reason": reason, "cancelled_by": "CUSTOMER"},
                    status=MarketplaceOrderOutbox.Status.PENDING,
                    next_retry_at=timezone.now() + timedelta(seconds=15),
                    last_error=cancel_res.get("message", "Vendor unavailable"),
                )

                return _success(
                    MarketplaceOrderSerializer(order).data,
                    message="Order cancellation is pending seller confirmation.",
                )
