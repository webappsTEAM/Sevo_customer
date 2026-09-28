"""
Admin API for the GT cancellation / waiting / advance-payment policies, and proof that what an admin
saves there is what the cancellation preview and the fare reconciliation actually read.
"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from service_requests.models import (
    CatalogChangeLog, GTAdvancePaymentPolicy, GTCancellationPolicy, GTWaitingChargePolicy,
    get_gt_cancellation_fee, get_gt_waiting_charge, ServiceRequest,
)

User = get_user_model()
BASE = "/api/logistics/admin/policies/"


def _user(role):
    n = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"pol_{role}_{n}", email=f"pol_{role}_{n}@example.com",
        phone=f"9{uuid.uuid4().int % 10**9:09d}", role=role,
    )


class AdminGTPolicyApiTests(APITestCase):
    def setUp(self):
        self.client.force_authenticate(user=_user("admin"))

    def test_overview_lists_every_kind_and_the_categories(self):
        r = self.client.get(BASE)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(k for k in r.data["data"] if k != "categories"), ["advance", "cancellation", "waiting"])
        self.assertIn("packers_movers", r.data["data"]["categories"])

    def test_anonymous_and_customers_are_refused(self):
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.get(BASE).status_code, (401, 403))
        self.client.force_authenticate(user=_user("customer"))
        self.assertEqual(self.client.get(BASE).status_code, 403)
        self.assertEqual(self.client.post(BASE + "waiting/", {"is_enabled": False}, format="json").status_code, 403)

    def test_cancellation_policy_created_here_changes_the_fee_the_customer_is_charged(self):
        r = self.client.post(BASE + "cancellation/", {
            "service_category": "goods_transport_truck", "fee_mode": "FLAT", "flat_fee_amount": "75",
            "applies_only_after_assignment": False,
        }, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        sr = ServiceRequest.objects.create(
            request_id="POLTEST1", customer_name="C", phone="9000000001", service_category="goods_transport_truck",
            issue_title="x", address="a", preferred_date="2026-09-28", total_amount=Decimal("500"),
        )
        self.assertEqual(get_gt_cancellation_fee(sr), Decimal("75.00"))
        # ...and a different category still falls back to "no policy".
        other = ServiceRequest.objects.create(
            request_id="POLTEST2", customer_name="C", phone="9000000002", service_category="packers_movers",
            issue_title="x", address="a", preferred_date="2026-09-28", total_amount=Decimal("500"),
        )
        self.assertEqual(get_gt_cancellation_fee(other), Decimal("0"))
        self.assertTrue(CatalogChangeLog.objects.filter(entity_type="GTPolicy", field_name="cancellation.created").exists())

    def test_waiting_policy_edit_and_deactivate_round_trip(self):
        r = self.client.post(BASE + "waiting/", {
            "is_enabled": True, "free_minutes_per_stop": 15, "rate_per_minute": "2.50", "max_charge_per_booking": "200",
        }, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        pk = r.data["data"]["id"]
        self.assertEqual(r.data["data"]["service_category"], "")          # platform-wide
        r = self.client.patch(f"{BASE}waiting/{pk}/", {"rate_per_minute": "3", "max_charge_per_booking": ""}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        row = GTWaitingChargePolicy.objects.get(pk=pk)
        self.assertEqual((row.rate_per_minute, row.max_charge_per_booking), (Decimal("3.00"), None))
        r = self.client.delete(f"{BASE}waiting/{pk}/")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(GTWaitingChargePolicy.objects.get(pk=pk).is_active)     # kept, not deleted
        sr = ServiceRequest.objects.create(
            request_id="POLTEST3", customer_name="C", phone="9000000003", service_category="goods_transport_truck",
            issue_title="x", address="a", preferred_date="2026-09-28",
        )
        self.assertEqual(get_gt_waiting_charge(sr), Decimal("0"))

    def test_advance_policy_validation(self):
        bad = self.client.post(BASE + "advance/", {"is_enabled": True, "advance_percent": "0"}, format="json")
        self.assertEqual((bad.status_code, bad.data["error_code"]), (400, "VALIDATION_ERROR"))
        bad = self.client.post(BASE + "advance/", {"advance_percent": "150"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post(BASE + "advance/", {"service_category": "packers_movers", "is_enabled": True,
                                                  "advance_percent": "25"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.data)
        self.assertEqual(GTAdvancePaymentPolicy.objects.get().advance_due_for(Decimal("1000")), Decimal("250.00"))

    def test_input_is_validated(self):
        for kind, body in (
            ("cancellation", {"fee_mode": "FLAT", "flat_fee_amount": "0"}),                  # FLAT needs an amount
            ("cancellation", {"fee_mode": "PERCENT", "percent_fee": "101"}),
            ("cancellation", {"fee_mode": "SOMETHING"}),
            ("cancellation", {"service_category": "ac_repair"}),                             # not a GT category
            ("waiting", {"is_enabled": True, "rate_per_minute": "0"}),
            ("waiting", {"rate_per_minute": "-1"}),
            ("waiting", {"free_minutes_per_stop": "abc"}),
            ("waiting", {"rate_per_minute": "NaN"}),
        ):
            r = self.client.post(BASE + kind + "/", body, format="json")
            self.assertEqual(r.status_code, 400, (kind, body, r.data))
        self.assertEqual(self.client.post(BASE + "nonsense/", {}, format="json").status_code, 404)
        self.assertFalse(GTCancellationPolicy.objects.exists())

    def test_only_one_active_policy_per_category(self):
        body = {"service_category": "packers_movers", "is_enabled": False}
        self.assertEqual(self.client.post(BASE + "waiting/", body, format="json").status_code, 200)
        r = self.client.post(BASE + "waiting/", body, format="json")
        self.assertEqual((r.status_code, r.data["error_code"]), (409, "POLICY_EXISTS"))
        # ...but an inactive duplicate is fine, and cannot be re-activated over the live one.
        first = GTWaitingChargePolicy.objects.get()
        first.is_active = False
        first.save()
        second = self.client.post(BASE + "waiting/", body, format="json")
        self.assertEqual(second.status_code, 200)
        r = self.client.patch(f"{BASE}waiting/{first.pk}/", {"is_active": True}, format="json")
        self.assertEqual(r.status_code, 409)
