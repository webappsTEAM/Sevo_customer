"""
Service-wise Time Slot Management Core Engine.

Single source of truth for:
1. Service resolution (priority: service_id > service slug > package > unambiguous category).
2. Schedule resolution & precedence (Service active > Date override > Weekly schedule > Service default config).
3. Dynamic slot generation with lead-time/past-time filtering and slot capacity enforcement.
4. Booking creation availability re-validation & concurrency safety.
"""
import datetime
import json
import logging
import os
import re
from django.db import transaction, models
from django.db.models import Q
from django.utils import timezone

from service_requests.models import (
    Service,
    Package,
    CatalogCategory,
    ServiceRequest,
    ServiceTimeSlotConfig,
    ServiceWeeklySchedule,
    ServiceDateOverride,
)
from service_requests.booking_window import (
    get_min_lead_minutes,
    parse_slot_time,
)

logger = logging.getLogger(__name__)

# Canonical defaults when a service has no configured time-slot row
DEFAULT_START_TIME = datetime.time(9, 0)      # 09:00 AM
DEFAULT_END_TIME = datetime.time(18, 0)        # 06:00 PM
DEFAULT_SLOT_DURATION_MINUTES = 30
DEFAULT_SLOT_CAPACITY = 1

GLOBAL_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "time_slot_global_config.json")


def _parse_time(val):
    if not val:
        return None
    if isinstance(val, datetime.time):
        return val
    s = str(val).strip()
    for fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M%p"):
        try:
            return datetime.datetime.strptime(s, fmt).time()
        except ValueError:
            pass
    return None


def get_global_time_slot_defaults():
    defaults = {
        "default_start_time": "09:00",
        "default_end_time": "18:00",
        "slot_duration_minutes": 30,
        "slot_capacity": 1,
        "is_active": True,
        "weekly_schedule": [
            {
                "day_of_week": i,
                "weekday": i,
                "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
                "is_open": True,
                "use_default_hours": True,
                "start_time": "09:00",
                "end_time": "18:00",
                "slot_capacity": 1,
            }
            for i in range(7)
        ]
    }
    if os.path.exists(GLOBAL_CONFIG_FILE):
        try:
            with open(GLOBAL_CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                defaults.update(saved)
        except Exception as e:
            logger.warning(f"Error loading global time slot config: {e}")
    return defaults


def save_global_time_slot_defaults(data):
    current = get_global_time_slot_defaults()
    for k in ("default_start_time", "default_end_time", "slot_duration_minutes", "slot_capacity", "is_active", "weekly_schedule"):
        if k in data and data[k] is not None:
            current[k] = data[k]
    try:
        with open(GLOBAL_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(current, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving global time slot config: {e}")
        raise
    return current


# Statuses that do NOT consume capacity
NON_CAPACITY_STATUSES = {
    ServiceRequest.Status.CANCELLED,
    ServiceRequest.Status.REJECTED,
    ServiceRequest.Status.DRAFT,
}


def _find_category(raw_val):
    """
    Tolerant category lookup supporting slug (with or without underscores/hyphens), ID, or name.
    """
    if not raw_val:
        return None
    s = str(raw_val).strip()
    if not s or s.lower() in ("resolve", "none", "null", "undefined"):
        return None

    # 1. Exact slug match
    cat = CatalogCategory.objects.filter(slug__iexact=s).first()
    if cat:
        return cat

    # 2. Interchangeable hyphen and underscore
    if "_" in s:
        cat = CatalogCategory.objects.filter(slug__iexact=s.replace("_", "-")).first()
        if cat:
            return cat
    if "-" in s:
        cat = CatalogCategory.objects.filter(slug__iexact=s.replace("-", "_")).first()
        if cat:
            return cat

    # 3. Numeric ID
    if s.isdigit():
        cat = CatalogCategory.objects.filter(id=int(s)).first()
        if cat:
            return cat

    # 4. Exact name
    cat = CatalogCategory.objects.filter(name__iexact=s).first()
    if cat:
        return cat

    # 5. Normalized alphanumeric match
    clean = re.sub(r"[^a-zA-Z0-9]", "", s).lower()
    if clean:
        for c in CatalogCategory.objects.all():
            cat_clean = re.sub(r"[^a-zA-Z0-9]", "", c.slug or "").lower()
            if cat_clean and cat_clean == clean:
                return c
            name_clean = re.sub(r"[^a-zA-Z0-9]", "", c.name or "").lower()
            if name_clean and name_clean == clean:
                return c

    # 6. Name contains
    return CatalogCategory.objects.filter(name__icontains=s).first()


def _pick_primary_service_for_category(cat, hint_text=None):
    """
    Selects the most suitable active service for a category without throwing errors.
    Prioritizes:
    1. Exact slug or name match with hint_text.
    2. Prefix/word matches on category tokens (e.g. 'ac' in 'ac_appliance').
    3. Service with active custom time slot config.
    4. First active service ordered by id.
    """
    services = Service.objects.filter(category=cat, is_active=True)
    if not services.exists():
        return Service.objects.filter(category=cat).first()

    if services.count() == 1:
        return services.first()

    # 1. Exact match with hint_text
    if hint_text:
        ht = str(hint_text).strip().lower()
        exact = services.filter(Q(slug__iexact=ht) | Q(name__iexact=ht)).first()
        if exact:
            return exact

    # 2. Token-based disambiguation
    tokens = []
    if hint_text:
        tokens.extend(re.split(r"[\s_\-]+", str(hint_text).lower()))
    if cat.slug:
        tokens.extend(re.split(r"[\s_\-]+", str(cat.slug).lower()))
    if cat.name:
        tokens.extend(re.split(r"[\s_\-]+", str(cat.name).lower()))

    stop_words = {"and", "&", "service", "services", "repair", "repairs", "work", "works", "appliance", "appliances"}
    meaningful = [t for t in tokens if len(t) >= 2 and t not in stop_words]

    for tok in meaningful:
        matched = services.filter(
            Q(slug__istartswith=f"{tok}-") |
            Q(slug__iexact=tok) |
            Q(name__istartswith=f"{tok} ") |
            Q(name__icontains=f" {tok} ")
        ).first()
        if matched:
            return matched

    # 3. Service with custom time slot config
    configured = services.filter(time_slot_config__is_active=True).first()
    if configured:
        return configured

    # 4. Fallback to first active service ordered by id
    return services.order_by("id").first()


def resolve_service(service_param=None, package_param=None, category_param=None):
    """
    Resolve a bookable Service using the priority:
    1. Explicit service_id or service slug / name
    2. Package -> Service relationship
    3. Category resolution (picks primary active service without 404 error)
    4. Substring / partial match on Service

    Returns:
        (service_instance, None) on success
        (None, error_message) on failure
    """
    # 1 & 2: Explicit service_id or service slug
    if service_param is not None and str(service_param).strip().lower() not in ("", "resolve", "none", "null", "undefined"):
        raw_val = str(service_param).strip()

        # 1. Numeric ID
        if raw_val.isdigit():
            svc = Service.objects.filter(id=int(raw_val)).first()
            if svc:
                return svc, None

        # 2. Slug
        svc = Service.objects.filter(slug__iexact=raw_val).first()
        if svc:
            return svc, None

        # 3. Exact name match
        svc = Service.objects.filter(name__iexact=raw_val).first()
        if svc:
            return svc, None

        # 4. Package slug or ID passed as service_param
        pkg = Package.objects.filter(slug__iexact=raw_val).select_related("service").first()
        if not pkg and raw_val.isdigit():
            pkg = Package.objects.filter(id=int(raw_val)).select_related("service").first()
        if pkg and pkg.service:
            return pkg.service, None

        # 5. Check if service_param was actually a Category slug/name
        cat = _find_category(raw_val)
        if cat:
            svc = _pick_primary_service_for_category(cat, hint_text=raw_val)
            if svc:
                return svc, None

    # 3. Explicit Package parameter
    if package_param is not None and str(package_param).strip().lower() not in ("", "none", "null", "undefined"):
        raw_pkg = str(package_param).strip()
        if raw_pkg.isdigit():
            pkg = Package.objects.filter(id=int(raw_pkg)).select_related("service").first()
        else:
            pkg = Package.objects.filter(slug__iexact=raw_pkg).select_related("service").first()
        if pkg and pkg.service:
            return pkg.service, None

    # 4. Explicit Category parameter
    if category_param is not None and str(category_param).strip().lower() not in ("", "none", "null", "undefined"):
        raw_cat = str(category_param).strip()
        cat = _find_category(raw_cat)
        if cat:
            svc = _pick_primary_service_for_category(cat, hint_text=raw_cat)
            if svc:
                return svc, None
            return None, f"No services found in category '{cat.name}'."

    # 5. Partial keyword match across active services if hint exists
    search_hint = None
    if service_param and str(service_param).strip().lower() not in ("", "resolve", "none", "null", "undefined"):
        search_hint = str(service_param).strip()
    elif category_param and str(category_param).strip().lower() not in ("", "none", "null", "undefined"):
        search_hint = str(category_param).strip()

    if search_hint:
        svc = Service.objects.filter(is_active=True).filter(
            Q(slug__icontains=search_hint) | Q(name__icontains=search_hint)
        ).first()
        if svc:
            return svc, None

    return None, "Service could not be resolved. Please provide a valid service_id or service slug."


def get_service_time_slot_config(service):
    """
    Returns the ServiceTimeSlotConfig instance for a service.
    If none exists in the DB, returns an unpersisted default object based on Global Defaults.
    Safely handles service=None.
    """
    try:
        if service:
            config = ServiceTimeSlotConfig.objects.filter(service=service).first()
            if config:
                return config
    except Exception as e:
        logger.warning(f"Error fetching time slot config for service {getattr(service, 'id', None)}: {e}")

    g = get_global_time_slot_defaults()
    start_t = _parse_time(g.get("default_start_time")) or DEFAULT_START_TIME
    end_t = _parse_time(g.get("default_end_time")) or DEFAULT_END_TIME
    dur = int(g.get("slot_duration_minutes") or DEFAULT_SLOT_DURATION_MINUTES)
    cap = int(g.get("slot_capacity") or DEFAULT_SLOT_CAPACITY)
    act = bool(g.get("is_active", True))

    # Default fallback object based on Global Platform Defaults
    return ServiceTimeSlotConfig(
        service=service,
        default_start_time=start_t,
        default_end_time=end_t,
        slot_duration_minutes=dur,
        slot_capacity=cap,
        is_active=act,
    )


def get_booked_count_for_slot(service, target_date, slot_time_12, slot_time_24):
    """
    Counts active bookings on target_date and slot that belong to the SAME bookable service.
    Excludes CANCELLED and REJECTED bookings.
    """
    # Collect all identifiers representing this service
    package_slugs = list(Package.objects.filter(service=service).values_list("slug", flat=True))
    package_ids = [str(pid) for pid in Package.objects.filter(service=service).values_list("id", flat=True)]

    # Normalized time matching set (e.g. "09:00 AM", "09:00", "09:00:00", "9:00 AM")
    time_candidates = {
        slot_time_12.strip().upper(),
        slot_time_24.strip(),
        f"{slot_time_24.strip()}:00",
        slot_time_12.lstrip("0").strip().upper(),
    }

    # Base query for date, active status, and matching time
    qs = ServiceRequest.objects.filter(
        preferred_date=target_date,
    ).exclude(
        status__in=NON_CAPACITY_STATUSES
    )

    # Time filter: preferred_time can be stored in 12h or 24h
    time_q = Q(preferred_time__in=time_candidates)
    # Also handle ranges like "09:00 - 09:30" or "09:00 AM - 09:30 AM" where start matches
    time_q |= Q(preferred_time__startswith=slot_time_24)
    time_q |= Q(preferred_time__startswith=slot_time_12)

    qs = qs.filter(time_q)

    # Service attribution filter
    service_q = (
        Q(catalog_service_id=str(service.id))
        | Q(catalog_service_id=service.slug)
        | Q(service_category=service.slug)
        | Q(service_category=service.name)
    )
    if package_slugs:
        service_q |= Q(catalog_service_id__in=package_slugs)
    if package_ids:
        service_q |= Q(catalog_service_id__in=package_ids)

    # Check if category has only this single service
    if service.category:
        sister_count = Service.objects.filter(category=service.category, is_active=True).count()
        if sister_count == 1:
            service_q |= Q(service_category=service.category.slug)
            service_q |= Q(service_category=service.category.name)

    qs = qs.filter(service_q)
    return qs.count()


def generate_slots_for_service_date(service, target_date, draft_config=None):
    """
    Core slot generation engine for both Customer API, Admin Preview, and Booking Validation.

    Precedence:
    1. Service active flag (disabled => closed)
    2. Date override (if present, wins: closed or custom hours/capacity)
    3. Weekly schedule (if present, wins: closed or custom hours/capacity)
    4. Service default configuration (fallback)

    Returns:
        dict matching the customer API response specification:
        {
            "service_id": service.id,
            "service_name": service.name,
            "date": "YYYY-MM-DD",
            "is_open": bool,
            "reason": str or None,
            "slot_duration_minutes": int,
            "groups": {
                "morning": [...],
                "afternoon": [...],
                "evening": [...]
            },
            "total_slots_count": int,
            "available_slots_count": int,
        }
    """
    if isinstance(target_date, str):
        target_date = datetime.date.fromisoformat(target_date.split("T")[0].strip())

    # 1. Base Configuration
    config = draft_config or get_service_time_slot_config(service)
    if not config.is_active:
        return {
            "service_id": service.id if service else None,
            "service_name": service.name if service else "Standard Service",
            "date": target_date.strftime("%Y-%m-%d"),
            "is_open": False,
            "reason": "Booking is currently disabled for this service.",
            "slot_duration_minutes": config.slot_duration_minutes or DEFAULT_SLOT_DURATION_MINUTES,
            "groups": {"morning": [], "afternoon": [], "evening": []},
            "all_slots": [],
            "total_slots_count": 0,
            "available_slots_count": 0,
        }

    duration_minutes = max(5, int(config.slot_duration_minutes or DEFAULT_SLOT_DURATION_MINUTES))
    effective_start = config.default_start_time or DEFAULT_START_TIME
    effective_end = config.default_end_time or DEFAULT_END_TIME
    effective_capacity = max(1, int(config.slot_capacity or DEFAULT_SLOT_CAPACITY))
    is_open = True
    reason = None

    # 2. Date Override (Highest schedule priority)
    date_override = ServiceDateOverride.objects.filter(service=service, date=target_date).first() if service else None
    if date_override:
        if date_override.is_closed:
            is_open = False
            reason = date_override.reason or "Closed on this date (Holiday/Special event)."
        else:
            if date_override.start_time:
                effective_start = date_override.start_time
            if date_override.end_time:
                effective_end = date_override.end_time
            if date_override.slot_capacity is not None and date_override.slot_capacity > 0:
                effective_capacity = date_override.slot_capacity
            if date_override.reason:
                reason = date_override.reason
    else:
        # 3. Weekly Schedule (0=Monday ... 6=Sunday)
        weekday_idx = target_date.weekday()
        weekly_row = ServiceWeeklySchedule.objects.filter(service=service, day_of_week=weekday_idx).first() if service else None
        if weekly_row:
            if not weekly_row.is_open:
                is_open = False
                weekday_name = dict(ServiceWeeklySchedule.DAY_CHOICES).get(weekday_idx, "this day")
                reason = f"Closed on {weekday_name}s."
            else:
                if weekly_row.start_time:
                    effective_start = weekly_row.start_time
                if weekly_row.end_time:
                    effective_end = weekly_row.end_time
                if weekly_row.slot_capacity is not None and weekly_row.slot_capacity > 0:
                    effective_capacity = weekly_row.slot_capacity
        else:
            # 4. If no service-specific weekly row exists, check global default weekly schedule
            g_sched = get_global_time_slot_defaults().get("weekly_schedule", [])
            for gs in g_sched:
                if gs.get("day_of_week") == weekday_idx or gs.get("weekday") == weekday_idx:
                    if not gs.get("is_open", True):
                        is_open = False
                        weekday_name = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][weekday_idx]
                        reason = f"Closed on {weekday_name}s (Global Default)."
                    elif not gs.get("use_default_hours", True):
                        if gs.get("start_time"):
                            effective_start = _parse_time(gs["start_time"]) or effective_start
                        if gs.get("end_time"):
                            effective_end = _parse_time(gs["end_time"]) or effective_end
                        if gs.get("slot_capacity"):
                            effective_capacity = int(gs["slot_capacity"]) or effective_capacity
                    break

    # If day is closed or times invalid, return closed state with empty slots
    if not is_open or effective_start >= effective_end:
        return {
            "service_id": service.id if service else None,
            "service_name": service.name if service else "Standard Service",
            "date": target_date.strftime("%Y-%m-%d"),
            "is_open": is_open if effective_start < effective_end else False,
            "reason": reason or ("Operating start time must precede end time." if effective_start >= effective_end else None),
            "slot_duration_minutes": duration_minutes,
            "groups": {"morning": [], "afternoon": [], "evening": []},
            "all_slots": [],
            "total_slots_count": 0,
            "available_slots_count": 0,
        }

    # 5. Slot Generation
    current_dt = datetime.datetime.combine(target_date, effective_start)
    end_dt = datetime.datetime.combine(target_date, effective_end)
    duration_delta = datetime.timedelta(minutes=duration_minutes)

    # Timezone & lead time context for past-time evaluation
    now = timezone.localtime()
    local_today = now.date()
    min_lead_minutes = get_min_lead_minutes()
    earliest_bookable_dt = now + datetime.timedelta(minutes=min_lead_minutes)

    morning_slots = []
    afternoon_slots = []
    evening_slots = []
    total_slots = 0
    available_slots = 0

    # Batch preload active booked times for this service and date in 1 query to prevent N+1 queries
    if service:
        package_slugs = list(Package.objects.filter(service=service).values_list("slug", flat=True))
        package_ids = [str(pid) for pid in Package.objects.filter(service=service).values_list("id", flat=True)]

        service_q = (
            Q(catalog_service_id=str(service.id))
            | Q(catalog_service_id=service.slug)
            | Q(service_category=service.slug)
            | Q(service_category=service.name)
        )
        if package_slugs:
            service_q |= Q(catalog_service_id__in=package_slugs)
        if package_ids:
            service_q |= Q(catalog_service_id__in=package_ids)

        if service.category_id:
            sister_count = Service.objects.filter(category_id=service.category_id, is_active=True).count()
            if sister_count == 1 and service.category:
                service_q |= Q(service_category=service.category.slug)
                service_q |= Q(service_category=service.category.name)

        raw_booked_times = list(
            ServiceRequest.objects.filter(
                preferred_date=target_date,
            ).exclude(
                status__in=NON_CAPACITY_STATUSES
            ).filter(
                service_q
            ).values_list("preferred_time", flat=True)
        )
    else:
        raw_booked_times = []

    while current_dt + duration_delta <= end_dt:
        slot_start = current_dt.time()
        slot_end = (current_dt + duration_delta).time()

        time_label = slot_start.strftime("%I:%M %p")
        time_24 = slot_start.strftime("%H:%M")

        is_available = True
        slot_reason = None

        # Check A: Past-time / Lead-time validation
        if target_date < local_today:
            is_available = False
            slot_reason = "Date has passed"
        elif target_date == local_today:
            slot_aware_dt = timezone.make_aware(current_dt, timezone.get_current_timezone())
            if slot_aware_dt < earliest_bookable_dt:
                is_available = False
                slot_reason = "Time has passed"

        # Check B: Capacity check against existing active bookings
        booked_count = 0
        if is_available:
            time_cands = {
                time_label.strip().upper(),
                time_24.strip(),
                f"{time_24.strip()}:00",
                time_label.lstrip("0").strip().upper(),
            }
            for pt in raw_booked_times:
                if not pt:
                    continue
                pt_s = str(pt).strip()
                if pt_s.upper() in time_cands or pt_s.startswith(time_24) or pt_s.upper().startswith(time_label):
                    booked_count += 1

            if booked_count >= effective_capacity:
                is_available = False
                slot_reason = "Slot full"

        slot_item = {
            "time": time_label,
            "value": time_24,
            "start_time": time_24,
            "end_time": slot_end.strftime("%H:%M"),
            "available": is_available,
            "reason": slot_reason,
            "capacity": effective_capacity,
            "booked_count": booked_count,
        }

        total_slots += 1
        if is_available:
            available_slots += 1

        # Period grouping:
        # Morning: < 12:00 PM
        # Afternoon: 12:00 PM to 04:59 PM (16:59)
        # Evening: >= 05:00 PM (17:00)
        if slot_start.hour < 12:
            morning_slots.append(slot_item)
        elif slot_start.hour < 17:
            afternoon_slots.append(slot_item)
        else:
            evening_slots.append(slot_item)

        current_dt += duration_delta

    return {
        "service_id": service.id if service else None,
        "service_name": service.name if service else "Standard Service",
        "date": target_date.strftime("%Y-%m-%d"),
        "is_open": True,
        "reason": reason,
        "slot_duration_minutes": duration_minutes,
        "groups": {
            "morning": morning_slots,
            "afternoon": afternoon_slots,
            "evening": evening_slots,
        },
        "all_slots": morning_slots + afternoon_slots + evening_slots,
        "total_slots_count": total_slots,
        "available_slots_count": available_slots,
    }


def validate_slot_availability_for_booking(service, target_date, preferred_time):
    """
    Revalidates slot availability during booking submission.
    Ensures date is open, slot exists, slot has not passed, and slot capacity is not exceeded.

    Returns:
        (True, None) on success
        (False, error_message) on failure
    """
    if not service:
        return True, None

    if isinstance(target_date, str):
        try:
            target_date = datetime.date.fromisoformat(target_date.split("T")[0].strip())
        except (ValueError, TypeError):
            return False, "Invalid booking date."

    parsed_time = parse_slot_time(preferred_time)
    if not parsed_time:
        return False, "Invalid or unparseable time slot."

    slot_info = generate_slots_for_service_date(service, target_date)
    if not slot_info.get("is_open"):
        msg = slot_info.get("reason") or "This service is closed on the selected date."
        return False, msg

    all_slots = (
        slot_info["groups"].get("morning", [])
        + slot_info["groups"].get("afternoon", [])
        + slot_info["groups"].get("evening", [])
    )

    time_24 = parsed_time.strftime("%H:%M")
    matched_slot = None
    for s in all_slots:
        if s.get("value") == time_24 or s.get("start_time") == time_24:
            matched_slot = s
            break

    if not matched_slot:
        return False, "The selected time slot is outside operating hours for this service."

    if not matched_slot.get("available"):
        reason = matched_slot.get("reason")
        if reason == "Slot full":
            return False, "Sorry, this time slot is no longer available. Please select another slot."
        return False, f"This time slot is not bookable ({reason or 'unavailable'})."

    return True, None
