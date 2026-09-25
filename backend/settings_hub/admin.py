from django.contrib import admin
from .models import City, ServiceZone, ServiceZoneService, NotificationPreference, TeamInvite


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "state", "is_launched", "is_active", "display_order"]
    list_filter = ["is_launched", "is_active", "state"]
    search_fields = ["name", "slug", "state"]
    ordering = ["display_order", "name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(ServiceZone)
class ServiceZoneAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "zone_type", "status", "is_active", "created_at"]
    list_filter = ["city", "zone_type", "status"]
    search_fields = ["name"]
    ordering = ["city", "name"]


@admin.register(ServiceZoneService)
class ServiceZoneServiceAdmin(admin.ModelAdmin):
    list_display = ["zone", "service_slug", "service_name", "is_available"]
    list_filter = ["is_available", "service_slug"]
    search_fields = ["service_slug", "service_name", "zone__name"]
