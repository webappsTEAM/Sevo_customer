from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package, PackageStatus
from inventory.models import Vegetable, VegetableCategory, VegetableStockMovement
from inventory.services.vegetable_stock_service import (
    add_stock,
    adjust_stock,
    reserve_stock_for_booking_items,
    release_stock_for_booking,
    process_return_stock_resolution,
)
from inventory.selectors.vegetable_stock_selectors import get_stock_status
from vegetable_orders.models import VegetableOrder, VegetableOrderItem, VegetableReturn

User = get_user_model()


class VegetableCountStockLifecycleTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.company = Company.objects.create(
            company_name="FreshFarm Agri",
            slug="freshfarm",
        )

        self.admin_user = User.objects.create_user(
            username="veg_count_admin",
            email="admin@freshfarm.test",
            password="adminpassword123",
            role="admin",
            company=self.company,
        )

        self.customer = User.objects.create_user(
            username="veg_count_customer",
            email="customer@freshfarm.test",
            password="custpassword123",
            role="customer",
            company=self.company,
        )

        self.cat = CatalogCategory.objects.create(name="Citrus", slug="citrus_cat")
        self.service = Service.objects.create(category=self.cat, name="Vegetables", slug="vegetables")

        # Category
        self.veg_category = VegetableCategory.objects.create(
            org=self.company,
            name="Lemon Category",
            slug="lemon-category",
            is_active=True,
            status="APPROVED",
        )

        # Count-based package & vegetable (e.g. Lemon pack of 4 pcs)
        self.package = Package.objects.create(
            service=self.service,
            name="Fresh Lemons",
            slug="fresh-lemons-4-pcs",
            base_price=Decimal("40.00"),
            duration="4 pcs",
            status=PackageStatus.ACTIVE,
        )

        self.vegetable = Vegetable.objects.create(
            package=self.package,
            category=self.veg_category,
            name="Fresh Lemons",
            sku="VEG-LEM-01",
            unit="pcs",
            unit_basis="COUNT",
            stock_quantity_grams=0,
            default_daily_quantity_grams=200,
            org=self.company,
        )

    def test_count_item_restock_lifecycle(self):
        """Test restocking a count-based vegetable in pieces and verify movement record."""
        # 1. Restock 100 pcs
        add_stock(
            product=self.package,
            quantity=100,
            unit="pcs",
            company=self.company,
            entered_by_user=self.admin_user,
        )
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 100)
        self.assertEqual(self.vegetable.stock_quantity_base_units, 100)

        # Check movement record
        movement = VegetableStockMovement.objects.filter(vegetable=self.vegetable).latest("created_at")
        self.assertEqual(movement.movement_type, VegetableStockMovement.MovementType.RESTOCK)
        self.assertEqual(movement.delta_grams, 100)
        self.assertEqual(movement.unit_basis, "COUNT")
        self.assertEqual(movement.unit_label, "pcs")
        self.assertEqual(movement.delta_display, "+100 pcs")

        # Selector status check: pack size is 4 pcs, so 100 pcs = 25 packs max
        status_info = get_stock_status(self.package)
        self.assertTrue(status_info["in_stock"])
        self.assertEqual(status_info["max_quantity"], 25)
        self.assertEqual(status_info["available_stock_display"], "100 pcs")

    def test_count_item_order_reservation_and_cancellation(self):
        """Test booking reservation and cancellation restoration for count-based items."""
        # Start with 100 pcs
        add_stock(product=self.package, quantity=100, unit="pcs", company=self.company, entered_by_user=self.admin_user)

        # Place order for 2 packs (each pack = 4 pcs => 8 pcs total)
        order = VegetableOrder.objects.create(
            customer=self.customer,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("80.00"),
            delivery_address="123 Orchard Lane",
        )
        order_item = VegetableOrderItem.objects.create(
            order=order,
            package=self.package,
            quantity_grams=8,  # 8 base pieces
            unit_basis="COUNT",
            unit_label="pcs",
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("80.00"),
        )

        # Reserve stock
        reserve_stock_for_booking_items(
            items=[{"product": self.package, "quantity": 8, "unit": "pcs"}],
            company=self.company,
            booking_ref=order.order_number,
        )

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 92)

        movement = VegetableStockMovement.objects.filter(
            vegetable=self.vegetable,
            movement_type=VegetableStockMovement.MovementType.SOLD,
        ).latest("created_at")
        self.assertEqual(movement.delta_grams, -8)
        self.assertEqual(movement.unit_basis, "COUNT")
        self.assertEqual(movement.delta_display, "-8 pcs")

        # Cancel order and restore stock
        release_stock_for_booking(order)

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 100)

        cancel_movement = VegetableStockMovement.objects.filter(
            vegetable=self.vegetable,
            movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
        ).latest("created_at")
        self.assertEqual(cancel_movement.delta_grams, 8)
        self.assertEqual(cancel_movement.delta_display, "+8 pcs")

    def test_count_item_return_replacement_and_refund_restock(self):
        """Test returns workflow with REPLACEMENT and REFUND+RESTOCK on count-based produce."""
        add_stock(product=self.package, quantity=100, unit="pcs", company=self.company, entered_by_user=self.admin_user)

        # Delivered order of 1 pack (4 pcs)
        self.vegetable.stock_quantity_grams = 96
        self.vegetable.save(update_fields=["stock_quantity_grams"])

        order = VegetableOrder.objects.create(
            customer=self.customer,
            status=VegetableOrder.Status.DELIVERED,
            total_amount=Decimal("40.00"),
            delivery_address="123 Orchard Lane",
        )
        order_item = VegetableOrderItem.objects.create(
            order=order,
            package=self.package,
            quantity_grams=4,
            unit_basis="COUNT",
            unit_label="pcs",
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("40.00"),
        )

        # Case 1: Return resolution REPLACEMENT (deducts 4 pcs for the replacement item)
        ret1 = VegetableReturn.objects.create(
            order=order,
            item=order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload1 = {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
            "admin_notes": "Replacement pack dispatched.",
        }
        res1 = self.client.post(f"/api/vegetable-orders/admin/returns/{ret1.id}/action/", payload1, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 92)  # 96 - 4 = 92

        movement1 = VegetableStockMovement.objects.filter(
            vegetable=self.vegetable,
            movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT,
        ).latest("created_at")
        self.assertEqual(movement1.delta_grams, -4)
        self.assertEqual(movement1.delta_display, "-4 pcs")

        # Case 2: Return resolution REFUND with restock_item=True (restores 4 pcs)
        ret2 = VegetableReturn.objects.create(
            order=order,
            item=order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.WRONG_ITEM,
            status=VegetableReturn.Status.REQUESTED,
        )
        payload2 = {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "restock_item": True,
            "refund_amount": "40.00",
            "admin_notes": "Item unopened, returned to shelf.",
        }
        res2 = self.client.post(f"/api/vegetable-orders/admin/returns/{ret2.id}/action/", payload2, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 96)  # 92 + 4 = 96

        movement2 = VegetableStockMovement.objects.filter(
            vegetable=self.vegetable,
            movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_RETURN,
        ).latest("created_at")
        self.assertEqual(movement2.delta_grams, 4)
        self.assertEqual(movement2.delta_display, "+4 pcs")

        # Case 3: Return resolution REFUND with restock_item=False (write-off audit movement)
        ret3 = VegetableReturn.objects.create(
            order=order,
            item=order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.POOR_QUALITY,
            status=VegetableReturn.Status.REQUESTED,
        )
        payload3 = {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "restock_item": False,
            "refund_amount": "40.00",
            "admin_notes": "Spoiled produce written off.",
        }
        res3 = self.client.post(f"/api/vegetable-orders/admin/returns/{ret3.id}/action/", payload3, format="json")
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 96)  # unchanged

        movement3 = VegetableStockMovement.objects.filter(
            vegetable=self.vegetable,
            movement_type=VegetableStockMovement.MovementType.RETURN_WRITEOFF,
        ).latest("created_at")
        self.assertEqual(movement3.delta_grams, 0)
        self.assertEqual(movement3.delta_display, "0 pcs")
