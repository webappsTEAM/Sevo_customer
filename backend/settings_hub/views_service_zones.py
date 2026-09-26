"""
views_service_zones.py

Admin Service Area Geofencing API
===================================
Endpoints:
  GET/POST   /api/settings/service-zones/           — list + create zones
  GET/PATCH/DELETE  /api/settings/service-zones/<id>/  — zone detail
  POST       /api/settings/service-zones/check/     — PUBLIC point-in-zone + service check

Point-in-zone algorithms:
  - Circle  : Haversine distance formula (in ServiceZone.contains_point)
  - Polygon : Ray-casting algorithm      (in ServiceZone.contains_point)

Zone validation logic lives in service_zone_engine.py — this file contains
only the HTTP-layer wrappers.
"""

import re

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ServiceZone, ServiceZoneService, City
from .service_zone_engine import check_booking_eligibility, validate_coordinates


# ── Permission helpers ────────────────────────────────────────────────────────

class IsAdminOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "manager")
        )


# ── Serializer helpers (dict-based, no heavy DRF serializers needed) ──────────

def _serialize_zone(zone, include_services=True):
    services = []
    if include_services:
        services = [
            {
                "id": svc.id,
                "service_slug": svc.service_slug,
                "service_name": svc.service_name,
                "is_available": svc.is_available,
            }
            for svc in zone.zone_services.all()
        ]
    return {
        "id": zone.id,
        "name": zone.name,
        "description": zone.description,
        "color": zone.color,
        "is_active": zone.is_active,
        "status": zone.status,
        "vehicle_classes": list(zone.vehicle_classes or []),
        "zone_type": zone.zone_type,
        "center_lat": zone.center_lat,
        "center_lng": zone.center_lng,
        "radius_meters": zone.radius_meters,
        "polygon": zone.polygon,
        "services": services,
        "created_at": zone.created_at.isoformat(),
        "updated_at": zone.updated_at.isoformat(),
    }


# ── Validation helpers (Service Coverage) ────────────────────────────────────

_VALID_STATUSES = {c[0] for c in ServiceZone.STATUS_CHOICES}

# Map colour for a zone (admin-selectable in the Service Coverage tab).
# Matches the existing model default so zones saved without a colour are
# unchanged.
DEFAULT_ZONE_COLOR = "#4F46E5"
_HEX_COLOR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def _clean_color(raw):
    """Return a normalised '#rrggbb' colour, the default for empty input,
    or raise _ZoneInputError for anything that is not a hex colour."""
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return DEFAULT_ZONE_COLOR
    if not isinstance(raw, str) or not _HEX_COLOR_RE.match(raw.strip()):
        raise _ZoneInputError("color must be a hex colour like #2563eb.")
    value = raw.strip().lower()
    if len(value) == 4:
        value = "#" + "".join(ch * 2 for ch in value[1:])
    return value


def _valid_vehicle_classes():
    from logistics.models import ServiceTier
    return {c[0] for c in ServiceTier.VehicleClass.choices}


class _ZoneInputError(ValueError):
    pass


def _clean_vehicle_classes(raw):
    if raw in (None, ""):
        return []
    if not isinstance(raw, (list, tuple)):
        raise _ZoneInputError("vehicle_classes must be a list.")
    valid = _valid_vehicle_classes()
    cleaned = []
    for v in raw:
        key = str(v or "").strip().lower()
        if not key:
            continue
        if key not in valid:
            raise _ZoneInputError(
                f"Unknown vehicle class '{v}'. Allowed: {', '.join(sorted(valid))}."
            )
        if key not in cleaned:
            cleaned.append(key)
    return cleaned


def _resolve_status(data, current_status=None):
    """status wins; a bare is_active (legacy panel) maps to active/paused."""
    if "status" in data and data.get("status") not in (None, ""):
        st = str(data["status"]).strip().lower()
        if st not in _VALID_STATUSES:
            raise _ZoneInputError(
                f"status must be one of: {', '.join(sorted(_VALID_STATUSES))}."
            )
        return st
    if "is_active" in data:
        return ServiceZone.STATUS_ACTIVE if bool(data["is_active"]) else ServiceZone.STATUS_PAUSED
    return current_status or ServiceZone.STATUS_ACTIVE


def _validate_zone_geometry(zone_type, center_lat, center_lng, radius_meters, polygon):
    if zone_type == "circle":
        try:
            validate_coordinates(center_lat, center_lng)
        except ValueError as exc:
            raise _ZoneInputError(f"Invalid circle centre: {str(exc).replace('INVALID_LOCATION: ', '')}")
        try:
            r = float(radius_meters)
        except (TypeError, ValueError):
            raise _ZoneInputError("radius_meters must be a number.")
        if r <= 0:
            raise _ZoneInputError("Radius must be greater than zero.")
        return
    ring = []
    if isinstance(polygon, dict) and isinstance(polygon.get("coordinates"), list) and polygon["coordinates"]:
        ring = polygon["coordinates"][0] or []
    # A closed GeoJSON ring repeats its first vertex; count distinct corners.
    distinct = {tuple(pt) for pt in ring if isinstance(pt, (list, tuple)) and len(pt) >= 2}
    if len(distinct) < 3:
        raise _ZoneInputError("A polygon needs at least 3 distinct vertices.")
    for pt in ring:
        try:
            validate_coordinates(pt[1], pt[0])
        except (ValueError, IndexError, TypeError):
            raise _ZoneInputError(f"Invalid polygon vertex {pt!r} (expected [lng, lat]).")


# ── List / Create ─────────────────────────────────────────────────────────────

class ServiceZoneListCreateView(APIView):
    """
    GET  /api/settings/service-zones/  — list zones (active zones for public, all zones for admin)
    POST /api/settings/service-zones/  — create a new zone (admin only)
    """
    permission_classes = [permissions.AllowAny]

    def _get_company(self, request):
        user = request.user
        # Support direct company FK or through company_memberships
        if hasattr(user, "company") and user.company:
            return user.company
        membership = getattr(user, "company_memberships", None)
        if membership:
            m = membership.filter(is_active=True).select_related("company").first()
            if m:
                return m.company
        from companies.models import Company
        return Company.objects.first()

    def get(self, request):
        company = self._get_company(request)
        if not company:
            return Response({"detail": "Company not found."}, status=400)

        is_admin = (
            request.user.is_authenticated
            and (request.user.is_staff or getattr(request.user, "role", "") in ("admin", "owner", "superadmin", "manager"))
        )

        zones = (
            ServiceZone.objects
            .filter(company=company)
            .prefetch_related("zone_services")
            .order_by("-created_at")
        )
        if not is_admin:
            zones = zones.filter(is_active=True)

        # ?services=goods_transport_truck,goods_transport_two_wheeler narrows
        # the list to zones configured for any of those service slugs (used by
        # the Goods & Transport Hub "Service Coverage" tab).
        services_param = (request.query_params.get("services") or "").strip()
        if services_param:
            slugs = [x.strip() for x in services_param.split(",") if x.strip()]
            zones = zones.filter(zone_services__service_slug__in=slugs).distinct()

        return Response([_serialize_zone(z) for z in zones])

    def post(self, request):
        if not request.user.is_authenticated or not (request.user.is_staff or getattr(request.user, "role", "") in ("admin", "owner", "superadmin", "manager")):
            return Response({"detail": "Admin credentials required."}, status=403)

        company = self._get_company(request)
        if not company:
            return Response({"detail": "Company not found."}, status=400)

        data = request.data
        name = (data.get("name") or "").strip()
        if not name:
            return Response({"detail": "Zone name is required."}, status=400)

        zone_type = data.get("zone_type", "circle")
        if zone_type not in ("circle", "polygon"):
            return Response({"detail": "zone_type must be 'circle' or 'polygon'."}, status=400)

        # Validate geometry
        if zone_type == "circle":
            center_lat = data.get("center_lat")
            center_lng = data.get("center_lng")
            try:
                radius_meters = float(data.get("radius_meters", 5000))
            except (TypeError, ValueError):
                return Response({"detail": "radius_meters must be a number."}, status=400)
            if center_lat is None or center_lng is None:
                return Response({"detail": "center_lat and center_lng are required for circle zones."}, status=400)
            polygon = None
        else:
            polygon = data.get("polygon")
            if not polygon or not isinstance(polygon, dict):
                return Response({"detail": "polygon (GeoJSON) is required for polygon zones."}, status=400)
            center_lat = data.get("center_lat")
            center_lng = data.get("center_lng")
            coords = polygon.get("coordinates", [[]])[0] if isinstance(polygon.get("coordinates"), list) else []
            if coords and len(coords) >= 3:
                center_lat = sum(pt[1] for pt in coords) / len(coords)
                center_lng = sum(pt[0] for pt in coords) / len(coords)
            radius_meters = float(data.get("radius_meters", 5000))

        try:
            zone_status = _resolve_status(data)
            zone_color = _clean_color(data.get("color"))
            vehicle_classes = _clean_vehicle_classes(data.get("vehicle_classes"))
            _validate_zone_geometry(zone_type, center_lat, center_lng, radius_meters, polygon)
        except _ZoneInputError as exc:
            return Response({"detail": str(exc)}, status=400)

        zone = ServiceZone.objects.create(
            company=company,
            created_by=request.user,
            name=name,
            description=(data.get("description") or "").strip(),
            color=zone_color,
            status=zone_status,
            is_active=zone_status == ServiceZone.STATUS_ACTIVE,
            vehicle_classes=vehicle_classes,
            zone_type=zone_type,
            center_lat=center_lat,
            center_lng=center_lng,
            radius_meters=radius_meters,
            polygon=polygon,
        )

        # Save service assignments
        services_data = data.get("services", [])
        for svc in services_data:
            slug = (svc.get("service_slug") or "").strip()
            if slug:
                ServiceZoneService.objects.create(
                    zone=zone,
                    service_slug=slug,
                    service_name=(svc.get("service_name") or "").strip(),
                    is_available=bool(svc.get("is_available", True)),
                )

        return Response(_serialize_zone(zone), status=201)


# ── Detail / Update / Delete ──────────────────────────────────────────────────

class ServiceZoneDetailView(APIView):
    """
    GET    /api/settings/service-zones/<id>/  — retrieve zone
    PATCH  /api/settings/service-zones/<id>/  — update zone + services
    DELETE /api/settings/service-zones/<id>/  — delete zone
    """
    permission_classes = [IsAdminOrManager]

    def _get_zone(self, request, pk):
        user = request.user
        # Resolve company. company_id must start as None: previously an admin
        # with neither a `company` attribute nor company_memberships left it
        # unassigned and every PATCH/DELETE crashed with UnboundLocalError.
        company_id = None
        if hasattr(user, "company") and user.company:
            company_id = user.company_id
        else:
            m = getattr(user, "company_memberships", None)
            if m:
                mem = m.filter(is_active=True).first()
                company_id = mem.company_id if mem else None
        if not company_id:
            from companies.models import Company
            c = Company.objects.first()
            company_id = c.id if c else None

        try:
            return ServiceZone.objects.prefetch_related("zone_services").get(
                pk=pk, company_id=company_id
            )
        except ServiceZone.DoesNotExist:
            return None

    def get(self, request, pk):
        zone = self._get_zone(request, pk)
        if not zone:
            return Response({"detail": "Not found."}, status=404)
        return Response(_serialize_zone(zone))

    def patch(self, request, pk):
        zone = self._get_zone(request, pk)
        if not zone:
            return Response({"detail": "Not found."}, status=404)

        data = request.data
        if "name" in data:
            name = (data["name"] or "").strip()
            if not name:
                return Response({"detail": "Name cannot be empty."}, status=400)
            zone.name = name
        if "description" in data:
            zone.description = (data["description"] or "").strip()
        try:
            if "color" in data:
                zone.color = _clean_color(data["color"])
            if "status" in data or "is_active" in data:
                zone.status = _resolve_status(data, zone.status)
                zone.is_active = zone.status == ServiceZone.STATUS_ACTIVE
            if "vehicle_classes" in data:
                zone.vehicle_classes = _clean_vehicle_classes(data["vehicle_classes"])
        except _ZoneInputError as exc:
            return Response({"detail": str(exc)}, status=400)
        if "zone_type" in data:
            if data["zone_type"] not in ("circle", "polygon"):
                return Response({"detail": "zone_type must be 'circle' or 'polygon'."}, status=400)
            zone.zone_type = data["zone_type"]
        if "center_lat" in data:
            zone.center_lat = data["center_lat"]
        if "center_lng" in data:
            zone.center_lng = data["center_lng"]
        if "radius_meters" in data:
            try:
                zone.radius_meters = float(data["radius_meters"])
            except (TypeError, ValueError):
                return Response({"detail": "radius_meters must be a number."}, status=400)
        if "polygon" in data:
            zone.polygon = data["polygon"]
            if zone.zone_type == "polygon" and zone.polygon and isinstance(zone.polygon, dict):
                coords = zone.polygon.get("coordinates", [[]])[0] if isinstance(zone.polygon.get("coordinates"), list) else []
                if coords and len(coords) >= 3:
                    zone.center_lat = sum(pt[1] for pt in coords) / len(coords)
                    zone.center_lng = sum(pt[0] for pt in coords) / len(coords)
        try:
            _validate_zone_geometry(zone.zone_type, zone.center_lat, zone.center_lng, zone.radius_meters, zone.polygon)
        except _ZoneInputError as exc:
            return Response({"detail": str(exc)}, status=400)
        zone.save()

        # Replace services if provided
        if "services" in data:
            zone.zone_services.all().delete()
            for svc in (data["services"] or []):
                slug = (svc.get("service_slug") or "").strip()
                if slug:
                    ServiceZoneService.objects.create(
                        zone=zone,
                        service_slug=slug,
                        service_name=(svc.get("service_name") or "").strip(),
                        is_available=bool(svc.get("is_available", True)),
                    )

        return Response(_serialize_zone(zone))

    def delete(self, request, pk):
        zone = self._get_zone(request, pk)
        if not zone:
            return Response({"detail": "Not found."}, status=404)
        zone.delete()
        return Response(status=204)


# ── Public Point-in-Zone + Service Check ─────────────────────────────────

class ServiceZoneCheckView(APIView):
    """
    POST /api/settings/service-zones/check/
    Public endpoint (no auth required).

    Body:
      {
        "lat": <float>,          -- required
        "lng": <float>,          -- required
        "service_slug": <str>,   -- optional; if provided, checks BOTH location and service
        "company_id": <int>      -- optional; auto-inferred on single-tenant installs
      }

    Response:
      {
        "in_zone": true/false,
        "service_allowed": true/false/null,  -- null when service_slug not provided
        "zone": { id, name, color, zone_type } | null,
        "available_services": ["cleaning", ...],  -- slugs allowed in zone (empty = all)
        "error_code": "SERVICE_NOT_ALLOWED_IN_ZONE" | ... | "",
        "message": "..."
      }

    Behaviour:
      - No active zones configured → in_zone: true, open_access: true
      - Outside all zones → in_zone: false, SERVICE_NOT_AVAILABLE_IN_AREA
      - Inside zone, service_slug not provided → in_zone: true, service_allowed: null
      - Inside zone, service allowed → in_zone: true, service_allowed: true
      - Inside zone, service blocked → in_zone: true, service_allowed: false,
        SERVICE_NOT_ALLOWED_IN_ZONE
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data

        # ── Parse coordinates ────────────────────────────────────────────
        raw_lat = data.get("lat") or data.get("latitude")
        raw_lng = data.get("lng") or data.get("longitude")

        if raw_lat is None or raw_lng is None:
            return Response(
                {"detail": "lat and lng are required.", "error_code": "LOCATION_REQUIRED"},
                status=400,
            )

        try:
            lat, lng = validate_coordinates(raw_lat, raw_lng)
        except ValueError as exc:
            return Response(
                {"detail": str(exc), "error_code": "INVALID_LOCATION"},
                status=400,
            )

        # str(): BookingPage may send a numeric category id; a JSON number
        # used to raise AttributeError -> HTTP 500 -> the picker failed open.
        service_slug = str(data.get("service_slug") or "").strip().lower()
        vehicle_class = str(data.get("vehicle_class") or "").strip().lower()

        # Route mode (Goods & Transport): drop_lat/drop_lng supplied -> check
        # BOTH ends and report which one failed.
        raw_drop_lat = data.get("drop_lat") or data.get("drop_latitude")
        raw_drop_lng = data.get("drop_lng") or data.get("drop_longitude")
        if raw_drop_lat is not None or raw_drop_lng is not None:
            from .service_zone_engine import check_route_coverage
            from companies.models import Company

            company = data.get("company_id") or Company.objects.only("id").first()
            route = check_route_coverage(
                pickup_lat=lat, pickup_lng=lng,
                drop_lat=raw_drop_lat, drop_lng=raw_drop_lng,
                service_slug=service_slug, company=company,
                vehicle_class=vehicle_class,
                stops=data.get("stops") or data.get("waypoints"),
            )
            return Response({
                "in_zone": route.allowed,
                "service_allowed": route.allowed,
                "failed_point": route.failed_point,
                "failed_stop_index": route.failed_stop_index,
                "error_code": route.error_code,
                "message": route.message,
                "coming_soon_zone": route.coming_soon_zone,
                "open_access": route.open_access,
                "pickup_zone": {"id": route.pickup_zone_id, "name": route.pickup_zone_name} if route.pickup_zone_id else None,
                "drop_zone": {"id": route.drop_zone_id, "name": route.drop_zone_name} if route.drop_zone_id else None,
            })

        # ── Resolve company ─────────────────────────────────────────────
        company_id = data.get("company_id")
        if not company_id and request.user and request.user.is_authenticated:
            if hasattr(request.user, "company_id") and request.user.company_id:
                company_id = request.user.company_id
        if not company_id:
            from companies.models import Company
            first = Company.objects.only("id").first()
            if first:
                company_id = first.id

        if not company_id:
            return Response({
                "in_zone": True,
                "service_allowed": None,
                "zone": None,
                "available_services": [],
                "error_code": "",
                "message": "No company configured — open access.",
                "open_access": True,
            })

        # ── Run zone check via engine ────────────────────────────────────
        from .service_zone_engine import find_zone_for_service
        from settings_hub.models import ServiceZone

        has_zones = ServiceZone.objects.filter(
            company_id=company_id, is_active=True
        ).exists()

        if not has_zones:
            return Response({
                "in_zone": True,
                "service_allowed": None,
                "zone": None,
                "available_services": [],
                "error_code": "",
                "message": "No service zones configured — open access.",
                "open_access": True,
            })

        result = find_zone_for_service(lat, lng, service_slug, company_id, vehicle_class=vehicle_class)

        # ── Build response ─────────────────────────────────────────────
        # A point geographically INSIDE an active zone that is rejected only
        # because the service / vehicle is not enabled there is still
        # "in zone" -- report it as service-unavailable, not "outside area".
        _IN_ZONE_BLOCK_CODES = ("SERVICE_NOT_ALLOWED_IN_ZONE", "VEHICLE_NOT_AVAILABLE_IN_ZONE")
        in_zone = (
            result.zone_id is not None
            or result.open_access
            or result.error_code in _IN_ZONE_BLOCK_CODES
        )

        # service_allowed: None if slug not provided (location-only check)
        if not service_slug:
            service_allowed = None
        else:
            service_allowed = result.allowed

        zone_data = None
        if result.zone_id:
            zone_data = {
                "id": result.zone_id,
                "name": result.zone_name,
            }

        return Response({
            "in_zone": in_zone,
            "service_allowed": service_allowed,
            "zone": zone_data,
            "available_services": result.available_services,
            "error_code": result.error_code if not result.allowed else "",
            "message": result.message,
            "open_access": result.open_access,
        }, status=200 if result.allowed else 200)  # Always 200; caller checks in_zone
class CityListView(APIView):
    """
    GET /api/settings/cities/
    Public endpoint (no auth required).

    GT-B-06: lets the frontend build a city picker / render a
    "coming soon" state for a booking category instead of every city
    being hardcoded into a separate page. Returns only active cities,
    ordered the way admins configured (display_order, then name).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        qs = City.objects.filter(is_active=True)
        launched_param = (request.query_params.get("launched") or "").strip().lower()
        if launched_param in ("true", "1", "yes"):
            qs = qs.filter(is_launched=True)
        cities = qs.order_by("display_order", "name")
        data = [
            {
                "id": c.id,
                "name": c.name,
                "slug": c.slug,
                "state": c.state,
                "is_launched": c.is_launched,
            }
            for c in cities
        ]
        return Response({"results": data, "count": len(data)})
