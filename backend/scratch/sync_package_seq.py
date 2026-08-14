import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import Package
from django.db import connection

table = Package._meta.db_table
print(f"Package db_table is: {table}")

with connection.cursor() as cursor:
    cursor.execute(f"SELECT pg_get_serial_sequence('{table}', 'id');")
    seq_name = cursor.fetchone()[0]
    print(f"Sequence name is: {seq_name}")
    cursor.execute(f"SELECT setval('{seq_name}', COALESCE((SELECT MAX(id) FROM {table}), 1) + 1, false);")
    print(f"Synced sequence {seq_name} successfully!")
