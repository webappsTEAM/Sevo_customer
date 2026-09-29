from decimal import Decimal

from rest_framework.test import APITestCase

from service_requests.models import GTCancellationPolicy, GTWaitingChargePolicy

URL = "/api/logistics/policies/"


class PublicGTPolicyTests(APITestCase):
    def get(self, cat="goods_transport_truck"):
        r = self.client.get(URL, {"service_category": cat})
        return r, (r.json().get("data") or {})

    def test_nothing_configured_shows_only_final_fare_note(self):
        r, d = self.get()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(d["terms"]), 1)
        self.assertIn("final fare", d["terms"][0])
        self.assertIsNone(d["cancellation"])
        self.assertIsNone(d["waiting"])

    def test_configured_rules_are_reflected(self):
        GTCancellationPolicy.objects.create(fee_mode="FLAT", flat_fee_amount=Decimal("50"), grace_period_seconds=120)
        GTWaitingChargePolicy.objects.create(is_enabled=True, free_minutes_per_stop=60, rate_per_minute=Decimal("2"),
                                             max_charge_per_booking=Decimal("300"))
        _, d = self.get()
        text = " ".join(d["terms"])
        self.assertIn("Cancellation fee of ₹50 applies once a driver is assigned", text)
        self.assertIn("Cancel within 2 min", text)
        self.assertIn("60 min of waiting per stop is free, then ₹2 per minute", text)
        self.assertIn("capped at ₹300", text)

    def test_category_specific_policy_overrides_platform_wide(self):
        GTCancellationPolicy.objects.create(fee_mode="FLAT", flat_fee_amount=Decimal("50"))
        GTCancellationPolicy.objects.create(service_category="goods_transport_two_wheeler", fee_mode="PERCENT",
                                            percent_fee=Decimal("10"))
        _, truck = self.get()
        _, bike = self.get("goods_transport_two_wheeler")
        self.assertIn("₹50", truck["terms"][0])
        self.assertIn("10% of the fare", bike["terms"][0])

    def test_inactive_and_unknown_category(self):
        GTCancellationPolicy.objects.create(fee_mode="FLAT", flat_fee_amount=Decimal("50"), is_active=False)
        _, d = self.get()
        self.assertIsNone(d["cancellation"])
        self.assertEqual(self.client.get(URL, {"service_category": "plumbing"}).status_code, 400)
        self.assertEqual(self.client.get(URL).status_code, 400)

    def test_packers_movers_has_no_final_fare_note(self):
        _, d = self.get("packers_movers")
        self.assertEqual(d["terms"], [])
