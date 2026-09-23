from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch

User = get_user_model()


class CustomerLocationDetectTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="customer_loc_test",
            email="customer_loc@example.com",
            password="Password123!",
            role="customer",
            first_name="Customer",
            last_name="Loc"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_location_detect_validation_error(self):
        # Out-of-bounds coordinates
        res = self.client.post("/api/customer/location/detect/", {
            "latitude": 150.0,
            "longitude": 77.5946
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.data["success"])
        self.assertEqual(res.data["error"], "Invalid latitude or longitude coordinates.")

    @patch("accounts.customer_services.detect_customer_location")
    def test_location_detect_success_envelope(self, mock_detect):
        mock_detect.return_value = {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "accuracy": 10.0,
            "area": "HSR Layout",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "pincode": "560102",
            "formatted_address": "HSR Layout, Bengaluru, Karnataka"
        }
        res = self.client.post("/api/customer/location/detect/", {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "accuracy": 10.0
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["data"]["area"], "HSR Layout")
        self.assertEqual(res.data["data"]["city"], "Bengaluru")
        self.assertIsNone(res.data["error"])
