import os
import sys
import django

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        ALTER TABLE service_requests_servicerequest
        ALTER COLUMN cancellation_note SET DEFAULT '',
        ALTER COLUMN cancellation_reason SET DEFAULT '',
        ALTER COLUMN cancelled_at_status SET DEFAULT '',
        ALTER COLUMN cancelled_by_persona SET DEFAULT '';
    """)
    print("Successfully set defaults for cancellation columns.")
