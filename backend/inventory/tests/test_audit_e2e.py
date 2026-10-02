from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package, PackageStatus
from inventory.models import Vegetable, VegetableCategory, VegetableStockMovement, VegetableClaim
from inventory.services.vegetable_stock_service import (
    reserve_stock_for_booking_items,
    release_stock_for_booking,
)
from inventory.selectors.vegetable_stock_selectors import get_bulk_admin_stock_status
from vegetable_orders.models import VegetableOrder, VegetableOrderItem, VegetableReturn

User = get_user_model()


class EndToEndStockFlowAuditTests(TestCase):
    """
    End-to-End Stock Audit verifying full lifecycle across:
    1. Inventory Edit Details (Stock & Reorder Level persistence)
    2. Customer Order Stock Reservation
    3. Order Cancellation Stock Restoration
    4. Return Resolution (Replacement deduction vs Refund+Restock add, & Idempotency)
    5. Spoilage Claims Write-Off & Floor at 0
    6. Arithmetic Cross-Check across both Weight and Count products
    7. Dashboard Low-Stock Alert Trigger and Clearance
    """

    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(
            company_name="Audit Agri",
            slug="audit-agri",
        )

        self.admin_user = User.objects.create_superuser(
            username="audit_superuser",
            email="admin@audit-agri.test",
            password="adminpassword123",
            company=self.company,
        )

        self.customer = User.objects.create_user(
            username="audit_cust_user",
            email="cust@audit-agri.test",
            password="custpassword123",
            role="customer",
            company=self.company,
        )

        self.client.force_authenticate(user=self.admin_user)

        self.cat = CatalogCategory.objects.create(name="Vegetables Category", slug="veg-cat")
        self.service = Service.objects.create(category=self.cat, name="Fresh Produce", slug="produce")
        self.veg_category = VegetableCategory.objects.create(
            org=self.company,
            name="Gourd & Citrus",
            slug="gourd-citrus",
            is_active=True,
            status="APPROVED",
        )

        # 1. Weight Product: Bottle Gourd (tracked in grams)
        self.weight_pkg = Package.objects.create(
            service=self.service,
            name="Bottle Gourd(Surakkai)",
            slug="bottle-gourd-500g",
            base_price=Decimal("40.00"),
            duration="500 g",
            status=PackageStatus.ACTIVE,
        )
        self.weight_veg = Vegetable.objects.create(
            package=self.weight_pkg,
            category=self.veg_category,
            name="Bottle Gourd(Surakkai)",
            sku="VEG-BG-01",
            unit="g",
            unit_basis="WEIGHT",
            stock_quantity_grams=0,
            reorder_threshold=0,
            org=self.company,
        )

        self.weight_pkg.stock_item = self.weight_veg
        self.weight_pkg.save(update_fields=["stock_item"])

        # 2. Count Product: Fresh Lemon (tracked in pieces)
        self.count_pkg = Package.objects.create(
            service=self.service,
            name="Fresh Lemon",
            slug="fresh-lemon-4-pcs",
            base_price=Decimal("20.00"),
            duration="4 pcs",
            status=PackageStatus.ACTIVE,
        )
        self.count_veg = Vegetable.objects.create(
            package=self.count_pkg,
            category=self.veg_category,
            name="Fresh Lemon",
            sku="VEG-LEM-01",
            unit="pcs",
            unit_basis="COUNT",
            stock_quantity_grams=0,
            reorder_threshold=0,
            org=self.company,
        )
        self.count_pkg.stock_item = self.count_veg
        self.count_pkg.save(update_fields=["stock_item"])

    def test_end_to_end_stock_audit_weight_and_count(self):
        # ---------------------------------------------------------------------
        # STEP 1: INVENTORY - Set Stock & Reorder Level via Edit Details API
        # ---------------------------------------------------------------------
        # Weight item: 2000g stock, 400g reorder level
        resp_w = self.client.patch(
            f"/api/inventory/vegetable-stock/{self.weight_pkg.id}/update-details/",
            {
                "current_stock_quantity": 2000,
                "current_stock_unit": "g",
                "reorder_level_quantity": 400,
                "reorder_level_unit": "g",
            },
            format="json",
        )
        self.assertEqual(resp_w.status_code, status.HTTP_200_OK)

        # Count item: 20 pcs stock, 4 pcs reorder level
        resp_c = self.client.patch(
            f"/api/inventory/vegetable-stock/{self.count_pkg.id}/update-details/",
            {
                "current_stock_quantity": 20,
                "current_stock_unit": "pcs",
                "reorder_level_quantity": 4,
                "reorder_level_unit": "pcs",
            },
            format="json",
        )
        self.assertEqual(resp_c.status_code, status.HTTP_200_OK)

        self.weight_veg.refresh_from_db()
        self.count_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 2000)
        self.assertEqual(self.weight_veg.reorder_threshold, 400)
        self.assertEqual(self.count_veg.stock_quantity_grams, 20)
        self.assertEqual(self.count_veg.reorder_threshold, 4)

        pkgs1 = list(Package.objects.filter(id__in=[self.weight_pkg.id, self.count_pkg.id]).select_related("stock_item"))
        overview1 = get_bulk_admin_stock_status(pkgs1)
        self.assertEqual(overview1[self.weight_pkg.id]["state"], "in_stock")
        self.assertEqual(overview1[self.weight_pkg.id]["today_available_display"], "2 kg")
        self.assertEqual(overview1[self.weight_pkg.id]["reorder_level_display"], "400 g")

        self.assertEqual(overview1[self.count_pkg.id]["state"], "in_stock")
        self.assertEqual(overview1[self.count_pkg.id]["today_available_display"], "20 pcs")
        self.assertEqual(overview1[self.count_pkg.id]["reorder_level_display"], "4 pcs")

        # ---------------------------------------------------------------------
        # STEP 2: ORDERS - Customer Order Stock Reservation
        # ---------------------------------------------------------------------
        order1 = VegetableOrder.objects.create(
            customer=self.customer,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("90.00"),
            delivery_address="Audit Street 1",
        )
        VegetableOrderItem.objects.create(
            order=order1,
            package=self.weight_pkg,
            quantity_grams=500,
            unit_basis="WEIGHT",
            unit_label="g",
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("40.00"),
        )
        VegetableOrderItem.objects.create(
            order=order1,
            package=self.count_pkg,
            quantity_grams=5,
            unit_basis="COUNT",
            unit_label="pcs",
            unit_price_snapshot=Decimal("10.00"),
            line_amount=Decimal("50.00"),
        )

        reserve_stock_for_booking_items(
            items=[
                {"product": self.weight_pkg, "quantity": 500, "unit": "g"},
                {"product": self.count_pkg, "quantity": 5, "unit": "pcs"},
            ],
            company=self.company,
            booking_ref=order1.order_number,
        )

        self.weight_veg.refresh_from_db()
        self.count_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1500)
        self.assertEqual(self.count_veg.stock_quantity_grams, 15)

        w_m1 = VegetableStockMovement.objects.filter(vegetable=self.weight_veg, movement_type=VegetableStockMovement.MovementType.SOLD).latest("created_at")
        self.assertEqual(w_m1.delta_grams, -500)
        c_m1 = VegetableStockMovement.objects.filter(vegetable=self.count_veg, movement_type=VegetableStockMovement.MovementType.SOLD).latest("created_at")
        self.assertEqual(c_m1.delta_grams, -5)

        # ---------------------------------------------------------------------
        # STEP 3: CANCEL - Order Cancellation & Full Stock Restoration
        # ---------------------------------------------------------------------
        order1.transition_to(VegetableOrder.Status.CANCELLED)

        self.weight_veg.refresh_from_db()
        self.count_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 2000)
        self.assertEqual(self.count_veg.stock_quantity_grams, 20)

        w_mc = VegetableStockMovement.objects.filter(vegetable=self.weight_veg, movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION).latest("created_at")
        self.assertEqual(w_mc.delta_grams, 500)
        c_mc = VegetableStockMovement.objects.filter(vegetable=self.count_veg, movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION).latest("created_at")
        self.assertEqual(c_mc.delta_grams, 5)

        # ---------------------------------------------------------------------
        # STEP 4: RETURNS - Order 2 Delivery -> Replacement & Refund+Restock
        # ---------------------------------------------------------------------
        order2 = VegetableOrder.objects.create(
            customer=self.customer,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("120.00"),
            delivery_address="Audit Street 2",
        )
        oi_w2 = VegetableOrderItem.objects.create(
            order=order2,
            package=self.weight_pkg,
            quantity_grams=200,
            unit_basis="WEIGHT",
            unit_label="g",
            unit_price_snapshot=Decimal("20.00"),
            line_amount=Decimal("20.00"),
        )
        VegetableOrderItem.objects.create(
            order=order2,
            package=self.weight_pkg,
            quantity_grams=200,
            unit_basis="WEIGHT",
            unit_label="g",
            unit_price_snapshot=Decimal("20.00"),
            line_amount=Decimal("20.00"),
        )
        oi_c2 = VegetableOrderItem.objects.create(
            order=order2,
            package=self.count_pkg,
            quantity_grams=2,
            unit_basis="COUNT",
            unit_label="pcs",
            unit_price_snapshot=Decimal("10.00"),
            line_amount=Decimal("20.00"),
        )
        VegetableOrderItem.objects.create(
            order=order2,
            package=self.count_pkg,
            quantity_grams=2,
            unit_basis="COUNT",
            unit_label="pcs",
            unit_price_snapshot=Decimal("10.00"),
            line_amount=Decimal("20.00"),
        )

        reserve_stock_for_booking_items(
            items=[
                {"product": self.weight_pkg, "quantity": 400, "unit": "g"},
                {"product": self.count_pkg, "quantity": 4, "unit": "pcs"},
            ],
            company=self.company,
            booking_ref=order2.order_number,
        )

        order2.transition_to(VegetableOrder.Status.PACKED)
        order2.transition_to(VegetableOrder.Status.OUT_FOR_DELIVERY)
        order2.transition_to(VegetableOrder.Status.DELIVERED)

        self.weight_veg.refresh_from_db()
        self.count_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1600)
        self.assertEqual(self.count_veg.stock_quantity_grams, 16)

        # 4a: Return Replacement (Weight)
        ret_w = VegetableReturn.objects.create(
            order=order2,
            item=oi_w2,
            customer=self.customer,
            reason=VegetableReturn.Reason.POOR_QUALITY,
            status=VegetableReturn.Status.REQUESTED,
        )
        resp_ret_w = self.client.post(
            f"/api/vegetable-orders/admin/returns/{ret_w.id}/action/",
            {"status": "RESOLVED", "resolution_action": "REPLACEMENT"},
            format="json",
        )
        self.assertEqual(resp_ret_w.status_code, status.HTTP_200_OK)
        self.weight_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1400)

        # Idempotency check
        self.client.post(
            f"/api/vegetable-orders/admin/returns/{ret_w.id}/action/",
            {"status": "RESOLVED", "resolution_action": "REPLACEMENT"},
            format="json",
        )
        self.weight_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1400)

        # 4b: Return Refund with Restock (Count)
        ret_c = VegetableReturn.objects.create(
            order=order2,
            item=oi_c2,
            customer=self.customer,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
        )
        resp_ret_c = self.client.post(
            f"/api/vegetable-orders/admin/returns/{ret_c.id}/action/",
            {"status": "RESOLVED", "resolution_action": "REFUND", "restock_item": True, "refund_amount": "20.00"},
            format="json",
        )
        self.assertEqual(resp_ret_c.status_code, status.HTTP_200_OK)
        self.count_veg.refresh_from_db()
        self.assertEqual(self.count_veg.stock_quantity_grams, 18)

        # Idempotency check
        self.client.post(
            f"/api/vegetable-orders/admin/returns/{ret_c.id}/action/",
            {"status": "RESOLVED", "resolution_action": "REFUND", "restock_item": True, "refund_amount": "20.00"},
            format="json",
        )
        self.count_veg.refresh_from_db()
        self.assertEqual(self.count_veg.stock_quantity_grams, 18)

        # ---------------------------------------------------------------------
        # STEP 5: CLAIMS - Spoilage Write-Off & Floor at 0
        # ---------------------------------------------------------------------
        # Weight claim: 100g
        resp_cw = self.client.post(
            "/api/inventory/vegetables/claims/",
            {"vegetable_id": self.weight_veg.id, "quantity": 100, "unit": "g", "reason": "WAREHOUSE_SPOILAGE"},
            format="json",
        )
        self.assertEqual(resp_cw.status_code, status.HTTP_201_CREATED)
        cw_id = resp_cw.data["data"]["id"]
        self.client.post(f"/api/inventory/vegetables/claims/{cw_id}/action/", {"action": "APPROVE"}, format="json")
        self.weight_veg.refresh_from_db()
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1300)

        # Count claim: 3 pcs
        resp_cc = self.client.post(
            "/api/inventory/vegetables/claims/",
            {"vegetable_id": self.count_veg.id, "quantity": 3, "unit": "pcs", "reason": "WAREHOUSE_SPOILAGE"},
            format="json",
        )
        self.assertEqual(resp_cc.status_code, status.HTTP_201_CREATED)
        cc_id = resp_cc.data["data"]["id"]
        self.client.post(f"/api/inventory/vegetables/claims/{cc_id}/action/", {"action": "APPROVE"}, format="json")
        self.count_veg.refresh_from_db()
        self.assertEqual(self.count_veg.stock_quantity_grams, 15)

        # Excess claim floor at 0
        temp_veg = Vegetable.objects.create(
            org=self.company,
            name="Floor Veg",
            unit="g",
            unit_basis="WEIGHT",
            stock_quantity_grams=50,
        )
        resp_fl = self.client.post(
            "/api/inventory/vegetables/claims/",
            {"vegetable_id": temp_veg.id, "quantity": 500, "unit": "g", "reason": "INVENTORY_DISCREPANCY"},
            format="json",
        )
        self.client.post(f"/api/inventory/vegetables/claims/{resp_fl.data['data']['id']}/action/", {"action": "APPROVE"}, format="json")
        temp_veg.refresh_from_db()
        self.assertEqual(temp_veg.stock_quantity_grams, 0)

        # ---------------------------------------------------------------------
        # STEP 6: ARITHMETIC CROSS-CHECK
        # ---------------------------------------------------------------------
        # Weight: 2000 - 500 + 500 - 400 - 200 + 0 - 100 = 1300g
        self.assertEqual(self.weight_veg.stock_quantity_grams, 1300)

        # Count: 20 - 5 + 5 - 4 + 0 + 2 - 3 = 15 pcs
        self.assertEqual(self.count_veg.stock_quantity_grams, 15)

        fresh_pkgs = list(Package.objects.filter(id__in=[self.weight_pkg.id, self.count_pkg.id]).select_related("stock_item"))
        final_ov = get_bulk_admin_stock_status(fresh_pkgs)
        self.assertEqual(final_ov[self.weight_pkg.id]["today_available_grams"], 1300)
        self.assertEqual(final_ov[self.weight_pkg.id]["today_available_display"], "1.3 kg")
        self.assertEqual(final_ov[self.count_pkg.id]["today_available_grams"], 15)
        self.assertEqual(final_ov[self.count_pkg.id]["today_available_display"], "15 pcs")

        # ---------------------------------------------------------------------
        # STEP 7: LOW-STOCK ALERT DASHBOARD
        # ---------------------------------------------------------------------
        # 1300g > 400g threshold -> Not low stock
        dash1 = self.client.get("/api/vegetable-orders/admin/dashboard/")
        alerts1 = [a["id"] for a in dash1.data.get("low_stock_alerts", [])]
        self.assertNotIn(self.weight_veg.id, alerts1)

        # Drop to 300g <= 400g threshold -> In low stock alerts
        self.client.patch(
            f"/api/inventory/vegetable-stock/{self.weight_pkg.id}/update-details/",
            {"current_stock_quantity": 300, "current_stock_unit": "g", "reorder_level_quantity": 400, "reorder_level_unit": "g"},
            format="json",
        )
        dash2 = self.client.get("/api/vegetable-orders/admin/dashboard/")
        alerts2 = [a["id"] for a in dash2.data.get("low_stock_alerts", [])]
        self.assertIn(self.weight_veg.id, alerts2)

        # Restore to 1000g > 400g threshold -> Alert cleared
        self.client.patch(
            f"/api/inventory/vegetable-stock/{self.weight_pkg.id}/update-details/",
            {"current_stock_quantity": 1000, "current_stock_unit": "g", "reorder_level_quantity": 400, "reorder_level_unit": "g"},
            format="json",
        )
        dash3 = self.client.get("/api/vegetable-orders/admin/dashboard/")
        alerts3 = [a["id"] for a in dash3.data.get("low_stock_alerts", [])]
        self.assertNotIn(self.weight_veg.id, alerts3)
