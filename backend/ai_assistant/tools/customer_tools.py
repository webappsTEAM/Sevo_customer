from typing import Dict, Any, Optional
from django.db.models import Q, Prefetch
from ai_assistant.tools.base import BaseTool
from ai_assistant.guardrails.output_guard import OutputGuard
from service_requests.models import ServiceRequest, RescheduleRequest, WorkExtension, RefundRequest
from service_requests.serializers import ServiceRequestListSerializer, ServiceRequestDetailSerializer
from accounts.serializers import UserSerializer


class GetCustomerProfileTool(BaseTool):
    name = "get_customer_profile"
    description = "Retrieves the authenticated customer's own profile, contact information, and saved addresses."
    parameters = {
        "type": "object",
        "properties": {},
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], **kwargs) -> Dict[str, Any]:
        user = context.get("user")
        if not user or not user.is_authenticated:
            return {"error": "Authentication required to view customer profile."}

        request = context.get("request")
        data = UserSerializer(user, context={"request": request}).data

        # Strip internal staff/superuser permissions from customer view
        sanitized = {
            "id": data.get("id"),
            "customer_id": data.get("customer_id"),
            "first_name": data.get("first_name"),
            "last_name": data.get("last_name"),
            "email": data.get("email"),
            "phone": data.get("phone"),
            "saved_addresses": data.get("saved_addresses", []),
            "timezone": data.get("timezone", "Asia/Kolkata"),
        }
        return {"profile": sanitized}


class GetCustomerOrdersTool(BaseTool):
    name = "get_customer_orders"
    description = "Lists the authenticated customer's own bookings and orders with current status and available actions."
    parameters = {
        "type": "object",
        "properties": {
            "status": {
                "type": "string",
                "description": "Optional filter by status (e.g. 'active', 'completed', 'cancelled').",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of bookings to return (default 5).",
                "default": 5,
            },
        },
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], status: Optional[str] = None, limit: int = 5, **kwargs) -> Dict[str, Any]:
        user = context.get("user")
        if not user or not user.is_authenticated:
            return {"error": "Authentication required to view bookings."}

        user_email = (getattr(user, "email", None) or "").strip()
        raw_phone = (getattr(user, "phone", None) or "").strip()
        clean_phone = raw_phone[-10:] if len(raw_phone) >= 10 else raw_phone

        query = Q(customer=user)
        if user_email:
            query |= Q(email__iexact=user_email)
        if clean_phone:
            query |= (
                Q(phone__endswith=clean_phone)
                | Q(phone=clean_phone)
                | Q(phone=raw_phone)
                | Q(phone=f"+91{clean_phone}")
            )

        qs = ServiceRequest.objects.filter(query).select_related("customer", "feedback").prefetch_related(
            Prefetch("reschedule_requests", queryset=RescheduleRequest.objects.all().order_by("-id")),
            Prefetch("work_extensions", queryset=WorkExtension.objects.all().order_by("-created_at")),
            Prefetch("refund_requests", queryset=RefundRequest.objects.all()),
        ).order_by("-created_at").distinct()

        if status:
            s_clean = status.strip().lower()
            if s_clean == "active":
                qs = qs.exclude(status__in=["completed", "closed", "cancelled", "rejected"])
            elif s_clean in {"completed", "closed", "cancelled", "rejected"}:
                qs = qs.filter(status=s_clean)

        limit_val = min(max(1, int(limit)), 20)
        items = qs[:limit_val]

        request = context.get("request")
        raw_data = ServiceRequestListSerializer(items, many=True, context={"request": request}).data

        # Sanitize via OutputGuard (scrubs OTPs, applies 599 fallback, detects sentinel technician)
        cleaned_bookings = OutputGuard.sanitize_booking_list(raw_data)

        # Build concise summaries for the LLM
        summaries = []
        for b in cleaned_bookings:
            summaries.append({
                "booking_id": b.get("id"),
                "request_id": b.get("request_id"),
                "service_category": b.get("service_category_display") or b.get("service_category"),
                "issue_title": b.get("issue_title"),
                "status": b.get("status"),
                "status_display": b.get("status_display"),
                "preferred_date": b.get("preferred_date"),
                "preferred_time": b.get("preferred_time"),
                "total_amount": b.get("total_amount_display", b.get("total_amount")),
                "payment_status": b.get("payment_status_display"),
                "technician_assigned": bool(b.get("technician_name")),
                "technician_name": b.get("technician_name"),
                "technician_status": b.get("technician_status_display", ""),
                "available_actions": b.get("available_actions", {}),
            })

        return {"count": len(summaries), "bookings": summaries}


class GetOrderDetailsTool(BaseTool):
    name = "get_order_details"
    description = "Retrieves authoritative details for a specific booking owned by the customer, including available actions and items."
    parameters = {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The booking numeric ID or request code (e.g. '123' or 'HV-20260903-XXXX').",
            },
        },
        "required": ["order_id"],
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], order_id: str, **kwargs) -> Dict[str, Any]:
        user = context.get("user")
        if not user or not user.is_authenticated:
            return {"error": "Authentication required."}

        ident_str = str(order_id).strip()
        try:
            if ident_str.isdigit():
                sr = ServiceRequest.objects.select_related("customer", "feedback").get(pk=int(ident_str))
            else:
                sr = ServiceRequest.objects.select_related("customer", "feedback").get(request_id=ident_str)
        except ServiceRequest.DoesNotExist:
            return {"error": "Booking not found."}

        # Validate ownership
        is_owner = bool(
            (sr.customer_id and sr.customer_id == user.id)
            or (getattr(user, "is_staff", False))
            or (user.email and sr.email and user.email.strip().lower() == sr.email.strip().lower())
            or (user.phone and sr.phone and str(user.phone).strip()[-10:] == str(sr.phone).strip()[-10:])
        )
        if not is_owner:
            return {"error": "Booking not found or you do not have permission to view it."}

        request = context.get("request")
        raw_detail = ServiceRequestDetailSerializer(sr, context={"request": request}).data

        # Sanitize via OutputGuard
        clean_detail = OutputGuard.sanitize_booking_data(raw_detail)

        return {
            "order": {
                "booking_id": clean_detail.get("id"),
                "request_id": clean_detail.get("request_id"),
                "category": clean_detail.get("service_category_display"),
                "title": clean_detail.get("issue_title"),
                "description": clean_detail.get("description"),
                "status": clean_detail.get("status"),
                "status_display": clean_detail.get("status_display"),
                "date": clean_detail.get("preferred_date"),
                "time": clean_detail.get("preferred_time"),
                "address": clean_detail.get("address"),
                "total_amount": clean_detail.get("total_amount_display", clean_detail.get("total_amount")),
                "pricing_note": clean_detail.get("pricing_note"),
                "payment_status": clean_detail.get("payment_status_display"),
                "payment_method": clean_detail.get("payment_method_display"),
                "technician": clean_detail.get("technician"),
                "technician_status": clean_detail.get("technician_status_display", ""),
                "available_actions": clean_detail.get("available_actions", {}),
                "items": clean_detail.get("cart_data") if isinstance(clean_detail.get("cart_data"), list) else [],
            }
        }


class GetDeliveryStatusTool(BaseTool):
    name = "get_delivery_status"
    description = "Checks delivery, dispatch, and live tracking status for an active booking (gated on tracking eligibility)."
    parameters = {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "description": "The booking ID or request code to track.",
            },
        },
        "required": ["order_id"],
        "additionalProperties": False,
    }

    def execute(self, context: Dict[str, Any], order_id: str, **kwargs) -> Dict[str, Any]:
        user = context.get("user")
        if not user or not user.is_authenticated:
            return {"error": "Authentication required."}

        ident_str = str(order_id).strip()
        try:
            if ident_str.isdigit():
                sr = ServiceRequest.objects.select_related("customer").get(pk=int(ident_str))
            else:
                sr = ServiceRequest.objects.select_related("customer").get(request_id=ident_str)
        except ServiceRequest.DoesNotExist:
            return {"error": "Booking not found."}

        # Ownership verification
        is_owner = bool(
            (sr.customer_id and sr.customer_id == user.id)
            or (getattr(user, "is_staff", False))
            or (user.email and sr.email and user.email.strip().lower() == sr.email.strip().lower())
            or (user.phone and sr.phone and str(user.phone).strip()[-10:] == str(sr.phone).strip()[-10:])
        )
        if not is_owner:
            return {"error": "Booking not found or you do not have permission to view it."}

        from service_requests.services import get_customer_available_actions
        actions = get_customer_available_actions(sr)
        can_track = actions.get("can_track", False)

        if not can_track:
            return {
                "order_id": sr.id,
                "request_id": sr.request_id,
                "status": sr.get_status_display(),
                "can_track": False,
                "message": f"Live tracking is not active for this booking (status: {sr.get_status_display()}). Tracking becomes available once a technician is dispatched or en route.",
            }

        return {
            "order_id": sr.id,
            "request_id": sr.request_id,
            "status": sr.get_status_display(),
            "can_track": True,
            "technician_location_name": sr.technician_location_name or "En route to service location",
            "technician_last_seen": sr.updated_at.isoformat() if sr.updated_at else None,
            "tracking_url": f"/customer/bookings/{sr.id}/tracking",
            "message": "The technician is en route. You can view live movement on the tracking map in your app.",
        }
