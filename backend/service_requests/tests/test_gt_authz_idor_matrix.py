"""Forensic QA matrix: customer B and anonymous callers against customer A's GT booking.
Every endpoint must refuse (401/403/404/400/405) -- never 200 and never 5xx."""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import ServiceRequest

User = get_user_model()

GET_PATHS = [
    "/api/booking/{pk}/", "/api/booking/{pk}/invoice/", "/api/booking/{pk}/live-location/",
    "/api/customer/bookings/{pk}/tracking/", "/api/booking/{pk}/cancel-preview/",
    "/api/booking/{pk}/estimation/", "/api/booking/{pk}/inspection/", "/api/booking/{pk}/quotation/",
    "/api/booking/{pk}/stops/", "/api/booking/{pk}/messages/", "/api/booking/{pk}/ptl-requote/",
    "/api/booking/{rid}/", "/api/booking/{rid}/live-location/",
    "/api/customer/refunds/bookings/{pk}/summary/",
]
POST_PATHS = [
    "/api/booking/{pk}/cancel/", "/api/booking/{pk}/retry-payment/", "/api/booking/{pk}/verify-start-otp/",
    "/api/booking/{pk}/change-drop/", "/api/booking/{pk}/ptl-requote/", "/api/booking/{pk}/messages/",
    "/api/booking/{pk}/stops/", "/api/booking/{pk}/quotation/approve/", "/api/booking/{pk}/quotation/reject/",
    "/api/customer/bookings/{pk}/cancel/", "/api/booking/{rid}/cancel/",
]


class GTAuthzIdorMatrixTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="idor_a", email="a@example.com", password="pw123456!",
                                          role=getattr(User.Role, "CUSTOMER", "customer"))
        self.b = User.objects.create_user(username="idor_b", email="b@example.com", password="pw123456!",
                                          role=getattr(User.Role, "CUSTOMER", "customer"))
        self.sr = ServiceRequest.objects.create(
            customer=self.a, email="a@example.com", phone="9876500001", status=ServiceRequest.Status.ACCEPTED,
            service_category="goods_transport_truck", preferred_date=timezone.localdate(),
            total_amount=Decimal("530.00"))
        self.pk, self.rid = self.sr.pk, self.sr.request_id

    def _client(self, user):
        c = APIClient(raise_request_exception=False)
        if user:
            c.force_authenticate(user=user)
        return c

    def _fmt(self, p):
        return p.format(pk=self.pk, rid=self.rid)

    def _check(self, user, label):
        c = self._client(user)
        bad = []
        for p in GET_PATHS:
            r = c.get(self._fmt(p))
            if r.status_code == 200 or r.status_code >= 500:
                bad.append(("GET", self._fmt(p), r.status_code))
        for p in POST_PATHS:
            r = c.post(self._fmt(p), data={}, format="json")
            if r.status_code in (200, 201, 202) or r.status_code >= 500:
                bad.append(("POST", self._fmt(p), r.status_code))
        self.assertEqual(bad, [], f"{label}: leaked/errored -> {bad}")

    def test_other_customer_cannot_read_or_mutate(self):
        self._check(self.b, "customer B")

    def test_anonymous_cannot_read_or_mutate(self):
        self._check(None, "anonymous")

    def test_owner_sanity_detail_is_200(self):
        self.assertEqual(self._client(self.a).get(self._fmt("/api/booking/{pk}/")).status_code, 200)
