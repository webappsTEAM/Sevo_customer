import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT sequence_name FROM information_schema.sequences 
        WHERE sequence_name LIKE '%service_requests%';
    """)
    seqs = cursor.fetchall()
    print("Found sequences:", seqs)
    for (seq,) in seqs:
        print(f"Checking sequence: {seq}")
        cursor.execute(f"SELECT last_value FROM {seq}")
        print("  last_value:", cursor.fetchone()[0])
