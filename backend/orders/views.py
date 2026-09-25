"""
orders/views.py

Phase 3 (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md): grocery checkout --
a hard-blocking path. Reads the customer's ACTIVE daily_essentials Cart,
reserves stock atomically, and either produces a GroceryOrder or fails the
whole checkout with no partial state left behind.

Unlike BookingCreateView's soft-fail pattern (a service booking is created
even when downstream steps have issues), insufficient stock here must
hard-block: nothing is created, nothing is charged, the cart is untouched.

Not yet reachable from a unified checkout button -- that's Phase 4, which
will call this independently of (never inside the same transaction as)
service checkout, per the approved two-cart architecture.
"""
import os

from django.db import transaction
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from carts.models import Cart, CartType, CartStatus
from inventory.services.vegetable_stock_service import (
    reserve_stock_for_booking_items,
    InsufficientStockError,
)
from inventory.utils.unit_conversion import parse_pack_size_grams, parse_pack_size

from .models import Order, GroceryOrder, GroceryOrderItem, MarketplaceOrder
from .serializers import (
    GroceryOrderSerializer,
    GroceryCheckoutSerializer,
    serialize_service_order,
    serialize_grocery_order,
    serialize_marketplace_order,
)
from vegetable_orders.models import VegetableOrder, VegetableOrderItem
from vegetable_orders.serializers import VegetableOrderSerializer, serialize_vegetable_order


def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400, errors=None):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    return Response(body, status=status_code)


def _get_company(request):
    """
    Mirrors service_requests.views._get_company(): CompanyMiddleware never
    sets request.company (documented no-op), so resolve the real operating
    company by its stable slug, falling back to the single-company
    heuristic. Duplicated here (rather than imported) to keep this new app
    from reaching into service_requests' private view internals.
    """
    company = getattr(request, "company", None)
    if company:
        return company
    from companies.models import Company
    default_slug = os.environ.get("DEFAULT_COMPANY_SLUG", "calservices")
    company = Company.objects.filter(slug=default_slug).first()
    if company:
        return company
    if Company.objects.count() == 1:
        return Company.objects.first()
    return None


class GroceryCheckoutView(APIView):
    """
    POST /api/orders/grocery/checkout/
    Checks out active daily essentials (vegetables) cart into a VegetableOrder.
    """
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = GroceryCheckoutSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)
        delivery_address = serializer.validated_data["delivery_address"]

        cart = Cart.objects.filter(
            customer=request.user, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE,
        ).prefetch_related("items__package").first()
        if cart is None or not cart.items.exists():
            return _error("Your daily essentials cart is empty.", status.HTTP_400_BAD_REQUEST)

        company = _get_company(request)
        if company is None:
            return _error("Unable to resolve operating company for checkout.", status.HTTP_400_BAD_REQUEST)

        cart_items = list(cart.items.all())
        total_amount = sum((ci.unit_price_snapshot * ci.quantity for ci in cart_items))

        stock_request_items = []
        variant_snapshots = []
        for ci in cart_items:
            if ci.variant:
                basis = ci.variant.unit_basis
                item_unit = ci.variant.unit
                units_per_pack = ci.variant.base_unit_deduction
                var_obj = ci.variant
                var_name = ci.variant.display_name
                pack_val = ci.variant.pack_value
            else:
                stock_item = getattr(ci.package, "stock_item", None)
                basis = getattr(stock_item, "unit_basis", "WEIGHT") if stock_item else "WEIGHT"
                item_unit = getattr(stock_item, "unit", "g") if stock_item else "g"
                pack_info = parse_pack_size(ci.package.duration, default_val=1 if basis == "COUNT" else 500, default_basis=basis)
                units_per_pack = pack_info["base_units"]
                var_obj = None
                var_name = ci.package.duration or ""
                pack_val = pack_info.get("value")

            total_units = ci.quantity * units_per_pack
            base_unit_str = "pcs" if basis == "COUNT" else "g"
            stock_request_items.append({
                "product": ci.package,
                "quantity": total_units,
                "unit": base_unit_str,
                "unit_basis": basis,
                "display_unit": item_unit,
            })
            variant_snapshots.append({
                "variant": var_obj,
                "variant_name": var_name,
                "pack_value": pack_val,
            })

        try:
            with transaction.atomic():
                order = VegetableOrder.objects.create(
                    customer=request.user,
                    total_amount=total_amount,
                    delivery_address=delivery_address,
                )
                reserve_stock_for_booking_items(stock_request_items, company, booking_ref=order.order_number)

                VegetableOrderItem.objects.bulk_create([
                    VegetableOrderItem(
                        order=order,
                        package=ci.package,
                        variant=variant_snapshots[i]["variant"],
                        variant_name_snapshot=variant_snapshots[i]["variant_name"],
                        pack_value_snapshot=variant_snapshots[i]["pack_value"],
                        unit_basis=stock_request_items[i]["unit_basis"],
                        unit_label=stock_request_items[i]["display_unit"],
                        quantity_grams=stock_request_items[i]["quantity"],
                        unit_price_snapshot=ci.unit_price_snapshot,
                        line_amount=ci.unit_price_snapshot * ci.quantity,
                    )
                    for i, ci in enumerate(cart_items)
                ])

                cart.status = CartStatus.CHECKED_OUT
                cart.save(update_fields=["status", "updated_at"])
        except InsufficientStockError as exc:
            return _error(
                "This quantity is no longer available. Please reduce the quantity and try again.",
                status.HTTP_400_BAD_REQUEST,
                errors=[{"product_name": exc.product_name, "requested_grams": exc.requested_grams}],
            )

        return _success(VegetableOrderSerializer(order).data, status_code=status.HTTP_201_CREATED)


class MyOrdersView(APIView):
    """
    GET /api/orders/my/

    Phase 6: read-only merge of Order (services), VegetableOrder (vegetables),
    and legacy/standalone GroceryOrder for the current customer, normalized into
    a common shape and sorted by date.
    """
    permission_classes = [IsCustomer]

    def get(self, request):
        # Read-only merge across order families:
        # - Order: Service bookings
        # - VegetableOrder: Dedicated vegetable produce orders
        # - GroceryOrder: Kept as a safety net / backward-compatibility hook for any future grocery
        #   orders built by the grocery team (currently returns 0 rows after the vegetable migration).
        service_orders = Order.objects.filter(customer=request.user).prefetch_related("items__service_request")
        vegetable_orders = VegetableOrder.objects.filter(customer=request.user).prefetch_related("items__package")
        grocery_orders = GroceryOrder.objects.filter(customer=request.user).prefetch_related("items__package")
        marketplace_orders = MarketplaceOrder.objects.filter(customer=request.user).prefetch_related("items")

        merged = (
            [serialize_service_order(o) for o in service_orders]
            + [serialize_vegetable_order(o) for o in vegetable_orders]
            + [serialize_grocery_order(o) for o in grocery_orders]
            + [serialize_marketplace_order(o) for o in marketplace_orders]
        )
        merged.sort(key=lambda entry: entry["created_at"], reverse=True)

        return _success(merged)
