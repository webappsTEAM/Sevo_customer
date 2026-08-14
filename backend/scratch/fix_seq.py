import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT MAX(id) FROM service_requests_package")
    max_id = cursor.fetchone()[0]
    print(f"Max id in service_requests_package is: {max_id}")
    cursor.execute(f"SELECT setval('service_requests_package_id_seq', {max_id + 1}, true);")
    print(f"Set service_requests_package_id_seq to: {max_id + 1}")
