# Repair migration: empty no-op repair migration
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0018_alter_servicerequest_status"),
    ]

    operations = []
