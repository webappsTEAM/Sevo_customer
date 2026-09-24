"""
carts/models.py

Cart / CartItem persistence -- Phase 1 of the Daily Essentials plan
(DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md).

Replaces the ephemeral `cart_data` JSON blob submitted at booking time
(see service_requests.ServiceRequest.cart_data / BookingCreateView) with a
cart that survives navigation and login sessions. Deliberately additive --
nothing here is read by BookingCreateView or any other existing view yet.

Services and Daily Essentials are two independent carts per the approved
architecture: `cart_type` is not a generic label, it is the hard boundary
between the two. A customer has at most one ACTIVE cart per (customer,
cart_type) -- enforced by a partial unique constraint, not just convention,
so a race between two tabs/requests can't create two concurrently-active
carts of the same type.
"""
from django.conf import settings
from django.db import models


class CartType(models.TextChoices):
    SERVICES = "services", "Services"
    DAILY_ESSENTIALS = "daily_essentials", "Daily Essentials"


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
    # Same `Package` model backs both cart types -- `cart.cart_type` tells you
    # which kind of package it should be, per the approved architecture. No
    # separate GroceryPackage/ServicePackage split.
    package = models.ForeignKey(
        "service_requests.Package",
        on_delete=models.CASCADE,
        related_name="cart_items",
    )
    variant = models.ForeignKey(
        "service_requests.PackageVariant",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cart_items",
    )
    quantity = models.PositiveIntegerField(default=1)
    # Snapshot, not a live lookup -- matches the *_snapshot convention used
    # throughout service_requests/orders (e.g. OrderItem.service_category_snapshot):
    # a later price change to the Package must never silently change what's
    # already sitting in someone's cart.
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)
    # Addons, size, etc. -- matches what ServiceRequest.cart_data carries today
    # per-line-item.
    customization = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "carts_cartitem"
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity} x {self.package_id} in cart {self.cart_id}"
