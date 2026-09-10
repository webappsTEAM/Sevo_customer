# Hand-written additive migration for logistics app.
# Follows repo baseline: avoids autodetector stop on unrelated Addon.package drift.
from decimal import Decimal
import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0008_goodscategory_goodsitem_is_prohibited"),
    ]

    operations = [
        migrations.CreateModel(
            name="PackersMoversConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("city", models.CharField(db_index=True, default="Hosur", max_length=50, unique=True)),
                (
                    "standard_packing_rate_cft",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("3.50"),
                        help_text="Standard packing rate per CFT in INR",
                        max_digits=8,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "premium_packing_rate_cft",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("6.00"),
                        help_text="Premium 4-layer fragile packing rate per CFT in INR",
                        max_digits=8,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "premium_fragile_addon",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("200.00"),
                        help_text="Additional fixed surcharge per fragile item in premium tier",
                        max_digits=8,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "floor_rate_no_lift_per_100cft",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("120.00"),
                        help_text="Surcharge per floor without elevator per 100 CFT block",
                        max_digits=8,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "unpacking_rate_cft",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("2.00"),
                        help_text="Unpacking rate per CFT in INR",
                        max_digits=8,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.00"))],
                    ),
                ),
                (
                    "gst_rate",
                    models.DecimalField(
                        decimal_places=4,
                        default=Decimal("0.1800"),
                        help_text="GST decimal rate (e.g. 0.1800 for 18% GST)",
                        max_digits=5,
                        validators=[django.core.validators.MinValueValidator(Decimal("0.0000"))],
                    ),
                ),
                (
                    "survey_cft_threshold",
                    models.FloatField(
                        default=500.0,
                        help_text="Moves exceeding this CFT volume require an on-site / video survey before binding contract",
                        validators=[django.core.validators.MinValueValidator(50.0)],
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Packers & Movers Configuration",
                "verbose_name_plural": "Packers & Movers Configurations",
                "ordering": ["city"],
            },
        ),
    ]
