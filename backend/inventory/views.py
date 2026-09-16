from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminRole, RequireModuleAccess
from common.drf import VisibilityQuerysetMixin
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer, StockMovement
from inventory.serializers import (
    InventoryItemSerializer, InventoryAlertSerializer, InventoryTransferSerializer
)

# VENDOR_STOCK_MANAGEMENT_IMPLEMENTATION_PLAN.md Phase 2: stock/price writes
# now happen exclusively in the Vendor app (vendor/backend/inventory), scoped
# to each vendor's own company. These Customer-app endpoints stay read-only
# for admin visibility/support -- write actions here would race against a
# vendor's own writes to the same InventoryItem/StockMovement rows with no
# way to reconcile who's authoritative, so they're refused outright rather
# than silently allowed.
STOCK_WRITES_LOCKED_MESSAGE = "Stock and pricing are now managed from the Vendor app. This view is read-only."


def _stock_writes_locked_response():
    return Response(
        {"success": False, "message": STOCK_WRITES_LOCKED_MESSAGE},
        status=status.HTTP_403_FORBIDDEN,
    )


class StandardResponseMixin:
    def success_response(self, data=None, message="", status_code=status.HTTP_200_OK):
        return Response({
            "success": True,
            "data": data if data is not None else {},
            "message": message
        }, status=status_code)

    def error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({
            "success": False,
            "message": message
        }, status=status_code)


class InventoryItemViewSet(VisibilityQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = InventoryItemSerializer
    queryset = InventoryItem.objects.all()
    company_field = "org"

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        return _stock_writes_locked_response()

    def update(self, request, *args, **kwargs):
        return _stock_writes_locked_response()

    def partial_update(self, request, *args, **kwargs):
        return _stock_writes_locked_response()

    def destroy(self, request, *args, **kwargs):
        return _stock_writes_locked_response()


class InventoryAlertViewSet(VisibilityQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = InventoryAlertSerializer
    queryset = InventoryAlert.objects.all()
    company_field = "org"

    def get_queryset(self):
        return super().get_queryset().filter(is_resolved=False)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save(update_fields=['is_resolved'])
        return self.success_response(message="Alert resolved successfully")


class InventoryTransferViewSet(VisibilityQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminRole]
    serializer_class = InventoryTransferSerializer
    queryset = InventoryTransfer.objects.all()
    company_field = "org"

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)


# ── Vegetable Stock Admin Management API Views ──────────────────────────────
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, date
from service_requests.models import Package
from inventory.serializers import (
    VegetableStockAdminListSerializer,
    VegetableRestockActionSerializer,
    VegetableAdjustActionSerializer,
    VegetableSetDefaultActionSerializer,
    VegetableDetailsUpdateSerializer,
)
from inventory.services import vegetable_stock_service
from inventory.selectors import vegetable_stock_selectors
from inventory.utils.unit_conversion import to_grams


def _get_request_company(request):
    company = getattr(request, "company", None)
    if company:
        return company
    user_comp = getattr(request.user, "company", None)
    if user_comp:
        return user_comp
    from companies.models import Company
    return Company.objects.first()


class VegetableStockListView(APIView):
    """
    GET /api/inventory/vegetable-stock/
    List all vegetable packages with live stock state, today's available, and configured default.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = _get_request_company(request)
        # Select all packages under service_slug='vegetables'
        qs = Package.objects.filter(
            service__slug="vegetables"
        ).select_related("stock_item", "service", "service__category").order_by("sort_order", "name")

        serializer = VegetableStockAdminListSerializer(qs, many=True)
        return Response({
            "success": True,
            "data": serializer.data,
            "count": len(serializer.data),
        })


class VegetableStockRestockView(APIView):
    """
    POST /api/inventory/vegetable-stock/<product_id>/restock/

    Locked (VENDOR_STOCK_MANAGEMENT_IMPLEMENTATION_PLAN.md Phase 2): restocking
    now happens exclusively from the Vendor app, scoped to each vendor's own
    company. This endpoint stays registered for a clear 403 rather than a 404,
    so any caller still pointed at it gets an explanatory message.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        return _stock_writes_locked_response()


class VegetableStockAdjustView(APIView):
    """
    POST /api/inventory/vegetable-stock/<product_id>/adjust/

    Locked (VENDOR_STOCK_MANAGEMENT_IMPLEMENTATION_PLAN.md Phase 2): manual
    stock adjustments now happen exclusively from the Vendor app.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        return _stock_writes_locked_response()


class VegetableStockSetDefaultView(APIView):
    """
    POST /api/inventory/vegetable-stock/<product_id>/set-default/

    Locked (VENDOR_STOCK_MANAGEMENT_IMPLEMENTATION_PLAN.md Phase 2): default
    daily quantity is now configured exclusively from the Vendor app.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        return _stock_writes_locked_response()


class VegetableStockHistoryView(APIView):
    """
    GET /api/inventory/vegetable-stock/<product_id>/history/?start_date=2026-09-01&end_date=2026-09-04
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, product_id):
        product = get_object_or_404(Package.objects.select_related("stock_item"), id=product_id)
        
        today = timezone.localdate()
        start_date_str = request.GET.get("start_date")
        end_date_str = request.GET.get("end_date")

        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else (today - timezone.timedelta(days=7))
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str else today
        except ValueError:
            return Response({"success": False, "message": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        history = vegetable_stock_selectors.get_daily_stock_history(
            product=product,
            start_date=start_date,
            end_date=end_date,
        )

        return Response({
            "success": True,
            "product_id": product.id,
            "product_name": product.name,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "data": history,
        })


class VegetableDetailsUpdateView(APIView):
    """
    PATCH /api/inventory/vegetable-stock/<product_id>/update-details/

    Locked (VENDOR_STOCK_MANAGEMENT_IMPLEMENTATION_PLAN.md Phase 2): price,
    offer price, and reorder/restock levels are now configured exclusively
    from the Vendor app -- see vendor/backend/inventory/views.py's
    VendorStockUpdateDetailsView for the equivalent, company-scoped endpoint.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, product_id):
        return _stock_writes_locked_response()
