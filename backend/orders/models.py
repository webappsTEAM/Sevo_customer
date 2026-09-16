"""
orders/models.py

Parent Order layer -- an additive wrapper above ServiceRequest.

Added per PARENT_ORDER_FEASIBILITY_AUDIT_RECONCILED.md (10 Sep 2026),
recommended next step #2: "Design and build the thin Order/OrderItem
wrapper (additive nullable FK or join table ... all LOW [risk] except the
new admin surface and checkout sequencing, both MEDIUM)."

Deliberately additive and non-invasive:
  - No change to ServiceRequest, Payment, PaintingQuote, or any other
    existing production model in this pass.
  - No change to BookingCreateView / the checkout flow in this pass --
    this migration only introduces the schema. Nothing writes to these
    tables yet, so existing bookings are completely unaffected.
  - service_requests.ServiceRequest is only ever referenced here, never
    imported into it, so this app has a one-way dependency on
    service_requests and can be removed cleanly if the Order concept is
    ever abandoned.

Shape (per the reconciled audit + explicit design decision on 10 Sep
2026): Order (1) -> OrderItem (many) -> ServiceRequest (1, nullable
OneToOne). Today a single checkout only ever produces one ServiceRequest,
so in practice this starts out 1:1 (one Order, one OrderItem, one
ServiceRequest) -- but the join-table shape means a future checkout that
bundles multiple bookings (e.g. AC service + Painting quote in one cart)
only needs to create more OrderItem rows under the same Order, with no
further schema change.
"""
from django.conf import settings
from django.db import models, transaction, IntegrityError


def _generate_order_number():
    """
    Generate a globally-unique, human-readable Order identifier, e.g.
    ORD00001. Mirrors service_requests.models._generate_request_id's
    prefix + zero-padded sequence approach for consistency with the rest
    of the codebase, rather than inventing a new ID convention.
    """
    prefix = "ORD"
    last = Order.objects.filter(order_number__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (Order.objects.count() + 1)
    order_number = f"{prefix}{str(num).zfill(5)}"
    while Order.objects.filter(order_number=order_number).exists():
        num += 1
        order_number = f"{prefix}{str(num).zfill(5)}"
    return order_number


class Order(models.Model):
    """
    The parent record for one checkout. Does not replace or duplicate any
    field already tracked on ServiceRequest (status, total_amount owed for
    a given booking, etc.) -- it only groups one or more ServiceRequests
    that were created together, and holds the top-level snapshot of what
    the customer actually checked out with.

    Order.status is deliberately a small, order-level-only lifecycle, not
    a copy of ServiceRequest.Status: this only tracks whether the *order
    as a whole* is still being built, has produced its ServiceRequest(s),
    or was abandoned/cancelled before that happened. Each ServiceRequest
    underneath continues to run through its own full state machine
    unchanged (state_machine.py) -- Order.status is not consulted by, and
    does not gate, any of that.
    """

    class Status(models.TextChoices):
        DRAFT      = "draft",      "Draft"
        CONFIRMED  = "confirmed",  "Confirmed"
        CANCELLED  = "cancelled",  "Cancelled"

    order_number = models.CharField(max_length=20, unique=True, blank=True, db_index=True)

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        help_text="The customer who placed this order.",
    )

    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)

    # Snapshot of what the customer was charged/quoted for the order as a
    # whole at checkout time -- same "snapshot, don't silently recompute"
    # pattern used by BookingSeries.total_amount and the *_snapshot fields
    # elsewhere in service_requests/models.py. Each OrderItem's own
    # item_amount is the per-item breakdown; this is their sum at the time
    # the order was placed, not a live aggregate.
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_order"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        _order_number_was_generated = False
        if not self.order_number:
            self.order_number = _generate_order_number()
            _order_number_was_generated = True

        # Same bounded-retry-on-collision pattern as ServiceRequest.save()
        # (fixes the equivalent of EC-04 for this table): two concurrent
        # checkouts could otherwise both pass the uniqueness check before
        # either commits.
        _max_attempts = 5
        for _attempt in range(1, _max_attempts + 1):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                break
            except IntegrityError:
                if not _order_number_was_generated or _attempt == _max_attempts:
                    raise
                self.order_number = _generate_order_number()

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"


class OrderItem(models.Model):
    """
    One line item within an Order. `service_request` is nullable and a
    OneToOne (not a plain FK) on purpose:
      - Nullable: an OrderItem can exist before its ServiceRequest has
        been created (e.g. a draft order being built at checkout), and
        SET_NULL on delete means a ServiceRequest being removed severs
        the link without deleting the OrderItem or its Order -- consistent
        with BookingSeries.last_generated_booking's SET_NULL pattern
        elsewhere in this codebase, rather than PROTECT or CASCADE.
      - OneToOne: today, and for the foreseeable checkout flow, exactly
        one ServiceRequest is ever produced per line item -- this is not
        a many-to-many. If that ever needs to change it can be revisited
        as its own migration; nothing here presumes it won't.

    service_category_snapshot is a plain snapshot string (matching
    ServiceRequest.service_category's own un-normalized CharField) purely
    for admin/reporting readability -- it is NOT authoritative and must
    never be used for category-identity branching. Per
    PARENT_ORDER_FEASIBILITY_AUDIT_RECONCILED.md Section 1/2, category
    identity across this codebase is still decided ad hoc per call site
    (e.g. the Mason gate in state_machine.py); this field deliberately
    does not add a second, independent copy of that problem. Any code
    that needs to know what category an OrderItem belongs to should read
    it off `service_request.service_category` once the link exists, not
    off this snapshot.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")

    service_request = models.OneToOneField(
        "service_requests.ServiceRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_item",
    )

    # Read-only display snapshot only -- see docstring above. Not used for
    # any branching logic.
    service_category_snapshot = models.CharField(max_length=150, blank=True, default="")

    item_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_orderitem"
        ordering = ["id"]

    def save(self, *args, **kwargs):
        if self.service_request and not self.service_category_snapshot:
            self.service_category_snapshot = self.service_request.service_category
        super().save(*args, **kwargs)

    def __str__(self):
        sr_label = self.service_request.request_id if self.service_request else "(no ServiceRequest yet)"
        return f"OrderItem #{self.id} of {self.order.order_number} -> {sr_label}"


# ─── Grocery Order layer (Daily Essentials, Phase 2) ──────────────────────────
#
# Added per DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md Phase 2. A separate model
# family from Order/OrderItem above -- NOT a shared/polymorphic table -- per
# the approved two-cart architecture: Services and Daily Essentials have
# independent payment and fulfillment rules, and a failure in one pipeline
# must never roll back or block the other. The two are only ever merged in
# the read-only "My Orders" view (Phase 6), never on the write side.
#
# Models + hand-written migration only in this pass -- no checkout wiring yet
# (that's Phase 3), same "models first, confirm, then wire" sequencing used
# for Order/OrderItem above.

def _generate_grocery_order_number():
    """
    Mirrors _generate_order_number()'s prefix + zero-padded sequence
    approach, using its own "GRO" prefix and its own sequence so grocery
    and service order numbers never collide or interleave.
    """
    prefix = "GRO"
    last = GroceryOrder.objects.filter(order_number__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (GroceryOrder.objects.count() + 1)
    order_number = f"{prefix}{str(num).zfill(5)}"
    while GroceryOrder.objects.filter(order_number=order_number).exists():
        num += 1
        order_number = f"{prefix}{str(num).zfill(5)}"
    return order_number


class GroceryOrder(models.Model):
    """
    The parent record for one Daily Essentials checkout. Deliberately does
    not reuse Order.status: grocery fulfillment (pick -> pack -> deliver)
    has no equivalent to a service booking's technician-dispatch lifecycle,
    so it gets its own small status set (see Phase 5's grocery_state_machine.py
    for the transition rules, layered on top of this field).
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
        related_name="grocery_orders",
        help_text="The customer who placed this grocery order.",
    )

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLACED, db_index=True)

    # Snapshot of what the customer was charged at checkout time -- same
    # "snapshot, don't silently recompute" pattern as Order.total_amount.
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    delivery_address = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_groceryorder"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        _order_number_was_generated = False
        if not self.order_number:
            self.order_number = _generate_grocery_order_number()
            _order_number_was_generated = True

        # Same bounded-retry-on-collision pattern as Order.save().
        _max_attempts = 5
        for _attempt in range(1, _max_attempts + 1):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                break
            except IntegrityError:
                if not _order_number_was_generated or _attempt == _max_attempts:
                    raise
                self.order_number = _generate_grocery_order_number()

    def __str__(self):
        return f"{self.order_number} ({self.get_status_display()})"

    def transition_to(self, new_status):
        """
        Thin convenience hook onto grocery_state_machine.apply_grocery_transition()
        (Phase 5) -- validates the move and, for CANCELLED, restores reserved
        stock. Lazy import to avoid a module-load cycle (grocery_state_machine
        imports GroceryOrder from this module).
        """
        from .grocery_state_machine import apply_grocery_transition
        return apply_grocery_transition(self, new_status)


class GroceryOrderItem(models.Model):
    """
    One line item within a GroceryOrder. Unlike OrderItem's OneToOne link to
    a single ServiceRequest, a grocery checkout is inherently multi-line
    (a cart of several vegetables/fruits/groceries), so this is a plain FK
    to its parent GroceryOrder -- matching CartItem's shape, since a
    GroceryOrder is what a daily_essentials Cart becomes at checkout.
    """

    order = models.ForeignKey(GroceryOrder, on_delete=models.CASCADE, related_name="items")

    package = models.ForeignKey(
        "service_requests.Package",
        on_delete=models.PROTECT,
        related_name="grocery_order_items",
    )

    quantity_grams = models.PositiveIntegerField()

    # Snapshot at checkout time -- never a live lookup. Matches
    # CartItem.unit_price_snapshot / OrderItem.service_category_snapshot.
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    line_amount = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders_groceryorderitem"
        ordering = ["id"]

    def __str__(self):
        return f"GroceryOrderItem #{self.id} of {self.order.order_number}"
