"""Forensic QA boundary probes: exact-limit / just-over-limit for the PTL cumulative
weight cap and the claim-filing window (both Admin-configured, never hardcoded)."""
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework.exceptions import ValidationError

import service_requests.services as svc
from service_requests.models import GTClaimPolicy
from service_requests.services.ptl_pricing import PTLError
from service_requests.tests.test_gt_claim_policy import ClaimPolicyTests as _ClaimBase
from service_requests.tests.test_gt_ptl import _policy, _quote, _tier
from django.test import TestCase


class PTLCumulativeCapBoundaryTests(TestCase):
    def test_exact_cap_accepted_just_over_rejected_nonpositive_rejected(self):
        _policy(ptl_cumulative_weight_cap_kg=Decimal("3000.00"))
        t = _tier(max_kg="5000")
        self.assertEqual(_quote(t, weight="2999.99")["declared_weight_kg"], Decimal("2999.99"))
        self.assertEqual(_quote(t, weight="3000")["declared_weight_kg"], Decimal("3000.00"))
        with self.assertRaises(PTLError) as ctx:
            _quote(t, weight="3000.01")
        self.assertEqual(ctx.exception.code, "PTL_WEIGHT_OVER_CUMULATIVE_CAP")
        for bad in ("0", "-1", "NaN", "Infinity", "abc", ""):
            with self.subTest(weight=bad), self.assertRaises(PTLError):
                _quote(t, weight=bad)


class ClaimWindowBoundaryTests(_ClaimBase):
    # Reuse the parent's fixtures without re-running the parent's tests.
    def test_window_edge_24h(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"), claim_window_hours=24)
        ok = svc.file_insurance_claim(self._booking(delivered_hours_ago=23.99), self.u, "broken", "100")
        self.assertIsNotNone(ok.pk)
        with self.assertRaises(ValidationError):
            svc.file_insurance_claim(self._booking(delivered_hours_ago=24.01), self.u, "broken", "100")

    def test_claim_amount_edges(self):
        GTClaimPolicy.objects.create(is_enabled=True, included_liability_cap=Decimal("1500"), claim_window_hours=24)
        for bad in ("0", "-5", "NaN", "Infinity", "-Infinity", "abc", "", "1e20"):
            with self.subTest(amount=bad):
                try:
                    svc.file_insurance_claim(self._booking(), self.u, "broken", bad)
                except ValidationError:
                    pass
                except Exception as e:  # anything other than a clean ValidationError is a defect
                    self.fail(f"amount {bad!r} raised {type(e).__name__}: {e}")
                else:
                    self.fail(f"amount {bad!r} was accepted")


# Prevent the imported base class from being collected/re-run under this module.
del _ClaimBase
