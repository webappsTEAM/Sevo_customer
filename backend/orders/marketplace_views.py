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
from rest_framework.permissions import AllowAny

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


import json
import logging
import uuid
from decimal import Decimal
from datetime import timedelta
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

try:
    import razorpay
except ImportError:
    razorpay = None

from accounts.permissions import IsCustomer
from carts.models import Cart, CartType, CartStatus
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

from .models import (
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceOrderOutbox,
    MarketplaceOrderEvent,
    MarketplacePaymentIntent,
    _generate_marketplace_order_number,
)
from .serializers import (
    MarketplaceOrderSerializer,
    MarketplaceCheckoutSerializer,
)

logger = logging.getLogger("orders.marketplace")

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


def _get_razorpay_client():
    """Helper to get an authenticated Razorpay client instance or None if not configured."""
    key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
    key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()
    if razorpay and key_id and key_secret:
        return razorpay.Client(auth=(key_id, key_secret))
    return None


def _finalize_marketplace_orders(
    customer,
    cart,
    checkout_payload,
    payment_method="UPI",
    payment_status="PAID",
    payment_transaction_id="",
    idempotency_key=None,
    payment_intent=None,
):
    """
    Authoritative single-source-of-truth method that finalizes a marketplace checkout.
    Takes validated cart + checkout payload, verifies stock with vendor, creates MarketplaceOrder(s),
    synchronously intakes orders with vendor, and clears/checks-out the cart.
    Used by:
    1. MarketplaceVerifyPaymentView (after successful HMAC signature verification)
    2. MarketplaceRazorpayWebhookView (payment.captured fallback)
    3. MarketplaceCheckoutView (fallback sandbox mode)
    """
    delivery_address = checkout_payload.get("delivery_address", "")
    customer_name = str(checkout_payload.get("customer_name") or getattr(customer, "get_full_name", lambda: "")() or getattr(customer, "username", "") or "")
    customer_phone = str(checkout_payload.get("customer_phone") or getattr(customer, "phone", "") or "")
    customer_email = str(checkout_payload.get("customer_email") or getattr(customer, "email", "") or "")
    fulfilment_type = checkout_payload.get("fulfilment_type", "DELIVERY")
    delivery_slot_label = checkout_payload.get("delivery_slot_label") or checkout_payload.get("delivery_slot") or ""
    delivery_slot_id = checkout_payload.get("delivery_slot_id")
    delivery_date = checkout_payload.get("delivery_date")

    # Double-submit protection: Idempotency check
    if idempotency_key:
        existing_orders = list(MarketplaceOrder.objects.filter(
            customer=customer,
            idempotency_key__startswith=idempotency_key,
        ).exclude(status=MarketplaceOrder.Status.CANCELLED))

        if existing_orders:
            primary = existing_orders[0]
            serialized = [MarketplaceOrderSerializer(o).data for o in existing_orders]
            resp_data = MarketplaceOrderSerializer(primary).data
            resp_data["orders"] = serialized
            resp_data["delivery_count"] = len(set(o.delivery_group_id for o in existing_orders if o.delivery_group_id)) or 1
            return _success(resp_data, message="Order already placed.", status_code=status.HTTP_200_OK)

    with transaction.atomic():
        if cart is None:
            cart = Cart.objects.select_for_update().filter(
                customer=customer,
                cart_type=CartType.MARKETPLACE,
                status=CartStatus.ACTIVE,
            ).prefetch_related("items").first()
        else:
            cart = Cart.objects.select_for_update().filter(id=cart.id).prefetch_related("items").first()

        if cart is None or not cart.items.exists():
            # Check if order was already finalized for this cart
            if payment_intent:
                existing_orders = list(MarketplaceOrder.objects.filter(
                    customer=customer,
                    payment_transaction_id=payment_transaction_id or payment_intent.razorpay_payment_id,
                ).exclude(status=MarketplaceOrder.Status.CANCELLED)) if (payment_transaction_id or payment_intent.razorpay_payment_id) else []
                if existing_orders:
                    primary = existing_orders[0]
                    serialized = [MarketplaceOrderSerializer(o).data for o in existing_orders]
                    resp_data = MarketplaceOrderSerializer(primary).data
                    resp_data["orders"] = serialized
                    resp_data["delivery_count"] = len(set(o.delivery_group_id for o in existing_orders if o.delivery_group_id)) or 1
                    return _success(resp_data, message="Order already placed.", status_code=status.HTTP_200_OK)

            return _error("Your marketplace cart is empty.", status.HTTP_400_BAD_REQUEST)

        if not idempotency_key:
            idempotency_key = f"cart_{cart.id}_{cart.updated_at.isoformat()}"
            existing_orders = list(MarketplaceOrder.objects.filter(
                customer=customer,
                idempotency_key__startswith=idempotency_key,
            ).exclude(status=MarketplaceOrder.Status.CANCELLED))

            if existing_orders:
                primary = existing_orders[0]
                serialized = [MarketplaceOrderSerializer(o).data for o in existing_orders]
                resp_data = MarketplaceOrderSerializer(primary).data
                resp_data["orders"] = serialized
                resp_data["delivery_count"] = len(set(o.delivery_group_id for o in existing_orders if o.delivery_group_id)) or 1
                return _success(resp_data, message="Order already placed.", status_code=status.HTTP_200_OK)

        cart_items = list(cart.items.all())

        # Authoritative Pre-Checkout Validation with Vendor Backend
        validation_items = [
            {
                "basket_id": ci.basket_id,
                "requested_quantity": ci.quantity,
                "expected_unit_price": str(ci.unit_price_snapshot),
            } if ci.basket_id else {
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

        # Map validated warehouse / seller info back to cart items if missing
        val_items_map = {}
        for item in val_res.get("validation", {}).get("items", []):
            if item.get("product_id"):
                val_items_map[("product", item["product_id"])] = item
            elif item.get("basket_id"):
                val_items_map[("basket", item["basket_id"])] = item
        for ci in cart_items:
            key = ("basket", ci.basket_id) if ci.basket_id else ("product", ci.seller_product_id)
            v_data = val_items_map.get(key)
            if v_data:
                if not ci.warehouse_id and v_data.get("warehouse_id"):
                    ci.warehouse_id = v_data.get("warehouse_id")
                if not ci.warehouse_name and v_data.get("warehouse_name"):
                    ci.warehouse_name = v_data.get("warehouse_name")
                if not ci.seller_id and v_data.get("company_id"):
                    ci.seller_id = v_data.get("company_id")
                if not ci.seller_name and v_data.get("seller_name"):
                    ci.seller_name = v_data.get("seller_name")

        # Group cart items by warehouse
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

        now = timezone.now()
        created_orders = []
        pending_intakes = []

        for wh_key, wh_data in warehouse_groups.items():
            delivery_group_id = f"DG-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            wh_items = wh_data["items"]

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
                        "basket_id": ci.basket_id,
                        "quantity": ci.quantity,
                        "unit_price": str(ci.unit_price_snapshot),
                        "customization": ci.customization or {},
                        "slot_selections": (ci.customization or {}).get("slot_selections") if isinstance(ci.customization, dict) else None,
                    } if ci.basket_id else {
                        "product_id": ci.seller_product_id,
                        "quantity": ci.quantity,
                        "unit_price": str(ci.unit_price_snapshot),
                        "customization": ci.customization or {},
                    }
                    for ci in s_items
                ]

                payment_snapshot = {
                    "method": payment_method,
                    "transaction_id": payment_transaction_id,
                    "status": payment_status,
                    "paid_amount": str(total_amount),
                }

                order = MarketplaceOrder.objects.create(
                    order_number=source_order_id,
                    delivery_group_id=delivery_group_id,
                    warehouse_id=wh_data["warehouse_id"],
                    warehouse_name=wh_data["warehouse_name"],
                    customer=customer,
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
                    payment_transaction_id=payment_transaction_id,
                    delivery_slot=delivery_slot_label,
                    idempotency_key=f"{idempotency_key}_{source_order_id}",
                )

                MarketplaceOrderItem.objects.bulk_create([
                    MarketplaceOrderItem(
                        order=order,
                        seller_product_id=ci.seller_product_id,
                        basket_id=ci.basket_id,
                        basket_title=ci.basket_title or "",
                        product_title=ci.product_title or ci.basket_title or "",
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
                        "delivery_slot_id": delivery_slot_id,
                        "delivery_slot": delivery_slot_label,
                        "delivery_date": str(delivery_date) if delivery_date else None,
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
                    "delivery_slot_id": delivery_slot_id,
                    "delivery_slot": delivery_slot_label,
                    "delivery_date": str(delivery_date) if delivery_date else None,
                    "delivery_address": delivery_address,
                    "payment_snapshot": payment_snapshot,
                    "intake_items": intake_items,
                })

    # Synchronous Intake Calls to Vendor for each sub-order
    business_rejection = None
    for item in pending_intakes:
        intake_res = MarketplaceIntegrationClient.intake_order(
            source_order_id=item["source_order_id"],
            seller_id=item["seller_id"],
            customer_name=item["customer_name"],
            customer_phone=item["customer_phone"],
            customer_email=item["customer_email"],
            fulfilment_type=item["fulfilment_type"],
            delivery_slot_id=item["delivery_slot_id"],
            delivery_slot=item["delivery_slot"],
            delivery_date=item["delivery_date"],
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
            with transaction.atomic():
                order.status = MarketplaceOrder.Status.CANCELLED
                order.cancellation_reason = intake_res.get("message") or "Seller rejected order intake"
                order.save(update_fields=["status", "cancellation_reason", "updated_at"])

                outbox.status = MarketplaceOrderOutbox.Status.FAILED
                outbox.last_error = intake_res.get("message", "Business rejection")
                outbox.save(update_fields=["status", "last_error", "updated_at"])
        else:
            with transaction.atomic():
                outbox.last_error = intake_res.get("message", "Temporary network failure")
                outbox.next_retry_at = timezone.now() + timedelta(seconds=15)
                outbox.save(update_fields=["last_error", "next_retry_at", "updated_at"])

    if business_rejection:
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
        if payment_intent:
            payment_intent.status = MarketplacePaymentIntent.Status.PAID
            if payment_transaction_id:
                payment_intent.razorpay_payment_id = payment_transaction_id
            payment_intent.save(update_fields=["status", "razorpay_payment_id", "updated_at"])

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


class MarketplaceInitiatePaymentView(APIView):
    """
    POST /api/orders/marketplace/checkout/initiate-payment/
    Step 1 of 2-step Razorpay checkout:
    1. Validates checkout form data (address, name, contact)
    2. Loads customer active marketplace cart and computes authoritative server-side subtotal
    3. Validates cart with vendor backend (pre-payment stock & price check)
    4. Creates Razorpay Order via Razorpay SDK (paise)
    5. Saves MarketplacePaymentIntent row in status CREATED
    6. Returns Razorpay order details and prefill data for frontend Checkout widget
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = MarketplaceCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)

        valid_data = serializer.validated_data
        cart = Cart.objects.filter(
            customer=request.user,
            cart_type=CartType.MARKETPLACE,
            status=CartStatus.ACTIVE,
        ).prefetch_related("items").first()

        if cart is None or not cart.items.exists():
            return _error("Your marketplace cart is empty.", status.HTTP_400_BAD_REQUEST)

        # Authoritative server-side amount calculation
        cart_items = list(cart.items.all())
        subtotal = sum((ci.unit_price_snapshot * ci.quantity for ci in cart_items), Decimal("0.00"))
        delivery_fee = Decimal("0.00")
        total_amount = subtotal + delivery_fee

        if total_amount <= Decimal("0.00"):
            return _error("Cart total must be greater than zero.", status.HTTP_400_BAD_REQUEST)

        # Pre-checkout validation with Vendor before taking payment
        validation_items = [
            {
                "basket_id": ci.basket_id,
                "requested_quantity": ci.quantity,
                "expected_unit_price": str(ci.unit_price_snapshot),
                "customization": ci.customization or {},
                "slot_selections": (ci.customization or {}).get("slot_selections") if isinstance(ci.customization, dict) else None,
            } if ci.basket_id else {
                "product_id": ci.seller_product_id,
                "requested_quantity": ci.quantity,
                "expected_unit_price": str(ci.unit_price_snapshot),
                "customization": ci.customization or {},
            }
            for ci in cart_items
        ]

        val_res = MarketplaceIntegrationClient.validate_cart(seller_id=None, items=validation_items)
        if not val_res.get("success") or not val_res.get("is_valid"):
            err_list = val_res.get("validation", {}).get("errors", [])
            err_msg = err_list[0].get("message") if (err_list and isinstance(err_list[0], dict)) else "Some items in your cart are no longer available or prices have changed."
            return _error(err_msg, status.HTTP_400_BAD_REQUEST, errors=err_list)

        idempotency_key = f"intent_{cart.id}_{cart.updated_at.isoformat()}"
        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()
        is_sandbox_fallback = getattr(settings, "PAYMENT_SANDBOX_MODE", True) and not (key_id and key_secret)

        paise = int(round(float(total_amount) * 100))
        razorpay_order_id = ""

        client = _get_razorpay_client()
        if client:
            try:
                rp_order = client.order.create({
                    "amount": paise,
                    "currency": "INR",
                    "payment_capture": 1,
                    "notes": {
                        "cart_id": str(cart.id),
                        "customer_id": str(request.user.id),
                        "store": "Sevo Mart",
                    },
                })
                razorpay_order_id = rp_order.get("id")
            except Exception as e:
                logger.error("Razorpay order creation failed: %s", e)
                return _error(f"Payment gateway error: {str(e)}", status.HTTP_502_BAD_GATEWAY)
        elif is_sandbox_fallback:
            # Fallback mock order ID for offline/local development when keys are not configured
            razorpay_order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
        else:
            return _error("Razorpay payment gateway is not configured.", status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload_to_store = dict(valid_data)
        if payload_to_store.get("delivery_date") is not None:
            payload_to_store["delivery_date"] = str(payload_to_store["delivery_date"])

        intent = MarketplacePaymentIntent.objects.create(
            customer=request.user,
            cart=cart,
            razorpay_order_id=razorpay_order_id,
            amount=total_amount,
            currency="INR",
            status=MarketplacePaymentIntent.Status.CREATED,
            checkout_payload=payload_to_store,
            idempotency_key=idempotency_key,
        )

        customer_name = str(valid_data.get("customer_name") or getattr(request.user, "get_full_name", lambda: "")() or getattr(request.user, "username", "") or "")
        customer_email = str(valid_data.get("customer_email") or getattr(request.user, "email", "") or "")
        customer_phone = str(valid_data.get("customer_phone") or getattr(request.user, "phone", "") or "")

        return _success({
            "razorpay_order_id": razorpay_order_id,
            "intent_id": intent.id,
            "amount": str(total_amount),
            "amount_paise": paise,
            "currency": "INR",
            "key_id": key_id,
            "name": "Sevo Mart",
            "description": "Sevo Grocery Marketplace Order",
            "sandbox_fallback": is_sandbox_fallback,
            "prefill": {
                "name": customer_name,
                "email": customer_email,
                "contact": customer_phone,
            },
        }, message="Payment intent created.")


class MarketplaceVerifyPaymentView(APIView):
    """
    POST /api/orders/marketplace/checkout/verify-payment/
    Step 2 of 2-step Razorpay checkout:
    1. Takes razorpay_order_id, razorpay_payment_id, razorpay_signature
    2. Authoritatively verifies HMAC SHA256 signature using razorpay SDK
    3. Marks MarketplacePaymentIntent as PAID
    4. Runs _finalize_marketplace_orders to create MarketplaceOrders and dispatch vendor intake
    5. On signature failure, marks intent as FAILED and leaves customer cart intact
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        razorpay_order_id = request.data.get("razorpay_order_id", "").strip()
        razorpay_payment_id = request.data.get("razorpay_payment_id", "").strip()
        razorpay_signature = request.data.get("razorpay_signature", "").strip()

        if not razorpay_order_id:
            return _error("razorpay_order_id is required.", status.HTTP_400_BAD_REQUEST)

        intent = MarketplacePaymentIntent.objects.filter(
            razorpay_order_id=razorpay_order_id,
            customer=request.user,
        ).first()

        if not intent:
            return _error("Payment intent not found.", status.HTTP_404_NOT_FOUND)

        # If already finalized and paid, return existing orders (idempotent replay)
        if intent.status == MarketplacePaymentIntent.Status.PAID:
            existing_orders = list(MarketplaceOrder.objects.filter(
                customer=request.user,
                payment_transaction_id=intent.razorpay_payment_id,
            ).exclude(status=MarketplaceOrder.Status.CANCELLED))
            if existing_orders:
                primary = existing_orders[0]
                serialized = [MarketplaceOrderSerializer(o).data for o in existing_orders]
                resp_data = MarketplaceOrderSerializer(primary).data
                resp_data["orders"] = serialized
                resp_data["delivery_count"] = len(set(o.delivery_group_id for o in existing_orders if o.delivery_group_id)) or 1
                return _success(resp_data, message="Order already verified.", status_code=status.HTTP_200_OK)

        key_id = getattr(settings, "RAZORPAY_KEY_ID", "").strip()
        key_secret = getattr(settings, "RAZORPAY_KEY_SECRET", "").strip()
        is_mock_order = razorpay_order_id.startswith("order_mock_")
        client = _get_razorpay_client()

        # Verify HMAC Signature with Razorpay
        if client and not is_mock_order:
            if not razorpay_payment_id or not razorpay_signature:
                return _error("Payment ID and signature are required for verification.", status.HTTP_400_BAD_REQUEST)
            try:
                client.utility.verify_payment_signature({
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "razorpay_signature": razorpay_signature,
                })
            except Exception as e:
                logger.warning("Razorpay signature verification failed for intent %s: %s", intent.id, e)
                intent.status = MarketplacePaymentIntent.Status.FAILED
                intent.save(update_fields=["status", "updated_at"])
                return _error("Payment signature verification failed. Please try again.", status.HTTP_400_BAD_REQUEST)
        elif is_mock_order and getattr(settings, "PAYMENT_SANDBOX_MODE", False):
            # Sandbox fallback verification
            if not razorpay_payment_id:
                razorpay_payment_id = f"pay_mock_{uuid.uuid4().hex[:14]}"
        else:
            return _error("Razorpay verification credentials missing.", status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Update intent details
        intent.razorpay_payment_id = razorpay_payment_id
        intent.razorpay_signature = razorpay_signature
        intent.save(update_fields=["razorpay_payment_id", "razorpay_signature", "updated_at"])

        # Finalize orders
        return _finalize_marketplace_orders(
            customer=request.user,
            cart=intent.cart,
            checkout_payload=intent.checkout_payload,
            payment_method="UPI",
            payment_status="PAID",
            payment_transaction_id=razorpay_payment_id,
            idempotency_key=intent.idempotency_key,
            payment_intent=intent,
        )


class MarketplaceRazorpayWebhookView(APIView):
    """
    POST /api/orders/marketplace/razorpay-webhook/
    Server-to-server webhook endpoint for asynchronous payment confirmation.
    Safety net in case customer closes tab before verify-payment executes.
    Handles 'payment.captured' and 'order.paid'.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        webhook_body = request.body.decode("utf-8") if isinstance(request.body, bytes) else str(request.body)
        webhook_signature = request.headers.get("X-Razorpay-Signature") or request.META.get("HTTP_X_RAZORPAY_SIGNATURE", "")
        webhook_secret = getattr(settings, "RAZORPAY_WEBHOOK_SECRET", "").strip()
        client = _get_razorpay_client()

        # If webhook secret is configured, verify signature
        if webhook_secret and client:
            try:
                client.utility.verify_webhook_signature(webhook_body, webhook_signature, webhook_secret)
            except Exception as e:
                logger.warning("Razorpay webhook signature verification failed: %s", e)
                return _error("Invalid webhook signature.", status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.warning("Razorpay webhook signature verification failed: %s", e)
                return _error("Invalid webhook signature.", status.HTTP_400_BAD_REQUEST)

        try:
            event_data = json.loads(webhook_body)
        except Exception:
            return _error("Invalid JSON payload.", status.HTTP_400_BAD_REQUEST)

        event_type = event_data.get("event")
        logger.info("Received Razorpay webhook event: %s", event_type)

        if event_type in ["payment.captured", "order.paid"]:
            payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
            order_entity = event_data.get("payload", {}).get("order", {}).get("entity", {})

            razorpay_order_id = payment_entity.get("order_id") or order_entity.get("id")
            razorpay_payment_id = payment_entity.get("id") or ""

            if razorpay_order_id:
                intent = MarketplacePaymentIntent.objects.filter(razorpay_order_id=razorpay_order_id).first()
                if intent and intent.status != MarketplacePaymentIntent.Status.PAID:
                    logger.info("Finalizing order via Razorpay webhook for intent %s", intent.id)
                    intent.razorpay_payment_id = razorpay_payment_id or intent.razorpay_payment_id
                    intent.save(update_fields=["razorpay_payment_id", "updated_at"])

                    _finalize_marketplace_orders(
                        customer=intent.customer,
                        cart=intent.cart,
                        checkout_payload=intent.checkout_payload,
                        payment_method="UPI",
                        payment_status="PAID",
                        payment_transaction_id=razorpay_payment_id,
                        idempotency_key=intent.idempotency_key,
                        payment_intent=intent,
                    )

        return Response({"status": "ok"}, status=status.HTTP_200_OK)


class MarketplaceDeliverySlotsView(APIView):
    """
    GET /api/orders/marketplace/delivery-slots/?warehouse_id=&date=
    Fetches available delivery slots for the given warehouse and date from the Vendor app.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        warehouse_id = request.query_params.get("warehouse_id")
        date_str = request.query_params.get("date")

        res = MarketplaceIntegrationClient.get_delivery_slots(
            warehouse_id=warehouse_id,
            date=date_str,
        )

        if res.get("success"):
            return _success(res.get("data", []))
        else:
            return _error(
                res.get("message", "Failed to fetch delivery slots."),
                status_code=res.get("status_code", status.HTTP_400_BAD_REQUEST),
            )


class MarketplaceCheckoutView(APIView):
    """
    POST /api/orders/marketplace/checkout/
    Cash on Delivery (COD) checkout — creates and confirms the order immediately with
    payment_status="PENDING", payment collected on delivery.
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = MarketplaceCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)

        valid_data = serializer.validated_data
        if valid_data.get("payment_method") != "COD":
            return _error(
                "Only Cash on Delivery (COD) is supported on this endpoint. For UPI/online payments, use initiate-payment.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        idempotency_key = (
            request.headers.get("X-Idempotency-Key")
            or request.headers.get("Idempotency-Key")
            or request.META.get("HTTP_X_IDEMPOTENCY_KEY")
            or request.META.get("HTTP_IDEMPOTENCY_KEY")
            or request.data.get("idempotency_key")
            or ""
        )

        return _finalize_marketplace_orders(
            customer=request.user,
            cart=None,
            checkout_payload=valid_data,
            payment_method="COD",
            payment_status="PENDING",
            payment_transaction_id="",
            idempotency_key=idempotency_key,
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
