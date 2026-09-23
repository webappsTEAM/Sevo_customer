from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import Service, Package, PackageStatus, CatalogCategory
from inventory.models import VegetableCategory, Vegetable, ApprovalStatus

User = get_user_model()


class VegetableCategoryApprovalWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="CalTrack Services", slug="calservices")
        self.user = User.objects.create_user(
            username="admin_user",
            email="admin@test.com",
            password="password123",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.user)

        self.cat = CatalogCategory.objects.create(name="Fresh Produce")
        self.veg_service = Service.objects.create(
            category=self.cat,
            name="Farm-Fresh Vegetable",
            slug="vegetables",
            is_active=True,
        )

    def test_full_category_and_vegetable_approval_lifecycle(self):
        # 1. Vendor attempts to submit single request where price > mrp (should fail validation)
        invalid_pricing_payload = {
            "request_type": "category_with_vegetable",
            "category_name": "Organic Roots & Greens",
            "category_slug": "organic-roots-greens",
            "category_unit": "g",
            "vegetable_name": "Organic Beetroot",
            "price": 70.00,
            "mrp": 60.00,  # Invalid: selling price > mrp
            "pack_value": "500",
        }
        invalid_res = self.client.post("/api/inventory/vegetables/single-request/", invalid_pricing_payload, format="json")
        self.assertEqual(invalid_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price", invalid_res.data["errors"])

        # 2. Vendor submits new category with bundled vegetable and valid pricing/pack
        single_req_payload = {
            "request_type": "category_with_vegetable",
            "category_name": "Organic Roots & Greens",
            "category_slug": "organic-roots-greens",
            "category_description": "Farm-fresh organic root vegetables",
            "category_unit": "g",
            "vegetable_name": "Organic Beetroot",
            "vegetable_sku": "VEG-ORG-BEET",
            "vegetable_unit": "g",
            "price": 48.00,
            "mrp": 60.00,
            "pack_value": "500",
            "pack_size": "500 g",
            "image_url": "/mockups/beetroot.png",
        }
        res = self.client.post("/api/inventory/vegetables/single-request/", single_req_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cat_id = res.data["category"]["id"]
        veg_id = res.data["vegetable"]["id"]

        cat = VegetableCategory.objects.get(id=cat_id)
        veg = Vegetable.objects.get(id=veg_id)

        # Verify initial pending state and proposed price/pack-size
        self.assertEqual(cat.status, ApprovalStatus.PENDING)
        self.assertEqual(veg.status, ApprovalStatus.PENDING)
        self.assertEqual(veg.package.status, PackageStatus.DRAFT)
        self.assertIsNone(veg.stock_quantity_grams)
        self.assertEqual(veg.package.base_price, Decimal("48.00"))
        self.assertEqual(veg.package.offer_price, Decimal("60.00"))
        self.assertEqual(veg.package.duration, "500 g")

        # Gating check: Pending vegetable MUST NOT appear in active inventory
        inv_res = self.client.get("/api/inventory/vegetable-stock/")
        self.assertEqual(len(inv_res.data["data"]), 0)

        # Gating check: Pending vegetable MUST NOT appear on customer storefront
        store_res = self.client.get("/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(len(store_res.data["data"]), 0)

        # 3. Admin reviews and approves the category & bundled vegetable in one pass
        approve_res = self.client.post(f"/api/inventory/vegetable-categories/{cat_id}/review/", {
            "action": "APPROVE"
        }, format="json")
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        cat.refresh_from_db()
        veg.refresh_from_db()
        self.assertEqual(cat.status, ApprovalStatus.APPROVED)
        self.assertEqual(veg.status, ApprovalStatus.APPROVED)
        self.assertEqual(veg.package.status, PackageStatus.ACTIVE)

        # Confirm it now appears in Inventory pre-filled with proposed price & pack size
        inv_res2 = self.client.get("/api/inventory/vegetable-stock/")
        self.assertEqual(len(inv_res2.data["data"]), 1)
        item_stock = inv_res2.data["data"][0]
        self.assertEqual(item_stock["name"], "Organic Beetroot")
        self.assertEqual(item_stock["price"], 48.0)
        self.assertEqual(item_stock["mrp"], 60.0)
        self.assertEqual(item_stock["offer_percentage"], 20)
        self.assertEqual(item_stock["vegetable_gram"], "500 g")

        # Confirm it now appears on Customer Storefront
        store_res2 = self.client.get("/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(len(store_res2.data["data"]), 1)
        self.assertEqual(store_res2.data["data"][0]["name"], "Organic Beetroot")
        self.assertEqual(store_res2.data["data"][0]["vegetable_category_name"], "Organic Roots & Greens")

        # 4. Vendor submits a standalone vegetable under the already-approved category
        veg_req_payload = {
            "request_type": "vegetable",
            "category_id": cat.id,
            "vegetable_name": "Organic Red Radish",
            "vegetable_sku": "VEG-ORG-RADISH",
            "vegetable_unit": "g",
            "price": 25.00,
            "mrp": 30.00,
            "pack_value": "250",
            "image_url": "/mockups/radish.png",
        }
        res2 = self.client.post("/api/inventory/vegetables/single-request/", veg_req_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        veg2_id = res2.data["vegetable"]["id"]

        veg2 = Vegetable.objects.get(id=veg2_id)
        self.assertEqual(veg2.status, ApprovalStatus.PENDING)
        self.assertEqual(veg2.package.base_price, Decimal("25.00"))
        self.assertEqual(veg2.package.offer_price, Decimal("30.00"))
        self.assertEqual(veg2.package.duration, "250 g")

        # Pending veg2 must NOT show in inventory
        inv_res3 = self.client.get("/api/inventory/vegetable-stock/")
        self.assertEqual(len(inv_res3.data["data"]), 1)  # Only the 1st approved item

        # 5. Admin rejects the standalone vegetable with a required reason
        reject_res = self.client.post(f"/api/inventory/vegetables/{veg2_id}/review/", {
            "action": "REJECT",
            "rejection_reason": "Price is too high for this quantity"
        }, format="json")
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        veg2.refresh_from_db()
        self.assertEqual(veg2.status, ApprovalStatus.REJECTED)
        self.assertEqual(veg2.rejection_reason, "Price is too high for this quantity")

        # Rejected item stays hidden from inventory and storefront
        inv_res4 = self.client.get("/api/inventory/vegetable-stock/")
        self.assertEqual(len(inv_res4.data["data"]), 1)

        # 6. Vendor edits and resubmits the rejected vegetable request with adjusted price
        resubmit_payload = {
            "request_type": "vegetable",
            "resubmit_id": veg2.id,
            "resubmit_type": "vegetable",
            "category_id": cat.id,
            "vegetable_name": "Organic Red Radish Premium",
            "vegetable_sku": "VEG-ORG-RADISH-PREM",
            "vegetable_unit": "g",
            "price": 20.00,
            "mrp": 25.00,
            "pack_value": "250",
            "image_url": "/mockups/veg_radish.png",
            "description": "Premium fresh organic red radishes",
        }
        resubmit_res = self.client.post("/api/inventory/vegetables/single-request/", resubmit_payload, format="json")
        self.assertEqual(resubmit_res.status_code, status.HTTP_200_OK)

        veg2.refresh_from_db()
        # Verify it updated the SAME record ID and adjusted price
        self.assertEqual(veg2.id, veg2_id)
        self.assertEqual(veg2.status, ApprovalStatus.PENDING)
        self.assertEqual(veg2.rejection_reason, "")
        self.assertTrue(veg2.is_resubmission)
        self.assertEqual(veg2.package.base_price, Decimal("20.00"))
        self.assertEqual(veg2.package.offer_price, Decimal("25.00"))

        # 7. Admin approves the resubmitted vegetable
        approve_res2 = self.client.post(f"/api/inventory/vegetables/{veg2_id}/review/", {
            "action": "APPROVE"
        }, format="json")
        self.assertEqual(approve_res2.status_code, status.HTTP_200_OK)

        veg2.refresh_from_db()
        self.assertEqual(veg2.status, ApprovalStatus.APPROVED)

        # Both vegetables are now approved and visible in Inventory
        inv_res5 = self.client.get("/api/inventory/vegetable-stock/")
        self.assertEqual(len(inv_res5.data["data"]), 2)

        # Both vegetables are now live on Customer Storefront
        store_res3 = self.client.get("/api/catalog/services/?service_slug=vegetables&status=ACTIVE")
        self.assertEqual(len(store_res3.data["data"]), 2)

    def test_direct_admin_category_does_not_appear_in_approval_queue(self):
        # 1. Admin creates a category directly via Categories admin page endpoint
        admin_cat_res = self.client.post("/api/inventory/vegetable-categories/", {
            "name": "Direct Admin Root Cat",
            "slug": "direct-admin-root-cat",
        }, format="json")
        self.assertEqual(admin_cat_res.status_code, status.HTTP_201_CREATED)
        admin_cat_id = admin_cat_res.data["data"]["id"]
        admin_cat = VegetableCategory.objects.get(id=admin_cat_id)
        self.assertEqual(admin_cat.source, "DIRECT")
        self.assertEqual(admin_cat.status, ApprovalStatus.APPROVED)

        # Confirm it appears in the regular Categories list
        cats_list_res = self.client.get("/api/inventory/vegetable-categories/")
        self.assertTrue(any(c["id"] == admin_cat_id for c in cats_list_res.data["data"]))

        # Check Category Approval Queue - Direct category MUST NOT appear here
        queue_res = self.client.get("/api/inventory/vegetable-categories/approval-queue/?status=ALL")
        self.assertFalse(any(c["id"] == admin_cat_id for c in queue_res.data["data"]))

        # 2. Vendor submits a category request via Catalog Uploads single-request endpoint
        req_res = self.client.post("/api/inventory/vegetables/single-request/", {
            "request_type": "category",
            "category_name": "Requested Vendor Cat",
            "category_slug": "requested-vendor-cat",
        }, format="json")
        self.assertEqual(req_res.status_code, status.HTTP_201_CREATED)
        req_cat_id = req_res.data["category"]["id"]
        req_cat = VegetableCategory.objects.get(id=req_cat_id)
        self.assertEqual(req_cat.source, "REQUEST")
        self.assertEqual(req_cat.status, ApprovalStatus.PENDING)

        # Check Category Approval Queue - Request category MUST appear here
        queue_res2 = self.client.get("/api/inventory/vegetable-categories/approval-queue/?status=ALL")
        self.assertTrue(any(c["id"] == req_cat_id for c in queue_res2.data["data"]))

