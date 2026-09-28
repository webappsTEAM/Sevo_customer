from django.contrib import admin
from inventory.models import (
    InventoryItem, InventoryAlert, InventoryTransfer, StockMovement,
    Vegetable, VegetableStockMovement
)


@admin.register(Vegetable)
class VegetableAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'org', 'sku', 'unit',
        'stock_quantity_grams', 'default_daily_quantity_grams', 'last_reset_date',
        'package', 'created_at'
    )
    list_filter = ('org', 'last_reset_date')
    search_fields = ('name', 'sku')
    raw_id_fields = ('package', 'org')


@admin.register(VegetableStockMovement)
class VegetableStockMovementAdmin(admin.ModelAdmin):
    list_display = (
        'vegetable', 'org', 'movement_type', 'delta_grams',
        'balance_after_grams', 'booking_ref', 'entered_by', 'created_at'
    )
    list_filter = ('org', 'movement_type', 'created_at')
    search_fields = ('vegetable__name', 'booking_ref', 'reason')
    readonly_fields = ('created_at',)
    raw_id_fields = ('vegetable', 'org', 'entered_by')


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'org', 'sku', 'category', 'unit',
        'warehouse_name', 'total_quantity', 'available_quantity', 'reorder_threshold'
    )
    list_filter = ('org', 'category', 'warehouse_name')
    search_fields = ('name', 'sku')
    fields = (
        'org', 'name', 'category', 'sku', 'unit',
        'warehouse_name', 'total_quantity', 'available_quantity', 'reserved_quantity',
        'unit_cost', 'reorder_threshold', 'reorder_quantity', 'pending_purchase_quantity',
        'expected_delivery_date', 'is_returnable', 'requires_photo_on_issue'
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('item', 'org', 'movement_type', 'delta_grams', 'balance_after_grams', 'booking_ref', 'entered_by', 'created_at')
    list_filter = ('org', 'movement_type', 'created_at')
    search_fields = ('item__name', 'booking_ref', 'reason')
    readonly_fields = ('created_at',)


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
