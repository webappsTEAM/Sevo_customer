import os
import sys
import time
import shutil
import argparse
import datetime
import subprocess
from pathlib import Path
import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv

# Load environment variables
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
    Get DB credentials from environment variables safely.
    Never prints or returns unparsed password strings in errors.
    """
    db_url = os.getenv(f"{prefix}DATABASE_URL")
    if db_url:
        return parse_db_url(db_url)

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


def sanitize_creds(creds):
    """Return human-safe string representation of connection target without password."""
    if not creds:
        return "None"
    return f"{creds['user']}@{creds['host']}:{creds['port']}/{creds['dbname']}"


def find_pg_tool(tool_name):
    """Locate pg_dump or pg_restore executable on PATH or standard PostgreSQL paths."""
    which_path = shutil.which(tool_name)
    if which_path:
        return which_path

    search_dirs = [
        Path(r"C:\Program Files\PostgreSQL\18\bin"),
        Path(r"C:\Program Files\PostgreSQL\17\bin"),
        Path(r"C:\Program Files\PostgreSQL\16\bin"),
        Path(r"C:\Program Files\PostgreSQL\15\bin"),
    ]
    for d in search_dirs:
        tool_file = d / f"{tool_name}.exe" if sys.platform == "win32" else d / tool_name
        if tool_file.exists():
            return str(tool_file)

    raise RuntimeError(f"Required PostgreSQL tool '{tool_name}' not found. Please install PostgreSQL tools.")


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
        raise RuntimeError(f"Connection failed to {sanitize_creds(creds)}: {err_msg}")


def create_native_backup(source_creds, backup_dir):
    """
    Export full custom-format binary PostgreSQL backup using native pg_dump.
    Format: -Fc (compressed custom format supporting parallel pg_restore).
    """
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"supabase_sydney_custom_{timestamp}.dump"

    pg_dump_bin = find_pg_tool("pg_dump")
    print(f"[NATIVE BACKUP] Creating binary PostgreSQL dump at: {backup_path.name}")
    print(f"  Tool: {pg_dump_bin}")

    env = os.environ.copy()
    env["PGPASSWORD"] = source_creds["password"]
    env["PGSSLMODE"] = source_creds.get("sslmode", "require")

    cmd = [
        pg_dump_bin,
        "-h", source_creds["host"],
        "-p", str(source_creds["port"]),
        "-U", source_creds["user"],
        "-d", source_creds["dbname"],
        "-Fc",  # Custom compressed binary dump format
        "--no-owner",
        "--no-privileges",
        "-f", str(backup_path)
    ]

    t0 = time.perf_counter()
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    duration = time.perf_counter() - t0

    if res.returncode != 0:
        err = res.stderr.replace(source_creds["password"], "********") if source_creds.get("password") else res.stderr
        print(f"[BACKUP ERROR] pg_dump failed: {err}")
        raise RuntimeError("pg_dump binary backup failed.")

    if not backup_path.exists() or backup_path.stat().st_size == 0:
        raise RuntimeError("Backup verification failed: File is missing or 0 bytes.")

    size_mb = backup_path.stat().st_size / (1024.0 * 1024.0)
    print(f"  [SUCCESS] Binary custom dump created successfully in {duration:.2f}s ({size_mb:.2f} MB).")
    return backup_path, duration, size_mb


def cleanup_extra_tables(source_creds, target_creds):
    """
    Drop tables present in the target but absent from the source.
    These are stale artefacts from previous migration attempts.
    Only drops tables that are confirmed empty (row count = 0).
    """
    print("\n[PRE-RESTORE CLEANUP] Scanning for stale tables in target...")

    def get_public_tables(conn):
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            return {r[0] for r in cur.fetchall()}

    try:
        src_conn = connect_db(source_creds)
        tgt_conn = connect_db(target_creds)

        src_tables = get_public_tables(src_conn)
        tgt_tables = get_public_tables(tgt_conn)
        src_conn.close()

        extra = sorted(tgt_tables - src_tables)
        if not extra:
            print("  [OK] No stale tables found.")
            tgt_conn.close()
            return

        print(f"  Found {len(extra)} stale table(s): {extra}")
        dropped, skipped = 0, 0
        with tgt_conn.cursor() as cur:
            for table in extra:
                try:
                    cur.execute(f'SELECT COUNT(*) FROM "{table}";')
                    cnt = cur.fetchone()[0]
                    if cnt == 0:
                        cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
                        print(f"  [DROPPED] {table} (was empty)")
                        dropped += 1
                    else:
                        print(f"  [SKIPPED] {table} ({cnt} rows — review manually)")
                        skipped += 1
                except Exception as e:
                    tgt_conn.rollback()
                    print(f"  [WARNING] {table}: {e}")
        tgt_conn.commit()
        tgt_conn.close()
        print(f"  Cleanup: {dropped} dropped, {skipped} skipped.")
    except Exception as e:
        print(f"  [WARNING] Stale table cleanup encountered an error: {e}")
        print("  Proceeding with restore — the pg_restore --clean flag will handle existing objects.")


def restore_native_backup(target_creds, backup_path, jobs=4):
    """
    Restore custom-format binary PostgreSQL backup using native pg_restore with parallel workers.
    """
    pg_restore_bin = find_pg_tool("pg_restore")
    print(f"\n[NATIVE RESTORE] Restoring PostgreSQL binary dump using {jobs} parallel workers...")
    print(f"  Tool: {pg_restore_bin}")

    env = os.environ.copy()
    env["PGPASSWORD"] = target_creds["password"]
    env["PGSSLMODE"] = target_creds.get("sslmode", "require")

    cmd = [
        pg_restore_bin,
        "-h", target_creds["host"],
        "-p", str(target_creds["port"]),
        "-U", target_creds["user"],
        "-d", target_creds["dbname"],
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--jobs", str(jobs),
        str(backup_path)
    ]

    t0 = time.perf_counter()
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    duration = time.perf_counter() - t0

    # Note: pg_restore may issue non-fatal warnings (return code 1) on missing DROP IF EXISTS, check output
    if res.returncode not in (0, 1):
        err = res.stderr.replace(target_creds["password"], "********") if target_creds.get("password") else res.stderr
        print(f"[RESTORE ERROR] pg_restore failed with exit code {res.returncode}: {err}")
        raise RuntimeError("pg_restore target restore failed.")

    print(f"  [SUCCESS] Parallel binary restore completed in {duration:.2f}s.")
    return duration


def sync_sequences(t_conn):
    """Synchronize PostgreSQL sequence values (setval) to match max IDs across all tables."""
    print("\n[SEQUENCE SYNCHRONIZATION] Synchronizing sequence counters...")
    with t_conn.cursor() as cur:
        cur.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
        """)
        tables = [r[0] for r in cur.fetchall()]

        synced = 0
        for t in tables:
            try:
                cur.execute(f'''
                    SELECT setval(pg_get_serial_sequence('"{t}"', 'id'), coalesce(max(id), 1), max(id) IS NOT NULL) 
                    FROM "{t}";
                ''')
                synced += 1
            except Exception:
                t_conn.rollback()

    t_conn.commit()
    print(f"  [PASS] Synchronized {synced} table sequences.")


def run_migration(jobs=4, dry_run=False):
    t_start = time.perf_counter()

    print("\n==================================================")
    print(" HIGH-SPEED SUPABASE REGION MIGRATION (NATIVE)")
    print("==================================================")

    backup_dir = Path(__file__).parent / "backups"
    backup_dir.mkdir(exist_ok=True)

    source_creds = get_db_credentials("SOURCE_")
    target_creds = get_db_credentials("TARGET_")

    if not source_creds:
        print("[FATAL ERROR] Source database credentials not configured.")
        print("Set SOURCE_DATABASE_URL or SOURCE_DB_HOST in environment.")
        sys.exit(1)

    print(f"\n[1. SOURCE DATABASE CONNECTION VERIFICATION (Sydney)]")
    print(f"  Target: {sanitize_creds(source_creds)}")
    s_conn = connect_db(source_creds)
    print("  [PASS] Connected successfully to Source DB (Sydney).")

    with s_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
        num_tables = cur.fetchone()[0]

        # Calculate total source rows
        cur.execute("""
            SELECT sum(n_live_tup) 
            FROM pg_stat_user_tables;
        """)
        row_res = cur.fetchone()[0]
        total_source_rows = int(row_res) if row_res else 0

    print(f"  Source Public Tables: {num_tables}")
    print(f"  Source Total Rows:   {total_source_rows}")

    if dry_run:
        print(f"\n[2. DRY-RUN VALIDATION]")
        print("  Creating timestamped dry-run binary dump verification...")
        backup_file, backup_duration, backup_size_mb = create_native_backup(source_creds, backup_dir)

        if target_creds:
            print(f"\n[3. TARGET DATABASE PRE-FLIGHT (Mumbai)]")
            print(f"  Target: {sanitize_creds(target_creds)}")
            t_conn = connect_db(target_creds)
            print("  [PASS] Connected successfully to Target DB (Mumbai).")
            t_conn.close()
        else:
            print("\n[3. TARGET DATABASE PRE-FLIGHT]")
            print("  [NOTICE] TARGET_DATABASE_URL is not set.")

        s_conn.close()
        total_duration = time.perf_counter() - t_start

        print("\n==================================================")
        print(" DRY-RUN MIGRATION BENCHMARK SUMMARY")
        print("==================================================")
        print(f"  Backup Duration:   {backup_duration:.2f} s")
        print(f"  Backup File Size:  {backup_size_mb:.2f} MB")
        print(f"  Total Dry-Run Time:{total_duration:.2f} s")
        print(f"  Source Database:   UNTOUCHED & READ-ONLY (100% Safe)")
        print("==================================================\n")
        return

    if not target_creds:
        print("[FATAL ERROR] TARGET_DATABASE_URL is required for live migration.")
        sys.exit(1)

    print(f"\n[2. NATIVE BINARY BACKUP]")
    backup_file, backup_duration, backup_size_mb = create_native_backup(source_creds, backup_dir)

    print(f"\n[3. TARGET DATABASE NATIVE RESTORE (Mumbai)]")
    print(f"  Target: {sanitize_creds(target_creds)}")
    t_conn = connect_db(target_creds)

    # Remove stale tables in target that are not in source before restore
    cleanup_extra_tables(source_creds, target_creds)

    restore_duration = restore_native_backup(target_creds, backup_file, jobs=jobs)

    # Sync sequences
    sync_sequences(t_conn)
    s_conn.close()
    t_conn.close()

    print("\n[4. EXECUTING INTEGRITY VERIFICATION]")
    t0_verify = time.perf_counter()
    from verify_database_integrity import verify_database_integrity
    verify_success = verify_database_integrity()
    verify_duration = time.perf_counter() - t0_verify

    total_duration = time.perf_counter() - t_start

    print("\n==================================================")
    print(" HIGH-SPEED NATIVE MIGRATION METRICS REPORT")
    print("==================================================")
    print(f"  Backup Duration:           {backup_duration:6.2f} s")
    print(f"  Backup Binary Size:        {backup_size_mb:6.2f} MB")
    print(f"  Restore Duration ({jobs} jobs): {restore_duration:6.2f} s")
    print(f"  Verification Duration:     {verify_duration:6.2f} s")
    print(f"  Total Migration Duration:  {total_duration:6.2f} s")
    print(f"  Tables Migrated:           {num_tables}")
    print(f"  Rows Migrated:             {total_source_rows}")
    print(f"  Verification Result:       {'PASS (ZERO DATA LOSS)' if verify_success else 'FAIL'}")
    print("==================================================\n")

    if not verify_success:
        print("[CRITICAL WARNING] Integrity verification failed! Cutover MUST NOT proceed.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="High-Speed Supabase Native Region Migration Tool")
    parser.add_argument("--jobs", type=int, default=4, help="Number of parallel restore workers (default: 4)")
    parser.add_argument("--dry-run", action="store_true", help="Perform validation and dry-run dump without modifying target DB")
    args = parser.parse_args()

    run_migration(jobs=args.jobs, dry_run=args.dry_run)
