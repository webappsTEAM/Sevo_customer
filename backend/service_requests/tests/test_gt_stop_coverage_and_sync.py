"""
Multi-stop Goods & Transport: every stop must be located AND covered, and the
stop list, quote, price and saved booking must agree through add / edit / remove
-- for Mini Truck and Two Wheeler.

Before: check_route_coverage looked at pickup and drop only, so a stop typed in
from a suggestion (which bypasses the map picker's own zone check) could sit
outside every active ServiceZone and still be quoted, priced and booked; and a
stop with an address but no coordinates was saved with no location while the
fare engine silently left it out of the price.
"""
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from companies.models import Company
from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import ServiceRequest, TripStop
from settings_hub.models import ServiceZone, ServiceZoneService
from settings_hub.service_zone_engine import check_route_coverage, extract_route_stops

User = get_user_model()

PICKUP = {"lat": "12.740900", "lng": "77.825300"}
DROP = {"lat": "12.760000", "lng": "77.840000"}
IN_A = {"lat": 12.745, "lng": 77.830, "address": "Stop A, Hosur"}
IN_B = {"lat": 12.750, "lng": 77.835, "address": "Stop B, Hosur"}
IN_A_MOVED = {"lat": 12.755, "lng": 77.828, "address": "Stop A moved, Hosur"}
OUTSIDE = {"lat": 13.50, "lng": 78.50, "address": "Far away"}

CATS = {
    "truck": ("goods_transport_truck", "truck"),
    "two_wheeler": ("goods_transport_two_wheeler", "two_wheeler"),
}


def _route(km=3.0):
    return {"distance_km": km, "duration_seconds": 600, "source": "google_maps"}


class ExtractRouteStopsTests(TestCase):
    def test_shapes_order_and_skips(self):
        got = extract_route_stops([
            {"stop_type": "PICKUP", "latitude": 1, "longitude": 1, "address": "p"},
            {"lat": 12.7, "lng": 77.8, "address": "a"},
            {"address": "", "lat": None, "lng": None},          # blank row
            [12.8, 77.9],
            {"latitude": "12.9", "longitude": "78.0", "address": "c"},
            {"stop_type": "DROP", "latitude": 2, "longitude": 2},
            {"address": "typed only"},                           # no coordinates
        ])
        self.assertEqual([g[0] for g in got], [1, 2, 3, 4])
        self.assertEqual(got[3][1:], (None, None, True))
        self.assertEqual(extract_route_stops(None), [])
        self.assertEqual(extract_route_stops("nope"), [])


class StopCoverageTests(TestCase):
    def setUp(self):
        self.company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        self.zone = ServiceZone.objects.create(
            company=self.company, name="Hosur", center_lat=12.75, center_lng=77.83, radius_meters=8000)
        for slug in (CATS["truck"][0], CATS["two_wheeler"][0]):
            ServiceZoneService.objects.create(zone=self.zone, service_slug=slug, is_available=True)

    def check(self, stops, slug="goods_transport_truck", **kw):
        return check_route_coverage(
            pickup_lat=PICKUP["lat"], pickup_lng=PICKUP["lng"], drop_lat=DROP["lat"], drop_lng=DROP["lng"],
            service_slug=slug, company=self.company, stops=stops, **kw)

    def test_covered_stops_pass(self):
        self.assertTrue(self.check([IN_A, IN_B]).allowed)

    def test_uncovered_stop_is_named_and_refused(self):
        r = self.check([IN_A, OUTSIDE])
        self.assertFalse(r.allowed)
        self.assertEqual((r.failed_point, r.failed_stop_index, r.error_code), ("stop", 2, "STOP_OUT_OF_COVERAGE"))
        self.assertIn("Stop 2", r.message)

    def test_unlocated_stop_refused(self):
        r = self.check([{"address": "typed but never located"}])
        self.assertEqual((r.failed_point, r.failed_stop_index, r.error_code), ("stop", 1, "STOP_LOCATION_REQUIRED"))

    def test_unlocated_stop_refused_even_with_geofencing_off(self):
        ServiceZone.objects.all().delete()
        r = self.check([IN_A, {"address": "typed but never located"}])
        self.assertEqual((r.failed_point, r.failed_stop_index), ("stop", 2))
        # ...while coordinates-bearing stops are not gated when there are no zones.
        self.assertTrue(self.check([OUTSIDE]).allowed)

    def test_service_not_assigned_to_zone_refuses_stop(self):
        self.zone.zone_services.filter(service_slug="goods_transport_two_wheeler").update(is_available=False)
        self.assertFalse(self.check([IN_A], slug="goods_transport_two_wheeler").allowed)
        self.assertTrue(self.check([IN_A], slug="goods_transport_truck").allowed)

    def test_vehicle_restriction_applies_to_stops(self):
        self.zone.vehicle_classes = ["truck"]; self.zone.save()
        r = self.check([IN_A], slug="goods_transport_two_wheeler", vehicle_class="two_wheeler", vehicle_label="2 Wheeler")
        self.assertFalse(r.allowed)
        self.assertIn(r.failed_point, ("pickup",))  # the ends are checked first, same rule

    def test_blank_and_explicit_end_entries_ignored(self):
        self.assertTrue(self.check([{"address": ""}, {"stop_type": "DROP", "latitude": 99, "longitude": 99}]).allowed)

    def test_no_stops_unchanged(self):
        self.assertTrue(self.check(None).allowed)
        self.assertTrue(self.check([]).allowed)


class StopFlowBase(TestCase):
    cat = "truck"

    def setUp(self):
        self.company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        self.slug, self.tier_cat = CATS[self.cat]
        uid = uuid.uuid4().hex[:8]
        self.tier = ServiceTier.objects.create(
            category=getattr(LogisticsCategory, self.cat.upper()), city="hosur", slug=f"t-{uid}", name="Tier",
            starting_price=Decimal("100.00"), base_fare=Decimal("100.00"), per_km_rate=Decimal("10.00"),
            free_km=Decimal("1.00"), additional_stop_charge=Decimal("40.00"), vehicle_class=self.tier_cat,
            max_weight_kg=Decimal("500"), max_cft=Decimal("50"))
        zone = ServiceZone.objects.create(company=self.company, name="Hosur", center_lat=12.75,
                                          center_lng=77.83, radius_meters=8000)
        ServiceZoneService.objects.create(zone=zone, service_slug=self.slug, is_available=True)
        self.customer = User.objects.create_user(
            username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
            phone=f"98{uuid.uuid4().int % 100000000:08d}", role=getattr(User.Role, "CUSTOMER", "customer"))
        self.client = APIClient()

    def quote(self, stops):
        body = {"service_category": self.slug, "tier_id": self.tier.id,
                "pickup_latitude": PICKUP["lat"], "pickup_longitude": PICKUP["lng"],
                "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"], "waypoints": stops}
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            return self.client.post("/api/logistics/quote/", data=json.dumps(body), content_type="application/json")

    def book(self, stops, quote=None):
        self.client.force_authenticate(user=self.customer)
        payload_stops = [
            {"stop_order": i + 1, "address": s.get("address", ""), "latitude": s.get("lat"), "longitude": s.get("lng"),
             "contact_name": "", "contact_phone": ""} for i, s in enumerate(stops)]
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            return self.client.post("/api/booking/", {
                "customer_name": "E2E Customer", "phone": self.customer.phone, "email": self.customer.email,
                "service_category": self.slug, "issue_title": "Delivery", "description": "boxes",
                "address": "Pickup, Hosur", "latitude": PICKUP["lat"], "longitude": PICKUP["lng"],
                "drop_address": "Drop, Hosur", "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"],
                "preferred_date": str(timezone.localdate()), "total_amount": (quote["total"] if quote else "1.00"), "payment_method": "COD",
                "logistics_tier": self.tier.id, "stops": payload_stops,
                **({"cart_data": [{"quote_id": quote["quote_id"], "quote_hash": quote["quote_hash"],
                                   "expires_at": quote["expires_at"], "stops": payload_stops}]} if quote else {}),
            }, format="json")

    def data(self, resp):
        j = resp.json()
        return j.get("data", j)

    def trip_stops(self, sr):
        return list(sr.trip_stops.order_by("sequence").values_list("stop_type", "address"))


class _FlowMixin:
    def test_quote_add_edit_remove_stay_in_sync(self):
        base = self.data(self.quote([]))
        two = self.data(self.quote([IN_A, IN_B]))                       # add
        one = self.data(self.quote([IN_A]))                             # remove
        moved = self.data(self.quote([IN_A_MOVED, IN_B]))               # edit
        self.assertEqual(base["breakdown"]["additional_stops"], 0)
        self.assertEqual((two["breakdown"]["stops"], two["breakdown"]["additional_stop_charge"]), (4, "80.00"))
        self.assertEqual((one["breakdown"]["stops"], one["breakdown"]["additional_stop_charge"]), (3, "40.00"))
        self.assertLess(Decimal(one["total"]), Decimal(two["total"]))
        self.assertLess(Decimal(base["total"]), Decimal(one["total"]))
        # the quote is bound to the exact stops: editing one changes the hash
        self.assertNotEqual(two["quote_hash"], moved["quote_hash"])
        self.assertEqual(two["quote_hash"], self.data(self.quote([IN_A, IN_B]))["quote_hash"])

    def test_quote_refuses_uncovered_or_unlocated_stop(self):
        r = self.quote([IN_A, OUTSIDE])
        self.assertEqual(r.status_code, 400)
        j = r.json()
        self.assertEqual((j["failed_point"], j["failed_stop_index"]), ("stop", 2))
        r = self.quote([{"address": "typed only"}])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error_code"], "STOP_LOCATION_REQUIRED")

    def test_booking_persists_stops_in_order_and_edits_replace_them(self):
        r = self.book([IN_A, IN_B])
        self.assertIn(r.status_code, (200, 201), r.content)
        sr = ServiceRequest.objects.filter(service_category=self.slug).order_by("-id").first()
        stops = self.trip_stops(sr)
        self.assertEqual([s[0] for s in stops], ["PICKUP", "WAYPOINT", "WAYPOINT", "DROP"])
        self.assertEqual([s[1] for s in stops][1:3], ["Stop A, Hosur", "Stop B, Hosur"])
        self.assertEqual(sr.trip_stops.filter(stop_type="WAYPOINT").first().latitude, Decimal("12.745000"))
        # remove one + edit the other -> a NEW booking carries exactly the new list
        r2 = self.book([IN_A_MOVED])
        self.assertIn(r2.status_code, (200, 201), r2.content)
        sr2 = ServiceRequest.objects.filter(service_category=self.slug).order_by("-id").first()
        self.assertNotEqual(sr.id, sr2.id)
        self.assertEqual([s[1] for s in self.trip_stops(sr2)][1:-1], ["Stop A moved, Hosur"])
        self.assertLess(sr2.total_amount, sr.total_amount)

    def test_booking_with_its_own_quote_and_stops_is_accepted(self):
        # The real page books with the quote it was shown. That quote counts the
        # whole route (pickup + stops + drop); the booking used to compare it
        # with the default of 2 and refuse every multi-stop booking.
        for stops in ([IN_A], [IN_A, IN_B]):
            with self.subTest(stops=len(stops)):
                quote = self.data(self.quote(stops))
                r = self.book(stops, quote=quote)
                self.assertIn(r.status_code, (200, 201), r.content)
                sr = ServiceRequest.objects.filter(service_category=self.slug).order_by("-id").first()
                self.assertEqual(sr.total_amount, Decimal(quote["total"]))
                self.assertEqual(sr.trip_stops.filter(stop_type="WAYPOINT").count(), len(stops))

    def test_booking_whose_stops_differ_from_its_quote_is_still_refused(self):
        quote = self.data(self.quote([IN_A, IN_B]))
        r = self.book([IN_A], quote=quote)
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("recalculate", r.content.decode().lower())

    def test_editing_the_route_after_booking_is_held_to_the_same_coverage(self):
        # PUT /booking/<id>/stops/ used to accept any stop, so a covered booking
        # could be re-routed through uncovered ground after it was accepted.
        self.assertIn(self.book([IN_A]).status_code, (200, 201))
        sr = ServiceRequest.objects.filter(service_category=self.slug).order_by("-id").first()
        url = f"/api/booking/{sr.id}/stops/"
        current = self.client.get(url).json()["data"]
        keep = [{"id": s["id"], "stop_type": s["stop_type"], "address": s["address"], "latitude": s["latitude"],
                 "longitude": s["longitude"]} for s in current]
        def extra(o):
            return {"stop_type": "WAYPOINT", "address": o["address"], "latitude": o["lat"], "longitude": o["lng"]}
        before = self.trip_stops(sr)
        # insert an uncovered stop before the drop
        bad = keep[:-1] + [extra(OUTSIDE)] + keep[-1:]
        r = self.client.put(url, {"stops": bad}, format="json")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertIn("Stop 2 is outside", r.content.decode())
        self.assertEqual(self.trip_stops(sr), before)                      # nothing changed
        # a covered edit is still accepted
        good = keep[:-1] + [extra(IN_B)] + keep[-1:]
        r = self.client.put(url, {"stops": good}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(sr.trip_stops.filter(stop_type="WAYPOINT").count(), 2)

    def test_reordering_a_saved_route_by_id_does_not_collide_or_lose_stops(self):
        self.assertIn(self.book([IN_A, IN_B]).status_code, (200, 201))
        sr = ServiceRequest.objects.filter(service_category=self.slug).order_by("-id").first()
        url = f"/api/booking/{sr.id}/stops/"
        cur = self.client.get(url).json()["data"]
        p, a, b, d = cur
        def row(s):
            return {"id": s["id"], "stop_type": s["stop_type"], "address": s["address"],
                    "latitude": s["latitude"], "longitude": s["longitude"]}
        r = self.client.put(url, {"stops": [row(p), row(b), row(a), row(d)]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        got = [(s.stop_type, s.address) for s in sr.trip_stops.order_by("sequence")]
        self.assertEqual([g[1] for g in got], [p["address"], b["address"], a["address"], d["address"]])
        self.assertEqual([g[0] for g in got], ["PICKUP", "WAYPOINT", "WAYPOINT", "DROP"])

    def test_booking_refused_for_uncovered_or_unlocated_stop_and_nothing_saved(self):
        before = ServiceRequest.objects.count()
        r = self.book([IN_A, OUTSIDE])
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual((r.json()["failed_point"], r.json()["failed_stop_index"]), ("stop", 2))
        r = self.book([{"address": "typed only"}])
        self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(ServiceRequest.objects.count(), before)


class TruckStopFlowTests(_FlowMixin, StopFlowBase):
    cat = "truck"


class TwoWheelerStopFlowTests(_FlowMixin, StopFlowBase):
    cat = "two_wheeler"


class SingleEndCoverageTests(TestCase):
    """One end of a trip can be checked on its own (same engine, same messages)."""

    def setUp(self):
        self.company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        z = ServiceZone.objects.create(company=self.company, name="Hosur", center_lat=12.75, center_lng=77.83, radius_meters=8000)
        ServiceZoneService.objects.create(zone=z, service_slug="goods_transport_truck", is_available=True)

    def call(self, point, lat, lng, slug="goods_transport_truck"):
        r = self.client.post("/api/settings/service-zones/check/",
                             {"lat": lat, "lng": lng, "point": point, "service_slug": slug}, content_type="application/json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()

    def test_covered_and_uncovered_pickup_and_drop(self):
        self.assertTrue(self.call("pickup", 12.745, 77.83)["in_zone"])
        bad = self.call("pickup", 13.5, 78.5)
        self.assertFalse(bad["in_zone"])
        self.assertEqual(bad["failed_point"], "pickup")
        self.assertIn("pickup location is outside", bad["message"])
        badd = self.call("drop", 13.5, 78.5)
        self.assertEqual(badd["failed_point"], "drop")
        self.assertIn("drop location is outside", badd["message"])

    def test_service_not_assigned_to_the_zone_is_uncovered(self):
        self.assertFalse(self.call("pickup", 12.745, 77.83, slug="goods_transport_two_wheeler")["in_zone"])

    def test_message_matches_the_route_check_for_the_same_end(self):
        route = self.client.post("/api/settings/service-zones/check/", {
            "lat": 13.5, "lng": 78.5, "drop_lat": 12.745, "drop_lng": 77.83,
            "service_slug": "goods_transport_truck"}, content_type="application/json").json()
        self.assertEqual(route["message"], self.call("pickup", 13.5, 78.5)["message"])

    def test_no_zones_means_open_access(self):
        ServiceZone.objects.all().delete()
        self.assertTrue(self.call("pickup", 13.5, 78.5)["in_zone"])
