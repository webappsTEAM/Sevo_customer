import decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds explicit bounds (0.01-5.00, matching logistics.ServiceTier.surge_multiplier)
    to Package.gt_surge_multiplier so a mistyped value (e.g. a price typed
    into this field by habit) fails validation with a clear "must be between
    0.01 and 5.00" message instead of the more confusing generic DecimalField
    "no more than 2 digits before the decimal point" error.
    """

    dependencies = [
        ("service_requests", "0080_package_gt_dimensions_label"),
    ]

    operations = [
        migrations.AlterField(
            model_name="package",
            name="gt_surge_multiplier",
            field=models.DecimalField(
                blank=True, null=True, decimal_places=2, max_digits=4,
                validators=[
                    django.core.validators.MinValueValidator(decimal.Decimal("0.01")),
                    django.core.validators.MaxValueValidator(decimal.Decimal("5.00")),
                ],
                help_text="Goods & Transport only: a small multiplier (1.00 = no surge, max 5.00) -- NOT a rupee amount. Mirrors ServiceTier.surge_multiplier.",
            ),
        ),
    ]
