import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.db import connection

tables = [
    ("service_requests_catalogcategory", "service_requests_catalogcategory_id_seq"),
    ("service_requests_service", "service_requests_service_id_seq"),
    ("service_requests_catalogservice", "service_requests_catalogservice_id_seq"),
    ("service_requests_addon", "service_requests_addon_id_seq"),
]

with connection.cursor() as cursor:
    for table, seq in tables:
        try:
            cursor.execute(f"SELECT setval('{seq}', COALESCE((SELECT MAX(id) FROM {table}), 1) + 1, false);")
            print(f"Synced sequence {seq} for table {table}")
        except Exception as e:
            print(f"Error for {table}: {e}")
