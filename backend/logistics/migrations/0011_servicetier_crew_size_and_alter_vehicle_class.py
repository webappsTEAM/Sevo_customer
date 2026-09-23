# Generated additive migration for logistics app.
# Changes ServiceTier.vehicle_class default to blank (fail-closed),
# adds optional crew_size field, and updates capacity help text.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0010_servicetier_vehicle_class"),
    ]

    operations = [
        migrations.AlterField(
            model_name="servicetier",
            name="vehicle_class",
            field=models.CharField(
                blank=True,
                choices=[
                    ("two_wheeler", "Two Wheeler"),
                    ("three_wheeler", "Three Wheeler"),
                    ("truck", "Truck"),
                    ("pickup", "Pickup"),
                    ("heavy_truck", "Heavy Truck"),
                ],
                db_index=True,
                default="",
                help_text="Authoritative vehicle classification (two_wheeler, three_wheeler, truck, pickup, heavy_truck).",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="servicetier",
            name="crew_size",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Configured labor/crew size for relocation tiers. If unset, informational display only.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="max_weight_kg",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Maximum payload capacity in kg. DB field is authoritative. NULL/zero means unconfigured and unavailable for fitment.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="max_cft",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Maximum cargo volume in cubic feet (CFT). DB field is authoritative. NULL/zero means unconfigured and unavailable for fitment.",
                max_digits=8,
                null=True,
            ),
        ),
    ]
