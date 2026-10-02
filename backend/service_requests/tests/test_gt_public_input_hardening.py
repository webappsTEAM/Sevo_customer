"""Regression tests from the final GT forensic QA: hostile input on the public
(AllowAny) logistics endpoints must never surface as an HTTP 500, and the
capacity boundary must be exact."""
import json
from decimal import Decimal

from django.test import TestCase

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.services.cargo_fitment import evaluate_vehicle_fitment, resolve_cargo_payload

EVAL = "/api/logistics/evaluate-cargo/"


class PublicLogisticsInputHardeningTests(TestCase):
    def setUp(self):
        self.client.raise_request_exception = False

    def _post(self, body):
        return self.client.post(EVAL, data=json.dumps(body), content_type="application/json")

    def test_non_finite_or_out_of_range_declared_weight_is_a_clean_rejection_not_500(self):
        for bad in ("Infinity", "-Infinity", "NaN", "sNaN", "1e999999", "abc", "-1"):
            with self.subTest(declared_weight_kg=bad):
                self.assertLess(self._post({"declared_weight_kg": bad}).status_code, 500)
                summary = resolve_cargo_payload(declared_weight_kg=bad)
                self.assertFalse(summary["is_valid"])
                self.assertEqual(summary["validation_errors"][0]["code"], "INVALID_DECLARED_WEIGHT")

    def test_non_ascii_or_oversized_category_id_is_not_500(self):
        for bad in ("²", "٢٠", "9" * 5000, "9" * 40):
            with self.subTest(goods_category=bad[:12]):
                self.assertLess(self._post({"goods_category": bad}).status_code, 500)
        self.assertLess(self.client.get("/api/logistics/goods-items/?category=²").status_code, 500)

    def test_capacity_boundary_is_exact_for_a_20kg_vehicle(self):
        tier = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER, city="hosur", slug="w2-b", name="2W",
            starting_price=Decimal("50"), vehicle_class="two_wheeler",
            max_weight_kg=Decimal("20"), max_cft=Decimal("2"),
        )
        expected = {"0": True, "1": True, "15": True, "19.99": True, "20": True,
                    "20.01": False, "21": False}
        for w, fits in expected.items():
            with self.subTest(weight=w):
                ok, _ = evaluate_vehicle_fitment(tier, resolve_cargo_payload(declared_weight_kg=w))
                self.assertEqual(ok, fits)
        for w in ("-1", "-0.01"):
            ok, _ = evaluate_vehicle_fitment(tier, resolve_cargo_payload(declared_weight_kg=w))
            self.assertFalse(ok)
