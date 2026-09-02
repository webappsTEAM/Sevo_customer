import hmac
import hashlib
import json
import uuid
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator

from quicktims.asgi import application
from service_requests.models import (
    ServiceRequest,
    BookingAssignment,
    TechnicianLocation,
    WorkforceWebhookEvent,
)
from workforce_integration.services import WorkforceIntegrationService
from workforce_integration.views import WORKFORCE_WEBHOOK_SECRET
from unittest.mock import patch, MagicMock

User = get_user_model()


class StandaloneWorkforceIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="customer_user",
            email="customer@example.com",
            password="testpassword",
            phone="9123456789",
        )
        self.booking = ServiceRequest.objects.create(
            customer=self.customer,
            customer_name="Ananya Sharma",
            phone="9123456789",
            email="ananya@example.com",
            request_id="AC0001",
            service_category="ac_repair",
            issue_title="AC Deep Jet Cleaning",
            description="Split AC service required",
            address="102 Palm Grove, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM - 12:00 PM",
            total_amount=Decimal("499.00"),
            payment_method=ServiceRequest.PaymentMethod.COD,
            payment_status=ServiceRequest.PaymentStatus.PENDING,
            status=ServiceRequest.Status.CONFIRMED,
            start_otp="7502",
            tracking_token=uuid.uuid4(),
        )

    def _generate_signature(self, payload_dict: dict) -> str:
        body = json.dumps(payload_dict).encode("utf-8")
        return hmac.new(
            WORKFORCE_WEBHOOK_SECRET.encode("utf-8"),
            body,
            hashlib.sha256
        ).hexdigest()

    @patch("workforce_integration.services.requests.post")
    def test_01_customer_to_vendor_dispatch(self, mock_post):
        """Test Step 1: Customer dispatches booking to Standalone Vendor."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": True,
            "workforce_job_id": "WF-9821",
            "status": "queued",
        }
        mock_post.return_value = mock_response

        res = WorkforceIntegrationService.dispatch_job(self.booking)
        self.assertTrue(res.get("success"))
        self.assertEqual(res.get("workforce_job_id"), "WF-9821")

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.workforce_job_id, "WF-9821")

        # Verify dispatched payload structure
        call_args, call_kwargs = mock_post.call_args
        payload = call_kwargs["json"]
        self.assertEqual(payload["booking_id"], "AC0001")
        self.assertEqual(payload["category"], "ac_repair")
        self.assertEqual(payload["customer"]["name"], "Ananya Sharma")
        self.assertEqual(payload["start_otp"], "7502")
        self.assertEqual(payload["tracking_token"], str(self.booking.tracking_token))

    def test_02_webhook_signature_verification(self):
        """Test Step 2: Vendor webhook requires valid HMAC-SHA256 signature."""
        payload = {
            "event": "employee_accepted",
            "booking_id": "AC0001",
            "payload": {
                "technician": {
                    "name": "Ramesh Patel",
                    "phone": "9876543210",
                    "rating": 4.9,
                }
            }
        }

        # 1. Missing signature -> 401
        res_no_sig = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(res_no_sig.status_code, 401)

        # 2. Invalid signature -> 401
        res_bad_sig = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE="invalid_signature_hex",
        )
        self.assertEqual(res_bad_sig.status_code, 401)

        # 3. Valid signature -> 200
        valid_sig = self._generate_signature(payload)
        res_valid = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=valid_sig,
        )
        self.assertEqual(res_valid.status_code, 200)
        self.assertTrue(res_valid.json().get("success"))

    def test_03_webhook_idempotency(self):
        """Test Step 3: Duplicate webhook events are acknowledged idempotently."""
        payload = {
            "event_id": "evt_unique_1001",
            "event": "employee_accepted",
            "booking_id": "AC0001",
            "payload": {
                "technician": {
                    "name": "Ramesh Patel",
                    "phone": "9876543210",
                }
            }
        }
        sig = self._generate_signature(payload)

        # First post
        res1 = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=sig,
        )
        self.assertEqual(res1.status_code, 200)

        # Duplicate post with same event_id
        res2 = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=sig,
        )
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json().get("duplicate"))

    def test_04_full_lifecycle_and_gps_telemetry_persistence(self):
        """Test Step 4: Webhooks persist technician acceptance and full GPS telemetry."""
        # 1. Technician Accepts Job
        accept_payload = {
            "event_id": "evt_accept_2001",
            "event": "employee_accepted",
            "booking_id": "AC0001",
            "payload": {
                "workforce_job_id": "WF-9821",
                "technician": {
                    "name": "Ramesh Patel",
                    "phone": "9876543210",
                    "photo": "/media/avatars/ramesh.jpg",
                    "rating": 4.9,
                }
            }
        }
        res_accept = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(accept_payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=self._generate_signature(accept_payload),
        )
        self.assertEqual(res_accept.status_code, 200)

        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "accepted")
        self.assertEqual(self.booking.technician_name, "Ramesh Patel")
        self.assertEqual(self.booking.technician_phone, "9876543210")
        self.assertEqual(float(self.booking.technician_rating), 4.9)

        # 2. Technician Streams GPS Update #1
        gps_payload_1 = {
            "event_id": "evt_gps_3001",
            "event": "technician.location_updated",
            "booking_id": "AC0001",
            "payload": {
                "workforce_job_id": "WF-9821",
                "location": {
                    "latitude": 12.7420,
                    "longitude": 77.8260,
                    "heading": 85.0,
                    "speed": 22.5,
                    "accuracy": 6.0,
                    "updated_at": "2026-09-01T17:15:00.000Z",
                }
            }
        }
        res_gps_1 = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(gps_payload_1),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=self._generate_signature(gps_payload_1),
        )
        self.assertEqual(res_gps_1.status_code, 200)

        self.booking.refresh_from_db()
        self.assertAlmostEqual(float(self.booking.technician_latitude), 12.7420, places=4)
        self.assertAlmostEqual(float(self.booking.technician_longitude), 77.8260, places=4)
        self.assertEqual(self.booking.technician_heading, 85.0)
        self.assertEqual(self.booking.technician_speed, 22.5)
        self.assertEqual(self.booking.technician_accuracy, 6.0)

        # Verify TechnicianLocation log was created
        loc_log = TechnicianLocation.objects.filter(booking=self.booking).latest("id")
        self.assertAlmostEqual(float(loc_log.latitude), 12.7420, places=4)
        self.assertEqual(loc_log.heading, 85.0)

        # 3. Technician Status -> on_the_way
        on_way_payload = {
            "event_id": "evt_on_way_4001",
            "event": "employee_on_the_way",
            "booking_id": "AC0001",
            "payload": {"booking_id": "AC0001"}
        }
        res_on_way = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(on_way_payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=self._generate_signature(on_way_payload),
        )
        self.assertEqual(res_on_way.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "on_the_way")

    async def test_05_websocket_realtime_bridge_and_fallback(self):
        """Test Step 5: Webhook triggers real-time WebSocket broadcast and REST fallback."""
        ws_url = f"/ws/tracking/AC0001/?token={self.booking.tracking_token}"
        communicator = WebsocketCommunicator(application, ws_url)
        connected, subprotocol = await communicator.connect()
        self.assertTrue(connected)

        # Receive initial state
        init_resp = await communicator.receive_json_from()
        self.assertEqual(init_resp.get("event"), "initial_state")

        # Update booking GPS
        await sync_to_async_test_helper(self._update_booking_gps)

        # Receive real-time technician_location_updated event on WebSocket
        event_resp = await communicator.receive_json_from(timeout=5)
        self.assertEqual(event_resp.get("event"), "technician_location_updated")
        data = event_resp.get("data", {})
        self.assertAlmostEqual(float(data["technician"]["latitude"]), 12.7435, places=4)
        self.assertAlmostEqual(float(data["technician"]["longitude"]), 77.8275, places=4)
        self.assertEqual(data["technician"]["heading"], 92.0)
        self.assertEqual(data["freshness"], "LIVE")

        await communicator.disconnect()

    def test_06_stale_location_protection(self):
        """Test Step 6: Out-of-order stale GPS packets do not overwrite newer coordinates."""
        import datetime
        # 1. Store a newer GPS update at 17:20:00
        new_time = datetime.datetime(2026, 9, 1, 17, 20, 0, tzinfo=datetime.timezone.utc)
        self.booking.technician_latitude = Decimal("12.744000")
        self.booking.technician_longitude = Decimal("77.828000")
        self.booking.technician_location_updated_at = new_time
        self.booking.save()

        # 2. Receive an older/out-of-order GPS update with timestamp 17:15:00
        stale_payload = {
            "event_id": "evt_gps_stale_5001",
            "event": "technician.location_updated",
            "booking_id": "AC0001",
            "payload": {
                "workforce_job_id": "WF-9821",
                "location": {
                    "latitude": 12.7410,
                    "longitude": 77.8250,
                    "heading": 45.0,
                    "speed": 15.0,
                    "updated_at": "2026-09-01T17:15:00.000Z",
                }
            }
        }
        res_stale = self.client.post(
            "/api/workforce-integration/webhook/",
            data=json.dumps(stale_payload),
            content_type="application/json",
            HTTP_X_WORKFORCE_SIGNATURE=self._generate_signature(stale_payload),
        )
        self.assertEqual(res_stale.status_code, 200)

        # 3. Assert newer coordinates were preserved and NOT overwritten by stale packet
        self.booking.refresh_from_db()
        self.assertAlmostEqual(float(self.booking.technician_latitude), 12.7440, places=4)
        self.assertAlmostEqual(float(self.booking.technician_longitude), 77.8280, places=4)
        self.assertEqual(self.booking.technician_location_updated_at, new_time)

    def test_07_unauthorized_cross_customer_rejection(self):
        """Test Step 7: Cross-customer access to live tracking without valid token is rejected."""
        other_customer = User.objects.create_user(
            username="other_customer",
            email="other@example.com",
            password="testpassword",
        )
        self.client.force_authenticate(user=other_customer)

        # Requesting booking live-location without tracking token returns 403
        res = self.client.get(f"/api/booking/{self.booking.request_id}/live-location/")
        self.assertEqual(res.status_code, 403)

        # Requesting with the valid tracking token succeeds
        res_token = self.client.get(f"/api/booking/{self.booking.request_id}/live-location/?token={self.booking.tracking_token}")
        self.assertEqual(res_token.status_code, 200)
        data = res_token.json().get("data", res_token.json())
        self.assertEqual(data.get("booking_id"), self.booking.id)

    def _update_booking_gps(self):
        self.booking.refresh_from_db()
        self.booking.status = ServiceRequest.Status.ON_THE_WAY
        self.booking.technician_latitude = Decimal("12.743500")
        self.booking.technician_longitude = Decimal("77.827500")
        self.booking.technician_heading = 92.0
        self.booking.technician_speed = 28.0
        self.booking.technician_accuracy = 5.0
        self.booking.technician_location_updated_at = timezone.now()
        self.booking.save()

        from service_requests.notifications import broadcast_tracking_event
        broadcast_tracking_event(self.booking, "technician_location_updated")


def sync_to_async_test_helper(func):
    from asgiref.sync import sync_to_async
    return sync_to_async(func)()
