import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('service_requests', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='VegetableOrder',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('order_number', models.CharField(blank=True, db_index=True, max_length=20, unique=True)),
                ('status', models.CharField(choices=[('PLACED', 'Placed'), ('PACKED', 'Packed'), ('OUT_FOR_DELIVERY', 'Out for Delivery'), ('DELIVERED', 'Delivered'), ('CANCELLED', 'Cancelled')], db_index=True, default='PLACED', max_length=20)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('delivery_address', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(help_text='The customer who placed this vegetable order.', on_delete=django.db.models.deletion.PROTECT, related_name='vegetable_orders', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'vegetable_orders_vegetableorder',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='VegetableOrderItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_grams', models.PositiveIntegerField()),
                ('unit_price_snapshot', models.DecimalField(decimal_places=2, max_digits=10)),
                ('line_amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='vegetable_orders.vegetableorder')),
                ('package', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='vegetable_order_items', to='service_requests.package')),
            ],
            options={
                'db_table': 'vegetable_orders_vegetableorderitem',
                'ordering': ['id'],
            },
        ),
    ]
