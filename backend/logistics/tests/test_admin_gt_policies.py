"""
Admin API for the GT cancellation / waiting / advance-payment policies, and proof that what an admin
saves there is what the cancellation preview and the fare reconciliation actually read.
"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from service_requests.models import (
    CatalogChangeLog, GTAdvancePaymentPolicy, GTCancellationPolicy, GTClaimPolicy, GTWaitingChargePolicy,
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
        # Round 9 seeded Porter-documented default cancellation/claim policy rows
        # (migration 0117) so every GT booking has a real, non-blank policy out of the
        # box. These tests exercise the admin API against a clean slate, so clear the
        # seeded defaults here -- this only affects this TestCase's own transaction.
        GTCancellationPolicy.objects.all().delete()
        GTClaimPolicy.objects.all().delete()
        self.client.force_authenticate(user=_user("admin"))

    def test_overview_lists_every_kind_and_the_categories(self):
        r = self.client.get(BASE)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(sorted(k for k in r.data["data"] if k != "categories"), ["advance", "cancellation", "claim", "extra_charge", "insurance", "operations", "ptl", "tax", "waiting"])
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


class AdminGTNewPolicyKindsTests(APITestCase):
    """Toll/parking, claims, insurance and operations settings are editable from the Admin API and drive runtime."""
    def setUp(self):
        # See AdminGTPolicyApiTests.setUp -- clear Round 9's seeded defaults so this
        # class's own policy-creation assertions run against a clean slate.
        GTCancellationPolicy.objects.all().delete()
        GTClaimPolicy.objects.all().delete()
        self.client.force_authenticate(user=_user("admin"))

    def test_extra_charge_policy_round_trip_and_validation(self):
        r = self.client.post(BASE + "extra_charge/", {"is_enabled": True, "max_amount_per_item": "150",
                                                      "max_total_per_booking": "100"}, format="json")
        self.assertEqual(r.status_code, 400, r.data)                       # item cap above the total cap
        r = self.client.post(BASE + "extra_charge/", {"is_enabled": True, "max_amount_per_item": "100",
                                                      "max_total_per_booking": "250", "require_receipt_photo": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        from service_requests.models import get_gt_extra_charge_policy
        pol = get_gt_extra_charge_policy("goods_transport_truck")
        self.assertEqual((pol.max_amount_per_item, pol.require_receipt_photo), (Decimal("100.00"), True))
        self.assertEqual(self.client.post(BASE + "extra_charge/", {"is_enabled": True}, format="json").status_code, 409)

    def test_claim_policy_drives_claim_cap_and_public_terms(self):
        r = self.client.post(BASE + "claim/", {"service_category": "goods_transport_truck", "is_enabled": True,
                                               "included_liability_cap": "5000", "claim_window_hours": 24,
                                               "require_photo": True}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.client.post(BASE + "claim/", {"claim_window_hours": 0, "is_enabled": True}, format="json").status_code, 400)
        pub = APIClient().get("/api/logistics/policies/?service_category=goods_transport_truck").data["data"]
        self.assertEqual(pub["claims"]["claim_window_hours"], 24)
        self.assertTrue(any("24 hours" in t for t in pub["terms"]))
        self.assertIsNone(APIClient().get("/api/logistics/policies/?service_category=packers_movers").data["data"]["claims"])

    def test_insurance_and_operations_are_platform_wide_and_change_runtime(self):
        from service_requests.services.gt_operations import ops
        from service_requests.services.insurance import insurance_terms
        self.assertEqual(ops("gt_quote_validity_minutes"), 15)              # historical default with no row
        r = self.client.post(BASE + "operations/", {
            "gt_quote_validity_minutes": 5, "pm_instant_quote_validity_minutes": 10, "pm_estimate_validity_hours": 24,
            "online_payment_window_minutes": 45, "high_value_consignment_threshold": "10000",
            "checkpoint_radius_meters": 120, "delivery_otp_ttl_minutes": 10, "max_otp_attempts": 3,
            "delivery_otp_required": False}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual((ops("gt_quote_validity_minutes"), ops("online_payment_window_minutes")), (5, 45))
        self.assertEqual((ops("checkpoint_radius_meters"), ops("delivery_otp_ttl_minutes"), ops("max_otp_attempts")), (120, 10, 3))
        self.assertIs(ops("delivery_otp_required"), False)
        from service_requests.services.payment_expiry import payment_window_minutes
        self.assertEqual(payment_window_minutes(), 45)
        self.assertEqual(self.client.post(BASE + "operations/", {"gt_quote_validity_minutes": 0}, format="json").status_code, 400)
        r = self.client.post(BASE + "insurance/", {"premium_percent": "1.5", "max_liability": "20000"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(insurance_terms("10000"), (Decimal("150.00"), Decimal("10000.00")))
        self.assertEqual(self.client.post(BASE + "insurance/", {"premium_percent": "0", "max_liability": "1"}, format="json").status_code, 400)

    def test_customer_cannot_edit_new_kinds(self):
        self.client.force_authenticate(user=_user("customer"))
        for kind in ("extra_charge", "claim", "insurance", "operations"):
            self.assertEqual(self.client.post(BASE + kind + "/", {}, format="json").status_code, 403)
