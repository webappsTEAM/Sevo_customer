"""
service_requests/tests/test_live_tracking_security.py

Comprehensive security and data authorization unit tests for customer live technician tracking:
1. Valid tracking token returns 200 + technician info + start_otp + destination
2. Invalid tracking token returns 403 Forbidden
3. Cross-booking token attack (Booking A + Token B / Booking B + Token A) returns 403 Forbidden
4. Missing token on unauthenticated request returns 401 Unauthorized
5. Public tracking link endpoint GET /api/tracking/<token>/ resolves valid booking
6. Public tracking link endpoint GET /api/tracking/<token>/ with invalid token returns 404
7. Completed booking hides start_otp
8. Cancelled booking hides start_otp
9. Authenticated booking owner can access without token parameter
10. Workforce integration failure is handled gracefully without 500 error
11. Malformed Workforce response is handled gracefully
"""
import uuid
from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import ServiceRequest

User = get_user_model()


class LiveTrackingSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        uid = uuid.uuid4().hex[:6]
        self.customer = User.objects.create_user(
            username=f"cust_track_{uid}",
            email=f"cust_track_{uid}@example.com",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        self.other_customer = User.objects.create_user(
            username=f"other_track_{uid}",
            email=f"other_track_{uid}@example.com",
            phone=f"97{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )

        # Booking A
        self.booking_a = ServiceRequest.objects.create(
            customer=self.customer,
            customer_name="Customer A",
            phone=self.customer.phone,
            email=self.customer.email,
            service_category="ac_repair",
            issue_title="AC Cooling Problem",
            address="123 Palm Street, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.ACCEPTED,
            technician_name="Ramesh Kumar",
            technician_phone="9840123456",
            total_amount=Decimal("499.00"),
        )

        # Booking B
        self.booking_b = ServiceRequest.objects.create(
            customer=self.other_customer,
            customer_name="Customer B",
            phone=self.other_customer.phone,
            email=self.other_customer.email,
            service_category="plumbing",
            issue_title="Pipe Leakage",
            address="456 Lake View, Hosur",
            latitude=Decimal("12.745000"),
            longitude=Decimal("77.830000"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.ON_THE_WAY,
            technician_name="Suresh Verma",
            technician_phone="9840987654",
            total_amount=Decimal("350.00"),
        )

    def tearDown(self):
        try:
            ServiceRequest.objects.filter(id__in=[self.booking_a.id, self.booking_b.id]).delete()
            User.objects.filter(id__in=[self.customer.id, self.other_customer.id]).delete()
        except Exception:
            pass

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_valid_tracking_token_returns_full_authorized_payload(self, mock_tracking):
        mock_tracking.return_value = {
            "technician": {"name": "Ramesh Kumar", "phone": "9840123456", "rating": 4.9},
            "location": {"latitude": 12.7420, "longitude": 77.8260},
            "eta_minutes": 8,
            "distance_km": 1.5,
        }

        url = f"/api/booking/{self.booking_a.request_id}/live-location/?token={self.booking_a.tracking_token}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("start_otp"), self.booking_a.start_otp)
        self.assertEqual(data.get("technician", {}).get("phone"), "9840123456")
        self.assertEqual(data.get("technician", {}).get("name"), "Ramesh Kumar")
        self.assertEqual(data.get("technician", {}).get("eta_minutes"), 8)

    def test_assigned_status_strictly_hides_technician_and_otp(self):
        self.booking_a.status = ServiceRequest.Status.ASSIGNED
        self.booking_a.save()

        url = f"/api/booking/{self.booking_a.request_id}/live-location/?token={self.booking_a.tracking_token}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertFalse(data.get("is_accepted"))
        self.assertFalse(data.get("technician_accepted"))
        self.assertTrue(data.get("technician_assigned"))
        self.assertIsNone(data.get("technician"))
        self.assertIsNone(data.get("technician_location"))
        self.assertIsNone(data.get("start_otp"))

    def test_invalid_tracking_token_returns_403_forbidden(self):
        fake_token = uuid.uuid4()
        url = f"/api/booking/{self.booking_a.request_id}/live-location/?token={fake_token}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json().get("success", False))

    def test_cross_booking_token_access_is_denied(self):
        # Booking A requested with Token B
        url_a_with_b = f"/api/booking/{self.booking_a.request_id}/live-location/?token={self.booking_b.tracking_token}"
        res_a = self.client.get(url_a_with_b)
        self.assertEqual(res_a.status_code, 403)

        # Booking B requested with Token A
        url_b_with_a = f"/api/booking/{self.booking_b.request_id}/live-location/?token={self.booking_a.tracking_token}"
        res_b = self.client.get(url_b_with_a)
        self.assertEqual(res_b.status_code, 403)

    def test_missing_token_on_unauthenticated_request_returns_401(self):
        url = f"/api/booking/{self.booking_a.request_id}/live-location/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 401)
        self.assertFalse(response.json().get("success", False))

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_public_tracking_endpoint_by_token(self, mock_tracking):
        mock_tracking.return_value = {
            "technician": {"name": "Ramesh Kumar", "phone": "9840123456", "rating": 4.9},
            "location": {"latitude": 12.7420, "longitude": 77.8260},
            "eta_minutes": 5,
            "distance_km": 1.2,
        }

        url = f"/api/tracking/{self.booking_a.tracking_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertEqual(data.get("request_id"), self.booking_a.request_id)
        self.assertEqual(data.get("start_otp"), self.booking_a.start_otp)
        self.assertEqual(data.get("technician", {}).get("name"), "Ramesh Kumar")

    def test_public_tracking_endpoint_with_invalid_token_returns_404(self):
        random_token = uuid.uuid4()
        url = f"/api/tracking/{random_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 404)

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_completed_booking_hides_otp(self, mock_tracking):
        mock_tracking.return_value = {}
        self.booking_a.status = ServiceRequest.Status.COMPLETED
        self.booking_a.save()

        url = f"/api/tracking/{self.booking_a.tracking_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertIsNone(data.get("start_otp"))

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_cancelled_booking_hides_otp(self, mock_tracking):
        mock_tracking.return_value = {}
        self.booking_a.status = ServiceRequest.Status.CANCELLED
        self.booking_a.save()

        url = f"/api/tracking/{self.booking_a.tracking_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertIsNone(data.get("start_otp"))
        self.assertEqual(data.get("status"), "cancelled")

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_authenticated_owner_can_access_without_query_token(self, mock_tracking):
        mock_tracking.return_value = {
            "technician": {"name": "Ramesh Kumar", "phone": "9840123456"},
            "location": {"latitude": 12.741, "longitude": 77.825},
        }
        self.client.force_authenticate(user=self.customer)

        url = f"/api/booking/{self.booking_a.request_id}/live-location/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertEqual(data.get("start_otp"), self.booking_a.start_otp)

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_workforce_integration_failure_handled_gracefully(self, mock_tracking):
        mock_tracking.return_value = None

        url = f"/api/tracking/{self.booking_a.tracking_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertEqual(data.get("request_id"), self.booking_a.request_id)
        self.assertIsNotNone(data.get("technician"))

    @patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking")
    def test_workforce_malformed_response_handled_gracefully(self, mock_tracking):
        mock_tracking.return_value = "non-dict malformed response"

        url = f"/api/tracking/{self.booking_a.tracking_token}/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        data = response.json().get("data", {})
        self.assertEqual(data.get("request_id"), self.booking_a.request_id)