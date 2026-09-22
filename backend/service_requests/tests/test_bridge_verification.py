"""
backend/service_requests/tests/test_bridge_verification.py
"""
import uuid
from decimal import Decimal
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from service_requests.models import ServiceRequest
from accounts.models import User
from channels.testing import WebsocketCommunicator
from quicktims.asgi import application
from asgiref.sync import async_to_sync, sync_to_async


class BridgeVerificationTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        uid = uuid.uuid4().hex[:6]
        self.tech_user = User.objects.create_user(
            username=f"tech_bridge_{uid}",
            email=f"tech_bridge_{uid}@example.com",
            password="password123",
            role=User.Role.EMPLOYEE,
            first_name="Ramesh",
            last_name="Patel",
            phone="9876543210",
        )
        self.token = uuid.uuid4()
        self.booking = ServiceRequest.objects.create(
            request_id=f"SR-BR-{uid.upper()}",
            service_category="ac_repair",
            issue_title="AC Cooling Problem",
            customer_name="Test Customer",
            phone="9123456789",
            address="102 Palm Grove Apartments, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM - 12:00 PM",
            total_amount=Decimal("499.00"),
            status=ServiceRequest.Status.CONFIRMED,
            start_otp="7502",
            tracking_token=self.token,
        )

    def test_complete_bridge_chain(self):
        # 1. Technician accepts booking
        self.client.force_authenticate(user=self.tech_user)
        accept_res = self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.assertEqual(accept_res.status_code, 200)

        # 2. Customer opens WebSocket connection
        async def _run_stream_test():
            ws_url = f"/ws/tracking/{self.booking.request_id}/?token={self.token}"
            communicator = WebsocketCommunicator(application, ws_url)
            connected, _ = await communicator.connect()
            self.assertTrue(connected, "WebSocket connection handshake failed")

            # Receive initial_state
            init_msg = await communicator.receive_json_from(timeout=5)
            self.assertEqual(init_msg.get("event"), "initial_state")
            self.assertTrue(init_msg.get("data", {}).get("is_accepted"))
            self.assertEqual(init_msg.get("data", {}).get("technician", {}).get("name"), "Ramesh Patel")

            # 3. Send 1st Technician GPS Update via sync_to_async
            loc1_payload = {
                "latitude": 12.742000,
                "longitude": 77.826000,
                "accuracy": 7.0,
                "heading": 85.0,
                "speed": 22.0,
            }
            res_loc1 = await sync_to_async(self.client.post)(
                f"/api/technician/bookings/{self.booking.id}/location/",
                loc1_payload,
                format="json"
            )
            self.assertEqual(res_loc1.status_code, 200)

            # Read all messages until technician_location_updated with lat 12.742000
            loc1_received = False
            for _ in range(5):
                msg = await communicator.receive_json_from(timeout=2)
                if msg.get("event") == "technician_location_updated":
                    tech = msg.get("data", {}).get("technician", {})
                    if tech.get("latitude") and abs(float(tech["latitude"]) - 12.742000) < 0.001:
                        loc1_received = True
                        break
            self.assertTrue(loc1_received, "1st location update event not received over WebSocket")

            # 4. Send 2nd Technician GPS Update via sync_to_async
            loc2_payload = {
                "latitude": 12.743500,
                "longitude": 77.827500,
                "accuracy": 5.0,
                "heading": 92.0,
                "speed": 28.0,
            }
            res_loc2 = await sync_to_async(self.client.post)(
                f"/api/technician/bookings/{self.booking.id}/location/",
                loc2_payload,
                format="json"
            )
            self.assertEqual(res_loc2.status_code, 200)

            # Read all messages until technician_location_updated with lat 12.743500
            loc2_received = False
            for _ in range(5):
                msg = await communicator.receive_json_from(timeout=2)
                if msg.get("event") == "technician_location_updated":
                    tech = msg.get("data", {}).get("technician", {})
                    if tech.get("latitude") and abs(float(tech["latitude"]) - 12.743500) < 0.001:
                        loc2_received = True
                        break
            self.assertTrue(loc2_received, "2nd location update event not received over WebSocket")

            await communicator.disconnect()

        async_to_sync(_run_stream_test)()

        # 5. Verify REST snapshot matches latest state
        self.client.logout()
        res_snap = self.client.get(f"/api/booking/{self.booking.id}/live-location/?token={self.token}")
        self.assertEqual(res_snap.status_code, 200)
        snap_data = res_snap.json().get("data", {})
        self.assertAlmostEqual(float(snap_data.get("technician", {}).get("latitude")), 12.743500, places=4)
        self.assertAlmostEqual(float(snap_data.get("technician", {}).get("longitude")), 77.827500, places=4)
        self.assertEqual(snap_data.get("status"), "on_the_way")
        self.assertEqual(snap_data.get("start_otp"), "7502")
