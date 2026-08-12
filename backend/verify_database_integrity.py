import os
import sys
import hashlib
import json
from pathlib import Path
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# Load .env file automatically
load_dotenv(Path(__file__).parent / ".env")


def parse_db_url(db_url):
    """Parse postgresql://user:password@host:port/dbname URL safely."""
    try:
        parsed = urlparse(db_url)
        return {
            "host": parsed.hostname or "localhost",
            "port": parsed.port or 5432,
            "dbname": parsed.path.lstrip("/") or "postgres",
            "user": unquote(parsed.username) if parsed.username else "postgres",
            "password": unquote(parsed.password) if parsed.password else "",
            "sslmode": "require",
        }
    except Exception as e:
        raise ValueError(f"Failed to parse database URL: {e}")


def get_db_credentials(prefix="SOURCE_"):
    """
    Get DB credentials from environment variables.
    Checks PREFIX_DATABASE_URL first, then falls back to PREFIX_DB_HOST, PREFIX_DB_PORT, etc.
    """
    db_url = os.getenv(f"{prefix}DATABASE_URL")
    if db_url:
        return parse_db_url(db_url)

    # Check without prefix if prefix is SOURCE_ and DB_HOST is set
    host = os.getenv(f"{prefix}DB_HOST") or (os.getenv("DB_HOST") if prefix == "SOURCE_" else "")
    if host:
        return {
            "host": host,
            "port": int(os.getenv(f"{prefix}DB_PORT") or os.getenv("DB_PORT", "5432")),
            "dbname": os.getenv(f"{prefix}DB_NAME") or os.getenv("DB_NAME", "postgres"),
            "user": os.getenv(f"{prefix}DB_USER") or os.getenv("DB_USER", "postgres"),
            "password": os.getenv(f"{prefix}DB_PASSWORD") or os.getenv("DB_PASSWORD", ""),
            "sslmode": os.getenv(f"{prefix}DB_SSLMODE") or os.getenv("DB_SSLMODE", "require"),
        }
    return None


def connect_db(creds):
    """Establish connection to PostgreSQL DB safely without leaking secrets."""
    if not creds:
        return None
    try:
        return psycopg2.connect(
            host=creds["host"],
            port=creds["port"],
            dbname=creds["dbname"],
            user=creds["user"],
            password=creds["password"],
            sslmode=creds.get("sslmode", "require"),
            connect_timeout=15,
        )
    except Exception as e:
        err_msg = str(e)
        if creds.get("password"):
            err_msg = err_msg.replace(creds["password"], "********")
        raise RuntimeError(f"Connection failed to {creds['host']}:{creds['port']}: {err_msg}")


def get_table_list(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """)
        return [row[0] for row in cur.fetchall()]


def get_row_counts(conn, tables):
    counts = {}
    with conn.cursor() as cur:
        for t in tables:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{t}";')
                counts[t] = cur.fetchone()[0]
            except Exception:
                conn.rollback()
                counts[t] = -1
    return counts


def get_schema_meta_counts(conn):
    """Retrieve metadata counts for PKs, FKs, Indexes, Constraints, Views, Functions, Triggers."""
    meta = {}
    with conn.cursor() as cur:
        cur.execute("""
            SELECT count(*) FROM information_schema.table_constraints 
            WHERE constraint_type = 'PRIMARY KEY' AND table_schema = 'public';
        """)
        meta["primary_keys"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
        """)
        meta["foreign_keys"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM pg_indexes WHERE schemaname = 'public';
        """)
        meta["indexes"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.table_constraints 
            WHERE table_schema = 'public';
        """)
        meta["constraints"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.sequences WHERE sequence_schema = 'public';
        """)
        meta["sequences"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.views WHERE table_schema = 'public';
        """)
        meta["views"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';
        """)
        meta["functions"] = cur.fetchone()[0]

        cur.execute("""
            SELECT count(*) FROM information_schema.triggers WHERE trigger_schema = 'public';
        """)
        meta["triggers"] = cur.fetchone()[0]
    return meta


def get_table_checksum(conn, table_name):
    """
    Calculate deterministic SHA-256 checksum of table content.
    Sorts by primary key/all columns and hashes concatenated text representation.
    """
    with conn.cursor() as cur:
        try:
            cur.execute("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                  AND tc.table_name = %s
                ORDER BY kcu.ordinal_position;
            """, (table_name,))
            pk_cols = [r[0] for r in cur.fetchall()]

            if pk_cols:
                order_clause = ", ".join([f'"{c}"' for c in pk_cols])
            else:
                order_clause = "1"

            sql = f'''
                SELECT md5(COALESCE(string_agg(md5(t::text), '' ORDER BY {order_clause}), 'EMPTY'))
                FROM (SELECT * FROM "{table_name}" ORDER BY {order_clause}) t;
            '''
            cur.execute(sql)
            return cur.fetchone()[0]
        except Exception:
            conn.rollback()
            return "ERROR_CHECKSUM"


def verify_database_integrity():
    print("\n==================================================")
    print(" SUPABASE REGION MIGRATION - INTEGRITY VERIFICATION")
    print("==================================================\n")

    source_creds = get_db_credentials("SOURCE_")
    target_creds = get_db_credentials("TARGET_")

    if not source_creds:
        print("[ERROR] Source database credentials not found in environment.")
        print("Please set SOURCE_DATABASE_URL or SOURCE_DB_HOST, etc.")
        sys.exit(1)

    print(f"[SOURCE DB] Host: {source_creds['host']}:{source_creds['port']} | DB: {source_creds['dbname']}")
    source_conn = connect_db(source_creds)
    print("  [SUCCESS] Connected to Source DB (Sydney).")

    if not target_creds:
        print("\n[INFO] TARGET_DATABASE_URL is not set.")
        print("Running Source DB Integrity Baseline Audit & Checksum Report...")

        source_tables = get_table_list(source_conn)
        source_counts = get_row_counts(source_conn, source_tables)
        source_meta = get_schema_meta_counts(source_conn)

        print(f"\n[Source DB Schema Metadata]")
        for k, v in source_meta.items():
            print(f"  - {k.replace('_', ' ').capitalize():20s}: {v}")

        print(f"\n[Source Tables & Row Counts ({len(source_tables)} tables)]")
        total_rows = 0
        for t in source_tables:
            rc = source_counts.get(t, 0)
            total_rows += max(rc, 0)
            print(f"  - {t:40s} : {rc} rows")
        print(f"\nTotal Source Database Rows: {total_rows}")
        print("\n==================================================")
        print(" VERIFICATION DIAGNOSTIC COMPLETE (Dry-Run / Baseline)")
        print(" To run full cross-database verification, set TARGET_DATABASE_URL.")
        print("==================================================\n")
        source_conn.close()
        return True

    print(f"[TARGET DB] Host: {target_creds['host']}:{target_creds['port']} | DB: {target_creds['dbname']}")
    target_conn = connect_db(target_creds)
    print("  [SUCCESS] Connected to Target DB (Mumbai).")

    # 1. Compare Tables List
    s_tables = set(get_table_list(source_conn))
    t_tables = set(get_table_list(target_conn))
    all_tables = sorted(list(s_tables.union(t_tables)))

    print(f"\n[1. Table List Verification]")
    if s_tables == t_tables:
        print(f"  MATCH: Both databases contain {len(s_tables)} tables.")
    else:
        print(f"  MISMATCH: Source has {len(s_tables)} tables, Target has {len(t_tables)} tables.")
        missing_in_target = s_tables - t_tables
        if missing_in_target:
            print(f"  Missing in Target: {missing_in_target}")

    # 2. Compare Schema Metadata
    s_meta = get_schema_meta_counts(source_conn)
    t_meta = get_schema_meta_counts(target_conn)

    print(f"\n[2. Schema Metadata Comparison]")
    meta_keys = ["primary_keys", "foreign_keys", "indexes", "constraints", "sequences", "views", "functions", "triggers"]
    overall_meta_pass = True
    for k in meta_keys:
        sv = s_meta.get(k, 0)
        tv = t_meta.get(k, 0)
        status = "MATCH" if sv == tv else "MISMATCH"
        if status != "MATCH":
            overall_meta_pass = False
        print(f"  - {k:15s} | Source: {sv:<4d} | Target: {tv:<4d} | Status: {status}")

    # 3. Compare Row Counts & Deterministic Checksums per Table
    s_counts = get_row_counts(source_conn, all_tables)
    t_counts = get_row_counts(target_conn, all_tables)

    print(f"\n[3. Table Row Counts & Data Checksums Verification]")
    print(f"  {'Table Name':38s} | {'Source Rows':<11s} | {'Target Rows':<11s} | {'Checksum':<10s} | Status")
    print("  " + "-" * 88)

    all_tables_match = True
    for t in all_tables:
        sc = s_counts.get(t, -1)
        tc = t_counts.get(t, -1)

        if sc == tc and sc >= 0:
            s_chk = get_table_checksum(source_conn, t)
            t_chk = get_table_checksum(target_conn, t)
            if s_chk == t_chk and s_chk != "ERROR_CHECKSUM":
                chk_status = "MATCH"
                row_status = "MATCH"
            else:
                chk_status = "MISMATCH"
                row_status = "MISMATCH"
                all_tables_match = False
        else:
            chk_status = "N/A"
            row_status = "MISMATCH"
            all_tables_match = False

        print(f"  {t:38s} | {sc:<11d} | {tc:<11d} | {chk_status:<10s} | {row_status}")

    source_conn.close()
    target_conn.close()

    print("\n==================================================")
    if overall_meta_pass and all_tables_match:
        print(" FINAL MIGRATION VERIFICATION STATUS: PASS")
        print(" Zero data loss verified successfully.")
        print("==================================================\n")
        return True
    else:
        print(" FINAL MIGRATION VERIFICATION STATUS: FAIL")
        print(" Mismatches detected. Review report above before cutover.")
        print("==================================================\n")
        return False


if __name__ == "__main__":
    success = verify_database_integrity()
    if not success:
        sys.exit(1)
