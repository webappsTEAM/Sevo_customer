"""GT Pass 8: legacy technician endpoints never hand out the customer's start OTP; websocket broadcast signature."""
import json
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import ServiceRequest

User = get_user_model()
OTP = "7502"


def _walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k, v
            yield from _walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from _walk(v)


class LegacyTechnicianOtpTests(TransactionTestCase):
    def setUp(self):
        self.tech = User.objects.create_user(username="p8_tech", email="p8t@sevo.in", password="x", role=User.Role.EMPLOYEE, phone="9876543210")
        self.cust = User.objects.create_user(username="p8_cust", email="p8c@sevo.in", password="x", role="customer", phone="9811000011")
        self.sr = ServiceRequest.objects.create(
            request_id="SR-P8-1", service_category="cleaning", issue_title="Clean", customer_name="Ananya", phone="9123456789",
            address="a", latitude=Decimal("12.9352"), longitude=Decimal("77.6245"), preferred_date=timezone.now().date(),
            preferred_time="10:00 AM", total_amount=Decimal("1499"), status=ServiceRequest.Status.CONFIRMED, start_otp=OTP, tracking_token=uuid.uuid4())

    def _client(self, user=None):
        c = APIClient()
        if user: c.force_authenticate(user)
        return c

    def _otp_values(self, resp):
        try:
            data = resp.json()
        except Exception:
            return []
        return [v for k, v in _walk(data) if k == "start_otp" and v]

    def test_unauthenticated_cannot_reach_the_legacy_surface(self):
        c = self._client()
        for u in ("/api/technician/bookings/", f"/api/technician/bookings/{self.sr.pk}/detail/"):
            self.assertIn(c.get(u).status_code, (401, 403))
        self.assertIn(c.post(f"/api/technician/bookings/{self.sr.pk}/verify-otp/", {"otp": OTP}, format="json").status_code, (401, 403))

    def test_no_legacy_technician_response_carries_the_start_otp(self):
        for who in (self.cust, self.tech):
            c = self._client(who)
            for u in ("/api/technician/bookings/", f"/api/technician/bookings/{self.sr.pk}/detail/"):
                r = c.get(u)
                self.assertNotIn(OTP, r.content.decode(), (who.username, u))
                self.assertEqual(self._otp_values(r), [], (who.username, u))

    def test_accept_and_status_responses_do_not_carry_it_either(self):
        c = self._client(self.tech)
        r = c.post(f"/api/technician/bookings/{self.sr.pk}/accept/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn(OTP, r.content.decode())
        r = c.get(f"/api/technician/bookings/{self.sr.pk}/detail/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn(OTP, r.content.decode())

    def test_start_verification_still_works_for_the_assigned_technician(self):
        c = self._client(self.tech)
        self.assertEqual(c.post(f"/api/technician/bookings/{self.sr.pk}/accept/").status_code, 200)
        bad = c.post(f"/api/technician/bookings/{self.sr.pk}/verify-otp/", {"otp": "0000"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = c.post(f"/api/technician/bookings/{self.sr.pk}/verify-otp/", {"otp": OTP}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.sr.refresh_from_db()
        self.assertTrue(self.sr.otp_verified)
        self.assertEqual(self.sr.status, ServiceRequest.Status.IN_PROGRESS)


class _FakeLayer:
    def __init__(self):
        self.sent = []

    async def group_send(self, group, message):
        self.sent.append((group, message))


class WorkforceBroadcastEventTests(TransactionTestCase):
    """WorkforceWebhookView._broadcast_event(sr, event_type, extra) -- callers pass the event's own data as a 3rd argument."""

    def setUp(self):
        from unittest.mock import patch
        self.cust = User.objects.create_user(username="p8_c2", email="p8c2@sevo.in", password="x", role="customer", phone="9811000022")
        self.sr = ServiceRequest.objects.create(
            customer=self.cust, request_id="SR-P8-2", service_category="goods_transport_truck", issue_title="Move", customer_name="C",
            phone="9811000022", address="a", latitude=Decimal("12.9716"), longitude=Decimal("77.5946"), drop_address="d",
            drop_latitude=Decimal("13.0355"), drop_longitude=Decimal("77.5970"), drop_contact_phone="9123456789",
            preferred_date=timezone.localdate(), status="in_progress", payment_method="COD", total_amount=Decimal("500"),
            start_otp=OTP, tracking_token=uuid.uuid4(), technician_name="Ravi")
        self.layer = _FakeLayer()
        p = patch("channels.layers.get_channel_layer", return_value=self.layer); p.start(); self.addCleanup(p.stop)
        from django.test import override_settings
        o = override_settings(TRACKING_BROADCAST_ENABLED=True); o.enable(); self.addCleanup(o.disable)

    def _view(self):
        from workforce_integration.views import WorkforceWebhookView
        return WorkforceWebhookView

    def test_three_argument_call_does_not_raise_and_reaches_every_group_without_otp(self):
        self._view()._broadcast_event(self.sr, "payment_cash_collected", {"payment_otp": "445566", "expires_at": "2026-10-03T10:00:00Z", "amount_received": "500"})
        groups = {g for g, _ in self.layer.sent}
        self.assertIn(f"tracking_{self.sr.tracking_token}", groups)       # the token group is among the targets
        self.assertIn(f"tracking_{self.sr.id}", groups)
        for g, m in self.layer.sent:
            self.assertEqual(m["type"], "payment_cash_collected")
            blob = json.dumps(m["data"], default=str)
            self.assertNotIn("445566", blob)
            self.assertNotIn(OTP, blob)
            self.assertNotIn("9123456789", blob)                          # receiver phone masked on shared groups
            self.assertIsNone(m["data"].get("payment_otp"))
            self.assertEqual(m["data"].get("expires_at"), "2026-10-03T10:00:00Z")   # the event's own data arrives

    def test_hold_event_data_is_delivered(self):
        self._view()._broadcast_event(self.sr, "job_hold_status_changed", {"is_on_hold": True, "hold_reason": "rain"})
        self.assertTrue(self.layer.sent)
        for _, m in self.layer.sent:
            self.assertIs(m["data"]["is_on_hold"], True)
            self.assertEqual(m["data"]["hold_reason"], "rain")

    def test_two_argument_call_still_works(self):
        self._view()._broadcast_event(self.sr, "service_started")
        self.assertTrue(self.layer.sent)
        for _, m in self.layer.sent:
            self.assertEqual(m["type"], "service_started")
            self.assertIsNone(m["data"].get("start_otp"))

    def test_vendor_hold_webhook_broadcasts_instead_of_crashing(self):
        from unittest.mock import patch
        with patch("workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", "p8-secret"):
            body = {"event": "job.hold", "event_id": f"evt_{uuid.uuid4().hex}", "sequence": 9001,
                    "payload": {"booking_id": self.sr.request_id, "workforce_job_id": str(self.sr.id), "reason": "rain"}}
            r = self.client.post("/api/workforce-integration/webhook/", data=json.dumps(body), content_type="application/json",
                                 HTTP_X_WORKFORCE_WEBHOOK_SECRET="p8-secret")
        self.assertEqual(r.status_code, 200, r.content)
        types = [m["type"] for _, m in self.layer.sent]
        self.assertIn("job_hold_status_changed", types)
        held = [m for _, m in self.layer.sent if m["type"] == "job_hold_status_changed"][0]
        self.assertIs(held["data"]["is_on_hold"], True)
        self.assertNotIn(OTP, json.dumps(held["data"], default=str))


class GuestOrderLayerEvidenceTests(TransactionTestCase):
    """Finding 1: Order.customer is NOT NULL (PROTECT). A guest that is deliberately not attached to a registered
    account has no customer to own an Order, so the (non-blocking, additive) Order layer logs and skips; the booking
    itself succeeds. A guest with a NEW phone still gets an account + Order exactly as before."""

    def _post(self, phone, email, client=None):
        from datetime import timedelta
        from django.urls import reverse
        payload = {
            "customer_name": "Jane Doe", "phone": phone, "email": email, "service_category": "cleaning", "issue_title": "Home Cleaning Service",
            "address": "123 Main St, Hosur", "preferred_date": str(timezone.now().date() + timedelta(days=1)), "preferred_time": "09:00 AM",
            "latitude": 12.7420, "longitude": 77.8260, "total_amount": 5000,
            "cart_data": [{"id": "serv-cleaning-full-house", "price": 5000, "quantity": 1, "categoryName": "Cleaning"}],
        }
        return (client or APIClient()).post(reverse("sr-booking"), payload, format="json")

    def setUp(self):
        from companies.models import Company
        Company.objects.get_or_create(slug="sevo", defaults={"company_name": "sevo Logistics"})
        self.reg = User.objects.create_user(username="p8_reg", email="p8reg@example.com", password="x", role="CUSTOMER", phone="9876500777")

    def test_guest_matching_a_registered_account_books_but_is_not_attached_and_has_no_order(self):
        from orders.models import Order, OrderItem
        before = Order.objects.filter(customer=self.reg).count()
        r = self._post("9876500777", "p8reg@example.com")
        self.assertEqual(r.status_code, 201, getattr(r, "data", None))
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        self.assertIsNone(sr.customer_id)
        self.assertFalse(OrderItem.objects.filter(service_request=sr).exists())
        self.assertEqual(Order.objects.filter(customer=self.reg).count(), before)   # nothing was put on the registered account

    def test_guest_with_a_new_phone_still_gets_an_account_and_an_order(self):
        from orders.models import OrderItem
        r = self._post("9876500888", "p8new@example.com")
        self.assertEqual(r.status_code, 201, getattr(r, "data", None))
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        self.assertIsNotNone(sr.customer_id)
        self.assertNotEqual(sr.customer_id, self.reg.pk)
        self.assertTrue(OrderItem.objects.filter(service_request=sr).exists())

    def test_signed_in_customer_keeps_the_order(self):
        from orders.models import OrderItem
        c = APIClient(); c.force_authenticate(self.reg)
        r = self._post("9876500777", "p8reg@example.com", c)
        self.assertEqual(r.status_code, 201)
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        self.assertEqual(sr.customer_id, self.reg.pk)
        self.assertTrue(OrderItem.objects.filter(service_request=sr).exists())
