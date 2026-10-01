from decimal import Decimal

from rest_framework.test import APITestCase

from service_requests.models import GTCancellationPolicy, GTClaimPolicy, GTWaitingChargePolicy

URL = "/api/logistics/policies/"


class PublicGTPolicyTests(APITestCase):
    def setUp(self):
        # Round 9 (migration 0117) seeded Porter-documented default cancellation/claim
        # policy rows so real GT bookings always have a live policy. These tests probe
        # the "nothing configured" and "exactly what I created" cases explicitly, so
        # clear the seeded defaults here -- only this TestCase's own transaction is affected.
        GTCancellationPolicy.objects.all().delete()
        GTClaimPolicy.objects.all().delete()

    def get(self, cat="goods_transport_truck"):
        r = self.client.get(URL, {"service_category": cat})
        return r, (r.json().get("data") or {})

    def test_nothing_configured_shows_liability_final_fare_and_drop_change_notes(self):
        r, d = self.get()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(d["terms"]), 4)
        self.assertIn("e-way bill", d["terms"][-1])   # statutory inter-state notice (Round 6)
        # No included liability configured -> say so plainly rather than stay silent.
        self.assertIn("not insured by default", d["terms"][0])
        self.assertIn("Terms of Service", d["terms"][0])
        self.assertIn("final fare", d["terms"][1])
        self.assertIn("change the drop location during the trip", d["terms"][2])
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
        self.assertEqual(len(d["terms"]), 2)
        self.assertIn("e-way bill", d["terms"][-1])
        self.assertIn("not insured by default", d["terms"][0])
        self.assertNotIn("insurance at booking", d["terms"][0])  # P&M is not sold transit insurance
        self.assertFalse(any("final fare" in t or "drop location" in t for t in d["terms"]))
