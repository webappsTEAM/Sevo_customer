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
    list_display = ('request_id', 'customer_name', 'phone', 'service_category', 'status', 'payment_status', 'created_at')
    list_filter = ('status', 'payment_status', 'service_category')
    search_fields = ('request_id', 'customer_name', 'phone')
