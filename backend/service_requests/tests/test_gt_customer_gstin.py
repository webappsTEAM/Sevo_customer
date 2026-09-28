"""Optional customer GSTIN: format-validated, stored on the booking, printed on the invoice."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework import serializers
from rest_framework.test import APIClient

from service_requests.gstin import normalize_gstin
from service_requests.models import ServiceRequest

GOOD = "33AAGCC4916J1ZP"


class GstinFormatTests(SimpleTestCase):
    def test_valid_normalised_and_blank(self):
        self.assertEqual(normalize_gstin(" 33aagcc4916j1zp "), GOOD)
        self.assertEqual(normalize_gstin(""), "")
        self.assertEqual(normalize_gstin(None), "")

    def test_invalid_rejected(self):
        for bad in ("123", "33AAGCC4916J1XP", "00AAGCC4916J1ZP", "39AAGCC4916J1ZP", "33AAGCC49161JZP", GOOD + "1"):
            with self.assertRaises(serializers.ValidationError, msg=bad):
                normalize_gstin(bad)


class GstinInvoiceTests(TestCase):
    def test_invoice_prints_gstin_only_when_present(self):
        u = get_user_model().objects.create_user(
            username=f"g_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com", password="pw12345678",
            phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        sr = ServiceRequest.objects.create(
            customer=u, customer_name="Ravi", phone=u.phone, email=u.email,
            service_category="goods_transport_two_wheeler", issue_title="d", address="Hosur",
            preferred_date=timezone.localdate(), total_amount=Decimal("100.00"), customer_gstin=GOOD)
        client = APIClient(); client.force_authenticate(u)
        from reportlab.pdfgen import canvas
        seen = []
        orig = canvas.Canvas.drawRightString
        def spy(self_, x, y, t, *a, **k): seen.append(t); return orig(self_, x, y, t, *a, **k)
        with patch.object(canvas.Canvas, "drawRightString", spy):
            self.assertEqual(client.get(f"/api/booking/{sr.id}/invoice/").status_code, 200)
            self.assertIn(f"Customer GSTIN: {GOOD}", seen)
            seen.clear()
            ServiceRequest.objects.filter(pk=sr.pk).update(customer_gstin="")
            client.get(f"/api/booking/{sr.id}/invoice/")
            self.assertFalse(any("GSTIN" in t for t in seen))


class GstinBookingSerializerTests(SimpleTestCase):
    def test_create_serializer_exposes_and_validates_field(self):
        from service_requests import serializers as s
        cls = next(c for n, c in vars(s).items() if n.endswith("CreateSerializer") and "customer_gstin" in getattr(getattr(c, "Meta", None), "fields", ()))
        ser = cls()
        self.assertEqual(ser.validate_customer_gstin("33aagcc4916j1zp"), GOOD)
        with self.assertRaises(serializers.ValidationError):
            ser.validate_customer_gstin("bad")
