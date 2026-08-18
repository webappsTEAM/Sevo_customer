from django.contrib import admin
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'org', 'sku', 'category', 'warehouse_name', 'total_quantity', 'available_quantity', 'reorder_threshold')
    list_filter = ('org', 'category', 'warehouse_name')
    search_fields = ('name', 'sku')


@admin.register(InventoryAlert)
class InventoryAlertAdmin(admin.ModelAdmin):
    list_display = ('alert_type', 'org', 'item', 'is_resolved', 'created_at')
    list_filter = ('org', 'alert_type', 'is_resolved')
    search_fields = ('item__name', 'message')


@admin.register(InventoryTransfer)
class InventoryTransferAdmin(admin.ModelAdmin):
    list_display = ('item', 'from_warehouse', 'to_warehouse', 'quantity', 'status', 'requested_at', 'delivered_at')
    list_filter = ('status', 'from_warehouse', 'to_warehouse')
    search_fields = ('item__name',)
