"""GT Pass 6 product decisions: public tracking OTP, on-demand spot, guest authorization, quote binding."""
import datetime
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import ServiceRequest
from service_requests.tracking_privacy import public_tracking_safe, mask_phone

User = get_user_model()


def _booking(customer, **kw):
    defaults = dict(
        customer=customer, customer_name="Pass6", phone="9876543210", email="p6@example.com", service_category="goods_transport_truck",
        issue_title="t", address="a", latitude=Decimal("12.7409"), longitude=Decimal("77.8253"), preferred_date=timezone.localdate(),
        preferred_time="Immediate", status=ServiceRequest.Status.ACCEPTED, technician_name="Driver One", technician_phone="9840123456",
        start_otp="482913", tracking_token=uuid.uuid4(), drop_contact_phone="9123456789", drop_contact_name="Receiver",
        payment_method="COD", total_amount=Decimal("190.00"),
    )
    defaults.update(kw)
    return ServiceRequest.objects.create(**defaults)


@override_settings(SECURE_SSL_REDIRECT=False)
class PublicTrackingOtpTests(TestCase):
    def setUp(self):
        uid = uuid.uuid4().hex[:6]
        self.owner = User.objects.create_user(username=f"p6o_{uid}", email=f"p6o_{uid}@x.io", password="x", role="customer", phone="9876543210")
        self.sr = _booking(self.owner)

    def test_public_link_has_no_otp_and_masked_phones(self):
        r = APIClient().get(f"/api/tracking/{self.sr.tracking_token}/")
        self.assertEqual(r.status_code, 200)
        d = r.json()["data"]
        for k in ("start_otp", "delivery_otp", "payment_confirmation_otp"):
            self.assertIsNone(d.get(k), k)
        self.assertNotIn("482913", r.content.decode())
        self.assertNotIn("9876543210", r.content.decode())
        self.assertNotIn("9123456789", r.content.decode())
        self.assertTrue(str(d.get("phone", "")).endswith("3210") and "*" in d["phone"])

    def test_token_only_live_location_has_no_otp_but_owner_keeps_it(self):
        url = f"/api/booking/{self.sr.request_id}/live-location/"
        r = APIClient().get(url + f"?token={self.sr.tracking_token}")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["data"].get("start_otp"))
        self.assertNotIn("482913", r.content.decode())
        c = APIClient(); c.force_authenticate(self.owner)
        ro = c.get(url)
        self.assertEqual(ro.status_code, 200)
        self.assertEqual(ro.json()["data"].get("start_otp"), "482913")   # authorised completion path unchanged

    def test_otp_is_still_stored_internally(self):
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.start_otp, "482913")

    def test_sanitizer_is_recursive_and_idempotent(self):
        p = {"start_otp": "1", "a": {"payment_otp": "2", "drop_contact_phone": "9123456789", "list": [{"delivery_otp": "3", "phone": "9876543210"}]}, "technician_phone": "9840123456"}
        s = public_tracking_safe(p)
        self.assertIsNone(s["start_otp"]); self.assertIsNone(s["a"]["payment_otp"]); self.assertIsNone(s["a"]["list"][0]["delivery_otp"])
        self.assertEqual(s["a"]["drop_contact_phone"], "******6789"); self.assertEqual(s["a"]["list"][0]["phone"], "******3210")
        self.assertEqual(s["technician_phone"], "9840123456")           # driver phone stays (customer needs to call the driver)
        self.assertEqual(public_tracking_safe(s), s)
        self.assertEqual(mask_phone(""), "")

    def test_websocket_broadcast_payload_is_sanitised(self):
        import inspect
        from service_requests import notifications
        self.assertIn("public_tracking_safe", inspect.getsource(notifications.broadcast_tracking_event))


class OnDemandSpotTests(TestCase):
    def test_immediate_spot_must_be_today_scheduled_uses_slots(self):
        from service_requests.booking_window import immediate_date_error as f
        today = timezone.localdate(); future = today + datetime.timedelta(days=45)
        self.assertIsNotNone(f("goods_transport_truck", future, "Immediate / Next Available", "spot"))
        self.assertIsNotNone(f("goods_transport_two_wheeler", future, "immediate", "spot"))
        self.assertIsNone(f("goods_transport_truck", today, "Immediate / Next Available", "spot"))
        self.assertIsNone(f("goods_transport_truck", future, "09:00 AM - 10:00 AM", "spot"))   # scheduled: admin LogisticsSlot rules apply
        self.assertIsNone(f("goods_transport_truck", future, "Immediate", "ptl"))              # PTL stays advance-bookable
        self.assertIsNone(f("packers_movers", future, "Immediate", "spot"))                     # P&M stays scheduled
        # no universal horizon is invented
        self.assertIsNone(f("goods_transport_truck", today + datetime.timedelta(days=3650), "09:00 AM - 10:00 AM", "spot"))


@override_settings(SECURE_SSL_REDIRECT=False)
class GuestBookingAuthorizationTests(TestCase):
    def setUp(self):
        uid = uuid.uuid4().hex[:6]
        self.owner = User.objects.create_user(username=f"p6g_{uid}", email=f"p6g_{uid}@x.io", password="x", role="customer", phone="9000000001")
        self.other = User.objects.create_user(username=f"p6h_{uid}", email=f"p6h_{uid}@x.io", password="x", role="customer", phone="9000000002")
        self.sr = _booking(self.owner, payment_method="ONLINE", payment_status="pending")
        self.anon = APIClient()
        self.o2 = APIClient(); self.o2.force_authenticate(self.other)

    def test_anonymous_cannot_read_modify_pay_or_refund(self):
        rid, pk = self.sr.request_id, self.sr.pk
        for method, url, body in [
            ("get", f"/api/customer/bookings/{pk}/tracking/", None),
            ("get", f"/api/booking/{pk}/", None),
            ("get", f"/api/booking/{rid}/", None),
            ("post", f"/api/booking/{pk}/cancel/", {"reason": "x"}),
            ("post", "/api/payment/initiate/", {"booking_id": pk}),
            ("post", "/api/payment/verify/", {"booking_id": pk, "order_id": "o", "payment_id": "p", "signature": "s"}),
            ("post", "/api/customer/refunds/create/", {"booking_id": pk, "amount": "10", "reason": "x", "refund_type": "FULL"}),
        ]:
            r = getattr(self.anon, method)(url, data=body, format="json") if body is not None else getattr(self.anon, method)(url)
            self.assertIn(r.status_code, (401, 403, 404), (url, r.status_code))

    def test_other_customer_cannot_touch_it_either(self):
        pk = self.sr.pk
        self.assertIn(self.o2.get(f"/api/customer/bookings/{pk}/tracking/").status_code, (403, 404))
        self.assertIn(self.o2.post(f"/api/booking/{pk}/cancel/", {"reason": "x"}, format="json").status_code, (403, 404))
        self.assertIn(self.o2.post("/api/payment/initiate/", {"booking_id": pk}, format="json").status_code, (403, 404))
        self.sr.refresh_from_db(); self.assertNotEqual(self.sr.status, ServiceRequest.Status.CANCELLED)

    def test_tracking_token_does_not_grant_cancel_pay_or_refund(self):
        tok = str(self.sr.tracking_token); pk = self.sr.pk
        self.assertIn(self.anon.post("/api/payment/initiate/", {"booking_id": pk}, format="json").status_code, (401, 403))
        self.assertIn(self.anon.post("/api/customer/refunds/create/", {"booking_id": pk, "amount": "1", "reason": "x", "refund_type": "FULL"}, format="json").status_code, (401, 403))
        d = self.anon.get(f"/api/tracking/{tok}/").json()["data"]
        self.assertNotIn("email", {k for k, v in d.items() if v == "p6@example.com"})   # no customer e-mail on the link


@override_settings(SECURE_SSL_REDIRECT=False)
class QuoteBindingTests(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:8]
        self.tier = ServiceTier.objects.create(category=LogisticsCategory.TRUCK, city="hosur", slug=f"qb-{uid}", name="QB Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK, starting_price=Decimal("450"), base_fare=Decimal("300"), per_km_rate=Decimal("22"),
            free_km=Decimal("2"), minimum_fare=Decimal("350"), max_weight_kg=Decimal("750"), max_cft=Decimal("150"), is_active=True)

    def _quote(self, **kw):
        from service_requests.services.logistics_pricing import quote_logistics_fare
        return quote_logistics_fare(tier=self.tier, pickup_lat=12.7409, pickup_lng=77.8253, drop_lat=12.7546, drop_lng=77.8345,
                                    service_category="goods_transport_truck", **kw)

    def _resolve(self, qd, **kw):
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2
        return resolve_logistics_fare_v2(
            service_category="goods_transport_truck", logistics_tier=self.tier, logistics_lane=None, submitted_amount=qd["total"],
            pickup_lat=12.7409, pickup_lng=77.8253, drop_lat=12.7546, drop_lng=77.8345,
            cart_data=[{"quote_id": qd["quote_id"], "quote_hash": qd["quote_hash"], "expires_at": qd["expires_at"], "price": qd["total"]}], **kw)

    def test_plain_quote_has_no_customer_data_and_stays_shareable(self):
        qd = self._quote()
        cached = cache.get(f"gt_quote_{qd['quote_id']}")
        self.assertNotIn("bound_gstin_hash", cached)
        for k in ("phone", "email", "customer", "gstin", "user"):
            self.assertFalse([c for c in cached if k in c.lower() and c != "bound_user_id"], k)
        self._resolve(qd, requester_user_id=1); self._resolve(qd, requester_user_id=2); self._resolve(qd)      # any customer, even a guest

    def test_gstin_quote_is_bound_and_gstin_is_not_stored(self):
        qd = self._quote(customer_gstin="29ABCDE1234F1Z5", requester_user_id=7)
        cached = cache.get(f"gt_quote_{qd['quote_id']}")
        self.assertIn("bound_gstin_hash", cached); self.assertNotIn("29ABCDE1234F1Z5", str(cached))
        self._resolve(qd, customer_gstin="29ABCDE1234F1Z5", requester_user_id=7)                                # owner: fine
        from service_requests.services.logistics_pricing import UnresolvedLogisticsFareError
        for kw in (dict(customer_gstin="29ABCDE1234F1Z5", requester_user_id=8), dict(customer_gstin="", requester_user_id=7),
                   dict(customer_gstin="27AAAAA0000A1Z5", requester_user_id=7), dict(customer_gstin="29ABCDE1234F1Z5")):
            with self.assertRaises(UnresolvedLogisticsFareError, msg=str(kw)):
                self._resolve(qd, **kw)

    def test_existing_protections_still_apply(self):
        from service_requests.services.logistics_pricing import UnresolvedLogisticsFareError
        qd = self._quote()
        bad = dict(qd); bad["quote_hash"] = "0" * 16
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._resolve(bad)
        expired = dict(qd); expired["expires_at"] = (timezone.now() - datetime.timedelta(minutes=1)).isoformat()
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._resolve(expired)
