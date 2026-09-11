"""
Goods & Transport unification: one-time repair for the rename/orphan bug
gt_service_tier_id (0082) exists to prevent going forward.

Before 0082, a Package's link to its ServiceTier was resolved purely by
matching Package.slug against ServiceTier.slug on every save. Renaming or
replacing a Goods & Transport package (e.g. "3 Wheeler" -> "Eacher")
silently broke that match: the OLD tier ("3 Wheeler") was never updated or
deactivated again and kept showing stale data on the customer booking page,
while the renamed/new package's pricing was never mirrored to any tier at
all, so it never appeared to customers.

This migration, in order, for every Package under a Goods & Transport
service (Mini Truck / 2-Wheeler / Packers & Movers, matched the same way
0078/0079 did):
  1. Links it to its ServiceTier by exact slug or the canonical
     Packers & Movers slug alias, if not already linked.
  2. If still unmatched, CREATES the ServiceTier it should have had all
     along, from the package's own current fields -- this is what makes an
     already-renamed package like "Eacher" appear on the customer site
     immediately, without an admin having to re-save it.
  3. Deactivates (does not delete -- non-destructive, and existing bookings
     may still reference these rows) every ServiceTier in these three
     categories that no Package ends up linked to after the above. This is
     what removes stale cards like an old "3 Wheeler"/"Tata Ace" tier whose
     package was renamed away or deleted.

Idempotent and safe to re-run. No reverse (reactivating tiers a later,
unrelated admin action may have deliberately deactivated is not something
this migration can tell apart from tiers it deactivated itself).
"""
from django.db import migrations


_GT_GROUPS = [
    (("truck",), "truck"),
    (("two-wheeler", "2-wheeler", "wheeler"), "two_wheeler"),
    (("packers", "mover"), "packers_movers"),
]

# Mirrors service_requests/services/catalog.py's CANONICAL_LOGISTICS_TIER_SLUG_MAP.
_CANONICAL_TIER_SLUG_MAP = {
    "1-rk-1-bhk-shifting": "1rk-1bhk-shifting",
    "1rk-1bhk-shifting": "1rk-1bhk-shifting",
    "2-bhk-3-bhk-shifting": "2bhk-3bhk-shifting",
    "2bhk-3bhk-shifting": "2bhk-3bhk-shifting",
    "villa-office-relocation": "villa-office-relocation",
}


def _category_for_service_slug(slug):
    slug = (slug or "").lower()
    for substrings, category in _GT_GROUPS:
        if any(s in slug for s in substrings):
            return category
    return None


def _tier_defaults_from_package(pkg, category):
    price = pkg.base_price if pkg.base_price is not None else (pkg.offer_price or 0)
    city = (pkg.gt_city or "hosur").strip().lower() or "hosur"
    return dict(
        category=category,
        name=pkg.name,
        capacity_label=pkg.tag or "Standard",
        starting_price=price,
        description=pkg.description or "",
        city=city,
        is_active=(pkg.status == "ACTIVE"),
        duration=pkg.duration or "",
        image=pkg.image or "",
        weight_class=pkg.gt_weight_class or "",
        dimensions_label=getattr(pkg, "gt_dimensions_label", "") or "",
        base_fare=pkg.gt_base_fare,
        per_km_rate=pkg.gt_per_km_rate,
        free_km=pkg.gt_free_km if pkg.gt_free_km is not None else 0,
        loading_unloading_charge=pkg.gt_loading_unloading_charge if pkg.gt_loading_unloading_charge is not None else 0,
        additional_stop_charge=pkg.gt_additional_stop_charge if pkg.gt_additional_stop_charge is not None else 0,
        surge_multiplier=pkg.gt_surge_multiplier if pkg.gt_surge_multiplier is not None else 1,
        minimum_fare=pkg.gt_minimum_fare,
    )


def relink_and_prune(apps, schema_editor):
    Service = apps.get_model("service_requests", "Service")
    Package = apps.get_model("service_requests", "Package")
    try:
        ServiceTier = apps.get_model("logistics", "ServiceTier")
    except LookupError:
        return  # logistics app not installed in this environment -- nothing to do

    linked_tier_ids = set()

    for service in Service.objects.all().iterator():
        category = _category_for_service_slug(service.slug)
        if not category:
            continue

        for pkg in Package.objects.filter(service=service).iterator():
            tier = None

            if pkg.gt_service_tier_id:
                tier = ServiceTier.objects.filter(pk=pkg.gt_service_tier_id).first()

            if tier is None:
                pkg_slug = (pkg.slug or "").strip().lower()
                if pkg_slug:
                    tier = ServiceTier.objects.filter(slug=pkg_slug).first()
                    if tier is None:
                        canonical = _CANONICAL_TIER_SLUG_MAP.get(pkg_slug)
                        if canonical and canonical != pkg_slug:
                            tier = ServiceTier.objects.filter(slug=canonical).first()

            if tier is None:
                # No existing tier matches this package at all -- create the
                # one it should have had, so it starts showing to customers
                # immediately instead of waiting for the next admin save.
                tier = ServiceTier.objects.create(
                    slug=pkg.slug or f"pkg-{pkg.pk}",
                    **_tier_defaults_from_package(pkg, category),
                )

            if pkg.gt_service_tier_id != tier.id:
                pkg.gt_service_tier_id = tier.id
                pkg.save(update_fields=["gt_service_tier_id"])

            linked_tier_ids.add(tier.id)

    # Prune: any tier in these three categories that no Package ended up
    # linked to is stale/orphaned (its package was renamed away or
    # deleted before gt_service_tier_id existed to keep the link honest).
    # Deactivated, not deleted.
    all_categories = [category for _, category in _GT_GROUPS]
    (
        ServiceTier.objects
        .filter(category__in=all_categories, is_active=True)
        .exclude(id__in=linked_tier_ids)
        .update(is_active=False)
    )


def noop_reverse(apps, schema_editor):
    # Deliberately a no-op -- see module docstring.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0082_package_gt_service_tier_id"),
        # Cross-app dependency: _tier_defaults_from_package below sets
        # ServiceTier.image, which logistics migration 0007 is what adds --
        # without this, `migrate` could apply this one first on a fresh
        # database and crash on an unknown field.
        ("logistics", "0007_servicetier_image"),
    ]

    operations = [
        migrations.RunPython(relink_and_prune, noop_reverse),
    ]
