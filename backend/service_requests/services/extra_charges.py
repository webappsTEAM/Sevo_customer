"""
Toll / parking pass-throughs.

A driver reports an actual toll or parking receipt during a GT trip. Porter passes these to the
customer at actuals; SEVO does the same, bounded by the Admin GTExtraChargePolicy (disabled by
default, so nothing is accepted or billed until an admin enables it). Entries are stored on
ServiceRequest.extra_charges, added to the final fare at reconciliation, and shown on the invoice.
"""
import logging
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.utils import timezone

logger = logging.getLogger(__name__)
CENT = Decimal("0.01")
TYPES = {"TOLL": "Toll", "PARKING": "Parking"}
ALLOWED_LEGS = ("EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "ARRIVED_PICKUP", "ARRIVED_DROP", "IN_TRANSIT")


def _amount(value):
    try:
        d = Decimal(str(value)).quantize(CENT, rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError, TypeError):
        return None
    return d if d > 0 else None


def applied_entries(booking):
    items = booking.extra_charges if isinstance(booking.extra_charges, list) else []
    return [e for e in items if isinstance(e, dict) and e.get("status") == "APPLIED"]


def extra_charges_total(booking):
    return sum((Decimal(str(e.get("amount") or 0)) for e in applied_entries(booking)), Decimal("0.00"))


def extra_charge_error(policy, kind, amount, current_total=Decimal("0.00")):
    """Why a receipt cannot be accepted, or None. Shared with the driver-side pre-check."""
    if policy is None:
        return "Toll and parking pass-through is not enabled."
    if kind not in TYPES:
        return f"Unknown charge type. Choose one of: {', '.join(TYPES)}"
    if (kind == "TOLL" and not policy.allow_toll) or (kind == "PARKING" and not policy.allow_parking):
        return f"{TYPES[kind]} charges are not accepted."
    if _amount(amount) is None:
        return "Enter the receipt amount."
    amt = _amount(amount)
    if policy.max_amount_per_item is not None and amt > policy.max_amount_per_item:
        return f"A single receipt cannot exceed {policy.max_amount_per_item}."
    if policy.max_total_per_booking is not None and current_total + amt > policy.max_total_per_booking:
        return f"Total pass-through for a booking cannot exceed {policy.max_total_per_booking}."
    return None


def record_extra_charge(sr, payload):
    """Append an APPLIED entry when policy allows. Idempotent on payload['charge_id']. Returns the entry or None."""
    from ..models import get_gt_extra_charge_policy
    kind = str(payload.get("charge_type") or "").strip().upper()
    charge_id = str(payload.get("charge_id") or "").strip()
    items = list(sr.extra_charges) if isinstance(sr.extra_charges, list) else []
    if charge_id and any(e.get("charge_id") == charge_id for e in items):
        return None                                            # retried webhook
    policy = get_gt_extra_charge_policy(sr.service_category)
    err = extra_charge_error(policy, kind, payload.get("amount"), extra_charges_total(sr))
    if not err and policy is not None and getattr(policy, "require_receipt_photo", False) \
            and not str(payload.get("receipt_photo_url") or "").strip():
        err = "A receipt photo is required."
    if err:
        logger.warning("Extra charge rejected for booking %s: %s", sr.pk, err)
        return None
    entry = {
        "charge_id": charge_id or f"c{len(items) + 1}",
        "type": kind,
        "label": TYPES[kind],
        "amount": str(_amount(payload.get("amount"))),
        "note": str(payload.get("note") or "")[:200],
        "receipt": str(payload.get("receipt") or "")[:500],
        "receipt_photo_url": str(payload.get("receipt_photo_url") or "")[:500],
        "status": "APPLIED",
        "reported_at": str(payload.get("reported_at") or timezone.now().isoformat()),
    }
    items.append(entry)
    sr.extra_charges = items
    sr.save(update_fields=["extra_charges", "updated_at"])
    return entry
