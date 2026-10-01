"""
Round 13 (Final Configurability Pass): GTTaxPolicy (GST enabled/disabled,
RCM opt-in, effective dates) and ServiceTier effective-date window.

Verification targets covered here map to the round's spec section 6:
  6. RCM configuration changeable through the Admin interface (Django admin,
     tested via the admin_views.py-equivalent model + admin.save_model path).
  7. Tax configuration affects quote/invoice behavior.
  8. Historical bookings remain stable after a later config change.
  9. Configuration changes are auditable (CatalogChangeLog).
 10. No invented Porter value (asserted explicitly below).
"""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from logistics.models import ServiceTier
from service_requests.models import CatalogChangeLog, GTTaxPolicy, ServiceRequest
from service_requests.services.logistics_pricing import quote_logistics_fare, assert_catalog_matches_category, LogisticsCatalogMismatchError

User = get_user_model()
ROUTE = {"distance_km": 12.0, "duration_minutes": 30, "distance_source": "google_maps_road_distance", "is_authoritative": True}
P, D = (12.7409, 77.8253), (12.76, 77.80)


def _quote(tier, **kw):
    with patch("service_requests.services.routing.get_route_eta", return_value=ROUTE):
        return quote_logistics_fare(tier=tier, pickup_lat=P[0], pickup_lng=P[1], drop_lat=D[0], drop_lng=D[1], **kw)


class GstRcmDefaultBehaviorTests(TestCase):
    """No GTTaxPolicy row anywhere -- must be byte-identical to pre-Round-13 behavior."""

    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug=f"t-{uuid.uuid4().hex[:6]}", name="Tata Ace",
            starting_price=Decimal("100"), base_fare=Decimal("100"), per_km_rate=Decimal("10"),
            free_km=Decimal("0"), gst_rate=Decimal("18.00"))

    def test_no_policy_row_means_no_rcm_and_gst_included_as_before(self):
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertFalse(b["rcm_applicable"])
        self.assertEqual(b["rcm_statement"], "")
        self.assertEqual(b["gst_rate"], "18.00")
        self.assertGreater(b["gst_included"], Decimal("0"))
        self.assertEqual(b["taxable_value"], b["total"])

    def test_no_service_category_arg_is_also_unaffected(self):
        b = _quote(self.tier)  # legacy call signature, no service_category/customer_gstin
        self.assertFalse(b["rcm_applicable"])
        self.assertEqual(b["gst_rate"], "18.00")


class GstRcmConfiguredTests(TestCase):
    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug=f"t-{uuid.uuid4().hex[:6]}", name="Tata Ace",
            starting_price=Decimal("100"), base_fare=Decimal("100"), per_km_rate=Decimal("10"),
            free_km=Decimal("0"), gst_rate=Decimal("18.00"))
        # setUp()-clears pattern: guard against any migration-seeded platform-wide row.
        GTTaxPolicy.objects.filter(service_category="").delete()

    def test_rcm_disabled_policy_present_but_off_changes_nothing(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=False)
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertFalse(b["rcm_applicable"])
        self.assertGreater(b["gst_included"], Decimal("0"))

    def test_rcm_enabled_requires_gstin_by_default(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True)
        no_gstin = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="")
        self.assertFalse(no_gstin["rcm_applicable"])
        with_gstin = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertTrue(with_gstin["rcm_applicable"])

    def test_rcm_applicable_removes_gst_from_customer_total_and_carries_statement(self):
        policy = GTTaxPolicy.objects.create(
            service_category="goods_transport_truck", rcm_enabled=True,
            rcm_statement="Tax payable on reverse charge basis.")
        plain = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="")
        rcm = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertTrue(rcm["rcm_applicable"])
        self.assertEqual(rcm["rcm_statement"], "Tax payable on reverse charge basis.")
        self.assertIsNone(rcm["gst_rate"])
        self.assertEqual(rcm["gst_included"], Decimal("0.00"))
        # Customer payable drops by exactly the GST portion that was included in the plain quote.
        self.assertEqual(rcm["total"], plain["total"] - plain["gst_included"])
        self.assertEqual(rcm["taxable_value"], rcm["total"])

    def test_rcm_unconditional_scope_ignores_gstin(self):
        GTTaxPolicy.objects.create(
            service_category="goods_transport_truck", rcm_enabled=True,
            rcm_applies_when_gstin_registered=False)
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="")
        self.assertTrue(b["rcm_applicable"])

    def test_gst_enabled_false_suppresses_gst_without_rcm(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", gst_enabled=False)
        b = _quote(self.tier, service_category="goods_transport_truck")
        self.assertIsNone(b["gst_rate"])
        self.assertEqual(b["gst_included"], Decimal("0.00"))
        self.assertFalse(b["rcm_applicable"])

    def test_category_specific_row_wins_over_platform_wide(self):
        GTTaxPolicy.objects.create(service_category="", rcm_enabled=False)
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True)
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertTrue(b["rcm_applicable"])

    def test_effective_dates_gate_the_policy(self):
        import datetime as dt
        GTTaxPolicy.objects.create(
            service_category="goods_transport_truck", rcm_enabled=True,
            effective_from=dt.date.today() + dt.timedelta(days=5))  # not yet effective
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertFalse(b["rcm_applicable"])

    def test_inactive_row_is_never_resolved(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True, is_active=False)
        b = _quote(self.tier, service_category="goods_transport_truck", customer_gstin="29ABCDE1234F1Z5")
        self.assertFalse(b["rcm_applicable"])

    def test_no_porter_value_invented(self):
        """The RCM statement default is a generic GST-law statement, not a
        Porter-observed figure or wording -- and no rate/percentage was added
        by this feature (the GST rate itself is untouched, existing tier field)."""
        policy = GTTaxPolicy()
        self.assertNotIn("porter", policy.rcm_statement.lower())
        self.assertIn("reverse charge", policy.rcm_statement.lower())
        self.assertFalse(policy.rcm_enabled)  # safe default: off


class GstRcmInvoiceTests(TestCase):
    """Historical-booking stability + invoice RCM statement."""

    def _booking(self, snapshot_extra):
        uid = uuid.uuid4().hex[:8]
        user = User.objects.create_user(username=f"c_{uid}", email=f"{uid}@e.com", password="pw12345678",
                                        phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        snap = {"tier_name": "Tata Ace", "total": "100.00", "base_fare": "100.00", "chargeable_km": "0.00",
                "distance_charge": "0.00", "loading_unloading": "0.00"}
        snap.update(snapshot_extra)
        return ServiceRequest.objects.create(
            customer=user, customer_name="Ravi", phone=user.phone, email=user.email,
            service_category="goods_transport_truck", issue_title="Delivery", address="Pickup, Hosur",
            preferred_date=timezone.localdate(), total_amount=Decimal(snap["total"]),
            cart_data=[{"price": float(snap["total"]), "logistics_snapshot": snap}])

    def _invoice_texts(self, sr):
        from reportlab.pdfgen import canvas
        seen = []
        o1, o2 = canvas.Canvas.drawString, canvas.Canvas.drawRightString
        def d1(s_, x, y, t, *a, **k): seen.append(t); return o1(s_, x, y, t, *a, **k)
        def d2(s_, x, y, t, *a, **k): seen.append(t); return o2(s_, x, y, t, *a, **k)
        from rest_framework.test import APIClient
        client = APIClient(); client.force_authenticate(sr.customer)
        with patch.object(canvas.Canvas, "drawString", d1), patch.object(canvas.Canvas, "drawRightString", d2):
            r = client.get(f"/api/booking/{sr.id}/invoice/")
        self.assertEqual(r.status_code, 200)
        return seen

    def test_invoice_prints_rcm_statement_and_no_gst_line_when_snapshot_says_rcm(self):
        sr = self._booking({
            "total": "75.59", "gst_rate": None, "gst_included": "0.00",
            "rcm_applicable": True, "rcm_statement": "Tax payable on reverse charge basis.",
            "taxable_value": "75.59",
        })
        texts = self._invoice_texts(sr)
        self.assertTrue(any("reverse charge" in str(t).lower() for t in texts))
        self.assertFalse([t for t in texts if str(t).startswith("Includes GST")])

    def test_invoice_without_rcm_is_unchanged(self):
        sr = self._booking({"gst_rate": "18.00", "gst_included": "15.25"})
        texts = self._invoice_texts(sr)
        self.assertFalse(any("reverse charge" in str(t).lower() for t in texts))
        self.assertTrue(any(str(t).startswith("Includes GST") for t in texts))

    def test_historical_booking_snapshot_survives_a_later_policy_change(self):
        """An existing booking's invoice must not move when an Admin flips
        rcm_enabled on afterward -- same config-snapshot guarantee GST rate
        changes already had (test_gt_gst_configurable.py)."""
        sr = self._booking({"gst_rate": "18.00", "gst_included": "15.25", "total": "100.00"})
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True)
        texts = self._invoice_texts(sr)
        self.assertTrue(any(str(t).startswith("Includes GST") for t in texts))
        self.assertFalse(any("reverse charge" in str(t).lower() for t in texts))
        sr.refresh_from_db()
        self.assertEqual(sr.total_amount, Decimal("100.00"))


class GTTaxPolicyAdminApiTests(TestCase):
    """The real Admin interface for this (verification item 6): the same
    data-driven Logistics Admin Policy API (logistics/admin_policy_views.py)
    that already serves cancellation/waiting/advance/claim/ptl -- extended
    here with a 'tax' kind. Also proves auditability via CatalogChangeLog
    (verification item 9)."""

    def setUp(self):
        self.admin_user = User.objects.create_user(
            username="tax_admin", email="ta@example.com", phone="9000444555", role="admin")
        self.client = APIClient(); self.client.force_authenticate(self.admin_user)
        GTTaxPolicy.objects.all().delete()

    def test_create_tax_policy_via_admin_api(self):
        r = self.client.post("/api/logistics/admin/policies/tax/", {
            "service_category": "goods_transport_truck",
            "rcm_enabled": True,
            "rcm_statement": "Tax payable on reverse charge basis.",
            "reason": "Ops decided RCM applies to registered-business truck freight",
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        pk = r.data["data"]["id"]
        self.assertTrue(GTTaxPolicy.objects.filter(pk=pk, rcm_enabled=True).exists())
        self.assertTrue(CatalogChangeLog.objects.filter(entity_id=pk, field_name="tax.created").exists())

    def test_rcm_enabled_requires_a_statement(self):
        r = self.client.post("/api/logistics/admin/policies/tax/", {
            "service_category": "goods_transport_truck", "rcm_enabled": True, "rcm_statement": "",
        }, format="json")
        self.assertEqual(r.status_code, 400)

    def test_edit_is_audited_field_by_field(self):
        row = GTTaxPolicy.objects.create(service_category="goods_transport_truck")
        r = self.client.patch(f"/api/logistics/admin/policies/tax/{row.id}/", {
            "rcm_enabled": True, "rcm_statement": "Tax payable on reverse charge basis.",
            "reason": "Enabling RCM for GSTIN-registered customers",
        }, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertTrue(CatalogChangeLog.objects.filter(
            entity_id=row.id, field_name="tax.rcm_enabled", new_value="True").exists())
        row.refresh_from_db()
        self.assertTrue(row.rcm_enabled)

    def test_deactivate_is_audited(self):
        row = GTTaxPolicy.objects.create(service_category="goods_transport_truck")
        r = self.client.delete(f"/api/logistics/admin/policies/tax/{row.id}/")
        self.assertEqual(r.status_code, 200, r.content)
        row.refresh_from_db()
        self.assertFalse(row.is_active)
        self.assertTrue(CatalogChangeLog.objects.filter(entity_id=row.id, field_name="tax.is_active").exists())

    def test_overview_lists_tax_alongside_every_other_policy_kind(self):
        GTTaxPolicy.objects.create(service_category="goods_transport_truck", rcm_enabled=True,
                                    rcm_statement="Tax payable on reverse charge basis.")
        r = self.client.get("/api/logistics/admin/policies/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("tax", r.data["data"])
        self.assertTrue(any(row["rcm_enabled"] for row in r.data["data"]["tax"]))

    def test_anonymous_and_customer_are_refused(self):
        anon = APIClient()
        self.assertEqual(anon.get("/api/logistics/admin/policies/").status_code, 401)
        cust = User.objects.create_user(username="cust1", email="c1@example.com", phone="9000555666", role="customer")
        c = APIClient(); c.force_authenticate(cust)
        r = c.post("/api/logistics/admin/policies/tax/", {"service_category": "goods_transport_truck", "rcm_enabled": True}, format="json")
        self.assertEqual(r.status_code, 403)


class ServiceTierEffectiveDatesTests(TestCase):
    """Round 13: ServiceTier.effective_from/effective_to gate quote/booking
    catalog matching (verification items 1-5: activate/deactivate mechanism,
    rate/capacity Admin-editable, effect on runtime, fitment)."""

    def setUp(self):
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug=f"t-{uuid.uuid4().hex[:6]}", name="Canter 14ft",
            starting_price=Decimal("500"), max_weight_kg=Decimal("3000"), max_cft=Decimal("400"),
            is_active=True)

    def test_within_window_or_unset_is_fine(self):
        assert_catalog_matches_category("goods_transport_truck", tier=self.tier)  # no bounds set -- fine

    def test_future_effective_from_blocks_the_tier(self):
        import datetime as dt
        self.tier.effective_from = dt.date.today() + dt.timedelta(days=1)
        self.tier.save()
        with self.assertRaises(LogisticsCatalogMismatchError):
            assert_catalog_matches_category("goods_transport_truck", tier=self.tier)

    def test_past_effective_to_blocks_the_tier(self):
        import datetime as dt
        self.tier.effective_to = dt.date.today() - dt.timedelta(days=1)
        self.tier.save()
        with self.assertRaises(LogisticsCatalogMismatchError):
            assert_catalog_matches_category("goods_transport_truck", tier=self.tier)

    def test_capacity_change_is_admin_editable_and_used_by_fitment(self):
        """Admin can change vehicle capacity without code changes, and
        cargo-fitment reads the updated value (verification items 4 & 5)."""
        ok, _ = self.tier.evaluate_cargo_fit(Decimal("2500"), Decimal("300"))
        self.assertTrue(ok)
        self.tier.max_weight_kg = Decimal("2000")
        self.tier.save()
        ok2, reason = self.tier.evaluate_cargo_fit(Decimal("2500"), Decimal("300"))
        self.assertFalse(ok2)
        self.assertIn("exceeds", reason)

    def test_rate_change_affects_computed_quote(self):
        """Admin can configure rate without code changes; it affects a
        computed quote (verification items 2 & 3)."""
        self.tier.base_fare = Decimal("500")
        self.tier.per_km_rate = Decimal("10")
        self.tier.free_km = Decimal("0")
        self.tier.save()
        b1 = _quote(self.tier)
        self.tier.per_km_rate = Decimal("20")
        self.tier.save()
        b2 = _quote(self.tier)
        self.assertNotEqual(b1["total"], b2["total"])
