from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from companies.models import Company
from inventory.models import Vegetable, VegetableCategory, VegetableStockMovement
from service_requests.models import Package, Service, CatalogCategory, PackageStatus
from inventory.services.vegetable_catalog_service import (
    generate_catalog_template_csv,
    preview_catalog_upload,
    commit_catalog_upload,
)


class VegetableCatalogUploadTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalTrack Services", slug="calservices")
        self.admin_user = User.objects.create_user(
            username="admin_catalog",
            email="catalog@test.com",
            password="testpassword",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin_user)

        self.cat_top = CatalogCategory.objects.create(name="Vegetables", slug="vegetables_cat")
        self.veg_service = Service.objects.create(category=self.cat_top, name="Farm-Fresh Vegetables", slug="vegetables")

        self.veg_category = VegetableCategory.objects.create(
            org=self.company,
            name="Daily Staples & Aromatics",
            slug="daily-staples",
            sort_order=1,
        )

        # Pre-existing package & vegetable
        self.existing_pkg = Package.objects.create(
            service=self.veg_service,
            name="Onion Country",
            slug="veg-onion-country",
            base_price=Decimal("40.00"),
            offer_price=Decimal("45.00"),
            duration="1kg",
            status=PackageStatus.ACTIVE,
        )
        self.existing_veg = Vegetable.objects.create(
            org=self.company,
            package=self.existing_pkg,
            category=self.veg_category,
            name="Onion Country (Produce)",
            sku="VEG-ONION-COUNTRY",
            stock_quantity_grams=50000,
            default_daily_quantity_grams=50000,
        )
        self.existing_pkg.stock_item = self.existing_veg
        self.existing_pkg.save()

    def test_template_download_endpoint(self):
        resp = self.client.get("/api/inventory/vegetables/catalog-template/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp["Content-Type"], "text/csv")
        self.assertIn("sku,name,category,price,mrp", resp.content.decode("utf-8"))

    def test_preview_and_reject_unknown_category(self):
        rows = [
            {
                "sku": "VEG-POTATO-AGRA",
                "name": "Agra Potato",
                "category": "Unknown Super Category",  # Does not exist
                "price": "30.00",
                "mrp": "35.00",
                "pack_size": "1kg",
                "stock_quantity_kg": "40",
            }
        ]
        preview = preview_catalog_upload(rows, company=self.company)
        self.assertEqual(preview["summary"]["to_reject"], 1)
        self.assertEqual(preview["summary"]["to_create"], 0)
        self.assertIn("Category 'Unknown Super Category' does not exist", preview["rows"][0]["error"])

    def test_preview_create_and_update_matching(self):
        rows = [
            # 1. Update existing Onion Country
            {
                "sku": "VEG-ONION-COUNTRY",
                "name": "Onion Country",
                "category": "Daily Staples & Aromatics",
                "price": "42.00",
                "mrp": "48.00",
                "pack_size": "1kg",
                "stock_quantity_kg": "60",
                "default_daily_stock_kg": "60",
            },
            # 2. Create new Ginger
            {
                "sku": "VEG-GINGER-FRESH",
                "name": "Fresh Ginger",
                "category": "Daily Staples & Aromatics",
                "price": "80.00",
                "mrp": "90.00",
                "pack_size": "250g",
                "stock_quantity_kg": "15",
                "default_daily_stock_kg": "15",
            }
        ]
        preview = preview_catalog_upload(rows, company=self.company)
        self.assertEqual(preview["summary"]["to_update"], 1)
        self.assertEqual(preview["summary"]["to_create"], 1)
        self.assertEqual(preview["summary"]["to_reject"], 0)
        self.assertEqual(preview["rows"][0]["action"], "update")
        self.assertEqual(preview["rows"][1]["action"], "create")

    def test_commit_catalog_upload(self):
        rows = [
            # Update Onion Country
            {
                "sku": "VEG-ONION-COUNTRY",
                "name": "Onion Country",
                "category_id": self.veg_category.id,
                "price": 42.0,
                "mrp": 48.0,
                "pack_size": "1kg",
                "stock_quantity_kg": 60.0,
                "default_daily_stock_kg": 60.0,
                "action": "update",
                "matched_package_id": self.existing_pkg.id,
                "matched_vegetable_id": self.existing_veg.id,
            },
            # Create Fresh Ginger
            {
                "sku": "VEG-GINGER-FRESH",
                "name": "Fresh Ginger",
                "category_id": self.veg_category.id,
                "price": 80.0,
                "mrp": 90.0,
                "pack_size": "250g",
                "stock_quantity_kg": 15.0,
                "default_daily_stock_kg": 15.0,
                "action": "create",
            }
        ]

        commit_res = commit_catalog_upload(rows, company=self.company, user=self.admin_user)
        self.assertTrue(commit_res["success"])
        self.assertEqual(commit_res["created_count"], 1)
        self.assertEqual(commit_res["updated_count"], 1)

        # Verify updated Onion
        self.existing_pkg.refresh_from_db()
        self.existing_veg.refresh_from_db()
        self.assertEqual(self.existing_pkg.base_price, Decimal("42.00"))
        self.assertEqual(self.existing_veg.stock_quantity_grams, 60000)

        # Verify created Ginger
        ginger_pkg = Package.objects.filter(name="Fresh Ginger").first()
        self.assertIsNotNone(ginger_pkg)
        self.assertEqual(ginger_pkg.base_price, Decimal("80.00"))
        self.assertIsNotNone(ginger_pkg.stock_item)
        self.assertEqual(ginger_pkg.stock_item.stock_quantity_grams, 15000)
        self.assertEqual(ginger_pkg.stock_item.category, self.veg_category)
