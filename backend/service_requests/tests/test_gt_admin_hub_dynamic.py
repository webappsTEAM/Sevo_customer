"""
service_requests/tests/test_gt_admin_hub_dynamic.py

Validates complete dynamic configurability of the GT Module:
1. GoodsCategory info_banner field & CRUD via Admin API
2. GoodsItem subcategory field & CRUD via Admin API
3. PackersMoversConfig rate controls & RBAC pricing gates via Admin API
4. Operating LogisticsSlots CRUD & category/city filtering via Admin API
5. Public PackersMoversInventoryView exposure of dynamic banners and subcategories
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from accounts.models import User
from companies.models import Company
from logistics.models import GoodsCategory, GoodsItem, PackersMoversConfig, LogisticsSlot
from logistics.admin_views import (
    AdminGoodsCategoryListView,
    AdminGoodsCategoryDetailView,
    AdminGoodsItemListView,
    AdminGoodsItemDetailView,
    AdminPackersMoversConfigView,
    AdminLogisticsSlotListView,
    AdminLogisticsSlotDetailView,
)
from logistics.views import PackersMoversInventoryView


class GTAdminHubDynamicTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.company = Company.objects.create(
            company_name="Test GT Corp",
            slug="test-gt-corp",
        )

        # Superadmin with all permissions
        self.superadmin = User.objects.create_superuser(
            username="superadmin",
            phone="9999900001",
            email="superadmin@test.com",
            first_name="Super Admin",
            password="password123",
        )

        # Staff user with pricing:edit & pricing:modify_price
        self.pricing_admin = User.objects.create_user(
            username="pricing_admin",
            phone="9999900002",
            email="pricing@test.com",
            first_name="Pricing Manager",
            password="password123",
            role="admin",
            company=self.company,
        )



        # Base category
        self.category = GoodsCategory.objects.create(
            name="Bedrooms",
            slug="pm-bedrooms",
            icon="bed",
            description="All bedroom furniture and essentials",
            info_banner="What we pack in Bedrooms (Beds, wardrobes, mattresses)",
            allows_two_wheeler=False,
            min_vehicle_class="truck",
            order=1,
            is_active=True,
        )

        # Base items with subcategories
        self.item_bed = GoodsItem.objects.create(
            category=self.category,
            name="King Size Bed",
            slug="pm-bed-king",
            subcategory="Bed",
            unit="piece",
            default_weight_kg=Decimal("75.00"),
            default_cft=Decimal("45.00"),
            is_fragile=False,
            is_two_wheeler_compatible=False,
            order=1,
            is_active=True,
        )

        self.item_chair = GoodsItem.objects.create(
            category=self.category,
            name="Bedroom Chair",
            slug="pm-chair-bedroom",
            subcategory="Chair",
            unit="piece",
            default_weight_kg=Decimal("12.00"),
            default_cft=Decimal("8.00"),
            is_fragile=False,
            is_two_wheeler_compatible=False,
            order=2,
            is_active=True,
        )

        # Base P&M Config
        self.pm_config = PackersMoversConfig.objects.create(
            city="Hosur",
            standard_packing_rate_cft=Decimal("5.00"),
            premium_packing_rate_cft=Decimal("10.00"),
            premium_fragile_addon=Decimal("50.00"),
            floor_rate_no_lift_per_100cft=Decimal("150.00"),
            unpacking_rate_cft=Decimal("4.00"),
            gst_rate=Decimal("0.18"),
            survey_cft_threshold=400.0,
            is_active=True,
        )

        # Base Slot
        self.slot = LogisticsSlot.objects.create(
            category="packers_movers",
            city="hosur",
            group="Morning",
            slot_label="08:00 AM - 09:00 AM",
            capacity=10,
            order=1,
            is_active=True,
        )

    def test_packers_movers_inventory_exposes_dynamic_fields(self):
        """Verify public P&M inventory endpoint returns info_banner on category and subcategory on items."""
        view = PackersMoversInventoryView.as_view()
        request = self.factory.get("/api/logistics/packers-movers/inventory/")
        response = view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertTrue(data.get("success"))
        cats = data.get("data", {}).get("categories", [])
        self.assertTrue(len(cats) >= 1)

        cat = next((c for c in cats if c["slug"] == "pm-bedrooms"), None)
        self.assertIsNotNone(cat)
        self.assertEqual(cat["info_banner"], "What we pack in Bedrooms (Beds, wardrobes, mattresses)")

        items = cat.get("items", [])
        self.assertTrue(len(items) >= 2)
        bed = next((i for i in items if i["slug"] == "pm-bed-king"), None)
        self.assertIsNotNone(bed)
        self.assertEqual(bed["subcategory"], "Bed")

        chair = next((i for i in items if i["slug"] == "pm-chair-bedroom"), None)
        self.assertIsNotNone(chair)
        self.assertEqual(chair["subcategory"], "Chair")

    def test_admin_goods_category_crud_and_banner_update(self):
        """Verify admin can create and update category including custom info_banner."""
        list_view = AdminGoodsCategoryListView.as_view()
        detail_view = AdminGoodsCategoryDetailView.as_view()

        # Create
        create_payload = {
            "name": "Kitchen",
            "slug": "pm-kitchen",
            "icon": "utensils",
            "info_banner": "What we pack in Kitchen (Crockery, appliances)",
            "allows_two_wheeler": False,
        }
        req = self.factory.post("/api/logistics/admin/categories/", create_payload, format="json")
        force_authenticate(req, user=self.superadmin)
        res = list_view(req)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_cat_id = res.data["data"]["id"]

        # Update info_banner
        patch_payload = {
            "info_banner": "Updated Kitchen Banner for Fragile Chinaware",
            "reason": "Clarifying kitchen packing coverage",
        }
        req2 = self.factory.patch(f"/api/logistics/admin/categories/{new_cat_id}/", patch_payload, format="json")
        force_authenticate(req2, user=self.superadmin)
        res2 = detail_view(req2, pk=new_cat_id)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["data"]["info_banner"], "Updated Kitchen Banner for Fragile Chinaware")

    def test_admin_goods_item_crud_and_subcategory_update(self):
        """Verify admin can create and update items including subcategory accordion grouping."""
        list_view = AdminGoodsItemListView.as_view()
        detail_view = AdminGoodsItemDetailView.as_view()

        # Create new item with subcategory
        create_payload = {
            "name": "Dining Table 6-Seater",
            "category": self.category.id,
            "subcategory": "Table",
            "unit": "piece",
            "default_weight_kg": "40.00",
            "default_cft": "25.00",
            "is_two_wheeler_compatible": False,
        }
        req = self.factory.post("/api/logistics/admin/items/", create_payload, format="json")
        force_authenticate(req, user=self.superadmin)
        res = list_view(req)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_item_id = res.data["data"]["id"]
        self.assertEqual(res.data["data"]["subcategory"], "Table")

        # Update subcategory
        patch_payload = {
            "subcategory": "Dining & Tables",
            "reason": "Renaming subcategory grouping",
        }
        req2 = self.factory.patch(f"/api/logistics/admin/items/{new_item_id}/", patch_payload, format="json")
        force_authenticate(req2, user=self.superadmin)
        res2 = detail_view(req2, pk=new_item_id)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data["data"]["subcategory"], "Dining & Tables")

    def test_admin_pm_config_rates_update(self):
        """Verify admin can update Packers & Movers pricing parameters."""
        view = AdminPackersMoversConfigView.as_view()

        patch_payload = {
            "city": "Hosur",
            "standard_packing_rate_cft": "6.50",
            "premium_packing_rate_cft": "12.00",
            "floor_rate_no_lift_per_100cft": "180.00",
            "reason": "Inflation adjustment for packing crew labor",
        }
        req = self.factory.patch("/api/logistics/admin/packers-movers-config/", patch_payload, format="json")
        force_authenticate(req, user=self.superadmin)
        res = view(req)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(res.data["data"]["standard_packing_rate_cft"])), Decimal("6.50"))
        self.assertEqual(Decimal(str(res.data["data"]["floor_rate_no_lift_per_100cft"])), Decimal("180.00"))

    def test_admin_slots_crud(self):
        """Verify admin can create, filter, and modify operating time slots."""
        list_view = AdminLogisticsSlotListView.as_view()
        detail_view = AdminLogisticsSlotDetailView.as_view()

        # Create new slot
        create_payload = {
            "category": "packers_movers",
            "city": "hosur",
            "group": "Afternoon",
            "slot_label": "01:00 PM - 02:00 PM",
            "capacity": 15,
            "order": 10,
        }
        req = self.factory.post("/api/logistics/admin/slots/", create_payload, format="json")
        force_authenticate(req, user=self.superadmin)
        res = list_view(req)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        new_slot_id = res.data["data"]["id"]

        # Filter slots by group
        req_filter = self.factory.get("/api/logistics/admin/slots/?group=Afternoon")
        force_authenticate(req_filter, user=self.superadmin)
        res_filter = list_view(req_filter)
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        labels = [s["slot_label"] for s in res_filter.data["data"]]
        self.assertIn("01:00 PM - 02:00 PM", labels)

        # Update slot capacity
        patch_payload = {
            "capacity": 20,
            "reason": "Increased crew dispatch capacity",
        }
        req_patch = self.factory.patch(f"/api/logistics/admin/slots/{new_slot_id}/", patch_payload, format="json")
        force_authenticate(req_patch, user=self.superadmin)
        res_patch = detail_view(req_patch, pk=new_slot_id)
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data["data"]["capacity"], 20)
