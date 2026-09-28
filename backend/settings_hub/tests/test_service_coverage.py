"""
settings_hub/tests/test_service_coverage.py

Service Coverage for Goods & Transport, built on the existing ServiceZone
geofence model (settings_hub.models.ServiceZone):

  1. Geometry      -- radius (haversine) and polygon (ray casting) math.
  2. Lifecycle     -- only ACTIVE zones are coverage; COMING_SOON / PAUSED
                      never make a point bookable; legacy is_active toggles
                      map onto the new status.
  3. Vehicle class -- optional per-zone restriction on ServiceTier vehicle
                      classes.
  4. Route check   -- BOTH pickup and drop validated, message names the end
                      that failed.
  5. Integration   -- /api/booking/ and /api/logistics/quote/ enforce it.
  6. Admin CRUD    -- /api/settings/service-zones/ accepts and validates
                      status / vehicle_classes / geometry, filters by service.
"""
import datetime
import json
import math
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import ServiceRequest
from settings_hub.models import ServiceZone, ServiceZoneService
from settings_hub.service_zone_engine import (
    check_route_coverage,
    find_zone_for_service,
)

User = get_user_model()

GT_TRUCK = "goods_transport_truck"
GT_BIKE = "goods_transport_two_wheeler"

HOSUR = (12.740900, 77.825300)
# Bengaluru drop used across the existing GT suite (~31 km from Hosur).
BLR_DROP = (12.935200, 77.624500)
# A square polygon around the Bengaluru drop (GeoJSON [lng, lat] order).
BLR_SQUARE = {
    "type": "Polygon",
    "coordinates": [[
        [77.55, 12.88], [77.70, 12.88], [77.70, 13.00], [77.55, 13.00], [77.55, 12.88],
    ]],
}


def north_of(lat, lng, km):
    """Point `km` due north using the same R=6371 km as the haversine check."""
    return round(math.degrees(math.radians(lat) + km / 6371.0), 6), lng


def _route(distance_km=31.0):
    return {"distance_km": distance_km, "duration_seconds": 3600, "source": "google_maps"}


class CoverageFixtureMixin:
    def setUp(self):
        super().setUp()
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.admin = User.objects.create_user(
            username="cov_admin", email="cov_admin@example.com", password="x-Pass-123!",
            role="admin", is_staff=True,
        )
        self.customer = User.objects.create_user(
            username="cov_cust", email="cov_cust@example.com", password="x-Pass-123!",
            role="customer", phone="9811111111",
        )
        self.client = APIClient()

    def make_zone(self, name, *, status="active", services=(GT_TRUCK,), vehicle_classes=None,
                  circle=None, polygon=None):
        kwargs = dict(company=self.company, created_by=self.admin, name=name, status=status,
                      vehicle_classes=vehicle_classes or [])
        if polygon is not None:
            kwargs.update(zone_type="polygon", polygon=polygon)
        else:
            (lat, lng), radius_km = circle
            kwargs.update(zone_type="circle", center_lat=lat, center_lng=lng,
                          radius_meters=radius_km * 1000)
        zone = ServiceZone.objects.create(**kwargs)
        for slug in services:
            ServiceZoneService.objects.create(zone=zone, service_slug=slug, service_name=slug)
        return zone

    def route(self, pickup=HOSUR, drop=BLR_DROP, service=GT_TRUCK, vehicle_class=""):
        return check_route_coverage(
            pickup_lat=pickup[0], pickup_lng=pickup[1], drop_lat=drop[0], drop_lng=drop[1],
            service_slug=service, company=self.company, vehicle_class=vehicle_class,
        )


# ── 1. Geometry ────────────────────────────────────────────────────────────

class CoverageGeometryTests(CoverageFixtureMixin, TestCase):
    def test_radius_boundary(self):
        zone = self.make_zone("Hosur 20km", circle=(HOSUR, 20))
        self.assertTrue(zone.contains_point(*north_of(*HOSUR, 19.9)))
        self.assertTrue(zone.contains_point(*north_of(*HOSUR, 20.0)))
        self.assertFalse(zone.contains_point(*north_of(*HOSUR, 20.1)))

    def test_radius_expansion_is_data_only(self):
        zone = self.make_zone("Hosur", circle=(HOSUR, 20))
        far = north_of(*HOSUR, 35)
        self.assertFalse(zone.contains_point(*far))
        zone.radius_meters = 40_000
        zone.save()
        zone.refresh_from_db()
        self.assertTrue(zone.contains_point(*far))

    def test_polygon_point_in_polygon(self):
        zone = self.make_zone("BLR square", polygon=BLR_SQUARE)
        self.assertTrue(zone.contains_point(*BLR_DROP))
        self.assertFalse(zone.contains_point(*HOSUR))
        self.assertFalse(zone.contains_point(12.95, 77.71))   # just east of the box

    def test_concave_polygon(self):
        # An "L": the notch at the top-right is OUTSIDE even though it is
        # inside the bounding box -- a bbox test would get this wrong.
        l_shape = {"type": "Polygon", "coordinates": [[
            [77.0, 12.0], [77.2, 12.0], [77.2, 12.1], [77.1, 12.1], [77.1, 12.2], [77.0, 12.2], [77.0, 12.0],
        ]]}
        zone = self.make_zone("L", polygon=l_shape)
        self.assertTrue(zone.contains_point(12.05, 77.15))    # bottom arm
        self.assertTrue(zone.contains_point(12.15, 77.05))    # left arm
        self.assertFalse(zone.contains_point(12.15, 77.15))   # the notch


# ── 2. Lifecycle ───────────────────────────────────────────────────────────

class CoverageStatusTests(CoverageFixtureMixin, TestCase):
    def test_status_drives_is_active(self):
        self.assertTrue(self.make_zone("a", circle=(HOSUR, 5)).is_active)
        self.assertFalse(self.make_zone("b", status="coming_soon", circle=(HOSUR, 5)).is_active)
        self.assertFalse(self.make_zone("c", status="paused", circle=(HOSUR, 5)).is_active)

    def test_legacy_is_active_false_becomes_paused(self):
        zone = ServiceZone.objects.create(
            company=self.company, name="legacy", zone_type="circle",
            center_lat=HOSUR[0], center_lng=HOSUR[1], radius_meters=5000, is_active=False,
        )
        self.assertEqual(zone.status, ServiceZone.STATUS_PAUSED)

    def test_coming_soon_and_paused_are_not_coverage(self):
        self.make_zone("Hosur", circle=(HOSUR, 20))
        self.make_zone("BLR soon", status="coming_soon", polygon=BLR_SQUARE)
        res = self.route()
        self.assertFalse(res.allowed)
        self.assertEqual(res.failed_point, "drop")
        self.assertEqual(res.error_code, "DROP_COMING_SOON")
        self.assertIn("coming soon to BLR soon", res.message)

        ServiceZone.objects.filter(name="BLR soon").update(status="paused")
        res = self.route()
        self.assertEqual(res.error_code, "DROP_OUT_OF_COVERAGE")

    def test_no_active_zone_means_open_access(self):
        # Geofencing not set up (only a Coming Soon zone): nothing is blocked,
        # same rule the pre-existing check_booking_eligibility uses.
        self.make_zone("soon", status="coming_soon", circle=(HOSUR, 5))
        res = self.route()
        self.assertTrue(res.allowed)
        self.assertTrue(res.open_access)


# ── 3 & 4. Vehicle class + route check ─────────────────────────────────────

class RouteCoverageTests(CoverageFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.hosur = self.make_zone("Hosur", circle=(HOSUR, 20))
        self.blr = self.make_zone("Bengaluru South", polygon=BLR_SQUARE)

    def test_both_in_coverage(self):
        res = self.route()
        self.assertTrue(res.allowed)
        self.assertEqual(res.pickup_zone_id, self.hosur.pk)
        self.assertEqual(res.drop_zone_id, self.blr.pk)

    def test_pickup_outside(self):
        res = self.route(pickup=north_of(*HOSUR, 60))
        self.assertFalse(res.allowed)
        self.assertEqual(res.failed_point, "pickup")
        self.assertEqual(res.error_code, "PICKUP_OUT_OF_COVERAGE")
        self.assertIn("pickup location is outside", res.message)

    def test_drop_outside(self):
        res = self.route(drop=(13.2, 77.9))
        self.assertFalse(res.allowed)
        self.assertEqual(res.failed_point, "drop")
        self.assertEqual(res.error_code, "DROP_OUT_OF_COVERAGE")
        self.assertIn("drop location is outside", res.message)

    def test_missing_drop_is_named(self):
        res = check_route_coverage(
            pickup_lat=HOSUR[0], pickup_lng=HOSUR[1], drop_lat=None, drop_lng=None,
            service_slug=GT_TRUCK, company=self.company,
        )
        self.assertEqual(res.failed_point, "drop")
        self.assertEqual(res.error_code, "DROP_LOCATION_REQUIRED")

    def test_zone_for_other_service_is_not_gt_coverage(self):
        ServiceZoneService.objects.filter(zone=self.blr).update(service_slug="plumbing", service_name="Plumbing")
        res = self.route()
        self.assertEqual(res.failed_point, "drop")

    def test_category_specific(self):
        # Truck-only zones don't cover a two-wheeler booking.
        res = self.route(service=GT_BIKE)
        self.assertFalse(res.allowed)
        self.assertEqual(res.failed_point, "pickup")

    def test_vehicle_restriction(self):
        self.blr.vehicle_classes = ["two_wheeler"]
        self.blr.save()
        self.assertTrue(self.blr.allows_vehicle_class("two_wheeler"))
        self.assertFalse(self.blr.allows_vehicle_class("truck"))
        self.assertTrue(self.blr.allows_vehicle_class(""))
        res = self.route(vehicle_class="truck")
        self.assertFalse(res.allowed)
        self.assertEqual(res.error_code, "DROP_VEHICLE_NOT_AVAILABLE")
        self.assertTrue(self.route(vehicle_class="").allowed)

    def test_overlap_any_active_zone_suffices(self):
        # Pickup also inside a zone that forbids trucks; the unrestricted
        # Hosur zone still covers it.
        self.make_zone("Hosur bikes only", circle=(HOSUR, 5), vehicle_classes=["two_wheeler"])
        self.assertTrue(self.route(vehicle_class="truck").allowed)

    def test_find_zone_vehicle_code(self):
        self.hosur.vehicle_classes = ["two_wheeler"]
        self.hosur.save()
        res = find_zone_for_service(*HOSUR, GT_TRUCK, self.company.pk, vehicle_class="truck")
        self.assertEqual(res.error_code, "VEHICLE_NOT_AVAILABLE_IN_ZONE")


# ── 5. Integration: booking + quote + public check ────────────────────────

class CoverageBookingIntegrationTests(CoverageFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.make_zone("Hosur", circle=(HOSUR, 20))
        self.make_zone("Bengaluru South", polygon=BLR_SQUARE)
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-cov",
            name="Tata Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"), loading_unloading_charge=Decimal("100.00"),
            vehicle_class="truck",
        )

    def _book(self, pickup=HOSUR, drop=BLR_DROP, name="Cov Customer"):
        self.client.force_authenticate(user=self.customer)
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            return self.client.post("/api/booking/", {
                "customer_name": name,
                "phone": self.customer.phone,
                "email": self.customer.email,
                "service_category": GT_TRUCK,
                "issue_title": "Mini truck",
                "description": "2 boxes, approx 40kg, nothing fragile.",
                "address": "Pickup",
                "latitude": str(pickup[0]), "longitude": str(pickup[1]),
                "drop_address": "Drop",
                "drop_latitude": str(drop[0]), "drop_longitude": str(drop[1]),
                "preferred_date": str(datetime.date.today() + datetime.timedelta(days=1)),
                "total_amount": "1.00",
                "payment_method": "COD",
                "logistics_tier": self.tier.id,
            }, format="json")

    def _quote(self, pickup=HOSUR, drop=BLR_DROP):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            return self.client.post("/api/logistics/quote/", data=json.dumps({
                "service_category": GT_TRUCK, "tier_id": self.tier.id,
                "pickup_latitude": str(pickup[0]), "pickup_longitude": str(pickup[1]),
                "drop_latitude": str(drop[0]), "drop_longitude": str(drop[1]),
            }), content_type="application/json")

    def test_booking_in_coverage_succeeds(self):
        resp = self._book()
        self.assertIn(resp.status_code, (200, 201), resp.content)
        sr = ServiceRequest.objects.get(customer_name="Cov Customer")
        self.assertEqual(sr.service_zone_name_snapshot, "Hosur")

    def test_booking_pickup_out_of_coverage_blocked(self):
        resp = self._book(pickup=north_of(*HOSUR, 60))
        self.assertEqual(resp.status_code, 400, resp.content)
        body = resp.json()
        self.assertEqual(body["error_code"], "PICKUP_OUT_OF_COVERAGE")
        self.assertEqual(body["failed_point"], "pickup")
        self.assertIn("pickup location", body["message"])
        self.assertFalse(ServiceRequest.objects.filter(customer_name="Cov Customer").exists())

    def test_booking_drop_out_of_coverage_blocked(self):
        resp = self._book(drop=(13.2, 77.9))
        self.assertEqual(resp.status_code, 400, resp.content)
        body = resp.json()
        self.assertEqual(body["error_code"], "DROP_OUT_OF_COVERAGE")
        self.assertEqual(body["failed_point"], "drop")
        self.assertIn("drop location", body["message"])
        self.assertFalse(ServiceRequest.objects.filter(customer_name="Cov Customer").exists())

    def test_booking_drop_in_coming_soon_zone_blocked(self):
        ServiceZone.objects.filter(name="Bengaluru South").update(status="coming_soon", is_active=False)
        resp = self._book()
        self.assertEqual(resp.status_code, 400, resp.content)
        self.assertEqual(resp.json()["error_code"], "DROP_COMING_SOON")

    def test_booking_vehicle_restricted_zone_blocked(self):
        z = ServiceZone.objects.get(name="Hosur")
        z.vehicle_classes = ["two_wheeler"]
        z.save()
        resp = self._book()
        self.assertEqual(resp.status_code, 400, resp.content)
        self.assertEqual(resp.json()["error_code"], "PICKUP_VEHICLE_NOT_AVAILABLE")
        self.assertIn("Tata Ace", resp.json()["message"])

    def test_quote_gate_real_time(self):
        self.assertEqual(self._quote().status_code, 200)
        resp = self._quote(drop=(13.2, 77.9))
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["failed_point"], "drop")
        self.assertEqual(resp.json()["error_code"], "DROP_OUT_OF_COVERAGE")
        resp = self._quote(pickup=north_of(*HOSUR, 60))
        self.assertEqual(resp.json()["failed_point"], "pickup")

    def test_public_check_route_mode(self):
        resp = self.client.post("/api/settings/service-zones/check/", {
            "lat": HOSUR[0], "lng": HOSUR[1], "drop_lat": 13.2, "drop_lng": 77.9,
            "service_slug": GT_TRUCK,
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["in_zone"])
        self.assertEqual(resp.json()["failed_point"], "drop")

    def test_home_services_booking_path_unchanged(self):
        # A non-GT booking still goes through the single-point zone gate.
        ServiceZone.objects.filter(name="Hosur").delete()
        self.client.force_authenticate(user=self.customer)
        resp = self.client.post("/api/booking/", {
            "customer_name": "HS", "phone": "9822222222", "email": "hs@example.com",
            "service_category": "plumbing", "issue_title": "Leak", "address": "Hosur",
            "preferred_date": str(datetime.date.today() + datetime.timedelta(days=1)),
            "preferred_time": "10-11", "latitude": HOSUR[0], "longitude": HOSUR[1],
            "total_amount": "500",
        }, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "SERVICE_NOT_AVAILABLE_IN_AREA")


# ── 6. Admin CRUD ──────────────────────────────────────────────────────────

class CoverageAdminCrudTests(CoverageFixtureMixin, TestCase):
    URL = "/api/settings/service-zones/"

    def _create(self, **overrides):
        body = {
            "name": "Hosur GT", "zone_type": "circle",
            "center_lat": HOSUR[0], "center_lng": HOSUR[1], "radius_meters": 20000,
            "status": "coming_soon", "vehicle_classes": ["truck", "two_wheeler"],
            "services": [{"service_slug": GT_TRUCK, "service_name": "Mini Truck"}],
        }
        body.update(overrides)
        self.client.force_authenticate(user=self.admin)
        return self.client.post(self.URL, body, format="json")

    def test_create_returns_new_fields(self):
        resp = self._create()
        self.assertEqual(resp.status_code, 201, resp.content)
        data = resp.json()
        self.assertEqual(data["status"], "coming_soon")
        self.assertFalse(data["is_active"])
        self.assertEqual(data["vehicle_classes"], ["truck", "two_wheeler"])
        self.assertEqual(data["services"][0]["service_slug"], GT_TRUCK)

    def test_create_polygon(self):
        resp = self._create(zone_type="polygon", polygon=BLR_SQUARE, status="active",
                            center_lat=None, center_lng=None)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertTrue(resp.json()["is_active"])
        self.assertAlmostEqual(resp.json()["center_lat"], (12.88 * 3 + 13.0 * 2) / 5, places=4)

    def test_validation_errors(self):
        bad = [
            dict(vehicle_classes=["spaceship"]),
            dict(status="live"),
            dict(radius_meters=-5),
            dict(center_lat=123),
            dict(zone_type="polygon", polygon={"type": "Polygon", "coordinates": [[[77.5, 12.9], [77.6, 12.9]]]}),
        ]
        for overrides in bad:
            with self.subTest(overrides=overrides):
                self.assertEqual(self._create(**overrides).status_code, 400)
        self.assertEqual(ServiceZone.objects.count(), 0)

    def test_patch_status_and_legacy_toggle(self):
        zid = self._create().json()["id"]
        resp = self.client.patch(f"{self.URL}{zid}/", {"status": "active"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["is_active"])
        resp = self.client.patch(f"{self.URL}{zid}/", {"is_active": False}, format="json")
        self.assertEqual(resp.json()["status"], "paused")
        resp = self.client.patch(f"{self.URL}{zid}/", {"vehicle_classes": []}, format="json")
        self.assertEqual(resp.json()["vehicle_classes"], [])
        resp = self.client.patch(f"{self.URL}{zid}/", {"radius_meters": 0}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_list_filters_by_service(self):
        self._create()
        self._create(name="HS zone", services=[{"service_slug": "plumbing"}])
        resp = self.client.get(f"{self.URL}?services={GT_TRUCK},{GT_BIKE}")
        names = [z["name"] for z in resp.json()]
        self.assertEqual(names, ["Hosur GT"])

    def test_delete(self):
        zid = self._create().json()["id"]
        self.assertEqual(self.client.delete(f"{self.URL}{zid}/").status_code, 204)
        self.assertFalse(ServiceZone.objects.filter(pk=zid).exists())

    def test_customer_cannot_write(self):
        self.client.force_authenticate(user=self.customer)
        resp = self.client.post(self.URL, {"name": "x", "zone_type": "circle",
                                           "center_lat": HOSUR[0], "center_lng": HOSUR[1]}, format="json")
        self.assertEqual(resp.status_code, 403)


# ── 7. Regression: the real admin-created "Hosur" zone ─────────────────────

HOSUR_ADMIN_CENTER = (12.737891, 77.823987)
ALL_GT_SERVICES = (GT_TRUCK, GT_BIKE, "packers_movers")
ALL_VEHICLES = ["two_wheeler", "three_wheeler", "tata_ace", "pickup_8ft"]


class HosurAdminZoneRegressionTests(CoverageFixtureMixin, TestCase):
    """Mirrors the zone an admin saved from the Service Coverage tab:
    Active, all 3 GT services, all vehicle types, 10 km radius. The booking
    pages' address picker used to send legacy slugs ("goods-transport",
    "two-wheelers") that no longer matched after "goods"/"transport" were
    excluded from fuzzy token matching -> false "outside service area"."""

    CHECK_URL = "/api/settings/service-zones/check/"

    def setUp(self):
        super().setUp()
        self.zone = self.make_zone(
            "Hosur", services=ALL_GT_SERVICES, vehicle_classes=list(ALL_VEHICLES),
            circle=(HOSUR_ADMIN_CENTER, 10),
        )

    def check(self, point, slug, vehicle_class=""):
        body = {"lat": point[0], "lng": point[1], "service_slug": slug}
        if vehicle_class:
            body["vehicle_class"] = vehicle_class
        return self.client.post(self.CHECK_URL, body, format="json").json()

    def test_canonical_slugs_allowed_inside(self):
        for slug in ALL_GT_SERVICES:
            for point in (HOSUR_ADMIN_CENTER, north_of(*HOSUR_ADMIN_CENTER, 9)):
                res = find_zone_for_service(*point, slug, self.company.pk)
                self.assertTrue(res.allowed, f"{slug} @ {point}: {res.error_code}")
                self.assertEqual(res.zone_id, self.zone.pk)

    def test_legacy_goods_transport_slug_matches(self):
        res = find_zone_for_service(*HOSUR_ADMIN_CENTER, "goods-transport", self.company.pk)
        self.assertTrue(res.allowed, res.error_code)

    def test_legacy_two_wheelers_slug_matches(self):
        res = find_zone_for_service(*HOSUR_ADMIN_CENTER, "two-wheelers", self.company.pk)
        self.assertTrue(res.allowed, res.error_code)

    def test_legacy_aliases_stay_category_specific(self):
        # A truck-only zone must still not serve a two-wheeler request, and
        # "goods-transport" must never unlock a Packers & Movers-only zone.
        truck_only = self.make_zone("Truck only", services=(GT_TRUCK,), circle=((13.3, 77.9), 5))
        pm_only = self.make_zone("PM only", services=("packers_movers",), circle=((13.6, 77.9), 5))
        res = find_zone_for_service(13.3, 77.9, "two-wheelers", self.company.pk)
        self.assertFalse(res.allowed)
        self.assertEqual(res.error_code, "SERVICE_NOT_ALLOWED_IN_ZONE")
        res = find_zone_for_service(13.6, 77.9, "goods-transport", self.company.pk)
        self.assertFalse(res.allowed)
        self.assertTrue(truck_only.pk and pm_only.pk)

    def test_endpoint_inside_zone_all_services(self):
        for slug in ALL_GT_SERVICES + ("goods-transport", "two-wheelers"):
            data = self.check(HOSUR_ADMIN_CENTER, slug)
            self.assertTrue(data["in_zone"], slug)
            self.assertTrue(data["service_allowed"], slug)
            self.assertEqual(data["zone"]["name"], "Hosur")

    def test_endpoint_outside_radius_is_outside(self):
        data = self.check(north_of(*HOSUR_ADMIN_CENTER, 11), GT_TRUCK)
        self.assertFalse(data["in_zone"])
        self.assertEqual(data["error_code"], "SERVICE_NOT_AVAILABLE_IN_AREA")

    def test_endpoint_inside_but_service_or_vehicle_blocked_is_not_outside(self):
        ServiceZoneService.objects.filter(zone=self.zone, service_slug=GT_BIKE).delete()
        data = self.check(HOSUR_ADMIN_CENTER, GT_BIKE)
        self.assertTrue(data["in_zone"])
        self.assertFalse(data["service_allowed"])
        self.assertEqual(data["error_code"], "SERVICE_NOT_ALLOWED_IN_ZONE")

        self.zone.vehicle_classes = ["two_wheeler"]
        self.zone.save()
        data = self.check(HOSUR_ADMIN_CENTER, GT_TRUCK, vehicle_class="tata_ace")
        self.assertTrue(data["in_zone"])
        self.assertFalse(data["service_allowed"])
        self.assertEqual(data["error_code"], "VEHICLE_NOT_AVAILABLE_IN_ZONE")


# ── 8. Regression: GT / P&M check must match what the map draws ────────────
# MapPickerScreen draws zones from /settings/service-zones/?services=<slug>
# (exact ServiceZoneService.service_slug match). The coverage check used to
# also accept (a) zones with NO service assignments and (b) fuzzy/alias name
# matches, so a point visibly outside the drawn Hosur polygon still passed.

# Real admin-drawn Hosur polygon (lat, lng vertices) -> GeoJSON [lng, lat].
HOSUR_POLY_VERTICES = [
    (12.776815, 77.835739), (12.758415, 77.790825),
    (12.715048, 77.816810), (12.739077, 77.855131),
]
HOSUR_POLYGON = {
    "type": "Polygon",
    "coordinates": [[[lng, lat] for lat, lng in HOSUR_POLY_VERTICES]
                    + [[HOSUR_POLY_VERTICES[0][1], HOSUR_POLY_VERTICES[0][0]]]],
}
POLY_INSIDE = (12.745000, 77.825000)
POLY_OUTSIDE = (12.700000, 77.780000)   # outside polygon, inside the 20 km zones below


class GTCheckMatchesMapZonesTests(CoverageFixtureMixin, TestCase):
    CHECK_URL = "/api/settings/service-zones/check/"
    MAP_URL = "/api/settings/service-zones/"

    def setUp(self):
        super().setUp()
        self.hosur = self.make_zone("Hosur GT polygon", services=ALL_GT_SERVICES,
                                    polygon=HOSUR_POLYGON)

    def _unassigned_zone(self):
        return self.make_zone("General home services", services=(),
                              circle=((12.74, 77.82), 20))

    def _fuzzy_zone(self):
        # "mini-truck-transport" alias-matches goods_transport_truck in the
        # fuzzy matcher, but is NOT the canonical slug the map filters on.
        return self.make_zone("Truck rental", services=("mini-truck-transport",),
                              circle=((12.74, 77.82), 20))

    def test_geometry_sanity(self):
        self.assertTrue(self.hosur.contains_point(*POLY_INSIDE))
        self.assertFalse(self.hosur.contains_point(*POLY_OUTSIDE))

    def test_unassigned_zone_no_longer_grants_gt_coverage(self):
        general = self._unassigned_zone()
        self.assertTrue(general.contains_point(*POLY_OUTSIDE))
        for slug in ALL_GT_SERVICES:
            res = find_zone_for_service(*POLY_OUTSIDE, slug, self.company.pk)
            self.assertFalse(res.allowed, slug)
            self.assertEqual(res.error_code, "SERVICE_NOT_AVAILABLE_IN_AREA", slug)
            res = find_zone_for_service(*POLY_INSIDE, slug, self.company.pk)
            self.assertTrue(res.allowed, slug)
            self.assertEqual(res.zone_id, self.hosur.pk, slug)

    def test_fuzzy_named_zone_no_longer_grants_gt_coverage(self):
        self._fuzzy_zone()
        res = find_zone_for_service(*POLY_OUTSIDE, GT_TRUCK, self.company.pk)
        self.assertFalse(res.allowed)
        res = find_zone_for_service(*POLY_INSIDE, GT_TRUCK, self.company.pk)
        self.assertTrue(res.allowed)
        self.assertEqual(res.zone_id, self.hosur.pk)

    def test_route_drop_outside_polygon_blocked(self):
        self._unassigned_zone()
        self._fuzzy_zone()
        res = self.route(pickup=POLY_INSIDE, drop=POLY_OUTSIDE, service=GT_TRUCK)
        self.assertFalse(res.allowed)
        self.assertEqual(res.failed_point, "drop")
        res = self.route(pickup=POLY_INSIDE, drop=POLY_INSIDE, service="packers_movers")
        self.assertTrue(res.allowed)
        self.assertEqual(res.pickup_zone_id, self.hosur.pk)

    def test_check_endpoint_agrees_with_map_endpoint(self):
        self._unassigned_zone()
        self._fuzzy_zone()
        self.client.force_authenticate(self.admin)
        drawn = self.client.get(f"{self.MAP_URL}?services={GT_TRUCK}").json()
        drawn = drawn.get("results", drawn) if isinstance(drawn, dict) else drawn
        self.assertEqual([z["name"] for z in drawn], ["Hosur GT polygon"])
        self.client.force_authenticate(None)
        out = self.client.post(self.CHECK_URL, {"lat": POLY_OUTSIDE[0], "lng": POLY_OUTSIDE[1],
                                                "service_slug": GT_TRUCK}, format="json").json()
        self.assertFalse(out["service_allowed"])
        inside = self.client.post(self.CHECK_URL, {"lat": POLY_INSIDE[0], "lng": POLY_INSIDE[1],
                                                   "service_slug": GT_TRUCK}, format="json").json()
        self.assertTrue(inside["service_allowed"])
        self.assertEqual(inside["zone"]["name"], "Hosur GT polygon")

    def test_home_services_still_use_unassigned_zone(self):
        general = self._unassigned_zone()
        res = find_zone_for_service(*POLY_OUTSIDE, "plumbing", self.company.pk)
        self.assertTrue(res.allowed)
        self.assertEqual(res.zone_id, general.pk)

    def test_legacy_gt_aliases_keep_loose_matching(self):
        # Non-canonical legacy slugs are intentionally untouched by this fix.
        res = find_zone_for_service(*POLY_INSIDE, "goods-transport", self.company.pk)
        self.assertTrue(res.allowed)
