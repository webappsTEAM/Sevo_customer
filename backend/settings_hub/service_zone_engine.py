"""
settings_hub/service_zone_engine.py

Service Area Validation Engine
================================
Authoritative backend module for all service-zone eligibility checks.

This module is intentionally decoupled from views so it can be called
from any part of the backend (BookingCreateView, management commands,
admin tools, signals) without importing HTTP-layer code.

Public API
----------
  validate_coordinates(lat, lng) -> None | raises ZoneValidationError
  find_zone_for_service(lat, lng, service_slug, company_id) -> ZoneCheckResult
  check_booking_eligibility(lat, lng, service_slug, company) -> ZoneCheckResult

Error codes (returned in ZoneCheckResult.error_code)
-----------------------------------------------------
  SERVICE_NOT_AVAILABLE_IN_AREA  — Location outside all active zones
  SERVICE_NOT_ALLOWED_IN_ZONE    — In zone but service not enabled in that zone
  INVALID_LOCATION               — lat/lng out of valid range
  LOCATION_REQUIRED              — Zones exist but no coordinates supplied
  SERVICE_ZONE_CHECK_FAILED      — Unexpected internal error (never blocks open-access)

Overlap resolution
------------------
When a customer is inside multiple active zones, the engine selects the zone
that EXPLICITLY allows the requested service (ServiceZoneService.is_available=True).
Among multiple such zones, the one with the highest pk (most recently created)
is preferred. This is deterministic and requires no extra business rules.

If no service slugs are assigned to a zone (zone_services is empty), ALL
services are considered available in that zone (open-access zone).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


# ── Structured result ─────────────────────────────────────────────────────────

@dataclass
class ZoneCheckResult:
    """
    Immutable result from a zone eligibility check.

    allowed         — True if booking may proceed
    error_code      — Machine-readable code when allowed=False (empty string when allowed)
    message         — Human-readable explanation (customer-safe)
    zone_id         — pk of matched zone (None when no zone matched or open-access)
    zone_name       — name of matched zone (empty string when no match)
    available_services — slugs explicitly allowed in matched zone (empty = all allowed)
    open_access     — True when no zones are configured (admin hasn't set up geofencing)
    """
    allowed: bool
    error_code: str = ""
    message: str = ""
    zone_id: Optional[int] = None
    zone_name: str = ""
    available_services: list = field(default_factory=list)
    open_access: bool = False


# ── Coordinate validation ─────────────────────────────────────────────────────

def validate_coordinates(lat, lng):
    """
    Validate that lat/lng are numeric and within WGS-84 ranges.

    Raises ValueError with a descriptive message on failure.
    Returns (float(lat), float(lng)) on success.
    """
    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        raise ValueError("INVALID_LOCATION: Coordinates must be numeric values.")

    if not (-90.0 <= lat <= 90.0):
        raise ValueError(f"INVALID_LOCATION: Latitude {lat} is out of range (-90 to 90).")
    if not (-180.0 <= lng <= 180.0):
        raise ValueError(f"INVALID_LOCATION: Longitude {lng} is out of range (-180 to 180).")

    # Reject exact (0, 0) — almost certainly a missing/default coordinate
    # (the Gulf of Guinea) rather than a real customer location.
    # A legitimate booking from coordinates exactly at (0.0, 0.0) is so
    # vanishingly rare that we treat it as missing data.
    if lat == 0.0 and lng == 0.0:
        raise ValueError("INVALID_LOCATION: Coordinates (0, 0) indicate a missing or default value.")

    return lat, lng


def _norm_slug(s: str) -> str:
    if not s:
        return ""
    return s.strip().lower().replace("_", "-").replace(" ", "-").replace("&", "and")


def _matches_service_slug(requested_slug: str, candidate_slug: str, candidate_name: str = "") -> bool:
    """
    Checks if a requested slug or service title matches an allowed service slug/name in the zone.
    Uses exact matching and specific service alias mapping, preventing false-positive cross matches.
    """
    if not requested_slug or requested_slug in ("general", "all", "service-booking", "services-added"):
        return True

    r = _norm_slug(requested_slug)
    c = _norm_slug(candidate_slug)
    n = _norm_slug(candidate_name) if candidate_name else ""

    if r == c or (n and r == n):
        return True

    # Exact alias mapping for catalog services
    ALIASES = {
        "home-services-and-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "home-pest-control", "pest-control"},
        "home-cleaning-and-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "home-pest-control", "pest-control"},
        "home-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "pest-control"},
        "cleaning": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "full-home-deep-clean"},
        "pest-control": {"cockroach-control", "termite-control", "ants-bed-bugs-control"},
        "kitchen-cleaning": {"kitchen-cleaning", "kitchen", "kitchen-clean"},
        "sofa-cleaning": {"sofa-cleaning", "sofa", "sofa-clean"},
        "bathroom-cleaning": {"bathroom-cleaning", "bathroom", "bathroom-clean"},
        "full-house-cleaning": {"full-house-cleaning", "full-house", "occupied-apartment", "cleaning", "full-home-cleaning"},
        "full-home-deep-clean": {"full-home-deep-clean", "deep-cleaning", "deep-clean"},
        "cockroach-control": {"cockroach-control", "cockroach", "cockroach-and-termite-control"},
        "termite-control": {"termite-control", "termite", "cockroach-and-termite-control"},
        "ants-bed-bugs-control": {"ants-bed-bugs-control", "ants-control", "bedbugs-control", "ants-and-bed-bugs-control", "bed-bugs"},
        "electrician-plumbing-and-carpentry": {"electrician", "plumbing", "carpentry", "electrician-plumbing-carpentry"},
        "electrician-plumbing-carpentry": {"electrician", "plumbing", "carpentry"},
        "plumbing": {"plumbing", "plumber"},
        "electrician": {"electrician", "electrical"},
        "carpentry": {"carpentry", "carpenter"},
        "ac-and-appliance": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave", "ac-appliance"},
        "ac-and-appliance-repair": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave", "ac-appliance"},
        "ac-appliance": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave"},
        "hvac": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation"},
        "ac-service-cleaning": {"ac-service-cleaning", "ac-service", "ac"},
        "ac-repair": {"ac-repair", "ac-diagnostics"},
        "ac-gas-refill": {"ac-gas-refill", "ac-gas"},
        "ac-installation": {"ac-installation", "ac-install"},
        "refrigerator": {"refrigerator", "fridge"},
        "washing-machine": {"washing-machine"},
        "tv-display": {"tv-display", "tv", "tv-and-display"},
        "microwave": {"microwave", "microwave-oven"},
        "paintings": {"interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor", "painting"},
        "painting": {"interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor"},
        "interior-painting": {"interior-painting"},
        "exterior-painting": {"exterior-painting"},
        "waterproofing": {"waterproofing", "wall-waterproofing"},
        "wood-metal": {"wood-metal", "wood-and-metal-polish", "wood-and-metal"},
        "texture-decor": {"texture-decor"},
        "mason": {"brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "home-construction", "full-house-construction"},
        "brick-block-work": {"brick-block-work"},
        "plastering-wall-repair": {"plastering-wall-repair"},
        "wall-partition-construction": {"wall-partition-construction"},
        "wall-breaking-demolition": {"wall-breaking-demolition"},
        "home-construction": {"home-construction"},
        "full-house-construction": {"full-house-construction"},
        "goods-and-transports": {"truck", "two-wheeler", "packers-movers", "goods-transports", "transport"},
        "goods-transports": {"truck", "two-wheeler", "packers-movers", "transport"},
        "truck": {"truck", "mini-truck"},
        "two-wheeler": {"two-wheeler", "bike"},
        "packers-movers": {"packers-movers", "house-shifting"},
        "vegetables": {"vegetables", "farm-fresh-vegetable", "farm-fresh-vegetables"},
        "groceries": {"groceries"},
    }

    allowed_set = ALIASES.get(c, {c})
    if r in allowed_set:
        return True

    req_set = ALIASES.get(r, {r})
    if c in req_set or (n and n in req_set):
        return True

    # Fallback fuzzy check
    clean_r = r.replace("-", "").replace("_", "")
    clean_c = c.replace("-", "").replace("_", "")
    if clean_r and clean_c and (clean_r in clean_c or clean_c in clean_r):
        return True

    return False


def _get_company_id(company) -> Optional[int]:
    """Accept Company instance, pk int, or None."""
    if company is None:
        return None
    if isinstance(company, int):
        return company
    return getattr(company, "pk", None) or getattr(company, "id", None)


def find_zone_for_service(
    lat: float,
    lng: float,
    service_slug: str,
    company_id: int,
) -> ZoneCheckResult:
    """
    Find the best active zone that contains (lat, lng) AND allows service_slug.

    Algorithm
    ---------
    1. Fetch all ACTIVE zones for company_id (with prefetched zone_services).
    2. If none exist → return open-access result.
    3. Filter to zones whose geometry contains the point.
    4. If no zone contains the point → SERVICE_NOT_AVAILABLE_IN_AREA.
    5. Among containing zones:
       a. Zones with NO service assignments treat all services as available.
       b. Zones with assignments must have is_available=True for service_slug.
    6. If no containing zone allows service_slug → SERVICE_NOT_ALLOWED_IN_ZONE.
    7. Among allowed zones, prefer the one with the highest pk (most recent).
    8. Return ZoneCheckResult(allowed=True, zone_id=..., zone_name=...).
    """
    # Late import to avoid Django startup issues when this module is imported
    # at the top of models/serializers before the app registry is ready.
    from settings_hub.models import ServiceZone

    try:
        active_zones = list(
            ServiceZone.objects
            .filter(company_id=company_id, is_active=True)
            .prefetch_related("zone_services")
        )
    except Exception as exc:
        logger.error("ServiceZone DB query failed: %s", exc)
        return ZoneCheckResult(
            allowed=True,
            open_access=True,
            message="Zone check unavailable — open access applied.",
            error_code="SERVICE_ZONE_CHECK_FAILED",
        )

    # No zones at all → admin hasn't set up geofencing → open access
    if not active_zones:
        return ZoneCheckResult(
            allowed=True,
            open_access=True,
            message="No service zones configured — open access.",
        )

    # Find all zones containing this point
    containing = []
    for zone in active_zones:
        try:
            if zone.contains_point(lat, lng):
                containing.append(zone)
        except Exception as exc:
            logger.warning("contains_point() raised for zone pk=%s: %s", zone.pk, exc)

    if not containing:
        return ZoneCheckResult(
            allowed=False,
            error_code="SERVICE_NOT_AVAILABLE_IN_AREA",
            message="Service is not available at your location. Please try a different address.",
        )

    # Among containing zones, find ones that allow the requested service.
    # 1. Specific match: zone has assignments and explicitly allows this slug (is_available=True)
    # 2. All-service match: zone has 0 assignments (open-access zone for all services)
    # 3. Blocked: zone has assignments but this slug is missing or is_available=False
    slug = (service_slug or "").strip().lower()
    specific_matches = []
    all_service_matches = []
    in_zone_but_blocked = False

    for zone in containing:
        assignments = list(zone.zone_services.all())
        if not assignments:
            # No restrictions configured on this zone → allows all services
            all_service_matches.append(zone)
        else:
            if not slug:
                # Location-only check (no service specified) → any zone containing the point matches
                specific_matches.append(zone)
            else:
                matched_svcs = [
                    svc for svc in assignments
                    if _matches_service_slug(slug, svc.service_slug, getattr(svc, "service_name", ""))
                ]

                if matched_svcs:
                    # Check if at least one matching service is available
                    if any(svc.is_available for svc in matched_svcs):
                        specific_matches.append(zone)
                    else:
                        in_zone_but_blocked = True
                else:
                    in_zone_but_blocked = True

    if specific_matches:
        best_zone = max(specific_matches, key=lambda z: z.pk)
    elif all_service_matches:
        best_zone = max(all_service_matches, key=lambda z: z.pk)
    else:
        error_code = "SERVICE_NOT_ALLOWED_IN_ZONE" if in_zone_but_blocked else "SERVICE_NOT_AVAILABLE_IN_AREA"
        return ZoneCheckResult(
            allowed=False,
            error_code=error_code,
            message=(
                f"The selected service is not available at your location."
                if in_zone_but_blocked
                else "Service is not available at your location."
            ),
        )

    # Collect explicitly available service slugs for this zone
    available_services = [
        svc.service_slug
        for svc in best_zone.zone_services.filter(is_available=True)
    ]

    return ZoneCheckResult(
        allowed=True,
        zone_id=best_zone.pk,
        zone_name=best_zone.name,
        available_services=available_services,
        message=f"Service available in {best_zone.name}.",
    )


def check_booking_eligibility(
    lat,
    lng,
    service_slug: str,
    company,
) -> ZoneCheckResult:
    """
    Full eligibility check for a booking creation attempt.

    Combines coordinate validation + zone lookup + service check.
    This is the single function to call from BookingCreateView.

    Parameters
    ----------
    lat, lng      — raw values from request (may be None/empty/invalid)
    service_slug  — e.g. "cleaning", "plumbing" (from service_category)
    company       — Company instance, pk int, or None

    Returns
    -------
    ZoneCheckResult
      .allowed = True  → booking may proceed
      .allowed = False → return error_code + message to customer
      .open_access = True → no zones configured, skip gate entirely
    """
    company_id = _get_company_id(company)

    # If no company is resolvable, we can't enforce zone rules — open access
    if not company_id:
        return ZoneCheckResult(
            allowed=True,
            open_access=True,
            message="No company context — open access.",
        )

    # Fast-path: check whether any active zones exist BEFORE validating coords.
    # If there are no zones, we skip everything (open access, no coord required).
    from settings_hub.models import ServiceZone
    try:
        has_zones = ServiceZone.objects.filter(
            company_id=company_id, is_active=True
        ).exists()
    except Exception:
        # DB error → fail open (don't block customer)
        return ZoneCheckResult(
            allowed=True,
            open_access=True,
            message="Zone check unavailable — open access.",
            error_code="SERVICE_ZONE_CHECK_FAILED",
        )

    if not has_zones:
        return ZoneCheckResult(
            allowed=True,
            open_access=True,
            message="No service zones configured — open access.",
        )

    # Zones exist — coordinates are now REQUIRED
    if lat is None or lat == "" or lng is None or lng == "":
        return ZoneCheckResult(
            allowed=False,
            error_code="LOCATION_REQUIRED",
            message="Please provide your location to check service availability in your area.",
        )

    # Validate coordinate ranges
    try:
        lat, lng = validate_coordinates(lat, lng)
    except ValueError as exc:
        return ZoneCheckResult(
            allowed=False,
            error_code="INVALID_LOCATION",
            message=str(exc).replace("INVALID_LOCATION: ", ""),
        )

    # Full zone + service check
    return find_zone_for_service(lat, lng, service_slug, company_id)
