"""
GT service/vehicle cards: every value the customer sees must come from the
source that actually governs it.

* "Starting from" is what the quote engine can really produce, not the mirrored
  starting_price that drifts away from base_fare / minimum_fare / surge.
* capacity_label follows the admin's Package tag on every edit, not just on
  creation.
* Packers & Movers cards and flat-priced tiers are untouched.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import LogisticsCategory, ServiceTier
from logistics.serializers import ServiceTierSerializer
from service_requests.models import CatalogCategory, Package, PackageStatus, Service
from service_requests.services.catalog import update_package
from service_requests.services.logistics_pricing import (
    quote_logistics_fare,
    tier_display_starting_fare,
)

User = get_user_model()
A = (Decimal("12.740900"), Decimal("77.825300"))
B = (Decimal("12.741900"), Decimal("77.825900"))


def _tier(**kw):
    d = dict(category=LogisticsCategory.TWO_WHEELER, city="hosur", slug="t", name="T",
             starting_price=Decimal("48.00"), base_fare=Decimal("50.00"),
             per_km_rate=Decimal("10.00"), free_km=Decimal("1.00"))
    d.update(kw)
    return ServiceTier.objects.create(**d)


class StartingFromMatchesQuoteEngine(TestCase):
    def _quoted_minimum(self, tier):
        route = {"distance_km": 0.5, "duration_seconds": 60, "source": "google_maps"}
        with patch("service_requests.services.routing.get_route_eta", return_value=route):
            q = quote_logistics_fare(tier=tier, pickup_lat=A[0], pickup_lng=A[1],
                                     drop_lat=B[0], drop_lng=B[1])
        return q["total"]

    def test_base_fare_diverging_from_starting_price(self):
        t = _tier()
        self.assertEqual(tier_display_starting_fare(t), Decimal("50.00"))
        self.assertEqual(tier_display_starting_fare(t), self._quoted_minimum(t))

    def test_loading_surge_and_minimum_fare(self):
        for kw in (
            dict(loading_unloading_charge=Decimal("20.00")),
            dict(surge_multiplier=Decimal("1.50")),
            dict(minimum_fare=Decimal("99.00")),
            dict(base_fare=None, loading_unloading_charge=Decimal("5.00"), surge_multiplier=Decimal("1.20")),
        ):
            with self.subTest(**{k: str(v) for k, v in kw.items()}):
                t = _tier(slug="t-%d" % ServiceTier.objects.count(), **kw)
                self.assertEqual(tier_display_starting_fare(t), self._quoted_minimum(t))

    def test_flat_tier_keeps_starting_price(self):
        t = _tier(per_km_rate=None, base_fare=Decimal("999.00"))
        self.assertEqual(tier_display_starting_fare(t), Decimal("48.00"))

    def test_api_serializer_uses_effective_fare_for_gt_only(self):
        gt = _tier()
        pm = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS, city="hosur", slug="pm", name="PM",
            starting_price=Decimal("1499.00"), base_fare=Decimal("1600.00"),
            per_km_rate=Decimal("5.00"))
        self.assertEqual(ServiceTierSerializer(gt).data["starting_price"], "50.00")
        self.assertEqual(ServiceTierSerializer(pm).data["starting_price"], "1499.00")


class AdminToCustomerPropagation(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(username="a", email="a@e.com", phone="9000111333", role="admin")
        cat = CatalogCategory.objects.create(name="Goods & Transport", slug="gt")
        self.svc = Service.objects.create(category=cat, name="Two Wheeler", slug="tw-svc")
        self.tier = _tier(slug="2-wheeler", name="2 Wheeler", capacity_label="10 kg",
                          max_weight_kg=Decimal("20.00"), dimensions_label="40cm x 40cm")
        self.pkg = Package.objects.create(service=self.svc, name="2 Wheeler", slug="2-wheeler",
                                          base_price=Decimal("48.00"), status=PackageStatus.ACTIVE, tag="10 kg")

    def _card(self):
        r = APIClient().get("/api/logistics/tiers/", {"category": "two_wheeler", "city": "hosur"})
        self.assertEqual(r.status_code, 200)
        data = r.json().get("data", r.json())
        return next(x for x in data if x["slug"] == "2-wheeler")

    def test_tag_edit_reaches_capacity_label_and_customer_api(self):
        update_package(self.pkg, {"tag": "25 kg"}, self.actor, reason="t")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.capacity_label, "25 kg")
        card = self._card()
        self.assertEqual(card["capacity_label"], "25 kg")
        # authoritative capacity + dimensions travel with the card
        self.assertEqual(Decimal(card["max_weight_kg"]), Decimal("20.00"))
        self.assertEqual(card["dimensions_label"], "40cm x 40cm")

    def test_blank_tag_does_not_wipe_capacity_label(self):
        update_package(self.pkg, {"tag": ""}, self.actor, reason="t")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.capacity_label, "10 kg")

    def test_price_and_name_edit_propagate(self):
        update_package(self.pkg, {"description": "New copy"}, self.actor, reason="t")
        card = self._card()
        self.assertEqual(card["description"], "New copy")
        self.assertEqual(card["starting_price"], "50.00")  # engine floor, base_fare governs
