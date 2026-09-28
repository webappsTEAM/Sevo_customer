from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from service_requests.models import Service, Package, PackageStatus, CatalogCategory, PackageVariant
from inventory.models import VegetableCategory, Vegetable, ApprovalStatus
from vegetable_orders.models import VegetableOrder, VegetableOrderItem
from carts.models import Cart, CartItem, CartType

User = get_user_model()


class VegetablePackageVariantTests(TestCase):
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
        self.veg_category = VegetableCategory.objects.create(
            org=self.company,
            name="Root Vegetables",
            slug="root-vegetables",
            status=ApprovalStatus.APPROVED,
            is_active=True,
        )

    def test_entry_point_a_multi_variant_repeater_submission_and_approval(self):
        """Entry Point A: Submitting a new produce item with multi-variant repeater array."""
        payload = {
            "request_type": "vegetable",
            "category_id": self.veg_category.id,
            "vegetable_name": "Premium Ooty Carrots",
            "vegetable_sku": "OOTY-CARROT-01",
            "unit_basis": "WEIGHT",
            "price": 45.00,
            "mrp": 55.00,
            "pack_value": "500",
            "pack_size": "500 g",
            "variants": [
                {
                    "name": "250 g",
                    "pack_value": "250",
                    "unit": "g",
                    "unit_basis": "WEIGHT",
                    "base_price": 25.00,
                    "mrp": 30.00,
                    "is_default": False,
                },
                {
                    "name": "500 g",
                    "pack_value": "500",
                    "unit": "g",
                    "unit_basis": "WEIGHT",
                    "base_price": 45.00,
                    "mrp": 55.00,
                    "is_default": True,
                },
                {
                    "name": "1 kg",
                    "pack_value": "1",
                    "unit": "kg",
                    "unit_basis": "WEIGHT",
                    "base_price": 80.00,
                    "mrp": 100.00,
                    "is_default": False,
                },
            ],
        }

        res = self.client.post("/api/inventory/vegetables/single-request/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        veg_id = res.data["vegetable"]["id"]

        veg = Vegetable.objects.get(id=veg_id)
        self.assertEqual(veg.status, ApprovalStatus.PENDING)
        self.assertEqual(veg.unit_basis, "WEIGHT")

        # Admin approves the vegetable item
        review_res = self.client.post(
            f"/api/inventory/vegetables/{veg.id}/review/",
            {"action": "APPROVE"},
            format="json",
        )
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)

        veg.refresh_from_db()
        self.assertEqual(veg.status, ApprovalStatus.APPROVED)

        # Linked Package and PackageVariants created
        pkg = Package.objects.filter(stock_item=veg).first()
        self.assertIsNotNone(pkg)
        self.assertEqual(pkg.status, PackageStatus.ACTIVE)

        variants = PackageVariant.objects.filter(package=pkg, status="APPROVED").order_by("pack_value")
        self.assertEqual(variants.count(), 3)

        # Check conversions and default flags
        v_250g = variants.filter(pack_value=250).first()
        self.assertIsNotNone(v_250g)
        self.assertEqual(v_250g.base_unit_deduction, Decimal("250.000"))
        self.assertFalse(v_250g.is_default)

        v_500g = variants.filter(pack_value=500).first()
        self.assertIsNotNone(v_500g)
        self.assertEqual(v_500g.base_unit_deduction, Decimal("500.000"))
        self.assertTrue(v_500g.is_default)

        v_1kg = variants.filter(pack_value=1, unit="kg").first()
        self.assertIsNotNone(v_1kg)
        self.assertEqual(v_1kg.base_unit_deduction, Decimal("1000.000"))
        self.assertFalse(v_1kg.is_default)

    def test_entry_point_b_add_variant_to_existing_approved_product(self):
        """Entry Point B: Proposing a new variant for an already approved product."""
        # Setup existing approved vegetable and package
        veg = Vegetable.objects.create(
            org=self.company,
            name="Farm Beetroot",
            sku="BEET-001",
            category=self.veg_category,
            unit_basis="WEIGHT",
            status=ApprovalStatus.APPROVED,
        )
        pkg = Package.objects.create(
            service=self.veg_service,
            stock_item=veg,
            name=veg.name,
            slug="farm-beetroot",
            base_price=Decimal("30.00"),
            offer_price=Decimal("40.00"),
            duration="500 g",
            status=PackageStatus.ACTIVE,
        )
        default_var = PackageVariant.objects.create(
            package=pkg,
            vegetable=veg,
            name="500 g",
            pack_value=Decimal("500"),
            unit="g",
            unit_basis="WEIGHT",
            base_price=Decimal("30.00"),
            mrp=Decimal("40.00"),
            is_default=True,
            status="APPROVED",
            is_active=True,
        )

        # Vendor proposes new 2 kg family pack variant
        variant_payload = {
            "request_type": "variant",
            "target_vegetable_id": veg.id,
            "variant_name": "2 kg",
            "pack_value": "2",
            "unit": "kg",
            "unit_basis": "WEIGHT",
            "price": 110.00,
            "mrp": 140.00,
            "sku": "BEET-2KG",
        }
        res = self.client.post("/api/inventory/vegetables/single-request/", variant_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        variant_id = res.data["variant"]["id"]

        new_variant = PackageVariant.objects.get(id=variant_id)
        self.assertEqual(new_variant.status, "PENDING")
        self.assertFalse(new_variant.is_active)
        self.assertEqual(new_variant.base_unit_deduction, Decimal("2000.000"))

        # Verify Approval Queue serializer formats price and pack_size correctly for variants
        queue_res = self.client.get("/api/inventory/vegetables/approval-queue/")
        self.assertEqual(queue_res.status_code, status.HTTP_200_OK)
        variant_approval_items = [
            item for item in queue_res.data.get("data", [])
            if item.get("request_type") == "variant" and item.get("id") == new_variant.id
        ]
        self.assertEqual(len(variant_approval_items), 1)
        item_data = variant_approval_items[0]
        self.assertEqual(item_data.get("price"), "110.00")
        self.assertEqual(item_data.get("base_price"), "110.00")
        self.assertEqual(item_data.get("mrp"), "140.00")
        self.assertEqual(item_data.get("pack_size"), "2 kg")

        # Review endpoint approval
        review_res = self.client.post(
            f"/api/inventory/vegetables/variants/{new_variant.id}/review/",
            {"action": "APPROVE"},
            format="json",
        )
        self.assertEqual(review_res.status_code, status.HTTP_200_OK)

        new_variant.refresh_from_db()
        self.assertEqual(new_variant.status, "APPROVED")
        self.assertTrue(new_variant.is_active)

    def test_shared_vegetable_stock_pool_deduction_across_variants(self):
        """Checkout with multiple variants draws from the single master Vegetable stock pool."""
        veg = Vegetable.objects.create(
            org=self.company,
            name="Country Tomato",
            sku="TOM-001",
            category=self.veg_category,
            unit_basis="WEIGHT",
            stock_quantity_grams=10000,  # 10 kg in shared pool
            status=ApprovalStatus.APPROVED,
        )
        pkg = Package.objects.create(
            service=self.veg_service,
            stock_item=veg,
            name=veg.name,
            slug="country-tomato",
            base_price=Decimal("30.00"),
            status=PackageStatus.ACTIVE,
        )
        v_500g = PackageVariant.objects.create(
            package=pkg,
            vegetable=veg,
            name="500 g",
            pack_value=Decimal("500"),
            unit="g",
            unit_basis="WEIGHT",
            base_price=Decimal("25.00"),
            mrp=Decimal("30.00"),
            is_default=True,
            status="APPROVED",
            is_active=True,
        )
        v_2kg = PackageVariant.objects.create(
            package=pkg,
            vegetable=veg,
            name="2 kg",
            pack_value=Decimal("2"),
            unit="kg",
            unit_basis="WEIGHT",
            base_price=Decimal("90.00"),
            mrp=Decimal("110.00"),
            is_default=False,
            status="APPROVED",
            is_active=True,
        )

        customer = User.objects.create_user(
            username="customer_tester",
            email="cust@test.com",
            password="password123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=customer)

        # Add 2 x 500g variant (1000g) and 3 x 2kg variant (6000g) to cart
        cart = Cart.objects.create(customer=customer, cart_type=CartType.DAILY_ESSENTIALS)
        CartItem.objects.create(
            cart=cart,
            package=pkg,
            variant=v_500g,
            quantity=2,
            unit_price_snapshot=Decimal("25.00"),
        )
        CartItem.objects.create(
            cart=cart,
            package=pkg,
            variant=v_2kg,
            quantity=3,
            unit_price_snapshot=Decimal("90.00"),
        )

        checkout_payload = {
            "cart_types": ["daily_essentials"],
            "grocery": {"delivery_address": "45 Green Way, Sector 4"},
        }
        res = self.client.post("/api/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Refresh vegetable stock pool
        veg.refresh_from_db()
        # 10,000g initial - (2 * 500g) - (3 * 2000g) = 10,000 - 1,000 - 6,000 = 3,000g remaining
        self.assertEqual(veg.stock_quantity_grams, 3000)

        # Verify order items snapshots
        order = VegetableOrder.objects.filter(customer=customer).first()
        self.assertIsNotNone(order)
        items = list(order.items.order_by("id"))
        self.assertEqual(len(items), 2)

        item1, item2 = items[0], items[1]
        self.assertEqual(item1.variant, v_500g)
        self.assertEqual(item1.quantity_grams, 1000)
        self.assertEqual(item1.variant_name_snapshot, "500 g")

        self.assertEqual(item2.variant, v_2kg)
        self.assertEqual(item2.quantity_grams, 6000)
        self.assertEqual(item2.variant_name_snapshot, "2 kg")

    def test_count_based_shared_stock_pool_deduction_across_variants(self):
        """COUNT-based item: Multiple variants (e.g. Single vs Pack of 6) draw from pieces pool."""
        veg = Vegetable.objects.create(
            org=self.company,
            name="Organic Sweet Corn",
            sku="CORN-COUNT-01",
            category=self.veg_category,
            unit_basis="COUNT",
            stock_quantity_grams=50,  # 50 pieces in shared pool
            status=ApprovalStatus.APPROVED,
        )
        pkg = Package.objects.create(
            service=self.veg_service,
            stock_item=veg,
            name=veg.name,
            slug="sweet-corn",
            base_price=Decimal("15.00"),
            status=PackageStatus.ACTIVE,
        )
        v_1pc = PackageVariant.objects.create(
            package=pkg,
            vegetable=veg,
            name="1 pc",
            pack_value=Decimal("1"),
            unit="pcs",
            unit_basis="COUNT",
            base_price=Decimal("15.00"),
            mrp=Decimal("20.00"),
            is_default=True,
            status="APPROVED",
            is_active=True,
        )
        v_6pcs = PackageVariant.objects.create(
            package=pkg,
            vegetable=veg,
            name="Pack of 6",
            pack_value=Decimal("6"),
            unit="pcs",
            unit_basis="COUNT",
            base_price=Decimal("80.00"),
            mrp=Decimal("120.00"),
            is_default=False,
            status="APPROVED",
            is_active=True,
        )

        customer = User.objects.create_user(
            username="corn_buyer",
            email="corn@test.com",
            password="password123",
            role=User.Role.CUSTOMER,
        )
        self.client.force_authenticate(user=customer)

        # Add 4 x 1pc (4 pcs) and 2 x 6pcs (12 pcs) to cart
        cart = Cart.objects.create(customer=customer, cart_type=CartType.DAILY_ESSENTIALS)
        CartItem.objects.create(
            cart=cart,
            package=pkg,
            variant=v_1pc,
            quantity=4,
            unit_price_snapshot=Decimal("15.00"),
        )
        CartItem.objects.create(
            cart=cart,
            package=pkg,
            variant=v_6pcs,
            quantity=2,
            unit_price_snapshot=Decimal("80.00"),
        )

        checkout_payload = {
            "cart_types": ["daily_essentials"],
            "grocery": {"delivery_address": "88 Farm Lane"},
        }
        res = self.client.post("/api/orders/checkout/", checkout_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Refresh vegetable stock pool
        veg.refresh_from_db()
        # 50 pieces initial - (4 * 1) - (2 * 6) = 50 - 4 - 12 = 34 pieces remaining
        self.assertEqual(veg.stock_quantity_grams, 34)
