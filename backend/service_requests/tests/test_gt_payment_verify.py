"""
GT online payment: /api/payment/verify/ must complete for a Goods & Transport
booking and queue dispatch afterwards.

Regression: payment_views.py called transaction.on_commit() without importing
`transaction`, so every successful verification raised NameError (HTTP 500)
*after* the booking had been marked PAID -- the customer saw a failure on a
payment that had gone through and dispatch was never queued.
"""
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


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class GTPaymentVerifyTests(TestCase):
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

    def _verify(self, **kw):
        # TestCase runs inside a transaction, so on_commit hooks only fire when captured.
        with self.captureOnCommitCallbacks(execute=True):
            return self._post_verify(**kw)

    def _post_verify(self, **kw):
        body = {"payment_id": "pay_gt_1", "order_id": self.order_id, "signature": "sig", "booking_id": self.sr.id}
        body.update(kw)
        return self.client.post(reverse("payment-verify"), body, format="json")

    def test_verification_succeeds_and_queues_dispatch(self):
        with patch("service_requests.tasks.async_dispatch_service_request") as task:
            r = self._verify()
        self.assertEqual(r.status_code, 200, r.content)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.payment_status, ServiceRequest.PaymentStatus.PAID)
        task.delay.assert_called_once_with(self.sr.id)

    def test_replay_is_idempotent_and_does_not_dispatch_twice(self):
        with patch("service_requests.tasks.async_dispatch_service_request") as task:
            self.assertEqual(self._verify().status_code, 200)
            self.assertEqual(self._verify().status_code, 200)
        self.assertEqual(task.delay.call_count, 1)
        self.assertEqual(Payment.objects.filter(service_request=self.sr).count(), 1)

    @override_settings(PAYMENT_SANDBOX_MODE=False, RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret")
    def test_bad_signature_is_refused_and_nothing_is_paid_or_dispatched(self):
        with patch("service_requests.tasks.async_dispatch_service_request") as task:
            r = self._verify(signature="forged")
        self.assertEqual(r.status_code, 400)
        self.sr.refresh_from_db()
        self.assertNotEqual(self.sr.payment_status, ServiceRequest.PaymentStatus.PAID)
        task.delay.assert_not_called()

    @override_settings(PAYMENT_SANDBOX_MODE=False, RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret")
    def test_valid_signature_is_accepted(self):
        sig = hmac.new(b"secret", f"{self.order_id}|pay_gt_1".encode(), hashlib.sha256).hexdigest()
        with patch("service_requests.tasks.async_dispatch_service_request") as task:
            r = self._verify(signature=sig)
        self.assertEqual(r.status_code, 200, r.content)
        task.delay.assert_called_once()

    def test_another_customer_cannot_verify_my_booking(self):
        other = User.objects.create_user(username="oth", email="o@e.com", password="pw12345678",
                                         phone="9811111111", role=getattr(User.Role, "CUSTOMER", "customer"))
        c = APIClient(); c.force_authenticate(user=other)
        r = c.post(reverse("payment-verify"), {"payment_id": "p", "order_id": self.order_id, "signature": "s", "booking_id": self.sr.id}, format="json")
        self.assertEqual(r.status_code, 403)

    @override_settings(PAYMENT_SANDBOX_MODE=False, RAZORPAY_KEY_ID="rzp_test_x", RAZORPAY_KEY_SECRET="secret")
    def test_non_ascii_signature_is_a_clean_400_not_a_server_error(self):
        r = self._verify(signature="s\u00e9cret")
        self.assertEqual(r.status_code, 400)


class WebhookHostileHeaderTests(TestCase):
    def test_non_ascii_secret_header_is_401_not_500(self):
        c = APIClient()
        for hdr in ("HTTP_X_WORKFORCE_WEBHOOK_SECRET", "HTTP_AUTHORIZATION"):
            r = c.post("/api/workforce-integration/webhook/", {"event": "x", "event_id": "e1", "payload": {}},
                       format="json", **{hdr: "s\u00e9cret"})
            self.assertEqual(r.status_code, 401, hdr)
