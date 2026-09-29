"""
orders/tests/test_marketplace_payment.py

Comprehensive test suite for Razorpay 2-step Payment Intent, UPI collection,
HMAC signature verification, webhook safety net, and cart preservation.
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch
import json

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from carts.models import Cart, CartItem, CartType, CartStatus
from orders.models import (
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceOrderOutbox,
    MarketplacePaymentIntent,
)

User = get_user_model()


@override_settings(
    RAZORPAY_KEY_ID="rzp_test_samplekey123",
    RAZORPAY_KEY_SECRET="rzp_test_samplesecret456",
    RAZORPAY_WEBHOOK_SECRET="rzp_test_webhooksecret789",
    PAYMENT_SANDBOX_MODE=False,
)
class MarketplacePaymentTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="CalServices", slug="calservices")
        self.customer = User.objects.create_user(
            username="upi_customer",
            email="upi@example.com",
            phone="9876543210",
            password="Password123!",
            role="customer",
            company=self.company,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.customer)

        # Create active marketplace cart
        self.cart = Cart.objects.create(
            customer=self.customer,
            cart_type=CartType.MARKETPLACE,
            status=CartStatus.ACTIVE,
            seller_id=101,
            seller_name="Fresh Mart",
        )
        self.item1 = CartItem.objects.create(
            cart=self.cart,
            seller_product_id=501,
            product_title="Atta 5kg",
            product_sku="ATTA-5",
            unit="piece",
            quantity=2,
            unit_price_snapshot=Decimal("200.00"),
            mrp_snapshot=Decimal("250.00"),
            warehouse_id=1,
            warehouse_name="Main Hub",
            seller_id=101,
            seller_name="Fresh Mart",
        )
        self.item2 = CartItem.objects.create(
            cart=self.cart,
            seller_product_id=502,
            product_title="Basmati Rice 1kg",
            product_sku="RICE-1",
            unit="piece",
            quantity=1,
            unit_price_snapshot=Decimal("150.00"),
            mrp_snapshot=Decimal("180.00"),
            warehouse_id=1,
            warehouse_name="Main Hub",
            seller_id=101,
            seller_name="Fresh Mart",
        )

        self.checkout_payload = {
            "delivery_address": "123 Green Street, Hosur",
            "customer_name": "Ravi Kumar",
            "customer_phone": "9876543210",
            "customer_email": "upi@example.com",
            "payment_method": "UPI",
            "fulfilment_type": "DELIVERY",
        }

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_initiate_payment_creates_razorpay_order_and_payment_intent(self, mock_get_client, mock_validate_cart):
        """
        Step 1: Tests that initiate-payment validates cart with vendor, creates Razorpay order,
        persists a MarketplacePaymentIntent with status CREATED, and returns required frontend fields.
        """
        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}

        mock_rp = MagicMock()
        mock_rp.order.create.return_value = {"id": "order_rzp_test_001", "amount": 55000, "currency": "INR"}
        mock_get_client.return_value = mock_rp

        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", self.checkout_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", {})
        self.assertEqual(data.get("razorpay_order_id"), "order_rzp_test_001")
        self.assertEqual(data.get("amount"), "550.00")
        self.assertEqual(data.get("amount_paise"), 55000)
        self.assertEqual(data.get("currency"), "INR")
        self.assertEqual(data.get("key_id"), "rzp_test_samplekey123")

        # Verify DB intent record
        intent = MarketplacePaymentIntent.objects.filter(razorpay_order_id="order_rzp_test_001").first()
        self.assertIsNotNone(intent)
        self.assertEqual(intent.customer, self.customer)
        self.assertEqual(intent.amount, Decimal("550.00"))
        self.assertEqual(intent.status, MarketplacePaymentIntent.Status.CREATED)
        self.assertEqual(intent.checkout_payload.get("delivery_address"), "123 Green Street, Hosur")

    def test_initiate_payment_rejects_empty_cart(self):
        """Initiate payment should return 400 when cart has no items."""
        self.cart.items.all().delete()
        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", self.checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("empty", response.data.get("message", "").lower())

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    def test_initiate_payment_rejects_out_of_stock_vendor_cart(self, mock_validate_cart):
        """Initiate payment should reject before payment creation if vendor stock check fails."""
        mock_validate_cart.return_value = {
            "success": False,
            "is_valid": False,
            "validation": {"errors": [{"message": "Atta 5kg is out of stock."}]},
        }

        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", self.checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketplacePaymentIntent.objects.count(), 0)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_verify_payment_valid_signature_finalizes_order(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        Step 2: Tests that verify-payment authoritatively verifies HMAC signature,
        marks intent PAID, creates MarketplaceOrder(s), calls vendor intake, and marks cart checked out.
        """
        intent = MarketplacePaymentIntent.objects.create(
            customer=self.customer,
            cart=self.cart,
            razorpay_order_id="order_rzp_test_002",
            amount=Decimal("550.00"),
            currency="INR",
            status=MarketplacePaymentIntent.Status.CREATED,
            checkout_payload=self.checkout_payload,
            idempotency_key="intent_key_test_002",
        )

        mock_rp = MagicMock()
        mock_rp.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_rp

        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 901, "order_number": "VEND-00901"}},
        }

        verify_payload = {
            "razorpay_order_id": "order_rzp_test_002",
            "razorpay_payment_id": "pay_test_9999",
            "razorpay_signature": "valid_mock_signature_hex",
        }

        response = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("data", {})
        self.assertTrue(len(data.get("orders", [])) > 0)

        # Check MarketplacePaymentIntent updated to PAID
        intent.refresh_from_db()
        self.assertEqual(intent.status, MarketplacePaymentIntent.Status.PAID)
        self.assertEqual(intent.razorpay_payment_id, "pay_test_9999")

        # Check MarketplaceOrder created
        order = MarketplaceOrder.objects.filter(customer=self.customer, payment_transaction_id="pay_test_9999").first()
        self.assertIsNotNone(order)
        self.assertEqual(order.payment_status, "PAID")
        self.assertEqual(order.payment_method, "UPI")
        self.assertEqual(order.total_amount, Decimal("550.00"))
        self.assertEqual(order.vendor_order_id, 901)
        self.assertTrue(order.vendor_intake_synced)

        # Check cart status
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.status, CartStatus.CHECKED_OUT)

    @patch("orders.marketplace_views._get_razorpay_client")
    def test_verify_payment_invalid_signature_fails_and_preserves_cart(self, mock_get_client):
        """
        Step 2 security test: An invalid/tampered signature must be rejected,
        marking the intent FAILED and leaving the customer's cart completely untouched.
        """
        intent = MarketplacePaymentIntent.objects.create(
            customer=self.customer,
            cart=self.cart,
            razorpay_order_id="order_rzp_test_tampered",
            amount=Decimal("550.00"),
            currency="INR",
            status=MarketplacePaymentIntent.Status.CREATED,
            checkout_payload=self.checkout_payload,
        )

        mock_rp = MagicMock()
        mock_rp.utility.verify_payment_signature.side_effect = Exception("Signature verification failed")
        mock_get_client.return_value = mock_rp

        verify_payload = {
            "razorpay_order_id": "order_rzp_test_tampered",
            "razorpay_payment_id": "pay_fake_001",
            "razorpay_signature": "fake_signature",
        }

        response = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Intent must be marked FAILED
        intent.refresh_from_db()
        self.assertEqual(intent.status, MarketplacePaymentIntent.Status.FAILED)

        # Cart must remain ACTIVE and untouched
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.status, CartStatus.ACTIVE)
        self.assertEqual(self.cart.items.count(), 2)

        # No MarketplaceOrder created
        self.assertEqual(MarketplaceOrder.objects.count(), 0)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_razorpay_webhook_safety_net_finalizes_order(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        Webhook safety-net test: If customer closes tab before verify-payment fires,
        the server-to-server webhook captures payment and finalizes the order without duplicates.
        """
        intent = MarketplacePaymentIntent.objects.create(
            customer=self.customer,
            cart=self.cart,
            razorpay_order_id="order_rzp_webhook_001",
            amount=Decimal("550.00"),
            currency="INR",
            status=MarketplacePaymentIntent.Status.CREATED,
            checkout_payload=self.checkout_payload,
            idempotency_key="intent_webhook_key_001",
        )

        mock_rp = MagicMock()
        mock_rp.utility.verify_webhook_signature.return_value = True
        mock_get_client.return_value = mock_rp

        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 902, "order_number": "VEND-00902"}},
        }

        webhook_event = {
            "entity": "event",
            "event": "payment.captured",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_webhook_1234",
                        "order_id": "order_rzp_webhook_001",
                        "amount": 55000,
                        "status": "captured",
                        "method": "upi",
                    }
                }
            },
        }

        # Anonymous caller (Razorpay server-to-server)
        anon_client = APIClient()
        response = anon_client.post(
            "/api/orders/marketplace/razorpay-webhook/",
            data=json.dumps(webhook_event),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="valid_webhook_sig",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        intent.refresh_from_db()
        self.assertEqual(intent.status, MarketplacePaymentIntent.Status.PAID)
        self.assertEqual(intent.razorpay_payment_id, "pay_webhook_1234")

        # Order created
        self.assertEqual(MarketplaceOrder.objects.filter(payment_transaction_id="pay_webhook_1234").count(), 1)

        # Idempotent replay of same webhook call should not duplicate orders
        second_resp = anon_client.post(
            "/api/orders/marketplace/razorpay-webhook/",
            data=json.dumps(webhook_event),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="valid_webhook_sig",
        )
        self.assertEqual(second_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(MarketplaceOrder.objects.filter(payment_transaction_id="pay_webhook_1234").count(), 1)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    def test_cod_checkout_creates_order_with_pending_payment_status(self, mock_validate_cart, mock_intake_order):
        """
        COD Test 1: POST /api/orders/marketplace/checkout/ with payment_method="COD"
        creates confirmed order immediately with payment_status="PENDING", payment_method="COD",
        invokes vendor intake, and marks cart checked out.
        """
        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 903, "order_number": "VEND-00903"}},
        }

        cod_payload = dict(self.checkout_payload)
        cod_payload["payment_method"] = "COD"

        response = self.client.post("/api/orders/marketplace/checkout/", cod_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.data.get("data", {})
        self.assertEqual(data.get("payment_method"), "COD")
        self.assertEqual(data.get("payment_status"), "PENDING")

        # Verify DB order record
        order = MarketplaceOrder.objects.filter(customer=self.customer, payment_method="COD").first()
        self.assertIsNotNone(order)
        self.assertEqual(order.payment_status, "PENDING")
        self.assertEqual(order.payment_method, "COD")
        self.assertEqual(order.total_amount, Decimal("550.00"))
        self.assertEqual(order.status, MarketplaceOrder.Status.CONFIRMED)
        self.assertTrue(order.vendor_intake_synced)
        self.assertEqual(order.vendor_order_id, 903)

        # Cart should be marked checked out
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.status, CartStatus.CHECKED_OUT)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    def test_cod_checkout_rejects_out_of_stock_item(self, mock_validate_cart):
        """
        COD Test 2: Out of stock validation failure on COD path hard-blocks order creation
        and preserves the cart untouched.
        """
        mock_validate_cart.return_value = {
            "success": False,
            "is_valid": False,
            "validation": {"errors": [{"message": "Basmati Rice 1kg is out of stock."}]},
        }

        cod_payload = dict(self.checkout_payload)
        cod_payload["payment_method"] = "COD"

        response = self.client.post("/api/orders/marketplace/checkout/", cod_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MarketplaceOrder.objects.filter(customer=self.customer).count(), 0)

        self.cart.refresh_from_db()
        self.assertEqual(self.cart.status, CartStatus.ACTIVE)
        self.assertEqual(self.cart.items.count(), 2)

    def test_marketplace_checkout_endpoint_rejects_non_cod_payment_method(self):
        """
        COD Test 3 Security: Direct POST /api/orders/marketplace/checkout/ with payment_method="UPI"
        must be rejected with 400 to prevent bypassing payment verification.
        """
        upi_payload = dict(self.checkout_payload)
        upi_payload["payment_method"] = "UPI"

        response = self.client.post("/api/orders/marketplace/checkout/", upi_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only Cash on Delivery (COD) is supported", response.data.get("message", ""))

        # No order created, cart untouched
        self.assertEqual(MarketplaceOrder.objects.filter(customer=self.customer).count(), 0)
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.status, CartStatus.ACTIVE)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_delivery_slots")
    def test_get_delivery_slots_endpoint(self, mock_get_slots):
        """
        Tests GET /api/orders/marketplace/delivery-slots/ forwards parameters and returns vendor slots.
        """
        mock_get_slots.return_value = {
            "success": True,
            "data": [
                {"id": 1, "label": "Instant Delivery (30-45 mins)", "slot_type": "EXPRESS", "available": True},
                {"id": 2, "label": "9:00 AM - 12:00 PM", "slot_type": "STANDARD", "available": False},
            ],
        }

        response = self.client.get("/api/orders/marketplace/delivery-slots/?warehouse_id=1&date=2026-09-29")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_get_slots.assert_called_once_with(warehouse_id="1", date="2026-09-29")
        data = response.data.get("data", [])
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["label"], "Instant Delivery (30-45 mins)")
        self.assertTrue(data[0]["available"])

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_delivery_slot_propagates_through_payment_intent_and_order_intake(
        self, mock_get_client, mock_validate_cart, mock_intake_order
    ):
        """
        Tests that delivery_slot_id, delivery_slot_label, and delivery_date survive the
        initiate -> verify payment flow and are stored on MarketplaceOrder.delivery_slot and passed to vendor intake.
        """
        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 999, "order_number": "VEND-00999"}},
        }

        mock_rp = MagicMock()
        mock_rp.order.create.return_value = {"id": "order_rzp_slot_001", "amount": 55000, "currency": "INR"}
        mock_rp.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_rp

        payload = dict(self.checkout_payload)
        payload["delivery_slot_id"] = 5
        payload["delivery_slot_label"] = "Express Delivery (45 mins)"
        payload["delivery_date"] = "2026-09-29"

        # 1. Initiate Payment
        init_res = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", payload, format="json")
        self.assertEqual(init_res.status_code, status.HTTP_200_OK)

        intent = MarketplacePaymentIntent.objects.filter(razorpay_order_id="order_rzp_slot_001").first()
        self.assertIsNotNone(intent)
        self.assertEqual(intent.checkout_payload.get("delivery_slot_id"), 5)
        self.assertEqual(intent.checkout_payload.get("delivery_slot_label"), "Express Delivery (45 mins)")
        self.assertEqual(intent.checkout_payload.get("delivery_date"), "2026-09-29")

        # 2. Verify Payment
        verify_payload = {
            "razorpay_order_id": "order_rzp_slot_001",
            "razorpay_payment_id": "pay_slot_1234",
            "razorpay_signature": "valid_sig",
        }
        verify_res = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")
        self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED)

        # 3. Verify Order delivery_slot field
        order = MarketplaceOrder.objects.filter(payment_transaction_id="pay_slot_1234").first()
        self.assertIsNotNone(order)
        self.assertEqual(order.delivery_slot, "Express Delivery (45 mins)")

        # 4. Verify vendor intake call received the slot kwargs
        mock_intake_order.assert_called()
        intake_kwargs = mock_intake_order.call_args[1]
        self.assertEqual(intake_kwargs.get("delivery_slot_id"), 5)
        self.assertEqual(intake_kwargs.get("delivery_slot"), "Express Delivery (45 mins)")
        self.assertEqual(intake_kwargs.get("delivery_date"), "2026-09-29")
