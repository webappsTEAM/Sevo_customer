# Hand-written additive migration for logistics app.
# Adds authoritative vehicle_class field to ServiceTier.
from django.db import migrations, models


def set_initial_vehicle_classes(apps, schema_editor):
    ServiceTier = apps.get_model("logistics", "ServiceTier")
    for tier in ServiceTier.objects.all():
        cat = (tier.category or "").lower()
        slug = (tier.slug or "").lower()
        name = (tier.name or "").lower()
        if cat == "two_wheeler":
            tier.vehicle_class = "two_wheeler"
        elif "3-wheeler" in slug or "three" in slug or "3 wheeler" in name:
            tier.vehicle_class = "three_wheeler"
        elif "pickup" in slug or "pickup" in name:
            tier.vehicle_class = "pickup"
        elif "1.7" in slug or "1-7-ton" in slug or "heavy" in str(getattr(tier, "weight_class", "")).lower():
            tier.vehicle_class = "heavy_truck"
        else:
            tier.vehicle_class = "truck"
        tier.save(update_fields=["vehicle_class"])


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0009_packersmoversconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetier",
            name="vehicle_class",
            field=models.CharField(
                blank=True,
                choices=[
                    ("two_wheeler", "Two Wheeler"),
                    ("three_wheeler", "Three Wheeler"),
                    ("truck", "Truck"),
                    ("pickup", "Pickup"),
                    ("heavy_truck", "Heavy Truck"),
                ],
                db_index=True,
                default="truck",
                help_text="Authoritative vehicle classification (two_wheeler, three_wheeler, truck, pickup, heavy_truck).",
                max_length=30,
            ),
        ),
        migrations.RunPython(set_initial_vehicle_classes, migrations.RunPython.noop),
    ]
