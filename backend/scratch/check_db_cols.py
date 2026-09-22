import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
import django
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_requests_package' ORDER BY ordinal_position;")
    cols = cursor.fetchall()
    print("Columns in DB table service_requests_package:")
    for c in cols:
        print(f" - {c[0]} ({c[1]})")
