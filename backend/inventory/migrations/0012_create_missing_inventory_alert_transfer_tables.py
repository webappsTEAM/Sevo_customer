import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def create_tables_if_not_exists(apps, schema_editor):
    InventoryAlert = apps.get_model('inventory', 'InventoryAlert')
    InventoryTransfer = apps.get_model('inventory', 'InventoryTransfer')

    with schema_editor.connection.cursor() as cursor:
        existing_tables = schema_editor.connection.introspection.table_names(cursor)

    if InventoryAlert._meta.db_table not in existing_tables:
        schema_editor.create_model(InventoryAlert)

    if InventoryTransfer._meta.db_table not in existing_tables:
        schema_editor.create_model(InventoryTransfer)


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0011_cleanup_migrated_vegetable_inventory_rows'),
        ('companies', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(create_tables_if_not_exists, migrations.RunPython.noop),
    ]
