# Hand-written migration -- see 0057_hs_d04_notification_outbox.py (and the
# other hand-written migrations from this remediation pass) for why
# `manage.py makemigrations` can't be run against a matching environment in
# this sandbox. Verified by loading via importlib against a locally-
# installed Django to confirm the Migration class parses and matches the
# model definitions -- not verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# GT-D-02: adds TripStop, an additive multi-stop model for goods-transport/
# packers & movers bookings -- see the TripStop docstring in models.py for
# the full rationale (this does not touch ServiceRequest.address/
# drop_address, which remain the source of truth for the single-pickup/
# single-drop case).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0057_hs_d04_notification_outbox'),
    ]

    operations = [
        migrations.CreateModel(
            name='TripStop',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence', models.PositiveSmallIntegerField(help_text='Visit order, 1-based.')),
                ('stop_type', models.CharField(choices=[('PICKUP', 'Pickup'), ('WAYPOINT', 'Intermediate Stop'), ('DROP', 'Drop')], default='WAYPOINT', max_length=10)),
                ('address', models.TextField()),
                ('contact_name', models.CharField(blank=True, default='', max_length=200)),
                ('contact_phone', models.CharField(blank=True, default='', max_length=20)),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('notes', models.CharField(blank=True, default='', max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trip_stops', to='service_requests.servicerequest')),
            ],
            options={
                'db_table': 'service_requests_trip_stop',
                'ordering': ['booking', 'sequence'],
                'unique_together': {('booking', 'sequence')},
            },
        ),
    ]
