"""
carts/views.py

Phase 1 endpoints only (see DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
  GET    /carts/{type}            -- current active cart + items
  POST   /carts/{type}/items      -- add item
  PATCH  /carts/{type}/items/{id} -- update quantity/customization
  DELETE /carts/{type}/items/{id} -- remove item

Not wired into BookingCreateView or any checkout flow yet -- that's Phase 4.
"""
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from service_requests.models import Package

from .models import Cart, CartItem, CartType, CartStatus
from .serializers import (
    CartSerializer,
    CartItemSerializer,
    CartItemCreateSerializer,
    CartItemUpdateSerializer,
)


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


def _valid_cart_type(cart_type):
    return cart_type in CartType.values


def _get_active_cart(customer, cart_type, create=False):
    cart = Cart.objects.filter(customer=customer, cart_type=cart_type, status=CartStatus.ACTIVE).first()
    if cart is None and create:
        cart = Cart.objects.create(customer=customer, cart_type=cart_type, status=CartStatus.ACTIVE)
    return cart


class CartDetailView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request, cart_type):
        if not _valid_cart_type(cart_type):
            return _error(f"Unknown cart type '{cart_type}'.", status.HTTP_400_BAD_REQUEST)

        cart = _get_active_cart(request.user, cart_type, create=False)
        if cart is None:
            return _success({"cart_type": cart_type, "status": None, "items": [], "subtotal": 0})
        return _success(CartSerializer(cart).data)


class CartItemListView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, cart_type):
        if not _valid_cart_type(cart_type):
            return _error(f"Unknown cart type '{cart_type}'.", status.HTTP_400_BAD_REQUEST)

        serializer = CartItemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)

        data = serializer.validated_data
        package = Package.objects.get(id=data["package_id"])
        unit_price = package.offer_price if package.offer_price is not None else package.base_price

        with transaction.atomic():
            cart = _get_active_cart(request.user, cart_type, create=True)
            item, created = CartItem.objects.get_or_create(
                cart=cart,
                package=package,
                customization=data.get("customization") or {},
                defaults={
                    "quantity": data["quantity"],
                    "unit_price_snapshot": unit_price,
                },
            )
            if not created:
                item.quantity += data["quantity"]
                item.save(update_fields=["quantity", "updated_at"])

        return _success(CartItemSerializer(item).data, status_code=status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [IsCustomer]

    def _get_item(self, request, cart_type, item_id):
        return CartItem.objects.filter(
            id=item_id,
            cart__customer=request.user,
            cart__cart_type=cart_type,
            cart__status=CartStatus.ACTIVE,
        ).select_related("cart").first()

    def patch(self, request, cart_type, item_id):
        if not _valid_cart_type(cart_type):
            return _error(f"Unknown cart type '{cart_type}'.", status.HTTP_400_BAD_REQUEST)

        item = self._get_item(request, cart_type, item_id)
        if item is None:
            return _error("Cart item not found.", status.HTTP_404_NOT_FOUND)

        serializer = CartItemUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return _error("Validation error.", status.HTTP_400_BAD_REQUEST, errors=serializer.errors)

        update_fields = []
        for field in ("quantity", "customization"):
            if field in serializer.validated_data:
                setattr(item, field, serializer.validated_data[field])
                update_fields.append(field)
        update_fields.append("updated_at")
        item.save(update_fields=update_fields)

        return _success(CartItemSerializer(item).data)

    def delete(self, request, cart_type, item_id):
        if not _valid_cart_type(cart_type):
            return _error(f"Unknown cart type '{cart_type}'.", status.HTTP_400_BAD_REQUEST)

        item = self._get_item(request, cart_type, item_id)
        if item is None:
            return _error("Cart item not found.", status.HTTP_404_NOT_FOUND)

        item.delete()
        return _success(message="Item removed from cart.")
