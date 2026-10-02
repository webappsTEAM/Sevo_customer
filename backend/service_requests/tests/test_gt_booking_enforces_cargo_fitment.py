"""Regression (E2E QA 2026-10-01): the booking path only validated cargo wrapped in cart_data. Cargo sent as
top-level booking fields (goods_category_id / cargo_items / declared_weight_kg) skipped every check, so a 900 kg
load on a 500 kg vehicle, a nonexistent goods category, unknown items and 400 chairs all booked successfully while
the quote endpoint rejected the same input. The booking path must enforce the same server-side rules."""
import uuid
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase

from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, ServiceTier
from service_requests.services.logistics_pricing import (
    UnresolvedLogisticsFareError, resolve_logistics_fare_v2,
)

P = dict(pickup_lat=Decimal("12.740900"), pickup_lng=Decimal("77.825300"),
         drop_lat=Decimal("12.754598"), drop_lng=Decimal("77.834477"))


class BookingEnforcesCargoFitmentTests(TestCase):
    def setUp(self):
        cache.clear()
        u = uuid.uuid4().hex[:8]
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"t-{u}", name="Test 500kg",
            vehicle_class=ServiceTier.VehicleClass.TRUCK, starting_price=Decimal("190"), base_fare=Decimal("150"),
            per_km_rate=Decimal("18"), free_km=Decimal("2"), loading_unloading_charge=Decimal("40"),
            additional_stop_charge=Decimal("30"), minimum_fare=Decimal("150"),
            max_weight_kg=Decimal("500"), max_cft=Decimal("100"), is_active=True)
        self.cat = GoodsCategory.objects.create(name="Furn", slug=f"furn-{u}", allows_two_wheeler=False,
                                                min_vehicle_class="truck", is_active=True, is_prohibited=False)
        self.chair = GoodsItem.objects.create(category=self.cat, name="Chair", slug=f"chair-{u}",
                                              default_weight_kg=Decimal("12"), default_cft=Decimal("1"), is_active=True)

    def _book(self, **cargo):
        return resolve_logistics_fare_v2(
            service_category="goods_transport_truck", logistics_tier=self.tier, logistics_lane=None,
            submitted_amount=Decimal("190"), request_cargo=cargo, **P)

    def test_over_capacity_declared_weight_rejected(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as c:
            self._book(declared_weight_kg=900)
        self.assertIn("CARGO_DOES_NOT_FIT", str(c.exception))

    def test_exact_capacity_boundary_accepted_and_just_over_rejected(self):
        self._book(declared_weight_kg=500)
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._book(declared_weight_kg="500.01")

    def test_many_items_exceed_capacity_cumulatively(self):
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._book(cargo_items=[{"goods_item_id": self.chair.id, "quantity": 45}])  # 540 kg
        self._book(cargo_items=[{"goods_item_id": self.chair.id, "quantity": 40}])      # 480 kg

    def test_unknown_category_and_item_rejected(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as c:
            self._book(goods_category_id=99999999)
        self.assertIn("UNKNOWN_GOODS_CATEGORY", str(c.exception))
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._book(goods_category="no-such-category")
        with self.assertRaises(UnresolvedLogisticsFareError) as c:
            self._book(cargo_items=[{"goods_item_id": 99999999, "quantity": 1}])
        self.assertIn("UNKNOWN_CARGO_ITEM", str(c.exception))

    def test_booking_without_cargo_is_unchanged(self):
        fare, _ = self._book()
        # This tier is distance-priced, so its authoritative fare is not its
        # marketing starting price. An empty cargo payload must preserve the
        # exact same quote produced when cargo is omitted altogether.
        expected_fare, _ = resolve_logistics_fare_v2(
            service_category="goods_transport_truck",
            logistics_tier=self.tier,
            logistics_lane=None,
            submitted_amount=Decimal("190"),
            **P,
        )
        self.assertEqual(fare, expected_fare)


class UnlistedGoodsDeclaredVolumeTests(BookingEnforcesCargoFitmentTests):
    """Customer-first cargo model: goods that are not in the catalog can be described by a declared weight and
    volume. A low weight must not hide a bulky load (E2E QA 2026-10-01: volume could not be declared at all)."""

    def test_declared_volume_over_bay_rejected_on_booking(self):
        with self.assertRaises(UnresolvedLogisticsFareError) as c:
            self._book(goods_category_id=self.cat.id, declared_weight_kg=50, declared_cft=500)
        self.assertIn("volume", str(c.exception).lower())

    def test_declared_volume_within_bay_accepted_and_invalid_rejected(self):
        self._book(goods_category_id=self.cat.id, declared_weight_kg=50, declared_cft=60)
        for bad in (-3, "abc"):
            with self.assertRaises(UnresolvedLogisticsFareError):
                self._book(goods_category_id=self.cat.id, declared_cft=bad)

    def test_declared_volume_cannot_lower_catalog_volume(self):
        from service_requests.services.cargo_fitment import resolve_cargo_payload
        out = resolve_cargo_payload(cargo_items=[{"goods_item_id": self.chair.id, "quantity": 10}], declared_cft=1)
        self.assertEqual(out["total_cft"], Decimal("10.00"))


class MalformedCargoItemsTypeTests(TestCase):
    def test_non_list_cargo_items_is_rejected_not_ignored(self):
        from service_requests.services.cargo_fitment import CargoValidationError, resolve_cargo_payload
        with self.assertRaises(CargoValidationError) as cm:
            resolve_cargo_payload(cargo_items="chairs", strict=True)
        self.assertEqual(cm.exception.code, "INVALID_CARGO_ENTRY")

    def test_empty_or_none_cargo_items_still_fine(self):
        from service_requests.services.cargo_fitment import resolve_cargo_payload
        resolve_cargo_payload(cargo_items=None)
        resolve_cargo_payload(cargo_items=[])
