"""Toll / parking pass-through: Admin policy gates it, webhook records it, reconciliation bills it."""
from decimal import Decimal

from django.test import TestCase

from service_requests.models import GTExtraChargePolicy
from service_requests.services.extra_charges import extra_charge_error, extra_charges_total
from service_requests.tests.test_gt_logistics_webhook_events import LogisticsWebhookEventTests as _W


class ExtraChargeWebhookTests(TestCase):
    setUp = _W.setUp
    _send = _W._send

    def _toll(self, amount="85", cid="t1", kind="TOLL"):
        return self._send("logistics.extra_charge", {"charge_type": kind, "amount": amount, "charge_id": cid, "receipt": "r.jpg"})

    def _policy(self, **kw):
        d = dict(is_enabled=True, service_category="")
        d.update(kw)
        return GTExtraChargePolicy.objects.create(**d)

    def test_nothing_recorded_without_enabled_policy(self):
        self.assertEqual(self._toll().status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.extra_charges, [])
        self._policy(is_enabled=False)
        self._toll(cid="t2")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.extra_charges, [])

    def test_recorded_idempotent_and_capped(self):
        self._policy(max_amount_per_item=Decimal("100"), max_total_per_booking=Decimal("150"))
        self._toll("85", "t1"); self._toll("85", "t1")          # retry
        self._toll("90", "t3")                                   # would exceed total cap
        self._toll("500", "t4", kind="PARKING")                  # over item cap
        self.sr.refresh_from_db()
        self.assertEqual(len(self.sr.extra_charges), 1)
        self.assertEqual(extra_charges_total(self.sr), Decimal("85.00"))

    def test_type_switches(self):
        self._policy(allow_parking=False)
        self._toll("50", "p1", kind="PARKING")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.extra_charges, [])
        self.assertIn("not accepted", extra_charge_error(GTExtraChargePolicy(allow_parking=False), "PARKING", "5"))

    def test_policy_requiring_photo_ignores_receipts_without_one(self):
        self._policy(require_receipt_photo=True)
        self._toll("40", "a1")
        self._send("logistics.extra_charge", {"charge_type": "TOLL", "amount": "40", "charge_id": "a2",
                                              "receipt_photo_url": "/media/logistics_receipts/1_r.png"})
        self.sr.refresh_from_db()
        self.assertEqual([e["charge_id"] for e in self.sr.extra_charges], ["a2"])
        self.assertEqual(self.sr.extra_charges[0]["receipt_photo_url"], "/media/logistics_receipts/1_r.png")


from decimal import Decimal as _D
from unittest.mock import patch as _patch

from django.test import override_settings
from django.utils import timezone

from service_requests.models import ServiceRequest
from service_requests.tests.test_gt_end_to_end import DROP, PICKUP, GoodsTransportEndToEndTests as _E, _route
from service_requests.tests.test_gt_insurance_and_discount_billing import InsuranceBillingTests as _I


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class ExtraChargeBillingTests(TestCase):
    setUp = _E.setUp
    _webhook = _E._webhook
    _book = _I._book

    def test_toll_added_to_final_fare_and_invoice(self):
        GTExtraChargePolicy.objects.create(is_enabled=True)
        b = self._book(payment_method="COD")
        self.assertIn(b.status_code, (200, 201), b.content)
        sr = ServiceRequest.objects.get(pk=b.data["data"]["id"])
        self.booking = sr
        base = sr.total_amount
        sr.status = ServiceRequest.Status.ACCEPTED
        sr.save(update_fields=["status"])
        self._webhook("logistics.extra_charge", {"charge_type": "TOLL", "amount": "85", "charge_id": "t1"})
        self._webhook("service_completed", {"actual_distance_km": None})
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, base + _D("85.00"))
        self.assertEqual(len(sr.extra_charges), 1)
