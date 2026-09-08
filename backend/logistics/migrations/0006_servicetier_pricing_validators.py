# Hand-written for the same reason as 0065-0069 in the service_requests
# series: a plain `makemigrations` cannot complete in this repo because the
# autodetector stops on the UNRELATED Addon.package drift (model says
# null=False/CASCADE, migration 0058 recorded null=True/SET_NULL). Answering
# that question here would smuggle a destructive, unverified schema change
# into an additive migration.
#
# What this adds: validators on ServiceTier's eight pricing fields, now that
# those fields are editable by administrators through an API rather than only
# by a seed command. Non-negative on every monetary/distance field;
# surge_multiplier bounded to 0.01-5.00.
#
# NO-OP AT THE DATABASE. Django validators are enforced in Python
# (full_clean / serializer validation), never as column constraints, so this
# migration emits no ALTER TABLE and cannot fail on existing rows. It exists
# to keep the migration graph in step with models.py.
from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0005_servicetier_additional_stop_charge_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="servicetier",
            name="starting_price",
            field=models.DecimalField(
                decimal_places=2, max_digits=10,
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="base_fare",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True,
                help_text="Fixed component of the fare. Falls back to starting_price when unset.",
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="per_km_rate",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=8, null=True,
                help_text="Per-km charge beyond free_km. Leave unset to keep this tier on flat pricing.",
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="free_km",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=6,
                help_text="Distance included in base_fare before per_km_rate starts applying.",
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="loading_unloading_charge",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="additional_stop_charge",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                help_text="Charged per stop beyond the standard two (one pickup, one drop).",
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="minimum_fare",
            field=models.DecimalField(
                blank=True, decimal_places=2, max_digits=10, null=True,
                help_text="Floor applied after everything else. Unset means no floor.",
                validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
            ),
        ),
        migrations.AlterField(
            model_name="servicetier",
            name="surge_multiplier",
            field=models.DecimalField(
                decimal_places=2, default=1, max_digits=4,
                help_text=(
                    "Applied to the whole computed fare. A configurable per-tier value, "
                    "not a live demand engine -- time-band/demand surge is its own system."
                ),
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01")),
                    django.core.validators.MaxValueValidator(Decimal("5.00")),
                ],
            ),
        ),
    ]
