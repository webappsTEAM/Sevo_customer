"""
service_requests/tests/test_order_layer.py

NEW, additive-only test file for the Parent Order layer (orders/models.py)
added per PARENT_ORDER_FEASIBILITY_AUDIT_RECONCILED.md. Does not modify any
existing test file or production model -- verifies the two insertion points
added to service_requests/views.py:

  Phase A: BookingCreateView.post()      -- creates Order + first OrderItem
  Phase B: CustomerQuoteDecideView.post() -- attaches a second OrderItem to
           the SAME Order when a quote's quoted_work child SR is created

Follows the exact setUp/payload conventions already used in
test_painting_module.py (Company via the count()==1 fallback, User.objects
.create_user with role=CUSTOMER, the same booking payload shape) so these
tests exercise the real view code paths end-to-end via APITestCase, not a
reimplementation of the logic under test.
"""
from unittest.mock import patch

from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from decimal import Decimal

from service_requests.models import ServiceRequest, PaintingQuote, Coupon
from orders.models import Order, OrderItem
from companies.models import Company

User = get_user_model()


class BookingCreateOrderLayerTests(APITestCase):
    """Phase A: every booking through BookingCreateView gets an Order/OrderItem."""

    def setUp(self):
        self.company = Company.objects.create(
            company_name="sevo Logistics",
            slug="sevo",
        )
        self.customer = User.objects.create_user(
            username="order_layer_customer",
            phone="9876500001",
            email="order_layer_customer@example.com",
            role="CUSTOMER",
        )

    def _booking_payload(self, **overrides):
        payload = {
            "customer_name": "Jane Doe",
            "phone": "9876500001",
            "email": "order_layer_customer@example.com",
            "service_category": "cleaning",
            "issue_title": "Home Cleaning Service",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 5000,
            "cart_data": [{"id": "serv-cleaning-full-house", "price": 5000, "quantity": 1, "categoryName": "Cleaning"}],
        }
        payload.update(overrides)
        return payload

    def test_booking_creates_order_and_orderitem(self):
        """A plain booking (no coupon) gets exactly one Order + one OrderItem,
        with item_amount matching the ServiceRequest's total_amount."""
        url = reverse("sr-booking")
        response = self.client.post(url, self._booking_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertTrue(hasattr(sr, "order_item"), "ServiceRequest should have a linked OrderItem")

        item = sr.order_item
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)
        self.assertEqual(item.order.customer_id, self.customer.id)
        self.assertEqual(item.item_amount, sr.total_amount)
        self.assertEqual(item.order.total_amount, sr.total_amount)
        self.assertEqual(item.order.status, Order.Status.CONFIRMED)

    def test_orderitem_amount_reflects_post_discount_total_not_pre_coupon_fare(self):
        """The whole point of placing the hook after the coupon block: if a
        coupon knocks Rs.500 off a Rs.5000 booking, OrderItem.item_amount
        must be Rs.4500, not the pre-discount Rs.5000."""
        Coupon.objects.create(
            code="SAVE500",
            name="Flat 500 off",
            discount_type=Coupon.DiscountType.FLAT,
            discount_value=Decimal("500.00"),
            max_discount=Decimal("500.00"),
            status=Coupon.Status.ACTIVE,
        )
        url = reverse("sr-booking")
        payload = self._booking_payload(coupon_code="SAVE500")
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertEqual(sr.total_amount, Decimal("4500.00"))

        item = OrderItem.objects.get(service_request=sr)
        self.assertEqual(item.item_amount, Decimal("4500.00"))
        self.assertEqual(item.order.total_amount, Decimal("4500.00"))

    def test_duplicate_idempotency_key_does_not_create_second_order(self):
        """A client retry with the same Idempotency-Key returns the cached
        response without re-running the view -- confirming this pre-existing
        mechanism also protects the new Order layer from double-creation on
        the most common real-world retry path (double-tap / client retry)."""
        url = reverse("sr-booking")
        payload = self._booking_payload()
        headers = {"HTTP_IDEMPOTENCY_KEY": "order-layer-test-key-1"}

        first = self.client.post(url, payload, format="json", **headers)
        self.assertEqual(first.status_code, status.HTTP_201_CREATED, first.data)
        second = self.client.post(url, payload, format="json", **headers)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED, second.data)

        self.assertEqual(first.data["data"]["request_id"], second.data["data"]["request_id"])
        self.assertEqual(ServiceRequest.objects.count(), 1)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 1)

    def test_order_creation_failure_does_not_break_booking(self):
        """Simulates the Order/OrderItem layer raising (e.g. a DB hiccup) --
        the booking itself must still succeed and return 201, because Order
        is an additive reporting layer, not a gate on the real booking flow."""
        url = reverse("sr-booking")
        with patch("orders.models.Order.objects.create", side_effect=RuntimeError("simulated Order-layer failure")):
            response = self.client.post(url, self._booking_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertFalse(OrderItem.objects.filter(service_request=sr).exists())
        self.assertEqual(Order.objects.count(), 0)

    def test_orderitem_service_request_uniqueness_enforced_at_db_level(self):
        """Direct-model check that the OneToOneField's UNIQUE constraint --
        not just the application-level existence check -- is what ultimately
        prevents two OrderItems from ever pointing at the same
        ServiceRequest, even if application code tried to."""
        url = reverse("sr-booking")
        response = self.client.post(url, self._booking_payload(), format="json")
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])

        other_order = Order.objects.create(customer=self.customer, status=Order.Status.DRAFT)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                OrderItem.objects.create(order=other_order, service_request=sr, item_amount=Decimal("1.00"))


class QuoteAcceptanceOrderLayerTests(APITestCase):
    """Phase B: accepting a quote attaches a second OrderItem to the SAME
    Order as the parent inspection ServiceRequest, instead of creating a
    separate Order."""

    def setUp(self):
        self.company = Company.objects.create(
            company_name="sevo Logistics",
            slug="sevo",
        )
        self.customer = User.objects.create_user(
            username="order_layer_quote_customer",
            phone="9876500002",
            email="order_layer_quote_customer@example.com",
            role="CUSTOMER",
        )

    def _make_parent_with_order(self, inspection_amount=Decimal("49.00")):
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="Jane Doe",
            phone="9876500002",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Masonry Inspection",
            service_category="mason",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253,
            total_amount=inspection_amount,
            payment_status=ServiceRequest.PaymentStatus.PAID,
        )
        order = Order.objects.create(
            customer=self.customer,
            status=Order.Status.CONFIRMED,
            total_amount=inspection_amount,
        )
        OrderItem.objects.create(order=order, service_request=parent_sr, item_amount=inspection_amount)
        return parent_sr, order

    def test_quote_acceptance_adds_second_orderitem_to_parents_order(self):
        parent_sr, order = self._make_parent_with_order()
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-ORDERTEST-1",
            grand_total=Decimal("6000.00"),
            advance_amount=Decimal("3000.00"),
            balance_amount=Decimal("3000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER,
        )

        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        response = self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        child_sr = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")

        # Still exactly ONE Order overall -- the child was attached to the
        # parent's existing Order, not given a new one of its own.
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(OrderItem.objects.count(), 2)

        child_item = OrderItem.objects.get(service_request=child_sr)
        self.assertEqual(child_item.order_id, order.id)
        self.assertEqual(child_item.item_amount, child_sr.total_amount)

        order.refresh_from_db()
        self.assertEqual(order.total_amount, Decimal("49.00") + child_sr.total_amount)

    def test_quote_acceptance_creates_fresh_order_if_parent_has_none(self):
        """If the parent SR predates the Order feature (no OrderItem), the
        child still gets wrapped in its own new Order rather than the whole
        thing silently doing nothing."""
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="Jane Doe",
            phone="9876500002",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Masonry Inspection",
            service_category="mason",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253,
            total_amount=Decimal("49.00"),
            payment_status=ServiceRequest.PaymentStatus.PAID,
        )
        self.assertFalse(OrderItem.objects.filter(service_request=parent_sr).exists())

        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-ORDERTEST-2",
            grand_total=Decimal("6000.00"),
            advance_amount=Decimal("3000.00"),
            balance_amount=Decimal("3000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER,
        )
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        response = self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        child_sr = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")
        self.assertEqual(Order.objects.count(), 1)
        item = OrderItem.objects.get(service_request=child_sr)
        self.assertEqual(item.item_amount, child_sr.total_amount)

    def test_order_layer_failure_does_not_poison_outer_quote_transaction(self):
        """The most important correctness property of Phase B: this block
        runs INSIDE the view's own transaction.atomic() for the
        CUSTOMER_ACCEPTED decision. If Order/OrderItem creation raises and
        it were not isolated in its own nested atomic()/savepoint, a
        database-level error here could poison that whole outer transaction
        in Postgres and silently undo the parent's COMPLETED transition and
        the child SR's creation. Simulate the failure and confirm the quote
        decision still fully commits regardless."""
        parent_sr, order = self._make_parent_with_order()
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-ORDERTEST-3",
            grand_total=Decimal("6000.00"),
            advance_amount=Decimal("3000.00"),
            balance_amount=Decimal("3000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER,
        )
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})

        with patch("orders.models.OrderItem.objects.create", side_effect=RuntimeError("simulated Order-layer failure")):
            response = self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)

        quote.refresh_from_db()
        self.assertEqual(quote.status, PaintingQuote.Status.APPROVED)

        parent_sr.refresh_from_db()
        self.assertEqual(parent_sr.status, ServiceRequest.Status.COMPLETED)

        # The child SR was still created and fully committed...
        child_sr = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")
        self.assertEqual(child_sr.status, ServiceRequest.Status.CONFIRMED)
        # ...even though its OrderItem could not be (non-blocking, as designed).
        self.assertFalse(OrderItem.objects.filter(service_request=child_sr).exists())
