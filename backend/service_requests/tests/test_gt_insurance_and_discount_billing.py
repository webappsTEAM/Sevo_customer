"""Transit insurance is billed (prepaid only) and a coupon/premium survive fare reconciliation."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from service_requests.models import Coupon, FareReconciliation, ServiceRequest
from service_requests.tests.test_gt_end_to_end import DROP, PICKUP, GoodsTransportEndToEndTests as _E, _route


@override_settings(INSURANCE_RATE="0.02", INSURANCE_MAX_LIABILITY="500000",
                   PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class InsuranceBillingTests(TestCase):
    setUp = _E.setUp
    _webhook = _E._webhook

    def _book(self, **over):
        body = {
            "customer_name": "E2E Customer", "phone": self.customer.phone, "email": self.customer.email,
            "service_category": "goods_transport_truck", "issue_title": "Mini truck", "description": "sofa and boxes",
            "address": "Pickup Point, Hosur", "latitude": PICKUP["lat"], "longitude": PICKUP["lng"],
            "drop_address": "Drop Point, Bengaluru", "drop_latitude": DROP["lat"], "drop_longitude": DROP["lng"],
            "preferred_date": str(timezone.localdate()), "total_amount": "1.00",
            "payment_method": "ONLINE", "logistics_tier": self.tier.id,
        }
        body.update(over)
        self.client.force_authenticate(user=self.customer)
        with patch("service_requests.services.routing.get_route_eta", return_value=_route()):
            return self.client.post("/api/booking/", body, format="json")

    def test_terms_preview_matches_what_is_billed(self):
        r = APIClient().get("/api/logistics/insurance-terms/?declared_value=10000")
        self.assertEqual(r.status_code, 200)
        self.assertEqual((r.data["data"]["premium"], r.data["data"]["liability_cap"]), ("200.00", "10000.00"))
        self.assertEqual(APIClient().get("/api/logistics/insurance-terms/?declared_value=abc").status_code, 400)

        b = self._book(insurance_opted_in=True, declared_value="10000")
        self.assertIn(b.status_code, (200, 201), b.content)
        sr = ServiceRequest.objects.get(pk=b.data["data"]["id"])
        self.assertEqual(sr.insurance_premium, Decimal("200.00"))
        self.assertEqual(sr.total_amount, Decimal("730.00"))             # 530 fare + 200 premium

    def test_insurance_is_refused_for_cash_bookings(self):
        b = self._book(insurance_opted_in=True, declared_value="10000", payment_method="COD")
        self.assertEqual(b.status_code, 400, b.content)
        self.assertFalse(ServiceRequest.objects.exists())

    def test_reconciliation_keeps_coupon_and_premium(self):
        Coupon.objects.create(code="FLAT50", name="t", discount_type="flat", discount_value=Decimal("50"), status="Active")
        b = self._book(insurance_opted_in=True, declared_value="10000", coupon_code="FLAT50")
        self.assertIn(b.status_code, (200, 201), b.content)
        self.booking = ServiceRequest.objects.get(pk=b.data["data"]["id"])
        self.assertEqual(self.booking.total_amount, Decimal("680.00"))    # 530 - 50 + 200
        self.booking.status = ServiceRequest.Status.ACCEPTED
        self.booking.save(update_fields=["status"])
        self._webhook("service_completed", {"actual_distance_km": "15.00"})   # +3 km x 18 = +54
        self.booking.refresh_from_db()
        recon = FareReconciliation.objects.get(booking=self.booking)
        self.assertEqual(recon.final_amount, Decimal("584.00"))
        self.assertEqual(self.booking.total_amount, Decimal("734.00"))    # 584 - 50 + 200: neither dropped
        self.assertEqual(self.booking.discount_amount, Decimal("50.00"))

    def test_invoice_itemises_coupon_and_insurance(self):
        from service_requests import payment_views as pv
        Coupon.objects.create(code="FLAT50", name="t", discount_type="flat", discount_value=Decimal("50"), status="Active")
        b = self._book(insurance_opted_in=True, declared_value="10000", coupon_code="FLAT50")
        sr = ServiceRequest.objects.get(pk=b.data["data"]["id"])
        sr.cart_data = [{"logistics_snapshot": sr.fare_breakdown}]      # what a quoted booking carries
        sr.save(update_fields=["cart_data"])
        texts = []
        real = pv._draw_text
        with patch.object(pv, "_draw_text", side_effect=lambda c, x, y, t, *a, **k: (texts.append(str(t)), real(c, x, y, t, *a, **k))[1]):
            r = self.client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertIn(r.status_code, (200, 201), r.content[:200])
        joined = " | ".join(texts)
        self.assertIn("Coupon discount", joined)
        self.assertIn("Transit insurance", joined)


class InsurancePolicyOverrideTests(TestCase):
    def test_admin_policy_overrides_settings_and_can_switch_off(self):
        from service_requests.models import GTInsurancePolicy
        from service_requests.services.insurance import insurance_terms
        with override_settings(INSURANCE_RATE="0.02", INSURANCE_MAX_LIABILITY="500000"):
            self.assertEqual(insurance_terms("10000"), (Decimal("200.00"), Decimal("10000.00")))
            p = GTInsurancePolicy.objects.create(premium_percent=Decimal("1"), max_liability=Decimal("8000"))
            self.assertEqual(insurance_terms("10000"), (Decimal("100.00"), Decimal("8000.00")))
            p.is_offered = False; p.save()
            self.assertEqual(insurance_terms("10000"), (None, None))
            p.is_active = False; p.save()                     # deactivated -> settings apply again
            self.assertEqual(insurance_terms("10000")[0], Decimal("200.00"))


@override_settings(PAYMENT_SANDBOX_MODE=True, RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
class InsuranceSwitchedOffBookingTests(TestCase):
    setUp = _E.setUp
    _book = InsuranceBillingTests._book

    def test_booking_with_insurance_refused_when_admin_stops_offering_it(self):
        from service_requests.models import GTInsurancePolicy
        GTInsurancePolicy.objects.create(is_offered=False)
        b = self._book(insurance_opted_in=True, declared_value="10000")
        self.assertEqual(b.status_code, 400, b.content)
        self.assertFalse(ServiceRequest.objects.exists())

    def test_terms_endpoint_reports_not_offered(self):
        from service_requests.models import GTInsurancePolicy
        GTInsurancePolicy.objects.create(is_offered=False)
        r = APIClient().get("/api/logistics/insurance-terms/?declared_value=10000")
        self.assertEqual((r.status_code, r.data["data"]), (200, {"offered": False}))
