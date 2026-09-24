from rest_framework import serializers

from service_requests.models import Package
from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    package_slug = serializers.CharField(source="package.slug", read_only=True)
    package_image = serializers.CharField(source="package.image", read_only=True)
    variant_id = serializers.IntegerField(source="variant.id", read_only=True, default=None, allow_null=True)
    variant_name = serializers.CharField(source="variant.display_name", read_only=True, default=None, allow_null=True)
    variant_pack_value = serializers.DecimalField(source="variant.pack_value", max_digits=10, decimal_places=2, read_only=True, default=None, allow_null=True)
    variant_unit = serializers.CharField(source="variant.unit", read_only=True, default=None, allow_null=True)
    line_amount = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "package", "package_name", "package_slug", "package_image",
            "variant", "variant_id", "variant_name", "variant_pack_value", "variant_unit",
            "quantity", "unit_price_snapshot", "customization",
            "line_amount", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "unit_price_snapshot", "created_at", "updated_at"]

    def get_line_amount(self, obj):
        return obj.unit_price_snapshot * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "cart_type", "status", "items", "subtotal", "created_at", "updated_at"]
        read_only_fields = fields

    def get_subtotal(self, obj):
        return sum((item.unit_price_snapshot * item.quantity for item in obj.items.all()), start=0)


class CartItemCreateSerializer(serializers.Serializer):
    package_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, default=1)
    customization = serializers.JSONField(required=False, default=dict)

    def validate_package_id(self, value):
        if not Package.objects.filter(id=value).exists():
            raise serializers.ValidationError("Package not found.")
        return value


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, required=False)
    customization = serializers.JSONField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Nothing to update -- provide quantity and/or customization.")
        return attrs
