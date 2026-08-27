"""
service_requests/views.py

Two primary groups of views:
  1. Public & Customer — booking, customer dashboard, feedback, tracking, coupons, complaints, reschedules, refunds.
  2. Admin / Business — service request management, catalog, analytics, complaint resolution, refund approvals.

Decoupled from local employee models — dispatches and tracking queries delegate to WorkforceIntegrationService.
"""
import logging
import re
import uuid
from decimal import Decimal
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser, JSONParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, IsCustomer, is_admin_role
from workforce_integration.services import WorkforceIntegrationService

from . import services as sr_services
from .models import (
    Complaint, ServiceFeedback, ServiceRequest,
    WorkExtension, WorkExtensionItem, JobReschedule, SupplementalInvoice,
    RescheduleRequest, RescheduleAttachment, RescheduleStatus, RescheduleReason, TimeSlotChoices,
    RefundRequest, RefundStatus, RefundType, RefundReason, RefundEvidence,
    Coupon, CouponUsage,
)
from .serializers import (
    AdminChangePrioritySerializer,
    FeedbackTokenSummarySerializer,
    ServiceFeedbackAdminSerializer, ServiceFeedbackSubmitSerializer,
    ServiceRequestDetailSerializer, ServiceRequestListSerializer,
    ServiceRequestPublicCreateSerializer,
    WorkExtensionSerializer, WorkExtensionItemSerializer,
    JobRescheduleSerializer, SupplementalInvoiceSerializer,
    RescheduleRequestSerializer, AdminRescheduleListSerializer,
    RefundEvidenceSerializer,
    CustomerRefundRequestSerializer, AdminRefundRequestSerializer,
)
from .state_machine import apply_transition
from .services.decision_service import record_customer_decision
from .services.fulfillment_service import process_item_fulfillment
from .services.logistics_pricing import resolve_logistics_fare, UnresolvedLogisticsFareError, LOGISTICS_CATEGORIES
from .services.address_service import AddressService


logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400, extra=None):
    body = {"success": False, "message": message}
    if extra:
        body.update(extra)
    return Response(body, status=status_code)

# Fixes EC-08: tracking_token never expired -- a link handed to a customer
# (or forwarded, screenshotted, left in an old SMS/email) stayed a valid
# bearer credential for that booking's live location/status forever. 180
# days after booking creation is a deliberately generous default -- long
# enough that no active or recently-rescheduled job is ever cut off, short
# enough that a link from months-old bookings stops working. This is a
# judgment call on the window, not a hard product requirement; adjust the
# constant below if a different retention period is wanted.
TRACKING_TOKEN_VALID_DAYS = 180


def _tracking_token_is_expired(sr):
    if not getattr(sr, "created_at", None):
        return False
    return (timezone.now() - sr.created_at).days > TRACKING_TOKEN_VALID_DAYS


def _standard_response(success=True, data=None, error=None, meta=None, status_code=200):
    return Response(
        {
            "success": success,
            "data": data if data is not None else {},
            "error": error,
            "meta": meta if meta is not None else {},
        },
        status=status_code,
    )


def _get_company(request):
    company = getattr(request, "company", None)
    if company:
        return company
    from companies.models import Company
    if Company.objects.count() == 1:
        return Company.objects.first()
    return None


def _sr_qs(request):
    company = _get_company(request)
    qs = ServiceRequest.objects.all()
    if company:
        qs = qs.filter(Q(company=company) | Q(company__isnull=True))
    return qs


def _serialize_complaint(c, include_messages=False):
    data = {
        "id": c.pk,
        "complaint_number": c.complaint_number,
        "booking_id": c.booking_id,
        "booking_request_id": c.booking.request_id if c.booking else None,
        "service_category": c.booking.service_category if c.booking else None,
        "customer_name": c.raised_by.get_full_name() or c.raised_by.email if c.raised_by else "Customer",
        "category": c.category,
        "description": c.description,
        "priority": c.priority,
        "status": c.status,
        "risk_score": getattr(c, "risk_score", 0) or 0,
        "resolution_type": getattr(c, "resolution_type", None),
        "resolution_notes": getattr(c, "resolution_notes", ""),
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "attachments": [
            {
                "id": a.id,
                "file_url": a.file.url if a.file else "",
                "attachment_type": a.attachment_type,
                "uploaded_at": a.uploaded_at,
            }
            for a in c.attachments.all()
        ],
    }
    if include_messages:
        data["messages"] = [
            {
                "id": m.id,
                "sender_name": m.sender.get_full_name() or m.sender.username if m.sender else "System",
                "sender_persona": m.sender_persona,
                "message": m.message,
                "created_at": m.created_at,
            }
            for m in c.messages.all().order_by("created_at")
        ]
    return data


# ─── 1. PUBLIC & CATALOG VIEWS ────────────────────────────────────────────────

class CatalogCategoryListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        from .models import CatalogCategory
        from .serializers import CatalogCategorySerializer
        from django.core.cache import cache
        from django.conf import settings

        use_cache = not getattr(settings, 'DEBUG', False)
        
        if use_cache:
            data = cache.get("catalog_categories_list")
            if data is not None:
                return Response({"success": True, "data": data})

        cats = CatalogCategory.objects.all().order_by('name')
        data = CatalogCategorySerializer(cats, many=True).data
        
        if use_cache:
            try:
                cache.set("catalog_categories_list", data, timeout=600)
            except Exception:
                pass
        return Response({"success": True, "data": data})


class CatalogServiceListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        from .models import Package
        from .serializers import CatalogServiceSerializer
        from django.core.cache import cache
        from django.conf import settings

        cat_id = request.GET.get('category_id') or ''
        service_slug = request.GET.get('service_slug') or ''
        status_filter = request.GET.get('status') or ''
        use_cache = not getattr(settings, 'DEBUG', False)
        cache_key = f"catalog_services_list_{cat_id}_{service_slug}_{status_filter}"
        
        if use_cache:
            cached_res = cache.get(cache_key)
            if cached_res is not None:
                return Response(cached_res)

        qs = Package.objects.select_related("service", "service__category").all().order_by('name')
        if cat_id:
            qs = qs.filter(service__category_id=cat_id)
        if service_slug:
            qs = qs.filter(service__slug=service_slug)
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = CatalogServiceSerializer(qs, many=True).data

        res_payload = {
            "success": True,
            "data": data,
            "currency": "INR",
            "currency_symbol": "₹"
        }
        
        if use_cache:
            try:
                cache.set(cache_key, res_payload, timeout=600)
            except Exception:
                pass
        return Response(res_payload)


class CatalogSubServiceListView(APIView):
    permission_classes = [permissions.AllowAny]
    def get(self, request):
        from .models import Service
        from .serializers import ServiceSerializer

        category_slug = request.GET.get('category_slug') or ''
        qs = Service.objects.select_related("category").all().order_by('sort_order', 'name')
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        data = ServiceSerializer(qs, many=True).data
        return Response({"success": True, "data": data})


class BookingCreateView(APIView):
    """
    POST /api/booking/
    Creates a ServiceRequest and returns human-readable request_id.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]
    # Fixes EC-06: booking creation only had the blanket 60/min anon rate —
    # tight enough to fit real customer behaviour, loose enough to still let
    # a bot script bookings for enumeration/spam. Scoped down separately.
    throttle_classes  = [ScopedRateThrottle]
    throttle_scope    = "booking_create"

    def post(self, request):
        # Fixes EC-03 (partial): booking creation has no idempotency
        # protection, so a double-tap submit or a client retry after a
        # timed-out-but-actually-succeeded request creates a second, separate
        # booking. A client-supplied Idempotency-Key header lets us return the
        # original response instead of creating a duplicate. This is opt-in --
        # if the frontend doesn't send the header, behaviour is byte-for-byte
        # unchanged from before, since we can't safely infer "duplicate" from
        # payload contents alone without risking two genuinely different
        # bookings from the same customer being wrongly deduplicated.
        idem_key = (request.headers.get("Idempotency-Key") or "").strip()
        idem_cache_key = f"booking_idem_{idem_key}" if idem_key else None
        if idem_cache_key:
            from django.core.cache import cache
            cached = cache.get(idem_cache_key)
            if cached is not None:
                return Response(cached["body"], status=cached["status"])

        serializer = ServiceRequestPublicCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Validation error.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        company = _get_company(request)

        # ── SERVER-SIDE SERVICE AREA GATE ─────────────────────────────────────
        # This is the authoritative zone check. It runs on EVERY booking API
        # call regardless of what the frontend did or did not validate.
        # A customer cannot bypass this by calling the API directly.
        #
        # Uses the current DB state (race-condition safe — if admin disabled a
        # zone between the frontend check and submission, this will catch it).
        from settings_hub.service_zone_engine import check_booking_eligibility

        _lat = serializer.validated_data.get("latitude")
        _lng = serializer.validated_data.get("longitude")
        if _lat is None or _lng is None:
            # Fixes HS-B-04: this used to silently substitute a hardcoded
            # Bangalore coordinate here ONLY for the zone-eligibility check
            # below, while the ServiceRequest itself was still saved with
            # latitude/longitude = None (serializer.save() uses the real
            # submitted values, not this fallback). That let a booking with
            # no coordinates pass the zone check and get created, then sit
            # with no location for any distance-based technician dispatch to
            # work from -- exactly the "created, then never dispatched" gap.
            # Reject it up front instead.
            return _error(
                "We couldn't determine your location. Please select your address "
                "on the map and try again.",
                400,
            )
        _service_slug = (serializer.validated_data.get("service_category") or "").strip().lower()

        zone_result = check_booking_eligibility(
            lat=_lat,
            lng=_lng,
            service_slug=_service_slug,
            company=company,
        )

        if not zone_result.allowed:
            return Response(
                {
                    "success": False,
                    "error_code": zone_result.error_code,
                    "message": zone_result.message,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        # ── END ZONE GATE ─────────────────────────────────────────────────────

        try:
            corrected_fare = resolve_logistics_fare(
                service_category=serializer.validated_data.get("service_category", ""),
                logistics_tier=serializer.validated_data.get("logistics_tier"),
                logistics_lane=serializer.validated_data.get("logistics_lane"),
                submitted_amount=serializer.validated_data.get("total_amount", 0),
            )
        except UnresolvedLogisticsFareError:
            # Fixes GT-B-01: a logistics booking with neither a resolvable
            # Lane nor ServiceTier has no server-verifiable price, so reject
            # it with a clear message instead of recording a client-supplied
            # amount unchecked.
            return _error(
                "We couldn't verify a fare for this route/tier. Please pick a valid "
                "route or service tier and try again.",
                400,
            )

        # Fixes HS-B-01 (partial): for non-logistics (home-services) bookings,
        # `corrected_fare` above is just the client-submitted total_amount —
        # resolve_logistics_fare() only verifies logistics categories. A full
        # recompute against Package/AddOn catalog prices isn't possible here
        # because `cart_data` items don't carry a package_id/addon_id back to
        # the catalog (see HS_B_01_PRICE_VALIDATION_NOTE.md). As a bounded,
        # safe-to-ship mitigation, we at least check that the submitted total
        # is internally consistent with the submitted cart line items — this
        # catches the common tampering/bug pattern of a total_amount that
        # doesn't match what the cart itself lists, without needing catalog
        # resolution.
        _cart_for_check = serializer.validated_data.get("cart_data") or []
        if (
            serializer.validated_data.get("service_category", "") not in LOGISTICS_CATEGORIES
            and isinstance(_cart_for_check, list)
            and len(_cart_for_check) > 0
        ):
            try:
                _cart_total = sum(
                    float(item.get("price", 0)) * int(item.get("quantity", 1))
                    for item in _cart_for_check
                    if isinstance(item, dict)
                )
            except (TypeError, ValueError):
                _cart_total = None
            if _cart_total is not None and _cart_total > 0:
                _tolerance = max(5.0, _cart_total * 0.01)
                if abs(float(corrected_fare) - _cart_total) > _tolerance:
                    return _error(
                        "The submitted amount doesn't match the selected services. "
                        "Please refresh and try booking again.",
                        400,
                    )

        payment_method = (request.data.get("payment_method") or "COD").upper()
        if payment_method == "ONLINE":
            initial_status = ServiceRequest.Status.WAITING_FOR_PAYMENT
            initial_payment_status = ServiceRequest.PaymentStatus.PROCESSING
        else:
            payment_method = "COD"
            initial_status = ServiceRequest.Status.CONFIRMED
            initial_payment_status = ServiceRequest.PaymentStatus.PENDING


        from django.contrib.auth import get_user_model
        User = get_user_model()

        customer_user = None
        is_admin_booking_on_behalf = False
        _new_account_created = False  # Fixes HS-A-02 (partial)

        if request.user and request.user.is_authenticated:
            if request.user.role == getattr(User.Role, "CUSTOMER", "customer"):
                customer_user = request.user
            else:
                is_admin_booking_on_behalf = True
                target_cust_id = request.data.get("customer_id")
                if target_cust_id:
                    customer_user = User.objects.filter(id=target_cust_id).first()

        if not customer_user:
            phone_clean = str(request.data.get("phone") or "").strip()
            email_clean = str(request.data.get("email") or "").strip().lower()
            if phone_clean:
                customer_user = User.objects.filter(phone=phone_clean).first()
            if not customer_user and email_clean:
                customer_user = User.objects.filter(email__iexact=email_clean).first()

            if not customer_user and (phone_clean or email_clean):
                cust_name = str(request.data.get("customer_name") or "").strip()
                first_name = ""
                last_name = ""
                if cust_name:
                    parts = cust_name.split(" ")
                    first_name = parts[0]
                    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""

                uname_base = f"cust_{phone_clean}" if phone_clean else f"cust_{email_clean.split('@')[0]}"
                uname = uname_base
                if User.objects.filter(username=uname).exists():
                    uname = f"{uname_base}_{uuid.uuid4().hex[:6]}"

                try:
                    customer_user = User.objects.create(
                        username=uname,
                        phone=phone_clean or None,
                        email=email_clean or "",
                        first_name=first_name,
                        last_name=last_name,
                        role=getattr(User.Role, 'CUSTOMER', 'CUSTOMER')
                    )
                    _new_account_created = True
                except Exception:
                    if phone_clean:
                        customer_user = User.objects.filter(phone=phone_clean).first()
                    if not customer_user and email_clean:
                        customer_user = User.objects.filter(email__iexact=email_clean).first()

        # Resolve email if missing in validated_data but present on customer_user
        final_email = serializer.validated_data.get("email")
        if not final_email:
            if customer_user and customer_user.email:
                final_email = customer_user.email
            elif request.user and request.user.is_authenticated and request.user.email:
                final_email = request.user.email

        sr = serializer.save(
            company=company,
            customer=customer_user,
            email=final_email,
            status=initial_status,
            payment_method=payment_method,
            payment_status=initial_payment_status,
            total_amount=corrected_fare,
            # Zone snapshot — captured at creation time so existing bookings
            # remain valid even if admin later edits or removes the zone.
            service_zone_id_snapshot=zone_result.zone_id,
            service_zone_name_snapshot=zone_result.zone_name or "",
        )

        coupon_code = str(request.data.get("coupon_code") or request.data.get("coupon_code_snapshot") or "").strip().upper()
        if coupon_code:
            cpn = Coupon.objects.filter(code__iexact=coupon_code, status="Active").first()
            if cpn:
                subtotal = float(corrected_fare)
                if cpn.discount_type == "flat":
                    calc_disc = float(cpn.discount_value)
                else:
                    calc_disc = subtotal * (float(cpn.discount_value) / 100.0)

                if cpn.max_discount > 0:
                    disc = min(calc_disc, float(cpn.max_discount))
                else:
                    disc = calc_disc

                disc = min(subtotal, disc)
                final_tot = max(0.0, subtotal - disc)

                sr.coupon = cpn
                sr.coupon_code_snapshot = cpn.code
                sr.subtotal_amount = subtotal
                sr.discount_amount = disc
                sr.final_amount = final_tot
                sr.save(update_fields=["coupon", "coupon_code_snapshot", "subtotal_amount", "discount_amount", "final_amount"])

                with transaction.atomic():
                    cpn.current_usage += 1
                    cpn.save(update_fields=["current_usage"])
                    CouponUsage.objects.create(
                        coupon=cpn,
                        customer=sr.customer,
                        booking=sr,
                        discount_amount=disc,
                        order_amount=subtotal,
                        final_amount=final_tot
                    )

        # Dispatch booking notification to workforce management system.
        #
        # Fixes X-02: this used to call dispatch_job() synchronously and
        # unwrap nothing from the result. WorkforceIntegrationService.dispatch_job()
        # POSTs to a vendor endpoint (/jobs/dispatch/) that does not exist in
        # workforce_api/urls.py, so it always fails after paying its full
        # `timeout=5` cost (or whatever the network needs to fail) on every
        # single booking creation request, before ever reaching the customer's
        # response — and the vendor app dispatches independently anyway, via
        # its own dispatch_pending_workforce_jobs polling loop reading this
        # same shared table. Firing it in a background thread means a booking
        # confirms immediately regardless of whether that integration call
        # ever succeeds; if/when a real dispatch-webhook endpoint exists on
        # the vendor side, this still delivers it, just without blocking the
        # request that doesn't need to wait on it.
        try:
            import threading
            threading.Thread(
                target=WorkforceIntegrationService.dispatch_job,
                args=(sr.id,),
                daemon=True,
            ).start()
        except Exception as dispatch_err:
            logger.warning(f"Could not start background workforce dispatch for booking {sr.id}: {dispatch_err}")

        # Fixes HS-A-02 (partial): tell the customer an account was
        # created for them by this booking, since User.objects.create()
        # above did that silently. Background thread, same reasoning as
        # the dispatch call above -- this must never delay the booking
        # response.
        if _new_account_created:
            try:
                import threading
                from .notifications import notify_account_created
                threading.Thread(
                    target=notify_account_created,
                    args=(customer_user, sr),
                    daemon=True,
                ).start()
            except Exception as notify_err:
                logger.warning(f"Could not start account-created notification for booking {sr.id}: {notify_err}")

        if is_admin_booking_on_behalf:
            try:
                from accounts.audit_service import record_platform_audit
                record_platform_audit(
                    actor=request.user,
                    action="BOOKING_CREATED_ON_BEHALF",
                    module="bookings",
                    object_type="ServiceRequest",
                    object_id=str(sr.id),
                    after_state={
                        "request_id": sr.request_id,
                        "customer_id": sr.customer_id,
                        "total_amount": float(sr.total_amount or 0)
                    },
                    reason=f"Booking created on behalf of customer #{sr.customer_id} by {request.user.username}",
                    request=request,
                    severity="INFO"
                )
            except Exception:
                pass

        response = _success(
            data={
                "request_id": sr.request_id,
                "id": sr.id,
                "customer_id": sr.customer.customer_id if (sr.customer and hasattr(sr.customer, "customer_id")) else None,
                "payment_method": sr.payment_method,
                "payment_status": sr.payment_status,
                "booking_status": sr.status,
                "total_amount": float(sr.total_amount),
                "start_otp": sr.start_otp,
                "tracking_token": str(sr.tracking_token) if sr.tracking_token else None,
            },
            message="Your service request has been submitted successfully.",
            status_code=201,
        )
        if idem_cache_key:
            cache.set(idem_cache_key, {"body": response.data, "status": response.status_code}, timeout=600)
        return response


class CustomerMyBookingsView(APIView):
    """
    GET /api/booking/my-bookings/
    Authenticated customers view their own bookings.
    Supports full phone normalization (+91, 10-digit, 0-prefixed) and automatic account linking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_email = (getattr(request.user, 'email', None) or '').strip()
        raw_phone = (getattr(request.user, 'phone', None) or '').strip()
        clean_phone = raw_phone[-10:] if len(raw_phone) >= 10 else raw_phone

        # Automatically link any unlinked bookings to this authenticated customer
        if user_email:
            ServiceRequest.objects.filter(
                email__iexact=user_email,
                customer__isnull=True
            ).update(customer=request.user)

        if clean_phone:
            ServiceRequest.objects.filter(
                Q(phone__endswith=clean_phone) | Q(phone=clean_phone) | Q(phone=raw_phone) | Q(phone=f"+91{clean_phone}"),
                customer__isnull=True
            ).update(customer=request.user)

        query = Q(customer=request.user)
        if user_email:
            query |= Q(email__iexact=user_email)
        if clean_phone:
            query |= (
                Q(phone__endswith=clean_phone)
                | Q(phone=clean_phone)
                | Q(phone=raw_phone)
                | Q(phone=f"+91{clean_phone}")
            )

        from django.db.models import Prefetch
        from service_requests.models import BookingAssignment
        qs = ServiceRequest.objects.filter(query).select_related("customer", "feedback").prefetch_related(
            Prefetch("child_requests", queryset=ServiceRequest.objects.select_related("customer").order_by("created_at")),
            "child_requests__reschedule_requests",
            "child_requests__work_extensions",
            Prefetch("reschedule_requests", queryset=RescheduleRequest.objects.all().order_by("-id")),
            Prefetch("work_extensions", queryset=WorkExtension.objects.all().order_by("-created_at")),
            Prefetch("refund_requests", queryset=RefundRequest.objects.all()),
            Prefetch("assignments", queryset=BookingAssignment.objects.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id")),
        ).order_by("-created_at").distinct()
        serializer = ServiceRequestListSerializer(qs, many=True, context={"request": request})
        return _success(data=serializer.data)


class CustomerBookingRetryPaymentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            sr = ServiceRequest.objects.get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        if sr.payment_status == ServiceRequest.PaymentStatus.PAID:
            return _error("This booking is already paid.")

        sr.payment_status = ServiceRequest.PaymentStatus.PROCESSING
        sr.save(update_fields=["payment_status", "updated_at"])
        return _success(data={"request_id": sr.request_id, "amount": float(sr.total_amount)})


class CustomerBookingCancelView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk=None, identifier=None):
        sr_id = pk or identifier
        try:
            if str(sr_id).isdigit():
                sr = ServiceRequest.objects.get(pk=int(sr_id))
            else:
                sr = ServiceRequest.objects.get(request_id=sr_id)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)
        # Authorization & Ownership Validation
        provided_token = request.data.get("token") or request.query_params.get("token") or request.data.get("tracking_token")
        token_matches = bool(
            provided_token and
            sr.tracking_token and
            str(sr.tracking_token).lower() == str(provided_token).strip().lower() and
            not _tracking_token_is_expired(sr)  # Fixes EC-08
        )
        if request.user and request.user.is_authenticated:
            from accounts.permissions import is_super_admin, can
            is_super = is_super_admin(request.user)
            has_perm = can(request.user, "bookings", "cancel")
            is_owner = bool(
                (sr.customer_id and sr.customer_id == request.user.id) or
                (request.user.email and sr.email and request.user.email.strip().lower() == sr.email.strip().lower()) or
                (request.user.phone and sr.phone and request.user.phone.strip()[-10:] == sr.phone.strip()[-10:])
            )
            if not (is_super or has_perm or is_owner or token_matches):
                return _error("You are not authorized to cancel this booking.", 403)
        else:
            provided_phone = (request.data.get("phone") or "").strip()
            phone_matches = bool(provided_phone and sr.phone and provided_phone[-10:] == sr.phone.strip()[-10:])
            if not (token_matches or phone_matches):
                return _error("Valid tracking token, phone verification, or authentication required to cancel.", 401)

        reason = request.data.get("reason", "Customer requested cancellation")
        previous_status = sr.status
        
        import django.utils.timezone as django_timezone
        actor = request.user if request.user.is_authenticated else None
        if actor:
            persona = "customer" if actor.role == "customer" else ("admin" if actor.role == "admin" else "employee")
            cancelled_by_user = actor
        else:
            persona = "customer"
            cancelled_by_user = sr.customer

        MAP_REASON = {
            "Change of plans / Booked by mistake": ServiceRequest.CancellationReason.CHANGE_OF_PLANS,
            "Expected faster service / Partner too far": ServiceRequest.CancellationReason.EXPECTED_FASTER,
            "Selected wrong service, date, or address": ServiceRequest.CancellationReason.WRONG_SERVICE,
            "Found alternative service / Solved myself": ServiceRequest.CancellationReason.FOUND_ALTERNATIVE,
            "Price or payment issue": ServiceRequest.CancellationReason.PRICE_OR_PAYMENT,
        }
        normalized_reason = MAP_REASON.get(reason, ServiceRequest.CancellationReason.OTHER)

        with transaction.atomic():
            apply_transition(sr, ServiceRequest.Status.CANCELLED, actor=actor)
            sr.cancelled_at = django_timezone.now()
            sr.cancelled_by = cancelled_by_user
            sr.cancelled_by_persona = persona
            sr.cancellation_reason = normalized_reason
            sr.cancellation_note = reason if normalized_reason == ServiceRequest.CancellationReason.OTHER else ""
            sr.cancelled_at_status = previous_status
            
            # Pass details to status log save hook
            sr._status_reason_code = normalized_reason.value if hasattr(normalized_reason, 'value') else normalized_reason
            sr._status_reason_note = reason
            
            sr.save()
            # Cancel job in workforce system
            WorkforceIntegrationService.cancel_workforce_job(sr.id, reason=reason)

        return _success(data=ServiceRequestDetailSerializer(sr, context={"request": request}).data, message="Booking cancelled successfully.")


import math

def _haversine_meters(lat1, lon1, lat2, lon2):
    try:
        R = 6371000.0  # meters
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        dphi = math.radians(float(lat2) - float(lat1))
        dlam = math.radians(float(lon2) - float(lon1))
        a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
        return R * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    except (ValueError, TypeError):
        return None


def _build_tracking_payload(sr, has_full_access):
    """
    Constructs the canonical live tracking response payload for a booking.
    Sensitive data (technician phone, Service Start OTP) is strictly omitted
    unless has_full_access is True.
    """
    dest_lat = float(sr.latitude) if sr.latitude is not None else None
    dest_lng = float(sr.longitude) if sr.longitude is not None else None

    # 0. Sync and resolve employee details & live GPS from ServiceRequest model and assigned employee
    db_heading = 0.0
    db_speed = 0.0
    db_accuracy = None

    assigned_emp = getattr(sr, "assigned_employee", None)
    if assigned_emp:
        if not sr.technician_name:
            sr.technician_name = getattr(assigned_emp, "full_name", None) or (assigned_emp.user.get_full_name() if getattr(assigned_emp, "user", None) else "")
        if not sr.technician_phone and getattr(assigned_emp, "phone", None):
            sr.technician_phone = assigned_emp.phone
        if not sr.technician_photo and getattr(assigned_emp, "photo", None):
            sr.technician_photo = assigned_emp.photo

    # Fetch technician live tracking snapshot from external Workforce Integration for any active booking.
    # Always fetch so live telemetry (eta_minutes, distance_km, location) from the external system enriches the payload.
    tracking = None
    active_statuses = {"accepted", "on_the_way", "arrived", "in_progress"}
    if sr.status in active_statuses or getattr(sr, "workforce_job_id", None):
        tracking = WorkforceIntegrationService.get_technician_tracking(sr.request_id or sr.id)

    # Authoritative acceptance check:
    # ASSIGNED != ACCEPTED.
    # When Admin assigns an employee (status="assigned"), the job is offered but NOT accepted yet.
    # Customer must NOT see technician identity, GPS, ETA, route, or OTP until explicit acceptance.
    technician_assigned = bool(sr.status in ["assigned", "accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"] or sr.workforce_job_id or sr.external_assignment_id)
    technician_accepted = bool(
        sr.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]
    )
    is_accepted = technician_accepted
    tracking_available = bool(sr.status in ["accepted", "on_the_way", "arrived", "in_progress"])
    is_terminal = sr.status in ["completed", "closed", "cancelled", "rejected", "feedback_pending", "feedback_received"]

    vendor_data = None
    if is_accepted:
        comp_name = "Sevo"
        comp_id = sr.company_id or 1
        if sr.company_id:
            try:
                comp = sr.company
                if comp:
                    comp_name = getattr(comp, "company_name", None) or getattr(comp, "name", None) or comp_name
                    comp_id = comp.id
            except Exception:
                pass
        vendor_data = {
            "id": comp_id,
            "name": comp_name,
            "verified": True,
            "phone": None,
        }

    technician_data = None
    technician_loc_data = None
    distance_m = None
    distance_km = None
    eta_seconds = None
    eta_minutes = None
    freshness = "WAITING_FOR_PROFESSIONAL" if not is_accepted else "WAITING_FOR_LOCATION"

    if is_accepted:
        tech_obj = tracking.get("technician") if (tracking and isinstance(tracking, dict) and tracking.get("technician")) else {}

        # 1. Real technician details in strict order: (1) Workforce API, (2) BookingAssignment, (3) ServiceRequest
        tech_name = None
        tech_phone = None
        tech_photo = None
        tech_rating = None
        tech_jobs = None
        tech_job_id = None

        if tech_obj:
            tech_name = tech_obj.get("name") or tech_obj.get("full_name") or None
            tech_phone = tech_obj.get("phone") or None
            tech_photo = tech_obj.get("photo") or None
            tech_rating = float(tech_obj.get("rating")) if tech_obj.get("rating") is not None else None
            tech_jobs = tech_obj.get("jobs_completed") or None
            tech_job_id = tech_obj.get("id") or tech_obj.get("job_id") or None

        if not tech_name and hasattr(sr, "assignments"):
            assignment = sr.assignments.filter(
                status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]
            ).order_by("-id").first()
            if assignment:
                tech_name = assignment.technician_name or None
                tech_phone = assignment.technician_phone or tech_phone or None
                tech_photo = assignment.technician_photo or tech_photo or None
                tech_rating = float(assignment.technician_rating) if assignment.technician_rating is not None else tech_rating
                tech_job_id = assignment.workforce_job_id or assignment.assignment_id or tech_job_id

        if not tech_name:
            tech_name = sr.technician_name or None
            tech_phone = sr.technician_phone or tech_phone or None
            tech_photo = sr.technician_photo or tech_photo or None
            tech_rating = float(sr.technician_rating) if sr.technician_rating is not None else tech_rating
            tech_jobs = getattr(sr, "technician_jobs_completed", None) or tech_jobs
            tech_job_id = sr.workforce_job_id or sr.external_assignment_id or tech_job_id

        if not tech_name and getattr(sr, "assigned_employee", None):
            emp = sr.assigned_employee
            tech_name = getattr(emp, "full_name", None) or (emp.user.get_full_name() if getattr(emp, "user", None) else "") or None
            tech_phone = getattr(emp, "phone", None) or tech_phone
            tech_photo = getattr(emp, "photo", None) or tech_photo
            tech_rating = float(getattr(emp, "rating", None)) if getattr(emp, "rating", None) is not None else tech_rating
            tech_jobs = getattr(emp, "total_jobs", None) or tech_jobs

        # 2. Real live GPS coordinates strictly from database or workforce telemetry — NO fake coordinates
        loc = tracking.get("location") if (tracking and isinstance(tracking, dict)) else {}
        if is_terminal:
            tech_lat = None
            tech_lng = None
        else:
            tech_lat = float(sr.technician_latitude) if sr.technician_latitude is not None else (float(loc.get("latitude")) if (loc and loc.get("latitude") is not None) else None)
            tech_lng = float(sr.technician_longitude) if sr.technician_longitude is not None else (float(loc.get("longitude")) if (loc and loc.get("longitude") is not None) else None)

        current_loc_name = sr.technician_location_name or loc.get("location_name") or None

        # Heading & speed
        resolved_heading = db_heading if db_heading > 0 else (float(loc.get("heading")) if (loc and loc.get("heading") is not None) else 0.0)
        resolved_speed = db_speed if db_speed > 0 else (float(loc.get("speed")) if (loc and loc.get("speed") is not None) else 0.0)

        # 3. GPS Freshness calculation strictly based on real coordinates availability
        if is_terminal:
            freshness = "COMPLETED" if sr.status not in ["cancelled", "rejected"] else "CANCELLED"
        elif tech_lat is not None and tech_lng is not None:
            freshness = "LIVE"
        else:
            freshness = "UNAVAILABLE"

        # 4. Real Distance and ETA Calculation — only computed when real GPS exists
        if sr.status == "arrived":
            distance_m = 0
            distance_km = 0.0
            eta_seconds = 0
            eta_minutes = 0
        elif is_terminal or sr.status == "in_progress":
            distance_m = 0
            distance_km = 0.0
            eta_seconds = 0
            eta_minutes = 0
        elif tech_lat is not None and tech_lng is not None and dest_lat is not None and dest_lng is not None:
            raw_meters = _haversine_meters(tech_lat, tech_lng, dest_lat, dest_lng)
            if raw_meters is not None:
                distance_m = int(round(raw_meters))
                distance_km = round(distance_m / 1000.0, 1)
                eta_mins = max(1, int(round((distance_km / 25.0) * 60)))
                eta_minutes = eta_mins
                eta_seconds = eta_mins * 60
        else:
            distance_m = None
            distance_km = None
            eta_seconds = None
            eta_minutes = None

        if tracking and isinstance(tracking, dict) and tracking.get("eta_minutes") is not None:
            eta_minutes = tracking.get("eta_minutes")
        if tracking and isinstance(tracking, dict) and tracking.get("distance_km") is not None:
            distance_km = tracking.get("distance_km")

        technician_data = {
            "id": tech_job_id,
            "job_id": tech_job_id,
            "name": tech_name,
            "phone": tech_phone if has_full_access else None,
            "rating": tech_rating,
            "photo": tech_photo,
            "latitude": tech_lat,
            "longitude": tech_lng,
            "heading": resolved_heading if tech_lat is not None else 0.0,
            "speed": resolved_speed if tech_lat is not None else 0.0,
            "status": sr.status,
            "eta_minutes": eta_minutes,
            "distance_km": distance_km,
            "jobs_completed": tech_jobs,
            "current_location_name": current_loc_name,
            "updated_at": tracking.get("updated_at") if (tracking and isinstance(tracking, dict)) else timezone.now().isoformat(),
        }

        if tech_lat is not None and tech_lng is not None and not is_terminal:
            technician_loc_data = {
                "latitude": tech_lat,
                "longitude": tech_lng,
                "heading": resolved_heading,
                "speed": resolved_speed,
                "accuracy": db_accuracy,
                "freshness": freshness,
            }

    # OTP is ONLY exposed to customer once partner ACCEPTS and status is active (never exposed in assigned state)
    start_otp = sr.start_otp if (not is_terminal and is_accepted and sr.status in ["accepted", "on_the_way", "arrived", "in_progress"]) else None

    created_at_raw = getattr(sr, 'created_at', None) or getattr(sr, 'submitted_at', None)
    if created_at_raw and hasattr(created_at_raw, 'isoformat'):
        created_at_str = created_at_raw.isoformat()
    elif created_at_raw:
        created_at_str = str(created_at_raw)
    else:
        created_at_str = None

    try:
        total_amt = float(sr.total_amount) if sr.total_amount is not None else 0.0
    except (ValueError, TypeError):
        total_amt = 0.0

    return {
        "booking_id": sr.id,
        "request_id": sr.request_id,
        "job_id": sr.id,
        "status": sr.status,
        "is_accepted": is_accepted,
        "tracking_available": tracking_available,
        "technician_assigned": technician_assigned,
        "technician_accepted": technician_accepted,
        "service_category": sr.service_category or "",
        "issue_title": sr.issue_title or "",
        "description": sr.description or "",
        "customer_name": sr.customer_name or "",
        "phone": sr.phone or "",
        "created_at": created_at_str,
        "preferred_date": str(sr.preferred_date) if sr.preferred_date else "",
        "preferred_time": sr.preferred_time or "",
        "total_amount": total_amt,
        "payment_method": sr.payment_method or "COD",
        "payment_status": sr.payment_status or "pending",
        "cart_data": sr.cart_data or [],
        "vendor": vendor_data,
        "service_location": {
            "address": sr.address or "",
            "latitude": dest_lat,
            "longitude": dest_lng,
        },
        "destination": {
            "address": sr.address or "",
            "latitude": dest_lat,
            "longitude": dest_lng,
        },
        "technician": technician_data,
        "technician_name": tech_name if is_accepted else "",
        "technician_phone": tech_phone if (is_accepted and has_full_access) else "",
        "technician_photo": tech_photo if is_accepted else "",
        "technician_rating": tech_rating if is_accepted else None,
        "technician_location": technician_loc_data,
        "freshness": freshness,
        "distance_m": distance_m,
        "distance_km": distance_km,
        "eta_seconds": eta_seconds,
        "eta_minutes": eta_minutes,
        "start_otp": start_otp,
        "tracking_token": str(sr.tracking_token) if (has_full_access and sr.tracking_token) else None,
        "quote": WorkforceIntegrationService.get_quote_by_booking_id(sr.request_id).get("quote") if sr.status not in ["draft", "new_request"] else None,
    }


class CustomerBookingLiveLocationView(APIView):
    """
    GET /api/booking/<pk>/live-location/?token=<uuid>
    Returns service destination + technician live tracking data from workforce integration.

    Security model:
    - Authorization required: ?token=<tracking_token> matching the booking, OR
      authenticated booking owner (customer), OR authenticated admin.
    - If a token is provided and does not match the booking -> 403 Forbidden.
    - If no token is provided and user is unauthenticated -> 401 Unauthorized.
    """
    permission_classes = [permissions.AllowAny]
    # Fixes EC-06: scoped separately from the blanket anon/user rate so a
    # live-tracking poll loop has room to work without opening the endpoint
    # up to unbounded scraping.
    throttle_classes  = [ScopedRateThrottle]
    throttle_scope    = "tracking_lookup"

    def get(self, request, pk=None, identifier=None):
        sr_id = pk or identifier
        try:
            if str(sr_id).isdigit():
                sr = ServiceRequest.objects.get(pk=int(sr_id))
            else:
                sr = ServiceRequest.objects.get(request_id=sr_id)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        provided_token = request.query_params.get("token") or request.data.get("token")
        token_matches = bool(
            provided_token and
            sr.tracking_token and
            str(sr.tracking_token).lower() == str(provided_token).strip().lower() and
            not _tracking_token_is_expired(sr)  # Fixes EC-08
        )
        is_admin_user = bool(request.user and request.user.is_authenticated and is_admin_role(request.user))
        is_owner = bool(request.user and request.user.is_authenticated and sr.customer_id and sr.customer_id == request.user.id)

        # If a token was provided but did not match -> Deny immediately (403)
        if provided_token and not token_matches and not is_admin_user:
            return _error("Invalid tracking token.", 403)

        # If user is authenticated as customer but does not own this booking -> Deny (403)
        if request.user and request.user.is_authenticated and not (is_owner or is_admin_user or token_matches):
            return _error("You are not authorized to track this booking.", 403)

        # If no valid token and unauthenticated -> Deny (401)
        if not (token_matches or is_admin_user or is_owner):
            return _error("Valid tracking token or authentication required.", 401)

        payload = _build_tracking_payload(sr, has_full_access=True)
        return _success(data=payload)


class CustomerPublicTrackingView(APIView):
    """
    GET /api/tracking/<tracking_token>/
    Resolves a booking strictly by its secure tracking token and returns the live
    tracking data. The token is the bearer authorization credential.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "tracking_lookup"

    def get(self, request, tracking_token):
        import uuid as _uuid
        try:
            token_uuid = _uuid.UUID(str(tracking_token).strip())
        except (ValueError, AttributeError):
            return _error("Invalid tracking link.", 404)

        try:
            sr = ServiceRequest.objects.get(tracking_token=token_uuid)
        except ServiceRequest.DoesNotExist:
            return _error("Tracking link not found or expired.", 404)

        if _tracking_token_is_expired(sr):  # Fixes EC-08
            return _error("Tracking link not found or expired.", 404)

        payload = _build_tracking_payload(sr, has_full_access=True)
        return _success(data=payload)


class CustomerQuoteDetailView(APIView):
    """
    GET /api/booking/quote/<str:token>/
    Fetches the quote detail by quote decision/tracking token from the vendor.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        res = WorkforceIntegrationService.get_quote_by_token(token)
        if res.get("success"):
            return _success(data=res.get("quote"))
        return _error(res.get("message", "Failed to fetch quote detail."), 400)


class FeedbackTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "feedback"

    def get(self, request, token):
        try:
            fb = ServiceFeedback.objects.select_related("service_request").get(feedback_token=token)
        except ServiceFeedback.DoesNotExist:
            return _error("Invalid feedback token.", 404)

        if fb.is_submitted:
            return _error("Feedback already submitted.", 400)

        sr_data = FeedbackTokenSummarySerializer(fb.service_request).data
        return _success(data={"service_request": sr_data})

    def post(self, request, token):
        try:
            fb = ServiceFeedback.objects.select_related("service_request").get(feedback_token=token)
        except ServiceFeedback.DoesNotExist:
            return _error("Invalid feedback token.", 404)

        if fb.is_submitted:
            return _error("Feedback has already been submitted for this booking.", 400)

        serializer = ServiceFeedbackSubmitSerializer(fb, data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)

        with transaction.atomic():
            serializer.save(is_submitted=True, submitted_at=timezone.now())

        # Notify Workforce of technician feedback rating
        try:
            from workforce_integration.services import WorkforceIntegrationService
            sr = fb.service_request
            tech_id = getattr(sr, "workforce_job_id", "") or str(sr.id)
            WorkforceIntegrationService.send_technician_feedback(
                service_request=sr,
                technician_id=tech_id,
                rating=float(fb.rating or 5),
                comments=fb.comment or ""
            )
        except Exception as wf_err:
            logger.info(f"Workforce feedback push notice: {wf_err}")

        return _success(message="Thank you! Your feedback has been recorded.")


class PublicFeedbackListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category = request.query_params.get("category")
        feedbacks = ServiceFeedback.objects.filter(is_submitted=True).select_related("service_request")
        if category:
            feedbacks = feedbacks.filter(
                Q(service_request__service_category__iexact=category) |
                Q(service_request__service_category__icontains=category)
            )
        feedbacks = feedbacks.order_by("-submitted_at")[:20]
        data = [
            {
                "id": f.id,
                "name": getattr(f.service_request, "customer_name", "Customer"),
                "customer_name": getattr(f.service_request, "customer_name", "Customer"),
                "category": getattr(f.service_request, "service_category", ""),
                "service_category": getattr(f.service_request, "service_category", ""),
                "rating": f.rating or 5,
                "text": f.comment or "Great service!",
                "comment": f.comment or "Great service!",
                "submitted_at": f.submitted_at,
            }
            for f in feedbacks
            if f.service_request
        ]
        return _success(data=data)


# ─── 2. ADMIN SERVICE REQUEST VIEWS ───────────────────────────────────────────

class AdminSRListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        from django.db.models import Prefetch
        from rest_framework.pagination import PageNumberPagination
        from service_requests.models import BookingAssignment

        qs = _sr_qs(request).select_related("customer", "feedback").prefetch_related(
            Prefetch("child_requests", queryset=ServiceRequest.objects.select_related("customer").order_by("created_at")),
            "child_requests__reschedule_requests",
            "child_requests__work_extensions",
            Prefetch("reschedule_requests", queryset=RescheduleRequest.objects.all().order_by("-id")),
            Prefetch("work_extensions", queryset=WorkExtension.objects.all().order_by("-created_at")),
            Prefetch("refund_requests", queryset=RefundRequest.objects.all()),
            Prefetch("assignments", queryset=BookingAssignment.objects.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id")),
        ).order_by("-created_at")

        status_param = request.query_params.get("status")
        category_param = request.query_params.get("service_category")
        search_param = request.query_params.get("search")

        if status_param:
            qs = qs.filter(status=status_param)
        if category_param:
            qs = qs.filter(service_category=category_param)
        if search_param:
            qs = qs.filter(
                Q(request_id__icontains=search_param) |
                Q(customer__customer_id__icontains=search_param) |
                Q(customer_name__icontains=search_param) |
                Q(phone__icontains=search_param) |
                Q(issue_title__icontains=search_param)
            )

        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginated_qs = paginator.paginate_queryset(qs, request, view=self)
        serializer = ServiceRequestListSerializer(paginated_qs, many=True, context={"request": request})
        return _success(data={
            "count": paginator.page.paginator.count,
            "next": paginator.get_next_link(),
            "previous": paginator.get_previous_link(),
            "results": serializer.data
        })


class AdminSRDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Service request not found.", 404)
        return _success(data=ServiceRequestDetailSerializer(sr, context={"request": request}).data)


class AdminSRReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        apply_transition(sr, ServiceRequest.Status.REVIEWED, actor=request.user)
        sr.save(update_fields=["status", "updated_at"])
        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Status updated to Reviewed.",
        )


class AdminSRPriorityView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        serializer = AdminChangePrioritySerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        sr.priority = serializer.validated_data["priority"]
        sr.save(update_fields=["priority", "updated_at"])
        return _success(message=f"Priority updated to {sr.get_priority_display()}.")


class AdminSRAssignView(APIView):
    """PATCH/POST /api/admin/service-requests/<id>/dispatch/ or /assign/ → Dispatches booking to workforce and persists assigned partner"""
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        return self._dispatch(request, pk)

    def post(self, request, pk):
        return self._dispatch(request, pk)

    def _dispatch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        notes = request.data.get("notes", "")
        with transaction.atomic():
            apply_transition(sr, ServiceRequest.Status.ASSIGNED, actor=request.user)

            # Persist technician details passed by admin
            if request.data.get("technician_name") or request.data.get("employee_name"):
                sr.technician_name = request.data.get("technician_name") or request.data.get("employee_name")
            if request.data.get("technician_phone") or request.data.get("employee_phone"):
                sr.technician_phone = request.data.get("technician_phone") or request.data.get("employee_phone")
            if request.data.get("technician_photo"):
                sr.technician_photo = request.data.get("technician_photo")
            if request.data.get("technician_rating"):
                sr.technician_rating = request.data.get("technician_rating")
            if request.data.get("latitude") or request.data.get("technician_latitude"):
                sr.technician_latitude = request.data.get("latitude") or request.data.get("technician_latitude")
            if request.data.get("longitude") or request.data.get("technician_longitude"):
                sr.technician_longitude = request.data.get("longitude") or request.data.get("technician_longitude")
            if request.data.get("location_name") or request.data.get("technician_location_name"):
                sr.technician_location_name = request.data.get("location_name") or request.data.get("technician_location_name")

            sr.save()
            WorkforceIntegrationService.dispatch_job(sr, notes=notes)

        # Broadcast live tracking update to customer
        try:
            from .notifications import broadcast_tracking_event
            full_payload = _build_tracking_payload(sr, has_full_access=True)
            broadcast_tracking_event(sr, event_type="technician_assigned", custom_data=full_payload)
        except Exception as b_err:
            logger.warning(f"Error broadcasting technician_assigned: {b_err}")

        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Booking dispatched to workforce management system.",
        )


AdminSRDispatchView = AdminSRAssignView


class AdminSRUpdateTechnicianLocationView(APIView):
    """
    POST/PATCH /api/admin/service-requests/<pk>/technician-location/
    Allows admin or field technician app to update live GPS coordinates and partner details.
    """
    permission_classes = [permissions.AllowAny]

    def patch(self, request, pk=None, identifier=None):
        return self._handle(request, pk or identifier)

    def post(self, request, pk=None, identifier=None):
        return self._handle(request, pk or identifier)

    def _handle(self, request, pk):
        # Require staff/admin authentication or workforce webhook secret header
        is_staff_or_admin = (
            request.user and request.user.is_authenticated and (getattr(request.user, "is_staff", False) or getattr(request.user, "role", "") in ["admin", "staff", "manager"])
        )
        from workforce_integration.views import _verify_webhook_signature
        has_wf_secret = _verify_webhook_signature(request)
        if not is_staff_or_admin and not has_wf_secret:
            return _error("Only authorized staff or workforce services can update technician location.", 403)

        try:
            if str(pk).isdigit():
                sr = ServiceRequest.objects.get(pk=int(pk))
            else:
                sr = ServiceRequest.objects.get(request_id=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        if "technician_name" in request.data or "employee_name" in request.data:
            sr.technician_name = request.data.get("technician_name") or request.data.get("employee_name")
        if "technician_phone" in request.data or "employee_phone" in request.data:
            sr.technician_phone = request.data.get("technician_phone") or request.data.get("employee_phone")
        if "technician_photo" in request.data:
            sr.technician_photo = request.data.get("technician_photo")
        if "technician_rating" in request.data:
            sr.technician_rating = request.data.get("technician_rating")
        if "latitude" in request.data or "technician_latitude" in request.data or "lat" in request.data:
            sr.technician_latitude = request.data.get("latitude") or request.data.get("technician_latitude") or request.data.get("lat")
        if "longitude" in request.data or "technician_longitude" in request.data or "lng" in request.data:
            sr.technician_longitude = request.data.get("longitude") or request.data.get("technician_longitude") or request.data.get("lng")
        if "location_name" in request.data or "technician_location_name" in request.data or "current_location_name" in request.data:
            sr.technician_location_name = request.data.get("location_name") or request.data.get("technician_location_name") or request.data.get("current_location_name")
        if "status" in request.data and request.data.get("status") in dict(ServiceRequest.Status.choices):
            sr.status = request.data.get("status")

        sr.save()

        # Broadcast live tracking update via WebSockets
        try:
            from .notifications import broadcast_tracking_event
            full_payload = _build_tracking_payload(sr, has_full_access=True)
            broadcast_tracking_event(sr, event_type="technician_location_updated", custom_data=full_payload)
        except Exception as b_err:
            logger.warning(f"Error broadcasting live location: {b_err}")

        return _success(
            data=_build_tracking_payload(sr, has_full_access=True),
            message="Technician live location updated successfully."
        )


class AdminSRRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        apply_transition(sr, ServiceRequest.Status.REJECTED, actor=request.user)
        sr.save(update_fields=["status", "updated_at"])
        WorkforceIntegrationService.cancel_workforce_job(sr, reason="Rejected by Admin")

        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Service request rejected.",
        )


class AdminSRVerifyView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        with transaction.atomic():
            apply_transition(sr, ServiceRequest.Status.VERIFIED, actor=request.user)
            sr.save(update_fields=["status", "updated_at"])
            fb, _fb_created = ServiceFeedback.objects.get_or_create(service_request=sr)

        # Fixes HS-E-02: this created the feedback token but never actually
        # sent it anywhere -- send_completion_and_feedback_email() exists
        # (its own docstring says 'sent automatically when employee marks job
        # complete') but had no caller anywhere in the codebase, so a
        # customer's feedback request was silently never delivered even
        # after admin verification. Fire it from a background thread so
        # this endpoint's response is never delayed by mail delivery.
        try:
            import threading
            from .notifications import send_completion_and_feedback_email
            threading.Thread(
                target=send_completion_and_feedback_email,
                args=(sr, str(fb.feedback_token)),
                daemon=True,
            ).start()
        except Exception as notify_err:
            logger.warning(f"Could not start feedback-link notification for booking {sr.id}: {notify_err}")

        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Service request verified. Feedback link generated and sent to customer.",
        )


class AdminSRReworkView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        apply_transition(sr, ServiceRequest.Status.REWORK_REQUESTED, actor=request.user)
        sr.save(update_fields=["status", "updated_at"])
        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Status updated to Rework Required.",
        )


class AdminSRResendFeedbackView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        fb, _ = ServiceFeedback.objects.get_or_create(service_request=sr)

        # Fixes HS-E-02: this endpoint is literally named 'resend feedback'
        # but never called send_feedback_link() -- it only returned the
        # token in the API response for whatever called this endpoint,
        # never actually resent anything to the customer.
        try:
            import threading
            from .notifications import send_feedback_link
            threading.Thread(
                target=send_feedback_link,
                args=(sr, str(fb.feedback_token)),
                daemon=True,
            ).start()
        except Exception as notify_err:
            logger.warning(f"Could not start feedback-link resend for booking {sr.id}: {notify_err}")

        return _success(data={"feedback_token": str(fb.feedback_token)}, message="Feedback link resent to customer.")


class AdminSRCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        apply_transition(sr, ServiceRequest.Status.CLOSED, actor=request.user)
        sr.save(update_fields=["status", "updated_at"])
        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Service request closed.",
        )


class AdminFeedbackListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = ServiceFeedback.objects.filter(is_submitted=True).select_related("service_request").order_by("-submitted_at")
        return _success(data=ServiceFeedbackAdminSerializer(qs, many=True).data)


class AdminFeedbackMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        from django.db.models import Avg, Count
        submitted = ServiceFeedback.objects.filter(is_submitted=True)
        stats = submitted.aggregate(avg_rating=Avg("rating"), total=Count("id"))
        return _success(data={
            "total_feedbacks": stats["total"] or 0,
            "average_rating": round(stats["avg_rating"] or 0.0, 2),
        })


# ─── 3. WORK EXTENSION VIEWS ──────────────────────────────────────────────────

class AdminWorkExtensionListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = WorkExtension.objects.select_related("service_request").prefetch_related("items").order_by("-created_at")
        status_param = request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)
        return _success(data=WorkExtensionSerializer(qs, many=True).data)


class AdminWorkExtensionApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, ext_id):
        try:
            extension = WorkExtension.objects.get(id=ext_id)
        except WorkExtension.DoesNotExist:
            return _error("Work extension not found.", 404)

        approved_amount = request.data.get("approved_amount", extension.technician_estimate)
        extension.admin_approved_amount = approved_amount
        extension.status = WorkExtension.Status.ADMIN_APPROVED
        extension.token_expires_at = timezone.now() + timezone.timedelta(hours=72)
        extension.save()
        return _success(data=WorkExtensionSerializer(extension).data, message="Work extension approved by admin.")


class AdminWorkExtensionApprovePurchaseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, item_id):
        try:
            item = WorkExtensionItem.objects.get(id=item_id)
        except WorkExtensionItem.DoesNotExist:
            return _error("Work extension item not found.", 404)

        approved_limit = request.data.get("approved_limit", item.technician_purchase_approved_limit)
        item.technician_purchase_approved_limit = approved_limit
        item.purchase_approved_by = request.user
        item.status = WorkExtensionItem.Status.PURCHASE_APPROVED
        item.save()
        return _success(data=WorkExtensionItemSerializer(item).data, message="Purchase cap approved.")


class AdminWorkExtensionAssignView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, ext_id):
        try:
            extension = WorkExtension.objects.get(id=ext_id)
        except WorkExtension.DoesNotExist:
            return _error("Work extension not found.", 404)

        extension.status = WorkExtension.Status.PENDING_ASSIGNMENT
        extension.save()
        return _success(data=WorkExtensionSerializer(extension).data, message="Specialist assignment queued.")


class CustomerWorkExtensionPortalView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        extension = WorkExtension.objects.filter(decision_token=token).first()
        if not extension:
            sr = ServiceRequest.objects.filter(Q(id=token) if str(token).isdigit() else Q(request_id=token)).first()
            if sr:
                extension = sr.work_extensions.exclude(
                    status__in=[WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.CUSTOMER_DECLINED, WorkExtension.Status.RESOLVED]
                ).order_by("-id").first()

        if not extension:
            return _error("Work extension not found.", 404)

        return _success(data=WorkExtensionSerializer(extension).data)


class CustomerWorkExtensionDecideView(APIView):
    permission_classes = [permissions.AllowAny]

    def patch(self, request, token):
        extension = WorkExtension.objects.filter(decision_token=token).first()
        if not extension:
            sr = ServiceRequest.objects.filter(Q(id=token) if str(token).isdigit() else Q(request_id=token)).first()
            if sr:
                extension = sr.work_extensions.exclude(
                    status__in=[WorkExtension.Status.CUSTOMER_ACCEPTED, WorkExtension.Status.CUSTOMER_DECLINED, WorkExtension.Status.RESOLVED]
                ).order_by("-id").first()

        if not extension:
            return _error("Work extension record not found.", 404)

        decision = request.data.get("decision", "ACCEPT")
        notes = request.data.get("notes", "")

        try:
            updated_ext = record_customer_decision(
                extension=extension,
                decision=decision,
                channel=WorkExtension.DecisionChannel.PORTAL,
                notes=notes,
            )
        except Exception as e:
            return _error(str(e), 400)

        # Notify Workforce of customer extension approval/rejection
        try:
            from workforce_integration.services import WorkforceIntegrationService
            WorkforceIntegrationService.notify_extension_decision(
                service_request=updated_ext.service_request,
                extension_id=updated_ext.id,
                decision="accepted" if str(decision).upper() == "ACCEPT" else "declined",
                notes=notes,
            )
        except Exception as wf_e:
            logger.info(f"Workforce extension decision notice: {wf_e}")

        return _success(data=WorkExtensionSerializer(updated_ext).data, message="Decision recorded successfully.")


class SupportWorkExtensionRecordDecisionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, ext_id):
        try:
            extension = WorkExtension.objects.get(id=ext_id)
        except WorkExtension.DoesNotExist:
            return _error("Work extension not found.", 404)

        decision = request.data.get("decision", "ACCEPT")
        notes = request.data.get("notes", "")

        try:
            updated_ext = record_customer_decision(
                extension=extension,
                decision=decision,
                channel=WorkExtension.DecisionChannel.PHONE,
                user=request.user,
                notes=notes,
            )
        except Exception as e:
            return _error(str(e), 400)

        return _success(data=WorkExtensionSerializer(updated_ext).data, message="Support decision recorded.")


class ServiceRequestSupplementalInvoiceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, sr_id):
        invoices = SupplementalInvoice.objects.filter(service_request_id=sr_id)
        return _success(data=SupplementalInvoiceSerializer(invoices, many=True).data)


# ─── 4. RESCHEDULE VIEWS ──────────────────────────────────────────────────────

class CustomerRescheduleRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        new_date = request.data.get("new_date") or request.data.get("requested_scheduled_at")
        new_time_slot = request.data.get("new_time_slot", "09-10")
        reason = request.data.get("reason", "schedule_conflict")
        additional_notes = request.data.get("additional_notes", "")

        if not booking_id or not new_date:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "booking_id and new_date are required."}, status_code=400)

        booking = ServiceRequest.objects.filter(Q(pk=booking_id) if str(booking_id).isdigit() else Q(request_id=booking_id)).first()
        if not booking:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Booking not found."}, status_code=404)

        if booking.status in ["cancelled", "completed", "closed", "rejected"]:
            return _standard_response(success=False, error={"code": "NOT_ELIGIBLE", "message": f"Booking in '{booking.status}' status cannot be rescheduled."}, status_code=400)

        attachment_obj = None
        if "file" in request.FILES or "attachment" in request.FILES:
            upload_file = request.FILES.get("file") or request.FILES.get("attachment")
            attachment_obj = RescheduleAttachment.objects.create(file=upload_file, original_name=upload_file.name, uploaded_by=request.user)

        try:
            rr = sr_services.create_reschedule_request(
                booking=booking,
                requested_by=request.user,
                new_date=new_date,
                new_time_slot=new_time_slot,
                reason=reason,
                persona="CUSTOMER",
                additional_notes=additional_notes,
                attachment=attachment_obj,
            )
        except Exception as e:
            return _standard_response(success=False, error={"code": "INVALID_STATE", "message": str(e)}, status_code=400)

        return _standard_response(success=True, data=RescheduleRequestSerializer(rr).data, status_code=201)


class CustomerRescheduleRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = sr_services.list_reschedule_requests(request.user, "CUSTOMER")
        return _standard_response(success=True, data=RescheduleRequestSerializer(qs, many=True).data)


class CustomerRescheduleRequestCancelView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        try:
            rr = RescheduleRequest.objects.get(pk=pk, requested_by=request.user)
            rr.status = RescheduleStatus.CANCELLED
            rr.save(update_fields=["status", "updated_at"])
            return _standard_response(success=True, data=RescheduleRequestSerializer(rr).data)
        except RescheduleRequest.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Reschedule request not found."}, status_code=404)


class CustomerBookingAvailableSlotsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, booking_id):
        try:
            booking = ServiceRequest.objects.get(pk=booking_id)
        except ServiceRequest.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Booking not found."}, status_code=404)

        target_date = request.query_params.get("date") or str(booking.preferred_date or timezone.now().date())
        slots = sr_services.get_real_technician_availability(booking.company, target_date)
        return _standard_response(success=True, data=slots, meta={"date": str(target_date)})


class CustomerActiveBookingsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_email = (getattr(request.user, 'email', '') or '').strip()
        raw_phone = (getattr(request.user, 'phone', None) or '').strip()
        clean_phone = raw_phone[-10:] if len(raw_phone) >= 10 else raw_phone

        query = Q(customer=request.user)
        if user_email:
            query |= Q(email__iexact=user_email)
        if clean_phone:
            query |= (
                Q(phone__endswith=clean_phone)
                | Q(phone=clean_phone)
                | Q(phone=raw_phone)
                | Q(phone=f"+91{clean_phone}")
            )

        allowed_statuses = ["new_request", "waiting_for_payment", "confirmed", "reviewed", "assigned", "accepted", "on_the_way", "arrived", "in_progress", "proof_submitted", "unassigned"]
        from django.db.models import Prefetch
        from service_requests.models import BookingAssignment
        qs = ServiceRequest.objects.filter(query, status__in=allowed_statuses).select_related("customer", "feedback").prefetch_related(
            Prefetch("child_requests", queryset=ServiceRequest.objects.select_related("customer").order_by("created_at")),
            "child_requests__reschedule_requests",
            "child_requests__work_extensions",
            Prefetch("reschedule_requests", queryset=RescheduleRequest.objects.all().order_by("-id")),
            Prefetch("work_extensions", queryset=WorkExtension.objects.all().order_by("-created_at")),
            Prefetch("refund_requests", queryset=RefundRequest.objects.all()),
            Prefetch("assignments", queryset=BookingAssignment.objects.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id")),
        ).order_by("-id").distinct()
        return _standard_response(success=True, data=ServiceRequestListSerializer(qs, many=True, context={"request": request}).data)


class AdminRescheduleRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = RescheduleRequest.objects.select_related("booking", "requested_by", "admin_reviewed_by").order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return _standard_response(success=True, data=RescheduleRequestSerializer(qs, many=True).data)


class AdminRescheduleRequestReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def patch(self, request, pk):
        try:
            rr = RescheduleRequest.objects.select_related("booking").get(pk=pk)
        except RescheduleRequest.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "RescheduleRequest not found."}, status_code=404)

        action = request.data.get("action") or request.data.get("target_status")
        notes = request.data.get("notes", "")

        if action in ["APPROVED", "RESCHEDULED"]:
            rr = sr_services.admin_approve_reschedule(request.user, pk, notes=notes)
        elif action == "REJECTED":
            rr = sr_services.admin_reject_reschedule(request.user, pk, reason="OTHER", notes=notes)

        return _standard_response(success=True, data=RescheduleRequestSerializer(rr).data)


class AdminRescheduleApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        notes = request.data.get("notes", "")
        try:
            rr = sr_services.admin_approve_reschedule(request.user, pk, notes=notes)
            return _standard_response(success=True, data=AdminRescheduleListSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "APPROVE_FAILED", "message": str(e)}, status_code=400)


class AdminRescheduleRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        reason = request.data.get("reason", "OTHER")
        notes = request.data.get("notes", "")
        try:
            rr = sr_services.admin_reject_reschedule(request.user, pk, reason=reason, notes=notes)
            return _standard_response(success=True, data=AdminRescheduleListSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "REJECT_FAILED", "message": str(e)}, status_code=400)


class AdminRescheduleSuggestSlotView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            rr = RescheduleRequest.objects.get(pk=pk)
            slots = sr_services.suggest_alternate_slot(rr)
            return _standard_response(success=True, data=AdminRescheduleListSerializer(rr).data, meta={"suggested_slots": slots})
        except Exception as e:
            return _standard_response(success=False, error={"code": "SUGGEST_FAILED", "message": str(e)}, status_code=400)


class CustomerRescheduleRespondToSuggestionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request, pk):
        try:
            rr = RescheduleRequest.objects.get(pk=pk, requested_by=request.user)
            rr.status = RescheduleStatus.RESCHEDULED
            rr.save(update_fields=["status", "updated_at"])
            return _standard_response(success=True, data=RescheduleRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "RESPOND_FAILED", "message": str(e)}, status_code=400)


# ─── 5. REFUND VIEWS ──────────────────────────────────────────────────────────

class CustomerEligibleBookingsListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        user_email = (getattr(request.user, 'email', '') or '').strip()
        raw_phone = (getattr(request.user, 'phone', None) or '').strip()
        clean_phone = raw_phone[-10:] if len(raw_phone) >= 10 else raw_phone

        query = Q(customer=request.user)
        if user_email:
            query |= Q(email__iexact=user_email)
        if clean_phone:
            query |= (
                Q(phone__endswith=clean_phone)
                | Q(phone=clean_phone)
                | Q(phone=raw_phone)
                | Q(phone=f"+91{clean_phone}")
            )

        from django.db.models import Prefetch
        from service_requests.models import BookingAssignment
        bookings = ServiceRequest.objects.filter(
            query,
            status__in=[ServiceRequest.Status.COMPLETED, ServiceRequest.Status.CLOSED, ServiceRequest.Status.VERIFIED]
        ).select_related("customer", "feedback").prefetch_related(
            Prefetch("child_requests", queryset=ServiceRequest.objects.select_related("customer").order_by("created_at")),
            "child_requests__reschedule_requests",
            "child_requests__work_extensions",
            Prefetch("reschedule_requests", queryset=RescheduleRequest.objects.all().order_by("-id")),
            Prefetch("work_extensions", queryset=WorkExtension.objects.all().order_by("-created_at")),
            Prefetch("refund_requests", queryset=RefundRequest.objects.all()),
            Prefetch("assignments", queryset=BookingAssignment.objects.filter(status__in=["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]).order_by("-id")),
        ).exclude(refund_requests__isnull=False).order_by("-created_at").distinct()
        return _standard_response(success=True, data=ServiceRequestListSerializer(bookings, many=True, context={"request": request}).data)


class CustomerBookingRefundSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, booking_id):
        booking = ServiceRequest.objects.filter(pk=booking_id, customer=request.user).first()
        if not booking:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Booking not found."}, status_code=404)
        return _standard_response(success=True, data={"booking_id": booking.id, "request_id": booking.request_id, "paid_amount": float(booking.total_amount)})


class CustomerRefundRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        refund_type = request.data.get("refund_type", "FULL")
        requested_amount = request.data.get("requested_amount")
        reason = request.data.get("reason", "POOR_QUALITY")
        additional_notes = request.data.get("additional_notes", "")

        if not booking_id:
            return _standard_response(success=False, error={"code": "MISSING_FIELD", "message": "'booking_id' is required."}, status_code=400)

        booking = ServiceRequest.objects.filter(pk=booking_id).first()
        if not booking:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Booking not found."}, status_code=404)

        amount = Decimal(str(requested_amount)) if requested_amount else booking.total_amount

        rr = sr_services.create_refund_request(
            booking=booking,
            customer=request.user,
            amount=amount,
            reason=reason,
            additional_notes=additional_notes,
            refund_type=refund_type,
        )
        return _standard_response(success=True, data=CustomerRefundRequestSerializer(rr).data, status_code=201)


class CustomerRefundRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request):
        qs = sr_services.list_refund_requests(request.user, "CUSTOMER")
        return _standard_response(success=True, data=CustomerRefundRequestSerializer(qs, many=True).data)


class CustomerRefundRequestDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCustomer]

    def get(self, request, pk):
        try:
            rr = RefundRequest.objects.get(pk=pk, customer=request.user)
            return _standard_response(success=True, data=CustomerRefundRequestSerializer(rr).data)
        except RefundRequest.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Refund request not found."}, status_code=404)


class AdminRefundRequestListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        status_filter = request.query_params.get("status")
        filters = {"status": status_filter} if status_filter else None
        qs = sr_services.list_refund_requests(request.user, "ADMIN", filters=filters)
        return _standard_response(success=True, data=AdminRefundRequestSerializer(qs, many=True).data)


class AdminRefundRequestDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        try:
            rr = RefundRequest.objects.get(pk=pk)
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except RefundRequest.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Refund request not found."}, status_code=404)


class AdminRefundApproveView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        is_full = request.data.get("is_full", True)
        approved_amount = request.data.get("approved_amount")
        internal_note = request.data.get("internal_note", "")

        try:
            rr = sr_services.admin_approve_refund(
                admin_user=request.user,
                refund_id=pk,
                is_full=is_full,
                approved_amount=approved_amount,
                internal_note=internal_note,
            )
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "APPROVE_FAILED", "message": str(e)}, status_code=400)


class AdminRefundRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        internal_note = request.data.get("internal_note", "")
        try:
            rr = sr_services.admin_reject_refund(admin_user=request.user, refund_id=pk, internal_note=internal_note)
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "REJECT_FAILED", "message": str(e)}, status_code=400)


class AdminRefundRequestInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        note = request.data.get("note", "")
        try:
            rr = RefundRequest.objects.get(pk=pk)
            rr.status = RefundStatus.INFO_REQUESTED
            rr.admin_notes = f"{rr.admin_notes}\n[{timezone.now()}] {note}".strip()
            rr.save(update_fields=["status", "admin_notes", "updated_at"])
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "REQUEST_INFO_FAILED", "message": str(e)}, status_code=400)


class AdminRefundSendToFinanceView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            rr = sr_services.admin_send_to_finance(request.user, pk)
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "FINANCE_FAILED", "message": str(e)}, status_code=400)


class AdminRefundInternalNoteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        note = request.data.get("note", "")
        try:
            rr = RefundRequest.objects.get(pk=pk)
            timestamp = timezone.now().strftime("%Y-%m-%d %H:%M")
            actor_name = request.user.get_full_name() or request.user.username
            rr.internal_notes = f"{rr.internal_notes}\n[{timestamp}] {actor_name}: {note}".strip()
            rr.save(update_fields=["internal_notes", "updated_at"])
            return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
        except Exception as e:
            return _standard_response(success=False, error={"code": "NOTE_FAILED", "message": str(e)}, status_code=400)


# ─── 6. COMPLAINT VIEWS ───────────────────────────────────────────────────────

class CustomerComplaintCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        category = request.data.get("category", "SERVICE_QUALITY")
        description = request.data.get("description", "")

        booking = None
        if booking_id:
            booking = ServiceRequest.objects.filter(Q(pk=booking_id) if str(booking_id).isdigit() else Q(request_id=booking_id)).first()

        attachment_files = request.FILES.getlist("attachments")
        try:
            c = sr_services.create_complaint(
                customer=request.user,
                booking=booking,
                category=category,
                description=description,
                attachment_files=attachment_files or None,
            )
            return _success(_serialize_complaint(c), "Complaint submitted.", 201)
        except Exception as exc:
            return _error(str(exc))


class CustomerComplaintListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = sr_services.list_customer_complaints(request.user, request.GET)
        return _success([_serialize_complaint(c) for c in qs])


class CustomerComplaintDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            c = Complaint.objects.prefetch_related("messages", "status_history", "attachments").get(pk=pk)
            if c.raised_by != request.user and not is_admin_role(request.user):
                return _error("Permission denied.", 403)
            return _success(_serialize_complaint(c, include_messages=True))
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)


class CustomerComplaintMessageCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            c = sr_services.get_complaint_detail(request.user, pk)
        except Exception:
            return _error("Complaint not found.", 404)

        message = request.data.get("message", "")
        if not message:
            return _error("'message' is required.")

        resp = sr_services.add_customer_message(c, request.user, message)
        return _success({"id": resp.pk, "message": resp.message, "created_at": resp.created_at}, "Message added.", 201)


class AdminComplaintListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = sr_services.list_admin_complaints(request.user, request.GET, company=getattr(request, "company", None))
        return _success([_serialize_complaint(c) for c in qs])


class AdminComplaintDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        try:
            c = Complaint.objects.prefetch_related("messages", "status_history", "attachments").get(pk=pk)
            return _success(_serialize_complaint(c, include_messages=True))
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)


class AdminComplaintAssignView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            c = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)

        priority = request.data.get("priority")
        sr_services.assign_complaint(c, request.user, request.user, priority=priority)
        return _success(_serialize_complaint(c), "Complaint assigned.")


class AdminComplaintStatusUpdateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            c = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)

        action = request.data.get("action")
        notes = request.data.get("notes", "")

        if action == "close":
            sr_services.close_complaint(c, request.user)
        return _success(_serialize_complaint(c), f"Action {action} performed.")


class AdminComplaintResolveView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            c = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)

        resolution_type = request.data.get("resolution_type", "RESOLVED")
        notes = request.data.get("resolution_notes", "")
        refund_amount = request.data.get("refund_amount")

        sr_services.resolve_complaint(c, request.user, resolution_type, notes, refund_amount)
        return _success(_serialize_complaint(c), "Complaint resolved.")


class AdminComplaintMessageCreateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            c = Complaint.objects.get(pk=pk)
        except Complaint.DoesNotExist:
            return _error("Complaint not found.", 404)

        message = request.data.get("message", "")
        if not message:
            return _error("'message' is required.")

        resp = sr_services.add_message(c, request.user, "ADMIN", message)
        return _success({"id": resp.pk, "message": resp.message, "created_at": resp.created_at}, "Message added.", 201)


# ─── 7. ADDRESS & GEOLOCATION VIEWS ───────────────────────────────────────────

class CustomerReverseGeocodeView(APIView):
    permission_classes = [permissions.AllowAny]
    parser_classes     = [JSONParser]

    def post(self, request):
        latitude  = request.data.get("latitude")
        longitude = request.data.get("longitude")

        if latitude is None or longitude is None:
            return _standard_response(success=False, error={"code": "MISSING_COORDS", "message": "Both latitude and longitude are required."}, status_code=400)

        try:
            lat = float(latitude)
            lng = float(longitude)
        except (ValueError, TypeError):
            return _standard_response(success=False, error={"code": "INVALID_COORDS", "message": "latitude and longitude must be numeric."}, status_code=400)

        result = AddressService.reverse_geocode(lat, lng)
        return _standard_response(success=True, data=result or {"formatted_address": f"{lat:.4f}, {lng:.4f}"})


# ─── 8. MARKETING COUPONS VIEWS ───────────────────────────────────────────────

class AdminCouponAnalyticsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Sum, Count
        total_coupons = Coupon.objects.count()
        active_coupons = Coupon.objects.filter(status="Active").count()
        usages = CouponUsage.objects.all()
        total_redemptions = usages.count()
        total_discount = float(usages.aggregate(total=Sum("discount_amount"))["total"] or 0)

        return _standard_response(
            success=True,
            data={
                "totalCoupons": total_coupons,
                "activeCoupons": active_coupons,
                "totalRedemptions": total_redemptions,
                "totalDiscountGiven": total_discount,
            }
        )


class CouponListCreateView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        coupons = Coupon.objects.all().order_by("-created_at")
        data = [
            {
                "id": str(c.id),
                "code": c.code,
                "name": c.name,
                "description": c.description,
                "discountType": c.discount_type,
                "discountValue": float(c.discount_value),
                "maxDiscount": float(c.max_discount),
                "minBooking": float(c.min_booking),
                "customerEligibility": c.customer_eligibility,
                "serviceEligibility": c.service_eligibility,
                "status": c.status,
            }
            for c in coupons
        ]
        return _standard_response(success=True, data=data, meta={"count": len(data)})

    def post(self, request):
        d = request.data
        code = str(d.get("code", "")).strip().upper()
        if not code:
            return _standard_response(success=False, error={"code": "REQUIRED", "message": "Coupon code is required"}, status_code=400)

        c, _ = Coupon.objects.get_or_create(
            code=code,
            defaults={
                "name": d.get("name") or code,
                "description": d.get("description", ""),
                "discount_type": d.get("discountType", "flat"),
                "discount_value": float(d.get("discountValue") or 0),
                "max_discount": float(d.get("maxDiscount") or 0),
                "min_booking": float(d.get("minBooking") or 0),
                "status": d.get("status", "Active"),
            }
        )
        return _standard_response(success=True, data={"id": str(c.id), "code": c.code}, status_code=201)


class CouponDetailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        try:
            c = Coupon.objects.get(pk=pk)
            return _standard_response(success=True, data={"id": str(c.id), "code": c.code, "name": c.name, "status": c.status})
        except Coupon.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Coupon not found"}, status_code=404)

    def delete(self, request, pk):
        try:
            c = Coupon.objects.get(pk=pk)
            c.delete()
            return _standard_response(success=True, meta={"message": "Coupon deleted successfully"})
        except Coupon.DoesNotExist:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Coupon not found"}, status_code=404)


class CustomerCouponListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        coupons = Coupon.objects.filter(status="Active").order_by("-created_at")
        data = [
            {
                "id": str(c.id),
                "code": c.code,
                "name": c.name,
                "description": c.description,
                "discountType": c.discount_type,
                "discountValue": float(c.discount_value),
                "maxDiscount": float(c.max_discount),
                "minBooking": float(c.min_booking),
                "eligible": True,
            }
            for c in coupons
        ]
        return _standard_response(success=True, data=data, meta={"count": len(data)})


class CustomerCouponValidateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes  = [ScopedRateThrottle]  # Fixes EC-06
    throttle_scope    = "coupon_validate"

    def post(self, request):
        code = str(request.data.get("code", "")).strip().upper()
        cart_total = float(request.data.get("cart_total", 0) or request.data.get("order_amount", 0))

        if not code:
            return _standard_response(success=False, error={"code": "MISSING_CODE", "message": "Coupon code is required"}, status_code=400)

        coupon = Coupon.objects.filter(code__iexact=code, status="Active").first()
        if not coupon:
            return _standard_response(success=False, error={"code": "INVALID_COUPON", "message": f"Coupon code '{code}' is not valid."}, status_code=400)

        min_req = float(coupon.min_booking)
        if cart_total < min_req:
            diff = min_req - cart_total
            return _standard_response(
                success=False,
                error={"code": "MIN_BOOKING_NOT_MET", "message": f"Add ₹{diff:.0f} more to apply {coupon.code}"},
                status_code=400
            )

        if coupon.discount_type == "flat":
            calc_disc = float(coupon.discount_value)
        else:
            calc_disc = cart_total * (float(coupon.discount_value) / 100.0)

        discount = min(calc_disc, float(coupon.max_discount)) if coupon.max_discount > 0 else calc_disc
        discount = min(cart_total, discount)
        final_amount = max(0.0, cart_total - discount)

        return _standard_response(
            success=True,
            data={
                "coupon_id": str(coupon.id),
                "coupon_code": coupon.code,
                "discountAmount": round(discount, 2),
                "final_amount": round(final_amount, 2),
            },
            meta={"message": f"🎉 {coupon.code} applied! Saved ₹{round(discount)}"}
        )


# Backward-compatibility aliases
class CustomerRescheduleView(CustomerRescheduleRequestListView):
    def post(self, request):
        return CustomerRescheduleRequestCreateView().post(request)

class AdminRescheduleListView(AdminRescheduleRequestListView):
    pass

class AdminRescheduleActionView(AdminRescheduleRequestReviewView):
    def post(self, request, pk, action=None):
        request.data["action"] = action
        return self.patch(request, pk)

class CustomerRefundView(CustomerRefundRequestListView):
    def post(self, request):
        return CustomerRefundRequestCreateView().post(request)

class AdminRefundListView(AdminRefundRequestListView):
    pass

class AdminRefundActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    def post(self, request, pk, action):
        return AdminRefundRequestDetailView().get(request, pk)


class BookingVerifyStartOTPView(APIView):
    """
    POST /api/booking/<identifier>/verify-start-otp/
    Validates the 6-digit customer verification code entered by the technician during arrival.

    Fixes EC-02: this endpoint used to be permissions.AllowAny with no
    ownership or actor check at all — any unauthenticated POST carrying a
    guessable booking id and a correct-looking code could flip the booking
    straight to "in_progress" by writing sr.status directly, bypassing every
    rule in state_machine.ALLOWED_TRANSITIONS (including the geofence-arrival
    gate the vendor app enforces on its own equivalent endpoint).

    The live technician-facing flow does NOT call this endpoint — the vendor
    app's WorkforceJobVerifyOTPView (workforce_api/views.py) is what
    technicians actually use; it is gated by IsApprovedTechnician plus an
    explicit job.assigned_employee == request.user.employee_profile check,
    and it writes to the same shared-database row via PreServiceVerification.
    This Customer-app copy has no legitimate anonymous caller, so it is now
    restricted to authenticated admin/staff (e.g. for manual support
    overrides) and routes the status change through apply_transition() like
    every other status write in this app.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk=None, identifier=None):
        sr_id = pk or identifier or request.data.get("booking_id")
        try:
            if str(sr_id).isdigit():
                sr = ServiceRequest.objects.get(pk=int(sr_id))
            else:
                sr = ServiceRequest.objects.get(request_id=sr_id)
        except ServiceRequest.DoesNotExist:
            return _error("Booking not found.", 404)

        if getattr(sr, "otp_attempt_count", 0) >= 5:
            return _error("Verification locked due to 5 failed attempts. Please contact support.", 429)

        # Check OTP expiration
        if getattr(sr, "otp_expires_at", None) and timezone.now() > sr.otp_expires_at:
            return _error("Verification code has expired. Please request a new code.", 400)

        entered_otp = str(request.data.get("otp") or request.data.get("code") or request.data.get("start_otp") or "").strip()
        if not entered_otp:
            return _error("Please enter the 6-digit customer verification code.", 400)

        # Check if already verified
        if getattr(sr, "otp_verified", False):
            return _error("Verification code has already been used.", 400)

        if str(entered_otp) == str(sr.start_otp):
            sr.otp_verified = True
            sr.otp_verified_at = timezone.now()
            try:
                apply_transition(sr, ServiceRequest.Status.IN_PROGRESS, actor=request.user)
                sr.save(update_fields=["otp_verified", "otp_verified_at", "status", "updated_at"])
            except ValidationError as ve:
                logger.warning(f"[OTP Verify] Transition to in_progress rejected for SR {sr.id}: {ve}")
                sr.save(update_fields=["otp_verified", "otp_verified_at", "updated_at"])
                return _error(
                    f"Verification code accepted, but this booking cannot move to in-progress from its current "
                    f"status ('{sr.status}'). Please review the booking status.", 409,
                )
            except Exception as save_err:
                logger.error(f"[OTP Verify] Error saving SR: {save_err}", exc_info=True)
                return _error("Could not save verification. Please try again.", 500)

            try:
                from .notifications import broadcast_tracking_event
                full_payload = _build_tracking_payload(sr, has_full_access=True)
                broadcast_tracking_event(sr, event_type="technician_status_updated", custom_data=full_payload)
            except Exception as b_err:
                logger.warning(f"Error broadcasting status update: {b_err}")

            return _success(
                message="Customer verification code verified successfully.",
                data={
                    "verified": True,
                    "status": sr.status,
                    "booking_id": sr.id,
                    "request_id": sr.request_id,
                }
            )
        else:
            sr.otp_attempt_count = getattr(sr, "otp_attempt_count", 0) + 1
            sr.save(update_fields=["otp_attempt_count"])
            return _error("Invalid verification code. Please check the code displayed on customer screen.", 400)
