# Admin-configurable pricing (platform fee, GST, delivery fee, handling
# fee, etc.) that used to be hardcoded directly in the customer mobile
# app. Added 2026-10-01 per explicit request to make these editable from
# the Settings module instead of requiring a new app build for every
# price change.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings_hub', '0012_servicezone_status_vehicle_classes'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PricingConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(default='default', max_length=50, unique=True)),
                ('platform_fee', models.DecimalField(decimal_places=2, default='49.00', help_text='Flat platform/service fee added to every home-service booking.', max_digits=10)),
                ('gst_percent', models.DecimalField(decimal_places=2, default='5.00', help_text='GST percentage applied to the service subtotal.', max_digits=5)),
                ('min_advance_percent', models.DecimalField(decimal_places=2, default='20.00', help_text='Minimum advance payment as a percentage of the booking total.', max_digits=5)),
                ('min_advance_amount', models.DecimalField(decimal_places=2, default='149.00', help_text='Minimum advance payment amount in rupees, whichever is higher.', max_digits=10)),
                ('delivery_fee', models.DecimalField(decimal_places=2, default='15.00', help_text='Delivery fee charged on grocery orders below the free-delivery threshold.', max_digits=10)),
                ('free_delivery_threshold', models.DecimalField(decimal_places=2, default='200.00', help_text='Grocery cart subtotal at or above which delivery is free.', max_digits=10)),
                ('handling_fee', models.DecimalField(decimal_places=2, default='2.00', help_text='Flat handling & packaging fee charged on every grocery order.', max_digits=10)),
                ('small_cart_fee', models.DecimalField(decimal_places=2, default='5.00', help_text='Extra fee charged on grocery orders below the small-cart threshold.', max_digits=10)),
                ('small_cart_threshold', models.DecimalField(decimal_places=2, default='100.00', help_text='Grocery cart subtotal below which the small-cart fee applies.', max_digits=10)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pricing_configs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Pricing Config',
                'verbose_name_plural': 'Pricing Config',
            },
        ),
    ]
