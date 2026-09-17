"""
service_requests/tests/test_gt_hardening_final.py

Final Goods & Transport Hardening Verification Test Suite.
Tests:
1. P0: Customer identity validation (no fake identity fallbacks).
2. P1: Authoritative road distance vs straight-line estimate policy.
3. P1: Server-authoritative prohibited goods gate.
4. P1/P2: Packers & Movers uncataloged inventory review gate.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")

import django
django.setup()

from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from django.test import TestCase

from service_requests.models import ServiceRequest
from service_requests.serializers import ServiceRequestPublicCreateSerializer
from service_requests.services.prohibited_goods import validate_cargo_safety
from service_requests.services.logistics_pricing import quote_logistics_fare
from service_requests.services.packers_movers_pricing import (
    match_catalog_item,
    calculate_inventory_metrics,
    compute_packers_movers_quote,
    verify_packers_movers_quote,
)


class GTHardeningP0CustomerIdentityTests(TestCase):
    """P0: Customer identity validation tests."""

    def test_missing_customer_name_rejected(self):
        """Missing customer name must fail validation."""
        serializer = ServiceRequestPublicCreateSerializer(data={
            "customer_name": "",
            "phone": "9876543210",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck Delivery",
            "description": "Commercial packaged goods",
            "address": "Hosur, Tamil Nadu",
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "1500.00",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("customer_name", serializer.errors)

    def test_fake_customer_name_thejaa_rejected(self):
        """Hardcoded fallback 'Thejaa T' must be rejected."""
        serializer = ServiceRequestPublicCreateSerializer(data={
            "customer_name": "Thejaa T",
            "phone": "9876543210",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck Delivery",
            "description": "Commercial packaged goods",
            "address": "Hosur, Tamil Nadu",
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "1500.00",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("customer_name", serializer.errors)

    def test_missing_customer_phone_rejected(self):
        """Missing customer phone must fail validation."""
        serializer = ServiceRequestPublicCreateSerializer(data={
            "customer_name": "Ramesh Kumar",
            "phone": "",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck Delivery",
            "description": "Commercial packaged goods",
            "address": "Hosur, Tamil Nadu",
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "1500.00",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)

    def test_fake_customer_phone_rejected(self):
        """Hardcoded fallback phone '6379222691' must be rejected."""
        serializer = ServiceRequestPublicCreateSerializer(data={
            "customer_name": "Ramesh Kumar",
            "phone": "6379222691",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck Delivery",
            "description": "Commercial packaged goods",
            "address": "Hosur, Tamil Nadu",
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "1500.00",
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("phone", serializer.errors)

    def test_valid_customer_identity_accepted(self):
        """Legitimate customer name and 10-digit phone must be accepted."""
        serializer = ServiceRequestPublicCreateSerializer(data={
            "customer_name": "Kavitha Sundaram",
            "phone": "9876543210",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck Delivery",
            "description": "Commercial packaged goods",
            "address": "Hosur, Tamil Nadu",
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "1500.00",
        })
        serializer.is_valid()
        self.assertNotIn("customer_name", serializer.errors)
        self.assertNotIn("phone", serializer.errors)


class GTHardeningP1RoadDistancePolicyTests(TestCase):
    """P1: Authoritative road distance vs straight-line estimate tests."""

    def setUp(self):
        self.mock_tier = MagicMock()
        self.mock_tier.id = 1
        self.mock_tier.name = "Tata Ace"
        self.mock_tier.per_km_rate = Decimal("25.00")
        self.mock_tier.base_fare = Decimal("850.00")
        self.mock_tier.starting_price = Decimal("850.00")
        self.mock_tier.free_km = Decimal("3.00")
        self.mock_tier.loading_unloading_charge = Decimal("0.00")
        self.mock_tier.additional_stop_charge = Decimal("150.00")
        self.mock_tier.surge_multiplier = Decimal("1.00")
        self.mock_tier.minimum_fare = Decimal("850.00")
        self.mock_tier.currency = "INR"

    @patch("service_requests.services.routing.get_route_eta")
    def test_road_distance_is_authoritative(self, mock_route):
        """When Google Maps road distance is available, quote is authoritative."""
        mock_route.return_value = {
            "distance_km": 15.4,
            "duration_seconds": 1800,
            "source": "google_maps",
        }
        quote = quote_logistics_fare(
            tier=self.mock_tier,
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
        )
        self.assertIsNotNone(quote)
        self.assertTrue(quote["is_authoritative"])
        self.assertFalse(quote["is_estimate"])
        self.assertEqual(quote["distance_source"], "google_maps")
        self.assertIsNone(quote["estimate_notice"])

    @patch("service_requests.services.routing.get_route_eta")
    def test_straight_line_fallback_is_marked_estimate(self, mock_route):
        """When road routing is unavailable, quote is explicitly marked as estimate."""
        mock_route.return_value = {
            "distance_km": 12.0,
            "duration_seconds": 1728,
            "source": "straight_line_estimate",
        }
        quote = quote_logistics_fare(
            tier=self.mock_tier,
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
        )
        self.assertIsNotNone(quote)
        self.assertFalse(quote["is_authoritative"])
        self.assertTrue(quote["is_estimate"])
        self.assertEqual(quote["distance_source"], "straight_line_estimate")
        self.assertIsNotNone(quote["estimate_notice"])
        self.assertIn("Road routing unavailable", quote["estimate_notice"])


class GTHardeningP1ProhibitedGoodsTests(TestCase):
    """P1: Server-authoritative prohibited goods policy tests."""

    def test_normal_goods_accepted(self):
        """Standard cargo description is allowed."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Office stationery and computer monitors in cartons",
            service_category="goods_transport_truck",
        )
        self.assertTrue(is_safe)
        self.assertIsNone(msg)

    def test_weapons_rejected(self):
        """Weapons and firearms must be rejected."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Moving 3 wooden boxes of rifles and ammunition",
            service_category="goods_transport_truck",
        )
        self.assertFalse(is_safe)
        self.assertEqual(cat, "WEAPONS_AND_FIREARMS")
        self.assertIn("firearms", msg.lower())

    def test_explosives_rejected(self):
        """Commercial explosives / fireworks must be rejected."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Diwali fireworks and cracker bundles",
            service_category="goods_transport_truck",
        )
        self.assertFalse(is_safe)
        self.assertEqual(cat, "EXPLOSIVES_AND_PYROTECHNICS")
        self.assertIn("fireworks", msg.lower())

    def test_narcotics_rejected(self):
        """Illicit drugs and narcotics must be rejected."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Packages containing cannabis and contraband",
            service_category="goods_transport_two_wheeler",
        )
        self.assertFalse(is_safe)
        self.assertEqual(cat, "NARCOTICS_AND_CONTRABAND")

    def test_hazardous_chemicals_rejected(self):
        """Hazardous toxic waste and cyanide must be rejected."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Drums of cyanide and toxic chemical waste",
            service_category="goods_transport_truck",
        )
        self.assertFalse(is_safe)
        self.assertEqual(cat, "HAZARDOUS_AND_TOXIC")

    def test_flammable_raw_fuels_rejected(self):
        """Raw petroleum and gasoline barrels must be rejected."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Two gasoline barrels and raw petrol tanks",
            service_category="goods_transport_truck",
        )
        self.assertFalse(is_safe)
        self.assertEqual(cat, "FLAMMABLE_FUELS")

    def test_household_items_in_packers_movers_exempted(self):
        """Legitimate household items like kitchen knives and gas stoves are allowed for P&M."""
        is_safe, msg, cat = validate_cargo_safety(
            description="Kitchen knife set, crockery, and gas stove for house shifting",
            service_category="packers_movers",
        )
        self.assertTrue(is_safe)
        self.assertIsNone(msg)

    def test_non_logistics_services_unaffected(self):
        """Non-GT services (e.g. AC Repair) are unaffected by cargo policy."""
        is_safe, msg, cat = validate_cargo_safety(
            description="AC servicing with chemical coil wash",
            service_category="hvac",
        )
        self.assertTrue(is_safe)


class GTHardeningP2PackersMoversUnknownItemTests(TestCase):
    """P1/P2: Packers & Movers uncataloged inventory review gate tests."""

    def setUp(self):
        from logistics.models import GoodsCategory, GoodsItem, PackersMoversConfig
        self.cat_bed = GoodsCategory.objects.create(name="Bedroom", slug="bedroom")
        self.cat_living = GoodsCategory.objects.create(name="Living Room", slug="living-room")
        self.item_bed = GoodsItem.objects.create(
            category=self.cat_bed,
            name="Double Bed - Dismantlable",
            slug="double-bed-dismantlable",
            default_cft=Decimal("45.0"),
            default_weight_kg=Decimal("50.0"),
            is_active=True,
        )
        self.item_fridge = GoodsItem.objects.create(
            category=self.cat_living,
            name="1-Door Refrigerator (Small)",
            slug="1-door-refrigerator-small",
            default_cft=Decimal("15.0"),
            default_weight_kg=Decimal("40.0"),
            is_active=True,
        )
        self.pm_config = PackersMoversConfig.objects.create(
            city="Hosur",
            standard_packing_rate_cft=Decimal("3.50"),
            premium_packing_rate_cft=Decimal("6.00"),
            premium_fragile_addon=Decimal("200.00"),
            floor_rate_no_lift_per_100cft=Decimal("120.00"),
            unpacking_rate_cft=Decimal("2.00"),
            gst_rate=Decimal("0.1800"),
            survey_cft_threshold=500.0,
        )
        from logistics.models import LogisticsCategory, ServiceTier
        self.pm_tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS,
            city="Hosur",
            slug="pm-standard-truck",
            name="Mini Truck (Tata Ace)",
            vehicle_class=ServiceTier.VehicleClass.TRUCK,
            starting_price=Decimal("1500.00"),
            base_fare=Decimal("1200.00"),
            per_km_rate=Decimal("25.00"),
            free_km=Decimal("3.00"),
            loading_unloading_charge=Decimal("400.00"),
            minimum_fare=Decimal("1500.00"),
            max_weight_kg=Decimal("750.00"),
            max_cft=Decimal("150.00"),
            order=1,
            is_active=True,
        )

    def test_known_item_resolution(self):
        """Known catalog items resolve with is_known=True and requires_review=False."""
        meta = match_catalog_item("Double Bed - Dismantlable")
        self.assertTrue(meta["is_known"])
        self.assertFalse(meta["requires_review"])
        self.assertEqual(meta["cft"], 45.0)

    def test_known_alias_resolution(self):
        """SEVO P0 Rule: No keyword heuristics. Unknown text without DB row resolves with is_known=False."""
        meta = match_catalog_item("Teakwood Center Coffee Table")
        self.assertFalse(meta["is_known"])
        self.assertTrue(meta["requires_review"])

    def test_unknown_item_flagged_for_review(self):
        """Uncataloged item without dimensions is flagged as requiring review."""
        meta = match_catalog_item("Industrial Hydraulic Press Machine")
        self.assertFalse(meta["is_known"])
        self.assertTrue(meta["requires_review"])
        self.assertIsNone(meta["cft"])

    def test_unknown_item_in_inventory_triggers_manual_review(self):
        """Inventory with uncataloged item triggers manual review and is not authoritative."""
        inventory = {
            "Single Bed - Foldable": 1,
            "Industrial Hydraulic Press Machine": 1,
        }
        quote = compute_packers_movers_quote(
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
            inventory=inventory,
        )
        self.assertTrue(quote["requires_review"])
        self.assertFalse(quote["is_authoritative"])
        self.assertEqual(quote["survey_status"], "MANUAL_REVIEW_REQUIRED")
        self.assertIn("Industrial Hydraulic Press Machine", quote["unrecognized_items"])

    def test_unknown_item_with_explicit_dimensions_accepted(self):
        """Uncataloged item with explicit customer dimensions marks customer_custom_dimensions and requires review."""
        inventory = [
            {"name": "Custom Metal Sculpture", "cft": 18.0, "weight_kg": 35.0, "quantity": 1}
        ]
        metrics = calculate_inventory_metrics(inventory)
        self.assertTrue(metrics["requires_review"])
        self.assertEqual(metrics["items"][0]["dims_source"], "customer_custom_dimensions")
        self.assertEqual(metrics["total_cft"], 18.0)
        self.assertEqual(metrics["total_weight_kg"], 35.0)

    @patch("service_requests.services.routing.get_route_eta")
    def test_straight_line_estimate_distance_never_authoritative(self, mock_route):
        """Rule 1: Non-authoritative distance (straight-line estimate) must NEVER become an authoritative quote."""
        mock_route.return_value = {
            "distance_km": 8.5,
            "duration_minutes": 25,
            "distance_source": "straight_line_estimate",
            "is_authoritative": False,
        }
        inventory = [{"name": "1-Door Refrigerator (Small)", "quantity": 1}]
        quote = compute_packers_movers_quote(
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
            inventory=inventory,
        )
        self.assertFalse(quote["is_authoritative"])
        self.assertTrue(quote["is_estimate"])
        self.assertEqual(quote["distance_source"], "straight_line_estimate")
        self.assertEqual(quote["survey_status"], "SURVEY_REQUIRED")
        self.assertTrue(quote["requires_survey"])
        self.assertIsNotNone(quote["estimate_notice"])
        self.assertIn("straight-line", quote["estimate_notice"].lower())

    def test_survey_required_blocks_instant_finalization(self):
        """Rule 2: SURVEY_REQUIRED must block instant quote verification."""
        from django.core.cache import cache
        quote_id = "PMQ-TEST-SURVEY-01"
        cache.set(f"pm_quote_{quote_id}", {
            "quote_id": quote_id,
            "total": Decimal("2500.00"),
            "survey_status": "SURVEY_REQUIRED",
            "requires_survey": True,
            "is_authoritative": False,
            "is_estimate": True,
            "estimate_notice": "Road routing failed. Pre-move survey required.",
            "valid_until": (timezone.now() + timezone.timedelta(hours=24)).isoformat(),
        }, timeout=300)

        is_valid, cached, err = verify_packers_movers_quote(quote_id, submitted_total="2500.00")
        self.assertFalse(is_valid)
        self.assertIn("survey", err.lower())
        self.assertIn("cannot be finalized", err.lower())

    def test_manual_review_required_blocks_instant_finalization(self):
        """Rule 2: MANUAL_REVIEW_REQUIRED must block instant quote verification."""
        from django.core.cache import cache
        quote_id = "PMQ-TEST-REVIEW-02"
        cache.set(f"pm_quote_{quote_id}", {
            "quote_id": quote_id,
            "total": Decimal("3500.00"),
            "survey_status": "MANUAL_REVIEW_REQUIRED",
            "requires_review": True,
            "is_authoritative": False,
            "is_estimate": True,
            "unrecognized_items": ["Custom Heavy Machine"],
            "review_reason": "Uncataloged items detected",
            "valid_until": (timezone.now() + timezone.timedelta(hours=24)).isoformat(),
        }, timeout=300)

        is_valid, cached, err = verify_packers_movers_quote(quote_id, submitted_total="3500.00")
        self.assertFalse(is_valid)
        self.assertIn("manual review", err.lower())
        self.assertIn("cannot be finalized", err.lower())


class GTBookingIdempotencyTests(TestCase):
    """
    Rule 4 & 5: Booking Idempotency Verification.
    Tests:
    1. Request A: POST booking with Idempotency-Key X.
    2. Retry Request: POST same booking with Idempotency-Key X returns exact same booking without duplicate DB records.
    3. Request B: POST booking with Idempotency-Key Y creates a separate distinct booking.
    """

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.factory = APIRequestFactory()

    @patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job")
    @patch("service_requests.notifications.send_booking_confirmation")
    @patch("django.contrib.auth.get_user_model")
    @patch("service_requests.views._get_company")
    @patch("settings_hub.service_zone_engine.check_booking_eligibility")
    @patch("service_requests.views.resolve_logistics_fare_v2")
    @patch("service_requests.serializers.ServiceRequestPublicCreateSerializer.save")
    def test_idempotency_retry_returns_same_booking_without_duplicate(self, mock_save, mock_resolve_fare, mock_check_eligibility, mock_get_co, mock_get_user_model, mock_send_sms, mock_dispatch):
        from service_requests.views import BookingCreateView

        mock_user = MagicMock(id=10, email="suresh@test.com", phone="9876543210")
        mock_user_cls = MagicMock()
        mock_user_cls.objects.filter.return_value.first.return_value = mock_user
        mock_get_user_model.return_value = mock_user_cls

        mock_co = MagicMock()
        mock_co.id = 1
        mock_co.slug = "default"
        mock_get_co.return_value = mock_co

        # Mock eligibility gate
        mock_elig = MagicMock()
        mock_elig.allowed = True
        mock_elig.zone_id = 1
        mock_elig.zone_name = "Hosur Central"
        mock_check_eligibility.return_value = mock_elig

        # Mock fare resolution
        mock_resolve_fare.return_value = (Decimal("150.00"), {"distance_km": 5.0, "total": 150.0})

        class DummyBooking:
            def __init__(self, bid=7001, req_id="GT7001"):
                self.id = bid
                self.request_id = req_id
                self.tracking_token = f"uuid-token-{bid}"
                self.total_amount = Decimal("150.00")
                self.status = "confirmed"
                self.payment_method = "COD"
                self.payment_status = "PENDING"
                self.start_otp = "1234"
                self.phone = "9876543210"
                self.customer = None
                self.cart_data = []

        mock_sr = DummyBooking(7001, "GT7001")
        mock_save.return_value = mock_sr

        view = BookingCreateView.as_view()
        payload = {
            "customer_name": "Suresh Kumar",
            "phone": "9876543210",
            "service_category": "goods_transport_two_wheeler",
            "issue_title": "Two-wheeler delivery",
            "description": "General Goods",
            "address": "Hosur Bus Stand, Hosur",
            "drop_address": "Sipcot Phase 1, Hosur",
            "latitude": 12.7409,
            "longitude": 77.8253,
            "drop_latitude": 12.7500,
            "drop_longitude": 77.8350,
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "150.00",
        }

        # Request 1 with Idempotency-Key: KEY-ALPHA
        req1 = self.factory.post("/api/booking/", payload, format="json", HTTP_IDEMPOTENCY_KEY="KEY-ALPHA")
        resp1 = view(req1)
        self.assertEqual(resp1.status_code, 201)
        booking_id_1 = (resp1.data.get("data") or {}).get("request_id") or resp1.data.get("request_id")

        # Save was called once
        self.assertEqual(mock_save.call_count, 1)

        # Request 2 (simulated client retry) with SAME Idempotency-Key: KEY-ALPHA
        req2 = self.factory.post("/api/booking/", payload, format="json", HTTP_IDEMPOTENCY_KEY="KEY-ALPHA")
        resp2 = view(req2)
        self.assertEqual(resp2.status_code, 201)
        booking_id_2 = (resp2.data.get("data") or {}).get("request_id") or resp2.data.get("request_id")

        # Must resolve to the exact same booking
        self.assertEqual(booking_id_1, booking_id_2)
        self.assertEqual(booking_id_1, "GT7001")

        # Save MUST NOT have been called again (strictly 1 booking created!)
        self.assertEqual(mock_save.call_count, 1)

    @patch("workforce_integration.services.WorkforceIntegrationService.dispatch_job")
    @patch("service_requests.notifications.send_booking_confirmation")
    @patch("django.contrib.auth.get_user_model")
    @patch("service_requests.views._get_company")
    @patch("settings_hub.service_zone_engine.check_booking_eligibility")
    @patch("service_requests.views.resolve_logistics_fare_v2")
    @patch("service_requests.serializers.ServiceRequestPublicCreateSerializer.save")
    def test_distinct_idempotency_keys_create_separate_bookings(self, mock_save, mock_resolve_fare, mock_check_eligibility, mock_get_co, mock_get_user_model, mock_send_sms, mock_dispatch):
        from service_requests.views import BookingCreateView

        mock_user = MagicMock(id=10, email="suresh@test.com", phone="9876543210")
        mock_user_cls = MagicMock()
        mock_user_cls.objects.filter.return_value.first.return_value = mock_user
        mock_get_user_model.return_value = mock_user_cls

        mock_co = MagicMock()
        mock_co.id = 1
        mock_co.slug = "default"
        mock_get_co.return_value = mock_co

        # Mock eligibility gate
        mock_elig = MagicMock()
        mock_elig.allowed = True
        mock_elig.zone_id = 1
        mock_elig.zone_name = "Hosur Central"
        mock_check_eligibility.return_value = mock_elig

        # Mock fare resolution
        mock_resolve_fare.return_value = (Decimal("150.00"), {"distance_km": 5.0, "total": 150.0})

        class DummyBooking:
            def __init__(self, bid=8001, req_id="GT8001"):
                self.id = bid
                self.request_id = req_id
                self.tracking_token = f"uuid-token-{bid}"
                self.total_amount = Decimal("150.00")
                self.status = "confirmed"
                self.payment_method = "COD"
                self.payment_status = "PENDING"
                self.start_otp = "1234"
                self.phone = "9876543210"
                self.customer = None
                self.cart_data = []

        mock_sr1 = DummyBooking(8001, "GT8001")
        mock_sr2 = DummyBooking(8002, "GT8002")

        mock_save.side_effect = [mock_sr1, mock_sr2]

        view = BookingCreateView.as_view()
        payload = {
            "customer_name": "Suresh Kumar",
            "phone": "9876543210",
            "service_category": "goods_transport_two_wheeler",
            "issue_title": "Two-wheeler delivery",
            "description": "General Goods",
            "address": "Hosur Bus Stand, Hosur",
            "drop_address": "Sipcot Phase 1, Hosur",
            "latitude": 12.7409,
            "longitude": 77.8253,
            "drop_latitude": 12.7500,
            "drop_longitude": 77.8350,
            "preferred_date": timezone.localdate().isoformat(),
            "total_amount": "150.00",
        }

        # Request A with Key KEY-AAA
        req_a = self.factory.post("/api/booking/", payload, format="json", HTTP_IDEMPOTENCY_KEY="KEY-AAA")
        resp_a = view(req_a)
        self.assertEqual(resp_a.status_code, 201)

        # Request B with Key KEY-BBB
        req_b = self.factory.post("/api/booking/", payload, format="json", HTTP_IDEMPOTENCY_KEY="KEY-BBB")
        resp_b = view(req_b)
        self.assertEqual(resp_b.status_code, 201)

        # Both succeeded, but save was called twice for two separate bookings
        self.assertEqual(mock_save.call_count, 2)
        booking_id_a = (resp_a.data.get("data") or {}).get("request_id") or resp_a.data.get("request_id")
        booking_id_b = (resp_b.data.get("data") or {}).get("request_id") or resp_b.data.get("request_id")
        self.assertEqual(booking_id_a, "GT8001")
        self.assertEqual(booking_id_b, "GT8002")


class GTPreUATAuthoritativePriceDisplayTests(TestCase):
    """
    PRE-UAT VERIFICATION: Authoritative Price Display Only (Rules 1-8).
    Proves:
    1. Two-Wheeler has no ₹48 / ₹ 48 fallback in actual fare display or success modal.
    2. P&M has no ₹1,499 fallback in final booking amount.
    3. Mini Truck final amount uses server booking total (lastBookingAmount).
    4. Two-Wheeler final amount uses server booking total (lastBookingAmount).
    5. P&M final amount uses server booking total (lastBookingAmount).
    6. Failed quote does not display a fake fare.
    7. Successful booking displays authoritative total.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.frontend_pages_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
            "frontend", "src", "ui", "pages"
        )
        with open(os.path.join(cls.frontend_pages_dir, "TwoWheelerBookingHosurPage.jsx"), "r", encoding="utf-8") as f:
            cls.tw_jsx = f.read()
        with open(os.path.join(cls.frontend_pages_dir, "MiniTruckBookingHosurPage.jsx"), "r", encoding="utf-8") as f:
            cls.truck_jsx = f.read()
        with open(os.path.join(cls.frontend_pages_dir, "PackersMoversBookingHosurPage.jsx"), "r", encoding="utf-8") as f:
            cls.pm_jsx = f.read()

    def test_tw_has_no_48_fallback_in_actual_fare_display(self):
        """Rule 1 & 8.1: Two-Wheeler has no ₹48 / ₹ 48 fallback in actual fare display."""
        self.assertNotIn("₹48", self.tw_jsx)
        self.assertNotIn("₹ 48", self.tw_jsx)
        self.assertNotIn("selectedVehicle?.price || (selectedRoute ? selectedRoute.fare", self.tw_jsx)
        self.assertIn("serverQuote?.total != null", self.tw_jsx)

    def test_pm_has_no_1499_fallback_in_final_booking_amount(self):
        """Rule 4 & 8.2: P&M has no ₹1,499 fallback in final booking amount."""
        self.assertNotIn('selectedPackage?.price || "₹1,499"', self.pm_jsx)
        self.assertNotIn("Estimated Base Package", self.pm_jsx)
        self.assertIn("Final Booking Amount:", self.pm_jsx)
        self.assertIn("lastBookingAmount != null", self.pm_jsx)

    def test_mini_truck_final_amount_uses_server_booking_total(self):
        """Rule 3 & 8.3: Mini Truck final amount uses server booking total."""
        self.assertIn("const [lastBookingAmount, setLastBookingAmount] = useState(null)", self.truck_jsx)
        self.assertIn("setLastBookingAmount(authoritativeAmount)", self.truck_jsx)
        self.assertIn("Final Booking Amount", self.truck_jsx)
        self.assertNotIn("selectedRoute?.fare ? selectedRoute.fare :", self.truck_jsx)

    def test_two_wheeler_final_amount_uses_server_booking_total(self):
        """Rule 2 & 8.4: Two-Wheeler final amount uses server booking total."""
        self.assertIn("const [lastBookingAmount, setLastBookingAmount] = useState(null)", self.tw_jsx)
        self.assertIn("setLastBookingAmount(authoritativeAmount)", self.tw_jsx)
        self.assertIn("Final Booking Amount", self.tw_jsx)
        self.assertNotIn("Estimated Base Fare", self.tw_jsx)

    def test_pm_final_amount_uses_server_booking_total(self):
        """Rule 4 & 8.5: P&M final amount uses server booking total."""
        self.assertIn("const [lastBookingAmount, setLastBookingAmount] = useState(null)", self.pm_jsx)
        self.assertIn("setLastBookingAmount(authoritativeAmount)", self.pm_jsx)
        self.assertIn("Final Booking Amount:", self.pm_jsx)
        self.assertNotIn("₹ 455", self.pm_jsx)

    def test_failed_quote_does_not_display_fake_fare(self):
        """Rule 6 & 8.6: Failed quote returns None/error and frontend displays 'Fare unavailable'."""
        quote = quote_logistics_fare(
            tier=None,
            pickup_lat=12.734,
            pickup_lng=77.828,
            drop_lat=12.850,
            drop_lng=77.780,
        )
        self.assertIsNone(quote)
        self.assertIn("Fare unavailable", self.tw_jsx)
        self.assertIn("Fare unavailable", self.truck_jsx)
        self.assertIn("Fare unavailable", self.pm_jsx)

    def test_successful_booking_displays_authoritative_total(self):
        """Rule 5, 7 & 8.7: Successful booking response returns authoritative total_amount."""
        from service_requests.views import BookingCreateView
        import inspect
        source = inspect.getsource(BookingCreateView.post)
        self.assertIn('"total_amount": float(sr.total_amount)', source)
        self.assertIn('"request_id": sr.request_id', source)

    def test_frontend_gt_idempotency_keys_present(self):
        """Rule 4: All GT booking submissions generate and send persistent Idempotency-Key."""
        # Two-Wheeler
        self.assertIn("bookingAttemptKeyRef", self.tw_jsx)
        self.assertIn("createBooking(payload, attemptKey)", self.tw_jsx)
        # Mini Truck
        self.assertIn("bookingAttemptKeyRef", self.truck_jsx)
        self.assertIn("createBooking(payload, attemptKey)", self.truck_jsx)
        # Packers & Movers
        self.assertIn("bookingAttemptKeyRef", self.pm_jsx)
        self.assertIn("createBooking(payload, attemptKey)", self.pm_jsx)

    def test_pm_frontend_handles_survey_required(self):
        """Rule 3: P&M UI explicitly communicates survey required state and avoids instant confirmed fare."""
        self.assertIn("isSurveyRequired", self.pm_jsx)
        self.assertIn("Survey Required", self.pm_jsx)
        self.assertIn("Your move needs a quick survey before the final price can be confirmed.", self.pm_jsx)
        self.assertIn("Request Pre-Move Survey", self.pm_jsx)
        self.assertIn("Estimated Fare (Subject to Survey)", self.pm_jsx)
        self.assertIn("Survey Request Received!", self.pm_jsx)


if __name__ == "__main__":
    unittest.main()
