from django.db import migrations


class Migration(migrations.Migration):
    """
    Ensures the physical existence of the "eway_bill_number" column on
    service_requests_servicerequest across all database instances (both fresh
    and previously migrated).

    Uses ADD COLUMN IF NOT EXISTS to guarantee idempotency without altering or
    failing on databases where the column already exists.
    Uses RunSQL.noop for reverse operations to preserve real eway_bill_number
    values and prevent accidental data loss upon rollback.
    """

    dependencies = [
        ('service_requests', '0116_merge_20260930_1600'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE service_requests_servicerequest ADD COLUMN IF NOT EXISTS eway_bill_number VARCHAR(20) DEFAULT '' NOT NULL;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
