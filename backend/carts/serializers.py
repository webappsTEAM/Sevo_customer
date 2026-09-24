from rest_framework import serializers

from service_requests.models import Package
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    package_name = serializers.SerializerMethodField()
    package_slug = serializers.CharField(source="package.slug", read_only=True)
    package_image = serializers.SerializerMethodField()
    line_amount = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "package", "package_name", "package_slug", "package_image",
            "seller_id", "seller_name", "warehouse_id", "warehouse_name",
            "seller_product_id", "product_title", "product_sku", "product_brand",
            "unit", "pack_size", "product_image", "mrp_snapshot",
            "quantity", "unit_price_snapshot", "customization",
            "line_amount", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "unit_price_snapshot", "created_at", "updated_at"]

    def get_package_name(self, obj):
        if obj.package:
            return obj.package.name
        return obj.product_title

    def get_package_image(self, obj):
        if obj.package and obj.package.image:
            return obj.package.image
        return obj.product_image

    def get_line_amount(self, obj):
        return obj.unit_price_snapshot * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    warehouse_groups = serializers.SerializerMethodField()
    delivery_count = serializers.SerializerMethodField()
    multi_warehouse = serializers.SerializerMethodField()
    multi_warehouse_notice = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "cart_type", "status", "seller_id", "seller_name",
            "items", "subtotal", "warehouse_groups", "delivery_count",
            "multi_warehouse", "multi_warehouse_notice",
            "created_at", "updated_at"
        ]
        read_only_fields = fields

    def get_subtotal(self, obj):
        return sum((item.unit_price_snapshot * item.quantity for item in obj.items.all()), start=0)

    def get_warehouse_groups(self, obj):
        items = list(obj.items.all())
        if not items:
            return []
        groups_dict = {}
        for item in items:
            wh_id = item.warehouse_id
            key = wh_id if wh_id is not None else 0
            if key not in groups_dict:
                groups_dict[key] = {
                    "warehouse_id": item.warehouse_id,
                    "warehouse_name": item.warehouse_name or "Default Fulfilment Centre",
                    "items": [],
                    "sellers": set(),
                    "subtotal": 0,
                    "item_count": 0,
                }
            groups_dict[key]["items"].append(CartItemSerializer(item).data)
            if item.seller_id:
                groups_dict[key]["sellers"].add(item.seller_name or f"Seller #{item.seller_id}")
            groups_dict[key]["subtotal"] += (item.unit_price_snapshot * item.quantity)
            groups_dict[key]["item_count"] += item.quantity

        result = []
        for g in groups_dict.values():
            g["sellers"] = sorted(list(g["sellers"]))
            result.append(g)
        return result

    def get_delivery_count(self, obj):
        wh_ids = set(item.warehouse_id for item in obj.items.all())
        return max(1, len(wh_ids)) if obj.items.exists() else 0

    def get_multi_warehouse(self, obj):
        wh_ids = set(item.warehouse_id for item in obj.items.all())
        return len(wh_ids) > 1

    def get_multi_warehouse_notice(self, obj):
        wh_ids = set(item.warehouse_id for item in obj.items.all())
        if len(wh_ids) > 1:
            return f"Your order will arrive in {len(wh_ids)} separate deliveries because items ship from different warehouses."
        return ""


class CartItemCreateSerializer(serializers.Serializer):
    package_id = serializers.IntegerField(required=False, allow_null=True)
    seller_product_id = serializers.IntegerField(required=False, allow_null=True)
    seller_id = serializers.IntegerField(required=False, allow_null=True)
    seller_name = serializers.CharField(required=False, allow_blank=True, default="")
    clear_cart = serializers.BooleanField(required=False, default=False)
    quantity = serializers.IntegerField(min_value=1, default=1)
    customization = serializers.JSONField(required=False, default=dict)

    def validate(self, data):
        package_id = data.get("package_id")
        seller_product_id = data.get("seller_product_id")
        if not package_id and not seller_product_id:
            raise serializers.ValidationError("Either package_id or seller_product_id is required.")
        if package_id and not Package.objects.filter(id=package_id).exists():
            raise serializers.ValidationError({"package_id": "Package not found."})
        return data


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, required=False)
    customization = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Nothing to update -- provide quantity and/or customization.")
        return attrs
