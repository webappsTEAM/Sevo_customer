from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Goods & Transport unification, Phase 2: adds the one ServiceTier display
    field that had no Package equivalent (dimensions_label -- capacity is
    already covered by Package.tag, mirrored to ServiceTier.capacity_label
    since Phase 1). Closes the last field gap before the GT Pricing Rate
    Card admin screen is switched to read-only in favour of editing Package
    directly (see logistics/admin_views.py AdminServiceTierDetailView.patch
    and logistics/admin.py ServiceTierAdmin in this same change).
    """

    dependencies = [
        ("service_requests", "0079_gt_assign_package_subservices"),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="gt_dimensions_label",
            field=models.CharField(blank=True, default="", max_length=100, help_text="Goods & Transport only: display dimensions (e.g. '6ft x 5ft'). Mirrors ServiceTier.dimensions_label -- the one ServiceTier display field with no other Package equivalent (capacity is covered by the Tag field)."),
        ),
    ]
