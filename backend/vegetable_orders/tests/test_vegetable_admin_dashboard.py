from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from companies.models import Company
from inventory.models import Vegetable, VegetableCategory
from service_requests.models import Package, Service, CatalogCategory, PackageStatus
from vegetable_orders.models import VegetableOrder, VegetableOrderItem


class VegetableAdminDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalTrack Services", slug="calservices")
        self.admin_user = User.objects.create_user(
            username="admin_dash",
            email="dash_admin@test.com",
            password="testpassword",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.cat_top = CatalogCategory.objects.create(name="Vegetables", slug="veg_cat_dash")
        self.service = Service.objects.create(category=self.cat_top, name="Fresh Veggies", slug="vegetables")
        self.category = VegetableCategory.objects.create(
            org=self.company,
            name="Daily Staples",
            slug="daily-staples-dash",
            sort_order=1,
        )

        # 1. Normal Stock item (50kg / 50kg default = 100%)
        self.pkg1 = Package.objects.create(
            service=self.service,
            name="Potato 1kg",
            slug="potato-1kg",
            base_price=Decimal("30.00"),
            status=PackageStatus.ACTIVE,
        )
        self.veg1 = Vegetable.objects.create(
            org=self.company,
            package=self.pkg1,
            category=self.category,
            name="Potato 1kg (Produce)",
            sku="VEG-POTATO-1",
            stock_quantity_grams=50000,
            default_daily_quantity_grams=50000,
        )
        self.pkg1.stock_item = self.veg1
        self.pkg1.save()

        # 2. Low Stock item (10kg / 50kg default = 20% <= 25% threshold)
        self.pkg2 = Package.objects.create(
            service=self.service,
            name="Onion 1kg",
            slug="onion-1kg",
            base_price=Decimal("40.00"),
            status=PackageStatus.ACTIVE,
        )
        self.veg2 = Vegetable.objects.create(
            org=self.company,
            package=self.pkg2,
            category=self.category,
            name="Onion 1kg (Produce)",
            sku="VEG-ONION-1",
            stock_quantity_grams=10000,
            default_daily_quantity_grams=50000,
        )
        self.pkg2.stock_item = self.veg2
        self.pkg2.save()

        # Create Order today
        self.order = VegetableOrder.objects.create(
            order_number="VEG-DASH-001",
            customer=self.admin_user,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("150.00"),
            delivery_address="Hosur Central",
        )

    def test_dashboard_stats_and_low_stock_evaluation(self):
        resp = self.client.get("/api/vegetable-orders/admin/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["success"])

        # Check today stats
        today_stats = resp.data["today_stats"]
        self.assertEqual(today_stats["today_orders_count"], 1)
        self.assertEqual(today_stats["today_revenue"], 150.00)
        self.assertEqual(today_stats["pending_packing"], 1)

        # Check low stock alerts evaluated by baseline
        low_stock_alerts = resp.data["low_stock_alerts"]
        # Onion (10kg / 50kg = 20%) should be flagged; Potato (50kg / 50kg = 100%) should not
        flagged_names = [item["name"] for item in low_stock_alerts]
        self.assertIn("Onion 1kg", flagged_names)
        self.assertNotIn("Potato 1kg", flagged_names)
