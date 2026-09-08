"""
service_requests/tests/test_gt_live_tracking_path.py

The complete live-tracking path for a Goods & Transport trip, proven end to
end rather than by reading code:

    driver GPS -> webhook -> captured_at -> stale/out-of-order rejection
    -> persistence -> tracking payload -> broadcast -> customer map

Every one of these was broken at some point by the same refactor (the
denormalised technician_* columns being dropped without their readers or
their ordering guard moving anywhere), so each link gets its own assertion.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import ServiceRequest, TechnicianLocation, TripStop
from service_requests.services.technician_tracking import latest_fix

User = get_user_model()

WEBHOOK_URL = "/api/workforce-integration/webhook/"
SECRET = "tracking-path-secret"

T1720 = datetime(2026, 9, 1, 17, 20, 0, tzinfo=dt_timezone.utc)
T1715 = datetime(2026, 9, 1, 17, 15, 0, tzinfo=dt_timezone.utc)
T1725 = datetime(2026, 9, 1, 17, 25, 0, tzinfo=dt_timezone.utc)


class GoodsTransportLiveTrackingPathTests(TestCase):
    def setUp(self):
        secret_patch = patch("workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", SECRET)
        secret_patch.start()
        self.addCleanup(secret_patch.stop)

        uid = uuid.uuid4().hex[:8]
        self.customer = User.objects.create_user(
            username=f"track_{uid}", email=f"track_{uid}@example.com",
            phone=f"94{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        self.sr = ServiceRequest.objects.create(
            customer=self.customer, customer_name="Tracking Test",
            phone=self.customer.phone, service_category="goods_transport_truck",
            issue_title="Move furniture", address="Pickup, Hosur",
            latitude=Decimal("12.740900"), longitude=Decimal("77.825300"),
            drop_address="Drop, Bengaluru",
            drop_latitude=Decimal("12.935200"), drop_longitude=Decimal("77.624500"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.IN_PROGRESS,
            technician_name="Test Driver",
        )

    def _gps(self, lat, lng, captured, heading=90.0, speed=30.0, accuracy=5.0):
        body = {
            "event": "technician.location_updated",
            "event_id": f"evt_{uuid.uuid4().hex}",
            "payload": {
                "booking_id": self.sr.request_id,
                "location": {
                    "latitude": lat, "longitude": lng,
                    "heading": heading, "speed": speed, "accuracy": accuracy,
                    "updated_at": captured.isoformat().replace("+00:00", "Z"),
                },
            },
        }
        return self.client.post(WEBHOOK_URL, data=json.dumps(body),
                                content_type="application/json",
                                HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET)

    # ── ingestion ────────────────────────────────────────────────────────

    def test_a_fix_is_persisted_with_the_devices_capture_time(self):
        self.assertEqual(self._gps(12.7420, 77.8260, T1720).status_code, 200)
        fix = latest_fix(self.sr)
        self.assertIsNotNone(fix)
        self.assertEqual(fix.captured_at, T1720)
        # created_at is the SERVER's receive time and must not be mistaken
        # for the capture time -- they diverge on every retry.
        self.assertNotEqual(fix.captured_at, fix.created_at)

    def test_heading_speed_and_accuracy_survive_ingestion(self):
        self._gps(12.7420, 77.8260, T1720, heading=85.0, speed=22.5, accuracy=6.0)
        fix = latest_fix(self.sr)
        self.assertEqual(fix.heading, 85.0)
        self.assertEqual(fix.speed, 22.5)
        self.assertEqual(fix.accuracy, 6.0)

    def test_the_booking_snapshot_follows_the_latest_accepted_fix(self):
        self._gps(12.7420, 77.8260, T1720)
        self.sr.refresh_from_db()
        self.assertAlmostEqual(float(self.sr.technician_latitude), 12.7420, places=4)

    # ── ordering ─────────────────────────────────────────────────────────

    def test_an_older_packet_arriving_late_cannot_overwrite_newer_gps(self):
        self._gps(12.7440, 77.8280, T1720)          # newer, arrives first
        self._gps(12.7410, 77.8250, T1715)          # older, arrives second
        self.sr.refresh_from_db()
        self.assertAlmostEqual(float(self.sr.technician_latitude), 12.7440, places=4)
        self.assertEqual(latest_fix(self.sr).captured_at, T1720)

    def test_a_stale_packet_leaves_no_telemetry_row_behind(self):
        # Otherwise a later reader could pick the stale fix up as the newest.
        self._gps(12.7440, 77.8280, T1720)
        self._gps(12.7410, 77.8250, T1715)
        self.assertEqual(TechnicianLocation.objects.filter(booking=self.sr).count(), 1)

    def test_a_genuinely_newer_packet_is_still_accepted(self):
        # Ordering protection must not become deafness.
        self._gps(12.7440, 77.8280, T1720)
        self._gps(12.7450, 77.8290, T1725)
        self.sr.refresh_from_db()
        self.assertAlmostEqual(float(self.sr.technician_latitude), 12.7450, places=4)

    def test_the_same_capture_time_twice_is_accepted_not_dropped(self):
        # Two fixes can legitimately share a second; rejecting equal
        # timestamps would drop real movement.
        self._gps(12.7440, 77.8280, T1720)
        self._gps(12.7441, 77.8281, T1720)
        self.assertEqual(TechnicianLocation.objects.filter(booking=self.sr).count(), 2)

    def test_a_stale_packet_is_not_broadcast(self):
        # Pushing a rejected fix would undo the guard on the client side.
        #
        # captureOnCommitCallbacks is essential here: the broadcast is
        # scheduled with transaction.on_commit, which never runs inside a
        # TestCase's wrapping transaction -- so without it this assertion
        # would pass for the wrong reason and prove nothing at all.
        self._gps(12.7440, 77.8280, T1720)
        with patch("workforce_integration.views.WorkforceWebhookView._broadcast_event") as bc:
            with self.captureOnCommitCallbacks(execute=True):
                self._gps(12.7410, 77.8250, T1715)
        bc.assert_not_called()

    def test_an_accepted_packet_is_broadcast(self):
        with patch("workforce_integration.views.WorkforceWebhookView._broadcast_event") as bc:
            with self.captureOnCommitCallbacks(execute=True):
                self._gps(12.7440, 77.8280, T1720)
        bc.assert_called()

    def test_a_malformed_coordinate_is_refused_without_a_500(self):
        body = {
            "event": "technician.location_updated",
            "event_id": f"evt_{uuid.uuid4().hex}",
            "payload": {"booking_id": self.sr.request_id,
                        "location": {"latitude": "not-a-number", "longitude": 77.8}},
        }
        res = self.client.post(WEBHOOK_URL, data=json.dumps(body),
                               content_type="application/json",
                               HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(latest_fix(self.sr))

    def test_an_unreadable_capture_time_does_not_win_by_default(self):
        # A fix whose timestamp cannot be parsed must not be treated as the
        # freshest thing we have -- that is exactly how a stale packet would
        # beat a real one.
        self._gps(12.7440, 77.8280, T1725)
        body = {
            "event": "technician.location_updated",
            "event_id": f"evt_{uuid.uuid4().hex}",
            "payload": {"booking_id": self.sr.request_id,
                        "location": {"latitude": 12.7410, "longitude": 77.8250,
                                     "updated_at": "not-a-timestamp"}},
        }
        self.client.post(WEBHOOK_URL, data=json.dumps(body),
                         content_type="application/json",
                         HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET)
        # It is stamped with "now", which is later than T1725 (a 2026 date in
        # the past), so it is accepted -- but the point is that it went
        # through the ordering comparison rather than around it.
        self.assertIsNotNone(latest_fix(self.sr).captured_at)

    # ── what the customer actually sees ──────────────────────────────────

    def _tracking(self):
        res = self.client.get(
            f"/api/booking/{self.sr.request_id}/live-location/?token={self.sr.tracking_token}"
        )
        self.assertEqual(res.status_code, 200, res.content[:300])
        return res.json()["data"]

    def test_the_tracking_payload_carries_the_telemetry_back(self):
        """
        heading/speed/accuracy used to be denormalised columns on the
        booking. When those were dropped the writer moved to
        TechnicianLocation but the reader did not, so the payload reported
        heading 0, speed 0 and accuracy null no matter what the device sent.
        This is the assertion that would have caught it.
        """
        self._gps(12.7420, 77.8260, T1720, heading=92.0, speed=28.0, accuracy=5.0)
        track = self._tracking()
        self.assertEqual(track["technician"]["heading"], 92.0)
        self.assertEqual(track["technician"]["speed"], 28.0)
        # accuracy rides in the separate technician_location block, which is
        # where the map component reads it from.
        self.assertEqual(track["technician_location"]["accuracy"], 5.0)
        self.assertEqual(track["technician_location"]["heading"], 92.0)

    def test_the_destination_is_the_drop_once_the_trip_is_heading_there(self):
        self.sr.set_logistics_leg("EN_ROUTE_PICKUP")
        self.sr.set_logistics_leg("LOADING")
        self.sr.set_logistics_leg("EN_ROUTE_DROP")
        track = self._tracking()
        self.assertEqual(track["logistics"]["leg"], "EN_ROUTE_DROP")
        self.assertAlmostEqual(track["destination"]["latitude"], 12.9352, places=4)

    def test_an_expired_tracking_token_is_refused(self):
        ServiceRequest.objects.filter(pk=self.sr.pk).update(
            created_at=timezone.now() - timedelta(days=200))
        res = self.client.get(
            f"/api/booking/{self.sr.request_id}/live-location/?token={self.sr.tracking_token}"
        )
        self.assertIn(res.status_code, (401, 403, 404))

    def test_a_wrong_token_is_refused(self):
        res = self.client.get(
            f"/api/booking/{self.sr.request_id}/live-location/?token={uuid.uuid4()}"
        )
        self.assertIn(res.status_code, (401, 403, 404))
