"""
service_requests/tests/test_gt_pricing_price_lock.py

A booking is priced once, and an administrator changing rates afterwards
must never move it.

This is the property that makes an admin-editable rate card safe to ship. It
was NOT true before: fare reconciliation read the live ServiceTier for the
per-stop rate whenever the quote had no extra stops to divide (the common
case, since stops are added after booking), and the minimum-fare floor read
a breakdown key that never existed. Rates now travel inside the quote.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch

from logistics.models import ServiceTier
from service_requests.models import FareReconciliation, ServiceRequest, TripStop
from service_requests.services.fare_reconciliation import reconcile_booking_fare
from service_requests.services.logistics_pricing import quote_logistics_fare

User = get_user_model()

PICKUP = (Decimal("12.740900"), Decimal("77.825300"))
DROP = (Decimal("12.935200"), Decimal("77.624500"))


def _route(km):
    return {"distance_km": float(km), "duration_seconds": 900, "source": "google_maps"}


class PriceLockAcrossRateChangeTests(TestCase):
    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug="lock-test", name="Lock Test",
            starting_price=Decimal("400.00"), base_fare=Decimal("220.00"),
            per_km_rate=Decimal("22.00"), free_km=Decimal("3.00"),
            minimum_fare=Decimal("220.00"),
            loading_unloading_charge=Decimal("60.00"),
            additional_stop_charge=Decimal("40.00"),
        )
        self.customer = User.objects.create_user(
            username="lock_cust", email="lock@example.com", phone="9871230001",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )

    def _book_at_current_rates(self, km=10):
        """Quote at today's rates and freeze them onto a booking."""
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(km)):
            bd = quote_logistics_fare(
                tier=self.tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        sr = ServiceRequest.objects.create(
            customer=self.customer, customer_name="Lock", phone="9871230001",
            service_category="goods_transport_truck", issue_title="Move",
            address="Pickup, Hosur", latitude=PICKUP[0], longitude=PICKUP[1],
            drop_address="Drop, Bengaluru", drop_latitude=DROP[0], drop_longitude=DROP[1],
            preferred_date=timezone.localdate(), status=ServiceRequest.Status.IN_PROGRESS,
            logistics_tier=self.tier,
            total_amount=bd["total"],
            fare_breakdown={k: (str(v) if isinstance(v, Decimal) else v) for k, v in bd.items()},
        )
        return sr, bd

    # ── the rates the quote used are recorded on it ──────────────────────

    def test_a_quote_records_the_rates_it_used(self):
        _sr, bd = self._book_at_current_rates()
        self.assertEqual(bd["rate_per_km"], Decimal("22.00"))
        self.assertEqual(bd["rate_additional_stop"], Decimal("40.00"))
        self.assertEqual(bd["rate_minimum_fare"], Decimal("220.00"))
        self.assertEqual(bd["free_km"], Decimal("3.00"))

    def test_a_tier_with_no_minimum_records_none_rather_than_zero(self):
        # Zero would be a floor of nothing, None means "no floor" -- and the
        # two must not be confused when the floor is re-applied later.
        self.tier.minimum_fare = None
        self.tier.save(update_fields=["minimum_fare"])
        _sr, bd = self._book_at_current_rates()
        self.assertIsNone(bd["rate_minimum_fare"])

    # ── the property that matters ────────────────────────────────────────

    def test_an_admin_rate_rise_does_not_touch_an_existing_booking(self):
        sr, _ = self._book_at_current_rates(km=10)
        booked_total = sr.total_amount
        self.assertEqual(booked_total, Decimal("434.00"))

        # An administrator raises every rate the next day.
        self.tier.base_fare = Decimal("500.00")
        self.tier.per_km_rate = Decimal("99.00")
        self.tier.additional_stop_charge = Decimal("500.00")
        self.tier.minimum_fare = Decimal("9999.00")
        self.tier.save()

        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, booked_total, "a rate change moved a booked fare")

    def test_reconciliation_after_a_rate_change_still_uses_the_locked_rates(self):
        sr, _ = self._book_at_current_rates(km=10)      # quoted 10 km @ 22/km

        self.tier.per_km_rate = Decimal("99.00")        # admin changes rates
        self.tier.additional_stop_charge = Decimal("500.00")
        self.tier.minimum_fare = Decimal("9999.00")
        self.tier.save()

        # Trip actually ran 13 km -> 3 extra km, priced at the QUOTED 22/km.
        recon = reconcile_booking_fare(sr, actual_distance_km="13.00")
        self.assertIsNotNone(recon)
        self.assertEqual(recon.final_amount, Decimal("500.00"))   # 434 + 3 x 22
        codes = [a["code"] for a in recon.adjustments]
        self.assertEqual(codes, ["DISTANCE_VARIANCE"])
        self.assertEqual(recon.adjustments[0]["rate_applied"], "22.00")

    def test_extra_stops_are_charged_at_the_quoted_rate_not_the_current_one(self):
        """
        The exact leak: the quote had zero extra stops, so there was nothing
        to divide, and the old code reached for the live tier.
        """
        sr, _ = self._book_at_current_rates(km=10)
        for seq, kind in ((1, TripStop.StopType.PICKUP), (2, TripStop.StopType.DROP),
                          (3, TripStop.StopType.DROP)):
            TripStop.objects.create(
                booking=sr, sequence=seq, stop_type=kind, address=f"Stop {seq}",
                completed_at=timezone.now(),
            )

        self.tier.additional_stop_charge = Decimal("500.00")   # admin change
        self.tier.save(update_fields=["additional_stop_charge"])

        recon = reconcile_booking_fare(sr)
        # One extra stop at the QUOTED 40.00, not the current 500.00.
        self.assertEqual(recon.final_amount, Decimal("474.00"))
        self.assertEqual([a["code"] for a in recon.adjustments], ["STOP_VARIANCE"])

    def test_the_minimum_fare_floor_is_the_one_the_quote_was_given(self):
        sr, _ = self._book_at_current_rates(km=10)
        self.tier.minimum_fare = Decimal("9999.00")      # admin change
        self.tier.save(update_fields=["minimum_fare"])

        # Reconcile a much shorter actual trip: 3 km, entirely inside free_km.
        recon = reconcile_booking_fare(sr, actual_distance_km="3.00")
        # Falls to 434 - 7x22 = 280, still above the QUOTED floor of 220,
        # and nowhere near the tier's new 9999.
        self.assertEqual(recon.final_amount, Decimal("280.00"))
        self.assertNotIn("MINIMUM_FARE", [a["code"] for a in recon.adjustments])

    def test_the_quoted_floor_still_applies_when_it_genuinely_bites(self):
        # Guard against "fixing" the leak by disabling the floor entirely.
        sr, _ = self._book_at_current_rates(km=10)
        bd = dict(sr.fare_breakdown)
        bd["rate_minimum_fare"] = "400.00"          # a quote with a high floor
        sr.fare_breakdown = bd
        sr.save(update_fields=["fare_breakdown"])

        recon = reconcile_booking_fare(sr, actual_distance_km="3.00")
        self.assertEqual(recon.final_amount, Decimal("400.00"))
        self.assertIn("MINIMUM_FARE", [a["code"] for a in recon.adjustments])

    def test_a_legacy_quote_without_locked_rates_undercharges_rather_than_guesses(self):
        """
        Bookings quoted before rates were recorded have no rate to apply. The
        safe direction is to charge nothing for the variance -- never to bill
        at a rate the customer was never quoted -- but the reconciliation has
        to SAY so. A dropped chargeable component that leaves no trace is
        indistinguishable from a trip that had nothing to charge for, and
        operations would never know to look.
        """
        sr, _ = self._book_at_current_rates(km=10)
        bd = dict(sr.fare_breakdown)
        bd.pop("rate_additional_stop")
        bd.pop("rate_minimum_fare")
        sr.fare_breakdown = bd
        sr.save(update_fields=["fare_breakdown"])

        for seq, kind in ((1, TripStop.StopType.PICKUP), (2, TripStop.StopType.DROP),
                          (3, TripStop.StopType.DROP)):
            TripStop.objects.create(
                booking=sr, sequence=seq, stop_type=kind, address=f"S{seq}",
                completed_at=timezone.now(),
            )
        self.tier.additional_stop_charge = Decimal("500.00")
        self.tier.save(update_fields=["additional_stop_charge"])

        recon = reconcile_booking_fare(sr)
        # Not 434 + 500: the tier's new per-stop rate is never consulted.
        self.assertEqual(recon.final_amount, Decimal("434.00"))
        codes = [a["code"] for a in recon.adjustments]
        self.assertEqual(codes, ["STOP_RATE_UNAVAILABLE"])
        self.assertEqual(recon.adjustments[0]["amount"], "0.00")
        self.assertTrue(recon.adjustments[0]["needs_review"])

    def test_reconciliation_never_reads_the_live_tier(self):
        # Structural: the whole point is that no code path consults the tier.
        import inspect
        from service_requests.services import fare_reconciliation as fr

        for line in inspect.getsource(fr).splitlines():
            code = line.split("#", 1)[0]
            self.assertNotIn(
                "logistics_tier", code,
                "reconciliation reads the live tier again: %s" % line.strip(),
            )
