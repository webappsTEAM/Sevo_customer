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

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ServiceZone, ServiceZoneService
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
        "zone_type": zone.zone_type,
        "center_lat": zone.center_lat,
        "center_lng": zone.center_lng,
        "radius_meters": zone.radius_meters,
        "polygon": zone.polygon,
        "services": services,
        "created_at": zone.created_at.isoformat(),
        "updated_at": zone.updated_at.isoformat(),
    }


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
            radius_meters = float(data.get("radius_meters", 5000))
            if center_lat is None or center_lng is None:
                return Response({"detail": "center_lat and center_lng are required for circle zones."}, status=400)
            polygon = None
        else:
            polygon = data.get("polygon")
            if not polygon or not isinstance(polygon, dict):
                return Response({"detail": "polygon (GeoJSON) is required for polygon zones."}, status=400)
            center_lat = data.get("center_lat")
            center_lng = data.get("center_lng")
            radius_meters = float(data.get("radius_meters", 5000))

        zone = ServiceZone.objects.create(
            company=company,
            created_by=request.user,
            name=name,
            description=(data.get("description") or "").strip(),
            color=data.get("color", "#4F46E5"),
            is_active=bool(data.get("is_active", True)),
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
        # Resolve company
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
        if "color" in data:
            zone.color = data["color"]
        if "is_active" in data:
            zone.is_active = bool(data["is_active"])
        if "zone_type" in data:
            zone.zone_type = data["zone_type"]
        if "center_lat" in data:
            zone.center_lat = data["center_lat"]
        if "center_lng" in data:
            zone.center_lng = data["center_lng"]
        if "radius_meters" in data:
            zone.radius_meters = float(data["radius_meters"])
        if "polygon" in data:
            zone.polygon = data["polygon"]
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

        service_slug = (data.get("service_slug") or "").strip().lower()

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

        result = find_zone_for_service(lat, lng, service_slug, company_id)

        # ── Build response ─────────────────────────────────────────────
        in_zone = result.zone_id is not None or result.open_access

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
