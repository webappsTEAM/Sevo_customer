from typing import Optional, Dict, Any
from dataclasses import dataclass
from service_requests.models import ServiceRequest


@dataclass
class ToolGuardResult:
    is_authorized: bool
    reason: Optional[str] = None
    error_message: Optional[str] = None


class ToolGuard:
    """
    Tool-level enforcement:
    1. Authenticated user check.
    2. Role-based tool access gating.
    3. Resource ownership verification (Customer A cannot access Customer B's order).
    """

    PUBLIC_TOOLS = {
        "search_products",
        "get_product_details",
        "get_product_reviews",
        "query_knowledge_base",
    }

    CUSTOMER_TOOLS = {
        "get_customer_profile",
        "get_customer_orders",
        "get_order_details",
        "get_delivery_status",
    }

    VENDOR_TOOLS = set()  # Reserved for Phase 2

    @classmethod
    def authorize(cls, tool_name: str, context: Dict[str, Any], params: Optional[Dict[str, Any]] = None) -> ToolGuardResult:
        user = context.get("user")
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        user_role = context.get("role", "customer")

        # 1. Public tools can be called by anyone
        if tool_name in cls.PUBLIC_TOOLS:
            return ToolGuardResult(is_authorized=True)

        # 2. Customer tools require authentication
        if tool_name in cls.CUSTOMER_TOOLS:
            if not is_authenticated:
                return ToolGuardResult(
                    is_authorized=False,
                    reason="Unauthenticated attempt to access customer tool",
                    error_message="You must be logged in to view your account or booking details.",
                )

            # 3. Ownership check if accessing a specific booking/order
            if tool_name in {"get_order_details", "get_delivery_status"} and params:
                order_id = params.get("order_id") or params.get("id") or params.get("identifier")
                if order_id:
                    ownership_ok = cls._verify_order_ownership(user, order_id)
                    if not ownership_ok:
                        return ToolGuardResult(
                            is_authorized=False,
                            reason=f"Ownership check failed for user {user.id} on booking {order_id}",
                            error_message="Booking not found or you do not have permission to view it.",
                        )

            return ToolGuardResult(is_authorized=True)

        return ToolGuardResult(
            is_authorized=False,
            reason=f"Tool '{tool_name}' is not recognized or not permitted in Phase 1",
            error_message="The requested tool is unavailable.",
        )

    @staticmethod
    def _verify_order_ownership(user, identifier) -> bool:
        """
        Confirms the ServiceRequest belongs strictly to the authenticated user.
        Staff/Admin bypass permitted if they possess administrative role.
        """
        if getattr(user, "is_staff", False) or getattr(user, "role", "") in {"admin", "superadmin"}:
            return True

        ident_str = str(identifier).strip()
        try:
            if ident_str.isdigit():
                sr = ServiceRequest.objects.select_related("customer").get(pk=int(ident_str))
            else:
                sr = ServiceRequest.objects.select_related("customer").get(request_id=ident_str)
        except ServiceRequest.DoesNotExist:
            return False

        # Match user ID
        if sr.customer_id and sr.customer_id == user.id:
            return True

        # Match normalized email
        user_email = (getattr(user, "email", "") or "").strip().lower()
        if user_email and sr.email and user_email == sr.email.strip().lower():
            return True

        # Match normalized 10-digit phone
        user_phone = (getattr(user, "phone", "") or "").strip()[-10:]
        if user_phone and sr.phone and user_phone == sr.phone.strip()[-10:]:
            return True

        return False
