from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0110_gt_operations_driver_rules'),
    ]

    operations = [
        migrations.AddField(
            model_name='gtoperationsconfig',
            name='allow_wallet_part_payment',
            field=models.BooleanField(default=False, help_text='Let a customer whose wallet cannot cover a prepaid booking spend what it holds and pay the rest online (wallet + card split).'),
        ),
    ]
