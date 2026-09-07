# GT-B-06: City registry model + optional city link on ServiceZone,
# plus a data migration seeding Hosur (launched) and a handful of
# "coming soon" placeholder cities so the frontend city picker has
# something real to show immediately.

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def seed_cities(apps, schema_editor):
    City = apps.get_model("settings_hub", "City")
    ServiceZone = apps.get_model("settings_hub", "ServiceZone")

    hosur, _ = City.objects.get_or_create(
        slug="hosur",
        defaults=dict(name="Hosur", state="Tamil Nadu", is_launched=True, is_active=True, display_order=0),
    )
    if not hosur.is_launched:
        hosur.is_launched = True
        hosur.save(update_fields=["is_launched"])

    # Coming-soon placeholders. Deliberately NOT marked is_launched -- no
    # ServiceZone data exists for these yet, so the frontend must show a
    # "coming soon" state rather than a working booking flow.
    for order, (name, state) in enumerate(
        [
            ("Bengaluru", "Karnataka"),
            ("Chennai", "Tamil Nadu"),
            ("Coimbatore", "Tamil Nadu"),
        ],
        start=1,
    ):
        City.objects.get_or_create(
            slug=name.lower().replace(" ", "-"),
            defaults=dict(name=name, state=state, is_launched=False, is_active=True, display_order=order),
        )

    # Best-effort backfill: any existing ServiceZone with no city set is
    # assumed to be a Hosur zone (the only city this platform has served
    # so far), so existing zone-check behaviour is unaffected.
    ServiceZone.objects.filter(city__isnull=True).update(city=hosur)


def unseed_cities(apps, schema_editor):
    # Reversible no-op: leave City rows in place rather than guessing which
    # ServiceZone rows should have their city cleared back out.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("settings_hub", "0009_notificationpreference_email_cancellation_alerts_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="City",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("state", models.CharField(blank=True, max_length=100)),
                ("is_launched", models.BooleanField(default=False, help_text="Whether this city has real service zones / technicians and can accept bookings.")),
                ("is_active", models.BooleanField(default=True, help_text="Whether this city is shown at all (e.g. in a city picker), launched or not.")),
                ("display_order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "City",
                "verbose_name_plural": "Cities",
                "ordering": ["display_order", "name"],
            },
        ),
        migrations.AddField(
            model_name="servicezone",
            name="city",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="service_zones",
                to="settings_hub.city",
            ),
        ),
        migrations.RunPython(seed_cities, unseed_cities),
    ]
