"""
Configurable GST for Goods & Transport (Mini Truck / Two-Wheeler), Porter-style GST invoices.

Admin source of truth: Catalog > Package `gt_gst_rate` (percent) -> mirrored onto ServiceTier.gst_rate.
The rate is GST INCLUDED in the fare: the fare/quote total never changes, the rate is snapshotted on
each quote, and invoices show the GST component. Unset/0 = today's behaviour exactly.
"""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import ServiceTier
from service_requests.models import CatalogCategory, Package, PackageStatus, Service, ServiceRequest
from service_requests.services.catalog import LogisticsPricingPermissionError, update_package
from service_requests.services.logistics_pricing import quote_logistics_fare

User = get_user_model()
ROUTE = {"distance_km": 12.0, "duration_minutes": 30, "distance_source": "google_maps_road_distance", "is_authoritative": True}
P, D = (12.7409, 77.8253), (12.76, 77.80)


def _quote(tier):
    with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
        return quote_logistics_fare(tier=tier, pickup_lat=P[0], pickup_lng=P[1], drop_lat=D[0], drop_lng=D[1])


class GstConfigTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="gst_admin", email="ga@example.com", phone="9000333444", role="admin")
        self.finance = User.objects.create_user(username="gst_fin", email="gf@example.com", phone="9000333555", role="support")
        cat = CatalogCategory.objects.create(name="Goods & Transport", slug="gt")
        svc = Service.objects.create(category=cat, name="Two Wheeler", slug="two-wheeler-service")
        self.tier = ServiceTier.objects.create(
            category="two_wheeler", city="Hosur", slug="2-wheeler", name="2 Wheeler", starting_price=Decimal("48"),
            base_fare=Decimal("50"), per_km_rate=Decimal("10"), free_km=Decimal("2"), loading_unloading_charge=Decimal("10"))
        self.pkg = Package.objects.create(service=svc, name="2 Wheeler", slug="2-wheeler", base_price=Decimal("48"), status=PackageStatus.ACTIVE)

    # ── quote ────────────────────────────────────────────────────────────
    def test_default_is_unchanged_no_gst(self):
        b = _quote(self.tier)
        self.assertIsNone(b["gst_rate"])
        self.assertEqual(b["gst_included"], Decimal("0.00"))
        self.assertEqual(b["total"], Decimal("160.00"))          # 50 + 8*10 + 10 loading

    def test_configured_gst_is_included_and_never_changes_the_fare(self):
        base_total = _quote(self.tier)["total"]
        self.tier.gst_rate = Decimal("18.00"); self.tier.save()
        b = _quote(self.tier)
        self.assertEqual(b["total"], base_total)
        self.assertEqual(b["gst_rate"], "18.00")
        self.assertEqual(b["gst_included"], Decimal("24.41"))    # 160 - 160/1.18

    # ── admin path: Catalog package -> tier ──────────────────────────────
    def test_admin_sets_gst_on_the_package_and_it_reaches_the_tier(self):
        update_package(self.pkg, {"gt_gst_rate": Decimal("18.00")}, self.admin, reason="GST registration")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.gst_rate, Decimal("18.00"))
        self.assertEqual(_quote(self.tier)["gst_rate"], "18.00")

    def test_admin_api_put_sets_gst_and_the_tier_and_quote_follow(self):
        c = APIClient(); c.force_authenticate(self.admin)
        r = c.put(f"/api/settings/catalog/v2/packages/{self.pkg.id}/", {"gt_gst_rate": "18.00", "reason": "GST registered"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(str(r.data["data"]["gt_gst_rate"]), "18.00")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.gst_rate, Decimal("18.00"))
        # out-of-range is refused by the API, tier untouched
        bad = c.put(f"/api/settings/catalog/v2/packages/{self.pkg.id}/", {"gt_gst_rate": "150", "reason": "typo"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.gst_rate, Decimal("18.00"))
        # the rate card exposes it
        rc = c.get("/api/logistics/admin/tiers/")
        self.assertEqual(rc.status_code, 200)
        rows = rc.data.get("results") or rc.data.get("data") or rc.data
        row = next(x for x in (rows if isinstance(rows, list) else rows.get("tiers", [])) if x["id"] == self.tier.id)
        self.assertEqual(str(row["gst_rate"]), "18.00")

    def test_zero_removes_gst_and_blank_leaves_it_unchanged(self):
        update_package(self.pkg, {"gt_gst_rate": Decimal("18.00")}, self.admin, reason="on")
        self.pkg.refresh_from_db()
        update_package(self.pkg, {"gt_gst_rate": None}, self.admin, reason="blank")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.gst_rate, Decimal("18.00"))          # blank = keep
        self.pkg.refresh_from_db()
        update_package(self.pkg, {"gt_gst_rate": Decimal("0.00")}, self.admin, reason="off")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.gst_rate, Decimal("0.00"))
        self.assertIsNone(_quote(self.tier)["gst_rate"])

    def test_changing_gst_needs_modify_price_permission_and_a_reason(self):
        with self.assertRaises(LogisticsPricingPermissionError):
            update_package(self.pkg, {"gt_gst_rate": Decimal("5.00")}, self.finance, reason="x")
        with self.assertRaises(ValidationError):
            update_package(self.pkg, {"gt_gst_rate": Decimal("5.00")}, self.admin, reason="")

    def test_out_of_range_rate_is_rejected(self):
        self.tier.gst_rate = Decimal("101.00")
        with self.assertRaises(ValidationError):
            self.tier.full_clean(exclude=[f.name for f in self.tier._meta.fields if f.name != "gst_rate"])

    # ── invoice ──────────────────────────────────────────────────────────
    def _invoice_texts(self, sr):
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        client = APIClient(); client.force_authenticate(sr.customer)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            r = client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(r.status_code, 200)
        return seen

    def _booking(self, snapshot_extra):
        uid = uuid.uuid4().hex[:8]
        user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                        phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        snap = {"tier_name": "2 Wheeler", "total": "160.00", "base_fare": "50.00", "chargeable_km": "10.00",
                "distance_charge": "100.00", "loading_unloading": "10.00"}
        snap.update(snapshot_extra)
        return ServiceRequest.objects.create(
            customer=user, customer_name="Ravi", phone=user.phone, email=user.email,
            service_category="goods_transport_two_wheeler", issue_title="Delivery", address="Pickup, Hosur",
            preferred_date=timezone.localdate(), total_amount=Decimal("160.00"),
            cart_data=[{"price": 160, "logistics_snapshot": snap}])

    def test_invoice_shows_the_gst_component_from_the_quote_snapshot(self):
        sr = self._booking({"gst_rate": "18.00", "gst_included": "24.41"})
        # the admin later changes the tier -- an existing booking's invoice must not move
        self.tier.gst_rate = Decimal("5.00"); self.tier.save()
        texts = self._invoice_texts(sr)
        self.assertIn("Includes GST (18%):", texts)
        self.assertIn("Rs. 24.41", texts)
        self.assertIn("Rs. 160.00", texts)

    def test_invoice_without_gst_is_unchanged(self):
        texts = self._invoice_texts(self._booking({}))
        self.assertFalse([t for t in texts if "GST" in t])


class GstEndToEndTests(TestCase):
    """Quote endpoint -> booking -> invoice through the real views."""

    def setUp(self):
        from companies.models import Company
        from settings_hub.models import ServiceZone, ServiceZoneService
        company, _ = Company.objects.get_or_create(slug="calservices", defaults={"company_name": "Cal"})
        z = ServiceZone.objects.create(company=company, name="Hosur", center_lat=12.75, center_lng=77.83, radius_meters=8000)
        ServiceZoneService.objects.create(zone=z, service_slug="goods_transport_two_wheeler", is_available=True)
        self.tier = ServiceTier.objects.create(
            category="two_wheeler", city="hosur", slug=f"t-{uuid.uuid4().hex[:6]}", name="Bike", starting_price=Decimal("50"),
            base_fare=Decimal("50"), per_km_rate=Decimal("10"), free_km=Decimal("1"), vehicle_class="two_wheeler",
            max_weight_kg=Decimal("20"), max_cft=Decimal("2"), gst_rate=Decimal("18.00"))
        uid = uuid.uuid4().hex[:8]
        self.user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                             phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def test_quote_book_invoice(self):
        body = {"service_category": "goods_transport_two_wheeler", "tier_id": self.tier.id,
                "pickup_latitude": 12.7409, "pickup_longitude": 77.8253, "drop_latitude": 12.76, "drop_longitude": 77.84}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            q = self.client.post("/api/logistics/quote/", body, format="json")
            self.assertEqual(q.status_code, 200, q.content)
            qd = q.data["data"]
            self.assertEqual(qd["breakdown"]["gst_rate"], "18.00")
            total = qd["total"]
            r = self.client.post("/api/booking/", {
                "customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email,
                "service_category": "goods_transport_two_wheeler", "issue_title": "Delivery", "description": "box",
                "address": "Pickup, Hosur", "latitude": 12.7409, "longitude": 77.8253,
                "drop_address": "Drop, Hosur", "drop_latitude": 12.76, "drop_longitude": 77.84,
                "preferred_date": str(timezone.localdate()), "total_amount": str(total), "payment_method": "COD",
                "logistics_tier": self.tier.id,
                "cart_data": [{"quote_id": qd["quote_id"], "quote_hash": qd["quote_hash"], "price": float(total)}]}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.latest("id")
        self.assertEqual(sr.total_amount, Decimal(str(total)))            # fare unchanged by GST
        snap = sr.cart_data[0]["logistics_snapshot"]
        self.assertEqual(snap["gst_rate"], "18.00")
        self.tier.gst_rate = None; self.tier.save()                       # later admin change
        from reportlab.pdfgen import canvas
        seen = []
        o = canvas.Canvas.drawString
        def d(s_, x, y, t, *a, **k): seen.append(t); return o(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        self.assertIn("Includes GST (18%):", seen)
