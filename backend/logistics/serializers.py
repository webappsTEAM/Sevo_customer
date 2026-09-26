from decimal import Decimal
from rest_framework import serializers

from .models import Lane, LogisticsCategory, ServiceArea, ServiceTier


class ServiceTierSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "vehicle_class", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "starting_price", "currency", "includes", "icon", "image", "order",
            "max_weight_kg", "max_cft",
            "duration", "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # "Starting from" must be a fare the quote engine can really produce.
        # For Goods & Transport tiers that means the formula's floor, not the
        # mirrored starting_price (which drifts from base_fare/minimum_fare).
        # Packers & Movers tiers keep their own package pricing untouched.
        if instance.category in (LogisticsCategory.TRUCK, LogisticsCategory.TWO_WHEELER):
            from service_requests.services.logistics_pricing import tier_display_starting_fare
            data["starting_price"] = str(tier_display_starting_fare(instance))
        return data

    def get_image(self, obj):
        if not obj.image:
            return None
        url_str = str(obj.image)
        if url_str.startswith("http://") or url_str.startswith("https://"):
            return url_str
        try:
            import os
            if hasattr(obj.image, "path") and os.path.exists(obj.image.path):
                return obj.image.url
        except Exception:
            pass
        return None


class LaneSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = Lane
        fields = [
            "id", "category", "category_display", "city", "destination_label",
            "destination_latitude", "destination_longitude",
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

    is_dispatchable / dispatchability_warning: operator transparency for tiers
    whose vehicle_class has no matching Vendor vehicle type (currently
    heavy_truck). The tier may exist for reference/configuration but customers
    cannot book it and no driver can be dispatched for it. Admin sees a clear
    warning rather than a silent misconfiguration.

    includes_configured: True when the tier's `includes` JSONField has at
    least one entry. False means the customer will see no suitability content
    for this tier -- admin should populate it.
    """
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    is_distance_priced = serializers.SerializerMethodField()
    is_dispatchable = serializers.SerializerMethodField()
    dispatchability_warning = serializers.SerializerMethodField()
    includes_configured = serializers.SerializerMethodField()

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "vehicle_class", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "currency", "order", "is_active", "is_distance_priced",
            # dispatchability transparency (GT audit Finding 07)
            "is_dispatchable", "dispatchability_warning",
            # suitability content health (GT audit Finding 03)
            "includes_configured",
            # capacity
            "max_weight_kg", "max_cft",
            # pricing
            "starting_price", "base_fare", "per_km_rate", "free_km",
            "minimum_fare", "loading_unloading_charge", "additional_stop_charge",
            "surge_multiplier",
            "updated_at",
        ]
        read_only_fields = ["id", "category", "slug", "city", "category_display",
                            "is_distance_priced", "is_dispatchable",
                            "dispatchability_warning", "includes_configured", "updated_at"]

    def get_is_distance_priced(self, obj):
        """
        Whether this tier actually uses the distance formula.

        per_km_rate is the switch: with it unset the fare engine falls back to
        the flat starting_price and every other rate on the row is inert. The
        admin UI shows this so nobody edits a free_km that nothing reads.
        """
        return obj.per_km_rate is not None

    def get_is_dispatchable(self, obj):
        """
        False when vehicle_class is set to a class with no matching Vendor
        vehicle type. Currently only heavy_truck is in this category.

        P&M tiers (blank vehicle_class) return True because they are matched
        on package/payload, not on vehicle type.
        """
        from service_requests.services.logistics_pricing import DISPATCHABLE_VEHICLE_CLASSES
        if not obj.vehicle_class:
            return True  # P&M relocation packages — no vehicle class constraint
        return obj.vehicle_class in DISPATCHABLE_VEHICLE_CLASSES

    def get_dispatchability_warning(self, obj):
        """
        Human-readable warning for Admin/Superadmin when this tier cannot be
        dispatched with current Vendor capabilities. None when dispatchable.
        """
        from service_requests.services.logistics_pricing import DISPATCHABLE_VEHICLE_CLASSES
        if obj.vehicle_class and obj.vehicle_class not in DISPATCHABLE_VEHICLE_CLASSES:
            return (
                f"Vehicle class '{obj.vehicle_class}' is not supported by current "
                f"Vendor vehicle capability. Customers cannot book or see this tier. "
                f"Activate it only after the Vendor fleet includes this class."
            )
        return None

    def get_includes_configured(self, obj):
        """
        True when the tier's 'includes' field has at least one item.
        False means customers see no suitability content — admin should
        populate the 'includes' field for this tier.
        """
        return bool(obj.includes)


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
            "id", "slug", "name", "icon", "description", "info_banner",
            "allows_two_wheeler", "min_vehicle_class", "order", "is_prohibited",
            "is_active",
        ]


class AdminGoodsCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        from .models import GoodsCategory
        model = GoodsCategory
        fields = [
            "id", "slug", "name", "icon", "description", "info_banner",
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
            "id", "category", "category_name", "category_slug", "slug", "name", "subcategory", "unit",
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
            "id", "category", "category_name", "category_slug", "slug", "name", "subcategory", "unit",
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
            "max_helpers", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GTFaqSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        from .models import GTFaq
        model = GTFaq
        fields = [
            "id", "category", "category_display", "city",
            "question", "answer", "order", "is_active",
        ]


class LogisticsSlotSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import LogisticsSlot
        model = LogisticsSlot
        fields = [
            "id", "category", "city", "group", "slot_label",
            "start_time", "end_time", "capacity", "order", "is_active",
        ]


class AdminLogisticsSlotSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import LogisticsSlot
        model = LogisticsSlot
        fields = [
            "id", "category", "city", "group", "slot_label",
            "start_time", "end_time", "capacity", "order", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]




