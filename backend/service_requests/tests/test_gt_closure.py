"""GT closure pass: duplicate-payment refund queue, public-tracking phone masking, no superuser bypass of terminal states."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from accounts.models import User
from companies.models import Company
from service_requests.models import Payment, RefundRequest, ServiceRequest
from service_requests.state_machine import apply_transition


def _mk(user, co, rid, status, pay_status, **kw):
    return ServiceRequest.objects.create(
        request_id=rid, company=co, customer=user, customer_name="Ravi Kumar", phone="9876543210", email="gc@example.com",
        service_category="goods_transport_truck", issue_title="x", status=status, payment_method=ServiceRequest.PaymentMethod.ONLINE,
        payment_status=pay_status, total_amount=Decimal("190.00"), preferred_date=timezone.now().date(), preferred_time="09:00 AM",
        tracking_token=uuid.uuid4(), start_otp="123456", **kw)


class DuplicatePaymentRefundTests(TestCase):
    def setUp(self):
        self.co = Company.objects.create(company_name="GC Co", display_id="COMP-GC-1")
        self.user = User.objects.create_user(username="gc_cust", email="gc@example.com", phone="9876543210", role="customer")
        self.sr = _mk(self.user, self.co, "GT-GC-001", ServiceRequest.Status.CONFIRMED, ServiceRequest.PaymentStatus.PAID,
                      transaction_id="pay_original", payment_gateway="sandbox")
        Payment.objects.create(service_request=self.sr, customer=self.user, amount=Decimal("190.00"), status=ServiceRequest.PaymentStatus.PAID,
                               gateway="sandbox", razorpay_payment_id="pay_original", provider_order_id="order_1")
        self.dup = Payment.objects.create(service_request=self.sr, customer=self.user, amount=Decimal("190.00"), status=ServiceRequest.PaymentStatus.PENDING,
                                          gateway="sandbox", provider_order_id="order_dup", razorpay_order_id="order_dup")
        self.client = APIClient(); self.client.force_authenticate(self.user)

    @override_settings(PAYMENT_SANDBOX_MODE=True)
    def test_duplicate_payment_queues_exactly_one_refund(self):
        body = {"booking_id": self.sr.pk, "order_id": "order_dup", "payment_id": "pay_dup1"}
        r = self.client.post("/api/payment/verify/", body, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(self.dup.__class__.objects.get(pk=self.dup.pk).error_code, "duplicate_payment_refund_required")
        refunds = RefundRequest.objects.filter(booking=self.sr)
        self.assertEqual(refunds.count(), 1)
        self.assertEqual(refunds.first().requested_amount, Decimal("190.00"))
        # replay is idempotent: no second refund
        r2 = self.client.post("/api/payment/verify/", body, format="json")
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(RefundRequest.objects.filter(booking=self.sr).count(), 1)
        # booking keeps its original transaction
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.transaction_id, "pay_original")


class PublicTrackingMaskTests(TestCase):
    def test_token_view_masks_customer_and_receiver_phone(self):
        co = Company.objects.create(company_name="GT Co", display_id="COMP-GT-9")
        user = User.objects.create_user(username="gt_trk", email="gt@example.com", phone="9876543299", role="customer")
        sr = _mk(user, co, "GT-TRK-001", ServiceRequest.Status.CONFIRMED, ServiceRequest.PaymentStatus.PAID, drop_contact_phone="9123456780")
        with patch("service_requests.views.WorkforceIntegrationService.get_technician_tracking", return_value=None):
            r = APIClient().get(f"/api/tracking/{sr.tracking_token}/")
        self.assertEqual(r.status_code, 200, r.content)
        raw = r.content.decode()
        self.assertNotIn("9876543210", raw); self.assertNotIn("9123456780", raw)
        data = r.json().get("data", r.json())
        self.assertTrue(data["phone"].endswith("3210") and set(data["phone"][:-4]) <= {"*"})
        self.assertTrue(data["drop_contact_phone"].endswith("6780"))


class NoSuperuserBypassTests(TestCase):
    def test_terminal_states_have_no_exit_even_for_superuser(self):
        co = Company.objects.create(company_name="SU Co", display_id="COMP-SU-1")
        su = User.objects.create_superuser(username="su1", email="su1@example.com", password="x" * 12, phone="9000000001")
        for i, (st, to) in enumerate([(ServiceRequest.Status.COMPLETED, ServiceRequest.Status.IN_PROGRESS),
                                      (ServiceRequest.Status.CANCELLED, ServiceRequest.Status.CONFIRMED)]):
            sr = _mk(su, co, f"GT-SU-{i}", st, ServiceRequest.PaymentStatus.PAID)
            with self.assertRaises(ValidationError):
                apply_transition(sr, to, actor=su)


class CargoBoolQuantityTests(TestCase):
    def test_boolean_quantity_is_rejected_not_booked_as_one(self):
        from logistics.models import GoodsCategory, GoodsItem
        from service_requests.services.cargo_fitment import CargoValidationError, resolve_cargo_payload
        cat = GoodsCategory.objects.create(name="CB", slug="cb-cat", allows_two_wheeler=True, min_vehicle_class="any", is_active=True, is_prohibited=False)
        GoodsItem.objects.create(category=cat, name="Box", slug="cb-box", default_weight_kg=Decimal("5"), default_cft=Decimal("1"), is_active=True)
        for bad in (True, False):
            with self.assertRaises(CargoValidationError):
                resolve_cargo_payload(cargo_items=[{"item_slug": "cb-box", "quantity": bad}], strict=True)


class AdminInvalidConfigTests(TestCase):
    def _bad(self, data, field, package=None):
        from service_requests.services.catalog import _assert_gt_money_valid
        from django.core.exceptions import ValidationError as DjangoVE
        with self.assertRaises(DjangoVE) as c:
            _assert_gt_money_valid(data, package)
        self.assertIn(field, c.exception.message_dict)

    def test_rejected_values(self):
        for data, field in [({"gt_base_fare": "-1"}, "gt_base_fare"), ({"gt_surge_multiplier": "0"}, "gt_surge_multiplier"),
                            ({"gt_surge_multiplier": "-2"}, "gt_surge_multiplier"), ({"gt_surge_multiplier": "1000"}, "gt_surge_multiplier"),
                            ({"gt_gst_rate": "-18"}, "gt_gst_rate"), ({"gt_gst_rate": "150"}, "gt_gst_rate"),
                            ({"gt_free_km": "100000"}, "gt_free_km"), ({"gt_max_weight_kg": "0"}, "gt_max_weight_kg"),
                            ({"gt_per_km_rate": "Infinity"}, "gt_per_km_rate"), ({"gt_minimum_fare": "NaN"}, "gt_minimum_fare")]:
            self._bad(data, field)

    def test_all_zero_rate_card_rejected_including_partial_update(self):
        from types import SimpleNamespace
        pkg = SimpleNamespace(gt_base_fare=Decimal("100"), gt_per_km_rate=0, gt_minimum_fare=0, gt_loading_unloading_charge=0)
        self._bad({"gt_base_fare": "0", "gt_per_km_rate": "0", "gt_minimum_fare": "0", "gt_loading_unloading_charge": "0"}, "gt_base_fare", pkg)
        self._bad({"gt_base_fare": "0"}, "gt_base_fare", pkg)   # zeroing the last non-zero component

    def test_sane_values_accepted(self):
        from service_requests.services.catalog import _assert_gt_money_valid
        _assert_gt_money_valid({"gt_base_fare": "450", "gt_per_km_rate": "40", "gt_minimum_fare": "450", "gt_surge_multiplier": "1.25",
                                "gt_gst_rate": "18", "gt_free_km": "5", "gt_max_weight_kg": "1700"})
        _assert_gt_money_valid({"gt_per_km_rate": "0", "gt_base_fare": "0", "gt_minimum_fare": "99"})   # fixed minimum is a legitimate rate card
        _assert_gt_money_valid({"base_price": "100"})   # non-GT edits untouched


class ZeroFareGuardTests(TestCase):
    def test_zero_rate_tier_cannot_be_quoted(self):
        from logistics.models import LogisticsCategory, ServiceTier
        from service_requests.services.logistics_pricing import FareNotConfiguredError, quote_logistics_fare
        t = ServiceTier.objects.create(category=LogisticsCategory.TRUCK, city="hosur", slug="zero-fare-t", name="Zero", vehicle_class=ServiceTier.VehicleClass.TRUCK,
                                       starting_price=Decimal("0"), base_fare=Decimal("0"), per_km_rate=Decimal("0"), free_km=Decimal("0"),
                                       loading_unloading_charge=Decimal("0"), additional_stop_charge=Decimal("0"), minimum_fare=Decimal("0"),
                                       max_weight_kg=Decimal("500"), max_cft=Decimal("100"), is_active=True)
        with self.assertRaises(FareNotConfiguredError):
            quote_logistics_fare(tier=t, pickup_lat=Decimal("12.7409"), pickup_lng=Decimal("77.8253"), drop_lat=Decimal("12.754598"),
                                 drop_lng=Decimal("77.834477"), service_category="goods_transport_truck")


class AdminRangeApiTests(TestCase):
    """GT_ADMIN_RANGE / GT_LANE_RANGE: out-of-range admin input is a 400 field error, never a 500."""
    def setUp(self):
        n = uuid.uuid4().hex[:8]
        self.admin = User.objects.create_user(username=f"ar_{n}", email=f"ar_{n}@e.com", password="pw12345678", phone=f"97{uuid.uuid4().int % 100000000:08d}", role="admin")
        self.c = APIClient(); self.c.force_authenticate(self.admin)

    def test_policy_overflow_is_400(self):
        P = "/api/logistics/admin/policies/"
        for kind, body in [("ptl", {"is_enabled": True, "rate_per_kg": "99999999999999", "min_advance_days": 1}),
                           ("ptl", {"rate_per_kg": "4", "min_advance_days": 10 ** 12}),
                           ("waiting", {"is_enabled": True, "rate_per_minute": "9" * 20, "free_minutes_per_stop": 5}),
                           ("waiting", {"is_enabled": True, "rate_per_minute": "2", "free_minutes_per_stop": 10 ** 12})]:
            r = self.c.post(f"{P}{kind}/", {**body, "is_active": False}, format="json")
            self.assertEqual(r.status_code, 400, (kind, body, r.content[:200]))

    def test_lane_overflow_and_bad_coordinates_are_400(self):
        L = "/api/logistics/admin/lanes/"
        base = {"destination_label": "Range Test", "category": "truck", "is_active": False, "destination_latitude": 12.7, "destination_longitude": 77.8}
        for extra in ({"fare": "9" * 20}, {"fare": "100", "ptl_rate_per_kg": "9" * 20}, {"fare": "100", "distance_km": "9" * 20},
                      {"fare": "100", "destination_latitude": 99}, {"fare": "100", "destination_longitude": 500}):
            r = self.c.post(L, {**base, **extra}, format="json")
            self.assertEqual(r.status_code, 400, (extra, r.content[:200]))


class ConcurrentPaymentVerifyTests(TransactionTestCase):
    """GT_PAYMENT_LOCK: two simultaneous verifications (two orders) of one booking: exactly one is the payment, the other a flagged duplicate."""
    def test_two_concurrent_verifications_one_wins_other_is_flagged_with_refund(self):
        import threading
        from django.db import connections
        co = Company.objects.create(company_name="CP Co", display_id="COMP-CP-1")
        user = User.objects.create_user(username="cp_cust", email="cp@example.com", phone="9876543288", role="customer")
        sr = _mk(user, co, "GT-CP-001", ServiceRequest.Status.WAITING_FOR_PAYMENT, ServiceRequest.PaymentStatus.PENDING)
        for oid in ("order_a", "order_b"):
            Payment.objects.create(service_request=sr, customer=user, amount=Decimal("190.00"), status=ServiceRequest.PaymentStatus.PENDING,
                                   gateway="sandbox", provider_order_id=oid, razorpay_order_id=oid)
        barrier = threading.Barrier(2); out = {}

        def run(oid):
            try:
                c = APIClient(); c.force_authenticate(user)
                barrier.wait(timeout=10)
                out[oid] = c.post("/api/payment/verify/", {"booking_id": sr.pk, "order_id": oid, "payment_id": f"pay_{oid}"}, format="json").status_code
            finally:
                connections.close_all()

        with override_settings(PAYMENT_SANDBOX_MODE=True), patch("service_requests.tasks.async_dispatch_service_request") as disp:
            ts = [threading.Thread(target=run, args=(o,)) for o in ("order_a", "order_b")]
            [t.start() for t in ts]; [t.join(30) for t in ts]
        self.assertEqual(sorted(out.values()), [200, 200], out)
        flagged = Payment.objects.filter(service_request=sr, error_code="duplicate_payment_refund_required").count()
        self.assertEqual(flagged, 1)
        self.assertEqual(RefundRequest.objects.filter(booking=sr).count(), 1)
        sr.refresh_from_db()
        self.assertEqual(sr.status, ServiceRequest.Status.CONFIRMED)
        self.assertEqual(disp.delay.call_count + disp.call_count, 1)
