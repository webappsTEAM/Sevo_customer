from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import Service, Package, PackageStatus
from inventory.models import Vegetable, VegetableClaim, VegetableStockMovement

User = get_user_model()


class VegetableClaimsAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        self.company = Company.objects.create(
            company_name="FreshFarm Agri",
        )

        self.admin_user = User.objects.create_user(
            username="claim_admin",
            email="claimadmin@freshfarm.test",
            password="adminpassword123",
            role="admin",
            company=self.company,
        )

        self.customer_user = User.objects.create_user(
            username="claim_cust",
            email="claimcust@freshfarm.test",
            password="custpassword123",
            role="customer",
            company=self.company,
        )

        from service_requests.models import CatalogCategory
        self.cat_top = CatalogCategory.objects.create(name="Vegetables", slug="veg_cat_clm")
        self.service = Service.objects.create(
            category=self.cat_top,
            name="Vegetables",
            slug="vegetables",
        )

        self.package = Package.objects.create(
            service=self.service,
            name="Fresh Spinach 250g",
            slug="fresh-spinach-250g",
            base_price=Decimal("25.00"),
            status=PackageStatus.ACTIVE,
        )

        self.vegetable = Vegetable.objects.create(
            package=self.package,
            name="Fresh Spinach",
            sku="VEG-SPN-01",
            stock_quantity_grams=10000,
            default_daily_quantity_grams=15000,
            org=self.company,
        )

    def test_admin_can_create_claim(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "vegetable_id": self.vegetable.id,
            "reason": "WAREHOUSE_SPOILAGE",
            "quantity": 2.5,
            "unit": "kg",
            "estimated_loss_amount": 250.00,
            "notes": "Leaves wilted and yellowed during overnight storage.",
        }
        res = self.client.post("/api/inventory/vegetables/claims/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data["success"])
        self.assertTrue(res.data["data"]["claim_number"].startswith("CLM"))
        self.assertEqual(res.data["data"]["quantity_grams"], 2500)
        self.assertEqual(res.data["data"]["status"], "OPEN")

        # Verify DB
        claim = VegetableClaim.objects.get(claim_number=res.data["data"]["claim_number"])
        self.assertEqual(claim.vegetable, self.vegetable)
        self.assertEqual(claim.quantity_grams, 2500)
        self.assertEqual(claim.reason, VegetableClaim.Reason.WAREHOUSE_SPOILAGE)
        self.assertEqual(claim.created_by, self.admin_user)

    def test_admin_can_list_and_filter_claims(self):
        self.client.force_authenticate(user=self.admin_user)

        c1 = VegetableClaim.objects.create(
            org=self.company,
            vegetable=self.vegetable,
            reason=VegetableClaim.Reason.WAREHOUSE_SPOILAGE,
            quantity_grams=1000,
            status=VegetableClaim.Status.OPEN,
            created_by=self.admin_user,
        )
        c2 = VegetableClaim.objects.create(
            org=self.company,
            vegetable=self.vegetable,
            reason=VegetableClaim.Reason.TRANSIT_DAMAGE,
            quantity_grams=2000,
            status=VegetableClaim.Status.APPROVED,
            created_by=self.admin_user,
        )

        res = self.client.get("/api/inventory/vegetables/claims/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data["success"])
        self.assertEqual(res.data["total_count"], 2)
        self.assertEqual(res.data["status_counts"]["OPEN"], 1)
        self.assertEqual(res.data["status_counts"]["APPROVED"], 1)

        # Filter by status
        res_open = self.client.get("/api/inventory/vegetables/claims/?status=OPEN")
        self.assertEqual(len(res_open.data["data"]), 1)
        self.assertEqual(res_open.data["data"][0]["claim_number"], c1.claim_number)

    def test_admin_can_approve_claim_with_stock_movement_deduction(self):
        self.client.force_authenticate(user=self.admin_user)

        claim = VegetableClaim.objects.create(
            org=self.company,
            vegetable=self.vegetable,
            reason=VegetableClaim.Reason.WAREHOUSE_SPOILAGE,
            quantity_grams=3000,
            status=VegetableClaim.Status.OPEN,
            created_by=self.admin_user,
            notes="3kg spoiled spinach discarded.",
        )

        # Initial stock: 10000g
        self.assertEqual(self.vegetable.stock_quantity_grams, 10000)

        action_res = self.client.post(
            f"/api/inventory/vegetables/claims/{claim.id}/action/",
            {"action": "APPROVE", "notes": "Approved for write-off."},
            format="json",
        )
        self.assertEqual(action_res.status_code, status.HTTP_200_OK)
        self.assertTrue(action_res.data["success"])
        self.assertEqual(action_res.data["data"]["status"], "APPROVED")

        # Verify stock deducted in Vegetable model (10000 - 3000 = 7000g)
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 7000)

        # Verify stock movement ledger entry created
        claim.refresh_from_db()
        self.assertIsNotNone(claim.stock_movement)
        movement = claim.stock_movement
        self.assertEqual(movement.movement_type, VegetableStockMovement.MovementType.CLAIM_WRITEOFF)
        self.assertEqual(movement.delta_grams, -3000)
        self.assertEqual(movement.balance_after_grams, 7000)
        self.assertEqual(movement.entered_by, self.admin_user)
        self.assertEqual(claim.approved_by, self.admin_user)

    def test_admin_can_reject_and_resolve_claim(self):
        self.client.force_authenticate(user=self.admin_user)

        claim = VegetableClaim.objects.create(
            org=self.company,
            vegetable=self.vegetable,
            reason=VegetableClaim.Reason.QC_FAILURE,
            quantity_grams=1000,
            status=VegetableClaim.Status.OPEN,
            created_by=self.admin_user,
        )

        # Reject claim
        rej_res = self.client.post(
            f"/api/inventory/vegetables/claims/{claim.id}/action/",
            {"action": "REJECT", "notes": "QC reinspection passed."},
            format="json",
        )
        self.assertEqual(rej_res.status_code, status.HTTP_200_OK)
        claim.refresh_from_db()
        self.assertEqual(claim.status, VegetableClaim.Status.REJECTED)
        self.assertIsNotNone(claim.resolved_at)

        # Stock should NOT have changed
        self.vegetable.refresh_from_db()
        self.assertEqual(self.vegetable.stock_quantity_grams, 10000)

    def test_non_admin_and_unauthenticated_cannot_access_claims(self):
        # Unauthenticated
        res_anon = self.client.get("/api/inventory/vegetables/claims/")
        self.assertEqual(res_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        # Customer role
        self.client.force_authenticate(user=self.customer_user)
        res_cust = self.client.get("/api/inventory/vegetables/claims/")
        self.assertEqual(res_cust.status_code, status.HTTP_403_FORBIDDEN)
