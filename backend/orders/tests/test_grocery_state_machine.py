"""
orders/tests/test_grocery_state_machine.py

Phase 5 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
valid/invalid GroceryOrder.status transitions, and idempotent stock release
on cancellation.
"""
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from inventory.services import vegetable_stock_service
from inventory.models import VegetableStockMovement
from orders.models import GroceryOrder, GroceryOrderItem

User = get_user_model()


class GroceryStateMachineTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="sm_customer", email="sm@gmail.com", phone="9876500000",
            password="Password123!", role="customer", company=self.company,
        )
        category = CatalogCategory.objects.create(name="Farm Produce", slug="farm-produce", is_active=True)
        service = Service.objects.create(category=category, name="Fresh Vegetables", slug="vegetables", is_active=True)
        self.pkg_tomato = Package.objects.create(
            service=service, name="Fresh Country Tomato", slug="fresh-country-tomato",
            base_price=Decimal("40.00"), duration="500g", status="ACTIVE",
        )

    def _placed_order_with_reserved_stock(self, grams=1000):
        vegetable_stock_service.add_stock(self.pkg_tomato, grams, "g", self.company)
        order = GroceryOrder.objects.create(
            customer=self.customer, total_amount=Decimal("80.00"), delivery_address="123 Market St",
        )
        vegetable_stock_service.reserve_stock_for_booking_items(
            [{"product": self.pkg_tomato, "quantity": grams, "unit": "g"}],
            self.company,
            booking_ref=order.order_number,
        )
        GroceryOrderItem.objects.create(
            order=order, package=self.pkg_tomato, quantity_grams=grams,
            unit_price_snapshot=Decimal("40.00"), line_amount=Decimal("80.00"),
        )
        return order

    def test_valid_linear_progression(self):
        order = self._placed_order_with_reserved_stock()
        order.transition_to(GroceryOrder.Status.PACKED)
        self.assertEqual(order.status, GroceryOrder.Status.PACKED)

        order.transition_to(GroceryOrder.Status.OUT_FOR_DELIVERY)
        self.assertEqual(order.status, GroceryOrder.Status.OUT_FOR_DELIVERY)

        order.transition_to(GroceryOrder.Status.DELIVERED)
        self.assertEqual(order.status, GroceryOrder.Status.DELIVERED)

    def test_cannot_skip_states(self):
        order = self._placed_order_with_reserved_stock()
        with self.assertRaises(ValidationError):
            order.transition_to(GroceryOrder.Status.OUT_FOR_DELIVERY)
        self.assertEqual(order.status, GroceryOrder.Status.PLACED)

    def test_delivered_is_terminal(self):
        order = self._placed_order_with_reserved_stock()
        order.transition_to(GroceryOrder.Status.PACKED)
        order.transition_to(GroceryOrder.Status.OUT_FOR_DELIVERY)
        order.transition_to(GroceryOrder.Status.DELIVERED)

        with self.assertRaises(ValidationError):
            order.transition_to(GroceryOrder.Status.CANCELLED)

    def test_cannot_cancel_once_out_for_delivery(self):
        order = self._placed_order_with_reserved_stock()
        order.transition_to(GroceryOrder.Status.PACKED)
        order.transition_to(GroceryOrder.Status.OUT_FOR_DELIVERY)

        with self.assertRaises(ValidationError):
            order.transition_to(GroceryOrder.Status.CANCELLED)

    def test_cancel_from_placed_restores_stock(self):
        order = self._placed_order_with_reserved_stock(grams=1000)
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)

        order.transition_to(GroceryOrder.Status.CANCELLED)

        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 1000)
        self.assertEqual(order.status, GroceryOrder.Status.CANCELLED)

    def test_cancel_from_packed_restores_stock(self):
        order = self._placed_order_with_reserved_stock(grams=500)
        order.transition_to(GroceryOrder.Status.PACKED)
        order.transition_to(GroceryOrder.Status.CANCELLED)

        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 500)

    def test_cancellation_stock_release_is_idempotent(self):
        order = self._placed_order_with_reserved_stock(grams=1000)
        order.transition_to(GroceryOrder.Status.CANCELLED)

        # Calling release again directly (e.g. a retried admin action) must not double-restore.
        from inventory.services.vegetable_stock_service import release_stock_for_booking
        release_stock_for_booking(type("X", (), {"request_id": order.order_number, "company": self.company})())

        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 1000)
        self.assertEqual(
            VegetableStockMovement.objects.filter(
                booking_ref=order.order_number,
                movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
            ).count(),
            1,
        )

    def test_invalid_target_status_string_rejected(self):
        order = self._placed_order_with_reserved_stock()
        with self.assertRaises(ValidationError):
            order.transition_to("NOT_A_REAL_STATUS")
