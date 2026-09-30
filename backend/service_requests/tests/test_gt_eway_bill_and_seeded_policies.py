"""
Round 8 gaps 1, 3, 4: e-way-bill record/warn fields, and the seeded default
GTCancellationPolicy / GTClaimPolicy rows (migration 0117).
"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import GTCancellationPolicy, GTClaimPolicy, ServiceRequest
from service_requests.services.eway_bill import eway_bill_warning

User = get_user_model()


def _user():
    n = uuid.uuid4().hex[:8]
    return User.objects.create_user(username=f"u_{n}", email=f"{n}@e.com", password="pw12345678",
                                    phone=f"90{uuid.uuid4().int % 100000000:08d}", role="customer")


class EwayBillWarningTests(TestCase):
    def _booking(self, declared_value=None, number="", doc=None):
        return ServiceRequest.objects.create(
            customer=_user(), customer_name="R", phone="9000000000", service_category="goods_transport_truck",
            issue_title="t", address="a", preferred_date=timezone.localdate(), preferred_time="08:00 AM - 09:00 AM",
            total_amount=Decimal("500"), declared_value=declared_value,
            eway_bill_number=number,
        )

    def test_no_declared_value_no_warning(self):
        self.assertIsNone(eway_bill_warning(self._booking()))

    def test_below_default_threshold_no_warning(self):
        self.assertIsNone(eway_bill_warning(self._booking(declared_value=Decimal("10000"))))

    def test_above_default_threshold_and_missing_number_warns(self):
        w = eway_bill_warning(self._booking(declared_value=Decimal("60000")))
        self.assertIsNotNone(w)
        self.assertIn("e-way-bill", w)

    def test_above_threshold_but_number_present_no_warning(self):
        self.assertIsNone(eway_bill_warning(self._booking(declared_value=Decimal("60000"), number="EWB123456")))


class SeededDefaultPolicyTests(TestCase):
    """Migration 0117 seeds these; confirm they exist and match the Porter-documented values."""

    def test_default_cancellation_policy_seeded(self):
        pol = GTCancellationPolicy.objects.get(service_category="")
        self.assertEqual(pol.fee_mode, "FLAT")
        self.assertEqual(pol.flat_fee_amount, Decimal("50.00"))
        self.assertTrue(pol.applies_only_after_assignment)
        self.assertEqual(pol.grace_period_seconds, 0)
        self.assertTrue(pol.is_active)

    def test_default_claim_policies_seeded_per_category(self):
        two_w = GTClaimPolicy.objects.get(service_category="goods_transport_two_wheeler")
        self.assertEqual(two_w.included_liability_cap, Decimal("1500.00"))
        truck = GTClaimPolicy.objects.get(service_category="goods_transport_truck")
        self.assertEqual(truck.included_liability_cap, Decimal("5000.00"))
        pm = GTClaimPolicy.objects.get(service_category="packers_movers")
        self.assertEqual(pm.included_liability_cap, Decimal("5000.00"))
        for pol in (two_w, truck, pm):
            self.assertTrue(pol.is_enabled)
            self.assertTrue(pol.cap_at_fare)
            self.assertEqual(pol.claim_window_hours, 24)
            self.assertTrue(pol.require_photo)
