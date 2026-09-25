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

    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    delivery_address = models.TextField()

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

