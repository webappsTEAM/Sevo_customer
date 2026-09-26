# Generated repair migration for missing EventOutbox table in live DB
from django.db import migrations


def create_eventoutbox_table(apps, schema_editor):
    EventOutbox = apps.get_model('service_requests', 'EventOutbox')
    table_name = EventOutbox._meta.db_table
    existing_tables = schema_editor.connection.introspection.table_names()
    if table_name not in existing_tables:
        schema_editor.create_model(EventOutbox)


def drop_eventoutbox_table(apps, schema_editor):
    EventOutbox = apps.get_model('service_requests', 'EventOutbox')
    table_name = EventOutbox._meta.db_table
    existing_tables = schema_editor.connection.introspection.table_names()
    if table_name in existing_tables:
        schema_editor.delete_model(EventOutbox)


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0088_merge_20260917_1232'),
    ]

    operations = [
        migrations.RunPython(create_eventoutbox_table, drop_eventoutbox_table),
    ]
