from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Goods & Transport unification, Phase 1: adds the distance-pricing fields
    from logistics.ServiceTier onto Package (gt_-prefixed, all null/blank
    default so this is purely additive -- see the field comments in
    service_requests/models.py). ServiceTier itself is untouched; the sync
    bridge in service_requests/services/catalog.py mirrors these new fields
    onto the matching ServiceTier row so the live fare engine keeps working
    unmodified.
    """

    dependencies = [
        ("service_requests", "0076_vendorcapabilityrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="gt_weight_class",
            field=models.CharField(blank=True, default="", max_length=10, help_text="Goods & Transport only: 'light' or 'heavy' (Mini Truck sub-service tab). Mirrors ServiceTier.weight_class."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_city",
            field=models.CharField(blank=True, default="", max_length=100, help_text="Goods & Transport only: city this pricing applies to. Mirrors ServiceTier.city."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_base_fare",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=10, help_text="Goods & Transport only: fixed component of the distance fare. Mirrors ServiceTier.base_fare."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_per_km_rate",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=8, help_text="Goods & Transport only: per-km charge beyond gt_free_km. Mirrors ServiceTier.per_km_rate."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_free_km",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=6, help_text="Goods & Transport only: distance included in gt_base_fare before gt_per_km_rate applies. Mirrors ServiceTier.free_km."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_loading_unloading_charge",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=10, help_text="Goods & Transport only. Mirrors ServiceTier.loading_unloading_charge."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_additional_stop_charge",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=10, help_text="Goods & Transport only: charged per stop beyond the standard two. Mirrors ServiceTier.additional_stop_charge."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_surge_multiplier",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=4, help_text="Goods & Transport only. Mirrors ServiceTier.surge_multiplier."),
        ),
        migrations.AddField(
            model_name="package",
            name="gt_minimum_fare",
            field=models.DecimalField(blank=True, null=True, decimal_places=2, max_digits=10, help_text="Goods & Transport only: floor applied after everything else. Mirrors ServiceTier.minimum_fare."),
        ),
    ]
