# Hand-written to EXCLUDE the unrelated Addon.package change the autodetector
# wants to bundle in here. That one is destructive (adds NOT NULL and flips
# ON DELETE from SET_NULL to CASCADE), needs a production row count first,
# and is a product decision that has not been made. It stays pending.
#
# What this adds: SERVICE_TIER as a CatalogChangeLog entity type, so Goods &
# Transport rate changes are audited by the system that already audits every
# other catalog price change, rather than by a second audit model.
#
# NO-OP AT THE DATABASE. `choices` is enforced by Django in Python, never as
# a column constraint, so this emits no ALTER TABLE on PostgreSQL and cannot
# fail on existing rows. It keeps the migration graph in step with models.py.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0069_technicianlocation_captured_at"),
    ]

    operations = [
        migrations.AlterField(
            model_name="catalogchangelog",
            name="entity_type",
            field=models.CharField(
                max_length=20,
                choices=[
                    ("CATEGORY", "Category"),
                    ("SERVICE", "Service"),
                    ("PACKAGE", "Package"),
                    ("ADDON", "Add-on"),
                    ("SERVICE_TIER", "Goods & Transport Tier"),
                ],
            ),
        ),
    ]
