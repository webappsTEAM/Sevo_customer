"""
orders/tests/test_grocery_checkout.py

Phase 3 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
adversarial tests for the hard-blocking grocery checkout path -- last-unit
depletion, partial-stock scenarios, and confirming nothing is created or
charged when stock reservation fails.
"""
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from inventory.services import vegetable_stock_service
from inventory.models import VegetableStockMovement
from carts.models import Cart, CartItem, CartType, CartStatus
from orders.models import GroceryOrder, GroceryOrderItem
from vegetable_orders.models import VegetableOrder, VegetableOrderItem

User = get_user_model()


class GroceryCheckoutTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="grocery_customer", email="gc@gmail.com", phone="9876543210",
            password="Password123!", role="customer", company=self.company,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.customer)

        category = CatalogCategory.objects.create(name="Farm Produce", slug="farm-produce", is_active=True)
        service = Service.objects.create(category=category, name="Fresh Vegetables", slug="vegetables", is_active=True)
        self.pkg_tomato = Package.objects.create(
            service=service, name="Fresh Country Tomato", slug="fresh-country-tomato",
            base_price=Decimal("40.00"), duration="500g", status="ACTIVE",
        )
        self.pkg_potato = Package.objects.create(
            service=service, name="Organic Potato", slug="organic-potato",
            base_price=Decimal("35.00"), duration="1kg", status="ACTIVE",
        )

    def _add_to_cart(self, package, quantity):
        return self.client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": package.id, "quantity": quantity},
            format="json",
        )

    def test_checkout_succeeds_and_deducts_exact_stock(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)  # 1000g, pack=500g
        self._add_to_cart(self.pkg_tomato, 2)  # 2 packs * 500g = 1000g

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St, Hosur"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["data"]["status"], "PLACED")
        self.assertEqual(Decimal(res.data["data"]["total_amount"]), Decimal("80.00"))

        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)

        order = VegetableOrder.objects.get(id=res.data["data"]["id"])
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(order.items.first().quantity_grams, 1000)

        # Cart is checked out, not reusable
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.CHECKED_OUT)

    def test_checkout_on_exact_last_unit_succeeds(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 500, "g", self.company)  # exactly 1 pack
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 0)

    def test_checkout_hard_blocks_on_insufficient_stock_and_creates_nothing(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)  # 1000g available
        self._add_to_cart(self.pkg_tomato, 3)  # needs 1500g

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(
            res.data["message"],
            "This quantity is no longer available. Please reduce the quantity and try again.",
        )

        # Nothing created
        self.assertFalse(VegetableOrder.objects.exists())
        self.assertFalse(VegetableOrderItem.objects.exists())
        self.assertFalse(GroceryOrderItem.objects.exists())
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 1000)

        # Cart remains ACTIVE and untouched -- customer can retry
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.ACTIVE)
        self.assertEqual(cart.items.count(), 1)

    def test_partial_stock_across_multiple_items_blocks_entire_checkout(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        vegetable_stock_service.add_stock(self.pkg_potato, 500, "g", self.company)  # not enough for 2 packs (2kg)

        self._add_to_cart(self.pkg_tomato, 1)   # fine: 500g of 10000g
        self._add_to_cart(self.pkg_potato, 2)   # needs 2000g, only 500g available

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

        # Atomic rollback: tomato stock must remain untouched even though it had enough
        self.pkg_tomato.stock_item.refresh_from_db()
        self.assertEqual(self.pkg_tomato.stock_item.stock_quantity_grams, 10000)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_with_empty_cart_rejected(self):
        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_requires_delivery_address(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post("/api/orders/grocery/checkout/", {}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertFalse(VegetableOrder.objects.exists())

    def test_checkout_booking_ref_matches_order_number_on_stock_movement(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)

        res = self.client.post(
            "/api/orders/grocery/checkout/",
            {"delivery_address": "123 Market St"},
            format="json",
        )
        order_number = res.data["data"]["order_number"]
        movement = VegetableStockMovement.objects.filter(
            booking_ref=order_number, movement_type=VegetableStockMovement.MovementType.SOLD,
        ).first()
        self.assertIsNotNone(movement)

    def test_second_checkout_after_success_needs_new_active_cart(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 10, "kg", self.company)
        self._add_to_cart(self.pkg_tomato, 1)
        self.client.post("/api/orders/grocery/checkout/", {"delivery_address": "123 Market St"}, format="json")

        # No ACTIVE cart left -- a second checkout attempt is rejected as empty, not double-charged
        res = self.client.post("/api/orders/grocery/checkout/", {"delivery_address": "123 Market St"}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(VegetableOrder.objects.count(), 1)
