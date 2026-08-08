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
from rest_framework import permissions
from rest_framework.views import APIView

from utils.responses import success_response

from .models import Lane, ServiceArea, ServiceTier
from .serializers import LaneSerializer, ServiceAreaSerializer, ServiceTierSerializer


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
