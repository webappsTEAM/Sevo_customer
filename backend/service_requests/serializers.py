"""
service_requests/serializers.py

All request/response validation using DRF Serializers.
Customer, admin, booking, catalog, work extension, reschedule, refund, and coupon serialization.
No Pydantic. No workforce models.
"""
from rest_framework import serializers

from .models import (
    ServiceFeedback, ServiceRequest, CatalogCategory, Service, Package, AddOn, CatalogChangeLog,
    WorkExtension, WorkExtensionItem, JobReschedule, SupplementalInvoice,
    RescheduleRequest, RescheduleAttachment, RescheduleStatus, RescheduleReason, TimeSlotChoices,
    RescheduleSuggestedSlot, RescheduleStatusHistory,
    RefundRequest, RefundEvidence,
    Coupon, CouponUsage,
    InsuranceClaim, InsuranceClaimAttachment,
    TripStop,
    DeliveryProof,
    Estimation, EstimationFee, Inspection, InspectionFinding, InspectionPhoto,
    EstimationQuotation, EstimationQuotationItem,
    ACInspectionRateCategory, ACInspectionRateItem, ACInspectionConfiguration,
    CustomerInspection, CustomerInspectionRateSnapshot,
    BookingSeries,
    BookingMessage,
    VendorCapabilityRequest,
    _generate_secure_start_otp,
)

# GT-A-03: declared_value at or above this (INR) requires a named,
# accountable receiver on a logistics booking. Env-overridable like the
# other threshold constants in this codebase.
from django.conf import settings as _dj_settings
HIGH_VALUE_CONSIGNMENT_THRESHOLD = int(getattr(_dj_settings, "HIGH_VALUE_CONSIGNMENT_THRESHOLD", 25000))


class CatalogServiceSerializer(serializers.ModelSerializer):
    """v1 compat shape for the public /api/catalog/services/ endpoint."""
    category = serializers.SerializerMethodField()
    price = serializers.DecimalField(source="base_price", max_digits=10, decimal_places=2)
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_slug = serializers.CharField(source="service.slug", read_only=True)
    service_description = serializers.CharField(source="service.description", read_only=True)
    service_customization = serializers.JSONField(source="service.customization", read_only=True)
    service_sort_order = serializers.IntegerField(source="service.sort_order", read_only=True)
    service_image = serializers.CharField(source="service.image", read_only=True)
    category_slug = serializers.CharField(source="service.category.slug", read_only=True)
    in_stock = serializers.SerializerMethodField()
    max_quantity = serializers.SerializerMethodField()

    class Meta:
        model = Package
        fields = [
            "id", "category", "category_slug", "name", "slug", "description", "price", "base_price", "offer_price", "platform_fee", "gst_rate", "duration",
            "image", "popular", "tag", "includes", "excludes", "payment_policy",
            "faqs", "sort_order", "tools", "ready", "custom_packs", "customization",
            "service_id", "service_name", "service_slug", "service_description",
            "service_customization", "service_sort_order", "service_image",
            "in_stock", "max_quantity",
        ]

    def get_category(self, obj):
        if obj.service_id and obj.service:
            return obj.service.category_id
        return None

    def get_stock_status(self, obj):
        if not hasattr(self, "_stock_status_cache"):
            self._stock_status_cache = {}
        if obj.pk not in self._stock_status_cache:
            from inventory.selectors.vegetable_stock_selectors import get_stock_status
            self._stock_status_cache[obj.pk] = get_stock_status(obj)
        return self._stock_status_cache[obj.pk]

    def get_in_stock(self, obj):
        return self.get_stock_status(obj)["in_stock"]

    def get_max_quantity(self, obj):
        return self.get_stock_status(obj)["max_quantity"]


class CatalogCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CatalogCategory
        fields = '__all__'

    def to_internal_value(self, data):
        data_copy = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'desc' in data_copy and not data_copy.get('description'):
            data_copy['description'] = data_copy['desc']
        if 'jobs' in data_copy and not data_copy.get('jobs_count_str'):
            data_copy['jobs_count_str'] = data_copy['jobs']
        return super().to_internal_value(data_copy)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # HS-A-05: "No trust signals anywhere before the technician is
        # assigned" -- rating/jobs_count_str were seeded once as literal
        # placeholder strings ("4.8"/"10K+") and this aggregation code
        # already existed to replace them with real numbers, but was gated
        # on `if not ret.get('rating')` -- since the stored default is the
        # non-empty string "4.8", that check was always False, so the real
        # query below never ran. Fixed by always computing the real
        # aggregate and only falling back to the placeholder when there is
        # genuinely no feedback/booking data yet for this category.
        from django.db import models
        feedback_qs = ServiceFeedback.objects.filter(
            service_request__service_category=str(instance.id),
            is_submitted=True,
            rating__isnull=False
        )
        agg = feedback_qs.aggregate(avg=models.Avg("rating"), count=models.Count("id"))
        avg = agg["avg"]
        ret['rating'] = str(round(avg, 1)) if avg else (ret.get('rating') or "4.8")
        # New: real review count alongside the rating -- the finding
        # explicitly calls out "no real service rating/review count".
        ret['reviews_count'] = agg["count"] or 0

        cnt = ServiceRequest.objects.filter(
            service_category=str(instance.id),
            status__in=["completed", "closed", "verified", "awaiting_verification"]
        ).count()
        if cnt == 0:
            ret['jobs_count_str'] = ret.get('jobs_count_str') or "10K+"
        elif cnt < 100:
            ret['jobs_count_str'] = f"{cnt} bookings"
        elif cnt < 1000:
            ret['jobs_count_str'] = f"{cnt//100 * 100}+ bookings"
        else:
            ret['jobs_count_str'] = f"{round(cnt/1000, 1)}K+ bookings"

        ret['desc'] = instance.description or ""
        ret['jobs'] = ret['jobs_count_str']
        return ret


class ServiceSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Service
        fields = '__all__'


class VendorCapabilityRequestSerializer(serializers.ModelSerializer):
    """
    Vendor app <-> CalServices: a vendor asks to be approved to serve one
    catalog Service, an admin approves/rejects it here. See
    VendorCapabilityRequest's own docstring in models.py for why this has
    no FK to the Workforce app's own vendor identity.
    """
    service_name  = serializers.CharField(source="service.name", read_only=True)
    category_id   = serializers.IntegerField(source="service.category_id", read_only=True)
    category_name = serializers.CharField(source="service.category.name", read_only=True)

    class Meta:
        model = VendorCapabilityRequest
        fields = '__all__'
        read_only_fields = ["status", "decision_note", "decided_by", "decided_at", "requested_at", "updated_at"]


class AddOnSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)

    class Meta:
        model = AddOn
        fields = '__all__'


class PackageSerializer(serializers.ModelSerializer):
    service_name = serializers.CharField(source="service.name", read_only=True)
    service_slug = serializers.CharField(source="service.slug", read_only=True)
    service_image = serializers.CharField(source="service.image", read_only=True, allow_null=True, allow_blank=True)
    service_customization = serializers.JSONField(source="service.customization", read_only=True)
    category_slug = serializers.CharField(source="service.category.slug", read_only=True)
    in_stock = serializers.SerializerMethodField()
    max_quantity = serializers.SerializerMethodField()
    add_ons = AddOnSerializer(many=True, read_only=True)

    class Meta:
        model = Package
        fields = '__all__'

    def get_stock_status(self, obj):
        if not hasattr(self, "_stock_status_cache"):
            self._stock_status_cache = {}
        if obj.pk not in self._stock_status_cache:
            try:
                from inventory.selectors.vegetable_stock_selectors import get_stock_status
                self._stock_status_cache[obj.pk] = get_stock_status(obj)
            except Exception:
                self._stock_status_cache[obj.pk] = {"in_stock": True, "max_quantity": 99}
        return self._stock_status_cache[obj.pk]

    def get_in_stock(self, obj):
        return self.get_stock_status(obj).get("in_stock", True)

    def get_max_quantity(self, obj):
        return self.get_stock_status(obj).get("max_quantity", 99)


class CatalogChangeLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CatalogChangeLog
        fields = '__all__'

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return "System"


class CoordinateField(serializers.DecimalField):
    """
    Coordinates from browser geolocation or map providers carry 7-14 decimal places.
    ServiceRequest stores them in DecimalField(max_digits=9, decimal_places=6).
    Rounds raw input coordinates to 6 decimal places before precision validation runs,
    preventing spurious 'Ensure that there are no more than 6 decimal places' 400 rejections.
    """
    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 9)
        kwargs.setdefault("decimal_places", 6)
        kwargs.setdefault("required", False)
        kwargs.setdefault("allow_null", True)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data is not None and data != "":
            try:
                val = round(float(data), 6)
                data = f"{val:.6f}"
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)


class ServiceRequestPublicCreateSerializer(serializers.ModelSerializer):
    """Validates public booking submission from the React booking wizard."""

    latitude = CoordinateField()
    longitude = CoordinateField()
    drop_latitude = CoordinateField()
    drop_longitude = CoordinateField()
    ac_type = serializers.CharField(required=False, allow_blank=True, default="")
    ac_brand = serializers.CharField(required=False, allow_blank=True, default="")
    ac_capacity = serializers.CharField(required=False, allow_blank=True, default="")
    ac_quantity = serializers.IntegerField(required=False, default=1, min_value=1, max_value=50)
    customer_symptom = serializers.CharField(required=False, allow_blank=True, default="")
    customer_notes = serializers.CharField(required=False, allow_blank=True, default="")

    class Meta:
        model = ServiceRequest
        fields = (
            "customer_name", "phone", "email",
            "service_category", "issue_title", "description",
            "address", "latitude", "longitude",
            "preferred_date", "preferred_time", "photo",
            "payment_method", "total_amount", "cart_data",
            "drop_address", "drop_latitude", "drop_longitude", "logistics_tier", "logistics_lane",
            "job_type", "idempotency_key",
            "request_kind", "catalog_service_id",
            "ac_type", "ac_brand", "ac_capacity", "ac_quantity",
            "customer_symptom", "customer_notes",
            # Fixes GT-D-03: accept the recipient's contact info if the
            # frontend sends it. Deliberately NOT required yet -- the
            # booking wizard doesn't collect these fields today, so
            # requiring them would break every logistics booking until the
            # frontend is updated to actually ask for them. See
            # GT_D_03_RECIPIENT_NOTIFICATION_NOTE.md.
            "drop_contact_name", "drop_contact_phone", "drop_contact_email",
            # Fixes GT-A-03 (partial): declared_value/consignee_relationship.
            # Also optional at the field level -- validate() below enforces
            # them together only once declared_value crosses the high-value
            # threshold, so ordinary low-value bookings are unaffected.
            "declared_value", "consignee_relationship",
            # GT-C-03: opt-in only; premium/liability_cap are never accepted
            # from the client -- see validate() below.
            "insurance_opted_in",
        )
        extra_kwargs = {
            "issue_title":         {"required": False, "allow_blank": True},
            "job_type":            {"required": False, "default": "SERVICE"},
            "request_kind":        {"required": False, "allow_blank": True},
            "catalog_service_id":  {"required": False, "allow_blank": True, "allow_null": True},
            "idempotency_key":     {"required": False, "allow_null": True, "allow_blank": True},
            "ac_type":             {"required": False, "allow_blank": True},
            "ac_brand":            {"required": False, "allow_blank": True},
            "ac_capacity":         {"required": False, "allow_blank": True},
            "ac_quantity":         {"required": False},
            "customer_symptom":    {"required": False, "allow_blank": True},
            "customer_notes":      {"required": False, "allow_blank": True},
            "description":         {"required": False, "allow_blank": True},
            "email":               {"required": False, "allow_blank": True, "allow_null": True},
            "latitude":            {"required": False, "allow_null": True},
            "longitude":           {"required": False, "allow_null": True},
            "photo":               {"required": False, "allow_null": True},
            "payment_method":      {"required": False, "allow_null": True, "allow_blank": True},
            "preferred_time":      {"required": False, "allow_blank": True, "allow_null": True},
            "cart_data":           {"required": False},
            "drop_address":        {"required": False, "allow_blank": True},
            "drop_latitude":       {"required": False, "allow_null": True},
            "drop_longitude":      {"required": False, "allow_null": True},
            "logistics_tier":      {"required": False, "allow_null": True},
            "logistics_lane":      {"required": False, "allow_null": True},
            "drop_contact_name":   {"required": False, "allow_blank": True},
            "drop_contact_phone":  {"required": False, "allow_blank": True},
            "drop_contact_email":  {"required": False, "allow_blank": True},
            "declared_value":        {"required": False, "allow_null": True},
            "consignee_relationship": {"required": False, "allow_blank": True},
            "insurance_opted_in":    {"required": False},
        }

    def validate_latitude(self, value):
        if value is not None and not (-90.0 <= float(value) <= 90.0):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value):
        if value is not None and not (-180.0 <= float(value) <= 180.0):
            raise serializers.ValidationError("Longitude must be between -180 and 180.")
        return value

    def validate_drop_latitude(self, value):
        if value is not None and not (-90.0 <= float(value) <= 90.0):
            raise serializers.ValidationError("Drop latitude must be between -90 and 90.")
        return value

    def validate_drop_longitude(self, value):
        if value is not None and not (-180.0 <= float(value) <= 180.0):
            raise serializers.ValidationError("Drop longitude must be between -180 and 180.")
        return value

    def validate_cart_data(self, value):
        import json
        if isinstance(value, str):
            try:
                return json.loads(value)
            except ValueError:
                raise serializers.ValidationError("Value must be valid JSON.")
        return value

    def validate_total_amount(self, value):
        # Fixes HS-B-01 (partial): reject obviously-tampered amounts outright.
        # A full server-side recompute against Package/AddOn catalog prices
        # isn't possible here because `cart_data` items carry only
        # {name, price, quantity} with no package_id/addon_id back-reference
        # to the catalog (see HS_B_01_PRICE_VALIDATION_NOTE.md for the full
        # writeup and the schema change that would close this properly).
        # This at least stops the crude cases: negative/zero submitted
        # amounts and unreasonably large ones.
        try:
            amt = float(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("Enter a valid amount.")
        # Zero amounts are allowed for site consultations/inspections (e.g. Painting/Masonry) and free promotions.
        if amt < 0:
            raise serializers.ValidationError("Amount cannot be negative.")
        if amt > 1000000:
            raise serializers.ValidationError("Amount is outside the allowed range.")
        return value

    def validate_preferred_date(self, value):
        from django.utils.timezone import localdate
        if value < localdate():
            raise serializers.ValidationError("Preferred date cannot be in the past.")
        return value

    def validate_customer_name(self, value):
        val = (value or "").strip()
        if not val or len(val) < 2:
            raise serializers.ValidationError("Please provide your real name to complete the booking.")
        if val.lower() in {"thejaa t", "fake customer", "test customer", "dummy customer", "customer"}:
            raise serializers.ValidationError("Valid customer name is required. Please provide your real name.")
        return val

    def validate_phone(self, value):
        import re
        cleaned = re.sub(r"[\s\-\(\)\+]", "", value or "")
        if not cleaned.isdigit() or len(cleaned) < 10:
            raise serializers.ValidationError("Enter a valid 10-digit phone number.")
        if cleaned in {"6379222691", "0000000000", "1234567890", "9999999999"}:
            raise serializers.ValidationError("Valid customer phone number is required.")
        return cleaned

    def validate_drop_contact_phone(self, value):
        if not value:
            return value
        import re
        cleaned = re.sub(r"[\s\-\(\)\+]", "", str(value))
        if not cleaned.isdigit() or len(cleaned) < 10:
            raise serializers.ValidationError("Enter a valid 10-digit receiver phone number.")
        if cleaned in {"0000000000", "1234567890", "9999999999"}:
            raise serializers.ValidationError("Valid receiver phone number is required.")
        return cleaned

    def validate_drop_contact_name(self, value):
        if not value:
            return value
        val = str(value).strip()
        if len(val) < 2:
            raise serializers.ValidationError("Receiver name must be at least 2 characters.")
        return val

    def validate(self, attrs):
        # Booking window: same-day requests are refused after the configured
        # cut-off, and a slot that has already passed today is refused too.
        # This lived only in the frontend before, evaluated against the
        # browser's clock, so it was both bypassable and wrong for any device
        # not set to IST. See service_requests/booking_window.py.
        from .booking_window import validate_booking_slot

        slot_error = validate_booking_slot(
            attrs.get("preferred_date"),
            attrs.get("preferred_time"),
            service_category=attrs.get("service_category"),
        )
        if slot_error:
            raise serializers.ValidationError({"preferred_date": slot_error})

        # Fixes GT-B-04: nothing captured what's actually being moved for a
        # Goods & Transport booking -- `description` already exists as a
        # generic free-text field on ServiceRequest and was optional for
        # every category, so a truck/mover booking could be submitted with
        # zero information about the cargo (item count, fragility, weight).
        # Require it specifically for logistics categories rather than add
        # a new field/migration for what a TextField already covers.
        from .services.logistics_pricing import LOGISTICS_CATEGORIES
        category = attrs.get("service_category", "")
        if category in LOGISTICS_CATEGORIES and not (attrs.get("description") or "").strip():
            raise serializers.ValidationError({
                "description": "Please describe what you're moving (items, approximate weight, "
                                 "and any fragile/special-handling notes) so the driver knows what to expect."
            })

        # Prohibited Cargo Safety Gate: reject dangerous, illegal, or restricted goods
        from .services.prohibited_goods import validate_cargo_safety
        is_safe, safety_msg, safety_cat = validate_cargo_safety(
            description=attrs.get("description", ""),
            goods_type=attrs.get("issue_title", ""),
            cart_data=attrs.get("cart_data"),
            service_category=category,
        )
        if not is_safe:
            raise serializers.ValidationError({
                "description": f"Prohibited Cargo: {safety_msg}"
            })

        # GT-C-03: Transit insurance is not available for instant self-service Packers & Movers
        if attrs.get("insurance_opted_in") and category == "packers_movers":
            raise serializers.ValidationError({
                "insurance_opted_in": (
                    "Transit insurance is not available for instant online Packers & Movers booking. "
                    "Full-value transit insurance is arranged via pre-move survey."
                )
            })

        # Fixes GT-A-03 (partial): "identity requirement scaled to declared
        # value". Below the threshold this is a no-op -- most bookings don't
        # even set declared_value. Above it, require both a receiver contact
        # (drop_contact_name/phone, already collected for GT-D-03) and an
        # explicit relationship to the customer, so there's at least a named,
        # accountable person the driver is handing high-value goods to.
        declared_value = attrs.get("declared_value")
        if category in LOGISTICS_CATEGORIES and declared_value is not None and declared_value >= HIGH_VALUE_CONSIGNMENT_THRESHOLD:
            missing = []
            if not (attrs.get("drop_contact_name") or "").strip():
                missing.append("drop_contact_name")
            if not (attrs.get("drop_contact_phone") or "").strip():
                missing.append("drop_contact_phone")
            if not (attrs.get("consignee_relationship") or "").strip():
                missing.append("consignee_relationship")
            if missing:
                raise serializers.ValidationError({
                    "declared_value": (
                        f"Consignments declared at ₹{HIGH_VALUE_CONSIGNMENT_THRESHOLD:,.0f} or more require a named "
                        f"receiver: {', '.join(missing)}."
                    )
                })

        # GT-C-03: insurance requires a declared value to price off of, and
        # premium/liability_cap are always computed here server-side --
        # never accepted from the client. INSURANCE_RATE and
        # INSURANCE_MAX_LIABILITY are env-overridable like the other
        # threshold constants in this file.
        if attrs.get("insurance_opted_in"):
            if declared_value is None or declared_value <= 0:
                raise serializers.ValidationError({
                    "insurance_opted_in": "declared_value is required to purchase insurance coverage."
                })
            from decimal import Decimal
            rate = Decimal(str(getattr(_dj_settings, "INSURANCE_RATE", "0.02")))
            max_liability = Decimal(str(getattr(_dj_settings, "INSURANCE_MAX_LIABILITY", "500000")))
            attrs["insurance_premium"] = (Decimal(str(declared_value)) * rate).quantize(Decimal("0.01"))
            attrs["insurance_liability_cap"] = min(Decimal(str(declared_value)), max_liability)

        # AC Inspection / Estimation validation
        job_type = str(attrs.get("job_type") or "").strip().upper()
        request_kind = str(attrs.get("request_kind") or "").strip().upper()
        if job_type == "ESTIMATION" or request_kind == "ESTIMATION":
            attrs["job_type"] = "ESTIMATION"
            attrs["request_kind"] = "ESTIMATION"
            if "customer_symptom" not in attrs or not str(attrs.get("customer_symptom") or "").strip():
                raise serializers.ValidationError({"customer_symptom": "Please describe the AC issue or symptom."})
            ac_type = str(attrs.get("ac_type") or "").strip().upper()
            if ac_type and ac_type not in {"SPLIT", "WINDOW", "CASSETTE", "TOWER", "OTHER"}:
                raise serializers.ValidationError({"ac_type": f"Unsupported AC type: '{ac_type}'."})
            if not ac_type:
                ac_type = "SPLIT"
            attrs["ac_type"] = ac_type
            if not attrs.get("service_category"):
                attrs["service_category"] = "appliances"
            if not attrs.get("issue_title"):
                attrs["issue_title"] = f"AC Estimation / Inspection - {ac_type.capitalize()}"
            if not attrs.get("description"):
                attrs["description"] = attrs.get("customer_symptom") or "AC Inspection requested"

        return attrs

    def create(self, validated_data):
        # Strip transient AC estimation fields that belong to Estimation, not ServiceRequest
        for key in ("ac_type", "ac_brand", "ac_capacity", "ac_quantity", "customer_symptom", "customer_notes"):
            validated_data.pop(key, None)
        return super().create(validated_data)


class FeedbackTokenSummarySerializer(serializers.ModelSerializer):
    """Read-only summary shown to customer when they open the feedback link."""
    service_category_display = serializers.CharField(
        source="get_service_category_display", read_only=True
    )

    class Meta:
        model = ServiceRequest
        fields = (
            "request_id", "customer_name", "service_category",
            "service_category_display", "issue_title", "address",
            "preferred_date", "created_at",
        )


class ServiceFeedbackSubmitSerializer(serializers.ModelSerializer):
    """Validates customer feedback submission."""

    class Meta:
        model = ServiceFeedback
        fields = ("rating", "employee_behaviour", "work_quality", "issue_resolved", "comment")

    def validate_rating(self, value):
        if value not in range(1, 6):
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value


class ServiceFeedbackNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceFeedback
        fields = (
            "rating", "employee_behaviour", "work_quality",
            "issue_resolved", "comment", "submitted_at",
            "is_submitted", "feedback_token"
        )


class ServiceRequestListSerializer(serializers.ModelSerializer):
    """Lightweight — used in list view."""
    service_category_display = serializers.CharField(
        source="get_service_category_display", read_only=True
    )
    status_display         = serializers.CharField(source="get_status_display", read_only=True)
    priority_display       = serializers.CharField(source="get_priority_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    customer_id            = serializers.SerializerMethodField()
    customer_user_id       = serializers.IntegerField(source="customer_id", read_only=True)
    start_otp              = serializers.SerializerMethodField()
    payment_confirmation_otp = serializers.SerializerMethodField()
    active_extension       = serializers.SerializerMethodField()
    extension_amount       = serializers.SerializerMethodField()
    base_amount            = serializers.SerializerMethodField()
    total_amount           = serializers.SerializerMethodField()
    latest_reschedule      = serializers.SerializerMethodField()
    available_actions      = serializers.SerializerMethodField()
    technician             = serializers.SerializerMethodField()
    technician_name        = serializers.SerializerMethodField()
    technician_phone       = serializers.SerializerMethodField()
    technician_photo       = serializers.SerializerMethodField()
    technician_rating      = serializers.SerializerMethodField()
    job_type               = serializers.CharField(read_only=True)
    estimation             = serializers.SerializerMethodField()
    child_requests         = serializers.SerializerMethodField()
    is_search_expired      = serializers.SerializerMethodField()
    quote                  = serializers.SerializerMethodField()
    quotation_history      = serializers.SerializerMethodField()

    def get_estimation(self, obj):
        if hasattr(obj, "estimation") and obj.estimation is not None:
            return EstimationSummarySerializer(obj.estimation, context=self.context).data
        return None

    def _quote_maps(self):
        cached = getattr(self, "_quote_maps_cache", None)
        if cached is not None:
            return cached

        holder = self.parent if isinstance(self.parent, serializers.ListSerializer) else self
        source = getattr(holder, "instance", None)
        if source is None:
            items = []
        elif isinstance(source, (list, tuple)):
            items = list(source)
        elif hasattr(source, "__iter__"):
            items = list(source)
        else:
            items = [source]

        active_map = {}
        history_map = {}

        if not items:
            self._quote_maps_cache = (active_map, history_map)
            return self._quote_maps_cache

        from workforce_integration.services import WorkforceIntegrationService
        candidate_job_ids = []
        candidate_quote_numbers = []
        for o in items:
            if not (o.service_category or "").startswith("goods_transport") and (o.service_category or "") != "packers_movers":
                if getattr(o, "id", None):
                    candidate_job_ids.append(o.id)
                if getattr(o, "workforce_job_id", None):
                    wf = str(o.workforce_job_id).replace("WF-", "").replace("WFJ-", "")
                    if wf.isdigit():
                        candidate_job_ids.append(int(wf))
                if getattr(o, "request_id", None):
                    candidate_quote_numbers.append(str(o.request_id))

        if candidate_job_ids or candidate_quote_numbers:
            try:
                from django.db import connection
                with connection.cursor() as cursor:
                    job_in = ",".join(["%s"] * len(candidate_job_ids)) if candidate_job_ids else "-1"
                    quote_in = ",".join(["%s"] * len(candidate_quote_numbers)) if candidate_quote_numbers else "''"
                    sql = f"""
                        SELECT id, job_id, quote_number, status 
                        FROM workforce_quote 
                        WHERE job_id IN ({job_in}) 
                           OR quote_number IN ({quote_in})
                        ORDER BY id ASC
                    """
                    params = (candidate_job_ids or []) + (candidate_quote_numbers or [])
                    cursor.execute(sql, params)
                    rows = cursor.fetchall()

                    priority = {
                        "CUSTOMER_ACCEPTED": 1,
                        "APPROVED": 1,
                        "CONVERTED": 1,
                        "ADMIN_APPROVED": 1,
                        "SENT_TO_CUSTOMER": 2,
                        "SENT": 2,
                        "CHANGES_REQUESTED": 3,
                        "CHANGE_REQUESTED": 3,
                        "DECLINED": 4,
                        "DRAFT": 5,
                        "SUPERSEDED": 6,
                        "CANCELLED": 7,
                    }
                    for r in rows:
                        qid, jid, qnum, st = r[0], r[1], r[2], r[3]
                        q_dict = WorkforceIntegrationService._build_quote_dict_from_db(qid)
                        if not q_dict:
                            continue

                        for k in [str(jid), qnum, str(qnum).split('-V')[0]]:
                            if k:
                                if k not in history_map:
                                    history_map[k] = []
                                history_map[k].append(q_dict)

                                cur_active = active_map.get(k)
                                if not cur_active:
                                    active_map[k] = q_dict
                                else:
                                    cur_st = str(cur_active.get("status") or "").upper()
                                    new_st = str(st or "").upper()
                                    cur_p = priority.get(cur_st, 9)
                                    new_p = priority.get(new_st, 9)
                                    cur_id = int(cur_active.get("id") or cur_active.get("quote_id") or 0)
                                    if new_p < cur_p or (new_p == cur_p and qid >= cur_id):
                                        active_map[k] = q_dict
            except Exception as e:
                import logging
                logging.getLogger(__name__).debug(f"Batch quote lookup failed: {e}")

        self._quote_maps_cache = (active_map, history_map)
        return self._quote_maps_cache

    def get_quote(self, obj):
        active_map, _ = self._quote_maps()
        for k in [str(obj.id), str(obj.request_id), getattr(obj, "workforce_job_id", None)]:
            if k and str(k) in active_map:
                candidate = active_map[str(k)]
                if isinstance(candidate, dict) and candidate.get("has_quote") is not False:
                    if candidate.get("quote_number") or candidate.get("id") or candidate.get("quote_id") or candidate.get("items"):
                        return candidate
        return None

    def get_quotation_history(self, obj):
        _, history_map = self._quote_maps()
        for k in [str(obj.id), str(obj.request_id), getattr(obj, "workforce_job_id", None)]:
            if k and str(k) in history_map:
                return history_map[str(k)]
        return []

    class Meta:
        model = ServiceRequest
        fields = (
            "id", "request_id", "customer_id", "customer_user_id", "customer_name", "phone", "email",
            "service_category", "service_category_display",
            "issue_title", "description", "address", "preferred_date", "preferred_time",
            "status", "status_display", "priority", "priority_display",
            "payment_method", "payment_method_display",
            "payment_status", "payment_status_display",
            # discount_amount exposed so the frontend can show a real coupon
            # discount line and stop assuming it's always 0 (it was never in
            # this list before, even though ServiceRequest.discount_amount is
            # a real, populated field once a coupon is applied at booking).
            "total_amount", "base_amount", "extension_amount", "discount_amount", "cart_data", "fare_breakdown", "transaction_id", "invoice_id",
            "technician", "technician_name", "technician_phone", "technician_photo", "technician_rating",
            "workforce_job_id", "external_assignment_id",
            "start_otp", "payment_confirmation_otp", "tracking_token", "active_extension", "latest_reschedule", "available_actions", "created_at", "updated_at",
            "parent_request", "request_kind", "catalog_service_id", "quote_number", "child_requests",
            "job_type", "estimation", "quote", "quotation_history",
            # GT-C-03: so the customer-facing bookings list can tell which
            # completed bookings are eligible to file an insurance claim
            # against, without a second per-booking API call.
            "insurance_opted_in", "insurance_liability_cap",
            "is_search_expired", "cancellation_reason", "cancellation_note", "cancelled_at",
        )

    def get_is_search_expired(self, obj):
        if (
            str(getattr(obj, "cancellation_reason", "") or "").lower() == "search_expired"
            or "search window expired" in str(getattr(obj, "cancellation_note", "") or "").lower()
            or "search window expired" in str(getattr(obj, "cancellation_reason", "") or "").lower()
        ):
            return True
        from service_requests.services.logistics_pricing import LOGISTICS_CATEGORIES
        from datetime import timedelta
        import django.utils.timezone as django_timezone
        is_logistics = (
            obj.service_category in LOGISTICS_CATEGORIES
            or str(obj.service_category or "").startswith("goods_")
            or "truck" in str(obj.service_category or "").lower()
            or "two_wheeler" in str(obj.service_category or "").lower()
        )
        if (
            is_logistics
            and obj.status in [ServiceRequest.Status.UNASSIGNED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.DRAFT]
            and not getattr(obj, "assigned_employee_id", None)
        ):
            if obj.created_at and obj.created_at < (django_timezone.now() - timedelta(minutes=10)):
                return True
        return False

    def get_child_requests(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "child_requests" in obj._prefetched_objects_cache:
            children = list(obj.child_requests.all())
        else:
            children = list(obj.child_requests.all().order_by("created_at"))
        if children:
            return ServiceRequestListSerializer(children, many=True, context=self.context).data
        return []

    def get_payment_confirmation_otp(self, obj):
        if getattr(obj, "payment_status", None) not in ("cash_pending", "pending", "cash_collected"):
            return None
        try:
            import re
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT message FROM workforce_notification "
                    "WHERE related_object_id = %s "
                    "AND notification_type = 'PAYMENT_CONFIRMATION_OTP' "
                    "ORDER BY created_at DESC LIMIT 1;",
                    [str(obj.id)],
                )
                row = cursor.fetchone()
                if row and row[0]:
                    m = re.search(r'OTP\s+([0-9]{6})', row[0])
                    if m:
                        return m.group(1)
        except Exception:
            pass
        return None

    def get_customer_id(self, obj):
        try:
            if obj.customer and hasattr(obj.customer, "customer_id"):
                return obj.customer.customer_id
        except Exception:
            pass
        return None

    def _is_staff(self):
        request = self.context.get("request")
        return bool(
            request and request.user and request.user.is_authenticated and
            (getattr(request.user, "is_staff", False) or getattr(request.user, "role", "") in ["admin", "staff", "manager", "employee", "vendor"])
        )

    def _get_cached_assignment(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "assignments" in obj._prefetched_objects_cache:
            assignments = list(obj.assignments.all())
            return assignments[0] if assignments else None
        if hasattr(obj, "assignments"):
            return obj.assignments.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id").first()
        return None

    def get_technician_name(self, obj):
        if not self._is_staff() and obj.status in ["confirmed", "new_request", "assigned"]:
            return ""
        if obj.technician_name:
            return obj.technician_name
        assigned_emp = getattr(obj, "assigned_employee", None)
        if assigned_emp:
            return getattr(assigned_emp, "full_name", None) or (assigned_emp.user.get_full_name() if getattr(assigned_emp, "user", None) else None) or ""
        assignment = self._get_cached_assignment(obj)
        if assignment:
            return assignment.technician_name or ""
        return ""

    def get_technician_phone(self, obj):
        if not self._is_staff() and obj.status in ["confirmed", "new_request", "assigned"]:
            return ""
        if obj.technician_phone:
            return obj.technician_phone
        assigned_emp = getattr(obj, "assigned_employee", None)
        if assigned_emp:
            if getattr(assigned_emp, "phone", None):
                return assigned_emp.phone
            if getattr(assigned_emp, "user", None) and getattr(assigned_emp.user, "phone", None):
                return assigned_emp.user.phone
        assignment = self._get_cached_assignment(obj)
        if assignment:
            return assignment.technician_phone or ""
        return ""

    def get_technician_photo(self, obj):
        if not self._is_staff() and obj.status in ["confirmed", "new_request", "assigned"]:
            return ""
        if obj.technician_photo:
            return obj.technician_photo
        assigned_emp = getattr(obj, "assigned_employee", None)
        if assigned_emp and getattr(assigned_emp, "photo", None):
            return assigned_emp.photo
        assignment = self._get_cached_assignment(obj)
        if assignment:
            return assignment.technician_photo or ""
        return ""

    def get_technician_rating(self, obj):
        if not self._is_staff() and obj.status in ["confirmed", "new_request", "assigned"]:
            return None
        if obj.technician_rating:
            return float(obj.technician_rating)
        assigned_emp = getattr(obj, "assigned_employee", None)
        if assigned_emp and getattr(assigned_emp, "rating", None):
            return float(assigned_emp.rating)
        assignment = self._get_cached_assignment(obj)
        if assignment and assignment.technician_rating is not None:
            return float(assignment.technician_rating)
        return None

    def get_payment_confirmation_otp(self, obj):
        if getattr(obj, "payment_status", None) not in ("cash_pending", "pending", "cash_collected"):
            return None
        try:
            import re
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT message FROM workforce_notification "
                    "WHERE related_object_id = %s "
                    "AND notification_type = 'PAYMENT_CONFIRMATION_OTP' "
                    "ORDER BY created_at DESC LIMIT 1;",
                    [str(obj.id)],
                )
                row = cursor.fetchone()
                if row and row[0]:
                    m = re.search(r'OTP\s+([0-9]{6})', row[0])
                    if m:
                        return m.group(1)
        except Exception:
            pass
        return None

    def get_technician(self, obj):
        if not self._is_staff() and obj.status in ["confirmed", "new_request", "assigned", "cancelled", "rejected"]:
            return None
        name = self.get_technician_name(obj)
        if name:
            veh_num = ""
            assigned_emp = getattr(obj, "assigned_employee", None)
            if assigned_emp and hasattr(assigned_emp, "vehicles"):
                try:
                    veh = assigned_emp.vehicles.filter(is_active=True).first()
                    if veh:
                        veh_num = veh.registration_number or ""
                except Exception:
                    pass
            return {
                "name": name,
                "phone": self.get_technician_phone(obj) or "",
                "photo": self.get_technician_photo(obj) or None,
                "rating": self.get_technician_rating(obj),
                "latitude": float(obj.technician_latitude) if obj.technician_latitude is not None else None,
                "longitude": float(obj.technician_longitude) if obj.technician_longitude is not None else None,
                "location_name": obj.technician_location_name or "",
                "vehicle_number": veh_num,
                "last_seen_at": obj.updated_at.isoformat() if getattr(obj, "updated_at", None) else None,
                "workforce_job_id": obj.workforce_job_id or obj.external_assignment_id or "",
            }
        return None

    def get_available_actions(self, obj):
        from .services import get_customer_available_actions
        return get_customer_available_actions(obj)

    def get_latest_reschedule(self, obj):
        if hasattr(obj, "_prefetched_objects_cache") and "reschedule_requests" in obj._prefetched_objects_cache:
            rrs = list(obj.reschedule_requests.all())
            last_rr = rrs[0] if rrs else None
        else:
            rr = getattr(obj, "reschedule_requests", None)
            if not rr:
                return None
            last_rr = rr.order_by("-id").first()
        if not last_rr:
            return None
        return {
            "id": last_rr.id,
            "status": last_rr.status,
            "new_date": str(last_rr.new_date) if last_rr.new_date else None,
            "new_time_slot": last_rr.new_time_slot or "",
        }

    def get_tracking_token(self, obj):
        if not obj.tracking_token:
            import uuid
            token = uuid.uuid4().hex
            obj.tracking_token = token
            ServiceRequest.objects.filter(id=obj.id).update(tracking_token=token)
        return str(obj.tracking_token)

    def get_start_otp(self, obj):
        if obj.status in ["cancelled", "rejected"]:
            return None
        if not obj.start_otp:
            # Fixes EC-01: this used to derive the code deterministically from
            # obj.id/obj.created_at (both knowable to anyone with API access to
            # the job), which made it forgeable. Now uses the same
            # cryptographically random generator as ServiceRequest.save().
            obj.start_otp = _generate_secure_start_otp()
            ServiceRequest.objects.filter(id=obj.id).update(start_otp=obj.start_otp)
        return str(obj.start_otp)

    def _payment_otp_map(self):
        """
        Payment-confirmation OTPs for every booking on this page, in ONE
        query.

        This used to run a raw per-object SELECT against the vendor app's
        workforce_notification table inside get_payment_confirmation_otp,
        which made every customer list endpoint scale linearly with the
        number of bookings returned -- one extra query per row, exactly
        the N+1 the query-regression tests exist to catch.

        Built once per serializer instance and cached. Falls back to an
        empty map on any error, which simply yields no OTP -- the same
        outcome the previous per-row try/except produced.
        """
        cached = getattr(self, "_otp_map_cache", None)
        if cached is not None:
            return cached

        # With many=True this child serializer hangs off a ListSerializer
        # that holds the full queryset; alone, it holds its own instance.
        holder = self.parent if isinstance(self.parent, serializers.ListSerializer) else self
        source = getattr(holder, "instance", None)
        if source is None:
            items = []
        elif isinstance(source, (list, tuple)):
            items = list(source)
        elif hasattr(source, "__iter__"):
            items = list(source)
        else:
            items = [source]

        ids = []
        req_id_to_id = {}
        for o in items:
            if getattr(o, "id", None) is not None and getattr(o, "status", None) not in ["cancelled", "rejected"]:
                sid = str(o.id)
                ids.append(sid)
                rid = getattr(o, "request_id", None)
                if rid:
                    s_rid = str(rid)
                    ids.append(s_rid)
                    req_id_to_id[s_rid] = sid

        otp_map = {}
        if ids:
            try:
                import re
                from django.db import connection
                placeholders = ",".join(["%s"] * len(ids))
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT related_object_id, message FROM workforce_notification "
                        "WHERE related_object_id IN (%s) "
                        "AND notification_type = 'PAYMENT_CONFIRMATION_OTP' "
                        "ORDER BY created_at ASC;" % placeholders,
                        ids,
                    )
                    for related_id, message in cursor.fetchall():
                        if not message:
                            continue
                        m = re.search(r'OTP\s+([0-9]{6})', message)
                        if m:
                            code = m.group(1)
                            # Ascending order means the last row for an id
                            # wins, matching the previous "most recent" query.
                            otp_map[str(related_id)] = code
                            if str(related_id) in req_id_to_id:
                                otp_map[req_id_to_id[str(related_id)]] = code
            except Exception:
                otp_map = {}

        self._otp_map_cache = otp_map
        return otp_map

    def get_payment_confirmation_otp(self, obj):
        if obj.status in ["cancelled", "rejected"]:
            return None
        return self._payment_otp_map().get(str(obj.id))

    def get_extension_amount(self, obj):
        try:
            if hasattr(obj, "_prefetched_objects_cache") and "work_extensions" in obj._prefetched_objects_cache:
                exts = list(obj.work_extensions.all())
            else:
                exts = [e for e in getattr(obj, "work_extensions", []).all()] if hasattr(obj, "work_extensions") else []
            if exts:
                ext = exts[0]
                amt = float(ext.admin_approved_amount or ext.technician_estimate or 0)
                if amt > 0:
                    return amt
        except Exception:
            pass
        return 0.0

    def get_base_amount(self, obj):
        # Bug found: this used to sum raw cart_data item prices (name/price/
        # quantity only, no tax or fee) whenever cart_data was non-empty --
        # i.e. for essentially every real booking -- and only fell back to
        # obj.total_amount when cart_data was missing entirely. But
        # total_amount is the authoritative, already GST- and platform-fee-
        # inclusive figure captured at booking creation (and, since the
        # coupon-persistence fix, discount-inclusive too); cart_data's item
        # prices never carried those on top. That made this "total_amount"
        # API field understate what the customer was actually charged on
        # every booking with a non-empty cart, which is why a compensating
        # (and separately buggy) client-side recompute existed in
        # BookingPage.jsx. Prefer the authoritative total_amount; only fall
        # back to summing cart_data if total_amount is genuinely unset.
        if obj.total_amount:
            return float(obj.total_amount)
        try:
            cart = obj.cart_data
            if cart:
                if isinstance(cart, str):
                    import json
                    cart = json.loads(cart)
                if isinstance(cart, list) and len(cart) > 0:
                    return sum(float(i.get("price", 0)) * int(i.get("quantity", 1)) for i in cart)
        except Exception:
            pass
        return 599.0

    def get_total_amount(self, obj):
        base = self.get_base_amount(obj)
        ext = self.get_extension_amount(obj)
        return base + ext

    def get_active_extension(self, obj):
        try:
            if hasattr(obj, "_prefetched_objects_cache") and "work_extensions" in obj._prefetched_objects_cache:
                exts = [
                    e for e in obj.work_extensions.all()
                    if e.status not in [WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.CUSTOMER_DECLINED, WorkExtension.Status.RESOLVED]
                ]
            else:
                exts = [
                    e for e in getattr(obj, "work_extensions", []).all()
                    if e.status not in [WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.CUSTOMER_DECLINED, WorkExtension.Status.RESOLVED]
                ] if hasattr(obj, "work_extensions") else []
            ext = exts[0] if exts else None
            if ext:
                return {
                    "id": ext.id,
                    "status": ext.status,
                    "status_display": ext.get_status_display(),
                    "reason": ext.decision_notes or "Additional scope or replacement parts required.",
                    "technician_estimate": float(ext.technician_estimate or 0),
                    "admin_approved_amount": float(ext.admin_approved_amount or 0),
                    "decision_token": str(ext.decision_token),
                    "requires_specialist": ext.requires_specialist,
                    "required_skill": ext.required_skill or "",
                }
        except Exception:
            pass
        return None


class ServiceRequestDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for ServiceRequest."""
    service_category_display = serializers.CharField(
        source="get_service_category_display", read_only=True
    )
    status_display         = serializers.CharField(source="get_status_display", read_only=True)
    priority_display       = serializers.CharField(source="get_priority_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    customer_id            = serializers.SerializerMethodField()
    customer_user_id       = serializers.IntegerField(source="customer.id", read_only=True)
    latest_reschedule      = serializers.SerializerMethodField()
    photo_url              = serializers.SerializerMethodField()
    allowed_transitions    = serializers.SerializerMethodField()
    has_feedback           = serializers.SerializerMethodField()
    feedback_token         = serializers.SerializerMethodField()
    feedback               = ServiceFeedbackNestedSerializer(read_only=True, allow_null=True)
    start_otp              = serializers.SerializerMethodField()
    payment_confirmation_otp = serializers.SerializerMethodField()
    active_extension       = serializers.SerializerMethodField()
    extension_amount       = serializers.SerializerMethodField()
    base_amount            = serializers.SerializerMethodField()
    total_amount           = serializers.SerializerMethodField()
    available_actions      = serializers.SerializerMethodField()
    technician             = serializers.SerializerMethodField()
    is_search_expired      = serializers.SerializerMethodField()

    job_type               = serializers.CharField(read_only=True)
    estimation             = serializers.SerializerMethodField()
    customer_inspection    = serializers.SerializerMethodField()

    def get_estimation(self, obj):
        if hasattr(obj, "estimation") and obj.estimation is not None:
            return EstimationSerializer(obj.estimation, context=self.context).data
        return None

    def get_customer_inspection(self, obj):
        from service_requests.services.customer_inspection_service import CustomerInspectionService
        return CustomerInspectionService.get_booking_inspection_snapshot(obj)

    class Meta:
        model = ServiceRequest
        fields = (
            "id", "request_id", "customer_id", "customer_user_id", "customer_name", "phone", "email",
            "service_category", "service_category_display",
            "issue_title", "description", "address", "latitude", "longitude", "preferred_date", "preferred_time",
            # discount_amount exposed for the same reason as in
            # ServiceRequestListSerializer -- see comment there.
            "total_amount", "base_amount", "extension_amount", "discount_amount", "cart_data", "fare_breakdown",
            "payment_method", "payment_method_display",
            "payment_status", "payment_status_display",
            "transaction_id", "payment_gateway",
            "payment_collected_by_name", "collection_method", "collection_reference", "payment_collected_at", "invoice_id",
            "photo_url", "status", "status_display", "priority", "priority_display",
            "technician", "workforce_job_id", "external_assignment_id",
            "logistics_leg", "logistics_leg_updated_at",
            "start_otp", "payment_confirmation_otp", "active_extension", "latest_reschedule", "allowed_transitions", "available_actions",
            "has_feedback", "feedback_token", "feedback",
            "job_type", "request_kind", "catalog_service_id", "quote_number", "parent_request", "estimation", "customer_inspection",
            "created_at", "updated_at",
            "is_search_expired", "cancellation_reason", "cancellation_note", "cancelled_at",
        )

    def get_payment_confirmation_otp(self, obj):
        if getattr(obj, "payment_status", None) not in ("cash_pending", "pending", "cash_collected"):
            return None
        try:
            import re
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT message FROM workforce_notification "
                    "WHERE related_object_id = %s "
                    "AND notification_type = 'PAYMENT_CONFIRMATION_OTP' "
                    "ORDER BY created_at DESC LIMIT 1;",
                    [str(obj.id)],
                )
                row = cursor.fetchone()
                if row and row[0]:
                    m = re.search(r'OTP\s+([0-9]{6})', row[0])
                    if m:
                        return m.group(1)
        except Exception:
            pass
        return None

    def get_is_search_expired(self, obj):
        if (
            str(getattr(obj, "cancellation_reason", "") or "").lower() == "search_expired"
            or "search window expired" in str(getattr(obj, "cancellation_note", "") or "").lower()
            or "search window expired" in str(getattr(obj, "cancellation_reason", "") or "").lower()
        ):
            return True
        from service_requests.services.logistics_pricing import LOGISTICS_CATEGORIES
        from datetime import timedelta
        import django.utils.timezone as django_timezone
        is_logistics = (
            obj.service_category in LOGISTICS_CATEGORIES
            or str(obj.service_category or "").startswith("goods_")
            or "truck" in str(obj.service_category or "").lower()
            or "two_wheeler" in str(obj.service_category or "").lower()
        )
        if (
            is_logistics
            and obj.status in [ServiceRequest.Status.UNASSIGNED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.DRAFT]
            and not getattr(obj, "assigned_employee_id", None)
        ):
            if obj.created_at and obj.created_at < (django_timezone.now() - timedelta(minutes=10)):
                return True
        return False

    def get_customer_id(self, obj):
        try:
            if obj.customer and hasattr(obj.customer, "customer_id"):
                return obj.customer.customer_id
        except Exception:
            pass
        return None

    def get_technician(self, obj):
        name = obj.technician_name
        phone = obj.technician_phone
        photo = obj.technician_photo
        rating = float(obj.technician_rating) if obj.technician_rating else None
        job_id = obj.workforce_job_id or obj.external_assignment_id

        if not name and getattr(obj, "assigned_employee", None):
            emp = obj.assigned_employee
            name = getattr(emp, "full_name", None) or (emp.user.get_full_name() if getattr(emp, "user", None) else "")
            phone = getattr(emp, "phone", "") or phone
            photo = getattr(emp, "photo", "") or photo
            emp_rating = getattr(emp, "rating", None)
            if emp_rating is not None:
                try:
                    rating = float(emp_rating)
                except (ValueError, TypeError):
                    pass

        if not name and hasattr(obj, "assignments"):
            assignment = obj.assignments.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id").first()
            if assignment:
                name = assignment.technician_name
                phone = assignment.technician_phone or phone
                photo = assignment.technician_photo or photo
                rating = float(assignment.technician_rating) if assignment.technician_rating else rating
                job_id = assignment.workforce_job_id or job_id

        if name or job_id:
            return {
                "name": name,
                "phone": phone,
                "photo": photo,
                "rating": rating,
                "workforce_job_id": job_id,
            }
        return None

    def get_available_actions(self, obj):
        from .services import get_customer_available_actions
        return get_customer_available_actions(obj)

    def get_latest_reschedule(self, obj):
        rr = getattr(obj, "reschedule_requests", None)
        if not rr:
            return None
        last_rr = rr.order_by("-id").first()
        if not last_rr:
            return None
        return {
            "id": last_rr.id,
            "status": last_rr.status,
            "new_date": str(last_rr.new_date) if last_rr.new_date else None,
            "new_time_slot": last_rr.new_time_slot or "",
        }

    def get_start_otp(self, obj):
        request = self.context.get("request")
        if not request or not request.user or not request.user.is_authenticated:
            return None
        is_owner = bool(
            (obj.customer_id and obj.customer_id == request.user.id) or
            (getattr(request.user, "phone", None) and obj.phone and str(request.user.phone).strip() == str(obj.phone).strip()) or
            (getattr(request.user, "email", None) and obj.email and str(request.user.email).strip().lower() == str(obj.email).strip().lower())
        )
        from accounts.permissions import is_admin_role
        if not (is_owner or is_admin_role(request.user)):
            return None
        if obj.status in ["completed", "closed", "cancelled", "rejected", "feedback_pending", "feedback_received"]:
            return None
        return obj.start_otp or None

    def get_active_extension(self, obj):
        try:
            ext = obj.work_extensions.exclude(
                status__in=[WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.CUSTOMER_DECLINED, WorkExtension.Status.RESOLVED]
            ).order_by("-id").first()
            if ext:
                return {
                    "id": ext.id,
                    "status": ext.status,
                    "status_display": ext.get_status_display(),
                    "reason": ext.decision_notes or "Technician identified additional repair scope or required replacement parts.",
                    "technician_estimate": float(ext.technician_estimate or 0),
                    "admin_approved_amount": float(ext.admin_approved_amount or 0),
                    "decision_token": str(ext.decision_token),
                    "requires_specialist": ext.requires_specialist,
                    "required_skill": ext.required_skill or "",
                }
        except Exception:
            pass
        return None

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_allowed_transitions(self, obj):
        from .state_machine import get_allowed_transitions
        return get_allowed_transitions(obj)

    def get_has_feedback(self, obj):
        return hasattr(obj, "feedback")

    def get_feedback_token(self, obj):
        try:
            return str(obj.feedback.feedback_token)
        except Exception:
            return None

    def get_extension_amount(self, obj):
        try:
            ext = obj.work_extensions.all().order_by("-id").first()
            if ext:
                amt = float(ext.admin_approved_amount or ext.technician_estimate or 0)
                if amt > 0:
                    return amt
        except Exception:
            pass
        return 0.0

    def get_base_amount(self, obj):
        # Bug found: this used to sum raw cart_data item prices (name/price/
        # quantity only, no tax or fee) whenever cart_data was non-empty --
        # i.e. for essentially every real booking -- and only fell back to
        # obj.total_amount when cart_data was missing entirely. But
        # total_amount is the authoritative, already GST- and platform-fee-
        # inclusive figure captured at booking creation (and, since the
        # coupon-persistence fix, discount-inclusive too); cart_data's item
        # prices never carried those on top. That made this "total_amount"
        # API field understate what the customer was actually charged on
        # every booking with a non-empty cart, which is why a compensating
        # (and separately buggy) client-side recompute existed in
        # BookingPage.jsx. Prefer the authoritative total_amount; only fall
        # back to summing cart_data if total_amount is genuinely unset.
        if obj.total_amount:
            return float(obj.total_amount)
        try:
            cart = obj.cart_data
            if cart:
                if isinstance(cart, str):
                    import json
                    cart = json.loads(cart)
                if isinstance(cart, list) and len(cart) > 0:
                    return sum(float(i.get("price", 0)) * int(i.get("quantity", 1)) for i in cart)
        except Exception:
            pass
        return 599.0

    def get_total_amount(self, obj):
        base = self.get_base_amount(obj)
        ext = self.get_extension_amount(obj)
        return base + ext


class AdminChangePrioritySerializer(serializers.Serializer):
    priority = serializers.ChoiceField(choices=ServiceRequest.Priority.choices)


class ServiceFeedbackAdminSerializer(serializers.ModelSerializer):
    request_id       = serializers.CharField(source="service_request.request_id", read_only=True)
    customer_name    = serializers.CharField(source="service_request.customer_name", read_only=True)
    issue_title      = serializers.CharField(source="service_request.issue_title", read_only=True)
    service_category = serializers.CharField(source="service_request.get_service_category_display", read_only=True)
    technician_name  = serializers.CharField(source="service_request.technician_name", read_only=True)

    class Meta:
        model = ServiceFeedback
        fields = (
            "id", "request_id", "customer_name", "issue_title", "service_category",
            "technician_name", "rating", "employee_behaviour", "work_quality",
            "issue_resolved", "comment", "submitted_at",
        )


# ── Work Extension Ecosystem ──────────────────────────────────────────

class WorkExtensionItemSerializer(serializers.ModelSerializer):
    fulfillment_source_display = serializers.CharField(source="get_fulfillment_source_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WorkExtensionItem
        fields = (
            "id", "extension", "item_name", "quantity",
            "fulfillment_source", "fulfillment_source_display", "status", "status_display",
            "billed_to_customer", "actual_cost", "technician_reimbursement_amount",
            "technician_purchase_approved_limit", "purchase_approved_by", "purchase_receipt",
            "verified_by_tech", "verification_notes", "warranty_covered", "created_at",
        )
        read_only_fields = ("id", "created_at")


class WorkExtensionSerializer(serializers.ModelSerializer):
    items = WorkExtensionItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = WorkExtension
        fields = (
            "id", "service_request", "workforce_job_id", "reported_by_name",
            "requires_specialist", "required_skill", "status", "status_display",
            "technician_estimate", "admin_approved_amount", "final_customer_amount",
            "decision_token", "token_expires_at", "decision_channel", "decision_notes",
            "decision_timestamp", "items", "created_at", "updated_at",
        )
        read_only_fields = ("id", "decision_token", "created_at", "updated_at")


class JobRescheduleSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source="get_reason_display", read_only=True)

    class Meta:
        model = JobReschedule
        fields = (
            "id", "service_request", "old_date", "new_date", "reason", "reason_display",
            "notes", "changed_by", "customer_notified_at", "customer_confirmed_at",
            "delay_count", "support_callback_created", "created_at",
        )
        read_only_fields = ("id", "created_at")


class SupplementalInvoiceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SupplementalInvoice
        fields = (
            "id", "service_request", "work_extension", "invoice_number",
            "amount", "status", "status_display", "payment_method",
            "transaction_id", "created_at", "paid_at",
        )
        read_only_fields = ("id", "created_at")


# ── Reschedule ─────────────────────────────────────────────────────────────────

class RescheduleAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RescheduleAttachment
        fields = ("id", "file", "original_name", "uploaded_at")


class RescheduleSuggestedSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = RescheduleSuggestedSlot
        fields = ("id", "date", "time_slot", "is_selected", "created_at")


class RescheduleStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RescheduleStatusHistory
        fields = ("id", "from_status", "to_status", "changed_by", "changed_by_name", "note", "created_at")

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return "System"


class RescheduleRequestSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceRequest.objects.all(), source="booking", write_only=True
    )
    reschedule_id = serializers.CharField(read_only=True)
    request_id = serializers.CharField(source="booking.request_id", read_only=True)
    issue_title = serializers.CharField(source="booking.issue_title", read_only=True)
    customer_name = serializers.CharField(source="booking.customer_name", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    admin_reviewed_by_name = serializers.SerializerMethodField()
    attachment = RescheduleAttachmentSerializer(read_only=True)
    suggested_slots = RescheduleSuggestedSlotSerializer(many=True, read_only=True)
    history = RescheduleStatusHistorySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RescheduleRequest
        fields = (
            "id", "reschedule_id", "booking_id", "request_id", "issue_title", "customer_name",
            "requested_by", "requested_by_name", "persona",
            "current_date", "current_time",
            "new_date", "new_time_slot", "approved_date", "approved_time", "reason", "additional_notes",
            "attachment", "status", "status_display",
            "suggested_date", "suggested_time_slot", "suggested_slots",
            "customer_response", "admin_remarks",
            "rejection_reason", "rejection_notes",
            "admin_reviewed_by", "admin_reviewed_by_name",
            "history", "review_notes", "reviewed_at", "created_at", "updated_at",
        )

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return "Unknown"

    def get_admin_reviewed_by_name(self, obj):
        if obj.admin_reviewed_by:
            return obj.admin_reviewed_by.get_full_name() or obj.admin_reviewed_by.username
        return None


class AdminRescheduleListSerializer(serializers.ModelSerializer):
    """Admin view of a reschedule request."""
    reschedule_id           = serializers.CharField(read_only=True)
    booking_request_id      = serializers.CharField(source="booking.request_id", read_only=True)
    customer_name           = serializers.CharField(source="booking.customer_name", read_only=True)
    customer_email          = serializers.SerializerMethodField()
    service                 = serializers.CharField(source="booking.issue_title", read_only=True)
    service_category        = serializers.CharField(source="booking.service_category", read_only=True)
    previous_date           = serializers.DateField(source="current_date", read_only=True)
    previous_slot           = serializers.CharField(source="current_time", read_only=True)
    requested_date          = serializers.DateField(source="new_date", read_only=True)
    requested_slot          = serializers.CharField(source="new_time_slot", read_only=True)
    status_display          = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name       = serializers.SerializerMethodField()
    admin_reviewed_by_name  = serializers.SerializerMethodField()
    rejection_reason_display = serializers.SerializerMethodField()

    class Meta:
        model = RescheduleRequest
        fields = (
            "id", "reschedule_id",
            "booking_request_id", "customer_name", "customer_email",
            "service", "service_category",
            "previous_date", "previous_slot", "requested_date", "requested_slot",
            "reason", "additional_notes",
            "status", "status_display",
            "suggested_date", "suggested_time_slot",
            "rejection_reason", "rejection_reason_display", "rejection_notes",
            "admin_reviewed_by_name",
            "requested_by_name", "review_notes", "reviewed_at", "created_at", "updated_at",
        )

    def get_customer_email(self, obj):
        try:
            return obj.requested_by.email or obj.booking.email
        except Exception:
            return None

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return "Customer"

    def get_admin_reviewed_by_name(self, obj):
        if obj.admin_reviewed_by:
            return obj.admin_reviewed_by.get_full_name() or obj.admin_reviewed_by.username
        return None

    def get_rejection_reason_display(self, obj):
        if obj.rejection_reason:
            return obj.get_rejection_reason_display()
        return None


# ── Refund Serializers ────────────────────────────────────────────────────────

class RefundEvidenceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RefundEvidence
        fields = ("id", "file", "uploaded_by", "uploaded_by_name", "uploaded_at")

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.username
        return "System"


class CustomerRefundRequestSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(source="booking", read_only=True)
    booking_request_id = serializers.CharField(source="booking.request_id", read_only=True)
    service_name = serializers.CharField(source="booking.issue_title", read_only=True)
    evidence = RefundEvidenceSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RefundRequest
        fields = (
            "id", "refund_id", "booking_id", "booking_request_id", "service_name",
            "paid_amount", "refund_type", "requested_amount", "approved_amount",
            "reason", "additional_notes", "status", "status_display",
            "info_requested_from", "evidence", "created_at", "updated_at"
        )


class InsuranceClaimAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = InsuranceClaimAttachment
        fields = ("id", "file", "original_name", "uploaded_at")


class InsuranceClaimSerializer(serializers.ModelSerializer):
    booking_request_id = serializers.CharField(source="booking.request_id", read_only=True)
    liability_cap = serializers.DecimalField(source="booking.insurance_liability_cap", max_digits=10, decimal_places=2, read_only=True)
    attachments = InsuranceClaimAttachmentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = InsuranceClaim
        fields = (
            "id", "booking_request_id", "description", "claimed_amount",
            "approved_amount", "liability_cap", "attachments", "status",
            "status_display", "resolution_notes", "created_at", "resolved_at",
        )


class AdminRefundRequestSerializer(serializers.ModelSerializer):
    booking_id = serializers.PrimaryKeyRelatedField(source="booking", read_only=True)
    booking_request_id = serializers.CharField(source="booking.request_id", read_only=True)
    customer_name = serializers.CharField(source="customer.get_full_name", read_only=True)
    customer_email = serializers.CharField(source="customer.email", read_only=True)
    evidence = RefundEvidenceSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = RefundRequest
        fields = (
            "id", "refund_id", "booking_id", "booking_request_id",
            "customer_name", "customer_email", "paid_amount", "refund_type",
            "requested_amount", "approved_amount", "reason", "additional_notes",
            "internal_notes", "status", "status_display", "info_requested_from",
            "gateway_reference", "evidence", "created_at", "updated_at"
        )


class TripStopSerializer(serializers.ModelSerializer):
    """GT-D-02: read/write shape for one extra stop on a multi-stop
    logistics booking. Sequence is server-assigned (see set_trip_stops in
    services/__init__.py) so it's read-only here even on input -- clients
    submit ordering via list order, not this field."""
    class Meta:
        model = TripStop
        fields = (
            "id", "sequence", "stop_type", "address", "contact_name",
            "contact_phone", "latitude", "longitude", "notes", "created_at",
            # GT-D-01: per-stop progress. Read-only -- these are advanced by
            # the vendor app via the workforce webhook, never by a customer.
            "arrived_at", "completed_at",
        )
        read_only_fields = ("id", "sequence", "created_at", "arrived_at", "completed_at")


class DeliveryProofSerializer(serializers.ModelSerializer):
    """
    GT-D-01: customer-facing read shape for one proof-of-delivery artefact.

    Read-only by design: proofs are written by the vendor app through the
    authenticated workforce webhook, never submitted by a customer. The
    recipient's phone is deliberately NOT exposed here -- the customer
    already knows who they sent goods to, and echoing a third party's
    number back out of the API widens its exposure for no benefit (same
    reasoning as the technician phone masking in X-09).
    """
    proof_type_display = serializers.CharField(source="get_proof_type_display", read_only=True)

    class Meta:
        model = DeliveryProof
        fields = (
            "id", "stop", "proof_type", "proof_type_display", "image",
            "recipient_name", "notes", "captured_by_name",
            "latitude", "longitude", "captured_at",
        )
        read_only_fields = fields


class BookingSeriesSerializer(serializers.ModelSerializer):
    """HS-B-07: read shape for a customer's AMC series (list/detail).
    Creation goes through create_booking_series() (services/__init__.py),
    not this serializer's .save() -- see CustomerBookingSeriesListCreateView."""
    class Meta:
        model = BookingSeries
        fields = (
            "id", "service_category", "issue_title", "description", "address",
            "latitude", "longitude", "preferred_time", "total_amount",
            "frequency", "next_run_date", "status", "occurrences_generated",
            "last_generated_booking_id", "created_at", "updated_at",
        )
        read_only_fields = fields

class BookingMessageSerializer(serializers.ModelSerializer):
    """X-09: read/write shape for one in-app chat message on a booking.
    sender_persona/sender_name/sender_user are all server-assigned from
    the requesting user in the view (see CustomerBookingMessagesView) --
    read-only here even on input, so a client can never spoof who a
    message is "from"."""
    class Meta:
        model = BookingMessage
        fields = (
            "id", "sender_persona", "sender_name", "body", "created_at",
            "read_at_customer", "read_at_technician",
        )
        read_only_fields = ("id", "sender_persona", "sender_name", "created_at", "read_at_customer", "read_at_technician")


from service_requests.models import (
    VegetableRecipe,
    RecipeIngredient,
    VegetableRecommendation,
    PaintingRateCard,
    PaintingRateCardSlab,
    PaintingQuote,
    PaintingQuoteItem,
    PaintingMeasurement,
    PaintingMaterial,
    QuotePhoto,
)



class PaintingRateCardSlabSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaintingRateCardSlab
        fields = ("id", "slab_key", "rate", "unit", "is_active")


class PaintingRateCardSerializer(serializers.ModelSerializer):
    slabs = PaintingRateCardSlabSerializer(many=True, read_only=True)

    class Meta:
        model = PaintingRateCard
        fields = (
            "id", "category", "sub_service", "unit", "base_rate", "min_rate",
            "classification", "warranty", "inclusions", "exclusions",
            "is_active", "has_slabs", "slabs", "is_confirmed", "comments",
            "created_at", "updated_at"
        )


class PaintingQuoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaintingQuoteItem
        fields = (
            "id", "category", "description", "quantity", "unit", "base_rate",
            "proposed_rate", "discount", "final_rate", "amount",
            "classification", "included", "notes", "slab_key"
        )


class PaintingMeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaintingMeasurement
        fields = (
            "id", "area_name", "length", "width", "height",
            "calculated_area", "deductions", "final_area", "notes"
        )


class PaintingMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaintingMaterial
        fields = (
            "id", "brand", "product_name", "finish", "shade",
            "quantity", "unit", "rate", "amount"
        )


class QuotePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuotePhoto
        fields = ("id", "photo", "caption", "uploaded_at")


class PaintingQuoteSerializer(serializers.ModelSerializer):
    items = PaintingQuoteItemSerializer(many=True, read_only=True)
    measurements = PaintingMeasurementSerializer(many=True, read_only=True)
    materials = PaintingMaterialSerializer(many=True, read_only=True)
    photos = QuotePhotoSerializer(many=True, read_only=True)
    history = serializers.SerializerMethodField()

    class Meta:
        model = PaintingQuote
        fields = (
            "id", "quote_number", "quote_version", "status", "property_type",
            "total_paintable_area", "subtotal", "discount", "tax", "grand_total",
            "advance_amount", "balance_amount", "valid_until", "warranty",
            "customer_decision_token", "customer_notes", "decline_reason",
            "warranty_card", "warranty_certificate", "completion_certificate",
            "items", "measurements", "materials", "photos", "history", "created_at", "updated_at"
        )

    def get_history(self, obj):
        siblings = PaintingQuote.objects.filter(
            service_request=obj.service_request
        ).exclude(id=obj.id).order_by("-quote_version")
        return PaintingQuoteHistorySerializer(siblings, many=True).data


class PaintingQuoteHistorySerializer(serializers.ModelSerializer):
    items = PaintingQuoteItemSerializer(many=True, read_only=True)

    class Meta:
        model = PaintingQuote
        fields = (
            "id", "quote_number", "quote_version", "status", "grand_total",
            "valid_until", "items", "created_at"
        )


# ── Vegetable Recipes & Recommendations Serializers ──────────────────────────

class RecipeIngredientSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True, default="")
    package_price = serializers.DecimalField(source="package.base_price", max_digits=10, decimal_places=2, read_only=True, default=0)
    package_image = serializers.CharField(source="package.image", read_only=True, default="")
    package_unit = serializers.CharField(source="package.duration", read_only=True, default="")
    package_status = serializers.CharField(source="package.status", read_only=True, default="ACTIVE")

    class Meta:
        model = RecipeIngredient
        fields = [
            "id", "recipe", "package", "package_name", "package_price", "package_image",
            "package_unit", "package_status", "name", "quantity", "unit", "notes",
            "is_catalog_vegetable", "sort_order"
        ]


class VegetableRecipeListSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    package_image = serializers.CharField(source="package.image", read_only=True)
    ingredients_count = serializers.IntegerField(source="ingredients.count", read_only=True)

    class Meta:
        model = VegetableRecipe
        fields = [
            "id", "package", "package_name", "package_image", "name", "slug", "image",
            "short_description", "prep_time_minutes", "cook_time_minutes", "total_time_minutes",
            "difficulty", "servings", "calories", "is_active", "is_popular", "sort_order",
            "tags", "ingredients_count"
        ]


class VegetableRecipeDetailSerializer(serializers.ModelSerializer):
    package_name = serializers.CharField(source="package.name", read_only=True)
    package_image = serializers.CharField(source="package.image", read_only=True)
    ingredients = RecipeIngredientSerializer(many=True, read_only=True)

    class Meta:
        model = VegetableRecipe
        fields = [
            "id", "package", "package_name", "package_image", "name", "slug", "image",
            "short_description", "prep_time_minutes", "cook_time_minutes", "total_time_minutes",
            "difficulty", "servings", "calories", "protein", "carbohydrates", "fat", "fiber",
            "health_benefits", "health_tips", "instructions", "tags", "is_active", "is_popular",
            "sort_order", "ingredients", "created_at", "updated_at"
        ]


class VegetableRecommendationSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source_product.name", read_only=True)
    recommended_name = serializers.CharField(source="recommended_product.name", read_only=True)
    recommended_price = serializers.DecimalField(source="recommended_product.base_price", max_digits=10, decimal_places=2, read_only=True)
    recommended_offer_price = serializers.DecimalField(source="recommended_product.offer_price", max_digits=10, decimal_places=2, read_only=True, allow_null=True)
    recommended_unit = serializers.CharField(source="recommended_product.duration", read_only=True)
    recommended_image = serializers.CharField(source="recommended_product.image", read_only=True)
    recommended_status = serializers.CharField(source="recommended_product.status", read_only=True)

    class Meta:
        model = VegetableRecommendation
        fields = [
            "id", "source_product", "source_name", "recommended_product", "recommended_name",
            "recommended_price", "recommended_offer_price", "recommended_unit", "recommended_image",
            "recommended_status", "recommendation_type", "priority", "display_order", "is_active",
            "created_at", "updated_at"
        ]


# ==============================================================================
# AC INSPECTION / ESTIMATION SERIALIZERS (PHASE 2)
# ==============================================================================

class EstimationFeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimationFee
        fields = (
            "id", "amount", "currency", "status",
            "payment_reference", "payment_method",
            "collected_at", "waived_at", "waived_reason",
            "created_at", "updated_at",
        )


class InspectionPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionPhoto
        fields = ("id", "photo", "caption", "uploaded_by", "uploaded_at", "finding")


class InspectionFindingSerializer(serializers.ModelSerializer):
    service_id = serializers.IntegerField(source="service.id", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = InspectionFinding
        fields = (
            "id", "finding_type", "title", "diagnosis", "severity",
            "description", "recommended_action", "quantity", "unit",
            "service_id", "service_name", "created_at", "updated_at",
        )


class InspectionSerializer(serializers.ModelSerializer):
    findings = InspectionFindingSerializer(many=True, read_only=True)
    photos = InspectionPhotoSerializer(many=True, read_only=True)

    class Meta:
        model = Inspection
        fields = (
            "id", "status", "diagnosis", "notes",
            "technician_name", "technician_phone",
            "started_at", "completed_at", "created_at", "updated_at",
            "findings", "photos",
        )


class EstimationQuotationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimationQuotationItem
        fields = (
            "id", "catalog_service_id", "service_name", "category_name_snapshot", "item_name_snapshot",
            "description", "quantity", "unit", "unit_price", "unit_price_snapshot",
            "tax_rate", "tax_amount", "discount_amount", "line_total", "sort_order", "rate_item",
        )


class EstimationQuotationSerializer(serializers.ModelSerializer):
    items = EstimationQuotationItemSerializer(many=True, read_only=True)

    class Meta:
        model = EstimationQuotation
        fields = (
            "id", "version", "quote_ref", "status",
            "subtotal", "tax_amount", "discount_amount", "total_amount",
            "currency", "notes", "admin_notes", "admin_reviewed_at", "valid_until",
            "customer_approved_at", "customer_rejected_at",
            "rejection_reason", "rejection_note",
            "created_at", "updated_at", "items",
        )


class EstimationSerializer(serializers.ModelSerializer):
    fee = EstimationFeeSerializer(read_only=True)
    inspection = InspectionSerializer(read_only=True)
    active_quotation = serializers.SerializerMethodField()

    class Meta:
        model = Estimation
        fields = (
            "id", "ac_type", "ac_brand", "ac_capacity", "ac_quantity",
            "customer_symptom", "customer_notes", "status",
            "created_at", "updated_at",
            "fee", "inspection", "active_quotation",
        )

    def get_active_quotation(self, obj):
        latest = obj.quotations.order_by("-version", "-id").first()
        if latest:
            return EstimationQuotationSerializer(latest, context=self.context).data
        return None


class EstimationSummarySerializer(serializers.ModelSerializer):
    fee_amount = serializers.DecimalField(source="fee.amount", max_digits=10, decimal_places=2, read_only=True)
    fee_status = serializers.CharField(source="fee.status", read_only=True)

    class Meta:
        model = Estimation
        fields = (
            "id", "ac_type", "ac_brand", "ac_capacity", "ac_quantity",
            "customer_symptom", "status", "fee_amount", "fee_status",
            "created_at",
        )


class ACInspectionConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ACInspectionConfiguration
        fields = ("id", "diagnostic_fee", "currency", "is_active", "updated_at")


class ACInspectionRateItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = ACInspectionRateItem
        fields = (
            "id", "category", "category_name", "category_slug",
            "name", "description", "price", "unit",
            "service_type", "display_order", "is_active",
            "created_at", "updated_at",
        )

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be >= 0.")
        return value


class ACInspectionRateCategorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    active_items_count = serializers.SerializerMethodField()

    class Meta:
        model = ACInspectionRateCategory
        fields = (
            "id", "name", "slug", "description",
            "display_order", "is_active",
            "items_count", "active_items_count",
            "created_at", "updated_at",
        )

    def get_items_count(self, obj):
        return obj.items.count()

    def get_active_items_count(self, obj):
        return obj.items.filter(is_active=True).count()


class ACRateCardPublicItemSerializer(serializers.ModelSerializer):
    price_formatted = serializers.SerializerMethodField()

    class Meta:
        model = ACInspectionRateItem
        fields = (
            "id", "name", "description", "price",
            "price_formatted", "unit", "service_type",
            "display_order",
        )

    def get_price_formatted(self, obj):
        if obj.price == 0:
            return "Free"
        return f"₹{int(obj.price):,}" if obj.price == int(obj.price) else f"₹{obj.price:,.2f}"


class ACRateCardPublicCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = ACInspectionRateCategory
        fields = ("id", "name", "slug", "description", "display_order", "items")

    def get_items(self, obj):
        active_items = obj.items.filter(is_active=True).order_by("display_order", "id")
        return ACRateCardPublicItemSerializer(active_items, many=True).data


# ==============================================================================
# CUSTOMER INSPECTION & ADMIN AC INSPECTION SERIALIZERS
# ==============================================================================

class CustomerInspectionRateSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerInspectionRateSnapshot
        fields = (
            "id", "customer_inspection_id", "rate_item_id", "category_name_snapshot",
            "item_name_snapshot", "description_snapshot", "price_snapshot", "unit_snapshot",
            "service_type_snapshot", "display_order_snapshot", "created_at"
        )


class CustomerInspectionSerializer(serializers.ModelSerializer):
    rate_snapshots = CustomerInspectionRateSnapshotSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerInspection
        fields = (
            "id", "service_request_id", "inspection_configuration_id",
            "inspection_name_snapshot", "diagnostic_fee_snapshot", "currency",
            "quantity", "status", "created_at", "updated_at", "rate_snapshots"
        )


class AdminACInspectionListSerializer(serializers.ModelSerializer):
    """
    Listing serializer for Admin AC Inspection Bookings module.
    Provides: Booking ID, Customer, Booking date, Technician, Assignment status,
    Inspection status, Diagnosis status, Estimation status, Customer approval status,
    Overall booking status.
    """
    booking_id = serializers.CharField(source="request_id", read_only=True)
    customer_phone = serializers.CharField(source="phone", read_only=True)
    overall_status = serializers.CharField(source="status", read_only=True)
    overall_status_display = serializers.CharField(source="get_status_display", read_only=True)
    technician_name = serializers.SerializerMethodField()
    technician_phone = serializers.SerializerMethodField()
    assignment_status = serializers.SerializerMethodField()
    acceptance_status = serializers.SerializerMethodField()
    inspection_status = serializers.SerializerMethodField()
    diagnosis_status = serializers.SerializerMethodField()
    estimation_status = serializers.SerializerMethodField()
    customer_approval_status = serializers.SerializerMethodField()
    diagnostic_fee = serializers.SerializerMethodField()
    quotation_total = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = (
            "id", "booking_id", "request_id", "customer_name", "customer_phone", "email",
            "address", "preferred_date", "preferred_time", "created_at", "updated_at",
            "overall_status", "overall_status_display",
            "technician_name", "technician_phone",
            "assignment_status", "acceptance_status",
            "inspection_status", "diagnosis_status",
            "estimation_status", "customer_approval_status",
            "diagnostic_fee", "quotation_total", "total_amount",
        )

    def get_technician_name(self, obj):
        if obj.technician_name:
            return obj.technician_name
        if getattr(obj, "assigned_employee", None):
            emp = obj.assigned_employee
            return getattr(emp, "full_name", "") or (emp.user.get_full_name() if getattr(emp, "user", None) else "")
        return ""

    def get_technician_phone(self, obj):
        if obj.technician_phone:
            return obj.technician_phone
        if getattr(obj, "assigned_employee", None):
            emp = obj.assigned_employee
            return getattr(emp, "phone", "") or (emp.user.phone if getattr(emp, "user", None) and hasattr(emp.user, "phone") else "")
        return ""

    def get_assignment_status(self, obj):
        name = self.get_technician_name(obj)
        if name or getattr(obj, "assigned_employee_id", None) or getattr(obj, "workforce_job_id", None):
            return "Assigned"
        if obj.status in [ServiceRequest.Status.UNASSIGNED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.CONFIRMED]:
            return "Waiting for Technician Assignment"
        return obj.get_status_display()

    def get_acceptance_status(self, obj):
        if obj.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]:
            return "Accepted"
        if obj.status in ["assigned"]:
            return "Pending Acceptance"
        if obj.status in ["rejected", "cancelled"]:
            return "Declined / Cancelled"
        return "Pending"

    def get_inspection_status(self, obj):
        if hasattr(obj, "estimation") and obj.estimation:
            if hasattr(obj.estimation, "inspection") and obj.estimation.inspection:
                return obj.estimation.inspection.status
            return obj.estimation.status
        if hasattr(obj, "customer_inspection") and obj.customer_inspection:
            return obj.customer_inspection.status
        return "NOT_STARTED"

    def get_diagnosis_status(self, obj):
        if hasattr(obj, "estimation") and obj.estimation:
            if hasattr(obj.estimation, "inspection") and obj.estimation.inspection and obj.estimation.inspection.diagnosis:
                return obj.estimation.inspection.diagnosis
            if obj.estimation.customer_symptom:
                return obj.estimation.customer_symptom
        return "Pending Diagnosis"

    def get_estimation_status(self, obj):
        if hasattr(obj, "estimation") and obj.estimation:
            latest_quote = obj.estimation.quotations.order_by("-version", "-id").first()
            if latest_quote:
                return latest_quote.status
            return obj.estimation.status
        return "NOT_SUBMITTED"

    def get_customer_approval_status(self, obj):
        if hasattr(obj, "estimation") and obj.estimation:
            latest_quote = obj.estimation.quotations.order_by("-version", "-id").first()
            if latest_quote:
                if latest_quote.status in [EstimationQuotation.Status.APPROVED, "APPROVED", "CUSTOMER_APPROVED"]:
                    return "APPROVED"
                if latest_quote.status in [EstimationQuotation.Status.REJECTED, "REJECTED", "CUSTOMER_REJECTED"]:
                    return "REJECTED"
                if latest_quote.status in [EstimationQuotation.Status.ADMIN_APPROVED, EstimationQuotation.Status.SENT, "ADMIN_APPROVED", "SENT"]:
                    return "PENDING"
                return latest_quote.status
        return "NONE"

    def get_diagnostic_fee(self, obj):
        if hasattr(obj, "customer_inspection") and obj.customer_inspection:
            return float(obj.customer_inspection.diagnostic_fee_snapshot)
        if hasattr(obj, "estimation") and obj.estimation and hasattr(obj.estimation, "fee") and obj.estimation.fee:
            return float(obj.estimation.fee.amount)
        return 199.0

    def get_quotation_total(self, obj):
        if hasattr(obj, "estimation") and obj.estimation:
            latest_quote = obj.estimation.quotations.order_by("-version", "-id").first()
            if latest_quote:
                return float(latest_quote.total_amount)
        return float(obj.total_amount or 0)


class AdminACInspectionDetailSerializer(serializers.ModelSerializer):
    """
    Complete 9-section view of AC Inspection Booking for Customer Admin.
    1. Customer: Name, Phone, Email, Address
    2. Booking: ID, Service, Date, Time, Quantity, Status
    3. Inspection: Name, Fee, Status, Created time, Rate Snapshot
    4. Technician: Technician details, Assignment status, Acceptance status, Current job status
    5. Diagnosis: Problem/Symptom, Technician notes, Diagnosis, Inspection result, Findings
    6. Evidence: Inspection photos & captions
    7. Estimation: Repair items, Quantity, Unit price, Labour, Inspection fee, Total
    8. Approval: Admin approval status, Admin notes, Customer approval status, Timestamps
    9. Final: Repair status, Testing status, Completion status
    """
    customer_section = serializers.SerializerMethodField()
    booking_section = serializers.SerializerMethodField()
    inspection_section = serializers.SerializerMethodField()
    technician_section = serializers.SerializerMethodField()
    diagnosis_section = serializers.SerializerMethodField()
    evidence_section = serializers.SerializerMethodField()
    estimation_section = serializers.SerializerMethodField()
    approval_section = serializers.SerializerMethodField()
    final_section = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRequest
        fields = (
            "id", "request_id", "status",
            "customer_section",
            "booking_section",
            "inspection_section",
            "technician_section",
            "diagnosis_section",
            "evidence_section",
            "estimation_section",
            "approval_section",
            "final_section",
        )

    def get_customer_section(self, obj):
        return {
            "name": obj.customer_name or (obj.customer.get_full_name() if obj.customer else ""),
            "phone": obj.phone or "",
            "email": obj.email or "",
            "address": obj.address or "",
            "latitude": float(obj.latitude) if obj.latitude is not None else None,
            "longitude": float(obj.longitude) if obj.longitude is not None else None,
        }

    def get_booking_section(self, obj):
        qty = 1
        if hasattr(obj, "customer_inspection") and obj.customer_inspection:
            qty = obj.customer_inspection.quantity
        elif hasattr(obj, "estimation") and obj.estimation:
            qty = obj.estimation.ac_quantity
        return {
            "booking_id": obj.request_id,
            "id": obj.id,
            "service": "AC Inspection & Diagnostic Visit",
            "service_category": obj.service_category,
            "service_category_display": obj.get_service_category_display(),
            "date": str(obj.preferred_date) if obj.preferred_date else "",
            "time": str(obj.preferred_time) if obj.preferred_time else "",
            "quantity": qty,
            "status": obj.status,
            "status_display": obj.get_status_display(),
            "created_at": obj.created_at.isoformat() if obj.created_at else None,
        }

    def get_inspection_section(self, obj):
        from service_requests.services.customer_inspection_service import CustomerInspectionService
        ci_snapshot = CustomerInspectionService.get_booking_inspection_snapshot(obj)
        ci_model = getattr(obj, "customer_inspection", None)
        return {
            "inspection_name": ci_snapshot.get("inspection_name") if ci_snapshot else "AC Inspection & Diagnostic Visit",
            "diagnostic_fee": float(ci_snapshot.get("diagnostic_fee", 199.0)) if ci_snapshot else 199.0,
            "currency": ci_snapshot.get("currency", "INR") if ci_snapshot else "INR",
            "inspection_status": ci_model.status if ci_model else "BOOKED",
            "quantity": ci_snapshot.get("quantity", 1) if ci_snapshot else 1,
            "created_at": ci_snapshot.get("created_at") if ci_snapshot else (obj.created_at.isoformat() if obj.created_at else None),
            "rate_card_snapshot": ci_snapshot,
        }

    def get_technician_section(self, obj):
        name = obj.technician_name
        phone = obj.technician_phone
        photo = obj.technician_photo
        rating = float(obj.technician_rating) if obj.technician_rating else None
        if not name and getattr(obj, "assigned_employee", None):
            emp = obj.assigned_employee
            name = getattr(emp, "full_name", "") or (emp.user.get_full_name() if getattr(emp, "user", None) else "")
            phone = getattr(emp, "phone", "") or phone
            photo = getattr(emp, "photo", "") or photo

        assignment_status = "Waiting for Technician Assignment"
        if name or getattr(obj, "assigned_employee_id", None) or getattr(obj, "workforce_job_id", None):
            assignment_status = "Technician Assigned"

        acceptance_status = "Pending"
        if obj.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]:
            acceptance_status = "Accepted"
        elif obj.status == "assigned":
            acceptance_status = "Waiting for Acceptance"
        elif obj.status in ["rejected", "cancelled"]:
            acceptance_status = "Declined"

        current_job_status = obj.get_status_display()
        if obj.status == "on_the_way":
            current_job_status = "On The Way"
        elif obj.status == "arrived":
            current_job_status = "Arrived at Customer Location"
        elif obj.status == "in_progress":
            current_job_status = "Inspection In Progress"

        return {
            "technician": name or "None",
            "phone": phone or "N/A",
            "photo": photo or None,
            "rating": rating,
            "assignment_status": assignment_status,
            "acceptance_status": acceptance_status,
            "current_job_status": current_job_status,
            "workforce_job_id": obj.workforce_job_id or obj.external_assignment_id or "",
        }

    def get_diagnosis_section(self, obj):
        est = getattr(obj, "estimation", None)
        inspection = getattr(est, "inspection", None) if est else None
        problem = (est.customer_symptom if est else "") or obj.issue_title or ""
        notes = (inspection.notes if inspection else "") or (est.customer_notes if est else "")
        diagnosis = (inspection.diagnosis if inspection else "") or "Pending technician inspection"
        result = inspection.status if inspection else "PENDING"
        findings = []
        if inspection:
            for f in inspection.findings.all():
                findings.append({
                    "id": f.id,
                    "title": f.title,
                    "diagnosis": f.diagnosis,
                    "severity": f.severity,
                    "description": f.description,
                    "recommended_action": f.recommended_action,
                })

        return {
            "problem": problem,
            "technician_notes": notes,
            "inspection_result": result,
            "diagnosis": diagnosis,
            "ac_type": est.ac_type if est else "SPLIT",
            "ac_brand": est.ac_brand if est else "",
            "ac_capacity": est.ac_capacity if est else "",
            "findings": findings,
        }

    def get_evidence_section(self, obj):
        est = getattr(obj, "estimation", None)
        inspection = getattr(est, "inspection", None) if est else None
        photos = []
        if inspection:
            for p in inspection.photos.all():
                photo_url = p.photo.url if p.photo else ""
                photos.append({
                    "id": p.id,
                    "photo_url": photo_url,
                    "caption": p.caption or "Inspection Evidence",
                    "uploaded_at": p.uploaded_at.isoformat() if p.uploaded_at else None,
                })
        return {
            "photos": photos,
            "count": len(photos),
        }

    def get_estimation_section(self, obj):
        est = getattr(obj, "estimation", None)
        quote = est.quotations.order_by("-version", "-id").first() if est else None
        fee_amount = 199.0
        if hasattr(obj, "customer_inspection") and obj.customer_inspection:
            fee_amount = float(obj.customer_inspection.diagnostic_fee_snapshot)
        elif est and hasattr(est, "fee") and est.fee:
            fee_amount = float(est.fee.amount)

        if not quote:
            return {
                "has_quotation": False,
                "inspection_fee": fee_amount,
                "repair_items": [],
                "subtotal": 0.0,
                "labour": 0.0,
                "total": fee_amount,
                "status": "NOT_CREATED",
            }

        repair_items = []
        labour_total = 0.0
        for it in quote.items.all():
            line_tot = float(it.line_total)
            svc_type = "SPARE_PART"
            if it.rate_item and getattr(it.rate_item, "service_type", None):
                svc_type = it.rate_item.service_type
            if "LABOUR" in svc_type.upper() or "LABOR" in svc_type.upper():
                labour_total += line_tot

            repair_items.append({
                "id": it.id,
                "name": it.item_name_snapshot or it.service_name,
                "category": it.category_name_snapshot or "",
                "description": it.description or "",
                "quantity": it.quantity,
                "unit": it.unit,
                "unit_price": float(it.unit_price_snapshot or it.unit_price),
                "line_total": line_tot,
                "tax_amount": float(it.tax_amount),
                "service_type": svc_type,
            })

        return {
            "has_quotation": True,
            "quotation_id": quote.id,
            "quote_ref": quote.quote_ref,
            "version": quote.version,
            "status": quote.status,
            "status_display": quote.get_status_display(),
            "repair_items": repair_items,
            "labour": labour_total,
            "inspection_fee": fee_amount,
            "subtotal": float(quote.subtotal),
            "tax_amount": float(quote.tax_amount),
            "discount_amount": float(quote.discount_amount),
            "total": float(quote.total_amount),
            "currency": quote.currency or "INR",
            "notes": quote.notes or "",
            "admin_notes": quote.admin_notes or "",
            "created_at": quote.created_at.isoformat() if quote.created_at else None,
        }

    def get_approval_section(self, obj):
        est = getattr(obj, "estimation", None)
        quote = est.quotations.order_by("-version", "-id").first() if est else None
        admin_status = "PENDING_REVIEW"
        admin_notes = ""
        admin_reviewed_at = None
        customer_status = "PENDING"
        customer_approved_at = None
        customer_rejected_at = None
        rejection_reason = ""
        rejection_note = ""

        if quote:
            if quote.status in [EstimationQuotation.Status.ADMIN_APPROVED, EstimationQuotation.Status.APPROVED, "ADMIN_APPROVED", "APPROVED", "CUSTOMER_APPROVED"]:
                admin_status = "ADMIN_APPROVED"
            elif quote.status == EstimationQuotation.Status.SENT_BACK_TO_TECHNICIAN:
                admin_status = "SENT_BACK_TO_TECHNICIAN"
            elif quote.status == EstimationQuotation.Status.SUBMITTED_FOR_REVIEW:
                admin_status = "PENDING_ADMIN_REVIEW"

            admin_notes = quote.admin_notes or ""
            admin_reviewed_at = quote.admin_reviewed_at.isoformat() if quote.admin_reviewed_at else None

            if quote.status in [EstimationQuotation.Status.APPROVED, "APPROVED", "CUSTOMER_APPROVED"]:
                customer_status = "CUSTOMER_APPROVED"
            elif quote.status in [EstimationQuotation.Status.REJECTED, "REJECTED", "CUSTOMER_REJECTED"]:
                customer_status = "CUSTOMER_REJECTED"
            elif quote.status in [EstimationQuotation.Status.ADMIN_APPROVED, EstimationQuotation.Status.SENT, "ADMIN_APPROVED", "SENT"]:
                customer_status = "CUSTOMER_PENDING"
            else:
                customer_status = "NOT_PRESENTED"

            customer_approved_at = quote.customer_approved_at.isoformat() if quote.customer_approved_at else None
            customer_rejected_at = quote.customer_rejected_at.isoformat() if quote.customer_rejected_at else None
            rejection_reason = quote.rejection_reason or ""
            rejection_note = quote.rejection_note or ""

        return {
            "admin_approval_status": admin_status,
            "admin_notes": admin_notes,
            "admin_reviewed_at": admin_reviewed_at,
            "customer_approval_status": customer_status,
            "customer_approved_at": customer_approved_at,
            "customer_rejected_at": customer_rejected_at,
            "rejection_reason": rejection_reason,
            "rejection_note": rejection_note,
        }

    def get_final_section(self, obj):
        est = getattr(obj, "estimation", None)
        quote = est.quotations.order_by("-version", "-id").first() if est else None
        customer_rejected = quote and quote.status in [EstimationQuotation.Status.REJECTED, "REJECTED", "CUSTOMER_REJECTED"]

        repair_status = "NOT_STARTED"
        testing_status = "NOT_STARTED"
        completion_status = "IN_PROGRESS"

        if customer_rejected:
            repair_status = "NO_REPAIR_CUSTOMER_REJECTED"
            testing_status = "NOT_APPLICABLE"
            completion_status = "INSPECTION_ONLY_CLOSED"
        elif obj.status in [ServiceRequest.Status.COMPLETED, ServiceRequest.Status.CLOSED, ServiceRequest.Status.VERIFIED]:
            repair_status = "COMPLETED"
            testing_status = "PASSED"
            completion_status = "COMPLETED"
        elif est and est.status in [Estimation.Status.TESTING, "TESTING"]:
            repair_status = "COMPLETED"
            testing_status = "IN_PROGRESS"
        elif est and est.status in [Estimation.Status.TECHNICIAN_REPAIR, "TECHNICIAN_REPAIR"]:
            repair_status = "IN_PROGRESS"
        elif est and est.status in [Estimation.Status.REPAIR_AUTHORIZED, "REPAIR_AUTHORIZED"]:
            repair_status = "AUTHORIZED"

        return {
            "repair_status": repair_status,
            "testing_status": testing_status,
            "completion_status": completion_status,
            "invoice_id": obj.invoice_id or "",
            "payment_status": obj.payment_status or "PAID",
        }

