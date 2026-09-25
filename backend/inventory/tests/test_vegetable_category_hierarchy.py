from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from companies.models import Company
from inventory.models import VegetableCategory, Vegetable, ApprovalStatus
from service_requests.models import Service, Package, CatalogCategory

from rest_framework.test import APIClient
from decimal import Decimal

User = get_user_model()


class VegetableCategoryHierarchyTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(company_name="Farm Fresh Org", slug="farmfresh")
        self.admin_user = User.objects.create_user(
            username="admin_hierarchy",
            email="admin_hier@test.com",
            password="password123",
            role=User.Role.ADMIN,
        )
        self.client.force_authenticate(user=self.admin_user)
        self.cat = CatalogCategory.objects.create(name="Fresh Produce")
        self.veg_service = Service.objects.create(
            category=self.cat,
            name="Farm-Fresh Vegetable",
            slug="vegetables",
            is_active=True,
        )

    def test_unlimited_nesting_creation_and_properties(self):
        # 1. Level 0: Vegetables
        lvl0 = VegetableCategory.objects.create(
            org=self.company,
            name="Vegetables",
            slug="vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        self.assertTrue(lvl0.is_leaf)
        self.assertEqual(lvl0.depth, 0)
        self.assertEqual(lvl0.full_path, "Vegetables")
        self.assertEqual(len(lvl0.get_ancestors()), 0)

        # 2. Level 1: Root Vegetables
        lvl1 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl0,
            name="Root Vegetables",
            slug="root-vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl0.refresh_from_db()
        self.assertFalse(lvl0.is_leaf)
        self.assertTrue(lvl1.is_leaf)
        self.assertEqual(lvl1.depth, 1)
        self.assertEqual(lvl1.full_path, "Vegetables → Root Vegetables")
        self.assertEqual([a.name for a in lvl1.get_ancestors()], ["Vegetables"])

        # 3. Level 2: Tubers (3rd level)
        lvl2 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl1,
            name="Tubers",
            slug="tubers",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl1.refresh_from_db()
        self.assertFalse(lvl1.is_leaf)
        self.assertTrue(lvl2.is_leaf)
        self.assertEqual(lvl2.depth, 2)
        self.assertEqual(lvl2.full_path, "Vegetables → Root Vegetables → Tubers")
        self.assertEqual([a.name for a in lvl2.get_ancestors()], ["Vegetables", "Root Vegetables"])

        # 4. Level 3: Sweet Potato Family (4th level)
        lvl3 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl2,
            name="Sweet Potato Family",
            slug="sweet-potato-family",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl2.refresh_from_db()
        self.assertFalse(lvl2.is_leaf)
        self.assertTrue(lvl3.is_leaf)
        self.assertEqual(lvl3.depth, 3)
        self.assertEqual(lvl3.full_path, "Vegetables → Root Vegetables → Tubers → Sweet Potato Family")
        self.assertEqual([a.name for a in lvl3.get_ancestors()], ["Vegetables", "Root Vegetables", "Tubers"])

    def test_cycle_prevention_validation(self):
        # Level 0 -> Level 1 -> Level 2
        lvl0 = VegetableCategory.objects.create(
            org=self.company,
            name="Vegetables",
            slug="vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl1 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl0,
            name="Root Vegetables",
            slug="root-vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl2 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl1,
            name="Tubers",
            slug="tubers",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )

        # 1. Category cannot be its own parent
        lvl0.parent = lvl0
        with self.assertRaises(ValidationError):
            lvl0.clean()

        # 2. Category cannot have its descendant as parent (cycle: lvl0 -> lvl1 -> lvl2 -> lvl0)
        lvl0.parent = lvl2
        with self.assertRaises(ValidationError):
            lvl0.clean()

        # 3. Middle ancestor cannot be child of its own descendant (lvl1 -> lvl2 -> lvl1)
        lvl1.parent = lvl2
        with self.assertRaises(ValidationError):
            lvl1.clean()

    def test_single_request_leaf_category_validation_at_depth(self):
        # 3-level tree: Vegetables -> Root Vegetables -> Tubers
        lvl0 = VegetableCategory.objects.create(
            org=self.company,
            name="Vegetables",
            slug="vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl1 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl0,
            name="Root Vegetables",
            slug="root-vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        lvl2 = VegetableCategory.objects.create(
            org=self.company,
            parent=lvl1,
            name="Tubers",
            slug="tubers",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )

        # Attempting to assign vegetable to lvl0 (non-leaf) must fail
        res_fail0 = self.client.post("/api/inventory/vegetables/single-request/", {
            "request_type": "vegetable",
            "category_id": lvl0.id,
            "vegetable_name": "Carrot",
        })
        self.assertEqual(res_fail0.status_code, 400)
        self.assertIn("has subcategories", res_fail0.data.get("message", ""))

        # Attempting to assign vegetable to lvl1 (non-leaf) must fail
        res_fail1 = self.client.post("/api/inventory/vegetables/single-request/", {
            "request_type": "vegetable",
            "category_id": lvl1.id,
            "vegetable_name": "Carrot",
        })
        self.assertEqual(res_fail1.status_code, 400)
        self.assertIn("has subcategories", res_fail1.data.get("message", ""))

        # Assigning vegetable to lvl2 (leaf) must succeed
        res_success = self.client.post("/api/inventory/vegetables/single-request/", {
            "request_type": "vegetable",
            "category_id": lvl2.id,
            "vegetable_name": "Sweet Potato",
        })
        self.assertEqual(res_success.status_code, 201)
        self.assertTrue(res_success.data.get("success"))

        veg_obj = Vegetable.objects.get(name="Sweet Potato (Produce)")
        self.assertEqual(veg_obj.category, lvl2)

    def test_request_subcategory_workflow_at_deep_level(self):
        root_cat = VegetableCategory.objects.create(
            org=self.company,
            name="Vegetables",
            slug="vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )
        sub1 = VegetableCategory.objects.create(
            org=self.company,
            parent=root_cat,
            name="Root Vegetables",
            slug="root-vegetables",
            status=ApprovalStatus.APPROVED,
            requested_by=self.admin_user,
        )

        # Propose 3rd level subcategory under "Root Vegetables"
        res = self.client.post("/api/inventory/vegetables/single-request/", {
            "request_type": "category",
            "parent_id": sub1.id,
            "category_name": "Tubers",
            "category_slug": "tubers",
        })
        self.assertEqual(res.status_code, 201)
        sub2_id = res.data["category"]["id"]
        sub2_cat = VegetableCategory.objects.get(id=sub2_id)
        self.assertEqual(sub2_cat.parent, sub1)
        self.assertEqual(sub2_cat.depth, 2)
        self.assertEqual(sub2_cat.status, ApprovalStatus.PENDING)

        # Admin approves the 3rd level subcategory
        review_res = self.client.post(f"/api/inventory/vegetable-categories/{sub2_id}/review/", {
            "action": "APPROVE"
        })
        self.assertEqual(review_res.status_code, 200)
        sub2_cat.refresh_from_db()
        self.assertEqual(sub2_cat.status, ApprovalStatus.APPROVED)
        self.assertEqual(sub2_cat.full_path, "Vegetables → Root Vegetables → Tubers")
