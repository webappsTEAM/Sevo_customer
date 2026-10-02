"""
Regression: lanes created through the admin Lanes API must carry a
LogisticsCategory value ("truck"), not the ServiceRequest slug
("goods_transport_truck", 21 chars > the 20-char column), so the ordinary
truck fare engine and Light PTL can actually use them.
"""
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import Lane
from service_requests.services.logistics_pricing import resolve_logistics_fare
from service_requests.tests.test_gt_ptl import _policy, _quote, _tier, _user

TRUCK = "goods_transport_truck"


class AdminLaneCategoryRegressionTests(TestCase):
    def setUp(self):
        self.c = APIClient()
        self.c.force_authenticate(_user("admin"))

    def _create(self, category, **extra):
        body = {"category": category, "city": "hosur", "destination_label": "Bengaluru Hub",
                "fare": "1500", "ptl_rate_per_kg": "3.00",
                "destination_latitude": "12.9716", "destination_longitude": "77.5946", **extra}
        return self.c.post("/api/logistics/admin/lanes/", body, format="json")

    def test_legacy_form_value_is_stored_as_truck_and_prices_everywhere(self):
        r = self._create("goods_transport_truck")          # what the old form sent
        self.assertEqual(r.status_code, 200, r.content)
        lane = Lane.objects.get(destination_label="Bengaluru Hub")
        self.assertEqual(lane.category, "truck")

        # Customer lane listing (used by the truck booking pages)
        listed = APIClient().get("/api/logistics/lanes/", {"category": "truck", "city": "hosur"}).json()
        self.assertIn(lane.id, [row["id"] for row in listed["data"]])

        # Ordinary truck fare engine: the lane's configured fare wins.
        tier = _tier()
        fare = resolve_logistics_fare(service_category=TRUCK, logistics_tier=tier,
                                      logistics_lane=lane, submitted_amount=None)
        fare = fare[0] if isinstance(fare, tuple) else fare
        self.assertEqual(Decimal(fare), Decimal("1500.00"))

        # Light PTL: the lane rate overrides the platform rate.
        _policy(rate_per_kg=Decimal("4.00"))
        q = _quote(tier, "300", lane=lane)
        self.assertEqual(q["rate_source"], "lane")
        self.assertEqual(q["total"], Decimal("900.00"))      # 300 kg x Rs.3 lane rate

    def test_canonical_value_and_filter_alias(self):
        self.assertEqual(self._create("truck").status_code, 200)
        self.assertEqual(Lane.objects.get().category, "truck")
        rows = self.c.get("/api/logistics/admin/lanes/", {"category": "goods_transport_truck"}).json()["data"]
        self.assertEqual(len(rows), 1)

    def test_invalid_category_refused_on_create_and_patch(self):
        self.assertEqual(self._create("spaceship").status_code, 400)
        self.assertFalse(Lane.objects.exists())
        self._create("truck")
        lane = Lane.objects.get()
        r = self.c.patch(f"/api/logistics/admin/lanes/{lane.id}/", {"category": "bogus"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.c.patch(f"/api/logistics/admin/lanes/{lane.id}/",
                         {"category": "goods_transport_two_wheeler"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        lane.refresh_from_db()
        self.assertEqual(lane.category, "two_wheeler")


class AdminLaneFixedFareNeedsCoordinatesTests(TestCase):
    """GT_LANE_ADMIN_COORDS: a fixed-fare truck/2W lane must be verifiable."""
    URL = "/api/logistics/admin/lanes/"

    def setUp(self):
        self.c = APIClient()
        self.c.force_authenticate(_user("admin"))

    def _post(self, **extra):
        body = {"category": "truck", "city": "hosur", "destination_label": "Bengaluru", "fare": "900", **extra}
        return self.c.post(self.URL, body, format="json")

    def test_create_without_coordinates_refused(self):
        r = self._post()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error_code"] if "error_code" in r.json() else r.json().get("code"), "LANE_COORDS_REQUIRED")
        self.assertFalse(Lane.objects.exists())

    def test_create_with_coordinates_ok_and_zero_fare_or_inactive_exempt(self):
        self.assertEqual(self._post(destination_latitude="12.97", destination_longitude="77.59").status_code, 200)
        self.assertEqual(self._post(destination_label="Zero", fare="0").status_code, 200)
        self.assertEqual(self._post(destination_label="Off", is_active=False).status_code, 200)

    def test_patch_cannot_clear_coordinates_or_activate_coordless_fare_lane(self):
        lane = Lane.objects.create(category="truck", city="hosur", destination_label="L", fare=Decimal("0"),
                                   destination_latitude=Decimal("12.97"), destination_longitude=Decimal("77.59"), is_active=True)
        url = f"{self.URL}{lane.id}/"
        self.assertEqual(self.c.patch(url, {"fare": "800"}, format="json").status_code, 200)
        self.assertEqual(self.c.patch(url, {"destination_latitude": ""}, format="json").status_code, 400)
        lane.refresh_from_db()
        self.assertIsNotNone(lane.destination_latitude)
