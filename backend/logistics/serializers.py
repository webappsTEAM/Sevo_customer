from rest_framework import serializers

from .models import Lane, ServiceArea, ServiceTier


class ServiceTierSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "starting_price", "currency", "includes", "icon", "image", "order",
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
    must stay that way: the per-km rate card is not public.

    Read/write for the descriptive fields, read-write for the pricing ones
    (per-field permission is enforced in pricing_admin.update_tier_pricing,
    not here -- a serializer cannot see the actor's role cleanly and two
    places deciding the same thing is how they drift apart).

    category / slug / city are read-only: together they are the tier's
    identity (unique_together), the seed matches on them, and the Package
    sync maps onto slug. Renaming one from a pricing screen would orphan the
    tier from both.
    """
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    is_distance_priced = serializers.SerializerMethodField()

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "currency", "order", "is_active", "is_distance_priced",
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
