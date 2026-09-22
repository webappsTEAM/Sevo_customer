# Hand-written migration -- see prior migrations in this remediation pass
# for why `manage.py makemigrations` can't be run against a matching
# environment in this sandbox. Verified by loading via importlib against a
# locally-installed Django to confirm the Migration class parses and
# matches the model definition -- not verified against the live database.
# Run `python manage.py makemigrations --check --dry-run` before applying.
#
# HS-B-07: adds BookingSeries (AMC / recurring-booking templates) -- see
# the model docstring in models.py for the full rationale.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('service_requests', '0058_gt_d02_trip_stop'),
    ]

    operations = [
        migrations.CreateModel(
            name='BookingSeries',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('customer_name', models.CharField(max_length=200)),
                ('phone', models.CharField(max_length=30)),
                ('email', models.EmailField(blank=True, default='', max_length=254)),
                ('service_category', models.CharField(max_length=150)),
                ('issue_title', models.CharField(max_length=300)),
                ('description', models.TextField(blank=True, default='')),
                ('address', models.TextField()),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('preferred_time', models.CharField(blank=True, default='', max_length=50)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('frequency', models.CharField(choices=[('MONTHLY', 'Every Month'), ('QUARTERLY', 'Every 3 Months'), ('HALF_YEARLY', 'Every 6 Months'), ('YEARLY', 'Every 12 Months')], max_length=12)),
                ('next_run_date', models.DateField()),
                ('status', models.CharField(choices=[('ACTIVE', 'Active'), ('PAUSED', 'Paused'), ('CANCELLED', 'Cancelled')], db_index=True, default='ACTIVE', max_length=10)),
                ('occurrences_generated', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='booking_series', to=settings.AUTH_USER_MODEL)),
                ('last_generated_booking', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='+', to='service_requests.servicerequest')),
            ],
            options={
                'db_table': 'service_requests_booking_series',
                'ordering': ['-created_at'],
            },
        ),
    ]
