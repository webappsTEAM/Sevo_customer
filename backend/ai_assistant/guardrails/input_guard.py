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

    # Patterns indicating write / CRUD actions disallowed in Phase 1 (imperative commands)
    WRITE_ACTION_PATTERNS = [
        (r"(?i)\b(cancel|discontinue|stop)\s+(my\s+)?(booking|service|order|request)\b", "cancel"),
        (r"(?i)\b(reschedule|postpone|change\s+the\s+time|change\s+the\s+date)\b", "reschedule"),
        (r"(?i)\b(refund|return\s+my\s+money|chargeback)\b", "refund"),
        (r"(?i)\b(pay|make\s+payment|retry\s+payment|checkout)\b", "pay"),
        (r"(?i)\b(confirm|finalize|place|execute)\s+(and\s+pay\s+for\s+)?(my\s+)?(booking|order)\s+(now|immediately)\b", "create"),
        (r"(?i)\b(assign|reassign)\s+(technician|worker|driver)\b", "assign"),
        (r"(?i)\b(approve|reject)\s+(quote|quotation|estimate|request)\b", "approve_reject"),
        (r"(?i)\b(delete|remove)\s+(my\s+)?(account|address|card)\b", "delete"),
        (r"(?i)\b(update|change)\s+(my\s+)?(address|phone|email|name)\b", "update"),
    ]

    # Patterns indicating informational queries, guidance, service discovery, or policy questions
    INFORMATIONAL_PATTERNS = [
        r"(?i)\bhow\s+(do|can|to|would|should|does)\s*(i|we|a\s+user|a\s+customer)?\b",
        r"(?i)\bwhat\s+(is|are|services|packages|options|categories)\b",
        r"(?i)\btell\s+me\s+(about|how|steps|what|more)\b",
        r"(?i)\b(guide|help)\s+(me|us)?\b",
        r"(?i)\b(steps?|instructions?|process|procedure|flow)\s+(to|for|of)\b",
        r"(?i)\b(can|could)\s+i\s+(book|order|schedule|get|request|hire)\b",
        r"(?i)\b(where|when)\s+(can|do|to)\s*(i)?\b",
        r"(?i)\b(i\s+want\s+to|i\s+would\s+like\s+to|looking\s+to|need\s+to|wish\s+to)\s+(book|know|find|explore|schedule|order)\b",
        r"(?i)\b(available\s+(services?|packages?)|(services?|packages?)\s+(available|list|options|offered|catalog))\b",
        r"(?i)\b(explore|browse|view|show|list)\s+(services?|packages?|catalog|offerings?)\b",
        r"(?i)\bpolicy\b",
        r"(?i)\b(faq|question|inquiry)\b",
        r"(?i)^(book|booking)\s+(services?|a\s+service|\w+\s+service)?\??$",
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

        # 2. Check if this is an informational / guidance query or service inquiry
        is_informational = any(re.search(p, query_clean) for p in cls.INFORMATIONAL_PATTERNS)
        is_imperative_write = bool(
            re.search(
                r"(?i)\b("
                r"please\s+(cancel|refund|reschedule|delete)"
                r"|cancel\s+(it|this|order|booking)\s*#?\d+"
                r"|i\s+want\s+to\s+cancel\s+now"
                r"|give\s+me\s+(a\s+)?refund"
                r"|reschedule\s+(my\s+)?(appointment|booking)\s+to"
                r")\b",
                query_clean,
            )
        )

        # Only evaluate write actions if it's an imperative mutation or not an informational inquiry
        if is_imperative_write or not is_informational:
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
                            "I operate in read-only mode and cannot place orders directly inside the chat. "
                            "However, booking a service is quick and easy:\n\n"
                            "1. **Explore Catalog**: Browse our [Service Catalog](/booking) and pick your required category.\n"
                            "2. **Select Package**: Choose your required service package with transparent upfront pricing.\n"
                            "3. **Choose Date & Slot**: Pick your preferred appointment date and arrival time window.\n"
                            "4. **Add Address**: Provide your service address (we verify serviceability instantly).\n"
                            "5. **Secure Checkout**: Confirm your booking via UPI, Card, NetBanking, or COD.\n\n"
                            "Once booked, you can track your assigned technician live right here in the app!"
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
