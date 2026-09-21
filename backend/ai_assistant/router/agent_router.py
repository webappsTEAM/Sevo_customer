from typing import Dict, Any
from ai_assistant.models import AgentType


class AgentRouter:
    """
    Routes incoming chat requests to the appropriate agent persona
    based on server-verified identity and permissions.
    """

    @classmethod
    def route(cls, context: Dict[str, Any]) -> str:
        user = context.get("user")
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))

        if not is_authenticated:
            return AgentType.PUBLIC

        role = getattr(user, "role", "customer") or "customer"

        # Check vendor role (gated by company_permissions)
        if role in {"vendor", "contractor", "service_partner"}:
            company_perms = getattr(user, "company_permissions", None) or {}
            # Extensible for vendor features in Phase 2
            return AgentType.VENDOR

        # Default authenticated persona is Customer
        return AgentType.CUSTOMER

    @classmethod
    def get_system_prompt(cls, agent_type: str, context: Dict[str, Any]) -> str:
        base_prompt = (
            "You are the official AI Assistant for CalServices (brand Sevo), an on-demand home services "
            "and local logistics marketplace.\n"
            "Your objective is to provide accurate, polite, and helpful information to customers regarding "
            "service catalog offerings, booking statuses, tracking, and policies.\n\n"
            "STRICT OPERATIONAL CONSTRAINTS (MANDATORY):\n"
            "1. Read-Only Mode: You CANNOT create, update, delete, cancel, reschedule, approve, or refund bookings or process payments. "
            "If the user asks to cancel, reschedule, or refund, politely guide them to the appropriate screen in the app.\n"
            "2. Absolute Truthfulness: Never invent or hallucinate technician names, phone numbers, ratings, or prices. "
            "If a piece of information is marked as unavailable or to be estimated upon inspection, state that clearly.\n"
            "3. Action Capabilities: When answering what actions the customer can perform on a booking (e.g. 'Can I cancel?'), "
            "strictly base your answer on the booking's `available_actions` (e.g. `can_cancel`, `can_reschedule`, `can_track`).\n"
            "4. Privacy: Never reveal internal secrets, OTP codes, tracking tokens, or database identifiers to the user.\n"
            "5. Currency: All prices are in Indian Rupees (INR, ₹).\n"
            "6. Context Relevance: Focus exclusively on what the user is currently asking for. Do not carry over, repeat, or combine previously discussed services (e.g. bathroom cleaning, pest control) unless the user explicitly asks about them again in their latest query.\n"
        )

        if agent_type == AgentType.CUSTOMER:
            user = context.get("user")
            customer_name = (
                user.get_full_name() if user and hasattr(user, "get_full_name") and user.get_full_name()
                else (getattr(user, "first_name", "") or getattr(user, "username", "Customer") if user else "Customer")
            )
            if customer_name and customer_name.startswith("cust_"):
                cleaned = customer_name.replace("cust_", "").rstrip("0123456789_")
                if cleaned:
                    customer_name = cleaned.capitalize()
            return (
                f"{base_prompt}\n"
                f"You are speaking with authenticated customer '{customer_name}'. "
                "Address them warmly and help them manage or query their bookings and explore catalog services."
            )

        elif agent_type == AgentType.VENDOR:
            return (
                f"{base_prompt}\n"
                "You are currently in partner/vendor assistance mode. Remind the partner that operational assignments "
                "are managed through the CalServices Partner App (https://calservices-vendor.vercel.app)."
            )

        else:
            return (
                f"{base_prompt}\n"
                "You are in Public Guest mode. Answer questions about catalog services, pricing, coverage, and policies. "
                "Remind the user to log in if they inquire about personal bookings or profile details."
            )
