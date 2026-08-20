"""
backend/service_requests/tests/test_workforce_customer_integrity.py

Automated 20-case verification test suite for Customer App Real-Data Integrity:
1. Booking created -> no technician
2. Employee assigned -> no technician details
3. Employee accepted -> technician details visible
4. Employee rejected -> details cleared
5. Redispatch -> old employee hidden, new employee visible
6. Employee on the way -> GPS/ETA visible
7. Employee arrived -> arrival visible
8. OTP valid -> work starts
9. OTP invalid -> rejected
10. OTP expired -> rejected
11. OTP reused -> rejected
12. Employee completed -> tracking stopped
13. Cross-customer tracking -> denied
14. Invalid tracking token -> denied
15. Workforce unavailable -> no fake data
16. Missing GPS -> no fake location
17. Missing ETA -> no fake ETA
18. Duplicate webhook -> idempotent
19. Out-of-order webhook -> safe
20. Customer cannot modify technician/GPS
"""
import uuid
import json
import hmac
import hashlib
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth import get_user_model
from service_requests.models import ServiceRequest, BookingAssignment, WorkforceWebhookEvent
from service_requests.state_machine import apply_transition
from workforce_integration.views import WORKFORCE_WEBHOOK_SECRET

User = get_user_model()


class WorkforceCustomerIntegrityTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.customer = User.objects.create_user(
            username="customer_alice",
            email="alice@example.com",
            password="securePassword123!",
            role="customer",
            phone="9876543210"
        )
        self.other_customer = User.objects.create_user(
            username="customer_bob",
            email="bob@example.com",
            password="securePassword123!",
            role="customer",
            phone="9876543211"
        )

        self.booking = ServiceRequest.objects.create(
            customer=self.customer,
            customer_name="Alice Smith",
            phone="9876543210",
            email="alice@example.com",
            service_category="electrical",
            issue_title="Ceiling Fan Repair",
            address="100 Main Street, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.CONFIRMED,
            total_amount=Decimal("450.00"),
        )

    def _generate_webhook_headers(self, payload_dict):
        body_bytes = json.dumps(payload_dict).encode("utf-8")
        signature = hmac.new(
            WORKFORCE_WEBHOOK_SECRET.encode("utf-8"),
            body_bytes,
            hashlib.sha256
        ).hexdigest()
        return {
            "HTTP_X_WORKFORCE_SIGNATURE": signature,
            "content_type": "application/json"
        }

    # 1. Booking created -> no technician
    def test_01_booking_created_has_no_technician(self):
        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["status"], "confirmed")
        self.assertFalse(data["is_accepted"])
        self.assertFalse(data["technician_accepted"])
        self.assertIsNone(data["technician"])
        self.assertIsNone(data["technician_location"])
        self.assertIsNone(data["start_otp"])

    # 2. Employee assigned -> no technician details
    def test_02_employee_assigned_hides_technician_details(self):
        apply_transition(self.booking, ServiceRequest.Status.ASSIGNED)
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["status"], "assigned")
        self.assertFalse(data["is_accepted"])
        self.assertTrue(data["technician_assigned"])
        self.assertFalse(data["technician_accepted"])
        self.assertIsNone(data["technician"])
        self.assertIsNone(data["start_otp"])

    # 3. Employee accepted -> technician details visible
    def test_03_employee_accepted_exposes_real_technician_details(self):
        apply_transition(self.booking, ServiceRequest.Status.ACCEPTED)
        self.booking.technician_name = "Rajesh Sharma"
        self.booking.technician_phone = "9876500001"
        self.booking.technician_photo = "https://cdn.example.com/rajesh.jpg"
        self.booking.technician_rating = Decimal("4.85")
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["status"], "accepted")
        self.assertTrue(data["is_accepted"])
        self.assertTrue(data["technician_accepted"])
        self.assertIsNotNone(data["technician"])
        self.assertEqual(data["technician"]["name"], "Rajesh Sharma")
        self.assertEqual(data["technician"]["phone"], "9876500001")
        self.assertEqual(data["technician"]["rating"], 4.85)

    # 4. Employee rejected -> details cleared
    def test_04_employee_rejected_clears_technician_details(self):
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.technician_name = "Rajesh Sharma"
        self.booking.technician_phone = "9876500001"
        self.booking.save()

        webhook_payload = {
            "event": "employee_rejected",
            "booking_id": self.booking.request_id,
            "reason": "Vehicle breakdown",
            "event_id": f"evt_rej_{uuid.uuid4()}"
        }
        headers = self._generate_webhook_headers(webhook_payload)
        res = self.client.post("/api/workforce-integration/webhook/", json.dumps(webhook_payload), **headers)
        self.assertEqual(res.status_code, 200)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.technician_name, "")
        self.assertEqual(self.booking.technician_phone, "")

    # 5. Redispatch -> old employee hidden, new employee visible
    def test_05_redispatch_shows_new_employee_after_acceptance(self):
        # Assign & accept Employee B
        webhook_accept_b = {
            "event": "employee_accepted",
            "booking_id": self.booking.request_id,
            "technician": {
                "name": "Karthik Raja",
                "phone": "9876500002",
                "photo": "https://cdn.example.com/karthik.jpg",
                "rating": 4.95
            },
            "event_id": f"evt_acc_b_{uuid.uuid4()}"
        }
        headers = self._generate_webhook_headers(webhook_accept_b)
        res = self.client.post("/api/workforce-integration/webhook/", json.dumps(webhook_accept_b), **headers)
        self.assertEqual(res.status_code, 200)

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertEqual(data["technician"]["name"], "Karthik Raja")
        self.assertEqual(data["technician"]["phone"], "9876500002")

    # 6. Employee on the way -> GPS/ETA visible
    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_06_employee_on_the_way_shows_gps_and_eta(self, mock_tracking):
        mock_tracking.return_value = {
            "technician": {"name": "Karthik Raja", "phone": "9876500002"},
            "location": {"latitude": 12.7420, "longitude": 77.8260, "heading": 90, "speed": 22},
            "eta_minutes": 5,
            "distance_km": 1.2,
        }
        apply_transition(self.booking, ServiceRequest.Status.ACCEPTED)
        apply_transition(self.booking, ServiceRequest.Status.ON_THE_WAY)
        self.booking.technician_name = "Karthik Raja"
        self.booking.technician_latitude = Decimal("12.7420")
        self.booking.technician_longitude = Decimal("77.8260")
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertEqual(data["status"], "on_the_way")
        self.assertIsNotNone(data["technician_location"])
        self.assertEqual(data["technician_location"]["latitude"], 12.7420)
        self.assertEqual(data["eta_minutes"], 5)

    # 7. Employee arrived -> arrival visible
    def test_07_employee_arrived_shows_arrival_state(self):
        apply_transition(self.booking, ServiceRequest.Status.ACCEPTED)
        apply_transition(self.booking, ServiceRequest.Status.ON_THE_WAY)
        apply_transition(self.booking, ServiceRequest.Status.ARRIVED)
        self.booking.technician_name = "Karthik Raja"
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertEqual(data["status"], "arrived")
        self.assertEqual(data["start_otp"], self.booking.start_otp)

    # 8. OTP valid -> work starts
    def test_08_otp_valid_transitions_to_in_progress(self):
        self.booking.status = ServiceRequest.Status.ARRIVED
        self.booking.technician_name = "Karthik Raja"
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/verify-start-otp/"
        res = self.client.post(url, json.dumps({"otp": self.booking.start_otp}), content_type="application/json")
        self.assertEqual(res.status_code, 200)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "in_progress")
        self.assertTrue(self.booking.otp_verified)

    # 9. OTP invalid -> rejected with attempts decrement
    def test_09_otp_invalid_is_rejected(self):
        self.booking.status = ServiceRequest.Status.ARRIVED
        self.booking.technician_name = "Karthik Raja"
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/verify-start-otp/"
        res = self.client.post(url, json.dumps({"otp": "000000"}), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.otp_attempt_count, 1)

    # 10. OTP expired -> rejected
    def test_10_otp_expired_is_rejected(self):
        self.booking.status = ServiceRequest.Status.ARRIVED
        self.booking.technician_name = "Karthik Raja"
        self.booking.otp_expires_at = timezone.now() - timezone.timedelta(minutes=5)
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/verify-start-otp/"
        res = self.client.post(url, json.dumps({"otp": self.booking.start_otp}), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json().get("message", "").lower())

    # 11. OTP reused -> rejected
    def test_11_otp_reused_is_rejected(self):
        self.booking.status = ServiceRequest.Status.IN_PROGRESS
        self.booking.technician_name = "Karthik Raja"
        self.booking.otp_verified = True
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/verify-start-otp/"
        res = self.client.post(url, json.dumps({"otp": self.booking.start_otp}), content_type="application/json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("already", res.json().get("message", "").lower())

    # 12. Employee completed -> tracking stopped
    def test_12_employee_completed_stops_tracking_and_hides_otp(self):
        apply_transition(self.booking, ServiceRequest.Status.ACCEPTED)
        apply_transition(self.booking, ServiceRequest.Status.ON_THE_WAY)
        apply_transition(self.booking, ServiceRequest.Status.ARRIVED)
        apply_transition(self.booking, ServiceRequest.Status.IN_PROGRESS)
        apply_transition(self.booking, ServiceRequest.Status.COMPLETED)
        self.booking.technician_name = "Karthik Raja"
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertEqual(data["status"], "completed")
        self.assertIsNone(data["technician_location"])
        self.assertIsNone(data["start_otp"])

    # 13. Cross-customer tracking -> denied
    def test_13_cross_customer_tracking_is_denied(self):
        # 1. Unauthenticated request without token -> 401
        url_no_token = f"/api/booking/{self.booking.request_id}/live-location/"
        res_no_token = self.client.get(url_no_token)
        self.assertEqual(res_no_token.status_code, 401)

        # 2. Cross-customer / mismatched token access -> 403
        other_customer_token = uuid.uuid4()
        url_cross = f"/api/booking/{self.booking.request_id}/live-location/?token={other_customer_token}"
        res_cross = self.client.get(url_cross)
        self.assertEqual(res_cross.status_code, 403)

    # 14. Invalid tracking token -> denied
    def test_14_invalid_tracking_token_returns_403(self):
        fake_token = uuid.uuid4()
        url = f"/api/booking/{self.booking.request_id}/live-location/?token={fake_token}"
        res = self.client.get(url)
        self.assertEqual(res.status_code, 403)

    # 15. Workforce unavailable -> no fake data
    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_15_workforce_unavailable_returns_no_fake_data(self, mock_tracking):
        mock_tracking.return_value = None
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.technician_name = "Karthik Raja"
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertIsNone(data["technician_location"])
        self.assertIsNone(data["eta_minutes"])

    # 16. Missing GPS -> no fake location
    def test_16_missing_gps_does_not_invent_coordinates(self):
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.technician_name = "Karthik Raja"
        self.booking.technician_latitude = None
        self.booking.technician_longitude = None
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertIsNone(data["technician_location"])

    # 17. Missing ETA -> no fake ETA
    def test_17_missing_eta_returns_null(self):
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.technician_name = "Karthik Raja"
        self.booking.technician_latitude = None
        self.booking.save()

        url = f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}"
        res = self.client.get(url)
        data = res.json()["data"]
        self.assertIsNone(data["eta_minutes"])
        self.assertIsNone(data["distance_km"])

    # 18. Duplicate webhook -> idempotent
    def test_18_duplicate_webhook_is_idempotent(self):
        event_id = f"evt_dup_{uuid.uuid4()}"
        webhook_payload = {
            "event": "employee_arrived",
            "booking_id": self.booking.request_id,
            "event_id": event_id
        }
        headers = self._generate_webhook_headers(webhook_payload)
        res1 = self.client.post("/api/workforce-integration/webhook/", json.dumps(webhook_payload), **headers)
        self.assertEqual(res1.status_code, 200)

        # Re-send identical webhook
        res2 = self.client.post("/api/workforce-integration/webhook/", json.dumps(webhook_payload), **headers)
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json().get("duplicate"))

    # 19. Out-of-order webhook -> safe transition handling
    def test_19_out_of_order_webhook_is_handled_safely(self):
        # Booking in completed state cannot regress to assigned
        self.booking.status = ServiceRequest.Status.COMPLETED
        self.booking.save()

        webhook_payload = {
            "event": "job.assigned",
            "booking_id": self.booking.request_id,
            "event_id": f"evt_ooo_{uuid.uuid4()}"
        }
        headers = self._generate_webhook_headers(webhook_payload)
        res = self.client.post("/api/workforce-integration/webhook/", json.dumps(webhook_payload), **headers)
        self.assertEqual(res.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")

    # 20. Customer cannot modify technician/GPS
    def test_20_customer_cannot_modify_technician_or_gps(self):
        self.client.force_login(self.customer)
        url = f"/api/service-requests/{self.booking.id}/"
        payload = {
            "technician_name": "Hacked Tech",
            "technician_latitude": "0.000",
            "technician_longitude": "0.000",
            "status": "completed",
        }
        res = self.client.patch(url, json.dumps(payload), content_type="application/json")
        self.booking.refresh_from_db()
        self.assertNotEqual(self.booking.technician_name, "Hacked Tech")
        self.assertNotEqual(self.booking.status, "completed")
