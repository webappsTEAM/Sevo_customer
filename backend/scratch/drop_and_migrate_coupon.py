import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    print("Dropping old service_requests_coupon table...")
    cursor.execute("DROP TABLE IF EXISTS service_requests_coupon CASCADE;")
    print("Table dropped successfully.")
