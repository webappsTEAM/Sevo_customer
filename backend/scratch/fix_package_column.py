import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'service_requests_package';
    """)
    cols = [r[0] for r in cursor.fetchall()]
    print("Existing columns in service_requests_package:", cols)

    if "service_id" not in cols:
        print("Adding missing column 'service_id' to service_requests_package...")
        cursor.execute("""
            ALTER TABLE service_requests_package 
            ADD COLUMN service_id bigint REFERENCES service_requests_service(id) ON DELETE SET NULL;
        """)
        print("Column 'service_id' added successfully.")
    else:
        print("Column 'service_id' already exists.")
