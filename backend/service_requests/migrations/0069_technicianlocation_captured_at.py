# Hand-written, for the same reason as 0065-0068 in this series: a plain
# `makemigrations` run cannot complete in this repo because the autodetector
# stops to ask an interactive question about the UNRELATED Addon.package
# drift (the model says null=False/CASCADE, migration 0058 recorded
# null=True/SET_NULL). Answering that question here would smuggle a
# destructive, unverified schema change into an additive migration, so this
# file carries ONLY the AddField the change actually needs. The Addon.package
# drift is left pending and documented -- it needs a real-data count before
# anyone can decide it.
#
# What this adds: TechnicianLocation.captured_at -- when the DEVICE recorded
# a GPS fix, as opposed to created_at, which is when this server received it.
# Needed because the webhook receiver had no way to tell a fresh fix from an
# old one that simply arrived late, so out-of-order packets were overwriting
# newer coordinates (see services/technician_tracking.py).
#
# Purely additive: one nullable DateTimeField plus its index. No data loss,
# no rewrite of existing rows, safe to apply to any existing database.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0068_farereconciliation"),
    ]

    operations = [
        migrations.AddField(
            model_name="technicianlocation",
            name="captured_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
