"""
service_requests/models.py

Five models for the Service Request → Job → Proof → Feedback → Performance pipeline.
FKs reference the existing Employee and User models — no duplication.
"""
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ── Category prefix mapping for unique human-readable Service Request IDs ────
CATEGORY_PREFIX_MAP = {
    "home_services": "HM",
    "home": "HM",
    "plumbing": "PL",
    "electrical": "EL",
    "electrical_repair": "EL",
    "carpentry": "CP",
    "hvac": "AC",
    "ac_repair": "AC",
    "ac_service": "AC",
    "air_conditioner": "AC",
    "appliance_repair": "AC",
    "appliances": "AC",
    "appliance": "AC",
    "washing_machine": "AC",
    "refrigerator": "AC",
    "tv_display": "AC",
    "cleaning": "CL",
    "deep_cleaning": "CL",
    "deep-cleaning": "CL",
    "kitchen_cleaning": "KC",
    "sofa_cleaning": "SC",
    "pest_control": "PC",
    "pest-control": "PC",
    "painting": "PA",
    "security": "SC",
    "mason": "MS",
    "general": "GM",
    "logistics": "LG",
    "goods_transport": "GT",
    "goods_transport_truck": "GT",
    "goods_transport_two_wheeler": "GT",
    "truck": "GT",
    "packers_movers": "PM",
}


def _generate_request_id(category_or_slug=None):
    """
    Generate category-prefixed unique ID (e.g. HM0001, AC0001, PL0001, EL0001).
    Guarantees global uniqueness across all ServiceRequests.
    """
    prefix = "SR"
    if category_or_slug:
        slug_clean = str(category_or_slug).strip().lower().replace("-", "_")
        prefix = CATEGORY_PREFIX_MAP.get(slug_clean)
        if not prefix:
            # Fallback: derive 2-letter uppercase prefix from category string
            words = [w for w in slug_clean.split("_") if w]
            if len(words) >= 2:
                prefix = f"{words[0][0]}{words[1][0]}".upper()
            elif len(slug_clean) >= 2:
                prefix = slug_clean[:2].upper()
            else:
                prefix = "SR"

    last = ServiceRequest.objects.filter(request_id__startswith=prefix).order_by("-id").first()
    num = (last.id + 1) if last and last.id else (ServiceRequest.objects.count() + 1)
    req_id = f"{prefix}{str(num).zfill(4)}"
    while ServiceRequest.objects.filter(request_id=req_id).exists():
        num += 1
        req_id = f"{prefix}{str(num).zfill(4)}"
    return req_id


# ── Service categories (static list) ─────────────────────────────────────────
SERVICE_CATEGORIES = [
    ("plumbing", "Plumbing"),
    ("electrical", "Electrical"),
    ("carpentry", "Carpentry"),
    ("hvac", "HVAC"),
    ("cleaning", "Cleaning"),
    ("pest_control", "Pest Control"),
    ("painting", "Painting"),
    ("appliance_repair", "Appliance Repair"),
    ("security", "Security Systems"),
    ("general", "General Maintenance"),
]


from common.models import VisibilityQuerySet

class ServiceRequest(models.Model):
    """Master record: created by public booking, driven through state machine."""
    objects = VisibilityQuerySet.as_manager()

    class Status(models.TextChoices):
        DRAFT                 = "draft",                 "Draft"
        NEW_REQUEST           = "new_request",           "New Request"
        UNASSIGNED            = "unassigned",            "Unassigned"
        PENDING_PAYMENT       = "pending_payment",       "Pending Payment"
        WAITING_FOR_PAYMENT   = "waiting_for_payment",   "Waiting for Payment"
        CONFIRMED             = "confirmed",             "Confirmed"
        REVIEWED              = "reviewed",              "Reviewed"
        ASSIGNED              = "assigned",              "Assigned"
        RECEIVED              = "received",              "Received"
        ACCEPTED              = "accepted",              "Accepted"
        ON_THE_WAY            = "on_the_way",            "On The Way"
        ARRIVED               = "arrived",               "Arrived"
        IN_PROGRESS           = "in_progress",           "In Progress"
        PROOF_SUBMITTED       = "proof_submitted",       "Proof Submitted"
        COMPLETED             = "completed",             "Completed"
        AWAITING_VERIFICATION = "awaiting_verification", "Awaiting Verification"
        VERIFIED              = "verified",              "Verified"
        FEEDBACK_PENDING      = "feedback_pending",      "Feedback Pending"
        FEEDBACK_RECEIVED     = "feedback_received",     "Feedback Received"
        CLOSED                = "closed",                "Closed"
        REJECTED              = "rejected",              "Rejected"
        CANCELLED             = "cancelled",             "Cancelled"
        RESCHEDULED           = "rescheduled",           "Rescheduled"
        REWORK_REQUESTED      = "rework_requested",      "Rework Requested"
        UNABLE_TO_COMPLETE    = "unable_to_complete",    "Unable to Complete"
        FOLLOW_UP_REQUIRED    = "follow_up_required",    "Follow-up Required"

    class Priority(models.TextChoices):
        LOW    = "low",    "Low"
        NORMAL = "normal", "Normal"
        HIGH   = "high",   "High"
        URGENT = "urgent", "Urgent"

    class PaymentMethod(models.TextChoices):
        COD    = "COD",    "Cash on Service"
        ONLINE = "ONLINE", "Online Payment"

    class PaymentStatus(models.TextChoices):
        PENDING            = "pending",            "Pending"
        PROCESSING         = "processing",         "Processing"
        COLLECTED          = "collected",          "Collected"
        PAID               = "paid",               "Paid"
        FAILED             = "failed",             "Failed"
        CANCELLED          = "cancelled",          "Cancelled"
        REFUNDED           = "refunded",           "Refunded"
        PARTIALLY_REFUNDED = "partially_refunded", "Partially Refunded"

    class CancellationReason(models.TextChoices):
        CHANGE_OF_PLANS   = "CHANGE_OF_PLANS",   "Change of plans / Booked by mistake"
        EXPECTED_FASTER    = "EXPECTED_FASTER",    "Expected faster service / Partner too far"
        WRONG_SERVICE      = "WRONG_SERVICE",      "Selected wrong service, date, or address"
        FOUND_ALTERNATIVE  = "FOUND_ALTERNATIVE",  "Found alternative service / Solved myself"
        PRICE_OR_PAYMENT   = "PRICE_OR_PAYMENT",   "Price or payment issue"
        OTHER              = "OTHER",              "Other reason"

    # Human-readable ID (SR-0001, SR-0002, ...)
    request_id = models.CharField(max_length=20, unique=True, blank=True)

    # Multi-tenant
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="service_requests",
        null=True, blank=True,
    )

    # Customer info (public submission — no account required)
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="service_requests_as_customer",
        null=True, blank=True,
    )
    customer_code = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer ID",
        help_text="Permanent Customer ID snapshot (e.g. CUS0006)"
    )
    customer_name = models.CharField(max_length=200)
    phone         = models.CharField(max_length=30)
    email         = models.EmailField(blank=True, null=True)

    # Service details
    service_category = models.CharField(max_length=150)
    issue_title      = models.CharField(max_length=300)
    description      = models.TextField(blank=True, default="")
    address          = models.TextField()
    latitude         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    preferred_date   = models.DateField()
    preferred_time   = models.CharField(max_length=50, blank=True, null=True)
    photo            = models.ImageField(upload_to="service_requests/photos/", null=True, blank=True)
    total_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cart_data        = models.JSONField(default=list, blank=True)

    # Goods Transport (truck/two-wheeler) + Packers & Movers — optional, only
    # populated when service_category is one of the logistics categories.
    # `address` above is reused as the pickup address; drop_address is the
    # second leg these two flows need that most other service categories
    # don't. Deliberately two nullable FKs rather than the architecture
    # doc's full Trip/TripStop/AddressLink model — that N-address structure
    # doesn't exist on this model today (see MODEL_CLASSIFICATION.md), and
    # building it for a 2-address case would be the over-build Phase 5A's
    # own rule warns against. Revisit if Packers & Movers ever needs
    # multi-stop routing.
    drop_address     = models.TextField(blank=True, default="")
    logistics_tier   = models.ForeignKey(
        "logistics.ServiceTier",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="service_requests",
    )
    logistics_lane    = models.ForeignKey(
        "logistics.Lane",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="service_requests",
    )

    # Payment workflow
    payment_method = models.CharField(
        max_length=10,
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD,
        blank=True,
    )
    payment_status = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        blank=True,
    )
    transaction_id            = models.CharField(max_length=200, blank=True, null=True)
    payment_gateway           = models.CharField(max_length=50, blank=True, null=True)
    payment_collected_by_name = models.CharField(max_length=150, blank=True, default="")
    collection_method         = models.CharField(max_length=50, blank=True, default="")
    collection_reference      = models.CharField(max_length=100, blank=True, default="")
    payment_collected_at      = models.DateTimeField(null=True, blank=True)
    invoice_id                = models.CharField(max_length=50, blank=True, null=True)

    # Booking status workflow
    status   = models.CharField(max_length=30, choices=Status.choices, default=Status.NEW_REQUEST)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)

    # Workforce Dispatch / Real-time Technician Snapshot
    technician              = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="assigned_service_requests",
    )
    workforce_job_id        = models.CharField(max_length=100, blank=True, null=True, default=None, db_index=True)
    external_assignment_id  = models.CharField(max_length=100, blank=True, null=True, default=None)
    technician_name         = models.CharField(max_length=150, blank=True, default="")
    technician_phone        = models.CharField(max_length=30, blank=True, default="")
    technician_photo        = models.CharField(max_length=500, blank=True, default="")
    technician_rating       = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    technician_latitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    technician_longitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    technician_heading      = models.FloatField(default=0.0, blank=True)
    technician_speed        = models.FloatField(default=0.0, blank=True)
    technician_accuracy     = models.FloatField(null=True, blank=True)
    technician_location_name= models.CharField(max_length=255, blank=True, default="")
    technician_location_updated_at = models.DateTimeField(null=True, blank=True)
    accepted_at             = models.DateTimeField(null=True, blank=True)
    technician_arrived_at   = models.DateTimeField(null=True, blank=True)
    started_at              = models.DateTimeField(null=True, blank=True)
    completed_at            = models.DateTimeField(null=True, blank=True)
    start_otp               = models.CharField(max_length=10, blank=True, default="")
    otp_hash                = models.CharField(max_length=128, blank=True, default="")
    otp_expires_at          = models.DateTimeField(null=True, blank=True)
    otp_verified_at         = models.DateTimeField(null=True, blank=True)
    otp_attempt_count       = models.PositiveIntegerField(default=0)
    otp_verified            = models.BooleanField(default=False)
    # Secure tracking token — unpredictable UUID used to authorize the public
    # customer tracking page (/track/:bookingId?token=<tracking_token>).
    # Booking ID alone is never sufficient to authorize viewing sensitive data.
    tracking_token          = models.UUIDField(null=True, blank=True, unique=True, db_index=True)

    parent_request = models.ForeignKey("self", on_delete=models.SET_NULL,
                                       null=True, blank=True,
                                       related_name="child_requests")
    request_kind   = models.CharField(max_length=30, default="standard", db_index=True,
                                      choices=[("standard", "Standard"),
                                               ("inspection", "Inspection"),
                                               ("quoted_work", "Quoted Work")])
    quote_number   = models.CharField(max_length=100, blank=True, null=True, unique=True, db_index=True)

    # Coupon snapshot fields
    coupon               = models.ForeignKey("Coupon", on_delete=models.SET_NULL, null=True, blank=True, related_name="service_requests")
    coupon_code_snapshot = models.CharField(max_length=50, blank=True, default="")
    discount_amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    subtotal_amount      = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_amount         = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    # Cancellation fields
    cancelled_at         = models.DateTimeField(null=True, blank=True, db_index=True)
    cancelled_by         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="cancelled_bookings")
    cancelled_by_persona = models.CharField(max_length=30, blank=True, choices=[("customer", "Customer"), ("admin", "Admin"), ("employee", "Employee")])
    cancellation_reason  = models.CharField(max_length=50, blank=True, choices=CancellationReason.choices)
    cancellation_note    = models.TextField(blank=True)
    cancelled_at_status  = models.CharField(max_length=30, blank=True)

    # Service Area snapshot — recorded at booking creation time.
    # Preserves the zone that approved the booking so that later admin
    # edits/deletions of zones do NOT retroactively invalidate old bookings.
    # Null means the booking was created before geofencing was configured
    # (open-access era) or no zones were active at the time.
    service_zone_id_snapshot   = models.IntegerField(null=True, blank=True, db_index=False)
    service_zone_name_snapshot = models.CharField(max_length=150, blank=True, default="")


    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["company", "status", "created_at"]),
            models.Index(fields=["company", "payment_status", "created_at"]),
            models.Index(fields=["customer", "created_at"]),
            models.Index(fields=["phone"]),
        ]

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_status = ""
        if not is_new:
            old_status = ServiceRequest.objects.filter(pk=self.pk).values_list("status", flat=True).first() or ""

        if not self.request_id:
            self.request_id = _generate_request_id(self.service_category)
        if self.customer and getattr(self.customer, "customer_id", None):
            self.customer_code = self.customer.customer_id
        elif not self.customer_code and (self.phone or self.email):
            from django.contrib.auth import get_user_model
            User = get_user_model()
            q = models.Q()
            if self.phone:
                q |= models.Q(phone=self.phone) | models.Q(mobile_number=self.phone)
            if self.email:
                q |= models.Q(email=self.email)
            u = User.objects.filter(q).first()
            if u:
                if not u.customer_id:
                    from accounts.models import _generate_customer_id
                    u.customer_id = _generate_customer_id()
                    u.save(update_fields=["customer_id"])
                self.customer_code = u.customer_id
                if not self.customer:
                    self.customer = u
        if not self.start_otp:
            import hashlib
            h = hashlib.sha256(f"calservices_booking_otp_{self.request_id}_{self.phone}_{self.customer_name}".encode()).hexdigest()
            self.start_otp = str((int(h[:8], 16) % 900000) + 100000)
        if not self.tracking_token:
            import uuid
            self.tracking_token = uuid.uuid4()
        super().save(*args, **kwargs)

        if is_new or old_status != self.status:
            from service_requests.state_machine import record_transition
            actor = getattr(self, "_status_actor", None)
            reason_code = getattr(self, "_status_reason_code", "BOOKING_CREATED" if is_new else "")
            reason_note = getattr(self, "_status_reason_note", "Booking created" if is_new else "")
            record_transition(
                service_request=self,
                from_status=old_status,
                to_status=self.status,
                actor=actor,
                reason_code=reason_code,
                reason_note=reason_note
            )

    def is_ready_to_complete(self):
        """
        Computed completion engine.
        Returns True if:
        1. All work extensions are RESOLVED, CUSTOMER_DECLINED, or ADMIN_REJECTED.
        """
        for ext in self.work_extensions.all():
            if ext.status not in [
                WorkExtension.Status.RESOLVED,
                WorkExtension.Status.CUSTOMER_DECLINED,
                WorkExtension.Status.ADMIN_REJECTED,
            ]:
                return False
        return True

    def __str__(self):
        return f"{self.request_id} — {self.issue_title}"


class WorkExtension(models.Model):
    """Reported when scope expansion / additional work / specialist is required."""

    class Status(models.TextChoices):
        PENDING_ADMIN_REVIEW = "pending_admin_review", "Pending Admin Review"
        ADMIN_APPROVED       = "admin_approved",       "Admin Approved"
        ADMIN_REJECTED       = "admin_rejected",       "Admin Rejected"
        CUSTOMER_ACCEPTED    = "customer_accepted",    "Customer Accepted"
        CUSTOMER_DECLINED    = "customer_declined",    "Customer Declined"
        PENDING_ASSIGNMENT   = "pending_assignment",   "Pending Assignment"
        RESOLVED             = "resolved",             "Resolved"

    class DecisionChannel(models.TextChoices):
        PORTAL = "portal", "Customer Portal"
        PHONE  = "phone",  "Customer Support Phone"

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="work_extensions",
    )
    workforce_job_id = models.CharField(max_length=100, blank=True, default="")
    reported_by_name = models.CharField(max_length=150, blank=True, default="")

    requires_specialist = models.BooleanField(default=False)
    required_skill = models.CharField(max_length=150, blank=True, null=True)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING_ADMIN_REVIEW,
    )

    # Pricing Audit
    technician_estimate   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    admin_approved_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    final_customer_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Public tokenized security
    decision_token   = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    # Decision Audit Details
    decision_channel     = models.CharField(max_length=15, choices=DecisionChannel.choices, blank=True, null=True)
    decision_recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="recorded_work_extension_decisions",
    )
    decision_notes     = models.TextField(blank=True, default="")
    decision_timestamp = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Extension #{self.id} for {self.service_request.request_id} ({self.get_status_display()})"


class WorkExtensionItem(models.Model):
    """Specific line item / material required for a WorkExtension."""

    class FulfillmentSource(models.TextChoices):
        ORGANIZATION_STOCK       = "ORGANIZATION_STOCK",       "Organization Local Stock"
        ORGANIZATION_TRANSFER    = "ORGANIZATION_TRANSFER",    "Organization Stock Transfer"
        ORGANIZATION_PROCUREMENT = "ORGANIZATION_PROCUREMENT", "Organization Procurement"
        TECHNICIAN_PURCHASE      = "TECHNICIAN_PURCHASE",      "Technician Purchase"
        CUSTOMER_SUPPLIED        = "CUSTOMER_SUPPLIED",        "Customer Supplied"

    class Status(models.TextChoices):
        PENDING            = "PENDING",            "Pending"
        RESERVED           = "RESERVED",           "Reserved"
        AWAITING_PARTS     = "AWAITING_PARTS",     "Awaiting Parts"
        PURCHASE_REQUESTED = "PURCHASE_REQUESTED", "Purchase Requested"
        PURCHASE_APPROVED  = "PURCHASE_APPROVED",  "Purchase Approved"
        FULFILLED          = "FULFILLED",          "Fulfilled"
        VERIFIED           = "VERIFIED",           "Verified"
        REJECTED           = "REJECTED",           "Rejected"

    extension = models.ForeignKey(
        WorkExtension,
        on_delete=models.CASCADE,
        related_name="items",
    )
    item_name = models.CharField(max_length=255)
    quantity  = models.PositiveIntegerField(default=1)

    fulfillment_source = models.CharField(
        max_length=30,
        choices=FulfillmentSource.choices,
        default=FulfillmentSource.ORGANIZATION_STOCK,
    )
    status = models.CharField(
        max_length=25,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # 3-Tier Financial Separation
    billed_to_customer              = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cost                     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    technician_reimbursement_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Technician Purchase Prior Approval
    technician_purchase_approved_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    purchase_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="approved_technician_purchases",
    )
    purchase_receipt = models.FileField(upload_to="service_requests/receipts/", null=True, blank=True)

    # Customer Supplied Verification & Warranty Policy
    verified_by_tech   = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True, default="")
    warranty_covered   = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity}x {self.item_name} ({self.fulfillment_source})"


class JobReschedule(models.Model):
    """Tracks appointment date changes due to scheduling adjustments."""

    class Reason(models.TextChoices):
        PARTS_UNAVAILABLE      = "parts_unavailable",      "Parts Unavailable"
        TECHNICIAN_UNAVAILABLE = "technician_unavailable", "Technician Unavailable"
        CUSTOMER_REQUESTED     = "customer_requested",     "Customer Requested"
        OTHER                  = "other",                  "Other"

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="reschedules",
    )
    old_date = models.DateField()
    new_date = models.DateField()
    reason   = models.CharField(max_length=30, choices=Reason.choices, default=Reason.PARTS_UNAVAILABLE)
    notes    = models.TextField(blank=True, default="")

    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="job_reschedules",
    )

    customer_notified_at  = models.DateTimeField(null=True, blank=True)
    customer_confirmed_at = models.DateTimeField(null=True, blank=True)

    delay_count              = models.PositiveIntegerField(default=1)
    support_callback_created = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reschedule for {self.service_request}: {self.old_date} -> {self.new_date}"


class SupplementalInvoice(models.Model):
    """Supplemental invoice issued for approved additional scope / material balance."""

    class Status(models.TextChoices):
        PENDING   = "pending",   "Pending"
        PAID      = "paid",      "Paid"
        CANCELLED = "cancelled", "Cancelled"

    service_request = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="supplemental_invoices",
    )
    work_extension = models.OneToOneField(
        WorkExtension,
        on_delete=models.CASCADE,
        related_name="supplemental_invoice",
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    amount         = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    status         = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    payment_method = models.CharField(max_length=20, blank=True, default="ONLINE")
    transaction_id = models.CharField(max_length=200, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    paid_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Supplemental Invoice {self.invoice_number} ({self.amount})"


class ServiceFeedback(models.Model):
    """Public feedback form submitted via token link after verification."""

    class Quality(models.TextChoices):
        GOOD    = "good",    "Good"
        AVERAGE = "average", "Average"
        POOR    = "poor",    "Poor"

    service_request = models.OneToOneField(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="feedback",
    )

    # Token generated when admin verifies — used as public URL key
    feedback_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # Populated only on submission
    rating              = models.PositiveSmallIntegerField(null=True, blank=True)
    employee_behaviour  = models.CharField(max_length=10, choices=Quality.choices, blank=True)
    work_quality        = models.CharField(max_length=10, choices=Quality.choices, blank=True)
    issue_resolved      = models.BooleanField(null=True, blank=True)
    comment             = models.TextField(blank=True)

    submitted_at  = models.DateTimeField(null=True, blank=True)
    is_submitted  = models.BooleanField(default=False)

    class Meta:
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Feedback({self.feedback_token}) for {self.service_request.request_id}"



# ── Catalog models (seeded by seed_catalog.py) ────────────────────────────────
#
# Hierarchy: CatalogCategory → Service → Package → AddOn.
#
# `Package` is the historical `CatalogService` model, renamed. It used to hang
# directly off CatalogCategory with one price per row; `Service` is the
# grouping layer inserted between them so one Service (e.g. "AC Services")
# can offer multiple priced Packages (e.g. "AC General Service" ₹599, "AC
# Deep Cleaning" ₹999). See migrations 0022-0024 for the rename + backfill.
#
# Deliberately no `company`/tenant FK on any of these — per TL direction this
# is one CalServices platform providing all services directly, not a
# vendor/company-scoped marketplace catalog (same reasoning already applied
# to `logistics` app models).
class CatalogCategory(models.Model):
    name        = models.CharField(max_length=100)
    slug        = models.SlugField(unique=True)
    icon        = models.CharField(max_length=200, blank=True)
    image       = models.CharField(max_length=500, blank=True)
    description = models.TextField(blank=True)
    rating      = models.CharField(max_length=10, blank=True, default="4.8")
    jobs_count_str = models.CharField(max_length=20, blank=True, default="10K+")
    is_active   = models.BooleanField(default=True)
    sort_order  = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Service(models.Model):
    """Groups one or more bookable Packages under a Category, e.g. 'AC Services'."""
    category    = models.ForeignKey(CatalogCategory, on_delete=models.PROTECT, related_name="services")
    name        = models.CharField(max_length=200)
    slug        = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    icon        = models.CharField(max_length=200, blank=True)
    image       = models.CharField(max_length=500, blank=True)
    is_active   = models.BooleanField(default=True)
    sort_order  = models.PositiveIntegerField(default=0)
    customization = models.JSONField(default=dict, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__sort_order", "category__name", "sort_order", "name"]

    def __str__(self):
        return f"{self.category.name} / {self.name}"


class PackageStatus(models.TextChoices):
    DRAFT    = "DRAFT",    "Draft"
    ACTIVE   = "ACTIVE",   "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class PaymentPolicy(models.TextChoices):
    ONLINE_ONLY = "ONLINE_ONLY", "Online Only"
    BOTH        = "BOTH",        "Online + COD"
    COD_ONLY    = "COD_ONLY",    "COD Only"


class Package(models.Model):
    """A single bookable, priced option under a Service (was `CatalogService`)."""
    service        = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="packages")
    name           = models.CharField(max_length=200)
    slug           = models.SlugField(unique=True)
    description    = models.TextField(blank=True)
    base_price     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    offer_price    = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    duration       = models.CharField(max_length=50, blank=True)
    image          = models.CharField(max_length=500, blank=True)
    popular        = models.BooleanField(default=False)
    tag            = models.CharField(max_length=50, blank=True)
    includes       = models.JSONField(default=list, blank=True)
    excludes       = models.JSONField(default=list, blank=True)
    tools          = models.JSONField(default=list, blank=True)   # Tools & Products We Use (shown in View Details)
    ready          = models.JSONField(default=list, blank=True)   # What You Need to Keep Ready
    reviews        = models.JSONField(default=list, blank=True)   # Customer Reviews [{name, rating, text}]
    faqs           = models.JSONField(default=list, blank=True)   # FAQ [{q, a}]
    payment_policy = models.CharField(max_length=20, choices=PaymentPolicy.choices, default=PaymentPolicy.BOTH)
    status         = models.CharField(max_length=20, choices=PackageStatus.choices, default=PackageStatus.DRAFT)
    version        = models.PositiveIntegerField(default=1)
    sort_order     = models.PositiveIntegerField(default=0)
    button_text    = models.CharField(max_length=50, blank=True, default="Add")
    icon           = models.CharField(max_length=100, blank=True, default="")
    gst_rate       = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, help_text="GST percentage (e.g. 18.00)")
    platform_fee   = models.DecimalField(max_digits=10, decimal_places=2, default=29.00, help_text="Platform / Convenience Fee in INR (e.g. 29.00)")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["service__category__sort_order", "service__name", "sort_order", "name"]

    def __str__(self):
        return self.name


class AddOn(models.Model):
    """Optional extra scoped to one specific Package (e.g. 'Gas Top-up' on 'AC General Service')."""
    package     = models.ForeignKey(Package, on_delete=models.CASCADE, related_name="addons")
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image       = models.CharField(max_length=500, blank=True)
    is_active   = models.BooleanField(default=True)
    sort_order  = models.PositiveIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["package__name", "sort_order", "name"]

    def __str__(self):
        return f"{self.package.name} / {self.name}"


class CatalogChangeLog(models.Model):
    """Audit trail for admin edits across the catalog hierarchy. Soft reference
    (entity_type + entity_id) rather than a hard FK, since one log model covers
    four different entity types and this codebase has no GenericForeignKey
    precedent to introduce for that — matches compliance.AuditLog's convention
    of a soft reference instead."""

    class EntityType(models.TextChoices):
        CATEGORY = "CATEGORY", "Category"
        SERVICE  = "SERVICE",  "Service"
        PACKAGE  = "PACKAGE",  "Package"
        ADDON    = "ADDON",    "Add-on"

    class Action(models.TextChoices):
        CREATE        = "CREATE",        "Created"
        UPDATE        = "UPDATE",        "Updated"
        STATUS_CHANGE = "STATUS_CHANGE", "Status Changed"

    entity_type = models.CharField(max_length=20, choices=EntityType.choices)
    entity_id   = models.PositiveIntegerField(db_index=True)
    entity_name = models.CharField(max_length=200, blank=True, default="")
    action      = models.CharField(max_length=20, choices=Action.choices)
    field_name  = models.CharField(max_length=100, blank=True, default="")
    old_value   = models.TextField(blank=True, default="")
    new_value   = models.TextField(blank=True, default="")
    reason      = models.TextField(blank=True, default="")
    changed_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="catalog_change_actions",
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["entity_type", "entity_id"])]

    def __str__(self):
        return f"{self.get_action_display()} {self.entity_type} #{self.entity_id} ({self.field_name})"


# ─── Slice 2: Reschedule ──────────────────────────────────────────────────────

class RescheduleStatus(models.TextChoices):
    PENDING                     = "PENDING",                     "Pending Admin Review"
    PENDING_ADMIN_REVIEW        = "PENDING_ADMIN_REVIEW",        "Pending Admin Review"
    ADMIN_REVIEW                = "ADMIN_REVIEW",                "Under Admin Review"
    ADMIN_APPROVED              = "ADMIN_APPROVED",              "Admin Approved"
    APPROVED                    = "APPROVED",                    "Approved"
    CUSTOMER_NOTIFIED           = "CUSTOMER_NOTIFIED",           "Customer Notified"
    SLOT_SUGGESTED              = "SLOT_SUGGESTED",              "Slot Suggested by Admin"
    CUSTOMER_ACCEPTED_SUGGESTION = "CUSTOMER_ACCEPTED_SUGGESTION", "Customer Accepted Suggestion"
    CANCELLED_SUGGESTION        = "CANCELLED_SUGGESTION",        "Cancelled Suggestion"
    RESCHEDULED                 = "RESCHEDULED",                 "Rescheduled Successfully"
    REJECTED                    = "REJECTED",                    "Rejected"
    CANCELLED                   = "CANCELLED",                   "Cancelled"


class RescheduleRejectionReason(models.TextChoices):
    SERVICE_UNAVAILABLE   = "SERVICE_UNAVAILABLE",   "Service Unavailable"
    OUTSIDE_WORKING_HOURS = "OUTSIDE_WORKING_HOURS", "Outside Working Hours"
    SERVICE_AREA_CLOSED   = "SERVICE_AREA_CLOSED",   "Service Area Closed"
    DUPLICATE_REQUEST     = "DUPLICATE_REQUEST",     "Duplicate Request"
    INVALID_REQUEST       = "INVALID_REQUEST",       "Invalid Request"
    POLICY_VIOLATION      = "POLICY_VIOLATION",      "Policy Violation"
    OTHER                 = "OTHER",                 "Other"


class RescheduleReason(models.TextChoices):
    SCHEDULE_CONFLICT = "schedule_conflict", "Schedule Conflict"
    EMERGENCY         = "emergency",         "Emergency"
    WEATHER_DELAY     = "weather_delay",     "Weather Delay"
    TECHNICAL_ISSUE   = "technical_issue",   "Technical Issue"
    CUSTOMER_REQUEST  = "customer_request",  "Customer Request"
    OTHER             = "other",             "Other"


class TimeSlotChoices(models.TextChoices):
    SLOT_09_10 = "09-10", "09:00 - 10:00"
    SLOT_10_11 = "10-11", "10:00 - 11:00"
    SLOT_11_12 = "11-12", "11:00 - 12:00"
    SLOT_14_15 = "14-15", "14:00 - 15:00"
    SLOT_15_16 = "15-16", "15:00 - 16:00"


class RescheduleAttachment(models.Model):
    """File attachment uploaded for a reschedule request."""
    file          = models.FileField(upload_to="reschedules/attachments/")
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reschedule_attachments",
    )
    uploaded_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"RescheduleAttachment {self.pk} - {self.original_name}"


def _generate_reschedule_id():
    """Generate RS-XXXX style human-readable ID."""
    last = RescheduleRequest.objects.order_by("-id").first()
    if last and last.reschedule_id:
        try:
            num = int(last.reschedule_id.split("-")[1]) + 1
        except (IndexError, ValueError):
            num = 1
    else:
        num = 1
    return f"RS-{str(num).zfill(4)}"


class RescheduleRequest(models.Model):
    """Customer, Admin, or System driven reschedule request for a booking."""

    class Persona(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN    = "ADMIN",    "Admin"
        SYSTEM   = "SYSTEM",   "System"

    # Human-readable ID (RS-0001, RS-0002, ...)
    reschedule_id         = models.CharField(max_length=20, unique=True, blank=True, null=True)

    booking               = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="reschedule_requests",
    )
    requested_by          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reschedule_requests_made",
    )
    persona               = models.CharField(max_length=10, choices=Persona.choices, default=Persona.CUSTOMER)

    # Immutable snapshot copied from booking at request time
    current_date          = models.DateField(null=True, blank=True)
    current_time          = models.CharField(max_length=50, blank=True, null=True)

    # Proposed new date & slot
    new_date              = models.DateField()
    new_time_slot         = models.CharField(max_length=20, choices=TimeSlotChoices.choices, default=TimeSlotChoices.SLOT_09_10)

    reason                = models.CharField(max_length=50, choices=RescheduleReason.choices, default=RescheduleReason.SCHEDULE_CONFLICT)
    additional_notes      = models.TextField(blank=True, default="")
    attachment            = models.ForeignKey(
        RescheduleAttachment,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reschedule_requests",
    )

    status                = models.CharField(max_length=60, choices=RescheduleStatus.choices, default=RescheduleStatus.PENDING)
    alternate_slots_suggested = models.JSONField(default=list, blank=True)

    reviewed_by           = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reschedule_reviews",
    )
    reviewed_at           = models.DateTimeField(null=True, blank=True)
    review_notes          = models.TextField(blank=True, default="")

    # ── Extended workflow fields ────────────────────────────────────────────
    approved_date         = models.DateField(null=True, blank=True)
    approved_time         = models.CharField(max_length=20, null=True, blank=True)

    customer_response     = models.CharField(
        max_length=20,
        choices=[("PENDING", "Pending"), ("ACCEPTED", "Accepted"), ("REJECTED", "Rejected")],
        null=True, blank=True,
    )

    # Admin suggests alternate slot
    suggested_date        = models.DateField(null=True, blank=True)
    suggested_time_slot   = models.CharField(max_length=20, null=True, blank=True)

    # Admin rejection reason
    rejection_reason      = models.CharField(
        max_length=30,
        choices=RescheduleRejectionReason.choices,
        null=True, blank=True,
    )
    rejection_notes       = models.TextField(blank=True, default="")
    admin_remarks         = models.TextField(blank=True, default="")

    # Admin who took the final approval/rejection action
    admin_reviewed_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="admin_reviewed_reschedules",
    )

    created_at            = models.DateTimeField(auto_now_add=True)
    updated_at            = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.reschedule_id:
            self.reschedule_id = _generate_reschedule_id()
        super().save(*args, **kwargs)

    def __str__(self):
        rid = self.reschedule_id or f"#{self.pk}"
        return f"RescheduleRequest({rid}) for {self.booking.request_id} [{self.status}]"


class RescheduleSuggestedSlot(models.Model):
    """Slot suggested by admin for customer review."""
    request     = models.ForeignKey(RescheduleRequest, on_delete=models.CASCADE, related_name="suggested_slots")
    date        = models.DateField()
    time_slot   = models.CharField(max_length=20)
    is_selected = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "time_slot"]

    def __str__(self):
        return f"SuggestedSlot for {self.request.reschedule_id}: {self.date} ({self.time_slot})"


class RescheduleStatusHistory(models.Model):
    """Audit log tracking every status transition of a reschedule request."""
    request     = models.ForeignKey(RescheduleRequest, on_delete=models.CASCADE, related_name="history")
    from_status = models.CharField(max_length=50)
    to_status   = models.CharField(max_length=50)
    changed_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reschedule_history_actions",
    )
    note        = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"RescheduleHistory {self.request.reschedule_id}: {self.from_status} -> {self.to_status}"



# ─── Slice 3: Refund ──────────────────────────────────────────────────────────

class RefundStatus(models.TextChoices):
    PENDING         = "PENDING",         "Pending Admin Review"
    INFO_REQUESTED  = "INFO_REQUESTED",  "Information Requested"
    APPROVED_FULL   = "APPROVED_FULL",   "Approved Full"
    APPROVED_PARTIAL= "APPROVED_PARTIAL", "Approved Partial"
    REJECTED        = "REJECTED",        "Rejected"
    SENT_TO_FINANCE = "SENT_TO_FINANCE", "Sent to Finance"
    COMPLETED       = "COMPLETED",       "Completed"


class RefundType(models.TextChoices):
    FULL    = "FULL",    "Full Refund"
    PARTIAL = "PARTIAL", "Partial Refund"


class RefundReason(models.TextChoices):
    POOR_QUALITY         = "POOR_QUALITY",         "Poor Quality"
    SERVICE_NOT_COMPLETED = "SERVICE_NOT_COMPLETED", "Service Not Completed"
    CANCELLED_BY_PROVIDER = "CANCELLED_BY_PROVIDER", "Cancelled By Provider"
    OVERCHARGED          = "OVERCHARGED",          "Overcharged"
    OTHER                = "OTHER",                "Other"


class RefundInfoTarget(models.TextChoices):
    CUSTOMER = "CUSTOMER", "Customer"
    ADMIN    = "ADMIN",    "Admin"


class RefundRequest(models.Model):
    """
    Customer refund request — spans Customer, Admin, and Business operations.
    Tracks financial snapshots, evidence, status lifecycle, and internal notes.
    """
    refund_id            = models.CharField(max_length=30, blank=True, null=True, unique=True)
    booking              = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="refund_requests",
    )
    customer             = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="refund_requests",
        null=True,
        blank=True
    )
    requested_by         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="legacy_requested_refunds"
    )
    amount               = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    paid_amount          = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    refund_type          = models.CharField(max_length=20, choices=RefundType.choices, default=RefundType.FULL)
    requested_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    approved_amount      = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reason               = models.CharField(max_length=50, choices=RefundReason.choices, default=RefundReason.POOR_QUALITY)
    additional_notes     = models.TextField(blank=True, default="")
    internal_notes       = models.TextField(blank=True, default="")
    admin_notes          = models.TextField(blank=True, default="")
    status               = models.CharField(max_length=30, choices=RefundStatus.choices, default=RefundStatus.PENDING)
    info_requested_from  = models.CharField(max_length=20, choices=RefundInfoTarget.choices, null=True, blank=True)
    gateway_reference    = models.CharField(max_length=200, blank=True, null=True)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.refund_id:
            import uuid, datetime
            stamp = datetime.date.today().strftime("%Y%m%d")
            rand_code = uuid.uuid4().hex[:4].upper()
            self.refund_id = f"RF-{stamp}-{rand_code}"
        if not self.requested_by_id and self.customer_id:
            self.requested_by_id = self.customer_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"RefundRequest({self.refund_id}) for {self.booking.request_id} — ₹{self.requested_amount} [{self.status}]"


class RefundEvidence(models.Model):
    """Evidence file (photos/documents) uploaded for a refund request."""
    refund_request = models.ForeignKey(
        RefundRequest,
        on_delete=models.CASCADE,
        related_name="evidence"
    )
    file           = models.FileField(upload_to="refund_evidence/")
    uploaded_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    uploaded_at    = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"RefundEvidence({self.pk}) for {self.refund_request.refund_id}"



# ─── Slice 4: Complaint ───────────────────────────────────────────────────────

class Complaint(models.Model):
    """Customer complaint — can be booking-specific or general."""

    class Category(models.TextChoices):
        POOR_SERVICE         = "POOR_SERVICE",         "Poor Service"
        TECHNICIAN_LATE      = "TECHNICIAN_LATE",      "Technician Late"
        TECHNICIAN_BEHAVIOUR = "TECHNICIAN_BEHAVIOUR", "Technician Behaviour"
        INCOMPLETE_WORK      = "INCOMPLETE_WORK",      "Incomplete Work"
        WRONG_BILLING        = "WRONG_BILLING",        "Wrong Billing"
        DAMAGED_PROPERTY     = "DAMAGED_PROPERTY",     "Damaged Property"
        QUALITY_ISSUE        = "QUALITY_ISSUE",        "Quality Issue"
        OTHER                = "OTHER",                "Other"

    class Priority(models.TextChoices):
        LOW      = "LOW",      "Low"
        MEDIUM   = "MEDIUM",   "Medium"
        HIGH     = "HIGH",     "High"
        CRITICAL = "CRITICAL", "Critical"

    class Status(models.TextChoices):
        OPEN                = "OPEN",                "Open"
        ASSIGNED            = "ASSIGNED",            "Assigned"
        UNDER_INVESTIGATION = "UNDER_INVESTIGATION", "Under Investigation"
        WAITING_CUSTOMER    = "WAITING_CUSTOMER",    "Waiting on Customer"
        ADMIN_REVIEW        = "ADMIN_REVIEW",        "Admin Review"
        ESCALATED           = "ESCALATED",           "Escalated"
        RESOLVED            = "RESOLVED",            "Resolved"
        CLOSED              = "CLOSED",              "Closed"
        
    class ResolutionType(models.TextChoices):
        COMPLAINT_VALID   = "COMPLAINT_VALID",   "Complaint Valid"
        COMPLAINT_INVALID = "COMPLAINT_INVALID", "Complaint Invalid"
        CUSTOMER_ERROR    = "CUSTOMER_ERROR",    "Customer Error"
        TECHNICIAN_ERROR  = "TECHNICIAN_ERROR",  "Technician Error"
        COMPANY_ERROR     = "COMPANY_ERROR",     "Company Error"

    complaint_number  = models.CharField(max_length=50, unique=True, blank=True, null=True)
    booking           = models.ForeignKey(
        ServiceRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="complaints"
    )
    raised_by         = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="complaints_raised"
    )
    category          = models.CharField(max_length=30, choices=Category.choices, default=Category.OTHER)
    description       = models.TextField()
    priority          = models.CharField(max_length=15, choices=Priority.choices, default=Priority.MEDIUM)
    status            = models.CharField(max_length=30, choices=Status.choices, default=Status.OPEN)
    
    assigned_admin    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_admin_complaints"
    )
    risk_score        = models.IntegerField(null=True, blank=True)
    
    resolution_type   = models.CharField(max_length=30, choices=ResolutionType.choices, null=True, blank=True)
    resolution_notes  = models.TextField(blank=True, default="")
    
    refund_request    = models.ForeignKey(
        "RefundRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="linked_complaints"
    )
    rework_booking    = models.ForeignKey(
        ServiceRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="rework_source_complaints"
    )

    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)
    resolved_at       = models.DateTimeField(null=True, blank=True)
    closed_at         = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Complaint({self.complaint_number}) [{self.get_status_display()}]"


class ComplaintAttachment(models.Model):
    """Files/photos attached to a complaint."""
    class AttachmentType(models.TextChoices):
        IMAGE   = "IMAGE",   "Image"
        VIDEO   = "VIDEO",   "Video"
        INVOICE = "INVOICE", "Invoice"

    complaint       = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="attachments")
    file            = models.FileField(upload_to="service_requests/complaints/")
    attachment_type = models.CharField(max_length=15, choices=AttachmentType.choices, default=AttachmentType.IMAGE)
    uploaded_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at      = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Attachment for {self.complaint.complaint_number}"


class ComplaintMessage(models.Model):
    """The shared conversation thread for complaints."""

    class Persona(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN    = "ADMIN",    "Admin"

    complaint = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="messages")
    sender    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_complaint_messages")
    sender_persona = models.CharField(max_length=10, choices=Persona.choices)
    message   = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]



class ComplaintStatusHistory(models.Model):
    """Audit trail for complaint statuses."""
    complaint   = models.ForeignKey(Complaint, on_delete=models.CASCADE, related_name="status_history")
    from_status = models.CharField(max_length=30)
    to_status   = models.CharField(max_length=30)
    changed_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes       = models.TextField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Coupon(models.Model):
    """
    Marketing Coupon model for promotions and discounts.
    """
    class DiscountType(models.TextChoices):
        FLAT       = "flat",       "Flat Amount (₹)"
        PERCENTAGE = "percentage", "Percentage (%)"

    class Status(models.TextChoices):
        ACTIVE    = "Active",    "Active"
        SCHEDULED = "Scheduled", "Scheduled"
        EXPIRED   = "Expired",   "Expired"
        PAUSED    = "Paused",    "Paused"

    code                 = models.CharField(max_length=50, unique=True)
    name                 = models.CharField(max_length=255)
    description          = models.TextField(blank=True, default="")
    discount_type        = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.FLAT)
    discount_value       = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    max_discount         = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    customer_eligibility = models.CharField(max_length=100, default="All Customers")
    order_type           = models.CharField(max_length=100, default="Any Order")
    service_eligibility  = models.CharField(max_length=100, default="All Services")
    min_booking          = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    usage_per_customer   = models.IntegerField(default=1)
    total_usage_limit    = models.IntegerField(default=1000)
    current_usage        = models.IntegerField(default=0)
    stacking             = models.CharField(max_length=10, default="No")
    start_date           = models.DateField(null=True, blank=True)
    end_date             = models.DateField(null=True, blank=True)
    status               = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Coupon({self.code} - {self.name})"


class CouponCategory(models.Model):
    """Junction table for Category-restricted coupons."""
    coupon      = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="categories")
    category_id = models.CharField(max_length=100, db_index=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coupon", "category_id")

    def __str__(self):
        return f"CouponCategory({self.coupon.code} -> {self.category_id})"


class CouponService(models.Model):
    """Junction table for Service-restricted coupons."""
    coupon     = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="services")
    service_id = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coupon", "service_id")

    def __str__(self):
        return f"CouponService({self.coupon.code} -> {self.service_id})"


class CouponPackage(models.Model):
    """Junction table for Package-restricted coupons."""
    coupon     = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="packages")
    package_id = models.CharField(max_length=100, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("coupon", "package_id")

    def __str__(self):
        return f"CouponPackage({self.coupon.code} -> {self.package_id})"


class CouponUsage(models.Model):
    """
    Transaction-safe log tracking every redemption of a coupon.
    """
    coupon          = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    customer        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="coupon_redemptions")
    booking         = models.ForeignKey(ServiceRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name="coupon_usages")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    order_amount    = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_amount    = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    used_at         = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-used_at"]
        indexes = [
            models.Index(fields=["coupon", "customer"]),
            models.Index(fields=["coupon", "booking"]),
        ]

    def __str__(self):
        return f"CouponUsage({self.coupon.code} by User {self.customer_id} on SR {self.booking_id})"


class BookingAssignment(models.Model):
    """
    Authoritative lifecycle history of technician/vendor job assignments.
    Only ONE active assignment with status='accepted' can exist per ServiceRequest.
    """
    class Status(models.TextChoices):
        OFFERED   = "offered",   "Offered"
        RECEIVED  = "received",  "Received"
        ACCEPTED  = "accepted",  "Accepted"
        REJECTED  = "rejected",  "Rejected"
        EXPIRED   = "expired",   "Expired"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    booking = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="assignments",
        db_index=True,
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="booking_assignments",
        null=True, blank=True,
        db_index=True,
    )
    vendor_id = models.CharField(max_length=100, blank=True, default="")
    vendor_name = models.CharField(max_length=200, blank=True, default="")
    vendor_logo = models.CharField(max_length=500, blank=True, default="")
    vendor_verified = models.BooleanField(default=False)

    technician_id = models.CharField(max_length=100, blank=True, default="")
    technician_name = models.CharField(max_length=200, blank=True, default="")
    technician_photo = models.CharField(max_length=500, blank=True, default="")
    technician_phone = models.CharField(max_length=30, blank=True, default="")
    technician_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    technician_verified = models.BooleanField(default=False)

    workforce_job_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    assignment_id = models.CharField(max_length=100, blank=True, default="", db_index=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OFFERED, db_index=True)

    offered_at = models.DateTimeField(auto_now_add=True)
    received_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "status"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["workforce_job_id"]),
            models.Index(fields=["assignment_id"]),
        ]

    def __str__(self):
        return f"Assignment #{self.id} for SR {self.booking.request_id} — {self.technician_name} ({self.status})"


class WorkforceWebhookEvent(models.Model):
    """
    Persistent, idempotent log of incoming Workforce webhook events.
    Ensures duplicate events are ignored and out-of-order sequence events are validated.
    """
    class ProcessingStatus(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        PROCESSED = "PROCESSED", "Processed"
        FAILED    = "FAILED",    "Failed"
        IGNORED   = "IGNORED",   "Ignored"

    event_id = models.CharField(max_length=128, unique=True, db_index=True)
    workforce_job_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    assignment_id = models.CharField(max_length=100, blank=True, default="")
    booking_id = models.CharField(max_length=100, blank=True, default="", db_index=True)
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="workforce_webhook_events",
    )
    event_type = models.CharField(max_length=100, db_index=True)
    sequence = models.BigIntegerField(default=0, db_index=True)
    payload_hash = models.CharField(max_length=64, blank=True, default="")

    processing_status = models.CharField(
        max_length=20,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
        db_index=True,
    )
    error_message = models.TextField(blank=True, default="")

    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [
            models.Index(fields=["event_id"]),
            models.Index(fields=["booking_id", "sequence"]),
            models.Index(fields=["workforce_job_id", "sequence"]),
        ]

    def __str__(self):
        return f"WebhookEvent {self.event_id} ({self.event_type} - {self.processing_status})"


class Payment(models.Model):
    """
    Payment transaction record linking Customer (CUS0025) and ServiceRequest (AC0826).
    Supports Razorpay orders, payments, webhooks, and reconciliations.
    """
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
        null=True, blank=True,
    )
    customer_id_snapshot = models.CharField(max_length=30, blank=True, default="", db_index=True)
    service_request = models.ForeignKey(
        "ServiceRequest",
        on_delete=models.CASCADE,
        related_name="payments",
    )
    service_request_id_snapshot = models.CharField(max_length=30, blank=True, default="", db_index=True)

    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    currency = models.CharField(max_length=10, default="INR")
    status = models.CharField(
        max_length=30,
        choices=ServiceRequest.PaymentStatus.choices,
        default=ServiceRequest.PaymentStatus.PENDING,
        db_index=True,
    )
    method = models.CharField(max_length=20, default="ONLINE")
    gateway = models.CharField(max_length=50, default="razorpay")
    error_code = models.CharField(max_length=100, blank=True, default="")
    error_description = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "created_at"]),
            models.Index(fields=["customer_id_snapshot", "created_at"]),
            models.Index(fields=["service_request", "created_at"]),
            models.Index(fields=["razorpay_order_id"]),
            models.Index(fields=["razorpay_payment_id"]),
            models.Index(fields=["status"]),
        ]

    def save(self, *args, **kwargs):
        if self.customer and hasattr(self.customer, "customer_id") and self.customer.customer_id:
            self.customer_id_snapshot = self.customer.customer_id
        if self.service_request and self.service_request.request_id:
            self.service_request_id_snapshot = self.service_request.request_id
        super().save(*args, **kwargs)

    def __str__(self):
        cid = self.customer_id_snapshot or (self.customer.customer_id if self.customer else "N/A")
        srid = self.service_request_id_snapshot or (self.service_request.request_id if self.service_request else "N/A")
        return f"Payment #{self.id} — Customer: {cid} | SR: {srid} | {self.status} (₹{self.amount})"


class TechnicianLocation(models.Model):
    """
    High-frequency GPS telemetry point emitted by the Technician App during active service lifecycle.
    """
    booking = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="location_logs",
        db_index=True,
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="technician_locations",
    )
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    accuracy = models.FloatField(null=True, blank=True)
    heading = models.FloatField(default=0.0, blank=True)
    speed = models.FloatField(default=0.0, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "created_at"]),
            models.Index(fields=["technician", "created_at"]),
        ]

    def __str__(self):
        return f"Loc for {self.booking.request_id} ({self.latitude}, {self.longitude}) at {self.created_at}"





