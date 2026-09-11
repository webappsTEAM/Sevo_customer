from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Fixes a real bug found in production use: renaming or replacing a Goods
    & Transport package broke its link to the live ServiceTier row, because
    that link was resolved purely by matching Package.slug against
    ServiceTier.slug on every save. A renamed package (e.g. "3 Wheeler" ->
    "Eacher") stopped matching its old tier, so: the old tier was never
    updated or deactivated and kept showing stale data to customers, and the
    renamed package's own pricing was never mirrored anywhere because no
    tier matched the new slug either -- it silently never appeared on the
    customer booking page at all.

    This field records that link explicitly and permanently once
    established, so it survives any later slug/name change. See
    services/catalog.py's _logistics_tier_for_package for the lookup order.
    """

    dependencies = [
        ("service_requests", "0081_package_gt_surge_multiplier_bounds"),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="gt_service_tier_id",
            field=models.IntegerField(blank=True, null=True, db_index=True, help_text="Goods & Transport only: id of the logistics.ServiceTier this package is mirrored to. Set automatically by the sync bridge."),
        ),
    ]
