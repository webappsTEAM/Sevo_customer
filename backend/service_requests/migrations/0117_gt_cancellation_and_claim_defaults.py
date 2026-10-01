"""
Gaps 3 & 4 (Round 8 verification vs Porter public GT docs): seed the default,
Admin-editable GT cancellation-fee and claim-cap policies as DATA, not code
constants -- Admin can change every value below afterwards without a deploy.

Fill-missing-only, same rule restore_gt_admin_config uses elsewhere: this migration
only creates a row when the platform-wide (blank service_category) policy does not
already exist, so it never overwrites an Admin's own configuration on a re-run or on
an environment that already has one.

Cancellation fee (GTCancellationPolicy) -- Porter-documented: Porter charges a flat
~Rs 50 cancellation fee, and ONLY once a driver/partner has been assigned; no fee
before assignment. grace_period_seconds=0 is a SEVO interpretation (Porter documents
no grace period) and stays Admin-editable.

Claim / liability cap (GTClaimPolicy) -- Porter-documented: min(freight paid, cap),
cap = Rs 1,500 for two-wheeler, Rs 5,000 for truck; Packers & Movers Rs 1,500
single-layer packing / Rs 5,000 multi-layer-premium packing. GTClaimPolicy is
category-scoped, not packing-tier-scoped, so P&M is seeded at the Rs 5,000
(truck-equivalent) cap with a comment noting the single/multi-layer distinction as a
follow-up rather than inventing a new field for it. Claims window: 24 hours from
delivery. require_photo=True (Porter requires photo evidence).
"""
from django.db import migrations


def seed_defaults(apps, schema_editor):
    GTCancellationPolicy = apps.get_model("service_requests", "GTCancellationPolicy")
    GTClaimPolicy = apps.get_model("service_requests", "GTClaimPolicy")

    if not GTCancellationPolicy.objects.filter(service_category="").exists():
        GTCancellationPolicy.objects.create(
            service_category="",
            fee_mode="FLAT",
            flat_fee_amount="50.00",           # Porter-documented: ~Rs 50 flat.
            percent_fee="0.00",
            applies_only_after_assignment=True,  # Porter-documented: no fee before assignment.
            grace_period_seconds=0,              # SEVO interpretation (Porter documents none); Admin-editable.
            is_active=True,
        )

    two_wheeler_defaults = dict(
        is_enabled=True,
        included_liability_cap="1500.00",  # Porter-documented cap for two-wheeler.
        cap_at_fare=True,                  # Porter: min(freight paid, cap).
        claim_window_hours=24,             # Porter-documented: 24h from delivery.
        require_photo=True,                # Porter requires photo evidence.
        is_active=True,
    )
    truck_defaults = dict(
        is_enabled=True,
        included_liability_cap="5000.00",  # Porter-documented cap for truck.
        cap_at_fare=True,
        claim_window_hours=24,
        require_photo=True,
        is_active=True,
    )
    pm_defaults = dict(
        # P&M cap uses the truck-equivalent Rs 5,000 figure: GTClaimPolicy is
        # category-scoped, not packing-tier-scoped, so the single-layer (Rs 1,500)
        # vs multi-layer/premium (Rs 5,000) distinction Porter documents cannot be
        # represented without a new field -- left as a follow-up per the Round 8
        # scope note rather than guessed at here.
        is_enabled=True,
        included_liability_cap="5000.00",
        cap_at_fare=True,
        claim_window_hours=24,
        require_photo=True,
        is_active=True,
    )

    for category, defaults in (
        ("goods_transport_two_wheeler", two_wheeler_defaults),
        ("goods_transport_truck", truck_defaults),
        ("packers_movers", pm_defaults),
    ):
        if not GTClaimPolicy.objects.filter(service_category=category).exists():
            GTClaimPolicy.objects.create(service_category=category, **defaults)


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op: reversing would delete rows an Admin may since have edited,
    # which would silently change live pricing/claims behaviour. Leave the seeded rows.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0116_eway_bill_fields"),
    ]

    operations = [
        migrations.RunPython(seed_defaults, noop_reverse),
    ]
