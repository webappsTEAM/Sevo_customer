"""
GT audit Updates 16 and 17 -- Customer-side closures.

Update 16, the flat-fare classification snapshot
------------------------------------------------
quote_logistics_fare() has carried the purchased tier's
vehicle_class/weight_class since Update 14, which is what lets the Vendor
dispatch engine validate the ACTUAL purchased requirement rather than the
coarse service_category string. Two live goods-transport paths never reach
that function and returned a bare fare with no breakdown at all:

  * a distance-priced tier whose route could not be measured, where a
    configured Lane fare exists (resolve_logistics_fare_v2's lane branch), and
  * a goods-transport tier that is not distance-priced, plus the bare
    "goods_transport" slug, which resolve through the flat lane/tier lookup.

Bookings made either way were written with an empty fare_breakdown, so the
Vendor gate found no vehicle_class and -- by its documented
do-not-strand-legacy-bookings rule -- skipped. The compatibility fix was
therefore bypassable by booking a configured route instead of a measured
trip. classification_only_snapshot() closes that without inventing pricing.

Update 17, two Customer IDOR closures
-------------------------------------
  * CustomerBookingRetryPaymentView was AllowAny with no ownership check on
    a POST that both mutates payment_status and returns request_id and
    total_amount -- sequential ids were the only barrier.
  * CustomerBookingAvailableSlotsView proved the caller was *a* customer,
    never that the booking was theirs.

SimpleTestCase throughout: the snapshot helper is pure, and the IDOR
closures are asserted against source so this file needs no database.
"""
import re

from django.test import SimpleTestCase

from service_requests.services.logistics_pricing import (
    LOGISTICS_CATEGORIES,
    classification_only_snapshot,
)


class _Tier:
    def __init__(self, **kw):
        self.id = kw.get("id", 7)
        self.vehicle_class = kw.get("vehicle_class", "truck")
        self.weight_class = kw.get("weight_class", "heavy")
        self.capacity_label = kw.get("capacity_label", "1,200 kg")
        self.currency = kw.get("currency", "INR")


class ClassificationOnlySnapshotTests(SimpleTestCase):
    def test_a_flat_priced_gt_booking_still_records_the_purchased_class(self):
        snap = classification_only_snapshot(
            service_category="goods_transport_truck",
            tier=_Tier(),
            total=999,
            source="flat_tier_or_lane_fare",
        )
        self.assertIsNotNone(snap, "a flat-priced GT booking has no class to enforce")
        self.assertEqual(snap["vehicle_class"], "truck")
        self.assertEqual(snap["weight_class"], "heavy")
        self.assertEqual(snap["tier_id"], 7)

    def test_the_bare_goods_transport_slug_is_covered(self):
        # This slug ALWAYS resolves flat -- it is never distance-priced --
        # so without this it could never carry a class at all.
        snap = classification_only_snapshot(
            service_category="goods_transport",
            tier=_Tier(vehicle_class="two_wheeler", weight_class="light"),
            total=99,
            source="flat_tier_or_lane_fare",
        )
        self.assertIsNotNone(snap)
        self.assertEqual(snap["vehicle_class"], "two_wheeler")

    def test_the_fare_itself_is_never_altered(self):
        # This helper classifies; it must never become a second pricing path.
        for total in (0, 1, 499, 100000):
            snap = classification_only_snapshot(
                service_category="goods_transport_truck",
                tier=_Tier(),
                total=total,
                source="configured_lane_fare",
            )
            self.assertEqual(snap["total"], total)

    def test_a_lane_only_booking_fabricates_nothing(self):
        # Lane models a route and a fare, not a vehicle. With no tier there
        # is no classification anywhere in the system, and inventing one
        # would be worse than having none.
        self.assertIsNone(
            classification_only_snapshot(
                service_category="goods_transport_truck",
                tier=None,
                total=500,
                source="configured_lane_fare",
            )
        )

    def test_a_tier_with_no_classification_yields_no_snapshot(self):
        # An empty vehicle_class would be indistinguishable from "absent" to
        # the Vendor gate, so it must not be emitted as if it were data.
        self.assertIsNone(
            classification_only_snapshot(
                service_category="goods_transport_truck",
                tier=_Tier(vehicle_class=""),
                total=500,
                source="flat_tier_or_lane_fare",
            )
        )

    def test_non_logistics_categories_are_untouched(self):
        for category in ("ac_repair", "plumbing", "electrical", ""):
            self.assertIsNone(
                classification_only_snapshot(
                    service_category=category,
                    tier=_Tier(),
                    total=500,
                    source="flat_tier_or_lane_fare",
                )
            )

    def test_every_logistics_category_is_in_scope(self):
        for category in LOGISTICS_CATEGORIES:
            snap = classification_only_snapshot(
                service_category=category,
                tier=_Tier(vehicle_class="pickup"),
                total=1500,
                source="flat_tier_or_lane_fare",
            )
            self.assertIsNotNone(snap, category)


class FlatFarePathsEmitTheSnapshotTests(SimpleTestCase):
    """
    The helper existing is not the fix; the two flat return points calling
    it is. Asserted against source because reaching either branch for real
    needs a database-backed tier and lane.
    """

    SOURCE = "service_requests/services/logistics_pricing.py"

    def _v2_body(self):
        src = open(self.SOURCE, encoding="utf-8", errors="replace").read()
        return src.split("def resolve_logistics_fare_v2(", 1)[1]

    def test_neither_flat_return_point_still_returns_a_bare_none(self):
        body = self._v2_body()
        self.assertNotIn("return logistics_lane.fare, None", body)
        self.assertNotIn("        submitted_amount=submitted_amount,\n    ), None", body)

    def test_the_lane_branch_snapshots(self):
        body = self._v2_body()
        lane_branch = body.split("if logistics_lane is not None:", 1)[1][:600]
        self.assertIn("classification_only_snapshot", lane_branch)
        self.assertIn("configured_lane_fare", lane_branch)

    def test_the_flat_fallthrough_snapshots(self):
        body = self._v2_body()
        tail = body[-900:]
        self.assertIn("classification_only_snapshot", tail)
        self.assertIn("flat_tier_or_lane_fare", tail)

    def test_the_flat_resolver_is_still_the_single_pricing_definition(self):
        # The snapshot must ride alongside resolve_logistics_fare's answer,
        # never replace or recompute it.
        body = self._v2_body()
        self.assertIn("flat_fare = resolve_logistics_fare(", body)
        self.assertIn("total=flat_fare", body)


class CustomerIdorClosureTests(SimpleTestCase):
    SOURCE = "service_requests/views.py"

    def _class_body(self, name):
        src = open(self.SOURCE, encoding="utf-8", errors="replace").read()
        lines = src.splitlines()
        start = next(i for i, l in enumerate(lines) if re.match(rf"class {name}\(", l))
        end = next(
            (i for i, l in enumerate(lines) if i > start and re.match(r"class \w+\(", l)),
            len(lines),
        )
        return "\n".join(lines[start:end])

    def test_retry_payment_requires_ownership_or_a_capability_token(self):
        body = self._class_body("CustomerBookingRetryPaymentView")
        self.assertIn("tracking_token", body)
        self.assertIn("sr.customer_id == request.user.id", body)

    def test_retry_payment_refuses_before_it_mutates_or_discloses(self):
        body = self._class_body("CustomerBookingRetryPaymentView")
        self.assertLess(
            body.index("token_ok or is_owner or is_admin"),
            body.index("sr.save("),
            "payment_status is written before the caller is authorized",
        )
        self.assertLess(
            body.index("token_ok or is_owner or is_admin"),
            body.index("float(sr.total_amount)"),
            "the amount is disclosed before the caller is authorized",
        )

    def test_retry_payment_refusal_is_anti_enumerating(self):
        # Same 404 as a missing booking, so ids cannot be walked by
        # comparing responses.
        body = self._class_body("CustomerBookingRetryPaymentView")
        guard = body.split("if not (token_ok or is_owner or is_admin):", 1)[1][:300]
        self.assertIn('_error("Booking not found.", 404)', guard)

    def test_available_slots_requires_the_booking_to_be_the_callers(self):
        body = self._class_body("CustomerBookingAvailableSlotsView")
        self.assertIn("booking.customer_id != request.user.id", body)

    def test_available_slots_still_lets_admins_through(self):
        body = self._class_body("CustomerBookingAvailableSlotsView")
        self.assertIn("is_superuser", body)

    def test_available_slots_refuses_before_reading_availability(self):
        body = self._class_body("CustomerBookingAvailableSlotsView")
        self.assertLess(
            body.index("booking.customer_id != request.user.id"),
            body.index("get_real_technician_availability"),
        )
