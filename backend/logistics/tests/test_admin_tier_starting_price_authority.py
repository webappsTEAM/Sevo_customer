"""Admin tier 'Starting price' must be the calculated floor customers see,
with the drifting mirrored column exposed separately."""
from decimal import Decimal
from django.test import TestCase
from logistics.models import ServiceTier, LogisticsCategory
from logistics.serializers import ServiceTierPricingSerializer, ServiceTierSerializer


class AdminStartingPriceTests(TestCase):
    def test_admin_matches_customer_and_exposes_stored_mirror(self):
        t = ServiceTier.objects.create(
            category=LogisticsCategory.TRUCK, city="Hosur", slug="qa-ace", name="QA Ace",
            starting_price=Decimal("999.00"),             # drifted mirror
            base_fare=Decimal("150.00"), per_km_rate=Decimal("12.00"), free_km=Decimal("2"),
            minimum_fare=Decimal("200.00"), loading_unloading_charge=Decimal("40.00"),
            max_weight_kg=750, max_cft=Decimal("100"))
        admin = ServiceTierPricingSerializer(t).data
        cust = ServiceTierSerializer(t).data
        self.assertEqual(admin["starting_price"], cust["starting_price"])
        self.assertEqual(Decimal(admin["starting_price"]), Decimal("200.00"))   # max(150+40, min 200)
        self.assertEqual(Decimal(admin["starting_price_stored"]), Decimal("999.00"))
        self.assertEqual(admin["pricing_authority"], "package")
