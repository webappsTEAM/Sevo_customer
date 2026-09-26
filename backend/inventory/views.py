from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import transaction
from accounts.permissions import IsAdminRole, RequireModuleAccess
from common.drf import VisibilityQuerysetMixin
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer, StockMovement, Vegetable, VegetableStockMovement
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
from inventory.utils.unit_conversion import to_grams, to_base_units, unit_basis_for_unit, format_stock_for_display


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
    Only includes approved vegetables under approved categories.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        company = _get_request_company(request)
        # Select all packages under service_slug='vegetables' where both vegetable and category are approved
        qs = Package.objects.filter(
            service__slug="vegetables",
            stock_item__isnull=False,
            stock_item__status=ApprovalStatus.APPROVED,
            stock_item__category__status=ApprovalStatus.APPROVED,
        ).select_related("stock_item", "service", "service__category", "stock_item__category").order_by("sort_order", "name")

        packages = list(qs)
        bulk_status = vegetable_stock_selectors.get_bulk_admin_stock_status(packages)
        for pkg in packages:
            pkg._cached_admin_status = bulk_status.get(pkg.id)

        serializer = VegetableStockAdminListSerializer(packages, many=True)
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

    Updates vegetable live stock, pricing, packaging duration, reorder thresholds, and image details.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    @transaction.atomic
    def patch(self, request, product_id):
        product = get_object_or_404(Package.objects.select_related("stock_item"), id=product_id)
        item = getattr(product, "stock_item", None) or Vegetable.objects.filter(package=product).first()
        basis = item.unit_basis if item and item.unit_basis else "WEIGHT"
        serializer = VegetableDetailsUpdateSerializer(data=request.data, partial=True, context={"unit_basis": basis})
        if not serializer.is_valid():
            return Response({"success": False, "message": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        company = _get_request_company(request)

        if not item:
            item = getattr(product, "stock_item", None) or Vegetable.objects.filter(package=product).first()
            if item:
                product.stock_item = item
                product.save(update_fields=["stock_item"])

        if not item:
            item = Vegetable.objects.create(
                org=company,
                package=product,
                name=f"{product.name} (Produce)",
                sku=f"VEG-{product.slug.upper()[:20]}",
                unit="g" if basis == "WEIGHT" else "pcs",
                unit_basis=basis,
                stock_quantity_grams=None,
                default_daily_quantity_grams=None,
            )
            product.stock_item = item
            product.save(update_fields=["stock_item"])
        else:
            item = Vegetable.objects.select_for_update().get(id=item.id)

        # 1. Update Package visual & pricing metadata
        pkg_update_fields = []
        if "image" in validated_data:
            new_image = (validated_data["image"] or "").strip()
            item.image = new_image
            if product.image != new_image:
                product.image = new_image
                pkg_update_fields.append("image")

        if "price" in validated_data and validated_data["price"] is not None:
            product.base_price = validated_data["price"]
            pkg_update_fields.append("base_price")

        selling_price = float(validated_data.get("price", product.base_price) or 0)
        mrp_val = None
        if "mrp" in validated_data and validated_data["mrp"] is not None and float(validated_data["mrp"]) > 0:
            mrp_val = float(validated_data["mrp"])
        elif "offer_price" in validated_data and validated_data["offer_price"] is not None and float(validated_data["offer_price"]) > 0:
            mrp_val = float(validated_data["offer_price"])
        elif "offer_percentage" in validated_data and validated_data["offer_percentage"] is not None:
            pct = float(validated_data["offer_percentage"])
            if pct > 0 and selling_price > 0 and pct < 100:
                mrp_val = round(selling_price / (1.0 - (pct / 100.0)), 2)

        if mrp_val and mrp_val > selling_price:
            product.offer_price = mrp_val
            pct = round(((mrp_val - selling_price) / mrp_val) * 100)
            product.tag = f"{pct}% OFF"
            pkg_update_fields.extend(["offer_price", "tag"])
        elif "mrp" in validated_data or "offer_price" in validated_data or "offer_percentage" in validated_data:
            product.offer_price = None
            product.tag = ""
            pkg_update_fields.extend(["offer_price", "tag"])

        if "vegetable_gram" in validated_data and validated_data["vegetable_gram"]:
            v_gram = validated_data["vegetable_gram"].strip()
            if v_gram and product.duration != v_gram:
                product.duration = v_gram
                pkg_update_fields.append("duration")

        if pkg_update_fields:
            product.save(update_fields=list(set(pkg_update_fields)))

        # 2. Update Vegetable model stock, unit, and threshold fields
        item_update_fields = ["image"] if "image" in validated_data else []
        item_basis = item.unit_basis or basis

        # Live Stock Update
        if "current_stock_quantity" in validated_data and validated_data["current_stock_quantity"] is not None:
            stock_unit = validated_data.get("current_stock_unit") or item.unit or ("pcs" if item_basis == "COUNT" else "g")
            target_units = to_base_units(validated_data["current_stock_quantity"], stock_unit, allow_zero=True, unit_basis=item_basis)
            old_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
            delta = target_units - old_stock
            item.stock_quantity_grams = target_units
            item.unit = stock_unit
            item.unit_basis = unit_basis_for_unit(stock_unit)
            item_update_fields.extend(["stock_quantity_grams", "unit", "unit_basis"])

            VegetableStockMovement.objects.create(
                org=company,
                vegetable=item,
                movement_type=VegetableStockMovement.MovementType.ADJUSTMENT,
                unit_basis=item.unit_basis,
                unit_label=item.unit,
                delta_grams=delta,
                balance_after_grams=target_units,
                reason="Updated from inventory table details",
                entered_by=request.user,
            )

        # Reorder Threshold (Alert Level)
        if "reorder_level_quantity" in validated_data and validated_data["reorder_level_quantity"] is not None:
            r_unit = validated_data.get("reorder_level_unit") or item.unit or ("pcs" if item_basis == "COUNT" else "g")
            r_units = to_base_units(validated_data["reorder_level_quantity"], r_unit, allow_zero=True, unit_basis=item_basis)
            item.reorder_threshold = r_units
            item_update_fields.append("reorder_threshold")

        # Opening / Restock Default Daily Level
        if "opening_stock_quantity" in validated_data and validated_data["opening_stock_quantity"] is not None:
            op_unit = validated_data.get("opening_stock_unit") or item.unit or ("pcs" if item_basis == "COUNT" else "g")
            op_units = to_base_units(validated_data["opening_stock_quantity"], op_unit, allow_zero=True, unit_basis=item_basis)
            item.default_daily_quantity_grams = op_units
            item_update_fields.append("default_daily_quantity_grams")
        elif "restock_level_quantity" in validated_data and validated_data["restock_level_quantity"] is not None:
            rstk_unit = validated_data.get("restock_level_unit") or item.unit or ("pcs" if item_basis == "COUNT" else "g")
            rstk_units = to_base_units(validated_data["restock_level_quantity"], rstk_unit, allow_zero=True, unit_basis=item_basis)
            item.default_daily_quantity_grams = rstk_units
            item_update_fields.append("default_daily_quantity_grams")

        if item_update_fields:
            item.save(update_fields=list(set(item_update_fields)))

        # Invalidate catalog cache so customer storefront updates immediately
        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass

        product.refresh_from_db()
        status_data = vegetable_stock_selectors.get_admin_stock_status(product)
        return Response({
            "success": True,
            "data": {
                "product_id": product.id,
                "name": product.name,
                "image": item.image,
                **status_data,
            },
            "message": "Vegetable details updated successfully."
        })


# ── Vegetable Category & Catalog Upload Management ──────────────────────────
from inventory.models import VegetableCategory, Vegetable, ApprovalStatus, ItemSource, UnitOfMeasurement
from service_requests.models import Service, Package, PackageStatus
from inventory.serializers import (
    VegetableCategorySerializer,
    VegetableCategoryCreateUpdateSerializer,
    VegetableApprovalItemSerializer,
    ApprovalActionSerializer,
    SingleCatalogRequestSerializer,
)
from django.db.models import Q
from inventory.services import vegetable_catalog_service
from django.http import HttpResponse
from django.utils.text import slugify


class VegetableCategoryListCreateView(APIView):
    """
    GET /api/inventory/vegetable-categories/?status=APPROVED|PENDING|REJECTED|ALL&tree=true|false
    POST /api/inventory/vegetable-categories/
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        company = _get_request_company(request)
        status_param = request.GET.get("status", "APPROVED").upper()
        only_roots = request.GET.get("only_roots", "false").lower() == "true"

        qs = VegetableCategory.objects.all().select_related("parent").prefetch_related("vegetables", "subcategories__vegetables").order_by("sort_order", "name")
        if status_param != "ALL":
            qs = qs.filter(status=status_param, is_active=True)
        if only_roots:
            all_root_ids = list(VegetableCategory.objects.filter(parent__isnull=True, slug="all").values_list("id", flat=True)) + \
                           list(VegetableCategory.objects.filter(parent__isnull=True, name__iexact="all").values_list("id", flat=True))
            if all_root_ids:
                qs = qs.filter(Q(parent__isnull=True) | Q(parent_id__in=all_root_ids))
            else:
                qs = qs.filter(parent__isnull=True)

        serializer = VegetableCategorySerializer(qs, many=True)
        unit_choices = [{"value": c[0], "label": c[1]} for c in UnitOfMeasurement.choices]
        return Response({
            "success": True,
            "data": serializer.data,
            "count": len(serializer.data),
            "unit_choices": unit_choices,
        })

    def post(self, request):
        company = _get_request_company(request)
        data = request.data.copy()
        if not data.get("slug") and data.get("name"):
            data["slug"] = slugify(data["name"])
        
        # Ensure unique slug
        base_slug = data.get("slug") or "cat"
        slug = base_slug
        counter = 1
        while VegetableCategory.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        data["slug"] = slug

        # Direct admin creation from categories page is approved immediately with DIRECT source
        if "status" not in data:
            data["status"] = ApprovalStatus.APPROVED

        serializer = VegetableCategoryCreateUpdateSerializer(data=data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Invalid category data."}, status=status.HTTP_400_BAD_REQUEST)

        category = serializer.save(
            org=company,
            source=ItemSource.DIRECT,
            requested_by=request.user,
            reviewed_by=request.user if data.get("status") == ApprovalStatus.APPROVED else None,
            reviewed_at=timezone.now() if data.get("status") == ApprovalStatus.APPROVED else None,
        )
        return Response({
            "success": True,
            "data": VegetableCategorySerializer(category).data,
            "message": f"Category '{category.name}' created successfully."
        }, status=status.HTTP_201_CREATED)


class VegetableCategoryDetailView(APIView):
    """
    GET /api/inventory/vegetable-categories/<id>/
    PUT / PATCH /api/inventory/vegetable-categories/<id>/
    DELETE /api/inventory/vegetable-categories/<id>/
    """
    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        category = get_object_or_404(VegetableCategory.objects.prefetch_related("vegetables"), pk=pk)
        return Response({"success": True, "data": VegetableCategorySerializer(category).data})

    def patch(self, request, pk):
        category = get_object_or_404(VegetableCategory, pk=pk)
        serializer = VegetableCategoryCreateUpdateSerializer(category, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Validation failed."}, status=status.HTTP_400_BAD_REQUEST)
        category = serializer.save()
        return Response({
            "success": True,
            "data": VegetableCategorySerializer(category).data,
            "message": f"Category '{category.name}' updated successfully."
        })

    def put(self, request, pk):
        return self.patch(request, pk)

    def delete(self, request, pk):
        category = get_object_or_404(VegetableCategory, pk=pk)
        cat_name = category.name
        category.vegetables.update(category=None)
        category.delete()
        return Response({"success": True, "message": f"Category '{cat_name}' deleted successfully."})


class VegetableCategoryApprovalListView(APIView):
    """
    GET /api/inventory/vegetable-categories/approval-queue/?status=PENDING|APPROVED|REJECTED|ALL
    Only returns categories that originated as vendor requests (source=REQUEST).
    Supports ?my_requests=true to filter by currently logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_param = request.GET.get("status", "ALL").upper()
        my_requests = request.GET.get("my_requests", "false").lower() == "true"

        qs = VegetableCategory.objects.filter(source=ItemSource.REQUEST).prefetch_related("vegetables", "vegetables__package").order_by("-requested_at", "name")
        if my_requests and request.user.is_authenticated:
            qs = qs.filter(requested_by=request.user)
        if status_param != "ALL":
            qs = qs.filter(status=status_param)

        serializer = VegetableCategorySerializer(qs, many=True)
        return Response({"success": True, "data": serializer.data, "count": len(serializer.data)})


from django.core.cache import cache


def _clear_catalog_cache():
    try:
        cache.delete_pattern("*catalog_services_list*")
    except Exception:
        pass
    for st in ["ACTIVE", "INACTIVE", "DRAFT", ""]:
        cache.delete(f"catalog_services_list__vegetables_{st}")
        cache.delete(f"catalog_services_list____{st}")


import logging

logger = logging.getLogger(__name__)


class VegetableCategoryApprovalActionView(APIView):
    """
    POST /api/inventory/vegetable-categories/<pk>/review/
    Payload: { "action": "APPROVE" | "REJECT", "rejection_reason": "..." }
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        category = get_object_or_404(VegetableCategory, pk=pk)
        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Invalid decision payload."}, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data["action"]
        rejection_reason = serializer.validated_data.get("rejection_reason", "").strip()

        try:
            if action == "APPROVE":
                category.status = ApprovalStatus.APPROVED
                category.is_active = True
                category.rejection_reason = ""
                category.reviewed_by = request.user
                category.reviewed_at = timezone.now()
                category.save()

                # Approve all bundled vegetables belonging to this category
                category.vegetables.all().update(
                    status=ApprovalStatus.APPROVED,
                    reviewed_by=request.user,
                    reviewed_at=timezone.now(),
                    rejection_reason=""
                )
                # Activate associated packages
                Package.objects.filter(stock_item__category=category).update(status=PackageStatus.ACTIVE)

                msg = f"Category '{category.name}' and all bundled vegetables have been approved."
            else:
                category.status = ApprovalStatus.REJECTED
                category.rejection_reason = rejection_reason
                category.reviewed_by = request.user
                category.reviewed_at = timezone.now()
                category.save()

                # Reject pending bundled vegetables
                category.vegetables.filter(status=ApprovalStatus.PENDING).update(
                    status=ApprovalStatus.REJECTED,
                    rejection_reason=rejection_reason,
                    reviewed_by=request.user,
                    reviewed_at=timezone.now()
                )
                Package.objects.filter(stock_item__category=category).update(status=PackageStatus.DRAFT)

                msg = f"Category '{category.name}' rejected. Rejection reason recorded."

            _clear_catalog_cache()

            return Response({
                "success": True,
                "data": VegetableCategorySerializer(category).data,
                "message": msg
            })
        except Exception as e:
            logger.exception("Error reviewing VegetableCategory ID %s: %s", pk, e)
            return Response({
                "success": False,
                "message": f"Failed to submit decision: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class VegetableApprovalListView(APIView):
    """
    GET /api/inventory/vegetables/approval-queue/?status=PENDING|APPROVED|REJECTED|ALL
    Returns vegetable produce items and variant requests that originated from vendors.
    Supports ?my_requests=true to filter by currently logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from service_requests.models import PackageVariant
        from inventory.serializers import VegetableVariantApprovalItemSerializer

        status_param = request.GET.get("status", "ALL").upper()
        my_requests = request.GET.get("my_requests", "false").lower() == "true"

        # 1. Base Produce Requests
        veg_qs = Vegetable.objects.filter(source=ItemSource.REQUEST).select_related("category", "package", "requested_by", "reviewed_by").order_by("-requested_at", "name")
        if my_requests and request.user.is_authenticated:
            veg_qs = veg_qs.filter(requested_by=request.user)
        if status_param != "ALL":
            veg_qs = veg_qs.filter(status=status_param)

        # 2. Add-on Variant Requests (is_default=False, source=REQUEST)
        var_qs = PackageVariant.objects.filter(source=ItemSource.REQUEST, is_default=False).select_related(
            "package", "vegetable", "vegetable__category", "requested_by", "reviewed_by"
        ).order_by("-requested_at", "-id")
        if my_requests and request.user.is_authenticated:
            var_qs = var_qs.filter(requested_by=request.user)
        if status_param != "ALL":
            var_qs = var_qs.filter(status=status_param)

        veg_data = VegetableApprovalItemSerializer(veg_qs, many=True).data
        for v in veg_data:
            v["item_type"] = "VEGETABLE"

        var_data = VegetableVariantApprovalItemSerializer(var_qs, many=True).data
        for v in var_data:
            v["item_type"] = "VARIANT"

        combined = sorted(
            veg_data + var_data,
            key=lambda x: str(x.get("requested_at") or ""),
            reverse=True
        )

        return Response({
            "success": True,
            "data": combined,
            "products": veg_data,
            "variants": var_data,
            "count": len(combined)
        })


class VegetableMyRequestsListView(APIView):
    """
    GET /api/inventory/vegetables/my-requests/?status=PENDING|APPROVED|REJECTED|ALL
    Returns all product requests, variant requests, and category requests submitted by the logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from service_requests.models import PackageVariant
        from inventory.serializers import VegetableVariantApprovalItemSerializer

        status_param = request.GET.get("status", "ALL").upper()

        veg_base_qs = Vegetable.objects.filter(
            requested_by=request.user,
            source=ItemSource.REQUEST,
        )
        cat_base_qs = VegetableCategory.objects.filter(
            requested_by=request.user,
            source=ItemSource.REQUEST,
        )
        var_base_qs = PackageVariant.objects.filter(
            requested_by=request.user,
            source=ItemSource.REQUEST,
            is_default=False,
        )

        counts = {
            "all": veg_base_qs.count() + cat_base_qs.count() + var_base_qs.count(),
            "pending": veg_base_qs.filter(status=ApprovalStatus.PENDING).count() + cat_base_qs.filter(status=ApprovalStatus.PENDING).count() + var_base_qs.filter(status=ApprovalStatus.PENDING).count(),
            "approved": veg_base_qs.filter(status=ApprovalStatus.APPROVED).count() + cat_base_qs.filter(status=ApprovalStatus.APPROVED).count() + var_base_qs.filter(status=ApprovalStatus.APPROVED).count(),
            "rejected": veg_base_qs.filter(status=ApprovalStatus.REJECTED).count() + cat_base_qs.filter(status=ApprovalStatus.REJECTED).count() + var_base_qs.filter(status=ApprovalStatus.REJECTED).count(),
        }

        veg_qs = veg_base_qs.select_related("category", "package", "requested_by", "reviewed_by").order_by("-requested_at", "-id")
        cat_qs = cat_base_qs.select_related("parent", "requested_by", "reviewed_by").prefetch_related("vegetables", "vegetables__package").order_by("-requested_at", "-id")
        var_qs = var_base_qs.select_related("package", "vegetable", "vegetable__category", "requested_by", "reviewed_by").order_by("-requested_at", "-id")

        if status_param != "ALL":
            veg_qs = veg_qs.filter(status=status_param)
            cat_qs = cat_qs.filter(status=status_param)
            var_qs = var_qs.filter(status=status_param)

        veg_data = VegetableApprovalItemSerializer(veg_qs, many=True).data
        cat_data = VegetableCategorySerializer(cat_qs, many=True).data
        var_data = VegetableVariantApprovalItemSerializer(var_qs, many=True).data

        return Response({
            "success": True,
            "data": {
                "products": veg_data,
                "categories": cat_data,
                "variants": var_data,
            },
            "counts": counts,
        })


class VegetableApprovalActionView(APIView):
    """
    POST /api/inventory/vegetables/<pk>/review/
    Payload: { "action": "APPROVE" | "REJECT", "rejection_reason": "..." }
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        veg = get_object_or_404(Vegetable.objects.select_related("package", "category"), pk=pk)
        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Invalid decision payload."}, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data["action"]
        rejection_reason = serializer.validated_data.get("rejection_reason", "").strip()

        try:
            if action == "APPROVE":
                if veg.category and not veg.category.is_leaf:
                    return Response({
                        "success": False,
                        "message": f"Cannot approve vegetable '{veg.name}' because category '{veg.category.name}' has subcategories. Produce can only be assigned to leaf categories."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Auto-approve bundled pending category if applicable
                if veg.category and veg.category.status == ApprovalStatus.PENDING:
                    veg.category.status = ApprovalStatus.APPROVED
                    veg.category.is_active = True
                    veg.category.rejection_reason = ""
                    veg.category.reviewed_by = request.user
                    veg.category.reviewed_at = timezone.now()
                    veg.category.save()

                veg.status = ApprovalStatus.APPROVED
                veg.rejection_reason = ""
                veg.reviewed_by = request.user
                veg.reviewed_at = timezone.now()
                veg.save()

                if veg.package:
                    veg.package.status = PackageStatus.ACTIVE
                    veg.package.save(update_fields=["status"])
                    veg.package.variants.filter(status=ApprovalStatus.PENDING).update(
                        status=ApprovalStatus.APPROVED,
                        is_active=True,
                        reviewed_by=request.user,
                        reviewed_at=timezone.now(),
                    )

                msg = f"Vegetable '{veg.name}' has been approved and activated."
                if veg.category and veg.category.status == ApprovalStatus.APPROVED:
                    msg = f"Vegetable '{veg.name}' and category '{veg.category.name}' have been approved and activated."
            else:
                # Auto-reject bundled pending category if applicable
                if veg.category and veg.category.status == ApprovalStatus.PENDING:
                    if not veg.category.vegetables.filter(status=ApprovalStatus.APPROVED).exclude(id=veg.id).exists():
                        veg.category.status = ApprovalStatus.REJECTED
                        veg.category.rejection_reason = rejection_reason
                        veg.category.reviewed_by = request.user
                        veg.category.reviewed_at = timezone.now()
                        veg.category.save()

                veg.status = ApprovalStatus.REJECTED
                veg.rejection_reason = rejection_reason
                veg.reviewed_by = request.user
                veg.reviewed_at = timezone.now()
                veg.save()

                if veg.package:
                    veg.package.status = PackageStatus.DRAFT
                    veg.package.save(update_fields=["status"])
                    veg.package.variants.filter(status=ApprovalStatus.PENDING).update(
                        status=ApprovalStatus.REJECTED,
                        is_active=False,
                        rejection_reason=rejection_reason,
                        reviewed_by=request.user,
                        reviewed_at=timezone.now(),
                    )

                msg = f"Vegetable '{veg.name}' rejected. Rejection reason recorded."

            _clear_catalog_cache()

            return Response({
                "success": True,
                "data": VegetableApprovalItemSerializer(veg).data,
                "message": msg
            })
        except Exception as e:
            logger.exception("Error reviewing Vegetable ID %s: %s", pk, e)
            return Response({
                "success": False,
                "message": f"Failed to submit decision: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class VegetableVariantApprovalActionView(APIView):
    """
    POST /api/inventory/vegetables/variants/<pk>/review/
    Payload: { "action": "APPROVE" | "REJECT", "rejection_reason": "..." }
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        from service_requests.models import PackageVariant
        from inventory.serializers import VegetableVariantApprovalItemSerializer
        var_obj = get_object_or_404(PackageVariant.objects.select_related("package", "vegetable", "vegetable__category"), pk=pk)
        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Invalid decision payload."}, status=status.HTTP_400_BAD_REQUEST)

        action = serializer.validated_data["action"]
        rejection_reason = serializer.validated_data.get("rejection_reason", "").strip()

        try:
            if action == "APPROVE":
                var_obj.status = ApprovalStatus.APPROVED
                var_obj.is_active = True
                var_obj.rejection_reason = ""
                var_obj.reviewed_by = request.user
                var_obj.reviewed_at = timezone.now()
                var_obj.save()
                veg_title = var_obj.vegetable.name if var_obj.vegetable else var_obj.package.name
                msg = f"Variant '{var_obj.display_name}' for '{veg_title}' has been approved."
            else:
                var_obj.status = ApprovalStatus.REJECTED
                var_obj.is_active = False
                var_obj.rejection_reason = rejection_reason
                var_obj.reviewed_by = request.user
                var_obj.reviewed_at = timezone.now()
                var_obj.save()
                msg = f"Variant '{var_obj.display_name}' rejected. Rejection reason recorded."

            _clear_catalog_cache()

            return Response({
                "success": True,
                "data": VegetableVariantApprovalItemSerializer(var_obj).data,
                "message": msg
            })
        except Exception as e:
            logger.exception("Error reviewing PackageVariant ID %s: %s", pk, e)
            return Response({
                "success": False,
                "message": f"Failed to submit decision: {str(e)}"
            }, status=status.HTTP_400_BAD_REQUEST)


class VegetableSingleRequestView(APIView):
    """
    POST /api/inventory/vegetables/single-request/
    Handles single request submission (category, vegetable, or category_with_vegetable)
    and resubmission of previously rejected records.
    """
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        company = _get_request_company(request)
        serializer = SingleCatalogRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors, "message": "Invalid request data."}, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data
        resubmit_id = d.get("resubmit_id")
        resubmit_type = d.get("resubmit_type")
        from service_requests.models import PackageVariant
        from inventory.serializers import VegetableVariantApprovalItemSerializer

        # ── RESUBMISSION WORKFLOW ──
        if resubmit_id and resubmit_type:
            if resubmit_type == "category":
                cat = get_object_or_404(VegetableCategory, id=resubmit_id)
                if d.get("category_name"):
                    cat.name = d["category_name"]
                if d.get("category_description"):
                    cat.description = d["category_description"]
                if d.get("category_image"):
                    cat.image = d["category_image"]
                cat.status = ApprovalStatus.PENDING
                cat.rejection_reason = ""
                cat.is_resubmission = True
                cat.requested_at = timezone.now()
                cat.save()

                return Response({
                    "success": True,
                    "data": VegetableCategorySerializer(cat).data,
                    "message": f"Category '{cat.name}' resubmitted for approval."
                })

            elif resubmit_type == "vegetable":
                veg = get_object_or_404(Vegetable.objects.select_related("package", "category"), id=resubmit_id)
                vname = d.get("vegetable_name") or veg.name
                veg.name = vname if "(Produce)" in vname else f"{vname} (Produce)"
                if d.get("vegetable_sku"):
                    veg.sku = d["vegetable_sku"]
                if d.get("image_url"):
                    veg.image = d["image_url"]
                if d.get("category_id"):
                    veg.category_id = d["category_id"]
                if d.get("vegetable_unit"):
                    veg.unit = d["vegetable_unit"]

                veg.status = ApprovalStatus.PENDING
                veg.rejection_reason = ""
                veg.is_resubmission = True
                veg.requested_at = timezone.now()
                veg.save()

                if veg.package:
                    pkg = veg.package
                    if d.get("vegetable_name"):
                        pkg.name = d["vegetable_name"]
                    if d.get("image_url"):
                        pkg.image = d["image_url"]
                    if d.get("description"):
                        pkg.description = d["description"]
                    if d.get("tag"):
                        pkg.tag = d["tag"]
                    if d.get("price") is not None:
                        pkg.base_price = d["price"]
                    if d.get("mrp") is not None:
                        pkg.offer_price = d["mrp"]

                    resub_unit = d.get("vegetable_unit") or veg.unit or "kg"
                    resub_pack = str(d.get("pack_size") or d.get("pack_value") or "").strip()
                    if resub_pack:
                        if not any(resub_pack.endswith(u) for u in [resub_unit, f" {resub_unit}"]):
                            pkg.duration = f"{resub_pack} {resub_unit}".strip()
                        else:
                            pkg.duration = resub_pack
                    pkg.status = PackageStatus.DRAFT
                    pkg.save()

                return Response({
                    "success": True,
                    "data": VegetableApprovalItemSerializer(veg).data,
                    "message": f"Vegetable '{veg.name}' resubmitted for approval."
                })

            elif resubmit_type == "variant":
                var_obj = get_object_or_404(PackageVariant.objects.select_related("package", "vegetable"), id=resubmit_id)
                if d.get("price") is not None:
                    var_obj.base_price = d["price"]
                if d.get("mrp") is not None:
                    var_obj.mrp = d["mrp"]
                if d.get("pack_value"):
                    try:
                        var_obj.pack_value = Decimal(str(d["pack_value"]))
                    except Exception:
                        pass
                if d.get("vegetable_unit"):
                    var_obj.unit = d["vegetable_unit"]
                if d.get("vegetable_sku"):
                    var_obj.sku = d["vegetable_sku"]
                var_obj.name = f"{var_obj.pack_value:g} {var_obj.unit}".strip()
                var_obj.status = ApprovalStatus.PENDING
                var_obj.rejection_reason = ""
                var_obj.is_resubmission = True
                var_obj.requested_at = timezone.now()
                var_obj.save()

                return Response({
                    "success": True,
                    "data": VegetableVariantApprovalItemSerializer(var_obj).data,
                    "message": f"Variant '{var_obj.display_name}' resubmitted for approval."
                })

        # ── FRESH VARIANT REQUEST (ENTRY POINT B) ──
        req_type = d.get("request_type", "vegetable")
        if req_type == "variant":
            target_veg_id = d.get("target_vegetable_id") or d.get("category_id")
            if not target_veg_id:
                return Response({"success": False, "message": "Target product is required for variant submission."}, status=status.HTTP_400_BAD_REQUEST)
            target_veg = get_object_or_404(Vegetable.objects.select_related("package", "category"), id=target_veg_id)
            target_pkg = target_veg.package or getattr(target_veg, "vegetable_stock", None) or Package.objects.filter(stock_item=target_veg).first()
            if not target_pkg:
                return Response({"success": False, "message": "Target product does not have a linked catalog package."}, status=status.HTTP_400_BAD_REQUEST)

            variants_payload = d.get("variants") or []
            if isinstance(variants_payload, list) and len(variants_payload) > 0:
                created_variants = []
                for idx, vdata in enumerate(variants_payload):
                    try:
                        val = Decimal(str(vdata.get("pack_value") or "1"))
                    except Exception:
                        val = Decimal("1.00")
                    u = vdata.get("unit") or target_veg.unit or "kg"
                    vbasis = vdata.get("unit_basis") or target_veg.unit_basis or "WEIGHT"
                    vname = vdata.get("name") or vdata.get("variant_name") or f"{val:g} {u}".strip()
                    try:
                        vprice = Decimal(str(vdata.get("price") or "0.00"))
                    except Exception:
                        vprice = Decimal("0.00")
                    vmrp = Decimal(str(vdata["mrp"])) if vdata.get("mrp") else None
                    vsku = vdata.get("sku") or vdata.get("vegetable_sku") or f"{target_veg.sku}-{val:g}{u}"

                    cv = PackageVariant.objects.create(
                        package=target_pkg,
                        vegetable=target_veg,
                        name=vname,
                        pack_value=val,
                        unit=u,
                        unit_basis=vbasis,
                        base_price=vprice,
                        mrp=vmrp,
                        sku=vsku,
                        is_default=False,
                        is_active=False,
                        status=ApprovalStatus.PENDING,
                        source=ItemSource.REQUEST,
                        requested_by=request.user,
                    )
                    created_variants.append(cv)

                count_str = f"{len(created_variants)} variant(s)"
                return Response({
                    "success": True,
                    "variants": VegetableVariantApprovalItemSerializer(created_variants, many=True).data,
                    "message": f"{count_str} for '{target_veg.name}' submitted successfully and pending admin approval."
                }, status=status.HTTP_201_CREATED)
            else:
                try:
                    val = Decimal(str(d.get("pack_value") or "1"))
                except Exception:
                    val = Decimal("1.00")

                u = d.get("unit") or d.get("vegetable_unit") or target_veg.unit or "kg"
                vbasis = d.get("unit_basis") or target_veg.unit_basis or "WEIGHT"
                vname = d.get("variant_name") or f"{val:g} {u}".strip()
                vprice = d.get("price") or Decimal("0.00")
                vmrp = d.get("mrp")
                vsku = d.get("sku") or d.get("vegetable_sku") or f"{target_veg.sku}-{val:g}{u}"

                created_variant = PackageVariant.objects.create(
                    package=target_pkg,
                    vegetable=target_veg,
                    name=vname,
                    pack_value=val,
                    unit=u,
                    unit_basis=vbasis,
                    base_price=vprice,
                    mrp=vmrp,
                    sku=vsku,
                    is_default=False,
                    is_active=False,
                    status=ApprovalStatus.PENDING,
                    source=ItemSource.REQUEST,
                    requested_by=request.user,
                )

                return Response({
                    "success": True,
                    "variant": VegetableVariantApprovalItemSerializer(created_variant).data,
                    "message": f"Variant request for {val:g} {u} ({target_veg.name}) submitted successfully and is pending admin approval."
                }, status=status.HTTP_201_CREATED)

        # ── FRESH REQUEST WORKFLOW ──
        created_cat = None
        created_veg = None

        # 1. Category Creation
        if req_type in ["category", "category_with_vegetable"] and d.get("category_name"):
            cat_name = d["category_name"].strip()
            cat_slug = slugify(d.get("category_slug") or cat_name)
            base_slug = cat_slug or "cat"
            slug = base_slug
            counter = 1
            while VegetableCategory.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1

            parent_cat = None
            if d.get("parent_id"):
                parent_cat = VegetableCategory.objects.filter(id=d["parent_id"]).first()

            created_cat = VegetableCategory.objects.create(
                org=company,
                parent=parent_cat,
                name=cat_name,
                slug=slug,
                description=d.get("category_description", ""),
                image=d.get("category_image", ""),
                status=ApprovalStatus.PENDING,
                source=ItemSource.REQUEST,
                requested_by=request.user,
            )
        elif d.get("category_id"):
            created_cat = VegetableCategory.objects.filter(id=d["category_id"]).first()

        # Enforce that vegetables can only be assigned to leaf categories (categories without subcategories)
        if created_cat and created_cat.subcategories.exists():
            return Response({
                "success": False,
                "message": f"Category '{created_cat.name}' has subcategories. Vegetables must be assigned directly to leaf subcategories."
            }, status=status.HTTP_400_BAD_REQUEST)

        # 2. Vegetable Creation
        if (req_type in ["vegetable", "category_with_vegetable"] or d.get("vegetable_name")) and d.get("vegetable_name"):
            vname = d["vegetable_name"].strip()
            veg_service = Service.objects.filter(slug="vegetables").first()
            if not veg_service:
                from service_requests.models import CatalogCategory
                cat = CatalogCategory.objects.first()
                veg_service = Service.objects.create(
                    category=cat,
                    name="Farm-Fresh Vegetable",
                    slug="vegetables",
                    is_active=True,
                )

            pkg_slug = slugify(vname)
            base_pslug = pkg_slug
            pcounter = 1
            while Package.objects.filter(slug=pkg_slug).exists():
                pkg_slug = f"{base_pslug}-{pcounter}"
                pcounter += 1

            image_url = (d.get("image_url") or "").strip()
            veg_unit = d.get("vegetable_unit") or "kg"

            raw_pack = str(d.get("pack_size") or d.get("pack_value") or "").strip()
            if raw_pack:
                if not any(raw_pack.endswith(u) for u in [veg_unit, f" {veg_unit}"]):
                    duration_str = f"{raw_pack} {veg_unit}".strip()
                else:
                    duration_str = raw_pack
            else:
                duration_str = f"1 {veg_unit}".strip()

            proposed_price = d.get("price") or Decimal("0.00")
            proposed_mrp = d.get("mrp")

            # Package initialized with draft status and vendor proposed price/pack-size
            pkg = Package.objects.create(
                service=veg_service,
                name=vname,
                slug=pkg_slug,
                base_price=proposed_price,
                offer_price=proposed_mrp,
                duration=duration_str,
                image=image_url,
                tag=d.get("tag", "Fresh"),
                description=d.get("description", ""),
                status=PackageStatus.DRAFT,
            )

            # Vegetable stock starts empty (None), ready to be set in Inventory screen
            created_veg = Vegetable.objects.create(
                org=company,
                package=pkg,
                category=created_cat,
                name=f"{vname} (Produce)",
                sku=d.get("vegetable_sku") or f"VEG-{pkg_slug.upper()[:20]}",
                unit=veg_unit,
                stock_quantity_grams=None,
                default_daily_quantity_grams=None,
                image=image_url,
                status=ApprovalStatus.PENDING,
                source=ItemSource.REQUEST,
                requested_by=request.user,
            )
            pkg.stock_item = created_veg
            pkg.save(update_fields=["stock_item"])

            # 3. Create PackageVariants (Entry Point A - Multi-variant repeater support)
            variants_list = d.get("variants") or []
            if isinstance(variants_list, list) and len(variants_list) > 0:
                first = True
                for idx, vdata in enumerate(variants_list):
                    try:
                        v_val = Decimal(str(vdata.get("pack_value") or "1"))
                    except Exception:
                        v_val = Decimal("1.00")
                    v_unit = str(vdata.get("unit") or veg_unit)
                    try:
                        v_price = Decimal(str(vdata.get("price") or proposed_price))
                    except Exception:
                        v_price = proposed_price
                    v_mrp = Decimal(str(vdata["mrp"])) if vdata.get("mrp") else proposed_mrp
                    v_sku = str(vdata.get("sku") or f"{created_veg.sku}-{v_val:g}{v_unit}")
                    is_def = bool(vdata.get("is_default", False)) or (first and not any(v.get("is_default") for v in variants_list))
                    first = False

                    PackageVariant.objects.create(
                        package=pkg,
                        vegetable=created_veg,
                        name=f"{v_val:g} {v_unit}".strip(),
                        pack_value=v_val,
                        unit=v_unit,
                        base_price=v_price,
                        mrp=v_mrp,
                        sku=v_sku,
                        is_default=is_def,
                        is_active=True,
                        sort_order=idx,
                        status=ApprovalStatus.PENDING,
                        source=ItemSource.REQUEST,
                        requested_by=request.user,
                    )
            else:
                # Default single variant
                try:
                    val = Decimal(str(d.get("pack_value") or "1"))
                except Exception:
                    val = Decimal("1.00")
                PackageVariant.objects.create(
                    package=pkg,
                    vegetable=created_veg,
                    name=duration_str,
                    pack_value=val,
                    unit=veg_unit,
                    base_price=proposed_price,
                    mrp=proposed_mrp,
                    sku=created_veg.sku,
                    is_default=True,
                    is_active=True,
                    sort_order=0,
                    status=ApprovalStatus.PENDING,
                    source=ItemSource.REQUEST,
                    requested_by=request.user,
                )

        return Response({
            "success": True,
            "category": VegetableCategorySerializer(created_cat).data if created_cat else None,
            "vegetable": VegetableApprovalItemSerializer(created_veg).data if created_veg else None,
            "message": "Request submitted successfully and is pending admin approval."
        }, status=status.HTTP_201_CREATED)


class VegetableCatalogTemplateView(APIView):
    """
    GET /api/inventory/vegetables/catalog-template/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        csv_content = vegetable_catalog_service.generate_catalog_template_csv()
        response = HttpResponse(csv_content, content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="vegetables_catalog_template.csv"'
        return response


class VegetableCatalogPreviewView(APIView):
    """
    POST /api/inventory/vegetables/catalog-preview/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _get_request_company(request)
        uploaded_file = request.FILES.get("file")
        rows = []
        if uploaded_file:
            rows = vegetable_catalog_service.parse_csv_or_excel_content(uploaded_file, uploaded_file.name)
        elif "rows" in request.data:
            rows = request.data.get("rows", [])
        else:
            return Response({"success": False, "message": "No file or rows provided."}, status=status.HTTP_400_BAD_REQUEST)

        if not rows:
            return Response({"success": False, "message": "The file contains no data rows."}, status=status.HTTP_400_BAD_REQUEST)

        preview_result = vegetable_catalog_service.preview_catalog_upload(rows, company=company)
        return Response(preview_result)


class VegetableCatalogCommitView(APIView):
    """
    POST /api/inventory/vegetables/catalog-commit/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        company = _get_request_company(request)
        rows = request.data.get("rows", [])
        if not rows:
            uploaded_file = request.FILES.get("file")
            if uploaded_file:
                parsed = vegetable_catalog_service.parse_csv_or_excel_content(uploaded_file, uploaded_file.name)
                preview = vegetable_catalog_service.preview_catalog_upload(parsed, company=company)
                rows = preview.get("rows", [])

        if not rows:
            return Response({"success": False, "message": "No valid rows to commit."}, status=status.HTTP_400_BAD_REQUEST)

        commit_result = vegetable_catalog_service.commit_catalog_upload(rows, company=company, user=request.user)
        return Response(commit_result)


# ── Vegetable Claims Management ─────────────────────────────────────────────
from inventory.models import VegetableClaim, VegetableStockMovement, Vegetable
from inventory.serializers import (
    VegetableClaimListSerializer,
    VegetableClaimDetailSerializer,
    VegetableClaimCreateSerializer,
    VegetableClaimActionSerializer,
)
from inventory.utils.unit_conversion import to_grams
from django.db import transaction


class VegetableClaimListCreateView(APIView):
    """
    GET /api/inventory/vegetables/claims/
    POST /api/inventory/vegetables/claims/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        company = _get_request_company(request)
        qs = VegetableClaim.objects.all().select_related("vegetable__package", "created_by", "approved_by", "stock_movement").order_by("-created_at")

        status_counts = {
            "ALL": VegetableClaim.objects.count(),
            "OPEN": VegetableClaim.objects.filter(status=VegetableClaim.Status.OPEN).count(),
            "APPROVED": VegetableClaim.objects.filter(status=VegetableClaim.Status.APPROVED).count(),
            "RESOLVED": VegetableClaim.objects.filter(status=VegetableClaim.Status.RESOLVED).count(),
            "REJECTED": VegetableClaim.objects.filter(status=VegetableClaim.Status.REJECTED).count(),
        }

        status_param = request.GET.get("status", "").strip().upper()
        if status_param and status_param != "ALL":
            qs = qs.filter(status=status_param)

        reason_param = request.GET.get("reason", "").strip().upper()
        if reason_param and reason_param != "ALL":
            qs = qs.filter(reason=reason_param)

        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search)
                | Q(vegetable__name__icontains=search)
                | Q(vegetable__sku__icontains=search)
                | Q(notes__icontains=search)
            )

        data = VegetableClaimListSerializer(qs, many=True).data

        return Response({
            "success": True,
            "status_counts": status_counts,
            "total_count": len(data),
            "data": data,
        })

    def post(self, request):
        company = _get_request_company(request)
        serializer = VegetableClaimCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid claim data.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        veg_id = serializer.validated_data["vegetable_id"]
        vegetable = get_object_or_404(Vegetable, pk=veg_id)

        quantity = serializer.validated_data["quantity"]
        unit = serializer.validated_data.get("unit", vegetable.unit or "kg")
        unit_basis = unit_basis_for_unit(unit)
        if vegetable.unit_basis and unit_basis != vegetable.unit_basis:
            return Response(
                {"success": False, "message": f"Unit '{unit}' ({unit_basis}) is not compatible with vegetable '{vegetable.name}' ({vegetable.unit_basis})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            quantity_units = to_base_units(quantity, unit, unit_basis=unit_basis)
        except ValueError as e:
            return Response(
                {"success": False, "message": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason = serializer.validated_data["reason"]
        estimated_loss_amount = serializer.validated_data.get("estimated_loss_amount", 0)
        notes = serializer.validated_data.get("notes", "")

        claim = VegetableClaim.objects.create(
            org=company,
            vegetable=vegetable,
            reason=reason,
            quantity_grams=quantity_units,
            estimated_loss_amount=estimated_loss_amount,
            notes=notes,
            status=VegetableClaim.Status.OPEN,
            created_by=request.user,
        )

        return Response(
            {
                "success": True,
                "message": f"Claim #{claim.claim_number} created successfully.",
                "data": VegetableClaimDetailSerializer(claim).data,
            },
            status=status.HTTP_201_CREATED,
        )


class VegetableClaimDetailView(APIView):
    """
    GET /api/inventory/vegetables/claims/<pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        claim = get_object_or_404(
            VegetableClaim.objects.select_related("vegetable__package", "created_by", "approved_by", "stock_movement"),
            pk=pk,
        )
        return Response({
            "success": True,
            "data": VegetableClaimDetailSerializer(claim).data,
        })


class VegetableClaimActionView(APIView):
    """
    POST /api/inventory/vegetables/claims/<pk>/action/
    Admin actions: APPROVE, REJECT, RESOLVE.
    Approving a claim automatically writes off stock and creates a VegetableStockMovement ledger record.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        claim = get_object_or_404(
            VegetableClaim.objects.select_related("vegetable", "org"),
            pk=pk,
        )

        serializer = VegetableClaimActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid action data.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        action_type = serializer.validated_data["action"].upper()
        notes = serializer.validated_data.get("notes", "").strip()

        if action_type == "APPROVE":
            if claim.status != VegetableClaim.Status.OPEN:
                return Response(
                    {"success": False, "message": f"Only OPEN claims can be approved. Current status: {claim.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                veg = claim.vegetable
                curr_stock = veg.stock_quantity_grams or 0
                balance_after = max(0, curr_stock - claim.quantity_grams)
                veg.stock_quantity_grams = balance_after
                veg.save(update_fields=["stock_quantity_grams"])

                reason_desc = f"Claim #{claim.claim_number} ({claim.get_reason_display()})"
                if claim.notes:
                    reason_desc += f": {claim.notes}"

                stock_mv = VegetableStockMovement.objects.create(
                    org=claim.org,
                    vegetable=veg,
                    movement_type=VegetableStockMovement.MovementType.CLAIM_WRITEOFF,
                    unit_basis=veg.unit_basis,
                    unit_label=veg.unit,
                    delta_grams=-claim.quantity_grams,
                    balance_after_grams=balance_after,
                    reason=reason_desc,
                    entered_by=request.user,
                )

                claim.status = VegetableClaim.Status.APPROVED
                claim.approved_by = request.user
                claim.stock_movement = stock_mv
                if notes:
                    claim.notes = f"{claim.notes}\nApproval note: {notes}".strip()
                claim.save()

            display_qty = format_stock_for_display(claim.quantity_grams, unit_basis=veg.unit_basis, unit=veg.unit)
            return Response({
                "success": True,
                "message": f"Claim #{claim.claim_number} approved and {display_qty} written off from stock.",
                "data": VegetableClaimDetailSerializer(claim).data,
            })

        elif action_type == "REJECT":
            if claim.status != VegetableClaim.Status.OPEN:
                return Response(
                    {"success": False, "message": f"Only OPEN claims can be rejected. Current status: {claim.status}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            claim.status = VegetableClaim.Status.REJECTED
            claim.approved_by = request.user
            claim.resolved_at = timezone.now()
            if notes:
                claim.notes = f"{claim.notes}\nRejection note: {notes}".strip()
            claim.save()

            return Response({
                "success": True,
                "message": f"Claim #{claim.claim_number} has been rejected.",
                "data": VegetableClaimDetailSerializer(claim).data,
            })

        elif action_type == "RESOLVE":
            if claim.status not in [VegetableClaim.Status.APPROVED, VegetableClaim.Status.OPEN]:
                return Response(
                    {"success": False, "message": f"Cannot resolve a claim in {claim.status} status."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            claim.status = VegetableClaim.Status.RESOLVED
            claim.resolved_at = timezone.now()
            if notes:
                claim.notes = f"{claim.notes}\nResolution note: {notes}".strip()
            claim.save()

            return Response({
                "success": True,
                "message": f"Claim #{claim.claim_number} resolved.",
                "data": VegetableClaimDetailSerializer(claim).data,
            })

        return Response(
            {"success": False, "message": f"Unknown action: {action_type}."},
            status=status.HTTP_400_BAD_REQUEST,
        )

