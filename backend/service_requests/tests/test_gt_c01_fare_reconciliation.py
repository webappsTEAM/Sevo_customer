"""
service_requests/tests/test_gt_c01_fare_reconciliation.py

GT-C-01: estimated-vs-final fare reconciliation.

Before this there was no record connecting the quoted fare to the
charged one: ServiceRequest.total_amount was whatever it had most
recently been set to, with no statement of what was originally quoted,
what changed, or why.

The security property under test throughout: the final amount is
computed by the server from server-side facts. A completion payload can
report a measured distance (a fact about the trip) but never a price,
and a distance variance is re-priced using the rate locked into the
stored quote -- not the tier's current rate, so a rate change between
booking and completion cannot silently move an already-agreed fare.
"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import (
    FareReconciliation, ServiceRequest, TripStop, WorkExtension,
)
from service_requests.services.fare_reconciliation import reconcile_booking_fare

User = get_user_model()

# The quote a 12km trip produces from the tier below:
#   base 250 + (12 - 2 free) x 18 = 180 + loading 100 = 530
QUOTE = {
    "total": "530.00",
    "base_fare": "250.00",
    "distance_km": "12.00",
    "chargeable_km": "10.00",
    "distance_charge": "180.00",
    "loading_unloading": "100.00",
    "additional_stops": 0,
    "additional_stop_charge": "0.00",
    "subtotal": "530.00",
    "surge_multiplier": "1.00",
    "minimum_fare_applied": False,
    "distance_source": "google_maps",
    "currency": "INR",
}


def _booking(fare_breakdown=None, **extra):
    uid = uuid.uuid4().hex[:8]
    customer = User.objects.create_user(
        username=f"cust_gtc01_{uid}",
        email=f"cust_gtc01_{uid}@example.com",
        phone=f"94{uuid.uuid4().int % 100000000:08d}",
        role=getattr(User.Role, "CUSTOMER", "customer"),
    )
    defaults = dict(
        customer=customer,
        customer_name="Test Customer",
        phone=customer.phone,
        service_category="goods_transport_truck",
        issue_title="Move furniture",
        address="Pickup, Hosur",
        latitude=Decimal("12.740900"),
        longitude=Decimal("77.825300"),
        preferred_date=timezone.localdate(),
        status=ServiceRequest.Status.IN_PROGRESS,
        total_amount=Decimal("530.00"),
        fare_breakdown=dict(fare_breakdown if fare_breakdown is not None else QUOTE),
    )
    defaults.update(extra)
    return ServiceRequest.objects.create(**defaults)


class ReconciliationTests(TestCase):
    def test_identical_trip_reconciles_to_no_change(self):
        sr = _booking()
        recon = reconcile_booking_fare(sr, actual_distance_km="12.00")
        self.assertIsNotNone(recon)
        self.assertEqual(recon.estimated_amount, Decimal("530.00"))
        self.assertEqual(recon.final_amount, Decimal("530.00"))
        self.assertEqual(recon.delta, Decimal("0.00"))
        self.assertEqual(recon.adjustments, [])
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("530.00"))

    def test_longer_route_is_charged_at_the_quoted_rate(self):
        sr = _booking()
        # 5km further. The quote's effective rate is 180/10 = 18/km.
        recon = reconcile_booking_fare(sr, actual_distance_km="17.00")
        self.assertEqual(recon.final_amount, Decimal("620.00"))
        self.assertEqual(recon.delta, Decimal("90.00"))
        adj = recon.adjustments[0]
        self.assertEqual(adj["code"], "DISTANCE_VARIANCE")
        self.assertEqual(adj["amount"], "90.00")
        self.assertEqual(adj["rate_applied"], "18.00")
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("620.00"))

    def test_shorter_route_reduces_the_fare(self):
        # The customer should benefit from a shorter trip, not just be
        # exposed to a longer one.
        sr = _booking()
        recon = reconcile_booking_fare(sr, actual_distance_km="9.00")
        self.assertEqual(recon.delta, Decimal("-54.00"))
        self.assertEqual(recon.final_amount, Decimal("476.00"))

    def test_a_later_tier_rate_change_cannot_move_a_locked_fare(self):
        # The whole point of snapshotting the quote: re-pricing uses the
        # rate recorded in the quote, not whatever the tier says now.
        tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-c01",
            name="Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("999.00"),
            free_km=Decimal("2.00"),
        )
        sr = _booking(logistics_tier=tier)
        recon = reconcile_booking_fare(sr, actual_distance_km="17.00")
        # 18/km from the quote, NOT the tier's current 999/km.
        self.assertEqual(recon.adjustments[0]["rate_applied"], "18.00")
        self.assertEqual(recon.final_amount, Decimal("620.00"))

    def test_extra_completed_stops_are_charged(self):
        quote = dict(QUOTE, additional_stops=0, additional_stop_charge="0.00")
        tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-stops",
            name="Ace", starting_price=Decimal("400.00"),
            additional_stop_charge=Decimal("50.00"),
        )
        sr = _booking(fare_breakdown=quote, logistics_tier=tier)
        now = timezone.now()
        for i, kind in enumerate(
            [TripStop.StopType.PICKUP, TripStop.StopType.DROP, TripStop.StopType.DROP], start=1
        ):
            TripStop.objects.create(
                booking=sr, sequence=i, stop_type=kind, address=f"Stop {i}",
                arrived_at=now, completed_at=now,
            )
        recon = reconcile_booking_fare(sr, actual_distance_km="12.00")
        codes = [a["code"] for a in recon.adjustments]
        self.assertIn("STOP_VARIANCE", codes)
        self.assertEqual(recon.final_amount, Decimal("580.00"))

    def test_stops_that_were_not_completed_are_not_charged(self):
        # Charging for a stop the driver never completed is exactly the
        # kind of silent overcharge this record exists to prevent.
        quote = dict(QUOTE)
        tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-nostops",
            name="Ace", starting_price=Decimal("400.00"),
            additional_stop_charge=Decimal("50.00"),
        )
        sr = _booking(fare_breakdown=quote, logistics_tier=tier)
        now = timezone.now()
        TripStop.objects.create(booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
                                address="P", arrived_at=now, completed_at=now)
        TripStop.objects.create(booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
                                address="D1", arrived_at=now, completed_at=now)
        # Planned but never completed:
        TripStop.objects.create(booking=sr, sequence=3, stop_type=TripStop.StopType.DROP,
                                address="D2")
        recon = reconcile_booking_fare(sr, actual_distance_km="12.00")
        self.assertEqual([a["code"] for a in recon.adjustments], [])
        self.assertEqual(recon.final_amount, Decimal("530.00"))

    def test_only_customer_approved_extra_work_is_added(self):
        sr = _booking()
        # Approved by the customer -> counts.
        WorkExtension.objects.create(
            service_request=sr, status=WorkExtension.Status.CUSTOMER_ACCEPTED,
            final_customer_amount=Decimal("300.00"),
        )
        # Not yet accepted by the person paying -> must NOT count.
        WorkExtension.objects.create(
            service_request=sr, status=WorkExtension.Status.ADMIN_APPROVED,
            admin_approved_amount=Decimal("999.00"),
        )
        WorkExtension.objects.create(
            service_request=sr, status=WorkExtension.Status.CUSTOMER_DECLINED,
            final_customer_amount=Decimal("777.00"),
        )
        recon = reconcile_booking_fare(sr, actual_distance_km="12.00")
        self.assertEqual(recon.final_amount, Decimal("830.00"))
        self.assertEqual([a["code"] for a in recon.adjustments], ["APPROVED_EXTRA_WORK"])

    def test_minimum_fare_floor_is_reapplied_after_a_reduction(self):
        quote = dict(QUOTE, minimum_fare="500.00")
        sr = _booking(fare_breakdown=quote)
        recon = reconcile_booking_fare(sr, actual_distance_km="5.00")
        # 530 - (7 x 18) = 404, floored back up to 500.
        self.assertEqual(recon.final_amount, Decimal("500.00"))
        self.assertIn("MINIMUM_FARE", [a["code"] for a in recon.adjustments])

    def test_is_idempotent_on_webhook_retry(self):
        sr = _booking()
        reconcile_booking_fare(sr, actual_distance_km="17.00")
        reconcile_booking_fare(sr, actual_distance_km="17.00")
        self.assertEqual(FareReconciliation.objects.filter(booking=sr).count(), 1)
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("620.00"))

    def test_no_distance_reported_still_reconciles_the_rest(self):
        sr = _booking()
        WorkExtension.objects.create(
            service_request=sr, status=WorkExtension.Status.RESOLVED,
            final_customer_amount=Decimal("120.00"),
        )
        recon = reconcile_booking_fare(sr, actual_distance_km=None)
        self.assertEqual(recon.final_amount, Decimal("650.00"))

    def test_flat_priced_booking_has_nothing_to_reconcile(self):
        sr = _booking(fare_breakdown={})
        self.assertIsNone(reconcile_booking_fare(sr, actual_distance_km="17.00"))
        self.assertFalse(FareReconciliation.objects.filter(booking=sr).exists())

    def test_packers_movers_is_never_reconciled_by_distance(self):
        sr = _booking(service_category="packers_movers")
        self.assertIsNone(reconcile_booking_fare(sr, actual_distance_km="17.00"))

    def test_snapshots_both_sides_for_audit(self):
        sr = _booking()
        recon = reconcile_booking_fare(sr, actual_distance_km="17.00")
        self.assertEqual(recon.estimated_breakdown["total"], "530.00")
        self.assertEqual(recon.final_breakdown["total"], "620.00")
        # The estimate snapshot is untouched by the reconciliation.
        self.assertEqual(recon.estimated_breakdown["distance_km"], "12.00")


class ReconciliationWebhookTests(TestCase):
    def test_completion_webhook_never_breaks_on_a_reconciliation_failure(self):
        from unittest.mock import patch
        from workforce_integration.views import WorkforceWebhookView

        sr = _booking()
        with patch(
            "service_requests.services.fare_reconciliation.reconcile_booking_fare",
            side_effect=RuntimeError("boom"),
        ):
            WorkforceWebhookView._reconcile_fare(sr, {"actual_distance_km": "17.00"})
        # Swallowed; the booking keeps its quoted fare, which is the safe
        # direction to fail.
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("530.00"))

    def test_completion_webhook_passes_the_measured_distance_through(self):
        from workforce_integration.views import WorkforceWebhookView

        sr = _booking()
        WorkforceWebhookView._reconcile_fare(sr, {"actual_distance_km": "17.00"})
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("620.00"))

    def test_a_price_in_the_completion_payload_is_ignored(self):
        # A payload can report a distance. It can never set an amount.
        from workforce_integration.views import WorkforceWebhookView

        sr = _booking()
        WorkforceWebhookView._reconcile_fare(sr, {
            "actual_distance_km": "12.00",
            "total_amount": "99999.00",
            "final_amount": "99999.00",
            "fare": "99999.00",
        })
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("530.00"))
