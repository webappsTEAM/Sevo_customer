from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User
from companies.models import Company
from inventory.models import Vegetable, VegetableCategory
from service_requests.models import Package, Service, CatalogCategory, PackageStatus


class VegetableCategoryAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalTrack Services", slug="calservices")
        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@test.com",
            password="testpassword",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin_user)

    def test_list_and_create_vegetable_category(self):
        # 1. Create Category
        create_resp = self.client.post("/api/inventory/vegetable-categories/", {
            "name": "Organic Greens",
            "description": "Locally grown pesticide-free greens",
            "sort_order": 1,
            "image": "/mockups/greens.png",
        }, format="json")
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_resp.data["success"])
        cat_id = create_resp.data["data"]["id"]
        self.assertEqual(create_resp.data["data"]["name"], "Organic Greens")
        self.assertEqual(create_resp.data["data"]["slug"], "organic-greens")

        # 2. List Categories
        list_resp = self.client.get("/api/inventory/vegetable-categories/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertTrue(list_resp.data["success"])
        self.assertGreaterEqual(len(list_resp.data["data"]), 1)
        found = any(c["id"] == cat_id for c in list_resp.data["data"])
        self.assertTrue(found)

    def test_update_and_delete_vegetable_category(self):
        cat = VegetableCategory.objects.create(
            org=self.company,
            name="Exotics",
            slug="exotics",
            description="Exotic produce",
            sort_order=5,
        )
        veg = Vegetable.objects.create(
            org=self.company,
            name="Broccoli (Produce)",
            sku="VEG-BROCCOLI",
            category=cat,
            stock_quantity_grams=10000,
        )

        # Update
        patch_resp = self.client.patch(f"/api/inventory/vegetable-categories/{cat.id}/", {
            "name": "Gourmet & Exotics",
            "sort_order": 10,
        }, format="json")
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data["data"]["name"], "Gourmet & Exotics")
        self.assertEqual(patch_resp.data["data"]["sort_order"], 10)

        # Delete (should set category to null on linked vegetable)
        del_resp = self.client.delete(f"/api/inventory/vegetable-categories/{cat.id}/")
        self.assertEqual(del_resp.status_code, status.HTTP_200_OK)
        self.assertFalse(VegetableCategory.objects.filter(id=cat.id).exists())

        veg.refresh_from_db()
        self.assertIsNone(veg.category)
