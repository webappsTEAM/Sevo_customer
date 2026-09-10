"""
Goods & Transport unification, Phase 1 (continued): seeds the "Sub-Service"
tabs (Service.customization.subtabs) for the three Goods & Transport
services -- Mini Truck, 2-Wheeler, Packers & Movers -- per the user's
explicit answer "All three should get sub-services", not just Mini Truck's
pre-existing Light/Heavy split.

Groupings mirror the real categories already seeded in
logistics/management/commands/seed_logistics_hosur.py:
  - Mini Truck        -> Light / Heavy            (ServiceTier.weight_class)
  - 2-Wheeler         -> Standard / Electric-Express (the 2 existing tiers)
  - Packers & Movers  -> Residential Shifting / Villa & Office Relocation
                         (1RK-1BHK + 2BHK-3BHK vs villa-office-relocation)

This is purely additive and idempotent: it MERGES these subtabs into
whatever `customization` a matching Service already has (by subtab id), so
it never clobbers banner images or extra subtabs an admin already configured
via Catalog > Sub-Services. A Service with no gt-style slug match is left
completely untouched. Assigning existing Packages to these subtabs
(Package.sub_service_key) is left to the admin via the normal Package edit
modal -- this migration only creates the tabs to assign into, since which
existing package belongs in which tab is a business call, not something
inferable safely from schema alone.

No reverse migration: removing subtabs an admin may have since edited
further (added images, renamed labels) risks destroying real admin work,
so this is intentionally a data migration with a no-op reverse.
"""
from django.db import migrations


# (slug-substring match against Service.slug, same substrings the sync
# bridge in services/catalog.py uses to resolve a Package's LogisticsCategory)
# -> subtabs to merge in.
_GT_SUBTAB_SEEDS = [
    (("truck",), [
        {"id": "light", "label": "Light"},
        {"id": "heavy", "label": "Heavy"},
    ]),
    (("two-wheeler", "2-wheeler", "wheeler"), [
        {"id": "standard", "label": "Standard"},
        {"id": "electric_express", "label": "Electric / Express"},
    ]),
    (("packers", "mover"), [
        {"id": "residential", "label": "Residential Shifting (1RK - 3BHK)"},
        {"id": "villa_office", "label": "Villa & Office Relocation"},
    ]),
]


def seed_gt_subtabs(apps, schema_editor):
    Service = apps.get_model("service_requests", "Service")

    for services_qs_slug_lower in Service.objects.all().iterator():
        slug = (services_qs_slug_lower.slug or "").lower()
        for substrings, seed_tabs in _GT_SUBTAB_SEEDS:
            if not any(s in slug for s in substrings):
                continue

            service = services_qs_slug_lower
            customization = service.customization if isinstance(service.customization, dict) else {}
            existing_subtabs = customization.get("subtabs")
            existing_subtabs = existing_subtabs if isinstance(existing_subtabs, list) else []
            existing_ids = {t.get("id") for t in existing_subtabs if isinstance(t, dict)}

            merged = list(existing_subtabs)
            changed = False
            for tab in seed_tabs:
                if tab["id"] not in existing_ids:
                    merged.append(dict(tab))
                    changed = True

            if changed:
                customization["subtabs"] = merged
                service.customization = customization
                service.save(update_fields=["customization"])
            # A service's slug should only match one of the three groups
            # above, but break defensively either way once handled.
            break


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op -- see module docstring.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0077_package_gt_pricing_fields"),
    ]

    operations = [
        migrations.RunPython(seed_gt_subtabs, noop_reverse),
    ]
