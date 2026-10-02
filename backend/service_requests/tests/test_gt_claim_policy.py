"""Damage/loss claims: included liability (Admin policy), claim window, photo rule, aggregate cap."""
import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

import service_requests.services as svc
from service_requests.models import GTClaimPolicy, InsuranceClaim, ServiceRequest
from service_requests.services.claims_policy import claim_cap


class ClaimPolicyTests(TestCase):
    def setUp(self):
        # Round 8: a platform-wide default GTClaimPolicy is now seeded by migration
        # 0117 (Porter-documented caps). These tests exercise the mechanism itself
        # with hand-picked cap/window values, so they clear the seeded defaults first
        # -- the seeded defaults themselves are covered by test_gt_claim_policy_defaults.py.
        GTClaimPolicy.objects.all().delete()
        U = get_user_model()
        self.u = U.objects.create_user(username=f"c_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com",
                                       password="pw12345678", phone=f"97{uuid.uuid4().int % 100000000:08d}", role="customer")
        self.admin = U.objects.create_user(username=f"a_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com",
                                           password="pw12345678", phone=f"98{uuid.uuid4().int % 100000000:08d}", role="admin")

    def _booking(self, insured=False, fare="900", delivered_hours_ago=2, cat="goods_transport_truck"):
        sr = ServiceRequest.objects.create(
            customer=self.u, customer_name="R", phone=self.u.phone, email=self.u.email, service_category=cat,
            issue_title="t", address="a", preferred_date=timezone.localdate(), preferred_time="08:00 AM - 09:00 AM",
            total_amount=Decimal(fare), status="completed", insurance_opted_in=insured,
            insurance_liability_cap=Decimal("10000") if insured else None)
        sr.logistics_leg = "DELIVERED"
        sr.logistics_leg_updated_at = timezone.now() - timedelta(hours=delivered_hours_ago)
        sr.save(update_fields=["logistics_leg", "logistics_leg_updated_at"])
        return sr

    def _photo(self):
        return SimpleUploadedFile("d.jpg", b"x", content_type="image/jpeg")

    def test_without_policy_only_insured_can_claim_as_before(self):
        with self.assertRaises(ValidationError):
            svc.file_insurance_claim(self._booking(), self.u, "broken", "500")
        self.assertIsNotNone(svc.file_insurance_claim(self._booking(insured=True), self.u, "broken", "500").pk)

    def test_included_liability_is_lower_of_fare_and_cap(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("5000"))
        self.assertEqual(claim_cap(self._booking(fare="900")), Decimal("900.00"))
        self.assertEqual(claim_cap(self._booking(fare="8000")), Decimal("5000.00"))
        GTClaimPolicy.objects.all().update(cap_at_fare=False)
        self.assertEqual(claim_cap(self._booking(fare="900")), Decimal("5000.00"))

    def test_uninsured_claim_and_payout_clamped_to_included_cap(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"))
        b = self._booking(fare="9000")
        c = svc.file_insurance_claim(b, self.u, "broken", "4000")
        c = svc.resolve_insurance_claim(self.admin, c.pk, "APPROVED", "4000")
        self.assertEqual(c.approved_amount, Decimal("1500.00"))

    def test_window_closes(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"), claim_window_hours=24)
        with self.assertRaises(ValidationError) as cm:
            svc.file_insurance_claim(self._booking(delivered_hours_ago=30), self.u, "broken", "100")
        self.assertIn("window", str(cm.exception))
        self.assertIsNotNone(svc.file_insurance_claim(self._booking(delivered_hours_ago=5), self.u, "broken", "100").pk)

    def test_photo_required_when_policy_says_so(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"), require_photo=True)
        b = self._booking()
        with self.assertRaises(ValidationError):
            svc.file_insurance_claim(b, self.u, "broken", "100")
        self.assertIsNotNone(svc.file_insurance_claim(b, self.u, "broken", "100", attachment_files=[self._photo()]).pk)

    def test_several_claims_cannot_exceed_the_cap_together(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1000"))
        b = self._booking(fare="9000")
        c1 = svc.file_insurance_claim(b, self.u, "a", "700"); c2 = svc.file_insurance_claim(b, self.u, "b", "700")
        self.assertEqual(svc.resolve_insurance_claim(self.admin, c1.pk, "APPROVED", "700").approved_amount, Decimal("700.00"))
        self.assertEqual(svc.resolve_insurance_claim(self.admin, c2.pk, "APPROVED", "700").approved_amount, Decimal("300.00"))
        c3 = svc.file_insurance_claim(b, self.u, "c", "50")
        with self.assertRaises(ValidationError):
            svc.resolve_insurance_claim(self.admin, c3.pk, "APPROVED", "50")

    def test_eligible_bookings_list(self):
        b = self._booking()
        self.assertEqual(svc.claimable_bookings(self.u), [])
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"), claim_window_hours=24)
        rows = svc.claimable_bookings(self.u)
        self.assertEqual([r["id"] for r in rows], [b.id]); self.assertEqual(rows[0]["max_payout"], "900.00")
        self._booking(delivered_hours_ago=48)
        self.assertEqual(len(svc.claimable_bookings(self.u)), 1)     # expired one excluded


class ClaimNotificationTests(ClaimPolicyTests):
    def test_customer_is_told_at_each_stage_once(self):
        from unittest.mock import patch
        b = self._booking(insured=True)
        with patch("service_requests.notifications.send_sms_notification") as sms, self.captureOnCommitCallbacks(execute=True):
            claim = svc.file_insurance_claim(b, self.u, "broken", "100")
        self.assertEqual(sms.call_count, 1)
        self.assertEqual(sms.call_args.kwargs["event_key"], f"claim:{claim.pk}:OPEN")
        with patch("service_requests.notifications.send_sms_notification") as sms, self.captureOnCommitCallbacks(execute=True):
            svc.resolve_insurance_claim(self.admin, claim.pk, "APPROVED", "80")
        self.assertEqual(sms.call_args.kwargs["event_key"], f"claim:{claim.pk}:APPROVED")
        self.assertIn("80", sms.call_args.kwargs["message"])
