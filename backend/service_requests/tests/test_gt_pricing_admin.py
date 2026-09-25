"""
service_requests/tests/test_gt_pricing_admin.py

The Goods & Transport rate-card admin: who may change a rate, what gets
recorded when they do, and what the API refuses.

The permission model here is deliberately per-FIELD. The RBAC matrix already
separates `edit` from `modify_price` on the `pricing` module -- finance and
manager hold `edit`, only admin and catalog hold `modify_price` -- so gating
the endpoint as a whole would either lock finance out of deactivating a tier
or let them rewrite the rate card. These tests pin that distinction, because
it is the sort of thing a later refactor "simplifies" away.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from logistics.models import ServiceTier
from service_requests.models import CatalogChangeLog

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
    """Who can do what, traced through the real RBAC matrix."""

    def setUp(self):
        self.tier = _tier()
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"

    def _patch(self, role, body, n=1):
        self.client.force_authenticate(user=_user(role, n))
        return self.client.patch(self.url, body, format="json")

    # ── may change rates ─────────────────────────────────────────────────

    def test_admin_can_change_a_rate(self):
        r = self._patch("admin", {"per_km_rate": "25.00", "reason": "fuel"})
        self.assertEqual(r.status_code, 200, r.data)
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("25.00"))

    def test_catalog_role_can_change_a_rate(self):
        r = self._patch("catalog", {"per_km_rate": "25.00", "reason": "fuel"}, n=2)
        self.assertEqual(r.status_code, 200, r.data)

    def test_super_admin_can_change_a_rate(self):
        r = self._patch("super_admin", {"per_km_rate": "25.00", "reason": "fuel"}, n=3)
        self.assertEqual(r.status_code, 200, r.data)

    # ── may NOT change rates ─────────────────────────────────────────────

    def test_finance_cannot_change_a_rate(self):
        # finance holds pricing:[view, edit] -- edit, but NOT modify_price.
        r = self._patch("finance", {"per_km_rate": "25.00", "reason": "x"}, n=4)
        self.assertEqual(r.status_code, 403, r.data)
        self.assertEqual(r.data["error_code"], "PRICING_FORBIDDEN")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_manager_cannot_change_a_rate(self):
        r = self._patch("manager", {"per_km_rate": "25.00", "reason": "x"}, n=5)
        self.assertEqual(r.status_code, 403, r.data)
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_support_cannot_change_a_rate(self):
        r = self._patch("support", {"per_km_rate": "25.00", "reason": "x"}, n=6)
        self.assertEqual(r.status_code, 403, r.data)

    def test_a_customer_cannot_even_read_the_rate_card(self):
        # The per-km rate card is not public; the booking pages use the
        # separate customer-facing catalog endpoint.
        self.client.force_authenticate(user=_user("customer", 7))
        self.assertEqual(self.client.get(LIST_URL).status_code, 403)

    def test_anonymous_cannot_read_the_rate_card(self):
        self.assertIn(self.client.get(LIST_URL).status_code, (401, 403))

    # ── the per-field distinction ────────────────────────────────────────

    def test_finance_can_still_deactivate_a_tier(self):
        # It holds pricing:edit. Locking it out of everything would be the
        # wrong reading of the matrix.
        r = self._patch("finance", {"is_active": False}, n=8)
        self.assertEqual(r.status_code, 200, r.data)
        self.tier.refresh_from_db()
        self.assertFalse(self.tier.is_active)

    def test_support_cannot_edit_even_descriptive_fields(self):
        # support holds pricing:[view] only.
        r = self._patch("support", {"is_active": False}, n=9)
        self.assertEqual(r.status_code, 403, r.data)

    def test_a_mixed_payload_is_refused_whole_when_the_rate_is_not_permitted(self):
        # Finance may set is_active but not per_km_rate. The rate is what
        # decides -- a partial apply would be worse than a refusal.
        r = self._patch("finance", {"is_active": False, "per_km_rate": "99.00",
                                    "reason": "x"}, n=10)
        self.assertEqual(r.status_code, 403)
        self.tier.refresh_from_db()
        self.assertTrue(self.tier.is_active)
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))


class PricingCrudAndValidationTests(APITestCase):
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
        # An operator has to be able to find a deactivated tier to reactivate it.
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

    def test_a_rate_change_requires_a_reason(self):
        r = self.client.patch(self.url, {"per_km_rate": "25.00"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error_code"], "REASON_REQUIRED")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_a_descriptive_change_does_not_require_a_reason(self):
        r = self.client.patch(self.url, {"is_active": False}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_a_no_op_save_changes_nothing_and_logs_nothing(self):
        before = CatalogChangeLog.objects.count()
        r = self.client.patch(self.url, {"per_km_rate": "22.00", "base_fare": "220.00",
                                         "reason": "no change"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["changed"], [])
        self.assertEqual(CatalogChangeLog.objects.count(), before)

    def test_equivalent_decimal_spellings_are_not_a_change(self):
        before = CatalogChangeLog.objects.count()
        r = self.client.patch(self.url, {"per_km_rate": 22, "reason": "x"}, format="json")
        self.assertEqual(r.data["changed"], [])
        self.assertEqual(CatalogChangeLog.objects.count(), before)

    # ── validation ───────────────────────────────────────────────────────

    def test_negative_values_are_refused(self):
        for field in ("base_fare", "per_km_rate", "free_km", "minimum_fare",
                      "loading_unloading_charge", "additional_stop_charge"):
            with self.subTest(field=field):
                r = self.client.patch(self.url, {field: "-1.00", "reason": "x"}, format="json")
                self.assertEqual(r.status_code, 400, f"{field} accepted a negative")
                self.assertEqual(r.data["error_code"], "VALIDATION_ERROR")

    def test_surge_must_be_positive_and_bounded(self):
        for bad in ("0.00", "-1.00", "9.99"):
            with self.subTest(surge=bad):
                r = self.client.patch(self.url, {"surge_multiplier": bad, "reason": "x"},
                                      format="json")
                self.assertEqual(r.status_code, 400, f"surge {bad} accepted")

    def test_a_sensible_surge_is_accepted(self):
        r = self.client.patch(self.url, {"surge_multiplier": "1.50", "reason": "diwali"},
                              format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_a_rejected_value_leaves_the_tier_untouched(self):
        self.client.patch(self.url, {"per_km_rate": "-5.00", "reason": "x"}, format="json")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_identity_fields_cannot_be_edited_here(self):
        # slug/category/city are the tier's identity: the seed matches on
        # them and the Package sync maps onto slug.
        r = self.client.patch(self.url, {"slug": "hijacked", "category": "two_wheeler",
                                         "city": "Elsewhere"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.slug, "admin-tata-ace")
        self.assertEqual(self.tier.category, "truck")
        self.assertEqual(self.tier.city, "Hosur")

    def test_a_concurrent_edit_is_refused_rather_than_silently_overwritten(self):
        stale = "2020-01-01T00:00:00+00:00"
        r = self.client.patch(self.url, {"per_km_rate": "30.00", "reason": "x",
                                         "expected_updated_at": stale}, format="json")
        self.assertEqual(r.status_code, 409)
        self.assertEqual(r.data["error_code"], "TIER_CHANGED_ELSEWHERE")
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_a_current_expected_timestamp_is_accepted(self):
        current = self.client.get(self.url).data["data"]["updated_at"]
        r = self.client.patch(self.url, {"per_km_rate": "30.00", "reason": "x",
                                         "expected_updated_at": current}, format="json")
        self.assertEqual(r.status_code, 200, r.data)



class ListMetaTests(APITestCase):
    """
    The filter dropdowns the admin screen builds from `meta`.

    Regression: `meta.cities` was
    ServiceTier.objects.values_list("city", flat=True).distinct(), which does
    NOT collapse duplicates. ServiceTier.Meta.ordering puts category/city/order/
    name in the ORDER BY, Django adds those columns to the SELECT to satisfy it,
    and DISTINCT then applies to the whole row -- so a city with nine tiers
    appeared nine times in the dropdown. Needs more than one tier per city to
    reproduce, which is why it survived until an end-to-end run against a real
    database with the seeded rate card loaded.
    """

    def setUp(self):
        self.admin = _user("admin", 40)
        self.client.force_authenticate(user=self.admin)
        for i in range(3):
            _tier(slug="meta-tier-%d" % i, name="Meta %d" % i, order=i)
        _tier(city="Bengaluru", slug="meta-blr", name="Meta BLR")

    def test_cities_are_deduplicated(self):
        r = self.client.get(LIST_URL)
        self.assertEqual(r.status_code, 200)
        cities = r.data["meta"]["cities"]
        self.assertEqual(cities, sorted(set(cities)),
                         "duplicate cities in the filter list: %r" % (cities,))
        self.assertEqual(sorted(cities), ["Bengaluru", "Hosur"])

    def test_every_tier_is_still_listed(self):
        # The dedup must narrow the dropdown, never the rows themselves.
        r = self.client.get(LIST_URL)
        self.assertEqual(len(r.data["data"]), ServiceTier.objects.count())


class PricingAuditTests(APITestCase):
    """
    The audit trail, written into the EXISTING CatalogChangeLog rather than a
    second audit system, and read back through the history endpoint.

    (Restored after an editing slip truncated this class during the end-to-end
    run; the behaviour it covers has been in place since the feature landed.)
    """

    def setUp(self):
        self.tier = _tier()
        self.admin = _user("admin", 50)
        self.client.force_authenticate(user=self.admin)
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"
        self.history_url = f"/api/logistics/admin/tiers/{self.tier.id}/history/"

    def _rows(self):
        return CatalogChangeLog.objects.filter(
            entity_type=CatalogChangeLog.EntityType.SERVICE_TIER,
            entity_id=self.tier.id,
        )

    def test_one_row_per_changed_field(self):
        r = self.client.patch(
            self.url,
            {"per_km_rate": "26.00", "base_fare": "240.00", "reason": "fuel revision"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(
            sorted(self._rows().values_list("field_name", flat=True)),
            ["base_fare", "per_km_rate"],
        )

    def test_row_records_old_new_reason_and_actor(self):
        self.client.patch(self.url, {"per_km_rate": "26.00", "reason": "fuel revision"},
                          format="json")
        row = self._rows().get(field_name="per_km_rate")
        self.assertEqual(row.old_value, "22.00")
        self.assertEqual(row.new_value, "26.00")
        self.assertEqual(row.reason, "fuel revision")
        self.assertEqual(row.changed_by, self.admin)
        self.assertEqual(row.action, CatalogChangeLog.Action.UPDATE)
        self.assertIn(self.tier.name, row.entity_name)

    def test_a_descriptive_change_is_audited_too(self):
        self.client.patch(self.url, {"capacity_label": "750 kg"}, format="json")
        self.assertEqual(
            list(self._rows().values_list("field_name", flat=True)), ["capacity_label"]
        )

    def test_history_endpoint_returns_the_trail_newest_first(self):
        self.client.patch(self.url, {"per_km_rate": "26.00", "reason": "first"},
                          format="json")
        self.client.patch(self.url, {"per_km_rate": "27.00", "reason": "second"},
                          format="json")
        r = self.client.get(self.history_url)
        self.assertEqual(r.status_code, 200)
        rows = r.data["data"]
        self.assertEqual([x["new_value"] for x in rows], ["27.00", "26.00"])
        self.assertEqual(rows[0]["reason"], "second")
        self.assertTrue(rows[0]["changed_by_name"])

    def test_history_of_an_unknown_tier_is_404(self):
        r = self.client.get("/api/logistics/admin/tiers/999999/history/")
        self.assertEqual(r.status_code, 404)

    def test_history_is_scoped_to_one_tier(self):
        other = _tier(slug="audit-other", name="Other")
        self.client.patch(self.url, {"per_km_rate": "26.00", "reason": "mine"},
                          format="json")
        self.client.patch(f"/api/logistics/admin/tiers/{other.id}/",
                          {"per_km_rate": "31.00", "reason": "theirs"}, format="json")
        r = self.client.get(self.history_url)
        self.assertEqual([x["reason"] for x in r.data["data"]], ["mine"])


class UnparseableRateTests(APITestCase):
    """
    A rate that is present but not a number must be REFUSED, never treated as
    "clear this field".

    Found end-to-end: PATCH {"per_km_rate": "abc"} returned 200 "Rates updated"
    and stored NULL, which switches the tier off the distance formula onto its
    flat starting price. _dec() returns None both for "unset it" and for "that
    is not a number", and the two were collapsed. An empty string and an
    explicit null still mean "clear it" -- only garbage is refused.
    """

    def setUp(self):
        self.tier = _tier()
        self.client.force_authenticate(user=_user("admin", 60))
        self.url = f"/api/logistics/admin/tiers/{self.tier.id}/"

    def _patch(self, body):
        return self.client.patch(self.url, body, format="json")

    def test_garbage_in_a_nullable_rate_is_refused(self):
        r = self._patch({"per_km_rate": "abc", "reason": "typo"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["error_code"], "VALIDATION_ERROR")
        self.assertIn("per_km_rate", r.data["errors"])
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.per_km_rate, Decimal("22.00"))

    def test_garbage_does_not_switch_the_tier_off_distance_pricing(self):
        self._patch({"per_km_rate": "not-a-number", "reason": "typo"})
        self.tier.refresh_from_db()
        self.assertIsNotNone(self.tier.per_km_rate)

    def test_garbage_in_several_rates_reports_every_one(self):
        r = self._patch({"per_km_rate": "abc", "base_fare": "xyz", "reason": "typo"})
        self.assertEqual(r.status_code, 400)
        self.assertEqual(sorted(r.data["errors"]), ["base_fare", "per_km_rate"])

    def test_an_explicit_null_still_clears_a_nullable_rate(self):
        r = self._patch({"per_km_rate": None, "reason": "moving to flat pricing"})
        self.assertEqual(r.status_code, 200)
        self.tier.refresh_from_db()
        self.assertIsNone(self.tier.per_km_rate)

    def test_an_empty_string_still_clears_a_nullable_rate(self):
        r = self._patch({"minimum_fare": "", "reason": "no floor on this tier"})
        self.assertEqual(r.status_code, 200)
        self.tier.refresh_from_db()
        self.assertIsNone(self.tier.minimum_fare)

    def test_a_blank_non_nullable_rate_is_still_refused(self):
        r = self._patch({"free_km": "", "reason": "blank"})
        self.assertEqual(r.status_code, 400)
        self.tier.refresh_from_db()
        self.assertEqual(self.tier.free_km, Decimal("3.00"))

    def test_nothing_is_audited_when_the_payload_is_refused(self):
        self._patch({"per_km_rate": "abc", "reason": "typo"})
        self.assertFalse(
            CatalogChangeLog.objects.filter(
                entity_type=CatalogChangeLog.EntityType.SERVICE_TIER,
                entity_id=self.tier.id,
            ).exists()
        )
