"""
Goods & Transport unification, Phase 1 (continued): auto-assigns EXISTING
Mini Truck / 2-Wheeler / Packers & Movers packages to the sub-service tabs
seeded by 0078 (Light/Heavy, Standard/Electric-Express, Residential/Villa),
so admins don't have to do this by hand for packages that already exist.

Assignment is best-effort, name/slug based, and NEVER overwrites a
sub_service_key an admin has already set (blank-only), so this is safe to
re-run and safe even if an admin has already started assigning packages
manually in the UI. A package this migration can't confidently classify is
left blank -- same as today -- rather than guessing.

Truck packages are classified by, in priority order:
  1. The weight_class already on the matching logistics.ServiceTier (found
     via the same exact/canonical-alias slug resolution
     services/catalog.py._logistics_tier_for_package uses).
  2. A slug/tag keyword match against the known Hosur tier names
     (3-wheeler/tata-ace -> light, pickup-8ft/1-7-ton or "heavy" in the
     slug/tag -> heavy) -- the same vehicles seeded by
     logistics/management/commands/seed_logistics_hosur.py.
Truck packages that match neither are left unassigned.

2-Wheeler and Packers & Movers packages are classified purely by slug
keyword ("electric"/"express" -> electric_express; "villa"/"office" ->
villa_office; everything else defaults to the base tab, since both flows
only have two tabs and the non-special one is the common case).

When a truck package IS classified here, its new gt_weight_class field
(added in 0077) is also backfilled to match if it was still blank --
that's the field the sync bridge in services/catalog.py mirrors onto
ServiceTier.weight_class, so the pricing sheet stays consistent with the
sub-service tab the package now sits under.
"""
from django.db import migrations

# Mirrors service_requests/services/catalog.py's CANONICAL_LOGISTICS_TIER_SLUG_MAP.
_CANONICAL_TIER_SLUG_MAP = {
    "1-rk-1-bhk-shifting": "1rk-1bhk-shifting",
    "1rk-1bhk-shifting": "1rk-1bhk-shifting",
    "2-bhk-3-bhk-shifting": "2bhk-3bhk-shifting",
    "2bhk-3bhk-shifting": "2bhk-3bhk-shifting",
    "villa-office-relocation": "villa-office-relocation",
}

_LIGHT_SLUG_HINTS = ("3-wheeler", "tata-ace", "3wheeler", "tataace")
_HEAVY_SLUG_HINTS = ("pickup-8ft", "1-7-ton", "1-7ton", "17-ton", "pickup8ft", "heavy")


def _resolve_tier(ServiceTier, slug):
    if not slug:
        return None
    tier = ServiceTier.objects.filter(slug=slug).first()
    if tier:
        return tier
    canonical = _CANONICAL_TIER_SLUG_MAP.get(slug)
    if canonical and canonical != slug:
        return ServiceTier.objects.filter(slug=canonical).first()
    return None


def assign_gt_subservices(apps, schema_editor):
    Service = apps.get_model("service_requests", "Service")
    Package = apps.get_model("service_requests", "Package")
    try:
        ServiceTier = apps.get_model("logistics", "ServiceTier")
    except LookupError:
        ServiceTier = None

    for service in Service.objects.all().iterator():
        slug = (service.slug or "").lower()

        if "truck" in slug:
            group = "truck"
        elif "two-wheeler" in slug or "2-wheeler" in slug or "wheeler" in slug:
            group = "two_wheeler"
        elif "packers" in slug or "mover" in slug:
            group = "packers_movers"
        else:
            continue

        for package in Package.objects.filter(service=service).iterator():
            if (package.sub_service_key or "").strip():
                continue  # never override an admin's existing choice

            pkg_slug = (package.slug or "").lower()
            pkg_tag = (package.tag or "").lower()
            sub_key = None
            weight_class = None

            if group == "truck":
                tier = _resolve_tier(ServiceTier, pkg_slug) if ServiceTier else None
                if tier is not None and tier.weight_class:
                    weight_class = tier.weight_class
                elif any(h in pkg_slug or h in pkg_tag for h in _LIGHT_SLUG_HINTS):
                    weight_class = "light"
                elif any(h in pkg_slug or h in pkg_tag for h in _HEAVY_SLUG_HINTS):
                    weight_class = "heavy"
                if weight_class in ("light", "heavy"):
                    sub_key = weight_class

            elif group == "two_wheeler":
                sub_key = "electric_express" if ("electric" in pkg_slug or "express" in pkg_slug) else "standard"

            elif group == "packers_movers":
                sub_key = "villa_office" if ("villa" in pkg_slug or "office" in pkg_slug) else "residential"

            if not sub_key:
                continue

            update_fields = ["sub_service_key"]
            package.sub_service_key = sub_key
            if group == "truck" and weight_class and not (package.gt_weight_class or "").strip():
                package.gt_weight_class = weight_class
                update_fields.append("gt_weight_class")
            package.save(update_fields=update_fields)


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op: unassigning sub_service_key on reverse could wipe
    # out an admin's own manual assignments made after this ran, which this
    # migration has no way to distinguish from its own writes.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0078_gt_seed_subservices"),
    ]

    operations = [
        migrations.RunPython(assign_gt_subservices, noop_reverse),
    ]
