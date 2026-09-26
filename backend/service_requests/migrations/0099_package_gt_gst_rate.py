from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0098_merge_20260926_1013"),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="gt_gst_rate",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text=(
                    "Goods & Transport only: GST percentage already INCLUDED in the fare (18.00 = 18%). The fare does not "
                    "change; invoices show the GST component. Enter 0 to remove GST; blank leaves the tier unchanged. "
                    "Mirrors ServiceTier.gst_rate."
                ),
                max_digits=5,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.00")),
                    django.core.validators.MaxValueValidator(Decimal("100.00")),
                ],
            ),
        ),
    ]
