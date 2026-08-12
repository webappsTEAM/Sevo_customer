import os
import sys
import time
import datetime

# 1. Initialize Django Environment before importing Django / DRF components
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
import django
django.setup()

from django.db import connection, reset_queries
from django.conf import settings
from rest_framework.test import APIClient


def run_latency_diagnostics():
    log_filepath = os.path.join(os.path.dirname(__file__), "latency_audit.log")
    log_lines = []

    def log(msg):
        print(msg)
        log_lines.append(msg)

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log(f"==================================================")
    log(f" CALSERVICE LATENCY & PERFORMANCE AUDIT REPORT")
    log(f" Timestamp: {timestamp}")
    log(f"==================================================")

    # 1. Database Configuration Verification
    db_config = settings.DATABASES["default"]
    engine = db_config.get("ENGINE", "")
    host = db_config.get("HOST", "")
    port = db_config.get("PORT", "")
    conn_max_age = db_config.get("CONN_MAX_AGE", 0)

    log("\n[1. Database Connection Configuration]")
    log(f"  Engine:       {engine}")
    log(f"  Host:         {host}")
    log(f"  Port:         {port}")
    log(f"  CONN_MAX_AGE: {conn_max_age}s")

    # 2. Database Latency Benchmarks
    log("\n[2. Database Query & Connection Latency Benchmarks]")

    # Connection setup & first query latency
    connection.close()
    start_time = time.perf_counter()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1;")
        res = cursor.fetchone()
    initial_db_latency = (time.perf_counter() - start_time) * 1000.0
    log(f"  Initial DB Query Latency (Connection Setup + Query): {initial_db_latency:.2f} ms")

    # Reused connection latency
    start_time = time.perf_counter()
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1;")
        res = cursor.fetchone()
    reused_db_latency = (time.perf_counter() - start_time) * 1000.0
    log(f"  Reused DB Connection Latency (Persistent Connection): {reused_db_latency:.2f} ms")

    # Benchmark 10 sequential simple queries to measure connection stability
    start_time = time.perf_counter()
    for _ in range(10):
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    batch_10_latency = (time.perf_counter() - start_time) * 1000.0
    avg_query_latency = batch_10_latency / 10.0
    log(f"  Batch 10 Queries Total Duration:                     {batch_10_latency:.2f} ms")
    log(f"  Average Query Latency over Persistent Connection:    {avg_query_latency:.2f} ms")

    # 3. Simulated API Endpoint Request Latency & SQL Query Count
    log("\n[3. API Endpoint Request Latency & Query Count Analysis]")
    client = APIClient(HTTP_HOST="localhost")

    test_endpoints = [
        ("GET", "/api/auth/me/"),
        ("GET", "/api/company/list/"),
        ("GET", "/api/service-requests/"),
        ("GET", "/api/tasks/"),
    ]

    for method, endpoint in test_endpoints:
        reset_queries()
        start_time = time.perf_counter()

        if method == "GET":
            response = client.get(endpoint)
        else:
            response = client.post(endpoint)

        request_latency = (time.perf_counter() - start_time) * 1000.0
        query_count = len(connection.queries)
        status_code = response.status_code

        log(f"  {method:4s} {endpoint:30s} -> Status: {status_code:<3d} | Duration: {request_latency:7.2f} ms | SQL Queries: {query_count}")

    # 4. Summary & Optimization Verdict
    log("\n[4. Diagnostics Summary & Recommendations]")
    if int(port) == 5432:
        log("  [PASS] Direct connection pooler (5432) active.")
    else:
        log(f"  [WARN] Database is running on non-direct port ({port}).")

    if conn_max_age > 0:
        log(f"  [PASS] Persistent connection pooling enabled (CONN_MAX_AGE={conn_max_age}s).")
    else:
        log("  [WARN] CONN_MAX_AGE=0 forces connection teardown on every request.")

    log(f"  Average Single Query Overhead: {avg_query_latency:.2f} ms")
    log("==================================================\n")

    # Write log file
    with open(log_filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")

    print(f"Audit log saved to: {log_filepath}")


if __name__ == "__main__":
    run_latency_diagnostics()
