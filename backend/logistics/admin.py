from django.contrib import admin

from .models import Lane, ServiceArea, ServiceTier


@admin.register(ServiceTier)
class ServiceTierAdmin(admin.ModelAdmin):
    """
    Goods & Transport unification, Phase 2: ServiceTier is now an
    auto-synced MIRROR of service_requests.Package (written by the sync
    bridge in service_requests/services/catalog.py) -- admins edit pricing
    on the Package instead (Catalog > Packages > "Goods & Transport
    Distance Pricing"). This is the Django-admin write path for ServiceTier
    that the REST rate-card API already blocks
    (logistics/admin_views.py AdminServiceTierDetailView.patch); making it
    read-only here too closes the same door for anyone with direct Django
    admin access, rather than leaving one write path locked and one open.
    Kept registered (not unregistered) so it stays visible for debugging
    what the sync bridge actually wrote.
    """
    list_display = ["name", "category", "weight_class", "city", "starting_price", "order", "is_active"]
    list_filter = ["category", "weight_class", "city", "is_active"]
    search_fields = ["name", "slug"]
    ordering = ["category", "city", "order"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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
