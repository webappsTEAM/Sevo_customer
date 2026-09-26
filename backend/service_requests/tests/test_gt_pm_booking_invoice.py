"""P&M end to end: quote -> booking bound to that quote -> invoice."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, PackersMoversConfig, ServiceTier
from service_requests.models import ServiceRequest

User = get_user_model()
ROUTE = {"distance_km": 10.0, "duration_minutes": 25, "distance_source": "google_maps_road_distance", "is_authoritative": True}


class PMBookingInvoiceTests(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:6]
        cat = GoodsCategory.objects.create(name="Bedroom", slug=f"bed-{uid}", is_active=True)
        self.item = GoodsItem.objects.create(category=cat, name="Bed", slug=f"bed-i-{uid}", default_cft=Decimal("50"),
                                              default_weight_kg=Decimal("60"), is_active=True)
        PackersMoversConfig.objects.create(city="Hosur", standard_packing_rate_cft=Decimal("7"), premium_packing_rate_cft=Decimal("12"),
                                           premium_fragile_addon=Decimal("200"), floor_rate_no_lift_per_100cft=Decimal("150"),
                                           unpacking_rate_cft=Decimal("4"), gst_rate=Decimal("0.1800"), survey_cft_threshold=500.0)
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS, city="Hosur", slug=f"pm-{uid}", name="Mini Truck (Tata Ace)",
            vehicle_class=ServiceTier.VehicleClass.TRUCK, starting_price=Decimal("1500"), base_fare=Decimal("1200"),
            per_km_rate=Decimal("25"), free_km=Decimal("3"), loading_unloading_charge=Decimal("400"),
            additional_stop_charge=Decimal("150"), minimum_fare=Decimal("1500"), max_weight_kg=Decimal("750"),
            max_cft=Decimal("150"), order=1, is_active=True)
        self.user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                             phone=f"98{uuid.uuid4().int % 100000000:08d}", role=getattr(User.Role, "CUSTOMER", "customer"))
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def _quote(self, extra_stops=0):
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            r = self.client.post("/api/logistics/packers-movers/quote/", {
                "pickup_latitude": 12.734, "pickup_longitude": 77.828, "drop_latitude": 12.85, "drop_longitude": 77.78,
                "city": "Hosur", "service_tier_id": self.tier.id, "extra_stops": extra_stops,
                "inventory": [{"goods_item_id": self.item.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.data["data"]

    def test_booking_from_quote_then_invoice(self):
        q = self._quote()
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            r = self.client.post("/api/booking/", {
                "customer_name": "Ravi", "phone": self.user.phone, "email": self.user.email,
                "service_category": "packers_movers", "city": "hosur", "issue_title": "Packers & Movers", "description": "x",
                "address": "Pickup, Hosur", "drop_address": "Drop, Hosur", "latitude": 12.734, "longitude": 77.828,
                "drop_latitude": 12.85, "drop_longitude": 77.78,
                "preferred_date": str(timezone.localdate()), "preferred_time": "Morning",
                "total_amount": str(q["total"]), "payment_method": "COD", "logistics_tier": self.tier.id,
                "cart_data": [{"quote_id": q["quote_id"], "package": "Mini Truck", "price": float(q["total"]),
                               "inventory": [{"goods_item_id": self.item.id, "name": "Bed", "quantity": 1}],
                               "packing_tier": "standard", "dismantling_required": True, "unpacking_required": False,
                               "city": "Hosur", "pickup_floor": 0, "pickup_has_lift": True, "drop_floor": 0, "drop_has_lift": True,
                               "relocation_type": "Within City"}]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.filter(service_category="packers_movers").latest("id")
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        # Line items and GST come from the locked quote; subtotal + GST == total charged.
        for expect in ("Packing (standard)", "Rs. 350.00", "Loading / unloading labour", "Rs. 400.00",
                       "Base Subtotal:", "Rs. 2,125.00", "GST (18%):", "Rs. 382.50", "Rs. 2,507.50",
                       "Pickup: Pickup, Hosur", "Drop: Drop, Hosur"):
            self.assertIn(expect, seen)
        self.assertNotIn("Surge / minimum fare adjustment", seen)

    def _book(self, q, stops):
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.client.post("/api/booking/", {
                "customer_name": "Ravi", "phone": self.user.phone, "email": self.user.email,
                "service_category": "packers_movers", "city": "hosur", "issue_title": "Packers & Movers", "description": "x",
                "address": "Pickup, Hosur", "drop_address": "Drop, Hosur", "latitude": 12.734, "longitude": 77.828,
                "drop_latitude": 12.85, "drop_longitude": 77.78, "preferred_date": str(timezone.localdate()),
                "preferred_time": "Morning", "total_amount": str(q["total"]), "payment_method": "COD",
                "logistics_tier": self.tier.id, "stops": stops,
                "cart_data": [{"quote_id": q["quote_id"], "package": "Mini Truck", "price": float(q["total"]),
                               "inventory": [{"goods_item_id": self.item.id, "name": "Bed", "quantity": 1}],
                               "packing_tier": "standard", "dismantling_required": True, "unpacking_required": False,
                               "city": "Hosur", "pickup_floor": 0, "pickup_has_lift": True, "drop_floor": 0,
                               "drop_has_lift": True, "relocation_type": "Within City"}]}, format="json")

    def test_stops_are_capped_at_three_and_persisted_with_coordinates(self):
        """The P&M page's stop manager mirrors this server cap (MAX_INTERMEDIATE_WAYPOINTS = 3)."""
        from service_requests.models import TripStop
        q = self._quote(3)
        stops = lambda n: [{"address": f"Stop {i}, Hosur", "stop_type": "WAYPOINT", "latitude": 12.74 + i / 1000,
                            "longitude": 77.82} for i in range(n)]
        r = self._book(q, stops(3))
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        mids = list(TripStop.objects.filter(booking=sr, stop_type="WAYPOINT").order_by("sequence"))
        self.assertEqual(len(mids), 3)
        self.assertTrue(all(m.latitude is not None and m.longitude is not None for m in mids))
        ServiceRequest.objects.all().delete()
        q4 = self._quote(4)
        r4 = self._book(q4, stops(4))
        self.assertEqual(r4.status_code, 400)
        self.assertEqual(r4.data.get("code") or r4.json().get("code"), "TRIP_STOPS_PERSISTENCE_FAILED")


    # ── stops are priced from the admin-configured tier charge (Porter: extra stops are part of the estimate) ──
    def _stops(self, n):
        return [{"address": f"Stop {i}, Hosur", "stop_type": "WAYPOINT", "latitude": 12.74 + i / 1000, "longitude": 77.82} for i in range(n)]

    def test_extra_stops_are_priced_at_the_tier_charge_before_gst(self):
        base = self._quote(0)
        q2 = self._quote(2)
        self.assertEqual(Decimal(base["total"]), Decimal("2507.50"))
        # tier additional_stop_charge = 150 -> 2 stops = 300 added to the subtotal, then 18% GST
        self.assertEqual(Decimal(q2["pricing"]["additional_stops_charge"]), Decimal("300.00"))
        self.assertEqual(Decimal(q2["subtotal"]), Decimal("2425.00"))
        self.assertEqual(Decimal(q2["total"]), Decimal("2861.50"))

    def test_booking_must_match_the_stops_the_quote_was_priced_for(self):
        q2 = self._quote(2)
        r = self._book(q2, self._stops(2))
        self.assertEqual(r.status_code, 201, r.content)
        ServiceRequest.objects.all().delete()
        # more stops than quoted / none at all -> refused, must re-quote
        self.assertEqual(self._book(q2, self._stops(3)).status_code, 400)
        self.assertEqual(self._book(q2, []).status_code, 400)

    def test_tier_with_no_stop_charge_prices_and_books_exactly_as_before(self):
        self.tier.additional_stop_charge = Decimal("0"); self.tier.save()
        cache.clear()
        q0, q2 = self._quote(0), self._quote(2)
        self.assertEqual(q0["total"], q2["total"])
        r = self._book(q0, self._stops(2))          # stops are free -> not enforced against the quote
        self.assertEqual(r.status_code, 201, r.content)

    def test_invoice_lists_the_stop_charge_and_still_adds_up(self):
        q2 = self._quote(2)
        r = self._book(q2, self._stops(2))
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            self.assertEqual(self.client.get(f"/api/booking/{sr.id}/invoice/").status_code, 200)
        for expect in ("Additional stops (2)", "Rs. 300.00", "Base Subtotal:", "Rs. 2,425.00", "GST (18%):", "Rs. 436.50", "Rs. 2,861.50"):
            self.assertIn(expect, seen)
        self.assertNotIn("Other charges", seen)
