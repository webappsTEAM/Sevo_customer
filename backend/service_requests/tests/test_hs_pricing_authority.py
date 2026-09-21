"""
service_requests/tests/test_hs_pricing_authority.py

Regression test suite for HS-B-01: Home Services Cart Pricing Authority.
Asserts that:
1. Browser-provided prices in cart_data or total_amount are never trusted.
2. Server recomputes authoritative package prices, add-on prices, GST (18%), and platform fee.
3. Consultation pricing correctly enforces Hosur geofencing (<=15km: Rs. 0, >15km: Rs. 300).
4. Coupon discounts are computed authoritatively without double-discounting.
5. BookingCreateView enforces authoritative totals and saves sanitized cart line items.
6. Name-based package lookup fallback works for backward compatibility with legacy clients.
"""

from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from service_requests.models import (
    CatalogCategory,
    Service,
    Package,
    AddOn,
    PackageStatus,
    Coupon,
    ServiceRequest,
)
from service_requests.services.home_services_pricing import (
    resolve_home_services_fare,
    haversine_km,
)


def _ensure_test_fixtures():
    cat, _ = CatalogCategory.objects.get_or_create(slug="cleaning", defaults={"name": "Home Cleaning"})
    service, _ = Service.objects.get_or_create(slug="deep-cleaning", defaults={"category": cat, "name": "Deep Cleaning"})
    pkg, _ = Package.objects.get_or_create(
        slug="hs-test-cleaning-pkg",
        defaults={
            "service": service,
            "name": "Full House Deep Cleaning",
            "base_price": Decimal("800.00"),
            "offer_price": Decimal("699.00"),
            "status": PackageStatus.ACTIVE,
            "gst_rate": Decimal("18.00"),
        },
    )
    addon, _ = AddOn.objects.get_or_create(
        package=pkg,
        name="Balcony Steam Sanitize",
        defaults={"price": Decimal("150.00"), "is_active": True},
    )
    coupon, _ = Coupon.objects.get_or_create(
        code="SEVOTEST50",
        defaults={
            "name": "Test 50 Off",
            "discount_type": "flat",
            "discount_value": Decimal("50.00"),
            "status": "Active",
        },
    )
    return pkg, addon, coupon


class HomeServicesPricingAuthorityUnitTests(TestCase):
    def setUp(self):
        self.pkg, self.addon, self.coupon = _ensure_test_fixtures()

    def test_tampered_package_price_is_overridden_with_authoritative_catalog_price(self):
        """Client submits price=10 for active package; server must compute authoritative catalog price + GST + platform fee."""
        expected_unit_price = self.pkg.offer_price if (self.pkg.offer_price is not None and self.pkg.offer_price > 0) else self.pkg.base_price
        expected_gst = (expected_unit_price * Decimal("0.18")).quantize(Decimal("1.00"))
        expected_platform_fee = Decimal("29.00")
        expected_total = expected_unit_price + expected_gst + expected_platform_fee

        tampered_cart = [
            {
                "id": f"pkg-{self.pkg.id}",
                "package_id": self.pkg.id,
                "name": self.pkg.name,
                "price": 10.00,  # Maliciously low price
                "quantity": 1,
            }
        ]
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=tampered_cart,
            service_category="cleaning",
            pickup_lat=12.7409,
            pickup_lng=77.8253,
            submitted_total=11.80,
        )
        self.assertEqual(grand_total, expected_total)
        self.assertEqual(sanitized[0]["price"], float(expected_unit_price))
        self.assertEqual(sanitized[0]["package_id"], self.pkg.id)
        self.assertEqual(breakdown["item_total"], float(expected_unit_price))
        self.assertEqual(breakdown["platform_fee"], float(expected_platform_fee))

    def test_addon_price_is_recomputed_from_database(self):
        """Client submits price=1 for addon; server must compute addon.price from DB + 18% GST."""
        if not self.addon:
            self.skipTest("No active addon in DB")

        addon_cart = [
            {
                "id": f"addon-{self.addon.id}",
                "addon_id": self.addon.id,
                "name": self.addon.name,
                "price": 1.00,
                "quantity": 2,
            }
        ]
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=addon_cart,
            service_category="hvac",
            pickup_lat=12.7409,
            pickup_lng=77.8253,
            submitted_total=2.00,
        )
        expected_item_total = self.addon.price * 2
        expected_gst = (expected_item_total * Decimal("0.18")).quantize(Decimal("1.00"))
        expected_total = expected_item_total + expected_gst
        self.assertEqual(grand_total, expected_total)
        self.assertEqual(sanitized[0]["price"], float(self.addon.price))

    def test_consultation_geofencing_within_15km_is_free(self):
        """Site consultation within 15km of Hosur center (12.7409, 77.8253) is Rs. 0.00."""
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=[],
            service_category="painting",
            pickup_lat=12.7409,
            pickup_lng=77.8253,
        )
        self.assertEqual(grand_total, Decimal("0.00"))
        self.assertEqual(breakdown["item_total"], 0.0)
        self.assertTrue(breakdown["is_consultation"])

    def test_consultation_geofencing_beyond_15km_charges_300(self):
        """Site consultation > 15km from Hosur center (e.g. Bangalore 12.9716, 77.5946) is Rs. 300.00."""
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=[],
            service_category="painting",
            pickup_lat=12.9716,
            pickup_lng=77.5946,
        )
        self.assertEqual(grand_total, Decimal("300.00"))
        self.assertEqual(breakdown["item_total"], 300.0)
        self.assertTrue(breakdown["distance_km"] > 15.0)

    def test_coupon_discount_applied_authoritatively(self):
        """Active coupon reduces grand total accurately based on authoritative subtotal."""
        if not self.coupon:
            self.skipTest("No active coupon in DB")

        cart = [
            {
                "id": f"pkg-{self.pkg.id}",
                "package_id": self.pkg.id,
                "name": self.pkg.name,
                "price": float(self.pkg.base_price),
                "quantity": 2,
            }
        ]
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=cart,
            service_category="cleaning",
            pickup_lat=12.7409,
            pickup_lng=77.8253,
            coupon_code=self.coupon.code,
        )
        self.assertGreater(breakdown["discount_amount"], 0.0)
        self.assertLess(grand_total, Decimal(str(breakdown["item_total"] + breakdown["gst_amount"] + breakdown["platform_fee"])))

    def test_backward_compatible_lookup_by_package_name(self):
        """Legacy cart items without package_id resolve by exact package name."""
        legacy_cart = [
            {
                "name": self.pkg.name,
                "price": 50.0,
                "quantity": 1,
            }
        ]
        grand_total, sanitized, breakdown = resolve_home_services_fare(
            cart_data=legacy_cart,
            service_category="cleaning",
            pickup_lat=12.7409,
            pickup_lng=77.8253,
        )
        expected_unit_price = self.pkg.offer_price if (self.pkg.offer_price is not None and self.pkg.offer_price > 0) else self.pkg.base_price
        self.assertEqual(sanitized[0]["package_id"], self.pkg.id)
        self.assertEqual(sanitized[0]["price"], float(expected_unit_price))


class BookingCreateViewHomeServicesPricingIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.pkg, self.addon, self.coupon = _ensure_test_fixtures()

    def test_booking_create_view_enforces_authoritative_package_total(self):
        """When client submits tampered total_amount=10.00, server stores authoritative total amount."""
        expected_unit_price = self.pkg.offer_price if (self.pkg.offer_price is not None and self.pkg.offer_price > 0) else self.pkg.base_price
        expected_gst = (expected_unit_price * Decimal("0.18")).quantize(Decimal("1.00"))
        expected_platform_fee = Decimal("29.00")
        expected_total = expected_unit_price + expected_gst + expected_platform_fee

        payload = {
            "customer_name": "Ramesh Kumar",
            "phone": "9876543210",
            "service_category": "cleaning",
            "issue_title": "Home Cleaning Service",
            "description": "Standard cleaning request",
            "address": "123 Gandhi Road, Hosur",
            "latitude": 12.754598,
            "longitude": 77.834477,
            "preferred_date": "2026-10-01",
            "preferred_time": "10:00 AM",
            "payment_method": "COD",
            "total_amount": 10.00,  # Tampered total
            "cart_data": [
                {
                    "id": f"pkg-{self.pkg.id}",
                    "package_id": self.pkg.id,
                    "name": self.pkg.name,
                    "price": 10.00,  # Tampered line item
                    "quantity": 1,
                }
            ],
        }
        res = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        booking_data = res.data.get("data") if (isinstance(res.data, dict) and "data" in res.data) else res.data
        sr = ServiceRequest.objects.get(request_id=booking_data["request_id"])

        self.assertEqual(sr.total_amount, expected_total)

        # Verify saved cart_data has authoritative price
        import json
        saved_cart = sr.cart_data
        if isinstance(saved_cart, str):
            saved_cart = json.loads(saved_cart)
        self.assertEqual(saved_cart[0]["price"], float(expected_unit_price))
        self.assertEqual(saved_cart[0]["package_id"], self.pkg.id)

        # Clean up created booking
        sr.delete()
