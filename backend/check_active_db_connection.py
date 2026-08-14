import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection
from django.conf import settings

def check_active_db():
    db_config = settings.DATABASES["default"]
    print("=" * 80)
    print("ACTIVE DJANGO DATABASE CONFIGURATION")
    print("=" * 80)
    print(f"ENGINE   : {db_config.get('ENGINE')}")
    print(f"HOST     : {db_config.get('HOST')}")
    print(f"PORT     : {db_config.get('PORT')}")
    print(f"NAME     : {db_config.get('NAME')}")
    print(f"USER     : {db_config.get('USER')}")

    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database(), current_schema(), inet_server_addr(), version();")
        row = cursor.fetchone()
        print("\n[ACTIVE DATABASE SERVER CONNECTION]")
        print(f"  Current DB     : {row[0]}")
        print(f"  Current Schema : {row[1]}")
        print(f"  Server Addr    : {row[2]}")
        print(f"  PostgreSQL Ver : {row[3]}")

        cursor.execute("SELECT COUNT(*) FROM service_requests_servicerequest;")
        count = cursor.fetchone()[0]
        print(f"\n  Total ServiceRequest rows in '{row[0]}.{row[1]}.service_requests_servicerequest': {count}")

        cursor.execute("""
            SELECT id, request_id, customer_name, service_category, created_at
            FROM service_requests_servicerequest
            ORDER BY created_at DESC
            LIMIT 5;
        """)
        recent_rows = cursor.fetchall()
        print("\n[5 MOST RECENT SERVICEREQUEST ROWS IN POSTGRESQL]")
        for r in recent_rows:
            print(f"  ID: {r[0]} | Request ID: {r[1]} | Customer: {r[2]} | Category: {r[3]} | Created At: {r[4]}")

    print("=" * 80 + "\n")

if __name__ == "__main__":
    check_active_db()
