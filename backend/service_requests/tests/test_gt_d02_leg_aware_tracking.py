"""
service_requests/tests/test_gt_d02_leg_aware_tracking.py

GT-D-02: _build_tracking_payload previously always used sr.latitude/
sr.longitude (the pickup point) as the tracking "destination", even after
a logistics booking's technician had picked up and was en route to the
drop. For bookings that use TripStop (multi-stop routes), the payload
should now target whichever leg logistics_leg says is current.

Covers:
1. Non-logistics category: unaffected, still uses sr.latitude/longitude.
2. Logistics category, no TripStop rows: unaffected (no drop coordinate
   exists to target yet -- this is a documented follow-up gap, not this
   fix's job).
3. Logistics category with TripStop rows, pre-pickup leg: targets the
   PICKUP-type stop.
4. Logistics category with TripStop rows, post-pickup leg: targets the
   last DROP-type stop.
5. Logistics category with TripStop rows but no logistics_leg set yet:
   defaults to the pickup-side behavior (same as case 3).
"""
import uuid
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from service_requests.models import ServiceRequest, TripStop
from service_requests.views import _build_tracking_payload

User = get_user_model()


class LegAwareTrackingPayloadTests(TestCase):
    def _make_customer(self):
        uid = uuid.uuid4().hex[:8]
        return User.objects.create_user(
            username=f"cust_gtd02_{uid}",
            email=f"cust_gtd02_{uid}@example.com",
            phone=f"98{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )

    def _make_booking(self, service_category, **extra):
        customer = self._make_customer()
        defaults = dict(
            customer=customer,
            customer_name="Test Customer",
            phone=customer.phone,
            email=customer.email,
            service_category=service_category,
            issue_title="Move some furniture",
            address="Pickup Point, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.ACCEPTED,
            technician_name="Test Technician",
        )
        defaults.update(extra)
        return ServiceRequest.objects.create(**defaults)

    def test_non_logistics_category_unaffected(self):
        sr = self._make_booking("ac_repair")
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.7409)
        self.assertEqual(payload["destination"]["longitude"], 77.8253)
        self.assertEqual(payload["destination"]["address"], "Pickup Point, Hosur")

    def test_logistics_no_trip_stops_falls_back_to_pickup(self):
        sr = self._make_booking("goods_transport_truck")
        payload = _build_tracking_payload(sr, has_full_access=True)
        # No TripStop rows -> no drop coordinate to target -> unchanged
        # behavior, same as before this fix (documented follow-up gap).
        self.assertEqual(payload["destination"]["latitude"], 12.7409)
        self.assertEqual(payload["destination"]["longitude"], 77.8253)

    def test_logistics_pre_pickup_leg_targets_pickup_stop(self):
        sr = self._make_booking(
            "goods_transport_truck",
            logistics_leg=ServiceRequest.LogisticsLeg.EN_ROUTE_PICKUP,
        )
        TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Hosur",
            latitude=Decimal("12.750000"), longitude=Decimal("77.850000"),
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.7)
        self.assertEqual(payload["destination"]["longitude"], 77.8)
        self.assertEqual(payload["destination"]["address"], "Warehouse A, Hosur")

    def test_logistics_post_pickup_leg_targets_drop_stop(self):
        sr = self._make_booking(
            "goods_transport_truck",
            logistics_leg=ServiceRequest.LogisticsLeg.EN_ROUTE_DROP,
        )
        TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Hosur",
            latitude=Decimal("12.750000"), longitude=Decimal("77.850000"),
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.75)
        self.assertEqual(payload["destination"]["longitude"], 77.85)
        self.assertEqual(payload["destination"]["address"], "Customer Home, Hosur")
        # service_location mirrors destination.
        self.assertEqual(payload["service_location"]["address"], "Customer Home, Hosur")

    def test_logistics_multi_drop_targets_last_drop_stop(self):
        sr = self._make_booking(
            "goods_transport_truck",
            logistics_leg=ServiceRequest.LogisticsLeg.UNLOADING,
        )
        TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="First Drop, Hosur",
            latitude=Decimal("12.720000"), longitude=Decimal("77.820000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=3, stop_type=TripStop.StopType.DROP,
            address="Final Drop, Hosur",
            latitude=Decimal("12.760000"), longitude=Decimal("77.860000"),
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["address"], "Final Drop, Hosur")
        self.assertEqual(payload["destination"]["latitude"], 12.76)

    def test_logistics_with_stops_no_leg_set_defaults_to_pickup(self):
        sr = self._make_booking("goods_transport_truck")  # logistics_leg left blank
        TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Customer Home, Hosur",
            latitude=Decimal("12.750000"), longitude=Decimal("77.850000"),
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["address"], "Warehouse A, Hosur")
