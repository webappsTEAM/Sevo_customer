from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase

from logistics.models import ServiceTier
from service_requests.services.logistics_pricing import (
    quote_logistics_fare,
    resolve_logistics_fare_v2,
    STANDARD_STOP_COUNT,
)


class MultiStopPricingTests(TestCase):
    """
    Rigorously tests multi-stop pricing and ordered waypoint routing per Section 16:
    - 2 stops (pickup + drop): included in base pricing
    - 3 stops: 1 additional stop charged
    - 4 stops: 2 additional stops charged
    - Many stops: scales linearly with additional_stop_charge
    - Zero/invalid/negative stops: gracefully handled without spurious surcharges
    - Ordered waypoints: cumulative distance along ordered route preserved
    """

    def setUp(self):
        self.tier = ServiceTier.objects.create(
            name="Tata Ace Test",
            category="truck",
            city="Hosur",
            starting_price=Decimal("250.00"),
            base_fare=Decimal("250.00"),
            per_km_rate=Decimal("20.00"),
            free_km=Decimal("2.0"),
            minimum_fare=Decimal("250.00"),
            additional_stop_charge=Decimal("60.00"),
            loading_unloading_charge=Decimal("0.00"),
            max_weight_kg=1000.0,
            max_cft=120.0,
            is_active=True,
        )
        self.pickup = (12.7409, 77.8253)
        self.drop = (12.7500, 77.8400)

    @patch("service_requests.services.routing.get_route_eta")
    def test_two_stops_included_in_base_pricing(self, mock_route):
        mock_route.return_value = {
            "distance_km": 5.0,
            "duration_seconds": 600,
            "source": "google_maps",
        }
        quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=self.pickup[0],
            pickup_lng=self.pickup[1],
            drop_lat=self.drop[0],
            drop_lng=self.drop[1],
            stop_count=2,
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["stops"], 2)
        self.assertEqual(quote["additional_stops"], 0)
        self.assertEqual(quote["additional_stop_charge"], Decimal("0.00"))
        # (5 - 2 free) * 20 = 60 + 250 base = 310
        self.assertEqual(quote["total"], Decimal("310.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_three_stops_charges_one_extra_stop(self, mock_route):
        mock_route.return_value = {
            "distance_km": 5.0,
            "duration_seconds": 600,
            "source": "google_maps",
        }
        quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=self.pickup[0],
            pickup_lng=self.pickup[1],
            drop_lat=self.drop[0],
            drop_lng=self.drop[1],
            stop_count=3,
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["stops"], 3)
        self.assertEqual(quote["additional_stops"], 1)
        self.assertEqual(quote["additional_stop_charge"], Decimal("60.00"))
        # 310 + 60 = 370
        self.assertEqual(quote["total"], Decimal("370.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_four_stops_charges_two_extra_stops(self, mock_route):
        mock_route.return_value = {
            "distance_km": 5.0,
            "duration_seconds": 600,
            "source": "google_maps",
        }
        quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=self.pickup[0],
            pickup_lng=self.pickup[1],
            drop_lat=self.drop[0],
            drop_lng=self.drop[1],
            stop_count=4,
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["stops"], 4)
        self.assertEqual(quote["additional_stops"], 2)
        self.assertEqual(quote["additional_stop_charge"], Decimal("120.00"))
        # 310 + 120 = 430
        self.assertEqual(quote["total"], Decimal("430.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_many_stops_scales_linearly(self, mock_route):
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_seconds": 1200,
            "source": "google_maps",
        }
        quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=self.pickup[0],
            pickup_lng=self.pickup[1],
            drop_lat=self.drop[0],
            drop_lng=self.drop[1],
            stop_count=10,
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["stops"], 10)
        self.assertEqual(quote["additional_stops"], 8)
        self.assertEqual(quote["additional_stop_charge"], Decimal("480.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_zero_or_invalid_stop_counts_handled_safely(self, mock_route):
        mock_route.return_value = {
            "distance_km": 5.0,
            "duration_seconds": 600,
            "source": "google_maps",
        }
        for invalid in (0, -1, None, "invalid", []):
            quote = quote_logistics_fare(
                tier=self.tier,
                pickup_lat=self.pickup[0],
                pickup_lng=self.pickup[1],
                drop_lat=self.drop[0],
                drop_lng=self.drop[1],
                stop_count=invalid,
            )
            self.assertIsNotNone(quote)
            self.assertEqual(quote["additional_stops"], 0)
            self.assertEqual(quote["additional_stop_charge"], Decimal("0.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_ordered_waypoints_accumulate_distance_and_stops(self, mock_route):
        # 3 legs: pickup -> wp1 (3km), wp1 -> wp2 (4km), wp2 -> drop (5km) => total 12km
        def fake_route(lat1, lng1, lat2, lng2):
            if lat1 == self.pickup[0]:
                return {"distance_km": 3.0, "duration_seconds": 300, "source": "google_maps"}
            elif lat1 == 12.7450:
                return {"distance_km": 4.0, "duration_seconds": 400, "source": "google_maps"}
            else:
                return {"distance_km": 5.0, "duration_seconds": 500, "source": "google_maps"}

        mock_route.side_effect = fake_route

        waypoints = [
            {"lat": 12.7450, "lng": 77.8300},
            {"lat": 12.7480, "lng": 77.8350},
        ]
        quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=self.pickup[0],
            pickup_lng=self.pickup[1],
            drop_lat=self.drop[0],
            drop_lng=self.drop[1],
            waypoints=waypoints,
        )
        self.assertIsNotNone(quote)
        self.assertEqual(quote["distance_km"], Decimal("12.00"))
        self.assertEqual(quote["stops"], 4)
        self.assertEqual(quote["additional_stops"], 2)
        self.assertEqual(quote["additional_stop_charge"], Decimal("120.00"))
        # (12 - 2 free) * 20 = 200 + 250 base + 120 stops = 570
        self.assertEqual(quote["total"], Decimal("570.00"))
