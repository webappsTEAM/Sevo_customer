"""GT_DISPATCH_INVARIANT (customer side).

Production evidence: scheduled GT bookings showed dispatch_status=DISPATCHED although Workforce had no dispatch state, no
offer and no notification, because the Workforce API answered HTTP 200. DISPATCHED must now mean "active offer or assignment";
everything else is an honest PENDING. A Workforce that does not send `dispatch_phase` (older deployment) keeps the legacy
meaning so deployment order (Workforce first) cannot regress anything.
"""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import User
from companies.models import Company
from service_requests.models import EventOutbox, ServiceRequest


@override_settings(SECURE_SSL_REDIRECT=False)
class DispatchStatusInvariantTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(company_name="Inv Co", display_id="COMP-INV-1")
        self.customer = User.objects.create_user(username="inv_cust", email="inv_cust@example.com", phone="9876543211", role="customer")
        self.booking = ServiceRequest.objects.create(
            request_id="GT-INV-001", company=self.company, customer=self.customer, customer_name="C", phone="9876543211",
            email="inv_cust@example.com", service_category="goods_transport_truck", issue_title="Mini Truck",
            status=ServiceRequest.Status.CONFIRMED, payment_method=ServiceRequest.PaymentMethod.COD,
            payment_status=ServiceRequest.PaymentStatus.PENDING, total_amount=Decimal("190.00"),
            preferred_date=timezone.now().date(), preferred_time="09:00 AM - 10:00 AM", tracking_token=uuid.uuid4(), start_otp="123456",
        )

    def _deliver(self, workforce_result):
        from service_requests.services.workforce_dispatch_outbox import deliver_workforce_dispatch_event, request_workforce_dispatch
        event = request_workforce_dispatch(self.booking)
        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as mock_dispatch:
            def _fake(sr):  # the real service records workforce_job_id on success
                if workforce_result.get("success"):
                    sr.workforce_job_id = workforce_result["workforce_job_id"]
                    sr.save(update_fields=["workforce_job_id"])
                return workforce_result
            mock_dispatch.side_effect = _fake
            out = deliver_workforce_dispatch_event(str(event.event_id))
        self.booking.refresh_from_db()
        event.refresh_from_db()
        return out, event

    def _ok(self, phase=None):
        data = {"success": True, "accepted": True, "workforce_job_id": "42"}
        if phase is not None:
            data["dispatch_phase"] = phase
        return {"success": True, "workforce_job_id": "42", "data": data}

    def test_offer_active_is_dispatched(self):
        out, ev = self._deliver(self._ok("OFFER_ACTIVE"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)
        self.assertEqual(ev.status, EventOutbox.Status.PUBLISHED)

    def test_assigned_is_dispatched(self):
        self._deliver(self._ok("ASSIGNED"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)

    def test_held_scheduled_job_is_pending_not_dispatched(self):
        out, ev = self._deliver(self._ok("HELD_SCHEDULED"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING)
        # handed off (so it must NOT be re-sent), but not claimed as dispatched
        self.assertEqual(ev.status, EventOutbox.Status.PUBLISHED)
        self.assertTrue(out["success"])

    def test_window_closed_is_pending_not_dispatched(self):
        self._deliver(self._ok("WINDOW_CLOSED"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING)

    def test_awaiting_eligible_vendor_is_pending_not_dispatched(self):
        self._deliver(self._ok("AWAITING_ELIGIBLE_VENDOR"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING)

    def test_legacy_workforce_without_phase_keeps_old_behaviour(self):
        self._deliver(self._ok(None))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.DISPATCHED)

    def test_failure_paths_are_unchanged(self):
        out, ev = self._deliver({"success": False, "message": "Workforce API error (500)"})
        self.assertFalse(out["success"])
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING_RETRY)
        self.assertEqual(ev.status, EventOutbox.Status.FAILED)

    def test_pending_handoff_is_not_resent(self):
        from service_requests.services.workforce_dispatch_outbox import request_workforce_dispatch
        self._deliver(self._ok("HELD_SCHEDULED"))
        self.assertIsNone(request_workforce_dispatch(self.booking), "workforce_job_id is recorded -> no duplicate dispatch intent")


@override_settings(SECURE_SSL_REDIRECT=False)
class DispatchBoundaryTests(TestCase):
    """GT_DISPATCH_BOUNDARY: groceries/vegetables orders never enter technician dispatch (booking #47 class)."""
    def setUp(self):
        self.company = Company.objects.create(company_name="Bnd Co", display_id="COMP-BND-1")
        self.customer = User.objects.create_user(username="bnd_cust", email="bnd@example.com", phone="9876543299", role="customer")

    def _sr(self, category, n):
        return ServiceRequest.objects.create(
            request_id=f"BND-{n}", company=self.company, customer=self.customer, customer_name="C", phone="9876543299", email="bnd@example.com",
            service_category=category, issue_title="x", status=ServiceRequest.Status.CONFIRMED, payment_method=ServiceRequest.PaymentMethod.COD,
            payment_status=ServiceRequest.PaymentStatus.PENDING, total_amount=Decimal("100"), preferred_date=timezone.now().date(),
            preferred_time="10-15 Min Express Delivery", tracking_token=uuid.uuid4(), start_otp="123456")

    def test_product_delivery_categories_create_no_dispatch_intent(self):
        from service_requests.services.workforce_dispatch_outbox import request_workforce_dispatch
        for i, cat in enumerate(["vegetables", "Groceries", "daily_essentials", "marketplace"]):
            self.assertIsNone(request_workforce_dispatch(self._sr(cat, i)), cat)
        self.assertEqual(EventOutbox.objects.filter(event_type="workforce.dispatch_requested").count(), 0)

    def test_gt_and_service_categories_still_dispatch(self):
        from service_requests.services.workforce_dispatch_outbox import request_workforce_dispatch
        for i, cat in enumerate(["goods_transport_truck", "goods_transport_two_wheeler", "packers_movers", "ac_repair"]):
            self.assertIsNotNone(request_workforce_dispatch(self._sr(cat, 10 + i)), cat)

    def test_event_queued_before_the_fix_is_ignored_not_sent(self):
        from service_requests.services.workforce_dispatch_outbox import deliver_workforce_dispatch_event
        sr = self._sr("goods_transport_truck", 30)
        from service_requests.services.workforce_dispatch_outbox import request_workforce_dispatch
        ev = request_workforce_dispatch(sr)
        sr.service_category = "vegetables"; sr.save(update_fields=["service_category"])
        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as m:
            out = deliver_workforce_dispatch_event(str(ev.event_id))
        m.assert_not_called()
        ev.refresh_from_db()
        self.assertEqual(ev.status, EventOutbox.Status.IGNORED)
        self.assertTrue(out["ignored"])


class UnknownPhaseTests(DispatchStatusInvariantTests):
    """An UNKNOWN phase (Workforce could not tell) must never be reported as DISPATCHED."""
    # inherit nothing extra: re-run the one assertion that matters
    def test_unknown_phase_is_pending(self):
        self._deliver(self._ok("UNKNOWN"))
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING)


@override_settings(SECURE_SSL_REDIRECT=False)
class OutboxBackoffTests(TestCase):
    """GT_OUTBOX_BACKOFF: a Workforce outage must not permanently strand bookings after ~5 minutes."""
    def setUp(self):
        self.company = Company.objects.create(company_name="Bo Co", display_id="COMP-BO-1")
        self.customer = User.objects.create_user(username="bo_cust", email="bo@example.com", phone="9876543288", role="customer")
        self.booking = ServiceRequest.objects.create(
            request_id="GT-BO-001", company=self.company, customer=self.customer, customer_name="Ravi Kumar", phone="9876543288", email="bo@example.com",
            service_category="goods_transport_truck", issue_title="x", status=ServiceRequest.Status.CONFIRMED, payment_method=ServiceRequest.PaymentMethod.COD,
            payment_status=ServiceRequest.PaymentStatus.PENDING, total_amount=Decimal("190.00"), preferred_date=timezone.now().date(),
            preferred_time="09:00 AM", tracking_token=uuid.uuid4(), start_otp="123456")

    def test_backoff_schedule_grows_and_caps(self):
        from service_requests.services.workforce_dispatch_outbox import retry_backoff_minutes
        self.assertEqual([retry_backoff_minutes(n) for n in (0, 1, 2, 3, 4, 5, 6, 7, 8, 20)], [0, 1, 2, 4, 8, 16, 32, 60, 60, 60])

    def test_failed_event_survives_far_beyond_five_attempts_and_is_retried_when_due(self):
        from service_requests.services.workforce_dispatch_outbox import process_pending_workforce_dispatches, request_workforce_dispatch
        ev = request_workforce_dispatch(self.booking)
        ev.status = EventOutbox.Status.FAILED; ev.retry_count = 12; ev.save(update_fields=["status", "retry_count"])   # > old limit of 5
        self.booking.last_dispatched_at = timezone.now() - timezone.timedelta(minutes=5)   # backoff for 12 failures = 60 min -> not due
        self.booking.save(update_fields=["last_dispatched_at"])
        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as m:
            self.assertEqual(process_pending_workforce_dispatches()["processed"], 0)
            m.assert_not_called()
            self.booking.last_dispatched_at = timezone.now() - timezone.timedelta(minutes=61); self.booking.save(update_fields=["last_dispatched_at"])
            m.return_value = {"success": True, "workforce_job_id": "9", "data": {"dispatch_phase": "HELD_SCHEDULED"}}
            out = process_pending_workforce_dispatches()
        self.assertEqual(out["processed"], 1)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.PENDING)

    def test_fresh_event_is_attempted_immediately(self):
        from service_requests.services.workforce_dispatch_outbox import process_pending_workforce_dispatches, request_workforce_dispatch
        request_workforce_dispatch(self.booking)
        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job") as m:
            m.return_value = {"success": False, "message": "down"}
            self.assertEqual(process_pending_workforce_dispatches()["processed"], 1)

    def test_exhausted_after_max_retries_is_marked_failed(self):
        from service_requests.services.workforce_dispatch_outbox import MAX_RETRIES, deliver_workforce_dispatch_event, request_workforce_dispatch
        ev = request_workforce_dispatch(self.booking)
        ev.retry_count = MAX_RETRIES - 1; ev.status = EventOutbox.Status.FAILED; ev.save(update_fields=["retry_count", "status"])
        with patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job", return_value={"success": False, "message": "down"}):
            out = deliver_workforce_dispatch_event(str(ev.event_id))
        self.assertTrue(out["exhausted"])
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.dispatch_status, ServiceRequest.DispatchStatus.FAILED)
