from django.contrib import admin
from service_requests.models import Service, Package, AddOn, CatalogCategory, ServiceRequest, GTCancellationPolicy


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'service', 'slug', 'base_price', 'offer_price', 'status', 'stock_item')
    list_filter = ('status', 'service__category', 'service')
    search_fields = ('name', 'slug')
    raw_id_fields = ('stock_item', 'service')


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'slug', 'is_active', 'sort_order')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'slug')


@admin.register(CatalogCategory)
class CatalogCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'is_active', 'sort_order')
    search_fields = ('name', 'slug')


@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'customer_name', 'phone', 'service_category', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'service_category')
    search_fields = ('request_id', 'customer_name', 'phone')


# GT Porter-parity fix (this session, 2026-09-23): admin surface for
# GTCancellationPolicy (see its docstring in models.py). Every field defaults
# to "no fee" -- this registration only lets an admin who has actually made
# the underlying business decision configure it; it changes nothing by
# itself.
@admin.register(GTCancellationPolicy)
class GTCancellationPolicyAdmin(admin.ModelAdmin):
    list_display = ('service_category', 'fee_mode', 'flat_fee_amount', 'percent_fee', 'applies_only_after_assignment', 'grace_period_seconds', 'is_active', 'updated_at')
    list_filter = ('fee_mode', 'is_active')
    search_fields = ('service_category',)
