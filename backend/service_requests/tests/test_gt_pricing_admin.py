"""
service_requests/tests/test_gt_pricing_admin.py

Goods and Transport rate-card admin tests.

As of GT Phase 2 unification, Goods and Transport pricing is managed centrally
via Catalog > Packages (the Package model and update_package service). Direct
mutation of ServiceTier via PATCH /api/logistics/admin/tiers/<pk>/ is intentionally
deprecated and locked, returning:

    409 Conflict: PRICING_MANAGED_VIA_PACKAGE

These tests verify:
1. Direct tier mutation is refused with 409 PRICING_MANAGED_VIA_PACKAGE across all roles.
2. RBAC/security permissions are strictly enforced (customer and anonymous are denied).
3. The rate card remains a fully functional read-only reference (GET, filtering, meta).
4. Tier history (CatalogChangeLog) remains accessible and properly scoped.
5. The authoritative pricing workflow (Catalog > Packages) correctly synchronizes
   pricing to the linked ServiceTier.
"""
from decimal import Decimal
from typing import Any, cast

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.test import APITestCase

from logistics.models import ServiceTier
from service_requests.models import AddOn, CatalogCategory, CatalogChangeLog, Package, PackageStatus, Service
from service_requests.services.catalog import (
    LogisticsPricingPermissionError,
    update_addon,
    update_package,
)

User = get_user_model()

LIST_URL = "/api/logistics/admin/tiers/"


def _tier(**extra):
    defaults = dict(
        category="truck", city="Hosur", slug="admin-tata-ace", name="Tata Ace",
        starting_price=Decimal("400.00"), base_fare=Decimal("220.00"),
        per_km_rate=Decimal("22.00"), free_km=Decimal("3.00"),
        minimum_fare=Decimal("220.00"), loading_unloading_charge=Decimal("60.00"),
        additional_stop_charge=Decimal("40.00"), order=1,
    )
    defaults.update(extra)
    return ServiceTier.objects.create(**defaults)


def _user(role, n):
    return User.objects.create_user(
        username=f"{role}_{n}", email=f"{role}_{n}@example.com",
        phone=f"90000000{n:02d}", role=role,
    )


class PricingRbacTests(APITestCase):
    """RBAC enforcement: who may read, who is denied, and direct mutation lock."""

    def setUp(self):
        self.tier = _tier()
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"

    def _patch(self, role, body, n=1):
        self.client.force_authenticate(user=_user(role, n))
        return self.client.patch(self.url, body, format="json")

    # ── Direct tier mutation is locked for all roles with 409 ───────────

    def test_admin_cannot_directly_change_a_rate_gets_409(self):
        r = self._patch("admin", {"per_km_rate": "25.00", "reason": "fuel"})
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_catalog_role_cannot_directly_change_a_rate_gets_409(self):
        r = self._patch("catalog", {"per_km_rate": "25.00", "reason": "fuel"}, n=2)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_super_admin_cannot_directly_change_a_rate_gets_409(self):
        r = self._patch("super_admin", {"per_km_rate": "25.00", "reason": "fuel"}, n=3)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_finance_cannot_change_a_rate_gets_409(self):
        r = self._patch("finance", {"per_km_rate": "25.00", "reason": "x"}, n=4)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_manager_cannot_change_a_rate_gets_409(self):
        r = self._patch("manager", {"per_km_rate": "25.00", "reason": "x"}, n=5)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_support_cannot_change_a_rate_gets_409(self):
        r = self._patch("support", {"per_km_rate": "25.00", "reason": "x"}, n=6)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")

    def test_finance_cannot_deactivate_tier_directly_gets_409(self):
        r = self._patch("finance", {"is_active": False}, n=8)
        self.assertEqual(r.status_code, 409, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertTrue(self.tier.is_active)

    # ── Non-privileged roles are blocked by RBAC before reaching handler ─

    def test_a_customer_cannot_even_read_the_rate_card(self):
        self.client.force_authenticate(user=_user("customer", 7))
        self.assertEqual(self.client.get(LIST_URL).status_code, 403)

    def test_customer_cannot_patch_rate_card(self):
        self.client.force_authenticate(user=_user("customer", 7))
        self.assertEqual(self.client.patch(self.url, {"per_km_rate": "25.00"}).status_code, 403)

    def test_anonymous_cannot_read_the_rate_card(self):
        self.assertIn(self.client.get(LIST_URL).status_code, (401, 403))

    def test_anonymous_cannot_patch_the_rate_card(self):
        self.assertIn(self.client.patch(self.url, {"per_km_rate": "25.00"}).status_code, (401, 403))


class PricingCrudAndValidationTests(APITestCase):
    """Read-only catalog operations and direct-mutation refusal."""

    def setUp(self):
        self.tier = _tier()
        self.inactive = _tier(slug="admin-old-tier", name="Retired", is_active=False, order=9)
        self.scooter = _tier(category="two_wheeler", slug="admin-2w", name="Scooter",
                             starting_price=Decimal("60.00"), per_km_rate=Decimal("10.00"))
        self.admin = _user("admin", 20)
        self.client.force_authenticate(user=self.admin)
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"

    def test_list_returns_every_tier_with_its_rates(self):
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, 200)
        slugs = {t["slug"] for t in r.data["data"]}
        self.assertEqual(slugs, {"admin-tata-ace", "admin-old-tier", "admin-2w"})
        row = next(t for t in r.data["data"] if t["slug"] == "admin-tata-ace")
        for f in ("base_fare", "per_km_rate", "free_km", "minimum_fare",
                  "loading_unloading_charge", "additional_stop_charge",
                  "surge_multiplier"):
            self.assertIn(f, row)

    def test_list_filters(self):
        self.assertEqual(len(self.client.get(LIST_URL + "?category=two_wheeler").data["data"]), 1)
        self.assertEqual(len(self.client.get(LIST_URL + "?is_active=false").data["data"]), 1)
        self.assertEqual(len(self.client.get(LIST_URL + "?search=scoot").data["data"]), 1)
        self.assertEqual(len(self.client.get(LIST_URL + "?city=Hosur").data["data"]), 3)
        self.assertEqual(len(self.client.get(LIST_URL + "?city=Nowhere").data["data"]), 0)

    def test_inactive_tiers_are_listed_not_hidden(self):
        r = self.client.get(LIST_URL)
        self.assertIn("admin-old-tier", {t["slug"] for t in r.data["data"]})

    def test_retrieve_one_tier(self):
        r = self.client.get(self.url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["data"]["slug"], "admin-tata-ace")

    def test_every_response_carries_the_price_lock_notice(self):
        for resp in (self.client.get(LIST_URL), self.client.get(self.url)):
            self.assertIn("price_lock_notice", resp.data)
            self.assertIn("NEW quotes", resp.data["price_lock_notice"])

    def test_missing_tier_is_404(self):
        self.assertEqual(self.client.get("/api/logistics/admin/tiers/999999/").status_code, 404)

    def test_missing_tier_patch_is_404(self):
        r = self.client.patch("/api/logistics/admin/tiers/999999/", {"per_km_rate": "25.00"}, format="json")
        self.assertEqual(r.status_code, 404)

    def test_direct_rate_mutation_refused_with_409(self):
        r = self.client.patch(self.url, {"per_km_rate": "25.00", "reason": "fuel"}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_direct_descriptive_mutation_refused_with_409(self):
        r = self.client.patch(self.url, {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")
        self.tier.refresh_from_db()
        self.assertTrue(self.tier.is_active)

    def test_direct_mutation_leaves_tier_untouched_in_db(self):
        before = ServiceTier.objects.get(id=self.tier.id)
        self.client.patch(self.url, {"base_fare": "999.00", "capacity_label": "50 tons"}, format="json")
        after = ServiceTier.objects.get(id=self.tier.id)
        self.assertEqual(before.base_fare, after.base_fare)
        self.assertEqual(before.capacity_label, after.capacity_label)


class ListMetaTests(APITestCase):
    """Filter dropdowns the admin screen builds from meta."""

    def setUp(self):
        self.admin = _user("admin", 40)
        self.client.force_authenticate(user=self.admin)
        for i in range(3):
            _tier(slug=f"meta-tier-{i}", name=f"Meta {i}", order=i)
        _tier(city="Bengaluru", slug="meta-blr", name="Meta BLR")

    def test_cities_are_deduplicated(self):
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, 200)
        cities = r.data["meta"]["cities"]
        self.assertEqual(cities, sorted(set(cities)))
        self.assertEqual(sorted(cities), ["Bengaluru", "Hosur"])

    def test_every_tier_is_still_listed(self):
        r = self.client.get(LIST_URL)
        self.assertEqual(len(r.data["data"]), ServiceTier.objects.count())


class PricingAuditTests(APITestCase):
    """Audit trail from CatalogChangeLog read back through the history endpoint."""

    def setUp(self):
        self.tier = _tier()
        self.admin = _user("admin", 50)
        self.client.force_authenticate(user=self.admin)
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"
        self.history_url = f"/api/logistics/admin/tiers/{self.tier.id}/history/"

    def _create_log(self, field_name, old_val, new_val, reason, tier=None):
        target = tier or self.tier
        return CatalogChangeLog.objects.create(
            entity_type=CatalogChangeLog.EntityType.SERVICE_TIER,
            entity_id=target.id,
            entity_name=target.name,
            action=CatalogChangeLog.Action.UPDATE,
            field_name=field_name,
            old_value=old_val,
            new_value=new_val,
            reason=reason,
            changed_by=self.admin,
        )

    def test_history_endpoint_returns_the_trail_newest_first(self):
        self._create_log("per_km_rate", "22.00", "26.00", "first revision")
        self._create_log("per_km_rate", "26.00", "27.00", "second revision")
        r = self.client.get(self.history_url)
        self.assertEqual(r.status_code, 200)
        rows = r.data["data"]
        self.assertEqual(len(rows), 2)
        self.assertEqual([x["new_value"] for x in rows], ["27.00", "26.00"])
        self.assertEqual(rows[0]["reason"], "second revision")
        self.assertTrue(rows[0]["changed_by_name"])

    def test_row_records_old_new_reason_and_actor(self):
        self._create_log("per_km_rate", "22.00", "26.00", "fuel revision")
        r = self.client.get(self.history_url)
        self.assertEqual(r.status_code, 200)
        row = r.data["data"][0]
        self.assertEqual(row["old_value"], "22.00")
        self.assertEqual(row["new_value"], "26.00")
        self.assertEqual(row["reason"], "fuel revision")
        self.assertTrue(row["changed_by_name"])

    def test_history_of_an_unknown_tier_is_404(self):
        r = self.client.get("/api/logistics/admin/tiers/999999/history/")
        self.assertEqual(r.status_code, 404)

    def test_history_is_scoped_to_one_tier(self):
        other = _tier(slug="audit-other", name="Other")
        self._create_log("per_km_rate", "22.00", "26.00", "mine", tier=self.tier)
        self._create_log("per_km_rate", "22.00", "31.00", "theirs", tier=other)
        r = self.client.get(self.history_url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["reason"] for x in r.data["data"]], ["mine"])

    def test_direct_patch_refusal_does_not_create_audit_log(self):
        count_before = CatalogChangeLog.objects.count()
        r = self.client.patch(self.url, {"per_km_rate": "30.00", "reason": "invalid"}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(CatalogChangeLog.objects.count(), count_before)


class PackagePricingWorkflowTests(APITestCase):
    """Authoritative pricing workflow: changes through Catalog > Packages sync to ServiceTier."""

    def setUp(self):
        self.admin = _user("admin", 60)
        self.client.force_authenticate(user=self.admin)
        self.category = CatalogCategory.objects.create(name="Goods and Transport", slug="gt")
        self.service = Service.objects.create(
            category=self.category, name="Tata Ace Service", slug="tata-ace-service",
        )
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug="pkg-tata-ace", name="Tata Ace",
            starting_price=Decimal("400.00"), base_fare=Decimal("220.00"),
            per_km_rate=Decimal("22.00"), free_km=Decimal("3.00"),
        )
        self.package = Package.objects.create(
            service=self.service, name="Tata Ace", slug="pkg-tata-ace",
            base_price=Decimal("400.00"), status=PackageStatus.ACTIVE,
        )

    def test_package_update_synchronizes_pricing_to_linked_tier(self):
        update_package(
            package=self.package,
            data={
                "base_price": "450.00",
                "gt_base_fare": "250.00",
                "gt_per_km_rate": "25.00",
                "gt_free_km": "4.00",
            },
            actor=self.admin,
            reason="Annual tariff revision",
        )
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.starting_price, Decimal("450.00"))
        self.assertEqual(self.tier.base_fare, Decimal("250.00"))
        self.assertEqual(self.tier.per_km_rate, Decimal("25.00"))
        self.assertEqual(self.tier.free_km, Decimal("4.00"))

    def test_package_update_records_audit_trail(self):
        update_package(
            package=self.package,
            data={"base_price": "480.00"},
            actor=self.admin,
            reason="Festival discount adjustment",
        )
        logs = CatalogChangeLog.objects.filter(
            entity_type=CatalogChangeLog.EntityType.PACKAGE,
            entity_id=self.package.id,
        )
        self.assertTrue(logs.exists())


class DirectMutationRefusalTests(APITestCase):
    """Every direct tier mutation attempt is safely and uniformly refused with 409."""

    def setUp(self):
        self.tier = _tier()
        self.client.force_authenticate(user=_user("admin", 70))
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"

    def _patch(self, body):
        return self.client.patch(self.url, body, format="json")

    def test_arbitrary_rate_values_are_refused_with_409(self):
        payloads = [
            {"per_km_rate": "abc", "reason": "garbage"},
            {"per_km_rate": "-1.00", "reason": "negative"},
            {"per_km_rate": None, "reason": "null"},
            {"per_km_rate": "", "reason": "empty"},
            {"surge_multiplier": "0.00", "reason": "zero surge"},
            {"surge_multiplier": "9.99", "reason": "excessive surge"},
        ]
        for p in payloads:
            with self.subTest(payload=p):
                r = self._patch(p)
                self.assertEqual(r.status_code, 409)
                self.assertEqual(r.data["error_code"], "PRICING_MANAGED_VIA_PACKAGE")

    def test_tier_remains_intact_after_all_refused_attempts(self):
        self._patch({"per_km_rate": "abc"})
        self._patch({"base_fare": "-500.00"})
        self._patch({"is_active": False})
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))
        self.assertEqual(self.tier.base_fare, Decimal("220.00"))
        self.assertTrue(self.tier.is_active)


# ═══════════════════════════════════════════════════════════════════════════
# GT audit Updates 6-9 — regression tests for the pricing:modify_price gate
#
# Written this session to close the "missing test coverage" gap flagged
# against all four fixes. NOTE: these tests have been written but NOT YET
# EXECUTED (no working Django test runner was available in this session --
# see the audit findings doc). They are believed correct against the source
# actually read (catalog.py / admin_views.py), but that is source review,
# not a passing test run. Treat as "source verified, runtime unverified"
# exactly like the fixes themselves, until someone actually runs:
#     python manage.py test service_requests.tests.test_gt_pricing_admin
# ═══════════════════════════════════════════════════════════════════════════


class PackageGtPricingRbacTests(APITestCase):
    """Update 6: Package.gt_* fare fields require pricing:modify_price.

    Exercises update_package() directly (matching the existing
    PackagePricingWorkflowTests convention above), since these fields are
    only reachable in production through AdminPackageDetailView.put() ->
    update_package() -- there is no second write path to bypass.
    """

    def setUp(self):
        self.category = CatalogCategory.objects.create(name="Goods and Transport", slug="gt-rbac")
        self.service = Service.objects.create(
            category=self.category, name="Tata Ace Service RBAC", slug="tata-ace-service-rbac",
        )
        self.tier = ServiceTier.objects.create(
            category="truck", city="Hosur", slug="rbac-tata-ace", name="Tata Ace",
            starting_price=Decimal("400.00"), base_fare=Decimal("220.00"),
            per_km_rate=Decimal("22.00"), free_km=Decimal("3.00"),
        )
        self.package = Package.objects.create(
            service=self.service, name="Tata Ace", slug="rbac-tata-ace",
            base_price=Decimal("400.00"), status=PackageStatus.ACTIVE,
            gt_per_km_rate=Decimal("22.00"), gt_base_fare=Decimal("220.00"),
        )

    def test_manager_cannot_change_gt_per_km_rate_and_db_is_unchanged(self):
        manager = _user("manager", 100)
        with self.assertRaises(LogisticsPricingPermissionError):
            update_package(
                package=self.package,
                data={"gt_per_km_rate": Decimal("30.00")},
                actor=manager,
                reason="trying to raise rates",
            )
        self.package.refresh_from_db()
        self.tier.refresh_from_db()
        # Neither the Package nor the synced ServiceTier moved.
        self.assertEqual(self.package.gt_per_km_rate, Decimal("22.00"))
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_finance_cannot_change_gt_base_fare(self):
        finance = _user("finance", 101)
        with self.assertRaises(LogisticsPricingPermissionError):
            update_package(
                package=self.package,
                data={"gt_base_fare": Decimal("999.00")},
                actor=finance,
                reason="budget review",
            )
        self.package.refresh_from_db()
        self.assertEqual(self.package.gt_base_fare, Decimal("220.00"))

    def test_admin_can_change_gt_per_km_rate_and_it_propagates_to_tier(self):
        admin = _user("admin", 102)
        update_package(
            package=self.package,
            data={"gt_per_km_rate": Decimal("28.00")},
            actor=admin,
            reason="fuel surcharge revision",
        )
        self.package.refresh_from_db()
        self.tier.refresh_from_db()
        self.assertEqual(self.package.gt_per_km_rate, Decimal("28.00"))
        # Authorized change on the authoritative Package is picked up by the
        # linked ServiceTier -- this is the "new quotes use the new rate"
        # propagation path, verified at the synced-field level. Proving a
        # brand-new quote's fare_breakdown actually reads this updated
        # ServiceTier row, and that a *previously issued* quote's own
        # fare_breakdown snapshot is untouched by this change, would require
        # exercising the quote-creation flow end-to-end (not done here --
        # flagged as a remaining gap, see the audit findings doc).
        self.assertEqual(self.tier.per_km_rate, Decimal("28.00"))

    def test_admin_change_without_reason_is_rejected_and_db_unchanged(self):
        admin = _user("admin", 103)
        with self.assertRaises(ValidationError):
            update_package(
                package=self.package,
                data={"gt_per_km_rate": Decimal("28.00")},
                actor=admin,
                reason="",
            )
        self.package.refresh_from_db()
        self.assertEqual(self.package.gt_per_km_rate, Decimal("22.00"))

    def test_mixed_payload_blocks_the_whole_update_not_just_the_price_field(self):
        """A descriptive field bundled with an unauthorized price field must
        not be allowed through while the price change is blocked."""
        manager = _user("manager", 104)
        with self.assertRaises(LogisticsPricingPermissionError):
            update_package(
                package=self.package,
                data={
                    "gt_dimensions_label": "6ft x 5ft",
                    "gt_per_km_rate": Decimal("35.00"),
                },
                actor=manager,
                reason="mixed payload attempt",
            )
        self.package.refresh_from_db()
        self.assertEqual(self.package.gt_per_km_rate, Decimal("22.00"))
        self.assertEqual(self.package.gt_dimensions_label, "")

    def test_resending_the_identical_rate_needs_no_elevated_permission(self):
        """A manager touching an unrelated descriptive field, without
        actually changing any price field's value, is not blocked."""
        manager = _user("manager", 105)
        update_package(
            package=self.package,
            data={
                "gt_per_km_rate": Decimal("22.00"),  # identical to current value
                "gt_dimensions_label": "6ft x 5ft",
            },
            actor=manager,
            reason="",
        )
        self.package.refresh_from_db()
        self.assertEqual(self.package.gt_dimensions_label, "6ft x 5ft")
        self.assertEqual(self.package.gt_per_km_rate, Decimal("22.00"))

    def test_malformed_rate_value_is_rejected(self):
        admin = _user("admin", 106)
        with self.assertRaises(Exception):
            with cast(Any, transaction.atomic()):
                update_package(
                    package=self.package,
                    data={"gt_per_km_rate": "not-a-number"},
                    actor=admin,
                    reason="typo",
                )
        self.package.refresh_from_db()
        self.assertEqual(self.package.gt_per_km_rate, Decimal("22.00"))


class AddOnPricingRbacTests(APITestCase):
    """Update 9: AddOn.price requires pricing:modify_price.

    Exercises update_addon() directly, matching the direct-service-call
    convention above -- the exact top-level URL prefix mounting
    settings_hub.urls (AdminAddOnDetailView's route) could not be confirmed
    from source within this audit's time budget, so HTTP-level tests were
    deliberately not written against a guessed URL.
    """

    def setUp(self):
        self.category = CatalogCategory.objects.create(name="Goods and Transport", slug="gt-addon-rbac")
        self.service = Service.objects.create(
            category=self.category, name="Tata Ace Service AddOn", slug="tata-ace-service-addon",
        )
        self.package = Package.objects.create(
            service=self.service, name="Tata Ace", slug="addon-rbac-tata-ace",
            base_price=Decimal("400.00"), status=PackageStatus.ACTIVE,
        )
        self.addon = AddOn.objects.create(
            package=self.package, name="Extra Loader", price=Decimal("150.00"),
        )

    def test_manager_cannot_change_addon_price_and_db_is_unchanged(self):
        manager = _user("manager", 110)
        with self.assertRaises(LogisticsPricingPermissionError):
            update_addon(
                addon=self.addon,
                data={"price": Decimal("300.00")},
                actor=manager,
                reason="trying to raise the fee",
            )
        self.addon.refresh_from_db()
        self.assertEqual(self.addon.price, Decimal("150.00"))

    def test_admin_can_change_addon_price_with_reason(self):
        admin = _user("admin", 111)
        update_addon(
            addon=self.addon,
            data={"price": Decimal("200.00")},
            actor=admin,
            reason="loader rate revision",
        )
        self.addon.refresh_from_db()
        self.assertEqual(self.addon.price, Decimal("200.00"))

    def test_admin_change_without_reason_is_rejected_and_db_unchanged(self):
        admin = _user("admin", 112)
        with self.assertRaises(ValidationError):
            update_addon(
                addon=self.addon,
                data={"price": Decimal("200.00")},
                actor=admin,
                reason="   ",
            )
        self.addon.refresh_from_db()
        self.assertEqual(self.addon.price, Decimal("150.00"))

    def test_resending_the_identical_price_needs_no_elevated_permission(self):
        manager = _user("manager", 113)
        update_addon(
            addon=self.addon,
            data={"price": Decimal("150.00"), "name": "Extra Loader (Renamed)"},
            actor=manager,
            reason="",
        )
        self.addon.refresh_from_db()
        self.assertEqual(self.addon.name, "Extra Loader (Renamed)")
        self.assertEqual(self.addon.price, Decimal("150.00"))

    def test_non_price_field_change_needs_no_elevated_permission(self):
        support = _user("support", 114)
        update_addon(
            addon=self.addon,
            data={"description": "Includes an extra loader for heavy items."},
            actor=support,
            reason="",
        )
        self.addon.refresh_from_db()
        self.assertEqual(self.addon.description, "Includes an extra loader for heavy items.")


class PackersMoversConfigRbacTests(APITestCase):
    """Update 7: PackersMoversConfig rate fields require pricing:modify_price.

    Exercised at the HTTP level against the confirmed route
    /api/logistics/admin/packers-movers-config/ (logistics/urls.py).
    """

    URL = "/api/logistics/admin/packers-movers-config/"

    def setUp(self):
        # AdminPackersMoversConfigView.patch() get-or-creates the config row
        # for a city, defaulting to "Hosur" -- so the first authorized PATCH
        # in each test establishes the row's baseline via that same code
        # path rather than reaching into the model layer directly.
        from logistics.models import PackersMoversConfig
        self.PackersMoversConfig = PackersMoversConfig
        self.config, _ = PackersMoversConfig.objects.get_or_create(
            city="Hosur",
            defaults=dict(
                standard_packing_rate_cft=Decimal("8.00"),
                premium_packing_rate_cft=Decimal("12.00"),
                premium_fragile_addon=Decimal("2.00"),
                floor_rate_no_lift_per_100cft=Decimal("50.00"),
                unpacking_rate_cft=Decimal("4.00"),
                gst_rate=Decimal("0.1800"),
            ),
        )

    def _patch(self, role, body, n):
        self.client.force_authenticate(user=_user(role, n))
        return self.client.patch(self.URL, body, format="json")

    def test_manager_cannot_change_gst_rate_gets_403_and_db_unchanged(self):
        r = self._patch("manager", {"gst_rate": "0.2400", "reason": "tax hike"}, 120)
        self.assertEqual(r.status_code, 403, r.data)
        self.assertEqual(r.data.get("error_code"), "PRICING_FORBIDDEN")
        self.config.refresh_from_db()
        self.assertEqual(self.config.gst_rate, Decimal("0.1800"))

    def test_finance_cannot_change_packing_rate(self):
        r = self._patch("finance", {"standard_packing_rate_cft": "20.00", "reason": "x"}, 121)
        self.assertEqual(r.status_code, 403, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.standard_packing_rate_cft, Decimal("8.00"))

    def test_support_cannot_change_packing_rate(self):
        r = self._patch("support", {"standard_packing_rate_cft": "20.00", "reason": "x"}, 122)
        self.assertEqual(r.status_code, 403, r.data)

    def test_admin_can_change_gst_rate(self):
        r = self._patch("admin", {"gst_rate": "0.2400", "reason": "GST slab change"}, 123)
        self.assertEqual(r.status_code, 200, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.gst_rate, Decimal("0.2400"))

    def test_catalog_role_can_change_packing_rate(self):
        r = self._patch("catalog", {"premium_packing_rate_cft": "15.00", "reason": "premium tier revision"}, 124)
        self.assertEqual(r.status_code, 200, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.premium_packing_rate_cft, Decimal("15.00"))

    def test_manager_can_change_survey_cft_threshold_non_money_field(self):
        r = self._patch("manager", {"survey_cft_threshold": "500"}, 125)
        self.assertEqual(r.status_code, 200, r.data)

    def test_mixed_payload_denies_the_whole_request_not_just_the_price_part(self):
        """The fix's gate returns 403 before any field is applied, so a
        manager bundling a money field with a non-money field gets neither
        change through in one request -- stricter than strictly required,
        but matches "no partial mutation on denial"."""
        r = self._patch(
            "manager",
            {"gst_rate": "0.2400", "survey_cft_threshold": "500", "reason": "bundle"},
            126,
        )
        self.assertEqual(r.status_code, 403, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.gst_rate, Decimal("0.1800"))

    def test_resending_identical_rates_needs_no_elevated_permission(self):
        r = self._patch(
            "manager",
            {"gst_rate": "0.1800", "survey_cft_threshold": "600"},
            127,
        )
        self.assertEqual(r.status_code, 200, r.data)

    def test_negative_rate_value_is_rejected_with_400_not_applied(self):
        r = self._patch("admin", {"gst_rate": "-0.05", "reason": "bad input"}, 128)
        self.assertEqual(r.status_code, 400, r.data)
        self.config.refresh_from_db()
        self.assertEqual(self.config.gst_rate, Decimal("0.1800"))

    def test_malformed_rate_value_is_rejected_with_400(self):
        r = self._patch("admin", {"gst_rate": "abc", "reason": "bad input"}, 129)
        self.assertEqual(r.status_code, 400, r.data)


class GoodsItemSpecialHandlingRbacTests(APITestCase):
    """Update 8: GoodsItem.special_handling_charge requires pricing:modify_price.

    Exercised at the HTTP level against the confirmed route
    /api/logistics/admin/items/<pk>/ (logistics/urls.py).
    """

    def setUp(self):
        from logistics.models import GoodsCategory, GoodsItem
        self.category = GoodsCategory.objects.create(
            slug="furniture-rbac", name="Furniture", order=1,
        )
        self.item = GoodsItem.objects.create(
            category=self.category, slug="sofa-3-seater-rbac", name="3-Seater Sofa",
            default_weight_kg=Decimal("45.00"), default_cft=Decimal("35.00"),
            special_handling_charge=Decimal("100.00"),
        )
        self.url = f"/api/logistics/admin/items/{self.item.id}/"

    def _patch(self, role, body, n):
        self.client.force_authenticate(user=_user(role, n))
        return self.client.patch(self.url, body, format="json")

    def test_manager_cannot_change_special_handling_charge_and_db_unchanged(self):
        r = self._patch("manager", {"special_handling_charge": "250.00"}, 140)
        self.assertEqual(r.status_code, 403, r.data)
        self.assertEqual(r.data.get("error_code"), "PRICING_FORBIDDEN")
        self.item.refresh_from_db()
        self.assertEqual(self.item.special_handling_charge, Decimal("100.00"))

    def test_finance_cannot_change_special_handling_charge(self):
        r = self._patch("finance", {"special_handling_charge": "250.00"}, 141)
        self.assertEqual(r.status_code, 403, r.data)

    def test_admin_can_change_special_handling_charge(self):
        r = self._patch("admin", {"special_handling_charge": "250.00"}, 142)
        self.assertEqual(r.status_code, 200, r.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.special_handling_charge, Decimal("250.00"))

    def test_manager_can_rename_item_non_money_field(self):
        r = self._patch("manager", {"name": "3-Seater Sofa (Fabric)"}, 143)
        self.assertEqual(r.status_code, 200, r.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.name, "3-Seater Sofa (Fabric)")

    def test_resending_identical_charge_needs_no_elevated_permission(self):
        r = self._patch(
            "manager",
            {"special_handling_charge": "100.00", "name": "3-Seater Sofa (Renamed)"},
            144,
        )
        self.assertEqual(r.status_code, 200, r.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.name, "3-Seater Sofa (Renamed)")
        self.assertEqual(self.item.special_handling_charge, Decimal("100.00"))

    def test_negative_charge_is_rejected_with_400(self):
        r = self._patch("admin", {"special_handling_charge": "-10.00"}, 145)
        self.assertEqual(r.status_code, 400, r.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.special_handling_charge, Decimal("100.00"))

    def test_malformed_charge_is_rejected_with_400(self):
        r = self._patch("admin", {"special_handling_charge": "abc"}, 146)
        self.assertEqual(r.status_code, 400, r.data)