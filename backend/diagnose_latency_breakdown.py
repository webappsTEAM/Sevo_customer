import os
import sys
import time
import socket
import datetime
import psycopg2

# 1. Initialize Django Environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
import django
django.setup()

from django.db import connection, reset_queries
from django.conf import settings
from rest_framework.test import APIClient


def run_breakdown():
    db_config = settings.DATABASES["default"]
    host = db_config.get("HOST", "")
    port = int(db_config.get("PORT", 5432))
    user = db_config.get("USER", "")
    password = db_config.get("PASSWORD", "")
    dbname = db_config.get("NAME", "")
    sslmode = db_config.get("OPTIONS", {}).get("sslmode", "require")

    print("\n==================================================")
    print(" DETAILED NETWORK & DATABASE LATENCY BREAKDOWN")
    print(f" Host: {host}:{port}")
    print(f" Database: {dbname} | User: {user}")
    print("==================================================\n")

    # ── 1. Step-by-Step Connection Latency Breakdown ─────────────────────
    print("[STEP 1: Network & Connection Latency Breakdown]")
    
    # 1a. DNS Resolution Time
    t0 = time.perf_counter()
    ip_address = socket.gethostbyname(host)
    dns_time = (time.perf_counter() - t0) * 1000.0
    print(f"  1. DNS Resolution ({host} -> {ip_address}): {dns_time:.2f} ms")

    # 1b. Raw TCP Handshake Time (Physical Network RTT)
    t0 = time.perf_counter()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(10.0)
    sock.connect((ip_address, port))
    tcp_rtt = (time.perf_counter() - t0) * 1000.0
    print(f"  2. Raw TCP Handshake RTT (Distance to {ip_address}:{port}): {tcp_rtt:.2f} ms")
    sock.close()

    # 1c. Full PostgreSQL Auth + TLS Connection Setup Time
    t0 = time.perf_counter()
    raw_conn = psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname,
        sslmode=sslmode,
        connect_timeout=15
    )
    full_conn_time = (time.perf_counter() - t0) * 1000.0
    print(f"  3. Full PostgreSQL Auth + TLS Connection Setup Time: {full_conn_time:.2f} ms")

    # ── 2. Query Latency Breakdown (Client RTT vs PostgreSQL Server Execution) ─
    print("\n[STEP 2: Client Round-Trip vs PostgreSQL Internal Execution]")
    
    cursor = raw_conn.cursor()

    # Client RTT for SELECT 1 on an existing open connection
    t0 = time.perf_counter()
    cursor.execute("SELECT 1;")
    cursor.fetchone()
    select_1_rtt = (time.perf_counter() - t0) * 1000.0
    print(f"  1. Client Round-Trip Time for 'SELECT 1;' (Open Conn): {select_1_rtt:.2f} ms")

    # PostgreSQL internal EXPLAIN ANALYZE execution time for SELECT 1
    cursor.execute("EXPLAIN (ANALYZE, FORMAT JSON) SELECT 1;")
    explain_res = cursor.fetchone()[0]
    exec_time_ms = explain_res[0]["Execution Time"]
    planning_time_ms = explain_res[0].get("Planning Time", 0.0)
    server_total_ms = exec_time_ms + planning_time_ms
    print(f"  2. PostgreSQL Internal Execution Time (On DB Server):  {server_total_ms:.4f} ms")
    print(f"  3. Network Round-Trip Delay Overhead:                   {select_1_rtt - server_total_ms:.2f} ms")

    # ── 3. Representative Lightweight Queries ───────────────────────────
    print("\n[STEP 3: Representative Queries Benchmark (Server vs Client)]")
    queries = [
        ("Simple Ping", "SELECT 1;"),
        ("Server Timestamp", "SELECT clock_timestamp();"),
        ("User Count", "SELECT count(*) FROM accounts_user;"),
        ("First Company", "SELECT id FROM companies_company LIMIT 1;"),
    ]

    for label, sql in queries:
        t0 = time.perf_counter()
        cursor.execute(sql)
        row = cursor.fetchone()
        client_rtt = (time.perf_counter() - t0) * 1000.0

        try:
            cursor.execute(f"EXPLAIN (ANALYZE, FORMAT JSON) {sql}")
            plan = cursor.fetchone()[0]
            server_time = plan[0]["Execution Time"] + plan[0].get("Planning Time", 0.0)
        except Exception:
            server_time = 0.0

        network_delay = client_rtt - server_time
        print(f"  {label:20s} | Client RTT: {client_rtt:6.2f} ms | Postgres Internal: {server_time:6.3f} ms | Network Delay: {network_delay:6.2f} ms")

    raw_conn.close()

    # ── 4. Real Django API Route Benchmarks & Caching Verification ──────
    print("\n[STEP 4: Real Django API Endpoints Latency & Caching Benchmark]")
    client = APIClient(HTTP_HOST="localhost")

    real_endpoints = [
        ("GET", "/api/company/regions/", "Initial Fetch"),
        ("GET", "/api/company/regions/", "Cached Repeat Fetch"),
        ("GET", "/api/catalog/categories/", "Initial Catalog Fetch"),
        ("GET", "/api/catalog/categories/", "Cached Catalog Fetch"),
        ("GET", "/api/customer/location/detect/", "Direct View"),
    ]

    for method, endpoint, note in real_endpoints:
        reset_queries()
        t0 = time.perf_counter()
        try:
            resp = client.get(endpoint)
            duration = (time.perf_counter() - t0) * 1000.0
            q_count = len(connection.queries)
            status_code = resp.status_code
        except Exception as err:
            duration = (time.perf_counter() - t0) * 1000.0
            q_count = len(connection.queries)
            status_code = 500

        print(f"  {method:4s} {endpoint:32s} ({note:22s}) -> Status: {status_code:<3d} | Latency: {duration:7.2f} ms | Queries: {q_count}")

    print("\n==================================================")
    print(" DIAGNOSTIC SUMMARY COMPLETE")
    print("==================================================\n")


def run_compare_mode():
    """
    Compare latency between Sydney (source .env) and Mumbai (TARGET_DATABASE_URL)
    directly via psycopg2 — no Django dependency, no server required.
    """
    from pathlib import Path
    from urllib.parse import urlparse, unquote
    from dotenv import load_dotenv

    env_file = Path(__file__).parent / ".env"
    load_dotenv(env_file)

    def parse_url(url):
        p = urlparse(url)
        return {
            "host":   p.hostname or "localhost",
            "port":   p.port or 5432,
            "dbname": p.path.lstrip("/") or "postgres",
            "user":   unquote(p.username) if p.username else "postgres",
            "password": unquote(p.password) if p.password else "",
            "sslmode": "require",
        }

    def get_src():
        url = os.getenv("SOURCE_DATABASE_URL")
        if url:
            return parse_url(url)
        host = os.getenv("DB_HOST")
        if not host:
            raise RuntimeError("DB_HOST not set in .env")
        return {
            "host": host, "port": int(os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv("DB_NAME", "postgres"),
            "user": os.getenv("DB_USER", "postgres"),
            "password": os.getenv("DB_PASSWORD", ""),
            "sslmode": os.getenv("DB_SSLMODE", "require"),
        }

    def measure(creds, label):
        import socket, psycopg2
        r = {"label": label}
        host, port = creds["host"], creds["port"]

        t0 = time.perf_counter()
        try:
            ip = socket.gethostbyname(host)
            r["dns_ms"] = (time.perf_counter() - t0) * 1000
        except Exception:
            r["dns_ms"] = -1.0
            ip = host

        t0 = time.perf_counter()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(8)
            s.connect((ip, port))
            r["tcp_ms"] = (time.perf_counter() - t0) * 1000
            s.close()
        except Exception:
            r["tcp_ms"] = -1.0

        t0 = time.perf_counter()
        try:
            conn = psycopg2.connect(
                host=host, port=port, dbname=creds["dbname"],
                user=creds["user"], password=creds["password"],
                sslmode=creds["sslmode"], connect_timeout=20,
            )
            r["connect_ms"] = (time.perf_counter() - t0) * 1000
            cur = conn.cursor()

            queries = [
                ("SELECT 1",                         "select1_ms"),
                ("SELECT 1",                         "select1_repeat_ms"),
                ("SELECT count(*) FROM accounts_user", "user_count_ms"),
                ("SELECT id FROM companies_company LIMIT 1", "company_ms"),
                ("SELECT count(*) FROM service_requests_service", "service_ms"),
            ]
            for sql, key in queries:
                t0 = time.perf_counter()
                try:
                    cur.execute(sql)
                    cur.fetchone()
                    r[key] = (time.perf_counter() - t0) * 1000
                except Exception:
                    r[key] = -1.0
            conn.close()
        except Exception as exc:
            r["connect_ms"] = -1.0

        return r

    src_creds = get_src()
    tgt_url   = os.getenv("TARGET_DATABASE_URL")
    if not tgt_url:
        print("[ERROR] TARGET_DATABASE_URL is not set.")
        sys.exit(1)
    tgt_creds = parse_url(tgt_url)

    print("\n" + "=" * 66)
    print(" LATENCY COMPARISON — Sydney (ap-southeast-2) vs Mumbai (ap-south-1)")
    print("=" * 66)

    print(f"  Source: {src_creds['user']}@{src_creds['host']}")
    src_m = measure(src_creds, "Sydney")
    print(f"  Target: {tgt_creds['user']}@{tgt_creds['host']}")
    tgt_m = measure(tgt_creds, "Mumbai")

    def fmt(ms):
        return f"{ms:7.1f} ms" if ms >= 0 else "  FAILED"

    def delta(s, t):
        if s > 0 and t > 0:
            d = s - t
            return f"{d:+.0f} ms ({(d/s*100):+.0f}%)"
        return "N/A"

    rows = [
        ("DNS Resolution",                "dns_ms"),
        ("TCP Handshake RTT",             "tcp_ms"),
        ("PG Auth + TLS Connect",         "connect_ms"),
        ("SELECT 1  (1st, warm)",         "select1_ms"),
        ("SELECT 1  (2nd, stable)",       "select1_repeat_ms"),
        ("accounts_user COUNT(*)",         "user_count_ms"),
        ("companies_company LIMIT 1",     "company_ms"),
        ("service_requests_service COUNT", "service_ms"),
    ]

    print()
    print(f"  {'Measurement':35s}  {'Sydney':>10s}  {'Mumbai':>10s}  {'Improvement':>15s}")
    print(f"  {'─'*75}")
    for label, key in rows:
        sv, tv = src_m.get(key, -1.0), tgt_m.get(key, -1.0)
        print(f"  {label:35s}  {fmt(sv):>10s}  {fmt(tv):>10s}  {delta(sv, tv):>15s}")

    print()
    c_src = src_m.get("connect_ms", -1.0)
    c_tgt = tgt_m.get("connect_ms", -1.0)
    if c_src > 0 and c_tgt > 0:
        print(f"  Connection latency improvement: {c_src - c_tgt:.0f} ms "
              f"({(c_src - c_tgt) / c_src * 100:.0f}% faster)")
    print("=" * 66 + "\n")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Database latency diagnostic")
    parser.add_argument(
        "--compare", action="store_true",
        help="Compare Sydney (.env) vs Mumbai (TARGET_DATABASE_URL) latency directly."
    )
    args = parser.parse_args()

    if args.compare:
        run_compare_mode()
    else:
        run_breakdown()
