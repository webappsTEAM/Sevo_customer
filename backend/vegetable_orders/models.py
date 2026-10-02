from django.conf import settings
from django.db import models, transaction, IntegrityError


def _generate_vegetable_order_number():
    """
    Generates unique order number with 'VEG' prefix and zero-padded sequence (e.g. VEG00001).
    """
    prefix = "VEG"
    last = VegetableOrder.objects.filter(order_number__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (VegetableOrder.objects.count() + 1)
    order_number = f"{prefix}{str(num).zfill(5)}"
    while VegetableOrder.objects.filter(order_number=order_number).exists():
        num += 1
        order_number = f"{prefix}{str(num).zfill(5)}"
    return order_number


class VegetableDeliverySlotConfig(models.Model):
    """
    Admin-configurable delivery slot windows for Quick Commerce (Farm-Fresh Vegetables).
    """
    code = models.CharField(max_length=50, blank=True, default="", help_text="e.g. morning, evening, afternoon")
    name = models.CharField(max_length=100, help_text="e.g. Morning Delivery, Evening Delivery")
    slot_label = models.CharField(max_length=100, help_text="e.g. 6:30 AM – 9:30 AM, 6:00 PM – 8:00 PM")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    cutoff_time = models.TimeField(null=True, blank=True, help_text="Default cutoff time for same-day booking (e.g. 12:00:00)")
    is_same_day_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_delivery_slot_config"
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.name} ({self.slot_label})"


class VegetableWeekdaySlotConfig(models.Model):
    """
    Weekday-availability join table covering Sun-Sat (0-6).
    Enables per-weekday slot configuration (e.g. no evening slot on Sunday, or an extra slot on Saturday).
    """
    WEEKDAY_CHOICES = [
        (0, "Sunday"),
        (1, "Monday"),
        (2, "Tuesday"),
        (3, "Wednesday"),
        (4, "Thursday"),
        (5, "Friday"),
        (6, "Saturday"),
    ]

    weekday = models.PositiveSmallIntegerField(choices=WEEKDAY_CHOICES, db_index=True)
    slot_config = models.ForeignKey(
        VegetableDeliverySlotConfig,
        on_delete=models.CASCADE,
        related_name="weekday_configs"
    )
    is_enabled = models.BooleanField(default=True)
    cutoff_time_override = models.TimeField(
        null=True,
        blank=True,
        help_text="Optional cutoff time override for this weekday"
    )
    capacity = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional max orders capacity for this slot on this weekday"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_weekday_slot_config"
        unique_together = ("weekday", "slot_config")
        ordering = ["weekday", "slot_config__sort_order", "id"]

    def __str__(self):
        return f"{self.get_weekday_display()} - {self.slot_config.name} ({'Enabled' if self.is_enabled else 'Disabled'})"


class VegetableSlotDateOverride(models.Model):
    """
    One-off date exceptions on top of weekday templates (holidays, full closures, or single slot closures).
    If slot_config is NULL, the override applies to the whole date.
    """
    date = models.DateField(db_index=True)
    slot_config = models.ForeignKey(
        VegetableDeliverySlotConfig,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="date_overrides",
        help_text="If blank, applies to all slots on this date (full day closure)"
    )
    is_closed = models.BooleanField(default=True, help_text="True to close/disable, False to force-open")
    cutoff_time_override = models.TimeField(null=True, blank=True)
    reason = models.CharField(max_length=200, blank=True, default="", help_text="e.g. Festival Holiday, Maintenance")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_slot_date_override"
        ordering = ["date", "id"]

    def __str__(self):
        slot_name = self.slot_config.name if self.slot_config else "All Slots (Whole Day)"
        return f"{self.date}: {slot_name} - {'Closed' if self.is_closed else 'Open'}"


class GroceryCartPricingConfig(models.Model):
    """
    Admin-configurable pricing thresholds, delivery & convenience fees, and tip presets for Quick Commerce.
    Single source of truth for both backend checkout billing and frontend UI displays.
    """
    free_delivery_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=200,
        help_text="Cart subtotal at or above which delivery is free (e.g. ₹200.00)"
    )
    small_cart_fee_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=100,
        help_text="Cart subtotal below which small cart fee applies and low tier delivery fee applies (e.g. ₹100.00)"
    )
    small_cart_fee_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=5,
        help_text="Small cart fee charged for orders under small_cart_fee_threshold (e.g. ₹5.00)"
    )
    low_tier_delivery_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=15,
        help_text="Delivery fee for orders below small_cart_fee_threshold (e.g. ₹15.00)"
    )
    mid_tier_delivery_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=10,
        help_text="Delivery fee for orders between small_cart_fee_threshold and free_delivery_threshold (e.g. ₹10.00)"
    )
    handling_fee_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=2,
        help_text="Fixed handling / convenience fee per order (e.g. ₹2.00)"
    )
    tip_preset_amounts = models.JSONField(
        default=list,
        blank=True,
        help_text="List of tip preset options in INR, e.g. [20, 30, 50]"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_cart_pricing_config"
        ordering = ["-is_active", "-id"]

    def __str__(self):
        return f"PricingConfig (Free >= ₹{self.free_delivery_threshold}, Handling ₹{self.handling_fee_amount})"

    @classmethod
    def get_active_config(cls):
        cfg = cls.objects.filter(is_active=True).order_by("-updated_at", "-id").first()
        if not cfg:
            cfg, _ = cls.objects.get_or_create(
                id=1,
                defaults={
                    "free_delivery_threshold": 200,
                    "small_cart_fee_threshold": 100,
                    "small_cart_fee_amount": 5,
                    "low_tier_delivery_fee": 15,
                    "mid_tier_delivery_fee": 10,
                    "handling_fee_amount": 2,
                    "tip_preset_amounts": [20, 30, 50],
                    "is_active": True,
                }
            )
            if not cfg.tip_preset_amounts:
                cfg.tip_preset_amounts = [20, 30, 50]
                cfg.save()
        return cfg

    def calculate_fees(self, subtotal_decimal):
        """
        Server-side calculation helper using this config's parameters.
        Returns (delivery_fee, small_cart_fee, handling_fee) as Decimals.
        """
        from decimal import Decimal
        subtotal = Decimal(str(subtotal_decimal or 0))
        if subtotal <= Decimal("0"):
            return Decimal("0.00"), Decimal("0.00"), Decimal("0.00")

        handling_fee = Decimal(str(self.handling_fee_amount))

        if subtotal < Decimal(str(self.small_cart_fee_threshold)):
            small_cart_fee = Decimal(str(self.small_cart_fee_amount))
        else:
            small_cart_fee = Decimal("0.00")

        if subtotal >= Decimal(str(self.free_delivery_threshold)):
            delivery_fee = Decimal("0.00")
        elif subtotal >= Decimal(str(self.small_cart_fee_threshold)):
            delivery_fee = Decimal(str(self.mid_tier_delivery_fee))
        else:
            delivery_fee = Decimal(str(self.low_tier_delivery_fee))

        return delivery_fee, small_cart_fee, handling_fee




class VegetableOrder(models.Model):
    """
    The parent record for a customer vegetable order.
    Lifecycle: PLACED -> PACKED -> OUT_FOR_DELIVERY -> DELIVERED, and CANCELLED.
    """

    class Status(models.TextChoices):
        PLACED           = "PLACED",           "Placed"
        PACKED           = "PACKED",           "Packed"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",  "Out for Delivery"
        DELIVERED        = "DELIVERED",         "Delivered"
        CANCELLED        = "CANCELLED",         "Cancelled"

    order_number = models.CharField(max_length=20, unique=True, blank=True, db_index=True)

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="vegetable_orders",
        help_text="The customer who placed this vegetable order.",
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLACED, db_index=True)

    items_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    handling_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    small_cart_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    delivery_address = models.TextField()
    delivery_date = models.DateField(null=True, blank=True, db_index=True)
    delivery_slot = models.CharField(max_length=100, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_vegetableorder"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        _order_number_was_generated = False
        if not self.order_number:
            self.order_number = _generate_vegetable_order_number()
            _order_number_was_generated = True

        _max_attempts = 5
        for _attempt in range(1, _max_attempts + 1):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                break
            except IntegrityError:
                if not _order_number_was_generated or _attempt == _max_attempts:
                    raise
                self.order_number = _generate_vegetable_order_number()

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"

    def transition_to(self, new_status):
        """
        Validates transition and triggers stock restoration if CANCELLED.
        """
        from .vegetable_order_state_machine import apply_vegetable_transition
        return apply_vegetable_transition(self, new_status)


class VegetableOrderItem(models.Model):
    """
    One line item within a VegetableOrder.
    """

    order = models.ForeignKey(VegetableOrder, on_delete=models.CASCADE, related_name="items")

    package = models.ForeignKey(
        "service_requests.Package",
        on_delete=models.PROTECT,
        related_name="vegetable_order_items",
    )

    variant = models.ForeignKey(
        "service_requests.PackageVariant",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="vegetable_order_items",
    )

    variant_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
        help_text="Snapshot of the chosen variant name at order creation (e.g. '500 g', '2 kg')."
    )

    pack_value_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Snapshot of the pack size value at order creation."
    )

    unit_basis = models.CharField(
        max_length=10,
        choices=[("WEIGHT", "Weight"), ("COUNT", "Count")],
        default="WEIGHT",
        help_text="Measurement basis of this line item."
    )

    unit_label = models.CharField(
        max_length=20,
        blank=True,
        default="g",
        help_text="Unit string (e.g. g, kg, pcs, bunch)."
    )

    quantity_grams = models.PositiveIntegerField(
        help_text="Exact base units ordered and deducted (grams for WEIGHT, pieces for COUNT)."
    )

    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    line_amount = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "vegetable_orders_vegetableorderitem"
        ordering = ["id"]

    @property
    def quantity_base_units(self):
        return self.quantity_grams

    @quantity_base_units.setter
    def quantity_base_units(self, val):
        self.quantity_grams = val

    @property
    def quantity_display(self):
        from inventory.utils.unit_conversion import format_stock_for_display
        return format_stock_for_display(self.quantity_grams, unit_basis=self.unit_basis, unit=self.unit_label)

    def __str__(self):
        return f"VegetableOrderItem #{self.id} of {self.order.order_number} ({self.quantity_display})"


def _generate_vegetable_return_number():
    """
    Generates unique return number with 'RET' prefix and zero-padded sequence (e.g. RET00001).
    """
    prefix = "RET"
    last = VegetableReturn.objects.filter(return_number__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (VegetableReturn.objects.count() + 1)
    return_number = f"{prefix}{str(num).zfill(5)}"
    while VegetableReturn.objects.filter(return_number=return_number).exists():
        num += 1
        return_number = f"{prefix}{str(num).zfill(5)}"
    return return_number


class VegetableReturn(models.Model):
    """
    Customer return request for delivered vegetable orders.
    """
    class Reason(models.TextChoices):
        DAMAGED_OR_SPOILED = "DAMAGED_OR_SPOILED", "Damaged / Spoiled"
        WRONG_ITEM         = "WRONG_ITEM",         "Wrong Item Received"
        SHORT_QUANTITY     = "SHORT_QUANTITY",     "Short Weight / Missing Item"
        POOR_QUALITY       = "POOR_QUALITY",       "Poor Quality / Stale"
        OTHER              = "OTHER",              "Other"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        APPROVED  = "APPROVED",  "Approved"
        REJECTED  = "REJECTED",  "Rejected"
        RESOLVED  = "RESOLVED",  "Resolved"

    class ResolutionAction(models.TextChoices):
        NONE        = "NONE",        "None"
        REFUND      = "REFUND",      "Refund Marked"
        REPLACEMENT = "REPLACEMENT", "Replacement Dispatched"
        REJECTED    = "REJECTED",    "Rejected"

    return_number = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    order = models.ForeignKey(
        VegetableOrder,
        on_delete=models.CASCADE,
        related_name="returns",
    )
    item = models.ForeignKey(
        VegetableOrderItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="returns",
        help_text="Optional specific line item being returned.",
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="vegetable_returns",
    )
    reason = models.CharField(max_length=30, choices=Reason.choices, default=Reason.OTHER)
    customer_notes = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    resolution_action = models.CharField(max_length=20, choices=ResolutionAction.choices, default=ResolutionAction.NONE)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    admin_notes = models.TextField(blank=True, default="")
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="handled_vegetable_returns",
    )
    stock_movement = models.OneToOneField(
        "inventory.VegetableStockMovement",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_return",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "vegetable_orders_vegetablereturn"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        _num_was_generated = False
        if not self.return_number:
            self.return_number = _generate_vegetable_return_number()
            _num_was_generated = True

        _max_attempts = 5
        for _attempt in range(1, _max_attempts + 1):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                break
            except IntegrityError:
                if not _num_was_generated or _attempt == _max_attempts:
                    raise
                self.return_number = _generate_vegetable_return_number()

    def __str__(self):
        return f"{self.return_number} ({self.get_status_display()}) for {self.order.order_number}"

