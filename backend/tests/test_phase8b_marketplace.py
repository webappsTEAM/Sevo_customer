"""
backend/tests/test_phase8b_marketplace.py

Automated integration and unit test suite for Phase 8B:
Customer Marketplace for Seller Hub Products.

Tests cover:
1. Published Vendor products appear in customer marketplace feed.
2. Unapproved/out-of-stock products do not appear in customer feed.
3. Category browsing and search filtering.
4. Single-seller cart rule enforcement and seller switch with cart clear.
5. Authoritative price & stock validation prior to checkout.
6. Canonical customer order creation and idempotent intake to Vendor.
7. Failed stock reservation cleanly aborts order creation.
8. Idempotent cancellation releases stock on Vendor.
9. Privacy protection: Customer view does not leak private seller/inventory data.
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from carts.models import Cart, CartItem, CartType, CartStatus
from orders.models import MarketplaceOrder, MarketplaceOrderItem, MarketplaceOrderOutbox
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

User = get_user_model()


class Phase8BMarketplaceTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.db import connection
        engine = connection.settings_dict.get("ENGINE", "")
        if "sqlite3" not in engine:
            raise RuntimeError(
                f"FATAL: Test ran against non-sqlite engine: {engine}. Tests are restricted to temporary SQLite only."
            )

    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="customer_alice",
            email="alice@example.com",
            password="testpassword123",
            first_name="Alice",
            last_name="Sharma",
        )
        self.customer2 = User.objects.create_user(
            username="customer_bob",
            email="bob@example.com",
            password="testpassword123",
            first_name="Bob",
            last_name="Verma",
        )
        self.client.force_authenticate(user=self.customer)

        self.mock_published_products = [
            {
                "id": 101,
                "sku": "SKU-MILK-001",
                "title": "Organic Farm Fresh Milk 1L",
                "brand": "PureDairy",
                "unit": "L",
                "pack_size": "1 Litre",
                "mrp": "75.00",
                "selling_price": "68.00",
                "currency": "INR",
                "primary_image": "https://cdn.example.com/milk.jpg",
                "images": ["https://cdn.example.com/milk.jpg"],
                "seller_id": 10,
                "seller_name": "Fresh Dairy Farms",
                "category_hierarchy": [
                    {"id": 1, "name": "Groceries", "slug": "groceries"},
                    {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                ],
                "available_stock": 50,
                "in_stock": True,
            },
            {
                "id": 102,
                "sku": "SKU-PANEER-002",
                "title": "Fresh Malai Paneer 200g",
                "brand": "PureDairy",
                "unit": "g",
                "pack_size": "200 g",
                "mrp": "120.00",
                "selling_price": "105.00",
                "currency": "INR",
                "primary_image": "https://cdn.example.com/paneer.jpg",
                "images": ["https://cdn.example.com/paneer.jpg"],
                "seller_id": 10,
                "seller_name": "Fresh Dairy Farms",
                "category_hierarchy": [
                    {"id": 1, "name": "Groceries", "slug": "groceries"},
                    {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                ],
                "available_stock": 25,
                "in_stock": True,
            },
            {
                "id": 201,
                "sku": "SKU-ATTA-001",
                "title": "Sharbati Whole Wheat Atta 5kg",
                "brand": "PristineGrains",
                "unit": "kg",
                "pack_size": "5 kg",
                "mrp": "320.00",
                "selling_price": "285.00",
                "currency": "INR",
                "primary_image": "https://cdn.example.com/atta.jpg",
                "images": ["https://cdn.example.com/atta.jpg"],
                "seller_id": 20,
                "seller_name": "Grain Superstore",
                "category_hierarchy": [
                    {"id": 1, "name": "Groceries", "slug": "groceries"},
                    {"id": 3, "name": "Atta & Flours", "slug": "atta-flours"},
                ],
                "available_stock": 15,
                "in_stock": True,
            }
        ]

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_products")
    def test_01_published_products_appear_in_marketplace_feed(self, mock_fetch):
        """Published Vendor products appear in the customer marketplace feed."""
        mock_fetch.return_value = {
            "success": True,
            "data": {
                "count": 3,
                "page": 1,
                "page_size": 20,
                "results": self.mock_published_products,
            }
        }

        resp = self.client.get("/api/marketplace/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data.get("results", [])
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0]["title"], "Organic Farm Fresh Milk 1L")
        self.assertEqual(results[0]["seller_name"], "Fresh Dairy Farms")

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_product_detail")
    def test_02_product_detail_and_unapproved_rejection(self, mock_detail):
        """Active product returns detail; unapproved/out-of-stock returns 404."""
        # 1. Active product
        mock_detail.return_value = {
            "success": True,
            "data": self.mock_published_products[0]
        }
        resp = self.client.get("/api/marketplace/products/101/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["sku"], "SKU-MILK-001")

        # 2. Ineligible product (Vendor returns 404)
        mock_detail.return_value = {
            "success": False,
            "status_code": 404,
            "message": "Product not found or unavailable"
        }
        resp_404 = self.client.get("/api/marketplace/products/999/")
        self.assertEqual(resp_404.status_code, status.HTTP_404_NOT_FOUND)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_03_category_hierarchy_extraction(self, mock_get_cats):
        """Categories are returned from Vendor category tree without mixing service categories."""
        mock_get_cats.return_value = {
            "success": True,
            "data": [
                {"id": 1, "name": "Groceries", "slug": "groceries"},
                {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                {"id": 3, "name": "Atta & Flours", "slug": "atta-flours"},
            ],
        }
        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cats = resp.data.get("data", [])
        cat_names = [c["name"] for c in cats]
        self.assertIn("Groceries", cat_names)
        self.assertIn("Dairy & Eggs", cat_names)
        self.assertIn("Atta & Flours", cat_names)
        # Verify no service categories present
        self.assertNotIn("AC & Appliance", cat_names)
        self.assertNotIn("Goods & Transport", cat_names)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_product_detail")
    def test_04_single_seller_cart_rule_and_clear_choice(self, mock_detail):
        """Adding from same seller succeeds; adding from different seller triggers 409 until cleared."""
        # Setup mock returns
        def detail_side_effect(product_id):
            for p in self.mock_published_products:
                if p["id"] == product_id:
                    return {"success": True, "data": p}
            return {"success": False, "status_code": 404}

        mock_detail.side_effect = detail_side_effect

        # 1. Add item from Seller 10 (Fresh Dairy Farms)
        resp1 = self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 101,
            "quantity": 2,
        })
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)

        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.MARKETPLACE, status=CartStatus.ACTIVE)
        self.assertEqual(cart.seller_id, 10)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().quantity, 2)
        self.assertEqual(cart.items.first().unit_price_snapshot, Decimal("68.00"))

        # 2. Add another item from same Seller 10
        resp2 = self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 102,
            "quantity": 1,
        })
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(cart.items.count(), 2)

        # 3. Attempt to add item from Seller 20 (Grain Superstore) -> 409 Conflict
        resp3 = self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 201,
            "quantity": 1,
        })
        self.assertEqual(resp3.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(resp3.data.get("error"), "seller_mismatch")
        self.assertEqual(resp3.data.get("current_seller_id"), 10)
        self.assertEqual(resp3.data.get("new_seller_id"), 20)
        self.assertEqual(cart.items.count(), 2)  # Unchanged

        # 4. Add item with clear_cart=True -> Cart is cleared and new seller item is added
        resp4 = self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 201,
            "quantity": 1,
            "clear_cart": True,
        })
        self.assertEqual(resp4.status_code, status.HTTP_201_CREATED)
        cart.refresh_from_db()
        self.assertEqual(cart.seller_id, 20)
        self.assertEqual(cart.items.count(), 1)
        self.assertEqual(cart.items.first().seller_product_id, 201)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_product_detail")
    def test_05_checkout_validates_and_creates_canonical_order(self, mock_detail, mock_val, mock_intake):
        """Checkout performs server-side validation, intake to vendor, and creates canonical order."""
        mock_detail.return_value = {"success": True, "data": self.mock_published_products[0]}
        
        # Add item to cart
        self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 101,
            "quantity": 3,
        })

        # Mock validation success
        mock_val.return_value = {
            "success": True,
            "is_valid": True,
            "validation": {
                "is_valid": True,
                "subtotal": "204.00",
                "items": [
                    {
                        "product_id": 101,
                        "status": "AVAILABLE",
                        "requested_quantity": 3,
                        "unit_price": "68.00",
                    }
                ]
            }
        }

        # Mock vendor order intake success
        mock_intake.return_value = {
            "success": True,
            "data": {
                "message": "Order created",
                "order": {
                    "id": 45,
                    "order_number": "ORD-2026-0045",
                    "status": "NEW",
                }
            }
        }

        resp = self.client.post("/api/orders/marketplace/checkout/", {
            "delivery_address": "123 Green Avenue, Bengaluru, KA - 560001",
            "customer_phone": "+919876543210",
            "payment_method": "UPI",
            "payment_transaction_id": "TXN_UPI_998811",
        })

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order_data = resp.data.get("data", {})
        self.assertTrue(order_data.get("order_number").startswith("MKT"))
        self.assertEqual(order_data.get("status"), "CONFIRMED")
        self.assertEqual(order_data.get("vendor_order_number"), "ORD-2026-0045")
        self.assertEqual(order_data.get("vendor_intake_synced"), True)
        self.assertEqual(len(order_data.get("items", [])), 1)

        # Verify Cart is now checked out
        cart = Cart.objects.get(customer=self.customer, cart_type=CartType.MARKETPLACE)
        self.assertEqual(cart.status, CartStatus.CHECKED_OUT)

        # Verify Outbox is PROCESSED
        outbox = MarketplaceOrderOutbox.objects.filter(source_order_id=order_data["order_number"]).first()
        self.assertIsNotNone(outbox)
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.PROCESSED)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_product_detail")
    def test_06_failed_price_or_stock_validation_aborts_checkout(self, mock_detail, mock_val):
        """If validation fails, checkout is aborted and no confirmed order is created."""
        mock_detail.return_value = {"success": True, "data": self.mock_published_products[0]}
        
        self.client.post("/api/carts/marketplace/items/", {
            "seller_product_id": 101,
            "quantity": 10,
        })

        # Mock validation failure (Insufficient stock)
        mock_val.return_value = {
            "success": True,
            "is_valid": False,
            "validation": {
                "is_valid": False,
                "errors": [
                    {
                        "product_id": 101,
                        "code": "INSUFFICIENT_STOCK",
                        "available_quantity": 2,
                        "requested_quantity": 10,
                        "message": "Only 2 unit(s) available for 'Organic Farm Fresh Milk 1L'."
                    }
                ]
            }
        }

        resp = self.client.post("/api/orders/marketplace/checkout/", {
            "delivery_address": "123 Green Avenue, Bengaluru",
        })

        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only 2 unit(s) available", resp.data.get("message", ""))
        self.assertEqual(MarketplaceOrder.objects.count(), 0)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_07_cancellation_releases_stock_idempotently(self, mock_cancel):
        """Cancellation notifies Vendor once and is idempotent on repeat calls."""
        mock_cancel.return_value = {
            "success": True,
            "data": {
                "released_reservations_count": 1,
                "order_status": "CANCELLED"
            }
        }

        order = MarketplaceOrder.objects.create(
            order_number="MKT00099",
            customer=self.customer,
            seller_id=10,
            seller_name="Fresh Dairy Farms",
            status=MarketplaceOrder.Status.CONFIRMED,
            total_amount=Decimal("136.00"),
            delivery_address="123 Green Avenue",
            vendor_intake_synced=True,
        )

        # 1. First cancellation call
        resp1 = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Changed my mind",
        })
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CANCELLED)
        mock_cancel.assert_called_once_with(
            source_order_id="MKT00099",
            cancellation_reason="Changed my mind",
            cancelled_by="CUSTOMER",
        )

        # 2. Second cancellation call (Idempotent repeat)
        resp2 = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Changed my mind",
        })
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data.get("data", {}).get("already_cancelled", False))
        # Verify vendor cancel was not called a second time
        self.assertEqual(mock_cancel.call_count, 1)

    def test_08_order_privacy_and_customer_isolation(self):
        """Customer B cannot view or cancel Customer A's marketplace order."""
        order_a = MarketplaceOrder.objects.create(
            order_number="MKT00100",
            customer=self.customer,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
            total_amount=Decimal("68.00"),
            delivery_address="Alice's Home",
        )

        # Authenticate as customer B
        self.client.force_authenticate(user=self.customer2)

        # Customer B tries to view Customer A's order -> 404
        resp_view = self.client.get(f"/api/orders/marketplace/{order_a.order_number}/")
        self.assertEqual(resp_view.status_code, status.HTTP_404_NOT_FOUND)

        # Customer B tries to cancel Customer A's order -> 404
        resp_cancel = self.client.post(f"/api/orders/marketplace/{order_a.order_number}/cancel/")
        self.assertEqual(resp_cancel.status_code, status.HTTP_404_NOT_FOUND)

    def test_09_my_orders_merges_marketplace_safely(self):
        """GET /api/orders/my/ returns MarketplaceOrder alongside other orders."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT00101",
            customer=self.customer,
            seller_id=10,
            seller_name="Fresh Dairy Farms",
            status=MarketplaceOrder.Status.PACKING,
            total_amount=Decimal("150.00"),
            delivery_address="Alice's Home",
        )
        MarketplaceOrderItem.objects.create(
            order=order,
            seller_product_id=101,
            product_title="Organic Farm Fresh Milk 1L",
            quantity=2,
            unit_price_snapshot=Decimal("75.00"),
            line_amount=Decimal("150.00"),
        )

        resp = self.client.get("/api/orders/my/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get("data", [])
        mkt_orders = [o for o in data if o.get("order_type") == "marketplace"]
        self.assertEqual(len(mkt_orders), 1)
        self.assertEqual(mkt_orders[0]["order_number"], "MKT00101")
        self.assertEqual(mkt_orders[0]["status_label"], "Seller is packing")
        self.assertEqual(mkt_orders[0]["detail"]["items"][0]["product_title"], "Organic Farm Fresh Milk 1L")
