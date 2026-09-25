import uuid
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import User
from companies.models import Company
from service_requests.models import ServiceRequest, BookingAssignment, WorkforceWebhookEvent
from workforce_integration.services import WORKFORCE_WEBHOOK_SECRET
from service_requests.consumers import TrackingConsumer


class CustomerWorkforceIntegrationVerificationTests(TestCase):
    """
    Verification test suite confirming customer-side dispatch safety,
    Workforce lifecycle webhook event mapping, idempotency, location handling,
    and realtime Channels consumer behavior.
    """

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalServices Test", display_id="COMP-TEST-1")
        self.customer = User.objects.create_user(
            username="customer_verify_test",
            email="customer_verify@example.com",
            phone="9876543210",
            role="customer",
        )
        self.booking = ServiceRequest.objects.create(
            request_id="SR-VERIFY-001",
            company=self.company,
            customer=self.customer,
            customer_name="Verify Customer",
            phone="9876543210",
            email="customer_verify@example.com",
            service_category="electrical",
            issue_title="Ceiling Fan Repair",
            status=ServiceRequest.Status.CONFIRMED,
            payment_method=ServiceRequest.PaymentMethod.COD,
            payment_status=ServiceRequest.PaymentStatus.PENDING,
            total_amount=Decimal("499.00"),
            preferred_date=timezone.now().date(),
            preferred_time="morning",
            tracking_token=uuid.uuid4(),
            start_otp="654321",
        )

    def _post_webhook(self, event_type, payload_extra=None):
        evt_id = f"evt_{uuid.uuid4().hex}"
        body = {
            "event": event_type,
            "event_id": evt_id,
            "booking_id": self.booking.request_id,
            "workforce_job_id": "WFJ-TEST-1234",
            **(payload_extra or {}),
        }
        return self.client.post(
            "/api/workforce-integration/webhook/",
            body,
            format="json",
            HTTP_X_WORKFORCE_SECRET=WORKFORCE_WEBHOOK_SECRET,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Dispatch Safety & Status Gating
    # ──────────────────────────────────────────────────────────────────────────

    def test_01_task_guard_skips_unconfirmed_statuses(self):
        """Celery task must reject non-dispatchable bookings (e.g. WAITING_FOR_PAYMENT, CANCELLED)."""
        from service_requests.tasks import async_dispatch_service_request

        self.booking.status = ServiceRequest.Status.WAITING_FOR_PAYMENT
        self.booking.save()

        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as mock_dispatch:
            res = async_dispatch_service_request(self.booking.id)
            self.assertFalse(res["success"])
            self.assertIn("not dispatchable", res["error"])
            mock_dispatch.assert_not_called()

        self.booking.status = ServiceRequest.Status.CANCELLED
        self.booking.save()

        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as mock_dispatch:
            res = async_dispatch_service_request(self.booking.id)
            self.assertFalse(res["success"])
            self.assertIn("not dispatchable", res["error"])
            mock_dispatch.assert_not_called()

    def test_02_task_guard_allows_confirmed_statuses(self):
        """Celery task dispatches when status is CONFIRMED."""
        from service_requests.tasks import async_dispatch_service_request

        self.booking.status = ServiceRequest.Status.CONFIRMED
        self.booking.save()

        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as mock_dispatch:
            mock_dispatch.return_value = {"success": True, "workforce_job_id": "WFJ-999"}
            res = async_dispatch_service_request(self.booking.id)
            self.assertTrue(res["success"])
            mock_dispatch.assert_called_once()

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)

    def test_03_idempotent_dispatch_skips_already_dispatched(self):
        """If booking already has DISPATCHED and workforce_job_id, task skips redundant network call."""
        from service_requests.tasks import async_dispatch_service_request

        self.booking.status = ServiceRequest.Status.CONFIRMED
        self.booking.dispatch_status = ServiceRequest.DispatchStatus.DISPATCHED
        self.booking.workforce_job_id = "WFJ-ALREADY-DISPATCHED"
        self.booking.save()

        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as mock_dispatch:
            res = async_dispatch_service_request(self.booking.id)
            self.assertTrue(res["success"])
            mock_dispatch.assert_not_called()

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Webhook Event Mappings & Aliases
    # ──────────────────────────────────────────────────────────────────────────

    def test_04_webhook_technician_assigned_creates_assignment_and_moves_to_assigned(self):
        """technician.assigned / job.assigned moves status to assigned and creates offered assignment."""
        resp = self._post_webhook("technician.assigned", {
            "technician": {"id": "TECH-1", "name": "Rahul Tech", "phone": "9999911111"}
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "assigned")
        # Technician name should not yet be exposed on booking snapshot until accepted
        self.assertEqual(self.booking.technician_name, "")
        self.assertTrue(self.booking.assignments.filter(status=BookingAssignment.Status.OFFERED).exists())

    def test_05_webhook_employee_accepted_populates_technician_metadata(self):
        """employee_accepted / job.accepted populates technician metadata onto booking snapshot."""
        self.booking.status = "assigned"
        self.booking.save()

        resp = self._post_webhook("employee_accepted", {
            "technician": {
                "name": "Priya Sharma",
                "phone": "9888877777",
                "photo": "https://example.com/priya.jpg",
                "rating": 4.9,
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "accepted")
        self.assertEqual(self.booking.technician_name, "Priya Sharma")
        self.assertEqual(self.booking.technician_phone, "9888877777")
        self.assertEqual(self.booking.technician_photo, "https://example.com/priya.jpg")
        self.assertEqual(float(self.booking.technician_rating), 4.9)

    def test_06_webhook_en_route_aliases(self):
        """technician.en_route, job.started, en_route transition booking to on_the_way."""
        self.booking.status = "accepted"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        resp = self._post_webhook("technician.en_route", {
            "location": {"latitude": 12.9716, "longitude": 77.5946}
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "on_the_way")
        self.assertAlmostEqual(float(self.booking.technician_latitude), 12.9716, places=4)
        self.assertAlmostEqual(float(self.booking.technician_longitude), 77.5946, places=4)

    def test_07_webhook_arrived_aliases(self):
        """technician.arrived, arrived transition booking to arrived."""
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        resp = self._post_webhook("technician.arrived")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "arrived")

    def test_08_webhook_in_progress_aliases(self):
        """job.in_progress, work_started transition booking to in_progress."""
        self.booking.status = "arrived"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        resp = self._post_webhook("work_started")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "in_progress")

    def test_09_webhook_completed_aliases(self):
        """service_completed, job.completed, completed transition booking to completed."""
        self.booking.status = "in_progress"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        resp = self._post_webhook("completed")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")

    def test_10_webhook_cancellation_from_workforce(self):
        """job.cancelled / technician.cancelled transitions booking to cancelled."""
        self.booking.status = "accepted"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        resp = self._post_webhook("technician.cancelled", {
            "reason": "Emergency vehicle breakdown"
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "cancelled")
        self.assertEqual(self.booking.cancelled_by_persona, "employee")
        self.assertIn("Emergency vehicle breakdown", self.booking.cancellation_note)

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Location Telemetry vs Lifecycle State Isolation
    # ──────────────────────────────────────────────────────────────────────────

    def test_11_location_updated_does_not_mutate_lifecycle_status(self):
        """technician.location_updated updates GPS fixes without touching booking status."""
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Priya Sharma"
        self.booking.save()

        now_iso = timezone.now().isoformat()
        resp = self._post_webhook("technician.location_updated", {
            "location": {
                "latitude": 13.0827,
                "longitude": 80.2707,
                "heading": 90.0,
                "speed": 35.5,
                "accuracy": 10.0,
                "captured_at": now_iso,
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "on_the_way")  # Still on_the_way
        self.assertAlmostEqual(float(self.booking.technician_latitude), 13.0827, places=4)
        self.assertAlmostEqual(float(self.booking.technician_longitude), 80.2707, places=4)

    # ──────────────────────────────────────────────────────────────────────────
    # 4. WebSocket TrackingConsumer & Dispatch Completeness
    # ──────────────────────────────────────────────────────────────────────────

    def test_12_tracking_consumer_handles_all_lifecycle_events(self):
        """TrackingConsumer must handle all event types via dispatch() without AttributeError."""
        import asyncio

        consumer = TrackingConsumer()
        sent_messages = []

        async def fake_send_json(content):
            sent_messages.append(content)

        consumer.send_json = fake_send_json

        events_to_test = [
            ("job_dispatched", {"status": "assigned"}),
            ("employee_accepted", {"status": "accepted"}),
            ("technician_accepted", {"status": "accepted"}),
            ("employee_rejected", {"status": "confirmed"}),
            ("employee_on_the_way", {"status": "on_the_way"}),
            ("technician_on_the_way", {"status": "on_the_way"}),
            ("employee_arrived", {"status": "arrived"}),
            ("technician_arrived", {"status": "arrived"}),
            ("service_started", {"status": "in_progress"}),
            ("service_completed", {"status": "completed"}),
            ("booking_cancelled", {"status": "cancelled"}),
            ("booking_dispatch_delayed", {"message": "Searching..."}),
            ("work_extension_created", {"estimate": 500}),
            ("payment_collected", {"amount": 499}),
            ("logistics_leg_changed", {"leg": "IN_TRANSIT"}),
            ("job_rescheduled", {"new_date": "2026-09-25"}),
        ]

        for evt_type, data in events_to_test:
            sent_messages.clear()
            asyncio.run(consumer.dispatch({"type": evt_type, "data": data}))
            self.assertEqual(len(sent_messages), 1, f"Failed to dispatch {evt_type}")
            self.assertEqual(sent_messages[0]["event"], evt_type)
            self.assertEqual(sent_messages[0]["data"], data)

    # ──────────────────────────────────────────────────────────────────────────
    # 5. REST Polling Parity
    # ──────────────────────────────────────────────────────────────────────────

    def test_13_rest_tracking_endpoint_parity(self):
        """REST endpoint returns exact status, technician, and location."""
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Priya Sharma"
        self.booking.technician_phone = "9888877777"
        self.booking.technician_latitude = Decimal("13.0827")
        self.booking.technician_longitude = Decimal("80.2707")
        self.booking.save()

        # Public tracking token route
        with patch("workforce_integration.services.WorkforceIntegrationService.get_technician_tracking", return_value=None), \
             patch("workforce_integration.services.WorkforceIntegrationService.get_quote_by_booking_id", return_value=None), \
             patch("workforce_integration.services.WorkforceIntegrationService.get_quote_history_by_booking_id", return_value=None):
            resp = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get("data", resp.data)
        self.assertEqual(data.get("status"), "on_the_way")
        self.assertEqual(data.get("technician_name"), "Priya Sharma")
        self.assertIsNotNone(data.get("technician"))
        self.assertAlmostEqual(float(data["technician"]["latitude"]), 13.0827, places=4)
        self.assertAlmostEqual(float(data["technician"]["longitude"]), 80.2707, places=4)
        self.assertIsNotNone(data.get("technician_location"))
        self.assertAlmostEqual(float(data["technician_location"]["latitude"]), 13.0827, places=4)
