# Hand-written migration -- see prior migrations in this remediation pass
# for why `manage.py makemigrations` can't be run against a matching
# environment in this sandbox. Verified by loading via importlib against a
# locally-installed Django to confirm the Migration class parses and
# matches the model definition -- not verified against the live database.
# Run `python manage.py makemigrations --check --dry-run` before applying.
#
# GT-B-03: adds ServiceRequest.logistics_leg/_updated_at/_history -- see
# the LogisticsLeg docstring in models.py for the full rationale (additive,
# independent of Status/ALLOWED_TRANSITIONS).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0059_hs_b07_booking_series'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='logistics_leg',
            field=models.CharField(blank=True, choices=[('EN_ROUTE_PICKUP', 'En Route to Pickup'), ('LOADING', 'Loading'), ('EN_ROUTE_DROP', 'En Route to Drop'), ('UNLOADING', 'Unloading'), ('DELIVERED', 'Delivered')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='logistics_leg_updated_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='logistics_leg_history',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
