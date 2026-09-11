"""
service_requests/tests/test_gt_quote_endpoint.py

GT-B-01, customer-facing half: POST /api/logistics/quote/

The booking pages computed a display fare in the browser while the
backend computed the real one at booking time. Any disagreement surfaced
to the customer as a price that changed after they pressed book. This
endpoint makes the number the customer is SHOWN the same number the
booking will RECORD.

The property these tests exist to protect: the frontend never determines
the fare. It renders what the server returns, and the booking then
recomputes the same value server-side.
"""
import json
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from logistics.models import LogisticsCategory, ServiceTier

QUOTE_URL = "/api/logistics/quote/"


def _route(distance_km=12.0, source="google_maps"):
    return {"distance_km": distance_km, "duration_seconds": 1800, "source": source}


class LogisticsQuoteEndpointTests(TestCase):
    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ace-q",
            name="Tata Ace", starting_price=Decimal("400.00"),
            base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
            free_km=Decimal("2.00"), loading_unloading_charge=Decimal("100.00"),
        )
        self.flat_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="flat-q",
            name="Flat Tier", starting_price=Decimal("650.00"),
        )

    def _post(self, **overrides):
        body = {
            "service_category": "goods_transport_truck",
            "tier_id": self.tier.id,
            "pickup_latitude": "12.740900",
            "pickup_longitude": "77.825300",
            "drop_latitude": "12.935200",
            "drop_longitude": "77.624500",
        }
        body.update(overrides)
        return self.client.post(QUOTE_URL, data=json.dumps(body),
                                content_type="application/json")

    def test_returns_the_authoritative_itemised_distance_fare(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            resp = self._post()
        self.assertEqual(resp.status_code, 200, resp.content)
        data = resp.json().get("data", resp.json())
        self.assertEqual(data["pricing_mode"], "distance")
        # base 250 + (12 - 2 free) x 18 = 180 + loading 100 = 530
        self.assertEqual(data["total"], "530.00")
        self.assertEqual(data["breakdown"]["distance_charge"], "180.00")
        self.assertEqual(data["breakdown"]["distance_source"], "google_maps")
        self.assertEqual(data["tier_id"], self.tier.id)

    def test_money_is_returned_as_strings_never_floats(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            data = self._post().json().get("data")
        self.assertIsInstance(data["total"], str)
        for key in ("base_fare", "distance_charge", "subtotal", "total"):
            self.assertIsInstance(data["breakdown"][key], str)

    def test_quote_matches_what_the_booking_would_actually_record(self):
        # The whole point: shown fare == recorded fare.
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            quoted = self._post().json()["data"]["total"]
            recorded, _breakdown = resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.tier, logistics_lane=None,
                submitted_amount=Decimal("1.00"),
                pickup_lat=Decimal("12.740900"), pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"), drop_lng=Decimal("77.624500"),
            )
        self.assertEqual(Decimal(quoted), recorded)

    def test_flat_tier_is_still_answered_by_the_server(self):
        # A tier with no per-km rate is flat-priced -- but the frontend
        # must not be the one deciding that.
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            resp = self._post(tier_id=self.flat_tier.id)
        data = resp.json()["data"]
        self.assertEqual(data["pricing_mode"], "flat")
        self.assertEqual(data["total"], "650.00")
        self.assertIsNone(data["breakdown"])

    def test_extra_stops_change_the_quote(self):
        self.tier.additional_stop_charge = Decimal("50.00")
        self.tier.save(update_fields=["additional_stop_charge"])
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            data = self._post(stop_count=4).json()["data"]
        self.assertEqual(data["total"], "630.00")

    def test_straight_line_fallback_is_disclosed_in_the_quote(self):
        with patch("service_requests.services.routing.get_route_eta",
                   return_value=_route(source="straight_line_estimate")):
            data = self._post().json()["data"]
        self.assertEqual(data["breakdown"]["distance_source"], "straight_line_estimate")

    # ── refusals ─────────────────────────────────────────────────────────

    def test_packers_movers_is_refused_with_a_clear_reason(self):
        resp = self._post(service_category="packers_movers")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "CATEGORY_NOT_QUOTABLE")

    def test_missing_coordinates_are_refused(self):
        resp = self._post(drop_latitude=None, drop_longitude=None)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "COORDINATES_REQUIRED")

    def test_garbage_coordinates_are_refused_not_crashed_on(self):
        resp = self._post(pickup_latitude="not-a-number")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "COORDINATES_REQUIRED")

    def test_unknown_tier_is_refused(self):
        resp = self._post(tier_id=999999)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "TIER_NOT_FOUND")

    def test_inactive_tier_is_refused(self):
        self.tier.is_active = False
        self.tier.save(update_fields=["is_active"])
        resp = self._post()
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.json()["error_code"], "TIER_NOT_FOUND")

    def test_non_logistics_category_is_refused(self):
        resp = self._post(service_category="ac_repair")
        self.assertEqual(resp.status_code, 400)

    def test_no_price_is_ever_accepted_from_the_caller(self):
        # A caller supplying a total must not influence the answer.
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            data = self._post(total="1.00", total_amount="1.00", fare="1.00").json()["data"]
        self.assertEqual(data["total"], "530.00")

    def test_quote_identity_ttl_and_caching(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            resp = self._post()
        self.assertEqual(resp.status_code, 200)
        data = resp.json().get("data", resp.json())
        self.assertTrue(data.get("quote_id", "").startswith("gtq_"))
        self.assertIsNotNone(data.get("quote_hash"))
        self.assertIsNotNone(data.get("created_at"))
        self.assertIsNotNone(data.get("expires_at"))

        from django.core.cache import cache
        cached = cache.get(f"gt_quote_{data['quote_id']}")
        self.assertIsNotNone(cached)
        self.assertEqual(cached["total"], data["total"])

    def test_expired_quote_rejected_in_fare_resolver(self):
        from datetime import timedelta
        from django.utils import timezone
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2, UnresolvedLogisticsFareError

        expired_time = (timezone.now() - timedelta(minutes=1)).isoformat()
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.tier,
                logistics_lane=None,
                submitted_amount=Decimal("530.00"),
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                cart_data=[{
                    "quote_id": "gtq_old12345",
                    "expires_at": expired_time,
                }]
            )
        self.assertIn("expired", str(ctx.exception).lower())

    def test_valid_quote_accepted_and_snapshot_preserved(self):
        from datetime import timedelta
        from django.utils import timezone
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2

        future_time = (timezone.now() + timedelta(minutes=10)).isoformat()
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            fare, breakdown = resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.tier,
                logistics_lane=None,
                submitted_amount=Decimal("530.00"),
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                cart_data=[{
                    "quote_id": "gtq_valid12345",
                    "expires_at": future_time,
                }]
            )
        self.assertEqual(fare, Decimal("530.00"))
        self.assertEqual(breakdown["quote_id"], "gtq_valid12345")
        self.assertEqual(breakdown["expires_at"], future_time)
        self.assertIsNotNone(breakdown.get("quote_hash"))
        self.assertIsNotNone(breakdown.get("created_at"))
        self.assertIsNotNone(breakdown.get("tier_id"))
