from django.db import models
from django.conf import settings
from companies.models import Company
from common.models import CompanyScopedManager


class InventoryItem(models.Model):
    class Category(models.TextChoices):
        EQUIPMENT = 'equipment', 'Equipment'
        CONSUMABLE = 'consumable', 'Consumable'
        UNIFORM = 'uniform', 'Uniform'
        VEHICLE = 'vehicle', 'Vehicle'
        PPE = 'ppe', 'PPE'
        TOOL = 'tool', 'Tool'
        PART = 'part', 'Spare Part'
        MATERIAL = 'material', 'Raw Material'

    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_items')
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=Category.choices)
    sku = models.CharField(max_length=100, blank=True)
    warehouse_name = models.CharField(max_length=255, blank=True, default="Main Warehouse")
    total_quantity = models.PositiveIntegerField(default=0)
    available_quantity = models.PositiveIntegerField(default=0)
    reserved_quantity = models.PositiveIntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reorder_threshold = models.PositiveIntegerField(default=0)
    reorder_quantity = models.PositiveIntegerField(default=10)
    pending_purchase_quantity = models.PositiveIntegerField(default=0)
    expected_delivery_date = models.DateField(null=True, blank=True)
    is_returnable = models.BooleanField(default=True)
    requires_photo_on_issue = models.BooleanField(default=False)
    image = models.CharField(max_length=500, blank=True, default="")
    # Vegetable Stock Additions (integer grams, null=not tracked)
    unit = models.CharField(max_length=20, blank=True, default="")
    stock_quantity_grams = models.PositiveIntegerField(null=True, blank=True, default=None)
    default_daily_quantity_grams = models.PositiveIntegerField(null=True, blank=True, default=None)
    last_reset_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def effective_available_quantity(self):
        return max(0, self.total_quantity - self.reserved_quantity)

    def __str__(self):
        return f"{self.name} ({self.sku})"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RESTOCK = "RESTOCK", "Restock"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        DAILY_RESET = "DAILY_RESET", "Daily Reset"
        SOLD = "SOLD", "Sold"
        RESTOCKED_ON_CANCELLATION = "RESTOCKED_ON_CANCELLATION", "Restocked on Cancellation"

    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="stock_movements")
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    delta_grams = models.IntegerField(help_text="Change in grams (positive for addition, negative for deduction)")
    balance_after_grams = models.PositiveIntegerField(help_text="Stock quantity in grams immediately after this movement")
    reason = models.TextField(blank=True, default="")
    booking_ref = models.CharField(max_length=100, blank=True, default="")
    entered_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="entered_stock_movements")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item.name} | {self.movement_type} | {self.delta_grams:+d}g -> {self.balance_after_grams}g"


class InventoryAlert(models.Model):
    class AlertType(models.TextChoices):
        LOW_STOCK = 'low_stock', 'Low Stock'
        OVERDUE_RETURN = 'overdue_return', 'Overdue Return'
        DAMAGE_REPORTED = 'damage_reported', 'Damage Reported'

    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_alerts')
    alert_type = models.CharField(max_length=50, choices=AlertType.choices)
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='alerts')
    message = models.TextField()
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.alert_type} for {self.item.name}"


class InventoryTransfer(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        IN_TRANSIT = 'in_transit', 'In Transit'
        DELIVERED = 'delivered', 'Delivered'

    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='inventory_transfers')
    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transfers')
    from_warehouse = models.CharField(max_length=255, blank=True, default="Main Warehouse")
    to_warehouse = models.CharField(max_length=255, blank=True, default="Secondary Warehouse")
    quantity = models.PositiveIntegerField(default=1)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='requested_transfers')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    requested_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Transfer {self.quantity}x {self.item.name} to {self.to_warehouse}"

