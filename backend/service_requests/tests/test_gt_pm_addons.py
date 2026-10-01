"""Porter-parity P&M add-on catalogue: rope pulling, appliance install/uninstall, electrician,
carpenter, labour-only. Admin-configured, server-priced, flows into the booking total and the
invoice."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import GoodsCategory, GoodsItem, LogisticsCategory, PMAddOnService, PackersMoversConfig, ServiceTier
from service_requests.models import ServiceRequest

User = get_user_model()
ROUTE = {"distance_km": 10.0, "duration_minutes": 25, "distance_source": "google_maps_road_distance", "is_authoritative": True}


class PMAddOnPricingTests(TestCase):
    def test_flat_per_unit_and_per_cft_modes(self):
        from service_requests.services.pm_addons import price_pm_addons
        PMAddOnService.objects.create(code="electrician", name="Electrician", pricing_mode="FLAT", unit_price=Decimal("300"), max_quantity=1)
        PMAddOnService.objects.create(code="appliance_install", name="Appliance install/uninstall", pricing_mode="PER_UNIT", unit_price=Decimal("150"), max_quantity=5)
        PMAddOnService.objects.create(code="rope_pulling", name="Rope pulling", pricing_mode="PER_CFT", unit_price=Decimal("2"), max_quantity=1000)
        cart = [{"pm_addons": [{"code": "electrician", "quantity": 3}, {"code": "appliance_install", "quantity": 2}, {"code": "rope_pulling", "quantity": 1}]}]
        total, items, err = price_pm_addons(cart, "Hosur", 50)
        self.assertIsNone(err)
        self.assertEqual(total, Decimal("300.00") + Decimal("300.00") + Decimal("100.00"))  # FLAT ignores qty; 150*2; 2*50
        self.assertEqual(len(items), 3)

    def test_unknown_or_inactive_code_is_an_error(self):
        from service_requests.services.pm_addons import price_pm_addons
        PMAddOnService.objects.create(code="carpenter", name="Carpenter", pricing_mode="FLAT", unit_price=Decimal("400"), is_active=False)
        cart = [{"pm_addons": [{"code": "carpenter", "quantity": 1}]}]
        total, items, err = price_pm_addons(cart, "Hosur", 0)
        self.assertIsNotNone(err)
        self.assertEqual(total, Decimal("0.00"))

    def test_quantity_over_max_is_refused(self):
        from service_requests.services.pm_addons import price_pm_addons
        PMAddOnService.objects.create(code="helper", name="Extra helper", pricing_mode="PER_UNIT", unit_price=Decimal("250"), max_quantity=2)
        cart = [{"pm_addons": [{"code": "helper", "quantity": 3}]}]
        total, items, err = price_pm_addons(cart, "Hosur", 0)
        self.assertIn("at most 2", err)

    def test_city_scoped_addon_not_available_elsewhere(self):
        from service_requests.services.pm_addons import price_pm_addons
        PMAddOnService.objects.create(code="rope_pulling", name="Rope pulling", pricing_mode="FLAT", unit_price=Decimal("250"), city="Hosur")
        cart = [{"pm_addons": [{"code": "rope_pulling", "quantity": 1}]}]
        _, _, err = price_pm_addons(cart, "Chennai", 0)
        self.assertIsNotNone(err)
        _, _, err2 = price_pm_addons(cart, "Hosur", 0)
        self.assertIsNone(err2)

    def test_no_selection_is_a_free_no_op(self):
        from service_requests.services.pm_addons import price_pm_addons
        total, items, err = price_pm_addons([{}], "Hosur", 0)
        self.assertEqual((total, items, err), (Decimal("0.00"), [], None))


class PMAddOnAdminApiTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username=f"a{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com",
                                              password="pw12345678", role="admin")
        self.c = APIClient(); self.c.force_authenticate(self.admin)

    def test_create_list_patch_and_soft_delete(self):
        r = self.c.post("/api/logistics/admin/pm-addons/", {"name": "Carpenter", "pricing_mode": "FLAT", "unit_price": "500", "max_quantity": 1}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        aid = r.data["data"]["id"]
        self.assertEqual(r.data["data"]["code"], "carpenter")

        dup = self.c.post("/api/logistics/admin/pm-addons/", {"name": "Carpenter Again", "code": "carpenter", "pricing_mode": "FLAT", "unit_price": "1"}, format="json")
        self.assertEqual(dup.status_code, 400)

        lst = self.c.get("/api/logistics/admin/pm-addons/")
        self.assertEqual(lst.status_code, 200)
        self.assertTrue(any(row["id"] == aid for row in lst.data["data"]))

        patched = self.c.patch(f"/api/logistics/admin/pm-addons/{aid}/", {"unit_price": "600", "code": "should-not-change"}, format="json")
        self.assertEqual(patched.status_code, 200, patched.content)
        self.assertEqual(patched.data["data"]["unit_price"], "600.00")
        self.assertEqual(patched.data["data"]["code"], "carpenter")

        deleted = self.c.delete(f"/api/logistics/admin/pm-addons/{aid}/")
        self.assertEqual(deleted.status_code, 200)
        self.assertFalse(PMAddOnService.objects.get(pk=aid).is_active)

    def test_public_catalogue_only_shows_active_and_in_city(self):
        PMAddOnService.objects.create(code="a1", name="Active All-City", pricing_mode="FLAT", unit_price=Decimal("100"))
        PMAddOnService.objects.create(code="a2", name="Inactive", pricing_mode="FLAT", unit_price=Decimal("100"), is_active=False)
        PMAddOnService.objects.create(code="a3", name="Chennai Only", pricing_mode="FLAT", unit_price=Decimal("100"), city="Chennai")
        anon = APIClient()
        r = anon.get("/api/logistics/packers-movers/addons/?city=Hosur")
        codes = {row["code"] for row in r.data["data"]}
        self.assertEqual(codes, {"a1"})
        r2 = anon.get("/api/logistics/packers-movers/addons/?city=Chennai")
        self.assertEqual({row["code"] for row in r2.data["data"]}, {"a1", "a3"})


class PMBookingWithAddOnsTests(TestCase):
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
        self.carpenter = PMAddOnService.objects.create(code="carpenter", name="Carpenter", pricing_mode="FLAT", unit_price=Decimal("300"), max_quantity=1)

    def _quote(self):
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            r = self.client.post("/api/logistics/packers-movers/quote/", {
                "pickup_latitude": 12.734, "pickup_longitude": 77.828, "drop_latitude": 12.85, "drop_longitude": 77.78,
                "city": "Hosur", "service_tier_id": self.tier.id,
                "inventory": [{"goods_item_id": self.item.id, "quantity": 1}]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.data["data"]

    def _book(self, q, total, addons=None):
        cart_item = {"quote_id": q["quote_id"], "package": "Mini Truck", "price": float(total),
                     "inventory": [{"goods_item_id": self.item.id, "name": "Bed", "quantity": 1}],
                     "packing_tier": "standard", "dismantling_required": True, "unpacking_required": False,
                     "city": "Hosur", "pickup_floor": 0, "pickup_has_lift": True, "drop_floor": 0, "drop_has_lift": True,
                     "relocation_type": "Within City"}
        if addons is not None:
            cart_item["pm_addons"] = addons
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return self.client.post("/api/booking/", {
                "customer_name": "Ravi", "phone": self.user.phone, "email": self.user.email,
                "service_category": "packers_movers", "city": "hosur", "issue_title": "Packers & Movers", "description": "x",
                "address": "Pickup, Hosur", "drop_address": "Drop, Hosur", "latitude": 12.734, "longitude": 77.828,
                "drop_latitude": 12.85, "drop_longitude": 77.78,
                "preferred_date": str(timezone.localdate() + timezone.timedelta(days=1)), "preferred_time": "Morning",
                "total_amount": str(total), "payment_method": "COD", "logistics_tier": self.tier.id,
                "cart_data": [cart_item]}, format="json")

    def test_addon_is_priced_server_side_and_added_to_total(self):
        q = self._quote()
        base_total = Decimal(str(q["total"]))
        r = self._book(q, base_total + Decimal("300"), addons=[{"code": "carpenter", "quantity": 1}])
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.filter(service_category="packers_movers").latest("id")
        self.assertEqual(sr.total_amount, base_total + Decimal("300.00"))
        self.assertEqual(sr.fare_breakdown["pm_addons"][0]["code"], "carpenter")

    def test_client_supplied_total_that_ignores_addon_price_is_rejected(self):
        q = self._quote()
        base_total = Decimal(str(q["total"]))
        # Client sends only the base total, not base+addon -- must be refused, never silently accepted.
        r = self._book(q, base_total, addons=[{"code": "carpenter", "quantity": 1}])
        self.assertEqual(r.status_code, 400, r.content)

    def test_unknown_addon_code_refuses_the_booking(self):
        q = self._quote()
        base_total = Decimal(str(q["total"]))
        r = self._book(q, base_total, addons=[{"code": "no_such_addon", "quantity": 1}])
        self.assertEqual(r.status_code, 400)

    def test_booking_without_addons_is_unaffected(self):
        q = self._quote()
        base_total = Decimal(str(q["total"]))
        r = self._book(q, base_total)
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.filter(service_category="packers_movers").latest("id")
        self.assertEqual(sr.total_amount, base_total)
        self.assertNotIn("pm_addons", sr.fare_breakdown or {})

    def test_invoice_itemises_the_addon(self):
        q = self._quote()
        base_total = Decimal(str(q["total"]))
        r = self._book(q, base_total + Decimal("300"), addons=[{"code": "carpenter", "quantity": 1}])
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.get(request_id=r.data["data"]["request_id"])
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        self.assertIn("Carpenter", seen)
        self.assertIn("Rs. 300.00", seen)
