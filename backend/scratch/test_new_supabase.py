import sys
import psycopg2

# Change output encoding to UTF-8 to prevent CP1252 errors on Windows command line
sys.stdout.reconfigure(encoding='utf-8')

project_ref = "zmwwazawnszrlbftqthe"
password = "Calservices@123"
dbname = "postgres"

# Test direct connection
try:
    print("Testing direct connection to db.zmwwazawnszrlbftqthe.supabase.co:5432...")
    conn = psycopg2.connect(
        dbname=dbname,
        user="postgres",
        password=password,
        host=f"db.{project_ref}.supabase.co",
        port=5432,
        sslmode="require",
        connect_timeout=5
    )
    print("SUCCESS: Direct connection works!")
    conn.close()
except Exception as e:
    err_msg = str(e).strip().replace("\n", " ")
    print(f"FAILED: Direct connection failed: {err_msg}")

# Test pooler connection across regions
poolers = [
    "aws-0-ap-south-1.pooler.supabase.com",      # Mumbai
    "aws-0-ap-northeast-1.pooler.supabase.com",  # Tokyo
    "aws-0-ap-southeast-1.pooler.supabase.com",  # Singapore
    "aws-0-us-east-1.pooler.supabase.com",       # N. Virginia
    "aws-0-us-west-1.pooler.supabase.com",       # N. California
    "aws-0-eu-central-1.pooler.supabase.com",    # Frankfurt
    "aws-0-sa-east-1.pooler.supabase.com",       # São Paulo
    "aws-0-ap-southeast-2.pooler.supabase.com",  # Sydney
    "aws-0-eu-west-1.pooler.supabase.com",       # Ireland
    "aws-0-eu-west-2.pooler.supabase.com",       # London
    "aws-0-eu-west-3.pooler.supabase.com",       # Paris
    "aws-0-us-east-2.pooler.supabase.com",       # Ohio
    "aws-0-ca-central-1.pooler.supabase.com",    # Canada Central
]

user = f"postgres.{project_ref}"
connected = False
for host in poolers:
    for port in [6543]:
        try:
            print(f"Testing pooler {host}:{port} with user {user}...", end=" ", flush=True)
            conn = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=host,
                port=port,
                sslmode="require",
                connect_timeout=5
            )
            print("SUCCESS!")
            print(f"--> MATCHING POOLER HOST: {host}, PORT: {port}")
            conn.close()
            connected = True
            break
        except Exception as e:
            err_msg = str(e).strip().replace("\n", " ")
            print(f"FAILED ({err_msg})")
    if connected:
        break
