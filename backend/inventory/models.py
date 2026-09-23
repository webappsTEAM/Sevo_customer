from django.db import models, transaction, IntegrityError
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
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


class ApprovalStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class ItemSource(models.TextChoices):
    DIRECT = "DIRECT", "Created Directly by Admin"
    REQUEST = "REQUEST", "Submitted via Catalog Uploads"


class UnitOfMeasurement(models.TextChoices):
    KG = "kg", "Kilograms (kg)"
    G = "g", "Grams (g)"
    PCS = "pcs", "Pieces (pcs)"
    BUNCH = "bunch", "Bunch (bunch)"
    PACKET = "packet", "Packet / Box (pkt)"
    DOZEN = "dozen", "Dozen (dz)"


class VegetableCategory(models.Model):
    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='vegetable_categories')
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True, default="")
    image = models.CharField(max_length=500, blank=True, default="")
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    unit_of_measurement = models.CharField(
        max_length=20,
        choices=UnitOfMeasurement.choices,
        blank=True,
        null=True,
        default=None,
        help_text="Default unit of measurement for products under this category (e.g. kg, g, pcs, bunch)."
    )
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        db_index=True
    )
    source = models.CharField(
        max_length=20,
        choices=ItemSource.choices,
        default=ItemSource.DIRECT,
        db_index=True,
        help_text="Origin of category: DIRECT (Admin-created) or REQUEST (Catalog Uploads submission)."
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='requested_vegetable_categories'
    )
    requested_at = models.DateTimeField(default=timezone.now)
    rejection_reason = models.TextField(blank=True, default="")
    is_resubmission = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_vegetable_categories'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='subcategories',
        help_text="Parent category if this is a subcategory (supports unlimited nesting depth)."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "Vegetable Categories"

    def get_ancestors(self):
        """Returns list of ancestor instances from root down to immediate parent."""
        ancestors = []
        curr = self.parent
        visited = set()
        while curr is not None and curr.pk not in visited:
            ancestors.append(curr)
            visited.add(curr.pk)
            curr = curr.parent
        ancestors.reverse()
        return ancestors

    @property
    def full_path(self):
        """Returns full breadcrumb path e.g. 'Vegetables → Root Vegetables → Tubers'."""
        names = [a.name for a in self.get_ancestors()] + [self.name]
        return " → ".join(names)

    @property
    def depth(self):
        """Returns 0-indexed nesting depth (0 = top-level)."""
        return len(self.get_ancestors())

    @property
    def is_leaf(self):
        """Returns True if this category has no subcategories and can directly hold produce."""
        return not self.subcategories.exists()

    def clean(self):
        super().clean()
        if self.parent:
            # 1. Cannot be its own parent
            if self.pk and self.parent_id == self.pk:
                raise ValidationError({"parent": "A category cannot be its own parent."})

            # 2. Cycle prevention at any depth
            curr = self.parent
            visited = set()
            while curr is not None:
                if self.pk and curr.pk == self.pk:
                    raise ValidationError({"parent": "Cannot set a category as a descendant of itself (cycle detected)."})
                if curr.pk in visited:
                    break
                visited.add(curr.pk)
                curr = curr.parent

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_path} ({self.status})"


class Vegetable(models.Model):
    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='vegetables')
    package = models.OneToOneField(
        'service_requests.Package',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vegetable_stock'
    )
    category = models.ForeignKey(
        VegetableCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='vegetables'
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=20, blank=True, default="")
    stock_quantity_grams = models.PositiveIntegerField(null=True, blank=True, default=None)
    default_daily_quantity_grams = models.PositiveIntegerField(null=True, blank=True, default=None)
    last_reset_date = models.DateField(null=True, blank=True)
    image = models.CharField(max_length=500, blank=True, default="")
    status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        db_index=True
    )
    source = models.CharField(
        max_length=20,
        choices=ItemSource.choices,
        default=ItemSource.DIRECT,
        db_index=True,
        help_text="Origin of produce: DIRECT (Admin-created) or REQUEST (Catalog Uploads submission)."
    )
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='requested_vegetables'
    )
    requested_at = models.DateTimeField(default=timezone.now)
    rejection_reason = models.TextField(blank=True, default="")
    is_resubmission = models.BooleanField(default=False)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_vegetables'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        super().clean()
        if self.category_id and not self.category.is_leaf:
            raise ValidationError({
                "category": f"Cannot assign produce to category '{self.category.name}' because it has subcategories. Produce can only be assigned to leaf categories."
            })

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.status})"


class VegetableStockMovement(models.Model):
    class MovementType(models.TextChoices):
        RESTOCK = "RESTOCK", "Restock"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"
        DAILY_RESET = "DAILY_RESET", "Daily Reset"
        SOLD = "SOLD", "Sold"
        RESTOCKED_ON_CANCELLATION = "RESTOCKED_ON_CANCELLATION", "Restocked on Cancellation"
        CLAIM_WRITEOFF = "CLAIM_WRITEOFF", "Claim Write-off"
        RESTOCKED_ON_RETURN = "RESTOCKED_ON_RETURN", "Restocked on Return"
        RETURN_REPLACEMENT = "RETURN_REPLACEMENT", "Return Replacement"
        RETURN_WRITEOFF = "RETURN_WRITEOFF", "Return Write-off"

    objects = CompanyScopedManager(company_field="org")

    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="vegetable_stock_movements")
    vegetable = models.ForeignKey(Vegetable, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    delta_grams = models.IntegerField(help_text="Change in grams (positive for addition, negative for deduction)")
    balance_after_grams = models.PositiveIntegerField(help_text="Stock quantity in grams immediately after this movement")
    reason = models.TextField(blank=True, default="")
    booking_ref = models.CharField(max_length=100, blank=True, default="")
    entered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="entered_vegetable_stock_movements"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.vegetable.name} | {self.movement_type} | {self.delta_grams:+d}g -> {self.balance_after_grams}g"


def _generate_vegetable_claim_number():
    """
    Generates unique claim number with 'CLM' prefix and zero-padded sequence (e.g. CLM00001).
    """
    prefix = "CLM"
    last = VegetableClaim.objects.filter(claim_number__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (VegetableClaim.objects.count() + 1)
    claim_number = f"{prefix}{str(num).zfill(5)}"
    while VegetableClaim.objects.filter(claim_number=claim_number).exists():
        num += 1
        claim_number = f"{prefix}{str(num).zfill(5)}"
    return claim_number


class VegetableClaim(models.Model):
    """
    Admin-side internal write-off/claim for vegetable stock loss (spoilage, damage, QC, transit).
    """
    class Reason(models.TextChoices):
        WAREHOUSE_SPOILAGE    = "WAREHOUSE_SPOILAGE",    "Warehouse Spoilage / Rot"
        TRANSIT_DAMAGE        = "TRANSIT_DAMAGE",        "Transit / Delivery Damage"
        QC_FAILURE            = "QC_FAILURE",            "QC / Inspection Failure"
        EXPIRED               = "EXPIRED",               "Shelf Life Expired"
        INVENTORY_DISCREPANCY = "INVENTORY_DISCREPANCY", "Stock Discrepancy / Missing"
        OTHER                 = "OTHER",                 "Other"

    class Status(models.TextChoices):
        OPEN     = "OPEN",     "Open"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        RESOLVED = "RESOLVED", "Resolved"

    objects = CompanyScopedManager(company_field="org")

    claim_number = models.CharField(max_length=20, unique=True, blank=True, db_index=True)
    org = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="vegetable_claims")
    vegetable = models.ForeignKey(Vegetable, on_delete=models.CASCADE, related_name="claims")
    reason = models.CharField(max_length=30, choices=Reason.choices, default=Reason.WAREHOUSE_SPOILAGE)
    quantity_grams = models.PositiveIntegerField(help_text="Quantity of vegetable stock written off in grams")
    estimated_loss_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    stock_movement = models.OneToOneField(
        VegetableStockMovement,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_claim",
    )
    notes = models.TextField(blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_vegetable_claims",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_vegetable_claims",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        _num_was_generated = False
        if not self.claim_number:
            self.claim_number = _generate_vegetable_claim_number()
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
                self.claim_number = _generate_vegetable_claim_number()

    def __str__(self):
        return f"{self.claim_number} - {self.vegetable.name} ({self.quantity_grams}g) [{self.get_status_display()}]"



