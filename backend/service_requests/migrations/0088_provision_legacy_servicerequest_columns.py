"""
Provision physical ServiceRequest legacy columns (catalog_service_id, package_display,
package_id, package_version) on databases that do not yet have them (e.g. fresh SQLite
test databases).

On Supabase PostgreSQL production, these columns already exist from legacy schema.
This migration reconciles any new or test database to ensure model-schema agreement.
"""
from django.db import migrations

TABLE = "service_requests_servicerequest"
COLUMNS_TO_PROVISION = [
    ("catalog_service_id", "varchar(100) DEFAULT '' NOT NULL"),
    ("package_display", "varchar(200) DEFAULT '' NOT NULL"),
    ("package_id", "varchar(100) DEFAULT '' NOT NULL"),
    ("package_version", "varchar(50) DEFAULT '' NOT NULL"),
]


def provision_legacy_columns(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        table_list = connection.introspection.table_names(cursor)
        if TABLE not in table_list:
            return

        existing_cols = {
            c.name for c in connection.introspection.get_table_description(cursor, TABLE)
        }

        for col_name, col_sql in COLUMNS_TO_PROVISION:
            if col_name not in existing_cols:
                cursor.execute(f"ALTER TABLE {TABLE} ADD COLUMN {col_name} {col_sql};")


def noop_reverse(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0087_alter_catalogchangelog_action_and_more"),
    ]

    operations = [
        migrations.RunPython(provision_legacy_columns, noop_reverse),
    ]
