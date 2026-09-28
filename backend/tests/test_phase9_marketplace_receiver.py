"""
backend/tests/test_phase9_marketplace_receiver.py

Automated integration and unit test suite for Phase 9:
Customer-side Order Status Event Consumer, Checkout & Cancel Hardening,
Outbox Processor, and Reconciliation Job.
"""
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from carts.models import Cart, CartItem, CartType, CartStatus
from orders.models import (
    MarketplaceOrder,
    MarketplaceOrderItem,
    MarketplaceOrderOutbox,
    MarketplaceOrderEvent,
)
from orders.status_mapping import (
    map_vendor_status,
    is_forward_transition,
    VENDOR_TO_CUSTOMER_STATUS_MAP,
)
from orders.management.commands.process_marketplace_outbox import process_outbox_queue
from orders.management.commands.reconcile_marketplace_orders import reconcile_stale_orders
from workforce_integration.views import WORKFORCE_WEBHOOK_SECRET

User = get_user_model()


class Phase9MarketplaceReceiverTests(TestCase):
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
        self.customer_a = User.objects.create_user(
            username="customer_phase9_a",
            email="phase9_a@example.com",
            password="testpassword123",
            first_name="Alice",
            last_name="Customer",
        )
        self.customer_b = User.objects.create_user(
            username="customer_phase9_b",
            email="phase9_b@example.com",
            password="testpassword123",
            first_name="Bob",
            last_name="Customer",
        )
        self.client.force_authenticate(user=self.customer_a)

        self.webhook_secret = WORKFORCE_WEBHOOK_SECRET

    def _webhook_post(self, payload, secret=None):
        auth_secret = secret if secret is not None else self.webhook_secret
        return self.client.post(
            "/api/workforce-integration/webhook/",
            payload,
            format="json",
            HTTP_X_WORKFORCE_WEBHOOK_SECRET=auth_secret,
        )

    # ── 1. Status Mapping Unit Tests ──────────────────────────────────────────

    def test_01_status_mapping_exact_dictionary(self):
        """Vendor statuses map strictly to Customer statuses; unknown statuses return None."""
        self.assertEqual(map_vendor_status("NEW"), "CONFIRMED")
        self.assertEqual(map_vendor_status("ACCEPTED"), "CONFIRMED")
        self.assertEqual(map_vendor_status("PICKING"), "PACKING")
        self.assertEqual(map_vendor_status("PACKED"), "PACKING")
        self.assertEqual(map_vendor_status("READY_FOR_PICKUP"), "READY_FOR_PICKUP")
        self.assertEqual(map_vendor_status("HANDED_OVER"), "OUT_FOR_DELIVERY")
        self.assertEqual(map_vendor_status("DELIVERED"), "DELIVERED")
        self.assertEqual(map_vendor_status("CANCELLED"), "CANCELLED")

        # Case-insensitivity and whitespace stripping
        self.assertEqual(map_vendor_status("  picking  "), "PACKING")
        self.assertEqual(map_vendor_status("delivered"), "DELIVERED")

        # Unknown or invalid vendor statuses
        self.assertIsNone(map_vendor_status("IN_TRANSIT_CUSTOM"))
        self.assertIsNone(map_vendor_status("UNKNOWN_STATE"))
        self.assertIsNone(map_vendor_status(""))
        self.assertIsNone(map_vendor_status(None))

    def test_02_forward_only_transition_rules(self):
        """Validates progression ranking: forward transitions succeed, backward/terminal fail."""
        # Forward progressions
        self.assertTrue(is_forward_transition("CONFIRMED", "PACKING"))
        self.assertTrue(is_forward_transition("PACKING", "READY_FOR_PICKUP"))
        self.assertTrue(is_forward_transition("READY_FOR_PICKUP", "OUT_FOR_DELIVERY"))
        self.assertTrue(is_forward_transition("OUT_FOR_DELIVERY", "DELIVERED"))
        self.assertTrue(is_forward_transition("CONFIRMED", "DELIVERED"))
        self.assertTrue(is_forward_transition("PACKING", "CANCELLED"))

        # Same status (idempotent)
        self.assertTrue(is_forward_transition("CONFIRMED", "CONFIRMED"))
        self.assertTrue(is_forward_transition("PACKING", "PACKING"))

        # Backward moves (rejected)
        self.assertFalse(is_forward_transition("PACKING", "CONFIRMED"))
        self.assertFalse(is_forward_transition("OUT_FOR_DELIVERY", "PACKING"))
        self.assertFalse(is_forward_transition("DELIVERED", "CONFIRMED"))

        # Terminal status immutability
        self.assertFalse(is_forward_transition("DELIVERED", "CANCELLED"))
        self.assertFalse(is_forward_transition("CANCELLED", "PACKING"))
        self.assertFalse(is_forward_transition("CANCELLED", "DELIVERED"))

    # ── 2. Receiver Webhook Authentication & Validation ───────────────────────

    def test_03_webhook_auth_enforcement(self):
        """Webhook rejects requests with missing or invalid authentication secrets with 401."""
        valid_payload = {
            "event": "seller_order.status_updated",
            "event_id": "evt_auth_test_001",
            "sequence": 1,
            "payload": {
                "source_order_id": "MKT99001",
                "seller_id": 10,
                "current_status": "ACCEPTED",
            }
        }

        # 1. Missing secret
        resp1 = self.client.post("/api/workforce-integration/webhook/", valid_payload, format="json")
        self.assertEqual(resp1.status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Invalid secret
        resp2 = self._webhook_post(valid_payload, secret="invalid-wrong-secret-token")
        self.assertEqual(resp2.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_04_webhook_schema_validation_rejects_malformed_payloads(self):
        """Malformed payloads return 400 Bad Request without crashing."""
        # 1. Missing event
        resp1 = self._webhook_post({"event_id": "evt_1", "sequence": 1, "payload": {}})
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Missing event_id
        resp2 = self._webhook_post({"event": "seller_order.status_updated", "sequence": 1, "payload": {}})
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Invalid non-integer sequence
        resp3 = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_seq_bad",
            "sequence": "first",
            "payload": {"source_order_id": "MKT001", "seller_id": 10, "current_status": "NEW"}
        })
        self.assertEqual(resp3.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Missing source_order_id
        resp4 = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_no_source",
            "sequence": 1,
            "payload": {"seller_id": 10, "current_status": "NEW"}
        })
        self.assertEqual(resp4.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Missing seller_id
        resp5 = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_no_seller",
            "sequence": 1,
            "payload": {"source_order_id": "MKT001", "current_status": "NEW"}
        })
        self.assertEqual(resp5.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_webhook_unknown_order_returns_404(self):
        """Webhook for an unknown source_order_id returns 404 without leaking internal state."""
        resp = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_unknown_order",
            "sequence": 1,
            "payload": {
                "source_order_id": "MKT_NON_EXISTENT_99999",
                "seller_id": 10,
                "current_status": "PACKING",
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data.get("code"), "ORDER_NOT_FOUND")

    def test_06_webhook_seller_id_mismatch_returns_422(self):
        """Webhook verifies seller_id matches the order's seller; returns 422 on mismatch."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_SELLER_TEST",
            customer=self.customer_a,
            seller_id=10,
            seller_name="Seller Ten",
            status=MarketplaceOrder.Status.CONFIRMED,
        )

        resp = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_seller_mismatch_01",
            "sequence": 2,
            "payload": {
                "source_order_id": order.order_number,
                "seller_id": 99,  # Mismatched seller ID!
                "current_status": "PACKING",
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertEqual(resp.data.get("code"), "SELLER_MISMATCH")
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CONFIRMED)

    # ── 3. Idempotency, Sequence Ordering & Forward Progression ───────────────

    def test_07_webhook_idempotency_on_event_id(self):
        """Same event_id posted twice returns 200 and does not duplicate event rows or state changes."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_IDEMP_TEST",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.CONFIRMED,
        )

        payload = {
            "event": "seller_order.status_updated",
            "event_id": "evt_idempotency_key_12345",
            "sequence": 2,
            "payload": {
                "source_order_id": order.order_number,
                "vendor_order_number": "SO-VEND-100",
                "vendor_order_id": 100,
                "seller_id": 12,
                "seller_name": "Seller 12",
                "previous_status": "NEW",
                "current_status": "PICKING",
                "fulfillment_type": "DELIVERY",
                "timestamps": {"updated_at": "2026-09-19T14:00:00+00:00"},
            }
        }

        # 1. First event delivery
        resp1 = self._webhook_post(payload)
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.PACKING)
        self.assertEqual(order.last_applied_vendor_sequence, 2)
        self.assertEqual(MarketplaceOrderEvent.objects.filter(order=order).count(), 1)

        # 2. Duplicate event delivery
        resp2 = self._webhook_post(payload)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertTrue(resp2.data.get("duplicate"))
        self.assertEqual(MarketplaceOrderEvent.objects.filter(order=order).count(), 1)

    def test_08_sequence_ordering_ignores_stale_events(self):
        """Events with sequence <= last_applied_vendor_sequence do not regress order state."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_SEQ_TEST",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.OUT_FOR_DELIVERY,
            last_applied_vendor_sequence=5,
        )

        # Stale event with sequence 3 (PICKING) arriving late
        stale_payload = {
            "event": "seller_order.status_updated",
            "event_id": "evt_stale_seq_3",
            "sequence": 3,
            "payload": {
                "source_order_id": order.order_number,
                "seller_id": 12,
                "seller_name": "Seller 12",
                "current_status": "PICKING",
                "fulfillment_type": "DELIVERY",
                "timestamps": {"updated_at": "2026-09-19T13:30:00+00:00"},
            }
        }

        resp = self._webhook_post(stale_payload)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        # Status MUST remain OUT_FOR_DELIVERY and sequence remain 5
        self.assertEqual(order.status, MarketplaceOrder.Status.OUT_FOR_DELIVERY)
        self.assertEqual(order.last_applied_vendor_sequence, 5)

    def test_09_terminal_states_cannot_be_overwritten(self):
        """DELIVERED and CANCELLED orders are terminal and never regress."""
        # 1. DELIVERED order
        order_delivered = MarketplaceOrder.objects.create(
            order_number="MKT_TERM_DELIVERED",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.DELIVERED,
            last_applied_vendor_sequence=6,
        )
        resp1 = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_regress_delivered",
            "sequence": 7,
            "payload": {
                "source_order_id": order_delivered.order_number,
                "seller_id": 12,
                "current_status": "PACKED",
                "timestamps": {"updated_at": "2026-09-19T15:00:00+00:00"},
            }
        })
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        order_delivered.refresh_from_db()
        self.assertEqual(order_delivered.status, MarketplaceOrder.Status.DELIVERED)

        # 2. CANCELLED order
        order_cancelled = MarketplaceOrder.objects.create(
            order_number="MKT_TERM_CANCELLED",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.CANCELLED,
            last_applied_vendor_sequence=4,
        )
        resp2 = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_regress_cancelled",
            "sequence": 8,
            "payload": {
                "source_order_id": order_cancelled.order_number,
                "seller_id": 12,
                "current_status": "DELIVERED",
                "timestamps": {"updated_at": "2026-09-19T15:00:00+00:00"},
            }
        })
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        order_cancelled.refresh_from_db()
        self.assertEqual(order_cancelled.status, MarketplaceOrder.Status.CANCELLED)

    def test_10_unknown_vendor_status_logged_and_does_not_mutate_state(self):
        """An unknown vendor status is recorded as unmapped in audit log without changing order status."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_UNKNOWN_STATUS",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.CONFIRMED,
            last_applied_vendor_sequence=1,
        )

        resp = self._webhook_post({
            "event": "seller_order.status_updated",
            "event_id": "evt_unknown_status_01",
            "sequence": 2,
            "payload": {
                "source_order_id": order.order_number,
                "seller_id": 12,
                "current_status": "CUSTOM_EXPERIMENTAL_STATE",
                "timestamps": {"updated_at": "2026-09-19T14:30:00+00:00"},
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CONFIRMED)

        event = MarketplaceOrderEvent.objects.filter(event_id="evt_unknown_status_01").first()
        self.assertIsNotNone(event)
        self.assertEqual(event.vendor_status, "CUSTOM_EXPERIMENTAL_STATE")
        self.assertEqual(event.mapped_status, "")

    def test_11_seller_cancellation_sets_refund_review_flag(self):
        """Seller-side cancellation updates order to CANCELLED, saves reason, and sets needs_refund_review."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_SELLER_CANCEL",
            customer=self.customer_a,
            seller_id=12,
            status=MarketplaceOrder.Status.PACKING,
            last_applied_vendor_sequence=2,
        )

        resp = self._webhook_post({
            "event": "seller_order.cancelled",
            "event_id": "evt_seller_cancelled_99",
            "sequence": 3,
            "payload": {
                "source_order_id": order.order_number,
                "seller_id": 12,
                "current_status": "CANCELLED",
                "cancellation_reason": "Damaged inventory during packing",
                "cancelled_by": "SELLER",
                "timestamps": {
                    "cancelled_at": "2026-09-19T14:45:00+00:00",
                    "updated_at": "2026-09-19T14:45:00+00:00",
                },
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CANCELLED)
        self.assertEqual(order.cancellation_reason, "Damaged inventory during packing")
        self.assertEqual(order.cancelled_by, "SELLER")
        self.assertTrue(order.needs_refund_review)

    def test_12_non_marketplace_service_booking_webhook_unaffected(self):
        """Non-marketplace webhooks (e.g. booking technician assignment) continue operating normally."""
        from service_requests.models import ServiceRequest
        sr = ServiceRequest.objects.create(
            customer=self.customer_a,
            request_id="SR-TEST-BOOKING-01",
            service_category="AC Service",
            preferred_date="2026-09-20",
            preferred_time="10:00 AM",
            status="confirmed",
        )

        resp = self._webhook_post({
            "event": "technician.assigned",
            "booking_id": sr.request_id,
            "event_id": "evt_tech_assign_01",
            "sequence": 1,
            "payload": {
                "booking_id": sr.request_id,
                "technician": {"id": "TECH_10", "name": "Rajesh Kumar", "phone": "+919876543210"},
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        sr.refresh_from_db()
        self.assertEqual(sr.status, "assigned")

    # ── 4. Checkout Hardening Tests ───────────────────────────────────────────

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    def test_13_checkout_double_submit_protection(self, mock_intake, mock_val):
        """Concurrent or duplicate checkout requests with same idempotency key create only one order."""
        mock_val.return_value = {"success": True, "is_valid": True, "validation": {"is_valid": True}}
        mock_intake.return_value = {
            "success": True,
            "data": {"order": {"id": 88, "order_number": "SO-2026-88"}},
            "status_code": 201,
        }

        cart = Cart.objects.create(
            customer=self.customer_a,
            cart_type=CartType.MARKETPLACE,
            status=CartStatus.ACTIVE,
            seller_id=10,
            seller_name="Fresh Mart",
        )
        CartItem.objects.create(
            cart=cart,
            seller_product_id=101,
            product_title="Fresh Milk",
            quantity=2,
            unit_price_snapshot=Decimal("60.00"),
        )

        headers = {"HTTP_X_IDEMPOTENCY_KEY": "test_idemp_key_unique_1"}
        payload = {"delivery_address": "123 Main Street, Bangalore"}

        # 1. First checkout
        resp1 = self.client.post("/api/orders/marketplace/checkout/", payload, **headers)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        order_number_1 = resp1.data["data"]["order_number"]
        self.assertEqual(MarketplaceOrder.objects.count(), 1)
        self.assertEqual(mock_intake.call_count, 1)

        # 2. Re-submit with same idempotency key
        resp2 = self.client.post("/api/orders/marketplace/checkout/", payload, **headers)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["data"]["order_number"], order_number_1)
        # Verify Vendor intake was not called a second time
        self.assertEqual(mock_intake.call_count, 1)
        self.assertEqual(MarketplaceOrder.objects.count(), 1)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    def test_14_checkout_business_rejections_preserve_active_cart(self, mock_intake, mock_val):
        """Vendor intake rejection (409 stock / PRICE_CHANGED) cleanly cancels provisional order and keeps cart ACTIVE."""
        mock_val.return_value = {"success": True, "is_valid": True, "validation": {"is_valid": True}}

        # 1. Stock Conflict (409)
        mock_intake.return_value = {
            "success": False,
            "status_code": 409,
            "error": "insufficient_stock",
            "message": "Item Fresh Milk is out of stock.",
        }

        cart = Cart.objects.create(
            customer=self.customer_a,
            cart_type=CartType.MARKETPLACE,
            status=CartStatus.ACTIVE,
            seller_id=10,
        )
        CartItem.objects.create(
            cart=cart,
            seller_product_id=101,
            product_title="Fresh Milk",
            quantity=2,
            unit_price_snapshot=Decimal("60.00"),
        )

        resp = self.client.post("/api/orders/marketplace/checkout/", {
            "delivery_address": "123 Main Street",
        })
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        cart.refresh_from_db()
        # Customer cart MUST still be ACTIVE
        self.assertEqual(cart.status, CartStatus.ACTIVE)
        # Provisional order is cancelled
        self.assertEqual(MarketplaceOrder.objects.filter(status=MarketplaceOrder.Status.CANCELLED).count(), 1)

        # 2. Price Changed (409 PRICE_CHANGED)
        mock_intake.return_value = {
            "success": False,
            "status_code": 409,
            "error": "PRICE_CHANGED",
            "message": "Product price changed from 60.00 to 65.00",
        }
        resp_price = self.client.post("/api/orders/marketplace/checkout/", {
            "delivery_address": "123 Main Street",
        })
        self.assertEqual(resp_price.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(resp_price.data.get("error"), "PRICE_CHANGED")
        cart.refresh_from_db()
        self.assertEqual(cart.status, CartStatus.ACTIVE)

    # ── 5. Cancel Hardening Tests ─────────────────────────────────────────────

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_15_cancel_rejected_after_handover_prevents_local_cancellation(self, mock_cancel):
        """If Vendor rejects cancellation with 400 (already handed over), Customer order is NOT cancelled."""
        mock_cancel.return_value = {
            "success": False,
            "status_code": 400,
            "message": "Order cannot be cancelled as it has already been handed over to delivery partner.",
        }

        order = MarketplaceOrder.objects.create(
            order_number="MKT_CANCEL_HANDOVER",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.PACKING,
            vendor_intake_synced=True,
        )

        resp = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Need to change address",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been handed over", resp.data.get("message", ""))
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.PACKING)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_16_cancel_vendor_outage_sets_cancellation_pending_and_outbox(self, mock_cancel):
        """If Vendor is unreachable during cancellation, order is marked cancellation_pending with retryable outbox."""
        mock_cancel.return_value = {
            "success": False,
            "message": "Connection timeout",
            "retryable": True,
        }

        order = MarketplaceOrder.objects.create(
            order_number="MKT_CANCEL_OUTAGE",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
            vendor_intake_synced=True,
        )

        resp = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Order placed by mistake",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertTrue(order.cancellation_pending)

        outbox = MarketplaceOrderOutbox.objects.filter(
            source_order_id=order.order_number,
            event_type=MarketplaceOrderOutbox.EventType.ORDER_CANCEL,
        ).first()
        self.assertIsNotNone(outbox)
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.PENDING)

    # ── 6. Outbox Processor & Reconciliation Job Tests ────────────────────────

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_17_outbox_processor_retries_and_completes_cancellation(self, mock_cancel):
        """Outbox processor retries pending cancellation and updates order on vendor recovery."""
        mock_cancel.return_value = {"success": True, "data": {"status": "CANCELLED"}}

        order = MarketplaceOrder.objects.create(
            order_number="MKT_OUTBOX_RETRY",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
            cancellation_pending=True,
        )
        outbox = MarketplaceOrderOutbox.objects.create(
            event_type=MarketplaceOrderOutbox.EventType.ORDER_CANCEL,
            source_order_id=order.order_number,
            payload={"cancellation_reason": "Customer cancelled"},
            status=MarketplaceOrderOutbox.Status.PENDING,
            next_retry_at=timezone.now() - timedelta(seconds=10),
        )

        res = process_outbox_queue(limit=10)
        self.assertEqual(res["processed"], 1)

        outbox.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.PROCESSED)
        self.assertEqual(order.status, MarketplaceOrder.Status.CANCELLED)
        self.assertFalse(order.cancellation_pending)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_order_status")
    def test_18_reconciliation_job_repairs_stale_order_state(self, mock_status):
        """Reconciliation job queries vendor status endpoint for stale orders and advances status cleanly."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_STALE_ORDER",
            customer=self.customer_a,
            seller_id=12,
            seller_name="Fresh Mart",
            status=MarketplaceOrder.Status.CONFIRMED,
            last_applied_vendor_sequence=1,
        )
        # Update updated_at explicitly in DB to bypass auto_now
        MarketplaceOrder.objects.filter(id=order.id).update(updated_at=timezone.now() - timedelta(minutes=15))

        mock_status.return_value = {
            "success": True,
            "status_code": 200,
            "data": {
                "source_order_id": order.order_number,
                "vendor_order_number": "SO-2026-991",
                "vendor_order_id": 991,
                "seller_id": 12,
                "seller_name": "Fresh Mart",
                "current_status": "READY_FOR_PICKUP",
                "fulfillment_type": "DELIVERY",
                "delivery_slot": "Evening 4pm-6pm",
                "handover_ref": "REF-EXP-5521",
                "last_event_sequence": 4,
                "cancelled_at": None,
                "cancellation_reason": None,
                "cancelled_by": None,
            }
        }

        res = reconcile_stale_orders(stale_minutes=10, limit=10)
        self.assertEqual(res["reconciled"], 1)

        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.READY_FOR_PICKUP)
        self.assertEqual(order.last_applied_vendor_sequence, 4)
        self.assertEqual(order.delivery_slot, "Evening 4pm-6pm")
        self.assertEqual(order.handover_ref, "REF-EXP-5521")

        # Verify audit event created with source="RECONCILE"
        rec_event = MarketplaceOrderEvent.objects.filter(order=order, source=MarketplaceOrderEvent.Source.RECONCILE).first()
        self.assertIsNotNone(rec_event)
        self.assertEqual(rec_event.vendor_status, "READY_FOR_PICKUP")
        self.assertEqual(rec_event.mapped_status, "READY_FOR_PICKUP")

    # ── 7. Customer Privacy & IDOR Isolation ──────────────────────────────────

    def test_19_customer_isolation_security(self):
        """Customer A's order cannot be viewed or cancelled by Customer B."""
        order_a = MarketplaceOrder.objects.create(
            order_number="MKT_ALICE_ORDER",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
        )

        # Authenticate as Customer B
        self.client.force_authenticate(user=self.customer_b)

        # 1. Customer B attempts to view Alice's order
        resp_view = self.client.get(f"/api/orders/marketplace/{order_a.order_number}/")
        self.assertEqual(resp_view.status_code, status.HTTP_404_NOT_FOUND)

        # 2. Customer B attempts to cancel Alice's order
        resp_cancel = self.client.post(f"/api/orders/marketplace/{order_a.order_number}/cancel/")
        self.assertEqual(resp_cancel.status_code, status.HTTP_404_NOT_FOUND)

    # ── 8. Phase 9 Defect Specific Tests ──────────────────────────────────────

    def test_20_delivered_order_immutable_when_cancelled_event_arrives(self):
        """A CANCELLED event arriving for an already DELIVERED order records the event but does not change status."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_DELIV_STAY_DELIV",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.DELIVERED,
            last_applied_vendor_sequence=6,
        )

        resp = self._webhook_post({
            "event": "seller_order.cancelled",
            "event_id": "evt_cancel_after_delivery",
            "sequence": 7,
            "payload": {
                "source_order_id": order.order_number,
                "seller_id": 10,
                "current_status": "CANCELLED",
                "cancellation_reason": "Late cancel attempt",
                "cancelled_by": "SELLER",
                "timestamps": {"cancelled_at": "2026-09-19T16:00:00+00:00"},
            }
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        # DELIVERED status MUST remain immutable
        self.assertEqual(order.status, MarketplaceOrder.Status.DELIVERED)
        # Event is recorded
        evt = MarketplaceOrderEvent.objects.filter(event_id="evt_cancel_after_delivery").first()
        self.assertIsNotNone(evt)
        self.assertEqual(evt.vendor_status, "CANCELLED")
        self.assertEqual(evt.mapped_status, "CANCELLED")

    @patch("orders.marketplace_events.transaction.atomic")
    def test_21_webhook_500_handler_sanitizes_error_detail(self, mock_atomic):
        """Webhook 500 handler does not expose raw exception trace/detail in HTTP response."""
        mock_atomic.side_effect = RuntimeError("Database crash with internal credentials /tmp/secret")

        payload = {
            "event": "seller_order.status_updated",
            "event_id": "evt_500_leak_test",
            "sequence": 1,
            "payload": {
                "source_order_id": "MKT0001",
                "seller_id": 10,
                "current_status": "ACCEPTED",
            }
        }
        resp = self._webhook_post(payload)
        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertNotIn("Database crash with internal credentials", str(resp.data))
        self.assertEqual(resp.data.get("error"), "Internal error processing event")

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.validate_cart")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    def test_22_checkout_does_not_fabricate_events(self, mock_intake, mock_val):
        """Checkout does not insert synthetic evt_init_* event; events list is empty until vendor sends real events."""
        mock_val.return_value = {"success": True, "is_valid": True, "validation": {"is_valid": True}}
        mock_intake.return_value = {
            "success": True,
            "data": {"order": {"id": 89, "order_number": "SO-2026-89"}},
            "status_code": 201,
        }

        cart = Cart.objects.create(
            customer=self.customer_a,
            cart_type=CartType.MARKETPLACE,
            status=CartStatus.ACTIVE,
            seller_id=10,
        )
        CartItem.objects.create(
            cart=cart,
            seller_product_id=101,
            product_title="Milk",
            quantity=1,
            unit_price_snapshot=Decimal("50.00"),
        )

        resp = self.client.post("/api/orders/marketplace/checkout/", {"delivery_address": "Street 1"})
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        order_number = resp.data["data"]["order_number"]
        order = MarketplaceOrder.objects.get(order_number=order_number)

        # Timeline MUST contain 0 fabricated events
        self.assertEqual(MarketplaceOrderEvent.objects.filter(order=order).count(), 0)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_23_cancel_unsynced_order_skips_vendor_and_fails_intake_outbox(self, mock_cancel):
        """Cancelling an order that never synced to vendor cancels locally, marks intake outbox FAILED, and skips vendor HTTP."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_UNSYNCED_CANCEL",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
            vendor_intake_synced=False,
        )
        outbox = MarketplaceOrderOutbox.objects.create(
            event_type=MarketplaceOrderOutbox.EventType.ORDER_INTAKE,
            source_order_id=order.order_number,
            payload={"seller_id": 10},
            status=MarketplaceOrderOutbox.Status.PENDING,
        )

        resp = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Cancelled before vendor sync",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Vendor cancel API MUST NOT have been called
        mock_cancel.assert_not_called()

        order.refresh_from_db()
        outbox.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CANCELLED)
        self.assertEqual(order.cancelled_by, "CUSTOMER")
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.FAILED)
        self.assertEqual(outbox.last_error, "cancelled before intake")

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.intake_order")
    def test_24_outbox_processor_skips_intake_for_cancelled_order_race(self, mock_intake):
        """If an intake outbox row is processed after customer cancel, outbox processor skips intake without calling vendor."""
        order = MarketplaceOrder.objects.create(
            order_number="MKT_CANCELLED_RACE",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CANCELLED,
            cancelled_by="CUSTOMER",
        )
        outbox = MarketplaceOrderOutbox.objects.create(
            event_type=MarketplaceOrderOutbox.EventType.ORDER_INTAKE,
            source_order_id=order.order_number,
            payload={"seller_id": 10},
            status=MarketplaceOrderOutbox.Status.PENDING,
        )

        res = process_outbox_queue(limit=10)
        outbox.refresh_from_db()
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.FAILED)
        self.assertEqual(outbox.last_error, "cancelled before intake")
        mock_intake.assert_not_called()

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.cancel_order")
    def test_25_cancel_vendor_404_treated_as_released(self, mock_cancel):
        """When Vendor returns 404 on cancel, Customer treats it as released without 5 retries."""
        mock_cancel.return_value = {
            "success": False,
            "status_code": 404,
            "message": "Order not found in vendor system",
        }

        order = MarketplaceOrder.objects.create(
            order_number="MKT_VEND_404_CANCEL",
            customer=self.customer_a,
            seller_id=10,
            status=MarketplaceOrder.Status.CONFIRMED,
            vendor_intake_synced=True,
        )

        resp = self.client.post(f"/api/orders/marketplace/{order.order_number}/cancel/", {
            "cancellation_reason": "Cancel 404 test",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, MarketplaceOrder.Status.CANCELLED)
        self.assertFalse(order.cancellation_pending)

        # Outbox cancel row should be PROCESSED (not PENDING for 5 retries)
        outbox = MarketplaceOrderOutbox.objects.filter(
            source_order_id=order.order_number,
            event_type=MarketplaceOrderOutbox.EventType.ORDER_CANCEL,
        ).first()
        self.assertIsNotNone(outbox)
        self.assertEqual(outbox.status, MarketplaceOrderOutbox.Status.PROCESSED)
