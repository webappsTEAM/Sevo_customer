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
from .services.logistics_pricing import resolve_logistics_fare
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

        qs = Package.objects.select_related("service", "service__category").all().order_by('id')
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


# ── Public Vegetable Recipes & Recommendations ──────────────────────────────

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


class BookingCreateView(APIView):
    """
    POST /api/booking/
    Creates a ServiceRequest and returns human-readable request_id.
    """
    permission_classes = [permissions.AllowAny]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = ServiceRequestPublicCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Validation error.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        company = _get_company(request)

        # Masonry Backend Validations
        cart_data = request.data.get("cart_data", [])
        if isinstance(cart_data, str):
            import json
            try:
                cart_data = json.loads(cart_data)
            except Exception:
                cart_data = []

        for item in cart_data:
            item_id = str(item.get("id") or "").lower()
            if "mason" in item_id or item.get("categoryName") == "Mason":
                # Verify package and properties against database
                if "minor-masonry" in item_id:
                    # Validate area
                    area = item.get("selectedArea")
                    if area is None:
                        return Response(
                            {"success": False, "message": "Area is required for Minor Masonry."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    try:
                        area_val = float(area)
                        # Fetch dynamic minimum_area from database customization
                        from service_requests.models import Package
                        pkg = Package.objects.filter(slug="minor-masonry", status="ACTIVE").first()
                        min_area = 500
                        if pkg and pkg.service and isinstance(pkg.service.customization, dict):
                            min_area = float(pkg.service.customization.get("minimum_area", 500))
                        
                        if area_val < min_area:
                            return Response(
                                {"success": False, "message": f"Minimum service area is {int(min_area)} sq.ft. Please enter an area of {int(min_area)} sq.ft or more."},
                                status=status.HTTP_400_BAD_REQUEST
                            )
                    except (ValueError, TypeError):
                        return Response(
                            {"success": False, "message": "Invalid area value. Area must be a number."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                elif "tile-fixing" in item_id:
                    size = str(item.get("selectedBathroomSize") or "").strip()
                    if not size:
                        return Response(
                            {"success": False, "message": "Bathroom size choice is required."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Fetch dynamic pricing_slabs from database customization
                    from service_requests.models import Package
                    pkg = Package.objects.filter(slug="bathroom-tile-fixing", status="ACTIVE").first()
                    pricing_slabs = {"Small": 10000, "Medium": 10000, "Large": 20000}
                    if pkg and pkg.service and isinstance(pkg.service.customization, dict):
                        pricing_slabs = pkg.service.customization.get("pricing_slabs", pricing_slabs)
                    
                    allowed_sizes = [s.strip().lower() for s in pricing_slabs.keys()]
                    if size.lower() not in allowed_sizes:
                        return Response(
                            {"success": False, "message": f"Invalid bathroom size choice. Allowed values: {', '.join(pricing_slabs.keys())}."},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    # Get exact expected price
                    expected_price = None
                    for key, val in pricing_slabs.items():
                        if key.strip().lower() == size.lower():
                            expected_price = float(val)
                            break
                    
                    submitted_price = item.get("predefinedPrice")
                    if submitted_price is not None:
                        try:
                            if float(submitted_price) != expected_price:
                                return Response(
                                    {"success": False, "message": f"Predefined price mismatch for {size} bathroom."},
                                    status=status.HTTP_400_BAD_REQUEST
                                )
                        except (ValueError, TypeError):
                            return Response(
                                {"success": False, "message": "Invalid predefined price value."},
                                status=status.HTTP_400_BAD_REQUEST
                            )

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
            _lat = 12.7409
            _lng = 77.8253
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

        corrected_fare = resolve_logistics_fare(
            service_category=serializer.validated_data.get("service_category", ""),
            logistics_tier=serializer.validated_data.get("logistics_tier"),
            logistics_lane=serializer.validated_data.get("logistics_lane"),
            submitted_amount=serializer.validated_data.get("total_amount", 0),
        )

        _service_category = (serializer.validated_data.get("service_category") or "").strip().lower()
        is_painting_booking = False
        if _service_category in ["painting", "paintings", "interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor"]:
            is_painting_booking = True
        else:
            if any(it.get("categoryName") == "Painting" or "paint" in str(it.get("id")) or "wp-" in str(it.get("id")) for it in cart_data):
                is_painting_booking = True

        is_mason_booking = False
        if _service_category in ["mason", "masonry"]:
            is_mason_booking = True
        else:
            if any(it.get("categoryName") == "Mason" or "mason" in str(it.get("id")) for it in cart_data):
                is_mason_booking = True

        if is_painting_booking or is_mason_booking:
            dist_km = 0.0
            if _lat is not None and _lng is not None:
                dist_m = _haversine_meters(12.7409, 77.8253, _lat, _lng)
                if dist_m is not None:
                    dist_km = dist_m / 1000.0
            if dist_km > 15.0:
                corrected_fare = Decimal("300.00")
            else:
                corrected_fare = Decimal("0.00")

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

        # Dispatch booking notification to workforce management system
        WorkforceIntegrationService.dispatch_job(sr.id)

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

        return _success(
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
            str(sr.tracking_token).lower() == str(provided_token).strip().lower()
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


def _resolve_customer_location(sr):
    """
    Authoritative customer location resolver in strict compliance with production hierarchy:
    1. ServiceRequest latitude + longitude (if already stored & valid)
    2. Customer's selected saved address coordinates (if available)
    3. Server-side geocoding of the real booking address
    4. Explicit location_unavailable (NEVER silently substitute fake or default coordinates)

    Returns dict:
    {
        "available": bool,
        "latitude": float | None,
        "longitude": float | None,
        "address": str,
        "source": "booking" | "saved_address" | "geocoded" | None
    }
    """
    # 1. Stored coordinates on ServiceRequest
    if sr.latitude is not None and sr.longitude is not None:
        try:
            lat = float(sr.latitude)
            lng = float(sr.longitude)
            if -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0 and not (lat == 0.0 and lng == 0.0):
                return {
                    "available": True,
                    "latitude": lat,
                    "longitude": lng,
                    "address": sr.address or "",
                    "source": "booking",
                }
        except (ValueError, TypeError):
            pass

    # 2. Coordinates from selected saved address
    saved_addr = None
    if getattr(sr, "saved_address_id", None):
        try:
            from accounts.models import SavedAddress
            saved_addr = SavedAddress.objects.filter(id=sr.saved_address_id).first()
        except Exception:
            pass
    elif sr.customer_id:
        try:
            from accounts.models import SavedAddress
            saved_addr = SavedAddress.objects.filter(user_id=sr.customer_id).first()
        except Exception:
            pass

    if saved_addr and saved_addr.latitude is not None and saved_addr.longitude is not None:
        try:
            lat = float(saved_addr.latitude)
            lng = float(saved_addr.longitude)
            if -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0 and not (lat == 0.0 and lng == 0.0):
                try:
                    from decimal import Decimal
                    sr.latitude = Decimal(str(lat))
                    sr.longitude = Decimal(str(lng))
                    sr.save(update_fields=["latitude", "longitude"])
                except Exception:
                    pass
                return {
                    "available": True,
                    "latitude": lat,
                    "longitude": lng,
                    "address": sr.address or saved_addr.formatted_address or "",
                    "source": "saved_address",
                }
        except (ValueError, TypeError):
            pass

    # 3. Server-side forward geocoding of the real booking address
    if sr.address and sr.address.strip():
        try:
            from .services.address_service import AddressService
            coords = AddressService.forward_geocode(sr.address.strip())
            if coords:
                lat, lng = coords
                try:
                    from decimal import Decimal
                    sr.latitude = Decimal(str(lat))
                    sr.longitude = Decimal(str(lng))
                    sr.save(update_fields=["latitude", "longitude"])
                except Exception:
                    pass
                return {
                    "available": True,
                    "latitude": lat,
                    "longitude": lng,
                    "address": sr.address,
                    "source": "geocoded",
                }
        except Exception as e:
            logger.warning("_resolve_customer_location geocoding error: %s", e)

    # 4. Explicitly unavailable (NEVER use fallback default coordinates)
    return {
        "available": False,
        "latitude": None,
        "longitude": None,
        "address": sr.address or "",
        "source": None,
    }


def _build_tracking_payload(sr, has_full_access):
    """
    Constructs the canonical authoritative live tracking response payload for a booking.
    Strictly adheres to production rules:
    - Real customer coordinates or location_unavailable (NO fallback Hosur coords).
    - Authoritative User FK relationship for assigned employee.
    - Verified identity without inventing ratings, jobs, or placeholder photos.
    - Strict validation: location.booking_id == sr.id AND location.technician_id == sr.technician_id.
    - Status and GPS coordinates remain separate.
    """
    # 1. Authoritative Customer Location
    cust_loc = _resolve_customer_location(sr)
    dest_lat = cust_loc["latitude"]
    dest_lng = cust_loc["longitude"]

    # 2. Lifecycle & Acceptance flags
    technician_assigned = bool(
        sr.status in ["assigned", "accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]
        or sr.technician_id or sr.workforce_job_id or sr.external_assignment_id
    )
    technician_accepted = bool(
        sr.status in ["accepted", "on_the_way", "arrived", "in_progress", "completed", "closed"]
    )
    is_accepted = technician_accepted
    tracking_available = bool(sr.status in ["accepted", "on_the_way", "arrived", "in_progress"])
    is_terminal = sr.status in ["completed", "closed", "cancelled", "rejected", "feedback_pending", "feedback_received"]

    # 3. Authoritative Assigned Employee Profile
    tech_user = getattr(sr, "technician", None)
    emp_payload = None

    if is_accepted and tech_user:
        # Hierarchy: 1. Full Name, 2. First + Last Name, 3. Clean Username, 4. "Assigned Service Professional"
        u_full = tech_user.get_full_name().strip()
        if not u_full and tech_user.first_name:
            u_full = f"{tech_user.first_name} {tech_user.last_name or ''}".strip()

        slug_match = (sr.service_category or "").lower().replace("_", "").replace("-", "").replace(" ", "")
        if not u_full and tech_user.username:
            u_raw = tech_user.username.replace("_", " ").replace("-", " ").strip()
            if u_raw.lower().replace(" ", "") != slug_match:
                u_full = u_raw.title()

        emp_name = u_full if u_full else "Assigned Service Professional"
        emp_phone = None
        if has_full_access:
            emp_phone = getattr(tech_user, "phone", None) or getattr(tech_user, "mobile_number", None) or sr.technician_phone or None

        emp_photo = None
        if getattr(tech_user, "avatar", None):
            try:
                if bool(tech_user.avatar):
                    emp_photo = tech_user.avatar.url
            except Exception:
                pass
        if not emp_photo and sr.technician_photo:
            emp_photo = sr.technician_photo

        emp_rating = None
        if sr.technician_rating is not None:
            try:
                emp_rating = float(sr.technician_rating)
            except (ValueError, TypeError):
                emp_rating = None

        emp_jobs = None
        if getattr(sr, "technician_jobs_completed", None) is not None:
            try:
                emp_jobs = int(sr.technician_jobs_completed)
            except (ValueError, TypeError):
                emp_jobs = None

        emp_job_id = sr.workforce_job_id or sr.external_assignment_id or f"TECH-{tech_user.id:04d}"

        emp_payload = {
            "assigned": True,
            "id": tech_user.id,
            "job_id": emp_job_id,
            "name": emp_name,
            "photo": emp_photo,
            "phone": emp_phone,
            "rating": emp_rating,
            "jobs_completed": emp_jobs,
            "verified": bool(tech_user.is_active),
            "service_category": sr.service_category or "",
        }
    elif is_accepted and sr.technician_name:
        # Fallback if external workforce sync provided details without local User FK
        emp_name = sr.technician_name
        slug_match = (sr.service_category or "").lower().replace("_", "").replace("-", "").replace(" ", "")
        if emp_name.lower().replace(" ", "").replace("_", "") == slug_match:
            emp_name = "Assigned Service Professional"

        emp_payload = {
            "assigned": True,
            "id": sr.external_assignment_id or None,
            "job_id": sr.workforce_job_id or sr.external_assignment_id or None,
            "name": emp_name,
            "photo": sr.technician_photo or None,
            "phone": sr.technician_phone if has_full_access else None,
            "rating": float(sr.technician_rating) if sr.technician_rating is not None else None,
            "jobs_completed": getattr(sr, "technician_jobs_completed", None),
            "verified": True,
            "service_category": sr.service_category or "",
        }
    elif is_accepted:
        # Check BookingAssignment table if direct FK or denormalized name were empty
        latest_assignment = sr.assignments.filter(status__in=["accepted", "completed"]).order_by("-id").first()
        if latest_assignment and (latest_assignment.technician_name or latest_assignment.technician_id):
            emp_name = latest_assignment.technician_name or "Assigned Service Professional"
            slug_match = (sr.service_category or "").lower().replace("_", "").replace("-", "").replace(" ", "")
            if emp_name.lower().replace(" ", "").replace("_", "") == slug_match:
                emp_name = "Assigned Service Professional"

            emp_payload = {
                "assigned": True,
                "id": latest_assignment.technician_id or None,
                "job_id": latest_assignment.workforce_job_id or latest_assignment.assignment_id or None,
                "name": emp_name,
                "photo": latest_assignment.technician_photo or None,
                "phone": latest_assignment.technician_phone if has_full_access else None,
                "rating": float(latest_assignment.technician_rating) if latest_assignment.technician_rating is not None else None,
                "jobs_completed": None,
                "verified": bool(latest_assignment.technician_verified),
                "service_category": sr.service_category or "",
            }

    if is_accepted and not emp_payload:
        emp_payload = {
            "assigned": True,
            "id": sr.technician_id or sr.external_assignment_id or "PARTNER",
            "job_id": sr.workforce_job_id or sr.external_assignment_id or f"SR-{sr.request_id}",
            "name": "Assigned Service Professional",
            "photo": sr.technician_photo or None,
            "phone": sr.technician_phone if has_full_access else None,
            "rating": float(sr.technician_rating) if sr.technician_rating is not None else None,
            "jobs_completed": getattr(sr, "technician_jobs_completed", None),
            "verified": True,
            "service_category": sr.service_category or "",
        }

    # 4. Real Live GPS Coordinates (Validated: location.booking == sr AND location.technician == sr.technician)
    tech_lat = None
    tech_lng = None
    resolved_heading = 0.0
    resolved_speed = 0.0
    resolved_accuracy = None
    loc_updated_at = None
    freshness = "UNAVAILABLE"

    if is_accepted and not is_terminal:
        from .models import TechnicianLocation
        loc_qs = TechnicianLocation.objects.filter(booking=sr)
        if sr.technician_id:
            loc_qs = loc_qs.filter(technician_id=sr.technician_id)
        latest_telemetry = loc_qs.order_by("-created_at").first()

        if latest_telemetry:
            tech_lat = float(latest_telemetry.latitude)
            tech_lng = float(latest_telemetry.longitude)
            resolved_heading = float(latest_telemetry.heading or 0.0)
            resolved_speed = float(latest_telemetry.speed or 0.0)
            resolved_accuracy = float(latest_telemetry.accuracy) if latest_telemetry.accuracy is not None else None
            loc_updated_at = latest_telemetry.created_at.isoformat()
            loc_time = latest_telemetry.created_at
        elif sr.technician_latitude is not None and sr.technician_longitude is not None:
            tech_lat = float(sr.technician_latitude)
            tech_lng = float(sr.technician_longitude)
            resolved_heading = float(getattr(sr, "technician_heading", 0.0) or 0.0)
            resolved_speed = float(getattr(sr, "technician_speed", 0.0) or 0.0)
            resolved_accuracy = float(sr.technician_accuracy) if getattr(sr, "technician_accuracy", None) is not None else None
            loc_time = sr.technician_location_updated_at or timezone.now()
            loc_updated_at = loc_time.isoformat()
        elif sr.status == "arrived" and dest_lat is not None and dest_lng is not None:
            tech_lat = float(dest_lat)
            tech_lng = float(dest_lng)
            resolved_speed = 0.0
            loc_time = getattr(sr, "technician_arrived_at", None) or getattr(sr, "updated_at", None) or timezone.now()
            loc_updated_at = loc_time.isoformat()
        else:
            loc_time = None

        if tech_lat is not None and tech_lng is not None and loc_time:
            age_seconds = max(0, (timezone.now() - loc_time).total_seconds())
            if sr.status == "arrived":
                freshness = "ARRIVED"
            elif age_seconds <= 15:
                freshness = "LIVE"
            elif age_seconds <= 60:
                freshness = "RECENT"
            elif age_seconds <= 300:
                freshness = "STALE"
            else:
                freshness = "LAST_KNOWN"
        else:
            freshness = "UNAVAILABLE"
    elif is_terminal:
        freshness = "COMPLETED" if sr.status not in ["cancelled", "rejected"] else "CANCELLED"

    # 5. Real Distance & ETA calculation (Separate from Status)
    distance_m = None
    distance_km = None
    eta_seconds = None
    eta_minutes = None

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

    # 6. Live Location block
    live_loc_payload = None
    if tech_lat is not None and tech_lng is not None and not is_terminal:
        live_loc_payload = {
            "available": True,
            "employee_id": tech_user.id if tech_user else (emp_payload.get("id") if emp_payload else None),
            "latitude": tech_lat,
            "longitude": tech_lng,
            "heading": resolved_heading,
            "speed": resolved_speed,
            "accuracy": resolved_accuracy,
            "freshness": freshness,
            "updated_at": loc_updated_at,
        }
    else:
        live_loc_payload = {
            "available": False,
            "employee_id": tech_user.id if tech_user else None,
            "latitude": None,
            "longitude": None,
            "heading": None,
            "speed": None,
            "accuracy": None,
            "freshness": freshness,
            "updated_at": loc_updated_at,
        }

    # 7. Vendor details
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

    # 8. Start OTP: Only exposed if accepted and active
    start_otp = sr.start_otp if (not is_terminal and is_accepted and sr.status in ["accepted", "on_the_way", "arrived", "in_progress"]) else None

    created_at_raw = getattr(sr, 'created_at', None) or getattr(sr, 'submitted_at', None)
    created_at_str = created_at_raw.isoformat() if created_at_raw and hasattr(created_at_raw, 'isoformat') else (str(created_at_raw) if created_at_raw else None)

    try:
        total_amt = float(sr.total_amount) if sr.total_amount is not None else 0.0
    except (ValueError, TypeError):
        total_amt = 0.0

    from .models import PaintingQuote, Payment, ServiceRequest
    from .serializers import PaintingQuoteSerializer

    local_quote = PaintingQuote.objects.filter(service_request=sr).order_by("-quote_version").first()
    if not local_quote and sr.parent_request:
        local_quote = PaintingQuote.objects.filter(service_request=sr.parent_request).order_by("-quote_version").first()

    quote_data = None
    if local_quote:
        quote_data = PaintingQuoteSerializer(local_quote).data
    else:
        quote_res = WorkforceIntegrationService.get_quote_by_booking_id(sr.request_id)
        if quote_res.get("success"):
            quote_data = quote_res.get("quote")

    child_booking_data = None
    child_sr = ServiceRequest.objects.filter(parent_request=sr, request_kind="quoted_work").order_by("-id").first()
    if child_sr:
        child_booking_data = {
            "id": child_sr.id,
            "request_id": child_sr.request_id,
            "status": child_sr.status,
            "payment_status": child_sr.payment_status,
            "total_amount": float(child_sr.total_amount) if child_sr.total_amount else 0.0,
            "payment_method": child_sr.payment_method,
            "invoice_id": child_sr.invoice_id,
            "tracking_token": str(child_sr.tracking_token) if child_sr.tracking_token else None,
            "service_category": child_sr.service_category,
        }

    target_pay_sr = child_sr if child_sr else (sr if sr.request_kind == "quoted_work" else None)
    
    quote_grand_total = 0.0
    quote_advance_amount = 0.0
    quote_balance_amount = 0.0
    quote_paid_amount = 0.0
    quote_remaining_amount = 0.0
    advance_paid = False
    balance_paid = False

    if local_quote:
        quote_grand_total = float(local_quote.grand_total)
        quote_advance_amount = float(local_quote.advance_amount)
        quote_balance_amount = float(local_quote.balance_amount)

        if target_pay_sr:
            payments = Payment.objects.filter(service_request=target_pay_sr, status=ServiceRequest.PaymentStatus.PAID)
            quote_paid_amount = float(sum(p.amount for p in payments))
            quote_remaining_amount = max(0.0, quote_grand_total - quote_paid_amount)
            advance_paid = bool(quote_paid_amount >= quote_advance_amount)
            balance_paid = bool(quote_paid_amount >= quote_grand_total)

    return {
        "booking_id": sr.id,
        "request_id": sr.request_id,
        "job_id": sr.id,
        "booking": {
            "id": sr.id,
            "request_id": sr.request_id,
            "booking_number": sr.request_id,
            "status": sr.status,
            "service_name": service_title,
            "service_category": sr.service_category or "",
            "issue_title": sr.issue_title or "",
            "customer_location": cust_loc,
        },
        "assigned_employee": emp_payload,
        "customer_location": cust_loc,
        "live_location": live_loc_payload,
        "status": sr.status,
        "is_accepted": is_accepted,
        "tracking_available": tracking_available,
        "technician_assigned": technician_assigned,
        "technician_accepted": technician_accepted,
        "service_category": sr.service_category or "",
        "issue_title": sr.issue_title or "",
        "description": sr.description or "",
        "customer_name": sr.customer_name or "",
        "phone": sr.phone if has_full_access else "",
        "created_at": created_at_str,
        "preferred_date": str(sr.preferred_date) if sr.preferred_date else "",
        "preferred_time": sr.preferred_time or "",
        "total_amount": total_amt,
        "payment_method": sr.payment_method or "COD",
        "payment_status": sr.payment_status or "pending",
        "cart_data": sr.cart_data or [],
        "vendor": vendor_data,
        "service_location": cust_loc,
        "destination": cust_loc,
        "assigned_employee": emp_payload,
        "live_location": live_loc_payload,
        "technician": {
            **(emp_payload or {}),
            "latitude": tech_lat,
            "longitude": tech_lng,
            "heading": resolved_heading,
            "speed": resolved_speed,
            "status": sr.status,
            "eta_minutes": eta_minutes,
            "distance_km": distance_km,
            "freshness": freshness,
            "updated_at": loc_updated_at,
        } if is_accepted else None,
        "technician_name": emp_payload["name"] if (is_accepted and emp_payload) else "",
        "technician_phone": emp_payload["phone"] if (is_accepted and emp_payload and has_full_access) else "",
        "technician_photo": emp_payload["photo"] if (is_accepted and emp_payload) else "",
        "technician_rating": emp_payload["rating"] if (is_accepted and emp_payload) else None,
        "technician_location": live_loc_payload if (live_loc_payload and live_loc_payload.get("available")) else None,
        "freshness": freshness,
        "distance_m": distance_m,
        "distance_km": distance_km,
        "eta_seconds": eta_seconds,
        "eta_minutes": eta_minutes,
        "start_otp": start_otp,
        "tracking_token": str(sr.tracking_token) if (has_full_access and sr.tracking_token) else None,
        "quote": quote_data,
        "child_booking": child_booking_data,
        "quote_grand_total": quote_grand_total,
        "quote_advance_amount": quote_advance_amount,
        "quote_balance_amount": quote_balance_amount,
        "quote_paid_amount": quote_paid_amount,
        "quote_remaining_amount": quote_remaining_amount,
        "advance_paid": advance_paid,
        "balance_paid": balance_paid,
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
            str(sr.tracking_token).lower() == str(provided_token).strip().lower()
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

        payload = _build_tracking_payload(sr, has_full_access=True)
        return _success(data=payload)


class CustomerQuoteDetailView(APIView):
    """
    GET /api/booking/quote/<str:token>/
    Fetches the quote detail by quote decision/tracking token from the vendor.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        # Check CalServices DB first
        quote = PaintingQuote.objects.filter(customer_decision_token=token).first()
        if quote:
            serializer = PaintingQuoteSerializer(quote)
            return _success(data=serializer.data)

        # Fallback to workforce service
        res = WorkforceIntegrationService.get_quote_by_token(token)
        if res.get("success"):
            return _success(data=res.get("quote"))
        return _error(res.get("message", "Failed to fetch quote detail."), 400)


class FeedbackTokenView(APIView):
    permission_classes = [permissions.AllowAny]

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
            if request.data.get("technician_id") or request.data.get("technician") or request.data.get("employee_id"):
                tech_val = request.data.get("technician_id") or request.data.get("technician") or request.data.get("employee_id")
                from django.contrib.auth import get_user_model
                User = get_user_model()
                t_user = User.objects.filter(pk=tech_val).first() if str(tech_val).isdigit() else User.objects.filter(username=str(tech_val)).first()
                if t_user:
                    sr.technician = t_user
                    if not sr.technician_name:
                        sr.technician_name = t_user.get_full_name() or t_user.username
                    if not sr.technician_phone:
                        sr.technician_phone = getattr(t_user, "phone", "") or getattr(t_user, "mobile_number", "")
                    if not sr.technician_photo and getattr(t_user, "avatar", None) and bool(t_user.avatar):
                        try:
                            sr.technician_photo = t_user.avatar.url
                        except Exception:
                            pass
                    if sr.technician_rating is None and getattr(t_user, "rating", None) is not None:
                        sr.technician_rating = t_user.rating

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

        if "technician_id" in request.data or "technician" in request.data or "employee_id" in request.data:
            tech_val = request.data.get("technician_id") or request.data.get("technician") or request.data.get("employee_id")
            if tech_val:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                t_user = User.objects.filter(pk=tech_val).first() if str(tech_val).isdigit() else User.objects.filter(username=str(tech_val)).first()
                if t_user:
                    sr.technician = t_user
                    if not sr.technician_name:
                        sr.technician_name = t_user.get_full_name() or t_user.username
                    if not sr.technician_phone:
                        sr.technician_phone = getattr(t_user, "phone", "") or getattr(t_user, "mobile_number", "")
                    if not sr.technician_photo and getattr(t_user, "avatar", None) and bool(t_user.avatar):
                        try:
                            sr.technician_photo = t_user.avatar.url
                        except Exception:
                            pass
                    if sr.technician_rating is None and getattr(t_user, "rating", None) is not None:
                        sr.technician_rating = t_user.rating

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
            ServiceFeedback.objects.get_or_create(service_request=sr)

        return _success(
            data=ServiceRequestDetailSerializer(sr, context={"request": request}).data,
            message="Service request verified. Feedback link generated.",
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
        return _success(data={"feedback_token": str(fb.feedback_token)}, message="Feedback link retrieved.")


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
    """
    permission_classes = [permissions.AllowAny]

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
            sr.status = "in_progress"
            try:
                sr.save(update_fields=["otp_verified", "otp_verified_at", "status", "updated_at"])
            except Exception as save_err:
                logger.error(f"[OTP Verify] Error saving SR: {save_err}", exc_info=True)
                sr.save()

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


# ─── Painting Rate Card and Quotes API views ──────────────────────────────────
from django.db import transaction
from .models import (
    PaintingRateCard, PaintingRateCardSlab,
    PaintingQuote, PaintingQuoteItem,
    PaintingMeasurement, PaintingMaterial, QuotePhoto
)
from .serializers import (
    PaintingRateCardSerializer, PaintingRateCardSlabSerializer,
    PaintingQuoteSerializer, PaintingQuoteItemSerializer,
    PaintingMeasurementSerializer, PaintingMaterialSerializer,
    QuotePhotoSerializer
)
from .notifications import send_quote_notification


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
            send_quote_notification(quote)

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
            send_quote_notification(quote)
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


