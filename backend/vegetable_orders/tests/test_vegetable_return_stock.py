from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import CatalogCategory, Service, Package, PackageStatus
from inventory.models import Vegetable, VegetableStockMovement
from vegetable_orders.models import VegetableOrder, VegetableOrderItem, VegetableReturn

User = get_user_model()


class VegetableReturnStockIntegrationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.company = Company.objects.create(
            company_name="FreshFarm Agri",
            slug="freshfarm",
        )

        self.admin_user = User.objects.create_user(
            username="veg_ret_admin",
            email="admin@freshfarm.test",
            password="adminpassword123",
            role="admin",
            company=self.company,
        )

        self.customer = User.objects.create_user(
            username="veg_ret_customer",
            email="customer@freshfarm.test",
            password="custpassword123",
            role="customer",
            company=self.company,
        )

        self.cat = CatalogCategory.objects.create(name="Produce", slug="produce_cat")
        self.service = Service.objects.create(category=self.cat, name="Vegetables", slug="vegetables")

        self.package = Package.objects.create(
            service=self.service,
            name="Organic Carrots",
            slug="organic-carrots-500g",
            base_price=Decimal("50.00"),
            status=PackageStatus.ACTIVE,
        )

        self.vegetable = Vegetable.objects.create(
            package=self.package,
            name="Organic Carrots",
            sku="VEG-CAR-01",
            stock_quantity_grams=3000,
            default_daily_quantity_grams=10000,
            org=self.company,
        )

        # Delivered order
        self.order = VegetableOrder.objects.create(
            customer=self.customer,
            status=VegetableOrder.Status.DELIVERED,
            total_amount=Decimal("100.00"),
            delivery_address="456 Farm Road",
        )
        self.order_item = VegetableOrderItem.objects.create(
            order=self.order,
            package=self.package,
            quantity_grams=500,
            unit_price_snapshot=Decimal("50.00"),
            line_amount=Decimal("50.00"),
        )

    def test_replacement_resolution_with_sufficient_stock_deducts_and_creates_movement(self):
        ret = VegetableReturn.objects.create(
            order=self.order,
            item=self.order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.WRONG_ITEM,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
            "admin_notes": "Replacement sent out today.",
        }

        res = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])

        # Check stock deduction: 3000g - 500g = 2500g
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 2500)

        # Verify stock movement
        ret.refresh_from_db()
        self.assertIsNotNone(ret.stock_movement)
        movement = ret.stock_movement
        self.assertEqual(movement.movement_type, VegetableStockMovement.MovementType.RETURN_REPLACEMENT)
        self.assertEqual(movement.delta_grams, -500)
        self.assertEqual(movement.balance_after_grams, 2500)
        self.assertEqual(movement.booking_ref, self.order.order_number)

        # Verify serializer output includes stock_movement_detail
        detail_res = self.client.get(f"/api/vegetable-orders/admin/returns/{ret.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        detail_data = detail_res.data["data"]
        self.assertIsNotNone(detail_data.get("stock_movement_detail"))
        self.assertEqual(detail_data["stock_movement_detail"]["delta_grams"], -500)
        self.assertEqual(detail_data["stock_movement_detail"]["balance_after_grams"], 2500)
        self.assertEqual(detail_data["stock_movement_detail"]["type"], "RETURN_REPLACEMENT")

    def test_replacement_resolution_with_insufficient_stock_blocks_over_fulfillment(self):
        # Set low stock (200g < 500g required)
        self.vegetable.stock_quantity_grams = 200
        self.vegetable.save()

        ret = VegetableReturn.objects.create(
            order=self.order,
            item=self.order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
            "admin_notes": "Attempting replacement without enough stock",
        }

        res = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data["success"])
        self.assertIn("Insufficient stock", res.data["message"])

        # Verify stock remains unchanged at 200g
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 200)

        # Verify no stock movement created
        self.assertFalse(
            VegetableStockMovement.objects.filter(
                movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT
            ).exists()
        )

    def test_refund_resolution_with_restock_item_true_restores_stock(self):
        ret = VegetableReturn.objects.create(
            order=self.order,
            item=self.order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.WRONG_ITEM,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "refund_amount": 50.00,
            "restock_item": True,
            "admin_notes": "Item unopened and returned in pristine condition.",
        }

        res = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])

        # Check stock restore: 3000g + 500g = 3500g
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 3500)

        # Verify stock movement
        ret.refresh_from_db()
        self.assertIsNotNone(ret.stock_movement)
        movement = ret.stock_movement
        self.assertEqual(movement.movement_type, VegetableStockMovement.MovementType.RESTOCKED_ON_RETURN)
        self.assertEqual(movement.delta_grams, 500)
        self.assertEqual(movement.balance_after_grams, 3500)
        self.assertEqual(movement.booking_ref, self.order.order_number)

    def test_refund_resolution_with_restock_item_false_logs_writeoff_with_unchanged_live_stock(self):
        ret = VegetableReturn.objects.create(
            order=self.order,
            item=self.order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "refund_amount": 50.00,
            "restock_item": False,
            "admin_notes": "Spoiled goods discarded upon return.",
        }

        res = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])

        # Live stock must remain 3000g
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 3000)

        # Verify writeoff stock movement created in ledger
        ret.refresh_from_db()
        self.assertIsNotNone(ret.stock_movement)
        movement = ret.stock_movement
        self.assertEqual(movement.movement_type, VegetableStockMovement.MovementType.RETURN_WRITEOFF)
        self.assertEqual(movement.delta_grams, 0)
        self.assertEqual(movement.balance_after_grams, 3000)
        self.assertIn("write-off", movement.reason)

    def test_resolution_is_idempotent(self):
        ret = VegetableReturn.objects.create(
            order=self.order,
            item=self.order_item,
            customer=self.customer,
            reason=VegetableReturn.Reason.WRONG_ITEM,
            status=VegetableReturn.Status.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
        }

        # First resolution
        res1 = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 2500)
        movements_count_1 = VegetableStockMovement.objects.filter(
            movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT
        ).count()
        self.assertEqual(movements_count_1, 1)

        # Second resolution call on same return
        res2 = self.client.post(f"/api/vegetable-orders/admin/returns/{ret.id}/action/", payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        self.vegetable.refresh_from_db()
        # Stock must not be deducted again
        self.assertEqual(self.vegetable.stock_quantity_grams, 2500)
        movements_count_2 = VegetableStockMovement.objects.filter(
            movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT
        ).count()
        self.assertEqual(movements_count_2, 1)
