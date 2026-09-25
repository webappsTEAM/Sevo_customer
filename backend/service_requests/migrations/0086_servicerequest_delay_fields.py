# Generated for the multi-service booking / technician delay-signaling feature (Sept 2026).
# Additive only -- these fields are not part of Status/ALLOWED_TRANSITIONS.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0085_merge_20260911_0935'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='is_delayed',
            field=models.BooleanField(default=False, db_index=True),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='delay_reason',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='delay_reported_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
