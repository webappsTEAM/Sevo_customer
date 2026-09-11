from django.contrib import admin

from .models import Lane, ServiceArea, ServiceTier, GoodsCategory, GoodsItem, PackersMoversConfig


@admin.register(ServiceTier)
class ServiceTierAdmin(admin.ModelAdmin):
    list_display = [
        "name", "category", "vehicle_class", "city", "starting_price", "base_fare", "per_km_rate",
        "free_km", "minimum_fare", "loading_unloading_charge", "additional_stop_charge",
        "surge_multiplier", "max_weight_kg", "max_cft", "order", "is_active"
    ]
    list_filter = ["category", "vehicle_class", "weight_class", "city", "is_active"]
    search_fields = ["name", "slug"]
    ordering = ["category", "city", "order"]
    fieldsets = (
        ("Tier Identity", {
            "fields": ("name", "slug", "category", "vehicle_class", "city", "weight_class", "order", "is_active", "description", "image")
        }),
        ("Rate Card & Pricing", {
            "fields": ("starting_price", "base_fare", "per_km_rate", "free_km", "minimum_fare", "loading_unloading_charge", "additional_stop_charge", "surge_multiplier", "currency")
        }),
        ("Physical Capacity & Fitment", {
            "fields": ("max_weight_kg", "max_cft", "capacity_label", "dimensions_label")
        }),
    )


@admin.register(Lane)
class LaneAdmin(admin.ModelAdmin):
    list_display = ["city", "destination_label", "category", "fare", "eta_label", "order", "is_active"]
    list_filter = ["category", "city", "is_active"]
    search_fields = ["destination_label"]
    ordering = ["category", "city", "order"]


@admin.register(ServiceArea)
class ServiceAreaAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "order", "is_active"]
    list_filter = ["city", "is_active"]
    ordering = ["city", "order"]


@admin.register(GoodsCategory)
class GoodsCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "allows_two_wheeler", "min_vehicle_class", "is_prohibited", "order", "is_active"]
    list_filter = ["allows_two_wheeler", "is_prohibited", "is_active"]
    search_fields = ["name", "slug"]
    ordering = ["order", "name"]
    fieldsets = (
        ("Category Details", {
            "fields": ("name", "slug", "icon", "description", "order", "is_active")
        }),
        ("Transport Restrictions & Fitment", {
            "fields": ("allows_two_wheeler", "min_vehicle_class", "is_prohibited")
        }),
    )


@admin.register(GoodsItem)
class GoodsItemAdmin(admin.ModelAdmin):
    list_display = [
        "name", "category", "default_weight_kg", "default_cft",
        "is_two_wheeler_compatible", "is_fragile", "requires_special_handling",
        "special_handling_charge", "is_prohibited", "is_active"
    ]
    list_filter = ["category", "is_two_wheeler_compatible", "is_fragile", "requires_special_handling", "is_prohibited", "is_active"]
    search_fields = ["name", "slug"]
    ordering = ["category", "order", "name"]
    fieldsets = (
        ("Item Identity", {
            "fields": ("category", "name", "slug", "unit", "order", "is_active")
        }),
        ("Physical Specifications", {
            "fields": ("default_weight_kg", "default_cft", "is_two_wheeler_compatible")
        }),
        ("Handling & Restrictions", {
            "fields": ("is_fragile", "is_heavy", "is_oversized", "requires_special_handling", "special_handling_charge", "is_prohibited")
        }),
    )


@admin.register(PackersMoversConfig)
class PackersMoversConfigAdmin(admin.ModelAdmin):
    list_display = [
        "city", "standard_packing_rate_cft", "premium_packing_rate_cft",
        "premium_fragile_addon", "floor_rate_no_lift_per_100cft",
        "unpacking_rate_cft", "gst_rate", "survey_cft_threshold", "is_active"
    ]
    list_filter = ["city", "is_active"]
    search_fields = ["city"]

