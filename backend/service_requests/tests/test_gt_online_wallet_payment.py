"""GT prepaid payments: wallet pay, gateway (sandbox) pay, fare variance after delivery, wallet refunds."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests import services as sr_services
from service_requests.models import (
    CustomerWallet, Payment, RefundReason, RefundRequest, RefundStatus, ServiceRequest, WalletTransaction,
)
from service_requests.services.prepaid_variance import balance_due, settle_prepaid_variance

User = get_user_model()
S = ServiceRequest.Status
PS = ServiceRequest.PaymentStatus


def _user():
    return User.objects.create_user(
        username=f"u_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com", password="pw12345678",
        phone=f"97{uuid.uuid4().int % 100000000:08d}", role="customer")


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class PrepaidGTTests(TestCase):
    def setUp(self):
        self.user = _user()
        self.c = APIClient()
        self.c.force_authenticate(self.user)
        self.sr = self._booking()
        p = patch("service_requests.tasks.async_dispatch_service_request")
        self.dispatch = p.start()
        self.addCleanup(p.stop)

    def _booking(self, total="600.00", category="goods_transport_truck", method="ONLINE", user=None):
        u = user or self.user
        return ServiceRequest.objects.create(
            customer=u, customer_name="Ravi Kumar", phone=u.phone, email=u.email, service_category=category,
            issue_title="Move", address="Hosur", preferred_date=timezone.localdate(), total_amount=Decimal(total),
            payment_method=method, status=S.WAITING_FOR_PAYMENT if method == "ONLINE" else S.CONFIRMED,
            payment_status=PS.PROCESSING if method == "ONLINE" else PS.PENDING)

    def _fund(self, amount):
        sr_services.credit_wallet(self.user, Decimal(amount), WalletTransaction.Reason.GOODWILL, note="test")

    def _balance(self):
        w = CustomerWallet.objects.filter(user=self.user).first()
        return w.balance if w else Decimal("0")

    # ── wallet ────────────────────────────────────────────────────────────
    def test_wallet_pay_confirms_and_dispatches(self):
        self._fund("1000")
        with self.captureOnCommitCallbacks(execute=True):
            r = self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, S.CONFIRMED)
        self.assertEqual(self.sr.payment_status, PS.PAID)
        self.assertEqual(self._balance(), Decimal("400.00"))
        p = Payment.objects.get(service_request=self.sr)
        self.assertEqual((p.gateway, p.amount, p.status), ("wallet", Decimal("600.00"), PS.PAID))
        self.dispatch.delay.assert_called_once()

    def test_insufficient_wallet_changes_nothing(self):
        self._fund("100")
        r = self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self._balance(), Decimal("100.00"))
        self.assertFalse(Payment.objects.exists())
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, S.WAITING_FOR_PAYMENT)

    def test_cannot_spend_someone_elses_wallet_or_pay_twice(self):
        self._fund("2000")
        other = APIClient(); other.force_authenticate(_user())
        self.assertEqual(other.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json").status_code, 403)
        self.assertEqual(self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json").status_code, 200)
        again = self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertEqual(self._balance(), Decimal("1400.00"))                      # charged once
        self.assertEqual(Payment.objects.count(), 1)

    def test_only_logistics_online_bookings(self):
        self._fund("2000")
        cod = self._booking(method="COD")
        home = self._booking(category="ac_repair")
        for sr in (cod, home):
            self.assertEqual(self.c.post("/api/payment/wallet-pay/", {"booking_id": sr.id}, format="json").status_code, 400)
        self.assertEqual(self._balance(), Decimal("2000.00"))

    def test_anonymous_cannot_use_wallet_endpoint(self):
        self.assertIn(APIClient().post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json").status_code, (401, 403))

    # ── gateway (sandbox) ─────────────────────────────────────────────────
    def test_gateway_flow_for_gt(self):
        r = self.c.post("/api/payment/initiate/", {"booking_id": self.sr.id}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        order = r.data["data"]["order_id"]
        self.assertEqual(r.data["data"]["amount"], 600.0)
        with self.captureOnCommitCallbacks(execute=True):
            v = self.c.post("/api/payment/verify/", {"booking_id": self.sr.id, "order_id": order}, format="json")
        self.assertEqual(v.status_code, 200, v.content)
        self.sr.refresh_from_db()
        self.assertEqual((self.sr.status, self.sr.payment_status), (S.CONFIRMED, PS.PAID))
        self.dispatch.delay.assert_called_once()

    # ── fare variance after delivery ──────────────────────────────────────
    def _paid_trip(self):
        self._fund("1000")
        self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id}, format="json")
        self.sr.refresh_from_db()
        return self.sr

    def test_lower_final_fare_opens_one_overcharge_refund(self):
        sr = self._paid_trip()
        sr.total_amount = Decimal("550.00"); sr.status = S.IN_PROGRESS; sr.save()
        self.assertEqual(settle_prepaid_variance(sr), "REFUND_REQUESTED")
        self.assertEqual(settle_prepaid_variance(sr), "REFUND_REQUESTED")          # retried DELIVERED event
        rr = RefundRequest.objects.get(booking=sr)
        self.assertEqual((rr.amount, rr.reason, rr.status), (Decimal("50.00"), RefundReason.OVERCHARGED, RefundStatus.PENDING))

    def test_higher_final_fare_creates_balance_paid_without_redispatch(self):
        sr = self._paid_trip()
        self.dispatch.reset_mock()
        sr.total_amount = Decimal("700.00"); sr.status = S.IN_PROGRESS; sr.save()
        self.assertEqual(balance_due(sr), Decimal("100.00"))
        self.assertEqual(settle_prepaid_variance(sr), "BALANCE_DUE")
        r = self.c.post("/api/payment/initiate/", {"booking_id": sr.id}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["data"]["amount"], 100.0)                           # only the difference
        with self.captureOnCommitCallbacks(execute=True):
            v = self.c.post("/api/payment/verify/", {"booking_id": sr.id, "order_id": r.data["data"]["order_id"]}, format="json")
        self.assertEqual(v.status_code, 200, v.content)
        sr.refresh_from_db()
        self.assertEqual(sr.status, S.IN_PROGRESS)                                  # not reset to CONFIRMED
        self.assertEqual(balance_due(sr), Decimal("0.00"))
        self.dispatch.delay.assert_not_called()

    def test_cod_trip_is_never_touched(self):
        cod = self._booking(method="COD")
        self.assertIsNone(settle_prepaid_variance(cod))
        self.assertEqual(balance_due(cod), Decimal("0.00"))

    # ── refund back to the wallet ─────────────────────────────────────────
    def test_refund_of_wallet_payment_goes_back_to_wallet_without_clawback(self):
        sr = self._paid_trip()
        self.assertEqual(self._balance(), Decimal("400.00"))
        sr.total_amount = Decimal("550.00"); sr.save()
        settle_prepaid_variance(sr)
        rr = RefundRequest.objects.get(booking=sr)
        rr.status = RefundStatus.SENT_TO_FINANCE; rr.approved_amount = Decimal("50.00"); rr.save()
        admin = User.objects.create_superuser(username="adm", email="adm@e.com", password="pw12345678", phone="9000000001")
        with patch("service_requests.services.WorkforceIntegrationService.clawback_workforce_job") as claw:
            sr_services.admin_complete_refund(admin, rr.id)
        self.assertEqual(self._balance(), Decimal("450.00"))
        claw.assert_not_called()
        rr.refresh_from_db()
        self.assertEqual(rr.status, RefundStatus.COMPLETED)
        self.assertTrue(rr.gateway_reference.startswith("wallet_refund_"))


class UnpaidExpiryTests(TestCase):
    def test_only_stale_unpaid_online_logistics_bookings_are_released(self):
        from datetime import timedelta
        from service_requests.services.payment_expiry import expire_unpaid_online_bookings
        u = _user()

        def mk(**kw):
            d = dict(customer=u, customer_name="Ravi Kumar", phone=u.phone, email=u.email, service_category="goods_transport_truck",
                     issue_title="m", address="Hosur", preferred_date=timezone.localdate(), total_amount=Decimal("500"),
                     payment_method="ONLINE", status=S.WAITING_FOR_PAYMENT, payment_status=PS.PROCESSING)
            d.update(kw)
            return ServiceRequest.objects.create(**d)

        stale, fresh, home, cod = mk(), mk(), mk(service_category="ac_repair"), mk(payment_method="COD", status=S.CONFIRMED)
        old = timezone.now() - timedelta(minutes=90)
        ServiceRequest.objects.filter(pk__in=[stale.pk, home.pk, cod.pk]).update(created_at=old)
        self.assertEqual(expire_unpaid_online_bookings(), 1)
        for sr, want in ((stale, S.CANCELLED), (fresh, S.WAITING_FOR_PAYMENT), (home, S.WAITING_FOR_PAYMENT), (cod, S.CONFIRMED)):
            sr.refresh_from_db()
            self.assertEqual(sr.status, want, sr.pk)


class UnpaidExpiryLifecycleTests(TestCase):
    def _stale(self, minutes_old):
        from datetime import timedelta
        u = _user()
        sr = ServiceRequest.objects.create(
            customer=u, customer_name="Ravi Kumar", phone=u.phone, email=u.email, service_category="goods_transport_truck",
            issue_title="m", address="Hosur", preferred_date=timezone.localdate(), total_amount=Decimal("500"),
            payment_method="ONLINE", status=S.WAITING_FOR_PAYMENT, payment_status=PS.PROCESSING)
        ServiceRequest.objects.filter(pk=sr.pk).update(created_at=timezone.now() - timedelta(minutes=minutes_old))
        return sr

    def test_admin_hold_duration_changes_expiry_and_sweep_is_idempotent(self):
        from service_requests.models import GTOperationsConfig
        from service_requests.tasks import expire_unpaid_online_bookings_task
        sr = self._stale(45)
        GTOperationsConfig.objects.all().delete()
        GTOperationsConfig.objects.create(online_payment_window_minutes=60)
        self.assertEqual(expire_unpaid_online_bookings_task(), 0)
        sr.refresh_from_db()
        self.assertEqual(sr.status, S.WAITING_FOR_PAYMENT)
        GTOperationsConfig.objects.update(online_payment_window_minutes=30)
        from unittest.mock import patch
        with patch("service_requests.notifications.send_sms_notification") as sms:
            self.assertEqual(expire_unpaid_online_bookings_task(), 1)
            self.assertEqual(expire_unpaid_online_bookings_task(), 0)
        self.assertEqual(sms.call_count, 1)
        self.assertIn("payment-expired", sms.call_args.kwargs["event_key"])
        sr.refresh_from_db()
        self.assertEqual(sr.status, S.CANCELLED)
        self.assertEqual(sr.payment_status, PS.CANCELLED)

    def test_sweep_is_registered_as_periodic_task_once_and_keeps_admin_edits(self):
        from django_celery_beat.models import PeriodicTask
        from service_requests.apps import GT_PERIODIC_TASKS, register_gt_periodic_tasks
        name, task, _ = GT_PERIODIC_TASKS[0]
        register_gt_periodic_tasks()
        register_gt_periodic_tasks()
        rows = PeriodicTask.objects.filter(name=name)
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows[0].task, task)
        rows.update(enabled=False)
        register_gt_periodic_tasks()
        self.assertFalse(PeriodicTask.objects.get(name=name).enabled)


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class PrepaidEndToEndTests(TestCase):
    """Real endpoints + webhook: book ONLINE, pay from the wallet, deliver, pay the balance."""
    from service_requests.tests.test_gt_end_to_end import GoodsTransportEndToEndTests as _E
    setUp = _E.setUp
    _webhook = _E._webhook
    _tracking = _E._tracking
    del _E

    def test_wallet_prepaid_trip_with_balance(self):
        import json
        from service_requests.tests.test_gt_end_to_end import PICKUP, DROP, _route
        from service_requests.models import FareReconciliation, TripStop
        self.client.force_authenticate(user=self.customer)
        sr_services.credit_wallet(self.customer, Decimal("2000"), WalletTransaction.Reason.GOODWILL, note="t")
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            r = self.client.post("/api/booking/", {
                "customer_name": "E2E Customer", "phone": self.customer.phone, "email": self.customer.email,
                "service_category": "goods_transport_truck", "issue_title": "Mini truck", "description": "sofa and boxes",
                "address": "Pickup Point, Hosur", "latitude": PICKUP["lat"], "longitude": PICKUP["lng"],
                "drop_address": "Drop Point, Bengaluru", "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"],
                "preferred_date": str(timezone.localdate()), "total_amount": "1.00",
                "payment_method": "ONLINE", "logistics_tier": self.tier.id}, format="json")
        self.assertIn(r.status_code, (200, 201), r.content)
        self.booking = ServiceRequest.objects.get(pk=r.data["data"]["id"])
        self.assertEqual((self.booking.status, self.booking.total_amount), (S.WAITING_FOR_PAYMENT, Decimal("530.00")))

        with patch("service_requests.tasks.async_dispatch_service_request") as disp, self.captureOnCommitCallbacks(execute=True):
            pay = self.client.post("/api/payment/wallet-pay/", {"booking_id": self.booking.id}, format="json")
        self.assertEqual(pay.status_code, 200, pay.content)
        disp.delay.assert_called_once()
        self.assertEqual(CustomerWallet.objects.get(user=self.customer).balance, Decimal("1470.00"))

        TripStop.objects.create(booking=self.booking, sequence=1, stop_type=TripStop.StopType.PICKUP, address="P",
                                latitude=Decimal(PICKUP["lat"]), longitude=Decimal(PICKUP["lng"]))
        TripStop.objects.create(booking=self.booking, sequence=2, stop_type=TripStop.StopType.DROP, address="D",
                                latitude=Decimal(DROP["lat"]), longitude=Decimal(DROP["lng"]))
        self._webhook("technician.assigned", {"technician": {"name": "Ravi K"}})
        self._webhook("employee_accepted", {"technician": {"name": "Ravi K", "phone": "9800000001"}})
        for leg in ("EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP", "UNLOADING", "DELIVERED"):
            self._webhook("logistics.leg_changed", {"leg": leg})
        self._webhook("service_completed", {"actual_distance_km": "15.00"})      # 3 km longer than quoted

        self.booking.refresh_from_db()
        status_before = self.booking.status
        self.assertEqual(self.booking.total_amount, Decimal("584.00"))
        self.assertEqual(self._tracking()["balance_due"], "54.00")               # shown to the customer

        with self.captureOnCommitCallbacks(execute=True):
            due = self.client.post("/api/payment/initiate/", {"booking_id": self.booking.id}, format="json")
            self.assertEqual(due.data["data"]["amount"], 54.0)
            ok = self.client.post("/api/payment/verify/", {"booking_id": self.booking.id, "order_id": due.data["data"]["order_id"]}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertIsNone(self._tracking()["balance_due"])
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, status_before)                     # untouched by the balance payment
        self.assertEqual(sum(p.amount for p in Payment.objects.filter(service_request=self.booking, status=PS.PAID)), Decimal("584.00"))


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class WalletPartPaymentTests(PrepaidGTTests):
    """Admin switch -> wallet + online split; expiry returns the wallet part."""

    def _enable(self, on=True):
        from service_requests.models import GTOperationsConfig
        GTOperationsConfig.objects.all().delete()
        GTOperationsConfig.objects.create(allow_wallet_part_payment=on)

    def _pay(self, **extra):
        return self.c.post("/api/payment/wallet-pay/", {"booking_id": self.sr.id, **extra}, format="json")

    def test_off_by_default_even_if_client_asks(self):
        self._fund("200")
        r = self._pay(allow_partial=True)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(self._balance(), Decimal("200"))

    def test_split_spends_wallet_then_gateway_pays_only_the_rest_and_dispatches(self):
        self._enable()
        self._fund("200")
        r = self._pay(allow_partial=True)
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.data["data"]["remaining_due"], 400.0)
        self.assertEqual(self._balance(), Decimal("0"))
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, S.WAITING_FOR_PAYMENT)      # not confirmed yet
        self.dispatch.delay.assert_not_called()
        o = self.c.post("/api/payment/initiate/", {"booking_id": self.sr.id}, format="json").data["data"]
        self.assertEqual(o["amount"], 400.0)                          # only the remainder is charged
        with self.captureOnCommitCallbacks(execute=True):
            v = self.c.post("/api/payment/verify/", {"booking_id": self.sr.id, "order_id": o["order_id"]}, format="json")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.status, S.CONFIRMED, v.content)

    def test_expiry_returns_the_wallet_part_once(self):
        from datetime import timedelta
        from service_requests.services.payment_expiry import expire_unpaid_online_bookings
        self._enable()
        self._fund("200")
        self._pay(allow_partial=True)
        ServiceRequest.objects.filter(pk=self.sr.pk).update(created_at=timezone.now() - timedelta(minutes=90))
        self.assertEqual(expire_unpaid_online_bookings(), 1)
        self.assertEqual(self._balance(), Decimal("200"))
        expire_unpaid_online_bookings()
        self.assertEqual(self._balance(), Decimal("200"))

    def test_config_reports_the_admin_switch(self):
        self._enable(False)
        self.assertFalse(self.c.get("/api/payment/config/").data["data"]["wallet_part_payment"])
        self._enable(True)
        self.assertTrue(self.c.get("/api/payment/config/").data["data"]["wallet_part_payment"])


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class WalletTopUpTests(TestCase):
    def setUp(self):
        self.user = _user()
        self.c = APIClient()
        self.c.force_authenticate(self.user)

    def _cfg(self, **kw):
        from service_requests.models import GTOperationsConfig
        GTOperationsConfig.objects.all().delete()
        GTOperationsConfig.objects.create(**kw)

    def _topup(self, amount):
        r = self.c.post("/api/wallet/topup/", {"amount": amount}, format="json")
        if r.status_code != 200:
            return r, None
        v = self.c.post("/api/wallet/topup/verify/", {"order_id": r.data["data"]["order_id"]}, format="json")
        return r, v

    def _bal(self):
        w = CustomerWallet.objects.filter(user=self.user).first()
        return w.balance if w else Decimal("0")

    def test_disabled_by_default(self):
        r, _ = self._topup("500")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self._bal(), Decimal("0"))

    def test_credit_once_and_verify_is_idempotent(self):
        self._cfg(wallet_topup_enabled=True)
        r, v = self._topup("500")
        self.assertEqual(v.status_code, 200, v.content)
        again = self.c.post("/api/wallet/topup/verify/", {"order_id": r.data["data"]["order_id"]}, format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(self._bal(), Decimal("500"))

    def test_admin_limits_are_enforced(self):
        self._cfg(wallet_topup_enabled=True, wallet_max_topup=Decimal("1000"), wallet_max_balance=Decimal("1500"))
        self.assertEqual(self._topup("1200")[0].status_code, 400)     # over per-recharge limit
        self.assertEqual(self._topup("1000")[1].status_code, 200)
        self.assertEqual(self._topup("600")[0].status_code, 400)      # 1000 + 600 > cap 1500
        self.assertEqual(self._topup("500")[1].status_code, 200)
        self.assertEqual(self._bal(), Decimal("1500"))

    def test_another_users_order_cannot_be_verified(self):
        self._cfg(wallet_topup_enabled=True)
        r = self.c.post("/api/wallet/topup/", {"amount": "100"}, format="json")
        other = APIClient(); other.force_authenticate(_user())
        v = other.post("/api/wallet/topup/verify/", {"order_id": r.data["data"]["order_id"]}, format="json")
        self.assertEqual(v.status_code, 404)

    def test_wallet_endpoint_shows_the_admin_terms(self):
        self._cfg(wallet_topup_enabled=True, wallet_max_topup=Decimal("2000"))
        t = self.c.get("/api/wallet/").data["data"]["topup"]
        self.assertEqual((t["enabled"], t["max_topup"], t["max_balance"]), (True, "2000.00", None))
