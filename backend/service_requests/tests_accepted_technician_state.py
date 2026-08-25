from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from service_requests.models import ServiceRequest, BookingAssignment
from companies.models import Company
import uuid

User = get_user_model()

class AcceptedTechnicianStateTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.company = Company.objects.create(company_name="Sevo Test Company")
        
        self.customer1 = User.objects.create_user(
            username="test_customer_1@calservice.com",
            email="test_customer_1@calservice.com",
            password="testpassword123",
            role="customer",
            first_name="Alice",
            last_name="Customer"
        )
        
        self.customer2 = User.objects.create_user(
            username="test_customer_2@calservice.com",
            email="test_customer_2@calservice.com",
            password="testpassword123",
            role="customer",
            first_name="Bob",
            last_name="Customer"
        )

        self.booking = ServiceRequest.objects.create(
            request_id="KC9999",
            customer=self.customer1,
            company=self.company,
            customer_name="Alice Customer",
            phone="9876543210",
            service_category="electrical",
            issue_title="Fan Repair",
            address="123 Test St, Hosur",
            preferred_date="2026-08-25",
            preferred_time="10:00 AM - 12:00 PM",
            latitude=12.7500,
            longitude=77.8300,
            status="confirmed",
            tracking_token=str(uuid.uuid4())
        )

    def test_01_employee_accepted_with_gps_shows_technician_and_live_marker(self):
        """1. employee_accepted + GPS available -> technician visible + live coordinates on map"""
        self.booking.status = "accepted"
        self.booking.technician_name = "Ramesh Electrician"
        self.booking.technician_phone = "+919876543210"
        self.booking.technician_rating = 4.9
        self.booking.technician_latitude = 12.7400
        self.booking.technician_longitude = 77.8200
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("status"), "accepted")
        self.assertIsNotNone(data.get("technician"))
        self.assertEqual(data["technician"]["name"], "Ramesh Electrician")
        self.assertEqual(data["technician"]["latitude"], 12.7400)
        self.assertEqual(data["technician"]["longitude"], 77.8200)
        self.assertIsNotNone(data.get("technician_location"))
        self.assertEqual(data["technician_location"]["latitude"], 12.7400)

    def test_02_employee_accepted_without_gps_shows_technician_and_null_coordinates(self):
        """2. employee_accepted + GPS unavailable -> technician visible + GPS null, is_accepted=True, never assigned"""
        self.booking.status = "accepted"
        self.booking.technician_name = "Ramesh Electrician"
        self.booking.technician_phone = "+919876543210"
        self.booking.technician_rating = 4.9
        self.booking.technician_latitude = None
        self.booking.technician_longitude = None
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("status"), "accepted")
        self.assertIsNotNone(data.get("technician"))
        self.assertEqual(data["technician"]["name"], "Ramesh Electrician")
        self.assertEqual(data["technician"]["phone"], "+919876543210")
        self.assertIsNone(data["technician"]["latitude"])
        self.assertIsNone(data.get("technician_location"))

    def test_03_assigned_without_acceptance_hides_technician_from_customer(self):
        """3. assigned + no acceptance -> technician hidden, is_accepted=False, finding professional"""
        self.booking.status = "assigned"
        self.booking.technician_name = "Pending Partner"
        self.booking.technician_phone = "+919999988888"
        self.booking.technician_latitude = None
        self.booking.technician_longitude = None
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertFalse(data.get("is_accepted"))
        self.assertIsNone(data.get("technician"))
        self.assertIsNone(data.get("technician_location"))

    def test_04_assigned_with_accidental_gps_remains_hidden_to_customer(self):
        """4. assigned + GPS accidentally present -> technician and GPS must STILL remain hidden to customer"""
        self.booking.status = "assigned"
        self.booking.technician_name = "Pending Partner"
        self.booking.technician_phone = "+919999988888"
        self.booking.technician_latitude = 12.7450
        self.booking.technician_longitude = 77.8250
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertFalse(data.get("is_accepted"))
        self.assertIsNone(data.get("technician"))
        self.assertIsNone(data.get("technician_location"))

    def test_05_on_the_way_with_gps_shows_active_live_tracking(self):
        """5. on_the_way + GPS available -> live tracking"""
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Suresh Painter"
        self.booking.technician_phone = "+919876543211"
        self.booking.technician_latitude = 12.7480
        self.booking.technician_longitude = 77.8280
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("status"), "on_the_way")
        self.assertIsNotNone(data.get("technician"))
        self.assertIsNotNone(data.get("technician_location"))
        self.assertEqual(data["technician_location"]["latitude"], 12.7480)

    def test_06_on_the_way_without_gps_shows_technician_waiting_live_location(self):
        """6. on_the_way + GPS unavailable -> technician visible, waiting for live location"""
        self.booking.status = "on_the_way"
        self.booking.technician_name = "Suresh Painter"
        self.booking.technician_phone = "+919876543211"
        self.booking.technician_latitude = None
        self.booking.technician_longitude = None
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("status"), "on_the_way")
        self.assertIsNotNone(data.get("technician"))
        self.assertIsNone(data.get("technician_location"))

    def test_07_arrived_shows_technician_and_start_otp(self):
        """7. arrived -> technician visible + arrival state + start OTP available"""
        self.booking.status = "arrived"
        self.booking.technician_name = "Vikram Malhotra"
        self.booking.start_otp = "123456"
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertTrue(data.get("is_accepted"))
        self.assertEqual(data.get("status"), "arrived")
        self.assertEqual(data.get("start_otp"), "123456")

    def test_08_completed_stops_live_tracking_and_suppresses_coordinates(self):
        """8. completed -> tracking stopped, GPS coordinates suppressed"""
        self.booking.status = "completed"
        self.booking.technician_name = "Vikram Malhotra"
        self.booking.technician_latitude = 12.7500
        self.booking.technician_longitude = 77.8300
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertEqual(data.get("status"), "completed")
        self.assertIsNone(data.get("technician_location"))
        self.assertIsNone(data.get("start_otp"))

    def test_09_rejected_clears_technician_and_resets_state(self):
        """9. rejected -> technician details cleared, return to finding professional"""
        self.booking.status = "rejected"
        self.booking.technician_name = "Rejected Partner"
        self.booking.save()

        res = self.client.get(f"/api/tracking/{self.booking.tracking_token}/")
        self.assertEqual(res.status_code, 200)
        data = res.json().get("data", {})
        self.assertFalse(data.get("is_accepted"))
        self.assertIsNone(data.get("technician"))

    def test_10_cross_customer_access_forbidden(self):
        """10. Cross-customer access remains forbidden when accessed via customer-authenticated endpoint."""
        self.client.force_login(self.customer2)
        res = self.client.get(f"/api/booking/{self.booking.id}/live-location/")
        self.assertIn(res.status_code, [401, 403])
