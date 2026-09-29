"""
Runtime access to the Admin-editable GT operational limits (GTOperationsConfig).
No row => the historical defaults, so nothing changes until an admin edits something.
"""
from decimal import Decimal

DEFAULTS = {
    "gt_quote_validity_minutes": 15,
    "pm_instant_quote_validity_minutes": 30,
    "pm_estimate_validity_hours": 48,
    "online_payment_window_minutes": 30,
    "high_value_consignment_threshold": Decimal("25000"),
    "checkpoint_radius_meters": 250,
    "delivery_otp_ttl_minutes": 30,
    "max_otp_attempts": 5,
    "delivery_otp_required": True,
    "allow_wallet_part_payment": False,
    "wallet_topup_enabled": False,
    "wallet_max_topup": None,
    "wallet_max_balance": None,
}


def _row():
    try:
        from ..models import GTOperationsConfig
        return GTOperationsConfig.objects.filter(is_active=True).order_by("-id").first()
    except Exception:
        return None


def ops(name):
    row = _row()
    value = getattr(row, name, None) if row is not None else None
    if value is None:
        return DEFAULTS[name]
    if name in ("high_value_consignment_threshold", "delivery_otp_required", "allow_wallet_part_payment",
                "wallet_topup_enabled", "wallet_max_topup", "wallet_max_balance"):
        return value
    if int(value) < 1:
        return DEFAULTS[name]
    return value
