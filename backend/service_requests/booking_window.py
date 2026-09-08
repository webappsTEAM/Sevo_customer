"""
Same-day booking window rules.

Fixes: the only booking cut-off in the product lived in the customer frontend
(utils/vegetableSchedule.js) and was evaluated against the browser's own clock,
so it was both bypassable and wrong for anyone whose device timezone was not
IST. The booking-creation serializer validated that preferred_date was not in
the past and nothing else -- there was no time-of-day check anywhere on the
server, so a client could submit any slot at all, including one that had
already passed earlier the same day.

Everything here works in the project timezone (settings.TIME_ZONE, currently
Asia/Kolkata) via django.utils.timezone, never a naive datetime.now().

Both values are settings-driven so they can be tuned per environment without a
code change:
    BOOKING_SAME_DAY_CUTOFF_HOUR  (default 18, i.e. 6 PM local)
    BOOKING_MIN_LEAD_MINUTES      (default 60)
"""
import datetime
import logging

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

DEFAULT_CUTOFF_HOUR = 18
DEFAULT_MIN_LEAD_MINUTES = 60

# Accepted spellings for a slot, in the order they are tried. The frontend
# sends 24-hour "HH:MM"; the 12-hour forms are accepted because several of the
# vertical booking pages render slots as "7:00 AM" and older rows use that too.
_TIME_FORMATS = ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I %p", "%I:%M%p")


def get_cutoff_hour():
    try:
        hour = int(getattr(settings, "BOOKING_SAME_DAY_CUTOFF_HOUR", DEFAULT_CUTOFF_HOUR))
    except (TypeError, ValueError):
        return DEFAULT_CUTOFF_HOUR
    return hour if 0 <= hour <= 23 else DEFAULT_CUTOFF_HOUR


def get_min_lead_minutes():
    try:
        return max(0, int(getattr(settings, "BOOKING_MIN_LEAD_MINUTES", DEFAULT_MIN_LEAD_MINUTES)))
    except (TypeError, ValueError):
        return DEFAULT_MIN_LEAD_MINUTES


def parse_slot_time(preferred_time):
    """Best-effort parse of a slot string into a time. Returns None if unknown."""
    if not preferred_time:
        return None
    if isinstance(preferred_time, datetime.time):
        return preferred_time
    raw = str(preferred_time).strip()
    if not raw:
        return None
    # Ranges such as "07:00 - 09:00" or "7:00 AM - 9:00 AM": the start governs.
    for separator in ("-", "–", "to "):
        if separator in raw:
            raw = raw.split(separator)[0].strip()
            break
    for fmt in _TIME_FORMATS:
        try:
            return datetime.datetime.strptime(raw.upper().replace(".", ""), fmt).time()
        except ValueError:
            continue
    logger.debug("Unrecognised preferred_time %r; skipping slot-time validation.", preferred_time)
    return None


def is_same_day_closed(now=None):
    """True once today's booking window has passed."""
    now = now or timezone.localtime()
    return now.hour >= get_cutoff_hour()


def next_bookable_date(now=None):
    """The earliest date a customer can still book, in local time."""
    now = now or timezone.localtime()
    today = now.date()
    return today + datetime.timedelta(days=1) if is_same_day_closed(now) else today


def cutoff_label():
    hour = get_cutoff_hour()
    suffix = "AM" if hour < 12 else "PM"
    display = hour % 12 or 12
    return f"{display}:00 {suffix}"


def validate_booking_slot(preferred_date, preferred_time=None, now=None):
    """
    Validate a requested date/slot against the booking window.

    Returns an error string suitable for showing to a customer, or None when
    the slot is acceptable. Only same-day bookings are constrained; future
    dates are always allowed, and an unparseable slot string falls back to the
    day-level rule rather than rejecting a booking we simply cannot read.
    """
    if preferred_date is None:
        return None

    now = now or timezone.localtime()
    today = now.date()

    if preferred_date < today:
        return "Preferred date cannot be in the past."

    if preferred_date > today:
        return None

    if is_same_day_closed(now):
        return (
            f"Same-day bookings close at {cutoff_label()}. "
            f"Please choose {next_bookable_date(now).strftime('%d %b %Y')} or a later date."
        )

    slot_time = parse_slot_time(preferred_time)
    if slot_time is None:
        return None

    slot_dt = timezone.make_aware(
        datetime.datetime.combine(preferred_date, slot_time),
        timezone.get_current_timezone(),
    )
    earliest = now + datetime.timedelta(minutes=get_min_lead_minutes())
    if slot_dt < earliest:
        return (
            f"That time slot has already passed or is too soon. "
            f"Please choose a slot at least {get_min_lead_minutes()} minutes from now."
        )
    return None
