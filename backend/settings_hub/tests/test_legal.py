from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status


class PublicLegalConfigTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_public_legal_config_accessible_without_auth(self):
        response = self.client.get("/api/settings/legal/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertTrue(data.get("success"))
        legal_data = data.get("data", {})
        self.assertEqual(legal_data.get("company_legal_name"), "CALDIM ENGINEERING PRIVATE LIMITED")
        self.assertEqual(legal_data.get("cin"), "U72900KA2026PTC123456")
        self.assertEqual(legal_data.get("gstin"), "33AAGCC4916J1ZP")
        self.assertEqual(legal_data.get("support_email"), "support@caldimengg.com")
        self.assertIn("Valasaravakkam", legal_data.get("registered_address"))
        self.assertEqual(legal_data.get("effective_date"), "August 20, 2026")
        self.assertIn("terms", legal_data.get("versions", {}))
        self.assertIn("privacy", legal_data.get("versions", {}))
