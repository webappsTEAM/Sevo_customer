"""Regression (E2E QA 2026-10-01): the customer tracking payload never returned the cash-payment
confirmation OTP on PostgreSQL. The lookup used a raw SAVEPOINT, which PostgreSQL refuses outside a
transaction block (ATOMIC_REQUESTS is off), and the surrounding `except` swallowed the error.

TransactionTestCase = autocommit, i.e. how the view really runs. (On SQLite a bare SAVEPOINT is legal,
so this test only fails against the old code on PostgreSQL; it still pins the behaviour everywhere.)"""
import uuid
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone

from service_requests.models import ServiceRequest
from service_requests.views import _latest_delivery_otp, _latest_payment_confirmation_otp


class PaymentOtpLookupAutocommitTests(TransactionTestCase):
    def setUp(self):
        self._created_table = "workforce_notification" not in connection.introspection.table_names()
        if self._created_table:
            with connection.cursor() as c:
                c.execute(
                    "CREATE TABLE workforce_notification (id integer PRIMARY KEY, related_object_id varchar(64), "
                    "notification_type varchar(64), message text, created_at timestamp)")
        uid = uuid.uuid4().hex[:8]
        user = get_user_model().objects.create_user(
            username=f"po_{uid}", email=f"po_{uid}@example.com", phone=f"93{uuid.uuid4().int % 100000000:08d}", role="customer")
        self.sr = ServiceRequest.objects.create(
            customer=user, customer_name="T", phone=user.phone, service_category="goods_transport_truck",
            issue_title="Move", address="A", latitude=Decimal("12.74"), longitude=Decimal("77.82"),
            preferred_date=timezone.localdate(), status="proof_submitted", payment_status="cash_pending",
            total_amount=Decimal("190.00"), logistics_leg="DELIVERED")

    def tearDown(self):
        if self._created_table:
            with connection.cursor() as c:
                c.execute("DROP TABLE workforce_notification")

    def _notify(self, nid, ntype, message):
        with connection.cursor() as c:
            c.execute("INSERT INTO workforce_notification (id, related_object_id, notification_type, message, created_at) "
                      "VALUES (%s, %s, %s, %s, %s)", [nid, str(self.sr.id), ntype, message, timezone.now()])

    def test_payment_otp_found_outside_a_transaction(self):
        self.assertFalse(connection.in_atomic_block)
        self._notify(1, "PAYMENT_CONFIRMATION_OTP", "Technician reported cash collection of Rs.190. Share OTP 713402 with technician.")
        self.assertEqual(_latest_payment_confirmation_otp(self.sr), "713402")

    def test_latest_payment_otp_wins_and_other_types_ignored(self):
        self._notify(1, "PAYMENT_CONFIRMATION_OTP", "Share OTP 111111 with technician")
        self._notify(2, "PAYMENT_CONFIRMATION_OTP", "Share OTP 222222 with technician")
        self._notify(3, "DELIVERY_OTP", "Share delivery OTP 333333 with the driver")
        self.assertEqual(_latest_payment_confirmation_otp(self.sr), "222222")

    def test_missing_table_is_none_not_an_error(self):
        with connection.cursor() as c:
            c.execute("DROP TABLE workforce_notification")
        self._created_table = False
        self.assertIsNone(_latest_payment_confirmation_otp(self.sr))
        self.assertIsNone(_latest_delivery_otp(self.sr))


class TrackingPayloadWithoutTripStopsTests(PaymentOtpLookupAutocommitTests):
    """Regression (E2E QA 2026-10-01): _build_tracking_payload raised UnboundLocalError
    (dest_stop_seq) -> HTTP 500 for every booking that has no TripStop rows, i.e. a normal
    single pickup/drop GT booking."""

    def test_tracking_payload_builds_for_single_drop_booking(self):
        from service_requests.views import _build_tracking_payload
        self.sr.drop_latitude, self.sr.drop_longitude = Decimal("12.7546"), Decimal("77.8345")
        self.sr.save()
        for leg in ("EN_ROUTE_PICKUP", "UNLOADING", "DELIVERED"):
            ServiceRequest.objects.filter(pk=self.sr.pk).update(logistics_leg=leg)
            self.sr.refresh_from_db()
            payload = _build_tracking_payload(self.sr, has_full_access=True)
            self.assertIsNone(payload["destination"]["stop_sequence"])
            self.assertEqual(payload["destination"]["stop_type"], "")
