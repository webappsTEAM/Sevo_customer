"""GT Pass 5 regression tests (found during the final software-testing pass)."""
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import ServiceRequest

User = get_user_model()
URL = "/api/workforce-integration/webhook/"
SECRET = "pass5-test-secret"


def _booking(status="confirmed", dispatch_status="PENDING", **extra):
    uid = uuid.uuid4().hex[:8]
    customer = User.objects.create_user(
        username=f"p5{uid}", email=f"p5{uid}@example.com",
        phone=f"93{uuid.uuid4().int % 100000000:08d}", role="customer",
    )
    return ServiceRequest.objects.create(
        customer=customer, customer_name="C", phone=customer.phone, service_category="goods_transport_truck",
        issue_title="Move", address="Pickup", latitude=Decimal("12.9716"), longitude=Decimal("77.5946"),
        drop_address="Drop", drop_latitude=Decimal("13.0355"), drop_longitude=Decimal("77.5970"),
        preferred_date=timezone.localdate(), status=status, payment_method="COD", total_amount=Decimal("500"),
        dispatch_status=dispatch_status, **extra,
    )


class DispatchStatusReconcileTests(TestCase):
    """GT_DISPATCH_RECONCILE: a handoff recorded as PENDING (held / no vendor yet) must become DISPATCHED once Workforce
    reports an offer or an acceptance, instead of staying PENDING for the whole life of the booking."""

    def setUp(self):
        p = patch("workforce_integration.views.WORKFORCE_WEBHOOK_SECRET", SECRET)
        p.start()
        self.addCleanup(p.stop)

    def send(self, sr, event, payload=None):
        body = {"event": event, "event_id": f"evt_{uuid.uuid4().hex}", "sequence": 1,
                "payload": {"booking_id": sr.request_id, "workforce_job_id": str(sr.id), **(payload or {})}}
        return self.client.post(URL, data=json.dumps(body), content_type="application/json",
                                HTTP_X_WORKFORCE_WEBHOOK_SECRET=SECRET)

    def test_offer_event_promotes_pending_to_dispatched(self):
        sr = _booking(dispatch_status="PENDING", workforce_job_id="1")
        self.assertEqual(self.send(sr, "job.assigned", {"technician_name": "Ravi"}).status_code, 200)
        sr.refresh_from_db()
        self.assertEqual(sr.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)

    def test_pending_retry_is_promoted_by_acceptance(self):
        sr = _booking(status="assigned", dispatch_status="PENDING_RETRY", workforce_job_id="1")
        self.assertEqual(self.send(sr, "job.accepted", {"technician_name": "Ravi", "technician_phone": "9000000001"}).status_code, 200)
        sr.refresh_from_db()
        self.assertEqual(sr.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)

    def test_failed_dispatch_is_not_silently_rewritten(self):
        sr = _booking(dispatch_status="FAILED", workforce_job_id="1")
        self.send(sr, "job.assigned", {})
        sr.refresh_from_db()
        self.assertEqual(sr.dispatch_status, ServiceRequest.DispatchStatus.FAILED)


class BodyShapeAndSlotTests(TestCase):
    def test_booking_and_verify_reject_non_object_body(self):
        from rest_framework.test import APIClient
        c = APIClient()
        for url in ("/api/booking/", "/api/payment/verify/"):
            for body in ([], ["x"], "str"):
                r = c.post(url, data=body, format="json")
                self.assertLess(r.status_code, 500, (url, body, r.status_code))

    def test_slot_required_when_slots_configured(self):
        from service_requests.booking_window import unknown_slot_error
        from logistics.models import LogisticsSlot
        LogisticsSlot.objects.create(category="", slot_label="9 AM - 11 AM", is_active=True)
        cat = next(iter(__import__("service_requests.booking_window", fromlist=["x"])._SLOT_CATEGORY_KEYS))
        self.assertTrue(unknown_slot_error(cat, None))
        self.assertTrue(unknown_slot_error(cat, ""))
        self.assertIsNone(unknown_slot_error(cat, "9 AM - 11 AM"))
        self.assertIsNone(unknown_slot_error(cat, "Immediate"))


class BodyShapeSweepTests(TestCase):
    def test_more_post_endpoints_reject_non_object_body(self):
        from rest_framework.test import APIClient
        U = get_user_model()
        u = U.objects.create_user(username="gt5bs", password="x", email="gt5bs@x.io", role="customer") if "role" in [f.name for f in U._meta.fields] else U.objects.create_user(username="gt5bs", password="x")
        c = APIClient(); c.force_authenticate(u)
        for url in ("/api/auth/login/", "/api/payment/initiate/", "/api/payment/wallet-pay/", "/api/customer/refunds/create/"):
            for body in ([], "str"):
                r = c.post(url, data=body, format="json")
                self.assertLess(r.status_code, 500, (url, body, r.status_code))


class InitiateLockGuard(TestCase):
    def test_initiate_serialises_per_booking(self):
        import inspect
        from service_requests import payment_views
        src = inspect.getsource(payment_views.PaymentInitiateView)
        self.assertIn("select_for_update", src.split("def _initiate_locked")[0])
        self.assertIn("GT_INITIATE_LOCK", src)
