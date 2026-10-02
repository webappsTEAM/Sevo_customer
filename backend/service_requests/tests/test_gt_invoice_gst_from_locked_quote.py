"""Regression (E2E QA 2026-10-01): a Spot GT booking whose cart_data carried no logistics_snapshot (straight API
client) produced an opaque one-line invoice with no GST, although the booking's locked quote recorded 18% GST
(inclusive). The invoice must itemise from the locked quote and show the GST component, and a later Admin GST
change must not alter an existing booking's invoice."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from logistics.models import LogisticsCategory, ServiceTier
from service_requests.models import ServiceRequest

User = get_user_model()
ROUTE = {"distance_km": 1.82, "duration_minutes": 5, "distance_source": "straight_line_estimate", "is_authoritative": False}


class InvoiceGstFromLockedQuoteTests(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:6]
        self.tier = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="hosur", slug=f"t-{uid}", name="3 Wheeler Test",
            vehicle_class=ServiceTier.VehicleClass.THREE_WHEELER, starting_price=Decimal("190"), base_fare=Decimal("150"),
            per_km_rate=Decimal("18"), free_km=Decimal("2"), loading_unloading_charge=Decimal("40"),
            additional_stop_charge=Decimal("30"), minimum_fare=Decimal("150"), max_weight_kg=Decimal("500"),
            max_cft=Decimal("88"), gst_rate=Decimal("18.00"), is_active=True)
        self.user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                             phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def test_invoice_itemises_and_shows_gst_without_cart_snapshot(self):
        pts = {"pickup_latitude": 12.7409, "pickup_longitude": 77.8253, "drop_latitude": 12.754598, "drop_longitude": 77.834477}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            q = self.client.post("/api/logistics/quote/", {"service_category": "goods_transport_truck",
                                                           "tier_id": self.tier.id, "stop_count": 2, **pts}, format="json")
            self.assertEqual(q.status_code, 200, q.content)
            qd = q.data["data"]
            r = self.client.post("/api/booking/", {
                "customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email, "city": "hosur",
                "service_category": "goods_transport_truck", "issue_title": "GT", "description": "d",
                "address": "A", "drop_address": "B", "latitude": 12.7409, "longitude": 77.8253,
                "drop_latitude": 12.754598, "drop_longitude": 77.834477, "preferred_date": "2099-01-02",
                "preferred_time": "Morning", "payment_method": "COD", "logistics_tier": self.tier.id,
                "total_amount": qd["total"], "quote_id": qd["quote_id"], "quote_hash": qd["quote_hash"],
            }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.latest("id")
        self.assertEqual(sr.fare_breakdown["gst_rate"], "18.00")
        self.assertEqual(sr.fare_breakdown["gst_included"], "28.98")  # 190 - 190/1.18

        ServiceTier.objects.filter(pk=self.tier.pk).update(gst_rate=Decimal("5.00"))  # later Admin change

        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        for expect in ("Base fare - 3 Wheeler Test", "Rs. 150.00", "Loading / unloading", "Rs. 40.00",
                       "Includes GST (18%):", "Rs. 28.98", "Rs. 190.00"):
            self.assertIn(expect, seen)
        self.assertFalse(any("(5%)" in str(t) for t in seen))


class InvoiceShowsWaitingChargeTests(InvoiceGstFromLockedQuoteTests):
    """Delivery-time reconciliation (waiting time) must appear under its own label, not as 'Surge / minimum fare'."""

    def test_waiting_charge_has_its_own_invoice_line(self):
        pts = {"pickup_latitude": 12.7409, "pickup_longitude": 77.8253, "drop_latitude": 12.754598, "drop_longitude": 77.834477}
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            qd = self.client.post("/api/logistics/quote/", {"service_category": "goods_transport_truck",
                                  "tier_id": self.tier.id, "stop_count": 2, **pts}, format="json").data["data"]
            r = self.client.post("/api/booking/", {
                "customer_name": "Ravi Kumar", "phone": self.user.phone, "email": self.user.email, "city": "hosur",
                "service_category": "goods_transport_truck", "issue_title": "GT", "description": "d",
                "address": "A", "drop_address": "B", "latitude": 12.7409, "longitude": 77.8253,
                "drop_latitude": 12.754598, "drop_longitude": 77.834477, "preferred_date": "2099-01-02",
                "preferred_time": "Morning", "payment_method": "COD", "logistics_tier": self.tier.id,
                "total_amount": qd["total"], "quote_id": qd["quote_id"], "quote_hash": qd["quote_hash"],
            }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        sr = ServiceRequest.objects.latest("id")
        from service_requests.models import FareReconciliation
        FareReconciliation.objects.create(
            booking=sr, estimated_amount=Decimal("190.00"), final_amount=Decimal("222.00"), delta=Decimal("32.00"),
            adjustments=[{"code": "WAITING_CHARGE", "label": "Waiting time charge", "amount": "32.00", "source": "gt_waiting_charge_policy"}])
        ServiceRequest.objects.filter(pk=sr.pk).update(total_amount=Decimal("222.00"))

        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            inv = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(inv.status_code, 200)
        self.assertIn("Waiting time charge", seen)
        self.assertIn("Rs. 32.00", seen)
        self.assertFalse(any("Surge / minimum" in str(t) for t in seen))
