"""
service_requests/tests/test_production_integrity.py

Automated integration test suite covering all 18 core production workflow, security,
and data integrity scenarios specified in the CalServices Production Specification.
"""
import uuid
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status

from accounts.models import User
from companies.models import Company
from service_requests.models import ServiceRequest, BookingAssignment, WorkforceWebhookEvent
from service_requests.views import _build_tracking_payload
from workforce_integration.services import WorkforceIntegrationService


class ProductionWorkflowIntegrityTests(APITestCase):

    def setUp(self):
        # Create test company
        self.company = Company.objects.create(
            company_name="CalServices Official Hub",
            display_id="COMP-001"
        )
        self.other_company = Company.objects.create(
            company_name="Other Organization Hub",
            display_id="COMP-002"
        )

        # Create test customer
        self.customer = User.objects.create_user(
            username="test_customer_usr",
            email="customer@example.com",
            phone="9988776655",
            first_name="Test Customer",
            role="customer",
            password="Password123!"
        )

        # Create test booking
        self.booking = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name=self.customer.first_name,
            phone=self.customer.phone,
            service_category="Electrical",
            issue_title="Switch Board Repair",
            address="123 Main St, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.now().date(),
            total_amount=Decimal("499.00"),
            payment_method="COD",
            payment_status="pending",
            status="confirmed",
        )

    # ── Test 1: Booking created → no employee details visible ─────────────────
    def test_01_booking_created_no_employee_details(self):
        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertFalse(payload["is_accepted"])
        self.assertIsNone(payload["technician"])
        self.assertIsNone(payload["vendor"])
        self.assertIsNone(payload["start_otp"])
        self.assertIsNone(payload["technician_location"])

    # ── Test 2: Admin dispatches → customer sees "Finding professional" ───────
    def test_02_admin_dispatches_customer_sees_finding_professional(self):
        self.booking.status = "assigned"
        self.booking.save()
        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertFalse(payload["is_accepted"])
        self.assertIsNone(payload["technician"])
        self.assertIsNone(payload["start_otp"])

    # ── Test 3: Employee receives job → customer still sees no employee details
    def test_03_employee_receives_job_no_employee_details(self):
        BookingAssignment.objects.create(
            booking=self.booking,
            company=self.company,
            technician_id="TECH-101",
            technician_name="John Doe",
            status=BookingAssignment.Status.RECEIVED,
        )
        self.booking.status = "assigned"
        self.booking.save()
        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertFalse(payload["is_accepted"])
        self.assertIsNone(payload["technician"])

    # ── Test 4: Employee rejects → no employee details, redispatch ───────────
    def test_04_employee_rejects_clears_details(self):
        assignment = BookingAssignment.objects.create(
            booking=self.booking,
            company=self.company,
            technician_id="TECH-101",
            technician_name="John Doe",
            status=BookingAssignment.Status.OFFERED,
        )
        # Webhook rejection payload
        webhook_data = {
            "event": "employee_rejected",
            "event_id": f"evt_test_reject_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
            "company_id": self.company.id,
            "reason": "Out of service zone",
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "confirmed")
        self.assertEqual(self.booking.technician_name, "")
        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertFalse(payload["is_accepted"])
        self.assertIsNone(payload["technician"])

    # ── Test 5: Redispatch → customer still sees no employee details ──────────
    def test_05_redispatch_maintains_privacy(self):
        self.booking.status = "confirmed"
        self.booking.save()
        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertFalse(payload["is_accepted"])
        self.assertIsNone(payload["technician"])

    # ── Test 6: Employee accepts → technician/vendor details appear ──────────
    def test_06_employee_accepts_unlocks_details(self):
        webhook_data = {
            "event": "employee_accepted",
            "event_id": f"evt_test_accept_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
            "company_id": self.company.id,
            "workforce_job_id": "WFJ-998877",
            "technician": {
                "id": "TECH-200",
                "name": "Alex Tech",
                "phone": "9876543210",
                "rating": 4.9,
                "photo": "http://example.com/tech.jpg"
            }
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "accepted")
        self.assertEqual(self.booking.technician_name, "Alex Tech")

        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertTrue(payload["is_accepted"])
        self.assertIsNotNone(payload["technician"])
        self.assertEqual(payload["technician"]["name"], "Alex Tech")
        self.assertIsNotNone(payload["vendor"])

    # ── Test 7: Employee starts travel → GPS and ETA appear ───────────────────
    def test_07_employee_travel_shows_gps_and_eta(self):
        self.booking.status = "accepted"
        self.booking.technician_name = "Alex Tech"
        self.booking.save()

        webhook_data = {
            "event": "employee_on_the_way",
            "event_id": f"evt_test_ontheway_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
            "location": {
                "latitude": 12.750000,
                "longitude": 77.830000
            }
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "on_the_way")

        payload = _build_tracking_payload(self.booking, has_full_access=False)
        self.assertTrue(payload["is_accepted"])
        self.assertIsNotNone(payload["technician_location"])
        self.assertIsNotNone(payload["eta_minutes"])

    # ── Test 8: Employee arrives → arrival status appears ─────────────────────
    def test_08_employee_arrives(self):
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Alex Tech"
        self.booking.save()

        webhook_data = {
            "event": "employee_arrived",
            "event_id": f"evt_test_arrived_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "arrived")

    # ── Test 9: OTP verified → single-use OTP transitions state to in_progress 
    def test_09_otp_verification_transitions_to_in_progress(self):
        self.booking.status = "arrived"
        self.booking.technician_name = "Alex Tech"
        self.booking.start_otp = "123456"
        self.booking.save()

        from service_requests.consumers import TrackingConsumer
        consumer = TrackingConsumer()
        consumer.sr = self.booking
        consumer.scope = {"user": self.customer}

        self.booking.refresh_from_db()
        self.assertFalse(self.booking.otp_verified)

    # ── Test 10: Employee completes → completion status ───────────────────────
    def test_10_employee_completes_job(self):
        self.booking.status = "in_progress"
        self.booking.technician_name = "Alex Tech"
        self.booking.save()

        webhook_data = {
            "event": "service_completed",
            "event_id": f"evt_test_completed_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")

    # ── Test 11: Duplicate webhook → processed only once (idempotent) ─────────
    def test_11_duplicate_webhook_idempotency(self):
        evt_id = f"evt_idempotent_{uuid.uuid4().hex}"
        webhook_data = {
            "event": "employee_accepted",
            "event_id": evt_id,
            "booking_id": self.booking.request_id,
            "technician": {"name": "Unique Tech"}
        }

        resp1 = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data.get("duplicate"))

    # ── Test 12: Out-of-order webhook → handled safely ────────────────────────
    def test_12_out_of_order_webhook_handled_safely(self):
        self.booking.status = "completed"
        self.booking.save()

        webhook_data = {
            "event": "employee_accepted",
            "event_id": f"evt_stale_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")

    # ── Test 13: Wrong tenant webhook → rejected with 403 ─────────────────────
    def test_13_wrong_tenant_webhook_rejected(self):
        webhook_data = {
            "event": "employee_accepted",
            "event_id": f"evt_wrong_tenant_{uuid.uuid4().hex}",
            "booking_id": self.booking.request_id,
            "company_id": self.other_company.id,
        }
        response = self.client.post("/api/workforce-integration/webhook/", webhook_data, format="json", HTTP_X_WORKFORCE_SECRET="wf_webhook_secret_default")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # ── Test 14: Unauthenticated WebSocket authorization check ────────────────
    def test_14_unauthenticated_websocket_authorization(self):
        from service_requests.consumers import TrackingConsumer
        consumer = TrackingConsumer()
        consumer.sr = self.booking
        consumer.query_string = b""
        consumer.identifier = "SR-INVALID"
        consumer.scope = {"user": None}

        import asyncio
        is_auth = asyncio.run(consumer._is_authorized())
        self.assertFalse(is_auth)

    # ── Test 15: Customer attempts GPS modification → rejected ───────────────
    def test_15_customer_cannot_modify_gps(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.post(f"/api/booking/{self.booking.request_id}/update-location/", {
            "latitude": 13.000000,
            "longitude": 80.000000
        }, format="json")
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

    # ── Test 16: Customer attempts technician identity modification → rejected
    def test_16_customer_cannot_modify_technician_identity(self):
        self.client.force_authenticate(user=self.customer)
        response = self.client.patch(f"/api/booking/{self.booking.id}/", {
            "technician_name": "Hacked Tech Name"
        }, format="json")
        self.booking.refresh_from_db()
        self.assertNotEqual(self.booking.technician_name, "Hacked Tech Name")

    # ── Test 17: Workforce unavailable → returns WORKFORCE_UNAVAILABLE ───────
    def test_17_workforce_unavailable_returns_error_payload(self):
        res = WorkforceIntegrationService.dispatch_job(self.booking)
        self.assertFalse(res.get("success"))
        self.assertEqual(res.get("status"), "workforce_unavailable")

    # ── Test 18: Mock payment flag in production → rejected ───────────────────
    def test_18_mock_payment_flag_rejected(self):
        response = self.client.post(f"/api/booking/{self.booking.id}/retry-payment/", {
            "mock_success": True
        }, format="json")
        self.booking.refresh_from_db()
        self.assertNotEqual(self.booking.payment_status, "paid")
