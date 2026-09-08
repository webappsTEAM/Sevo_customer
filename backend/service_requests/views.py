"""
service_requests/views.py

Two primary groups of views:
  1. Public & Customer — booking, customer dashboard, feedback, tracking, coupons, complaints, reschedules, refunds.
  2. Admin / Business — service request management, catalog, analytics, complaint resolution, refund approvals.

Decoupled from local employee models — dispatches and tracking queries delegate to WorkforceIntegrationService.
"""
import logging
import os
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
    BookingSeries,
    BookingMessage,
    TripStop,
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
    InsuranceClaimSerializer,
    TripStopSerializer,
    BookingSeriesSerializer,
    BookingMessageSerializer,
)
from .state_machine import apply_transition
from .services.decision_service import record_customer_decision
from .services.fulfillment_service import process_item_fulfillment
from .services.logistics_pricing import resolve_logistics_fare_v2, UnresolvedLogisticsFareError, LOGISTICS_CATEGORIES
from .services.routing import get_route_eta
from .services.address_service import AddressService


logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400, extra=None, errors=None, **kwargs):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    if extra:
        body.update(extra)
    if kwargs:
        body.update(kwargs)
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
    # BUGFIX: this used to fall back to "if there's exactly 1 Company row,
    # use it" -- CompanyMiddleware is a documented no-op ("operates as a
    # unified global single-application architecture"), so request.company
    # is NEVER set and this count()==1 fallback was the ONLY mechanism that
    # ever resolved a company here. It worked by accident whenever the table
    # happened to hold exactly one row, and silently returned None the
    # moment a second row existed for any reason (e.g. leftover test-suite
    # fixture companies) -- with no error anywhere. A booking created with
    # company=None can NEVER be dispatched: automatic_dispatch.dispatch_job()
    # hard-refuses any job with no company_id. Found live during end-to-end
    # testing: the companies table had accumulated 168 rows (mostly
    # obviously-synthetic e2e fixture companies -- "Acme Service Co", "GPS
    # Trace Corp", "Solar Wave Solutions 716581", etc.), silently breaking
    # dispatch for every booking made after the 2nd company appeared.
    #
    # Fixed to resolve the real operating company by its stable slug first
    # (configurable via DEFAULT_COMPANY_SLUG, defaulting to this org's own
    # company), and only fall back to the old count()==1 heuristic if that
    # slug isn't found -- so a clean single-company environment (e.g. a
    # fresh install) still works without any extra configuration.
    default_slug = os.environ.get("DEFAULT_COMPANY_SLUG", "calservices")
    company = Company.objects.filter(slug=default_slug).first()
    if company:
        return company
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
            # GT-B-01: server-side fare resolution. For a distance-priced
            # category whose tier is configured with a per-km rate and
            # which has real pickup + drop coordinates, this measures the
            # trip (services/routing.py) and computes the H.1 formula;
            # otherwise it falls back to the previous flat lane/tier
            # lookup. The client-submitted total_amount is still never
            # trusted for any logistics category.
            corrected_fare, fare_breakdown = resolve_logistics_fare_v2(
                service_category=serializer.validated_data.get("service_category", ""),
                logistics_tier=serializer.validated_data.get("logistics_tier"),
                logistics_lane=serializer.validated_data.get("logistics_lane"),
                submitted_amount=serializer.validated_data.get("total_amount", 0),
                pickup_lat=serializer.validated_data.get("latitude"),
                pickup_lng=serializer.validated_data.get("longitude"),
                drop_lat=serializer.validated_data.get("drop_latitude"),
                drop_lng=serializer.validated_data.get("drop_longitude"),
                cart_data=serializer.validated_data.get("cart_data"),
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
        #
        # BUGFIX (same day): the original version of this check compared
        # total_amount against the raw cart line-item sum with only a
        # +/-1%/Rs.5 symmetric tolerance. That's wrong -- total_amount
        # legitimately includes GST/taxes and platform fees on top of the
        # cart subtotal (the frontend adds these; cart_data only carries the
        # per-item price), so it is normally *higher* than the raw cart sum,
        # often by 15-25%+. The tight symmetric tolerance rejected every real
        # booking with tax/fees, not just tampered ones. The actual security
        # concern this check exists for is a submitted total *lower* than
        # what the cart should cost (underpaying), so the bound is now
        # one-sided: total_amount must not be noticeably below the cart
        # subtotal, and is capped at a generous multiple to still catch
        # wildly-wrong/corrupted totals without false-positiving on normal
        # tax/fee/delivery-charge/tip overhead.
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
                _submitted = float(corrected_fare)
                _lower_bound = _cart_total - max(5.0, _cart_total * 0.01)
                _upper_bound = (_cart_total * 1.75) + 100.0
                if _submitted < _lower_bound or _submitted > _upper_bound:
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
                    # HS-A-06: link a referral if the booking request carried
                    # a referral code (e.g. from a shared link). Best-effort
                    # -- link_referral() already swallows unknown codes and
                    # self-referrals, and this must never block booking
                    # creation over a referral problem.
                    referral_code = str(request.data.get("referral_code") or "").strip()
                    if referral_code:
                        try:
                            sr_services.link_referral(customer_user, referral_code)
                        except Exception as ref_err:
                            logger.warning(f"Could not link referral code for new customer {customer_user.id}: {ref_err}")
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

        job_type = str(serializer.validated_data.get("job_type") or request.data.get("job_type") or "SERVICE").upper()
        if job_type == "ESTIMATION":
            from service_requests.services.estimation_service import EstimationService
            idempotency_key = (
                request.headers.get("Idempotency-Key")
                or serializer.validated_data.get("idempotency_key")
                or request.data.get("idempotency_key")
            )
            ac_details = {
                "ac_type": serializer.validated_data.get("ac_type") or request.data.get("ac_type") or request.data.get("type"),
                "ac_brand": serializer.validated_data.get("ac_brand") or request.data.get("ac_brand") or request.data.get("brand") or "Other",
                "ac_capacity": serializer.validated_data.get("ac_capacity") or request.data.get("ac_capacity") or request.data.get("capacity"),
                "ac_quantity": serializer.validated_data.get("ac_quantity") or request.data.get("ac_quantity") or request.data.get("quantity") or 1,
                "customer_symptom": serializer.validated_data.get("customer_symptom") or request.data.get("customer_symptom") or request.data.get("symptom") or serializer.validated_data.get("description"),
                "customer_notes": serializer.validated_data.get("customer_notes") or request.data.get("customer_notes") or request.data.get("notes") or "",
            }
            booking_data = {
                "customer_name": serializer.validated_data.get("customer_name") or (customer_user.get_full_name() if customer_user else ""),
                "phone": serializer.validated_data.get("phone") or (getattr(customer_user, "phone", "") if customer_user else ""),
                "email": final_email or (getattr(customer_user, "email", "") if customer_user else ""),
                "address": serializer.validated_data.get("address", ""),
                "latitude": serializer.validated_data.get("latitude"),
                "longitude": serializer.validated_data.get("longitude"),
                "saved_address_id": request.data.get("saved_address_id"),
                "service_location_snapshot": request.data.get("service_location_snapshot") or {},
                "preferred_date": serializer.validated_data.get("preferred_date"),
                "preferred_time": serializer.validated_data.get("preferred_time", ""),
                "payment_method": request.data.get("payment_method", "COD"),
            }
            try:
                sr, created = EstimationService.create_estimation_booking(
                    customer=customer_user,
                    ac_details=ac_details,
                    booking_data=booking_data,
                    idempotency_key=idempotency_key,
                    company=company,
                )
            except Exception as e:
                if hasattr(e, "detail"):
                    return Response({"success": False, "errors": e.detail}, status=status.HTTP_400_BAD_REQUEST)
                raise e

            return _success(
                data={
                    "request_id": sr.request_id,
                    "id": sr.id,
                    "customer_id": sr.customer.customer_id if (sr.customer and hasattr(sr.customer, "customer_id")) else None,
                    "job_type": sr.job_type,
                    "payment_method": sr.payment_method,
                    "payment_status": sr.payment_status,
                    "booking_status": sr.status,
                    "total_amount": float(sr.total_amount),
                    "start_otp": sr.start_otp,
                    "tracking_token": str(sr.tracking_token) if sr.tracking_token else None,
                    "estimation": {
                        "id": sr.estimation.id,
                        "ac_type": sr.estimation.ac_type,
                        "ac_brand": sr.estimation.ac_brand,
                        "ac_capacity": sr.estimation.ac_capacity,
                        "ac_quantity": sr.estimation.ac_quantity,
                        "customer_symptom": sr.estimation.customer_symptom,
                        "status": sr.estimation.status,
                        "fee_amount": float(sr.estimation.fee.amount),
                        "fee_status": sr.estimation.fee.status,
                    } if hasattr(sr, "estimation") else None,
                },
                message="Your AC estimation request has been submitted successfully.",
                status_code=201 if created else 200,
            )

        # Ensure cart_data carries clean numeric prices matching authoritative fare
        clean_cart = serializer.validated_data.get("cart_data")
        if clean_cart and isinstance(clean_cart, list):
            for item in clean_cart:
                if isinstance(item, dict):
                    raw_p = str(item.get("price", "") or "")
                    clean_str = "".join(ch for ch in raw_p if ch.isdigit() or ch in ".-")
                    try:
                        p_val = float(clean_str)
                    except (ValueError, TypeError):
                        p_val = float(corrected_fare)
                    # For logistics bookings, if single vehicle item or placeholder indicative price, set to authoritative corrected_fare
                    if serializer.validated_data.get("service_category") in LOGISTICS_CATEGORIES:
                        if len(clean_cart) == 1 or p_val == 0:
                            item["price"] = float(corrected_fare)
                        else:
                            item["price"] = p_val
                    else:
                        item["price"] = p_val
            serializer.validated_data["cart_data"] = clean_cart

        sr = serializer.save(
            company=company,
            customer=customer_user,
            email=final_email,
            status=initial_status,
            payment_method=payment_method,
            payment_status=initial_payment_status,
            total_amount=corrected_fare,
            # GT-B-01: the itemised quote behind total_amount, when the
            # fare was distance-computed. Empty for flat-priced bookings.
            fare_breakdown=_jsonable_fare_breakdown(fare_breakdown),
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
                # Bug found: total_amount (set a few lines above to the
                # pre-discount corrected_fare, via serializer.save()) was
                # never corrected here -- final_amount was computed and
                # stored but nothing downstream ever reads it (confirmed: no
                # serializer field, no other view references sr.final_amount).
                # total_amount IS the field every downstream consumer reads
                # as the authoritative price -- most importantly the vendor
                # app's cash-collection flow (JobPayment.amount_due is built
                # directly from job.total_amount) and wallet settlement gross
                # calculation. Leaving it un-discounted meant a technician
                # could be told to collect the full pre-coupon amount in cash
                # from a customer who was shown (and charged online, where
                # applicable) the discounted price -- a real overcharge risk.
                # A sibling booking-creation path elsewhere in this same file
                # (the inspection/quote flow) already does this correctly
                # (total_amount=final_amount), confirming this is the
                # intended pattern.
                sr.total_amount = final_tot
                sr.save(update_fields=["coupon", "coupon_code_snapshot", "subtotal_amount", "discount_amount", "final_amount", "total_amount"])

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

        # Fixes idempotency gap: apply_transition() allows CANCELLED ->
        # CANCELLED as a no-op self-loop rather than rejecting it, and this
        # view had no "already cancelled" guard of its own -- so a duplicate
        # POST (double-click, a retried request after a slow/dropped
        # response) re-ran this entire handler, including auto-creating a
        # second PENDING RefundRequest for a booking that was already
        # cancelled and possibly already being refunded.
        if sr.status == ServiceRequest.Status.CANCELLED:
            return _success(
                data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
                message="Booking is already cancelled.",
            )

        if getattr(sr, "otp_verified", False) or sr.status in [
            ServiceRequest.Status.IN_PROGRESS,
            ServiceRequest.Status.PROOF_SUBMITTED,
            ServiceRequest.Status.COMPLETED,
        ]:
            return Response(
                {
                    "success": False,
                    "code": "CANCELLATION_LOCKED_AFTER_OTP",
                    "message": "Cancellation is locked because customer OTP has been verified.",
                },
                status=status.HTTP_409_CONFLICT,
            )

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

            # Fixes HS-C-04: cancelling an already-paid booking used to charge
            # and refund nothing automatically -- the customer or an admin had
            # to separately go create a refund request through a different
            # flow. This only creates the RefundRequest (status PENDING) --
            # it does NOT move any money by itself. An admin still has to
            # approve -> send to finance -> complete (which now actually
            # calls the gateway, see HS-C-05/admin_complete_refund) before
            # anything is refunded.
            if sr.payment_status == ServiceRequest.PaymentStatus.PAID:
                try:
                    sr_services.create_refund_request(
                        booking=sr,
                        customer=sr.customer,
                        amount=sr.total_amount,
                        reason=RefundReason.OTHER,
                        additional_notes=f"Auto-created on booking cancellation. Cancellation reason: {reason}",
                    )
                except Exception as refund_err:
                    logger.warning(f"Could not auto-create refund request for cancelled+paid booking {sr.id}: {refund_err}")

        # Fixes gap: unlike assignment/reschedule/refund/complaints, no
        # notification existed for cancellation at all -- add it here,
        # outside the atomic block so a notification failure can never
        # roll back a cancellation that already succeeded.
        try:
            from .notifications import notify_customer_cancelled
            notify_customer_cancelled(sr, reason=reason)
        except Exception as notify_err:
            logger.warning(f"Could not send cancellation notification for booking {sr.id}: {notify_err}")

        return _success(data=ServiceRequestDetailSerializer(sr, context={"request": request}).data, message="Booking cancelled successfully.")


import math

def _notify_quote_sent(quote):
    """
    Fixes a live 500: both quotation endpoints called
    `send_quote_notification(quote)`, which was never defined anywhere --
    so submitting a quotation raised NameError AFTER the quote had already
    been saved. Routed to the real notification (added in
    notifications.py) and made non-fatal, matching how every other
    notification is called in this codebase: a mail failure must never
    fail the request that triggered it.
    """
    try:
        from .notifications import notify_painting_quote_sent
        notify_painting_quote_sent(quote)
    except Exception as exc:
        logger.warning("Could not send quote notification: %s", exc)


GENERIC_TECHNICIAN_LABEL = "Assigned Service Professional"


def _humanised_technician_name(name, service_category):
    """
    Return `name` unless it is obviously not a person's name.

    Technician identity is snapshotted at acceptance from
    `user.get_full_name() or user.username`, and some accounts have
    slug-style usernames that match the service category ("pest_control",
    "ac_repair"). Those leaked into the customer's tracking view as the
    technician's name. A slug is recognisable: it has no spaces and uses
    underscores/hyphens as separators, or it simply equals the booking's
    own service category.
    """
    cleaned = (name or "").strip()
    if not cleaned:
        return cleaned
    category = (service_category or "").strip().lower()
    normalised = cleaned.lower()
    if category and normalised == category:
        return GENERIC_TECHNICIAN_LABEL
    if " " not in cleaned and ("_" in cleaned or "-" in cleaned):
        return GENERIC_TECHNICIAN_LABEL
    return cleaned


def _build_logistics_progress(sr):
    """
    GT-B-03 / GT-D-01: the logistics-specific slice of the tracking
    payload -- current leg, its history, per-stop progress, and any
    proof-of-delivery captured so far.

    Returns the same empty shape for a non-logistics booking rather than
    None or a missing key, so clients can read it unconditionally.
    """
    empty = {"leg": "", "leg_updated_at": None, "leg_history": [], "stops": [], "proofs": []}
    if sr.service_category not in LOGISTICS_CATEGORIES:
        return empty

    try:
        stops = [
            {
                "id": s.id,
                "sequence": s.sequence,
                "stop_type": s.stop_type,
                "address": s.address,
                "latitude": float(s.latitude) if s.latitude is not None else None,
                "longitude": float(s.longitude) if s.longitude is not None else None,
                "arrived_at": s.arrived_at.isoformat() if s.arrived_at else None,
                "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            }
            for s in sr.trip_stops.all().order_by("sequence")
        ]
    except Exception:
        stops = []

    try:
        proofs = [
            {
                "id": p.id,
                "stop": p.stop_id,
                "proof_type": p.proof_type,
                "image": p.image.name if p.image else None,
                "recipient_name": p.recipient_name,
                # recipient_phone is deliberately omitted -- see
                # DeliveryProofSerializer for the reasoning.
                "notes": p.notes,
                "captured_by_name": p.captured_by_name,
                "captured_at": p.captured_at.isoformat() if p.captured_at else None,
            }
            for p in sr.delivery_proofs.all().order_by("captured_at", "id")
        ]
    except Exception:
        proofs = []

    return {
        "leg": sr.logistics_leg or "",
        "leg_updated_at": sr.logistics_leg_updated_at.isoformat() if sr.logistics_leg_updated_at else None,
        "leg_history": list(sr.logistics_leg_history or []),
        "stops": stops,
        "proofs": proofs,
    }


def _jsonable_fare_breakdown(breakdown):
    """
    GT-B-01: JSONField can't store Decimal. Convert the fare breakdown's
    Decimals to strings (not floats -- money must not go through binary
    floating point, even one-way) so the stored quote is exact and
    round-trips for reconciliation later. None/empty -> {}.
    """
    if not breakdown:
        return {}
    out = {}
    for key, value in breakdown.items():
        out[key] = str(value) if isinstance(value, Decimal) else value
    return out


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
    dest_address = sr.address or ""

    # GT-D-02: sr.latitude/sr.longitude are the PICKUP point (see the
    # field comment above sr.address). Bookings that used TripStop
    # (multi-stop routes, GT-B-05) have real per-stop coordinates; use
    # them to target whichever leg logistics_leg says is current.
    # Bookings with no TripStop rows (the common single-pickup/
    # single-drop case) now fall back to sr.drop_latitude/drop_longitude
    # (added alongside this fix) when the booking is past pickup -- see
    # the field comment on those two columns. Only if NEITHER a TripStop
    # nor a drop coordinate exists does this still show the pickup point
    # post-pickup, which is the one remaining, honestly-unresolvable gap:
    # older bookings created before drop coordinates were captured.
    if sr.service_category in LOGISTICS_CATEGORIES:
        post_pickup_legs = {
            ServiceRequest.LogisticsLeg.EN_ROUTE_DROP,
            ServiceRequest.LogisticsLeg.UNLOADING,
            ServiceRequest.LogisticsLeg.DELIVERED,
        }
        try:
            stops = list(sr.trip_stops.all().order_by("sequence"))
        except Exception:
            stops = []
        if stops:
            target_stop = None
            if sr.logistics_leg in post_pickup_legs:
                drop_stops = [s for s in stops if s.stop_type == TripStop.StopType.DROP]
                target_stop = drop_stops[-1] if drop_stops else stops[-1]
            else:
                pickup_stops = [s for s in stops if s.stop_type == TripStop.StopType.PICKUP]
                target_stop = pickup_stops[0] if pickup_stops else stops[0]
            if target_stop is not None and target_stop.latitude is not None and target_stop.longitude is not None:
                dest_lat = float(target_stop.latitude)
                dest_lng = float(target_stop.longitude)
                dest_address = target_stop.address or dest_address
        elif (
            sr.logistics_leg in post_pickup_legs
            and sr.drop_latitude is not None
            and sr.drop_longitude is not None
        ):
            dest_lat = float(sr.drop_latitude)
            dest_lng = float(sr.drop_longitude)
            dest_address = sr.drop_address or dest_address

    # 0. Sync and resolve employee details & live GPS from ServiceRequest model and assigned employee
    #
    # These three used to be denormalised columns on ServiceRequest. When
    # those columns were dropped, the writer moved to TechnicianLocation but
    # this reader was left initialising them to 0/0/None and never assigning
    # them again -- so every tracking payload reported heading 0, speed 0 and
    # accuracy null regardless of what the technician's device actually sent.
    # TechnicianLocation is the authoritative per-fix record, so read the
    # latest fix from there.
    db_heading = 0.0
    db_speed = 0.0
    db_accuracy = None
    try:
        from service_requests.services.technician_tracking import latest_fix

        _fix = latest_fix(sr)
        if _fix is not None:
            db_heading = float(_fix.heading or 0.0)
            db_speed = float(_fix.speed or 0.0)
            db_accuracy = _fix.accuracy
    except Exception as _fix_err:  # never let telemetry break the tracking page
        logger.warning("Could not read latest technician fix for %s: %s",
                       getattr(sr, "request_id", sr.pk), _fix_err)

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
        # Must be the numeric pk: the vendor's tracking routes are <int:pk>, so
        # passing request_id (an alphanumeric like "HM0001") never matched any
        # route. Every call fell through all three candidate URLs and returned
        # None, burning three cross-service round trips per cache miss while
        # silently disabling the ETA enrichment it exists to provide.
        tracking = WorkforceIntegrationService.get_technician_tracking(sr.id)

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
            # X-10: server-side routing/ETA. Prefers a real Google Maps
            # Distance Matrix road-network result; falls back to the
            # straight-line haversine + assumed-speed estimate used here
            # previously on ANY Maps failure (no key, network error,
            # timeout, bad API status) -- never silently pretending to be
            # more precise than the data actually is.
            route = get_route_eta(tech_lat, tech_lng, dest_lat, dest_lng)
            if route is not None:
                distance_km = route["distance_km"]
                distance_m = int(round(distance_km * 1000.0))
                eta_seconds = route["duration_seconds"]
                eta_minutes = max(1, int(round(route["duration_seconds"] / 60.0)))
        else:
            distance_m = None
            distance_km = None
            eta_seconds = None
            eta_minutes = None

        if tracking and isinstance(tracking, dict) and tracking.get("eta_minutes") is not None:
            eta_minutes = tracking.get("eta_minutes")
        if tracking and isinstance(tracking, dict) and tracking.get("distance_km") is not None:
            distance_km = tracking.get("distance_km")

        # Never present a service slug as a person's name. Technician names
        # are snapshotted from whatever the accepting system had -- which
        # falls back to a username, and usernames here are sometimes service
        # slugs like "pest_control". Showing that to a customer as "your
        # technician" is worse than showing nothing specific.
        tech_name = _humanised_technician_name(tech_name, sr.service_category)

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

    # HS-D-07: "no job timeline the customer can see after the fact" --
    # BookingStatusEvent is already populated on every real transition
    # (see state_machine.py record_transition(), called from apply_transition()
    # across ~20 call sites) but nothing ever exposed it to the customer;
    # the tracking payload only ever carried current-state fields. This is a
    # read-only addition -- no new writes, just serializing what already exists.
    status_history = [
        {
            "from_status": ev.from_status,
            "to_status": ev.to_status,
            "actor_persona": ev.actor_persona,
            "reason_note": ev.reason_note,
            "occurred_at": ev.occurred_at.isoformat() if ev.occurred_at else None,
        }
        for ev in sr.status_events.all().order_by("occurred_at")
    ] if hasattr(sr, "status_events") else []

    return {
        "booking_id": sr.id,
        "status_history": status_history,
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
        # GT-B-03 / GT-D-01: the logistics trip's own progress, separate
        # from `status` (which is shared by every service category). Only
        # populated for logistics bookings; every other booking gets the
        # empty defaults, so no existing consumer changes shape.
        "logistics": _build_logistics_progress(sr),
        "service_location": {
            "address": dest_address,
            "latitude": dest_lat,
            "longitude": dest_lng,
        },
        "destination": {
            "address": dest_address,
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


def _public_display_name(full_name):
    """
    HS-E-03: PublicFeedbackListView exposed the full customer name (first +
    last) to anyone, unauthenticated, alongside their free-text comment --
    identifying real customers on a public review widget with no consent or
    moderation step. This mirrors the display convention used by most public
    review platforms: first name plus the last name's initial (e.g.
    "Priya S."), which still reads as a real testimonial without publishing
    a full name to anonymous visitors.
    """
    name = (full_name or "").strip()
    if not name:
        return "Customer"
    parts = name.split()
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0].upper()}."


class PublicFeedbackListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        category = request.query_params.get("category")
        # NOTE (HS-E-03): ideally this would also filter on an explicit
        # publish-consent flag, but ServiceFeedback has no such field yet and
        # the feedback flow never asks for that consent -- adding one needs a
        # migration plus a frontend consent checkbox, which is a real product
        # decision, not a safe drive-by fix. Left as a follow-up; this pass
        # only removes the full-name exposure (see _public_display_name).
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
                "name": _public_display_name(getattr(f.service_request, "customer_name", "")),
                "customer_name": _public_display_name(getattr(f.service_request, "customer_name", "")),
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
        from workforce_integration.views import _verify_webhook_signature, parse_datetime_safe
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
        if "location_name" in request.data or "technician_location_name" in request.data or "current_location_name" in request.data:
            sr.technician_location_name = request.data.get("location_name") or request.data.get("technician_location_name") or request.data.get("current_location_name")
        if "status" in request.data and request.data.get("status") in dict(ServiceRequest.Status.choices):
            sr.status = request.data.get("status")

        sr.save()

        # Coordinates go through record_technician_fix -- the same service the
        # technician app and the workforce webhook already use -- rather than
        # being written straight onto the row.
        #
        # This endpoint used to assign technician_latitude/longitude directly
        # and ignore `captured_at` entirely, so a GPS packet that arrived late
        # overwrote a NEWER position: the marker jumped backwards along the
        # route until the next fresh packet happened to arrive. It also stored
        # no TechnicianLocation telemetry at all, so heading/speed/accuracy
        # were dropped and there was no trail to reconstruct. Both are fixed
        # by using the shared path, which drops stale fixes and persists the
        # fix -- so the two transports cannot drift apart again.
        lat = request.data.get("latitude") or request.data.get("technician_latitude") or request.data.get("lat")
        lng = request.data.get("longitude") or request.data.get("technician_longitude") or request.data.get("lng")
        outcome = None
        if lat is not None and lng is not None:
            from service_requests.services.technician_tracking import record_technician_fix

            outcome, _fix = record_technician_fix(
                sr,
                latitude=lat,
                longitude=lng,
                accuracy=request.data.get("accuracy"),
                heading=request.data.get("heading") or 0.0,
                speed=request.data.get("speed") or 0.0,
                captured_at=parse_datetime_safe(
                    request.data.get("captured_at")
                    or request.data.get("timestamp")
                    or request.data.get("updated_at")
                ),
                technician=request.user if getattr(request.user, "is_authenticated", False) else None,
            )
            if outcome == "invalid":
                return _error("Invalid coordinates.", 400)

        # Only broadcast a position the server actually accepted. Broadcasting
        # a rejected stale fix would push the old coordinates to every
        # watching client, which is the very jump this guard exists to stop.
        if outcome != "stale":
            try:
                from .notifications import broadcast_tracking_event
                full_payload = _build_tracking_payload(sr, has_full_access=True)
                broadcast_tracking_event(sr, event_type="technician_location_updated", custom_data=full_payload)
            except Exception as b_err:
                logger.warning(f"Error broadcasting live location: {b_err}")

        payload = _build_tracking_payload(sr, has_full_access=True)
        if outcome == "stale":
            # Additive key only -- the existing response shape is unchanged,
            # and the position returned is the newer one already stored.
            payload["ignored"] = True
            return _success(data=payload, message="Out-of-order location packet ignored.")

        return _success(
            data=payload,
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
        from service_requests.models import BookingAssignment

        try:
            sr = _sr_qs(request).get(pk=pk)
        except ServiceRequest.DoesNotExist:
            return _error("Not found.", 404)

        with transaction.atomic():
            apply_transition(sr, ServiceRequest.Status.VERIFIED, actor=request.user)
            sr.save(update_fields=["status", "updated_at"])
            fb, _fb_created = ServiceFeedback.objects.get_or_create(service_request=sr)

            # Fixes HS-E-01: snapshot which technician this feedback is about
            # at the moment feedback becomes requestable (verification), not
            # read lazily later off whatever the booking's *current*
            # assignment happens to be -- a reassignment after this point must
            # not retroactively change who an already-issued rating is about.
            # Prefer a COMPLETED assignment (the one who actually did the
            # work); fall back to the most recent ACCEPTED one if the
            # completion event hasn't landed a BookingAssignment update yet.
            if not fb.technician_id:
                assignment = (
                    BookingAssignment.objects.filter(
                        booking=sr,
                        status__in=[BookingAssignment.Status.COMPLETED, BookingAssignment.Status.ACCEPTED],
                    )
                    .order_by("-id")
                    .first()
                )
                tech_id = (assignment.technician_id if assignment else "") or ""
                tech_name = (assignment.technician_name if assignment else "") or sr.technician_name or ""
                if tech_id or tech_name:
                    fb.technician_id = tech_id
                    fb.technician_name_snapshot = tech_name
                    fb.save(update_fields=["technician_id", "technician_name_snapshot"])

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

        # Fixes: no duplicate-request guard existed at all -- a customer
        # could submit any number of refund requests for the same booking
        # while an earlier one was still active, each independently working
        # its way through admin approval -> finance -> gateway completion.
        active_statuses = [
            RefundStatus.PENDING, RefundStatus.INFO_REQUESTED,
            RefundStatus.APPROVED_FULL, RefundStatus.APPROVED_PARTIAL,
            RefundStatus.SENT_TO_FINANCE,
        ]
        existing_active = RefundRequest.objects.filter(booking=booking, status__in=active_statuses).first()
        if existing_active:
            return _standard_response(
                success=False,
                error={
                    "code": "REFUND_ALREADY_ACTIVE",
                    "message": f"A refund request for this booking is already in progress (status: {existing_active.status}).",
                },
                status_code=409,
            )

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
    """
    POST /api/admin/refunds/<pk>/<action>/

    Was a no-op stub that ignored `action` entirely and forwarded to the
    detail GET regardless of what action was requested -- meaning a
    'complete' action here silently did nothing (no refund, no status
    change) while looking like it succeeded. Now actually handles
    'complete', which is the one this route exists for -- see
    HS_C_04_05_REFUND_GATEWAY_NOTE.md. Other actions already have their
    own dedicated endpoints (AdminRefundApproveView, AdminRefundRejectView,
    etc.) and are intentionally not duplicated here.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk, action):
        if action == "complete":
            try:
                rr = sr_services.admin_complete_refund(request.user, pk)
                return _standard_response(success=True, data=AdminRefundRequestSerializer(rr).data)
            except Exception as e:
                return _standard_response(success=False, error={"code": "COMPLETE_FAILED", "message": str(e)}, status_code=400)
        return _standard_response(
            success=False,
            error={"code": "UNKNOWN_ACTION", "message": f"Unsupported action '{action}'. Use the dedicated approve/reject/send-to-finance endpoints, or 'complete'."},
            status_code=400,
        )


class CustomerInsuranceClaimListCreateView(APIView):
    """
    GET  /api/insurance-claims/       -- list the logged-in customer's claims
    POST /api/insurance-claims/       -- file a new claim
    GT-C-03: the damage-claim path. file_insurance_claim() already enforces
    booking.insurance_opted_in, ownership, and booking.status == completed.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        claims = sr_services.list_insurance_claims(request.user, "CUSTOMER")
        return _standard_response(success=True, data=InsuranceClaimSerializer(claims, many=True).data)

    def post(self, request):
        booking_id = request.data.get("booking_id")
        description = request.data.get("description", "")
        claimed_amount = request.data.get("claimed_amount")
        if not booking_id or not description or not claimed_amount:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "booking_id, description and claimed_amount are required."}, status_code=400)

        booking = ServiceRequest.objects.filter(Q(pk=booking_id) if str(booking_id).isdigit() else Q(request_id=booking_id)).first()
        if not booking:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Booking not found."}, status_code=404)

        attachment_files = request.FILES.getlist("attachments") if hasattr(request.FILES, "getlist") else []

        try:
            claim = sr_services.file_insurance_claim(
                booking=booking, customer=request.user, description=description,
                claimed_amount=claimed_amount, attachment_files=attachment_files,
            )
        except Exception as e:
            return _standard_response(success=False, error={"code": "CLAIM_FAILED", "message": str(e)}, status_code=400)

        return _standard_response(success=True, data=InsuranceClaimSerializer(claim).data, status_code=201)


class AdminInsuranceClaimListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        claims = sr_services.list_insurance_claims(request.user, "ADMIN", filters=request.query_params)
        return _standard_response(success=True, data=InsuranceClaimSerializer(claims, many=True).data)


class AdminInsuranceClaimResolveView(APIView):
    """POST /api/admin/insurance-claims/<pk>/resolve/  body: {decision, approved_amount?, notes?}"""
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        decision = str(request.data.get("decision", "")).upper()
        approved_amount = request.data.get("approved_amount")
        notes = request.data.get("notes", "")
        try:
            claim = sr_services.resolve_insurance_claim(request.user, pk, decision, approved_amount, notes)
        except Exception as e:
            return _standard_response(success=False, error={"code": "RESOLVE_FAILED", "message": str(e)}, status_code=400)
        return _standard_response(success=True, data=InsuranceClaimSerializer(claim).data)


class AdminNotificationOutboxView(APIView):
    """
    GET /api/admin/notifications/outbox/?recipient=<email>&status=<SENT|FAILED>
    HS-D-04: lets support/admin actually answer "was the customer told?" --
    read-only view over NotificationOutbox, filterable by recipient and/or
    status. Capped at 100 rows per request; this is a support lookup tool,
    not a bulk export.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        from .models import NotificationOutbox
        qs = NotificationOutbox.objects.all()
        recipient = request.query_params.get("recipient")
        if recipient:
            qs = qs.filter(recipient__iexact=recipient)
        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        rows = qs[:100]
        return _standard_response(success=True, data=[
            {
                "id": r.id,
                "recipient": r.recipient,
                "subject": r.subject,
                "status": r.status,
                "error": r.error,
                "attempt_count": r.attempt_count,
                "created_at": r.created_at,
                "last_attempt_at": r.last_attempt_at,
            }
            for r in rows
        ])


class TechnicianProfileView(APIView):
    """
    GET /api/technicians/<technician_id>/profile/
    HS-E-04: "the customer never sees a technician profile" -- the tracking
    payload already carries name/photo/phone/rating, assembled defensively,
    but there was no dedicated profile: no jobs completed, no rating with
    review count, no recent reviews. Built entirely from ServiceFeedback,
    using the technician_id/technician_name_snapshot fields added for
    HS-E-01 -- deliberately does NOT reach into the vendor app's Employee
    model (tenure, verification badges, specialisations) since there's no
    local FK across the two Django projects; those fields are a reasonable
    follow-up once there's a cross-app read path for technician metadata,
    same reasoning as the *_snapshot fields already in this codebase.

    AllowAny: this is a public professional profile (name + aggregate
    rating), the same trust signal a tracking link already exposes to
    anyone holding it -- no more sensitive than that.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, technician_id):
        from django.db.models import Avg, Count
        feedback_qs = ServiceFeedback.objects.filter(technician_id=technician_id, is_submitted=True)
        if not feedback_qs.exists():
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "No profile data available for this technician yet."}, status_code=404)

        agg = feedback_qs.aggregate(avg_rating=Avg("rating"), review_count=Count("id"))
        name = feedback_qs.order_by("-submitted_at").values_list("technician_name_snapshot", flat=True).first()
        recent_reviews = list(
            feedback_qs.exclude(comment="").order_by("-submitted_at")[:5]
            .values("rating", "comment", "submitted_at")
        )

        return _standard_response(success=True, data={
            "technician_id": technician_id,
            "name": name or "Technician",
            "average_rating": round(agg["avg_rating"], 2) if agg["avg_rating"] is not None else None,
            "review_count": agg["review_count"],
            "jobs_completed": feedback_qs.count(),
            "recent_reviews": recent_reviews,
        })


class CustomerWalletView(APIView):
    """
    GET /api/wallet/
    HS-C-07: read-only balance + recent transaction history for the logged-in
    customer's wallet.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet = sr_services.get_or_create_wallet(request.user)
        txs = sr_services.list_wallet_transactions(request.user, limit=50)
        return _standard_response(success=True, data={
            "balance": str(wallet.balance),
            "transactions": [
                {
                    "id": tx.id,
                    "type": tx.tx_type,
                    "reason": tx.reason,
                    "amount": str(tx.amount),
                    "balance_after": str(tx.balance_after),
                    "note": tx.note,
                    "created_at": tx.created_at,
                }
                for tx in txs
            ],
        })


class AdminWalletCreditView(APIView):
    """
    POST /api/admin/customers/<user_id>/wallet/credit/
    HS-C-07: lets an admin add a goodwill/manual credit to a customer's
    wallet with a required reason and note, fully logged in
    WalletTransaction. Debits are intentionally NOT exposed here -- an admin
    removing a customer's own money needs a stronger, separate justification
    flow than this endpoint's scope; this is credit-only.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        target_user = User.objects.filter(pk=user_id).first()
        if not target_user:
            return _standard_response(success=False, error={"code": "NOT_FOUND", "message": "Customer not found."}, status_code=404)

        amount = request.data.get("amount")
        reason = request.data.get("reason", "GOODWILL")
        note = request.data.get("note", "")
        if not amount:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "amount is required."}, status_code=400)

        try:
            tx = sr_services.credit_wallet(
                user=target_user, amount=amount, reason=reason, note=note, actor=request.user,
            )
        except Exception as e:
            return _standard_response(success=False, error={"code": "CREDIT_FAILED", "message": str(e)}, status_code=400)

        return _standard_response(success=True, data={
            "balance_after": str(tx.balance_after),
            "amount": str(tx.amount),
            "reason": tx.reason,
        }, status_code=201)


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


class CustomerBookingTripStopsView(APIView):
    """
    GT-D-02: extra stops on a multi-stop goods-transport/packers & movers
    booking. GET lists the current stops; PUT replaces the whole ordered
    list (see set_trip_stops -- always a full replace, never a partial
    patch, so ordering/sequence can never drift into a partially-updated
    state).
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking(self, pk, identifier):
        sr_id = pk or identifier
        try:
            if str(sr_id).isdigit():
                return ServiceRequest.objects.get(pk=int(sr_id))
            return ServiceRequest.objects.get(request_id=sr_id)
        except ServiceRequest.DoesNotExist:
            return None

    def get(self, request, pk=None, identifier=None):
        sr = self._get_booking(pk, identifier)
        if not sr:
            return _error("Booking not found.", 404)
        if sr.customer_id != request.user.id and getattr(request.user, "role", "").upper() != "ADMIN":
            return _error("You do not have permission to view this booking's stops.", 403)
        return _standard_response(success=True, data=TripStopSerializer(sr_services.list_trip_stops(sr), many=True).data)

    def put(self, request, pk=None, identifier=None):
        sr = self._get_booking(pk, identifier)
        if not sr:
            return _error("Booking not found.", 404)
        stops = request.data.get("stops")
        if not isinstance(stops, list):
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "\'stops\' must be a list."}, status_code=400)
        try:
            created = sr_services.set_trip_stops(sr, request.user, stops)
        except PermissionError as e:
            return _error(str(e), 403)
        except ValueError as e:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": str(e)}, status_code=400)
        return _standard_response(success=True, data=TripStopSerializer(created, many=True).data)


class CustomerBookingMessagesView(APIView):
    """
    X-09: in-app chat between customer and technician for a booking.
    GET  /api/bookings/<pk>/messages/  -- list the thread, marks unread
         technician messages as read by the customer
    POST /api/bookings/<pk>/messages/  -- send a message as the customer

    Deliberately polling-based, not push -- the frontend re-fetches this
    on an interval, same pattern as the tracking page. See BookingMessage's
    docstring for why this doesn't attempt push/websockets or phone-number
    masking (X-09's other half).
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_booking(self, pk, identifier):
        sr_id = pk or identifier
        try:
            if str(sr_id).isdigit():
                return ServiceRequest.objects.get(pk=int(sr_id))
            return ServiceRequest.objects.get(request_id=sr_id)
        except ServiceRequest.DoesNotExist:
            return None

    def _check_owner(self, sr, request):
        return sr.customer_id == request.user.id or getattr(request.user, "role", "").upper() == "ADMIN"

    def get(self, request, pk=None, identifier=None):
        sr = self._get_booking(pk, identifier)
        if not sr:
            return _error("Booking not found.", 404)
        if not self._check_owner(sr, request):
            return _error("You do not have permission to view this booking's messages.", 403)
        messages = sr.chat_messages.all()
        unread_ids = [m.id for m in messages if m.sender_persona != BookingMessage.SenderPersona.CUSTOMER and m.read_at_customer is None]
        if unread_ids:
            from django.utils import timezone
            BookingMessage.objects.filter(id__in=unread_ids).update(read_at_customer=timezone.now())
            messages = sr.chat_messages.all()
        return _standard_response(success=True, data=BookingMessageSerializer(messages, many=True).data)

    def post(self, request, pk=None, identifier=None):
        sr = self._get_booking(pk, identifier)
        if not sr:
            return _error("Booking not found.", 404)
        if not self._check_owner(sr, request):
            return _error("You do not have permission to message on this booking.", 403)
        body = (request.data.get("body") or "").strip()
        if not body:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "Message cannot be empty."}, status_code=400)
        if len(body) > 2000:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": "Message is too long (max 2000 characters)."}, status_code=400)
        msg = BookingMessage.objects.create(
            booking=sr,
            sender_persona=BookingMessage.SenderPersona.CUSTOMER,
            sender_name=sr.customer_name or request.user.get_full_name() or "Customer",
            sender_user=request.user,
            body=body,
        )
        return _standard_response(success=True, data=BookingMessageSerializer(msg).data, status_code=201)


class CustomerBookingSeriesListCreateView(APIView):
    """
    GET  /api/booking-series/  -- list the logged-in customer's AMC series
    POST /api/booking-series/  -- create a new one
    HS-B-07: recurring bookings. create_booking_series() already validates
    required fields and snapshots customer_name/phone/email.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        series = sr_services.list_booking_series(request.user)
        return _standard_response(success=True, data=BookingSeriesSerializer(series, many=True).data)

    def post(self, request):
        try:
            series = sr_services.create_booking_series(request.user, request.data)
        except ValueError as e:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": str(e)}, status_code=400)
        return _standard_response(success=True, data=BookingSeriesSerializer(series).data, status_code=201)


class CustomerBookingSeriesStatusView(APIView):
    """PATCH /api/booking-series/<int:pk>/status/ -- pause/resume/cancel.
    {"status": "PAUSED" | "ACTIVE" | "CANCELLED"}"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        series = BookingSeries.objects.filter(pk=pk).first()
        if not series:
            return _error("AMC series not found.", 404)
        new_status = request.data.get("status")
        try:
            series = sr_services.set_booking_series_status(series, request.user, new_status)
        except PermissionError as e:
            return _error(str(e), 403)
        except ValueError as e:
            return _standard_response(success=False, error={"code": "VALIDATION_ERROR", "message": str(e)}, status_code=400)
        return _standard_response(success=True, data=BookingSeriesSerializer(series).data)


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
from service_requests.serializers import (
    VegetableRecipeListSerializer,
    VegetableRecipeDetailSerializer,
    VegetableRecommendationSerializer,
    PaintingRateCardSerializer,
    PaintingRateCardSlabSerializer,
    PaintingQuoteSerializer,
    PaintingQuoteItemSerializer,
    PaintingMeasurementSerializer,
    PaintingMaterialSerializer,
)


class VegetableRecipeListView(APIView):
    """
    Public endpoint: GET /api/catalog/vegetables/recipes/
    Supports filtering by:
    - package_id / product_id / vegetable_name
    - search
    - difficulty (Easy, Medium, Hard)
    - tag (quick, easy, low_calorie, high_fiber, popular)
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import VegetableRecipe
        from .serializers import VegetableRecipeListSerializer

        package_id = request.GET.get("package_id") or request.GET.get("product_id")
        veg_query = request.GET.get("vegetable") or ""
        search = request.GET.get("search") or ""
        difficulty = request.GET.get("difficulty") or ""
        tag = request.GET.get("tag") or ""
        is_popular = request.GET.get("popular")

        qs = VegetableRecipe.objects.filter(is_active=True).select_related("package")

        if package_id:
            # Check if any recipes have this vegetable as the primary featured package
            primary_matches = qs.filter(package_id=package_id)
            if primary_matches.exists():
                qs = primary_matches
            else:
                qs = qs.filter(
                    Q(package_id=package_id) | Q(ingredients__package_id=package_id)
                ).distinct()
        elif veg_query:
            primary_name_matches = qs.filter(package__name__icontains=veg_query)
            if primary_name_matches.exists():
                qs = primary_name_matches
            else:
                qs = qs.filter(
                    Q(package__name__icontains=veg_query) |
                    Q(ingredients__name__icontains=veg_query) |
                    Q(ingredients__package__name__icontains=veg_query)
                ).distinct()

        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(short_description__icontains=search) |
                Q(ingredients__name__icontains=search)
            ).distinct()

        if difficulty:
            qs = qs.filter(difficulty__iexact=difficulty)

        if is_popular and is_popular.lower() in ("true", "1", "yes"):
            qs = qs.filter(is_popular=True)

        if tag:
            # Matches against tags JSON field or preset filters
            tag_clean = tag.lower().replace("-", " ").replace("_", " ")
            if "quick" in tag_clean:
                qs = qs.filter(total_time_minutes__lte=20)
            elif "easy" in tag_clean:
                qs = qs.filter(difficulty="Easy")
            elif "low calorie" in tag_clean or "low_calorie" in tag:
                qs = qs.filter(calories__lte=150)
            elif "high fiber" in tag_clean or "high_fiber" in tag:
                qs = qs.filter(fiber__icontains="g")
            else:
                qs = qs.filter(tags__icontains=tag)

        data = VegetableRecipeListSerializer(qs.order_by("sort_order", "id"), many=True).data
        return Response({"success": True, "data": data, "count": len(data)})


class VegetableRecipeDetailView(APIView):
    """
    Public endpoint: GET /api/catalog/vegetables/recipes/<id_or_slug>/
    Returns full recipe details, nutrition, health tips, numbered cooking steps,
    and separated ingredients (Calservices vegetable catalog products vs pantry items).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        from .models import VegetableRecipe
        from .serializers import VegetableRecipeDetailSerializer

        recipe = None
        if str(pk).isdigit():
            recipe = VegetableRecipe.objects.filter(id=int(pk), is_active=True).select_related("package").prefetch_related("ingredients__package").first()
        if not recipe:
            recipe = VegetableRecipe.objects.filter(slug=str(pk), is_active=True).select_related("package").prefetch_related("ingredients__package").first()

        if not recipe:
            return Response({"success": False, "message": "Recipe not found"}, status=404)

        data = VegetableRecipeDetailSerializer(recipe).data
        return Response({"success": True, "data": data})


class VegetableRecommendationListView(APIView):
    """
    Public endpoint: GET /api/catalog/vegetables/<product_id>/recommendations/
    Returns database-configured and recipe-derived recommendations for a vegetable product.
    Only returns active Calservices vegetable products.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, product_id):
        from .models import Package, VegetableRecommendation, VegetableRecipe, RecipeIngredient
        from .serializers import VegetableRecommendationSerializer

        # 1. Fetch direct DB-configured recommendations
        db_recs = VegetableRecommendation.objects.filter(
            source_product_id=product_id,
            is_active=True,
            recommended_product__status="ACTIVE"
        ).select_related("source_product", "recommended_product").order_by("-priority", "display_order")

        rec_data = list(VegetableRecommendationSerializer(db_recs, many=True).data)
        seen_recommended_ids = {r["recommended_product"] for r in rec_data}
        seen_recommended_ids.add(int(product_id))

        # 2. If fewer than 6, derive recipe-based co-occurring vegetables from DB
        if len(rec_data) < 8:
            co_occurring_pkg_ids = RecipeIngredient.objects.filter(
                recipe__in=VegetableRecipe.objects.filter(
                    Q(package_id=product_id) | Q(ingredients__package_id=product_id),
                    is_active=True
                ),
                package__isnull=False,
                package__status="ACTIVE"
            ).exclude(
                package_id__in=seen_recommended_ids
            ).values_list("package_id", flat=True).distinct()[:8]

            for pkg_id in co_occurring_pkg_ids:
                pkg = Package.objects.filter(id=pkg_id, status="ACTIVE").first()
                if pkg:
                    seen_recommended_ids.add(pkg.id)
                    rec_data.append({
                        "id": None,
                        "source_product": int(product_id),
                        "source_name": "",
                        "recommended_product": pkg.id,
                        "recommended_name": pkg.name,
                        "recommended_price": str(pkg.base_price),
                        "recommended_offer_price": str(pkg.offer_price) if pkg.offer_price else None,
                        "recommended_unit": pkg.duration or "1 unit",
                        "recommended_image": pkg.image or "",
                        "recommended_status": pkg.status,
                        "recommendation_type": "RECIPE_BASED",
                        "priority": 5,
                        "display_order": len(rec_data) + 1,
                        "is_active": True,
                    })

        # 3. If still fewer, fill with active popular vegetables
        if len(rec_data) < 4:
            fallback_pkgs = Package.objects.filter(
                service__slug="vegetables",
                status="ACTIVE"
            ).exclude(
                id__in=seen_recommended_ids
            ).order_by("-popular", "sort_order")[: (4 - len(rec_data))]

            for pkg in fallback_pkgs:
                rec_data.append({
                    "id": None,
                    "source_product": int(product_id),
                    "source_name": "",
                    "recommended_product": pkg.id,
                    "recommended_name": pkg.name,
                    "recommended_price": str(pkg.base_price),
                    "recommended_offer_price": str(pkg.offer_price) if pkg.offer_price else None,
                    "recommended_unit": pkg.duration or "1 unit",
                    "recommended_image": pkg.image or "",
                    "recommended_status": pkg.status,
                    "recommendation_type": "YOU_MAY_ALSO_LIKE",
                    "priority": 1,
                    "display_order": len(rec_data) + 1,
                    "is_active": True,
                })

        return Response({"success": True, "data": rec_data, "count": len(rec_data)})



class CustomerQuoteDecideView(APIView):
    """
    POST /api/booking/quote/<str:token>/decide/
    Accepts, declines, or requests changes for the quote.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        try:
            quote = PaintingQuote.objects.get(customer_decision_token=token)
        except PaintingQuote.DoesNotExist:
            return _error("Quotation not found.", 404)

        if quote.status in [PaintingQuote.Status.APPROVED, PaintingQuote.Status.SUPERSEDED, PaintingQuote.Status.DECLINED]:
            return _error(f"Cannot perform decision. Quotation is already in state: {quote.status}.", 400)

        decision = (request.data.get("decision") or "").strip().upper()
        if decision == "CUSTOMER_ACCEPTED":
            with transaction.atomic():
                quote.status = PaintingQuote.Status.APPROVED
                quote.save(update_fields=["status"])

                parent_sr = quote.service_request

                # Transition parent request (inspection) to completed
                apply_transition(parent_sr, ServiceRequest.Status.COMPLETED, actor=request.user)
                parent_sr.save()

                # Create child quoted_work booking
                existing_child = ServiceRequest.objects.filter(
                    parent_request=parent_sr,
                    request_kind="quoted_work",
                    quote_number=quote.quote_number
                ).first()

                if not existing_child:
                    cart_data = []
                    for item in quote.items.all():
                        cart_data.append({
                            "id": f"quote-item-{item.id}",
                            "name": item.description,
                            "price": float(item.final_rate),
                            "quantity": float(item.quantity),
                            "categoryName": item.category,
                            "warranty_months": int(quote.warranty.split()[0]) if (quote.warranty and quote.warranty.split()[0].isdigit()) else 0
                        })

                    # If inspection fee was paid, deduct it from advance/total!
                    inspection_deduction = Decimal("0.00")
                    if parent_sr.payment_status in [ServiceRequest.PaymentStatus.PAID, ServiceRequest.PaymentStatus.COLLECTED]:
                        inspection_deduction = parent_sr.total_amount
                        if inspection_deduction > Decimal("49.00"):
                            inspection_deduction = Decimal("49.00")

                    final_amount = max(Decimal("0.00"), quote.grand_total - inspection_deduction)

                    if inspection_deduction > 0:
                        cart_data.append({
                            "id": "adjust-inspection-fee",
                            "name": "Inspection Fee Adjusted",
                            "price": -float(inspection_deduction),
                            "quantity": 1,
                            "categoryName": "Adjustment"
                        })

                    new_sr = ServiceRequest.objects.create(
                        parent_request=parent_sr,
                        request_kind="quoted_work",
                        quote_number=quote.quote_number,
                        company=parent_sr.company,
                        customer=parent_sr.customer,
                        customer_name=parent_sr.customer_name,
                        phone=parent_sr.phone,
                        email=parent_sr.email,
                        service_category=parent_sr.service_category,
                        issue_title=f"Painting Work for {parent_sr.request_id}",
                        description=f"Quoted painting execution based on {quote.quote_number}",
                        address=parent_sr.address,
                        latitude=parent_sr.latitude,
                        longitude=parent_sr.longitude,
                        preferred_date=timezone.now().date(),
                        preferred_time=parent_sr.preferred_time,
                        total_amount=final_amount,
                        cart_data=cart_data,
                        status=ServiceRequest.Status.CONFIRMED,
                        payment_method="ONLINE",
                        payment_status=ServiceRequest.PaymentStatus.PENDING
                    )

                    # Dispatch job to workforce management system
                    WorkforceIntegrationService.dispatch_job(new_sr.id)

                    # Log analytics event
                    from customer_analytics.models import BookingStatusEvent
                    BookingStatusEvent.objects.create(
                        service_request_id=new_sr.id,
                        from_status="",
                        to_status=new_sr.status,
                        actor_persona="system",
                        actor=None,
                        reason_note=f"Booking created from Quote {quote.quote_number}"
                    )

            return _success(message="Quotation approved and painting booking created successfully.")

        elif decision == "DECLINED" or decision == "CUSTOMER_DECLINED":
            with transaction.atomic():
                quote.status = PaintingQuote.Status.DECLINED
                quote.decline_reason = request.data.get("reason_notes") or request.data.get("decline_reason") or "Customer declined"
                quote.save(update_fields=["status", "decline_reason"])

                parent_sr = quote.service_request
                # Transition parent request (inspection) to closed
                apply_transition(parent_sr, ServiceRequest.Status.CLOSED, actor=request.user)
                parent_sr.save()

            return _success(message="Quotation declined successfully.")

        elif decision == "CHANGE_REQUESTED" or decision == "REQUESTED_CHANGES":
            quote.status = PaintingQuote.Status.REQUESTED_CHANGES
            quote.customer_notes = request.data.get("reason_notes") or request.data.get("customer_notes") or "Please adjust quotation items"
            quote.save(update_fields=["status", "customer_notes"])

            return _success(message="Changes requested successfully.")

        return _error("Invalid decision option. Use CUSTOMER_ACCEPTED, DECLINED, or CHANGE_REQUESTED.", 400)


class AdminPaintingRateCardListView(APIView):
    """
    GET /api/admin/painting/rate-card/
    POST /api/admin/painting/rate-card/
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def get(self, request):
        rates = PaintingRateCard.objects.all().order_by("category", "sub_service")
        serializer = PaintingRateCardSerializer(rates, many=True)
        return _success(data=serializer.data)

    def post(self, request):
        serializer = PaintingRateCardSerializer(data=request.data)
        if serializer.is_valid():
            rate_card = serializer.save()
            slabs_data = request.data.get("slabs", [])
            for slab in slabs_data:
                PaintingRateCardSlab.objects.create(
                    rate_card=rate_card,
                    slab_key=slab.get("slab_key"),
                    rate=Decimal(str(slab.get("rate"))),
                    unit=slab.get("unit", "")
                )
            return _success(data=PaintingRateCardSerializer(rate_card).data, status_code=201)
        return _error("Validation error.", errors=serializer.errors, status_code=400)


class AdminPaintingRateCardDetailView(APIView):
    """
    PUT /api/admin/painting/rate-card/<int:pk>/
    DELETE /api/admin/painting/rate-card/<int:pk>/
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def put(self, request, pk):
        try:
            rate = PaintingRateCard.objects.get(pk=pk)
        except PaintingRateCard.DoesNotExist:
            return _error("Rate card item not found.", 404)

        serializer = PaintingRateCardSerializer(rate, data=request.data, partial=True)
        if serializer.is_valid():
            rate_card = serializer.save()
            if "slabs" in request.data:
                rate_card.slabs.all().delete()
                for slab in request.data.get("slabs", []):
                    PaintingRateCardSlab.objects.create(
                        rate_card=rate_card,
                        slab_key=slab.get("slab_key"),
                        rate=Decimal(str(slab.get("rate"))),
                        unit=slab.get("unit", "")
                    )
            return _success(data=PaintingRateCardSerializer(rate_card).data)
        return _error("Validation error.", errors=serializer.errors, status_code=400)

    def delete(self, request, pk):
        try:
            rate = PaintingRateCard.objects.get(pk=pk)
        except PaintingRateCard.DoesNotExist:
            return _error("Rate card item not found.", 404)
        rate.delete()
        return _success(message="Rate card item deleted successfully.")


class AdminQuoteCreateView(APIView):
    """
    POST /api/admin/painting/quotes/create/
    Creates a new Quote for a ServiceRequest (shared Painting/Masonry).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        booking_id = request.data.get("booking_id")
        if not booking_id:
            return _error("booking_id is required.")

        try:
            if str(booking_id).isdigit():
                sr = ServiceRequest.objects.get(pk=int(booking_id))
            else:
                sr = ServiceRequest.objects.get(request_id=booking_id)
        except ServiceRequest.DoesNotExist:
            return _error("ServiceRequest booking not found.", 404)

        if sr.status != ServiceRequest.Status.ARRIVED:
            return _error("Arrival Gate active: Cannot prepare quotation before technician reaches the site (Status must be ARRIVED).", 400)

        measurements = request.data.get("measurements", [])
        if not measurements:
            return _error("Cannot submit a quote without area measurements.", 400)

        items = request.data.get("items", [])
        if not items:
            return _error("Quotation must have at least one line item.", 400)

        is_painting_or_wp = sr.service_category in ["painting", "paintings", "interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor"]
        is_mason = sr.service_category in ["mason", "masonry"]

        for item in items:
            classification = item.get("classification") or ""
            if item.get("source_type") == "CUSTOMER" or item.get("item_type") == "CUSTOMER" or "customer" in classification.lower():
                if is_painting_or_wp:
                    return _error("Customer-supplied paint materials are strictly prohibited in the painting module.", 400)
                elif is_mason:
                    return _error("Customer-supplied materials are strictly prohibited in the masonry module.", 400)

        with transaction.atomic():
            PaintingQuote.objects.filter(service_request=sr).update(status=PaintingQuote.Status.SUPERSEDED)

            prev_quote = PaintingQuote.objects.filter(service_request=sr).order_by("-quote_version").first()
            version = (prev_quote.quote_version + 1) if prev_quote else 1

            subtotal = Decimal(str(request.data.get("subtotal", 0)))
            discount = Decimal(str(request.data.get("discount", 0)))
            tax = Decimal(str(request.data.get("tax", 0)))
            grand_total = Decimal(str(request.data.get("grand_total", 0)))
            
            advance_amount = Decimal("0.00")
            balance_amount = Decimal("0.00")
            is_waterproofing = sr.service_category in ["waterproofing", "waterproofing-services"] or any("waterproofing" in str(it.get("category")).lower() for it in items)
            is_mason_items = sr.service_category in ["mason", "masonry"] or any("mason" in str(it.get("category")).lower() for it in items)
            
            if is_mason_items:
                # Every valid Mason quote must be split 50/50 regardless of quote amount
                advance_amount = grand_total * Decimal("0.5")
                balance_amount = grand_total - advance_amount
            elif is_waterproofing and grand_total >= Decimal("1000.00"):
                advance_amount = grand_total * Decimal("0.5")
                balance_amount = grand_total - advance_amount
            else:
                advance_amount = grand_total
                balance_amount = Decimal("0.00")

            initial_status = PaintingQuote.Status.SENT_TO_CUSTOMER
            if grand_total > Decimal("30000.00"):
                initial_status = PaintingQuote.Status.PENDING_ADMIN_REVIEW

            quote = PaintingQuote.objects.create(
                service_request=sr,
                vendor=sr.company,
                quote_version=version,
                status=initial_status,
                property_type=request.data.get("property_type", "Residential"),
                total_paintable_area=Decimal(str(request.data.get("total_paintable_area", 0))),
                subtotal=subtotal,
                discount=discount,
                tax=tax,
                grand_total=grand_total,
                advance_amount=advance_amount,
                balance_amount=balance_amount,
                valid_until=request.data.get("valid_until"),
                warranty=request.data.get("warranty", ""),
                created_by=request.user if request.user.is_authenticated else None
            )

            for m in measurements:
                PaintingMeasurement.objects.create(
                    quote=quote,
                    area_name=m.get("area_name", "Area"),
                    length=Decimal(str(m.get("length", 0))) if m.get("length") else None,
                    width=Decimal(str(m.get("width", 0))) if m.get("width") else None,
                    height=Decimal(str(m.get("height", 0))) if m.get("height") else None,
                    calculated_area=Decimal(str(m.get("calculated_area", 0))),
                    deductions=Decimal(str(m.get("deductions", 0))),
                    final_area=Decimal(str(m.get("final_area", 0))),
                    notes=m.get("notes", "")
                )

            for it in items:
                PaintingQuoteItem.objects.create(
                    quote=quote,
                    category=it.get("category", "Painting"),
                    description=it.get("description", ""),
                    quantity=Decimal(str(it.get("quantity", 1))),
                    unit=it.get("unit", "sq.ft"),
                    base_rate=Decimal(str(it.get("base_rate", 0))),
                    proposed_rate=Decimal(str(it.get("proposed_rate", 0))),
                    discount=Decimal(str(it.get("discount", 0))),
                    final_rate=Decimal(str(it.get("final_rate", 0))),
                    amount=Decimal(str(it.get("amount", 0))),
                    classification=it.get("classification", "both"),
                    included=it.get("included", True),
                    notes=it.get("notes", ""),
                    slab_key=it.get("slab_key", "")
                )

            materials = request.data.get("materials", [])
            for mat in materials:
                PaintingMaterial.objects.create(
                    quote=quote,
                    brand=mat.get("brand", ""),
                    product_name=mat.get("product_name", ""),
                    finish=mat.get("finish", ""),
                    shade=mat.get("shade", ""),
                    quantity=Decimal(str(mat.get("quantity", 0))),
                    unit=mat.get("unit", "litre"),
                    rate=Decimal(str(mat.get("rate", 0))),
                    amount=Decimal(str(mat.get("amount", 0)))
                )

        if quote.status == PaintingQuote.Status.SENT_TO_CUSTOMER:
            _notify_quote_sent(quote)

        return _success(
            data=PaintingQuoteSerializer(quote).data,
            message="Quotation submitted successfully." + (" Pending admin approval (exceeds ₹30,000)." if quote.status == PaintingQuote.Status.PENDING_ADMIN_REVIEW else "")
        )


class AdminQuoteActionView(APIView):
    """
    POST /api/admin/painting/quotes/<int:pk>/action/
    Allows admin to Review, Adjust, Approve, or Reject a quote (shared Painting/Masonry).
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            quote = PaintingQuote.objects.get(pk=pk)
        except PaintingQuote.DoesNotExist:
            return _error("Quotation not found.", 404)

        action = (request.data.get("action") or "").strip().upper()
        if action == "APPROVE_AND_SEND":
            quote.status = PaintingQuote.Status.SENT_TO_CUSTOMER
            quote.save(update_fields=["status"])
            _notify_quote_sent(quote)
            return _success(message="Quotation approved and sent to customer.")
        elif action == "REJECT":
            quote.status = PaintingQuote.Status.DECLINED
            quote.decline_reason = request.data.get("reason", "Rejected by Admin")
            quote.save(update_fields=["status", "decline_reason"])
            return _success(message="Quotation rejected by Admin.")
        elif action == "ADJUST":
            items_data = request.data.get("items", [])
            with transaction.atomic():
                for it_data in items_data:
                    item_id = it_data.get("id")
                    if item_id:
                        item = PaintingQuoteItem.objects.get(pk=item_id, quote=quote)
                        item.proposed_rate = Decimal(str(it_data.get("proposed_rate", item.proposed_rate)))
                        item.final_rate = Decimal(str(it_data.get("final_rate", item.final_rate)))
                        item.amount = item.final_rate * item.quantity
                        item.changed_by = request.user
                        item.changed_at = timezone.now()
                        item.save()

                subtotal = sum(i.amount for i in quote.items.all())
                quote.subtotal = subtotal
                quote.grand_total = subtotal - quote.discount + quote.tax
                
                is_waterproofing = quote.service_request.service_category in ["waterproofing", "waterproofing-services"] or any("waterproofing" in str(it.category).lower() for it in quote.items.all())
                is_mason = quote.service_request.service_category in ["mason", "masonry"] or any("mason" in str(it.category).lower() for it in quote.items.all())
                if is_mason:
                    quote.advance_amount = quote.grand_total * Decimal("0.5")
                    quote.balance_amount = quote.grand_total - quote.advance_amount
                elif is_waterproofing and quote.grand_total >= Decimal("1000.00"):
                    quote.advance_amount = quote.grand_total * Decimal("0.5")
                    quote.balance_amount = quote.grand_total - quote.advance_amount
                else:
                    quote.advance_amount = quote.grand_total
                    quote.balance_amount = Decimal("0.00")

                quote.save()
            return _success(data=PaintingQuoteSerializer(quote).data, message="Quotation adjusted successfully.")

        return _error("Invalid action option. Use APPROVE_AND_SEND, REJECT, or ADJUST.", 400)


class CustomerQuotePDFView(APIView):
    """
    GET /api/booking/quote/<str:token>/pdf/
    Generates and returns a PDF receipt/quotation for the customer.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            quote = PaintingQuote.objects.get(customer_decision_token=token)
        except PaintingQuote.DoesNotExist:
            from django.http import HttpResponse
            return HttpResponse("Quotation not found.", status=404)

        from reportlab.pdfgen import canvas
        from django.http import HttpResponse
        import io

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer)

        # Draw header
        p.setFont("Helvetica-Bold", 18)
        p.drawString(100, 750, "CalTrack Painting Service Quotation")
        p.setFont("Helvetica", 10)
        p.drawString(100, 735, f"Date generated: {quote.created_at.strftime('%d/%m/%Y %H:%M')}")
        
        # Meta info
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, 700, "Quotation Summary")
        p.setFont("Helvetica", 10)
        p.drawString(100, 680, f"Quote Number: {quote.quote_number} (v{quote.quote_version})")
        p.drawString(100, 665, f"Property Type: {quote.property_type or 'Residential'}")
        p.drawString(100, 650, f"Total Paintable Area: {quote.total_paintable_area} sq.ft")
        p.drawString(100, 635, f"Warranty: {quote.warranty or 'No Warranty'}")
        p.drawString(100, 620, f"Validity: {quote.valid_until.strftime('%d/%m/%Y') if quote.valid_until else 'N/A'}")
        
        # Draw items header
        p.setFont("Helvetica-Bold", 12)
        p.drawString(100, 580, "Line Items")
        y = 560
        p.setFont("Helvetica-Bold", 10)
        p.drawString(100, y, "Description")
        p.drawString(350, y, "Qty")
        p.drawString(400, y, "Rate")
        p.drawString(480, y, "Amount")
        
        p.setFont("Helvetica", 9)
        for item in quote.items.all():
            y -= 20
            p.drawString(100, y, item.description[:45])
            p.drawString(350, y, str(item.quantity))
            p.drawString(400, y, f"Rs. {item.final_rate}")
            p.drawString(480, y, f"Rs. {item.amount}")
            if y < 100:
                p.showPage()
                y = 750

        # Totals
        y -= 30
        p.setFont("Helvetica-Bold", 11)
        p.drawString(350, y, "Subtotal:")
        p.drawString(480, y, f"Rs. {quote.subtotal}")
        y -= 15
        p.drawString(350, y, "Discount:")
        p.drawString(480, y, f"Rs. {quote.discount}")
        y -= 15
        p.drawString(350, y, "Tax (GST):")
        p.drawString(480, y, f"Rs. {quote.tax}")
        y -= 20
        p.setFont("Helvetica-Bold", 13)
        p.drawString(350, y, "Grand Total:")
        p.drawString(480, y, f"Rs. {quote.grand_total}")
        
        # Split details
        if quote.advance_amount > 0 and quote.balance_amount > 0:
            y -= 25
            p.setFont("Helvetica", 10)
            p.drawString(100, y, f"Payment Split: 50% Advance (Rs. {quote.advance_amount}) + 50% Balance (Rs. {quote.balance_amount})")

        p.showPage()
        p.save()

        buffer.seek(0)
        response = HttpResponse(buffer.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'inline; filename="Quote-{quote.quote_number}.pdf"'
        return response


