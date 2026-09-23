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
            # GT audit Update 18: real ServiceTier rows always carry a
            # vehicle_class (migration 0010 backfilled every row; 0011 made a
            # blank value fail closed). A goods-transport booking against a
            # tier without one is now refused, because the Vendor side would
            # have no purchased vehicle to match a driver against.
            vehicle_class="truck",
        )
        self.flat_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug="flat-q",
            name="Flat Tier", starting_price=Decimal("650.00"),
            vehicle_class="truck",
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
        from django.core.cache import cache
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2

        future_time = (timezone.now() + timedelta(minutes=10)).isoformat()
        cache.set("gt_quote_gtq_valid12345", {
            "quote_id": "gtq_valid12345",
            "tier_id": self.tier.id,
            "pickup_lat": "12.740900",
            "pickup_lng": "77.825300",
            "drop_lat": "12.935200",
            "drop_lng": "77.624500",
            "expires_at": future_time,
            "total": "530.00",
            "quote_hash": "mock_hash_123",
            "created_at": timezone.now().isoformat(),
        }, timeout=600)
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

    @patch("service_requests.services.routing.get_route_eta")
    def test_standard_gt_quote_price_lock_when_routing_result_changes(self, mock_route):
        """
        Gap 3 Regression Test:
        Quote = X (generated with distance D1).
        At booking time, routing returns D2 (e.g. 25km vs 10km) or fails to fallback.
        Booking using the valid quote MUST remain X (exact price lock).
        """
        from service_requests.services.logistics_pricing import quote_logistics_fare, resolve_logistics_fare_v2

        # Step 1: Initial quote at 10.0 km
        mock_route.return_value = _route(distance_km=10.0, source="google_maps")
        initial_quote = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
        )
        self.assertIsNotNone(initial_quote)
        locked_fare = initial_quote["total"]
        quote_id = initial_quote["quote_id"]
        quote_hash = initial_quote["quote_hash"]
        expires_at = initial_quote["expires_at"]

        # Step 2: Route changes drastically before booking (e.g. 25.0 km or traffic detour)
        mock_route.return_value = _route(distance_km=25.0, source="google_maps")

        # If recomputed fresh without quote, the fare would be higher:
        recalc = quote_logistics_fare(
            tier=self.tier,
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
        )
        self.assertGreater(recalc["total"], locked_fare)

        # Step 3: Booking with valid quote_id MUST preserve locked_fare X exactly
        fare, breakdown = resolve_logistics_fare_v2(
            service_category="goods_transport_truck",
            logistics_tier=self.tier,
            logistics_lane=None,
            submitted_amount=locked_fare,
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
            cart_data=[{
                "quote_id": quote_id,
                "quote_hash": quote_hash,
                "expires_at": expires_at,
            }]
        )
        self.assertEqual(fare, locked_fare)
        self.assertEqual(breakdown["total"], locked_fare)
        self.assertEqual(breakdown["quote_id"], quote_id)
        self.assertEqual(breakdown["distance_km"], initial_quote["distance_km"])

    @patch("service_requests.services.routing.get_route_eta")
    def test_two_wheeler_city_capacity_isolation_via_quote_endpoint(self, mock_route):
        """
        API-level test for standard GT quote endpoint:
        City A (Hosur): 2W max weight = 20 kg
        City B (Bengaluru): 2W max weight = 45 kg
        A 30 kg cargo quote against City A's 2W tier must NOT use City B's 45 kg capacity.
        City A quote must fail with VEHICLE_CAPACITY_EXCEEDED or CARGO_INCOMPATIBLE.
        City B quote with the same 30 kg cargo must succeed (200 OK).
        """
        import uuid
        from logistics.models import GoodsCategory, GoodsItem

        mock_route.return_value = _route(distance_km=5.0)
        uid = uuid.uuid4().hex[:6]

        # City A: 2W max weight = 20 kg
        tier_2w_a = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="Hosur",
            slug=f"2w-hosur-{uid}",
            name="2W Hosur",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("100.00"),
            base_fare=Decimal("50.00"),
            per_km_rate=Decimal("10.00"),
            free_km=Decimal("1.00"),
            max_cft=Decimal("5.0"),
            max_weight_kg=Decimal("20.0"),
            is_active=True,
        )

        # City B: 2W max weight = 45 kg (alphabetically "Bengaluru" < "Hosur")
        tier_2w_b = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="Bengaluru",
            slug=f"2w-blr-{uid}",
            name="2W Bengaluru",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("120.00"),
            base_fare=Decimal("60.00"),
            per_km_rate=Decimal("12.00"),
            free_km=Decimal("1.00"),
            max_cft=Decimal("10.0"),
            max_weight_kg=Decimal("45.0"),
            is_active=True,
        )

        # Create a goods item weighing 30 kg
        cat_small = GoodsCategory.objects.create(
            name=f"Standard Goods {uid}",
            slug=f"std-goods-{uid}",
            allows_two_wheeler=True,
            is_active=True,
        )
        item_30kg = GoodsItem.objects.create(
            category=cat_small,
            name=f"30kg Box {uid}",
            slug=f"30kg-box-{uid}",
            default_cft=Decimal("2.0"),
            default_weight_kg=Decimal("30.0"),
            is_active=True,
            is_two_wheeler_compatible=True,
        )

        cargo_payload = [{"goods_item_id": item_30kg.id, "quantity": 1}]

        # 1. Quote against City A's 2W tier with 30 kg cargo
        resp_a = self._post(
            service_category="goods_transport_two_wheeler",
            tier_id=tier_2w_a.id,
            cargo_items=cargo_payload,
        )
        # Must be rejected because 30 kg exceeds City A's 20 kg limit
        self.assertEqual(resp_a.status_code, 400, f"City A quote should fail: {resp_a.content}")
        resp_a_json = resp_a.json()
        self.assertIn(resp_a_json.get("error_code"), ["VEHICLE_CAPACITY_EXCEEDED", "CARGO_INCOMPATIBLE"])
        self.assertFalse(resp_a_json.get("cargo_summary", {}).get("is_two_wheeler_compatible", True))

        # 2. Quote against City B's 2W tier with the exact same 30 kg cargo
        resp_b = self._post(
            service_category="goods_transport_two_wheeler",
            tier_id=tier_2w_b.id,
            cargo_items=cargo_payload,
        )
        # Must succeed because 30 kg fits safely within City B's 45 kg limit
        self.assertEqual(resp_b.status_code, 200, f"City B quote should succeed: {resp_b.content}")
        resp_b_json = resp_b.json()
        self.assertTrue(resp_b_json.get("data", {}).get("cargo_summary", {}).get("is_two_wheeler_compatible", False))

