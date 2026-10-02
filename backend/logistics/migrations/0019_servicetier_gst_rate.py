from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0018_packersmoversconfig_max_helpers"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetier",
            name="gst_rate",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text=(
                    "GST already INCLUDED in this tier's fare, as a percentage (18.00 = 18%). "
                    "The fare a customer is quoted and pays does not change; the rate is recorded on "
                    "each quote and the invoice shows the GST component of the total. "
                    "Blank or 0 = no GST line on invoices."
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
