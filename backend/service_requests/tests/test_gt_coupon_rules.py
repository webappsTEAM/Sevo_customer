"""GT coupons: Admin-set coupon rules are enforced at quote-apply time and booking time."""
import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from service_requests.models import Coupon, CouponCategory, CouponUsage, ServiceRequest
from service_requests.services.coupon_rules import check_logistics_coupon

TRUCK = "goods_transport_truck"


def _user():
    n = uuid.uuid4().hex[:8]
    return get_user_model().objects.create_user(
        username=f"cp_{n}", email=f"cp_{n}@e.com", password="pw12345678",
        phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")


def _coupon(**kw):
    d = dict(code=f"C{uuid.uuid4().hex[:6].upper()}", name="t", discount_type="flat", discount_value=Decimal("50"))
    d.update(kw)
    return Coupon.objects.create(**d)


class CouponRuleTests(TestCase):
    def setUp(self):
        self.u = _user()

    def chk(self, c, amount=500, cat=TRUCK):
        return check_logistics_coupon(c, user=self.u, amount=amount, service_category=cat)

    def test_valid(self):
        self.assertTrue(self.chk(_coupon())[0])

    def test_unknown_or_inactive(self):
        self.assertEqual(self.chk(None)[1], "INVALID_COUPON")
        self.assertEqual(self.chk(_coupon(status="Paused"))[1], "INVALID_COUPON")

    def test_dates(self):
        self.assertEqual(self.chk(_coupon(start_date=date.today() + timedelta(days=1)))[1], "COUPON_NOT_STARTED")
        self.assertEqual(self.chk(_coupon(end_date=date.today() - timedelta(days=1)))[1], "COUPON_EXPIRED")

    def test_usage_limits(self):
        self.assertEqual(self.chk(_coupon(total_usage_limit=5, current_usage=5))[1], "COUPON_EXHAUSTED")
        c = _coupon(usage_per_customer=1)
        CouponUsage.objects.create(coupon=c, customer=self.u, discount_amount=1, order_amount=1, final_amount=1)
        self.assertEqual(self.chk(c)[1], "COUPON_ALREADY_USED")

    def test_min_booking(self):
        self.assertEqual(self.chk(_coupon(min_booking=Decimal("600")), 500)[1], "MIN_BOOKING_NOT_MET")
        self.assertTrue(self.chk(_coupon(min_booking=Decimal("500")), 500)[0])

    def test_service_eligibility(self):
        restricted = _coupon(service_eligibility="Selected Category")
        self.assertEqual(self.chk(restricted)[1], "COUPON_NOT_APPLICABLE")
        CouponCategory.objects.create(coupon=restricted, category_id=TRUCK)
        self.assertTrue(self.chk(restricted)[0])
        self.assertEqual(self.chk(restricted, cat="goods_transport_two_wheeler")[1], "COUPON_NOT_APPLICABLE")


class CouponApplyEndpointTests(TestCase):
    def test_apply_endpoint_enforces_rules_for_gt_only(self):
        u = _user()
        client = APIClient(); client.force_authenticate(u)
        c = _coupon(end_date=date.today() - timedelta(days=1))
        r = client.post("/api/coupons/apply/", {"code": c.code, "cart_total": 500, "service_category": TRUCK}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"]["code"], "COUPON_EXPIRED")
        ok = _coupon()
        r = client.post("/api/coupons/apply/", {"code": ok.code, "cart_total": 500, "service_category": TRUCK}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["data"]["discountAmount"], 50.0)


class CouponBookingEndToEndTests(TestCase):
    PICKUP = {"lat": "12.740900", "lng": "77.825300"}
    DROP = {"lat": "12.935200", "lng": "77.624500"}

    def setUp(self):
        from logistics.models import LogisticsCategory, ServiceTier
        uid = uuid.uuid4().hex[:8]
        self.user = _user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"ace-cp-{uid}", name="Tata Ace",
            starting_price=Decimal("400"), base_fare=Decimal("250"), per_km_rate=Decimal("18"),
            free_km=Decimal("2"), loading_unloading_charge=Decimal("100"), vehicle_class="truck",
            additional_stop_charge=Decimal("50"), minimum_fare=Decimal("200"))

    def _book(self, code):
        from unittest.mock import patch
        route = {"distance_km": 12.0, "duration_seconds": 1800, "source": "google_maps"}
        with patch("service_requests.services.routing.get_route_eta", return_value=route):
            return self.client.post("/api/booking/", {
                "customer_name": "E2E Customer", "phone": self.user.phone, "email": self.user.email,
                "service_category": TRUCK, "issue_title": "Mini truck", "description": "sofa and boxes",
                "address": "Pickup, Hosur", "latitude": self.PICKUP["lat"], "longitude": self.PICKUP["lng"],
                "drop_address": "Drop, Bengaluru", "drop_latitude": self.DROP["lat"], "drop_longitude": self.DROP["lng"],
                "preferred_date": str(date.today()), "total_amount": "1.00", "payment_method": "COD",
                "logistics_tier": self.tier.id, "coupon_code": code,
            }, format="json")

    def test_bad_coupon_refused_and_good_coupon_applied_once(self):
        expired = _coupon(end_date=date.today() - timedelta(days=1))
        r = self._book(expired.code)
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(ServiceRequest.objects.filter(service_category=TRUCK).count(), 0)

        good = _coupon(usage_per_customer=1)
        r = self._book(good.code)
        self.assertIn(r.status_code, (200, 201), r.content)
        sr = ServiceRequest.objects.get(service_category=TRUCK)
        self.assertEqual(sr.total_amount, Decimal("480.00"))          # 530 fare - Rs.50 coupon
        good.refresh_from_db()
        self.assertEqual(good.current_usage, 1)
        self.assertEqual(CouponUsage.objects.filter(coupon=good, booking=sr).count(), 1)

        r = self._book(good.code)                                     # per-customer limit of 1
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(ServiceRequest.objects.filter(service_category=TRUCK).count(), 1)
