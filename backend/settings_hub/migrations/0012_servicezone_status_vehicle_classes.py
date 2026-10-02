# Service Coverage: adds a 3-state lifecycle (Active / Coming Soon / Paused)
# and an optional per-zone vehicle-class restriction to the existing
# ServiceZone geofence model. Existing rows are back-filled from is_active so
# nothing that is live today stops being live.

from django.db import migrations, models


def backfill_status(apps, schema_editor):
    ServiceZone = apps.get_model("settings_hub", "ServiceZone")
    ServiceZone.objects.filter(is_active=True).update(status="active")
    ServiceZone.objects.filter(is_active=False).update(status="paused")


class Migration(migrations.Migration):

    dependencies = [
        ("settings_hub", "0011_teaminvite_custom_permissions"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicezone",
            name="status",
            field=models.CharField(
                choices=[("active", "Active"), ("coming_soon", "Coming Soon"), ("paused", "Paused")],
                db_index=True, default="active", max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="servicezone",
            name="vehicle_classes",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_status, migrations.RunPython.noop),
    ]
