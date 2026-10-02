from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import Service, Package, PackageStatus
from inventory.models import Vegetable
from vegetable_orders.models import VegetableOrder, VegetableOrderItem, VegetableReturn

User = get_user_model()


class VegetableReturnsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.company = Company.objects.create(
            company_name="FreshFarm Agri",
        )

        self.admin_user = User.objects.create_user(
            username="veg_return_admin",
            email="admin@freshfarm.test",
            password="adminpassword123",
            role="admin",
            company=self.company,
        )

        self.customer_user = User.objects.create_user(
            username="veg_return_cust",
            email="cust@freshfarm.test",
            password="custpassword123",
            role="customer",
            company=self.company,
        )

        self.other_customer = User.objects.create_user(
            username="veg_other_cust",
            email="other@freshfarm.test",
            password="otherpassword123",
            role="customer",
            company=self.company,
        )

        from service_requests.models import CatalogCategory
        self.cat_top = CatalogCategory.objects.create(name="Vegetables", slug="veg_cat_ret")
        self.service = Service.objects.create(
            category=self.cat_top,
            name="Vegetables Service",
            slug="vegetables",
        )

        self.package = Package.objects.create(
            service=self.service,
            name="Fresh Tomatoes 500g",
            slug="fresh-tomatoes-500g",
            base_price=Decimal("40.00"),
            status=PackageStatus.ACTIVE,
        )

        self.vegetable = Vegetable.objects.create(
            package=self.package,
            name="Fresh Tomatoes",
            sku="VEG-TOM-01",
            stock_quantity_grams=5000,
            default_daily_quantity_grams=10000,
            org=self.company,
        )

        # Delivered order for testing customer return
        self.delivered_order = VegetableOrder.objects.create(
            customer=self.customer_user,
            status=VegetableOrder.Status.DELIVERED,
            total_amount=Decimal("80.00"),
            delivery_address="123 Farm Road, City",
        )
        self.item1 = VegetableOrderItem.objects.create(
            order=self.delivered_order,
            package=self.package,
            quantity_grams=500,
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("40.00"),
        )
        self.item2 = VegetableOrderItem.objects.create(
            order=self.delivered_order,
            package=self.package,
            quantity_grams=500,
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("40.00"),
        )

        # Placed order (non-delivered)
        self.placed_order = VegetableOrder.objects.create(
            customer=self.customer_user,
            status=VegetableOrder.Status.PLACED,
            total_amount=Decimal("40.00"),
            delivery_address="123 Farm Road, City",
        )
        self.placed_item = VegetableOrderItem.objects.create(
            order=self.placed_order,
            package=self.package,
            quantity_grams=500,
            unit_price_snapshot=Decimal("40.00"),
            line_amount=Decimal("40.00"),
        )

    def test_customer_can_create_return_on_delivered_order(self):
        self.client.force_authenticate(user=self.customer_user)
        payload = {
            "order_id": self.delivered_order.id,
            "item_id": self.item1.id,
            "reason": "DAMAGED_OR_SPOILED",
            "customer_notes": "Tomatoes arrived crushed and spoiled.",
        }
        res = self.client.post("/api/vegetable-orders/customer/returns/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        self.assertTrue(res.data["data"]["return_number"].startswith("RET"))
        self.assertEqual(res.data["data"]["status"], "REQUESTED")

        # Verify DB record
        ret = VegetableReturn.objects.get(return_number=res.data["data"]["return_number"])
        self.assertEqual(ret.order, self.delivered_order)
        self.assertEqual(ret.item, self.item1)
        self.assertEqual(ret.customer, self.customer_user)
        self.assertEqual(ret.reason, VegetableReturn.Reason.DAMAGED_OR_SPOILED)

    def test_customer_cannot_create_return_on_non_delivered_order(self):
        self.client.force_authenticate(user=self.customer_user)
        payload = {
            "order_id": self.placed_order.id,
            "reason": "DAMAGED_OR_SPOILED",
        }
        res = self.client.post("/api/vegetable-orders/customer/returns/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data["success"])

    def test_customer_cannot_create_return_on_other_customer_order(self):
        self.client.force_authenticate(user=self.other_customer)
        payload = {
            "order_id": self.delivered_order.id,
            "reason": "DAMAGED_OR_SPOILED",
        }
        res = self.client.post("/api/vegetable-orders/customer/returns/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_and_filter_returns(self):
        # Create 2 returns
        ret1 = VegetableReturn.objects.create(
            order=self.delivered_order,
            item=self.item1,
            customer=self.customer_user,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
        )
        ret2 = VegetableReturn.objects.create(
            order=self.delivered_order,
            item=self.item2,
            customer=self.customer_user,
            reason=VegetableReturn.Reason.WRONG_ITEM,
            status=VegetableReturn.Status.APPROVED,
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get("/api/vegetable-orders/admin/returns/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["total_count"], 2)
        self.assertEqual(res.data["status_counts"]["REQUESTED"], 1)
        self.assertEqual(res.data["status_counts"]["APPROVED"], 1)

        # Filter by status
        res_req = self.client.get("/api/vegetable-orders/admin/returns/?status=REQUESTED")
        self.assertEqual(len(res_req.data["data"]), 1)
        self.assertEqual(res_req.data["data"][0]["return_number"], ret1.return_number)

    def test_admin_can_view_detail_and_act_on_return(self):
        ret = VegetableReturn.objects.create(
            order=self.delivered_order,
            item=self.item1,
            customer=self.customer_user,
            reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
            status=VegetableReturn.Status.REQUESTED,
            customer_notes="Crushed tomatoes in pack",
        )

        self.client.force_authenticate(user=self.admin_user)

        # Retrieve detail
        detail_res = self.client.get(f"/api/vegetable-orders/admin/returns/{ret.id}/")
        self.assertEqual(detail_res.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_res.data["data"]["return_number"], ret.return_number)
        self.assertIn("order_items", detail_res.data["data"])

        # Approve and record refund
        action_payload = {
            "status": "APPROVED",
            "resolution_action": "REFUND",
            "refund_amount": 40.00,
            "admin_notes": "Customer provided photos. Marked full refund for damaged pack.",
        }
        action_res = self.client.post(
            f"/api/vegetable-orders/admin/returns/{ret.id}/action/",
            action_payload,
            format="json",
        )
        self.assertEqual(action_res.status_code, status.HTTP_200_OK)
        self.assertTrue(action_res.data["success"])
        self.assertEqual(action_res.data["data"]["status"], "APPROVED")
        self.assertEqual(action_res.data["data"]["resolution_action"], "REFUND")
        self.assertEqual(float(action_res.data["data"]["refund_amount"]), 40.00)

        # Verify DB
        ret.refresh_from_db()
        self.assertEqual(ret.status, VegetableReturn.Status.APPROVED)
        self.assertEqual(ret.resolution_action, VegetableReturn.ResolutionAction.REFUND)
        self.assertEqual(ret.refund_amount, Decimal("40.00"))
        self.assertEqual(ret.handled_by, self.admin_user)

    def test_unauthenticated_and_non_admin_cannot_access_admin_endpoints(self):
        ret = VegetableReturn.objects.create(
            order=self.delivered_order,
            customer=self.customer_user,
            reason=VegetableReturn.Reason.OTHER,
        )

        # Unauthenticated
        res_anon = self.client.get("/api/vegetable-orders/admin/returns/")
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer role
        self.client.force_authenticate(user=self.customer_user)
        res_cust = self.client.get("/api/vegetable-orders/admin/returns/")
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)
