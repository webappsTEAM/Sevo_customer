from rest_framework import serializers

from .models import GroceryOrder, GroceryOrderItem


class GroceryOrderItemSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)

    class Meta:
        model = GroceryOrderItem
        fields = ["id", "package", "package_name", "quantity_grams", "unit_price_snapshot", "line_amount"]


class GroceryOrderSerializer(serializers.ModelSerializer):
    items = GroceryOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = GroceryOrder
        fields = [
            "id", "order_number", "status", "total_amount",
            "delivery_address", "items", "created_at", "updated_at",
        ]
        read_only_fields = fields


class GroceryCheckoutSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(allow_blank=False, trim_whitespace=True)
    delivery_date = serializers.DateField(required=False, allow_null=True)
    delivery_slot = serializers.CharField(required=False, allow_blank=True, default="")
    tip_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)


# ─── Phase 6: unified "My Orders" read view ────────────────────────────────
#
# Plain normalization functions, not ModelSerializers -- Order and
# GroceryOrder are deliberately separate model families (see orders/models.py
# module docstring) with no shared base, and this is a read-only merge, not
# a shape either model needs to conform to on the write side.

def serialize_service_order(order):
    return {
        "order_type": "service",
        "id": order.id,
        "order_number": order.order_number,
        "status_label": order.get_status_display(),
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "detail": {
            "items": [
                {
                    "service_request_id": item.service_request.request_id if item.service_request else None,
                    "service_category": item.service_category_snapshot,
                    "item_amount": item.item_amount,
                }
                for item in order.items.all()
            ],
        },
    }


def serialize_grocery_order(order):
    return {
        "order_type": "grocery",
        "id": order.id,
        "order_number": order.order_number,
        "status_label": order.get_status_display(),
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "detail": {
            "delivery_address": order.delivery_address,
            "items": [
                {
                    "package_name": item.package.name,
                    "quantity_grams": item.quantity_grams,
                    "unit_price_snapshot": item.unit_price_snapshot,
                    "line_amount": item.line_amount,
                }
                for item in order.items.all()
            ],
        },
    }
