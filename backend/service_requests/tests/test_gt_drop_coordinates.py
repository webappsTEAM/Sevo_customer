"""
service_requests/tests/test_gt_drop_coordinates.py

Adds drop_latitude/drop_longitude to ServiceRequest (migration 0065) to
close GT-D-02's residual gap: bookings with no TripStop rows (the common
single-pickup/single-drop case) previously had no drop-side coordinate at
all, so live tracking kept showing the pickup point even after pickup was
complete. This also feeds the fare engine (real distance needs two real
coordinates).

Covers:
1. The public booking-create serializer accepts drop_latitude/
   drop_longitude when the frontend sends them.
2. The serializer still works with neither field sent (backward
   compatible -- older/other clients that don't send them yet).
3. _build_tracking_payload: a logistics booking with drop coordinates but
   NO TripStop rows, in a pre-pickup leg, still uses the pickup point.
4. _build_tracking_payload: same booking, once past pickup
   (EN_ROUTE_DROP), now targets drop_latitude/drop_longitude instead of
   the pickup point.
5. _build_tracking_payload: a logistics booking past pickup with NEITHER
   TripStop rows NOR drop coordinates set (an old booking predating this
   fix) still falls back to the pickup point -- the one honestly-
   unresolvable case, not a regression.
6. TripStop rows, when present, still take priority over drop_latitude/
   drop_longitude (more specific data wins) -- no regression of the
   GT-D-02 multi-stop fix.
"""
import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import ServiceRequest, TripStop
from service_requests.serializers import ServiceRequestPublicCreateSerializer
from service_requests.views import _build_tracking_payload

User = get_user_model()


class DropCoordinateSerializerTests(TestCase):
    def _base_payload(self, **extra):
        payload = dict(
            customer_name="Test Customer",
            phone="9812345670",
            email="test@example.com",
            service_category="goods_transport_truck",
            issue_title="Move some furniture",
            # Logistics bookings require a real goods description
            # (existing serializer rule) -- not related to this fix.
            description="2 wardrobes and 6 boxes, approx 180kg, one glass tabletop (fragile).",
            address="Pickup Point, Hosur",
            latitude=12.7409,
            longitude=77.8253,
            # tomorrow, not today -- avoids the same-day booking cutoff
            # validator (closes at 6pm server time) making this test flaky.
            preferred_date=str(timezone.localdate() + timedelta(days=1)),
            total_amount=500,
        )
        payload.update(extra)
        return payload

    def test_accepts_drop_coordinates_when_sent(self):
        payload = self._base_payload(
            drop_address="Customer Home, Bengaluru",
            drop_latitude=12.9352,
            drop_longitude=77.6245,
        )
        serializer = ServiceRequestPublicCreateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["drop_latitude"], Decimal("12.9352"))
        self.assertEqual(serializer.validated_data["drop_longitude"], Decimal("77.6245"))

    def test_still_valid_without_drop_coordinates(self):
        # Backward compatibility: any client (older frontend build, native
        # app) that doesn't send these yet must not be broken by this change.
        payload = self._base_payload(drop_address="Customer Home, Bengaluru")
        serializer = ServiceRequestPublicCreateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIsNone(serializer.validated_data.get("drop_latitude"))
        self.assertIsNone(serializer.validated_data.get("drop_longitude"))


class DropCoordinateTrackingFallbackTests(TestCase):
    def _make_customer(self):
        uid = uuid.uuid4().hex[:8]
        return User.objects.create_user(
            username=f"cust_dropcoord_{uid}",
            email=f"cust_dropcoord_{uid}@example.com",
            phone=f"97{uuid.uuid4().int % 100000000:08d}",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )

    def _make_booking(self, **extra):
        customer = self._make_customer()
        defaults = dict(
            customer=customer,
            customer_name="Test Customer",
            phone=customer.phone,
            email=customer.email,
            service_category="goods_transport_truck",
            issue_title="Move some furniture",
            address="Pickup Point, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            drop_address="Customer Home, Bengaluru",
            drop_latitude=Decimal("12.935200"),
            drop_longitude=Decimal("77.624500"),
            preferred_date=timezone.localdate(),
            status=ServiceRequest.Status.ACCEPTED,
            technician_name="Test Technician",
        )
        defaults.update(extra)
        return ServiceRequest.objects.create(**defaults)

    def test_pre_pickup_leg_still_uses_pickup_point(self):
        sr = self._make_booking(logistics_leg=ServiceRequest.LogisticsLeg.EN_ROUTE_PICKUP)
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.7409)
        self.assertEqual(payload["destination"]["longitude"], 77.8253)

    def test_post_pickup_leg_targets_drop_coordinates_with_no_trip_stops(self):
        sr = self._make_booking(logistics_leg=ServiceRequest.LogisticsLeg.EN_ROUTE_DROP)
        self.assertEqual(sr.trip_stops.count(), 0)
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.9352)
        self.assertEqual(payload["destination"]["longitude"], 77.6245)
        self.assertEqual(payload["destination"]["address"], "Customer Home, Bengaluru")
        self.assertEqual(payload["service_location"]["address"], "Customer Home, Bengaluru")

    def test_post_pickup_leg_without_drop_coordinates_falls_back_to_pickup(self):
        # An old booking created before this fix: no TripStop rows AND no
        # drop coordinates. This is the one honestly-unresolvable case --
        # must not crash, must not fabricate a coordinate.
        sr = self._make_booking(
            logistics_leg=ServiceRequest.LogisticsLeg.EN_ROUTE_DROP,
            drop_latitude=None,
            drop_longitude=None,
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        self.assertEqual(payload["destination"]["latitude"], 12.7409)
        self.assertEqual(payload["destination"]["longitude"], 77.8253)

    def test_trip_stops_still_take_priority_over_drop_coordinates(self):
        # GT-D-02 multi-stop fix must not regress: when real TripStop rows
        # exist, they're more specific than the single drop_latitude/
        # drop_longitude pair and must still win.
        sr = self._make_booking(logistics_leg=ServiceRequest.LogisticsLeg.UNLOADING)
        TripStop.objects.create(
            booking=sr, sequence=1, stop_type=TripStop.StopType.PICKUP,
            address="Warehouse A, Hosur",
            latitude=Decimal("12.700000"), longitude=Decimal("77.800000"),
        )
        TripStop.objects.create(
            booking=sr, sequence=2, stop_type=TripStop.StopType.DROP,
            address="Final Drop Stop, Hosur",
            latitude=Decimal("12.760000"), longitude=Decimal("77.860000"),
        )
        payload = _build_tracking_payload(sr, has_full_access=True)
        # Should use the TripStop's coordinates, NOT drop_latitude/drop_longitude.
        self.assertEqual(payload["destination"]["address"], "Final Drop Stop, Hosur")
        self.assertEqual(payload["destination"]["latitude"], 12.76)
