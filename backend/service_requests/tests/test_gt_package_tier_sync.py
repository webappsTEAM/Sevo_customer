"""
service_requests/tests/test_gt_package_tier_sync.py

Editing one catalog Package must never move a different tier's price.

The old matcher fell back to substring comparison:

    if t.slug in pkg.slug or pkg.slug in t.slug or t.name.lower() in pkg.name.lower()

The live catalogue contains "2-wheeler" and "2-wheeler-electric-express", and
the first is a substring of the second -- so editing the express package's
price rewrote the plain scooter's fare, and which tier won depended on the
order ServiceTier.objects.all() happened to return. A price is not something
to resolve by guessing.
"""
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from logistics.models import ServiceTier
from service_requests.models import CatalogCategory, Package, PackageStatus, Service
from service_requests.services.catalog import _logistics_tier_for_package, update_package

User = get_user_model()


class PackageTierSyncTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            username="sync_admin", email="sync@example.com",
            phone="9000111222", role="admin",
        )
        self.category = CatalogCategory.objects.create(name="Goods & Transport", slug="gt")
        self.service = Service.objects.create(
            category=self.category, name="Two Wheeler", slug="two-wheeler-service",
        )
        self.plain = ServiceTier.objects.create(
            category="two_wheeler", city="Hosur", slug="2-wheeler", name="2 Wheeler",
            starting_price=Decimal("48.00"), base_fare=Decimal("50.00"),
            per_km_rate=Decimal("10.00"),
        )
        self.express = ServiceTier.objects.create(
            category="two_wheeler", city="Hosur", slug="2-wheeler-electric-express",
            name="2 Wheeler Electric / Express", starting_price=Decimal("55.00"),
            base_fare=Decimal("60.00"), per_km_rate=Decimal("11.00"),
        )
        self.pm_1rk = ServiceTier.objects.create(
            category="packers_movers", city="Hosur", slug="1rk-1bhk-shifting",
            name="1 RK / 1 BHK Shifting", starting_price=Decimal("2000.00"),
        )
        self.pm_2bhk = ServiceTier.objects.create(
            category="packers_movers", city="Hosur", slug="2bhk-3bhk-shifting",
            name="2 BHK / 3 BHK Shifting", starting_price=Decimal("2999.00"),
        )

    def _package(self, slug, name, price):
        return Package.objects.create(
            service=self.service, name=name, slug=slug,
            base_price=Decimal(price), status=PackageStatus.ACTIVE,
        )

    # ── the matcher itself ───────────────────────────────────────────────

    def test_exact_slug_matches(self):
        pkg = self._package("2-wheeler", "2 Wheeler", "48.00")
        self.assertEqual(_logistics_tier_for_package(pkg), self.plain)

    def test_a_longer_slug_does_not_match_a_shorter_tier(self):
        # The exact bug: "2-wheeler" is a substring of this slug.
        pkg = self._package("2-wheeler-electric-express", "Express", "55.00")
        self.assertEqual(_logistics_tier_for_package(pkg), self.express)

    def test_an_unrelated_package_matches_nothing(self):
        pkg = self._package("deep-cleaning-2bhk", "Deep Cleaning 2BHK", "999.00")
        self.assertIsNone(_logistics_tier_for_package(pkg))

    def test_a_package_with_no_slug_matches_nothing(self):
        pkg = self._package("", "No Slug", "10.00")
        self.assertIsNone(_logistics_tier_for_package(pkg))

    def test_name_similarity_alone_never_matches(self):
        # The old matcher also compared names.
        pkg = self._package("some-other-slug", "2 Wheeler", "48.00")
        self.assertIsNone(_logistics_tier_for_package(pkg))

    # ── the behaviour that was broken ────────────────────────────────────

    def test_editing_the_express_package_never_touches_the_plain_scooter(self):
        pkg = self._package("2-wheeler-electric-express", "Express", "55.00")
        update_package(pkg, {"base_price": Decimal("77.00")}, self.actor, reason="test")

        self.plain.refresh_from_db()
        self.express.refresh_from_db()
        self.assertEqual(self.plain.starting_price, Decimal("48.00"), "the scooter moved")
        self.assertEqual(self.express.starting_price, Decimal("77.00"))

    def test_editing_the_plain_scooter_never_touches_the_express(self):
        pkg = self._package("2-wheeler", "2 Wheeler", "48.00")
        update_package(pkg, {"base_price": Decimal("52.00")}, self.actor, reason="test")

        self.plain.refresh_from_db()
        self.express.refresh_from_db()
        self.assertEqual(self.plain.starting_price, Decimal("52.00"))
        self.assertEqual(self.express.starting_price, Decimal("55.00"), "the express moved")

    def test_a_non_logistics_package_moves_no_tier_at_all(self):
        pkg = self._package("deep-cleaning-2bhk", "Deep Cleaning 2BHK", "999.00")
        update_package(pkg, {"base_price": Decimal("1200.00")}, self.actor, reason="test")
        self.plain.refresh_from_db()
        self.express.refresh_from_db()
        self.assertEqual(self.plain.starting_price, Decimal("48.00"))
        self.assertEqual(self.express.starting_price, Decimal("55.00"))

    def test_the_sync_never_touches_the_distance_rate_card(self):
        # Package carries one price; the seven distance fields are the rate
        # card's, owned by the pricing admin. A package edit must not reach
        # them even for the tier it does match.
        pkg = self._package("2-wheeler", "2 Wheeler", "48.00")
        update_package(pkg, {"base_price": Decimal("52.00")}, self.actor, reason="test")
        self.plain.refresh_from_db()
        self.assertEqual(self.plain.base_fare, Decimal("50.00"))
        self.assertEqual(self.plain.per_km_rate, Decimal("10.00"))

    # ── failures must be visible ─────────────────────────────────────────

    def test_a_sync_failure_is_logged_and_does_not_lose_the_package_edit(self):
        pkg = self._package("2-wheeler", "2 Wheeler", "48.00")
        with patch("service_requests.services.catalog._logistics_tier_for_package",
                   side_effect=RuntimeError("db gone")):
            with self.assertLogs("service_requests.services.catalog", level="ERROR") as logs:
                update_package(pkg, {"base_price": Decimal("52.00")}, self.actor, reason="t")
        self.assertTrue(any("Could not sync Package" in m for m in logs.output))
        pkg.refresh_from_db()
        self.assertEqual(pkg.base_price, Decimal("52.00"), "the package edit was rolled back")

    def test_the_sync_no_longer_swallows_failures_silently(self):
        # Structural guard: the two sync blocks must not go back to `pass`.
        import inspect
        from service_requests.services import catalog

        src = inspect.getsource(catalog)
        for marker in ("Could not sync Package", "Could not sync new Package"):
            self.assertIn(marker, src, f"the {marker!r} log line is gone")

    # ── P&M slug reconciliation regression tests (Defect A) ──────────────

    def test_pm_hyphenated_slug_matches_canonical_compact_tier(self):
        pkg_1rk = self._package("1-rk-1-bhk-shifting", "1 RK / 1 BHK Shifting", "1499.00")
        self.assertEqual(_logistics_tier_for_package(pkg_1rk), self.pm_1rk)

    def test_pm_2bhk_3bhk_hyphenated_slug_matches_compact_tier(self):
        pkg_2bhk = self._package("2-bhk-3-bhk-shifting", "2 BHK / 3 BHK Shifting", "2999.00")
        self.assertEqual(_logistics_tier_for_package(pkg_2bhk), self.pm_2bhk)

    def test_pm_package_price_sync_updates_tier_starting_price(self):
        pkg = self._package("1-rk-1-bhk-shifting", "1 RK / 1 BHK Shifting", "1499.00")
        update_package(pkg, {"base_price": Decimal("2100.00")}, self.actor, reason="P&M price adjustment")
        self.pm_1rk.refresh_from_db()
        self.assertEqual(self.pm_1rk.starting_price, Decimal("2100.00"))

    def test_pm_tier_price_sync_updates_package_base_price(self):
        from logistics.pricing_admin import update_tier_pricing
        pkg = self._package("1-rk-1-bhk-shifting", "1 RK / 1 BHK Shifting", "1499.00")
        update_tier_pricing(self.pm_1rk, {"starting_price": Decimal("2250.00")}, self.actor, reason="Admin GT Rates update")
        pkg.refresh_from_db()
        self.assertEqual(pkg.base_price, Decimal("2250.00"))
