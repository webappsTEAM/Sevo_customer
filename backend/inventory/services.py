"""
inventory/services.py

Business logic for managing warehouse inventory items, alerts, and stock reservations.
"""
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer


def check_stock_level(item):
    """Check if stock fell below reorder threshold and create alert."""
    if item.available_quantity <= item.reorder_threshold:
        alert, _ = InventoryAlert.objects.get_or_create(
            org=item.org,
            alert_type=InventoryAlert.AlertType.LOW_STOCK,
            item=item,
            is_resolved=False,
            defaults={'message': f'Stock for {item.name} is low ({item.available_quantity} available).'}
        )
        return alert
    return None


def reserve_stock(item, quantity):
    """Reserve stock for booking work extension."""
    if quantity > item.effective_available_quantity:
        raise ValidationError(f"Insufficient stock for {item.name}. Available: {item.effective_available_quantity}, Requested: {quantity}")
    item.reserved_quantity += quantity
    item.save(update_fields=['reserved_quantity'])
    check_stock_level(item)
    return item


def release_stock(item, quantity):
    """Release previously reserved stock."""
    item.reserved_quantity = max(0, item.reserved_quantity - quantity)
    item.save(update_fields=['reserved_quantity'])
    return item
