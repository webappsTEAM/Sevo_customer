"""
service_requests/tests/test_gt_pm_closure.py

Final Deep Closure Test Suite for Goods & Transport (GT) & Packers & Movers (P&M).
Validates:
1. P&M DB-backed inventory item ID resolution.
2. P&M fake coordinates rejection (COORDINATES_REQUIRED).
3. P&M selected tier bound to quote and wrong tier rejection.
4. P&M static vehicle table absence (must use ServiceTier DB).
5. P&M keyword heuristics eliminated (unknown text is uncataloged).
6. P&M city config isolation (City A config != City B config).
7. P&M quote input mutation rejection (tier, route, inventory, floor, lift, packing).
8. Strict input validation (negative floors rejected, "false" != True).
9. Standard GT vehicle class unconfigured fails closed (rank 0).
10. Expired / missing GT quote rejection.
"""
import math
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from django.core.cache import cache
from rest_framework.test import APIClient

from logistics.models import (
    GoodsCategory,
    GoodsItem,
    LogisticsCategory,
    ServiceTier,
    PackersMoversConfig,
)
from service_requests.services.cargo_fitment import (
    get_tier_class_rank,
    evaluate_vehicle_fitment,
    recommend_vehicles_for_cargo,
)
from service_requests.services import packers_movers_pricing as pm_mod
from service_requests.services.packers_movers_pricing import (
    match_catalog_item,
    calculate_inventory_metrics,
    recommend_vehicle_for_volume,
    compute_packers_movers_quote,
    verify_packers_movers_quote,
)
from service_requests.services.logistics_pricing import (
    resolve_logistics_fare_v2,
    UnresolvedLogisticsFareError,
)


class GTPackersMoversClosureTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        uid = uuid.uuid4().hex[:6]

        # 1. Database Categories & Items
        self.cat_bedroom = GoodsCategory.objects.create(
            name="Bedroom",
            slug=f"bedroom-{uid}",
            allows_two_wheeler=False,
            min_vehicle_class="truck",
            is_active=True,
        )
        self.item_double_bed = GoodsItem.objects.create(
            category=self.cat_bedroom,
            name="King Size Double Bed",
            slug=f"king-size-double-bed-{uid}",
            default_cft=Decimal("50.0"),
            default_weight_kg=Decimal("60.0"),
            requires_special_handling=True,
            special_handling_charge=Decimal("400.00"),
            is_active=True,
        )
        self.item_wardrobe = GoodsItem.objects.create(
            category=self.cat_bedroom,
            name="3-Door Wooden Wardrobe",
            slug=f"3-door-wooden-wardrobe-{uid}",
            default_cft=Decimal("40.0"),
            default_weight_kg=Decimal("45.0"),
            requires_special_handling=True,
            special_handling_charge=Decimal("300.00"),
            is_active=True,
        )

        # 2. Packers Movers City Config (Hosur)
        self.pm_config_hosur = PackersMoversConfig.objects.create(
            city="Hosur",
            standard_packing_rate_cft=Decimal("7.00"),
            premium_packing_rate_cft=Decimal("12.00"),
            premium_fragile_addon=Decimal("200.00"),
            floor_rate_no_lift_per_100cft=Decimal("150.00"),
            unpacking_rate_cft=Decimal("4.00"),
            gst_rate=Decimal("0.1800"),
            survey_cft_threshold=500.0,
        )

        # 3. Service Tiers for Hosur
        self.tier_truck_1 = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-tata-ace-{uid}",
            name="Mini Truck (Tata Ace)",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1500.00"),
            base_fare=Decimal("1200.00"),
            per_km_rate=Decimal("25.00"),
            free_km=Decimal("3.00"),
            loading_unloading_charge=Decimal("400.00"),
            additional_stop_charge=Decimal("150.00"),
            minimum_fare=Decimal("1500.00"),
            max_weight_kg=Decimal("750.00"),
            max_cft=Decimal("150.00"),
            order=1,
            is_active=True,
        )
        self.tier_truck_2 = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-pickup-{uid}",
            name="14ft Large Truck",
            vehicle_class=ServiceTier.VehicleClass.HEAVY_TRUCK,
            starting_price=Decimal("2500.00"),
            base_fare=Decimal("2000.00"),
            per_km_rate=Decimal("35.00"),
            free_km=Decimal("3.00"),
            loading_unloading_charge=Decimal("800.00"),
            additional_stop_charge=Decimal("250.00"),
            minimum_fare=Decimal("2500.00"),
            max_weight_kg=Decimal("2000.00"),
            max_cft=Decimal("450.00"),
            order=2,
            is_active=True,
        )

    # 1. P&M DB-backed inventory item ID resolution
    def test_pm_db_backed_item_id_resolution(self):
        """Pure database GoodsItem resolution without heuristic guessing."""
        meta = match_catalog_item("", goods_item_id=self.item_double_bed.id)
        self.assertTrue(meta["is_known"])
        self.assertFalse(meta["requires_review"])
        self.assertEqual(meta["goods_item_id"], self.item_double_bed.id)
        self.assertEqual(meta["cft"], 50.0)
        self.assertEqual(meta["weight_kg"], 60.0)
        self.assertTrue(meta["dismantle"])
        self.assertEqual(meta["dismantle_charge"], 400.0)
        self.assertEqual(meta["source"], "database")

    # 2. P&M fake coordinates rejection
    def test_pm_fake_coordinates_rejected(self):
        """Quote endpoint rejects missing coordinates with COORDINATES_REQUIRED."""
        payload = {
            "pickup_lat": None,
            "pickup_lng": None,
            "drop_lat": None,
            "drop_lng": None,
            "city": "Hosur",
            "items": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        }
        res = self.client.post("/api/logistics/packers-movers/quote/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "COORDINATES_REQUIRED")

    # 3. P&M selected tier bound to quote and wrong tier rejection
    @patch("service_requests.services.routing.get_route_eta")
    def test_pm_selected_tier_bound_and_wrong_tier_rejected(self, mock_route):
        """Selected tier is stored in quote cache and mutation in request is rejected."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 30,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        inventory = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inventory,
        )
        self.assertTrue(quote["is_authoritative"])
        self.assertEqual(quote["tier_id"], self.tier_truck_1.id)

        quote_id = quote["quote_id"]
        full_req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "relocation_type": "Within City",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inventory,
        }
        # Verify with matching tier succeeds
        is_valid, _, err = verify_packers_movers_quote(
            quote_id,
            submitted_total=quote["total"],
            current_request=full_req,
        )
        self.assertTrue(is_valid, err)

        # Verify with wrong tier fails closed
        is_valid, _, err = verify_packers_movers_quote(
            quote_id,
            submitted_total=quote["total"],
            current_request={**full_req, "tier_id": self.tier_truck_2.id},
        )
        self.assertFalse(is_valid)
        self.assertIn("Quote tier mismatch", err)

    # 4. P&M static vehicle table absence
    def test_pm_static_vehicle_table_absent(self):
        """Zero hardcoded vehicle sizing tables in codebase."""
        self.assertFalse(hasattr(pm_mod, "VEHICLE_SIZING_TABLE"))
        self.assertFalse(hasattr(pm_mod, "CANONICAL_INVENTORY_CATALOG"))

        # Vehicle recommendations must draw strictly from ServiceTier database
        rec = recommend_vehicle_for_volume(40.0, city="Hosur")
        self.assertIsNotNone(rec)
        self.assertEqual(rec["tier_id"], self.tier_truck_1.id)

    # 5. P&M keyword heuristics eliminated
    def test_pm_keyword_heuristics_eliminated(self):
        """Keyword aliases like 'teakwood sofa' do NOT match without exact DB record."""
        meta = match_catalog_item("Teakwood Luxury Sofa Set")
        self.assertFalse(meta["is_known"])
        self.assertTrue(meta["requires_review"])
        self.assertIsNone(meta["cft"])

    # 6. P&M city config isolation
    @patch("service_requests.services.routing.get_route_eta")
    def test_pm_city_config_isolation(self, mock_route):
        """City without configured PackersMoversConfig fails closed."""
        mock_route.return_value = {
            "distance_km": 15.0,
            "duration_minutes": 40,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=11.664,
            pickup_lng=78.146,
            drop_lat=11.700,
            drop_lng=78.200,
            city="Salem",  # No config for Salem!
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        self.assertTrue(quote["city_config_missing"])
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")
        self.assertFalse(quote["is_authoritative"])

    # 7. P&M quote input mutation rejection
    @patch("service_requests.services.routing.get_route_eta")
    def test_pm_quote_input_mutation_rejection(self, mock_route):
        """Any mutation to route, inventory, packing tier, or access rules rejects quote."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 30,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
            packing_tier="standard",
            pickup_floor=0,
            pickup_has_lift=True,
            drop_floor=0,
            drop_has_lift=True,
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        base_req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "relocation_type": "Within City",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
            "packing_tier": "standard",
            "pickup_floor": 0,
            "pickup_has_lift": True,
            "drop_floor": 0,
            "drop_has_lift": True,
        }

        # Route mutation (different pickup lat)
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "pickup_lat": 12.900}
        )
        self.assertFalse(is_val)
        self.assertIn("route mismatch", err.lower())

        # Inventory mutation (different item or quantity)
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 3}]}
        )
        self.assertFalse(is_val)
        self.assertIn("inventory mismatch", err.lower())

        # Packing tier mutation
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "packing_tier": "premium"}
        )
        self.assertFalse(is_val)
        self.assertIn("packing tier has changed", err.lower())

        # Floor mutation
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "pickup_floor": 4}
        )
        self.assertFalse(is_val)
        self.assertIn("pickup floor has changed", err.lower())

    # 8. Strict input validation in API endpoint
    def test_pm_strict_input_validation(self):
        """Negative floors, invalid booleans, and unlisted packing tiers fail with HTTP 400."""
        # Negative floor
        res = self.client.post("/api/logistics/packers-movers/quote/", {
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "city": "Hosur",
            "pickup_floor": -2,
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "INVALID_FLOOR")

        # Invalid packing tier
        res = self.client.post("/api/logistics/packers-movers/quote/", {
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "city": "Hosur",
            "packing_tier": "gold_luxury_tier",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "INVALID_PACKING_TIER")

        # Non-boolean string
        res = self.client.post("/api/logistics/packers-movers/quote/", {
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "city": "Hosur",
            "pickup_has_lift": "maybe",
        }, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "INVALID_BOOLEAN")

    # 9. Standard GT vehicle class unconfigured fails closed
    def test_standard_gt_unconfigured_vehicle_class_fails_closed(self):
        """Unconfigured vehicle_class returns rank 0 and is rejected from fitment."""
        unconfigured_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"unconfigured-truck-{uuid.uuid4().hex[:4]}",
            name="Unconfigured Tier",
            vehicle_class="",
            starting_price=Decimal("500.00"),
            is_active=True,
        )
        self.assertEqual(unconfigured_tier.get_vehicle_class(), "")
        self.assertEqual(get_tier_class_rank(unconfigured_tier), 0)

        is_fit, reason = evaluate_vehicle_fitment(
            unconfigured_tier,
            {"is_valid": True, "total_weight_kg": 50, "total_cft": 10, "min_vehicle_class": "truck"}
        )
        self.assertFalse(is_fit)
        self.assertIn("unconfigured", reason.lower())

        # recommend_vehicles_for_cargo must filter out unconfigured tiers
        recs = recommend_vehicles_for_cargo(
            {"is_valid": True, "total_weight_kg": 50, "total_cft": 10, "min_vehicle_class": "truck"},
            city="Hosur"
        )
        suitable_ids = [t["id"] for t in recs["suitable_tiers"]]
        self.assertNotIn(unconfigured_tier.id, suitable_ids)

    # 10. Expired or missing GT quote rejection
    def test_expired_or_missing_quote_rejected(self):
        """Missing or expired quote in verify and resolve_logistics_fare_v2 raises error."""
        # Non-existent quote_id
        is_val, _, err = verify_packers_movers_quote("PMQ-EXPIRED-999")
        self.assertFalse(is_val)
        self.assertIn("expired or is invalid", err.lower())

        # Direct resolve_logistics_fare_v2 raises UnresolvedLogisticsFareError
        with self.assertRaises(UnresolvedLogisticsFareError):
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount="1500.00",
                cart_data={"quote_id": "PMQ-DOES-NOT-EXIST"},
            )

    # 11. Multi-City Pricing Isolation: City A vs City B
    @patch("service_requests.services.routing.get_route_eta")
    def test_multi_city_pricing_divergence(self, mock_route):
        """City A rates do not leak into City B rates; each city uses strictly its own config."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        # Configure Bangalore with higher rates
        PackersMoversConfig.objects.create(
            city="Bangalore",
            standard_packing_rate_cft=Decimal("15.00"),  # Hosur is 7.00
            premium_packing_rate_cft=Decimal("25.00"),
            floor_rate_no_lift_per_100cft=Decimal("250.00"),  # Hosur is 150.00
            unpacking_rate_cft=Decimal("8.00"),
            gst_rate=Decimal("0.1800"),
            survey_cft_threshold=600.0,
        )
        tier_blr = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Bangalore",
            slug=f"pm-tata-ace-blr-{uuid.uuid4().hex[:4]}",
            name="Mini Truck (Tata Ace) BLR",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1500.00"),
            base_fare=Decimal("1200.00"),
            per_km_rate=Decimal("25.00"),
            free_km=Decimal("3.00"),
            loading_unloading_charge=Decimal("400.00"),
            additional_stop_charge=Decimal("150.00"),
            minimum_fare=Decimal("1500.00"),
            max_weight_kg=Decimal("750.00"),
            max_cft=Decimal("150.00"),
            order=1,
            is_active=True,
        )

        inventory = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        # Quote Hosur
        quote_hosur = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inventory,
            packing_tier="standard",
        )
        # Quote Bangalore
        quote_blr = compute_packers_movers_quote(
            pickup_lat=12.971, pickup_lng=77.594,
            drop_lat=13.035, drop_lng=77.597,
            city="Bangalore",
            service_tier_id=tier_blr.id,
            inventory=inventory,
            packing_tier="standard",
        )

        # Packing charge in Hosur: 50 CFT * 7.00 = 350.00
        # Packing charge in BLR: 50 CFT * 15.00 = 750.00
        self.assertEqual(quote_hosur["pricing"]["packing_rate_per_cft"], "7.00")
        self.assertEqual(quote_blr["pricing"]["packing_rate_per_cft"], "15.00")
        self.assertNotEqual(quote_hosur["total"], quote_blr["total"])

    # 12. Cryptographic signature token validation and tampering rejection
    @patch("service_requests.services.routing.get_route_eta")
    def test_cryptographic_signature_tampering_rejected(self, mock_route):
        """Tampering with signature token or cached data causes cryptographic validation failure."""
        mock_route.return_value = {
            "distance_km": 8.0,
            "duration_minutes": 20,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        quote_id = quote["quote_id"]
        cache_key = f"pm_quote_{quote_id}"
        cached_data = cache.get(cache_key)

        # Corrupt the signature token in the cache
        cached_data["signature_token"] = "corrupted_bad_signature_token"
        cache.set(cache_key, cached_data, timeout=1800)

        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=quote["total"])
        self.assertFalse(is_val)
        self.assertIn("cryptographic quote signature verification failed", err.lower())

    # 13. Quote Expiration Horizon: 30-min Instant vs 48-hr Survey Estimate
    @patch("service_requests.services.routing.get_route_eta")
    def test_quote_expiration_horizon_differentiation(self, mock_route):
        """Instant bookable quotes have ~30 min validity; survey estimates have ~48 hr validity."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        # 1. Authoritative Instant Quote
        instant_quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        self.assertTrue(instant_quote["is_authoritative"])
        self.assertEqual(instant_quote["survey_status"], "INSTANT_ESTIMATE_APPROVED")
        valid_until_instant = timezone.datetime.fromisoformat(instant_quote["valid_until"])
        delta_instant = valid_until_instant - timezone.now()
        self.assertTrue(25 <= (delta_instant.total_seconds() / 60) <= 35)

        # 2. Survey Required Estimate (e.g. uncataloged item)
        survey_quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"name": "Mysterious Custom Sculpted Artifact", "quantity": 1}],
        )
        self.assertFalse(survey_quote["is_authoritative"])
        self.assertTrue(survey_quote["requires_survey"] or survey_quote["requires_review"])
        valid_until_survey = timezone.datetime.fromisoformat(survey_quote["valid_until"])
        delta_survey = valid_until_survey - timezone.now()
        self.assertTrue(46 <= (delta_survey.total_seconds() / 3600) <= 50)

    # 14. Wrong-city and inactive tier rejection
    def test_wrong_city_or_inactive_tier_rejected(self):
        """Requesting tier from another city or inactive tier fails."""
        inactive_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-inactive-{uuid.uuid4().hex[:4]}",
            name="Inactive Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1500.00"),
            is_active=False,
        )
        payload = {
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "city": "Hosur",
            "service_tier_id": inactive_tier.id,
            "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        }
        res = self.client.post("/api/logistics/packers-movers/quote/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "TIER_NOT_FOUND")

    # 15. Inactive GoodsItem is not treated as active catalog item
    def test_inactive_goods_item_rejected(self):
        """Inactive GoodsItem does not match as a known active catalog item."""
        inactive_item = GoodsItem.objects.create(
            category=self.cat_bedroom,
            name="Retired Vintage Wardrobe",
            slug=f"retired-wardrobe-{uuid.uuid4().hex[:4]}",
            default_cft=Decimal("30.0"),
            default_weight_kg=Decimal("35.0"),
            is_active=False,
        )
        meta = match_catalog_item("", goods_item_id=inactive_item.id)
        self.assertFalse(meta["is_known"])
        self.assertTrue(meta["requires_review"])

    # 16. Selected Tier Capacity Exceeded fails with VEHICLE_CAPACITY_EXCEEDED
    def test_selected_tier_capacity_exceeded_rejected(self):
        """Selecting a tier smaller than cargo volume returns HTTP 400 VEHICLE_CAPACITY_EXCEEDED."""
        payload = {
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "city": "Hosur",
            "service_tier_id": self.tier_truck_1.id,  # max_cft = 150.00
            "inventory": [
                {"goods_item_id": self.item_double_bed.id, "quantity": 4}  # 4 * 50 = 200 CFT
            ],
        }
        res = self.client.post("/api/logistics/packers-movers/quote/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data.get("code"), "VEHICLE_CAPACITY_EXCEEDED")

    # 17. P0-1: Missing City Config fails closed without hardcoded fallback rates
    def test_missing_city_config_fails_closed_no_hardcoded_rates(self):
        """Missing PackersMoversConfig returns no authoritative price and zero hardcoded rates."""
        quote = compute_packers_movers_quote(
            pickup_lat=11.664, pickup_lng=78.146,
            drop_lat=11.700, drop_lng=78.200,
            city="Salem",  # Unconfigured city
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        self.assertTrue(quote["city_config_missing"])
        self.assertFalse(quote["is_authoritative"])
        self.assertTrue(quote["requires_survey"])
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")
        self.assertIsNone(quote["total"])
        self.assertIsNone(quote["subtotal"])
        self.assertIsNone(quote["pricing"]["total"])
        self.assertIsNone(quote["pricing"]["subtotal"])

        # Prove hardcoded rates (3.50, 6.00, 200.00, 120.00, 2.00, 0.1800) are NOT used
        self.assertIsNone(quote["pricing"]["packing_rate_per_cft"])
        self.assertIsNone(quote["pricing"]["packing_charge"])
        self.assertIsNone(quote["pricing"]["gst_amount"])
        self.assertIsNone(quote["pricing"]["floor_labor_charge"])

        # Also verify API endpoint returns null total
        res = self.client.post("/api/logistics/packers-movers/quote/", {
            "pickup_lat": 11.664, "pickup_lng": 78.146,
            "drop_lat": 11.700, "drop_lng": 78.200,
            "city": "Salem",
            "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        }, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data["data"]["quotable"])
        self.assertTrue(res.data["data"]["requires_survey"])
        self.assertIsNone(res.data["data"]["total"])

    # 18. P0-2: Dual CFT and Weight vehicle fitment checks
    def test_pm_dual_cft_and_weight_fitment(self):
        """Vehicle recommendation strictly checks BOTH total_cft and total_weight_kg."""
        # Tier 1: max_cft = 150.00, max_weight_kg = 750.00
        # Tier 2: max_cft = 450.00, max_weight_kg = 2000.00

        # Case 1: CFT fits (100) + Weight fits (500) -> Tier 1
        rec1 = recommend_vehicle_for_volume(100.0, weight_kg=500.0, city="Hosur")
        self.assertIsNotNone(rec1)
        self.assertEqual(rec1["tier_id"], self.tier_truck_1.id)

        # Case 2: CFT fits (100) + Weight exceeds (800 > 750) -> Rejected for Tier 1, upgraded to Tier 2
        rec2 = recommend_vehicle_for_volume(100.0, weight_kg=800.0, city="Hosur")
        self.assertIsNotNone(rec2)
        self.assertEqual(rec2["tier_id"], self.tier_truck_2.id)

        # Case 3: CFT exceeds (200 > 150) + Weight fits (500 <= 750) -> Rejected for Tier 1, upgraded to Tier 2
        rec3 = recommend_vehicle_for_volume(200.0, weight_kg=500.0, city="Hosur")
        self.assertIsNotNone(rec3)
        self.assertEqual(rec3["tier_id"], self.tier_truck_2.id)

        # Case 4: Both exceed (CFT = 600 > 450, Weight = 3000 > 2000) -> None
        rec4 = recommend_vehicle_for_volume(600.0, weight_kg=3000.0, city="Hosur")
        self.assertIsNone(rec4)

        # Case 5: When specific service_tier_id is requested, weight exceed fails closed without silent upgrade
        rec_specific = recommend_vehicle_for_volume(100.0, weight_kg=800.0, city="Hosur", service_tier_id=self.tier_truck_1.id)
        self.assertIsNone(rec_specific)

        # Case 6: Changing DB max_weight_kg changes recommendation
        self.tier_truck_1.max_weight_kg = Decimal("1000.00")
        self.tier_truck_1.save()
        rec_updated = recommend_vehicle_for_volume(100.0, weight_kg=800.0, city="Hosur", service_tier_id=self.tier_truck_1.id)
        self.assertIsNotNone(rec_updated)
        self.assertEqual(rec_updated["tier_id"], self.tier_truck_1.id)

    # 19. P0-3: Unknown items receive no fake dimensions and prevent instant booking
    def test_unknown_items_no_fake_dimensions_and_survey_required(self):
        """Unknown items get 0.0 CFT, 0.0 KG and dims_source='unavailable'."""
        metrics = calculate_inventory_metrics([{"name": "Mysterious Custom Statue", "quantity": 1}])
        self.assertEqual(metrics["items"][0]["unit_cft"], 0.0)
        self.assertEqual(metrics["items"][0]["unit_weight_kg"], 0.0)
        self.assertEqual(metrics["items"][0]["dims_source"], "unavailable")
        self.assertTrue(metrics["requires_review"])
        self.assertTrue(metrics["has_uncataloged"])

        # In quote computation, unknown items produce non-authoritative survey required with total=None
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"name": "Mysterious Custom Statue", "quantity": 1}],
        )
        self.assertFalse(quote["is_authoritative"])
        self.assertTrue(quote["requires_review"])
        self.assertEqual(quote["survey_status"], "MANUAL_REVIEW_REQUIRED")
        self.assertIsNone(quote["total"])
        self.assertIsNone(quote["subtotal"])

        # Known DB GoodsItem still uses DB values
        known_metrics = calculate_inventory_metrics([{"goods_item_id": self.item_double_bed.id, "quantity": 1}])
        self.assertEqual(known_metrics["items"][0]["unit_cft"], 50.0)
        self.assertEqual(known_metrics["items"][0]["unit_weight_kg"], 60.0)
        self.assertEqual(known_metrics["items"][0]["dims_source"], "database")
        self.assertFalse(known_metrics["has_uncataloged"])

    # 20. P1-4: Crew size DB representation and zero pricing authority
    @patch("service_requests.services.routing.get_route_eta")
    def test_crew_size_db_representation_and_zero_pricing_authority(self, mock_route):
        """ServiceTier.crew_size is in DB and changing it alters display without changing fare."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        self.tier_truck_1.crew_size = 4
        self.tier_truck_1.save()

        inventory = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote1 = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inventory,
        )
        self.assertEqual(quote1["vehicle"]["crew_size"], 4)
        fare1 = quote1["total"]

        # Change DB crew_size to 6
        self.tier_truck_1.crew_size = 6
        self.tier_truck_1.save()
        quote2 = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inventory,
        )
        self.assertEqual(quote2["vehicle"]["crew_size"], 6)
        fare2 = quote2["total"]

        # Fares must be completely identical (proven zero pricing authority)
        self.assertEqual(fare1, fare2)

    # 21. P1-6: Unconfigured vehicle class fails closed
    def test_unconfigured_vehicle_class_fails_closed(self):
        """ServiceTier with unconfigured vehicle_class cannot pass vehicle fitment."""
        unconfigured_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"gt-unconfigured-{uuid.uuid4().hex[:4]}",
            name="Unconfigured Vehicle",
            vehicle_class="",  # empty/unconfigured
            starting_price=Decimal("500.00"),
            max_weight_kg=Decimal("500.00"),
            max_cft=Decimal("50.00"),
            order=99,
            is_active=True,
        )
        self.assertEqual(get_tier_class_rank(unconfigured_tier), 0)
        fitment_ok, reason = evaluate_vehicle_fitment(
            unconfigured_tier,
            {"is_valid": True, "total_catalog_weight_kg": Decimal("100.00"), "total_cft": Decimal("10.00")}
        )
        self.assertFalse(fitment_ok)
        self.assertIn("unconfigured or invalid", reason.lower())

    # 22. P1-7: Fallback recalculation cannot replace selected vehicle tier
    @patch("service_requests.services.routing.get_route_eta")
    def test_pm_fallback_recalculation_lockdown_and_rejection(self, mock_route):
        """Fallback recalculation uses exact selected tier and rejects silent vehicle upgrades."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        # Cargo fits Tier 1
        inventory_fits = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        fare, breakdown = resolve_logistics_fare_v2(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_1,
            logistics_lane=None,
            submitted_amount=None,
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data={"inventory": inventory_fits, "city": "Hosur"},
        )
        self.assertIsNotNone(fare)
        self.assertEqual(breakdown["tier_id"], self.tier_truck_1.id)

        # Cargo exceeds Tier 1 (4 beds = 200 CFT > 150 CFT): Fallback recalculation MUST fail closed,
        # never silently replacing Tier 1 with Tier 2!
        inventory_exceeds = [{"goods_item_id": self.item_double_bed.id, "quantity": 4}]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount=None,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data={"inventory": inventory_exceeds, "city": "Hosur"},
            )
        self.assertIn("survey/review", str(ctx.exception).lower())

        # Fallback recalculation without tier_id and without quote_id fails closed
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=None,
                logistics_lane=None,
                submitted_amount=None,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data={"inventory": inventory_fits, "city": "Hosur"},
            )
        self.assertIn("selected servicetier or verified quote_id", str(ctx.exception).lower())

    # 23. P1-8: Quote input validation is fail-closed on missing fields
    @patch("service_requests.services.routing.get_route_eta")
    def test_verify_quote_fail_closed_on_missing_fields(self, mock_route):
        """verify_packers_movers_quote rejects if any mandatory booking field is missing."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        # Missing tier_id
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={"city": "Hosur", "relocation_type": "Within City", "pickup_lat": 12.734, "pickup_lng": 77.828, "drop_lat": 12.850, "drop_lng": 77.780, "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]}
        )
        self.assertFalse(is_val)
        self.assertIn("missing tier_id", err.lower())

        # Missing city
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={"tier_id": self.tier_truck_1.id, "relocation_type": "Within City", "pickup_lat": 12.734, "pickup_lng": 77.828, "drop_lat": 12.850, "drop_lng": 77.780, "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]}
        )
        self.assertFalse(is_val)
        self.assertIn("missing city", err.lower())

        # Missing route coordinates
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={"tier_id": self.tier_truck_1.id, "city": "Hosur", "relocation_type": "Within City", "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]}
        )
        self.assertFalse(is_val)
        self.assertIn("missing route coordinates", err.lower())

        # Missing relocation_type
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={"tier_id": self.tier_truck_1.id, "city": "Hosur", "pickup_lat": 12.734, "pickup_lng": 77.828, "drop_lat": 12.850, "drop_lng": 77.780, "inventory": [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]}
        )
        self.assertFalse(is_val)
        self.assertIn("missing relocation_type", err.lower())

        # Missing inventory
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={"tier_id": self.tier_truck_1.id, "city": "Hosur", "relocation_type": "Within City", "pickup_lat": 12.734, "pickup_lng": 77.828, "drop_lat": 12.850, "drop_lng": 77.780}
        )
        self.assertFalse(is_val)
        self.assertIn("missing inventory", err.lower())

    # 24. P1-9: Quote signature binds pricing configuration fingerprint and rejects post-quote config mutation
    @patch("service_requests.services.routing.get_route_eta")
    def test_pricing_config_mutation_after_quote_rejected(self, mock_route):
        """Mutating PackersMoversConfig or ServiceTier after quotation invalidates the quote."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        full_req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "relocation_type": "Within City",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inv,
        }

        # 1. Verification succeeds before mutation
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=full_req)
        self.assertTrue(is_val, err)

        # 2. Mutate PackersMoversConfig in DB
        self.pm_config_hosur.standard_packing_rate_cft = Decimal("19.00")
        self.pm_config_hosur.save()

        # Quote verification must reject due to fingerprint mismatch
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=full_req)
        self.assertFalse(is_val)
        self.assertIn("have been updated", err.lower())

        # Restore PM config and mutate ServiceTier base_fare
        self.pm_config_hosur.standard_packing_rate_cft = Decimal("7.00")
        self.pm_config_hosur.save()
        self.tier_truck_1.base_fare = Decimal("2500.00")
        self.tier_truck_1.save()

        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=full_req)
        self.assertFalse(is_val)
        self.assertIn("have been updated", err.lower())

    # 25. P1-10: Complete Admin -> Customer P&M Flow Propagation
    @patch("service_requests.services.routing.get_route_eta")
    def test_admin_to_customer_complete_propagation(self, mock_route):
        """Admin changes to GoodsItem, ServiceTier, and PackersMoversConfig propagate directly to customer endpoints."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        # 1. Admin creates a P&M Category & GoodsItem
        pm_cat = GoodsCategory.objects.create(
            name="Living Room Furniture",
            slug=f"pm-living-room-{uuid.uuid4().hex[:4]}",
            is_active=True,
            order=1,
        )
        custom_item = GoodsItem.objects.create(
            category=pm_cat,
            name="Solid Teak 3-Seater Sofa",
            slug=f"pm-teak-sofa-{uuid.uuid4().hex[:4]}",
            default_cft=Decimal("60.0"),
            default_weight_kg=Decimal("70.0"),
            is_active=True,
            order=1,
        )

        # 2. Customer inventory endpoint returns this item
        res_inv = self.client.get("/api/logistics/packers-movers/inventory/")
        self.assertEqual(res_inv.status_code, 200)
        categories = res_inv.data["data"].get("categories", [])
        found_cat = next((c for c in categories if c["id"] == pm_cat.id), None)
        self.assertIsNotNone(found_cat)
        found_item = next((it for it in found_cat["items"] if it["id"] == custom_item.id), None)
        self.assertIsNotNone(found_item)
        self.assertEqual(float(found_item["cft"]), 60.0)
        self.assertEqual(float(found_item["weight_kg"]), 70.0)

        # 3. Customer quotes with this goods_item_id
        quote1 = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": custom_item.id, "quantity": 1}],
        )
        self.assertEqual(quote1["inventory_summary"]["total_cft"], 60.0)
        self.assertEqual(quote1["inventory_summary"]["total_weight_kg"], 70.0)
        initial_fare = quote1["total"]

        # 4. Admin updates Hosur PackersMoversConfig
        self.pm_config_hosur.standard_packing_rate_cft = Decimal("14.00")  # doubled
        self.pm_config_hosur.save()

        # Hosur quote changes
        quote2 = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": custom_item.id, "quantity": 1}],
        )
        self.assertNotEqual(initial_fare, quote2["total"])
        self.assertEqual(quote2["pricing"]["packing_rate_per_cft"], "14.00")

        # 5. Admin updates Bangalore config; Hosur quote does NOT change
        PackersMoversConfig.objects.update_or_create(
            city="Bangalore",
            defaults={"standard_packing_rate_cft": Decimal("99.00")}
        )
        quote3 = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": custom_item.id, "quantity": 1}],
        )
        self.assertEqual(quote2["total"], quote3["total"])
        self.assertEqual(quote3["pricing"]["packing_rate_per_cft"], "14.00")

    # 26. Micro-Correction 1: GoodsItem capacity fails closed on NULL/zero
    def test_goods_item_capacity_fail_closed(self):
        """Unconfigured or zero GoodsItem dimensions require review/survey, preventing instant quote."""
        uid = uuid.uuid4().hex[:6]
        # DB CFT = NULL (mocked DB record)
        item_null_cft = GoodsItem(
            id=99991,
            category=self.cat_bedroom,
            name=f"Null CFT Item {uid}",
            slug=f"null-cft-{uid}",
            default_cft=None,
            default_weight_kg=Decimal("20.0"),
            is_active=True,
        )
        with patch.object(GoodsItem.objects, "filter") as mock_filter:
            mock_filter.return_value.select_related.return_value.first.return_value = item_null_cft
            meta1 = match_catalog_item("", goods_item_id=item_null_cft.id)
            self.assertFalse(meta1["is_known"])
            self.assertTrue(meta1["requires_review"])
            self.assertEqual(meta1["source"], "database_unconfigured")

        # DB weight = NULL (mocked DB record)
        item_null_wt = GoodsItem(
            id=99992,
            category=self.cat_bedroom,
            name=f"Null Weight Item {uid}",
            slug=f"null-weight-{uid}",
            default_cft=Decimal("15.0"),
            default_weight_kg=None,
            is_active=True,
        )
        with patch.object(GoodsItem.objects, "filter") as mock_filter:
            mock_filter.return_value.select_related.return_value.first.return_value = item_null_wt
            meta2 = match_catalog_item("", goods_item_id=item_null_wt.id)
            self.assertFalse(meta2["is_known"])
            self.assertTrue(meta2["requires_review"])
            self.assertEqual(meta2["source"], "database_unconfigured")

        # DB CFT = 0 (Real DB record)
        item_zero_cft = GoodsItem.objects.create(
            category=self.cat_bedroom,
            name=f"Zero CFT Item {uid}",
            slug=f"zero-cft-{uid}",
            default_cft=Decimal("0.0"),
            default_weight_kg=Decimal("20.0"),
            is_active=True,
        )
        meta3 = match_catalog_item("", goods_item_id=item_zero_cft.id)
        self.assertFalse(meta3["is_known"])
        self.assertTrue(meta3["requires_review"])
        self.assertEqual(meta3["source"], "database_unconfigured")

        # DB weight = 0 (Real DB record)
        item_zero_wt = GoodsItem.objects.create(
            category=self.cat_bedroom,
            name=f"Zero Weight Item {uid}",
            slug=f"zero-weight-{uid}",
            default_cft=Decimal("15.0"),
            default_weight_kg=Decimal("0.0"),
            is_active=True,
        )
        meta4 = match_catalog_item("", goods_item_id=item_zero_wt.id)
        self.assertFalse(meta4["is_known"])
        self.assertTrue(meta4["requires_review"])
        self.assertEqual(meta4["source"], "database_unconfigured")

        # Valid DB CFT/weight -> normal instant quote
        quote_valid = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 1}],
        )
        self.assertTrue(quote_valid["is_authoritative"])
        self.assertIsNotNone(quote_valid["total"])

        # Unconfigured item in quote -> total is None, survey required
        quote_unconfigured = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[{"goods_item_id": item_zero_cft.id, "quantity": 1}],
        )
        self.assertFalse(quote_unconfigured["is_authoritative"])
        self.assertTrue(quote_unconfigured["requires_review"])
        self.assertIsNone(quote_unconfigured["total"])
        self.assertEqual(quote_unconfigured["survey_status"], "MANUAL_REVIEW_REQUIRED")

    # 27. Micro-Correction 2: P&M selected tier must strictly have category='packers_movers'
    def test_pm_selected_tier_category_validation(self):
        """Submitting a truck/2-wheeler tier ID to P&M quote fails closed."""
        truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"gt-truck-{uuid.uuid4().hex[:4]}",
            name="Hosur Freight Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("800.00"),
            max_cft=Decimal("300.00"),
            max_weight_kg=Decimal("1500.00"),
            is_active=True,
        )
        # Supplying truck tier to P&M vehicle recommendation must reject
        rec = recommend_vehicle_for_volume(50.0, weight_kg=100.0, city="Hosur", service_tier_id=truck_tier.id)
        self.assertIsNone(rec)

        # Inactive P&M tier rejected
        inactive_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-inactive-{uuid.uuid4().hex[:4]}",
            name="Inactive Tier",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1000.00"),
            max_cft=Decimal("300.00"),
            max_weight_kg=Decimal("1500.00"),
            is_active=False,
        )
        self.assertIsNone(recommend_vehicle_for_volume(50.0, weight_kg=100.0, city="Hosur", service_tier_id=inactive_tier.id))

        # Wrong city tier rejected
        wrong_city_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Chennai",
            slug=f"pm-chennai-{uuid.uuid4().hex[:4]}",
            name="Chennai Tier",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1000.00"),
            max_cft=Decimal("300.00"),
            max_weight_kg=Decimal("1500.00"),
            is_active=True,
        )
        self.assertIsNone(recommend_vehicle_for_volume(50.0, weight_kg=100.0, city="Hosur", service_tier_id=wrong_city_tier.id))

        # Zero capacity tier rejected
        zero_cap_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug=f"pm-zero-cap-{uuid.uuid4().hex[:4]}",
            name="Zero Cap Tier",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1000.00"),
            max_cft=Decimal("0.00"),
            max_weight_kg=Decimal("0.00"),
            is_active=True,
        )
        self.assertIsNone(recommend_vehicle_for_volume(50.0, weight_kg=100.0, city="Hosur", service_tier_id=zero_cap_tier.id))

        # Insufficient CFT rejected
        self.assertIsNone(recommend_vehicle_for_volume(200.0, weight_kg=100.0, city="Hosur", service_tier_id=self.tier_truck_1.id))

        # Insufficient weight rejected
        self.assertIsNone(recommend_vehicle_for_volume(50.0, weight_kg=900.0, city="Hosur", service_tier_id=self.tier_truck_1.id))

    # 28. Micro-Correction 3: No vehicle available must NEVER look like a ₹0 quote
    def test_no_vehicle_available_never_produces_zero_fare(self):
        """When volume/weight exceeds all available vehicles, total and all fee components are None, never ₹0."""
        # Extremely huge volume (10,000 CFT)
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            inventory=[{"goods_item_id": self.item_double_bed.id, "quantity": 200}],
        )
        self.assertIsNone(quote["total"])
        self.assertIsNone(quote["subtotal"])
        self.assertIsNone(quote["pricing"]["transport_total"])
        self.assertIsNone(quote["pricing"]["transport_base_fare"])
        self.assertIsNone(quote["pricing"]["transport_distance_charge"])
        self.assertIsNone(quote["pricing"]["labor_total"])
        self.assertIsNone(quote["pricing"]["packing_charge"])
        self.assertIsNone(quote["pricing"]["gst_amount"])
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")
        self.assertTrue(quote["requires_survey"])
        self.assertFalse(quote["is_authoritative"])
        self.assertTrue(quote["is_estimate"])
        self.assertIn("exceeds available vehicle capacity", quote["estimate_notice"].lower())

    # 29. Micro-Correction 4: Bind quote to authoritative GoodsItem DB data and reject post-quote mutation
    @patch("service_requests.services.routing.get_route_eta")
    def test_goods_item_mutation_after_quote_rejected(self, mock_route):
        """Mutating GoodsItem dimensions/pricing in DB after quote invalidates the quote."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "relocation_type": "Within City",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inv,
        }
        # Initially valid
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=req)
        self.assertTrue(is_val, err)

        # Mutate GoodsItem default_cft in DB
        self.item_double_bed.default_cft = Decimal("75.0")
        self.item_double_bed.save()

        # Quote verification rejects due to fingerprint mismatch
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=req)
        self.assertFalse(is_val)
        self.assertIn("pricing configuration or catalog dimensions have been updated", err.lower())

    # 30. Micro-Correction 5: Relocation type explicit verification
    @patch("service_requests.services.routing.get_route_eta")
    def test_relocation_type_explicit_verification(self, mock_route):
        """Missing or mutated relocation_type rejects the quote."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_minutes": 25,
            "distance_source": "google_maps_road_distance",
            "is_authoritative": True,
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
            relocation_type="Within City",
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        base_req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inv,
        }

        # 1. Missing relocation_type -> Fails closed
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=base_req)
        self.assertFalse(is_val)
        self.assertIn("missing relocation_type", err.lower())

        # 2. Mutated relocation_type -> Rejected
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "relocation_type": "Between Cities"}
        )
        self.assertFalse(is_val)
        self.assertIn("quote relocation type mismatch", err.lower())

        # 3. Matching relocation_type -> Valid
        is_val, _, err = verify_packers_movers_quote(
            quote_id, submitted_total=total,
            current_request={**base_req, "relocation_type": "Within City"}
        )
        self.assertTrue(is_val, err)

    # 31. P0-1: P&M quote verification must fail closed on pricing fingerprint errors
    @patch("service_requests.services.routing.get_route_eta")
    def test_p0_1_pm_quote_verification_fails_closed_on_pricing_fingerprint_errors(self, mock_route):
        """Pricing fingerprint verification exception must fail closed and reject quote."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "distance_source": "google_maps",
            "is_authoritative": True,
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
            relocation_type="Within City",
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inv,
            "relocation_type": "Within City",
        }

        # Mock PackersMoversConfig.objects.filter to raise an unexpected DB/fingerprint exception
        with patch("logistics.models.PackersMoversConfig.objects.filter", side_effect=RuntimeError("Simulated DB integrity failure")):
            is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=req)
            self.assertFalse(is_val)
            self.assertIn("unable to verify quote pricing integrity", err.lower())

    # 32. P0-2: P&M quote expiry verification must fail closed
    @patch("service_requests.services.routing.get_route_eta")
    def test_p0_2_pm_quote_expiry_fails_closed_on_malformed_timestamp(self, mock_route):
        """Malformed valid_until timestamp in quote cache must fail closed."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "distance_source": "google_maps",
            "is_authoritative": True,
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
            relocation_type="Within City",
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        # Corrupt valid_until in cache
        cached = cache.get(f"pm_quote_{quote_id}")
        cached["valid_until"] = "MALFORMED_TIMESTAMP_NOT_ISO"
        cache.set(f"pm_quote_{quote_id}", cached, timeout=900)

        req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "pickup_lat": 12.734,
            "pickup_lng": 77.828,
            "drop_lat": 12.850,
            "drop_lng": 77.780,
            "inventory": inv,
            "relocation_type": "Within City",
        }
        is_val, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=req)
        self.assertFalse(is_val)
        self.assertIn("quote expiry could not be verified", err.lower())

    # 33. P0-3: Remove all remaining arbitrary P&M distance fallbacks
    @patch("service_requests.services.routing.get_route_eta")
    def test_p0_3_pm_routing_missing_distance_uses_genuine_haversine_no_fake_constants(self, mock_route):
        """Routing returning missing distance_km must calculate genuine Haversine with 1.25 winding, not 5.0."""
        mock_route.return_value = {
            "distance_km": None,
            "source": "unknown",
        }
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=inv,
            relocation_type="Within City",
        )
        # Haversine distance between (12.734, 77.828) and (12.850, 77.780) is ~13.9 km. With 1.25 factor, ~17.4 km.
        dist = float(quote["distance_km"])
        self.assertNotEqual(dist, 5.0, "Must not use fake 5.0 km constant")
        self.assertNotEqual(dist, 8.50, "Must not use fake 8.50 km constant")
        self.assertGreater(dist, 14.0)
        self.assertLess(dist, 20.0)
        self.assertTrue(quote["is_estimate"])
        self.assertEqual(quote["distance_source"], "straight_line_estimate")

    # 34. P0-4: P&M quote API must accept only packers_movers service tiers
    def test_p0_4_pm_quote_api_rejects_non_packers_movers_tiers_with_tier_category_mismatch(self):
        """POST /api/logistics/packers-movers/quote/ must reject truck tiers with TIER_CATEGORY_MISMATCH."""
        truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"truck-only-{uuid.uuid4().hex[:6]}",
            name="Freight Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("2000.00"),
            base_fare=Decimal("1500.00"),
            per_km_rate=Decimal("30.00"),
            free_km=Decimal("5.00"),
            max_cft=Decimal("500.0"),
            max_weight_kg=Decimal("1500.0"),
            is_active=True,
        )
        inv = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        payload = {
            "pickup_latitude": 12.734,
            "pickup_longitude": 77.828,
            "drop_latitude": 12.850,
            "drop_longitude": 77.780,
            "city": "Hosur",
            "selected_tier_id": truck_tier.id,
            "inventory": inv,
            "relocation_type": "Within City",
        }
        res = self.client.post("/api/logistics/packers-movers/quote/", payload, format="json")
        self.assertEqual(res.status_code, 400)
        data = res.json()
        self.assertEqual(data.get("code") or data.get("error_code"), "TIER_CATEGORY_MISMATCH")

    # 35. P1-1: Remove / configure the hardcoded 30 CFT minimum
    @patch("service_requests.services.routing.get_route_eta")
    def test_p1_1_pm_empty_inventory_requires_survey_no_hardcoded_30_cft(self, mock_route):
        """Empty inventory must not inject a fake 30 CFT floor; requires survey with total=None."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "distance_source": "google_maps",
            "is_authoritative": True,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            inventory=[],
            relocation_type="Within City",
        )
        self.assertEqual(quote["inventory_summary"]["effective_cft"], 0.0)
        self.assertIsNone(quote["total"])
        self.assertTrue(quote["requires_survey"])
        self.assertTrue(quote["requires_review"])
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")
        self.assertIn("zero-volume", quote["estimate_notice"].lower())

    # 36. P1-2: Inventory API must not invent dimensions
    def test_p1_2_pm_inventory_api_unconfigured_dimensions_returns_null_and_configured_false(self):
        """GET /api/logistics/packers-movers/inventory/ returns cft: null, weight_kg: null, configured: false for unconfigured items."""
        pm_cat = GoodsCategory.objects.create(
            name="PM Miscellaneous",
            slug=f"pm-misc-{uuid.uuid4().hex[:6]}",
            allows_two_wheeler=False,
            is_active=True,
        )
        unconf_item = GoodsItem.objects.create(
            category=pm_cat,
            name="Custom Unmeasured Sculpture",
            slug=f"unmeasured-sculpture-{uuid.uuid4().hex[:6]}",
            default_cft=Decimal("0.00"),
            default_weight_kg=Decimal("0.00"),
            is_active=True,
        )
        conf_item = GoodsItem.objects.create(
            category=pm_cat,
            name="Measured Coffee Table",
            slug=f"measured-coffee-table-{uuid.uuid4().hex[:6]}",
            default_cft=Decimal("15.0"),
            default_weight_kg=Decimal("20.0"),
            is_active=True,
        )
        res = self.client.get("/api/logistics/packers-movers/inventory/")
        self.assertEqual(res.status_code, 200)
        categories = res.json().get("data", {}).get("categories", [])
        target_cat = next((c for c in categories if c["id"] == pm_cat.id), None)
        self.assertIsNotNone(target_cat)
        
        unconf_payload = next((it for it in target_cat["items"] if it["id"] == unconf_item.id), None)
        self.assertIsNotNone(unconf_payload)
        self.assertIsNone(unconf_payload["cft"])
        self.assertIsNone(unconf_payload["weight_kg"])
        self.assertFalse(unconf_payload["configured"])

        conf_payload = next((it for it in target_cat["items"] if it["id"] == conf_item.id), None)
        self.assertIsNotNone(conf_payload)
        self.assertEqual(conf_payload["cft"], 15.0)
        self.assertEqual(conf_payload["weight_kg"], 20.0)
        self.assertTrue(conf_payload["configured"])

    # 37. P1-4: Standard GT cargo quote identity must bind authoritative data
    @patch("service_requests.services.routing.get_route_eta")
    def test_p1_4_gt_quote_cargo_identity_binds_authoritative_goods_item_attributes(self, mock_route):
        """Mutating a GoodsItem's authoritative DB attributes post-quote invalidates GT quote."""
        from service_requests.services.logistics_pricing import quote_logistics_fare
        from service_requests.services.cargo_fitment import resolve_cargo_payload

        mock_route.return_value = {
            "distance_km": 10.0,
            "source": "google_maps",
        }
        # Create a GT truck tier
        truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"gt-truck-{uuid.uuid4().hex[:6]}",
            name="Cargo Ace",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1200.00"),
            base_fare=Decimal("1000.00"),
            per_km_rate=Decimal("20.00"),
            free_km=Decimal("2.00"),
            max_cft=Decimal("400.0"),
            max_weight_kg=Decimal("1000.0"),
            is_active=True,
        )
        cart_items = [{"goods_item_id": self.item_double_bed.id, "quantity": 1}]
        cargo_summary = resolve_cargo_payload(cargo_items=cart_items, city="Hosur")

        breakdown = quote_logistics_fare(
            tier=truck_tier,
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cargo_summary=cargo_summary,
        )
        quote_id = breakdown["quote_id"]
        quote_hash = breakdown["quote_hash"]
        quoted_total = breakdown["total"]

        cart_data = [{
            "quote_id": quote_id,
            "quote_hash": quote_hash,
            "cargo_items": cart_items,
        }]

        # 1. Verification succeeds initially
        fare, res_bd = resolve_logistics_fare_v2(
            service_category="goods_transport_truck",
            logistics_tier=truck_tier,
            logistics_lane=None,
            submitted_amount=quoted_total,
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data=cart_data,
        )
        self.assertEqual(fare, quoted_total)

        # 2. Mutate GoodsItem authoritative default_cft in DB
        self.item_double_bed.default_cft = Decimal("95.0")
        self.item_double_bed.save()

        # 3. Post-quote GoodsItem mutation MUST be rejected
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=truck_tier,
                logistics_lane=None,
                submitted_amount=quoted_total,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_data,
            )
        self.assertIn("cargo mismatch", str(ctx.exception).lower())

    # 38. P1-5: Two-wheeler capacity lookup must not leak across cities
    def test_p1_5_two_wheeler_capacity_does_not_leak_across_cities(self):
        """City A 2W capacity != City B 2W capacity; City A fitment does not use City B's tier."""
        from service_requests.services.cargo_fitment import resolve_cargo_payload

        uid = uuid.uuid4().hex[:6]
        # City A (Hosur): 2W max 20 kg
        tier_2w_hosur = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="Hosur",
            slug=f"2w-hosur-{uid}",
            name="2W Hosur",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("100.00"),
            base_fare=Decimal("80.00"),
            per_km_rate=Decimal("10.00"),
            max_cft=Decimal("5.0"),
            max_weight_kg=Decimal("20.0"),
            is_active=True,
        )
        # City B (Bengaluru): 2W max 45 kg
        tier_2w_blr = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="Bengaluru",
            slug=f"2w-blr-{uid}",
            name="2W Bengaluru",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("150.00"),
            base_fare=Decimal("100.00"),
            per_km_rate=Decimal("12.00"),
            max_cft=Decimal("10.0"),
            max_weight_kg=Decimal("45.0"),
            is_active=True,
        )
        # Create cargo item of 30 kg
        cat_small = GoodsCategory.objects.create(
            name="Small Parcel",
            slug=f"small-parcel-{uid}",
            allows_two_wheeler=True,
            is_active=True,
        )
        item_30kg = GoodsItem.objects.create(
            category=cat_small,
            name="30kg Box",
            slug=f"30kg-box-{uid}",
            default_cft=Decimal("2.0"),
            default_weight_kg=Decimal("30.0"),
            is_active=True,
            is_two_wheeler_compatible=True,
        )
        cart = [{"goods_item_id": item_30kg.id, "quantity": 1}]

        # Evaluating for Hosur (max 20 kg): 30 kg exceeds Hosur 2W limit -> incompatible
        summary_hosur = resolve_cargo_payload(cargo_items=cart, city="Hosur")
        self.assertFalse(summary_hosur["is_two_wheeler_compatible"], "30kg must exceed Hosur 20kg limit")

        # Evaluating for Bengaluru (max 45 kg): 30 kg fits Bengaluru 45kg limit -> compatible
        summary_blr = resolve_cargo_payload(cargo_items=cart, city="Bengaluru")
        self.assertTrue(summary_blr["is_two_wheeler_compatible"], "30kg must fit Bengaluru 45kg limit")

    # 39. P1-7: Standard GT quote expiry must also fail closed
    @patch("service_requests.services.routing.get_route_eta")
    def test_p1_7_gt_quote_expiry_malformed_fails_closed(self, mock_route):
        """Malformed expires_at timestamp must fail closed and reject quote."""
        from service_requests.services.logistics_pricing import quote_logistics_fare
        mock_route.return_value = {
            "distance_km": 10.0,
            "source": "google_maps",
        }
        truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="Hosur",
            slug=f"gt-exp-truck-{uuid.uuid4().hex[:6]}",
            name="Expiry Test Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1200.00"),
            base_fare=Decimal("1000.00"),
            per_km_rate=Decimal("20.00"),
            max_cft=Decimal("400.0"),
            max_weight_kg=Decimal("1000.0"),
            is_active=True,
        )
        breakdown = quote_logistics_fare(
            tier=truck_tier,
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
        )
        quote_id = breakdown["quote_id"]
        total = breakdown["total"]

        cart_data = [{
            "quote_id": quote_id,
            "expires_at": "NOT_A_VALID_ISO_DATETIME",
        }]

        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=truck_tier,
                logistics_lane=None,
                submitted_amount=total,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_data,
            )
        self.assertIn("invalid or malformed", str(ctx.exception).lower())

    # =========================================================================
    # END-TO-END AUTHORITY-CHAIN INTEGRITY TESTS (CASES 11 - 16)
    # =========================================================================

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_11_pm_onthefly_recalculation_preserves_exact_tier_and_city(self, mock_route):
        """Case 11: P&M on-the-fly quote recalculation preserves the exact selected service tier and city."""
        mock_route.return_value = {
            "distance_km": 12.5,
            "duration_seconds": 1800,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # 1. On-the-fly recalculation for tier_truck_1 in Hosur
        cart_data = [{
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "city": "Hosur",
            "tier_id": self.tier_truck_1.id,
            "packing_tier": "standard",
            "pickup_floor": 1,
            "pickup_has_lift": True,
            "drop_floor": 1,
            "drop_has_lift": True,
            "relocation_type": "Within City",
        }]
        fare, breakdown = resolve_logistics_fare_v2(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_1,
            logistics_lane=None,
            submitted_amount=Decimal("0.00"),
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data=cart_data,
        )
        self.assertIsNotNone(fare)
        self.assertEqual(breakdown.get("tier_id"), self.tier_truck_1.id)
        self.assertEqual(str(breakdown.get("city")).lower(), "hosur")
        self.assertTrue(breakdown.get("is_authoritative"))

        # 2. Recalculation requesting a different city (e.g. Bangalore) fails closed
        cart_bangalore = [{
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "city": "Bangalore",
            "tier_id": self.tier_truck_1.id,
        }]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount=Decimal("0.00"),
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_bangalore,
            )
        self.assertIn("city mismatch", str(ctx.exception).lower())

        # 3. Recalculation with volume exceeding tier_truck_1 capacity (max_cft=150.0)
        # 4 beds = 200 CFT > 150 CFT -> Must NOT silently swap to tier_truck_2!
        cart_overflow = [{
            "inventory": [{"name": self.item_double_bed.name, "quantity": 4}],
            "city": "Hosur",
            "tier_id": self.tier_truck_1.id,
        }]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount=Decimal("0.00"),
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_overflow,
            )
        self.assertTrue(
            "vehicle mismatch" in str(ctx.exception).lower()
            or "survey" in str(ctx.exception).lower()
            or "review" in str(ctx.exception).lower()
        )

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_12_pm_quote_to_booking_preserves_verified_tier_and_server_amount(self, mock_route):
        """Case 12: P&M quote -> booking preserves the exact verified tier and server calculated amount."""
        mock_route.return_value = {
            "distance_km": 15.0,
            "duration_seconds": 2100,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # 1. Generate authoritative server quote
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=[{"name": self.item_double_bed.name, "quantity": 1}],
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            packing_tier="standard",
            pickup_floor=0, pickup_has_lift=True,
            drop_floor=0, drop_has_lift=True,
            relocation_type="Within City",
        )
        self.assertTrue(quote.get("is_authoritative"))
        quote_id = quote["quote_id"]
        server_total = quote["total"]
        self.assertIsNotNone(server_total)

        # 2. Fare resolution during booking
        cart_data = [{
            "quote_id": quote_id,
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "packing_tier": "standard",
            "pickup_floor": 0,
            "pickup_has_lift": True,
            "drop_floor": 0,
            "drop_has_lift": True,
            "relocation_type": "Within City",
        }]
        resolved_fare, resolved_bd = resolve_logistics_fare_v2(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_1,
            logistics_lane=None,
            submitted_amount=server_total,
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data=cart_data,
        )
        self.assertEqual(resolved_fare, server_total)
        self.assertEqual(resolved_bd.get("tier_id"), self.tier_truck_1.id)

        # 3. Create ServiceRequest and verify database persistence
        from service_requests.models import ServiceRequest
        from service_requests.views import _jsonable_fare_breakdown
        from decimal import Decimal
        sr = ServiceRequest.objects.create(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_1,
            total_amount=resolved_fare,
            fare_breakdown=_jsonable_fare_breakdown(resolved_bd),
            preferred_date=timezone.now().date(),
            latitude=12.734, longitude=77.828,
            drop_latitude=12.850, drop_longitude=77.780,
            cart_data=cart_data,
        )
        sr.refresh_from_db()
        self.assertEqual(sr.logistics_tier_id, self.tier_truck_1.id)
        self.assertEqual(Decimal(str(sr.total_amount)), Decimal(str(server_total)))
        self.assertEqual(sr.fare_breakdown.get("tier_id"), self.tier_truck_1.id)

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_13_pm_booking_rejects_client_mutation_of_selected_tier_after_quote(self, mock_route):
        """Case 13: P&M booking rejects any client mutation of the selected tier after quote creation."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_seconds": 1500,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # Generate quote for tier_truck_1
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=[{"name": self.item_double_bed.name, "quantity": 1}],
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            packing_tier="standard",
            pickup_floor=0,
            pickup_has_lift=True,
            drop_floor=0,
            drop_has_lift=True,
            relocation_type="Within City",
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        # 1. Client attempts booking naming tier_truck_2 at top-level
        cart_data = [{
            "quote_id": quote_id,
            "tier_id": self.tier_truck_2.id,
            "city": "Hosur",
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "packing_tier": "standard",
            "pickup_floor": 0,
            "pickup_has_lift": True,
            "drop_floor": 0,
            "drop_has_lift": True,
            "relocation_type": "Within City",
        }]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_2,
                logistics_lane=None,
                submitted_amount=total,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_data,
            )
        self.assertIn("tier mismatch", str(ctx.exception).lower())

        # 2. Client submits tier_truck_1 as logistics_tier, but mutates cart_data tier to tier_truck_2
        cart_tampered = [{
            "quote_id": quote_id,
            "selected_tier_id": self.tier_truck_2.id,
            "city": "Hosur",
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "packing_tier": "standard",
            "pickup_floor": 0,
            "pickup_has_lift": True,
            "drop_floor": 0,
            "drop_has_lift": True,
            "relocation_type": "Within City",
        }]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount=total,
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_tampered,
            )
        self.assertIn("tier mismatch", str(ctx.exception).lower())

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_14_goods_item_snapshots_created_exclusively_from_fresh_db_values(self, mock_route):
        """Case 14: GoodsItem quote snapshots are created exclusively from fresh DB authoritative values.
        Client-supplied copies of weight, CFT, fragile, handling, or pricing attributes must never be accepted."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_seconds": 1500,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # Client supplies fraudulent attributes in inventory: tiny weight, tiny CFT, no special handling
        tampered_inventory = [{
            "goods_item_id": self.item_double_bed.id,
            "name": self.item_double_bed.name,
            "cft": 1.0,  # DB is 50.0
            "weight_kg": 2.0,  # DB is 60.0
            "is_fragile": False,
            "requires_special_handling": False,
            "special_handling_charge": 0.0,
            "quantity": 1,
        }]

        # 1. P&M quote calculation
        pm_quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=tampered_inventory,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            packing_tier="standard",
            pickup_floor=0, pickup_has_lift=True,
            drop_floor=0, drop_has_lift=True,
            relocation_type="Within City",
        )
        snapshots = pm_quote.get("item_snapshots", [])
        self.assertEqual(len(snapshots), 1)
        bed_snapshot = snapshots[0]
        # Must reflect DB attributes, NOT client's 1.0 CFT or 2.0 kg
        self.assertEqual(bed_snapshot["unit_cft"], 50.0)
        self.assertEqual(bed_snapshot["unit_weight_kg"], 60.0)
        self.assertEqual(bed_snapshot["dims_source"], "database")
        self.assertEqual(pm_quote["total_cft"], 50.0)

        # 2. GT cargo resolution
        from service_requests.services.cargo_fitment import resolve_cargo_payload
        gt_cargo = resolve_cargo_payload(cargo_items=tampered_inventory, city="Hosur")
        self.assertTrue(gt_cargo.get("is_valid"))
        gt_items = gt_cargo.get("items", [])
        self.assertEqual(len(gt_items), 1)
        gt_bed = gt_items[0]
        self.assertEqual(Decimal(str(gt_bed["unit_cft"])), Decimal("50.0"))
        self.assertEqual(Decimal(str(gt_bed["unit_weight_kg"])), Decimal("60.0"))
        self.assertTrue(gt_bed["requires_special_handling"])
        self.assertEqual(Decimal(str(gt_bed["special_handling_charge"])), Decimal("400.00"))

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_15_mutate_goods_item_in_db_after_quote_causes_booking_to_fail(self, mock_route):
        """Case 15: After quote creation, mutate a GoodsItem in the database and submit original quote. Booking must fail."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_seconds": 1500,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # 1. P&M quote generation
        quote = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=[{"name": self.item_double_bed.name, "quantity": 1}],
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            packing_tier="standard",
            pickup_floor=0, pickup_has_lift=True,
            drop_floor=0, drop_has_lift=True,
            relocation_type="Within City",
        )
        quote_id = quote["quote_id"]
        total = quote["total"]

        base_req = {
            "tier_id": self.tier_truck_1.id,
            "city": "Hosur",
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
            "packing_tier": "standard",
            "pickup_floor": 0, "pickup_has_lift": True,
            "drop_floor": 0, "drop_has_lift": True,
            "relocation_type": "Within City",
        }
        # Initial verification succeeds
        is_val, _, _ = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=base_req)
        self.assertTrue(is_val)

        # 2. Mutate GoodsItem in database (admin changes default_cft or default_weight_kg)
        orig_weight = self.item_double_bed.default_weight_kg
        try:
            self.item_double_bed.default_weight_kg = Decimal("95.0")
            self.item_double_bed.save()

            # Quote verification must now fail closed
            is_val_mutated, _, err = verify_packers_movers_quote(quote_id, submitted_total=total, current_request=base_req)
            self.assertFalse(is_val_mutated)
            self.assertIn("updated since quotation", err.lower())

            # Booking via resolve_logistics_fare_v2 must raise UnresolvedLogisticsFareError
            cart_data = [{
                "quote_id": quote_id,
                "tier_id": self.tier_truck_1.id,
                "city": "Hosur",
                "inventory": [{"name": self.item_double_bed.name, "quantity": 1}],
                "packing_tier": "standard",
                "pickup_floor": 0, "pickup_has_lift": True,
                "drop_floor": 0, "drop_has_lift": True,
                "relocation_type": "Within City",
            }]
            with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
                resolve_logistics_fare_v2(
                    service_category="packers_movers",
                    logistics_tier=self.tier_truck_1,
                    logistics_lane=None,
                    submitted_amount=total,
                    pickup_lat=12.734, pickup_lng=77.828,
                    drop_lat=12.850, drop_lng=77.780,
                    cart_data=cart_data,
                )
            self.assertIn("updated since quotation", str(ctx.exception).lower())
        finally:
            # Revert item weight
            self.item_double_bed.default_weight_kg = orig_weight
            self.item_double_bed.save()

    @patch("service_requests.services.routing.get_route_eta")
    def test_e2e_16_two_pm_tiers_different_prices_cannot_silently_substitute_another_tier(self, mock_route):
        """Case 16: Create two P&M tiers with deliberately different prices and prove that
        quote verification/recalculation cannot silently substitute another tier."""
        mock_route.return_value = {
            "distance_km": 10.0,
            "duration_seconds": 1500,
            "source": "google_maps",
            "is_authoritative": True,
        }
        # Tier A: tier_truck_1 (base_fare=1200.00, starting_price=1500.00)
        # Tier B: tier_truck_2 (base_fare=2000.00, starting_price=2500.00)
        inv = [{"name": self.item_double_bed.name, "quantity": 1}]

        quote_a = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=inv,
            city="Hosur",
            service_tier_id=self.tier_truck_1.id,
            packing_tier="standard",
            pickup_floor=0, pickup_has_lift=True,
            drop_floor=0, drop_has_lift=True,
            relocation_type="Within City",
        )
        quote_b = compute_packers_movers_quote(
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            inventory=inv,
            city="Hosur",
            service_tier_id=self.tier_truck_2.id,
            packing_tier="standard",
            pickup_floor=0, pickup_has_lift=True,
            drop_floor=0, drop_has_lift=True,
            relocation_type="Within City",
        )

        total_a = quote_a["total"]
        total_b = quote_b["total"]
        self.assertGreater(total_b, total_a, "Tier B must be deliberately more expensive than Tier A.")

        # 1. Attempt verifying Quote A with Tier B in request -> Must fail
        req_substitute_b = {
            "tier_id": self.tier_truck_2.id,
            "city": "Hosur",
            "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.850, "drop_lng": 77.780,
            "inventory": inv,
            "packing_tier": "standard",
            "pickup_floor": 0, "pickup_has_lift": True,
            "drop_floor": 0, "drop_has_lift": True,
            "relocation_type": "Within City",
        }
        is_val, _, err = verify_packers_movers_quote(quote_a["quote_id"], submitted_total=total_a, current_request=req_substitute_b)
        self.assertFalse(is_val)
        self.assertIn("quote tier mismatch", err.lower())

        # 2. Attempt verifying Quote B with Tier A in request -> Must fail
        req_substitute_a = dict(req_substitute_b, tier_id=self.tier_truck_1.id)
        is_val, _, err = verify_packers_movers_quote(quote_b["quote_id"], submitted_total=total_b, current_request=req_substitute_a)
        self.assertFalse(is_val)
        self.assertIn("quote tier mismatch", err.lower())

        # 3. Recalculate with Tier A -> Must return Total A, never Total B
        fare_recalc_a, bd_a = resolve_logistics_fare_v2(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_1,
            logistics_lane=None,
            submitted_amount=Decimal("0.00"),
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data=[{"inventory": inv, "city": "Hosur", "tier_id": self.tier_truck_1.id}],
        )
        self.assertEqual(fare_recalc_a, total_a)
        self.assertEqual(bd_a["tier_id"], self.tier_truck_1.id)

        # 4. Recalculate with Tier B -> Must return Total B, never Total A
        fare_recalc_b, bd_b = resolve_logistics_fare_v2(
            service_category="packers_movers",
            logistics_tier=self.tier_truck_2,
            logistics_lane=None,
            submitted_amount=Decimal("0.00"),
            pickup_lat=12.734, pickup_lng=77.828,
            drop_lat=12.850, drop_lng=77.780,
            cart_data=[{"inventory": inv, "city": "Hosur", "tier_id": self.tier_truck_2.id}],
        )
        self.assertEqual(fare_recalc_b, total_b)
        self.assertEqual(bd_b["tier_id"], self.tier_truck_2.id)

    @patch("service_requests.services.routing.get_route_eta")
    def test_p1_6_pm_crew_size_change_does_not_alter_quote_total(self, mock_route):
        """
        P1-6: Crew Size Authority Proof.
        Creates the same P&M quote twice with identical:
        - inventory
        - city
        - tier
        - route
        - packing
        - floors
        - options
        - pricing configuration

        Changes ONLY crew_size.
        Proves the final quote total is identical.
        Proves crew_size is informational display metadata only with zero pricing authority.
        """
        mock_route.return_value = {
            "distance_km": 15.0,
            "duration_seconds": 1800,
            "source": "google_maps",
            "is_authoritative": True,
        }
        inv = [
            {"name": self.item_double_bed.name, "quantity": 1},
            {"name": self.item_wardrobe.name, "quantity": 1},
        ]
        orig_crew = getattr(self.tier_truck_1, "crew_size", None)
        try:
            # 1. Quote 1 with crew_size = 2
            self.tier_truck_1.crew_size = 2
            self.tier_truck_1.save()

            quote_1 = compute_packers_movers_quote(
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                inventory=inv,
                city="Hosur",
                service_tier_id=self.tier_truck_1.id,
                packing_tier="standard",
                dismantling_required=True,
                unpacking_required=True,
                pickup_floor=2, pickup_has_lift=False,
                drop_floor=3, drop_has_lift=False,
                relocation_type="Within City",
            )

            # 2. Quote 2 with crew_size = 6 (identical inputs otherwise)
            self.tier_truck_1.crew_size = 6
            self.tier_truck_1.save()

            quote_2 = compute_packers_movers_quote(
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                inventory=inv,
                city="Hosur",
                service_tier_id=self.tier_truck_1.id,
                packing_tier="standard",
                dismantling_required=True,
                unpacking_required=True,
                pickup_floor=2, pickup_has_lift=False,
                drop_floor=3, drop_has_lift=False,
                relocation_type="Within City",
            )

            # 3. Assert quotes are authoritative
            self.assertTrue(quote_1["is_authoritative"])
            self.assertTrue(quote_2["is_authoritative"])

            # 4. Prove final quote totals are 100% identical
            self.assertEqual(
                quote_1["total"],
                quote_2["total"],
                f"Crew size must NOT alter quote total! Quote 1 total: {quote_1['total']}, Quote 2 total: {quote_2['total']}"
            )

            # 5. Prove pricing breakdown components are 100% identical
            p1 = quote_1["pricing"]
            p2 = quote_2["pricing"]
            self.assertEqual(p1["subtotal"], p2["subtotal"])
            self.assertEqual(p1["gst_amount"], p2["gst_amount"])
            self.assertEqual(p1["base_labor_charge"], p2["base_labor_charge"])
            self.assertEqual(p1["floor_labor_charge"], p2["floor_labor_charge"])
            self.assertEqual(p1["labor_total"], p2["labor_total"])
            self.assertEqual(p1["packing_charge"], p2["packing_charge"])
            self.assertEqual(p1["transport_total"], p2["transport_total"])
            self.assertEqual(p1["dismantling_charge"], p2["dismantling_charge"])
            self.assertEqual(p1["unpacking_charge"], p2["unpacking_charge"])

            # 6. Prove crew_size is purely informational display metadata
            self.assertEqual(quote_1["vehicle"]["crew_size"], 2)
            self.assertEqual(quote_2["vehicle"]["crew_size"], 6)

            # 7. Prove client passing arbitrary crew_size in request/cart does not alter resolved fare
            cart_data_client_crew = [{
                "quote_id": quote_1["quote_id"],
                "tier_id": self.tier_truck_1.id,
                "city": "Hosur",
                "inventory": inv,
                "crew_size": 99,
                "packing_tier": "standard",
                "dismantling_required": True,
                "unpacking_required": True,
                "pickup_floor": 2,
                "pickup_has_lift": False,
                "drop_floor": 3,
                "drop_has_lift": False,
                "relocation_type": "Within City",
            }]
            resolved_fare, resolved_bd = resolve_logistics_fare_v2(
                service_category="packers_movers",
                logistics_tier=self.tier_truck_1,
                logistics_lane=None,
                submitted_amount=quote_1["total"],
                pickup_lat=12.734, pickup_lng=77.828,
                drop_lat=12.850, drop_lng=77.780,
                cart_data=cart_data_client_crew,
            )
            self.assertEqual(resolved_fare, quote_1["total"])
        finally:
            self.tier_truck_1.crew_size = orig_crew
            self.tier_truck_1.save()


