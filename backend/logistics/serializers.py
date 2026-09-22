from decimal import Decimal
from rest_framework import serializers

from .models import Lane, ServiceArea, ServiceTier


class ServiceTierSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "vehicle_class", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "starting_price", "currency", "includes", "icon", "image", "order",
            "max_weight_kg", "max_cft",
            "duration", "updated_at",
        ]


class LaneSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Lane
        fields = [
            "id", "category", "category_display", "city", "destination_label",
            "distance_km", "eta_label", "fare", "currency", "order",
        ]


class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = ["id", "city", "name", "order"]


class ServiceTierPricingSerializer(serializers.ModelSerializer):
    """
    The administrator's view of a tier -- the customer-facing
    ServiceTierSerializer above deliberately exposes only starting_price, and
    only active tiers. This one exposes every rate-card knob and lets the admin
    patch them in place.

    slug and city are deliberately read-only: the frontend pages hardcode
    slugs like '2-wheeler' and 'tata-ace' into layout choices, and workforce
    sync maps onto slug. Renaming one from a pricing screen would orphan the
    tier from both.
    """
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    is_distance_priced = serializers.SerializerMethodField()

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "vehicle_class", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "currency", "order", "is_active", "is_distance_priced",
            # capacity
            "max_weight_kg", "max_cft",
            # pricing
            "starting_price", "base_fare", "per_km_rate", "free_km",
            "minimum_fare", "loading_unloading_charge", "additional_stop_charge",
            "surge_multiplier",
            "updated_at",
        ]
        read_only_fields = ["id", "category", "slug", "city", "category_display",
                            "is_distance_priced", "updated_at"]

    def get_is_distance_priced(self, obj):
        """
        Whether this tier actually uses the distance formula.

        per_km_rate is the switch: with it unset the fare engine falls back to
        the flat starting_price and every other rate on the row is inert. The
        admin UI shows this so nobody edits a free_km that nothing reads.
        """
        return obj.per_km_rate is not None


class ServiceTierChangeLogSerializer(serializers.Serializer):
    """One audit row, flattened for the pricing screen's history panel."""
    id = serializers.IntegerField(read_only=True)
    field_name = serializers.CharField(read_only=True)
    old_value = serializers.CharField(read_only=True)
    new_value = serializers.CharField(read_only=True)
    reason = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    changed_by_name = serializers.SerializerMethodField()

    def get_changed_by_name(self, obj):
        user = getattr(obj, "changed_by", None)
        if user is None:
            return "System"
        full = (user.get_full_name() or "").strip()
        return full or getattr(user, "username", None) or getattr(user, "email", "") or "Unknown"


class GoodsCategorySerializer(serializers.ModelSerializer):
    class Meta:
        from .models import GoodsCategory
        model = GoodsCategory
        fields = [
            "id", "slug", "name", "icon", "description",
            "allows_two_wheeler", "min_vehicle_class", "order", "is_prohibited",
            "is_active",
        ]


class AdminGoodsCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        from .models import GoodsCategory
        model = GoodsCategory
        fields = [
            "id", "slug", "name", "icon", "description",
            "allows_two_wheeler", "min_vehicle_class", "order", "is_prohibited",
            "is_active", "item_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "item_count", "created_at", "updated_at"]


class GoodsItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        from .models import GoodsItem
        model = GoodsItem
        fields = [
            "id", "category", "category_name", "category_slug", "slug", "name", "unit",
            "default_weight_kg", "default_cft", "is_fragile", "is_heavy",
            "is_oversized", "is_prohibited", "requires_special_handling", "special_handling_charge",
            "is_two_wheeler_compatible", "order", "is_active",
        ]
        extra_kwargs = {
            "default_weight_kg": {"required": True, "min_value": Decimal("0.01")},
            "default_cft": {"required": True, "min_value": Decimal("0.01")},
        }


class AdminGoodsItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        from .models import GoodsItem
        model = GoodsItem
        fields = [
            "id", "category", "category_name", "category_slug", "slug", "name", "unit",
            "default_weight_kg", "default_cft", "is_fragile", "is_heavy",
            "is_oversized", "is_prohibited", "requires_special_handling", "special_handling_charge",
            "is_two_wheeler_compatible", "order", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "category_name", "category_slug", "created_at", "updated_at"]
        extra_kwargs = {
            "default_weight_kg": {"required": True, "min_value": Decimal("0.01")},
            "default_cft": {"required": True, "min_value": Decimal("0.01")},
        }


class PackersMoversConfigSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import PackersMoversConfig
        model = PackersMoversConfig
        fields = [
            "id", "city", "standard_packing_rate_cft", "premium_packing_rate_cft",
            "premium_fragile_addon", "floor_rate_no_lift_per_100cft",
            "unpacking_rate_cft", "gst_rate", "survey_cft_threshold",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]



