"""
service_requests/tests/test_logistics_pricing.py

Unit tests for resolve_logistics_fare (Phase 3 of
GOODS_AND_TRANSPORT_IMPLEMENTATION_PLAN.md — server-side fare integrity for
Goods Transport / Packers & Movers bookings).

Pure-function tests, deliberately not a Django TestCase — resolve_logistics_fare
takes plain objects with a .fare / .starting_price attribute, so this needs
no database and runs the same in any environment, including one where the
project's Postgres instance isn't reachable.
"""
import unittest
from decimal import Decimal
from types import SimpleNamespace

from service_requests.services.logistics_pricing import (
    resolve_logistics_fare,
    UnresolvedLogisticsFareError,
)


class ResolveLogisticsFareTests(unittest.TestCase):
    def test_non_logistics_category_passes_submitted_amount_through(self):
        fare = resolve_logistics_fare(
            service_category="ac_repair",
            logistics_tier=None,
            logistics_lane=None,
            submitted_amount=Decimal("999.00"),
        )
        self.assertEqual(fare, Decimal("999.00"))

    def test_logistics_category_with_lane_uses_lane_fare_not_client_amount(self):
        lane = SimpleNamespace(fare=Decimal("900.00"))
        fare = resolve_logistics_fare(
            service_category="goods_transport_truck",
            logistics_tier=None,
            logistics_lane=lane,
            submitted_amount=Decimal("1.00"),  # tampered / stale client value
        )
        self.assertEqual(fare, Decimal("900.00"))

    def test_logistics_category_with_tier_only_uses_tier_starting_price(self):
        tier = SimpleNamespace(starting_price=Decimal("205.00"))
        fare = resolve_logistics_fare(
            service_category="goods_transport_truck",
            logistics_tier=tier,
            logistics_lane=None,
            submitted_amount=Decimal("1.00"),
        )
        self.assertEqual(fare, Decimal("205.00"))

    def test_lane_takes_priority_over_tier_when_both_present(self):
        tier = SimpleNamespace(starting_price=Decimal("205.00"))
        lane = SimpleNamespace(fare=Decimal("900.00"))
        fare = resolve_logistics_fare(
            service_category="goods_transport_truck",
            logistics_tier=tier,
            logistics_lane=lane,
            submitted_amount=Decimal("1.00"),
        )
        self.assertEqual(fare, Decimal("900.00"))

    def test_logistics_category_with_neither_tier_nor_lane_is_rejected(self):
        """
        This used to assert a fallback to the client-submitted amount. That
        fallback was deliberately removed (GT-B-01): a logistics booking
        with no resolvable tier or lane has no server-verifiable price, so
        trusting the number the client sent is exactly the hole the fare
        integrity work closed. The current contract is to raise, and
        BookingCreateView turns that into a 400.
        """
        with self.assertRaises(UnresolvedLogisticsFareError):
            resolve_logistics_fare(
                service_category="packers_movers",
                logistics_tier=None,
                logistics_lane=None,
                submitted_amount=Decimal("1499.00"),
            )

    def test_all_three_logistics_categories_are_covered(self):
        for category in ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers"):
            tier = SimpleNamespace(starting_price=Decimal("100.00"))
            fare = resolve_logistics_fare(
                service_category=category,
                logistics_tier=tier,
                logistics_lane=None,
                submitted_amount=Decimal("1.00"),
            )
            self.assertEqual(fare, Decimal("100.00"), f"category={category}")


if __name__ == "__main__":
    unittest.main()
