"""
backend/vegetable_orders/views.py

API Views for Vegetable Orders Administration, State Transitions, and Home Dashboard KPIs.
"""
from decimal import Decimal
from django.db.models import Q, Sum, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError

from accounts.permissions import IsAdminRole
from inventory.models import Vegetable, VegetableCategory
from inventory.utils.unit_conversion import format_grams_for_display
from service_requests.models import Package, PackageStatus
from .models import VegetableOrder, VegetableOrderItem, VegetableReturn
from .serializers import (
    VegetableOrderSerializer,
    VegetableReturnListSerializer,
    VegetableReturnDetailSerializer,
    CustomerVegetableReturnCreateSerializer,
    AdminVegetableReturnActionSerializer,
)
from .vegetable_order_state_machine import apply_vegetable_transition, ALLOWED_TRANSITIONS


def serialize_admin_order_detail(order: VegetableOrder) -> dict:
    customer = order.customer
    customer_name = ""
    customer_phone = ""
    customer_email = ""
    if customer:
        customer_name = f"{customer.first_name} {customer.last_name}".strip() or customer.username
        customer_phone = getattr(customer, "phone", "") or ""
        customer_email = getattr(customer, "email", "") or ""

    items_data = []
    for item in order.items.all().select_related("package"):
        pkg = item.package
        items_data.append({
            "id": item.id,
            "package_id": pkg.id if pkg else None,
            "name": pkg.name if pkg else "Vegetable Item",
            "image": pkg.image if pkg else "/mockups/vegetables_realistic.png",
            "pack_size": getattr(pkg, "duration", "") or "500g",
            "quantity_grams": item.quantity_grams,
            "quantity_display": format_grams_for_display(item.quantity_grams),
            "unit_price": float(item.unit_price_snapshot or 0),
            "line_amount": float(item.line_amount or 0),
        })

    allowed_next = list(ALLOWED_TRANSITIONS.get(order.status, set()))

    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "status_label": order.get_status_display(),
        "allowed_transitions": allowed_next,
        "customer": {
            "id": customer.id if customer else None,
            "name": customer_name or "Guest Customer",
            "phone": customer_phone,
            "email": customer_email,
        },
        "delivery_address": order.delivery_address,
        "total_amount": float(order.total_amount or 0),
        "items_count": len(items_data),
        "items": items_data,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


class AdminVegetableOrderListView(APIView):
    """
    GET /api/vegetable-orders/admin/
    List, filter, and search vegetable orders with counts by status.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = VegetableOrder.objects.all().prefetch_related("items__package", "customer").order_by("-created_at")

        # Compute status counts across all orders
        status_counts = {
            "ALL": VegetableOrder.objects.count(),
            "PLACED": VegetableOrder.objects.filter(status=VegetableOrder.Status.PLACED).count(),
            "PACKED": VegetableOrder.objects.filter(status=VegetableOrder.Status.PACKED).count(),
            "OUT_FOR_DELIVERY": VegetableOrder.objects.filter(status=VegetableOrder.Status.OUT_FOR_DELIVERY).count(),
            "DELIVERED": VegetableOrder.objects.filter(status=VegetableOrder.Status.DELIVERED).count(),
            "CANCELLED": VegetableOrder.objects.filter(status=VegetableOrder.Status.CANCELLED).count(),
        }

        # Filtering by status
        status_param = request.GET.get("status", "").strip().upper()
        if status_param and status_param != "ALL":
            qs = qs.filter(status=status_param)

        # Search query (order number, customer name, phone, email)
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(order_number__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(customer__username__icontains=search)
                | Q(customer__phone__icontains=search)
                | Q(customer__email__icontains=search)
                | Q(delivery_address__icontains=search)
            )

        # Date range filtering
        start_date = request.GET.get("start_date")
        end_date = request.GET.get("end_date")
        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        orders_data = [serialize_admin_order_detail(order) for order in qs]

        return Response({
            "success": True,
            "status_counts": status_counts,
            "total_count": len(orders_data),
            "data": orders_data,
        })


class AdminVegetableOrderDetailView(APIView):
    """
    GET /api/vegetable-orders/admin/<id>/
    Retrieve single vegetable order detail.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        order = get_object_or_404(
            VegetableOrder.objects.prefetch_related("items__package", "customer"),
            pk=pk
        )
        return Response({
            "success": True,
            "data": serialize_admin_order_detail(order),
        })


class AdminVegetableOrderTransitionView(APIView):
    """
    POST /api/vegetable-orders/admin/<id>/transition/
    Body: {"target_status": "PACKED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED", "notes": "..."}
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        order = get_object_or_404(VegetableOrder, pk=pk)
        target_status = request.data.get("target_status", "").strip().upper()
        if not target_status:
            return Response(
                {"success": False, "message": "target_status is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            updated_order = apply_vegetable_transition(order, target_status)
            return Response({
                "success": True,
                "message": f"Order #{order.order_number} status transitioned to {target_status}.",
                "data": serialize_admin_order_detail(updated_order),
            })
        except ValidationError as e:
            msg = e.detail if hasattr(e, "detail") else str(e)
            if isinstance(msg, list):
                msg = msg[0]
            return Response(
                {
                    "success": False,
                    "message": str(msg),
                    "allowed_transitions": list(ALLOWED_TRANSITIONS.get(order.status, set())),
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"success": False, "message": f"Error updating order: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VegetableAdminDashboardStatsView(APIView):
    """
    GET /api/vegetable-orders/admin/dashboard/
    Real-time dashboard KPIs, daily revenue, status pipeline, low-stock alerts,
    and recent activity.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        today = timezone.localdate()

        # Orders today
        orders_today_qs = VegetableOrder.objects.filter(created_at__date=today)
        today_orders_count = orders_today_qs.count()
        today_revenue = orders_today_qs.exclude(status=VegetableOrder.Status.CANCELLED).aggregate(
            total=Sum("total_amount")
        )["total"] or Decimal("0.00")

        # Global status breakdown
        status_counts = {
            "PLACED": VegetableOrder.objects.filter(status=VegetableOrder.Status.PLACED).count(),
            "PACKED": VegetableOrder.objects.filter(status=VegetableOrder.Status.PACKED).count(),
            "OUT_FOR_DELIVERY": VegetableOrder.objects.filter(status=VegetableOrder.Status.OUT_FOR_DELIVERY).count(),
            "DELIVERED": VegetableOrder.objects.filter(status=VegetableOrder.Status.DELIVERED).count(),
            "CANCELLED": VegetableOrder.objects.filter(status=VegetableOrder.Status.CANCELLED).count(),
        }

        # Active products count
        active_products_count = Package.objects.filter(service__slug="vegetables", status=PackageStatus.ACTIVE).count()

        # Low-stock alerts evaluated per vegetable baseline (threshold = 25% of default_daily_quantity_grams)
        low_stock_items = []
        out_of_stock_count = 0

        vegetables = Vegetable.objects.all().select_related("package", "category")
        for veg in vegetables:
            stock = veg.stock_quantity_grams or 0
            default_daily = veg.default_daily_quantity_grams or 0

            if stock == 0:
                out_of_stock_count += 1

            if default_daily > 0:
                threshold = int(default_daily * 0.25)
                if stock <= threshold:
                    pct = round((stock / default_daily) * 100, 1)
                    low_stock_items.append({
                        "id": veg.id,
                        "product_id": veg.package_id,
                        "name": veg.package.name if veg.package else veg.name,
                        "sku": veg.sku,
                        "category_name": veg.category.name if veg.category else "Uncategorized",
                        "image": veg.image or (veg.package.image if veg.package else "/mockups/vegetables_realistic.png"),
                        "current_stock_grams": stock,
                        "current_stock_display": format_grams_for_display(stock),
                        "default_daily_grams": default_daily,
                        "default_daily_display": format_grams_for_display(default_daily),
                        "percentage_left": pct,
                        "is_out_of_stock": stock == 0,
                    })

        # Sort low stock items: out of stock first, then lowest percentage left
        low_stock_items.sort(key=lambda x: (not x["is_out_of_stock"], x["percentage_left"]))

        # Recent orders (last 6)
        recent_orders = [
            serialize_admin_order_detail(o)
            for o in VegetableOrder.objects.all().prefetch_related("items__package", "customer").order_by("-created_at")[:6]
        ]

        # Category distribution
        categories_summary = []
        for cat in VegetableCategory.objects.all().prefetch_related("vegetables"):
            categories_summary.append({
                "id": cat.id,
                "name": cat.name,
                "slug": cat.slug,
                "image": cat.image,
                "count": cat.vegetables.count(),
            })

        return Response({
            "success": True,
            "today_stats": {
                "today_orders_count": today_orders_count,
                "today_revenue": float(today_revenue),
                "pending_packing": status_counts["PLACED"],
                "out_for_delivery": status_counts["OUT_FOR_DELIVERY"],
                "delivered_today": VegetableOrder.objects.filter(status=VegetableOrder.Status.DELIVERED, updated_at__date=today).count(),
                "active_products_count": active_products_count,
                "out_of_stock_count": out_of_stock_count,
            },
            "status_pipeline": status_counts,
            "low_stock_alerts": low_stock_items,
            "recent_orders": recent_orders,
            "categories_summary": categories_summary,
        })


class CustomerVegetableReturnCreateView(APIView):
    """
    POST /api/vegetable-orders/customer/returns/
    Customer initiates a return request for a delivered vegetable order.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CustomerVegetableReturnCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid return request data.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_id = serializer.validated_data["order_id"]
        item_id = serializer.validated_data.get("item_id")
        reason = serializer.validated_data["reason"]
        customer_notes = serializer.validated_data.get("customer_notes", "")

        try:
            order = VegetableOrder.objects.get(pk=order_id, customer=request.user)
        except VegetableOrder.DoesNotExist:
            return Response(
                {"success": False, "message": "Order not found or does not belong to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.status != VegetableOrder.Status.DELIVERED:
            return Response(
                {"success": False, "message": "Return requests can only be submitted for delivered orders."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item = None
        if item_id:
            try:
                item = order.items.get(pk=item_id)
            except VegetableOrderItem.DoesNotExist:
                return Response(
                    {"success": False, "message": "Selected item is not part of this order."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        veg_return = VegetableReturn.objects.create(
            order=order,
            item=item,
            customer=request.user,
            reason=reason,
            customer_notes=customer_notes,
            status=VegetableReturn.Status.REQUESTED,
        )

        return Response(
            {
                "success": True,
                "message": f"Return request #{veg_return.return_number} submitted successfully.",
                "data": VegetableReturnDetailSerializer(veg_return).data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminVegetableReturnListView(APIView):
    """
    GET /api/vegetable-orders/admin/returns/
    List, filter, and search vegetable return requests.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        qs = VegetableReturn.objects.all().select_related("order", "item__package", "customer", "handled_by").order_by("-created_at")

        status_counts = {
            "ALL": VegetableReturn.objects.count(),
            "REQUESTED": VegetableReturn.objects.filter(status=VegetableReturn.Status.REQUESTED).count(),
            "APPROVED": VegetableReturn.objects.filter(status=VegetableReturn.Status.APPROVED).count(),
            "RESOLVED": VegetableReturn.objects.filter(status=VegetableReturn.Status.RESOLVED).count(),
            "REJECTED": VegetableReturn.objects.filter(status=VegetableReturn.Status.REJECTED).count(),
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
                Q(return_number__icontains=search)
                | Q(order__order_number__icontains=search)
                | Q(customer__first_name__icontains=search)
                | Q(customer__last_name__icontains=search)
                | Q(customer__username__icontains=search)
                | Q(customer__phone__icontains=search)
                | Q(customer_notes__icontains=search)
            )

        data = VegetableReturnListSerializer(qs, many=True).data

        return Response({
            "success": True,
            "status_counts": status_counts,
            "total_count": len(data),
            "data": data,
        })


class AdminVegetableReturnDetailView(APIView):
    """
    GET /api/vegetable-orders/admin/returns/<pk>/
    Retrieve detailed vegetable return request.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, pk):
        ret = get_object_or_404(
            VegetableReturn.objects.select_related("order", "item__package", "customer", "handled_by").prefetch_related("order__items__package"),
            pk=pk,
        )
        return Response({
            "success": True,
            "data": VegetableReturnDetailSerializer(ret).data,
        })


class AdminVegetableReturnActionView(APIView):
    """
    POST /api/vegetable-orders/admin/returns/<pk>/action/
    Admin actions: approve, reject, or resolve return with resolution action, refund amount, admin notes.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        ret = get_object_or_404(
            VegetableReturn.objects.select_related("order", "item__package", "customer"),
            pk=pk,
        )

        serializer = AdminVegetableReturnActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid action data.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_status = serializer.validated_data["status"]
        resolution_action = serializer.validated_data.get("resolution_action", VegetableReturn.ResolutionAction.NONE)
        refund_amount = serializer.validated_data.get("refund_amount", Decimal("0.00"))
        admin_notes = serializer.validated_data.get("admin_notes", "")

        ret.status = target_status
        ret.resolution_action = resolution_action
        ret.refund_amount = refund_amount
        if admin_notes:
            ret.admin_notes = admin_notes
        ret.handled_by = request.user

        if target_status in [VegetableReturn.Status.RESOLVED, VegetableReturn.Status.REJECTED]:
            ret.resolved_at = timezone.now()

        ret.save()

        return Response({
            "success": True,
            "message": f"Return #{ret.return_number} status updated to {target_status}.",
            "data": VegetableReturnDetailSerializer(ret).data,
        })

