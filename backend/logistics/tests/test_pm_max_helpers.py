"""
Packers & Movers helper-count limit (PackersMoversConfig.max_helpers).

- model default / cap validation
- admin PATCH /api/logistics/admin/packers-movers-config/ (edit permission,
  not modify_price; 0..20 whole numbers; audited)
- public GET /api/logistics/packers-movers/inventory/ exposes the limit
- resolve_helpers_requested() clamps the customer's cart_data value, and
  the Workforce dispatch payload carries it as `helpers_requested`
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase

from logistics.models import MAX_HELPERS_CAP, PackersMoversConfig, resolve_helpers_requested
from service_requests.models import CatalogChangeLog

User = get_user_model()

URL = "/api/logistics/admin/packers-movers-config/"
INVENTORY_URL = "/api/logistics/packers-movers/inventory/"


def _user(role, n):
    return User.objects.create_user(
        username=f"pmh_{role}_{n}", email=f"pmh_{role}_{n}@example.com",
        phone=f"91100000{n:02d}", role=role,
    )


class PackersMoversMaxHelpersTests(APITestCase):
    def setUp(self):
        self.config = PackersMoversConfig.objects.create(city="Hosur", gst_rate=Decimal("0.1800"))

    def _patch(self, role, body, n):
        self.client.force_authenticate(user=_user(role, n))
        return self.client.patch(URL, body, format="json")

    def test_default_is_two_and_cap_is_enforced_by_model(self):
        self.assertEqual(self.config.max_helpers, 2)
        self.config.max_helpers = MAX_HELPERS_CAP + 1
        with self.assertRaises(ValidationError):
            self.config.full_clean()

    def test_admin_patch_updates_and_audits(self):
        r = self._patch("admin", {"max_helpers": 5, "reason": "bigger crews"}, 1)
        self.assertEqual(r.status_code, 200, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.max_helpers, 5)
        self.assertIn("max_helpers", r.data.get("changed", []))
        self.assertTrue(CatalogChangeLog.objects.filter(
            entity_type="PackersMoversConfig", field_name="max_helpers", new_value="5").exists())
        # Serializer round-trips the field.
        self.assertEqual(r.data["data"]["max_helpers"], 5)

    def test_manager_can_edit_non_money_field(self):
        r = self._patch("manager", {"max_helpers": 3}, 2)
        self.assertEqual(r.status_code, 200, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.max_helpers, 3)

    def test_invalid_values_rejected_and_db_unchanged(self):
        for n, bad in enumerate((-1, MAX_HELPERS_CAP + 1, "abc", 2.5, None, True), start=10):
            r = self._patch("admin", {"max_helpers": bad}, n)
            self.assertEqual(r.status_code, 400, (bad, r.data))
        self.config.refresh_from_db()
        self.assertEqual(self.config.max_helpers, 2)

    def test_zero_and_cap_allowed(self):
        self.assertEqual(self._patch("admin", {"max_helpers": 0}, 30).status_code, 200)
        self.assertEqual(self._patch("admin", {"max_helpers": MAX_HELPERS_CAP}, 31).status_code, 200)
        self.config.refresh_from_db()
        self.assertEqual(self.config.max_helpers, MAX_HELPERS_CAP)

    def test_inventory_endpoint_exposes_limit(self):
        self.config.max_helpers = 4
        self.config.save()
        r = self.client.get(INVENTORY_URL)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        data = body.get("data", body)
        self.assertEqual(data["max_helpers"], 4)

    def test_resolve_helpers_requested_clamps(self):
        self.config.max_helpers = 3
        self.config.save()
        self.assertIsNone(resolve_helpers_requested([{"package": "x"}]))
        self.assertIsNone(resolve_helpers_requested(None))
        self.assertEqual(resolve_helpers_requested([{"helpers_requested": 2}]), 2)
        self.assertEqual(resolve_helpers_requested([{"helpers_requested": 99}]), 3)
        self.assertEqual(resolve_helpers_requested([{"helpers_requested": -4}]), 0)
        self.assertIsNone(resolve_helpers_requested([{"helpers_requested": "lots"}]))

    def test_dispatch_payload_carries_helpers_requested(self):
        from workforce_integration.services import WorkforceIntegrationService
        sr = MagicMock()
        sr.request_id = "PM0001"
        sr.service_category = "packers_movers"
        sr.cart_data = [{"helpers_requested": 7, "city": "Hosur"}]
        sr.logistics_tier = None
        sr.latitude = sr.longitude = None
        sr.drop_latitude = sr.drop_longitude = None
        sr.total_amount = 1000
        sr.tracking_token = None
        sr.preferred_date = "2026-10-01"
        captured = {}

        def fake_post(url, json=None, headers=None, timeout=None):
            captured["payload"] = json
            resp = MagicMock(status_code=500, text="stop")
            return resp

        with patch("workforce_integration.services.requests.post", side_effect=fake_post) as mock_post:
            mock_post.mock_calls  # mark as mocked for the TESTING guard
            WorkforceIntegrationService.dispatch_job(sr)
        self.assertEqual(captured["payload"]["helpers_requested"], 2)  # clamped to default max 2
        self.assertEqual(captured["payload"]["cart_data"][0]["helpers_requested"], 7)
