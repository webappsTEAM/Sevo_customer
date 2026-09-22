import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

cursor = connection.cursor()

# Get all schemas
cursor.execute("SELECT schema_name FROM companies_company ORDER BY schema_name")
schemas = [row[0] for row in cursor.fetchall()]
print("Registered schemas:", schemas)

# Drop columns if they exist in each schema
for schema in schemas:
    try:
        # Check if is_online column exists
        cursor.execute(f"""
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = 'employees_employee' AND column_name = 'is_online'
        """, [schema])
        if cursor.fetchone():
            print(f"Dropping is_online from {schema}.employees_employee...")
            cursor.execute(f"ALTER TABLE {schema}.employees_employee DROP COLUMN is_online CASCADE")

        # Check if last_active_at column exists
        cursor.execute(f"""
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = 'employees_employee' AND column_name = 'last_active_at'
        """, [schema])
        if cursor.fetchone():
            print(f"Dropping last_active_at from {schema}.employees_employee...")
            cursor.execute(f"ALTER TABLE {schema}.employees_employee DROP COLUMN last_active_at CASCADE")
            
        connection.commit()
    except Exception as e:
        print(f"Error cleaning schema '{schema}': {e}")
        connection.rollback()

print("Cleanup complete!")
