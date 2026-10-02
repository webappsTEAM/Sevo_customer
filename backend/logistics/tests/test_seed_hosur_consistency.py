"""Regression tests for seed_logistics_hosur (found in browser QA, 2026-09-30).

1. Pickup 8ft capacity label ("1250 kg") must equal max_weight_kg (was 1200).
2. Re-seeding must not create a 'Hosur' twin of an existing 'hosur' tier/lane:
   the unique key is case-sensitive but every customer read is city__iexact, so a
   twin showed customers duplicate vehicles with identical slugs.
"""
from decimal import Decimal
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from logistics.models import Lane, ServiceTier


def _seed():
    call_command("seed_logistics_hosur", stdout=StringIO())


class SeedHosurConsistencyTests(TestCase):
    def test_pickup_8ft_capacity_matches_label(self):
        _seed()
        t = ServiceTier.objects.get(category="truck", city__iexact="hosur", slug="pickup-8ft")
        self.assertEqual(t.max_weight_kg, Decimal("1250.00"))
        self.assertIn("1250", t.capacity_label)

    def test_reseed_does_not_duplicate_across_city_case(self):
        _seed()
        ServiceTier.objects.filter(city="Hosur").update(city="hosur")
        Lane.objects.filter(city="Hosur").update(city="hosur")
        tiers, lanes = ServiceTier.objects.count(), Lane.objects.count()
        _seed()
        self.assertEqual(ServiceTier.objects.count(), tiers)
        self.assertEqual(Lane.objects.count(), lanes)
        slugs = list(ServiceTier.objects.filter(category="truck", city__iexact="hosur").values_list("slug", flat=True))
        self.assertEqual(len(slugs), len(set(slugs)))
