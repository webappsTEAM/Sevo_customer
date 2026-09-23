"""
test_booking_address_isolation.py
Automated Customer Booking Address Isolation & Snapshot Validation Tests.

Tests:
1. Surya books using Surya's Saved Address -> Success 201 Created + Snapshot stored accurately.
2. Arya attempts to book using Surya's Saved Address ID -> Blocked with 403 Forbidden.
3. Arya books using Arya's Saved Address -> Success 201 Created + Arya's Snapshot stored.
4. Future edits to Surya's Saved Address do not modify existing booking snapshot (historical integrity).
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from companies.models import Company
from accounts.models import SavedAddress
from service_requests.models import ServiceRequest

User = get_user_model()


class BookingAddressIsolationTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices HQ")

        # Customer A: Surya
        self.surya = User.objects.create_user(
            username="surya",
            email="surya@example.com",
            password="Password123!",
            role="customer",
            first_name="Surya",
            last_name="Kumar",
            phone="9876543210"
        )

        # Customer B: Arya
        self.arya = User.objects.create_user(
            username="arya",
            email="arya@example.com",
            password="Password123!",
            role="customer",
            first_name="Arya",
            last_name="Stark",
            phone="9876543211"
        )

        # Surya's Address
        self.surya_addr = SavedAddress.objects.create(
            user=self.surya,
            label="home",
            address_line1="45, Bagalur Rd",
            landmark="Near Bus Stand",
            locality="Thillai Nagar",
            city="Hosur",
            state="Tamil Nadu",
            pincode="635109",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            formatted_address="45, Bagalur Rd, Thillai Nagar, Hosur, Tamil Nadu 635109",
            location_source="map_confirmed",
        )

        # Arya's Address
        self.arya_addr = SavedAddress.objects.create(
            user=self.arya,
            label="home",
            address_line1="100, Palace Road",
            landmark="Near Fort",
            locality="Central",
            city="Hosur",
            state="Tamil Nadu",
            pincode="635109",
            latitude=Decimal("12.730000"),
            longitude=Decimal("77.810000"),
            formatted_address="100, Palace Road, Hosur, Tamil Nadu 635109",
            location_source="map_confirmed",
        )

        self.surya_client = APIClient()
        self.surya_client.force_authenticate(user=self.surya)

        self.arya_client = APIClient()
        self.arya_client.force_authenticate(user=self.arya)

    def test_surya_books_with_own_address(self):
        self.skipTest(
            "Covers the server-side saved-address feature that was removed from this backend: ServiceRequest.saved_address_id and service_location_snapshot were dropped from the model, and views._resolve_customer_location() -- which turned a saved_address_id into booking coordinates and enforced cross-customer isolation on it -- no longer exists. The serializer now ignores saved_address_id entirely, and the booking pages resolve and send real coordinates themselves. Skipped visibly rather than deleted: whether to restore server-side saved-address resolution is a product decision, and test_arya_blocked_from_using_surya_address_id in particular encodes a tenant-isolation requirement worth keeping on record."
        )
        resp = self.surya_client.post("/api/booking/", {
            "service_category": "home_cleaning",
            "issue_title": "Deep Cleaning",
            "address": "45, Bagalur Rd, Thillai Nagar, Hosur, Tamil Nadu 635109",
            "preferred_date": str(timezone.now().date()),
            "preferred_time": "10:00 AM",
            "customer_name": "Surya Kumar",
            "phone": "9876543210",
            "saved_address_id": self.surya_addr.id,
            "payment_method": "COD",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        booking = ServiceRequest.objects.get(id=resp.json()["data"]["id"])
        self.assertEqual(booking.customer, self.surya)
        self.assertEqual(booking.saved_address_id, self.surya_addr.id)
        self.assertAlmostEqual(float(booking.latitude), 12.740900, places=4)
        self.assertAlmostEqual(float(booking.longitude), 77.825300, places=4)
        self.assertIn("45, Bagalur Rd", booking.address)

        # Verify location snapshot
        snapshot = booking.service_location_snapshot or {}
        self.assertEqual(snapshot.get("saved_address_id"), self.surya_addr.id)
        self.assertEqual(snapshot.get("street_address"), "45, Bagalur Rd")

    def test_arya_blocked_from_using_surya_address_id(self):
        self.skipTest(
            "Covers the server-side saved-address feature that was removed from this backend: ServiceRequest.saved_address_id and service_location_snapshot were dropped from the model, and views._resolve_customer_location() -- which turned a saved_address_id into booking coordinates and enforced cross-customer isolation on it -- no longer exists. The serializer now ignores saved_address_id entirely, and the booking pages resolve and send real coordinates themselves. Skipped visibly rather than deleted: whether to restore server-side saved-address resolution is a product decision, and test_arya_blocked_from_using_surya_address_id in particular encodes a tenant-isolation requirement worth keeping on record."
        )
        """Arya sending Surya's saved_address_id is rejected with HTTP 403 Forbidden."""
        resp = self.arya_client.post("/api/booking/", {
            "service_category": "home_cleaning",
            "issue_title": "Deep Cleaning",
            "address": "100, Palace Road, Hosur, Tamil Nadu 635109",
            "preferred_date": str(timezone.now().date()),
            "preferred_time": "10:00 AM",
            "customer_name": "Arya Stark",
            "phone": "9876543211",
            "saved_address_id": self.surya_addr.id,  # Surya's address!
            "payment_method": "COD",
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("permission", resp.json().get("message", "").lower())

    def test_arya_books_with_own_address(self):
        self.skipTest(
            "Covers the server-side saved-address feature that was removed from this backend: ServiceRequest.saved_address_id and service_location_snapshot were dropped from the model, and views._resolve_customer_location() -- which turned a saved_address_id into booking coordinates and enforced cross-customer isolation on it -- no longer exists. The serializer now ignores saved_address_id entirely, and the booking pages resolve and send real coordinates themselves. Skipped visibly rather than deleted: whether to restore server-side saved-address resolution is a product decision, and test_arya_blocked_from_using_surya_address_id in particular encodes a tenant-isolation requirement worth keeping on record."
        )
        resp = self.arya_client.post("/api/booking/", {
            "service_category": "home_cleaning",
            "issue_title": "Deep Cleaning",
            "address": "100, Palace Road, Hosur, Tamil Nadu 635109",
            "preferred_date": str(timezone.now().date()),
            "preferred_time": "10:00 AM",
            "customer_name": "Arya Stark",
            "phone": "9876543211",
            "saved_address_id": self.arya_addr.id,
            "payment_method": "COD",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        booking = ServiceRequest.objects.get(id=resp.json()["data"]["id"])
        self.assertEqual(booking.customer, self.arya)
        self.assertEqual(booking.saved_address_id, self.arya_addr.id)
        self.assertAlmostEqual(float(booking.latitude), 12.730000, places=4)
        self.assertAlmostEqual(float(booking.longitude), 77.810000, places=4)
        self.assertIn("100, Palace Road", booking.address)
