from django.db import migrations


def ensure_eway_bill_number_column(apps, schema_editor):
    connection = schema_editor.connection
    vendor = connection.vendor
    if vendor == "postgresql":
        schema_editor.execute(
            "ALTER TABLE service_requests_servicerequest ADD COLUMN IF NOT EXISTS eway_bill_number VARCHAR(20) DEFAULT '' NOT NULL;"
        )
    elif vendor == "sqlite":
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(service_requests_servicerequest);")
            columns = [row[1] for row in cursor.fetchall()]
            if "eway_bill_number" not in columns:
                schema_editor.execute(
                    "ALTER TABLE service_requests_servicerequest ADD COLUMN eway_bill_number VARCHAR(20) DEFAULT '' NOT NULL;"
                )
    else:
        try:
            schema_editor.execute(
                "ALTER TABLE service_requests_servicerequest ADD COLUMN eway_bill_number VARCHAR(20) DEFAULT '' NOT NULL;"
            )
        except Exception:
            pass


class Migration(migrations.Migration):
    """
    Ensures the physical existence of the "eway_bill_number" column on
    service_requests_servicerequest across all database instances (both fresh
    and previously migrated).

    Uses ADD COLUMN IF NOT EXISTS on PostgreSQL to guarantee idempotency
    without altering or failing on databases where the column already exists.
    Supports SQLite test runners and environments seamlessly.
    Uses RunPython.noop for reverse operations to preserve real eway_bill_number
    values and prevent accidental data loss upon rollback.
    """

    dependencies = [
        ('service_requests', '0116_merge_20260930_1600'),
    ]

    operations = [
        migrations.RunPython(
            ensure_eway_bill_number_column,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
