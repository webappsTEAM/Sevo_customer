"""
test_customer_address_isolation.py
Comprehensive Customer Location & SavedAddress Data Isolation Tests.

Tests:
1. Surya logs in, creates Address A (Surya Home, Surya Office).
2. Surya retrieves addresses -> gets ONLY Surya addresses.
3. Arya logs in, retrieves addresses -> gets empty list (never Surya's addresses).
4. Arya creates Address B (Arya Home).
5. Arya retrieves addresses -> gets ONLY Arya Address B.
6. Arya attempts to GET, PATCH, DELETE, or set default on Surya's address -> 404/403.
7. Surya logs back in -> retrieves only Surya's addresses (never Arya's).
8. Database-level isolation guarantees.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import SavedAddress

User = get_user_model()


class CustomerAddressIsolationTests(TestCase):
    def setUp(self):
        # Customer 1: Surya
        self.surya = User.objects.create_user(
            username="surya",
            email="surya@example.com",
            password="Password123!",
            role="customer",
            first_name="Surya",
            last_name="Kumar",
            phone="9876543210"
        )

        # Customer 2: Arya
        self.arya = User.objects.create_user(
            username="arya",
            email="arya@example.com",
            password="Password123!",
            role="customer",
            first_name="Arya",
            last_name="Stark",
            phone="9876543211"
        )

        self.surya_client = APIClient()
        self.surya_client.force_authenticate(user=self.surya)

        self.arya_client = APIClient()
        self.arya_client.force_authenticate(user=self.arya)

    def test_complete_two_customer_address_lifecycle_and_isolation(self):
        # 1. Surya creates Address A (Home)
        surya_home_payload = {
            "address_line1": "45, Bagalur Rd",
            "landmark": "Near Bus Stand",
            "locality": "Thillai Nagar",
            "city": "Hosur",
            "state": "Tamil Nadu",
            "pincode": "635109",
            "label": "home",
            "latitude": 12.740900,
            "longitude": 77.825300,
            "formatted_address": "45, Bagalur Rd, Thillai Nagar, Hosur, Tamil Nadu 635109",
            "location_source": "map_confirmed",
        }
        res = self.surya_client.post("/api/auth/customer/addresses/", surya_home_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        surya_home_id = res.data["data"]["id"]

        # Surya creates Address B (Office)
        surya_office_payload = {
            "address_line1": "12, SIPCOT Phase 1",
            "landmark": "Tech Park",
            "locality": "SIPCOT",
            "city": "Hosur",
            "state": "Tamil Nadu",
            "pincode": "635126",
            "label": "work",
            "latitude": 12.760000,
            "longitude": 77.840000,
            "formatted_address": "12, SIPCOT Phase 1, Hosur, Tamil Nadu 635126",
            "location_source": "map_confirmed",
        }
        res = self.surya_client.post("/api/auth/customer/addresses/", surya_office_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        surya_office_id = res.data["data"]["id"]

        # 2. Surya queries addresses -> Receives exactly 2 addresses (Surya's only)
        res = self.surya_client.get("/api/auth/customer/addresses/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        surya_addrs = res.data["data"]
        self.assertEqual(len(surya_addrs), 2)
        surya_ids = {a["id"] for a in surya_addrs}
        self.assertEqual(surya_ids, {surya_home_id, surya_office_id})

        # 3. Arya logs in and queries addresses -> Receives EMPTY list (Zero leak)
        res = self.arya_client.get("/api/auth/customer/addresses/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        arya_addrs = res.data["data"]
        self.assertEqual(len(arya_addrs), 0)

        # 4. Arya creates Arya Address (Home)
        arya_home_payload = {
            "address_line1": "100, Palace Road",
            "landmark": "Near Fort",
            "locality": "Central",
            "city": "Hosur",
            "state": "Tamil Nadu",
            "pincode": "635109",
            "label": "home",
            "latitude": 12.730000,
            "longitude": 77.810000,
            "formatted_address": "100, Palace Road, Hosur, Tamil Nadu 635109",
            "location_source": "map_confirmed",
        }
        res = self.arya_client.post("/api/auth/customer/addresses/", arya_home_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        arya_home_id = res.data["data"]["id"]

        # 5. Arya queries addresses -> Receives ONLY Arya's address
        res = self.arya_client.get("/api/auth/customer/addresses/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        arya_addrs = res.data["data"]
        self.assertEqual(len(arya_addrs), 1)
        self.assertEqual(arya_addrs[0]["id"], arya_home_id)
        self.assertEqual(arya_addrs[0]["address_line1"], "100, Palace Road")

        # 6. Arya tries to access Surya's address directly -> BLOCKED (404/403)
        res = self.arya_client.get(f"/api/auth/customer/addresses/{surya_home_id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = self.arya_client.patch(f"/api/auth/customer/addresses/{surya_home_id}/", {"address_line1": "Hacked Address"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = self.arya_client.delete(f"/api/auth/customer/addresses/{surya_home_id}/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        res = self.arya_client.post(f"/api/auth/customer/addresses/{surya_home_id}/set-default/")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

        # 7. Surya queries addresses again -> Still exactly 2 addresses, unaffected by Arya
        res = self.surya_client.get("/api/auth/customer/addresses/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        surya_addrs_after = res.data["data"]
        self.assertEqual(len(surya_addrs_after), 2)
        surya_ids_after = {a["id"] for a in surya_addrs_after}
        self.assertEqual(surya_ids_after, {surya_home_id, surya_office_id})
        self.assertNotIn(arya_home_id, surya_ids_after)

    def test_database_level_foreign_key_isolation(self):
        """Verify at DB level that SavedAddress records are strictly isolated by user FK."""
        SavedAddress.objects.create(
            user=self.surya,
            label="home",
            address_line1="Surya DB House",
            city="Hosur",
            state="Tamil Nadu",
            pincode="635109"
        )
        SavedAddress.objects.create(
            user=self.arya,
            label="home",
            address_line1="Arya DB House",
            city="Hosur",
            state="Tamil Nadu",
            pincode="635109"
        )

        surya_qs = SavedAddress.objects.filter(user=self.surya)
        arya_qs = SavedAddress.objects.filter(user=self.arya)

        self.assertEqual(surya_qs.count(), 1)
        self.assertEqual(surya_qs.first().address_line1, "Surya DB House")

        self.assertEqual(arya_qs.count(), 1)
        self.assertEqual(arya_qs.first().address_line1, "Arya DB House")
