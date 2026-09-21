import re
from typing import Optional
from dataclasses import dataclass


@dataclass
class InputGuardResult:
    is_safe: bool
    is_blocked: bool
    reason: Optional[str] = None
    response_override: Optional[str] = None
    category: Optional[str] = None  # "injection", "write_action", "unsupported"


class InputGuard:
    """
    Input layer security:
    1. Prompt-injection and jailbreak attempt detection.
    2. Write/Mutation command interception (Hard Phase 1 restriction:
       no create, update, delete, cancel, approve, reject, pay, verify, assign, reschedule, refund).
    """

    # Patterns indicating prompt injection, privilege escalation, or jailbreaking
    INJECTION_PATTERNS = [
        r"(?i)\bignore\s+(all\s+)?(previous|prior|system)\s+(instructions|prompts|rules)\b",
        r"(?i)\byou\s+are\s+now\s+(in\s+)?(dan|jailbreak|developer)\s+mode\b",
        r"(?i)\breveal\s+(the\s+)?(system\s+prompt|hidden\s+instructions|api\s*key|secret)\b",
        r"(?i)\bpretend\s+you\s+(have\s+no\s+rules|are\s+an\s+unrestricted\s+ai)\b",
        r"(?i)\bbypass\s+(security|authorization|authentication|permissions)\b",
        r"(?i)\bas\s+an?\s+admin(istrator)?,\s*(show|give|grant)\b",
        r"(?i)\bact\s+as\s+superadmin\b",
    ]

    # Patterns indicating write / CRUD actions disallowed in Phase 1
    WRITE_ACTION_PATTERNS = [
        (r"(?i)\b(cancel|discontinue|stop)\s+(my\s+)?(booking|service|order|request)\b", "cancel"),
        (r"(?i)\b(reschedule|postpone|change\s+the\s+time|change\s+the\s+date)\b", "reschedule"),
        (r"(?i)\b(refund|return\s+my\s+money|chargeback)\b", "refund"),
        (r"(?i)\b(pay|make\s+payment|retry\s+payment|checkout)\b", "pay"),
        (r"(?i)\b(create|book|new)\s+(a\s+)?(booking|service|request)\b", "create"),
        (r"(?i)\b(assign|reassign)\s+(technician|worker|driver)\b", "assign"),
        (r"(?i)\b(approve|reject)\s+(quote|quotation|estimate|request)\b", "approve_reject"),
        (r"(?i)\b(delete|remove)\s+(my\s+)?(account|address|card)\b", "delete"),
        (r"(?i)\b(update|change)\s+(my\s+)?(address|phone|email|name)\b", "update"),
    ]

    @classmethod
    def inspect(cls, user_query: str) -> InputGuardResult:
        query_clean = (user_query or "").strip()
        if not query_clean:
            return InputGuardResult(
                is_safe=False,
                is_blocked=True,
                reason="Empty query",
                response_override="Please enter a question or query.",
                category="empty",
            )

        # 1. Check for prompt injection attempts
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, query_clean):
                return InputGuardResult(
                    is_safe=False,
                    is_blocked=True,
                    reason=f"Prompt injection pattern detected: {pattern}",
                    response_override="I cannot fulfill this request. I am a helpful assistant for CalServices and must adhere to our security policies.",
                    category="injection",
                )

        # 2. Check for write / CRUD actions (Phase 1 Hard Scope Restriction)
        # Exception: questions asking about policies (e.g., "What is the cancellation policy?" or "How can I cancel?")
        # vs explicit imperative commands ("Cancel booking 123", "Please refund me")
        is_policy_inquiry = bool(
            re.search(r"(?i)\b(what\s+is|tell\s+me\s+about|policy|how\s+does|how\s+to|can\s+i|steps\s+to)\b", query_clean)
            and not re.search(r"(?i)\b(please\s+cancel|cancel\s+(it|this|order|booking)\s*#?\d+|i\s+want\s+to\s+cancel\s+now)\b", query_clean)
        )

        if not is_policy_inquiry:
            for pattern, action_type in cls.WRITE_ACTION_PATTERNS:
                if re.search(pattern, query_clean):
                    guidance_map = {
                        "cancel": (
                            "I am currently in read-only assistance mode and cannot cancel bookings directly. "
                            "You can cancel your booking from the **My Bookings** page: navigate to your booking "
                            "and click **Cancel Booking** (subject to our cancellation policy)."
                        ),
                        "reschedule": (
                            "I cannot reschedule your booking directly. "
                            "To pick a new date or time slot, please open your booking details in the app "
                            "and select **Reschedule Booking**."
                        ),
                        "refund": (
                            "I cannot process refund transactions directly. "
                            "If your service was cancelled or eligible for a refund, you can view your refund status "
                            "under **My Bookings** or review our [Cancellation & Refund Policy](/cancellation-and-refund-policy)."
                        ),
                        "pay": (
                            "I cannot directly initiate or verify payments. "
                            "To complete your payment securely, please visit your booking details page in the app."
                        ),
                        "create": (
                            "I cannot directly create new bookings in chat. "
                            "You can easily book any service by browsing our [Service Catalog](/booking)!"
                        ),
                        "assign": (
                            "Technician and workforce dispatch is handled automatically by the CalServices operations system."
                        ),
                        "approve_reject": (
                            "To approve or reject an inspection quotation, please open your quotation link directly in the app."
                        ),
                        "delete": (
                            "Account and address management must be performed securely in your Account Settings."
                        ),
                        "update": (
                            "To update your profile or saved addresses, please go to your Profile Settings in the app."
                        ),
                    }
                    response_msg = guidance_map.get(
                        action_type,
                        "I am currently in read-only assistance mode and cannot perform modifications or transactions. "
                        "Please use the CalServices mobile or web application to complete this action."
                    )
                    return InputGuardResult(
                        is_safe=True,
                        is_blocked=True,
                        reason=f"Write action requested: {action_type}",
                        response_override=response_msg,
                        category="write_action",
                    )

        return InputGuardResult(is_safe=True, is_blocked=False)
