import uuid

from django.conf import settings
from django.db import models, transaction, IntegrityError
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


def _generate_secure_start_otp():
    """
    Generates a cryptographically random 6-digit service-start OTP.

    Fixes EC-01: the previous implementation derived this code
    deterministically from sha256(request_id, phone, customer_name) — values
    the assigned technician (and anyone else with API access to the job)
    already knows, so they could compute the "proof the technician actually
    reached the customer" code themselves instead of the customer reading it
    out on arrival. A randomly generated code cannot be derived from
    anything else stored on the booking, so it has to come from the
    customer.
    """
    import secrets
    return str(secrets.randbelow(900000) + 100000)


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

    # GT-B-03: "trip states don't reflect a multi-leg goods-transport job"
    # -- Status above is shared by every service category and drives
    # ALLOWED_TRANSITIONS/webhook/gating logic in state_machine.py; adding
    # new top-level statuses for logistics-only sub-phases would mean
    # updating that transition table, the Customer<->vendor webhook event
    # map, AND the vendor app's own mirrored status conditionals. LogisticsLeg
    # is deliberately a separate, additive field (logistics_leg below)
    # instead -- it can never conflict with an existing transition rule,
    # gate check, or webhook mapping. Only meaningful when service_category
    # is a logistics category; every other booking leaves it blank.
    class LogisticsLeg(models.TextChoices):
        EN_ROUTE_PICKUP = "EN_ROUTE_PICKUP", "En Route to Pickup"
        LOADING         = "LOADING",         "Loading"
        EN_ROUTE_DROP   = "EN_ROUTE_DROP",   "En Route to Drop"
        UNLOADING       = "UNLOADING",       "Unloading"
        DELIVERED       = "DELIVERED",       "Delivered"
        # Relocation / Packers & Movers legs
        ASSIGNED        = "ASSIGNED",        "Assigned"
        TEAM_EN_ROUTE   = "TEAM_EN_ROUTE",   "Team En Route"
        ARRIVED_PICKUP  = "ARRIVED_PICKUP",  "Arrived at Pickup"
        PACKING         = "PACKING",         "Packing"
        DISMANTLING     = "DISMANTLING",     "Dismantling"
        IN_TRANSIT      = "IN_TRANSIT",      "In Transit"
        ARRIVED_DROP    = "ARRIVED_DROP",    "Arrived at Drop"
        REASSEMBLY      = "REASSEMBLY",      "Reassembly"
        UNPACKING       = "UNPACKING",       "Unpacking"
        COMPLETED       = "COMPLETED",       "Completed"

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
        # HS-C-03/HS-C-06: the vendor app writes this directly onto this
        # shared column (workforce_api/views.py, when a technician reports
        # cash collected but the customer has not yet confirmed it) -- it
        # was never a formally recognized value here, so get_payment_status_display()
        # returned the raw string "cash_pending" instead of a real label, and it
        # leaked into the customer-facing UI verbatim. See the payment
        # reconciliation audit command for the broader three-way status
        # divergence this is one instance of.
        CASH_PENDING       = "cash_pending",       "Cash Collection Pending"

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
    # GT-B-XX (drop-point coordinates): drop_address above is free text
    # only -- there was no drop-side coordinate anywhere on this model,
    # so GT-D-02's leg-aware tracking fix could only target the drop
    # point for bookings that also have TripStop rows (the multi-stop
    # case). The common single-pickup/single-drop logistics booking had
    # no drop coordinate to target at all. Also blocks any real
    # distance-based fare calculation (GT-B-01) -- distance needs two
    # real coordinates, not one real + one guessed. Additive, nullable
    # fields, same pattern as latitude/longitude above; never required
    # at the serializer level so existing bookings/clients keep working
    # unchanged if a drop coordinate genuinely couldn't be resolved.
    drop_latitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    drop_longitude   = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    # GT-B-01: the itemised fare the server actually computed at booking
    # time (base, chargeable km, per-km charge, loading, stop charges,
    # surge, whether the minimum applied, and crucially whether the
    # distance came from the Google Maps road network or a straight-line
    # estimate -- see services/logistics_pricing.quote_logistics_fare).
    #
    # Stored rather than recomputed because it is the *quote the customer
    # was given*, locked at booking per CALTRACK_PHASE_14 H.1. Rates can
    # change afterwards, so recomputing later would silently produce a
    # different number and there would be no record of what was actually
    # agreed. This is also the "estimated" half that final-fare
    # reconciliation (GT-C-01) needs to compare an actual against.
    #
    # Empty dict for every booking priced by the flat lane/tier lookup and
    # for every non-logistics booking -- absence means "not distance-priced",
    # not "missing data".
    fare_breakdown   = models.JSONField(default=dict, blank=True)
    # Fixes GT-D-03: nothing captured who's actually receiving the goods at
    # the drop address, so they could never be notified. See
    # GT_D_03_RECIPIENT_NOTIFICATION_NOTE.md for the full write-up; this is
    # the migration that note called for.
    drop_contact_name  = models.CharField(max_length=200, blank=True, default="")
    drop_contact_phone = models.CharField(max_length=20, blank=True, default="")
    # Optional alongside phone -- there is no general-purpose outbound SMS
    # sender in this codebase (Twilio is wired only for login OTPs), so an
    # email is what actually lets notify_delivery_recipient() (added this
    # pass) reach them using the existing, already-proven send_mail path.
    drop_contact_email = models.EmailField(blank=True, default="")
    # GT-A-03: "no sender or consignee identity for higher-value
    # consignments" -- drop_contact_name/phone/email above already give the
    # driver *someone* to hand goods to; declared_value and
    # consignee_relationship are the two fields still missing to scale
    # identity requirements to what's actually being moved. Serializer-level
    # validation (see ServiceRequestPublicCreateSerializer.validate) requires
    # both once declared_value crosses HIGH_VALUE_CONSIGNMENT_THRESHOLD.
    # Verified sender identity + a receiver OTP at handover (the doc's full
    # "how mature platforms do it") is a real feature -- OTP capture at
    # drop-off, scaled by this threshold -- deliberately left as a follow-up
    # rather than guessed at here; it touches the vendor app's handover flow,
    # which needs its own careful pass like the Customer-side OTP hardening
    # earlier this session, not a same-turn add-on.
    declared_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    consignee_relationship = models.CharField(max_length=100, blank=True, default="")
    # GT-C-03: "no goods insurance and no damage-claim path". Premium is
    # always computed server-side from declared_value (see
    # ServiceRequestPublicCreateSerializer) -- never trust a client-supplied
    # premium, same principle as the HS-B-01 total_amount hardening.
    # liability_cap is the actual payable ceiling: min(declared_value,
    # INSURANCE_MAX_LIABILITY) -- what "a stated liability cap" in the
    # finding refers to.
    insurance_opted_in = models.BooleanField(default=False)
    insurance_premium = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    insurance_liability_cap = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    # GT-B-03: logistics-only sub-phase, independent of Status -- see the
    # LogisticsLeg docstring above. History is append-only, one entry per
    # set_logistics_leg() call: {"leg": ..., "at": iso8601, "by": user_id}.
    logistics_leg = models.CharField(max_length=20, choices=LogisticsLeg.choices, blank=True, default="")
    logistics_leg_updated_at = models.DateTimeField(null=True, blank=True)
    logistics_leg_history = models.JSONField(default=list, blank=True)
    # GT-B-03 (completing it): the three fields above shipped, but nothing
    # in either backend ever wrote them -- the model comment referred to a
    # set_logistics_leg() that did not exist, so logistics_leg was
    # permanently "" in production and every consumer of it (the
    # leg-aware tracking destination, the customer trip timeline) was
    # dead code. This is that method.
    # Forward-only ordering for a trip. Mirrors LEG_SEQUENCE in the vendor
    # app's workforce_api/services/logistics_events.py -- the two must agree.
    LEG_SEQUENCE = [
        "EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "DELIVERED",
    ]

    def set_logistics_leg(self, leg, actor=None, save=True):
        """
        Advance this booking's logistics leg, appending to the audit trail.

        Append-only history, one entry per call:
            {"leg": <value>, "at": <iso8601>, "by": <user id or None>}

        Returns True if the leg changed, False if it did not. False covers
        two distinct non-error cases, both of which a webhook receiver must
        tolerate:

          - a REPEAT of the leg already set (the vendor app retries; see the
            replay-signature guard in workforce_integration/views.py);
          - a STALE, out-of-order event naming an EARLIER leg. Webhook
            delivery is not ordered, so an EN_ROUTE_PICKUP event can
            genuinely arrive after UNLOADING. Applying it would drag the
            customer's tracking view backwards and corrupt the audit trail,
            so it is ignored rather than applied or treated as an error.

        Raises ValueError only for a value that is not a LogisticsLeg at
        all, so a typo in a webhook payload fails loudly instead of
        silently writing garbage into a field the tracking UI reads.
        """
        valid = {choice.value for choice in self.LogisticsLeg}
        if leg not in valid:
            raise ValueError(
                f"{leg!r} is not a valid logistics leg. Expected one of: {sorted(valid)}"
            )
        if self.logistics_leg == leg:
            return False
        if self.logistics_leg:
            try:
                if self.LEG_SEQUENCE.index(leg) < self.LEG_SEQUENCE.index(self.logistics_leg):
                    return False
            except ValueError:
                # A leg outside the ordered sequence: fall through and apply
                # it rather than silently dropping a legitimate value.
                pass

        now = timezone.now()
        history = list(self.logistics_leg_history or [])
        history.append({
            "leg": leg,
            "at": now.isoformat(),
            "by": getattr(actor, "id", None),
        })
        self.logistics_leg = leg
        self.logistics_leg_updated_at = now
        self.logistics_leg_history = history
        if save:
            self.save(update_fields=[
                "logistics_leg", "logistics_leg_updated_at",
                "logistics_leg_history", "updated_at",
            ])
        return True

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
    workforce_job_id        = models.CharField(max_length=100, blank=True, null=True, default=None, db_index=True)
    external_assignment_id  = models.CharField(max_length=100, blank=True, null=True, default=None)
    technician_name         = models.CharField(max_length=150, blank=True, default="")
    technician_phone        = models.CharField(max_length=30, blank=True, default="")
    technician_photo        = models.CharField(max_length=500, blank=True, default="")
    technician_rating       = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    technician_latitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    technician_longitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    technician_location_name= models.CharField(max_length=255, blank=True, default="")
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

        _request_id_was_generated = False
        if not self.request_id:
            self.request_id = _generate_request_id(self.service_category)
            _request_id_was_generated = True
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
            self.start_otp = _generate_secure_start_otp()
        if not self.tracking_token:
            import uuid
            self.tracking_token = uuid.uuid4()

        # Fixes EC-04: _generate_request_id() reads the current max id and
        # loops checking existence, but that check-then-insert has a gap --
        # two concurrent bookings can both pass the uniqueness check before
        # either commits, and the second INSERT then fails with an
        # IntegrityError on request_id's unique constraint (a 500 for that
        # customer, not data corruption, but a real booking-creation failure
        # under concurrent load). Retry with a freshly generated id a bounded
        # number of times inside a savepoint, so one collision doesn't also
        # abort whatever outer transaction the caller may be in.
        _max_attempts = 5
        for _attempt in range(1, _max_attempts + 1):
            try:
                with transaction.atomic():
                    super().save(*args, **kwargs)
                break
            except IntegrityError:
                if not _request_id_was_generated or _attempt == _max_attempts:
                    raise
                self.request_id = _generate_request_id(self.service_category)

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

    # Fixes HS-E-01: a rating had no durable link to which technician it was
    # about -- reading it off the booking's *current* assignment breaks the
    # moment a job is reassigned after the fact. Snapshot fields (not an FK),
    # matching BookingAssignment's own technician_id pattern -- same reason:
    # no local FK to the vendor app's Employee table across the two Django
    # projects. Populated at whichever point in the job lifecycle first makes
    # the technician who did the work known (see notes below on where to set
    # these); left blank for any ServiceFeedback rows that already exist.
    technician_id            = models.CharField(max_length=100, blank=True, default="", db_index=True)
    technician_name_snapshot = models.CharField(max_length=200, blank=True, default="")

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
        # Goods & Transport vehicle tiers. Deliberately logged here rather
        # than in a new audit model: this one already carries exactly the
        # shape a rate change needs (entity, field, old value, new value,
        # actor, reason, timestamp) and its soft entity_type + entity_id
        # reference was built to span unrelated tables. ServiceTier lives in
        # the `logistics` app, which is precisely the case a soft reference
        # handles and a ForeignKey would not.
        SERVICE_TIER = "SERVICE_TIER", "Goods & Transport Tier"

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


class BookingMessage(models.Model):
    """
    X-09: "no in-app chat between customer and technician" -- previously
    the only communication path was phone calls (no masking/proxying --
    real numbers exchanged directly, itself a separate privacy concern)
    or the generic ComplaintMessage thread (only exists once a complaint
    has been raised, not for ordinary day-of-service coordination like
    "I'm running 10 min late" or "please use the side gate").

    Deliberately simple and polling-based (frontend re-fetches on an
    interval, matching the tracking page's existing polling pattern) --
    NOT a websocket/push implementation, which would require adopting new
    real-time infra (Django Channels + a channel layer backend) this
    codebase doesn't currently have. See HS-D-01/02/03 for that larger,
    infra-level piece, deliberately left for a reviewed follow-up.

    Deliberately NOT phone-number masking/proxying (X-09's other half) --
    that needs a telephony vendor account (Twilio Proxy or equivalent)
    and a real per-minute cost commitment, not something to pick
    unilaterally in an autonomous pass.
    """

    class SenderPersona(models.TextChoices):
        CUSTOMER   = "customer",   "Customer"
        TECHNICIAN = "technician", "Technician"
        ADMIN      = "admin",      "Admin"

    booking = models.ForeignKey(
        "service_requests.ServiceRequest",
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    sender_persona = models.CharField(max_length=15, choices=SenderPersona.choices)
    sender_name = models.CharField(max_length=200, blank=True, default="")
    # Nullable: the vendor app (a separate Django project, separate user
    # table) writes technician-sent messages directly against the shared
    # table without a matching row in this app's AUTH_USER_MODEL -- see
    # vendor/backend/service_requests/models.py's unmanaged mirror.
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_booking_messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    read_at_customer = models.DateTimeField(null=True, blank=True)
    read_at_technician = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        db_table = "service_requests_booking_message"

    def __str__(self):
        return f"{self.sender_persona}: {self.body[:40]}"


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


class CustomerWallet(models.Model):
    """
    HS-C-07: payment was previously all-or-nothing on a single amount -- no
    wallet, no credit balance from a goodwill gesture or referral reward, no
    partial payment. This is the ledger-backed wallet: CustomerWallet holds
    the current balance, WalletTransaction is the immutable append-only
    ledger every balance change is derived from -- balance on the wallet
    row is a cached total for fast reads, but the transaction log is the
    source of truth and is never edited or deleted.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wallet",
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests_customer_wallet"

    def __str__(self):
        return f"Wallet({self.user_id}) = {self.balance}"


class WalletTransaction(models.Model):
    class TxType(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT  = "DEBIT",  "Debit"

    class Reason(models.TextChoices):
        REFUND        = "REFUND",        "Refund Credited to Wallet"
        GOODWILL      = "GOODWILL",      "Goodwill Credit"
        REFERRAL      = "REFERRAL",      "Referral Reward"
        BOOKING_DEBIT = "BOOKING_DEBIT", "Applied to Booking Payment"
        ADJUSTMENT    = "ADJUSTMENT",    "Manual Adjustment"
        REVERSAL      = "REVERSAL",      "Reversal"

    wallet = models.ForeignKey(
        CustomerWallet,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    tx_type = models.CharField(max_length=10, choices=TxType.choices)
    reason = models.CharField(max_length=20, choices=Reason.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    note = models.CharField(max_length=255, blank=True, default="")

    # Loose references -- avoids a hard FK to every possible source (refund,
    # booking, referral) while still making the transaction traceable.
    reference_type = models.CharField(max_length=50, blank=True, default="")
    reference_id = models.CharField(max_length=50, blank=True, default="")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="wallet_transactions_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "service_requests_wallet_transaction"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.tx_type} {self.amount} ({self.reason}) -> wallet {self.wallet_id}"


class InsuranceClaimAttachment(models.Model):
    """Condition/damage evidence photo for an InsuranceClaim. Same shape as
    RescheduleAttachment -- deliberately not reusing that model directly
    since it's semantically a reschedule concept, not a claims one."""
    file          = models.FileField(upload_to="insurance_claims/attachments/")
    original_name = models.CharField(max_length=255, blank=True)
    uploaded_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="insurance_claim_attachments",
    )
    uploaded_at   = models.DateTimeField(auto_now_add=True)


class InsuranceClaim(models.Model):
    """
    GT-C-03: the damage-claim path. Only filable on a booking that actually
    opted into insurance (insurance_opted_in=True) -- an uninsured booking
    still goes through the generic Complaint flow exactly as before, this
    doesn't change that path at all.
    """
    class Status(models.TextChoices):
        OPEN     = "OPEN",     "Open"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PAID     = "PAID",     "Paid"

    booking = models.ForeignKey(
        ServiceRequest,
        on_delete=models.CASCADE,
        related_name="insurance_claims",
    )
    filed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="insurance_claims_filed",
    )
    description = models.TextField()
    claimed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Never trust claimed_amount directly for payout -- approved_amount is
    # separately set by whoever resolves the claim, and is clamped to
    # booking.insurance_liability_cap at resolution time (see
    # resolve_insurance_claim in services/__init__.py). This is the
    # "stated liability cap... protects the platform when something breaks"
    # the finding calls out.
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    attachments = models.ManyToManyField(InsuranceClaimAttachment, blank=True, related_name="claims")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    resolution_notes = models.TextField(blank=True, default="")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="insurance_claims_resolved",
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests_insurance_claim"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Claim #{self.pk} on booking {self.booking_id} ({self.status})"


class NotificationOutbox(models.Model):
    """
    HS-D-04: "notifications are fire-and-forget with no delivery guarantee".
    Every send_mail(...) call in notifications.py is transparently wrapped
    (see notifications.send_mail) to persist one row per recipient per
    attempt here, whether it succeeded or failed -- this is what actually
    answers "was the customer told?", and what the retry management command
    (notifications/management/commands/retry_failed_notifications.py)
    replays for FAILED rows. This does not change delivery to be queued/
    async -- sending is still inline in the request path, exactly as
    before; this only adds the missing delivery record on top of it.
    """
    class Status(models.TextChoices):
        SENT   = "SENT",   "Sent"
        FAILED = "FAILED", "Failed"

    recipient = models.EmailField(db_index=True)
    subject = models.CharField(max_length=255)
    body_text = models.TextField(blank=True, default="")
    body_html = models.TextField(blank=True, default="")
    from_email = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=10, choices=Status.choices, db_index=True)
    error = models.TextField(blank=True, default="")
    attempt_count = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    last_attempt_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests_notification_outbox"
        ordering = ["-created_at"]
        indexes = [
            # Explicit name (rather than Django's auto-generated hash) so
            # this stays byte-for-byte consistent with the hand-written
            # migration's AddIndex operation -- see the migration-authoring
            # note there for why this migration couldn't be generated by
            # `makemigrations` in this sandbox.
            models.Index(fields=["status", "created_at"], name="notif_outbox_status_crt_idx"),
        ]

    def __str__(self):
        return f"[{self.status}] {self.subject} -> {self.recipient}"


class TripStop(models.Model):
    """
    GT-D-02: "goods-transport/packers & movers jobs with more than one
    pickup or drop point have nowhere to record the extra stops" -- the
    ServiceRequest model only ever had one pickup (`address`) and one drop
    (`drop_address`), documented there as a deliberate 2-address-only
    decision (see the comment above `drop_address`). This model is the
    "revisit if Packers & Movers ever needs multi-stop routing" case that
    comment called for -- added additively: `address`/`drop_address` on
    ServiceRequest are untouched and remain the source of truth for the
    common single-pickup/single-drop case. TripStop only exists, and is
    only ever created, for bookings that opt into extra stops; a booking
    with zero TripStop rows behaves exactly as it always has.
    """
    class StopType(models.TextChoices):
        PICKUP   = "PICKUP",   "Pickup"
        WAYPOINT = "WAYPOINT", "Intermediate Stop"
        DROP     = "DROP",     "Drop"

    booking       = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="trip_stops")
    sequence      = models.PositiveSmallIntegerField(help_text="Visit order, 1-based.")
    stop_type     = models.CharField(max_length=10, choices=StopType.choices, default=StopType.WAYPOINT)
    address       = models.TextField()
    contact_name  = models.CharField(max_length=200, blank=True, default="")
    contact_phone = models.CharField(max_length=20, blank=True, default="")
    latitude      = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude     = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    notes         = models.CharField(max_length=500, blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)
    # GT-D-01: per-stop progress. Until these existed there was no concept
    # of "which stop is the driver at" anywhere in the platform -- a stop
    # was a static address row, never advanced by anything. Both nullable:
    # a stop that hasn't been reached yet simply has neither set.
    arrived_at    = models.DateTimeField(null=True, blank=True)
    completed_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "service_requests_trip_stop"
        ordering = ["booking", "sequence"]
        unique_together = ("booking", "sequence")

    def __str__(self):
        return f"Stop {self.sequence} ({self.stop_type}) for booking #{self.booking_id}"


class DeliveryProof(models.Model):
    """
    GT-D-01: proof of delivery.

    Before this there was no proof record of any kind. The vendor app
    could POST a `job.completion_proof_submitted` webhook, and all the
    handler did was append the free-text remarks onto
    ServiceRequest.description -- no photo, no signature, no recipient
    identity, no link to which stop it belonged to. For a goods-transport
    platform that is the single most load-bearing missing artefact: it is
    what settles "it was never delivered" disputes and what an insurance
    claim (GT-C-03) is assessed against.

    Deliberately one row PER PROOF rather than a set of columns on
    ServiceRequest: a multi-stop trip needs proof at each drop, and a
    single delivery routinely needs more than one kind of evidence (a
    photo of the goods AND a signature AND the recipient's name). Both
    are naturally many-per-booking.

    `stop` is nullable so the common single-drop booking -- which has no
    TripStop rows at all -- can still record proof against the booking
    itself. Captured-by is stored as a name/id snapshot rather than an FK
    for the same reason the technician fields on ServiceRequest are (see
    HS-E-01): the technician identity lives in the vendor app's own
    database, and this backend deliberately holds no FK into it.
    """
    class ProofType(models.TextChoices):
        PHOTO          = "PHOTO",          "Photo of delivered goods"
        SIGNATURE      = "SIGNATURE",      "Recipient signature"
        RECIPIENT_NAME = "RECIPIENT_NAME", "Recipient name captured"
        OTP            = "OTP",            "Delivery OTP verified"
        NOTE           = "NOTE",           "Driver note"

    booking     = models.ForeignKey(
        ServiceRequest, on_delete=models.CASCADE, related_name="delivery_proofs",
    )
    stop        = models.ForeignKey(
        TripStop, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="delivery_proofs",
        help_text="Which stop this proves. Null for a single-drop booking with no TripStop rows.",
    )
    proof_type  = models.CharField(max_length=20, choices=ProofType.choices)
    image       = models.ImageField(upload_to="delivery_proofs/", null=True, blank=True)
    recipient_name  = models.CharField(max_length=200, blank=True, default="")
    recipient_phone = models.CharField(max_length=30, blank=True, default="")
    notes       = models.TextField(blank=True, default="")
    # Snapshot of who captured it, mirroring the technician_* snapshot
    # pattern already used on ServiceRequest -- no FK into the vendor DB.
    captured_by_name = models.CharField(max_length=200, blank=True, default="")
    captured_by_workforce_id = models.CharField(max_length=64, blank=True, default="")
    latitude    = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude   = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    captured_at = models.DateTimeField(default=timezone.now)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "service_requests_delivery_proof"
        ordering = ["booking", "captured_at", "id"]
        indexes = [
            models.Index(fields=["booking", "proof_type"], name="sr_delivery_proof_bk_ty_idx"),
        ]

    def __str__(self):
        return f"{self.get_proof_type_display()} for booking #{self.booking_id}"


class FareReconciliation(models.Model):
    """
    GT-C-01: the estimated-vs-final fare record.

    A Porter-style booking quotes a fare upfront and locks it, then the
    real trip deviates -- the route was longer than quoted, the customer
    added a stop, extra work was approved mid-job. Before this there was
    no record connecting the two: ServiceRequest.total_amount was simply
    whatever it had most recently been set to, with no statement of what
    was originally quoted, what changed, or why. A customer disputing a
    final charge, or anyone auditing revenue, had nothing to read.

    One row per booking (OneToOne). It is written at completion, from the
    server's own numbers -- never from a client-supplied total. Each
    adjustment is itemised in `adjustments` so the delta is explainable
    line by line rather than being a single unexplained difference.

    Deliberately additive and non-authoritative for charging: this
    records and explains the reconciliation, it does not silently move
    money. ServiceRequest.total_amount remains the field the rest of the
    system charges against, and is updated in the same transaction only
    when the reconciliation actually resolves to a different number.
    """
    booking = models.OneToOneField(
        ServiceRequest, on_delete=models.CASCADE, related_name="fare_reconciliation",
    )
    estimated_amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_amount     = models.DecimalField(max_digits=10, decimal_places=2)
    # Signed: positive means the customer owes more than quoted.
    delta            = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Snapshots, so the record stays readable even after tier rates change.
    estimated_breakdown = models.JSONField(default=dict, blank=True)
    final_breakdown     = models.JSONField(default=dict, blank=True)
    # [{"code": ..., "label": ..., "amount": "123.00", "source": ...}, ...]
    adjustments         = models.JSONField(default=list, blank=True)

    notes      = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests_fare_reconciliation"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Fare reconciliation for booking #{self.booking_id} (delta {self.delta})"


class BookingSeries(models.Model):
    """
    HS-B-07: "no support for recurring bookings / AMC subscriptions" --
    customers could only book a single one-off service; there was no way
    to set up e.g. "service my AC every 3 months" and have future bookings
    generated automatically.

    A BookingSeries is a template + schedule, not a booking itself. Each
    due date, generate_due_bookings() (services/__init__.py) creates a real
    ServiceRequest row from the template -- the vendor app's existing
    dispatch_pending_workforce_jobs polling loop then picks that row up
    exactly like any manually-created booking (see the X-02 comment on
    BookingCreateView: the "dispatch" happens by the vendor side polling
    this same shared table, not by anything the creator calls). No new
    dispatch path was needed for that reason.

    Deliberately COD-only: there is no stored payment method/card-on-file
    anywhere in this codebase, so an AMC booking cannot be auto-charged
    online without building that (out of scope here) -- every generated
    booking is created exactly like a COD booking today (status=CONFIRMED,
    payment collected on service).
    """
    class Frequency(models.TextChoices):
        MONTHLY     = "MONTHLY",     "Every Month"
        QUARTERLY   = "QUARTERLY",   "Every 3 Months"
        HALF_YEARLY = "HALF_YEARLY", "Every 6 Months"
        YEARLY      = "YEARLY",      "Every 12 Months"

    class Status(models.TextChoices):
        ACTIVE    = "ACTIVE",    "Active"
        PAUSED    = "PAUSED",    "Paused"
        CANCELLED = "CANCELLED", "Cancelled"

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="booking_series")
    # Snapshotted at series creation, same rationale as every other
    # *_snapshot pattern in this file -- generation must not silently break
    # or silently change if the user later edits their profile.
    customer_name = models.CharField(max_length=200)
    phone         = models.CharField(max_length=30)
    email         = models.EmailField(blank=True, default="")

    service_category = models.CharField(max_length=150)
    issue_title       = models.CharField(max_length=300)
    description       = models.TextField(blank=True, default="")
    address           = models.TextField()
    latitude          = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    preferred_time    = models.CharField(max_length=50, blank=True, default="")
    # Snapshotted from the series-creation booking's price -- no live fare
    # recomputation per generated occurrence in this pass (fares can change
    # between occurrences; that reconciliation is a deliberate follow-up,
    # not silently assumed away).
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    frequency     = models.CharField(max_length=12, choices=Frequency.choices)
    next_run_date = models.DateField()
    status        = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    occurrences_generated = models.PositiveIntegerField(default=0)
    last_generated_booking = models.ForeignKey(
        "ServiceRequest", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "service_requests_booking_series"
        ordering = ["-created_at"]

    def __str__(self):
        return f"AMC series #{self.id} ({self.service_category}, {self.frequency}) for {self.customer_name}"

class VegetableRecipe(models.Model):
    """
    Recipe discovery model tied to a primary vegetable package.
    Provides complete cooking instructions, nutrition breakdown, and health tips.
    """
    class Difficulty(models.TextChoices):
        EASY   = "Easy",   "Easy"
        MEDIUM = "Medium", "Medium"
        HARD   = "Hard",   "Hard"

    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name="recipes",
        help_text="Primary vegetable product in Calservices catalog"
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    image = models.CharField(max_length=500, blank=True)
    short_description = models.TextField(blank=True)
    prep_time_minutes = models.PositiveIntegerField(default=10)
    cook_time_minutes = models.PositiveIntegerField(default=15)
    total_time_minutes = models.PositiveIntegerField(default=25)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.EASY)
    servings = models.PositiveIntegerField(default=2, help_text="Base recipe serving size")
    calories = models.PositiveIntegerField(default=120, help_text="Calories (kcal) per serving")
    protein = models.CharField(max_length=50, blank=True, default="3g")
    carbohydrates = models.CharField(max_length=50, blank=True, default="15g")
    fat = models.CharField(max_length=50, blank=True, default="2g")
    fiber = models.CharField(max_length=50, blank=True, default="4g")
    health_benefits = models.JSONField(default=list, blank=True, help_text="List of informational health points")
    health_tips = models.JSONField(default=list, blank=True, help_text="List of washing, cooking, or storage tips")
    instructions = models.JSONField(default=list, blank=True, help_text="List of step-by-step cooking instructions")
    tags = models.JSONField(default=list, blank=True, help_text="List of tags like Quick Recipes, Low Calorie, etc.")
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]

    def __str__(self):
        return f"{self.name} ({self.package.name})"


class RecipeIngredient(models.Model):
    """
    Separates ingredients into:
    1. Calservices Vegetables: Linked to a Package (purchasable, add to cart, recommend).
    2. Other Cooking Ingredients (Pantry): Plain name/text only (salt, spices, oils, etc., NOT purchasable).
    """
    recipe = models.ForeignKey(VegetableRecipe, on_delete=models.CASCADE, related_name="ingredients")
    package = models.ForeignKey(
        Package,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recipe_ingredients",
        help_text="Referenced Calservices vegetable package if this is a catalog vegetable"
    )
    name = models.CharField(max_length=200, help_text="Ingredient name e.g. Tomato, Salt, Mustard seeds")
    quantity = models.DecimalField(max_digits=8, decimal_places=2, default=1.0)
    unit = models.CharField(max_length=50, default="pieces", help_text="e.g. pieces, g, kg, tsp, tbsp, cup, cloves")
    notes = models.CharField(max_length=200, blank=True, default="", help_text="e.g. Finely chopped, Diced")
    is_catalog_vegetable = models.BooleanField(default=False, help_text="True if linked to a vegetable sold by Calservices")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def save(self, *args, **kwargs):
        if self.package_id:
            self.is_catalog_vegetable = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.recipe.name}"


class VegetableRecommendation(models.Model):
    """
    Database-driven vegetable recommendations (Goes Well With, Recipe Based, You May Also Like).
    Both source and recommended products must reference existing Calservices vegetable products.
    """
    class RecommendationType(models.TextChoices):
        GOES_WELL_WITH    = "GOES_WELL_WITH",    "Goes Well With"
        RECIPE_BASED      = "RECIPE_BASED",      "Recipe Based"
        YOU_MAY_ALSO_LIKE = "YOU_MAY_ALSO_LIKE", "You May Also Like"

    source_product = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name="source_recommendations",
        help_text="Primary vegetable"
    )
    recommended_product = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name="recommended_in",
        help_text="Vegetable recommended with the primary vegetable"
    )
    recommendation_type = models.CharField(
        max_length=30,
        choices=RecommendationType.choices,
        default=RecommendationType.GOES_WELL_WITH
    )
    priority = models.PositiveIntegerField(default=10, help_text="Higher priority items appear first")
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-priority", "display_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["source_product", "recommended_product", "recommendation_type"],
                name="unique_vegetable_recommendation"
            )
        ]

    def __str__(self):
        return f"{self.source_product.name} -> {self.recommended_product.name} ({self.get_recommendation_type_display()})"



# ─── Slice 2: Reschedule ──────────────────────────────────────────────────────

class PaintingRateCard(models.Model):
    category = models.CharField(max_length=100) # e.g. "Interior Painting", "Exterior Painting", "Waterproofing", "Wood & Metal", "Texture Decor"
    sub_service = models.CharField(max_length=100) # e.g. "Single Wall", "Terrace Waterproofing — 4 Coat"
    unit = models.CharField(max_length=50) # e.g. "sq.ft", "door", "window", "gate", "litre", "point", "job"
    base_rate = models.DecimalField(max_digits=10, decimal_places=2)
    min_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    classification = models.CharField(max_length=50, default="both") # "material", "labour", "both"
    warranty = models.CharField(max_length=100, blank=True, default="")
    inclusions = models.TextField(blank=True, default="")
    exclusions = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    has_slabs = models.BooleanField(default=False)
    is_confirmed = models.BooleanField(default=True)
    comments = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.category} - {self.sub_service} (₹{self.base_rate}/{self.unit})"


class PaintingRateCardSlab(models.Model):
    rate_card = models.ForeignKey(PaintingRateCard, on_delete=models.CASCADE, related_name="slabs")
    slab_key = models.CharField(max_length=100) # e.g. "1000", "10000", "Small", "Medium", "Large", "1 mm", "2 mm", "3 mm"
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50, blank=True, default="")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Slab {self.slab_key} for {self.rate_card.sub_service}: ₹{self.rate}"


# ─── Painting Quotation Models ───────────────────────────────────────────────

class PaintingQuote(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING_ADMIN_REVIEW = "PENDING_ADMIN_REVIEW", "Pending Admin Review"
        SENT_TO_CUSTOMER = "SENT_TO_CUSTOMER", "Sent to Customer"
        VIEWED = "VIEWED", "Viewed"
        APPROVED = "APPROVED", "Approved"
        REQUESTED_CHANGES = "REQUESTED_CHANGES", "Requested Changes"
        SUPERSEDED = "SUPERSEDED", "Superseded"
        DECLINED = "DECLINED", "Declined"
        EXPIRED = "EXPIRED", "Expired"

    service_request = models.ForeignKey(ServiceRequest, on_delete=models.CASCADE, related_name="painting_quotes")
    vendor = models.ForeignKey("companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="painting_quotes")
    quote_number = models.CharField(max_length=100, unique=True, db_index=True)
    quote_version = models.IntegerField(default=1)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.DRAFT)
    property_type = models.CharField(max_length=100, blank=True, default="")
    total_paintable_area = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    advance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    valid_until = models.DateField(null=True, blank=True)
    warranty = models.CharField(max_length=200, blank=True, default="")
    customer_decision_token = models.CharField(max_length=100, unique=True, blank=True, null=True, db_index=True)
    customer_notes = models.TextField(blank=True, default="")
    decline_reason = models.TextField(blank=True, default="")
    
    # Files
    warranty_card = models.FileField(upload_to="quotes/warranties/", null=True, blank=True)
    warranty_certificate = models.FileField(upload_to="quotes/warranties/", null=True, blank=True)
    completion_certificate = models.FileField(upload_to="quotes/warranties/", null=True, blank=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_painting_quotes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.quote_number:
            import datetime, random
            stamp = datetime.date.today().strftime("%Y%m%d")
            rand = random.randint(1000, 9999)
            self.quote_number = f"PQ-{stamp}-{rand}"
        if not self.customer_decision_token:
            import uuid
            self.customer_decision_token = uuid.uuid4().hex
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quote_number} (v{self.quote_version}) - {self.status}"


class PaintingQuoteItem(models.Model):
    quote = models.ForeignKey(PaintingQuote, on_delete=models.CASCADE, related_name="items")
    rate_card_item = models.ForeignKey(PaintingRateCard, on_delete=models.SET_NULL, null=True, blank=True)
    category = models.CharField(max_length=100) # e.g. "Interior Painting", "Waterproofing"
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit = models.CharField(max_length=50)
    base_rate = models.DecimalField(max_digits=10, decimal_places=2)
    proposed_rate = models.DecimalField(max_digits=10, decimal_places=2)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    final_rate = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    classification = models.CharField(max_length=50, default="both") # "material", "labour", "both"
    included = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    slab_key = models.CharField(max_length=100, blank=True, default="")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    changed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.description} - Qty: {self.quantity} Amount: {self.amount}"


class PaintingMeasurement(models.Model):
    quote = models.ForeignKey(PaintingQuote, on_delete=models.CASCADE, related_name="measurements")
    area_name = models.CharField(max_length=100) # e.g. "Living Room", "Walls"
    length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    calculated_area = models.DecimalField(max_digits=12, decimal_places=2)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    final_area = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.area_name}: {self.final_area} sq.ft"


class PaintingMaterial(models.Model):
    quote = models.ForeignKey(PaintingQuote, on_delete=models.CASCADE, related_name="materials")
    brand = models.CharField(max_length=100)
    product_name = models.CharField(max_length=150)
    finish = models.CharField(max_length=100)
    shade = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit = models.CharField(max_length=50)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.brand} {self.product_name} - Qty: {self.quantity}"


class QuotePhoto(models.Model):
    quote = models.ForeignKey(PaintingQuote, on_delete=models.CASCADE, related_name="photos")
    photo = models.ImageField(upload_to="quotes/photos/")
    caption = models.CharField(max_length=255, blank=True, default="")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Photo for {self.quote.quote_number}"

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
    # When the DEVICE recorded the fix, as opposed to when this server
    # received it. The two diverge whenever a packet is retried, queued
    # behind a tunnel, or reordered by the mobile network -- and without a
    # capture time there is no way to tell a fresh fix from an old one that
    # simply arrived late. Nullable because rows written before this field
    # existed have no capture time; readers fall back to created_at.
    captured_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["booking", "created_at"]),
            models.Index(fields=["technician", "created_at"]),
        ]

    def __str__(self):
        return f"Loc for {self.booking.request_id} ({self.latitude}, {self.longitude}) at {self.created_at}"
