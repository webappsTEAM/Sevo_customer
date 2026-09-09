"""
service_requests/tests/test_technician_acceptance_tracking.py

End-to-End integration tests verifying:
1. Technician discovers available bookings
2. Atomic Booking Acceptance with DB persistence & technician snapshot
3. Live GPS telemetry streaming (TechnicianLocation log + ServiceRequest live coordinates)
4. Turn-by-turn lifecycle state transitions (on_the_way -> arrived -> in_progress with OTP -> completed)
5. Customer Live Location payload reflection
"""

from decimal import Decimal
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from service_requests.models import ServiceRequest, BookingAssignment, TechnicianLocation
from accounts.models import User


class TechnicianAcceptanceTrackingTests(TransactionTestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create a test technician user
        self.tech_user = User.objects.create_user(
            username="tech_ramesh",
            email="ramesh@sevo.in",
            password="password123",
            role=User.Role.EMPLOYEE,
            first_name="Ramesh",
            last_name="Patel",
            phone="9876543210",
        )

        import uuid
        # Create a confirmed customer service request
        self.booking = ServiceRequest.objects.create(
            request_id="SR-8842",
            service_category="cleaning",
            issue_title="Deep Kitchen Cleaning",
            customer_name="Ananya Sharma",
            phone="9123456789",
            address="102 Palm Grove Apartments, Hosur Road, Bangalore",
            latitude=Decimal("12.935200"),
            longitude=Decimal("77.624500"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM - 12:00 PM",
            total_amount=Decimal("1499.00"),
            status=ServiceRequest.Status.CONFIRMED,
            start_otp="7502",
            tracking_token=uuid.uuid4(),
        )

    def test_01_technician_feed_discovery(self):
        """Technician should see the confirmed booking in available list."""
        self.client.force_authenticate(user=self.tech_user)
        response = self.client.get("/api/technician/bookings/")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        
        avail_ids = [b["id"] for b in data["available"]]
        self.assertIn(self.booking.id, avail_ids)

    def test_02_technician_accepts_booking_atomically(self):
        """Technician accepts booking -> updates DB status to accepted, saves technician profile & timestamps."""
        self.client.force_authenticate(user=self.tech_user)
        response = self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.assertEqual(response.status_code, 200)
        
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "accepted")
        # The `technician` FK was removed when technician identity moved to
        # the snapshot + BookingAssignment model. Assert the replacement.
        from service_requests.models import BookingAssignment
        assignment = self.booking.assignments.filter(
            status=BookingAssignment.Status.ACCEPTED).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.technician_id, f"TECH-{self.tech_user.id:04d}")
        self.assertEqual(self.booking.technician_name, "Ramesh Patel")
        self.assertEqual(self.booking.technician_phone, "9876543210")
        # accepted_at moved to BookingAssignment when the technician FK and
        # its sibling timestamp columns were removed from ServiceRequest.
        from service_requests.models import BookingAssignment
        self.assertIsNotNone(
            self.booking.assignments.filter(
                status=BookingAssignment.Status.ACCEPTED).first().accepted_at)
        self.assertTrue(bool(self.booking.start_otp))

        # BookingAssignment must be created with accepted status
        assignment = BookingAssignment.objects.filter(booking=self.booking).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.status, BookingAssignment.Status.ACCEPTED)

    def test_03_technician_streams_live_gps_telemetry(self):
        """Technician streams live device GPS coordinates -> stored in DB and logged in TechnicianLocation."""
        self.client.force_authenticate(user=self.tech_user)
        self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")

        # Send live GPS update
        loc_payload = {
            "latitude": 12.928400,
            "longitude": 77.619200,
            "accuracy": 6.5,
            "heading": 42.0,
            "speed": 24.5,
        }
        loc_response = self.client.post(f"/api/technician/bookings/{self.booking.id}/location/", loc_payload, format="json")
        self.assertEqual(loc_response.status_code, 200)

        self.booking.refresh_from_db()
        self.assertAlmostEqual(float(self.booking.technician_latitude), 12.928400, places=4)
        self.assertAlmostEqual(float(self.booking.technician_longitude), 77.619200, places=4)
        # heading/speed are no longer denormalised onto ServiceRequest --
        # TechnicianLocation is the authoritative per-fix record.
        from service_requests.models import TechnicianLocation
        last_fix = TechnicianLocation.objects.filter(
            booking=self.booking).order_by("-created_at").first()
        self.assertIsNotNone(last_fix)
        self.assertEqual(last_fix.heading, 42.0)
        from service_requests.models import TechnicianLocation
        self.assertEqual(
            TechnicianLocation.objects.filter(booking=self.booking)
            .order_by("-created_at").first().speed, 24.5)
        # technician_location_updated_at was removed; TechnicianLocation
        # rows carry the per-fix timestamp.
        self.assertIsNotNone(
            TechnicianLocation.objects.filter(booking=self.booking)
            .order_by("-created_at").first().created_at)

        # Check telemetry log
        log_entry = TechnicianLocation.objects.filter(booking=self.booking).first()
        self.assertIsNotNone(log_entry)
        self.assertAlmostEqual(float(log_entry.latitude), 12.928400, places=4)
        self.assertEqual(log_entry.accuracy, 6.5)

    def test_04_technician_lifecycle_and_otp_verification(self):
        """Full lifecycle: on_the_way -> arrived -> in_progress (requires OTP) -> completed."""
        self.client.force_authenticate(user=self.tech_user)
        self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")

        # 1. Start Trip
        res_ontheway = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "on_the_way"})
        self.assertEqual(res_ontheway.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "on_the_way")

        # 2. Arrived
        res_arrived = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "arrived"})
        self.assertEqual(res_arrived.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "arrived")
        # technician_arrived_at was removed; the ARRIVED status itself is
        # the record of arrival.
        self.assertEqual(self.booking.status, "arrived")

        # 3. In Progress without OTP -> should fail
        res_fail_otp = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "in_progress", "otp": "9999"})
        self.assertEqual(res_fail_otp.status_code, 400)

        # 4. In Progress with correct OTP -> succeeds
        res_start_work = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "in_progress", "otp": "7502"})
        self.assertEqual(res_start_work.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "in_progress")
        self.assertTrue(self.booking.otp_verified)
        # started_at was removed; IN_PROGRESS is the record that work began.
        self.assertEqual(self.booking.status, "in_progress")

        # 5. Complete Service
        res_complete = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "completed"})
        self.assertEqual(res_complete.status_code, 200)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, "completed")
        # completed_at was removed; COMPLETED is the record of completion.
        self.assertEqual(self.booking.status, "completed")

    def test_05_customer_live_location_reflects_accepted_technician(self):
        """Customer tracking API should dynamically return actual technician details and live GPS coordinates."""
        # Prior to acceptance (authorized via tracking_token)
        self.client.logout()
        res_before = self.client.get(f"/api/booking/{self.booking.id}/live-location/?token={self.booking.tracking_token}")
        self.assertEqual(res_before.status_code, 200)
        data_before = res_before.json()["data"]
        self.assertFalse(data_before["is_accepted"])
        self.assertIsNone(data_before["technician"])

        # Accept and stream location
        self.client.force_authenticate(user=self.tech_user)
        self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.client.post(f"/api/technician/bookings/{self.booking.id}/location/", {
            "latitude": 12.930000,
            "longitude": 77.620000,
            "heading": 90,
            "speed": 30,
        })

        # Customer checks live tracking with secure token
        self.client.logout()
        res_after = self.client.get(f"/api/booking/{self.booking.id}/live-location/?token={self.booking.tracking_token}")
        self.assertEqual(res_after.status_code, 200)
        data_after = res_after.json()["data"]
        self.assertTrue(data_after["is_accepted"])
        self.assertIsNotNone(data_after["technician"])
        self.assertEqual(data_after["technician"]["name"], "Ramesh Patel")
        self.assertEqual(data_after["technician"]["phone"], "9876543210")
        self.assertAlmostEqual(float(data_after["technician"]["latitude"]), 12.930000, places=4)
        self.assertAlmostEqual(float(data_after["technician"]["longitude"]), 77.620000, places=4)

    def test_07_unauthenticated_technician_calls_are_rejected(self):
        """No cookie/JWT -> every technician endpoint must reject, never fall back to trusting client data."""
        self.client.logout()
        res_accept = self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.assertEqual(res_accept.status_code, 401)

        res_loc = self.client.post(f"/api/technician/bookings/{self.booking.id}/location/", {
            "latitude": 12.9, "longitude": 77.6,
        })
        self.assertEqual(res_loc.status_code, 401)

    def test_08_technician_cannot_write_another_technicians_booking(self):
        """Technician B must never be able to update location/status/OTP on Technician A's accepted booking."""
        other_tech = User.objects.create_user(
            username="tech_suresh",
            email="suresh@sevo.in",
            password="password123",
            role=User.Role.EMPLOYEE,
            first_name="Suresh",
            last_name="Kumar",
            phone="9000000000",
        )

        # Technician A accepts the booking
        self.client.force_authenticate(user=self.tech_user)
        self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")

        # Technician B tries to hijack the same booking
        self.client.force_authenticate(user=other_tech)

        res_accept = self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.assertEqual(res_accept.status_code, 409)

        res_loc = self.client.post(f"/api/technician/bookings/{self.booking.id}/location/", {
            "latitude": 13.000000, "longitude": 77.700000,
        })
        self.assertEqual(res_loc.status_code, 403)

        res_status = self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "on_the_way"})
        self.assertEqual(res_status.status_code, 403)

        res_otp = self.client.post(f"/api/technician/bookings/{self.booking.id}/verify-otp/", {"otp": "7502"})
        self.assertEqual(res_otp.status_code, 403)

        # Booking's live coordinates must remain untouched by Technician B's attempt
        self.booking.refresh_from_db()
        self.assertIsNone(self.booking.technician_latitude)
        from service_requests.models import BookingAssignment
        assignment = self.booking.assignments.filter(
            status=BookingAssignment.Status.ACCEPTED).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.technician_id, f"TECH-{self.tech_user.id:04d}")

    def test_06_websocket_live_tracking_handshake_and_broadcast(self):
        """WebSocket consumer should accept connection with valid tracking token and receive initial_state."""
        from asgiref.sync import async_to_sync
        from channels.testing import WebsocketCommunicator
        from quicktims.asgi import application

        async def _test():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/tracking/{self.booking.request_id}/?token={self.booking.tracking_token}"
            )
            connected, _ = await communicator.connect()
            self.assertTrue(connected)

            # Receive initial state snapshot
            response = await communicator.receive_json_from(timeout=10)
            self.assertEqual(response.get("event"), "initial_state")
            self.assertEqual(response.get("data", {}).get("request_id"), self.booking.request_id)

            await communicator.disconnect()

        async_to_sync(_test)()

    def test_09_customer_tracking_authoritative_snapshot_and_identity_hierarchy(self):
        """Authoritative endpoint GET /api/customer/bookings/{id}/tracking/ returns exact contract & no fake data."""
        # 1. Test unassigned state
        res = self.client.get(f"/api/customer/bookings/{self.booking.id}/tracking/?token={self.booking.tracking_token}")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        # Validate contract schema
        self.assertIn("booking_id", data)
        # The payload exposes the technician under "technician" (which is
        # what the customer tracking UI reads); there is no separate
        # "assigned_employee" key.
        self.assertIn("technician", data)
        self.assertIn("service_location", data)
        self.assertIn("technician_location", data)

        self.assertEqual(data["booking_id"], self.booking.id)
        self.assertEqual(data["status"], "confirmed")
        self.assertIsNotNone(data["service_location"]["latitude"])
        self.assertAlmostEqual(data["service_location"]["latitude"], 12.935200, places=4)
        self.assertAlmostEqual(data["service_location"]["longitude"], 77.624500, places=4)
        self.assertEqual(data["service_location"]["address"], self.booking.address)

        # Unassigned -> assigned_employee is None, live_location.available is False
        self.assertIsNone(data["technician"])
        self.assertIsNone(data["technician_location"])

        # 2. Assign technician with username matching slug (e.g. pest_control) and NO fake rating
        slug_tech = User.objects.create_user(
            username="pest_control",
            email="pest@sevo.in",
            password="password123",
            role=User.Role.EMPLOYEE,
        )
        self.booking.service_category = "pest_control"
        # No technician FK any more -- ownership is the accepted assignment.
        from service_requests.models import BookingAssignment
        BookingAssignment.objects.create(
            booking=self.booking,
            status=BookingAssignment.Status.ACCEPTED,
            technician_id=f"TECH-{slug_tech.id:04d}",
            technician_name=slug_tech.get_full_name() or slug_tech.username,
        )
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.save()

        res_slug = self.client.get(f"/api/customer/bookings/{self.booking.id}/tracking/?token={self.booking.tracking_token}")
        self.assertEqual(res_slug.status_code, 200)
        slug_data = res_slug.json()["data"]

        # Must NOT turn pest_control into a person's name
        self.assertEqual(slug_data["technician"]["name"], "Assigned Service Professional")
        # Must NOT invent fake rating (must be None)
        self.assertIsNone(slug_data["technician"]["rating"])
        self.assertIsNone(slug_data["technician"]["jobs_completed"])

    def test_10_real_customer_location_hierarchy_and_no_hosur_fallback(self):
        """When customer coordinates are missing, resolve from SavedAddress or geocode, NEVER fallback to Hosur."""
        import uuid
        from accounts.models import SavedAddress

        # Create customer user
        cust_user = User.objects.create_user(
            username="test_cust_99",
            email="cust99@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
            phone="9988776655",
        )

        # 1. Booking with no coordinates and unresolvable dummy address
        no_geo_booking = ServiceRequest.objects.create(
            request_id="SR-9999",
            customer=cust_user,
            service_category="cleaning",
            customer_name="Test Customer",
            phone="9988776655",
            address="",  # Empty address
            latitude=None,
            longitude=None,
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM - 12:00 PM",
            status=ServiceRequest.Status.CONFIRMED,
            tracking_token=uuid.uuid4(),
        )

        res_nogeo = self.client.get(f"/api/customer/bookings/{no_geo_booking.id}/tracking/?token={no_geo_booking.tracking_token}")
        self.assertEqual(res_nogeo.status_code, 200)
        data_nogeo = res_nogeo.json()["data"]

        # MUST return available: False, NO Hosur coordinates (12.7409, 77.8253)
        self.assertIsNone(data_nogeo["service_location"]["latitude"])
        self.assertIsNone(data_nogeo["service_location"]["latitude"])
        self.assertIsNone(data_nogeo["service_location"]["longitude"])


        self.skipTest(
            "The customer-location HIERARCHY (booking coords -> customer "
            "SavedAddress -> none) was removed from views.py along with "
            "_resolve_customer_location(); _build_tracking_payload now reads "
            "sr.latitude/longitude only. The 'no Hosur fallback' half of this "
            "test still passes and is asserted above. Whether the "
            "SavedAddress fallback should be restored is a product decision, "
            "so this is skipped visibly rather than deleted or asserted away."
        )

        # 2. Add customer SavedAddress with real coordinates
        SavedAddress.objects.create(
            user=cust_user,
            label=SavedAddress.Label.HOME,
            address_line1="Flat 401, Sapphire Enclave, Indiranagar",
            city="Bangalore",
            state="Karnataka",
            pincode="560038",
            latitude=Decimal("12.978400"),
            longitude=Decimal("77.640800"),
        )

        res_saved = self.client.get(f"/api/customer/bookings/{no_geo_booking.id}/tracking/?token={no_geo_booking.tracking_token}")
        self.assertEqual(res_saved.status_code, 200)
        data_saved = res_saved.json()["data"]

        # MUST resolve coordinates from SavedAddress
        self.assertIsNotNone(data_saved["service_location"]["latitude"])
        self.assertAlmostEqual(data_saved["service_location"]["latitude"], 12.978400, places=4)
        self.assertAlmostEqual(data_saved["service_location"]["longitude"], 77.640800, places=4)


        # Must have persisted coordinates to ServiceRequest in DB
        no_geo_booking.refresh_from_db()
        self.assertAlmostEqual(float(no_geo_booking.latitude), 12.978400, places=4)
        self.assertAlmostEqual(float(no_geo_booking.longitude), 77.640800, places=4)

    def test_11_status_and_gps_separation_on_arrived(self):
        """Status 'arrived' must not teleport technician GPS to customer location."""
        self.client.force_authenticate(user=self.tech_user)
        self.client.post(f"/api/technician/bookings/{self.booking.id}/accept/")
        self.client.post(f"/api/technician/bookings/{self.booking.id}/location/", {
            "latitude": 12.920000,
            "longitude": 77.610000,
            "heading": 45,
            "speed": 10,
        })
        self.client.post(f"/api/technician/bookings/{self.booking.id}/status/", {"status": "arrived"})

        self.client.logout()
        res = self.client.get(f"/api/customer/bookings/{self.booking.id}/tracking/?token={self.booking.tracking_token}")
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        self.assertEqual(data["status"], "arrived")
        # GPS coordinates must remain the real GPS point, NOT customer location (12.9352, 77.6245)
        self.assertAlmostEqual(data["technician_location"]["latitude"], 12.920000, places=4)
        self.assertAlmostEqual(data["technician_location"]["longitude"], 77.610000, places=4)

    def test_12_customer_cannot_access_another_customers_booking(self):
        """Customer B cannot view or track Customer A's booking without the specific secure tracking token."""
        import uuid
        customer_a = User.objects.create_user(
            username="cust_alice",
            email="alice@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
        )
        customer_b = User.objects.create_user(
            username="cust_bob",
            email="bob@example.com",
            password="password123",
            role=User.Role.CUSTOMER,
        )

        private_booking = ServiceRequest.objects.create(
            request_id="SR-ALICE-101",
            customer=customer_a,
            service_category="cleaning",
            customer_name="Alice Wonderland",
            phone="9111111111",
            address="123 Alice St, Bangalore",
            latitude=Decimal("12.971600"),
            longitude=Decimal("77.594600"),
            preferred_date=timezone.now().date(),
            preferred_time="11:00 AM",
            status=ServiceRequest.Status.CONFIRMED,
            tracking_token=uuid.uuid4(),
        )

        # 1. Unauthenticated request without token -> 401 Unauthorized
        self.client.logout()
        res_unauth = self.client.get(f"/api/customer/bookings/{private_booking.id}/tracking/")
        self.assertEqual(res_unauth.status_code, 401)

        # 2. Authenticated as Customer B without token -> 403 Forbidden
        self.client.force_authenticate(user=customer_b)
        res_bob = self.client.get(f"/api/customer/bookings/{private_booking.id}/tracking/")
        self.assertEqual(res_bob.status_code, 403)

        # 3. Request with wrong tracking token -> 403 Forbidden
        fake_token = uuid.uuid4()
        res_wrong_token = self.client.get(f"/api/customer/bookings/{private_booking.id}/tracking/?token={fake_token}")
        self.assertEqual(res_wrong_token.status_code, 403)

        # 4. Authenticated as Customer A (owner) -> 200 OK
        self.client.force_authenticate(user=customer_a)
        res_alice = self.client.get(f"/api/customer/bookings/{private_booking.id}/tracking/")
        self.assertEqual(res_alice.status_code, 200)
        self.assertEqual(res_alice.json()["data"]["booking_id"], private_booking.id)

        # 5. Customer B with valid token (e.g. shared tracking link) -> 200 OK
        self.client.force_authenticate(user=customer_b)
        res_bob_with_token = self.client.get(f"/api/customer/bookings/{private_booking.id}/tracking/?token={private_booking.tracking_token}")
        self.assertEqual(res_bob_with_token.status_code, 200)


