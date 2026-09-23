from rest_framework import serializers
from .models import VegetableOrder, VegetableOrderItem, VegetableReturn


class VegetableOrderItemSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)

    class Meta:
        model = VegetableOrderItem
        fields = ["id", "package", "package_name", "quantity_grams", "unit_price_snapshot", "line_amount"]


class VegetableOrderSerializer(serializers.ModelSerializer):
    items = VegetableOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = VegetableOrder
        fields = [
            "id", "order_number", "status", "total_amount",
            "delivery_address", "items", "created_at", "updated_at",
        ]
        read_only_fields = fields


class VegetableCheckoutSerializer(serializers.Serializer):
    delivery_address = serializers.CharField(allow_blank=False, trim_whitespace=True)


def serialize_vegetable_order(order):
    return {
        "order_type": "vegetable",
        "id": order.id,
        "order_number": order.order_number,
        "status_label": order.get_status_display(),
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "detail": {
            "delivery_address": order.delivery_address,
            "items": [
                {
                    "id": item.id,
                    "package_id": item.package_id,
                    "package_name": item.package.name,
                    "quantity_grams": item.quantity_grams,
                    "unit_price_snapshot": item.unit_price_snapshot,
                    "line_amount": item.line_amount,
                }
                for item in order.items.all()
            ],
        },
    }


class VegetableReturnListSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    item_name = serializers.SerializerMethodField()
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    resolution_action_label = serializers.CharField(source="get_resolution_action_display", read_only=True)

    class Meta:
        model = VegetableReturn
        fields = [
            "id", "return_number", "order", "order_number", "item", "item_name",
            "customer", "customer_name", "customer_phone", "reason", "reason_label",
            "status", "status_label", "resolution_action", "resolution_action_label",
            "refund_amount", "created_at", "resolved_at",
        ]

    def get_customer_name(self, obj):
        if not obj.customer:
            return ""
        name = getattr(obj.customer, "get_full_name", lambda: "")()
        return name or getattr(obj.customer, "username", "") or getattr(obj.customer, "phone", "")

    def get_item_name(self, obj):
        if obj.item and obj.item.package:
            return obj.item.package.name
        return "Entire Order"


class VegetableReturnDetailSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_total = serializers.DecimalField(source="order.total_amount", max_digits=10, decimal_places=2, read_only=True)
    order_status = serializers.CharField(source="order.status", read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source="customer.phone", read_only=True)
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    item_name = serializers.SerializerMethodField()
    item_quantity_grams = serializers.IntegerField(source="item.quantity_grams", read_only=True)
    item_amount = serializers.DecimalField(source="item.line_amount", max_digits=10, decimal_places=2, read_only=True)
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    resolution_action_label = serializers.CharField(source="get_resolution_action_display", read_only=True)
    handled_by_name = serializers.SerializerMethodField()
    order_items = serializers.SerializerMethodField()

    class Meta:
        model = VegetableReturn
        fields = [
            "id", "return_number", "order", "order_number", "order_total", "order_status",
            "item", "item_name", "item_quantity_grams", "item_amount",
            "customer", "customer_name", "customer_phone", "customer_email",
            "reason", "reason_label", "customer_notes", "status", "status_label",
            "resolution_action", "resolution_action_label", "refund_amount", "admin_notes",
            "handled_by", "handled_by_name", "created_at", "resolved_at", "order_items",
        ]

    def get_customer_name(self, obj):
        if not obj.customer:
            return ""
        name = getattr(obj.customer, "get_full_name", lambda: "")()
        return name or getattr(obj.customer, "username", "") or getattr(obj.customer, "phone", "")

    def get_item_name(self, obj):
        if obj.item and obj.item.package:
            return obj.item.package.name
        return "Entire Order"

    def get_handled_by_name(self, obj):
        if not obj.handled_by:
            return None
        return getattr(obj.handled_by, "get_full_name", lambda: "")() or obj.handled_by.username

    def get_order_items(self, obj):
        return [
            {
                "id": it.id,
                "package_name": it.package.name,
                "quantity_grams": it.quantity_grams,
                "unit_price_snapshot": str(it.unit_price_snapshot),
                "line_amount": str(it.line_amount),
            }
            for it in obj.order.items.all()
        ]


class CustomerVegetableReturnCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(required=True)
    item_id = serializers.IntegerField(required=False, allow_null=True)
    reason = serializers.ChoiceField(choices=VegetableReturn.Reason.choices)
    customer_notes = serializers.CharField(required=False, allow_blank=True, default="")


class AdminVegetableReturnActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=VegetableReturn.Status.choices)
    resolution_action = serializers.ChoiceField(choices=VegetableReturn.ResolutionAction.choices, required=False, default=VegetableReturn.ResolutionAction.NONE)
    refund_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    admin_notes = serializers.CharField(required=False, allow_blank=True, default="")

