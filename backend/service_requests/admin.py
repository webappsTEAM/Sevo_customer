from django.contrib import admin
from service_requests.models import Service, Package, AddOn, CatalogCategory, ServiceRequest


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
    list_display = (
        'request_id', 'customer_name', 'phone', 'service_category',
        'status', 'payment_status', 'dispatch_status', 'dispatch_attempts',
        'workforce_job_id', 'created_at'
    )
    list_filter = ('dispatch_status', 'status', 'payment_status', 'service_category')
    search_fields = ('request_id', 'customer_name', 'phone', 'workforce_job_id')
    readonly_fields = ('last_dispatched_at', 'last_dispatch_error', 'dispatch_attempts')
    actions = ['retry_workforce_dispatch']

    @admin.action(description="Retry workforce dispatch for selected bookings")
    def retry_workforce_dispatch(self, request, queryset):
        from service_requests.tasks import async_dispatch_service_request
        count = 0
        for sr in queryset:
            try:
                async_dispatch_service_request.delay(sr.id)
            except Exception:
                async_dispatch_service_request(sr.id)
            count += 1
        self.message_user(request, f"Triggered workforce dispatch for {count} booking(s).")

