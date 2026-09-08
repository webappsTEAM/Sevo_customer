"""
service_requests/tests/test_gt_customer_location_stale_guard.py

POST /api/booking/<id>/update-location/ used to assign
technician_latitude/longitude straight onto the row and ignore `captured_at`
entirely. A packet that arrived late therefore overwrote a NEWER position --
the live marker jumped backwards along the route until the next fresh packet
happened to land -- and no TechnicianLocation row was written, so heading,
speed and accuracy were dropped and there was no trail to reconstruct.

Demonstrated end-to-end against PostgreSQL: a fix captured at t-90s replaced
one captured at t-30s.

The endpoint now routes coordinates through record_technician_fix(), the same
service the technician app and the workforce webhook already use, so the
transports cannot drift apart again.
"""
import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from service_requests.models import ServiceRequest, TechnicianLocation

User = get_user_model()


class CustomerLocationStaleGuardTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="loc_admin", email="loc_admin@example.com",
            phone="9000009001", role="admin", is_staff=True,
        )
        self.customer = User.objects.create_user(
            username="loc_cust", email="loc_cust@example.com",
            phone="9000009002", role="customer",
        )
        self.sr = ServiceRequest.objects.create(
            customer=self.customer, customer_name="Loc Test", phone="9000009002",
            service_category="goods_transport_truck", issue_title="loc",
            address="Hosur", latitude=Decimal("12.740900"), longitude=Decimal("77.825300"),
            preferred_date=timezone.localdate(), status=ServiceRequest.Status.IN_PROGRESS,
            total_amount=Decimal("100.00"),
        )
        self.url = "/api/booking/%s/update-location/" % self.sr.pk
        self.now = timezone.now()

    def _post(self, lat, lng, seconds_ago, auth=True, **extra):
        if auth:
            self.client.force_authenticate(user=self.admin)
        else:
            self.client.force_authenticate(user=None)
        body = {
            "latitude": lat, "longitude": lng,
            "captured_at": (self.now - datetime.timedelta(seconds=seconds_ago)).isoformat(),
        }
        body.update(extra)
        return self.client.post(self.url, body, format="json")

    # ── the guard ────────────────────────────────────────────────────────

    def test_a_fresh_fix_is_applied(self):
        r = self._post("12.750000", "77.830000", 60)
        self.assertEqual(r.status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.technician_latitude, Decimal("12.750000"))

    def test_a_newer_fix_updates_the_position(self):
        self._post("12.750000", "77.830000", 60)
        r = self._post("12.760000", "77.835000", 30)
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("ignored", r.data.get("data", {}))
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.technician_latitude, Decimal("12.760000"))

    def test_a_stale_fix_never_overwrites_a_newer_position(self):
        self._post("12.760000", "77.835000", 30)
        r = self._post("12.999900", "77.999900", 90)          # 60s older
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["data"].get("ignored"))
        self.sr.refresh_from_db()
        self.assertEqual(
            self.sr.technician_latitude, Decimal("12.760000"),
            "a stale packet overwrote a newer position",
        )

    def test_an_equal_timestamp_is_treated_as_not_stale(self):
        self._post("12.760000", "77.835000", 30)
        r = self._post("12.770000", "77.840000", 30)          # same capture time
        self.assertEqual(r.status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.technician_latitude, Decimal("12.770000"))

    # ── telemetry ────────────────────────────────────────────────────────

    def test_telemetry_is_persisted_with_its_capture_time(self):
        self._post("12.750000", "77.830000", 60, heading=90, speed=12.5, accuracy=5.0)
        fix = TechnicianLocation.objects.filter(booking=self.sr).order_by("-captured_at").first()
        self.assertIsNotNone(fix, "no TechnicianLocation row was written")
        self.assertEqual(fix.latitude, Decimal("12.750000"))
        self.assertEqual(fix.heading, 90.0)
        self.assertEqual(fix.speed, 12.5)
        self.assertEqual(fix.accuracy, 5.0)
        self.assertIsNotNone(fix.captured_at)

    def test_a_stale_packet_does_not_add_a_trail_point(self):
        self._post("12.760000", "77.835000", 30)
        before = TechnicianLocation.objects.filter(booking=self.sr).count()
        self._post("12.999900", "77.999900", 90)
        self.assertEqual(TechnicianLocation.objects.filter(booking=self.sr).count(), before)

    # ── auth and compatibility ───────────────────────────────────────────

    def test_an_unauthenticated_caller_is_rejected(self):
        r = self._post("12.750000", "77.830000", 60, auth=False)
        self.assertEqual(r.status_code, 403)
        self.sr.refresh_from_db()
        self.assertIsNone(self.sr.technician_latitude)

    def test_a_customer_cannot_move_the_driver(self):
        self.client.force_authenticate(user=self.customer)
        r = self.client.post(self.url, {"latitude": "1.0", "longitude": "2.0"}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_invalid_coordinates_are_refused(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(self.url, {"latitude": "999", "longitude": "999"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_the_response_shape_is_preserved(self):
        r = self._post("12.750000", "77.830000", 60)
        self.assertIn("data", r.data)
        self.assertTrue(r.data.get("success"))
        # the tracking payload the clients already consume, unchanged in shape
        data = r.data["data"]
        for key in ("technician_location", "technician", "freshness", "tracking_token"):
            self.assertIn(key, data)
        self.assertEqual(float(data["technician_location"]["latitude"]), 12.75)
        self.assertEqual(float(data["technician"]["latitude"]), 12.75)
        # `ignored` is added ONLY on the stale path
        self.assertNotIn("ignored", data)

    def test_descriptive_fields_still_update(self):
        self.client.force_authenticate(user=self.admin)
        r = self.client.post(self.url, {"technician_name": "Ravi", "technician_phone": "9999999999"},
                             format="json")
        self.assertEqual(r.status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.technician_name, "Ravi")
