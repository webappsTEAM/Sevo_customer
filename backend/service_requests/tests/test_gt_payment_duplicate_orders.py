"""Regression (E2E QA 2026-10-01): a Goods & Transport customer whose payment screen timed out and who retried got a
SECOND live gateway order (initiate minted a new one every call) and could pay both, being charged twice for one
booking while the second payment overwrote the booking's transaction id without any flag.
  * initiate must hand back the open order for the same amount instead of minting another one;
  * a second paid order on an already settled booking must keep the original transaction on the booking and be
    flagged `duplicate_payment_refund_required` for refund."""
import hashlib
import hmac
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import Payment, ServiceRequest
from settings_hub.models import ServiceZone, ServiceZoneService

User = get_user_model()


@override_settings(
    PAYMENT_PROVIDER="razorpay",
    PAYMENT_SANDBOX_MODE=True,
    RAZORPAY_KEY_ID="",
    RAZORPAY_KEY_SECRET="",
)
class GTDuplicatePaymentTests(TestCase):
    def setUp(self):
        company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        z = ServiceZone.objects.create(company=company, name="Hosur", center_lat=12.75, center_lng=77.83, radius_meters=8000)
        ServiceZoneService.objects.create(zone=z, service_slug="goods_transport_two_wheeler", is_available=True)
        uid = uuid.uuid4().hex[:8]
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER, city="hosur", slug=f"t-{uid}", name="Bike",
            starting_price=Decimal("50.00"), base_fare=Decimal("50.00"), per_km_rate=Decimal("10.00"),
            free_km=Decimal("1.00"), vehicle_class="two_wheeler", max_weight_kg=Decimal("20"), max_cft=Decimal("2"))
        self.user = User.objects.create_user(
            username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
            phone=f"98{uuid.uuid4().int % 100000000:08d}", role=getattr(User.Role, "CUSTOMER", "customer"))
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        route = {"distance_km": 3.0, "duration_seconds": 600, "source": "google_maps"}
        with patch("service_requests.services.routing.get_route_eta", return_value=route):
            r = self.client.post("/api/booking/", {
                "customer_name": "E2E Customer", "phone": self.user.phone, "email": self.user.email,
                "service_category": "goods_transport_two_wheeler", "issue_title": "Delivery", "description": "box",
                "address": "Pickup, Hosur", "latitude": "12.7409", "longitude": "77.8253",
                "drop_address": "Drop, Hosur", "drop_latitude": "12.7600", "drop_longitude": "77.8400",
                "preferred_date": str(timezone.localdate()), "total_amount": "1.00", "payment_method": "ONLINE",
                "logistics_tier": self.tier.id}, format="json")
        assert r.status_code in (200, 201), r.content
        self.sr = ServiceRequest.objects.filter(service_category="goods_transport_two_wheeler").latest("id")
        init = self.client.post(reverse("payment-initiate"), {"booking_id": self.sr.id})
        assert init.status_code == 200, init.content
        self.order_id = init.data["data"]["order_id"]

    def _verify(self, order_id, pid):
        with patch("service_requests.tasks.async_dispatch_service_request"), self.captureOnCommitCallbacks(execute=True):
            return self.client.post(reverse("payment-verify"),
                                    {"payment_id": pid, "order_id": order_id, "signature": "sig", "booking_id": self.sr.id}, format="json")

    def test_initiate_twice_reuses_the_open_order(self):
        again = self.client.post(reverse("payment-initiate"), {"booking_id": self.sr.id})
        self.assertEqual(again.status_code, 200, again.content)
        self.assertEqual(again.data["data"]["order_id"], self.order_id)
        self.assertEqual(Payment.objects.filter(service_request=self.sr).count(), 1)

    def test_second_paid_order_on_settled_booking_is_flagged_not_recorded(self):
        # An order minted by an older client/session (not through initiate) still must not double-record.
        extra = Payment.objects.create(customer=self.user, service_request=self.sr, razorpay_order_id="order_sandbox_extra",
                                       provider_order_id="order_sandbox_extra", amount=Decimal("1.00"), currency="INR",
                                       status=ServiceRequest.PaymentStatus.PENDING, gateway="sandbox")
        self.assertEqual(self._verify(self.order_id, "pay_first").status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.transaction_id, "pay_first")
        r = self._verify(extra.provider_order_id, "pay_second")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(r.data["data"].get("duplicate_payment"))
        self.assertEqual(r.data["data"]["transaction_id"], "pay_first")
        self.sr.refresh_from_db(); extra.refresh_from_db()
        self.assertEqual(self.sr.transaction_id, "pay_first")          # booking keeps the real transaction
        self.assertEqual(extra.error_code, "duplicate_payment_refund_required")

    def test_normal_single_payment_unchanged(self):
        r = self._verify(self.order_id, "pay_only")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("duplicate_payment", r.data["data"])
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.payment_status, ServiceRequest.PaymentStatus.PAID)

    def test_payment_arriving_after_cancellation_queues_refund_and_stays_cancelled(self):
        # Customer is at the gateway when the booking gets cancelled; the gateway still takes the money.
        r = self.client.post(f"/api/booking/{self.sr.id}/cancel/", {"reason": "changed mind"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        resp = self._verify(self.order_id, "pay_late")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertTrue(resp.data["data"].get("refund_required"))
        self.assertEqual(resp.data["data"]["booking_status"], "cancelled")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, ServiceRequest.Status.CANCELLED)       # never re-confirmed / dispatched
        from service_requests.models import RefundRequest
        rr = RefundRequest.objects.filter(booking=self.sr)
        self.assertEqual(rr.count(), 1)
        self.assertEqual(rr.first().amount, Payment.objects.get(service_request=self.sr).amount)
        # replaying the same verify must not queue a second refund
        self._verify(self.order_id, "pay_late")
        self.assertEqual(RefundRequest.objects.filter(booking=self.sr).count(), 1)
