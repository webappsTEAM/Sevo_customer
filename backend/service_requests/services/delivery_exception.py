"""
Driver-reported trip exceptions (receiver unavailable, customer unreachable, ...).

Porter's public help centre says the driver and support handle a customer / receiver who cannot
be reached, and that waiting time is charged; it publishes no automatic cancellation or return
fee, so nothing is cancelled or priced here. The exception is recorded on the booking, the
customer is told, and the trip continues (waiting charges keep accruing through the existing
Admin waiting policy). It resolves itself when the trip moves to a later leg.
"""
import logging

from django.utils import timezone

logger = logging.getLogger(__name__)

# code -> (label, legs it can be reported on)
EXCEPTION_TYPES = {
    "CUSTOMER_UNREACHABLE_AT_PICKUP": ("Customer not reachable at pickup", ("EN_ROUTE_PICKUP", "LOADING", "")),
    "PICKUP_ADDRESS_ISSUE": ("Pickup address could not be found", ("EN_ROUTE_PICKUP", "")),
    "RECEIVER_UNAVAILABLE": ("Receiver not available at drop", ("EN_ROUTE_DROP", "UNLOADING")),
    "RECEIVER_REFUSED": ("Receiver refused the delivery", ("EN_ROUTE_DROP", "UNLOADING")),
    "DROP_ADDRESS_ISSUE": ("Drop address could not be found", ("EN_ROUTE_DROP", "UNLOADING")),
}


def exception_error(code, leg, notes):
    """Why a report is invalid, or None."""
    if code not in EXCEPTION_TYPES:
        return f"Unknown exception type. Choose one of: {', '.join(EXCEPTION_TYPES)}"
    if leg not in EXCEPTION_TYPES[code][1]:
        return f"'{code}' cannot be reported while the trip is at stage '{leg or 'not started'}'."
    if len((notes or "").strip()) < 5:
        return "Please add a short note describing what happened."
    return None


def record_delivery_exception(sr, payload):
    """Store an OPEN exception on the booking. Returns True when it is new (not a retry)."""
    code = str(payload.get("exception_type") or "").strip().upper()
    if code not in EXCEPTION_TYPES:
        logger.warning("Ignoring unknown delivery exception %r for booking %s", code, sr.id)
        return False
    leg = str(payload.get("leg") or sr.logistics_leg or "").strip().upper()
    current = sr.delivery_exception if isinstance(sr.delivery_exception, dict) else {}
    if current.get("status") == "OPEN" and current.get("type") == code and current.get("leg") == leg:
        return False                                          # retried webhook
    sr.delivery_exception = {
        "type": code,
        "label": EXCEPTION_TYPES[code][0],
        "notes": str(payload.get("notes") or "")[:500],
        "leg": leg,
        "status": "OPEN",
        "reported_at": str(payload.get("reported_at") or timezone.now().isoformat()),
    }
    sr.save(update_fields=["delivery_exception", "updated_at"])
    return True


def resolve_delivery_exception(sr):
    cur = sr.delivery_exception if isinstance(sr.delivery_exception, dict) else {}
    if cur.get("status") != "OPEN":
        return False
    sr.delivery_exception = {**cur, "status": "RESOLVED", "resolved_at": timezone.now().isoformat()}
    sr.save(update_fields=["delivery_exception", "updated_at"])
    return True
