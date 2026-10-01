# Round 11 (2026-09-30): seed the PTL-scoped GTClaimPolicy default -- Porter-documented
# PTL claim cap of Rs 1,000 and claims window of 3 days (72 hours), distinct from the
# generic goods_transport_truck (Spot) cap of Rs 5,000 / 24h seeded in migration 0117.
#
# Fill-missing-only, same rule used throughout: only creates a row when no active,
# PTL-scoped (applies_to_ptl=True) GTClaimPolicy row already exists for this category,
# so it never overwrites an Admin's own configuration on a re-run.
from django.db import migrations


def seed_ptl_claim_defaults(apps, schema_editor):
    GTClaimPolicy = apps.get_model("service_requests", "GTClaimPolicy")
    if not GTClaimPolicy.objects.filter(applies_to_ptl=True, service_category="goods_transport_truck").exists():
        GTClaimPolicy.objects.create(
            service_category="goods_transport_truck",
            applies_to_ptl=True,
            is_enabled=True,
            included_liability_cap="1000.00",  # Porter-documented (porter.in/part-load-service): PTL cap.
            cap_at_fare=True,                  # Porter: min(freight paid, cap).
            claim_window_hours=72,             # Porter-documented: 3 days from delivery.
            require_photo=True,                # Consistent with the Spot truck claim policy.
            is_active=True,
        )


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op: reversing would delete a row an Admin may since have edited,
    # which would silently change live PTL claims behaviour. Leave the seeded row.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0118_gt_ptl_gaps_round11'),
    ]

    operations = [
        migrations.RunPython(seed_ptl_claim_defaults, noop_reverse),
    ]
