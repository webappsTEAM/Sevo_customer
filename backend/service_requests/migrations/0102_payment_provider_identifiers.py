# Generated manually to preserve existing payment rows while adding generic
# provider identifiers for Paytm and future gateways.
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("service_requests", "0101_gtclaimpolicy_gtextrachargepolicy_gtinsurancepolicy_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="payment",
            name="provider_order_id",
            field=models.CharField(blank=True, db_index=True, max_length=128, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_signature",
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
        migrations.AddField(
            model_name="payment",
            name="provider_transaction_id",
            field=models.CharField(blank=True, db_index=True, max_length=128, null=True),
        ),
    ]
