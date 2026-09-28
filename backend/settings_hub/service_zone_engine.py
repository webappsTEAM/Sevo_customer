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
    Uses exact matching, comprehensive bidirectional alias sets, and safe token prefix matching.
    Prevents false-positive cross matches (e.g. 'ac' matching inside 'packers-movers').
    """
    if not requested_slug or requested_slug in ("general", "all", "service-booking", "services-added"):
        return True

    r = _norm_slug(requested_slug)
    c = _norm_slug(candidate_slug)
    n = _norm_slug(candidate_name) if candidate_name else ""

    if r == c or (n and r == n):
        return True

    # Exact bidirectional alias mapping for all service categories and sub-services
    ALIASES = {
        # Vegetables & Groceries
        "vegetables": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "fresh-vegetables", "veggies", "farm-fresh"},
        "vegetable": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "fresh-vegetables"},
        "farm-fresh-vegetable": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "fresh-vegetables"},
        "farm-fresh-vegetables": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "fresh-vegetables"},
        "vegetables-quick-delivery": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "fresh-vegetables"},
        "vegetables-groceries": {"vegetables", "vegetable", "farm-fresh-vegetable", "farm-fresh-vegetables", "vegetables-quick-delivery", "vegetables-groceries", "groceries"},
        "groceries": {"groceries", "vegetables-groceries", "daily-essentials", "grocery"},

        # Goods & Logistics
        "goods-and-transports": {"truck", "two-wheeler", "packers-movers", "goods-transports", "transport", "mini-truck", "instant-bike-courier", "house-shifting", "goods-transport-truck", "goods-transport-two-wheeler"},
        "goods-transports": {"truck", "two-wheeler", "packers-movers", "transport"},
        "goods-transport-truck": {"truck", "mini-truck", "mini-truck-transport", "goods-and-transports", "goods-transport-truck"},
        "goods-transport-two-wheeler": {"two-wheeler", "instant-bike-courier", "bike", "goods-and-transports", "goods-transport-bike", "goods-transport-two-wheeler"},
        "goods-transport-bike": {"two-wheeler", "instant-bike-courier", "bike", "goods-and-transports", "goods-transport-two-wheeler"},
        "goods-transport-packers": {"packers-movers", "house-shifting", "packers-and-movers", "goods-and-transports"},
        "truck": {"truck", "mini-truck", "mini-truck-transport", "goods-transport-truck"},
        "mini-truck": {"truck", "mini-truck", "mini-truck-transport", "goods-transport-truck"},
        "two-wheeler": {"two-wheeler", "bike", "instant-bike-courier", "goods-transport-bike", "goods-transport-two-wheeler"},
        "packers-movers": {"packers-movers", "packers-and-movers", "house-shifting", "goods-transport-packers"},
        "packers-and-movers": {"packers-movers", "packers-and-movers", "house-shifting", "goods-transport-packers"},
        # Legacy/non-canonical slugs historically sent by the customer
        # AddressPicker (MapPickerScreen serviceSlug prop). The Service
        # Coverage tab saves goods_transport_truck / goods_transport_two_wheeler
        # / packers_movers. "goods"/"transport" are deliberately excluded from
        # fuzzy token matching below, so these must be explicit aliases.
        # "goods-transport" is category-generic: it matches either GT vehicle
        # category but never Packers & Movers.
        "goods-transport": {"goods-transport", "goods-transport-truck", "goods-transport-two-wheeler", "goods-transport-bike", "goods-and-transports", "goods-transports"},
        "two-wheelers": {"two-wheelers", "two-wheeler", "bike", "instant-bike-courier", "goods-transport-bike", "goods-transport-two-wheeler"},

        # Home Cleaning & Pest Control
        "home-services-and-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "home-pest-control", "pest-control"},
        "home-cleaning-and-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "home-pest-control", "pest-control"},
        "home-pest-control": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "full-home-deep-clean", "cleaning", "pest-control"},
        "cleaning": {"full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "full-home-deep-clean", "cleaning"},
        "pest-control": {"cockroach-control", "termite-control", "ants-bed-bugs-control", "pest-control"},
        "kitchen-cleaning": {"kitchen-cleaning", "kitchen", "kitchen-clean"},
        "sofa-cleaning": {"sofa-cleaning", "sofa", "sofa-clean"},
        "bathroom-cleaning": {"bathroom-cleaning", "bathroom", "bathroom-clean"},
        "full-house-cleaning": {"full-house-cleaning", "full-house", "occupied-apartment", "cleaning", "full-home-cleaning", "full-home-deep-clean"},
        "full-home-deep-clean": {"full-home-deep-clean", "deep-cleaning", "deep-clean", "full-house-cleaning"},
        "cockroach-control": {"cockroach-control", "cockroach", "cockroach-and-termite-control"},
        "termite-control": {"termite-control", "termite", "cockroach-and-termite-control"},
        "ants-bed-bugs-control": {"ants-bed-bugs-control", "ants-control", "bedbugs-control", "ants-and-bed-bugs-control", "bed-bugs"},

        # Electrical, Plumbing & Carpentry
        "electrician-plumbing-and-carpentry": {"electrician", "plumbing", "carpentry", "electrician-plumbing-carpentry"},
        "electrician-plumbing-carpentry": {"electrician", "plumbing", "carpentry"},
        "plumbing": {"plumbing", "plumber", "plumber-services"},
        "electrician": {"electrician", "electrical", "electrician-services"},
        "carpentry": {"carpentry", "carpenter", "carpenter-services"},

        # AC & Appliances
        "ac-and-appliance": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave", "ac-appliance", "ac"},
        "ac-and-appliance-repair": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave", "ac-appliance", "ac"},
        "ac-appliance": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "refrigerator", "washing-machine", "tv-display", "microwave", "ac"},
        "hvac": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "ac"},
        "ac": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "ac", "air-conditioner"},
        "air-conditioner": {"ac-service-cleaning", "ac-repair", "ac-gas-refill", "ac-installation", "ac"},
        "ac-service-cleaning": {"ac-service-cleaning", "ac-service", "ac"},
        "ac-repair": {"ac-repair", "ac-diagnostics", "ac"},
        "ac-gas-refill": {"ac-gas-refill", "ac-gas", "ac"},
        "ac-installation": {"ac-installation", "ac-install", "ac"},
        "refrigerator": {"refrigerator", "fridge", "refrigerator-repair"},
        "washing-machine": {"washing-machine", "washing-machine-repair"},
        "tv-display": {"tv-display", "tv", "tv-and-display", "tv-repair"},
        "microwave": {"microwave", "microwave-oven", "microwave-repair"},

        # Painting
        "paintings": {"interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor", "painting"},
        "painting": {"interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor", "painting"},
        "interior-painting": {"interior-painting", "painting"},
        "exterior-painting": {"exterior-painting", "painting"},
        "waterproofing": {"waterproofing", "wall-waterproofing"},
        "wood-metal": {"wood-metal", "wood-and-metal-polish", "wood-and-metal"},
        "texture-decor": {"texture-decor"},

        # Masonry
        "mason": {"brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "home-construction", "full-house-construction", "masonry"},
        "masonry": {"brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "home-construction", "full-house-construction", "mason"},
        "brick-block-work": {"brick-block-work", "mason"},
        "plastering-wall-repair": {"plastering-wall-repair", "mason"},
        "wall-partition-construction": {"wall-partition-construction", "mason"},
        "wall-breaking-demolition": {"wall-breaking-demolition", "mason"},
        "home-construction": {"home-construction", "mason"},
        "full-house-construction": {"full-house-construction", "mason"},
    }

    allowed_set = ALIASES.get(c, {c})
    if r in allowed_set:
        return True

    req_set = ALIASES.get(r, {r})
    if c in req_set or (n and n in req_set):
        return True

    # Safe token-based matching: only match whole words or substantial stems (>= 4 chars)
    # Never match short tokens like "ac" inside "packers"
    r_tokens = set(r.split("-"))
    c_tokens = set(c.split("-"))

    # If any non-trivial word token (len >= 4) matches exactly.
    # "goods"/"transport" are shared by every Goods & Transport category, so
    # they must not make a truck-only zone match a two-wheeler booking (or
    # vice versa) -- category-specific coverage depends on this.
    _GENERIC_TOKENS = {"goods", "transport", "transports"}
    meaningful_common = {t for t in (r_tokens & c_tokens) if len(t) >= 4 and t not in _GENERIC_TOKENS}
    if meaningful_common:
        return True

    return False


# Goods & Transport / Packers & Movers coverage must match what the customer
# map picker draws. MapPickerScreen fetches zones via
# /settings/service-zones/?services=<slug>, which returns ONLY zones with an
# exact ServiceZoneService.service_slug match. For these canonical slugs the
# check therefore ignores (a) zones with no service assignments ("open-access
# zones", which are still honoured for home services) and (b) alias/token
# fuzzy matching. Otherwise a point visibly outside the drawn boundary could
# pass because some unrelated general zone covers it.
STRICT_MATCH_SERVICE_SLUGS = frozenset({
    "goods_transport_truck",
    "goods_transport_two_wheeler",
    "packers_movers",
})


def _requires_strict_match(service_slug: str) -> bool:
    return (service_slug or "").strip().lower() in STRICT_MATCH_SERVICE_SLUGS


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
    vehicle_class: str = "",
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
    # GT / P&M canonical slugs use strict matching (see STRICT_MATCH_SERVICE_SLUGS).
    # 1. Specific match: zone has assignments and explicitly allows this slug (is_available=True)
    # 2. All-service match: zone has 0 assignments (open-access zone for all services)
    # 3. Blocked: zone has assignments but this slug is missing or is_available=False
    slug = str(service_slug or "").strip().lower()
    strict = _requires_strict_match(slug)
    if slug and not strict:
        # Drawn-set consistency for EVERY service: when at least one active
        # zone is explicitly assigned this exact slug, the customer map
        # picker draws ONLY those zones (/settings/service-zones/?services=
        # <slug>), so only those zones may grant coverage. Otherwise an
        # undrawn unassigned / alias-matched zone let a point far outside the
        # drawn boundary pass. Slugs with no exact assignment anywhere keep
        # the previous behaviour (the picker then draws all zones).
        strict = any(
            (svc.service_slug or "").strip().lower() == slug
            for zone in active_zones
            for svc in zone.zone_services.all()
        )
    specific_matches = []
    all_service_matches = []
    in_zone_but_blocked = False

    for zone in containing:
        assignments = list(zone.zone_services.all())
        if not assignments:
            if strict:
                # An unassigned zone is not drawn on the map for a service
                # that has explicit zone assignments (always true for GT /
                # P&M), so it must not grant coverage either.
                continue
            # No restrictions configured on this zone → allows all services
            all_service_matches.append(zone)
        else:
            if not slug:
                # Location-only check (no service specified) → any zone containing the point matches
                specific_matches.append(zone)
            else:
                if strict:
                    matched_svcs = [
                        svc for svc in assignments
                        if (svc.service_slug or "").strip().lower() == slug
                    ]
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

    # Optional per-zone vehicle restriction (ServiceZone.vehicle_classes).
    # Applied only after the service check so the error names the real
    # reason: the area IS served, just not by this vehicle.
    if vehicle_class and (specific_matches or all_service_matches):
        v_specific = [z for z in specific_matches if z.allows_vehicle_class(vehicle_class)]
        v_all = [z for z in all_service_matches if z.allows_vehicle_class(vehicle_class)]
        if not v_specific and not v_all:
            return ZoneCheckResult(
                allowed=False,
                error_code="VEHICLE_NOT_AVAILABLE_IN_ZONE",
                message="The selected vehicle type is not available at this location.",
            )
        specific_matches, all_service_matches = v_specific, v_all

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


# ── Service Coverage: Coming Soon lookup + Goods & Transport route check ────

def find_coming_soon_zone(lat, lng, service_slug, company_id):
    """
    Return the most recent COMING_SOON zone that contains (lat, lng) and is
    configured for service_slug (or for every service), else None.

    Used only to make an out-of-coverage message more helpful -- a Coming
    Soon zone never makes a location bookable.
    """
    from settings_hub.models import ServiceZone

    try:
        zones = list(
            ServiceZone.objects
            .filter(company_id=company_id, status=ServiceZone.STATUS_COMING_SOON)
            .prefetch_related("zone_services")
            .order_by("-pk")
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("Coming-soon zone lookup failed: %s", exc)
        return None
    for zone in zones:
        try:
            if not zone.contains_point(lat, lng):
                continue
        except Exception:
            continue
        assignments = list(zone.zone_services.all())
        if not assignments or not service_slug or any(
            svc.is_available and _matches_service_slug(service_slug, svc.service_slug, svc.service_name)
            for svc in assignments
        ):
            return zone
    return None


@dataclass
class RouteCoverageResult:
    """
    Outcome of checking BOTH ends of a trip against service coverage.

    failed_point -- "pickup" | "drop" | "" (empty when allowed)
    """
    allowed: bool
    error_code: str = ""
    message: str = ""
    failed_point: str = ""
    pickup_zone_id: Optional[int] = None
    pickup_zone_name: str = ""
    drop_zone_id: Optional[int] = None
    drop_zone_name: str = ""
    open_access: bool = False
    coming_soon_zone: str = ""


_POINT_LABEL = {"pickup": "pickup", "drop": "drop"}


def _point_failure(point, result, *, service_label, vehicle_label, coming_soon_zone):
    label = _POINT_LABEL[point]
    code = result.error_code or "SERVICE_NOT_AVAILABLE_IN_AREA"
    if code in ("LOCATION_REQUIRED", "INVALID_LOCATION"):
        return RouteCoverageResult(
            allowed=False,
            error_code=f"{point.upper()}_{code}",
            failed_point=point,
            message=(
                f"We couldn't read the {label} location. Please select the {label} "
                f"address from the suggestions or on the map."
            ),
        )
    if code == "VEHICLE_NOT_AVAILABLE_IN_ZONE":
        return RouteCoverageResult(
            allowed=False,
            error_code=f"{point.upper()}_VEHICLE_NOT_AVAILABLE",
            failed_point=point,
            message=(
                f"{vehicle_label or 'The selected vehicle'} is not available at your {label} "
                f"location. Please choose a different vehicle type."
            ),
        )
    if coming_soon_zone:
        return RouteCoverageResult(
            allowed=False,
            error_code=f"{point.upper()}_COMING_SOON",
            failed_point=point,
            coming_soon_zone=coming_soon_zone.name,
            message=(
                f"{service_label} is coming soon to {coming_soon_zone.name}. Your {label} "
                f"location isn't bookable yet."
            ),
        )
    return RouteCoverageResult(
        allowed=False,
        error_code=f"{point.upper()}_OUT_OF_COVERAGE",
        failed_point=point,
        message=(
            f"Your {label} location is outside our {service_label} service area. "
            f"Please choose a {label} point within our coverage."
        ),
    )


def check_route_coverage(
    *,
    pickup_lat,
    pickup_lng,
    drop_lat,
    drop_lng,
    service_slug: str,
    company,
    vehicle_class: str = "",
    service_label: str = "Goods & Transport",
    vehicle_label: str = "",
) -> RouteCoverageResult:
    """
    Goods & Transport gate: BOTH pickup and drop must fall inside an ACTIVE
    ServiceZone that serves `service_slug` (and, when a zone restricts
    vehicles, `vehicle_class`). Pickup is checked first; the returned message
    names which end failed.

    Same open-access rule as check_booking_eligibility: when the company has
    no ACTIVE zones at all, geofencing has not been set up and nothing is
    blocked. Coming Soon / Paused zones never count as coverage.
    """
    company_id = _get_company_id(company)
    if not company_id:
        return RouteCoverageResult(allowed=True, open_access=True, message="No company context — open access.")

    from settings_hub.models import ServiceZone
    try:
        has_zones = ServiceZone.objects.filter(company_id=company_id, is_active=True).exists()
    except Exception:
        return RouteCoverageResult(
            allowed=True, open_access=True, error_code="SERVICE_ZONE_CHECK_FAILED",
            message="Zone check unavailable — open access.",
        )
    if not has_zones:
        return RouteCoverageResult(allowed=True, open_access=True, message="No service zones configured — open access.")

    zone_ids = {}
    for point, lat, lng in (("pickup", pickup_lat, pickup_lng), ("drop", drop_lat, drop_lng)):
        if lat is None or lat == "" or lng is None or lng == "":
            return _point_failure(
                point, ZoneCheckResult(allowed=False, error_code="LOCATION_REQUIRED"),
                service_label=service_label, vehicle_label=vehicle_label, coming_soon_zone=None,
            )
        try:
            flat, flng = validate_coordinates(lat, lng)
        except ValueError:
            return _point_failure(
                point, ZoneCheckResult(allowed=False, error_code="INVALID_LOCATION"),
                service_label=service_label, vehicle_label=vehicle_label, coming_soon_zone=None,
            )
        result = find_zone_for_service(flat, flng, service_slug, company_id, vehicle_class=vehicle_class)
        if not result.allowed:
            coming_soon = None
            if result.error_code != "VEHICLE_NOT_AVAILABLE_IN_ZONE":
                coming_soon = find_coming_soon_zone(flat, flng, service_slug, company_id)
            return _point_failure(
                point, result,
                service_label=service_label, vehicle_label=vehicle_label, coming_soon_zone=coming_soon,
            )
        zone_ids[point] = (result.zone_id, result.zone_name)

    return RouteCoverageResult(
        allowed=True,
        pickup_zone_id=zone_ids["pickup"][0], pickup_zone_name=zone_ids["pickup"][1],
        drop_zone_id=zone_ids["drop"][0], drop_zone_name=zone_ids["drop"][1],
        message="Pickup and drop are both within service coverage.",
    )
