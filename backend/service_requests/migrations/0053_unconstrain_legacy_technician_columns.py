from django.db import migrations

def make_columns_nullable(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor == 'postgresql':
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'service_requests_servicerequest' AND column_name = 'technician_heading'
            """)
            if cursor.fetchone():
                cursor.execute("ALTER TABLE service_requests_servicerequest ALTER COLUMN technician_heading DROP NOT NULL;")

            cursor.execute("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'service_requests_servicerequest' AND column_name = 'technician_speed'
            """)
            if cursor.fetchone():
                cursor.execute("ALTER TABLE service_requests_servicerequest ALTER COLUMN technician_speed DROP NOT NULL;")


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0052_remove_servicerequest_parent_request_id_and_more'),
    ]

    operations = [
        migrations.RunPython(
            make_columns_nullable,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
