"""
service_requests/tests/test_gt_b01_fare_engine.py

GT-B-01: real distance-based fare engine, per CALTRACK_PHASE_14 PART H.1
  fare = base_fare + chargeable_km x per_km_rate
       + loading_unloading + additional_stop_charge x (stops - 2)
       (x surge), floored at minimum_fare

Before this, service_requests/services/logistics_pricing.py did a pure
flat lookup: Lane.fare if a lane was picked, else
ServiceTier.starting_price. No distance was involved anywhere.

Distance is mocked at the routing-service boundary throughout -- this
sandbox cannot reach the Google Maps API (proxy-blocked), and these
tests are about the fare arithmetic and the resolution order, not about
Google's API. routing.py's own behaviour is covered separately in
test_x10_routing_eta.py.

Covers the arithmetic, every fallback path, the resolution order,
Decimal exactness, and the two safety properties that matter most: a
client-submitted amount is never trusted for a logistics category, and
Packers & Movers is never priced by road distance.
"""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from logistics.models import Lane, LogisticsCategory, ServiceTier
from service_requests.services.logistics_pricing import (
    UnresolvedLogisticsFareError,
    quote_logistics_fare,
    resolve_logistics_fare_v2,
)

# Hosur -> a point ~12km away by road in these fixtures.
PICKUP = (Decimal("12.740900"), Decimal("77.825300"))
DROP = (Decimal("12.935200"), Decimal("77.624500"))


def _route(distance_km, source="google_maps"):
    return {"distance_km": distance_km, "duration_seconds": 1800, "source": source}


class FareEngineArithmeticTests(TestCase):
    def _tier(self, **overrides):
        defaults = dict(
            category=LogisticsCategory.TRUCK,
            city="hosur",
            slug="tata-ace-test",
            name="Tata Ace",
            starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"),
            per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"),
            loading_unloading_charge=Decimal("100.00"),
            additional_stop_charge=Decimal("50.00"),
            surge_multiplier=Decimal("1.00"),
            minimum_fare=None,
        )
        defaults.update(overrides)
        return ServiceTier.objects.create(**defaults)

    def test_basic_distance_fare(self):
        tier = self._tier()
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        # base 250 + (12 - 2 free) * 18 = 180 + loading 100 = 530
        self.assertEqual(b["chargeable_km"], Decimal("10.00"))
        self.assertEqual(b["distance_charge"], Decimal("180.00"))
        self.assertEqual(b["subtotal"], Decimal("530.00"))
        self.assertEqual(b["total"], Decimal("530.00"))
        self.assertEqual(b["distance_source"], "google_maps")
        self.assertEqual(b["additional_stops"], 0)

    def test_distance_below_free_allowance_is_not_negative(self):
        tier = self._tier(free_km=Decimal("5.00"))
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(3.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        # A shorter-than-free trip must not produce a negative distance charge.
        self.assertEqual(b["chargeable_km"], Decimal("0.00"))
        self.assertEqual(b["distance_charge"], Decimal("0.00"))
        self.assertEqual(b["total"], Decimal("350.00"))  # base 250 + loading 100

    def test_additional_stops_charged_beyond_the_standard_two(self):
        tier = self._tier()
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1], stop_count=4,
            )
        self.assertEqual(b["additional_stops"], 2)
        self.assertEqual(b["additional_stop_charge"], Decimal("100.00"))
        self.assertEqual(b["total"], Decimal("630.00"))

    def test_surge_multiplier_applies_to_the_whole_subtotal(self):
        tier = self._tier(surge_multiplier=Decimal("1.50"))
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        self.assertEqual(b["subtotal"], Decimal("530.00"))
        self.assertEqual(b["total"], Decimal("795.00"))

    def test_misconfigured_zero_surge_is_treated_as_no_surge(self):
        # A 0 multiplier would make every trip free. Guard against a bad
        # admin value zeroing out revenue.
        tier = self._tier(surge_multiplier=Decimal("0"))
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        self.assertEqual(b["surge_multiplier"], Decimal("1.00"))
        self.assertEqual(b["total"], Decimal("530.00"))

    def test_minimum_fare_floor(self):
        tier = self._tier(minimum_fare=Decimal("900.00"))
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        self.assertEqual(b["total"], Decimal("900.00"))
        self.assertTrue(b["minimum_fare_applied"])

    def test_base_fare_falls_back_to_starting_price(self):
        tier = self._tier(base_fare=None, loading_unloading_charge=Decimal("0"))
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        # starting_price 400 + 10 chargeable km * 18 = 580
        self.assertEqual(b["base_fare"], Decimal("400.00"))
        self.assertEqual(b["total"], Decimal("580.00"))

    def test_straight_line_distance_is_reported_as_such(self):
        # The fare is still computed, but the breakdown must say the
        # distance was estimated rather than measured on the road network.
        tier = self._tier()
        with patch("service_requests.services.routing.get_route_eta",
                   return_value=_route(12.0, source="straight_line_estimate")):
            b = quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            )
        self.assertEqual(b["distance_source"], "straight_line_estimate")

    def test_returns_none_without_per_km_rate(self):
        tier = self._tier(per_km_rate=None)
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            self.assertIsNone(quote_logistics_fare(
                tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                drop_lat=DROP[0], drop_lng=DROP[1],
            ))

    def test_returns_none_without_coordinates(self):
        tier = self._tier()
        self.assertIsNone(quote_logistics_fare(
            tier=tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
            drop_lat=None, drop_lng=None,
        ))

    def test_returns_none_without_a_tier(self):
        self.assertIsNone(quote_logistics_fare(
            tier=None, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
            drop_lat=DROP[0], drop_lng=DROP[1],
        ))


class FareResolutionOrderTests(TestCase):
    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace",
            name="Tata Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"), loading_unloading_charge=Decimal("100.00"),
        )
        self.flat_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="flat",
            name="Flat Tier", starting_price=Decimal("777.00"),
        )
        self.lane = Lane.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur",
            destination_label="Bengaluru", fare=Decimal("1200.00"),
        )

    def _resolve(self, **kw):
        base = dict(
            service_category="goods_transport_truck",
            logistics_tier=self.tier,
            logistics_lane=None,
            submitted_amount=Decimal("1.00"),
            pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
            drop_lat=DROP[0], drop_lng=DROP[1],
        )
        base.update(kw)
        return resolve_logistics_fare_v2(**base)

    def test_distance_price_wins_over_lane_fare(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            fare, breakdown = self._resolve(logistics_lane=self.lane)
        self.assertEqual(fare, Decimal("530.00"))
        self.assertIsNotNone(breakdown)

    def test_lane_fare_used_when_tier_is_not_distance_priced(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            fare, breakdown = self._resolve(logistics_tier=self.flat_tier, logistics_lane=self.lane)
        self.assertEqual(fare, Decimal("1200.00"))
        self.assertIsNone(breakdown)

    def test_flat_tier_price_used_when_no_lane_and_no_distance_pricing(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            fare, breakdown = self._resolve(logistics_tier=self.flat_tier)
        self.assertEqual(fare, Decimal("777.00"))
        self.assertIsNone(breakdown)

    def test_no_tier_and_no_lane_still_raises(self):
        # The GT-B-01 guarantee that predates this change: never fall back
        # to a client-supplied amount for a logistics booking.
        with self.assertRaises(UnresolvedLogisticsFareError):
            self._resolve(logistics_tier=None, logistics_lane=None)

    def test_packers_movers_is_never_distance_priced(self):
        # H.2 relocation pricing is survey/volume-driven. Pricing it by
        # road distance would be wrong, not just incomplete.
        pm_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS, city="hosur", slug="2bhk",
            name="2BHK", starting_price=Decimal("8000.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
        )
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            fare, breakdown = self._resolve(
                service_category="packers_movers", logistics_tier=pm_tier,
            )
        self.assertEqual(fare, Decimal("8000.00"))
        self.assertIsNone(breakdown)

    def test_non_logistics_category_passes_submitted_amount_through(self):
        fare, breakdown = self._resolve(
            service_category="ac_repair", submitted_amount=Decimal("1499.00"),
        )
        self.assertEqual(fare, Decimal("1499.00"))
        self.assertIsNone(breakdown)

    def test_falls_back_to_flat_when_routing_returns_nothing(self):
        # Routing genuinely unable to produce any distance (bad coords):
        # fall back to the flat price rather than to the client's amount.
        with patch("service_requests.services.routing.get_route_eta", return_value=None):
            fare, breakdown = self._resolve(logistics_lane=self.lane)
        self.assertEqual(fare, Decimal("1200.00"))
        self.assertIsNone(breakdown)


class FareEngineBookingIntegrationTests(TestCase):
    """
    End-to-end through the real POST /api/booking/ endpoint.

    The unit tests above prove the arithmetic; these prove the engine is
    actually wired into booking creation -- that the fare stored on the
    booking is the server's computed one, that the itemised quote is
    persisted, and above all that a client-submitted total_amount is
    ignored for a logistics booking no matter what it says.
    """
    def setUp(self):
        from django.test import Client
        self.client = Client()
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-int",
            name="Tata Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"), loading_unloading_charge=Decimal("100.00"),
        )

    def _payload(self, **extra):
        from datetime import timedelta
        from django.utils import timezone
        payload = {
            "customer_name": "Integration Test",
            "phone": "9812345671",
            "email": "gtb01@example.com",
            "service_category": "goods_transport_truck",
            "issue_title": "Move a sofa and boxes",
            "description": "1 sofa, 8 boxes, approx 200kg, nothing fragile.",
            "address": "Pickup Point, Hosur",
            "latitude": "12.740900",
            "longitude": "77.825300",
            "drop_address": "Drop Point, Bengaluru",
            "drop_latitude": "12.935200",
            "drop_longitude": "77.624500",
            "preferred_date": str(timezone.localdate() + timedelta(days=1)),
            "total_amount": "1.00",  # deliberately absurd client value
            "payment_method": "COD",
            "logistics_tier": self.tier.id,
        }
        payload.update(extra)
        return payload

    def test_booking_stores_server_computed_fare_not_the_client_amount(self):
        from service_requests.models import ServiceRequest
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            resp = self.client.post("/api/booking/", self._payload())
        self.assertIn(resp.status_code, (200, 201), getattr(resp, "data", resp.content))

        sr = ServiceRequest.objects.filter(service_category="goods_transport_truck").order_by("-id").first()
        self.assertIsNotNone(sr)
        # base 250 + (12 - 2) * 18 + loading 100 = 530, NOT the submitted 1.00
        self.assertEqual(sr.total_amount, Decimal("530.00"))
        self.assertEqual(sr.drop_latitude, Decimal("12.935200"))
        self.assertEqual(sr.drop_longitude, Decimal("77.624500"))

    def test_booking_persists_the_itemised_breakdown_as_exact_strings(self):
        from service_requests.models import ServiceRequest
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            self.client.post("/api/booking/", self._payload())
        sr = ServiceRequest.objects.filter(service_category="goods_transport_truck").order_by("-id").first()
        b = sr.fare_breakdown
        self.assertTrue(b, "fare_breakdown should be populated for a distance-priced booking")
        # Money is stored as exact strings, never floats.
        self.assertEqual(b["total"], "530.00")
        self.assertEqual(b["distance_charge"], "180.00")
        self.assertEqual(b["distance_source"], "google_maps")
        self.assertIsInstance(b["total"], str)
        # Round-trips back to the exact Decimal for later reconciliation.
        self.assertEqual(Decimal(b["total"]), sr.total_amount)

    def test_flat_priced_booking_leaves_the_breakdown_empty(self):
        from service_requests.models import ServiceRequest
        flat = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="flat-int",
            name="Flat", starting_price=Decimal("650.00"),
        )
        with patch("service_requests.services.routing.get_route_eta", return_value=_route(12.0)):
            self.client.post("/api/booking/", self._payload(logistics_tier=flat.id))
        sr = ServiceRequest.objects.filter(service_category="goods_transport_truck").order_by("-id").first()
        self.assertEqual(sr.total_amount, Decimal("650.00"))
        # Empty means "not distance-priced", not "data missing".
        self.assertEqual(sr.fare_breakdown, {})
