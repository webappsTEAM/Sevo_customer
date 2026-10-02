from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from companies.models import Company
from inventory.models import Vegetable, VegetableCategory
from service_requests.models import Package, Service, CatalogCategory, PackageStatus
from vegetable_orders.models import VegetableOrder, VegetableOrderItem


class VegetableAdminOrdersTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalTrack Services", slug="calservices")
        self.admin_user = User.objects.create_user(
            username="admin_orders",
            email="orders_admin@test.com",
            password="testpassword",
            role=User.Role.ADMIN,
        )
        self.customer = User.objects.create_user(
            username="customer_user",
            email="cust@test.com",
            password="testpassword",
            first_name="Ravi",
            last_name="Kumar",
            phone="+919876543210",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.cat_top = CatalogCategory.objects.create(name="Vegetables", slug="veg_cat")
        self.service = Service.objects.create(category=self.cat_top, name="Fresh Veggies", slug="vegetables")
        self.pkg = Package.objects.create(
            service=self.service,
            name="Tomato 1kg",
            slug="tomato-1kg",
            base_price=Decimal("40.00"),
            status=PackageStatus.ACTIVE,
        )
        self.veg = Vegetable.objects.create(
            org=self.company,
            package=self.pkg,
            name="Tomato 1kg (Produce)",
            sku="VEG-TOMATO-1KG",
            stock_quantity_grams=50000,
            default_daily_quantity_grams=50000,
        )
        self.pkg.stock_item = self.veg
        self.pkg.save()

        # Create Order
        self.order = VegetableOrder.objects.create(
            order_number="VEG-20260920-0001",
            customer=self.customer,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("80.00"),
            delivery_address="123 Green Street, Hosur",
        )
        self.order_item = VegetableOrderItem.objects.create(
            order=self.order,
            package=self.pkg,
            quantity_grams=2000,
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("80.00"),
        )

    def test_admin_order_list_and_filter(self):
        resp = self.client.get("/api/vegetable-orders/admin/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])
        self.assertGreaterEqual(resp.data["total_count"], 1)
        self.assertEqual(resp.data["status_counts"]["PLACED"], 1)
        self.assertEqual(resp.data["data"][0]["order_number"], "VEG-20260920-0001")
        self.assertEqual(resp.data["data"][0]["customer"]["name"], "Ravi Kumar")

        # Search filter
        search_resp = self.client.get("/api/vegetable-orders/admin/?search=Ravi")
        self.assertEqual(len(search_resp.data["data"]), 1)

    def test_admin_order_detail(self):
        resp = self.client.get(f"/api/vegetable-orders/admin/{self.order.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["data"]["id"], self.order.id)
        self.assertEqual(len(resp.data["data"]["items"]), 1)
        self.assertEqual(resp.data["data"]["items"][0]["name"], "Tomato 1kg")

    def test_admin_order_transition_valid_pipeline(self):
        # 1. PLACED -> PACKED
        resp1 = self.client.post(f"/api/vegetable-orders/admin/{self.order.id}/transition/", {
            "target_status": "PACKED"
        }, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, VegetableOrder.Status.PACKED)

        # 2. PACKED -> OUT_FOR_DELIVERY
        resp2 = self.client.post(f"/api/vegetable-orders/admin/{self.order.id}/transition/", {
            "target_status": "OUT_FOR_DELIVERY"
        }, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, VegetableOrder.Status.OUT_FOR_DELIVERY)

        # 3. OUT_FOR_DELIVERY -> DELIVERED
        resp3 = self.client.post(f"/api/vegetable-orders/admin/{self.order.id}/transition/", {
            "target_status": "DELIVERED"
        }, format="json")
        self.assertEqual(resp3.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, VegetableOrder.Status.DELIVERED)

    def test_admin_order_transition_illegal_rejected(self):
        # Cannot transition DELIVERED to CANCELLED or PLACED
        self.order.status = VegetableOrder.Status.DELIVERED
        self.order.save()

        resp = self.client.post(f"/api/vegetable-orders/admin/{self.order.id}/transition/", {
            "target_status": "CANCELLED"
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(resp.data["success"])
        self.assertIn("Cannot transition", resp.data["message"])
