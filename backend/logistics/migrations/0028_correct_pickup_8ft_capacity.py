from django.db import migrations
from decimal import Decimal

# Round 14 (2026-09-30) Admin data reconciliation against current Porter public
# documentation (porter.in/trucks).
#
# Porter's own vehicle page publicly documents "Pickup 8ft" capacity as 1250 kg.
# SEVO's seeded ServiceTier row for this vehicle (slug "pickup-8ft" / name
# "Pickup 8ft (1.2 Ton Capacity)") was configured at 1200 kg (max_weight_kg) --
# an unambiguous, genuine factual mismatch against a Porter-documented value
# (not a SEVO default, not a business decision).
#
# This migration corrects only the two fields that encode that capacity
# (max_weight_kg and the display label) on the existing row. It does not touch
# pricing, active state, city scoping, or any other field, and it is a no-op
# if the row has already been corrected or renamed away from this capacity by
# Admin.

OLD_CAPACITY = Decimal("1200.00")
NEW_CAPACITY = Decimal("1250.00")


def fix_pickup_8ft_capacity(apps, schema_editor):
    ServiceTier = apps.get_model("logistics", "ServiceTier")
    for tier in ServiceTier.objects.filter(
        category="truck", max_weight_kg=OLD_CAPACITY
    ).filter(slug__icontains="pickup-8ft"):
        tier.max_weight_kg = NEW_CAPACITY
        if tier.capacity_label == "1200kg":
            tier.capacity_label = "1250kg"
        if "1.2 Ton" in (tier.name or ""):
            tier.name = tier.name.replace("1.2 Ton", "1.25 Ton")
        tier.save(update_fields=["max_weight_kg", "capacity_label", "name", "updated_at"])


def noop_reverse(apps, schema_editor):
    # Not reversing to the incorrect value; this was a factual correction.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0027_servicetier_effective_from_servicetier_effective_to"),
    ]

    operations = [
        migrations.RunPython(fix_pickup_8ft_capacity, noop_reverse),
    ]
