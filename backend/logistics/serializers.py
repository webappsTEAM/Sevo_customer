from rest_framework import serializers

from .models import Lane, ServiceArea, ServiceTier


class ServiceTierSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = ServiceTier
        fields = [
            "id", "category", "category_display", "city", "slug", "name",
            "weight_class", "capacity_label", "dimensions_label", "description",
            "starting_price", "currency", "includes", "icon", "order",
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
