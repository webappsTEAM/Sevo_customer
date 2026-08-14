import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT id, slug, name, service_id FROM service_requests_package LIMIT 20;")
    rows = cursor.fetchall()
    print("Found packages:", len(rows))
    for r in rows:
        print(r)
