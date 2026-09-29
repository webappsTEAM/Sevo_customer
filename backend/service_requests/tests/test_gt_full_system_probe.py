"""
Adversarial / edge / permission / concurrency probes across the GT customer API surface
(Mini Truck, Two-Wheeler, Packers & Movers). Invariants: hostile input never yields a 5xx, money is
always server-derived, one customer's data is never reachable by another, and admin configuration
(tier rates, coverage zones) drives every result.
"""
import threading
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, PackersMoversConfig, ServiceTier
from service_requests.models import ServiceRequest
from settings_hub.models import ServiceZone, ServiceZoneService

User = get_user_model()
ROUTE = {"distance_km": 12.0, "duration_minutes": 30, "distance_source": "google_maps_road_distance", "is_authoritative": True}
PX, PY = 12.7409, 77.8253
DX, DY = 12.76, 77.84


def _user(tag):
    uid = uuid.uuid4().hex[:8]
    return User.objects.create_user(username=f"{tag}_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                    phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")


class Base:
    def _world(self):
        cache.clear()
        company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        self.zone = ServiceZone.objects.create(company=company, name="Hosur", center_lat=12.75, center_lng=77.83, radius_meters=9000)
        for slug in ("goods_transport_truck", "goods_transport_two_wheeler", "packers_movers"):
            ServiceZoneService.objects.create(zone=self.zone, service_slug=slug, is_available=True)
        uid = uuid.uuid4().hex[:6]
        self.bike = ServiceTier.objects.create(
            category=LogisticsCategory.TWO_WHEELER, city="hosur", slug=f"b-{uid}", name="Bike", starting_price=Decimal("50"),
            base_fare=Decimal("50"), per_km_rate=Decimal("10"), free_km=Decimal("1"), loading_unloading_charge=Decimal("10"),
            additional_stop_charge=Decimal("15"), vehicle_class="two_wheeler", max_weight_kg=Decimal("20"), max_cft=Decimal("2"))
        self.truck = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"t-{uid}", name="Tata Ace", starting_price=Decimal("300"),
            base_fare=Decimal("250"), per_km_rate=Decimal("18"), free_km=Decimal("2"), loading_unloading_charge=Decimal("100"),
            additional_stop_charge=Decimal("50"), vehicle_class="truck", max_weight_kg=Decimal("750"), max_cft=Decimal("150"))
        self.user = _user("c"); self.other = _user("o")
        self.c = APIClient(); self.c.force_authenticate(self.user)

    def quote(self, tier, **over):
        body = {"service_category": "goods_transport_two_wheeler" if tier is self.bike else "goods_transport_truck",
                "tier_id": tier.id, "pickup_latitude": PX, "pickup_longitude": PY, "drop_latitude": DX, "drop_longitude": DY}
        body.update(over)
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.c.post("/api/logistics/quote/", body, format="json")

    def book(self, tier, q, client=None, key=None, **over):
        d = q.data["data"]
        body = {"customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email,
                "service_category": "goods_transport_two_wheeler" if tier is self.bike else "goods_transport_truck",
                "issue_title": "Delivery", "description": "box", "address": "Pickup, Hosur", "latitude": PX, "longitude": PY,
                "drop_address": "Drop, Hosur", "drop_latitude": DX, "drop_longitude": DY,
                "preferred_date": str(timezone.localdate() + timezone.timedelta(days=1)), "total_amount": str(d["total"]), "payment_method": "COD",
                "logistics_tier": tier.id,
                "cart_data": [{"quote_id": d["quote_id"], "quote_hash": d["quote_hash"], "price": float(d["total"])}]}
        body.update(over)
        headers = {"HTTP_IDEMPOTENCY_KEY": key} if key else {}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return (client or self.c).post("/api/booking/", body, format="json", **headers)


class HostileInputTests(Base, TestCase):
    def setUp(self):
        self._world()

    def test_quote_never_5xx_and_rejects_bad_input(self):
        bad = [
            {"pickup_latitude": None}, {"pickup_latitude": "abc"}, {"pickup_latitude": 999}, {"pickup_longitude": -500},
            {"drop_latitude": ""}, {"drop_longitude": "NaN"}, {"drop_latitude": "Infinity"},
            {"pickup_latitude": 0, "pickup_longitude": 0}, {"tier_id": None}, {"tier_id": 99999999}, {"tier_id": "x"},
            {"tier_id": -1}, {"stop_count": "many"}, {"stop_count": -3}, {"stop_count": 10 ** 9},
            {"waypoints": "notalist"}, {"waypoints": [{"lat": "x", "lng": "y"}]}, {"waypoints": [None, 5, []]},
            {"cargo_items": "str"}, {"cargo_items": [{"goods_item_id": "z", "quantity": -1}]},
            {"cargo_items": [{"goods_item_id": 424242, "quantity": 1}]}, {"declared_weight_kg": -5}, {"declared_weight_kg": "heavy"},
            {"service_category": "nonsense"}, {"service_category": None}, {"goods_category_id": "nope"},
        ]
        for extra in bad:
            r = self.quote(self.bike, **extra)
            self.assertLess(r.status_code, 500, (extra, r.content[:200]))
            if r.status_code == 200:      # a 200 must still be a sane, positive, server-priced fare
                self.assertGreater(Decimal(str(r.data["data"]["total"])), 0, extra)

    def test_quote_rejects_wrong_category_tier_and_inactive_tier(self):
        r = self.quote(self.truck, service_category="goods_transport_two_wheeler")
        self.assertGreaterEqual(r.status_code, 400)
        self.assertLess(r.status_code, 500)
        self.bike.is_active = False; self.bike.save()
        r = self.quote(self.bike)
        self.assertEqual(r.status_code, 400)

    def test_quote_outside_coverage_refused_with_the_failing_end(self):
        r = self.quote(self.bike, drop_latitude=12.97, drop_longitude=77.59)      # Bengaluru
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data.get("failed_point"), "drop")
        r = self.quote(self.bike, pickup_latitude=12.97, pickup_longitude=77.59)
        self.assertEqual(r.data.get("failed_point"), "pickup")

    def test_stop_outside_coverage_and_unlocated_stop(self):
        r = self.quote(self.bike, waypoints=[{"lat": 12.97, "lng": 77.59}])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data.get("failed_point"), "stop")
        self.assertEqual(r.data.get("failed_stop_index"), 1)          # 1-based: "Stop 1 is outside coverage"

    def test_booking_rejects_tampered_or_missing_money_and_quote(self):
        q = self.quote(self.bike); self.assertEqual(q.status_code, 200)
        d = q.data["data"]
        for over in ({"total_amount": "1.00"}, {"total_amount": "-5"}, {"total_amount": "abc"}, {"total_amount": None},
                     {"cart_data": [{"quote_id": d["quote_id"], "quote_hash": "0" * 16, "price": 1}]},
                     {"cart_data": "x"}, {"logistics_tier": self.truck.id},
                     {"drop_latitude": DX + 0.05}):                   # route moved after quoting
            r = self.book(self.bike, q, **over)
            self.assertIn(r.status_code, (400, 409, 422), (over, r.status_code, r.content[:200]))
        self.assertEqual(ServiceRequest.objects.count(), 0)

    def test_empty_cart_never_lets_the_client_choose_the_price(self):
        q = self.quote(self.bike)
        r = self.book(self.bike, q, cart_data=[], total_amount="1.00")
        self.assertIn(r.status_code, (201, 400, 409, 422))
        if r.status_code == 201:
            self.assertEqual(ServiceRequest.objects.latest("id").total_amount, Decimal(str(q.data["data"]["total"])))

    def test_unknown_quote_id_never_lets_the_client_choose_the_price(self):
        q = self.quote(self.bike); d = q.data["data"]
        r = self.book(self.bike, q, cart_data=[{"quote_id": "gtq_deadbeef00000000", "quote_hash": d["quote_hash"], "price": 1}])
        if r.status_code == 201:      # server re-derived the fare from the route + tier; never the submitted 1.00
            self.assertEqual(ServiceRequest.objects.latest("id").total_amount, Decimal(str(d["total"])))
        else:
            self.assertIn(r.status_code, (400, 409, 422))

    def test_booking_rejects_bad_contact_and_dates(self):
        q = self.quote(self.bike)
        for over in ({"phone": "123"}, {"phone": "abcdefghij"}, {"customer_name": ""}, {"customer_name": "1"},
                     {"preferred_date": "2001-01-01"}, {"preferred_date": "not-a-date"}, {"address": ""},
                     {"latitude": None}, {"drop_latitude": None}):
            r = self.book(self.bike, q, **over)
            self.assertLess(r.status_code, 500, (over, r.content[:200]))
            self.assertGreaterEqual(r.status_code, 400, over)

    def test_anonymous_cannot_read_bookings_or_invoices(self):
        q = self.quote(self.bike); r = self.book(self.bike, q); self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.latest("id")
        anon = APIClient()
        for url in (f"/api/booking/{sr.id}/invoice/", f"/api/booking/{sr.id}/", f"/api/booking/{sr.id}/cancel/"):
            resp = anon.get(url) if "cancel" not in url else anon.post(url, {}, format="json")
            self.assertIn(resp.status_code, (401, 403, 404), (url, resp.status_code))

    def test_other_customer_cannot_touch_my_booking(self):
        q = self.quote(self.bike); r = self.book(self.bike, q); self.assertEqual(r.status_code, 201)
        sr = ServiceRequest.objects.latest("id")
        o = APIClient(); o.force_authenticate(self.other)
        for method, url in (("get", f"/api/booking/{sr.id}/invoice/"), ("get", f"/api/booking/{sr.id}/"),
                            ("post", f"/api/booking/{sr.id}/cancel/"), ("get", f"/api/booking/{sr.id}/cancel-preview/"),
                            ("get", f"/api/booking/{sr.id}/live-location/"), ("get", f"/api/booking/{sr.id}/stops/"),
                            ("put", f"/api/booking/{sr.id}/stops/")):
            resp = getattr(o, method)(url, {"stops": []} if method != "get" else None, format="json") if method != "get" else o.get(url)
            self.assertIn(resp.status_code, (403, 404), (method, url, resp.status_code, resp.content[:120]))
        sr.refresh_from_db(); self.assertNotEqual(sr.status, "cancelled")

    def test_customer_cannot_use_admin_apis(self):
        for url in ("/api/logistics/admin/tiers/", "/api/logistics/admin/packers-movers-config/"):
            self.assertIn(self.c.get(url).status_code, (401, 403))
        self.assertIn(self.c.patch(f"/api/logistics/admin/tiers/{self.bike.id}/", {"per_km_rate": "1"}, format="json").status_code, (401, 403, 409))
        self.bike.refresh_from_db(); self.assertEqual(self.bike.per_km_rate, Decimal("10.00"))


class DynamicBehaviourTests(Base, TestCase):
    """Results follow admin data: nothing about a fare, a stop charge or coverage is baked into code."""

    def setUp(self):
        self._world()

    def test_fare_follows_tier_rates(self):
        base = Decimal(self.quote(self.bike).data["data"]["total"])
        self.assertEqual(base, Decimal("170.00"))                                 # 50 + (12-1)*10 + 10 loading
        self.bike.per_km_rate = Decimal("20"); self.bike.save()
        self.assertGreater(Decimal(self.quote(self.bike).data["data"]["total"]), base)
        self.bike.surge_multiplier = Decimal("2"); self.bike.save()
        self.assertGreater(Decimal(self.quote(self.bike).data["data"]["total"]), base * 2)

    def test_stop_charge_follows_admin_value_and_stops_priced_per_stop(self):
        wp = [{"lat": 12.745, "lng": 77.83}, {"lat": 12.75, "lng": 77.835}]
        b2 = self.quote(self.bike, waypoints=wp, stop_count=4).data["data"]["breakdown"]
        self.assertEqual(Decimal(b2["additional_stops"]) if not isinstance(b2["additional_stops"], int) else b2["additional_stops"], 2)
        self.assertEqual(Decimal(b2["additional_stop_charge"]), Decimal("30.00"))         # 2 x admin 15
        t2 = Decimal(self.quote(self.bike, waypoints=wp, stop_count=4).data["data"]["total"])
        self.bike.additional_stop_charge = Decimal("40"); self.bike.save()
        t2b = Decimal(self.quote(self.bike, waypoints=wp, stop_count=4).data["data"]["total"])
        self.assertEqual(t2b - t2, Decimal("50.00"))                                       # 2 x (40 - 15)

    def test_admin_removing_a_zone_service_blocks_new_quotes_and_bookings(self):
        q = self.quote(self.bike); self.assertEqual(q.status_code, 200)
        ServiceZoneService.objects.filter(zone=self.zone, service_slug="goods_transport_two_wheeler").update(is_available=False)
        self.assertEqual(self.quote(self.bike).status_code, 400)
        self.assertEqual(self.book(self.bike, q).status_code, 400)                # coverage re-checked at submit

    def test_price_change_after_quote_never_bills_a_stale_price(self):
        q = self.quote(self.bike)
        self.bike.base_fare = Decimal("500"); self.bike.save()
        r = self.book(self.bike, q)
        if r.status_code == 201:
            sr = ServiceRequest.objects.latest("id")
            self.assertEqual(sr.total_amount, Decimal(str(q.data["data"]["total"])))   # honoured the locked quote
        else:
            self.assertIn(r.status_code, (400, 409))

    def test_same_pickup_and_drop_refused(self):
        r = self.quote(self.bike, drop_latitude=PX, drop_longitude=PY)
        q = self.quote(self.bike)
        r2 = self.book(self.bike, q, drop_latitude=PX, drop_longitude=PY)
        self.assertGreaterEqual(r2.status_code, 400)

    def test_cargo_over_capacity_refused_for_two_wheeler_but_fits_truck(self):
        cat = GoodsCategory.objects.create(name="Heavy", slug=f"heavy-{uuid.uuid4().hex[:4]}", is_active=True)
        item = GoodsItem.objects.create(category=cat, name="Cupboard", slug=f"cup-{uuid.uuid4().hex[:4]}",
                                         default_cft=Decimal("30"), default_weight_kg=Decimal("80"), is_active=True)
        cargo = [{"goods_item_id": item.id, "quantity": 1}]
        rb = self.quote(self.bike, cargo_items=cargo)
        self.assertEqual(rb.status_code, 400)
        rt = self.quote(self.truck, cargo_items=cargo)
        self.assertEqual(rt.status_code, 200, rt.content[:200])


class CancellationTests(Base, TestCase):
    def setUp(self):
        self._world()
        q = self.quote(self.bike); self.assertEqual(self.book(self.bike, q).status_code, 201)
        self.sr = ServiceRequest.objects.latest("id")

    def test_preview_then_cancel_then_double_cancel_is_safe(self):
        pv = self.c.get(f"/api/booking/{self.sr.id}/cancel-preview/")
        self.assertEqual(pv.status_code, 200, pv.content[:200])
        r1 = self.c.post(f"/api/booking/{self.sr.id}/cancel/", {"reason": "changed my mind"}, format="json")
        self.assertEqual(r1.status_code, 200, r1.content[:300])
        self.sr.refresh_from_db(); self.assertEqual(self.sr.status, ServiceRequest.Status.CANCELLED)
        r2 = self.c.post(f"/api/booking/{self.sr.id}/cancel/", {"reason": "again"}, format="json")
        self.assertIn(r2.status_code, (200, 409))
        self.assertLess(r2.status_code, 500)

    def test_cancel_unknown_booking_and_garbage_body(self):
        self.assertEqual(self.c.post("/api/booking/99999999/cancel/", {}, format="json").status_code, 404)
        r = self.c.post(f"/api/booking/{self.sr.id}/cancel/", {"reason": "x" * 100000}, format="json")
        self.assertLess(r.status_code, 500)


class ConcurrencyTests(Base, TransactionTestCase):
    def setUp(self):
        self._world()

    def test_same_idempotency_key_double_submit_creates_one_booking(self):
        q = self.quote(self.bike); self.assertEqual(q.status_code, 200)
        key = f"idem_{uuid.uuid4().hex}"
        results = []
        def go():
            cl = APIClient(); cl.force_authenticate(self.user)
            try:
                results.append(self.book(self.bike, q, client=cl, key=key).status_code)
            finally:
                connection.close()
        ts = [threading.Thread(target=go) for _ in range(4)]
        [t.start() for t in ts]; [t.join() for t in ts]
        self.assertEqual(ServiceRequest.objects.filter(customer=self.user).count(), 1, results)
        self.assertTrue(all(s < 500 for s in results), results)


class PackersMoversProbeTests(Base, TestCase):
    def setUp(self):
        self._world()
        cat = GoodsCategory.objects.create(name="Bedroom", slug="pm-bedroom", is_active=True)
        self.item = GoodsItem.objects.create(category=cat, name="Bed", slug=f"bed-{uuid.uuid4().hex[:4]}", default_cft=Decimal("50"),
                                              default_weight_kg=Decimal("60"), is_active=True)
        self.unconfigured = GoodsItem.objects.create(category=cat, name="Mystery", slug=f"m-{uuid.uuid4().hex[:4]}", default_cft=Decimal("0"), default_weight_kg=Decimal("0"), is_active=True)
        self.prohibited = GoodsItem.objects.create(category=cat, name="Gas", slug=f"g-{uuid.uuid4().hex[:4]}", default_cft=Decimal("5"),
                                                    default_weight_kg=Decimal("5"), is_prohibited=True, is_active=True)
        PackersMoversConfig.objects.create(city="Hosur", standard_packing_rate_cft=Decimal("7"), premium_packing_rate_cft=Decimal("12"),
                                           premium_fragile_addon=Decimal("200"), floor_rate_no_lift_per_100cft=Decimal("150"),
                                           unpacking_rate_cft=Decimal("4"), gst_rate=Decimal("0.18"), survey_cft_threshold=500.0)
        self.pm = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS, city="Hosur", slug=f"pm-{uuid.uuid4().hex[:5]}", name="Mini Truck",
            vehicle_class="truck", starting_price=Decimal("1500"), base_fare=Decimal("1200"), per_km_rate=Decimal("25"),
            free_km=Decimal("3"), loading_unloading_charge=Decimal("400"), additional_stop_charge=Decimal("150"),
            minimum_fare=Decimal("1500"), max_weight_kg=Decimal("750"), max_cft=Decimal("150"), order=1)

    def pq(self, **over):
        body = {"pickup_latitude": 12.734, "pickup_longitude": 77.828, "drop_latitude": 12.85, "drop_longitude": 77.78,
                "city": "Hosur", "service_tier_id": self.pm.id, "inventory": [{"goods_item_id": self.item.id, "quantity": 1}]}
        body.update(over)
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.c.post("/api/logistics/packers-movers/quote/", body, format="json")

    def test_hostile_quote_input_never_5xx(self):
        bad = [{"inventory": []}, {"inventory": None}, {"inventory": "x"}, {"inventory": [{"goods_item_id": "z", "quantity": 1}]},
               {"inventory": [{"goods_item_id": self.item.id, "quantity": -3}]}, {"inventory": [{"goods_item_id": self.item.id, "quantity": 10 ** 9}]},
               {"inventory": [{"goods_item_id": self.item.id, "quantity": "two"}]}, {"inventory": [{"goods_item_id": 999999, "quantity": 1}]},
               {"packing_tier": "gold"}, {"packing_tier": None}, {"pickup_floor": -1}, {"pickup_floor": 9999}, {"drop_floor": "x"},
               {"pickup_has_lift": "maybe"}, {"extra_stops": "many"}, {"extra_stops": -4}, {"extra_stops": 10 ** 9},
               {"city": ""}, {"city": "Atlantis"}, {"service_tier_id": "x"}, {"service_tier_id": 424242},
               {"pickup_latitude": None}, {"drop_longitude": "abc"}, {"relocation_type": "Teleport"}]
        for extra in bad:
            r = self.pq(**extra)
            self.assertLess(r.status_code, 500, (extra, r.content[:160]))

    def test_unconfigured_prohibited_and_oversize_items_never_produce_an_instant_price(self):
        for inv in ([{"goods_item_id": self.unconfigured.id, "quantity": 1}], [{"goods_item_id": self.prohibited.id, "quantity": 1}],
                    [{"goods_item_id": self.item.id, "quantity": 5}]):
            r = self.pq(inventory=inv)
            if r.status_code == 200:
                self.assertFalse(r.data["data"]["quotable"], inv)
            else:
                self.assertEqual(r.status_code, 400)

    def test_price_is_input_driven(self):
        base = Decimal(self.pq().data["data"]["total"])
        self.assertGreater(Decimal(self.pq(packing_tier="premium").data["data"]["total"]), base)
        self.assertGreater(Decimal(self.pq(unpacking_required=True).data["data"]["total"]), base)
        self.assertGreater(Decimal(self.pq(pickup_floor=3, pickup_has_lift=False).data["data"]["total"]), base)
        self.assertEqual(Decimal(self.pq(pickup_floor=3, pickup_has_lift=True).data["data"]["total"]), base)
        self.assertGreater(Decimal(self.pq(extra_stops=2).data["data"]["total"]), base)
        cfg = PackersMoversConfig.objects.get(city="Hosur"); cfg.standard_packing_rate_cft = Decimal("20"); cfg.save()
        self.assertGreater(Decimal(self.pq().data["data"]["total"]), base)            # admin config, not code
        cfg.gst_rate = Decimal("0"); cfg.save()
        r = self.pq().data["data"]
        self.assertEqual(Decimal(r["gst_amount"]), Decimal("0.00"))

    def test_outside_pickup_coverage_refused_at_booking(self):
        q = self.pq()
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            r = self.c.post("/api/booking/", {
                "customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email, "service_category": "packers_movers",
                "city": "hosur", "issue_title": "PM", "description": "x", "address": "Blr", "drop_address": "Drop",
                "latitude": 12.97, "longitude": 77.59, "drop_latitude": 12.85, "drop_longitude": 77.78,
                "preferred_date": str(timezone.localdate() + timezone.timedelta(days=1)), "total_amount": str(q.data["data"]["total"]), "payment_method": "COD",
                "logistics_tier": self.pm.id, "cart_data": [{"quote_id": q.data["data"]["quote_id"],
                    "inventory": [{"goods_item_id": self.item.id, "quantity": 1}], "relocation_type": "Within City"}]}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(ServiceRequest.objects.count(), 0)


class StopsApiProbeTests(Base, TestCase):
    def setUp(self):
        self._world()
        q = self.quote(self.bike); self.assertEqual(self.book(self.bike, q).status_code, 201)
        self.sr = ServiceRequest.objects.latest("id")

    def put(self, stops, client=None):
        return (client or self.c).put(f"/api/booking/{self.sr.id}/stops/", {"stops": stops}, format="json")

    def test_hostile_stops_payloads_never_5xx(self):
        cases = [None, "x", 5, [None], [5], [{}], [{"address": ""}], [{"address": "A", "latitude": "x", "longitude": 1}],
                 [{"address": "A", "latitude": 999, "longitude": 1}], [{"address": "A" * 5000, "latitude": 12.7, "longitude": 77.8}],
                 [{"address": "A", "latitude": 12.7, "longitude": 77.8}] * 9, [{"address": "A", "latitude": 12.97, "longitude": 77.59}]]
        for c in cases:
            r = self.put(c)
            self.assertLess(r.status_code, 500, (str(c)[:80], r.content[:160]))

    def test_valid_stops_roundtrip_in_order_with_coordinates(self):
        stops = [{"address": f"S{i}", "latitude": 12.74 + i / 100, "longitude": 77.82, "stop_type": "WAYPOINT"} for i in range(3)]
        r = self.put(stops); self.assertEqual(r.status_code, 200, r.content[:200])
        got = self.c.get(f"/api/booking/{self.sr.id}/stops/").data["data"]
        self.assertEqual([g["address"] for g in got if g["stop_type"] == "WAYPOINT"], ["S0", "S1", "S2"])
        self.assertEqual([g["sequence"] for g in got], sorted(g["sequence"] for g in got))
        rev = self.put(list(reversed(stops))); self.assertEqual(rev.status_code, 200)
        got = self.c.get(f"/api/booking/{self.sr.id}/stops/").data["data"]
        self.assertEqual([g["address"] for g in got if g["stop_type"] == "WAYPOINT"], ["S2", "S1", "S0"])

    def test_route_locked_once_a_driver_is_assigned(self):
        ServiceRequest.objects.filter(pk=self.sr.pk).update(status="assigned")
        r = self.put([{"address": "S", "latitude": 12.74, "longitude": 77.82}])
        self.assertEqual(r.status_code, 400)


class MultiStopTrackingRouteTests(Base, TestCase):
    """Customer live map: Pickup -> Stop 1..n -> Destination, in order, with exact coordinates."""

    def setUp(self):
        self._world()
        from service_requests.models import TripStop
        q = self.quote(self.truck, waypoints=[{"lat": 12.745, "lng": 77.83}, {"lat": 12.752, "lng": 77.835}], stop_count=4)
        self.assertEqual(q.status_code, 200, q.content[:200])
        wp = [{"address": "Stop A", "latitude": 12.745, "longitude": 77.83, "stop_type": "WAYPOINT"},
              {"address": "Stop B", "latitude": 12.752, "longitude": 77.835, "stop_type": "WAYPOINT"}]
        r = self.book(self.truck, q, stops=wp)
        self.assertEqual(r.status_code, 201, r.content[:300])
        self.sr = ServiceRequest.objects.latest("id")
        self.TripStop = TripStop

    def payload(self):
        from service_requests.views import _build_tracking_payload
        self.sr.refresh_from_db()
        return _build_tracking_payload(self.sr, has_full_access=True)

    def test_stops_are_ordered_pickup_waypoints_drop_with_exact_coordinates(self):
        stops = self.payload()["logistics"]["stops"]
        self.assertEqual([s["stop_type"] for s in stops], ["PICKUP", "WAYPOINT", "WAYPOINT", "DROP"])
        self.assertEqual([s["sequence"] for s in stops], [1, 2, 3, 4])
        self.assertEqual((stops[1]["latitude"], stops[1]["longitude"]), (12.745, 77.83))
        self.assertEqual((stops[2]["latitude"], stops[2]["longitude"]), (12.752, 77.835))
        self.assertEqual((stops[0]["latitude"], stops[0]["longitude"]), (PX, PY))
        self.assertEqual((stops[3]["latitude"], stops[3]["longitude"]), (DX, DY))

    def test_destination_targets_pickup_then_each_stop_in_turn_then_drop(self):
        L = ServiceRequest.LogisticsLeg
        def dest(leg):
            ServiceRequest.objects.filter(pk=self.sr.pk).update(logistics_leg=leg)
            d = self.payload()["destination"]
            return (d["latitude"], d["longitude"])
        self.assertEqual(dest(L.EN_ROUTE_PICKUP), (PX, PY))
        self.assertEqual(dest(L.LOADING), (PX, PY))
        # heading out after loading: the first stop is next, NOT the final drop
        self.assertEqual(dest(L.EN_ROUTE_DROP), (12.745, 77.83))
        stops = list(self.TripStop.objects.filter(booking=self.sr).order_by("sequence"))
        self.TripStop.objects.filter(pk=stops[1].pk).update(arrived_at=timezone.now(), completed_at=timezone.now())
        self.assertEqual(dest(L.EN_ROUTE_DROP), (12.752, 77.835))               # stop 2 next
        self.TripStop.objects.filter(pk=stops[2].pk).update(arrived_at=timezone.now(), completed_at=timezone.now())
        self.assertEqual(dest(L.EN_ROUTE_DROP), (DX, DY))                       # all stops done -> drop
        self.assertEqual(dest(L.UNLOADING), (DX, DY))
        self.assertEqual(dest(L.DELIVERED), (DX, DY))


class ConfigurableCancellationFeeTests(Base, TestCase):
    """Cancellation fees are admin policy (GTCancellationPolicy), Porter-style: free until a driver is assigned."""

    def setUp(self):
        self._world()
        q = self.quote(self.bike); self.assertEqual(self.book(self.bike, q).status_code, 201)
        self.sr = ServiceRequest.objects.latest("id")

    def preview(self):
        r = self.c.get(f"/api/booking/{self.sr.id}/cancel-preview/")
        self.assertEqual(r.status_code, 200, r.content[:200])
        return r.data.get("data", r.data)

    def test_default_policy_charges_nothing(self):
        p = self.preview()
        self.assertEqual(Decimal(str(p.get("cancellation_fee", p.get("fee", 0)) or 0)), Decimal("0"))

    def test_admin_policy_drives_the_fee_and_never_exceeds_the_booking_total(self):
        from service_requests.models import GTCancellationPolicy, get_gt_cancellation_fee
        self.assertEqual(get_gt_cancellation_fee(self.sr), Decimal("0"))                  # nothing configured: free
        GTCancellationPolicy.objects.create(service_category="", fee_mode="FLAT", flat_fee_amount=Decimal("25"),
                                            applies_only_after_assignment=True, grace_period_seconds=0, is_active=True)
        self.assertEqual(get_gt_cancellation_fee(self.sr), Decimal("0"))                  # not yet assigned: still free
        from service_requests.models import BookingAssignment
        BookingAssignment.objects.create(booking=self.sr, company=self.sr.company, status="ACCEPTED",
                                         accepted_at=timezone.now() - timezone.timedelta(minutes=5))
        self.sr.refresh_from_db()
        self.assertEqual(get_gt_cancellation_fee(self.sr), Decimal("25"))                 # assigned: admin flat fee
        # a category-specific policy overrides the platform-wide one
        GTCancellationPolicy.objects.create(service_category="goods_transport_two_wheeler", fee_mode="PERCENT",
                                            percent_fee=Decimal("10"), applies_only_after_assignment=True, is_active=True)
        self.assertEqual(get_gt_cancellation_fee(self.sr), (self.sr.total_amount * Decimal("10") / 100))
        # fee can never exceed what the customer paid
        GTCancellationPolicy.objects.filter(service_category="goods_transport_two_wheeler").update(fee_mode="FLAT", flat_fee_amount=Decimal("99999"))
        self.assertEqual(get_gt_cancellation_fee(self.sr), self.sr.total_amount)
        # switching it off restores free cancellation
        GTCancellationPolicy.objects.all().update(is_active=False)
        self.assertEqual(get_gt_cancellation_fee(self.sr), Decimal("0"))
        # grace period: cancelling right after assignment is free
        GTCancellationPolicy.objects.create(service_category="", fee_mode="FLAT", flat_fee_amount=Decimal("25"),
                                            applies_only_after_assignment=True, grace_period_seconds=600, is_active=True)
        self.assertEqual(get_gt_cancellation_fee(self.sr), Decimal("0"))                  # 5 min < 10 min grace

    def test_preview_and_cancel_report_the_admin_fee_once_a_driver_accepted(self):
        from service_requests.models import BookingAssignment, GTCancellationPolicy
        GTCancellationPolicy.objects.create(service_category="", fee_mode="FLAT", flat_fee_amount=Decimal("25"),
                                            applies_only_after_assignment=True, grace_period_seconds=0, is_active=True)
        p0 = self.preview()
        BookingAssignment.objects.create(booking=self.sr, company=self.sr.company, status="ACCEPTED",
                                         accepted_at=timezone.now() - timezone.timedelta(minutes=2))
        p1 = self.preview()
        flat = lambda d: {k: v for k, v in d.items()}
        fee = lambda d: Decimal(str(d.get("cancellation_fee", d.get("fee", 0)) or 0))
        self.assertEqual(fee(p0), Decimal("0"), flat(p0))
        self.assertEqual(fee(p1), Decimal("25"), flat(p1))


class ConfigurableWaitingAndAdvanceTests(Base, TestCase):
    def setUp(self):
        self._world()
        q = self.quote(self.bike); self.assertEqual(self.book(self.bike, q).status_code, 201)
        self.sr = ServiceRequest.objects.latest("id")

    def test_waiting_charge_follows_admin_policy_and_leg_history(self):
        from service_requests.models import GTWaitingChargePolicy, get_gt_waiting_charge
        t0 = timezone.now()
        hist = [{"leg": "LOADING", "at": t0.isoformat()}, {"leg": "EN_ROUTE_DROP", "at": (t0 + timezone.timedelta(minutes=25)).isoformat()},
                {"leg": "UNLOADING", "at": (t0 + timezone.timedelta(minutes=60)).isoformat()}, {"leg": "DELIVERED", "at": (t0 + timezone.timedelta(minutes=70)).isoformat()}]
        ServiceRequest.objects.filter(pk=self.sr.pk).update(logistics_leg_history=hist)
        self.sr.refresh_from_db()
        self.assertEqual(get_gt_waiting_charge(self.sr), Decimal("0"))                    # nothing configured
        GTWaitingChargePolicy.objects.create(service_category="", is_enabled=True, free_minutes_per_stop=10, rate_per_minute=Decimal("2"),
                                              is_active=True)
        # loading 25 min (15 billable) + unloading 10 min (0 billable) = 15 min x 2
        self.assertEqual(get_gt_waiting_charge(self.sr), Decimal("30"))
        GTWaitingChargePolicy.objects.update(rate_per_minute=Decimal("3"), max_charge_per_booking=Decimal("40"))
        self.assertEqual(get_gt_waiting_charge(self.sr), Decimal("40"))                    # admin cap
        GTWaitingChargePolicy.objects.update(is_enabled=False)
        self.assertEqual(get_gt_waiting_charge(self.sr), Decimal("0"))

    def test_advance_follows_admin_percentage(self):
        from service_requests.models import GTAdvancePaymentPolicy, get_gt_advance_due
        self.assertEqual(get_gt_advance_due(self.sr), Decimal("0"))
        GTAdvancePaymentPolicy.objects.create(service_category="", is_enabled=True, advance_percent=Decimal("30"), is_active=True)
        self.assertEqual(get_gt_advance_due(self.sr, total=Decimal("200")), Decimal("60"))
        GTAdvancePaymentPolicy.objects.create(service_category="goods_transport_two_wheeler", is_enabled=True, advance_percent=Decimal("50"), is_active=True)
        self.assertEqual(get_gt_advance_due(self.sr, total=Decimal("200")), Decimal("100"))   # category overrides platform-wide


class AdminHostileInputTests(Base, TestCase):
    """Admin (source of truth) endpoints: bad values are refused with 4xx and never change live pricing."""

    def setUp(self):
        self._world()
        self.admin = User.objects.create_user(username="adm_p", email="adm_p@example.com", phone="9000777888", role="admin")
        self.a = APIClient(); self.a.force_authenticate(self.admin)
        PackersMoversConfig.objects.create(city="Hosur", standard_packing_rate_cft=Decimal("7"), premium_packing_rate_cft=Decimal("12"),
                                           premium_fragile_addon=Decimal("200"), floor_rate_no_lift_per_100cft=Decimal("150"),
                                           unpacking_rate_cft=Decimal("4"), gst_rate=Decimal("0.18"), survey_cft_threshold=500.0)

    def test_pm_config_rejects_bad_values_and_keeps_old_ones(self):
        for body in ({"standard_packing_rate_cft": "-5"}, {"standard_packing_rate_cft": "abc"}, {"gst_rate": "5"}, {"gst_rate": "-0.1"},
                     {"max_helpers": -1}, {"max_helpers": 999}, {"survey_cft_threshold": "x"}, {"survey_cft_threshold": "NaN"}, {"standard_packing_rate_cft": "NaN"}, {"gst_rate": "Infinity"}, {"city": ""}, {"standard_packing_rate_cft": None}):
            for method in (self.a.patch, self.a.put, self.a.post):
                r = method("/api/logistics/admin/packers-movers-config/", {"city": "Hosur", **body}, format="json")
                self.assertLess(r.status_code, 500, (method.__name__, body, r.status_code, r.content[:160]))
        cfg = PackersMoversConfig.objects.get(city="Hosur")
        self.assertEqual(cfg.standard_packing_rate_cft, Decimal("7.00"))
        self.assertEqual(cfg.gst_rate, Decimal("0.1800"))

    def test_admin_slot_label_must_be_a_time_window_and_sets_the_times(self):
        from logistics.models import LogisticsSlot
        for bad in ("banana", "Morning", "25:99 - 26:00", "   "):
            r = self.a.post("/api/logistics/admin/slots/", {"slot_label": bad, "group": "Morning", "capacity": 3}, format="json")
            self.assertEqual(r.status_code, 400, (bad, r.content[:150]))
        self.assertEqual(LogisticsSlot.objects.count(), 0)
        r = self.a.post("/api/logistics/admin/slots/", {"slot_label": "08:00 PM - 09:30 PM", "group": "Evening", "capacity": 3}, format="json")
        self.assertEqual(r.status_code, 200, r.content[:200])
        slot = LogisticsSlot.objects.get()
        self.assertEqual((slot.start_time.hour, slot.start_time.minute), (20, 0))
        self.assertEqual((slot.end_time.hour, slot.end_time.minute), (21, 30))
        r = self.a.patch(f"/api/logistics/admin/slots/{slot.id}/", {"slot_label": "banana"}, format="json")
        self.assertEqual(r.status_code, 400)
        slot.refresh_from_db(); self.assertEqual(slot.slot_label, "08:00 PM - 09:30 PM")
        r = self.a.patch(f"/api/logistics/admin/slots/{slot.id}/", {"slot_label": "07:00 PM - 08:00 PM"}, format="json")
        self.assertLess(r.status_code, 300, r.content[:200])
        slot.refresh_from_db(); self.assertEqual(slot.start_time.hour, 19)

    def test_catalog_package_gt_fields_reject_garbage(self):
        from service_requests.models import CatalogCategory, Package, PackageStatus, Service
        cat = CatalogCategory.objects.create(name="Goods & Transport", slug="gt")
        svc = Service.objects.create(category=cat, name="Two Wheeler", slug="two-wheeler-service")
        pkg = Package.objects.create(service=svc, name="Bike", slug=self.bike.slug, base_price=Decimal("50"), status=PackageStatus.ACTIVE)
        for body in ({"gt_per_km_rate": "abc"}, {"gt_per_km_rate": "-3", "reason": "x"}, {"gt_surge_multiplier": "99", "reason": "x"},
                     {"gt_gst_rate": "101", "reason": "x"}, {"gt_base_fare": "1e999", "reason": "x"}, {"gt_free_km": {"a": 1}, "reason": "x"},
                     {"gt_city": "x" * 500}, {"base_price": "-1", "reason": "x"}):
            r = self.a.put(f"/api/settings/catalog/v2/packages/{pkg.id}/", body, format="json")
            self.assertLess(r.status_code, 500, (body, r.status_code, r.content[:160]))
        self.bike.refresh_from_db()
        self.assertEqual(self.bike.per_km_rate, Decimal("10.00"))
        self.assertEqual(self.bike.surge_multiplier, Decimal("1.00"))

    def test_service_zone_api_rejects_bad_shapes(self):
        for body in ({}, {"name": ""}, {"name": "Z", "center_lat": 999, "center_lng": 0, "radius_meters": 1000},
                     {"name": "Z", "center_lat": 12, "center_lng": 77, "radius_meters": -5},
                     {"name": "Z", "center_lat": "x", "center_lng": 77, "radius_meters": 1000},
                     {"name": "Z", "center_lat": 12, "center_lng": 77, "radius_meters": 10 ** 12},
                     {"name": "Z", "center_lat": 12, "center_lng": 77, "radius_meters": 1000, "vehicle_classes": "notalist"},
                     {"name": "Z", "center_lat": 12, "center_lng": 77, "radius_meters": 1000, "vehicle_classes": ["spaceship"]}):
            before = ServiceZone.objects.count()
            r = self.a.post("/api/settings/service-zones/", body, format="json")
            self.assertLess(r.status_code, 500, (body, r.status_code, r.content[:160]))
            self.assertEqual(ServiceZone.objects.count(), before, ("accepted invalid zone", body, r.status_code))
        self.assertEqual(ServiceZone.objects.count(), 1)              # only the fixture zone


class SecurityAndTextTests(Base, TestCase):
    """Hostile / non-Latin text in customer-entered fields never breaks booking, invoice, tracking or SMS."""

    def setUp(self):
        self._world()

    NASTY = ["<script>alert(1)</script>", "'; DROP TABLE service_requests_servicerequest;--", "{{7*7}} ${7*7} %s %(x)s",
             "ரவி குமார்", "रवि कुमार", "😀 emoji 🚚", "a" * 900, "line1\nline2\r\nline3", "<img src=x onerror=alert(1)>", "‮RTL‬"]

    def test_text_fields_roundtrip_safely_through_booking_invoice_and_tracking(self):
        from service_requests.views import _build_tracking_payload
        for i, text in enumerate(self.NASTY):
            cache.clear()
            q = self.quote(self.bike)
            r = self.book(self.bike, q, address=text[:250] or "x", drop_address=text[:250] or "y", description=text[:900],
                          customer_name=("Ravi " + text)[:40] if len(text) < 30 else "Ravi Kumar")
            self.assertLess(r.status_code, 500, (text[:20], r.content[:200]))
            if r.status_code != 201:
                continue
            sr = ServiceRequest.objects.latest("id")
            inv = self.c.get(f"/api/booking/{sr.id}/invoice/")
            self.assertEqual(inv.status_code, 200, (text[:20], inv.content[:200]))
            self.assertTrue(inv.content.startswith(b"%PDF"))
            payload = _build_tracking_payload(sr, has_full_access=True)
            import json
            json.dumps(payload, default=str)                              # always serialisable
            pub = APIClient().get(f"/api/tracking/{sr.tracking_token}/")
            self.assertEqual(pub.status_code, 200, pub.content[:200])
            self.assertTrue(pub["Content-Type"].startswith("application/json"))       # data, never rendered as HTML by the API
            fb = pub.json()["data"]["fare_breakdown"]
            for k in ("rate_minimum_fare", "gst_rate", "distance_source"):
                self.assertNotEqual(fb.get(k), {}, k)                                  # absent values are null, not {}

    def test_null_bytes_and_control_chars_are_rejected_or_stripped_not_a_500(self):
        q = self.quote(self.bike)
        for text in ("bad\x00byte", "ctrl\x07\x08", "tab\tok"):
            r = self.book(self.bike, q, address=text, description=text)
            self.assertLess(r.status_code, 500, (repr(text), r.content[:160]))
            if r.status_code == 201:
                self.assertNotIn("\x00", ServiceRequest.objects.latest("id").address)
            ServiceRequest.objects.all().delete()

    def test_public_tracking_token_is_unguessable_and_leaks_no_private_data(self):
        q = self.quote(self.bike); self.assertEqual(self.book(self.bike, q).status_code, 201)
        sr = ServiceRequest.objects.latest("id")
        anon = APIClient()
        for bad in ("00000000-0000-0000-0000-000000000000", "1", str(sr.id), sr.request_id, "../../etc/passwd", "%00", "a" * 300):
            r = anon.get(f"/api/tracking/{bad}/")
            self.assertIn(r.status_code, (400, 404), (bad[:20], r.status_code))
        body = anon.get(f"/api/tracking/{sr.tracking_token}/").content.decode()
        self.assertNotIn(self.user.email, body)                         # no customer e-mail
        self.assertNotIn(sr.start_otp or "no-otp", body) if sr.start_otp else None   # start OTP only for the owner

    def test_idempotency_key_reuse_with_a_different_payload_is_refused(self):
        q = self.quote(self.bike)
        k = f"idem_{uuid.uuid4().hex}"
        r1 = self.book(self.bike, q, key=k)
        self.assertEqual(r1.status_code, 201)
        r2 = self.book(self.bike, q, key=k, address="Somewhere else entirely")
        self.assertIn(r2.status_code, (400, 409, 422))
        r3 = self.book(self.bike, q, key=k)                               # same payload: same booking, no duplicate
        self.assertEqual(ServiceRequest.objects.count(), 1)


class RobustnessRegressionTests(TestCase):
    """Defects found by running the GT flows against real PostgreSQL / under load."""

    def _sr(self, **kw):
        uid = uuid.uuid4().hex[:8]
        u = get_user_model().objects.create_user(
            username=f"r_{uid}", email=f"{uid}@e.com", password="pw12345678",
            phone=f"97{uuid.uuid4().int % 100000000:08d}", role="customer")
        base = dict(customer=u, customer_name="R", phone=u.phone, service_category="goods_transport_truck",
                    issue_title="t", address="a", preferred_date=timezone.localdate(), total_amount=Decimal("10"))
        base.update(kw)
        return ServiceRequest.objects.create(**base)

    def test_request_id_collision_retry_moves_past_the_contended_number(self):
        first = self._sr()
        import service_requests.models as m
        seen = []
        real = m._generate_request_id

        def fake(cat=None, skip=0):
            seen.append(skip)
            return first.request_id if skip == 0 else real(cat, skip=skip)
        with patch.object(m, "_generate_request_id", side_effect=fake):
            second = self._sr()
        self.assertNotEqual(second.request_id, first.request_id)
        self.assertEqual(seen[0], 0)
        self.assertTrue(any(s > 0 for s in seen[1:]), seen)       # retry jitters instead of recomputing the same id

    def test_failing_legacy_catalog_mirror_does_not_poison_the_transaction(self):
        from django.db import transaction
        from service_requests.services.catalog import _sync_goods_tables
        from types import SimpleNamespace
        pkg = SimpleNamespace(id=1, base_price=1, name="n", duration="d", tag="", description="", includes=[], status="ACTIVE")
        with transaction.atomic():
            _sync_goods_tables(pkg)                     # legacy tables absent in a fresh DB -> statement fails
            self.assertGreaterEqual(ServiceRequest.objects.count(), 0)   # still usable afterwards

    def test_unicode_customer_text_renders_in_invoice_without_error(self):
        sr = self._sr(customer_name="ரவி குமார் Ravi", address="கொடுமுடி, हिन्दी Hosur")
        c = APIClient(); c.force_authenticate(sr.customer)
        r = c.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.content.startswith(b"%PDF"))
