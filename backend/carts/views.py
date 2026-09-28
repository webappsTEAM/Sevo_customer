"""
carts/views.py

Cart endpoints for Services, Daily Essentials, and Seller Hub Marketplace.
Enforces single-seller rule for marketplace carts and queries live vendor product details.
"""
from decimal import Decimal
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from service_requests.models import Package
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

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


def _error(message, status_code=400, errors=None, **kwargs):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    for k, v in kwargs.items():
        body[k] = v
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
            return _success({
                "cart_type": cart_type,
                "status": None,
                "seller_id": None,
                "seller_name": "",
                "items": [],
                "subtotal": 0
            })
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

        if cart_type == CartType.MARKETPLACE:
            seller_prod_id = data.get("seller_product_id")
            if not seller_prod_id:
                return _error("seller_product_id is required for marketplace carts.", status.HTTP_400_BAD_REQUEST)

            # Fetch authoritative product details from Vendor integration
            prod_detail = MarketplaceIntegrationClient.fetch_product_detail(product_id=seller_prod_id)
            if not prod_detail.get("success") or not prod_detail.get("data"):
                return _error("Product is unavailable or out of stock.", status.HTTP_400_BAD_REQUEST)

            p_data = prod_detail["data"]
            if not p_data.get("in_stock", False) or (p_data.get("available_stock", 0) <= 0):
                return _error(f"'{p_data.get('title', 'Product')}' is currently out of stock.", status.HTTP_400_BAD_REQUEST)

            item_seller_id = p_data.get("seller_id")
            item_seller_name = p_data.get("seller_name") or ""
            unit_price = Decimal(str(p_data.get("selling_price", 0)))
            mrp = Decimal(str(p_data.get("mrp", 0))) if p_data.get("mrp") else None

            with transaction.atomic():
                cart = _get_active_cart(request.user, cart_type, create=True)
                existing_items_count = cart.items.count()

                # Single-seller rule enforcement
                if existing_items_count > 0 and cart.seller_id and cart.seller_id != item_seller_id:
                    if not data.get("clear_cart", False):
                        return _error(
                            f"Your cart already contains items from '{cart.seller_name or 'another store'}'.",
                            status_code=status.HTTP_409_CONFLICT,
                            error="seller_mismatch",
                            current_seller_id=cart.seller_id,
                            current_seller_name=cart.seller_name,
                            new_seller_id=item_seller_id,
                            new_seller_name=item_seller_name,
                        )
                    # Customer confirmed clearing cart to switch seller
                    cart.items.all().delete()
                    cart.seller_id = item_seller_id
                    cart.seller_name = item_seller_name
                    cart.save(update_fields=["seller_id", "seller_name", "updated_at"])
                elif existing_items_count == 0 or not cart.seller_id:
                    cart.seller_id = item_seller_id
                    cart.seller_name = item_seller_name
                    cart.save(update_fields=["seller_id", "seller_name", "updated_at"])

                item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    seller_product_id=seller_prod_id,
                    defaults={
                        "product_title": p_data.get("title", ""),
                        "product_sku": p_data.get("sku", ""),
                        "product_brand": p_data.get("brand", ""),
                        "unit": p_data.get("unit", ""),
                        "pack_size": p_data.get("pack_size", ""),
                        "product_image": p_data.get("primary_image", "") or (p_data.get("images", [""])[0] if p_data.get("images") else ""),
                        "quantity": data["quantity"],
                        "unit_price_snapshot": unit_price,
                        "mrp_snapshot": mrp,
                        "customization": data.get("customization") or {},
                    },
                )
                if not created:
                    item.quantity += data["quantity"]
                    item.unit_price_snapshot = unit_price
                    item.mrp_snapshot = mrp
                    item.save(update_fields=["quantity", "unit_price_snapshot", "mrp_snapshot", "updated_at"])

            return _success(CartItemSerializer(item).data, status_code=status.HTTP_201_CREATED)

        # Non-marketplace (Services / Daily Essentials)
        package = Package.objects.get(id=data["package_id"])
        
        variant = None
        if data.get("variant_id"):
            variant = package.variants.filter(id=data["variant_id"], is_active=True).first()
        if variant is None:
            variant = package.variants.filter(is_default=True, is_active=True).first() or package.variants.filter(is_active=True).first()

        if variant is not None:
            unit_price = variant.base_price
        else:
            unit_price = package.offer_price if package.offer_price is not None else package.base_price

        with transaction.atomic():
            cart = _get_active_cart(request.user, cart_type, create=True)
            item, created = CartItem.objects.get_or_create(
                cart=cart,
                package=package,
                variant=variant,
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

        cart = item.cart
        item.delete()

        # If cart is now empty, reset seller binding
        if cart.cart_type == CartType.MARKETPLACE and cart.items.count() == 0:
            cart.seller_id = None
            cart.seller_name = ""
            cart.save(update_fields=["seller_id", "seller_name", "updated_at"])

        return _success(message="Item removed from cart.")


class CartClearView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, cart_type):
        if not _valid_cart_type(cart_type):
            return _error(f"Unknown cart type '{cart_type}'.", status.HTTP_400_BAD_REQUEST)

        cart = _get_active_cart(request.user, cart_type, create=False)
        if cart:
            cart.items.all().delete()
            if cart.cart_type == CartType.MARKETPLACE:
                cart.seller_id = None
                cart.seller_name = ""
                cart.save(update_fields=["seller_id", "seller_name", "updated_at"])

        return _success(message="Cart cleared successfully.")
