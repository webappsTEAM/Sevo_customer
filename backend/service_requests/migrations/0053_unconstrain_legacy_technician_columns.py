# Generated migration to make sure technician_heading and technician_speed
# columns are nullable if they exist in PostgreSQL database.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0052_remove_servicerequest_parent_request_id_and_more'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'service_requests_servicerequest' AND column_name = 'technician_heading'
                ) THEN
                    ALTER TABLE service_requests_servicerequest ALTER COLUMN technician_heading DROP NOT NULL;
                END IF;

                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'service_requests_servicerequest' AND column_name = 'technician_speed'
                ) THEN
                    ALTER TABLE service_requests_servicerequest ALTER COLUMN technician_speed DROP NOT NULL;
                END IF;
            END $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
