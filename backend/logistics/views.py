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
        category = str(data.get("service_category") or "").strip()

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

        pickup_lat = _coord(data.get("pickup_latitude"))
        pickup_lng = _coord(data.get("pickup_longitude"))
        drop_lat = _coord(data.get("drop_latitude"))
        drop_lng = _coord(data.get("drop_longitude"))
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

        try:
            stop_count = int(data.get("stop_count") or 2)
        except (TypeError, ValueError):
            stop_count = 2

        breakdown = quote_logistics_fare(
            tier=tier,
            pickup_lat=pickup_lat, pickup_lng=pickup_lng,
            drop_lat=drop_lat, drop_lng=drop_lng,
            stop_count=stop_count,
        )

        if breakdown is None:
            # This tier is not configured for distance pricing (no per-km
            # rate), so its flat starting price is the authoritative fare.
            # Still answered by the server -- the frontend must not decide
            # this for itself.
            return success_response(data={
                "quotable": True,
                "pricing_mode": "flat",
                "total": str(tier.starting_price),
                "currency": tier.currency,
                "tier_id": tier.id,
                "tier_name": tier.name,
                "breakdown": None,
            })

        # Decimals as strings: money must not round-trip through JSON floats.
        payload = {k: (str(v) if isinstance(v, Decimal) else v) for k, v in breakdown.items()}
        return success_response(data={
            "quotable": True,
            "pricing_mode": "distance",
            "total": payload["total"],
            "currency": payload.get("currency", tier.currency),
            "tier_id": tier.id,
            "tier_name": tier.name,
            "breakdown": payload,
        })


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
            "survey_status": quote["survey_status"],
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

