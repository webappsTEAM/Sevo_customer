"""
Customer rating of a delivered Goods & Transport / Packers & Movers trip.

Before this, nothing issued a feedback token for a delivery (only the admin
"verify" step of a home service did), so a GT customer had no way to rate the
driver; the completed-booking screen showed stars that only set local state; and
the rating pushed to the vendor put the JOB id in the technician slot.
"""
import uuid
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from service_requests.models import BookingAssignment, ServiceFeedback, ServiceRequest
from service_requests.services.trip_feedback import ensure_trip_feedback, trip_is_rateable

User = get_user_model()


def _booking(category="goods_transport_truck", status="in_progress", leg="", **extra):
    n = uuid.uuid4().hex[:8]
    defaults = dict(
        request_id=f"GTFB{n}", customer_name="Cust", phone=f"9{uuid.uuid4().int % 10**9:09d}",
        service_category=category, issue_title="Move", address="Pickup", latitude=12.74, longitude=77.82,
        drop_address="Drop", drop_latitude=12.93, drop_longitude=77.62, status=status, logistics_leg=leg,
        payment_method="COD", preferred_date="2026-09-28", preferred_time="Now",
    )
    defaults.update(extra)
    return ServiceRequest.objects.create(**defaults)


class TripRateabilityTests(TestCase):
    def test_a_delivered_trip_is_rateable_before_settlement(self):
        self.assertTrue(trip_is_rateable(_booking(leg="DELIVERED")))
        self.assertTrue(trip_is_rateable(_booking(status="completed")))

    def test_an_unfinished_or_cancelled_trip_is_not(self):
        self.assertFalse(trip_is_rateable(_booking(leg="LOADING")))
        self.assertFalse(trip_is_rateable(_booking(status="cancelled", leg="DELIVERED")))
        self.assertIsNone(ensure_trip_feedback(_booking(leg="UNLOADING")))

    def test_the_token_is_issued_once_and_remembers_the_driver(self):
        sr = _booking(leg="DELIVERED")
        BookingAssignment.objects.create(
            booking=sr, status=BookingAssignment.Status.COMPLETED,
            technician_id="42", technician_name="Ravi Kumar",
        )
        first = ensure_trip_feedback(sr)
        second = ensure_trip_feedback(sr)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(ServiceFeedback.objects.filter(service_request=sr).count(), 1)
        self.assertEqual((first.technician_id, first.technician_name_snapshot), ("42", "Ravi Kumar"))


class TrackingPayloadFeedbackTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def _live(self, sr):
        r = self.client.get(f"/api/booking/{sr.request_id}/live-location/?token={sr.tracking_token}")
        self.assertEqual(r.status_code, 200, r.content[:300])
        return r.json()["data"]

    def test_delivered_trip_exposes_a_rating_handle_to_the_token_holder(self):
        sr = _booking(leg="DELIVERED", status="completed")
        block = self._live(sr)["feedback"]
        self.assertEqual(block["submitted"], False)
        self.assertEqual(block["token"], str(ServiceFeedback.objects.get(service_request=sr).feedback_token))

    def test_an_unfinished_trip_offers_no_rating(self):
        sr = _booking(leg="EN_ROUTE_DROP")
        self.assertIsNone(self._live(sr)["feedback"])
        self.assertFalse(ServiceFeedback.objects.filter(service_request=sr).exists())

    def test_home_services_are_untouched(self):
        sr = _booking(category="ac_repair", status="completed")
        self.assertIsNone(self._live(sr)["feedback"])
        self.assertFalse(ServiceFeedback.objects.filter(service_request=sr).exists())

    def test_a_submitted_rating_is_reported_back(self):
        sr = _booking(leg="DELIVERED", status="completed")
        token = self._live(sr)["feedback"]["token"]
        r = self.client.post(f"/api/feedback/{token}/", {"rating": 4, "comment": "good"}, format="json")
        self.assertEqual(r.status_code, 200, r.content[:300])
        block = self._live(sr)["feedback"]
        self.assertEqual((block["submitted"], block["rating"]), (True, 4))

    def test_the_public_tracking_page_never_carries_the_feedback_token(self):
        # The feedback token is a bearer credential for the rating form; only the full-access
        # live-location endpoint may return it.
        from service_requests.views import _build_tracking_payload
        sr = _booking(leg="DELIVERED", status="completed")
        self.assertIsNone(_build_tracking_payload(sr, has_full_access=True)["feedback"])
        self.assertIsNone(_build_tracking_payload(sr, has_full_access=False, include_feedback=True)["feedback"])
        self.assertFalse(ServiceFeedback.objects.filter(service_request=sr).exists())


class FeedbackSubmissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.sr = _booking(leg="DELIVERED", status="completed")
        BookingAssignment.objects.create(
            booking=self.sr, status=BookingAssignment.Status.COMPLETED,
            technician_id="42", technician_name="Ravi Kumar",
        )
        self.fb = ensure_trip_feedback(self.sr)

    def test_a_rating_is_required(self):
        r = self.client.post(f"/api/feedback/{self.fb.feedback_token}/", {"comment": "hmm"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(ServiceFeedback.objects.get(pk=self.fb.pk).is_submitted)

    def test_out_of_range_is_rejected_and_a_second_rating_cannot_overwrite(self):
        url = f"/api/feedback/{self.fb.feedback_token}/"
        self.assertEqual(self.client.post(url, {"rating": 9}, format="json").status_code, 400)
        with patch("workforce_integration.services.requests.post") as post:
            post.return_value.status_code = 201
            self.assertEqual(self.client.post(url, {"rating": 5, "comment": "great"}, format="json").status_code, 200)
            self.assertEqual(self.client.post(url, {"rating": 1}, format="json").status_code, 400)
        fb = ServiceFeedback.objects.get(pk=self.fb.pk)
        self.assertEqual((fb.rating, fb.is_submitted), (5, True))

    def test_the_vendor_is_told_the_real_technician_not_the_job_id(self):
        with patch("workforce_integration.services.requests.post") as post:
            post.return_value.status_code = 201
            r = self.client.post(f"/api/feedback/{self.fb.feedback_token}/", {"rating": 5}, format="json")
        self.assertEqual(r.status_code, 200, r.content[:300])
        (url,), kwargs = post.call_args
        self.assertTrue(url.endswith("/technicians/42/feedback/"), url)
        self.assertEqual(kwargs["json"]["technician_id"], "42")
        self.assertEqual(kwargs["json"]["booking_id"], self.sr.request_id)
        self.assertNotIn(f"/technicians/{self.sr.id}/", url)


class DeliveredNotificationTests(TestCase):
    def test_the_delivered_message_carries_a_working_rating_link(self):
        from service_requests import notifications
        sr = _booking(leg="DELIVERED", status="completed")
        with patch.object(notifications, "send_sms_notification") as sms:
            notifications.notify_gt_delivery_completed(sr, technician_name="Ravi")
        message = sms.call_args.kwargs["message"]
        token = ServiceFeedback.objects.get(service_request=sr).feedback_token
        self.assertIn(f"/feedback/{token}", message)
        self.assertIn(notifications.build_feedback_url(token), message)

    def test_feedback_links_honour_the_production_base_path(self):
        from django.test import override_settings
        from service_requests import notifications
        with override_settings(DEBUG=False, FRONTEND_URL="https://app.example.com"):
            self.assertEqual(notifications.build_feedback_url("abc"), "https://app.example.com/sevo/feedback/abc")
            self.assertEqual(
                notifications.build_customer_tracking_url("tok"), "https://app.example.com/sevo/tracking/tok")
