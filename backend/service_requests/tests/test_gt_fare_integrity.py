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
