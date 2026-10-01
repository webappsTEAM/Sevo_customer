"""
GT en-route destination change (Porter parity: "ask the driver to proceed to
the new location; we automatically calculate the new price").

The client sends a place; the server routes it and re-prices the distance
difference at the rate locked into the booking's quote.
"""
import uuid
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import FareReconciliation, ServiceRequest, TripStop
from service_requests.services.drop_change import DropChangeError, change_drop_location
from service_requests.services.fare_reconciliation import reconcile_booking_fare

User = get_user_model()

QUOTE = {
    "total": "530.00", "base_fare": "250.00", "distance_km": "12.00",
    "chargeable_km": "10.00", "distance_charge": "180.00",
    "loading_unloading": "100.00", "additional_stops": 0,
    "additional_stop_charge": "0.00", "rate_minimum_fare": "300.00",
    "currency": "INR",
}
ROUTE = "service_requests.services.routing.get_route_eta"
COVER = "service_requests.services._assert_route_stops_in_coverage"


def _leg(km):
    return mock.MagicMock(return_value={"distance_km": km, "duration_seconds": 600, "source": "google_maps"})


def _user(role="customer"):
    uid = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"dc_{uid}", email=f"dc_{uid}@example.com",
        phone=f"93{uuid.uuid4().int % 100000000:08d}", role=role,
    )


def _booking(customer, **extra):
    d = dict(
        customer=customer, customer_name="T", phone=customer.phone,
        service_category="goods_transport_truck", issue_title="Move",
        address="Pickup, Hosur", latitude=Decimal("12.740900"), longitude=Decimal("77.825300"),
        drop_address="Old drop, Hosur", drop_latitude=Decimal("12.800000"), drop_longitude=Decimal("77.850000"),
        preferred_date=timezone.localdate(), status=ServiceRequest.Status.ON_THE_WAY,
        total_amount=Decimal("530.00"), fare_breakdown=dict(QUOTE),
    )
    d.update(extra)
    return ServiceRequest.objects.create(**d)


@mock.patch(COVER, lambda *a, **k: None)
class DropChangeServiceTests(TestCase):
    def setUp(self):
        self.cust = _user()
        self.sr = _booking(self.cust)

    def test_longer_new_drop_reprices_at_locked_rate(self):
        with mock.patch(ROUTE, _leg(17.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="New drop",
                                       drop_lat="12.900000", drop_lng="77.900000")
        # 5 km more at 180/10 = 18/km -> +90
        self.assertEqual(out["new_fare"], "620.00")
        self.assertEqual(out["fare_adjustment"], "90.00")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.drop_address, "New drop")
        self.assertEqual(self.sr.drop_latitude, Decimal("12.900000"))
        self.assertEqual(self.sr.total_amount, Decimal("620.00"))
        fb = self.sr.fare_breakdown
        self.assertEqual(fb["distance_km"], "17.00")
        self.assertEqual(fb["chargeable_km"], "15.00")
        self.assertEqual(fb["distance_charge"], "270.00")
        self.assertEqual(len(fb["drop_changes"]), 1)
        self.assertEqual(fb["drop_changes"][0]["from_address"], "Old drop, Hosur")

    def test_rate_locked_even_if_tier_changes(self):
        # rate comes from stored quote only; no tier on this booking at all
        with mock.patch(ROUTE, _leg(14.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="X", drop_lat=12.8, drop_lng=77.8)
        self.assertEqual(out["rate_applied"], "18.00")
        self.assertEqual(out["new_fare"], "566.00")

    def test_shorter_drop_reduces_fare_but_respects_minimum(self):
        with mock.patch(ROUTE, _leg(1.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="Near", drop_lat=12.74, drop_lng=77.83)
        # 530 - 11*18 = 332 (> 300 min)
        self.assertEqual(out["new_fare"], "332.00")
        self.sr.fare_breakdown = dict(QUOTE, rate_minimum_fare="400.00")
        self.sr.save()
        with mock.patch(ROUTE, _leg(1.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="Near", drop_lat=12.74, drop_lng=77.83)
        self.assertTrue(out["minimum_fare_applied"])

    def test_insurance_premium_kept_in_payable(self):
        self.sr.insurance_opted_in = True
        self.sr.insurance_premium = Decimal("25.00")
        self.sr.save()
        with mock.patch(ROUTE, _leg(17.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
        self.assertEqual(out["new_payable"], "645.00")

    def test_other_customer_forbidden(self):
        with self.assertRaises(PermissionError):
            change_drop_location(self.sr, _user(), drop_address="N", drop_lat=12.9, drop_lng=77.9)

    def test_closed_trip_rejected(self):
        for st in ("completed", "cancelled"):
            self.sr.status = st
            self.sr.save()
            with self.assertRaises(DropChangeError) as cm:
                change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
            self.assertEqual(cm.exception.code, "TRIP_CLOSED")

    def test_drop_cannot_change_once_driver_reached_the_drop(self):
        # Found in E2E QA: change-drop was accepted while the driver was UNLOADING (fare 190 -> 345).
        for leg in ("ARRIVED_DROP", "UNLOADING", "DELIVERED"):
            self.sr.logistics_leg = leg
            self.sr.save()
            with self.assertRaises(DropChangeError) as cm:
                change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
            self.assertEqual(cm.exception.code, "DROP_ALREADY_REACHED")
            self.sr.refresh_from_db()
            self.assertEqual(self.sr.drop_address, "Old drop, Hosur")

    @mock.patch(ROUTE, _leg(14.0))
    def test_drop_can_still_change_while_en_route_to_drop(self):
        for leg in ("EN_ROUTE_PICKUP", "LOADING", "EN_ROUTE_DROP"):
            self.sr.logistics_leg = leg
            self.sr.save()
            out = change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
            self.assertEqual(out["drop_address"], "N")

    def test_non_gt_category_rejected(self):
        self.sr.service_category = "packers_movers"
        self.sr.save()
        with self.assertRaises(DropChangeError) as cm:
            change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
        self.assertEqual(cm.exception.code, "NOT_SUPPORTED")

    def test_multistop_rejected(self):
        TripStop.objects.create(booking=self.sr, sequence=1, address="A", stop_type="WAYPOINT")
        with self.assertRaises(DropChangeError) as cm:
            change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
        self.assertEqual(cm.exception.code, "MULTI_STOP_BOOKING")

    def test_bad_coordinates_rejected(self):
        with self.assertRaises(DropChangeError):
            change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=123, drop_lng=77.9)

    def test_reconciliation_uses_updated_quote(self):
        with mock.patch(ROUTE, _leg(17.0)):
            change_drop_location(self.sr, self.cust, drop_address="N", drop_lat=12.9, drop_lng=77.9)
        self.sr.refresh_from_db()
        recon = reconcile_booking_fare(self.sr, actual_distance_km="17.00")
        self.assertEqual(recon.final_amount, Decimal("620.00"))
        self.assertEqual(recon.delta, Decimal("0.00"))


@mock.patch(COVER, lambda *a, **k: None)
class DropChangeAPITests(TestCase):
    def setUp(self):
        self.cust = _user()
        self.sr = _booking(self.cust)
        self.c = APIClient()
        self.c.force_authenticate(self.cust)
        self.url = reverse("sr-booking-change-drop", args=[self.sr.pk])

    def test_preview_saves_nothing(self):
        with mock.patch(ROUTE, _leg(17.0)):
            r = self.c.get(self.url, {"latitude": "12.9", "longitude": "77.9"})
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(r.json()["data"]["new_fare"], "620.00")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.drop_address, "Old drop, Hosur")

    def test_post_applies_and_ignores_client_amount(self):
        with mock.patch(ROUTE, _leg(17.0)):
            r = self.c.post(self.url, {"drop_address": "New", "latitude": "12.9", "longitude": "77.9",
                                       "total_amount": "1.00", "new_fare": "1.00"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.total_amount, Decimal("620.00"))

    def test_post_by_stranger_403(self):
        c = APIClient()
        c.force_authenticate(_user())
        r = c.post(self.url, {"drop_address": "N", "latitude": 12.9, "longitude": 77.9}, format="json")
        self.assertEqual(r.status_code, 403)

    def test_closed_trip_400(self):
        self.sr.status = "completed"
        self.sr.save()
        r = self.c.post(self.url, {"drop_address": "N", "latitude": 12.9, "longitude": 77.9}, format="json")
        self.assertEqual(r.status_code, 400)


GEO = "service_requests.services.address_service.AddressService.resolve_address_coordinates"


@mock.patch(COVER, lambda *a, **k: None)
class DropChangeGeocodeTests(TestCase):
    def setUp(self):
        self.cust = _user()
        self.sr = _booking(self.cust)

    def test_address_only_is_geocoded_server_side(self):
        with mock.patch(GEO, return_value={"latitude": 12.95, "longitude": 77.95}), mock.patch(ROUTE, _leg(17.0)):
            out = change_drop_location(self.sr, self.cust, drop_address="Some street", drop_lat=None, drop_lng=None)
        self.assertEqual(out["new_fare"], "620.00")
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.drop_latitude, Decimal("12.950000"))

    def test_ungeocodable_address_rejected(self):
        with mock.patch(GEO, return_value=None):
            with self.assertRaises(DropChangeError) as cm:
                change_drop_location(self.sr, self.cust, drop_address="???", drop_lat=None, drop_lng=None)
        self.assertEqual(cm.exception.code, "GEOCODE_FAILED")
