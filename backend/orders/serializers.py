from rest_framework import serializers

from .models import (
    GroceryOrder, GroceryOrderItem,
    MarketplaceOrder, MarketplaceOrderItem, MarketplaceOrderEvent,
)


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


class MarketplaceOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceOrderItem
        fields = [
            "id", "seller_product_id", "product_title", "product_sku",
            "product_brand", "unit", "pack_size", "product_image",
            "quantity", "unit_price_snapshot", "mrp_snapshot", "line_amount",
        ]


class MarketplaceOrderEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketplaceOrderEvent
        fields = [
            "id", "event_id", "sequence", "event_type",
            "vendor_status", "previous_vendor_status", "mapped_status",
            "occurred_at", "received_at", "source",
            "cancellation_reason", "cancelled_by",
        ]
        read_only_fields = fields


class MarketplaceOrderSerializer(serializers.ModelSerializer):
    items = MarketplaceOrderItemSerializer(many=True, read_only=True)
    events = MarketplaceOrderEventSerializer(many=True, read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MarketplaceOrder
        fields = [
            "id", "order_number", "seller_id", "seller_name",
            "vendor_order_id", "vendor_order_number", "status", "status_label",
            "total_amount", "subtotal_amount", "delivery_fee",
            "delivery_address", "customer_name", "customer_phone", "customer_email",
            "payment_method", "payment_status", "payment_transaction_id",
            "vendor_intake_synced", "cancellation_reason", "cancelled_at", "cancelled_by",
            "cancellation_pending", "needs_refund_review",
            "delivery_slot", "handover_ref", "last_applied_vendor_sequence",
            "items", "events", "created_at", "updated_at",
        ]
        read_only_fields = fields


class MarketplaceCheckoutSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(allow_blank=False, trim_whitespace=True)
    customer_name = serializers.CharField(required=False, allow_blank=True, default="")
    customer_phone = serializers.CharField(required=False, allow_blank=True, default="")
    customer_email = serializers.CharField(required=False, allow_blank=True, default="")
    payment_method = serializers.CharField(required=False, default="UPI")
    payment_transaction_id = serializers.CharField(required=False, allow_blank=True, default="")
    fulfilment_type = serializers.CharField(required=False, default="DELIVERY")


# ─── Unified "My Orders" read view ──────────────────────────────────────────

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
                    "package_name": item.package.name if item.package else "Item",
                    "quantity_grams": item.quantity_grams,
                    "unit_price_snapshot": item.unit_price_snapshot,
                    "line_amount": item.line_amount,
                }
                for item in order.items.all()
            ],
        },
    }


def serialize_marketplace_order(order):
    return {
        "order_type": "marketplace",
        "id": order.id,
        "order_number": order.order_number,
        "seller_id": order.seller_id,
        "seller_name": order.seller_name,
        "status": order.status,
        "status_label": order.get_status_display(),
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "detail": {
            "delivery_address": order.delivery_address,
            "seller_name": order.seller_name,
            "status": order.status,
            "status_label": order.get_status_display(),
            "items": [
                {
                    "seller_product_id": item.seller_product_id,
                    "product_title": item.product_title,
                    "product_brand": item.product_brand,
                    "unit": item.unit,
                    "pack_size": item.pack_size,
                    "product_image": item.product_image,
                    "quantity": item.quantity,
                    "unit_price_snapshot": item.unit_price_snapshot,
                    "mrp_snapshot": item.mrp_snapshot,
                    "line_amount": item.line_amount,
                }
                for item in order.items.all()
            ],
        },
    }
