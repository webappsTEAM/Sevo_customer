from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import SavedAddress
from accounts import customer_services

User = get_user_model()


class SavedAddressTests(TestCase):
    def setUp(self):
        self.customer_a = User.objects.create_user(
            username="customer_a",
            email="cust_a@example.com",
            password="Password123!",
            role="customer",
            first_name="Alice",
            last_name="Customer",
            phone="9876543210"
        )
        self.customer_b = User.objects.create_user(
            username="customer_b",
            email="cust_b@example.com",
            password="Password123!",
            role="customer",
            first_name="Bob",
            last_name="Customer",
            phone="9876543211"
        )
        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.customer_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.customer_b)

    def test_create_saved_address_happy_path(self):
        payload = {
            "flat_house_no": "B-402, 4th Floor",
            "landmark": "Near signal",
            "locality": "Koramangala",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pincode": "560034",
            "label": "home",
            "receiver_name": "Alice Customer",
            "receiver_phone": "9876543210",
            "latitude": 12.9352,
            "longitude": 77.6245,
            "formatted_address": "Koramangala, Bengaluru, Karnataka"
        }
        res = self.client_a.post("/api/auth/customer/addresses/", payload, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data["success"])
        data = res.data["data"]
        self.assertEqual(data["flat_house_no"], "B-402, 4th Floor")
        self.assertEqual(data["city"], "Bengaluru")
        self.assertEqual(data["pincode"], "560034")
        self.assertTrue(data["is_default"])  # First address is auto default

    def test_default_address_reassignment(self):
        # Create address 1 (auto default)
        addr1 = customer_services.create_saved_address(self.customer_a, {
            "address_line1": "Addr 1",
            "flat_house_no": "Addr 1",
            "city": "City",
            "state": "State",
            "pincode": "560001",
            "is_default": True
        })
        self.assertTrue(addr1.is_default)

        # Create address 2 with is_default=True
        addr2 = customer_services.create_saved_address(self.customer_a, {
            "address_line1": "Addr 2",
            "flat_house_no": "Addr 2",
            "city": "City",
            "state": "State",
            "pincode": "560002",
            "is_default": True
        })
        addr1.refresh_from_db()
        self.assertFalse(addr1.is_default)
        self.assertTrue(addr2.is_default)

    def test_cross_tenant_isolation(self):
        # Customer A creates address
        addr_a = customer_services.create_saved_address(self.customer_a, {
            "address_line1": "Alice Home",
            "city": "City",
            "state": "State",
            "pincode": "560001"
        })

        # Customer B lists addresses
        res = self.client_b.get("/api/auth/customer/addresses/")
        self.assertEqual(res.status_code, 200)
        address_ids = [a["id"] for a in res.data["data"]]
        self.assertNotIn(addr_a.id, address_ids)

        # Customer B tries to view Customer A's address directly
        res_detail = self.client_b.get(f"/api/auth/customer/addresses/{addr_a.id}/")
        self.assertEqual(res_detail.status_code, 404)
