"""
carts/tests/test_carts.py

Phase 1 / Phase 7 coverage (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md):
Cart/CartItem CRUD + the "one ACTIVE cart per (customer, cart_type)" constraint.
"""
from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package
from carts.models import Cart, CartItem, CartType, CartStatus

User = get_user_model()


class CartModelConstraintTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices Tamil Nadu", slug="calservices-tn")
        self.customer = User.objects.create_user(
            username="customer_one", email="c1@gmail.com", phone="9876543210",
            password="Password123!", role="customer", company=self.company,
        )

    def test_only_one_active_cart_per_customer_and_type(self):
        Cart.objects.create(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Cart.objects.create(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE)

    def test_checked_out_cart_does_not_block_new_active_cart(self):
        Cart.objects.create(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.CHECKED_OUT)
        # Should not raise -- only ACTIVE carts are constrained.
        Cart.objects.create(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE)

    def test_independent_active_carts_per_type(self):
        Cart.objects.create(customer=self.customer, cart_type=CartType.SERVICES, status=CartStatus.ACTIVE)
        # Should not raise -- services and daily_essentials are independent.
        Cart.objects.create(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE)


class CartAPITests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices Tamil Nadu", slug="calservices-tn")
        self.customer = User.objects.create_user(
            username="customer_two", email="c2@gmail.com", phone="9876543211",
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
            base_price=Decimal("35.00"), offer_price=Decimal("30.00"), duration="1kg", status="ACTIVE",
        )

    def test_get_cart_with_no_active_cart_returns_empty_shape(self):
        res = self.client.get("/api/carts/daily_essentials/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["items"], [])

    def test_unknown_cart_type_rejected(self):
        res = self.client.get("/api/carts/groceries/")
        self.assertEqual(res.status_code, 400)

    def test_add_item_creates_cart_and_snapshots_price(self):
        res = self.client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": self.pkg_tomato.id, "quantity": 2},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Decimal(res.data["data"]["unit_price_snapshot"]), Decimal("40.00"))
        self.assertEqual(res.data["data"]["quantity"], 2)

        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.DAILY_ESSENTIALS)
        self.assertEqual(cart.status, CartStatus.ACTIVE)
        self.assertEqual(cart.items.count(), 1)

    def test_add_item_uses_offer_price_when_present(self):
        res = self.client.post(
            "/api/carts/daily_essentials/items/",
            {"package_id": self.pkg_potato.id, "quantity": 1},
            format="json",
        )
        self.assertEqual(Decimal(res.data["data"]["unit_price_snapshot"]), Decimal("30.00"))

    def test_adding_same_package_twice_merges_quantity(self):
        self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 2}, format="json")
        res = self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 3}, format="json")
        self.assertEqual(res.data["data"]["quantity"], 5)
        self.assertEqual(CartItem.objects.filter(cart__customer=self.customer).count(), 1)

    def test_price_change_after_add_does_not_affect_existing_snapshot(self):
        res = self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 1}, format="json")
        item_id = res.data["data"]["id"]

        self.pkg_tomato.base_price = Decimal("55.00")
        self.pkg_tomato.save(update_fields=["base_price"])

        item = CartItem.objects.get(id=item_id)
        self.assertEqual(item.unit_price_snapshot, Decimal("40.00"))

    def test_update_item_quantity(self):
        res = self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 1}, format="json")
        item_id = res.data["data"]["id"]

        res = self.client.patch(f"/api/carts/daily_essentials/items/{item_id}/", {"quantity": 4}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["data"]["quantity"], 4)

    def test_delete_item_removes_it(self):
        res = self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 1}, format="json")
        item_id = res.data["data"]["id"]

        res = self.client.delete(f"/api/carts/daily_essentials/items/{item_id}/")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(CartItem.objects.filter(id=item_id).exists())

    def test_cannot_touch_item_in_other_customers_cart(self):
        other = User.objects.create_user(
            username="customer_three", email="c3@gmail.com", phone="9876543212",
            password="Password123!", role="customer", company=self.company,
        )
        other_cart = Cart.objects.create(customer=other, cart_type=CartType.DAILY_ESSENTIALS, status=CartStatus.ACTIVE)
        other_item = CartItem.objects.create(cart=other_cart, package=self.pkg_tomato, quantity=1, unit_price_snapshot=Decimal("40.00"))

        res = self.client.patch(f"/api/carts/daily_essentials/items/{other_item.id}/", {"quantity": 9}, format="json")
        self.assertEqual(res.status_code, 404)

    def test_services_and_daily_essentials_carts_are_independent(self):
        self.client.post("/api/carts/daily_essentials/items/", {"package_id": self.pkg_tomato.id, "quantity": 1}, format="json")
        res = self.client.get("/api/carts/services/")
        self.assertEqual(res.data["data"]["items"], [])

    def test_unauthenticated_request_rejected(self):
        anon_client = APIClient()
        res = anon_client.get("/api/carts/daily_essentials/")
        self.assertEqual(res.status_code, 401)
