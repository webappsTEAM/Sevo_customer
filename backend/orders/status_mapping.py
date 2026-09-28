"""
orders/status_mapping.py

Explicit, dictionary-driven status mapping and forward-only state progression
for Seller Hub Marketplace orders synchronized from Sevo-vendor events.
No substring matching or fuzzy mapping.
"""
import logging
from typing import Optional

logger = logging.getLogger("orders.marketplace.status_mapping")

# Authoritative vendor-to-customer status mapping table
VENDOR_TO_CUSTOMER_STATUS_MAP = {
    "NEW": "CONFIRMED",
    "ACCEPTED": "CONFIRMED",
    "PICKING": "PACKING",
    "PACKED": "PACKING",
    "READY_FOR_PICKUP": "READY_FOR_PICKUP",
    "HANDED_OVER": "OUT_FOR_DELIVERY",
    "DELIVERED": "DELIVERED",
    "CANCELLED": "CANCELLED",
}

# Customer status lifecycle progression hierarchy (rank order)
CUSTOMER_STATUS_RANKS = {
    "CONFIRMED": 10,
    "PACKING": 20,
    "READY_FOR_PICKUP": 30,
    "OUT_FOR_DELIVERY": 40,
    "DELIVERED": 50,
    "CANCELLED": 99,
}

TERMINAL_STATUSES = {"DELIVERED", "CANCELLED"}


def map_vendor_status(vendor_status: Optional[str]) -> Optional[str]:
    """
    Strict mapping from Vendor SellerOrder status to Customer MarketplaceOrder status.
    Returns None if vendor_status is unknown or unmapped (does not guess or fall back).
    """
    if not vendor_status or not isinstance(vendor_status, str):
        return None
    cleaned = vendor_status.strip().upper()
    return VENDOR_TO_CUSTOMER_STATUS_MAP.get(cleaned)


def is_forward_transition(current_status: str, target_status: str) -> bool:
    """
    Validates if transitioning from current_status to target_status moves the order forward.
    Never permits moving backward, and never permits transitioning out of terminal states (DELIVERED, CANCELLED).
    """
    if not current_status or not target_status:
        return False

    current_clean = current_status.strip().upper()
    target_clean = target_status.strip().upper()

    # Terminal states are immutable
    if current_clean in TERMINAL_STATUSES:
        return False

    current_rank = CUSTOMER_STATUS_RANKS.get(current_clean, 0)
    target_rank = CUSTOMER_STATUS_RANKS.get(target_clean, 0)

    # CANCELLED can occur from any non-terminal state
    if target_clean == "CANCELLED":
        return True

    # Same rank is idempotent / no-op (e.g., CONFIRMED -> CONFIRMED from NEW -> ACCEPTED)
    return target_rank >= current_rank
