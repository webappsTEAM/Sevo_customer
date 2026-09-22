"""
orders/tests/test_my_orders.py

Phase 6 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
confirms the merged "My Orders" list is correctly sorted and shaped from
both source tables (Order and GroceryOrder), and stays customer-scoped.
"""
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from orders.models import Order, GroceryOrder, GroceryOrderItem

User = get_user_model()


class MyOrdersTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="mo_customer", email="mo@gmail.com", phone="9876511111",
            password="Password123!", role="customer", company=self.company,
        )
        self.other_customer = User.objects.create_user(
            username="mo_other", email="mo_other@gmail.com", phone="9876522222",
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

    def test_empty_when_no_orders(self):
        res = self.client.get("/api/orders/my/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"], [])

    def test_merges_and_shapes_both_order_types(self):
        service_order = Order.objects.create(customer=self.customer, total_amount=Decimal("500.00"))
        grocery_order = GroceryOrder.objects.create(
            customer=self.customer, total_amount=Decimal("80.00"), delivery_address="123 Market St",
        )
        GroceryOrderItem.objects.create(
            order=grocery_order, package=self.pkg_tomato, quantity_grams=1000,
            unit_price_snapshot=Decimal("40.00"), line_amount=Decimal("80.00"),
        )

        res = self.client.get("/api/orders/my/")
        self.assertEqual(res.status_code, 200)
        types = {entry["order_type"] for entry in res.data["data"]}
        self.assertEqual(types, {"service", "grocery"})

        grocery_entry = next(e for e in res.data["data"] if e["order_type"] == "grocery")
        self.assertEqual(grocery_entry["order_number"], grocery_order.order_number)
        self.assertEqual(grocery_entry["status_label"], "Placed")
        self.assertEqual(len(grocery_entry["detail"]["items"]), 1)
        self.assertEqual(grocery_entry["detail"]["items"][0]["package_name"], "Fresh Country Tomato")

        service_entry = next(e for e in res.data["data"] if e["order_type"] == "service")
        self.assertEqual(service_entry["order_number"], service_order.order_number)
        self.assertEqual(service_entry["status_label"], "Draft")

    def test_sorted_by_created_at_descending(self):
        older = GroceryOrder.objects.create(
            customer=self.customer, total_amount=Decimal("10.00"), delivery_address="A",
        )
        newer = Order.objects.create(customer=self.customer, total_amount=Decimal("20.00"))
        # created_at is auto_now_add -- force a deterministic order without sleeping.
        from django.utils import timezone
        from datetime import timedelta
        GroceryOrder.objects.filter(id=older.id).update(created_at=timezone.now() - timedelta(days=1))

        res = self.client.get("/api/orders/my/")
        ids = [(e["order_type"], e["id"]) for e in res.data["data"]]
        self.assertEqual(ids[0], ("service", newer.id))
        self.assertEqual(ids[1], ("grocery", older.id))

    def test_only_returns_current_customers_orders(self):
        GroceryOrder.objects.create(
            customer=self.other_customer, total_amount=Decimal("15.00"), delivery_address="Elsewhere",
        )
        res = self.client.get("/api/orders/my/")
        self.assertEqual(res.data["data"], [])

    def test_unauthenticated_rejected(self):
        anon = APIClient()
        res = anon.get("/api/orders/my/")
        self.assertEqual(res.status_code, 401)
