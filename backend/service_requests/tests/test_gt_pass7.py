"""GT Pass 7: a guest booking is never silently attached to a registered account by phone/e-mail match."""
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

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class GuestAccountIsolationTests(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:8]
        self.reg = User.objects.create_user(username=f"reg_{uid}", email=f"reg_{uid}@example.com", password="x", role="customer", phone="9811100001")
        self.other = User.objects.create_user(username=f"oth_{uid}", email=f"oth_{uid}@example.com", password="x", role="customer", phone="9811100002")
        self.tier = ServiceTier.objects.create(category=LogisticsCategory.TRUCK, city="hosur", slug=f"g7-{uid}", name="G7 Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK, starting_price=Decimal("450"), base_fare=Decimal("300"), per_km_rate=Decimal("22"),
            free_km=Decimal("2"), minimum_fare=Decimal("350"), max_weight_kg=Decimal("750"), max_cft=Decimal("150"), is_active=True)
        self.guest = APIClient()

    def _book(self, client, phone, email):
        payload = {
            "customer_name": "Guest Person", "phone": phone, "email": email, "service_category": "goods_transport_truck", "issue_title": "t",
            "description": "Moving standard office stationery boxes and monitors, approx 150kg total weight",
            "logistics_tier": self.tier.id, "latitude": 12.7409, "longitude": 77.8253, "address": "Pickup, Hosur",
            "drop_latitude": 12.7546, "drop_longitude": 77.8345, "drop_address": "Drop, Hosur",
            "preferred_date": str(timezone.localdate()), "preferred_time": "Immediate",
            "total_amount": "190.00", "payment_method": "COD",
            "cart_data": [{"tier": "T", "price": "190.00"}],
        }
        with patch("settings_hub.service_zone_engine.check_booking_eligibility") as z:
            z.return_value.allowed = True; z.return_value.zone_id = 1; z.return_value.zone_name = "Hosur"
            with patch("service_requests.views.resolve_logistics_fare_v2") as f:
                f.return_value = (Decimal("190.00"), {"total": Decimal("190.00"), "distance_km": 3})
                return client.post("/api/booking/", data=payload, format="json")

    def _sr(self, resp):
        self.assertEqual(resp.status_code, 201, getattr(resp, "data", None))
        d = resp.json().get("data") or resp.json()
        rid = d.get("request_id") or d.get("id")
        return ServiceRequest.objects.filter(request_id=rid).first() or ServiceRequest.objects.get(pk=rid)

    def test_guest_phone_matching_a_registered_user_is_not_attached(self):
        sr = self._sr(self._book(self.guest, self.reg.phone, "brandnew@example.com"))
        self.assertIsNone(sr.customer_id)
        self.assertNotEqual(sr.customer_code, getattr(self.reg, "customer_id", "~none~") or "~none~")

    def test_guest_email_matching_a_registered_user_is_not_attached(self):
        sr = self._sr(self._book(self.guest, "9811199999", self.reg.email.upper()))
        self.assertIsNone(sr.customer_id)

    def test_guest_cannot_tell_whether_the_phone_or_email_is_registered(self):
        known = self._book(self.guest, self.reg.phone, self.reg.email)
        unknown = self._book(self.guest, "9811177777", "nobody@example.com")
        self.assertEqual(known.status_code, unknown.status_code)
        kd, ud = known.json(), unknown.json()
        kd = kd.get("data", kd); ud = ud.get("data", ud)
        self.assertEqual(set(kd.keys()), set(ud.keys()))
        blob = known.content.decode()
        for secret in (self.reg.username, str(self.reg.pk) if False else self.reg.username, getattr(self.reg, "customer_id", None) or self.reg.username):
            self.assertNotIn(secret, blob)

    def test_registered_account_gains_no_booking_and_no_data_from_a_guest_booking(self):
        before = ServiceRequest.objects.filter(customer=self.reg).count()
        self._book(self.guest, self.reg.phone, self.reg.email)
        self.assertEqual(ServiceRequest.objects.filter(customer=self.reg).count(), before)
        c = APIClient(); c.force_authenticate(self.reg)
        r = c.get("/api/customer/bookings/")
        self.assertNotIn("Guest Person", r.content.decode())

    def test_authenticated_user_still_books_into_their_own_account_and_sees_it(self):
        c = APIClient(); c.force_authenticate(self.reg)
        sr = self._sr(self._book(c, self.reg.phone, self.reg.email))
        self.assertEqual(sr.customer_id, self.reg.pk)
        self.assertEqual(c.get(f"/api/customer/bookings/{sr.pk}/tracking/").status_code, 200)

    def test_guest_reaches_own_booking_via_token_and_nobody_else_does(self):
        sr = self._sr(self._book(self.guest, self.reg.phone, self.reg.email))
        self.assertEqual(self.guest.get(f"/api/tracking/{sr.tracking_token}/").status_code, 200)
        self.assertNotEqual(self.guest.get(f"/api/tracking/{uuid.uuid4()}/").status_code, 200)
        o = APIClient(); o.force_authenticate(self.other)
        self.assertIn(o.get(f"/api/customer/bookings/{sr.pk}/tracking/").status_code, (403, 404))
        self.assertIn(o.post("/api/payment/initiate/", {"booking_id": sr.pk}, format="json").status_code, (403, 404))
        r = APIClient(); r.force_authenticate(self.reg)
        self.assertIn(r.get(f"/api/customer/bookings/{sr.pk}/tracking/").status_code, (403, 404))
