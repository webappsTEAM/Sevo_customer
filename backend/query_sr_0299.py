import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

def query_specific_booking(req_id):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT
                id,
                request_id,
                customer_id,
                customer_name,
                phone,
                email,
                service_category,
                issue_title,
                description,
                address,
                latitude,
                longitude,
                preferred_date,
                preferred_time,
                payment_method,
                payment_status,
                total_amount,
                cart_data,
                status,
                created_at,
                updated_at
            FROM service_requests_servicerequest
            WHERE request_id = %s;
        """, [req_id])
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]

        if row:
            print("=" * 80)
            print(f"POSTGRESQL ROW QUERY FOR REQUEST_ID = '{req_id}'")
            print("=" * 80)
            for col, val in zip(columns, row):
                print(f"  {col.upper():<20}: {val}")
            print("=" * 80)
        else:
            print(f"❌ No record found for request_id = '{req_id}'")

if __name__ == "__main__":
    query_specific_booking("SR-0302")
