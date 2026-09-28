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

            seller_id = cart.seller_id
            if not seller_id:
                return _error("Invalid cart: missing seller reference.", status.HTTP_400_BAD_REQUEST)

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

            val_res = MarketplaceIntegrationClient.validate_cart(seller_id=seller_id, items=validation_items)
            if not val_res.get("success") or not val_res.get("is_valid"):
                err_list = val_res.get("validation", {}).get("errors", [])
                err_msg = err_list[0].get("message") if (err_list and isinstance(err_list[0], dict)) else "Items in your cart are no longer available or prices have changed."
                return _error(err_msg, status.HTTP_400_BAD_REQUEST, errors=err_list)

            subtotal = sum((ci.unit_price_snapshot * ci.quantity for ci in cart_items), Decimal("0.00"))
            delivery_fee = Decimal("0.00")
            total_amount = subtotal + delivery_fee

            source_order_id = _generate_marketplace_order_number()

            intake_items = [
                {
                    "product_id": ci.seller_product_id,
                    "quantity": ci.quantity,
                    "unit_price": str(ci.unit_price_snapshot),
                }
                for ci in cart_items
            ]

            is_sandbox = getattr(settings, "PAYMENT_SANDBOX_MODE", False)
            payment_status = "PAID" if is_sandbox else (valid_data.get("payment_status") or "PENDING")

            payment_snapshot = {
                "method": payment_method,
                "transaction_id": payment_txn_id,
                "status": payment_status,
                "paid_amount": str(total_amount),
            }

            # 3. Create provisional MarketplaceOrder
            order = MarketplaceOrder.objects.create(
                order_number=source_order_id,
                customer=request.user,
                seller_id=seller_id,
                seller_name=cart.seller_name,
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
                idempotency_key=idempotency_key,
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
                for ci in cart_items
            ])

            outbox = MarketplaceOrderOutbox.objects.create(
                event_type=MarketplaceOrderOutbox.EventType.ORDER_INTAKE,
                source_order_id=source_order_id,
                payload={
                    "seller_id": seller_id,
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

        # 4. Synchronous Intake Call to Vendor
        intake_res = MarketplaceIntegrationClient.intake_order(
            source_order_id=source_order_id,
            seller_id=seller_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            customer_email=customer_email,
            fulfilment_type=fulfilment_type,
            delivery_address={"formatted": delivery_address},
            payment_snapshot=payment_snapshot,
            items=intake_items,
        )

        if intake_res.get("success"):
            # Vendor confirmed reservation
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

                # Now consume the cart
                cart.status = CartStatus.CHECKED_OUT
                cart.save(update_fields=["status", "updated_at"])

            return _success(MarketplaceOrderSerializer(order).data, status_code=status.HTTP_201_CREATED)

        elif intake_res.get("status_code") in [400, 404, 409, 422]:
            # Business Rejection: Cleanly cancel local order, preserve cart
            with transaction.atomic():
                order.status = MarketplaceOrder.Status.CANCELLED
                order.cancellation_reason = intake_res.get("message") or "Seller rejected order intake"
                order.save(update_fields=["status", "cancellation_reason", "updated_at"])

                outbox.status = MarketplaceOrderOutbox.Status.FAILED
                outbox.last_error = intake_res.get("message", "Business rejection")
                outbox.save(update_fields=["status", "last_error", "updated_at"])

                # Cart remains ACTIVE so customer does not lose their cart
                cart.status = CartStatus.ACTIVE
                cart.save(update_fields=["status", "updated_at"])

            err_code = intake_res.get("error") or ""
            if err_code == PRICE_CHANGE_ERROR_CODE or "PRICE_CHANGED" in str(intake_res.get("message", "")):
                return _error(
                    "Product prices have changed on the seller side. Please review your updated cart.",
                    status_code=status.HTTP_409_CONFLICT,
                    error="PRICE_CHANGED",
                    details=intake_res.get("details"),
                )

            return _error(
                intake_res.get("message", "Seller rejected order placement."),
                status_code=intake_res.get("status_code", status.HTTP_400_BAD_REQUEST),
                details=intake_res.get("details"),
            )
        else:
            # Temporary Network / 5xx Failure: order stays CONFIRMED with retryable outbox, cart is checked out
            with transaction.atomic():
                outbox.last_error = intake_res.get("message", "Temporary network failure")
                outbox.next_retry_at = timezone.now() + timedelta(seconds=15)
                outbox.save(update_fields=["last_error", "next_retry_at", "updated_at"])

                cart.status = CartStatus.CHECKED_OUT
                cart.save(update_fields=["status", "updated_at"])

            return _success(
                MarketplaceOrderSerializer(order).data,
                message="Order placed and queued for seller sync.",
                status_code=status.HTTP_201_CREATED,
            )


class MarketplaceOrderDetailView(APIView):
    """
    GET /api/orders/marketplace/<str:order_number>/
    Order details and tracking status with events timeline.
    """
    permission_classes = [IsCustomer]

    def get(self, request, order_number):
        order = MarketplaceOrder.objects.filter(
            order_number=order_number,
            customer=request.user,
        ).prefetch_related("items", "events").first()

        if not order:
            return _error("Order not found.", status.HTTP_404_NOT_FOUND)

        return _success(MarketplaceOrderSerializer(order).data)


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
