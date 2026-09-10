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
                return Response(
                    {
                        "success": False,
                        "error_code": "VEHICLE_CAPACITY_EXCEEDED",
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
            return success_response(data={
                "quotable": True,
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

        pickup_lat = _coord(data.get("pickup_latitude") or data.get("latitude"))
        pickup_lng = _coord(data.get("pickup_longitude") or data.get("longitude"))
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

        inventory = data.get("inventory") or data.get("items") or data.get("cart_data") or {}
        packing_tier = str(data.get("packing_tier") or "standard").strip()
        dismantling_required = bool(data.get("dismantling_required", True))
        unpacking_required = bool(data.get("unpacking_required", False))

        try:
            pickup_floor = int(data.get("pickup_floor") or 0)
        except (TypeError, ValueError):
            pickup_floor = 0

        pickup_has_lift = bool(data.get("pickup_has_lift", True))

        try:
            drop_floor = int(data.get("drop_floor") or 0)
        except (TypeError, ValueError):
            drop_floor = 0

        drop_has_lift = bool(data.get("drop_has_lift", True))
        relocation_type = str(data.get("relocation_type") or "Within City").strip()

        try:
            quote = compute_packers_movers_quote(
                pickup_lat=pickup_lat,
                pickup_lng=pickup_lng,
                drop_lat=drop_lat,
                drop_lng=drop_lng,
                inventory=inventory,
                packing_tier=packing_tier,
                dismantling_required=dismantling_required,
                unpacking_required=unpacking_required,
                pickup_floor=pickup_floor,
                pickup_has_lift=pickup_has_lift,
                drop_floor=drop_floor,
                drop_has_lift=drop_has_lift,
                relocation_type=relocation_type,
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

        return success_response(data={
            "quotable": True,
            "quote_id": quote["quote_id"],
            "requires_survey": quote["requires_survey"],
            "requires_review": quote["requires_review"],
            "survey_status": quote["survey_status"],
            "is_authoritative": quote["is_authoritative"],
            "is_estimate": quote["is_estimate"],
            "estimate_notice": quote["estimate_notice"],
            "unrecognized_items": quote.get("unrecognized_items", []),
            "review_reason": quote.get("review_reason"),
            "total": str(quote["pricing"]["total"]),
            "subtotal": str(quote["pricing"]["subtotal"]),
            "gst_amount": str(quote["pricing"]["gst_amount"]),
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
                        "cft": float(it.default_cft or 1.0),
                        "weight_kg": float(it.default_weight_kg or 5.0),
                        "is_fragile": it.is_fragile,
                        "can_dismantle": it.requires_special_handling or it.special_handling_charge > 0,
                        "dismantle_charge": str(it.special_handling_charge or "0.00"),
                    }
                    for it in items
                ],
            }
            categories_data.append(cat_payload)

        return success_response(data={"categories": categories_data})


