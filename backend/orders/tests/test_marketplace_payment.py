"""
orders/tests/test_marketplace_payment.py

Comprehensive test suite for Razorpay 2-step Payment Intent, UPI collection,
HMAC signature verification, webhook safety net, cart preservation, COD flow,
and delivery slot integration.
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
    def test_1_initiate_payment_creates_payment_intent(self, mock_get_client, mock_validate_cart):
        """
        1. initiate payment creates payment intent:
        Validates cart with vendor, creates Razorpay order, persists MarketplacePaymentIntent
        with status CREATED, and returns required frontend fields.
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

    def test_2_empty_cart_rejected(self):
        """2. empty cart rejected: initiate payment returns 400 when cart is empty."""
        self.cart.items.all().delete()
        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", self.checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("empty", response.data.get("message", "").lower())

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    def test_3_vendor_stock_failure_rejected_before_payment(self, mock_validate_cart):
        """3. vendor stock failure rejected before payment: rejects before Razorpay order creation."""
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
    def test_4_valid_signature_finalizes_order(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        4. valid signature finalizes order:
        Verifies signature, marks intent PAID, creates MarketplaceOrder, calls vendor intake, marks cart checked out.
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
    def test_5_and_6_invalid_signature_rejected_and_preserves_cart(self, mock_get_client):
        """
        5. invalid signature rejected & 6. invalid signature preserves cart:
        Tampered signature rejected, intent marked FAILED, cart remains ACTIVE, no order created.
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
    def test_7_duplicate_verification_does_not_create_duplicate_order(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        7. duplicate verification does not create duplicate order:
        Repeated calls to verify-payment with the same payment credentials return existing order
        without creating duplicate orders in the database.
        """
        intent = MarketplacePaymentIntent.objects.create(
            customer=self.customer,
            cart=self.cart,
            razorpay_order_id="order_rzp_dup_001",
            amount=Decimal("550.00"),
            currency="INR",
            status=MarketplacePaymentIntent.Status.CREATED,
            checkout_payload=self.checkout_payload,
            idempotency_key="intent_key_dup_001",
        )

        mock_rp = MagicMock()
        mock_rp.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_rp

        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 905, "order_number": "VEND-00905"}},
        }

        verify_payload = {
            "razorpay_order_id": "order_rzp_dup_001",
            "razorpay_payment_id": "pay_test_dup_999",
            "razorpay_signature": "valid_mock_signature_hex",
        }

        resp1 = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(MarketplaceOrder.objects.filter(payment_transaction_id="pay_test_dup_999").count(), 1)

        # Duplicate verification call
        resp2 = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        # Order count MUST still be 1
        self.assertEqual(MarketplaceOrder.objects.filter(payment_transaction_id="pay_test_dup_999").count(), 1)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_8_and_9_webhook_can_finalize_successful_payment_and_replay_is_idempotent(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        8. webhook can finalize successful payment & 9. webhook replay does not duplicate order:
        Server-to-server webhook captures payment and finalizes the order without duplicates.
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

        # 9. Idempotent replay of same webhook call should not duplicate orders
        second_resp = anon_client.post(
            "/api/orders/marketplace/razorpay-webhook/",
            data=json.dumps(webhook_event),
            content_type="application/json",
            HTTP_X_RAZORPAY_SIGNATURE="valid_webhook_sig",
        )
        self.assertEqual(second_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(MarketplaceOrder.objects.filter(payment_transaction_id="pay_webhook_1234").count(), 1)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @override_settings(
        DEBUG=False,
        PAYMENT_SANDBOX_MODE=False,
        RAZORPAY_KEY_ID="",
        RAZORPAY_KEY_SECRET="",
    )
    def test_10_missing_razorpay_production_credentials_fail_safely(self, mock_validate_cart):
        """
        10. missing Razorpay production credentials fail safely:
        When DEBUG=False and credentials are absent, initiate-payment must NOT accept mock payments
        or fall back to sandbox; it must fail safely with an error.
        """
        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", self.checkout_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(MarketplacePaymentIntent.objects.count(), 0)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_11_server_authoritative_amount_cannot_be_manipulated_by_frontend(self, mock_get_client, mock_validate_cart):
        """
        11. server authoritative amount cannot be manipulated by frontend:
        Even if the frontend attempts to pass a tampered amount, the server calculates
        the amount authoritatively from the active cart items.
        """
        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}

        mock_rp = MagicMock()
        mock_rp.order.create.return_value = {"id": "order_rzp_tampered_amt", "amount": 55000, "currency": "INR"}
        mock_get_client.return_value = mock_rp

        tampered_payload = dict(self.checkout_payload)
        tampered_payload["amount"] = "1.00"
        tampered_payload["total_amount"] = "1.00"
        tampered_payload["amount_paise"] = 100

        response = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", tampered_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data.get("data", {})
        # Server must enforce 550.00 from active cart items, NOT 1.00
        self.assertEqual(data.get("amount"), "550.00")
        self.assertEqual(data.get("amount_paise"), 55000)

        # Razorpay create must have been called with 55000 paise
        mock_rp.order.create.assert_called_once()
        create_kwargs = mock_rp.order.create.call_args[0][0]
        self.assertEqual(create_kwargs["amount"], 55000)

        # Payment intent in DB must record 550.00
        intent = MarketplacePaymentIntent.objects.filter(razorpay_order_id="order_rzp_tampered_amt").first()
        self.assertEqual(intent.amount, Decimal("550.00"))

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    def test_12_cod_flow_continues_working(self, mock_validate_cart, mock_intake_order):
        """
        12. COD flow continues working:
        POST /api/orders/marketplace/checkout/ with payment_method="COD" creates confirmed order
        with payment_status="PENDING", payment_method="COD", invokes vendor intake, and marks cart checked out.
        Also verifies non-COD payment methods are rejected on the direct checkout endpoint.
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

        # Rejection of non-COD on direct checkout
        upi_payload = dict(self.checkout_payload)
        upi_payload["payment_method"] = "UPI"
        rej_response = self.client.post("/api/orders/marketplace/checkout/", upi_payload, format="json")
        self.assertEqual(rej_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Only Cash on Delivery (COD) is supported", rej_response.data.get("message", ""))

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("orders.marketplace_views._get_razorpay_client")
    def test_13_existing_delivery_slot_flow_continues_working(self, mock_get_client, mock_validate_cart, mock_intake_order):
        """
        13. existing delivery-slot flow continues working:
        Delivery slot details are captured in payment intent and preserved in final order metadata.
        """
        slot_data = {
            "slot_id": 14,
            "slot_date": "2026-09-30",
            "slot_time": "09:00 AM - 11:00 AM",
        }
        payload_with_slot = dict(self.checkout_payload)
        payload_with_slot["delivery_slot"] = slot_data

        mock_validate_cart.return_value = {"success": True, "is_valid": True, "validation": {"items": []}}
        mock_rp = MagicMock()
        mock_rp.order.create.return_value = {"id": "order_rzp_slot_001", "amount": 55000, "currency": "INR"}
        mock_rp.utility.verify_payment_signature.return_value = True
        mock_get_client.return_value = mock_rp
        mock_intake_order.return_value = {
            "success": True,
            "data": {"order": {"id": 907, "order_number": "VEND-00907"}},
        }

        # Step 1: Initiate payment with delivery_slot
        init_res = self.client.post("/api/orders/marketplace/checkout/initiate-payment/", payload_with_slot, format="json")
        self.assertEqual(init_res.status_code, status.HTTP_200_OK)

        intent = MarketplacePaymentIntent.objects.filter(razorpay_order_id="order_rzp_slot_001").first()
        self.assertIsNotNone(intent)
        self.assertEqual(intent.checkout_payload.get("delivery_slot"), slot_data)

        # Step 2: Verify payment and finalize order
        verify_payload = {
            "razorpay_order_id": "order_rzp_slot_001",
            "razorpay_payment_id": "pay_slot_test_123",
            "razorpay_signature": "valid_mock_signature_hex",
        }
        verify_res = self.client.post("/api/orders/marketplace/checkout/verify-payment/", verify_payload, format="json")
        self.assertEqual(verify_res.status_code, status.HTTP_201_CREATED)

        order = MarketplaceOrder.objects.filter(payment_transaction_id="pay_slot_test_123").first()
        self.assertIsNotNone(order)
        self.assertEqual(order.delivery_address, "123 Green Street, Hosur")
