"""
GT audit Update 18 -- a new goods-transport booking must know which vehicle
it needs.

Two ways a booking could previously reach the Vendor side with nothing to
dispatch against:

  1. LANE-ONLY. A Lane models a route and a fare -- it has no tier, no
     vehicle and no class. A booking carrying only a lane arrived at the
     Vendor's Gate 3 with no vehicle_class, so the fine-grained
     compatibility check skipped and any vehicle in the coarse category
     bucket could take the job. Resolving a lane to "some" tier would be
     inventing a vehicle the customer never chose, so the booking is
     refused and the customer picks one.

  2. AN UNFULFILLABLE CLASS. ServiceTier.VehicleClass offers "heavy_truck";
     the Vendor app's Vehicle.VehicleType has no member that satisfies it --
     no rank, no equivalence. A heavy_truck booking would be accepted,
     charged, and then never dispatchable to anyone. Equating it with
     "truck" would hand a customer who paid for a heavy truck a smaller
     vehicle, which is the exact failure this whole compatibility effort
     exists to prevent.

Both fail CLOSED, and only for NEW bookings: the guard runs in the
booking-time fare resolver, so rows already in the database keep their
existing backward-compatible handling on the Vendor side.

SimpleTestCase: the guard is pure, and the listing filter is asserted
against source, so this file needs no database.
"""
import re

from django.test import SimpleTestCase

from service_requests.services.logistics_pricing import (
    DISPATCHABLE_VEHICLE_CLASSES,
    UnresolvedLogisticsFareError,
    assert_gt_booking_is_classifiable,
)


class _Tier:
    def __init__(self, vehicle_class="truck", name="Tata Ace"):
        self.vehicle_class = vehicle_class
        self.name = name


class EveryDispatchableClassIsBookableTests(SimpleTestCase):
    def test_each_dispatchable_class_passes(self):
        for vehicle_class in DISPATCHABLE_VEHICLE_CLASSES:
            assert_gt_booking_is_classifiable(
                "goods_transport_truck", _Tier(vehicle_class=vehicle_class)
            )

    def test_the_set_matches_what_a_vendor_vehicle_can_be(self):
        # Mirrors the Vendor app's _EMPLOYEE_VEHICLE_TYPE_RANK keys. If a
        # heavy-truck fleet is ever onboarded, BOTH sides change together --
        # this assertion is the reminder.
        self.assertEqual(
            DISPATCHABLE_VEHICLE_CLASSES,
            {"two_wheeler", "three_wheeler", "pickup", "truck"},
        )
        self.assertNotIn("heavy_truck", DISPATCHABLE_VEHICLE_CLASSES)


class UnfulfillableBookingsAreRefusedTests(SimpleTestCase):
    def test_heavy_truck_cannot_be_booked(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            assert_gt_booking_is_classifiable(
                "goods_transport_truck", _Tier(vehicle_class="heavy_truck", name="Heavy Truck")
            )
        self.assertIn("not available for booking", str(ctx.exception))

    def test_heavy_truck_is_not_quietly_downgraded_to_a_smaller_vehicle(self):
        # The failure mode this guard exists to prevent: accepting the
        # booking and handing the customer a smaller truck.
        with self.assertRaises(UnresolvedLogisticsFareError):
            assert_gt_booking_is_classifiable(
                "goods_transport_truck", _Tier(vehicle_class="heavy_truck")
            )

    def test_a_lane_only_booking_is_refused(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            assert_gt_booking_is_classifiable("goods_transport_truck", None)
        self.assertIn("choose a vehicle", str(ctx.exception).lower())

    def test_the_bare_goods_transport_slug_is_covered_too(self):
        with self.assertRaises(UnresolvedLogisticsFareError):
            assert_gt_booking_is_classifiable("goods_transport", None)

    def test_a_tier_with_no_classification_is_refused(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            assert_gt_booking_is_classifiable("goods_transport_truck", _Tier(vehicle_class=""))
        self.assertIn("no vehicle classification", str(ctx.exception).lower())

    def test_an_unknown_class_is_refused(self):
        with self.assertRaises(UnresolvedLogisticsFareError):
            assert_gt_booking_is_classifiable("goods_transport_truck", _Tier(vehicle_class="spaceship"))


class PackersMoversIsDeliberatelyOutOfScopeTests(SimpleTestCase):
    """
    P&M tiers are relocation PACKAGES (1BHK, Villa) that legitimately carry
    no vehicle_class -- their compatibility runs on payload_kg instead. And
    a P&M booking can legitimately arrive with a verified quote_id and no
    tier at all. Applying the class rule there would break a working flow.
    """

    def test_a_pm_booking_without_a_tier_is_not_refused_here(self):
        assert_gt_booking_is_classifiable("packers_movers", None)

    def test_a_pm_tier_without_a_vehicle_class_is_not_refused_here(self):
        assert_gt_booking_is_classifiable("packers_movers", _Tier(vehicle_class=""))

    def test_non_logistics_categories_are_untouched(self):
        for category in ("ac_repair", "plumbing", "electrical", ""):
            assert_gt_booking_is_classifiable(category, None)


class TheGuardRunsBeforeAnyPricingTests(SimpleTestCase):
    SOURCE = "service_requests/services/logistics_pricing.py"

    def _v2_body(self):
        src = open(self.SOURCE, encoding="utf-8", errors="replace").read()
        return src.split("def resolve_logistics_fare_v2(", 1)[1]

    def test_the_resolver_calls_the_guard(self):
        self.assertIn("assert_gt_booking_is_classifiable(", self._v2_body())

    def test_it_runs_before_the_distance_and_flat_branches(self):
        body = self._v2_body()
        self.assertLess(
            body.index("assert_gt_booking_is_classifiable("),
            body.index("if service_category in DISTANCE_PRICED_CATEGORIES:"),
            "a refused booking can still be priced",
        )

    def test_it_runs_after_the_category_match_check(self):
        # A tier that belongs to a different category should be reported as
        # a category mismatch, not as a classification problem.
        body = self._v2_body()
        self.assertLess(
            body.index("assert_catalog_matches_category("),
            body.index("assert_gt_booking_is_classifiable("),
        )


class UnbookableClassesAreNotEvenOfferedTests(SimpleTestCase):
    SOURCE = "logistics/views.py"

    def _listing_body(self):
        src = open(self.SOURCE, encoding="utf-8", errors="replace").read()
        lines = src.splitlines()
        start = next(i for i, l in enumerate(lines) if re.match(r"class ServiceTierListView\(", l))
        end = next(i for i, l in enumerate(lines) if i > start and re.match(r"class \w+\(", l))
        return "\n".join(lines[start:end])

    def test_the_tier_listing_filters_on_the_same_shared_set(self):
        body = self._listing_body()
        self.assertIn("DISPATCHABLE_VEHICLE_CLASSES", body)

    def test_blank_classed_tiers_are_still_listed(self):
        # Packers & Movers packages carry no vehicle_class and must survive
        # the filter.
        body = self._listing_body()
        self.assertIn('~Q(vehicle_class="")', body)
