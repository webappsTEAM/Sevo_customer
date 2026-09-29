"""GT invoice: itemised from the locked quote snapshot, with the route, and no
hidden header lines / missing rupee glyph."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import ServiceRequest, TripStop

User = get_user_model()


class GTInvoiceTests(TestCase):
    def setUp(self):
        uid = uuid.uuid4().hex[:8]
        self.user = User.objects.create_user(
            username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
            phone=f"98{uuid.uuid4().int % 100000000:08d}", role=getattr(User.Role, "CUSTOMER", "customer"))
        self.sr = ServiceRequest.objects.create(
            customer=self.user, customer_name="Ravi", phone=self.user.phone, email=self.user.email,
            service_category="goods_transport_two_wheeler", issue_title="Two-wheeler delivery",
            address="Pickup, Hosur", preferred_date=timezone.localdate(), total_amount=Decimal("132.20"),
            cart_data=[{"tier": "2 Wheeler", "price": 132.2, "logistics_snapshot": {
                "tier_name": "2 Wheeler", "total": "132.20", "base_fare": "50.00", "chargeable_km": "5.72",
                "distance_charge": "57.20", "additional_stops": 1, "additional_stop_charge": "15.00",
                "loading_unloading": "10.00", "special_handling_charge": "0.00"}}])
        for i, (t, a) in enumerate([("PICKUP", "Pickup, Hosur"), ("WAYPOINT", "Mid, Hosur"), ("DROP", "Drop, Hosur")], 1):
            TripStop.objects.create(booking=self.sr, sequence=i, stop_type=t, address=a, latitude=12.7, longitude=77.8)
        self.client = APIClient(); self.client.force_authenticate(self.user)

    def _drawn(self):
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(self_, x, y, t, *a, **k): seen.append((y, t)); return o1(self_, x, y, t, *a, **k)
        def d2(self_, x, y, t, *a, **k): seen.append((y, t)); return o2(self_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            r = self.client.get(f"/api/booking/{self.sr.id}/invoice/")
        self.assertEqual(r.status_code, 200)
        return [t for _, t in seen], seen

    def test_lines_are_itemised_from_the_snapshot_and_sum_to_total(self):
        texts, _ = self._drawn()
        for expect in ("Base fare - 2 Wheeler", "Distance charge (5.72 km)", "Additional stops (1)",
                       "Loading / unloading", "Rs. 50.00", "Rs. 57.20", "Rs. 15.00", "Rs. 10.00", "Rs. 132.20"):
            self.assertIn(expect, texts)
        self.assertNotIn("Special handling", texts)
        self.assertFalse(any("₹" in t for t in texts))          # Helvetica has no rupee glyph
        self.assertIn("Pickup: Pickup, Hosur", texts)
        self.assertIn("Stop 1: Mid, Hosur", texts)
        self.assertIn("Drop: Drop, Hosur", texts)

    def test_meta_lines_sit_above_the_billed_to_panel(self):
        _, seen = self._drawn()
        ys = {t: y for y, t in seen}
        # panel top = (BILLED TO baseline - 48) + 60; the lowest meta line must sit above it
        self.assertGreater(ys["Date:"], ys["BILLED TO"] + 12)
