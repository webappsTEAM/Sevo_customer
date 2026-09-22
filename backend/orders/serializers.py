from rest_framework import serializers

from .models import Order, OrderItem, GroceryOrder, GroceryOrderItem
from .status import compute_order_status


class OrderTaskSerializer(serializers.Serializer):
    """
    One ServiceRequest under an Order, presented as a "service task" --
    the shape the multi-service admin/customer/tracking UIs need (spec
    sections 8/11/12): which service, which technician, what status, and
    whether it's currently flagged delayed. Read-only, computed straight
    off the existing ServiceRequest fields -- no new task model.
    """
    order_item_id = serializers.IntegerField(source="id")
    service_request_id = serializers.IntegerField(source="service_request.id", allow_null=True)
    request_id = serializers.CharField(source="service_request.request_id", allow_null=True)
    service_category = serializers.CharField(source="service_request.service_category", allow_null=True)
    issue_title = serializers.CharField(source="service_request.issue_title", allow_null=True)
    status = serializers.CharField(source="service_request.status", allow_null=True)
    status_display = serializers.SerializerMethodField()
    technician_name = serializers.CharField(source="service_request.technician_name", default="", allow_blank=True)
    is_delayed = serializers.BooleanField(source="service_request.is_delayed", default=False)
    delay_reason = serializers.CharField(source="service_request.delay_reason", default="", allow_blank=True)
    item_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

    def get_status_display(self, obj):
        sr = obj.service_request
        if not sr:
            return None
        try:
            return sr.get_status_display()
        except Exception:
            return sr.status


class OrderDetailSerializer(serializers.ModelSerializer):
    """
    One parent booking (Order) + all of its service tasks (OrderItems),
    with a computed `overall_status` derived from the child ServiceRequests
    per spec section 7 -- never stored, always recomputed from the current
    child statuses so it can't drift out of sync with them.
    """
    tasks = serializers.SerializerMethodField()
    overall_status = serializers.SerializerMethodField()
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "order_number", "status", "total_amount",
            "created_at", "updated_at",
            "tasks", "overall_status", "task_count",
        ]

    def get_tasks(self, order):
        items = order.items.select_related("service_request").all()
        return OrderTaskSerializer(items, many=True).data

    def get_overall_status(self, order):
        return compute_order_status(order)

    def get_task_count(self, order):
        return order.items.count()


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
