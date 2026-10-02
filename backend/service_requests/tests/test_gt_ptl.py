"""
Light PTL (Part Truck Load): advance-booked, admin-slot-based, per-kg goods transport on
ptl_eligible 4W+ tiers, flowing through the ordinary goods_transport_truck booking pipeline.
"""
import uuid
from importlib import import_module
from service_requests.booking_window import next_bookable_date
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import Lane, LogisticsCategory, LogisticsSlot, ServiceTier
from service_requests.models import GTPTLPricingPolicy, ServiceRequest
from service_requests.services.logistics_pricing import quote_logistics_fare, resolve_logistics_fare_v2
from service_requests.services.ptl_pricing import (
    PTLError, apply_ptl_revision, compute_ptl_quote, preview_ptl_revision, validate_ptl_slot,
)

User = get_user_model()
TRUCK = "goods_transport_truck"
PICKUP = (Decimal("12.740900"), Decimal("77.825300"))
DROP = (Decimal("12.935200"), Decimal("77.624500"))
SLOT = "09:00 AM - 10:00 AM"
ROUTE = "service_requests.services.routing.get_route_eta"
COVER = "service_requests.services._assert_route_stops_in_coverage"


def _user(role="customer"):
    n = uuid.uuid4().hex[:8]
    return User.objects.create_user(
        username=f"ptl_{n}", email=f"ptl_{n}@e.com", password="pw12345678",
        phone=f"97{uuid.uuid4().int % 100000000:08d}", role=role)


def _tier(vehicle_class="truck", ptl=True, max_kg="750", **kw):
    d = dict(category=LogisticsCategory.TRUCK, city="hosur", slug=f"t-{uuid.uuid4().hex[:8]}",
             name=f"Tier {vehicle_class}", starting_price=Decimal("400"), base_fare=Decimal("250"),
             per_km_rate=Decimal("18"), free_km=Decimal("2"), loading_unloading_charge=Decimal("100"),
             vehicle_class=vehicle_class, max_weight_kg=Decimal(max_kg), max_cft=Decimal("200"),
             ptl_eligible=ptl)
    d.update(kw)
    return ServiceTier.objects.create(**d)


def _policy(**kw):
    d = dict(is_enabled=True, rate_per_kg=Decimal("4.00"), minimum_chargeable_weight_kg=Decimal("0"),
             min_advance_days=1)
    d.update(kw)
    return GTPTLPricingPolicy.objects.create(**d)


def _quote(tier, weight="300", **kw):
    return compute_ptl_quote(tier=tier, declared_weight_kg=weight, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                             drop_lat=DROP[0], drop_lng=DROP[1], **kw)


def _tomorrow():
    return timezone.localdate() + timedelta(days=1)


class PTLEligibilityAndPricingTests(TestCase):
    def setUp(self):
        self.policy = _policy()
        self.tier = _tier()

    def test_two_and_three_wheelers_refused_even_if_flagged(self):
        for vc in ("two_wheeler", "three_wheeler"):
            with self.assertRaises(PTLError) as cm:
                _quote(_tier(vehicle_class=vc, max_kg="500"), weight="10")
            self.assertEqual(cm.exception.code, "PTL_TIER_NOT_ELIGIBLE")

    def test_truck_not_opted_in_is_refused(self):
        with self.assertRaises(PTLError) as cm:
            _quote(_tier(ptl=False))
        self.assertEqual(cm.exception.code, "PTL_TIER_NOT_ELIGIBLE")

    def test_per_kg_price_uses_admin_rate(self):
        q = _quote(self.tier, "300")
        self.assertEqual(q["total"], Decimal("1200.00"))            # 300 kg x Rs.4
        self.assertEqual(q["freight_charge"], Decimal("1200.00"))
        self.assertEqual(q["pricing_basis"], "ptl_per_kg")
        self.policy.rate_per_kg = Decimal("5.50")
        self.policy.save()
        self.assertEqual(_quote(self.tier, "300")["total"], Decimal("1650.00"))

    def test_minimum_chargeable_weight_and_minimum_fare(self):
        self.policy.minimum_chargeable_weight_kg = Decimal("100")
        self.policy.save()
        q = _quote(self.tier, "40")
        self.assertEqual(q["declared_weight_kg"], Decimal("40.00"))
        self.assertEqual(q["chargeable_weight_kg"], Decimal("100.00"))
        self.assertEqual(q["total"], Decimal("400.00"))
        self.policy.minimum_fare = Decimal("500")
        self.policy.save()
        q = _quote(self.tier, "40")
        self.assertEqual(q["total"], Decimal("500.00"))
        self.assertTrue(q["minimum_fare_applied"])

    def test_weight_over_tier_capacity_refused(self):
        with self.assertRaises(PTLError) as cm:
            _quote(self.tier, "751")
        self.assertEqual(cm.exception.code, "PTL_WEIGHT_OVER_CAPACITY")
        self.assertEqual(_quote(self.tier, "750")["total"], Decimal("3000.00"))
        for bad in ("0", "-5", "abc", None):
            with self.assertRaises(PTLError):
                _quote(self.tier, bad)

    def test_lane_rate_overrides_platform_rate(self):
        lane = Lane.objects.create(category="truck", city="hosur", destination_label="Bengaluru",
                                   fare=Decimal("900"), ptl_rate_per_kg=Decimal("3.00"))
        q = _quote(self.tier, "300", lane=lane)
        self.assertEqual(q["total"], Decimal("900.00"))
        self.assertEqual(q["rate_source"], "lane")
        lane.ptl_rate_per_kg = None
        lane.save()
        with self.assertRaises(PTLError):
            _quote(self.tier, "300", lane=lane)

    def test_disabled_or_unconfigured_policy_refuses(self):
        self.policy.is_enabled = False
        self.policy.save()
        with self.assertRaises(PTLError) as cm:
            _quote(self.tier)
        self.assertEqual(cm.exception.code, "PTL_DISABLED")

    def test_customer_loads_no_loading_charge_and_load_assist_hook(self):
        q = _quote(self.tier)
        self.assertEqual(q["loading_responsibility"], "customer")
        self.assertEqual(q["loading_unloading"], Decimal("0.00"))
        self.assertFalse(q["load_assist"])
        with self.assertRaises(PTLError) as cm:            # off by default
            _quote(self.tier, load_assist=True)
        self.assertEqual(cm.exception.code, "PTL_LOAD_ASSIST_UNAVAILABLE")
        self.policy.load_assist_enabled = True
        self.policy.load_assist_fee = Decimal("150")
        self.policy.save()
        q = _quote(self.tier, load_assist=True)
        self.assertEqual(q["total"], Decimal("1350.00"))
        self.assertEqual(q["load_assist_execution"], "not_implemented")

    def test_spot_quote_still_charges_driver_loading(self):
        route = {"distance_km": 12.0, "duration_seconds": 1800, "source": "google_maps"}
        with mock.patch(ROUTE, return_value=route):
            spot = quote_logistics_fare(tier=self.tier, pickup_lat=PICKUP[0], pickup_lng=PICKUP[1],
                                        drop_lat=DROP[0], drop_lng=DROP[1])
            fare, _ = resolve_logistics_fare_v2(
                service_category=TRUCK, logistics_tier=self.tier, logistics_lane=None, submitted_amount=None,
                pickup_lat=PICKUP[0], pickup_lng=PICKUP[1], drop_lat=DROP[0], drop_lng=DROP[1])
        self.assertEqual(spot["loading_unloading"], Decimal("100.00"))
        self.assertNotIn("pricing_basis", spot)
        self.assertEqual(fare, Decimal("530.00"))      # 250 + 10km*18 + 100 loading


class PTLTamperTests(TestCase):
    def setUp(self):
        _policy()
        self.tier = _tier()

    def _resolve(self, amount, cart, weight="300"):
        return resolve_logistics_fare_v2(
            service_category=TRUCK, logistics_tier=self.tier, logistics_lane=None, submitted_amount=amount,
            pickup_lat=PICKUP[0], pickup_lng=PICKUP[1], drop_lat=DROP[0], drop_lng=DROP[1],
            cart_data=cart, booking_mode="ptl", declared_weight_kg=weight)

    def test_quote_round_trip_and_tampering(self):
        q = _quote(self.tier, "300")
        cart = [{"quote_id": q["quote_id"], "quote_hash": q["quote_hash"], "expires_at": q["expires_at"]}]
        fare, fb = self._resolve("1200.00", cart)
        self.assertEqual(fare, Decimal("1200.00"))
        with self.assertRaises(PTLError) as cm:
            self._resolve("1.00", cart)
        self.assertEqual(cm.exception.code, "PTL_TOTAL_MISMATCH")
        with self.assertRaises(PTLError) as cm:                  # weight changed after quote
            self._resolve("1600.00", cart, weight="400")
        self.assertEqual(cm.exception.code, "PTL_QUOTE_MISMATCH")
        forged = [dict(cart[0], quote_hash="0" * 32)]
        with self.assertRaises(PTLError):
            self._resolve("1200.00", forged)
        GTPTLPricingPolicy.objects.update(rate_per_kg=Decimal("5"))   # admin rate change invalidates quote
        with self.assertRaises(PTLError) as cm:
            self._resolve("1200.00", cart)
        self.assertEqual(cm.exception.code, "PTL_QUOTE_MISMATCH")

    def test_expired_quote_refused(self):
        q = _quote(self.tier, "300", expires_at=(timezone.now() - timedelta(minutes=1)).isoformat())
        cart = [{"quote_id": q["quote_id"], "quote_hash": q["quote_hash"], "expires_at": q["expires_at"]}]
        with self.assertRaises(PTLError) as cm:
            self._resolve("1200.00", cart)
        self.assertEqual(cm.exception.code, "PTL_QUOTE_EXPIRED")


class PTLSlotTests(TestCase):
    def setUp(self):
        _policy()

    def test_requires_admin_slot_advance_date_and_capacity(self):
        with self.assertRaises(PTLError) as cm:
            validate_ptl_slot(preferred_date=_tomorrow(), preferred_time=SLOT, city="hosur")
        self.assertEqual(cm.exception.code, "PTL_SLOT_INVALID")        # no admin slot, no fallback
        LogisticsSlot.objects.create(category="ptl", city="hosur", slot_label=SLOT, capacity=1)
        with self.assertRaises(PTLError) as cm:
            validate_ptl_slot(preferred_date=timezone.localdate(), preferred_time=SLOT, city="hosur")
        self.assertEqual(cm.exception.code, "PTL_ADVANCE_ONLY")
        self.assertIsNotNone(validate_ptl_slot(preferred_date=_tomorrow(), preferred_time=SLOT, city="hosur"))
        with self.assertRaises(PTLError):                               # slot is for another city
            validate_ptl_slot(preferred_date=_tomorrow(), preferred_time=SLOT, city="chennai")
        ServiceRequest.objects.create(
            customer_name="x", phone="9000000000", service_category=TRUCK, issue_title="x", address="a",
            preferred_date=_tomorrow(), preferred_time=SLOT, logistics_booking_mode="ptl", status="confirmed")
        with self.assertRaises(PTLError) as cm:
            validate_ptl_slot(preferred_date=_tomorrow(), preferred_time=SLOT, city="hosur")
        self.assertEqual(cm.exception.code, "PTL_SLOT_FULL")

    def test_availability_endpoint_has_no_fallback_grid_for_ptl(self):
        r = APIClient().get("/api/logistics/slots/", {"category": "ptl", "city": "hosur", "date": str(_tomorrow())})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["groups"], [])
        LogisticsSlot.objects.create(category="ptl", city="hosur", slot_label=SLOT, capacity=3)
        r = APIClient().get("/api/logistics/slots/", {"category": "ptl", "city": "hosur", "date": str(_tomorrow())})
        slots = [s for g in r.json()["groups"] for s in g["slots"]]
        self.assertEqual([s["slot"] for s in slots], [SLOT])
        self.assertTrue(slots[0]["is_available"])


@mock.patch(COVER, lambda *a, **k: None)
class PTLBookingEndToEndTests(TestCase):
    def setUp(self):
        _policy()
        self.tier = _tier()
        LogisticsSlot.objects.create(category="ptl", city="hosur", slot_label=SLOT, capacity=5)
        self.user = _user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def _quote_api(self, weight="300"):
        r = self.client.post("/api/logistics/ptl/quote/", {
            "tier_id": self.tier.id, "declared_weight_kg": weight,
            "pickup_latitude": str(PICKUP[0]), "pickup_longitude": str(PICKUP[1]),
            "drop_latitude": str(DROP[0]), "drop_longitude": str(DROP[1])}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        return r.json()["quote"]

    def _book(self, q, total=None, weight="300", tier=None, date=None):
        return self.client.post("/api/booking/", {
            "customer_name": "PTL Customer", "phone": self.user.phone, "email": self.user.email,
            "service_category": TRUCK, "issue_title": "Part load", "description": "20 cartons",
            "address": "Pickup, Hosur", "latitude": str(PICKUP[0]), "longitude": str(PICKUP[1]),
            "drop_address": "Drop, Bengaluru", "drop_latitude": str(DROP[0]), "drop_longitude": str(DROP[1]),
            "preferred_date": str(date or _tomorrow()), "preferred_time": SLOT,
            "total_amount": total or q["total"], "payment_method": "COD",
            "logistics_tier": (tier or self.tier).id, "logistics_booking_mode": "ptl",
            "ptl_declared_weight_kg": weight,
            "cart_data": [{"quote_id": q["quote_id"], "quote_hash": q["quote_hash"], "expires_at": q["expires_at"]}],
        }, format="json")

    def test_booking_created_as_ptl_and_invoice_basis_recorded(self):
        q = self._quote_api()
        r = self._book(q)
        self.assertIn(r.status_code, (200, 201), r.content)
        sr = ServiceRequest.objects.get(logistics_booking_mode="ptl")
        self.assertEqual(sr.service_category, TRUCK)
        self.assertEqual(sr.total_amount, Decimal("1200.00"))
        self.assertEqual(sr.ptl_declared_weight_kg, Decimal("300.00"))
        self.assertEqual(sr.fare_breakdown["pricing_basis"], "ptl_per_kg")
        self.assertEqual(sr.fare_breakdown["rate_per_kg"], "4.00")
        self.assertEqual(sr.fare_breakdown["loading_responsibility"], "customer")

    def test_tampered_total_rejected_and_nothing_created(self):
        q = self._quote_api()
        r = self._book(q, total="100.00")
        self.assertEqual(r.status_code, 400, r.content)
        self.assertFalse(ServiceRequest.objects.filter(logistics_booking_mode="ptl").exists())

    def test_ineligible_tier_same_day_and_no_slot_rejected(self):
        q = self._quote_api()
        r = self._book(q, tier=_tier(vehicle_class="three_wheeler", max_kg="500"))
        self.assertEqual(r.status_code, 400)
        r = self._book(q, date=timezone.localdate())
        self.assertEqual(r.status_code, 400)
        LogisticsSlot.objects.all().delete()
        r = self._book(q)
        self.assertEqual(r.status_code, 400)
        self.assertFalse(ServiceRequest.objects.filter(logistics_booking_mode="ptl").exists())

    def test_revision_before_dispatch_reprices_and_is_tamper_checked(self):
        r = self._book(self._quote_api())
        self.assertIn(r.status_code, (200, 201), r.content)
        sr = ServiceRequest.objects.get(logistics_booking_mode="ptl")
        url = f"/api/booking/{sr.pk}/ptl-requote/"
        r = self.client.get(url, {"declared_weight_kg": "450"})
        self.assertEqual(r.status_code, 200, r.content)
        rq = r.json()["data"]
        self.assertEqual(rq["total"], "1800.00")
        body = {"declared_weight_kg": "450", "quote_id": rq["quote_id"], "quote_hash": rq["quote_hash"],
                "expires_at": rq["expires_at"]}
        r = self.client.post(url, dict(body, total_amount="1200.00"), format="json")
        self.assertEqual(r.status_code, 400)                            # stale/tampered total
        r = self.client.post(url, dict(body, declared_weight_kg="200", total_amount="1800.00"), format="json")
        self.assertEqual(r.status_code, 400)                            # weight differs from the quote
        r = self.client.post(url, dict(body, total_amount="1800.00"), format="json")
        self.assertEqual(r.status_code, 200, r.content)
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("1800.00"))
        self.assertEqual(sr.ptl_declared_weight_kg, Decimal("450.00"))
        self.assertEqual(len(sr.fare_breakdown["ptl_revisions"]), 1)
        # once a driver is on it, no more revisions
        sr.status, sr.technician_name = "assigned", "Driver"
        sr.save()
        with self.assertRaises(PTLError) as cm:
            preview_ptl_revision(sr, declared_weight_kg="100")
        self.assertEqual(cm.exception.code, "PTL_ALREADY_DISPATCHED")

    def test_tracking_payload_exposes_requote_eligibility(self):
        from service_requests.views import _build_tracking_payload, _ptl_tracking_block
        self._book(self._quote_api())
        sr = ServiceRequest.objects.get(logistics_booking_mode="ptl")
        blk = _build_tracking_payload(sr, has_full_access=True)["ptl"]
        self.assertEqual(blk["mode"], "ptl")
        self.assertTrue(blk["requote_eligible"])
        self.assertEqual(blk["declared_weight_kg"], "300.00")
        self.assertEqual(blk["loading_responsibility"], "customer")
        sr.status, sr.technician_name = "assigned", "Driver"
        sr.save()
        self.assertFalse(_ptl_tracking_block(sr)["requote_eligible"])   # UI hides the card; API refuses too
        sr.logistics_booking_mode = "spot"
        self.assertIsNone(_ptl_tracking_block(sr))

    def test_requote_by_drop_address_is_geocoded_server_side(self):
        self._book(self._quote_api())
        sr = ServiceRequest.objects.get(logistics_booking_mode="ptl")
        url = f"/api/booking/{sr.pk}/ptl-requote/"
        geo = {"latitude": "12.970000", "longitude": "77.600000"}
        with mock.patch("service_requests.services.address_service.AddressService.resolve_address_coordinates",
                        return_value=geo):
            r = self.client.get(url, {"declared_weight_kg": "300", "drop_address": "MG Road, Bengaluru"})
        self.assertEqual(r.status_code, 200, r.content)
        rq = r.json()["data"]
        self.assertEqual(rq["drop_lat"], "12.970000")
        # The card confirms with the preview's resolved coordinates (no second geocode).
        with mock.patch(COVER, return_value=None):
            r = self.client.post(url, {"declared_weight_kg": "300", "drop_latitude": rq["drop_lat"],
                                       "drop_longitude": rq["drop_lng"], "drop_address": "MG Road, Bengaluru",
                                       "quote_id": rq["quote_id"], "quote_hash": rq["quote_hash"],
                                       "expires_at": rq["expires_at"], "total_amount": rq["total"]}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        sr.refresh_from_db()
        self.assertEqual(sr.drop_address, "MG Road, Bengaluru")
        self.assertEqual(sr.drop_latitude, Decimal("12.970000"))
        with mock.patch("service_requests.services.address_service.AddressService.resolve_address_coordinates",
                        return_value=None):
            r = self.client.get(url, {"drop_address": "nowhere"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()["error"]["code"], "GEOCODE_FAILED")

    def test_ptl_excluded_from_per_km_drop_change_and_distance_reconciliation(self):
        from service_requests.services.drop_change import DropChangeError, preview_drop_change
        from service_requests.services.fare_reconciliation import reconcile_booking_fare
        self._book(self._quote_api())
        sr = ServiceRequest.objects.get(logistics_booking_mode="ptl")
        with self.assertRaises(DropChangeError) as cm:
            preview_drop_change(sr, drop_lat=12.9, drop_lng=77.9)
        self.assertEqual(cm.exception.code, "PTL_USE_REQUOTE")
        rec = reconcile_booking_fare(sr, actual_distance_km=Decimal("40"))
        if rec is not None:
            self.assertFalse(any(a.get("code") == "DISTANCE_VARIANCE" for a in (rec.adjustments or [])))

    def test_spot_booking_unaffected(self):
        route = {"distance_km": 12.0, "duration_seconds": 1800, "source": "google_maps"}
        with mock.patch(ROUTE, return_value=route):
            r = self.client.post("/api/booking/", {
                "customer_name": "Spot", "phone": self.user.phone, "email": self.user.email,
                "service_category": TRUCK, "issue_title": "Mini truck", "description": "sofa",
                "address": "Pickup, Hosur", "latitude": str(PICKUP[0]), "longitude": str(PICKUP[1]),
                "drop_address": "Drop", "drop_latitude": str(DROP[0]), "drop_longitude": str(DROP[1]),
                "preferred_date": str(next_bookable_date()), "total_amount": "1.00", "payment_method": "COD",
                "logistics_tier": self.tier.id, "ptl_declared_weight_kg": "300",
            }, format="json")
        self.assertIn(r.status_code, (200, 201), r.content)
        sr = ServiceRequest.objects.get(logistics_booking_mode="spot")
        self.assertEqual(sr.total_amount, Decimal("530.00"))
        self.assertIsNone(sr.ptl_declared_weight_kg)
        self.assertEqual(sr.fare_breakdown["loading_unloading"], "100.00")


class PTLAdminPolicyApiTests(TestCase):
    def test_admin_configures_ptl_policy_with_validation(self):
        c = APIClient()
        c.force_authenticate(_user("admin"))
        base = "/api/logistics/admin/policies/ptl/"
        r = c.post(base, {"is_enabled": True, "rate_per_kg": "0"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.post(base, {"is_enabled": True, "rate_per_kg": "4", "min_advance_days": 0}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.post(base, {"is_enabled": True, "rate_per_kg": "4", "load_assist_enabled": True}, format="json")
        self.assertEqual(r.status_code, 400)
        r = c.post(base, {"is_enabled": True, "rate_per_kg": "4", "minimum_chargeable_weight_kg": "50"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        cfg = APIClient().get("/api/logistics/ptl/config/", {"city": "hosur"}).json()
        self.assertTrue(cfg["enabled"])
        self.assertEqual(cfg["rate_per_kg"], "4.00")
        self.assertEqual(cfg["loading_responsibility"], "customer")
        self.assertFalse(cfg["load_assist_offered"])

    def test_admin_toggles_tier_ptl_eligibility(self):
        c = APIClient()
        c.force_authenticate(_user("admin"))
        t = _tier(ptl=False)
        r = c.patch(f"/api/logistics/admin/tiers/{t.id}/", {"ptl_eligible": True}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        t.refresh_from_db()
        self.assertTrue(t.ptl_eligible)


class PTLClaimPolicySeedMigrationTests(TestCase):
    """Verifies the migration 0119 seed operation against the test schema.

    ``quicktims.test_settings`` intentionally disables migrations for fast,
    isolated tests, so the Django test runner cannot leave data-migration
    rows behind. Calling the migration's public forward operation directly
    exercises its fill-missing-only contract without pretending migrations
    ran in this test database.
    """

    def test_seeded_migration_row_is_ptl_scoped_1000_cap_72h_window(self):
        from django.apps import apps
        from service_requests.models import GTClaimPolicy

        migration = import_module(
            "service_requests.migrations.0119_gt_ptl_porter_gaps"
        )
        migration.seed_ptl_claim_defaults(apps, None)
        pol = GTClaimPolicy.objects.filter(applies_to_ptl=True, service_category=TRUCK).first()
        self.assertIsNotNone(pol, "Round 11 PTL seed should create the default policy when it is missing")
        self.assertEqual(pol.included_liability_cap, Decimal("1000.00"))
        self.assertEqual(pol.claim_window_hours, 72)
        self.assertTrue(pol.cap_at_fare)


class PTLPorterGapsRound11Tests(TestCase):
    """Round 11: PTL cumulative weight cap, PTL-scoped claim cap/window, optional
    declared-value risk charge (porter.in/part-load-service, fetched 2026-09-29)."""

    def setUp(self):
        # Migration 0119 seeds a platform-wide, PTL-scoped GTClaimPolicy default (Rs 1,000 /
        # 72h). Clear it here so these tests can independently exercise both the "no PTL-scoped
        # row exists" fallback case and their own explicitly-constructed rows, without the
        # seeded default silently winning either comparison (same convention as
        # test_admin_gt_policies.py / test_public_gt_policies.py's setUp()).
        from service_requests.models import GTClaimPolicy
        GTClaimPolicy.objects.filter(applies_to_ptl=True).delete()

    def test_cumulative_weight_cap_defaults_to_3000kg(self):
        pol = _policy()
        self.assertEqual(pol.ptl_cumulative_weight_cap_kg, Decimal("3000.00"))

    def test_weight_over_cumulative_cap_is_rejected_even_within_tier_capacity(self):
        _policy(ptl_cumulative_weight_cap_kg=Decimal("3000.00"))
        # A big tier whose own capacity is well above the PTL cumulative cap.
        t = _tier(max_kg="5000")
        with self.assertRaises(PTLError) as ctx:
            _quote(t, weight="3500")
        self.assertEqual(ctx.exception.code, "PTL_WEIGHT_OVER_CUMULATIVE_CAP")

    def test_weight_at_or_under_cumulative_cap_is_accepted(self):
        _policy(ptl_cumulative_weight_cap_kg=Decimal("3000.00"))
        t = _tier(max_kg="5000")
        q = _quote(t, weight="3000")
        self.assertEqual(q["declared_weight_kg"], Decimal("3000.00"))

    def test_blank_cumulative_cap_means_no_cap(self):
        _policy(ptl_cumulative_weight_cap_kg=None)
        t = _tier(max_kg="5000")
        q = _quote(t, weight="4999")
        self.assertEqual(q["declared_weight_kg"], Decimal("4999.00"))

    def test_ptl_claim_policy_scoped_separately_from_spot_truck(self):
        from service_requests.models import GTClaimPolicy
        from service_requests.services.claims_policy import policy_for_category

        GTClaimPolicy.objects.create(
            service_category=TRUCK, applies_to_ptl=False, is_enabled=True,
            included_liability_cap=Decimal("5000.00"), cap_at_fare=True,
            claim_window_hours=24, is_active=True,
        )
        GTClaimPolicy.objects.create(
            service_category=TRUCK, applies_to_ptl=True, is_enabled=True,
            included_liability_cap=Decimal("1000.00"), cap_at_fare=True,
            claim_window_hours=72, is_active=True,
        )
        spot_pol = policy_for_category(TRUCK, is_ptl=False)
        ptl_pol = policy_for_category(TRUCK, is_ptl=True)
        self.assertEqual(spot_pol.included_liability_cap, Decimal("5000.00"))
        self.assertEqual(spot_pol.claim_window_hours, 24)
        self.assertEqual(ptl_pol.included_liability_cap, Decimal("1000.00"))
        self.assertEqual(ptl_pol.claim_window_hours, 72)

    def test_ptl_claim_policy_falls_back_to_generic_truck_row_when_no_ptl_row_exists(self):
        from service_requests.models import GTClaimPolicy
        from service_requests.services.claims_policy import policy_for_category

        GTClaimPolicy.objects.create(
            service_category=TRUCK, applies_to_ptl=False, is_enabled=True,
            included_liability_cap=Decimal("5000.00"), cap_at_fare=True,
            claim_window_hours=24, is_active=True,
        )
        pol = policy_for_category(TRUCK, is_ptl=True)
        self.assertEqual(pol.included_liability_cap, Decimal("5000.00"))

    def test_declared_value_risk_charge_off_by_default_without_opt_in(self):
        _policy()
        t = _tier()
        q = _quote(t, weight="300", declared_value="10000")  # no risk_accepted
        self.assertEqual(q["ptl_risk_charge"], Decimal("0.00"))
        self.assertEqual(q["total"], q["freight_charge"])

    def test_declared_value_risk_charge_applies_only_when_opted_in(self):
        _policy(ptl_declared_value_risk_rate_percent=Decimal("2.00"))
        t = _tier()
        q = _quote(t, weight="300", declared_value="10000", risk_accepted=True)
        self.assertEqual(q["ptl_risk_charge"], Decimal("200.00"))  # 2% of 10,000
        self.assertEqual(q["total"], q["freight_charge"] + Decimal("200.00"))
        self.assertEqual(q["ptl_declared_value"], "10000.00")

    def test_risk_charge_disabled_when_admin_sets_rate_to_zero(self):
        _policy(ptl_declared_value_risk_rate_percent=Decimal("0.00"))
        t = _tier()
        q = _quote(t, weight="300", declared_value="10000", risk_accepted=True)
        self.assertEqual(q["ptl_risk_charge"], Decimal("0.00"))

    def test_risk_charge_not_applied_without_a_declared_value(self):
        _policy(ptl_declared_value_risk_rate_percent=Decimal("2.00"))
        t = _tier()
        q = _quote(t, weight="300", risk_accepted=True)
        self.assertEqual(q["ptl_risk_charge"], Decimal("0.00"))
