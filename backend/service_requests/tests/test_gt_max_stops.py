"""Max intermediate stops is an admin-set tier value, enforced server-side."""
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.services.logistics_pricing import (
    TooManyStopsError, UnresolvedLogisticsFareError, quote_logistics_fare,
)

P = (Decimal("12.740900"), Decimal("77.825300"))
D = (Decimal("12.935200"), Decimal("77.624500"))
ROUTE = {"distance_km": 12.0, "duration_seconds": 1800, "source": "google_maps"}


class MaxStopsTests(TestCase):
    def _tier(self, **kw):
        d = dict(
            category=LogisticsCategory.TRUCK, city="hosur", slug="ms-test", name="Ace",
            starting_price=Decimal("400"), base_fare=Decimal("250"),
            per_km_rate=Decimal("18"), additional_stop_charge=Decimal("50"),
        )
        d.update(kw)
        return ServiceTier.objects.create(**d)

    def _quote(self, tier, stops):
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return quote_logistics_fare(
                tier=tier, pickup_lat=P[0], pickup_lng=P[1],
                drop_lat=D[0], drop_lng=D[1], stop_count=stops,
            )

    def test_default_allows_three_extra(self):
        t = self._tier()
        self.assertEqual(t.max_additional_stops, 3)
        self.assertEqual(self._quote(t, 5)["additional_stops"], 3)

    def test_over_limit_rejected(self):
        with self.assertRaises(TooManyStopsError) as cm:
            self._quote(self._tier(), 6)
        self.assertEqual(cm.exception.allowed, 3)
        self.assertIsInstance(cm.exception, UnresolvedLogisticsFareError)

    def test_admin_value_is_honoured(self):
        t = self._tier(max_additional_stops=1)
        self.assertEqual(self._quote(t, 3)["additional_stops"], 1)
        with self.assertRaises(TooManyStopsError):
            self._quote(t, 4)
        t.max_additional_stops = 5
        t.save()
        self.assertEqual(self._quote(t, 7)["additional_stops"], 5)

    def test_zero_disables_extra_stops(self):
        t = self._tier(max_additional_stops=0)
        self.assertEqual(self._quote(t, 2)["additional_stops"], 0)
        with self.assertRaises(TooManyStopsError):
            self._quote(t, 3)


class MaxStopsAdminAndApiTests(MaxStopsTests):
    def test_admin_update_validates_and_persists(self):
        from django.contrib.auth import get_user_model
        from django.core.exceptions import ValidationError
        from logistics.pricing_admin import update_tier_pricing

        actor = get_user_model().objects.create_user(
            username="ms_admin", email="ms_admin@example.com", phone="9000000077", role="admin",
        )
        t = self._tier()
        for bad in ("2.5", "11", "-1", "abc", ""):
            with self.assertRaises(ValidationError, msg=bad):
                update_tier_pricing(t, {"max_additional_stops": bad}, actor, reason="x")
        update_tier_pricing(t, {"max_additional_stops": "4"}, actor, reason="raise limit")
        t.refresh_from_db()
        self.assertEqual(t.max_additional_stops, 4)
        self.assertIsInstance(t.max_additional_stops, int)

    def test_quote_endpoint_returns_max_stops_exceeded(self):
        from rest_framework.test import APIClient
        t = self._tier(max_additional_stops=1)
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            r = APIClient().post("/api/logistics/quote/", {
                "category": "goods_transport_truck", "tier_id": t.id,
                "pickup_lat": str(P[0]), "pickup_lng": str(P[1]),
                "drop_lat": str(D[0]), "drop_lng": str(D[1]), "stop_count": 5,
            }, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(r.json()["error_code"], "MAX_STOPS_EXCEEDED")
        self.assertEqual(r.json()["max_additional_stops"], 1)


class LoadingHelpOptionalTests(MaxStopsTests):
    def test_loading_charge_only_when_requested(self):
        t = self._tier(loading_unloading_charge=Decimal("100.00"))
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            on = quote_logistics_fare(tier=t, pickup_lat=P[0], pickup_lng=P[1], drop_lat=D[0], drop_lng=D[1])
            off = quote_logistics_fare(tier=t, pickup_lat=P[0], pickup_lng=P[1], drop_lat=D[0], drop_lng=D[1], loading_help=False)
        self.assertEqual(on["loading_unloading"], Decimal("100.00"))
        self.assertEqual(off["loading_unloading"], Decimal("0.00"))
        self.assertEqual(on["total"] - off["total"], Decimal("100.00"))
        self.assertTrue(on["loading_help"])
        self.assertFalse(off["loading_help"])

    def test_quote_endpoint_honours_flag_and_defaults_to_on(self):
        from rest_framework.test import APIClient
        t = self._tier(loading_unloading_charge=Decimal("100.00"))
        body = {"category": "goods_transport_truck", "service_category": "goods_transport_truck", "tier_id": t.id,
                "pickup_lat": str(P[0]), "pickup_lng": str(P[1]), "drop_lat": str(D[0]), "drop_lng": str(D[1])}
        totals = {}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            for label, extra in (("default", {}), ("off", {"loading_help": False}), ("off_str", {"loading_help": "false"})):
                r = APIClient().post("/api/logistics/quote/", {**body, **extra}, format="json")
                self.assertEqual(r.status_code, 200, r.content)
                j = r.json(); totals[label] = Decimal(str((j.get("data") or j)["total"]))
        self.assertEqual(totals["default"] - totals["off"], Decimal("100.00"))
        self.assertEqual(totals["off"], totals["off_str"])
