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
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return self.success_response(data=serializer.data, message="Item created successfully", status_code=status.HTTP_201_CREATED)
        return self.error_response(message=str(serializer.errors))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(data=serializer.data, message="Item updated successfully")
        return self.error_response(message=str(serializer.errors))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return self.success_response(message="Item deleted successfully")


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
    Body: { "quantity": 10, "unit": "kg" }
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        company = _get_request_company(request)
        product = get_object_or_404(Package.objects.select_related("stock_item", "service"), id=product_id)
        
        serializer = VegetableRestockActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = vegetable_stock_service.add_stock(
                product=product,
                quantity=serializer.validated_data["quantity"],
                unit=serializer.validated_data["unit"],
                company=company,
                entered_by_user=request.user,
            )
            # Fetch updated admin status
            product.refresh_from_db()
            status_data = vegetable_stock_selectors.get_admin_stock_status(product)
            return Response({
                "success": True,
                "message": f"Successfully restocked {product.name}.",
                "data": status_data,
            })
        except Exception as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class VegetableStockAdjustView(APIView):
    """
    POST /api/inventory/vegetable-stock/<product_id>/adjust/
    Body: { "quantity": 5, "unit": "kg", "reason": "Physical count mismatch correction" }
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        company = _get_request_company(request)
        product = get_object_or_404(Package.objects.select_related("stock_item", "service"), id=product_id)
        
        serializer = VegetableAdjustActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = vegetable_stock_service.adjust_stock(
                product=product,
                quantity=serializer.validated_data["quantity"],
                unit=serializer.validated_data["unit"],
                reason=serializer.validated_data["reason"],
                company=company,
                entered_by_user=request.user,
            )
            product.refresh_from_db()
            status_data = vegetable_stock_selectors.get_admin_stock_status(product)
            return Response({
                "success": True,
                "message": f"Successfully adjusted stock for {product.name}.",
                "data": status_data,
            })
        except Exception as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class VegetableStockSetDefaultView(APIView):
    """
    POST /api/inventory/vegetable-stock/<product_id>/set-default/
    Body: { "quantity": 20, "unit": "kg", "apply_now": true }
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, product_id):
        company = _get_request_company(request)
        product = get_object_or_404(Package.objects.select_related("stock_item", "service"), id=product_id)
        
        serializer = VegetableSetDefaultActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            item = vegetable_stock_service.set_default_daily_quantity(
                product=product,
                quantity=serializer.validated_data.get("quantity"),
                unit=serializer.validated_data["unit"],
                company=company,
                entered_by_user=request.user,
                apply_now=serializer.validated_data.get("apply_now", False),
            )
            product.refresh_from_db()
            status_data = vegetable_stock_selectors.get_admin_stock_status(product)
            return Response({
                "success": True,
                "message": f"Successfully updated default daily stock for {product.name}.",
                "data": status_data,
            })
        except Exception as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


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
    Updates price, offer_price, offer_percentage, vegetable_gram, opening/default stock,
    current stock, reorder level, and restock level.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def patch(self, request, product_id):
        company = _get_request_company(request)
        product = get_object_or_404(Package.objects.select_related("stock_item", "service"), id=product_id)

        serializer = VegetableDetailsUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # 1. Update Package fields: price (selling price), offer_price (MRP), tag, vegetable_gram (duration)
        pkg_update_fields = []
        if "price" in data:
            product.base_price = data["price"]
            pkg_update_fields.append("base_price")

        selling_price = float(data.get("price", product.base_price) or 0)
        mrp_val = None

        if "mrp" in data and data["mrp"] is not None and float(data["mrp"]) > 0:
            mrp_val = float(data["mrp"])
        elif "offer_price" in data and data["offer_price"] is not None and float(data["offer_price"]) > 0:
            mrp_val = float(data["offer_price"])
        elif "offer_percentage" in data and data["offer_percentage"] is not None:
            pct = float(data["offer_percentage"])
            if pct > 0 and selling_price > 0 and pct < 100:
                mrp_val = round(selling_price / (1.0 - (pct / 100.0)), 2)

        if mrp_val and mrp_val > selling_price:
            product.offer_price = mrp_val
            pct = round(((mrp_val - selling_price) / mrp_val) * 100)
            product.tag = f"{pct}% OFF"
            pkg_update_fields.extend(["offer_price", "tag"])
        else:
            product.offer_price = None
            product.tag = ""
            pkg_update_fields.extend(["offer_price", "tag"])

        if "vegetable_gram" in data:
            product.duration = str(data["vegetable_gram"]).strip()
            pkg_update_fields.append("duration")

        if pkg_update_fields:
            product.save(update_fields=pkg_update_fields)

        # 2. Resolve / Create InventoryItem
        item = product.stock_item
        if not item:
            item = InventoryItem.objects.create(
                org=company,
                name=f"{product.name} (Produce)",
                category=InventoryItem.Category.CONSUMABLE,
                sku=f"VEG-{product.slug.upper()[:20]}",
                unit="g",
                stock_quantity_grams=None,
                default_daily_quantity_grams=None,
                total_quantity=0,
                available_quantity=0,
            )
            product.stock_item = item
            product.save(update_fields=["stock_item"])

        item_update_fields = []

        # Reorder Level (Threshold)
        if "reorder_level_quantity" in data and data["reorder_level_quantity"] is not None:
            r_grams = to_grams(data["reorder_level_quantity"], data.get("reorder_level_unit", "kg"), allow_zero=True)
            item.reorder_threshold = r_grams
            item_update_fields.append("reorder_threshold")

        # Restock Level
        if "restock_level_quantity" in data and data["restock_level_quantity"] is not None:
            rstk_grams = to_grams(data["restock_level_quantity"], data.get("restock_level_unit", "kg"), allow_zero=True)
            item.reorder_quantity = rstk_grams
            item.default_daily_quantity_grams = rstk_grams
            item_update_fields.extend(["reorder_quantity", "default_daily_quantity_grams"])

        # Opening Stock (Set default daily quantity)
        if "opening_stock_quantity" in data and data["opening_stock_quantity"] is not None:
            op_grams = to_grams(data["opening_stock_quantity"], data.get("opening_stock_unit", "kg"), allow_zero=True)
            item.default_daily_quantity_grams = op_grams
            if "default_daily_quantity_grams" not in item_update_fields:
                item_update_fields.append("default_daily_quantity_grams")

        # Current Live Stock
        if "current_stock_quantity" in data and data["current_stock_quantity"] is not None:
            curr_grams = to_grams(data["current_stock_quantity"], data.get("current_stock_unit", "kg"), allow_zero=True)
            old_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
            delta = curr_grams - old_stock
            item.stock_quantity_grams = curr_grams
            item_update_fields.append("stock_quantity_grams")
            StockMovement.objects.create(
                org=company,
                item=item,
                movement_type=StockMovement.MovementType.ADJUSTMENT,
                delta_grams=delta,
                balance_after_grams=curr_grams,
                reason="Updated from inventory table details",
                entered_by=request.user,
            )

        if item_update_fields:
            item.save(update_fields=list(set(item_update_fields)))

        product.refresh_from_db()
        status_data = vegetable_stock_selectors.get_admin_stock_status(product)
        return Response({
            "success": True,
            "message": f"Successfully updated {product.name} details.",
            "data": status_data,
        })


