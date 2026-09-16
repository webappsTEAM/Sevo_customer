"""
service_requests/tests/test_gt_authoritative_fitment_and_quote_integrity.py

Automated Test Suite for SEVO Goods & Transport (GT) Authoritative Fitment,
Cryptographic Quote Integrity, Mandatory Multi-Stop Coordinates, and
Assignment State Lockdown.
"""
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, ServiceTier
from service_requests.models import ServiceRequest, TripStop
from service_requests.services.cargo_fitment import (
    evaluate_vehicle_fitment,
    resolve_cargo_payload,
    recommend_vehicles_for_cargo,
)
from service_requests.services.logistics_pricing import (
    quote_logistics_fare,
    resolve_logistics_fare_v2,
    UnresolvedLogisticsFareError,
)
from service_requests.services.packers_movers_pricing import (
    calculate_inventory_metrics,
    recommend_vehicle_for_volume,
    compute_packers_movers_quote,
)
from service_requests.services.routing import get_canonical_trip_route
from service_requests.services import (
    set_trip_stops,
    MAX_TOTAL_TRIP_STOPS,
    MAX_INTERMEDIATE_WAYPOINTS,
)

User = get_user_model()


class GTAuthoritativeFitmentAndQuoteIntegrityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        uid = uuid.uuid4().hex[:8]

        # Customer
        self.customer = User.objects.create_user(
            username=f"gt_integ_cust_{uid}",
            email=f"cust_{uid}@example.com",
            password="testpass123",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        self.client.force_authenticate(user=self.customer)

        # Admin user
        self.admin_user = User.objects.create_user(
            username=f"gt_integ_admin_{uid}",
            email=f"admin_{uid}@example.com",
            password="testpass123",
            role=getattr(User.Role, "ADMIN", "admin"),
            is_staff=True,
            is_superuser=True,
        )

        # Distance-priced ServiceTiers
        self.truck_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="hosur",
            slug=f"truck-tier-{uid}",
            name="Authoritative Ace Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("450.00"),
            base_fare=Decimal("300.00"),
            per_km_rate=Decimal("22.00"),
            free_km=Decimal("2.00"),
            loading_unloading_charge=Decimal("100.00"),
            additional_stop_charge=Decimal("60.00"),
            minimum_fare=Decimal("350.00"),
            max_weight_kg=Decimal("750.00"),
            max_cft=Decimal("150.00"),
            is_active=True,
        )

        self.tw_tier = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="hosur",
            slug=f"tw-tier-{uid}",
            name="Authoritative Two Wheeler",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("60.00"),
            base_fare=Decimal("40.00"),
            per_km_rate=Decimal("10.00"),
            free_km=Decimal("1.00"),
            loading_unloading_charge=Decimal("0.00"),
            additional_stop_charge=Decimal("20.00"),
            minimum_fare=Decimal("50.00"),
            max_weight_kg=Decimal("20.00"),
            max_cft=Decimal("2.50"),
            is_active=True,
        )

        # Goods Category with min_vehicle_class
        self.heavy_machinery_cat = GoodsCategory.objects.create(
            name="Heavy Machinery",
            slug=f"heavy-machinery-{uid}",
            allows_two_wheeler=False,
            min_vehicle_class="truck",
            is_active=True,
            is_prohibited=False,
        )

        self.generator_item = GoodsItem.objects.create(
            category=self.heavy_machinery_cat,
            name="Diesel Generator",
            slug=f"generator-{uid}",
            default_weight_kg=Decimal("250.00"),
            default_cft=Decimal("45.00"),
            requires_special_handling=True,
            special_handling_charge=Decimal("150.00"),
            is_two_wheeler_compatible=False,
            is_heavy=True,
            is_active=True,
        )

        self.parcel_cat = GoodsCategory.objects.create(
            name="Small Parcels",
            slug=f"parcels-{uid}",
            allows_two_wheeler=True,
            min_vehicle_class="two_wheeler",
            is_active=True,
            is_prohibited=False,
        )

        self.parcel_item = GoodsItem.objects.create(
            category=self.parcel_cat,
            name="Book Box",
            slug=f"book-box-{uid}",
            default_weight_kg=Decimal("5.00"),
            default_cft=Decimal("0.50"),
            is_two_wheeler_compatible=True,
            is_active=True,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Authoritative DB Capacity & Zero Guessing
    # ──────────────────────────────────────────────────────────────────────────
    def test_changing_service_tier_capacity_changes_fitment_behavior(self):
        """
        Changing ServiceTier DB capacity dynamically controls cargo fitment.
        No hardcoded values and no slug-based guessing.
        """
        cargo = resolve_cargo_payload(
            cargo_items=[{"item_id": self.generator_item.id, "quantity": 1}],
            goods_category_id=self.heavy_machinery_cat.id,
        )
        self.assertEqual(Decimal(str(cargo["total_weight_kg"])), Decimal("250.00"))

        # Case A: Tier capacity set to 200kg -> should NOT fit
        self.truck_tier.max_weight_kg = Decimal("200.00")
        self.truck_tier.max_cft = Decimal("100.00")
        self.truck_tier.save()

        is_fit, reason = evaluate_vehicle_fitment(self.truck_tier, cargo)
        self.assertFalse(is_fit)
        self.assertIn("exceeds vehicle payload limit", reason)

        # Case B: Update DB capacity to 500kg -> should FIT immediately
        self.truck_tier.max_weight_kg = Decimal("500.00")
        self.truck_tier.save()

        is_fit, reason = evaluate_vehicle_fitment(self.truck_tier, cargo)
        self.assertTrue(is_fit)
        self.assertIn("Cargo fits safely", reason)

    def test_unconfigured_capacity_rejects_fitment(self):
        """Tiers with unconfigured (None or <= 0) capacity reject fitment safely."""
        self.truck_tier.max_weight_kg = None
        self.truck_tier.max_cft = None
        self.truck_tier.save()

        self.assertEqual(self.truck_tier.get_max_weight_kg(), Decimal("0.00"))
        self.assertEqual(self.truck_tier.get_max_cft(), Decimal("0.00"))

        fit, reason = self.truck_tier.evaluate_cargo_fit(Decimal("10.00"), Decimal("1.00"))
        self.assertFalse(fit)
        self.assertIn("Vehicle capacity is not configured", reason)

    # ──────────────────────────────────────────────────────────────────────────
    # 2. GoodsCategory min_vehicle_class Hierarchy & Item Restrictions
    # ──────────────────────────────────────────────────────────────────────────
    def test_goods_category_min_vehicle_class_enforcement(self):
        """Goods category requiring 'truck' strictly rejects 2W and 3W tiers."""
        cargo = resolve_cargo_payload(
            cargo_items=[{"item_id": self.generator_item.id, "quantity": 1}],
            goods_category_id=self.heavy_machinery_cat.id,
        )

        # Two-wheeler should be rejected due to min_vehicle_class (and 2W incompatibility)
        is_fit_tw, reason_tw = evaluate_vehicle_fitment(self.tw_tier, cargo)
        self.assertFalse(is_fit_tw)

        # Truck should be accepted (rank >= truck)
        is_fit_truck, reason_truck = evaluate_vehicle_fitment(self.truck_tier, cargo)
        self.assertTrue(is_fit_truck)

    def test_item_level_heavy_and_oversized_restrictions(self):
        """Heavy or oversized items cannot be transported on a two-wheeler."""
        heavy_item = GoodsItem.objects.create(
            category=self.parcel_cat,
            name="Dense Lead Block",
            slug=f"lead-block-{uuid.uuid4().hex[:6]}",
            default_weight_kg=Decimal("15.00"),
            default_cft=Decimal("0.50"),
            is_heavy=True,
            is_two_wheeler_compatible=True,
            is_active=True,
        )
        cargo = resolve_cargo_payload(
            cargo_items=[{"item_id": heavy_item.id, "quantity": 1}],
            goods_category_id=self.parcel_cat.id,
        )
        is_fit, reason = evaluate_vehicle_fitment(self.tw_tier, cargo)
        self.assertFalse(is_fit)
        self.assertIn("Heavy cargo items cannot be transported on a two-wheeler", reason)

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Route Required / No Flat-Price Fallback on Quote API
    # ──────────────────────────────────────────────────────────────────────────
    def test_quote_endpoint_rejects_distance_quote_without_coordinates(self):
        """Distance-priced tiers must reject requests missing coordinates rather than returning starting_price."""
        url = "/api/logistics/quote/"
        resp = self.client.post(
            url,
            data={
                "service_category": "goods_transport_truck",
                "tier_id": self.truck_tier.id,
                # Intentionally omitting coordinates
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get("error_code"), "COORDINATES_REQUIRED")

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Quote Identity & Cryptographic Integrity
    # ──────────────────────────────────────────────────────────────────────────
    @patch("service_requests.services.routing.get_route_eta")
    def test_quote_cryptographic_binding_and_integrity(self, mock_eta):
        mock_eta.return_value = {"distance_km": 15.0, "duration_seconds": 1800, "source": "google_maps"}

        breakdown = quote_logistics_fare(
            tier=self.truck_tier,
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
            stop_count=2,
        )
        self.assertIsNotNone(breakdown)
        quote_id = breakdown["quote_id"]
        quote_hash = breakdown["quote_hash"]
        self.assertTrue(quote_id.startswith("gtq_"))
        self.assertTrue(len(quote_hash) >= 16)

        # Verify cached quote in cache
        cached = cache.get(f"gt_quote_{quote_id}")
        self.assertIsNotNone(cached)
        self.assertEqual(cached["quote_hash"], quote_hash)
        self.assertEqual(cached["tier_id"], self.truck_tier.id)

        # 4a. Booking with correct quote succeeds
        cart_data = {
            "quote_id": quote_id,
            "quote_hash": quote_hash,
            "expires_at": breakdown["expires_at"],
        }
        fare, resolved_bd = resolve_logistics_fare_v2(
            service_category="goods_transport_truck",
            logistics_tier=self.truck_tier,
            logistics_lane=None,
            submitted_amount=breakdown["total"],
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
            cart_data=cart_data,
        )
        self.assertEqual(fare, breakdown["total"])

        # 4b. Booking with mismatched tier raises UnresolvedLogisticsFareError
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_two_wheeler",
                logistics_tier=self.tw_tier,
                logistics_lane=None,
                submitted_amount=Decimal("100.00"),
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                cart_data=cart_data,
            )
        self.assertIn("Quote tier mismatch", str(ctx.exception))

        # 4c. Booking with altered coordinates raises UnresolvedLogisticsFareError
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.truck_tier,
                logistics_lane=None,
                submitted_amount=breakdown["total"],
                pickup_lat=Decimal("13.082700"),  # Changed pickup to Chennai
                pickup_lng=Decimal("80.270700"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                cart_data=cart_data,
            )
        self.assertIn("Quote route mismatch", str(ctx.exception))

        # 4d. Booking with forged quote_hash raises UnresolvedLogisticsFareError
        forged_cart = {
            "quote_id": quote_id,
            "quote_hash": "forged_hash_12345",
            "expires_at": breakdown["expires_at"],
        }
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.truck_tier,
                logistics_lane=None,
                submitted_amount=breakdown["total"],
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                cart_data=forged_cart,
            )
        self.assertIn("Quote integrity error", str(ctx.exception))

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Stop Modification Lockdown after Driver Assignment
    # ──────────────────────────────────────────────────────────────────────────
    def test_set_trip_stops_lockdown_after_assignment(self):
        """Modifying route stops after a driver has been assigned is forbidden."""
        booking = ServiceRequest.objects.create(
            customer=self.customer,
            service_category="goods_transport_truck",
            issue_title="Truck Transport Booking",
            address="Sipcot Phase 1, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            drop_address="Electronic City, Bangalore",
            drop_latitude=Decimal("12.935200"),
            drop_longitude=Decimal("77.624500"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM",
            status="assigned",
        )

        stops = [
            {
                "address": "Attibele Checkpost",
                "latitude": Decimal("12.785000"),
                "longitude": Decimal("77.790000"),
            }
        ]

        # Regular customer should be blocked
        with self.assertRaises(ValueError) as ctx:
            set_trip_stops(booking, self.customer, stops)
        self.assertIn("Route cannot be modified once a driver has been assigned", str(ctx.exception))

        # Admin user is authorized for operational exception handling
        admin_result = set_trip_stops(booking, self.admin_user, stops)
        self.assertEqual(len(admin_result), 1)
        self.assertEqual(admin_result[0].address, "Attibele Checkpost")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Multi-Stop Coordinates Mandatory & Geocoding Fallback
    # ──────────────────────────────────────────────────────────────────────────
    @patch("service_requests.services.address_service.AddressService.resolve_address_coordinates")
    def test_set_trip_stops_mandatory_coordinates_and_geocoding(self, mock_geo):
        booking = ServiceRequest.objects.create(
            customer=self.customer,
            service_category="goods_transport_truck",
            issue_title="Multi-stop Booking",
            address="Sipcot Phase 1, Hosur",
            latitude=Decimal("12.740900"),
            longitude=Decimal("77.825300"),
            drop_address="Koramangala, Bangalore",
            drop_latitude=Decimal("12.935200"),
            drop_longitude=Decimal("77.624500"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM",
            status="confirmed",
        )

        # Stop with explicit coordinates
        valid_stop = {
            "address": "Stop A, Bommasandra",
            "latitude": Decimal("12.816000"),
            "longitude": Decimal("77.691000"),
        }
        res = set_trip_stops(booking, self.customer, [valid_stop])
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].latitude, Decimal("12.816000"))

        # Stop without coordinates, geocoding succeeds
        mock_geo.return_value = {"latitude": 12.8390, "longitude": 77.6770, "geocoding_status": "verified"}
        geocoded_stop = {
            "address": "Stop B, Electronic City Phase 2",
            "latitude": None,
            "longitude": None,
        }
        res2 = set_trip_stops(booking, self.customer, [valid_stop, geocoded_stop])
        self.assertEqual(len(res2), 2)
        self.assertEqual(float(res2[1].latitude), 12.8390)

        # Stop without coordinates, geocoding fails -> must raise ValueError
        mock_geo.return_value = {"latitude": None, "longitude": None, "geocoding_status": "failed"}
        failed_stop = {
            "address": "Unknown Forest Area Stop",
            "latitude": None,
            "longitude": None,
        }
        with self.assertRaises(ValueError) as ctx:
            set_trip_stops(booking, self.customer, [failed_stop])
        self.assertIn("does not have valid coordinates and geocoding could not resolve them", str(ctx.exception))

    # ──────────────────────────────────────────────────────────────────────────
    # 7. Canonical Trip Route Verification
    # ──────────────────────────────────────────────────────────────────────────
    @patch("service_requests.services.routing.get_route_eta")
    def test_get_canonical_trip_route(self, mock_eta):
        mock_eta.return_value = {"distance_km": 10.0, "duration_seconds": 1200, "source": "google_maps"}

        booking = ServiceRequest.objects.create(
            customer=self.customer,
            service_category="goods_transport_truck",
            issue_title="Canonical Route Booking",
            address="Origin Warehouse, Hosur",
            latitude=Decimal("12.740000"),
            longitude=Decimal("77.820000"),
            drop_address="Final Drop, HSR Layout",
            drop_latitude=Decimal("12.912000"),
            drop_longitude=Decimal("77.644000"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM",
            status="confirmed",
        )
        TripStop.objects.create(
            booking=booking,
            sequence=1,
            address="Mid Stop, Chandapura",
            latitude=Decimal("12.790000"),
            longitude=Decimal("77.700000"),
        )

        canonical = get_canonical_trip_route(booking)
        self.assertEqual(canonical["booking_id"], booking.id)
        self.assertEqual(canonical["pickup"]["address"], "Origin Warehouse, Hosur")
        self.assertEqual(len(canonical["stops"]), 1)
        self.assertEqual(canonical["stops"][0]["address"], "Mid Stop, Chandapura")
        self.assertEqual(canonical["drop"]["address"], "Final Drop, HSR Layout")
        self.assertEqual(canonical["stop_count"], 3)
        self.assertEqual(canonical["total_distance_km"], 20.0)  # 2 legs * 10 km
        self.assertEqual(canonical["source"], "google_maps")
        self.assertTrue(len(canonical["route_hash"]) >= 16)

    # ──────────────────────────────────────────────────────────────────────────
    # 8. Authoritative Vehicle Class Without Name/Slug Heuristics
    # ──────────────────────────────────────────────────────────────────────────
    def test_vehicle_class_authoritative_and_slug_independent(self):
        """
        Vehicle class rank is determined strictly by ServiceTier.vehicle_class.
        Names, slugs, and keywords like 'eicher', '1.7-ton', 'truck' have zero effect.
        """
        uid = uuid.uuid4().hex[:6]
        # Tier with heavy-sounding names and slugs, but DB vehicle_class=TWO_WHEELER
        deceptive_tw = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER,
            city="hosur",
            slug=f"eicher-heavy-1-7-ton-{uid}",
            name="Super Eicher 1.7-ton Heavy Truck",
            vehicle_class=ServiceTier.VehicleClass.TWO_WHEELER,
            starting_price=Decimal("100.00"),
            base_fare=Decimal("50.00"),
            per_km_rate=Decimal("12.00"),
            max_weight_kg=Decimal("20.00"),
            max_cft=Decimal("2.50"),
            is_active=True,
        )
        cargo = resolve_cargo_payload(
            cargo_items=[{"item_id": self.generator_item.id, "quantity": 1}],
            goods_category_id=self.heavy_machinery_cat.id,
        )
        # Heavy machinery requires min_vehicle_class="truck".
        # Despite name/slug containing "eicher", "1.7-ton", "truck", deceptive_tw is rejected because vehicle_class is two_wheeler!
        fit_deceptive, reason_deceptive = evaluate_vehicle_fitment(deceptive_tw, cargo)
        self.assertFalse(fit_deceptive)
        self.assertIn("requires minimum vehicle class", reason_deceptive)

        # Tier with 2W-sounding names and slugs, but DB vehicle_class=TRUCK
        deceptive_truck = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK,
            city="hosur",
            slug=f"moped-scooter-{uid}",
            name="Tiny Moped Delivery",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("400.00"),
            base_fare=Decimal("300.00"),
            per_km_rate=Decimal("20.00"),
            max_weight_kg=Decimal("1000.00"),
            max_cft=Decimal("200.00"),
            is_active=True,
        )
        # Deceptive truck qualifies because its DB vehicle_class is TRUCK!
        fit_truck, reason_truck = evaluate_vehicle_fitment(deceptive_truck, cargo)
        self.assertTrue(fit_truck)

    # ──────────────────────────────────────────────────────────────────────────
    # 9. P&M Server-Authoritative Inventory Attributes
    # ──────────────────────────────────────────────────────────────────────────
    def test_pm_inventory_attributes_server_authoritative(self):
        """
        P&M inventory calculations strictly enforce server-authoritative item attributes.
        Client-supplied fake lower weight/cft are ignored for known items.
        """
        pm_cat = GoodsCategory.objects.create(
            name="Furniture",
            slug=f"furniture-{uuid.uuid4().hex[:6]}",
            allows_two_wheeler=False,
            min_vehicle_class="truck",
            is_active=True,
        )
        sofa_item = GoodsItem.objects.create(
            category=pm_cat,
            name="3-Seater Sofa",
            slug=f"sofa-{uuid.uuid4().hex[:6]}",
            default_weight_kg=Decimal("75.00"),
            default_cft=Decimal("35.00"),
            is_active=True,
        )
        # Client attempts to send fake weight (5kg) and fake cft (2 cft)
        client_items = [
            {
                "goods_item_id": sofa_item.id,
                "name": sofa_item.name,
                "quantity": 2,
                "weight_kg": 5.0,
                "cft": 2.0,
            }
        ]
        metrics = calculate_inventory_metrics(client_items)
        # Server must resolve 75kg * 2 = 150kg, and 35 cft * 2 = 70 cft
        self.assertEqual(metrics["total_weight_kg"], 150.0)
        self.assertEqual(metrics["total_cft"], 70.0)
        self.assertFalse(metrics["requires_review"])

    # ──────────────────────────────────────────────────────────────────────────
    # 10. P&M ServiceTier Vehicle Recommendation & City Scoping
    # ──────────────────────────────────────────────────────────────────────────
    def test_pm_vehicle_recommendation_servicetier_and_city_scoping(self):
        """
        P&M vehicle sizing queries active ServiceTiers for the specified city.
        Insufficient capacity fails closed without silently guessing a vehicle.
        Cross-city tiers are never selected.
        """
        # Create a small Hosur PM tier
        hosur_pm = ServiceTier.objects.create(
            category="packers_movers",
            city="hosur",
            slug=f"pm-hosur-small-{uuid.uuid4().hex[:6]}",
            name="Hosur PM Small",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1500.00"),
            base_fare=Decimal("1500.00"),
            max_weight_kg=Decimal("500.00"),
            max_cft=Decimal("100.00"),
            is_active=True,
        )
        # Create a large Bangalore PM tier
        blr_pm = ServiceTier.objects.create(
            category="packers_movers",
            city="bangalore",
            slug=f"pm-blr-huge-{uuid.uuid4().hex[:6]}",
            name="Bangalore PM Huge",
            vehicle_class=ServiceTier.VehicleClass.HEAVY_TRUCK,
            starting_price=Decimal("5000.00"),
            base_fare=Decimal("5000.00"),
            max_weight_kg=Decimal("3000.00"),
            max_cft=Decimal("600.00"),
            is_active=True,
        )

        # 1. Fits Hosur tier
        veh = recommend_vehicle_for_volume(volume_cft=80.0, city="hosur")
        self.assertIsNotNone(veh)
        self.assertEqual(veh["name"], "Hosur PM Small")

        # 2. Exceeds Hosur tier capacity -> must return None (fail closed, no fallback to Bangalore!)
        veh_exceed = recommend_vehicle_for_volume(volume_cft=250.0, city="hosur")
        self.assertIsNone(veh_exceed)

        # 3. compute_packers_movers_quote with unconfigured/exceeded vehicle triggers SURVEY_REQUIRED
        quote = compute_packers_movers_quote(
            pickup_lat=12.7409,
            pickup_lng=77.8253,
            drop_lat=12.9352,
            drop_lng=77.6245,
            city="hosur",
            inventory=[{"goods_item_id": None, "item_name": "Industrial Lathe", "quantity": 1, "cft": 300.0, "weight_kg": 1500.0}],
        )
        self.assertTrue(quote["requires_survey"])
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")

    # ──────────────────────────────────────────────────────────────────────────
    # 11. Booking + TripStops Persistence Atomicity
    # ──────────────────────────────────────────────────────────────────────────
    @patch("service_requests.views.sr_services.set_trip_stops")
    def test_booking_creation_atomicity_rolls_back_on_trip_stop_failure(self, mock_set_stops):
        """
        If persisting trip stops fails, the booking transaction is rolled back completely.
        No partial or orphan ServiceRequest record remains in the database.
        """
        mock_set_stops.side_effect = ValueError("Simulated TripStop persistence failure")
        initial_sr_count = ServiceRequest.objects.count()

        payload = {
            "customer_name": "Rollback Test User",
            "phone": "9876543210",
            "issue_title": "Rollback Test Transport",
            "service_category": "goods_transport_truck",
            "logistics_tier": self.truck_tier.id,
            "latitude": 12.740900,
            "longitude": 77.825300,
            "address": "Rollback Test Pickup, Hosur",
            "drop_latitude": 12.935200,
            "drop_longitude": 77.624500,
            "drop_address": "Rollback Test Drop, Bangalore",
            "preferred_date": str((timezone.now() + timezone.timedelta(days=2)).date()),
            "preferred_time": "11:00 AM",
            "description": "Moving standard office stationery boxes and monitors, approx 150kg total weight",
            "total_amount": "500.00",
            "stops": [
                {
                    "address": "Intermediate Stop 1",
                    "latitude": 12.8000,
                    "longitude": 77.7500,
                }
            ],
        }
        with patch("settings_hub.service_zone_engine.check_booking_eligibility") as mock_zone:
            mock_zone.return_value.allowed = True
            mock_zone.return_value.zone_id = 1
            mock_zone.return_value.zone_name = "Hosur Central"
            with patch("service_requests.views.resolve_logistics_fare_v2") as mock_fare:
                mock_fare.return_value = (Decimal("500.00"), {"total": Decimal("500.00")})
                resp = self.client.post("/api/booking/", data=payload, format="json")

        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data.get("code"), "TRIP_STOPS_PERSISTENCE_FAILED")
        # Prove rollback: SR count must not have changed!
        self.assertEqual(ServiceRequest.objects.count(), initial_sr_count)
        self.assertFalse(ServiceRequest.objects.filter(address="Rollback Test Pickup, Hosur").exists())

    # ──────────────────────────────────────────────────────────────────────────
    # 12. Quote Identity Mutation Tampering Tests
    # ──────────────────────────────────────────────────────────────────────────
    @patch("service_requests.services.routing.get_route_eta")
    def test_quote_identity_mutation_rejections(self, mock_eta):
        """
        Tampering with any parameter bound to the quote identity raises UnresolvedLogisticsFareError.
        Tested mutations:
        - changed waypoint coordinates
        - changed cargo item or quantity
        - altered total amount
        """
        mock_eta.return_value = {"distance_km": 15.0, "duration_seconds": 1800, "source": "google_maps"}

        waypoints = [
            {"address": "Stop 1", "latitude": Decimal("12.780000"), "longitude": Decimal("77.800000")}
        ]
        cargo_items = [{"item_id": self.parcel_item.id, "quantity": 2}]
        cargo_summary = resolve_cargo_payload(
            cargo_items=cargo_items,
            goods_category_id=self.parcel_cat.id,
        )

        breakdown = quote_logistics_fare(
            tier=self.truck_tier,
            pickup_lat=Decimal("12.740900"),
            pickup_lng=Decimal("77.825300"),
            drop_lat=Decimal("12.935200"),
            drop_lng=Decimal("77.624500"),
            stop_count=3,
            waypoints=waypoints,
            cargo_summary=cargo_summary,
        )
        quote_id = breakdown["quote_id"]
        quote_hash = breakdown["quote_hash"]
        cart_data = {
            "quote_id": quote_id,
            "quote_hash": quote_hash,
            "expires_at": breakdown["expires_at"],
            "cargo_items": cargo_items,
        }

        # Mutation 1: tampered waypoint coordinate
        tampered_waypoints = [
            {"address": "Stop 1", "latitude": Decimal("12.850000"), "longitude": Decimal("77.800000")}
        ]
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.truck_tier,
                logistics_lane=None,
                submitted_amount=breakdown["total"],
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                stop_count=3,
                cart_data=cart_data,
                waypoints=tampered_waypoints,
            )
        self.assertIn("Quote route mismatch", str(ctx.exception))

        # Mutation 2: tampered cargo quantity
        tampered_cart_data = {
            "quote_id": quote_id,
            "quote_hash": quote_hash,
            "expires_at": breakdown["expires_at"],
            "cargo_items": [{"item_id": self.parcel_item.id, "quantity": 5}],
        }
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.truck_tier,
                logistics_lane=None,
                submitted_amount=breakdown["total"],
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                stop_count=3,
                cart_data=tampered_cart_data,
                waypoints=waypoints,
            )
        self.assertIn("Quote cargo mismatch", str(ctx.exception))

        # Mutation 3: tampered total amount (underpayment attempt)
        with self.assertRaises(UnresolvedLogisticsFareError) as ctx:
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.truck_tier,
                logistics_lane=None,
                submitted_amount=Decimal("50.00"),
                pickup_lat=Decimal("12.740900"),
                pickup_lng=Decimal("77.825300"),
                drop_lat=Decimal("12.935200"),
                drop_lng=Decimal("77.624500"),
                stop_count=3,
                cart_data=cart_data,
                waypoints=waypoints,
            )
        self.assertIn("Quote total mismatch", str(ctx.exception))

    # ──────────────────────────────────────────────────────────────────────────
    # 13. Cross-City Vehicle Recommendation Rejection
    # ──────────────────────────────────────────────────────────────────────────
    def test_cross_city_vehicle_recommendation_strict_rejection(self):
        """
        Requesting vehicles in a city without configured active tiers returns NO_VEHICLE_AVAILABLE.
        Never silently leaks tiers from another city.
        """
        cargo = resolve_cargo_payload(
            cargo_items=[{"item_id": self.parcel_item.id, "quantity": 1}],
            goods_category_id=self.parcel_cat.id,
        )
        rec = recommend_vehicles_for_cargo(
            cargo_summary=cargo,
            city="salem",  # Salem has no configured tiers
        )
        self.assertEqual(rec["error_code"], "NO_VEHICLE_AVAILABLE")
        self.assertIsNone(rec["recommended_tier"])
        self.assertEqual(len(rec["suitable_tiers"]), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # 14. Multi-Stop Limit Enforcement
    # ──────────────────────────────────────────────────────────────────────────
    def test_max_trip_stops_limit_enforced(self):
        """
        Attempting to create more than MAX_TOTAL_TRIP_STOPS (5) raises ValueError.
        """
        booking = ServiceRequest.objects.create(
            customer=self.customer,
            service_category="goods_transport_truck",
            issue_title="Too Many Stops Booking",
            address="Origin, Hosur",
            latitude=Decimal("12.740000"),
            longitude=Decimal("77.820000"),
            drop_address="Final Drop, Bangalore",
            drop_latitude=Decimal("12.912000"),
            drop_longitude=Decimal("77.644000"),
            preferred_date=timezone.now().date(),
            preferred_time="10:00 AM",
            status="confirmed",
        )
        stops = [
            {"address": f"Stop {i}", "latitude": Decimal("12.750000") + Decimal(str(i*0.01)), "longitude": Decimal("77.800000")}
            for i in range(1, 7)  # 6 stops
        ]
        with self.assertRaises(ValueError) as ctx:
            set_trip_stops(booking, self.customer, stops)
        self.assertIn("cannot have more than 3 intermediate stops", str(ctx.exception))

    # ──────────────────────────────────────────────────────────────────────────
    # 15. Logistics Slot Availability Server Authority
    # ──────────────────────────────────────────────────────────────────────────
    def test_logistics_slot_availability_endpoint(self):
        """
        GET /api/logistics/slots/ returns server-authoritative slot availability.
        """
        resp = self.client.get("/api/logistics/slots/?category=goods_transport_truck")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data.get("success"))
        groups = resp.data.get("groups", [])
        self.assertEqual(len(groups), 3)
        g0 = groups[0]
        self.assertIn("group", g0)
        self.assertGreater(len(g0["slots"]), 0)
        s0 = g0["slots"][0]
        self.assertIn("slot", s0)
        self.assertIn("label", s0)
        self.assertIn("is_available", s0)
