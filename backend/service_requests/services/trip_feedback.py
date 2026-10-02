"""
Customer rating of a delivered Goods & Transport / Packers & Movers trip.

Home-services bookings get their feedback token when an admin *verifies* the job
(AdminSRVerifyView). A delivery has no such step -- the driver completes it -- so
nothing ever issued a token for a GT trip and the customer had no way to rate the
driver. This module issues one (once) as soon as the trip is delivered and
describes it for the tracking payload.
"""
import logging

logger = logging.getLogger(__name__)

_RATEABLE_STATUSES = frozenset({"completed", "closed", "verified", "feedback_pending", "feedback_received"})
_RATEABLE_LEGS = frozenset({"DELIVERED", "COMPLETED"})
_NEVER_RATEABLE_STATUSES = frozenset({"cancelled", "rejected", "unable_to_complete"})


def trip_is_rateable(sr) -> bool:
    status = str(getattr(sr, "status", "") or "").lower()
    if status in _NEVER_RATEABLE_STATUSES:
        return False
    if status in _RATEABLE_STATUSES:
        return True
    return str(getattr(sr, "logistics_leg", "") or "").upper() in _RATEABLE_LEGS


def _snapshot_technician(fb, sr):
    """Remember who did the trip, so a later reassignment cannot move the rating (HS-E-01)."""
    if fb.technician_id and fb.technician_name_snapshot:
        return
    try:
        assignment = (
            sr.assignments.filter(status__in=["accepted", "completed"])
            .order_by("-accepted_at", "-id")
            .first()
        )
    except Exception:
        assignment = None
    tech_id = (getattr(assignment, "technician_id", "") if assignment else "") or ""
    tech_name = (getattr(assignment, "technician_name", "") if assignment else "") or getattr(sr, "technician_name", "") or ""
    changed = []
    if tech_id and not fb.technician_id:
        fb.technician_id = tech_id
        changed.append("technician_id")
    if tech_name and not fb.technician_name_snapshot:
        fb.technician_name_snapshot = tech_name
        changed.append("technician_name_snapshot")
    if changed:
        fb.save(update_fields=changed)


def ensure_trip_feedback(sr):
    """The trip's ServiceFeedback row (created on first call), or None if it is not rateable."""
    from service_requests.models import ServiceFeedback

    if not trip_is_rateable(sr):
        return None
    fb, _ = ServiceFeedback.objects.get_or_create(service_request=sr)
    _snapshot_technician(fb, sr)
    return fb


def trip_feedback_summary(sr):
    """Payload block for the customer's tracking view; None while the trip is not rateable."""
    try:
        fb = ensure_trip_feedback(sr)
    except Exception:
        logger.exception("Could not prepare trip feedback for booking %s", getattr(sr, "pk", None))
        return None
    if fb is None:
        return None
    return {
        "token": str(fb.feedback_token),
        "submitted": bool(fb.is_submitted),
        "rating": fb.rating if fb.is_submitted else None,
    }
