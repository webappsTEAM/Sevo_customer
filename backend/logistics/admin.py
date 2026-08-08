from django.contrib import admin

from .models import Lane, ServiceArea, ServiceTier


@admin.register(ServiceTier)
class ServiceTierAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "weight_class", "city", "starting_price", "order", "is_active"]
    list_filter = ["category", "weight_class", "city", "is_active"]
    search_fields = ["name", "slug"]
    ordering = ["category", "city", "order"]


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
