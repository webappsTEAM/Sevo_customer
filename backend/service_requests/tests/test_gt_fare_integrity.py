"""
service_requests/tests/test_gt_fare_integrity.py

Fare integrity for Goods & Transport: the customer picks the price by
picking a tier, so the server has to check the tier they picked is one this
booking is allowed to price from.

The hole this closes: a tier id is just a number in the request body.
Nothing verified it belonged to the category being booked, so a caller
could ask for a `goods_transport_truck` trip while naming a `two_wheeler`
tier and be quoted -- and then booked at -- the scooter fare for a truck.
Both the quote endpoint and the booking path resolved the same unchecked
tier, so they agreed with each other and were wrong together.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from companies.models import Company
from logistics.models import ServiceTier
from service_requests.models import ServiceRequest
from service_requests.services.logistics_pricing import (
    SERVICE_CATEGORY_TO_TIER_CATEGORY,
    LogisticsCatalogMismatchError,
    UnresolvedLogisticsFareError,
    assert_catalog_matches_category,
    resolve_logistics_fare_v2,
)

User = get_user_model()

PICKUP = {"lat": Decimal("12.740900"), "lng": Decimal("77.825300")}
DROP = {"lat": Decimal("12.971600"), "lng": Decimal("77.594600")}


def _tier(category, name, **extra):
    defaults = dict(
        category=category, city="Hosur", slug=name.lower().replace(" ", "-"),
        name=name, starting_price=Decimal("400.00"),
        base_fare=Decimal("250.00"), per_km_rate=Decimal("18.00"),
        free_km=Decimal("2.00"), minimum_fare=Decimal("300.00"),
        loading_unloading_charge=Decimal("50.00"),
        additional_stop_charge=Decimal("40.00"),
        # GT audit Update 18: real ServiceTier rows always carry a
        # vehicle_class (migration 0010 backfilled every row; 0011 made a
        # blank value fail closed), and a goods-transport booking against a
        # tier without one is now refused. Callers override it via **extra.
        vehicle_class="truck",
    )
    defaults.update(extra)
    return ServiceTier.objects.create(**defaults)


class CatalogCategoryGateTests(APITestCase):
    """The rule itself, at the service layer both callers share."""

    def setUp(self):
        self.truck = _tier("truck", "Tata Ace")
        self.scooter = _tier("two_wheeler", "Scooter", starting_price=Decimal("60.00"),
                             base_fare=Decimal("25.00"), per_km_rate=Decimal("6.00"))

    def test_a_matching_tier_is_accepted(self):
        assert_catalog_matches_category("goods_transport_truck", tier=self.truck)
        assert_catalog_matches_category("goods_transport_two_wheeler", tier=self.scooter)

    def test_a_two_wheeler_tier_cannot_price_a_truck_booking(self):
        with self.assertRaises(LogisticsCatalogMismatchError):
            assert_catalog_matches_category("goods_transport_truck", tier=self.scooter)

    def test_an_inactive_tier_cannot_price_anything(self):
        self.truck.is_active = False
        self.truck.save(update_fields=["is_active"])
        with self.assertRaises(LogisticsCatalogMismatchError):
            assert_catalog_matches_category("goods_transport_truck", tier=self.truck)

    def test_the_mismatch_is_a_kind_of_unresolvable_fare(self):
        # Callers already refuse the booking on UnresolvedLogisticsFareError,
        # so the subclass inherits the right outcome without every call site
        # learning a new exception.
        self.assertTrue(
            issubclass(LogisticsCatalogMismatchError, UnresolvedLogisticsFareError)
        )

    def test_the_fare_resolver_refuses_a_substituted_tier(self):
        with self.assertRaises(LogisticsCatalogMismatchError):
            resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=self.scooter,
                logistics_lane=None,
                submitted_amount=Decimal("60.00"),
                pickup_lat=PICKUP["lat"], pickup_lng=PICKUP["lng"],
                drop_lat=DROP["lat"], drop_lng=DROP["lng"],
            )

    def test_a_matching_tier_still_prices_normally(self):
        fare, breakdown = resolve_logistics_fare_v2(
            service_category="goods_transport_truck",
            logistics_tier=self.truck,
            logistics_lane=None,
            submitted_amount=Decimal("1.00"),
            pickup_lat=PICKUP["lat"], pickup_lng=PICKUP["lng"],
            drop_lat=DROP["lat"], drop_lng=DROP["lng"],
        )
        self.assertGreater(fare, Decimal("1.00"))
        self.assertIsNotNone(breakdown)
        self.assertEqual(breakdown["base_fare"], Decimal("250.00"))

    def test_non_logistics_bookings_are_untouched(self):
        fare, breakdown = resolve_logistics_fare_v2(
            service_category="painting",
            logistics_tier=self.scooter,   # nonsense, and irrelevant here
            logistics_lane=None,
            submitted_amount=Decimal("999.00"),
        )
        self.assertEqual(fare, Decimal("999.00"))
        self.assertIsNone(breakdown)


class QuoteEndpointCategoryTests(APITestCase):
    """The same rule reaching the customer-facing quote endpoint."""

    def setUp(self):
        self.truck = _tier("truck", "Tata Ace")
        self.scooter = _tier("two_wheeler", "Scooter", starting_price=Decimal("60.00"),
                             base_fare=Decimal("25.00"), per_km_rate=Decimal("6.00"))

    def _quote(self, category, tier):
        return self.client.post("/api/logistics/quote/", {
            "service_category": category,
            "tier_id": tier.id,
            "pickup_latitude": str(PICKUP["lat"]), "pickup_longitude": str(PICKUP["lng"]),
            "drop_latitude": str(DROP["lat"]), "drop_longitude": str(DROP["lng"]),
        }, format="json")

    def test_matching_tier_quotes_successfully(self):
        res = self._quote("goods_transport_truck", self.truck)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data["data"]["quotable"])

    def test_substituted_tier_is_refused(self):
        res = self._quote("goods_transport_truck", self.scooter)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["error_code"], "TIER_CATEGORY_MISMATCH")

    def test_inactive_tier_is_refused(self):
        self.truck.is_active = False
        self.truck.save(update_fields=["is_active"])
        res = self._quote("goods_transport_truck", self.truck)
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["error_code"], "TIER_NOT_FOUND")


class BookingFareAuthorityTests(APITestCase):
    """
    The booking path: the stored fare must be the server's, and a
    substituted tier must not produce a booking at all.
    """

    def setUp(self):
        self.company = Company.objects.create(company_name="SEVO", slug="sevo-fare")
        self.customer = User.objects.create_user(
            username="fare_int", phone="9998887779",
            email="fare_int@example.com", role="CUSTOMER")
        self.truck = _tier("truck", "Tata Ace")
        self.scooter = _tier("two_wheeler", "Scooter", starting_price=Decimal("60.00"),
                             base_fare=Decimal("25.00"), per_km_rate=Decimal("6.00"))

    def _payload(self, tier, **extra):
        body = {
            "customer_name": "Fare Test", "phone": "9998887779",
            "email": "fare_int@example.com",
            "service_category": "goods_transport_truck",
            "issue_title": "Mini Truck",
            "description": "Two mattresses and six cartons, about 200 kg, nothing fragile.",
            "address": "SIPCOT Phase 1, Hosur",
            "drop_address": "Electronic City, Bengaluru",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": str(PICKUP["lat"]), "longitude": str(PICKUP["lng"]),
            "drop_latitude": str(DROP["lat"]), "drop_longitude": str(DROP["lng"]),
            "logistics_tier": tier.id,
            "total_amount": 1,          # tampered, must never be stored
            "cart_data": [],
        }
        body.update(extra)
        return body

    def test_client_supplied_total_is_never_stored(self):
        res = self.client.post(reverse("sr-booking"), self._payload(self.truck), format="json")
        self.assertEqual(res.status_code, 201, res.data)
        sr = ServiceRequest.objects.get(request_id=res.data["data"]["request_id"])
        self.assertNotEqual(sr.total_amount, Decimal("1"))
        self.assertGreater(sr.total_amount, Decimal("300.00"))

    def test_the_stored_breakdown_is_itemised_and_names_its_distance_source(self):
        res = self.client.post(reverse("sr-booking"), self._payload(self.truck), format="json")
        sr = ServiceRequest.objects.get(request_id=res.data["data"]["request_id"])
        bd = sr.fare_breakdown
        for key in ("total", "base_fare", "distance_km", "chargeable_km",
                    "distance_charge", "loading_unloading", "subtotal",
                    "surge_multiplier", "minimum_fare_applied", "distance_source"):
            self.assertIn(key, bd)
        # A straight-line estimate must be auditable as one, never passed off
        # as a measured road distance.
        self.assertIn(bd["distance_source"], ("google_maps", "straight_line_estimate"))
        self.assertEqual(Decimal(str(bd["total"])), sr.total_amount)

    def test_a_substituted_tier_produces_no_booking(self):
        before = ServiceRequest.objects.count()
        res = self.client.post(reverse("sr-booking"), self._payload(self.scooter), format="json")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(ServiceRequest.objects.count(), before)

    def test_a_logistics_booking_with_no_tier_at_all_is_refused(self):
        body = self._payload(self.truck)
        body.pop("logistics_tier")
        res = self.client.post(reverse("sr-booking"), body, format="json")
        self.assertEqual(res.status_code, 400)


class SeedDataMatchesTheCategoryGateTests(APITestCase):
    """
    The production seed command and the category gate have to agree.

    They use two different vocabularies for the same idea -- the seed writes
    LogisticsCategory values ("truck"), bookings carry service_category
    values ("goods_transport_truck") -- so a divergence here would refuse
    every real booking in production while every unit test still passed.
    """

    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command
        call_command("seed_logistics_hosur", verbosity=0)

    def test_the_seed_produces_tiers_for_every_bookable_category(self):
        for service_category in ("goods_transport_truck",
                                 "goods_transport_two_wheeler",
                                 "packers_movers"):
            expected = SERVICE_CATEGORY_TO_TIER_CATEGORY[service_category]
            self.assertTrue(
                ServiceTier.objects.filter(category=expected, is_active=True).exists(),
                f"no seeded tier can serve a {service_category} booking",
            )

    def test_every_seeded_tier_passes_the_gate_for_its_own_category(self):
        reverse_map = {v: k for k, v in SERVICE_CATEGORY_TO_TIER_CATEGORY.items()}
        for tier in ServiceTier.objects.all():
            service_category = reverse_map.get(tier.category)
            self.assertIsNotNone(
                service_category,
                f"seeded tier {tier.slug!r} has category {tier.category!r}, which no "
                f"bookable service_category maps to",
            )
            assert_catalog_matches_category(service_category, tier=tier)

    def test_every_seeded_tier_has_a_price_the_server_can_charge(self):
        # starting_price is the floor of the whole fare chain: it is what a
        # tier falls back to when distance pricing is not configured, so a
        # tier without one has no server-verifiable fare at all.
        for tier in ServiceTier.objects.all():
            self.assertIsNotNone(tier.starting_price, tier.slug)
            self.assertGreater(tier.starting_price, Decimal("0.00"), tier.slug)

    def test_re_running_the_seed_does_not_revert_rates_tuned_after_launch(self):
        """
        The seed runs on deploys. A tier whose rates someone has since tuned
        in the admin must survive that -- silently reverting live pricing on
        a routine redeploy would be the worst thing this command could do.
        """
        from django.core.management import call_command

        tier = ServiceTier.objects.get(slug="tata-ace")
        tier.per_km_rate = Decimal("26.50")      # a deliberate post-launch change
        tier.base_fare = Decimal("240.00")
        tier.save(update_fields=["per_km_rate", "base_fare"])

        call_command("seed_logistics_hosur", verbosity=0)

        tier.refresh_from_db()
        self.assertEqual(tier.per_km_rate, Decimal("26.50"))
        self.assertEqual(tier.base_fare, Decimal("240.00"))

    def test_force_pricing_resets_a_tuned_tier_back_to_the_card(self):
        # The deliberate escape hatch, so "we cannot revert" is a choice and
        # not a limitation.
        from django.core.management import call_command

        tier = ServiceTier.objects.get(slug="tata-ace")
        tier.per_km_rate = Decimal("26.50")
        tier.save(update_fields=["per_km_rate"])

        call_command("seed_logistics_hosur", "--force-pricing", verbosity=0)

        tier.refresh_from_db()
        self.assertEqual(tier.per_km_rate, Decimal("22.00"))


class CategoryVocabularyTests(APITestCase):
    """
    The four logistics category sets across the two apps must agree.

    They drifted once already, and in the worst possible direction: the bare
    `goods_transport` slug was present in the vendor's dispatch set, in this
    app's multi-stop trip-editor gate and in vendor_views' copy, but missing
    from LOGISTICS_CATEGORIES -- the one set that decides whether a
    client-supplied total is trusted. So the vendor treated those bookings as
    logistics for dispatch, legs and stops, while this app priced them at
    whatever the client sent.
    """

    CANONICAL = {
        "goods_transport",
        "goods_transport_truck",
        "goods_transport_two_wheeler",
        "packers_movers",
    }

    def test_the_pricing_gate_covers_every_logistics_slug(self):
        from service_requests.services.logistics_pricing import LOGISTICS_CATEGORIES
        self.assertEqual(set(LOGISTICS_CATEGORIES), self.CANONICAL)

    def test_the_trip_stop_gate_agrees(self):
        from service_requests.services import LOGISTICS_STOP_CATEGORIES
        self.assertEqual(set(LOGISTICS_STOP_CATEGORIES), self.CANONICAL)

    def test_every_slug_with_a_gt_request_prefix_is_priced_as_logistics(self):
        """
        The request-id prefix map is the closest thing to a registry of live
        category slugs. Anything it labels GT or PM is a goods-transport
        booking and must not be priced from a client-supplied amount.
        """
        from service_requests.models import CATEGORY_PREFIX_MAP
        from service_requests.services.logistics_pricing import LOGISTICS_CATEGORIES

        gt_slugs = {
            slug for slug, prefix in CATEGORY_PREFIX_MAP.items()
            if prefix in ("GT", "PM")
        }
        unpriced = gt_slugs - set(LOGISTICS_CATEGORIES)
        self.assertEqual(
            unpriced, {"truck"},
            "a goods-transport slug is not covered by the pricing gate, so its "
            f"bookings would be priced from the client's amount: {sorted(unpriced)}",
        )

    def test_the_bare_slug_is_not_distance_priced(self):
        # It does not say truck or two-wheeler, so there is no tier category
        # to validate a distance quote against.
        from service_requests.services.logistics_pricing import DISTANCE_PRICED_CATEGORIES
        self.assertNotIn("goods_transport", DISTANCE_PRICED_CATEGORIES)

    def test_a_bare_slug_booking_refuses_rather_than_trusting_the_client(self):
        from service_requests.services.logistics_pricing import (
            UnresolvedLogisticsFareError, resolve_logistics_fare_v2,
        )
        with self.assertRaises(UnresolvedLogisticsFareError):
            resolve_logistics_fare_v2(
                service_category="goods_transport",
                logistics_tier=None, logistics_lane=None,
                submitted_amount=Decimal("1.00"),
            )


class LaunchRateCardTests(APITestCase):
    """
    The SEVO Goods & Transport launch rate card, asserted value by value.

    These are SEVO's own proposed rates, supplied by the business. Every
    number below is pinned so a later edit to the seed -- or to the fare
    formula -- cannot move a published price without a test saying so.
    """

    # slug -> (base_fare, per_km_rate, free_km, minimum_fare,
    #          loading_unloading_charge, additional_stop_charge)
    CARD = {
        "3-wheeler":                  ("150.00", "18.00", "2.00", "150.00", "40.00", "30.00"),
        "tata-ace":                   ("220.00", "22.00", "3.00", "220.00", "60.00", "40.00"),
        "pickup-8ft":                 ("300.00", "28.00", "3.00", "300.00", "80.00", "50.00"),
        "1-7-ton":                    ("450.00", "40.00", "5.00", "450.00", "120.00", "75.00"),
        "2-wheeler":                  ("50.00",  "10.00", "1.00", "50.00",  "10.00", "15.00"),
        "2-wheeler-electric-express": ("60.00",  "11.00", "1.00", "60.00",  "10.00", "15.00"),
    }

    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command
        call_command("seed_logistics_hosur", verbosity=0)

    def test_every_tier_carries_its_exact_card_values(self):
        for slug, (base, per_km, free, minimum, load, stop) in self.CARD.items():
            with self.subTest(slug=slug):
                t = ServiceTier.objects.get(slug=slug)
                self.assertEqual(t.base_fare, Decimal(base))
                self.assertEqual(t.per_km_rate, Decimal(per_km))
                self.assertEqual(t.free_km, Decimal(free))
                self.assertEqual(t.minimum_fare, Decimal(minimum))
                self.assertEqual(t.loading_unloading_charge, Decimal(load))
                self.assertEqual(t.additional_stop_charge, Decimal(stop))

    def test_surge_is_left_at_one_because_no_surge_value_was_supplied(self):
        for slug in self.CARD:
            self.assertEqual(
                ServiceTier.objects.get(slug=slug).surge_multiplier, Decimal("1.00"),
                f"{slug}: a surge value was invented",
            )

    def test_packers_movers_stays_survey_priced(self):
        # H.2: relocation is volume/inventory/crew based and starts with a
        # physical survey. A per-km rate here would be data the fare engine
        # never reads, and it would make the tier look distance-priced.
        for tier in ServiceTier.objects.filter(category="packers_movers"):
            with self.subTest(slug=tier.slug):
                self.assertIsNone(tier.per_km_rate, tier.slug)
                self.assertIsNone(tier.base_fare, tier.slug)
                self.assertGreater(tier.starting_price, Decimal("0.00"))

    def test_packers_movers_is_not_distance_priced_in_the_engine_either(self):
        from service_requests.services.logistics_pricing import DISTANCE_PRICED_CATEGORIES
        self.assertNotIn("packers_movers", DISTANCE_PRICED_CATEGORIES)


class LaunchFareExamplesTests(APITestCase):
    """
    Worked fares at 2, 5, 10 and 20 km, computed by the real engine with the
    distance stubbed at the boundary (this environment cannot reach Google,
    and the point here is the arithmetic, not the road network).

    fare = base_fare + max(0, km - free_km) x per_km_rate
           + loading_unloading_charge, x surge, floored at minimum_fare
    """

    EXPECTED = {
        # slug: {km: fare}
        "3-wheeler":                  {2: "190.00", 5: "244.00", 10: "334.00", 20: "514.00"},
        "tata-ace":                   {2: "280.00", 5: "324.00", 10: "434.00", 20: "654.00"},
        "pickup-8ft":                 {2: "380.00", 5: "436.00", 10: "576.00", 20: "856.00"},
        "1-7-ton":                    {2: "570.00", 5: "570.00", 10: "770.00", 20: "1170.00"},
        "2-wheeler":                  {2: "70.00",  5: "100.00", 10: "150.00", 20: "250.00"},
        "2-wheeler-electric-express": {2: "81.00",  5: "114.00", 10: "169.00", 20: "279.00"},
    }

    @classmethod
    def setUpTestData(cls):
        from django.core.management import call_command
        call_command("seed_logistics_hosur", verbosity=0)

    def _fare(self, slug, km, stop_count=2):
        from unittest.mock import patch
        from service_requests.services.logistics_pricing import quote_logistics_fare

        tier = ServiceTier.objects.get(slug=slug)
        route = {"distance_km": float(km), "duration_seconds": 600, "source": "google_maps"}
        with patch("service_requests.services.routing.get_route_eta", return_value=route):
            return quote_logistics_fare(
                tier=tier,
                pickup_lat=PICKUP["lat"], pickup_lng=PICKUP["lng"],
                drop_lat=DROP["lat"], drop_lng=DROP["lng"],
                stop_count=stop_count,
            )

    def test_worked_fares_at_2_5_10_and_20_km(self):
        for slug, by_km in self.EXPECTED.items():
            for km, expected in by_km.items():
                with self.subTest(slug=slug, km=km):
                    self.assertEqual(self._fare(slug, km)["total"], Decimal(expected))

    def test_free_km_is_actually_free(self):
        # 1.7 ton includes 5 km, so 2 km and 5 km cost the same.
        self.assertEqual(self._fare("1-7-ton", 2)["total"],
                         self._fare("1-7-ton", 5)["total"])

    def test_the_minimum_fare_never_binds_on_this_card(self):
        # Worth stating: on every tier base_fare + loading already exceeds
        # minimum_fare, so the floor is inert. If a future card lowers a base
        # below its minimum this test fails and someone looks at it.
        for slug in self.EXPECTED:
            bd = self._fare(slug, 0)
            self.assertFalse(bd["minimum_fare_applied"], slug)

    def test_an_extra_stop_adds_exactly_the_cards_stop_charge(self):
        two = self._fare("tata-ace", 10, stop_count=2)["total"]
        three = self._fare("tata-ace", 10, stop_count=3)["total"]
        self.assertEqual(three - two, Decimal("40.00"))

    def test_a_client_supplied_total_cannot_override_the_card(self):
        from unittest.mock import patch
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2

        tier = ServiceTier.objects.get(slug="tata-ace")
        route = {"distance_km": 10.0, "duration_seconds": 600, "source": "google_maps"}
        with patch("service_requests.services.routing.get_route_eta", return_value=route):
            fare, breakdown = resolve_logistics_fare_v2(
                service_category="goods_transport_truck",
                logistics_tier=tier, logistics_lane=None,
                submitted_amount=Decimal("1.00"),     # tampered
                pickup_lat=PICKUP["lat"], pickup_lng=PICKUP["lng"],
                drop_lat=DROP["lat"], drop_lng=DROP["lng"],
            )
        self.assertEqual(fare, Decimal("434.00"))
        self.assertEqual(breakdown["base_fare"], Decimal("220.00"))
