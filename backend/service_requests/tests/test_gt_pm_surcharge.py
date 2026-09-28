"""Admin-configured P&M date/time surcharge: matching, pricing, quote verification."""
import uuid
from datetime import date, time
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase

from logistics.models import (
    GoodsCategory, GoodsItem, LogisticsCategory, PackersMoversConfig,
    PackersMoversSurchargeRule as Rule, ServiceTier,
)
from service_requests.services.packers_movers_pricing import (
    compute_packers_movers_quote, verify_packers_movers_quote,
)
from service_requests.services.pm_surcharge import (
    applicable_rules, compute_surcharge, parse_slot_start,
)

ROUTE = {"distance_km": 12.0, "duration_seconds": 1800, "source": "google_maps"}


class MatcherTests(TestCase):
    def test_slot_parsing(self):
        self.assertEqual(parse_slot_start("08:00 AM - 09:00 AM"), time(8, 0))
        self.assertEqual(parse_slot_start("02:30 PM"), time(14, 30))
        self.assertEqual(parse_slot_start("12:00 AM"), time(0, 0))
        self.assertIsNone(parse_slot_start(""))

    def test_no_rules_no_surcharge(self):
        self.assertEqual(applicable_rules("Hosur", "2026-10-31", "08:00 AM"), [])

    def test_weekday_date_and_month_end_wrap(self):
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", percent=10)
        Rule.objects.create(name="Month end", rule_type="DAY_OF_MONTH", day_from=28, day_to=3, percent=5)
        Rule.objects.create(name="Diwali", rule_type="DATE", on_date=date(2026, 11, 8), flat_amount=500)
        names = lambda d: sorted(r.name for r in applicable_rules("Hosur", d, None))
        self.assertEqual(names("2026-10-03"), ["Month end", "Weekend"])      # Sat, day 3
        self.assertEqual(names("2026-10-29"), ["Month end"])                  # Thu
        self.assertEqual(names("2026-10-14"), [])
        self.assertEqual(names("2026-11-08"), ["Diwali", "Weekend"])          # Sunday too

    def test_outside_hours_and_unknown_time(self):
        Rule.objects.create(name="Late", rule_type="OUTSIDE_HOURS", window_start=time(8), window_end=time(20), percent=15)
        self.assertEqual(len(applicable_rules("Hosur", "2026-10-14", "10:00 AM")), 0)
        self.assertEqual(len(applicable_rules("Hosur", "2026-10-14", "10:00 PM")), 1)
        self.assertEqual(len(applicable_rules("Hosur", "2026-10-14", "")), 0)  # never guess

    def test_city_scope_and_inactive(self):
        Rule.objects.create(name="Blr", rule_type="WEEKDAY", weekdays="0,1,2,3,4,5,6", city="Bengaluru", percent=10)
        Rule.objects.create(name="Off", rule_type="WEEKDAY", weekdays="0,1,2,3,4,5,6", percent=10, is_active=False)
        self.assertEqual(applicable_rules("Hosur", "2026-10-14", None), [])
        self.assertEqual(len(applicable_rules("bengaluru", "2026-10-14", None)), 1)

    def test_amount_is_percent_plus_flat(self):
        r = Rule.objects.create(name="X", rule_type="WEEKDAY", weekdays="0", percent=10, flat_amount=100)
        total, lines = compute_surcharge("2000.00", [r])
        self.assertEqual(total, Decimal("300.00"))
        self.assertEqual(lines[0]["amount"], "300.00")


class QuoteTests(TestCase):
    def setUp(self):
        cat = GoodsCategory.objects.create(name="Bedroom", slug="pm-bedroom", is_active=True)
        self.item = GoodsItem.objects.create(category=cat, name="Bed", slug=f"bed-{uuid.uuid4().hex[:4]}",
                                             default_cft=Decimal("50"), default_weight_kg=Decimal("60"), is_active=True)
        PackersMoversConfig.objects.create(city="Hosur", standard_packing_rate_cft=Decimal("7"), premium_packing_rate_cft=Decimal("12"),
                                           premium_fragile_addon=Decimal("200"), floor_rate_no_lift_per_100cft=Decimal("150"),
                                           unpacking_rate_cft=Decimal("4"), gst_rate=Decimal("0.18"), survey_cft_threshold=500.0)
        self.pm = ServiceTier.objects.create(
            category=LogisticsCategory.PACKERS_MOVERS, city="Hosur", slug=f"pm-{uuid.uuid4().hex[:5]}", name="Mini Truck",
            vehicle_class="truck", starting_price=Decimal("1500"), base_fare=Decimal("1200"), per_km_rate=Decimal("25"),
            free_km=Decimal("3"), loading_unloading_charge=Decimal("400"), additional_stop_charge=Decimal("150"),
            minimum_fare=Decimal("1500"), max_weight_kg=Decimal("750"), max_cft=Decimal("150"), order=1)

    def q(self, **kw):
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            return compute_packers_movers_quote(
                pickup_lat=12.734, pickup_lng=77.828, drop_lat=12.85, drop_lng=77.78, city="Hosur",
                inventory=[{"goods_item_id": self.item.id, "quantity": 1}], service_tier_id=self.pm.id, **kw)

    def test_unchanged_without_rules_and_raised_with_rule(self):
        base = self.q(move_date="2026-10-03")
        self.assertEqual(Decimal(str(base.get("date_surcharge", 0))), Decimal("0"))
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", flat_amount=500)
        sat = self.q(move_date="2026-10-03")
        wed = self.q(move_date="2026-10-14")
        self.assertGreater(Decimal(str(sat["total"])), Decimal(str(base["total"])))
        self.assertEqual(Decimal(str(wed["total"])), Decimal(str(base["total"])))
        self.assertEqual(Decimal(str(sat["date_surcharge"])), Decimal("500.00"))

    def test_booking_resolution_carries_surcharge_and_city_for_later_checks(self):
        from service_requests.services.logistics_pricing import resolve_logistics_fare_v2
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", flat_amount=500)
        cart = [{"city": "Hosur", "inventory": [{"goods_item_id": self.item.id, "quantity": 1}], "packing_tier": "standard",
                 "pickup_floor": 0, "pickup_has_lift": True, "drop_floor": 0, "drop_has_lift": True, "relocation_type": "Within City"}]
        with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
            fare, bd = resolve_logistics_fare_v2(
                service_category="packers_movers", logistics_tier=self.pm, logistics_lane=None, submitted_amount=1,
                pickup_lat=12.734, pickup_lng=77.828, drop_lat=12.85, drop_lng=77.78, cart_data=cart,
                move_date="2026-10-03", move_time="08:00 AM - 09:00 AM")
        self.assertEqual(bd["city"], "Hosur")
        self.assertEqual(len(bd["surcharge_applied"]), 1)
        self.assertEqual(Decimal(str(bd["date_surcharge"])), Decimal("500.00"))

    def test_quote_for_other_date_is_rejected_at_booking(self):
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", flat_amount=500)
        wed = self.q(move_date="2026-10-14")
        base_req = {
            "tier_id": self.pm.id, "city": "Hosur", "pickup_lat": 12.734, "pickup_lng": 77.828,
            "drop_lat": 12.85, "drop_lng": 77.78, "extra_stops": 0, "relocation_type": "Within City",
            "inventory": [{"goods_item_id": self.item.id, "quantity": 1}], "packing_tier": "standard",
            "dismantling_required": True, "unpacking_required": False, "pickup_floor": 0, "drop_floor": 0,
            "pickup_has_lift": True, "drop_has_lift": True,
        }
        ok, _b, err = verify_packers_movers_quote(wed["quote_id"], wed["total"], {**base_req, "move_date": "2026-10-14"})
        self.assertTrue(ok, err)                                 # same date still verifies
        ok, _b, err = verify_packers_movers_quote(wed["quote_id"], wed["total"], {**base_req, "move_date": "2026-10-03"})
        self.assertFalse(ok)                                     # moved to a Saturday: stale quote
        self.assertIn("surcharge", err.lower())


class RescheduleRepricingGuardTests(TestCase):
    def _booking(self, surcharge_applied):
        from django.contrib.auth import get_user_model
        u = get_user_model().objects.create_user(username=f"r_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com",
                                                 password="pw12345678", phone=f"96{uuid.uuid4().int % 100000000:08d}", role="customer")
        from django.utils import timezone
        from service_requests.models import ServiceRequest
        return u, ServiceRequest.objects.create(
            customer=u, customer_name="Ravi", phone=u.phone, email=u.email, service_category="packers_movers",
            issue_title="m", address="a", preferred_date=timezone.localdate() + timezone.timedelta(days=10), preferred_time="08:00 AM - 09:00 AM",
            total_amount=Decimal("5000"), status="confirmed", fare_breakdown={"surcharge_applied": surcharge_applied, "city": "Hosur"})

    def test_customer_cannot_move_onto_a_differently_priced_date(self):
        from django.core.exceptions import ValidationError as DjVE
        from rest_framework.exceptions import ValidationError
        import service_requests.services as svc
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", flat_amount=500)
        u, sr = self._booking([])                                       # booked on a normal day
        with self.assertRaises(ValidationError) as cm:
            svc.create_reschedule_request(sr, u, "CUSTOMER", "2026-10-03", "09-10", "schedule_conflict")   # a Saturday
        self.assertIn("priced differently", str(cm.exception))
        rr = svc.create_reschedule_request(sr, u, "CUSTOMER", "2026-10-14", "09-10", "schedule_conflict")  # a Wednesday
        self.assertIsNotNone(rr.pk)

    def test_admin_reschedule_onto_pricier_date_keeps_price_and_records_the_decision(self):
        from unittest.mock import patch
        import service_requests.services as svc
        from service_requests.models import RescheduleRequest
        Rule.objects.create(name="Weekend", rule_type="WEEKDAY", weekdays="5,6", flat_amount=500)
        u, sr = self._booking([])
        rr = svc.create_reschedule_request(sr, u, "ADMIN", "2026-10-03", "09-10", "schedule_conflict")     # a Saturday
        rr = RescheduleRequest.objects.get(pk=rr.pk)
        with patch.object(svc.WorkforceIntegrationService, "reschedule_workforce_job"):
            svc.admin_approve_reschedule(u, rr.pk, "support approved")
        sr.refresh_from_db()
        lock = sr.fare_breakdown["reschedule_price_lock"]
        self.assertTrue(lock["price_kept"])
        self.assertEqual(lock["surcharge_priced"], [])
        self.assertTrue(lock["surcharge_at_new_slot"])
        self.assertEqual(sr.total_amount, Decimal("5000"))
