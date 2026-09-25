"""
Regression: a location far outside every configured zone (reported case:
"Kollupalli, Andhra Pradesh" vs. a Hosur-area zone) must be rejected for
EVERY service, not only Goods & Transport / Packers & Movers.

Also covers the "drawn-set consistency" rule generalised to all services:
when at least one zone is explicitly assigned to the requested service slug,
the customer map picker draws ONLY those zones
(/settings/service-zones/?services=<slug>), so coverage must be decided by
those zones only -- an undrawn unassigned / fuzzy-matched zone must not grant
coverage outside the drawn boundary.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from companies.models import Company
from settings_hub.models import ServiceZone, ServiceZoneService
from settings_hub.service_zone_engine import (
    check_booking_eligibility,
    find_zone_for_service,
)

HOSUR_LAT, HOSUR_LNG = 12.7409, 77.8253
# Kollupalli, Andhra Pradesh (approx.) -- well over 60 km from Hosur.
KOLLUPALLI_LAT, KOLLUPALLI_LNG = 13.2900, 78.5600

GENERIC_SLUGS = ["plumbing", "cleaning", "electrical", "ac", "general", "7", ""]


class KollupalliOutOfAreaAllServicesTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="Hosur Co")
        self.client = APIClient()

    def _zone(self, name, radius_m, lat=HOSUR_LAT, lng=HOSUR_LNG, services=()):
        z = ServiceZone.objects.create(
            company=self.company, name=name, zone_type="circle",
            center_lat=lat, center_lng=lng, radius_meters=radius_m,
        )
        for slug, avail in services:
            ServiceZoneService.objects.create(zone=z, service_slug=slug, service_name=slug, is_available=avail)
        return z

    def test_kollupalli_is_far_outside_hosur(self):
        dist = ServiceZone._haversine(KOLLUPALLI_LAT, KOLLUPALLI_LNG, HOSUR_LAT, HOSUR_LNG)
        self.assertGreater(dist, 60_000)

    def test_unassigned_local_zone_rejects_kollupalli_for_every_service(self):
        self._zone("Hosur City", 20_000)
        for slug in GENERIC_SLUGS:
            with self.subTest(slug=slug):
                res = find_zone_for_service(KOLLUPALLI_LAT, KOLLUPALLI_LNG, slug, self.company.pk)
                self.assertFalse(res.allowed)
                self.assertEqual(res.error_code, "SERVICE_NOT_AVAILABLE_IN_AREA")
                elig = check_booking_eligibility(KOLLUPALLI_LAT, KOLLUPALLI_LNG, slug, self.company)
                self.assertFalse(elig.allowed)

    def test_assigned_local_zone_rejects_kollupalli(self):
        self._zone("Hosur Plumbing", 15_000, services=[("plumbing", True)])
        self._zone("Hosur General", 25_000)
        res = find_zone_for_service(KOLLUPALLI_LAT, KOLLUPALLI_LNG, "plumbing", self.company.pk)
        self.assertFalse(res.allowed)

    def test_public_check_endpoint_reports_out_of_zone(self):
        self._zone("Hosur City", 20_000)
        for slug in ["plumbing", "cleaning", "7", "general"]:
            with self.subTest(slug=slug):
                r = self.client.post("/api/settings/service-zones/check/", {
                    "lat": KOLLUPALLI_LAT, "lng": KOLLUPALLI_LNG, "service_slug": slug,
                }, format="json")
                self.assertEqual(r.status_code, 200)
                body = r.json()
                self.assertFalse(body["in_zone"])
                self.assertFalse(body["open_access"])
                self.assertIsNone(body["zone"])
                self.assertEqual(body["error_code"], "SERVICE_NOT_AVAILABLE_IN_AREA")

    def test_public_check_endpoint_numeric_service_slug_does_not_500(self):
        # BookingPage sends category.id (a numeric id) as service_slug; a JSON
        # number must never crash the endpoint (a 5xx makes the picker fail open).
        self._zone("Hosur City", 20_000)
        r = self.client.post("/api/settings/service-zones/check/", {
            "lat": KOLLUPALLI_LAT, "lng": KOLLUPALLI_LNG, "service_slug": 7,
        }, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["in_zone"])


class DrawnZoneConsistencyAllServicesTests(TestCase):
    """Generalises STRICT_MATCH_SERVICE_SLUGS to every service slug that has
    at least one explicit zone assignment."""

    def setUp(self):
        self.company = Company.objects.create(company_name="Hosur Co")
        # Small cleaning zone, drawn on the map for ?services=cleaning.
        self.small = ServiceZone.objects.create(
            company=self.company, name="Hosur Cleaning", zone_type="circle",
            center_lat=HOSUR_LAT, center_lng=HOSUR_LNG, radius_meters=5_000,
        )
        ServiceZoneService.objects.create(zone=self.small, service_slug="cleaning", service_name="Cleaning")
        # Large unassigned zone reaching ~90 km -- NOT drawn for ?services=cleaning.
        self.big = ServiceZone.objects.create(
            company=self.company, name="Legacy Big Zone", zone_type="circle",
            center_lat=HOSUR_LAT, center_lng=HOSUR_LNG, radius_meters=120_000,
        )

    def test_assigned_service_outside_drawn_zone_is_rejected(self):
        res = find_zone_for_service(KOLLUPALLI_LAT, KOLLUPALLI_LNG, "cleaning", self.company.pk)
        self.assertFalse(res.allowed)
        self.assertEqual(res.error_code, "SERVICE_NOT_AVAILABLE_IN_AREA")

    def test_assigned_service_inside_drawn_zone_is_allowed(self):
        res = find_zone_for_service(HOSUR_LAT + 0.01, HOSUR_LNG, "cleaning", self.company.pk)
        self.assertTrue(res.allowed)
        self.assertEqual(res.zone_id, self.small.pk)

    def test_fuzzy_alias_zone_does_not_grant_coverage_when_exact_zone_exists(self):
        # "full-house-cleaning" aliases to "cleaning"; it is not drawn for
        # ?services=cleaning so it must not extend cleaning coverage.
        alias = ServiceZone.objects.create(
            company=self.company, name="Alias Zone", zone_type="circle",
            center_lat=KOLLUPALLI_LAT, center_lng=KOLLUPALLI_LNG, radius_meters=5_000,
        )
        ServiceZoneService.objects.create(zone=alias, service_slug="full-house-cleaning", service_name="FHC")
        res = find_zone_for_service(KOLLUPALLI_LAT, KOLLUPALLI_LNG, "cleaning", self.company.pk)
        self.assertFalse(res.allowed)

    def test_service_without_any_assignment_keeps_open_zone_behaviour(self):
        # No zone is assigned "plumbing": the picker draws all zones, so an
        # unassigned zone still covers plumbing INSIDE its own boundary.
        res = find_zone_for_service(KOLLUPALLI_LAT, KOLLUPALLI_LNG, "plumbing", self.company.pk)
        self.assertTrue(res.allowed)
        self.assertEqual(res.zone_id, self.big.pk)
        far = find_zone_for_service(20.0, 80.0, "plumbing", self.company.pk)
        self.assertFalse(far.allowed)
