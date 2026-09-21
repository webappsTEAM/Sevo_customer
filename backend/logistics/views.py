"""
backend/logistics/views.py

Public, read-only catalog endpoints. Same access pattern as
service_requests.CatalogCategoryListView / CatalogServiceListView — these
feed pre-login booking pages (/trucks/<city>, /two-wheelers/<city>,
/packers-and-movers/<city>), so AllowAny is correct here, not a gap.

Business logic stays out of these views on purpose (CLAUDE.md: business
logic never lives in views) — there isn't any yet because this is pure
catalog lookup. Fare computation for an actual booking (once the frontend
submits one) belongs in service_requests/services/, not here.
"""
import logging
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from utils.responses import success_response

from .models import Lane, ServiceArea, ServiceTier
from .serializers import LaneSerializer, ServiceAreaSerializer, ServiceTierSerializer

logger = logging.getLogger(__name__)


class ServiceTierListView(APIView):
    """GET /api/logistics/tiers/?category=truck&city=hosur&weight_class=light"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = ServiceTier.objects.filter(is_active=True)
        category = request.query_params.get("category")
        city = request.query_params.get("city")
        weight_class = request.query_params.get("weight_class")
        if category:
            qs = qs.filter(category=category)
        if city:
            qs = qs.filter(city__iexact=city)
        if weight_class:
            qs = qs.filter(weight_class=weight_class)

        # GT audit Update 18: never offer a vehicle class that no driver can
        # actually operate. ServiceTier.VehicleClass includes "heavy_truck",
        # which the Vendor app's Vehicle.VehicleType has no member for -- a
        # customer could pick it, pay, and then wait for a dispatch that can
        # never happen. The booking-time resolver refuses it as well
        # (assert_gt_booking_is_classifiable); this keeps it off the picker so
        # the customer never sees a vehicle they cannot have.
        #
        # Tiers with a BLANK vehicle_class are left alone on purpose: Packers
        # & Movers tiers are relocation packages (1BHK, Villa) that carry no
        # vehicle class by design and are matched on payload instead.
        from service_requests.services.logistics_pricing import (
            DISPATCHABLE_VEHICLE_CLASSES,
        )

        qs = qs.exclude(
            ~Q(vehicle_class="") & ~Q(vehicle_class__in=DISPATCHABLE_VEHICLE_CLASSES)
        )

        qs = qs.order_by("order", "id")
        data = ServiceTierSerializer(qs, many=True).data
        return success_response(data=data)


class LaneListView(APIView):
    """GET /api/logistics/lanes/?category=truck&city=hosur"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = Lane.objects.filter(is_active=True)
        category = request.query_params.get("category")
        city = request.query_params.get("city")
        if category:
            qs = qs.filter(category=category)
        if city:
            qs = qs.filter(city__iexact=city)
        data = LaneSerializer(qs, many=True).data
        return success_response(data=data)


class ServiceAreaListView(APIView):
    """GET /api/logistics/areas/?city=hosur (category-agnostic — shared list)"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = ServiceArea.objects.filter(is_active=True)
        city = request.query_params.get("city")
        if city:
            qs = qs.filter(city__iexact=city)
        data = ServiceAreaSerializer(qs, many=True).data
        return success_response(data=data)


def _coord(value):
    """Parse a coordinate, returning None for anything unusable."""
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


class LogisticsQuoteView(APIView):
    """
    POST /api/logistics/quote/

    GT-B-01: the authoritative fare for a proposed trip, computed
    server-side, BEFORE the customer commits to a booking.

    Why this exists: the booking pages computed a display fare in the
    browser, while the backend computed the real one at booking time. Any
    disagreement between them surfaced to the customer as a price that
    changed after they pressed book. This endpoint makes the number the
    customer is shown the SAME number the booking will record -- computed
    once, by the server, from the server's own rates and its own distance
    measurement.

    The frontend never determines the fare. It renders what this returns.

    Body:
        service_category  goods_transport_truck | goods_transport_two_wheeler
        tier_id           the selected ServiceTier
        pickup_latitude / pickup_longitude
        drop_latitude    / drop_longitude
        stop_count        optional, defaults to 2 (one pickup, one drop)

    Public (AllowAny) because the booking pages are used pre-login, the
    same access pattern as the catalog endpoints above -- but throttled on
    its own scope, because unlike those every cache miss here costs a
    real billed Google Distance Matrix call.

    Packers & Movers is deliberately NOT quotable here: its pricing is
    survey/volume/crew-driven (CALTRACK_PHASE_14 H.2), so a distance
    quote would be actively wrong rather than merely approximate. That
    flow keeps its existing tier price.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "logistics_quote"

    def post(self, request):
        from service_requests.services.logistics_pricing import (
            DISTANCE_PRICED_CATEGORIES, LogisticsCatalogMismatchError,
            assert_catalog_matches_category, quote_logistics_fare,
        )

        data = request.data if isinstance(request.data, dict) else {}
        tier = ServiceTier.objects.filter(id=data.get("tier_id"), is_active=True).first()
        if tier is None:
            return Response(
                {
                    "success": False,
                    "error_code": "TIER_NOT_FOUND",
                    "message": "Select a vehicle type to get a fare.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_category = str(data.get("service_category") or "").strip()
        if raw_category in ("two_wheeler", "goods_transport_two_wheeler") or (not raw_category and tier and tier.category == "two_wheeler"):
            category = "goods_transport_two_wheeler"
        elif raw_category in ("truck", "goods_transport_truck") or (not raw_category and tier and tier.category == "truck"):
            category = "goods_transport_truck"
        else:
            category = raw_category

        if category not in DISTANCE_PRICED_CATEGORIES:
            return Response(
                {
                    "success": False,
                    "error_code": "CATEGORY_NOT_QUOTABLE",
                    "message": (
                        "This service is not priced by distance. Packers & Movers "
                        "is quoted from a survey of what is being moved."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        pickup_lat = _coord(data.get("pickup_latitude") or data.get("pickup_lat"))
        pickup_lng = _coord(data.get("pickup_longitude") or data.get("pickup_lng"))
        drop_lat = _coord(data.get("drop_latitude") or data.get("drop_lat"))
        drop_lng = _coord(data.get("drop_longitude") or data.get("drop_lng"))
        if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
            return Response(
                {
                    "success": False,
                    "error_code": "COORDINATES_REQUIRED",
                    "message": (
                        "Select both the pickup and drop locations from the "
                        "suggestions so we can measure the route."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The tier id is just a number in the request body. Without this
        # check a caller could quote a `goods_transport_truck` trip against
        # a two_wheeler tier and be given the scooter fare -- and then book
        # at it, because the booking path resolved the same unchecked tier.
        # Same rule, same service function, so quote and booking cannot
        # disagree about which catalogue records a category may price from.
        try:
            assert_catalog_matches_category(category, tier=tier)
        except LogisticsCatalogMismatchError as exc:
            logger.warning(
                "Rejected logistics quote: %s (category=%r tier=%s)",
                exc, category, tier.id,
            )
            return Response(
                {
                    "success": False,
                    "error_code": "TIER_CATEGORY_MISMATCH",
                    "message": "That vehicle type isn't available for this service. Pick one from the list.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        waypoints = data.get("waypoints") or data.get("intermediate_stops") or None
        try:
            stop_count = int(data.get("stop_count") or (len(waypoints) + 2 if (waypoints and isinstance(waypoints, list)) else 2))
        except (TypeError, ValueError):
            stop_count = 2

        # Cargo evaluation & Vehicle fitment enforcement (Porter-like safety protection)
        cargo_items = data.get("cargo_items") or data.get("items")
        goods_category = data.get("goods_category_id") or data.get("goods_category") or data.get("goods_type")
        declared_weight = data.get("declared_weight_kg") or data.get("weight_kg")
        cargo_summary = None

        if cargo_items or goods_category or declared_weight is not None:
            from service_requests.services.cargo_fitment import (
                resolve_cargo_payload, evaluate_vehicle_fitment, recommend_vehicles_for_cargo
            )
            category_id = int(goods_category) if isinstance(goods_category, int) or (isinstance(goods_category, str) and goods_category.isdigit()) else None
            category_slug = str(goods_category) if category_id is None and goods_category else None

            cargo_summary = resolve_cargo_payload(
                cargo_items=cargo_items,
                goods_category_id=category_id,
                goods_category_slug=category_slug,
                declared_weight_kg=declared_weight,
                city=tier.city,
            )

            # Cargo validation error gate (unknown item, invalid quantity, etc.)
            if not cargo_summary.get("is_valid", True):
                errs = cargo_summary.get("validation_errors") or [{}]
                first_err = errs[0]
                return Response(
                    {
                        "success": False,
                        "error_code": first_err.get("code", "CARGO_VALIDATION_ERROR"),
                        "message": first_err.get("error", "Invalid cargo details."),
                        "validation_errors": errs,
                        "cargo_summary": cargo_summary,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Prohibited cargo safety gate
            if cargo_summary.get("has_prohibited"):
                return Response(
                    {
                        "success": False,
                        "error_code": "PROHIBITED_CARGO",
                        "message": cargo_summary.get("prohibited_reason") or "Cargo contains prohibited or hazardous goods.",
                        "cargo_summary": cargo_summary,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Fitment safety gate: reject if vehicle cannot safely carry the cargo
            is_fit, fit_reason = evaluate_vehicle_fitment(tier, cargo_summary)
            if not is_fit:
                recommendations = recommend_vehicles_for_cargo(cargo_summary, city=tier.city or "Hosur")
                err_code = "CARGO_INCOMPATIBLE" if "incompatible" in str(fit_reason).lower() else "VEHICLE_CAPACITY_EXCEEDED"
                return Response(
                    {
                        "success": False,
                        "error_code": err_code,
                        "message": fit_reason,
                        "cargo_summary": recommendations["cargo_summary"],
                        "recommended_vehicle": recommendations.get("recommended_tier"),
                        "suitable_vehicles": recommendations.get("suitable_tiers", []),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        breakdown = quote_logistics_fare(
            tier=tier,
            pickup_lat=pickup_lat, pickup_lng=pickup_lng,
            drop_lat=drop_lat, drop_lng=drop_lng,
            stop_count=stop_count,
            cargo_summary=cargo_summary,
            waypoints=waypoints,
        )

        if breakdown is None:
            if getattr(tier, "per_km_rate", None) is not None:
                return Response(
                    {
                        "success": False,
                        "quotable": False,
                        "error_code": "ROUTE_REQUIRED",
                        "message": "Authoritative distance fare cannot be calculated without valid pickup and drop coordinates.",
                        "pricing_mode": "distance",
                        "tier_id": tier.id,
                        "tier_name": tier.name,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            import uuid
            from datetime import timedelta
            from django.utils import timezone
            now = timezone.now()
            quote_id = f"gtq_{uuid.uuid4().hex[:16]}"
            created_at = now.isoformat()
            expires_at = (now + timedelta(minutes=15)).isoformat()
            return success_response(data={
                "quotable": True,
                "quote_id": quote_id,
                "created_at": created_at,
                "expires_at": expires_at,
                "pricing_mode": "flat",
                "total": str(tier.starting_price),
                "currency": tier.currency,
                "tier_id": tier.id,
                "tier_name": tier.name,
                "breakdown": None,
            })

        payload = {k: (str(v) if isinstance(v, Decimal) else v) for k, v in breakdown.items()}
        return success_response(data={
            "quotable": True,
            "quote_id": payload.get("quote_id"),
            "quote_hash": payload.get("quote_hash"),
            "created_at": payload.get("created_at"),
            "expires_at": payload.get("expires_at"),
            "pricing_mode": "distance",
            "is_authoritative": bool(payload.get("is_authoritative", False)),
            "is_estimate": bool(payload.get("is_estimate", False)),
            "distance_source": payload.get("distance_source"),
            "estimate_notice": payload.get("estimate_notice"),
            "total": payload["total"],
            "currency": payload.get("currency", tier.currency),
            "tier_id": tier.id,
            "tier_name": tier.name,
            "cargo_summary": payload.get("cargo_summary"),
            "special_handling": payload.get("special_handling", "0.00"),
            "breakdown": payload,
        })


class GoodsCategoryListView(APIView):
    """GET /api/logistics/goods-categories/"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import GoodsCategory
        from .serializers import GoodsCategorySerializer
        qs = GoodsCategory.objects.filter(is_active=True).order_by("order", "name")
        data = GoodsCategorySerializer(qs, many=True).data
        return success_response(data=data)


class GoodsItemListView(APIView):
    """GET /api/logistics/goods-items/?category=furniture"""
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import GoodsItem
        from .serializers import GoodsItemSerializer
        qs = GoodsItem.objects.filter(is_active=True)
        cat = request.query_params.get("category")
        if cat:
            if cat.isdigit():
                qs = qs.filter(category_id=int(cat))
            else:
                qs = qs.filter(category__slug__iexact=cat)
        qs = qs.order_by("category", "order", "name")
        data = GoodsItemSerializer(qs, many=True).data
        return success_response(data=data)


class CargoFitmentEvaluationView(APIView):
    """
    POST /api/logistics/evaluate-cargo/
    Evaluates cargo items against all vehicle classes and returns:
    - cargo summary (weights, volumes, fragile/heavy flags)
    - recommended vehicle tier
    - suitable vehicle tiers
    - incompatible vehicle tiers with explanations
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from service_requests.services.cargo_fitment import resolve_cargo_payload, recommend_vehicles_for_cargo
        data = request.data if isinstance(request.data, dict) else {}
        cargo_items = data.get("cargo_items") or data.get("items") or []
        goods_category = data.get("goods_category_id") or data.get("goods_category") or data.get("goods_type")
        declared_weight = data.get("declared_weight_kg") or data.get("weight_kg")
        city = str(data.get("city") or "Hosur").strip()

        category_id = int(goods_category) if isinstance(goods_category, int) or (isinstance(goods_category, str) and goods_category.isdigit()) else None
        category_slug = str(goods_category) if category_id is None and goods_category else None

        cargo_summary = resolve_cargo_payload(
            cargo_items=cargo_items,
            goods_category_id=category_id,
            goods_category_slug=category_slug,
            declared_weight_kg=declared_weight,
            city=city,
        )

        recommendations = recommend_vehicles_for_cargo(cargo_summary, city=city)
        return success_response(data=recommendations)


class PackersMoversQuoteView(APIView):
    """
    POST /api/logistics/packers-movers/quote/

    Server-authoritative estimation and quotation endpoint for Packers & Movers.
    Calculates moving volume (CFT), recommended vehicle sizing, packing tiers,
    loading/unloading crew labor, floor surcharges without elevator, furniture
    dismantling/reassembly, unpacking, and 18% GST.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "logistics_quote"

    def post(self, request):
        from service_requests.services.packers_movers_pricing import compute_packers_movers_quote

        data = request.data if isinstance(request.data, dict) else {}

        pickup_lat = _coord(data.get("pickup_latitude") or data.get("pickup_lat") or data.get("latitude"))
        pickup_lng = _coord(data.get("pickup_longitude") or data.get("pickup_lng") or data.get("longitude"))
        drop_lat = _coord(data.get("drop_latitude") or data.get("drop_lat") or data.get("latitude"))
        drop_lng = _coord(data.get("drop_longitude") or data.get("drop_lng") or data.get("longitude"))

        if None in (pickup_lat, pickup_lng, drop_lat, drop_lng):
            return Response(
                {
                    "success": False,
                    "code": "COORDINATES_REQUIRED",
                    "error_code": "COORDINATES_REQUIRED",
                    "message": (
                        "Select both the pickup and drop locations from the "
                        "suggestions so we can measure the route."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Strict boolean parsing helper
        def _parse_strict_bool(val, field_name: str, default=False) -> bool:
            if val is None:
                return default
            if isinstance(val, bool):
                return val
            if isinstance(val, str):
                v_clean = val.strip().lower()
                if v_clean in ("true", "1", "yes"):
                    return True
                if v_clean in ("false", "0", "no"):
                    return False
                raise ValueError(f"Invalid boolean value '{val}' for field '{field_name}'.")
            if isinstance(val, (int, float)):
                if val == 1:
                    return True
                if val == 0:
                    return False
                raise ValueError(f"Invalid boolean value '{val}' for field '{field_name}'.")
            raise ValueError(f"Invalid boolean value for field '{field_name}'.")

        # Floor parsing helper
        def _parse_floor(val, field_name: str) -> int:
            if val is None or val == "":
                return 0
            try:
                f_int = int(val)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid floor number '{val}' for field '{field_name}'.")
            if f_int < 0:
                raise ValueError(f"Floor number cannot be negative for field '{field_name}'.")
            if f_int > 100:
                raise ValueError(f"Floor number exceeds maximum limit of 100 for field '{field_name}'.")
            return f_int

        try:
            pickup_floor = _parse_floor(data.get("pickup_floor"), "pickup_floor")
            drop_floor = _parse_floor(data.get("drop_floor"), "drop_floor")
            pickup_has_lift = _parse_strict_bool(data.get("pickup_has_lift", True), "pickup_has_lift", default=True)
            drop_has_lift = _parse_strict_bool(data.get("drop_has_lift", True), "drop_has_lift", default=True)
            dismantling_required = _parse_strict_bool(data.get("dismantling_required", True), "dismantling_required", default=True)
            unpacking_required = _parse_strict_bool(data.get("unpacking_required", False), "unpacking_required", default=False)
        except ValueError as val_err:
            msg = str(val_err)
            err_code = "INVALID_FLOOR" if "floor" in msg.lower() else ("INVALID_BOOLEAN" if "boolean" in msg.lower() else "INVALID_INPUT_PARAMETER")
            return Response(
                {
                    "success": False,
                    "code": err_code,
                    "error_code": err_code,
                    "message": msg,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        packing_tier = str(data.get("packing_tier") or "standard").strip().lower()
        if packing_tier not in ("standard", "premium", "no_packing", "none", "customer_packed"):
            return Response(
                {
                    "success": False,
                    "code": "INVALID_PACKING_TIER",
                    "error_code": "INVALID_PACKING_TIER",
                    "message": f"Invalid packing tier '{packing_tier}'. Allowed: standard, premium, no_packing.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        relocation_type = str(data.get("relocation_type") or "Within City").strip()
        city = str(data.get("city") or "Hosur").strip()

        selected_tier_id = data.get("selected_tier_id") or data.get("service_tier_id") or data.get("tier_id")
        if selected_tier_id is not None:
            try:
                selected_tier_id = int(selected_tier_id)
            except (ValueError, TypeError):
                return Response(
                    {"success": False, "code": "INVALID_TIER_ID", "error_code": "INVALID_TIER_ID", "message": "Invalid service tier ID format."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            from logistics.models import ServiceTier
            tier_obj = ServiceTier.objects.filter(id=selected_tier_id, is_active=True, city__iexact=city).first()
            if not tier_obj:
                return Response(
                    {
                        "success": False,
                        "code": "TIER_NOT_FOUND",
                        "error_code": "TIER_NOT_FOUND",
                        "message": f"Service tier #{selected_tier_id} is inactive, does not exist, or does not belong to city '{city}'.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if tier_obj.category != "packers_movers":
                return Response(
                    {
                        "success": False,
                        "code": "TIER_CATEGORY_MISMATCH",
                        "error_code": "TIER_CATEGORY_MISMATCH",
                        "message": (
                            f"Service tier #{selected_tier_id} belongs to category '{tier_obj.category}'. "
                            "Packers & Movers quotes only accept tiers with category 'packers_movers'."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        inventory = data.get("inventory") or data.get("items") or data.get("cart_data") or {}

        try:
            quote = compute_packers_movers_quote(
                pickup_lat=pickup_lat,
                pickup_lng=pickup_lng,
                drop_lat=drop_lat,
                drop_lng=drop_lng,
                inventory=inventory,
                city=city,
                packing_tier=packing_tier,
                dismantling_required=dismantling_required,
                unpacking_required=unpacking_required,
                pickup_floor=pickup_floor,
                pickup_has_lift=pickup_has_lift,
                drop_floor=drop_floor,
                drop_has_lift=drop_has_lift,
                relocation_type=relocation_type,
                service_tier_id=selected_tier_id,
            )
        except Exception as e:
            logger.exception("Error computing Packers & Movers quote: %s", e)
            return Response(
                {
                    "success": False,
                    "error_code": "ESTIMATION_FAILED",
                    "message": f"Could not calculate quote: {str(e)}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quote.get("capacity_exceeded"):
            return Response(
                {
                    "success": False,
                    "code": "VEHICLE_CAPACITY_EXCEEDED",
                    "error_code": "VEHICLE_CAPACITY_EXCEEDED",
                    "message": f"Selected vehicle tier cannot accommodate total move volume ({quote.get('inventory_summary', {}).get('effective_cft', 0):.1f} CFT). Please select a larger vehicle or request a survey.",
                    "data": quote,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return success_response(data={
            "quotable": not quote.get("requires_survey", False) and not quote.get("requires_review", False) and quote.get("pricing", {}).get("total") is not None,
            "quote_id": quote["quote_id"],
            "requires_survey": quote["requires_survey"],
            "requires_review": quote["requires_review"],
            "survey_status": quote["survey_status"],
            "is_authoritative": quote["is_authoritative"],
            "is_estimate": quote["is_estimate"],
            "estimate_notice": quote["estimate_notice"],
            "unrecognized_items": quote.get("unrecognized_items", []),
            "review_reason": quote.get("review_reason"),
            "total": str(quote["pricing"]["total"]) if quote.get("pricing", {}).get("total") is not None else None,
            "subtotal": str(quote["pricing"]["subtotal"]) if quote.get("pricing", {}).get("subtotal") is not None else None,
            "gst_amount": str(quote["pricing"]["gst_amount"]) if quote.get("pricing", {}).get("gst_amount") is not None else None,
            "currency": quote["pricing"]["currency"],
            "valid_until": quote["valid_until"],
            "vehicle": quote["vehicle"],
            "inventory_summary": quote["inventory_summary"],
            "route": quote["route"],
            "access": quote["access"],
            "pricing": quote["pricing"],
            "signature_token": quote.get("signature_token"),
        })


class PackersMoversInventoryView(APIView):
    """
    GET /api/logistics/packers-movers/inventory/

    Returns database-backed P&M inventory categories and items for the dynamic
    inventory builder in the customer web app.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from .models import GoodsCategory, GoodsItem
        pm_cats = GoodsCategory.objects.filter(slug__startswith="pm-", is_active=True).order_by("order", "name")
        categories_data = []

        for cat in pm_cats:
            items = GoodsItem.objects.filter(category=cat, is_active=True).order_by("order", "name")
            cat_payload = {
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "icon": cat.icon,
                "description": cat.description,
                "items": [
                    {
                        "id": it.id,
                        "name": it.name,
                        "slug": it.slug,
                        "cft": float(it.default_cft) if (it.default_cft is not None and it.default_cft > 0 and it.default_weight_kg is not None and it.default_weight_kg > 0) else None,
                        "weight_kg": float(it.default_weight_kg) if (it.default_cft is not None and it.default_cft > 0 and it.default_weight_kg is not None and it.default_weight_kg > 0) else None,
                        "configured": bool(it.default_cft is not None and it.default_cft > 0 and it.default_weight_kg is not None and it.default_weight_kg > 0),
                        "is_fragile": it.is_fragile,
                        "can_dismantle": it.requires_special_handling or it.special_handling_charge > 0,
                        "dismantle_charge": str(it.special_handling_charge or "0.00"),
                    }
                    for it in items
                ],
            }
            categories_data.append(cat_payload)

        return success_response(data={"categories": categories_data})


class LogisticsSlotAvailabilityView(APIView):
    """
    GET /api/logistics/slots/?date=YYYY-MM-DD&category=goods_transport_truck
    Returns authoritative booking slot availability for a given date and service category,
    calculated against server clock and business rules in service_requests/booking_window.py.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from service_requests.booking_window import (
            validate_booking_slot,
            get_cutoff_hour,
            get_min_lead_minutes,
            is_same_day_closed,
            next_bookable_date,
            cutoff_label,
        )
        import datetime
        from django.utils import timezone

        date_str = request.query_params.get("date")
        category = request.query_params.get("category", "goods_transport_truck")

        now = timezone.localtime()
        if date_str:
            try:
                target_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = now.date()

        SLOT_DEFS = [
            ("Morning", ["6AM-7AM", "7AM-8AM", "8AM-9AM", "9AM-10AM", "10AM-11AM", "11AM-12PM"]),
            ("Afternoon", ["12PM-1PM", "1PM-2PM", "2PM-3PM", "3PM-4PM", "4PM-5PM"]),
            ("Evening", ["5PM-6PM", "6PM-7PM", "7PM-8PM", "8PM-9PM", "9PM-10PM"]),
        ]

        same_day_closed = (target_date == now.date()) and is_same_day_closed(now, category)

        groups = []
        for group_name, slots in SLOT_DEFS:
            group_slots = []
            for slot_label in slots:
                err = validate_booking_slot(
                    preferred_date=target_date,
                    preferred_time=slot_label,
                    now=now,
                    service_category=category,
                )
                is_avail = (err is None)
                group_slots.append({
                    "slot": slot_label,
                    "label": slot_label,
                    "is_available": is_avail,
                    "reason": err if not is_avail else None,
                })
            groups.append({
                "group": group_name,
                "slots": group_slots,
            })

        return Response({
            "success": True,
            "date": target_date.isoformat(),
            "service_category": category,
            "is_same_day_closed": same_day_closed,
            "cutoff_hour": get_cutoff_hour(category),
            "cutoff_label": cutoff_label(category),
            "min_lead_minutes": get_min_lead_minutes(),
            "next_bookable_date": next_bookable_date(now, category).isoformat(),
            "groups": groups,
        })


