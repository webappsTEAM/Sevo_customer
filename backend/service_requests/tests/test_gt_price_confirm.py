"""GT_PRICE_CONFIRM: never charge a GT customer a fare other than the one they were shown when the booking is not bound to a live quote."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import LogisticsCategory, ServiceTier

User = get_user_model()


@override_settings(SECURE_SSL_REDIRECT=False)
class GTPriceConfirmTests(TestCase):
    def setUp(self):
        cache.clear()
        uid = uuid.uuid4().hex[:8]
        self.user = User.objects.create_user(username=f"pc_{uid}", email=f"pc_{uid}@example.com", password="x", role="customer", phone="9876500123")
        self.client = APIClient(); self.client.force_authenticate(user=self.user)
        self.tier = ServiceTier.objects.create(category=LogisticsCategory.TRUCK, city="hosur", slug=f"pc-{uid}", name="PC Truck",
            vehicle_class=ServiceTier.VehicleClass.TRUCK, starting_price=Decimal("450"), base_fare=Decimal("300"), per_km_rate=Decimal("22"),
            free_km=Decimal("2"), minimum_fare=Decimal("350"), max_weight_kg=Decimal("750"), max_cft=Decimal("150"), is_active=True)

    def _post(self, submitted, server_fare, quote_id=None):
        payload = {
            "customer_name": "Ravi Kumar", "phone": "9876500123", "email": "pc@example.com", "service_category": "goods_transport_truck", "issue_title": "t", "description": "Moving standard office stationery boxes and monitors, approx 150kg total weight",
            "logistics_tier": self.tier.id, "latitude": 12.7409, "longitude": 77.8253, "address": "Pickup, Hosur",
            "drop_latitude": 12.7546, "drop_longitude": 77.8345, "drop_address": "Drop, Hosur",
            "preferred_date": str((timezone.now() + timezone.timedelta(days=2)).date()), "preferred_time": "11:00 AM",
            "total_amount": str(submitted), "payment_method": "COD",
            "cart_data": [{"tier": "T", "price": str(submitted), "quote_id": quote_id}],
        }
        with patch("settings_hub.service_zone_engine.check_booking_eligibility") as z:
            z.return_value.allowed = True; z.return_value.zone_id = 1; z.return_value.zone_name = "Hosur"
            with patch("service_requests.views.resolve_logistics_fare_v2") as f:
                f.return_value = (Decimal(str(server_fare)), {"total": Decimal(str(server_fare)), "distance_km": 3})
                return self.client.post("/api/booking/", data=payload, format="json")

    def test_evicted_quote_with_different_total_asks_to_reconfirm(self):
        r = self._post(submitted="190.00", server_fare="380.00", quote_id="gtq_evicted0000000")
        self.assertEqual(r.status_code, 409, getattr(r, "data", None))
        self.assertEqual(r.data.get("code"), "PRICE_CHANGED")
        self.assertEqual(r.data.get("server_total"), "380.00")

    def test_client_without_any_quote_keeps_legacy_server_pricing(self):
        # existing contract (test_gt_b01_fare_engine): a quote-less client is charged the server fare
        r = self._post(submitted="190.00", server_fare="380.00")
        self.assertNotEqual(r.data.get("code"), "PRICE_CHANGED", getattr(r, "data", None))

    def test_fake_quote_id_with_different_total_asks_to_reconfirm(self):
        r = self._post(submitted="1.00", server_fare="190.00", quote_id="gtq_0000000000000000")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data.get("code"), "PRICE_CHANGED")

    def test_matching_total_is_not_blocked(self):
        r = self._post(submitted="190.00", server_fare="190.00")
        self.assertEqual(r.status_code, 201, getattr(r, "data", None))

    def test_sub_rupee_difference_is_tolerated(self):
        r = self._post(submitted="190.00", server_fare="190.40")
        self.assertNotEqual(r.data.get("code"), "PRICE_CHANGED", getattr(r, "data", None))

    def test_live_cached_quote_is_left_to_the_quote_verifier(self):
        cache.set("gt_quote_gtq_live", {"total": "190.00"}, 60)
        r = self._post(submitted="190.00", server_fare="380.00", quote_id="gtq_live")
        self.assertNotEqual(r.data.get("code"), "PRICE_CHANGED")
