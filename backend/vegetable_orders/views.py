"""
backend/vegetable_orders/views.py

API Views for Vegetable Orders Administration, State Transitions, and Home Dashboard KPIs.
"""
from decimal import Decimal
from django.db import transaction
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
from inventory.utils.unit_conversion import format_grams_for_display, format_stock_for_display
from service_requests.models import Package, PackageStatus
import datetime
from .models import (
    VegetableOrder,
    VegetableOrderItem,
    VegetableReturn,
    VegetableDeliverySlotConfig,
    VegetableWeekdaySlotConfig,
    VegetableSlotDateOverride,
    GroceryCartPricingConfig,
)
from .serializers import (
    VegetableOrderSerializer,
    VegetableReturnListSerializer,
    VegetableReturnDetailSerializer,
    CustomerVegetableReturnCreateSerializer,
    AdminVegetableReturnActionSerializer,
    VegetableDeliverySlotConfigSerializer,
    VegetableWeekdaySlotConfigSerializer,
    VegetableSlotDateOverrideSerializer,
    GroceryCartPricingConfigSerializer,
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
    for item in order.items.all().select_related("package", "package__stock_item", "package__stock_item__category"):
        pkg = item.package
        img = ""
        if pkg:
            if pkg.image and str(pkg.image).strip():
                img = str(pkg.image).strip()
            elif hasattr(pkg, 'stock_item') and pkg.stock_item:
                if pkg.stock_item.image and str(pkg.stock_item.image).strip():
                    img = str(pkg.stock_item.image).strip()
                elif pkg.stock_item.category and pkg.stock_item.category.image and str(pkg.stock_item.category.image).strip():
                    img = str(pkg.stock_item.category.image).strip()
        if not img:
            img = "/mockups/vegetables_realistic.png"

        items_data.append({
            "id": item.id,
            "package_id": pkg.id if pkg else None,
            "name": pkg.name if pkg else "Vegetable Item",
            "image": img,
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
        "delivery_date": order.delivery_date.isoformat() if order.delivery_date else None,
        "delivery_slot": order.delivery_slot or "Next-Day Delivery: 6:00 PM – 8:00 PM",
        "items_subtotal": float(order.items_subtotal or order.total_amount or 0),
        "delivery_fee": float(order.delivery_fee or 0),
        "handling_fee": float(order.handling_fee or 0),
        "small_cart_fee": float(order.small_cart_fee or 0),
        "tip_amount": float(order.tip_amount or 0),
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

            threshold = (
                veg.reorder_threshold
                if (veg.reorder_threshold or 0) > 0
                else (int(default_daily * 0.25) if default_daily > 0 else 0)
            )
            base_for_pct = default_daily if default_daily > 0 else (threshold * 4 if threshold > 0 else (stock or 1))

            if threshold > 0 and stock <= threshold:
                pct = round((stock / base_for_pct) * 100, 1) if base_for_pct > 0 else 0.0
                img = ""
                if veg.image and str(veg.image).strip():
                    img = str(veg.image).strip()
                elif veg.package and veg.package.image and str(veg.package.image).strip():
                    img = str(veg.package.image).strip()
                elif veg.category and veg.category.image and str(veg.category.image).strip():
                    img = str(veg.category.image).strip()
                if not img:
                    img = "/mockups/vegetables_realistic.png"

                low_stock_items.append({
                    "id": veg.id,
                    "product_id": veg.package_id,
                    "name": veg.package.name if veg.package else veg.name,
                    "sku": veg.sku,
                    "category_name": veg.category.name if veg.category else "Uncategorized",
                    "image": img,
                    "unit_basis": veg.unit_basis,
                    "unit": veg.unit,
                    "current_stock_grams": stock,
                    "current_stock_display": format_stock_for_display(stock, unit_basis=veg.unit_basis, unit=veg.unit),
                    "default_daily_grams": default_daily,
                    "default_daily_display": format_stock_for_display(default_daily, unit_basis=veg.unit_basis, unit=veg.unit),
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
    Admin actions: approve, reject, or resolve return with resolution action, refund amount, restock choice, admin notes.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        ret = get_object_or_404(
            VegetableReturn.objects.select_related("order", "item__package", "customer", "stock_movement"),
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
        restock_item = serializer.validated_data.get("restock_item", False)
        admin_notes = serializer.validated_data.get("admin_notes", "")

        ret.status = target_status
        ret.resolution_action = resolution_action
        ret.refund_amount = refund_amount
        if admin_notes:
            ret.admin_notes = admin_notes
        ret.handled_by = request.user

        if target_status in [VegetableReturn.Status.RESOLVED, VegetableReturn.Status.REJECTED]:
            ret.resolved_at = timezone.now()

        # If resolving return, process inventory stock adjustments atomically
        if target_status == VegetableReturn.Status.RESOLVED:
            from inventory.services.vegetable_stock_service import process_return_stock_resolution
            try:
                with transaction.atomic():
                    ret.save()
                    process_return_stock_resolution(
                        vegetable_return=ret,
                        restock_item=restock_item,
                        entered_by=request.user,
                    )
            except ValidationError as e:
                msg = e.detail if hasattr(e, "detail") else str(e)
                if isinstance(msg, list):
                    msg = msg[0]
                return Response(
                    {"success": False, "message": str(msg)},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                return Response(
                    {"success": False, "message": f"Error updating inventory: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            ret.save()

        # Refresh from db to ensure linked stock movement is populated
        ret.refresh_from_db()

        return Response({
            "success": True,
            "message": f"Return #{ret.return_number} status updated to {target_status}.",
            "data": VegetableReturnDetailSerializer(ret).data,
        })


def ensure_default_slots_and_template():
    """
    Initializes default quick-commerce delivery slots and 7-day template if not yet created.
    """
    morning, _ = VegetableDeliverySlotConfig.objects.get_or_create(
        code="morning",
        defaults={
            "name": "Morning Delivery",
            "slot_label": "6:30 AM – 9:30 AM",
            "start_time": datetime.time(6, 30),
            "end_time": datetime.time(9, 30),
            "cutoff_time": datetime.time(6, 0),
            "is_same_day_available": False,
            "is_active": True,
            "sort_order": 1,
        }
    )
    evening, created = VegetableDeliverySlotConfig.objects.get_or_create(
        code="evening",
        defaults={
            "name": "Evening Delivery",
            "slot_label": "6:00 PM – 8:00 PM",
            "start_time": datetime.time(18, 0),
            "end_time": datetime.time(20, 0),
            "cutoff_time": datetime.time(17, 45),
            "is_same_day_available": True,
            "is_active": True,
            "sort_order": 2,
        }
    )
    if not created and evening.cutoff_time in [datetime.time(12, 0), datetime.time(17, 30)]:
        evening.cutoff_time = datetime.time(17, 45)
        evening.save(update_fields=["cutoff_time"])

    all_slots = list(VegetableDeliverySlotConfig.objects.all())
    for weekday in range(7):
        for slot in all_slots:
            VegetableWeekdaySlotConfig.objects.get_or_create(
                weekday=weekday,
                slot_config=slot,
                defaults={"is_enabled": True}
            )


class CustomerVegetableSlotsView(APIView):
    """
    GET /api/vegetable-orders/slots/
    Returns live available delivery dates and per-weekday time slots covering all 7 days of the week.
    """
    permission_classes = []

    def get(self, request):
        ensure_default_slots_and_template()

        now = timezone.localtime(timezone.now()) if timezone.is_aware(timezone.now()) else timezone.now()
        current_time = now.time()
        today_date = now.date()

        dates = []
        for days_ahead in range(7):
            d = today_date + datetime.timedelta(days=days_ahead)
            weekday_num = int(d.strftime("%w"))  # 0=Sunday, 1=Monday ... 6=Saturday
            day_name = d.strftime("%A")
            short_day = d.strftime("%a")
            date_display = d.strftime("%d %b")

            if days_ahead == 0:
                display_label = "Today"
            elif days_ahead == 1:
                display_label = "Tomorrow"
            else:
                display_label = day_name

            # Check full-day closure override
            whole_day_override = VegetableSlotDateOverride.objects.filter(
                date=d, slot_config__isnull=True
            ).first()

            if whole_day_override and whole_day_override.is_closed:
                dates.append({
                    "date": d.isoformat(),
                    "day_name": day_name,
                    "short_day": short_day,
                    "display_label": display_label,
                    "formatted": f"{short_day}, {date_display}",
                    "date_display": date_display,
                    "weekday": weekday_num,
                    "is_today": days_ahead == 0,
                    "is_tomorrow": days_ahead == 1,
                    "is_closed": True,
                    "reason": whole_day_override.reason or f"Closed by admin for {date_display}",
                    "available_slots_count": 0,
                    "slots": [],
                })
                continue

            # Fetch slots configured for this weekday
            weekday_configs = (
                VegetableWeekdaySlotConfig.objects.filter(
                    weekday=weekday_num,
                    slot_config__is_active=True
                )
                .select_related("slot_config")
                .order_by("slot_config__sort_order", "id")
            )

            slots_for_date = []
            for wc in weekday_configs:
                slot = wc.slot_config

                # If slot is disabled for this weekday in template
                if not wc.is_enabled:
                    slots_for_date.append({
                        "id": slot.id,
                        "slot_config_id": slot.id,
                        "code": slot.code,
                        "name": slot.name,
                        "slot_label": slot.slot_label,
                        "full_label": f"{slot.name} ({slot.slot_label})",
                        "start_time": slot.start_time.strftime("%H:%M") if slot.start_time else None,
                        "end_time": slot.end_time.strftime("%H:%M") if slot.end_time else None,
                        "available": False,
                        "is_closed": True,
                        "reason": f"Not operating on {day_name}s",
                    })
                    continue

                # Check slot-specific date override
                slot_override = VegetableSlotDateOverride.objects.filter(
                    date=d, slot_config=slot
                ).first()

                if slot_override and slot_override.is_closed:
                    slots_for_date.append({
                        "id": slot.id,
                        "slot_config_id": slot.id,
                        "code": slot.code,
                        "name": slot.name,
                        "slot_label": slot.slot_label,
                        "full_label": f"{slot.name} ({slot.slot_label})",
                        "start_time": slot.start_time.strftime("%H:%M") if slot.start_time else None,
                        "end_time": slot.end_time.strftime("%H:%M") if slot.end_time else None,
                        "available": False,
                        "is_closed": True,
                        "reason": slot_override.reason or "Slot closed on this date",
                    })
                    continue

                # Effective cutoff time
                if slot_override and slot_override.cutoff_time_override:
                    effective_cutoff = slot_override.cutoff_time_override
                elif wc.cutoff_time_override:
                    effective_cutoff = wc.cutoff_time_override
                # Effective cutoff time
                if slot_override and slot_override.cutoff_time_override:
                    effective_cutoff = slot_override.cutoff_time_override
                elif wc.cutoff_time_override:
                    effective_cutoff = wc.cutoff_time_override
                else:
                    effective_cutoff = slot.cutoff_time or datetime.time(17, 45)

                # Same-day live cutoff check
                if days_ahead == 0:
                    if not slot.is_same_day_available:
                        available = False
                        reason = "Next-day only delivery window"
                    elif current_time >= effective_cutoff:
                        available = False
                        cutoff_str = effective_cutoff.strftime("%I:%M %p").lstrip("0")
                        reason = f"Same-day cutoff passed ({cutoff_str})"
                    else:
                        available = True
                        reason = None
                else:
                    available = True
                    reason = None

                slots_for_date.append({
                    "id": slot.id,
                    "slot_config_id": slot.id,
                    "code": slot.code,
                    "name": slot.name,
                    "slot_label": slot.slot_label,
                    "full_label": f"{slot.name} ({slot.slot_label})",
                    "start_time": slot.start_time.strftime("%H:%M") if slot.start_time else None,
                    "end_time": slot.end_time.strftime("%H:%M") if slot.end_time else None,
                    "cutoff_time": effective_cutoff.strftime("%H:%M") if effective_cutoff else None,
                    "available": available,
                    "is_closed": not available and not wc.is_enabled,
                    "reason": reason,
                })

            has_available_slot = any(s.get("available") for s in slots_for_date)
            day_is_closed = not has_available_slot
            day_reason = None
            if day_is_closed:
                if len(slots_for_date) == 0 or all(s.get("is_closed") for s in slots_for_date):
                    day_reason = f"Not operating on {day_name}s"
                elif days_ahead == 0:
                    day_reason = "Cutoff passed for all slots today"
                else:
                    day_reason = f"Slots closed on {display_label}"

            dates.append({
                "date": d.isoformat(),
                "day_name": day_name,
                "short_day": short_day,
                "display_label": display_label,
                "formatted": f"{short_day}, {date_display}",
                "date_display": date_display,
                "weekday": weekday_num,
                "is_today": days_ahead == 0,
                "is_tomorrow": days_ahead == 1,
                "is_closed": day_is_closed,
                "reason": day_reason,
                "available_slots_count": sum(1 for s in slots_for_date if s.get("available")),
                "slots": slots_for_date,
            })

        pricing_cfg = GroceryCartPricingConfig.get_active_config()

        return Response({
            "success": True,
            "dates": dates,
            "current_time": now.strftime("%H:%M:%S"),
            "pricing_config": GroceryCartPricingConfigSerializer(pricing_cfg).data,
        })


class AdminVegetableSlotConfigView(APIView):
    """
    GET /api/vegetable-orders/admin/slots/
    POST /api/vegetable-orders/admin/slots/
    Admin CRUD for vegetable delivery slot definitions, 7-day weekday template matrix, and date overrides.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _build_weekday_matrix(self):
        weekday_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        weekday_matrix = []
        for w in range(7):
            configs = (
                VegetableWeekdaySlotConfig.objects.filter(weekday=w)
                .select_related("slot_config")
                .order_by("slot_config__sort_order", "id")
            )
            weekday_matrix.append({
                "weekday": w,
                "weekday_name": weekday_names[w],
                "slots": [
                    {
                        "id": c.id,
                        "slot_config_id": c.slot_config_id,
                        "slot_name": c.slot_config.name,
                        "slot_label": c.slot_config.slot_label,
                        "is_enabled": c.is_enabled,
                        "cutoff_time_override": c.cutoff_time_override.strftime("%H:%M") if c.cutoff_time_override else None,
                        "capacity": c.capacity,
                    }
                    for c in configs
                ]
            })
        return weekday_matrix

    def get(self, request):
        ensure_default_slots_and_template()

        slots = VegetableDeliverySlotConfig.objects.all().order_by("sort_order", "id")
        weekday_matrix = self._build_weekday_matrix()

        today = timezone.localdate()
        date_overrides = (
            VegetableSlotDateOverride.objects.filter(date__gte=today)
            .select_related("slot_config")
            .order_by("date", "id")
        )

        return Response({
            "success": True,
            "slots": VegetableDeliverySlotConfigSerializer(slots, many=True).data,
            "weekday_template": weekday_matrix,
            "date_overrides": VegetableSlotDateOverrideSerializer(date_overrides, many=True).data,
        })

    def post(self, request):
        action = request.data.get("action", "")

        if action == "save_weekday_template":
            template = request.data.get("template", [])
            for item in template:
                weekday = item.get("weekday")
                slot_config_id = item.get("slot_config_id")
                
                raw_enabled = item.get("is_enabled")
                if raw_enabled is not None:
                    if isinstance(raw_enabled, str):
                        is_enabled = raw_enabled.strip().lower() in ["true", "1", "t"]
                    else:
                        is_enabled = bool(raw_enabled)
                else:
                    is_enabled = True

                cutoff_raw = item.get("cutoff_time_override")
                capacity = item.get("capacity")

                cutoff_val = None
                if cutoff_raw:
                    try:
                        parts = str(cutoff_raw).strip().split(":")
                        cutoff_val = datetime.time(int(parts[0]), int(parts[1]))
                    except (ValueError, IndexError):
                        pass

                if weekday is not None and slot_config_id:
                    VegetableWeekdaySlotConfig.objects.update_or_create(
                        weekday=weekday,
                        slot_config_id=slot_config_id,
                        defaults={
                            "is_enabled": is_enabled,
                            "cutoff_time_override": cutoff_val,
                            "capacity": capacity if capacity not in [None, ""] else None,
                        }
                    )

            return Response({
                "success": True,
                "message": "Weekday delivery template saved successfully.",
                "weekday_template": self._build_weekday_matrix(),
            })

        elif action == "save_slot":
            slot_id = request.data.get("id")
            if slot_id:
                slot = get_object_or_404(VegetableDeliverySlotConfig, pk=slot_id)
                serializer = VegetableDeliverySlotConfigSerializer(slot, data=request.data, partial=True)
            else:
                serializer = VegetableDeliverySlotConfigSerializer(data=request.data)

            if not serializer.is_valid():
                return Response({"success": False, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

            slot = serializer.save()

            # Ensure weekday configs exist for this slot
            for w in range(7):
                VegetableWeekdaySlotConfig.objects.get_or_create(
                    weekday=w,
                    slot_config=slot,
                    defaults={"is_enabled": True}
                )

            return Response({
                "success": True,
                "message": "Slot configuration saved successfully.",
                "data": VegetableDeliverySlotConfigSerializer(slot).data,
            })

        elif action == "delete_slot":
            slot_id = request.data.get("id")
            slot = get_object_or_404(VegetableDeliverySlotConfig, pk=slot_id)
            slot.delete()
            return Response({
                "success": True,
                "message": f"Delivery slot '{slot.name}' deleted successfully."
            })

        elif action == "add_date_override":
            date_str = request.data.get("date")
            slot_config_id = request.data.get("slot_config_id") or None
            is_closed = request.data.get("is_closed", True)
            reason = request.data.get("reason", "")
            cutoff_raw = request.data.get("cutoff_time_override")

            if not date_str:
                return Response({"success": False, "message": "Date is required."}, status=status.HTTP_400_BAD_REQUEST)

            cutoff_val = None
            if cutoff_raw:
                try:
                    parts = str(cutoff_raw).strip().split(":")
                    cutoff_val = datetime.time(int(parts[0]), int(parts[1]))
                except (ValueError, IndexError):
                    pass

            override = VegetableSlotDateOverride.objects.create(
                date=date_str,
                slot_config_id=slot_config_id,
                is_closed=is_closed,
                reason=reason,
                cutoff_time_override=cutoff_val,
            )

            return Response({
                "success": True,
                "message": "Date override added successfully.",
                "data": VegetableSlotDateOverrideSerializer(override).data,
            }, status=status.HTTP_201_CREATED)

        elif action == "delete_date_override":
            override_id = request.data.get("id")
            override = get_object_or_404(VegetableSlotDateOverride, pk=override_id)
            override.delete()
            return Response({
                "success": True,
                "message": "Date override removed successfully."
            })

        else:
            return Response(
                {"success": False, "message": f"Unrecognized action '{action}'."},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomerVegetablePricingConfigView(APIView):
    """
    GET /api/vegetable-orders/pricing-config/
    Returns active quick-commerce cart pricing configuration (thresholds, fee tiers, tip presets).
    """
    permission_classes = []

    def get(self, request):
        config = GroceryCartPricingConfig.get_active_config()
        return Response({
            "success": True,
            "data": GroceryCartPricingConfigSerializer(config).data,
        })


class AdminVegetablePricingConfigView(APIView):
    """
    GET /api/vegetable-orders/admin/pricing-config/
    POST /api/vegetable-orders/admin/pricing-config/
    Retrieve and update quick-commerce cart pricing configuration.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        config = GroceryCartPricingConfig.get_active_config()
        return Response({
            "success": True,
            "data": GroceryCartPricingConfigSerializer(config).data,
        })

    def post(self, request):
        config = GroceryCartPricingConfig.get_active_config()
        serializer = GroceryCartPricingConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Invalid pricing configuration data.", "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        saved = serializer.save()
        return Response({
            "success": True,
            "message": "Cart pricing configuration updated successfully.",
            "data": GroceryCartPricingConfigSerializer(saved).data,
        })



