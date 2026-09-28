"""
orders/tests/test_checkout_orchestration.py

Phase 4 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
proves a grocery failure never rolls back or blocks a service booking,
and vice versa -- the two checkouts run as fully independent calls, never
inside a shared transaction. Also covers the explicit cart_types contract
(the backend never infers "both").
"""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package, ServiceRequest
from inventory.services import vegetable_stock_service
from carts.models import Cart, CartType, CartStatus
from orders.models import GroceryOrder
from vegetable_orders.models import VegetableOrder

User = get_user_model()


class CheckoutOrchestrationTests(TestCase):
    def setUp(self):
        # BookingCreateView (invoked here via the service leg) fires
        # WorkforceIntegrationService.dispatch_job on a real background
        # thread as a best-effort notification (see its own comment in
        # service_requests/views.py -- the vendor app dispatches
        # independently anyway via its own polling loop). That thread's own
        # DB connection races the test's open transaction under SQLite,
        # so it's mocked out here -- same pattern already used for this
        # exact view in service_requests/tests/test_gt_hardening_final.py.
        self.dispatch_patcher = patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job")
        self.dispatch_patcher.start()
        self.addCleanup(self.dispatch_patcher.stop)

        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="checkout_customer", email="co@gmail.com", phone="9876533333",
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

        elec_cat = CatalogCategory.objects.create(name="Electrician", slug="electrician", is_active=True)
        Service.objects.create(category=elec_cat, name="Fan Repair", slug="electrician", is_active=True)

        from datetime import timedelta
        self.service_payload = {
            "customer_name": "Ravi Kumar",
            "phone": "9876533333",
            "service_category": "electrician",
            "issue_title": "Fan Repair",
            "address": "123 Market St, Hosur",
            "latitude": 12.7409,
            "longitude": 77.8253,
            "preferred_date": (timezone.localdate() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "cart_data": [{"id": "electrician-fan-repair", "name": "Fan Repair", "quantity": 1}],
        }

    def _add_tomato_to_cart(self, quantity):
        self.client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": self.pkg_tomato.id, "quantity": quantity},
            format="json",
        )

    def test_missing_cart_types_rejected(self):
        res = self.client.post("/api/orders/checkout/", {}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_unknown_cart_type_rejected(self):
        res = self.client.post("/api/orders/checkout/", {"cart_types": ["groceries"]}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_services_only_does_not_touch_grocery(self):
        res = self.client.post(
            "/api/orders/checkout/",
            {"cart_types": ["services"], "service": self.service_payload},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["data"]["grocery_order"])
        self.assertTrue(res.data["data"]["service_order"]["success"])
        self.assertTrue(ServiceRequest.objects.filter(customer_name="Ravi Kumar").exists())

    def test_grocery_only_does_not_touch_services(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 1, "kg", self.company)
        self._add_tomato_to_cart(2)

        res = self.client.post(
            "/api/orders/checkout/",
            {"cart_types": ["daily_essentials"], "grocery": {"delivery_address": "123 Market St"}},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(res.data["data"]["service_order"])
        self.assertTrue(res.data["data"]["grocery_order"]["success"])
        self.assertFalse(ServiceRequest.objects.exists())

    def test_grocery_failure_does_not_block_or_rollback_service_booking(self):
        # Some stock tracked, but not enough -- grocery leg must fail with
        # insufficient stock. (An untracked package -- no stock ever added,
        # no InventoryItem yet -- is treated as unmanaged and skipped by
        # reserve_stock_for_booking_items, so it would wrongly succeed here.)
        vegetable_stock_service.add_stock(self.pkg_tomato, 500, "g", self.company)
        self._add_tomato_to_cart(5)  # needs 5 * 500g = 2500g, only 500g available

        res = self.client.post(
            "/api/orders/checkout/",
            {
                "cart_types": ["services", "daily_essentials"],
                "service": self.service_payload,
                "grocery": {"delivery_address": "123 Market St"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)

        # Service leg succeeded independently despite the grocery failure.
        self.assertTrue(res.data["data"]["service_order"]["success"])
        self.assertTrue(ServiceRequest.objects.filter(customer_name="Ravi Kumar").exists())

        # Grocery leg reports its own failure, does not raise, nothing persisted.
        self.assertFalse(res.data["data"]["grocery_order"]["success"])
        self.assertFalse(VegetableOrder.objects.exists())

        # Grocery cart is untouched -- still ACTIVE with its item, so the
        # customer can retry the grocery leg on its own.
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.ACTIVE)

    def test_both_succeed_independently_when_both_confirmed(self):
        vegetable_stock_service.add_stock(self.pkg_tomato, 5, "kg", self.company)
        self._add_tomato_to_cart(2)

        res = self.client.post(
            "/api/orders/checkout/",
            {
                "cart_types": ["services", "daily_essentials"],
                "service": self.service_payload,
                "grocery": {"delivery_address": "123 Market St"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["data"]["service_order"]["success"])
        self.assertTrue(res.data["data"]["grocery_order"]["success"])
        self.assertTrue(ServiceRequest.objects.filter(customer_name="Ravi Kumar").exists())
        self.assertTrue(VegetableOrder.objects.filter(customer=self.customer).exists())

    def test_unauthenticated_rejected(self):
        anon = APIClient()
        res = anon.post("/api/orders/checkout/", {"cart_types": ["services"]}, format="json")
        self.assertEqual(res.status_code, 401)
