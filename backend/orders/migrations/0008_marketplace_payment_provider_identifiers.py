from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0007_marketplacepaymentintent"),
    ]

    operations = [
        migrations.AddField(
            model_name="marketplacepaymentintent",
            name="provider",
            field=models.CharField(db_index=True, default="razorpay", max_length=32),
        ),
        migrations.AddField(
            model_name="marketplacepaymentintent",
            name="provider_order_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="marketplacepaymentintent",
            name="provider_signature",
            field=models.CharField(blank=True, default="", max_length=512),
        ),
        migrations.AddField(
            model_name="marketplacepaymentintent",
            name="provider_transaction_id",
            field=models.CharField(blank=True, db_index=True, default="", max_length=128),
        ),
    ]
