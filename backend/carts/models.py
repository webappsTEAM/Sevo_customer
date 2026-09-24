"""
carts/models.py

Cart / CartItem persistence. Supports Services, Daily Essentials, and Seller Hub Marketplace carts.
Services, Daily Essentials, and Marketplace are independent carts per the approved
architecture: `cart_type` is the hard boundary between them.
For Marketplace carts, single-seller enforcement is maintained via `seller_id` on Cart.
"""
from django.conf import settings
from django.db import models


class CartType(models.TextChoices):
    SERVICES = "services", "Services"
    DAILY_ESSENTIALS = "daily_essentials", "Daily Essentials"
    MARKETPLACE = "marketplace", "Marketplace"


class CartStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    CHECKED_OUT = "CHECKED_OUT", "Checked Out"
    ABANDONED = "ABANDONED", "Abandoned"


class Cart(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carts",
    )
    cart_type = models.CharField(max_length=20, choices=CartType.choices)
    status = models.CharField(max_length=12, choices=CartStatus.choices, default=CartStatus.ACTIVE)
    
    # Marketplace-specific single-seller binding
    seller_id = models.IntegerField(null=True, blank=True, db_index=True)
    seller_name = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts_cart"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["customer", "cart_type"],
                condition=models.Q(status=CartStatus.ACTIVE),
                name="unique_active_cart_per_customer_and_type",
            ),
        ]

    def __str__(self):
        return f"{self.customer_id} / {self.cart_type} ({self.status})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    # For Services / Daily Essentials:
    package = models.ForeignKey(
        "service_requests.Package",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="cart_items",
    )
    
    # For Marketplace (Vendor-approved Seller Hub items):
    seller_product_id = models.IntegerField(null=True, blank=True, db_index=True)
    seller_id = models.IntegerField(null=True, blank=True, db_index=True)
    seller_name = models.CharField(max_length=255, blank=True, default="")
    warehouse_id = models.IntegerField(null=True, blank=True, db_index=True)
    warehouse_name = models.CharField(max_length=255, blank=True, default="")
    product_title = models.CharField(max_length=255, blank=True, default="")
    product_sku = models.CharField(max_length=100, blank=True, default="")
    product_brand = models.CharField(max_length=150, blank=True, default="")
    unit = models.CharField(max_length=50, blank=True, default="")
    pack_size = models.CharField(max_length=50, blank=True, default="")
    product_image = models.CharField(max_length=500, blank=True, default="")
    mrp_snapshot = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    quantity = models.PositiveIntegerField(default=1)
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    customization = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts_cartitem"
        ordering = ["id"]

    def __str__(self):
        label = self.product_title or (self.package.name if self.package else f"Product #{self.seller_product_id}")
        return f"{self.quantity} x {label} in cart {self.cart_id}"
