"""
service_requests/services/technician_tracking.py

One place that decides what happens to an incoming technician GPS fix.

Before this existed there were two ingestion paths with different
behaviour, and the divergence was doing real damage:

* technician_views.py (the technician app posting directly) wrote a
  TechnicianLocation row with heading/speed/accuracy and updated the
  denormalised snapshot on ServiceRequest.
* workforce_integration/views.py (the vendor app's webhook) wrote only
  latitude/longitude onto ServiceRequest -- no telemetry row at all, so
  heading, speed and accuracy sent by the vendor were silently discarded,
  and no ordering check, so a packet that arrived late overwrote a newer
  position that was already stored.

The second one matters more than it sounds. Mobile networks reorder and
retry: a fix captured at 17:15 can easily arrive after one captured at
17:20 (a retry after a dead spot, a queued burst leaving a tunnel). With
no capture-time comparison the customer's map pin jumps backwards, and
because the stale value is persisted it stays wrong after a page reload --
the frontend's own out-of-order guard only protects one live socket
session, not the stored snapshot.

The ordering rule here is deliberately about CAPTURE time, not arrival
time. Arrival order is exactly the thing that cannot be trusted.

This module intentionally does not do movement filtering (the "GPS noise"
suppression in technician_views.py). Filtering is about how much to write;
this is about whether a fix is real. Keeping them apart means the webhook
cannot silently inherit a threshold tuned for a different transport.
"""
import logging
from decimal import Decimal

from django.db.models.functions import Coalesce
from django.utils import timezone

logger = logging.getLogger("service_requests.tracking")

# A fix whose capture time is older than the newest one already stored is
# rejected. Equal timestamps are accepted: two fixes can legitimately share
# a second, and rejecting them would drop real movement.
_STALE = "stale"
_APPLIED = "applied"
_INVALID = "invalid"


def latest_fix(sr):
    """
    The most recent GPS fix for a booking, ordered by when the device
    captured it -- falling back to arrival time for rows written before
    captured_at existed, which is the best available answer for them.
    """
    from service_requests.models import TechnicianLocation

    return (
        TechnicianLocation.objects.filter(booking=sr)
        .annotate(effective_at=Coalesce("captured_at", "created_at"))
        .order_by("-effective_at")
        .first()
    )


def effective_time(fix):
    """When a stored fix was captured, or received if capture time is unknown."""
    if fix is None:
        return None
    return fix.captured_at or fix.created_at


def record_technician_fix(
    sr,
    *,
    latitude,
    longitude,
    accuracy=None,
    heading=0.0,
    speed=0.0,
    captured_at=None,
    technician=None,
    location_name=None,
    transition_accepted_to_on_the_way=False,
):
    """
    Record one GPS fix for `sr`, unless it is older than what we already have.

    Returns (outcome, fix) where outcome is:
      "applied" -- stored, and the ServiceRequest snapshot was updated
      "stale"   -- ignored; an equal-or-newer fix is already stored
      "invalid" -- coordinates missing or out of range

    Never raises on bad input: a malformed coordinate in one webhook must
    not turn the whole delivery into a 500 the vendor app will not retry.
    """
    from service_requests.models import ServiceRequest, TechnicianLocation

    try:
        lat = float(latitude)
        lng = float(longitude)
    except (TypeError, ValueError):
        return _INVALID, None

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return _INVALID, None

    captured = captured_at or timezone.now()
    previous = latest_fix(sr)
    previous_at = effective_time(previous)
    if previous_at is not None and captured < previous_at:
        logger.info(
            "[TRACKING] Dropping stale fix for %s: captured %s is older than stored %s",
            getattr(sr, "request_id", sr.pk), captured.isoformat(), previous_at.isoformat(),
        )
        return _STALE, previous

    try:
        acc = float(accuracy) if accuracy is not None else None
    except (TypeError, ValueError):
        acc = None
    try:
        hdg = float(heading or 0.0)
    except (TypeError, ValueError):
        hdg = 0.0
    try:
        spd = float(speed or 0.0)
    except (TypeError, ValueError):
        spd = 0.0

    fix = TechnicianLocation.objects.create(
        booking=sr,
        technician=technician,
        latitude=Decimal(str(round(lat, 6))),
        longitude=Decimal(str(round(lng, 6))),
        accuracy=acc,
        heading=hdg,
        speed=spd,
        captured_at=captured,
    )

    sr.technician_latitude = fix.latitude
    sr.technician_longitude = fix.longitude
    update_fields = ["technician_latitude", "technician_longitude", "updated_at"]

    if location_name:
        sr.technician_location_name = location_name
        update_fields.append("technician_location_name")

    if transition_accepted_to_on_the_way and sr.status == ServiceRequest.Status.ACCEPTED:
        sr.status = ServiceRequest.Status.ON_THE_WAY
        update_fields.append("status")

    sr.save(update_fields=update_fields)
    return _APPLIED, fix
