import os
import psycopg2
from dotenv import load_dotenv

# Load env
load_dotenv('.env')

db_name = os.getenv("DB_NAME", "postgres")
db_user = os.getenv("DB_USER", "postgres")
db_pass = os.getenv("DB_PASSWORD", "")
db_host = os.getenv("DB_HOST", "localhost")
db_sslmode = os.getenv("DB_SSLMODE", "require")

print("Checking connection to port 6543 (Pooler)...")
try:
    conn_pooler = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_pass,
        host=db_host,
        port=6543,
        sslmode=db_sslmode
    )
    print("Success: Connected to port 6543!")
    conn_pooler.close()
except Exception as e:
    print(f"Failed to connect to 6543: {e}")

print("\nChecking connection to port 5432 (Direct Mode)...")
try:
    conn_direct = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_pass,
        host=db_host,
        port=5432,
        sslmode=db_sslmode
    )
    print("Success: Connected to port 5432 directly!")
    
    # Query pg_stat_activity
    with conn_direct.cursor() as cursor:
        cursor.execute("""
            SELECT count(*), state, usename, client_addr 
            FROM pg_stat_activity 
            GROUP BY state, usename, client_addr
            ORDER BY count(*) DESC;
        """)
        rows = cursor.fetchall()
        report_path = "connection_report.txt"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("Active database connection count report:\n")
            f.write("-" * 60 + "\n")
            for count, state, username, addr in rows:
                f.write(f"Connections: {count} | State: {state} | User: {username} | IP: {addr}\n")
        print(f"Wrote active connections report to {report_path}")
    conn_direct.close()
except Exception as e:
    print(f"Failed to connect to 5432 directly: {e}")
