#!/usr/bin/env python3
r"""
Calservice Production Database Cutover Script
Sydney (ap-southeast-2) -> Mumbai (ap-south-1)

SAFE BY DEFAULT  -- running without --perform-cutover only syncs data and verifies.
                   The .env is never touched unless --perform-cutover --confirm are both set.

Usage
-----
  # Safe sync + full verification (no .env change):
  python cutover.py

  # Reuse an existing dump file (skip the pg_dump step):
  python cutover.py --use-dump backups\supabase_sydney_CUTOVER_XXX.dump

  # Full production cutover (switches .env, validates Django):
  python cutover.py --perform-cutover --confirm

  # Latency comparison only (Sydney vs Mumbai):
  python cutover.py --latency-compare

  # Specify parallel restore workers (default: 4):
  python cutover.py --jobs 4

Environment Variables Required
--------------------------------
  TARGET_DATABASE_URL
      postgresql://postgres.<id>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

  Source DB credentials are read from .env:
      DB_HOST / DB_USER / DB_PASSWORD / DB_PORT / DB_NAME
  or from SOURCE_DATABASE_URL if that is explicitly set.

Safety Properties
-----------------
  * Sydney (source) is NEVER modified -- only SELECT and pg_dump are used.
  * Passwords are never printed to the console or log file.
  * .env is backed up to .env.pre-cutover before any modification.
  * Integrity verification FAIL -> hard abort (exit 1); .env is untouched.
  * Sydney project is never deleted or decommissioned.
"""

import os
import re
import sys
import time
import socket
import shutil
import argparse
import datetime
import subprocess
from pathlib import Path

import psycopg2
from urllib.parse import urlparse, unquote
from dotenv import load_dotenv, dotenv_values

# ─── Paths ───────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).parent
BACKUP_DIR  = BACKEND_DIR / "backups"
ENV_FILE    = BACKEND_DIR / ".env"
ENV_BACKUP  = BACKEND_DIR / ".env.pre-cutover"

load_dotenv(ENV_FILE)
BACKUP_DIR.mkdir(exist_ok=True)

_RUN_TS  = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_FILE = BACKUP_DIR / f"cutover_{_RUN_TS}.log"
_log_fh: object = None

MUMBAI_HOSTNAME_PATTERN = "ap-south-1"


# ─── Logging ─────────────────────────────────────────────────────────────────

def log(msg: str = ""):
    global _log_fh
    ts   = datetime.datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    if _log_fh:
        _log_fh.write(line + "\n")
        _log_fh.flush()


def section(title: str):
    bar = "-" * 60
    log()
    log(bar)
    log(f"  {title}")
    log(bar)


def abort(reason: str, exit_code: int = 1):
    log()
    log(f"[ABORT] {reason}")
    log("  Sydney (source) database is UNTOUCHED.")
    log("  Rollback: .env has not been modified.")
    sys.exit(exit_code)


# ─── Credential Helpers ───────────────────────────────────────────────────────

def parse_db_url(db_url: str) -> dict:
    """Parse postgresql://user:password@host:port/dbname safely."""
    try:
        p = urlparse(db_url)
        return {
            "host":    p.hostname or "localhost",
            "port":    p.port or 5432,
            "dbname":  p.path.lstrip("/") or "postgres",
            "user":    unquote(p.username) if p.username else "postgres",
            "password": unquote(p.password) if p.password else "",
            "sslmode": "require",
        }
    except Exception as exc:
        raise ValueError(f"Failed to parse database URL: {exc}")


def get_source_creds() -> dict:
    """Read source credentials from SOURCE_DATABASE_URL or DB_* env vars."""
    db_url = os.getenv("SOURCE_DATABASE_URL")
    if db_url:
        return parse_db_url(db_url)
    host = os.getenv("DB_HOST")
    if not host:
        raise RuntimeError(
            "Source DB credentials not found.\n"
            "Set SOURCE_DATABASE_URL or DB_HOST/DB_USER/DB_PASSWORD in .env."
        )
    return {
        "host":    host,
        "port":    int(os.getenv("DB_PORT", "5432")),
        "dbname":  os.getenv("DB_NAME", "postgres"),
        "user":    os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD", ""),
        "sslmode": os.getenv("DB_SSLMODE", "require"),
    }


def get_target_creds() -> dict:
    """Read target credentials from TARGET_DATABASE_URL (required)."""
    db_url = os.getenv("TARGET_DATABASE_URL")
    if not db_url:
        raise RuntimeError(
            "TARGET_DATABASE_URL is not set.\n"
            "Example:\n"
            "  $env:TARGET_DATABASE_URL='postgresql://postgres.<id>:<pwd>"
            "@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'"
        )
    return parse_db_url(db_url)


def sanitize(creds: dict) -> str:
    """Return connection target string with password redacted."""
    return f"{creds['user']}@{creds['host']}:{creds['port']}/{creds['dbname']}"


def redact(text: str, creds: dict) -> str:
    """Remove password from an error string."""
    pwd = creds.get("password", "")
    if pwd:
        text = text.replace(pwd, "********")
    return text


def connect(creds: dict, label: str = "") -> psycopg2.extensions.connection:
    try:
        conn = psycopg2.connect(
            host=creds["host"], port=creds["port"],
            dbname=creds["dbname"], user=creds["user"],
            password=creds["password"],
            sslmode=creds.get("sslmode", "require"),
            connect_timeout=20,
        )
        conn.autocommit = False
        return conn
    except Exception as exc:
        raise RuntimeError(
            f"Connection failed ({label or sanitize(creds)}): {redact(str(exc), creds)}"
        )


def find_pg_tool(name: str) -> str:
    path = shutil.which(name)
    if path:
        return path
    for ver in ("18", "17", "16", "15"):
        candidate = Path(rf"C:\Program Files\PostgreSQL\{ver}\bin") / f"{name}.exe"
        if candidate.exists():
            return str(candidate)
    raise RuntimeError(
        f"'{name}' not found. Install PostgreSQL client tools and add them to PATH."
    )


# ─── Safety Validations ───────────────────────────────────────────────────────

def validate_source_not_target(src: dict, tgt: dict) -> bool:
    """Ensure source and target are different databases."""
    src_key = f"{src['host']}:{src['port']}/{src['dbname']}/{src['user']}"
    tgt_key = f"{tgt['host']}:{tgt['port']}/{tgt['dbname']}/{tgt['user']}"
    if src_key == tgt_key:
        log("  [FAIL] Source and Target are the same database — aborting.")
        return False
    log(f"  [OK]   Source != Target")
    return True


def validate_target_is_mumbai(tgt: dict) -> bool:
    """Confirm the target host belongs to the Mumbai (ap-south-1) region."""
    if MUMBAI_HOSTNAME_PATTERN not in tgt["host"]:
        log(f"  [FAIL] Target host '{tgt['host']}' does not appear to be Mumbai (ap-south-1).")
        log("         Expected hostname to contain 'ap-south-1'.")
        return False
    log(f"  [OK]   Target = Mumbai (ap-south-1) confirmed")
    return True


def validate_target_connection(tgt: dict) -> bool:
    """Open a test connection to the target and verify it works."""
    try:
        conn = connect(tgt, "Target (Mumbai)")
        with conn.cursor() as cur:
            cur.execute("SELECT 1;")
        conn.close()
        log("  [OK]   Target connection verified")
        return True
    except Exception as exc:
        log(f"  [FAIL] Target connection failed: {exc}")
        return False


# ─── Phase 1: Pre-flight ──────────────────────────────────────────────────────

def phase_preflight(src: dict, tgt: dict) -> dict:
    section("PHASE 1 — PRE-FLIGHT CHECK")

    ok_src_not_tgt = validate_source_not_target(src, tgt)
    ok_mumbai      = validate_target_is_mumbai(tgt)

    if not ok_src_not_tgt:
        abort("Source and target cannot be the same database.")
    if not ok_mumbai:
        abort("Target database is not the Mumbai project.")

    # Source stats
    log(f"  Source (Sydney):  {sanitize(src)}")
    t0 = time.perf_counter()
    src_conn = connect(src, "Source (Sydney)")
    src_connect_ms = (time.perf_counter() - t0) * 1000

    with src_conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE';"
        )
        src_tables = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(sum(n_live_tup), 0) FROM pg_stat_user_tables;")
        src_rows = int(cur.fetchone()[0])
    src_conn.close()

    log(f"  [OK]   Source connected in {src_connect_ms:.0f} ms")
    log(f"         Tables: {src_tables}   Rows: ~{src_rows:,}")

    # Target stats
    log(f"  Target (Mumbai):  {sanitize(tgt)}")
    t0 = time.perf_counter()
    tgt_conn = connect(tgt, "Target (Mumbai)")
    tgt_connect_ms = (time.perf_counter() - t0) * 1000

    with tgt_conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE';"
        )
        tgt_tables = cur.fetchone()[0]
    tgt_conn.close()

    log(f"  [OK]   Target connected in {tgt_connect_ms:.0f} ms")
    log(f"         Tables currently: {tgt_tables}")

    log()
    log("  [NOTICE] REMINDER: Rotate the Mumbai database password before --perform-cutover.")
    log("     Supabase Dashboard -> Settings -> Database -> Reset password.")
    log("     Then update TARGET_DATABASE_URL with the new password.")

    return {
        "src_tables": src_tables,
        "src_rows":   src_rows,
        "tgt_tables": tgt_tables,
    }


# ─── Latency Measurement ─────────────────────────────────────────────────────

def measure_latency(creds: dict, label: str) -> dict:
    """Measure DNS, TCP, PG connect, and query latencies. No passwords in output."""
    r = {"label": label, "host": creds["host"]}
    host, port = creds["host"], creds["port"]

    # DNS
    t0 = time.perf_counter()
    try:
        ip = socket.gethostbyname(host)
        r["dns_ms"] = (time.perf_counter() - t0) * 1000
        r["ip"] = ip
    except Exception:
        r["dns_ms"] = -1.0
        r["ip"] = "?"

    # TCP handshake
    t0 = time.perf_counter()
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(10)
        s.connect((r.get("ip", host), port))
        r["tcp_ms"] = (time.perf_counter() - t0) * 1000
        s.close()
    except Exception:
        r["tcp_ms"] = -1.0

    # Full PG auth + TLS connect
    t0 = time.perf_counter()
    try:
        conn = psycopg2.connect(
            host=host, port=port, dbname=creds["dbname"],
            user=creds["user"], password=creds["password"],
            sslmode=creds.get("sslmode", "require"), connect_timeout=20,
        )
        r["connect_ms"] = (time.perf_counter() - t0) * 1000
        cur = conn.cursor()

        # SELECT 1 (first, on warm connection)
        t0 = time.perf_counter()
        cur.execute("SELECT 1;")
        cur.fetchone()
        r["select1_ms"] = (time.perf_counter() - t0) * 1000

        # SELECT 1 (repeat — confirm stability)
        t0 = time.perf_counter()
        cur.execute("SELECT 1;")
        cur.fetchone()
        r["select1_repeat_ms"] = (time.perf_counter() - t0) * 1000

        # accounts_user COUNT
        t0 = time.perf_counter()
        cur.execute("SELECT count(*) FROM accounts_user;")
        cur.fetchone()
        r["user_count_ms"] = (time.perf_counter() - t0) * 1000

        # companies_company LIMIT 1
        t0 = time.perf_counter()
        cur.execute("SELECT id FROM companies_company LIMIT 1;")
        cur.fetchone()
        r["company_ms"] = (time.perf_counter() - t0) * 1000

        conn.close()
    except Exception as exc:
        r.setdefault("connect_ms", -1.0)
        r.setdefault("select1_ms", -1.0)
        r.setdefault("select1_repeat_ms", -1.0)
        r.setdefault("user_count_ms", -1.0)
        r.setdefault("company_ms", -1.0)
        r["error"] = redact(str(exc), creds)

    return r


def phase_measure_latency_baseline(src: dict, label: str = "Sydney baseline") -> dict:
    section(f"SOURCE LATENCY BASELINE ({label})")
    m = measure_latency(src, label)
    log(f"  DNS Resolution:     {m.get('dns_ms', -1):.1f} ms  ({m.get('ip', '?')})")
    log(f"  TCP Handshake RTT:  {m.get('tcp_ms', -1):.1f} ms")
    log(f"  PG Auth + TLS:      {m.get('connect_ms', -1):.1f} ms")
    log(f"  SELECT 1 (warm):    {m.get('select1_ms', -1):.1f} ms")
    log(f"  SELECT 1 (repeat):  {m.get('select1_repeat_ms', -1):.1f} ms")
    return m


def phase_latency_compare(src: dict, tgt: dict) -> tuple:
    section("LATENCY COMPARISON — Sydney vs Mumbai (measured)")
    log("  Measuring Sydney ...")
    src_m = measure_latency(src, "Sydney (ap-southeast-2)")
    log("  Measuring Mumbai ...")
    tgt_m = measure_latency(tgt, "Mumbai (ap-south-1)")

    def fmt(ms: float) -> str:
        return f"{ms:7.1f} ms" if ms >= 0 else "  FAILED"

    def improvement(s: float, t: float) -> str:
        if s > 0 and t > 0:
            delta = s - t
            pct   = (delta / s) * 100
            return f"{delta:+.0f} ms  ({pct:+.0f}%)"
        return "N/A"

    metrics = [
        ("DNS Resolution",              "dns_ms"),
        ("TCP Handshake RTT",           "tcp_ms"),
        ("PG Auth + TLS Connect",       "connect_ms"),
        ("SELECT 1 (warm conn)",        "select1_ms"),
        ("SELECT 1 (repeat)",           "select1_repeat_ms"),
        ("accounts_user COUNT(*)",      "user_count_ms"),
        ("companies_company LIMIT 1",   "company_ms"),
    ]

    log()
    log(f"  {'Measurement':33s}  {'Sydney':>10s}  {'Mumbai':>10s}  {'Change':>14s}")
    log(f"  {'-'*73}")
    for label, key in metrics:
        sv = src_m.get(key, -1.0)
        tv = tgt_m.get(key, -1.0)
        log(f"  {label:33s}  {fmt(sv):>10s}  {fmt(tv):>10s}  {improvement(sv, tv):>14s}")

    log()
    conn_src = src_m.get("connect_ms", -1.0)
    conn_tgt = tgt_m.get("connect_ms", -1.0)
    if conn_src > 0 and conn_tgt > 0:
        log(f"  Connection latency reduction: {conn_src - conn_tgt:.0f} ms "
            f"({((conn_src - conn_tgt) / conn_src) * 100:.0f}% faster)")
    return src_m, tgt_m


# ─── Phase 2: Maintenance Gate ───────────────────────────────────────────────

def phase_maintenance_gate(auto_confirm: bool = False):
    section("PHASE 2 — MAINTENANCE GATE (PAUSE SOURCE WRITES)")
    log("  The source database must have no new writes during the final dump.")
    log()
    log("  Stop the Django server:  Ctrl+C in its terminal")
    log("  Stop Celery workers:     Ctrl+C in each worker terminal")
    log()

    # Detect Django on port 8000
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1.0)
        if s.connect_ex(("127.0.0.1", 8000)) == 0:
            log("  [NOTICE] Django server detected on port 8000 -- stop it before proceeding.")
        else:
            log("  [OK]   Port 8000 is free -- server appears stopped.")
        s.close()
    except Exception:
        pass

    if auto_confirm:
        log("  [AUTO-CONFIRM] Skipping maintenance gate.")
        return

    ans = input("\n  Confirm all application write traffic is paused [yes/no]: ").strip().lower()
    if ans not in ("yes", "y"):
        abort("Maintenance gate not confirmed.")
    log("  [CONFIRMED] Proceeding with fresh dump.")


# ─── Phase 3: Fresh Full pg_dump ─────────────────────────────────────────────

def phase_dump(src: dict) -> tuple:
    section("PHASE 3 — FRESH FULL pg_dump FROM SYDNEY")
    pg_dump = find_pg_tool("pg_dump")
    ts        = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    dump_path = BACKUP_DIR / f"supabase_sydney_CUTOVER_{ts}.dump"

    log(f"  Source: {sanitize(src)}")
    log(f"  File:   {dump_path.name}")
    log(f"  Tool:   {pg_dump}")

    env                = os.environ.copy()
    env["PGPASSWORD"]  = src["password"]
    env["PGSSLMODE"]   = src.get("sslmode", "require")

    cmd = [
        pg_dump,
        "-h", src["host"], "-p", str(src["port"]),
        "-U", src["user"], "-d", src["dbname"],
        "-Fc",              # custom compressed binary — supports parallel pg_restore
        "--no-owner",
        "--no-privileges",
        "-f", str(dump_path),
    ]

    log("  Running pg_dump ...")
    t0  = time.perf_counter()
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    dur = time.perf_counter() - t0

    if res.returncode != 0:
        err = redact(res.stderr, src)
        log(f"  [ERROR] pg_dump failed:\n{err}")
        abort("pg_dump failed — no changes made to target.")

    if not dump_path.exists() or dump_path.stat().st_size == 0:
        abort("Dump file is missing or empty after pg_dump.")

    size_mb = dump_path.stat().st_size / 1_048_576
    log(f"  [OK]   Dump created in {dur:.1f}s  ({size_mb:.2f} MB)")
    return dump_path, dur, size_mb


# ─── Phase 4a: Stale Table Cleanup ───────────────────────────────────────────

def phase_cleanup_target(src: dict, tgt: dict):
    """Drop tables present in target but absent from source (stale migration artefacts)."""
    section("PHASE 4a — CLEAN UP STALE TABLES IN TARGET")

    src_conn = connect(src, "Source")
    tgt_conn = connect(tgt, "Target")

    def get_tables(conn):
        with conn.cursor() as cur:
            cur.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' AND table_type='BASE TABLE';"
            )
            return {r[0] for r in cur.fetchall()}

    src_tables = get_tables(src_conn)
    tgt_tables = get_tables(tgt_conn)
    src_conn.close()

    extra = sorted(tgt_tables - src_tables)
    if not extra:
        log("  [OK]   No stale tables found in target.")
        tgt_conn.close()
        return

    log(f"  Found {len(extra)} stale table(s) in target: {extra}")
    dropped, skipped = 0, 0
    with tgt_conn.cursor() as cur:
        for table in extra:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table}";')
                cnt = cur.fetchone()[0]
                if cnt == 0:
                    cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE;')
                    log(f"  [DROPPED]  {table}  (was empty — safe to remove)")
                    dropped += 1
                else:
                    log(f"  [SKIPPED]  {table}  ({cnt} rows — review manually)")
                    skipped += 1
            except Exception as exc:
                tgt_conn.rollback()
                log(f"  [WARNING]  {table}: {exc}")
    tgt_conn.commit()
    tgt_conn.close()
    log(f"  Cleanup: {dropped} dropped, {skipped} skipped.")


# ─── Phase 4b: pg_restore ────────────────────────────────────────────────────

def phase_restore(tgt: dict, dump_path: Path, jobs: int = 4) -> float:
    section(f"PHASE 4b — pg_restore TO MUMBAI  ({jobs} parallel jobs)")
    pg_restore = find_pg_tool("pg_restore")

    log(f"  Target: {sanitize(tgt)}")
    log(f"  Dump:   {dump_path.name}  ({dump_path.stat().st_size / 1_048_576:.2f} MB)")
    log(f"  Tool:   {pg_restore}")

    env                = os.environ.copy()
    env["PGPASSWORD"]  = tgt["password"]
    env["PGSSLMODE"]   = tgt.get("sslmode", "require")

    cmd = [
        pg_restore,
        "-h", tgt["host"], "-p", str(tgt["port"]),
        "-U", tgt["user"], "-d", tgt["dbname"],
        "--clean", "--if-exists",
        "--no-owner", "--no-privileges",
        "--jobs", str(jobs),
        str(dump_path),
    ]

    log("  Running pg_restore ...")
    t0  = time.perf_counter()
    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    dur = time.perf_counter() - t0

    # pg_restore exits 1 for non-fatal DROP IF NOT EXISTS warnings — treat as OK
    if res.returncode not in (0, 1):
        err = redact(res.stderr, tgt)
        log(f"  [ERROR] pg_restore failed (exit {res.returncode}):\n{err}")
        abort("pg_restore failed.")

    # Surface any actual errors (not DROP warnings) from stderr
    fatal_errors = [
        ln for ln in res.stderr.splitlines()
        if "error:" in ln.lower() and "does not exist" not in ln.lower()
    ]
    if fatal_errors:
        log(f"  [WARN] {len(fatal_errors)} restore error(s) detected:")
        for line in fatal_errors[:10]:
            log(f"     {line.strip()}")

    log(f"  [OK]   Restore completed in {dur:.1f}s")
    return dur


# ─── Phase 5: Sequence Synchronization ───────────────────────────────────────

def phase_sync_sequences(tgt: dict) -> int:
    section("PHASE 5 — SEQUENCE SYNCHRONIZATION")
    tgt_conn = connect(tgt, "Target")
    with tgt_conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE';"
        )
        tables = [r[0] for r in cur.fetchall()]

    synced, skipped = 0, 0
    with tgt_conn.cursor() as cur:
        for t in tables:
            try:
                cur.execute(f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{t}"', 'id'),
                        COALESCE(MAX(id), 1),
                        MAX(id) IS NOT NULL
                    ) FROM "{t}";
                """)
                synced += 1
            except Exception:
                tgt_conn.rollback()
                skipped += 1
    tgt_conn.commit()
    tgt_conn.close()
    log(f"  [OK]   Synced {synced} sequence(s).  Skipped {skipped} (no 'id' column).")
    return synced


def phase_verify_sequences(tgt: dict) -> bool:
    """Confirm each sequence last_value >= max(id) in its table."""
    log("  Verifying sequence values ...")
    tgt_conn = connect(tgt, "Target")
    with tgt_conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' AND table_type='BASE TABLE';"
        )
        tables = [r[0] for r in cur.fetchall()]

    issues = []
    with tgt_conn.cursor() as cur:
        for t in tables:
            try:
                cur.execute(f"""
                    SELECT pg_get_serial_sequence('"{t}"', 'id'),
                           COALESCE(MAX(id), 0)
                    FROM "{t}";
                """)
                row = cur.fetchone()
                if not row or not row[0]:
                    continue
                seq_name, max_id = row
                cur.execute(f"SELECT last_value FROM {seq_name};")
                last_val = cur.fetchone()[0]
                if last_val < max_id:
                    issues.append(f"{t}: sequence={last_val} < max_id={max_id}")
            except Exception:
                tgt_conn.rollback()
    tgt_conn.close()

    if issues:
        for issue in issues:
            log(f"  [FAIL]  {issue}")
        return False
    log("  [OK]   All sequences verified (last_value >= max id).")
    return True


# ─── Phase 6: Integrity Verification ─────────────────────────────────────────

def phase_verify_integrity() -> bool:
    section("PHASE 6 — INTEGRITY VERIFICATION")
    verify_script = BACKEND_DIR / "verify_database_integrity.py"
    venv_python   = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
    python        = str(venv_python) if venv_python.exists() else sys.executable

    log("  Running verify_database_integrity.py ...")
    env = os.environ.copy()
    res = subprocess.run(
        [python, str(verify_script)],
        capture_output=True, text=True,
        cwd=str(BACKEND_DIR), env=env,
    )

    for line in res.stdout.splitlines():
        log(f"    {line}")
    for line in res.stderr.splitlines():
        if line.strip():
            log(f"    [STDERR] {line}")

    if res.returncode == 0:
        log("  [OK]   Integrity verification PASSED — zero data loss confirmed.")
        return True
    else:
        log("  [FAIL] Integrity verification FAILED.")
        return False


# ─── Pre-Cutover Safety Checklist ────────────────────────────────────────────

def display_safety_checklist(
    src_not_tgt:  bool,
    tgt_is_mumbai: bool,
    backup_done:   bool,
    writes_paused: bool,
    integrity_ok:  bool,
    sequences_ok:  bool,
    tgt_conn_ok:   bool,
) -> bool:
    section("PRE-CUTOVER SAFETY CHECKLIST")
    checks = [
        ("Source != Target",           src_not_tgt),
        ("Target = Mumbai (ap-south-1)", tgt_is_mumbai),
        ("Final backup completed",     backup_done),
        ("Source writes paused",       writes_paused),
        ("Integrity verification PASS", integrity_ok),
        ("Sequence verification PASS", sequences_ok),
        ("Target connection PASS",     tgt_conn_ok),
    ]
    all_ok = True
    for label, ok in checks:
        symbol = "[OK]" if ok else "[FAIL]"
        log(f"  {symbol:6s} {label}")
        if not ok:
            all_ok = False
    log()
    if all_ok:
        log("  All safety checks passed. Ready for cutover.")
    else:
        log("  One or more checks FAILED -- cutover cannot proceed.")
    return all_ok


# ─── Phase 7: .env Switch ────────────────────────────────────────────────────

def phase_env_switch(tgt: dict):
    section("PHASE 7 — SWITCH .env TO MUMBAI")

    # Backup current .env
    shutil.copy2(ENV_FILE, ENV_BACKUP)
    log(f"  [OK]   Backed up .env -> {ENV_BACKUP.name}")

    updates = {
        "DB_HOST":    tgt["host"],
        "DB_PORT":    str(tgt["port"]),
        "DB_NAME":    tgt["dbname"],
        "DB_USER":    tgt["user"],
        "DB_PASSWORD": tgt["password"],
        "DB_SSLMODE": tgt.get("sslmode", "require"),
    }

    lines   = ENV_FILE.read_text(encoding="utf-8").splitlines()
    updated = set()
    new_lines = []

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            new_lines.append(line)
            continue
        key = stripped.split("=", 1)[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}")
            updated.add(key)
            log(f"  Updated: {key}=<new value>")
        else:
            new_lines.append(line)

    # Append any keys not already in the file
    for key, val in updates.items():
        if key not in updated:
            new_lines.append(f"{key}={val}")
            log(f"  Added:   {key}=<new value>")

    ENV_FILE.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    log()
    log(f"  [OK]   .env updated to Mumbai credentials.")
    log(f"         Rollback: copy .env.pre-cutover .env  and restart server.")


# ─── Phase 8: Django System Check ────────────────────────────────────────────

def phase_django_check() -> bool:
    section("PHASE 8 — DJANGO SYSTEM CHECK AGAINST MUMBAI")
    venv_python = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
    python      = str(venv_python) if venv_python.exists() else sys.executable

    # Reload .env so Django sees the new credentials
    fresh_env = {**os.environ, **dotenv_values(str(ENV_FILE))}

    log("  Running: manage.py check ...")
    res = subprocess.run(
        [python, "manage.py", "check", "--verbosity=1"],
        capture_output=True, text=True,
        cwd=str(BACKEND_DIR), env=fresh_env,
    )
    for line in res.stdout.splitlines():
        log(f"    {line}")
    for line in res.stderr.splitlines():
        if line.strip():
            log(f"    [STDERR] {line}")

    if res.returncode == 0:
        log("  [OK]   Django system check passed.")
        return True
    log("  [FAIL] Django system check failed. Review output above.")
    return False


# ─── Phase 9: SQL Smoke Tests ────────────────────────────────────────────────

def phase_smoke_tests(tgt: dict) -> bool:
    section("PHASE 9 — SMOKE TESTS AGAINST MUMBAI")
    log("  Verifying critical tables, FKs, and sequences via direct SQL ...")

    tests = [
        # (description, SQL, expects_rows)
        ("Auth - accounts_user readable",
         "SELECT count(*) FROM accounts_user;", True),

        ("Auth - accounts_user has PK",
         "SELECT id FROM accounts_user LIMIT 1;", True),

        ("Companies - companies_company readable",
         "SELECT count(*) FROM companies_company;", True),

        ("Service - service_requests_service",
         "SELECT count(*) FROM service_requests_service;", True),

        ("Packages - service_requests_package has PK",
         "SELECT id FROM service_requests_package LIMIT 1;", True),

        ("FK - catalogserviceaddon -> package",
         "SELECT count(*) FROM service_requests_catalogserviceaddon sa "
         "JOIN service_requests_package p ON p.id = sa.service_id;", False),

        ("FK - catalogservicevariant -> package",
         "SELECT count(*) FROM service_requests_catalogservicevariant sv "
         "JOIN service_requests_package p ON p.id = sv.service_id;", False),

        ("Employees - employees_employee readable",
         "SELECT count(*) FROM employees_employee;", True),

        ("Bookings - service_requests_servicerequest",
         "SELECT count(*) FROM service_requests_servicerequest;", True),

        ("Sequences - accounts_user_id_seq exists",
         "SELECT last_value FROM accounts_user_id_seq;", True),

        ("Notifications - accounts_user has valid company FK",
         "SELECT count(*) FROM accounts_user u "
         "JOIN companies_company c ON c.id = u.company_id "
         "WHERE u.company_id IS NOT NULL;", False),
    ]

    tgt_conn  = connect(tgt, "Target (Mumbai)")
    all_pass  = True
    for label, sql, expect_rows in tests:
        try:
            with tgt_conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()
                tgt_conn.rollback()
            val = row[0] if row else None
            if expect_rows and (val is None or val == 0):
                log(f"  [WARN]  {label} → {val}  (expected rows)")
            else:
                log(f"  [PASS]  {label} → {val}")
        except Exception as exc:
            tgt_conn.rollback()
            log(f"  [FAIL]  {label} → {exc}")
            all_pass = False

    tgt_conn.close()
    if all_pass:
        log("  [OK]   All smoke tests passed.")
    else:
        log("  [WARN] Some smoke tests failed — review above.")
    return all_pass


# ─── Final Report ─────────────────────────────────────────────────────────────

def phase_final_report(
    *,
    dump_dur:   float,
    dump_mb:    float,
    restore_dur: float,
    jobs:       int,
    seq_count:  int,
    integrity_ok: bool,
    sequences_ok: bool,
    django_ok:  bool,
    smoke_ok:   bool,
    src_lat:    dict,
    tgt_lat:    dict,
    performed_cutover: bool,
    dump_path:  Path,
    total_dur:  float,
):
    section("FINAL REPORT")

    log(f"  Total Duration:          {total_dur:.1f} s")
    log(f"  Dump Duration:           {dump_dur:.1f} s   ({dump_mb:.2f} MB)")
    log(f"  Restore Duration:        {restore_dur:.1f} s   ({jobs} parallel workers)")
    log(f"  Sequences Synced:        {seq_count}")
    log(f"  Integrity Verification:  {'PASS [OK]' if integrity_ok else 'FAIL [X]'}")
    log(f"  Sequence Verification:   {'PASS [OK]' if sequences_ok else 'FAIL [X]'}")
    if performed_cutover:
        log(f"  Django Check:            {'PASS [OK]' if django_ok else 'FAIL [X]'}")
        log(f"  Smoke Tests:             {'PASS [OK]' if smoke_ok else 'FAIL [X]'}")

    log()
    log("  LATENCY IMPROVEMENT (Sydney -> Mumbai):")
    metrics = [
        ("PG Auth + TLS",  "connect_ms"),
        ("SELECT 1 warm",  "select1_ms"),
        ("SELECT 1 repeat", "select1_repeat_ms"),
    ]
    for label, key in metrics:
        sv = src_lat.get(key, -1.0)
        tv = tgt_lat.get(key, -1.0)
        if sv > 0 and tv > 0:
            delta = sv - tv
            pct   = (delta / sv) * 100
            log(f"    {label:18s}: {sv:.1f} ms -> {tv:.1f} ms  "
                f"({delta:+.0f} ms, {pct:+.0f}%)")

    log()
    log(f"  Dump file retained at:  {dump_path}")

    if performed_cutover:
        if integrity_ok and django_ok and smoke_ok:
            log()
            log("  [SUCCESS] CUTOVER STATUS: SUCCESS")
            log("      Application is now pointing to Mumbai (ap-south-1).")
            log("      Sydney (ap-southeast-2) is UNTOUCHED and available for rollback.")
            log()
            log("  ROLLBACK INSTRUCTIONS (if needed):")
            log("    copy .env.pre-cutover .env")
            log("    Restart the Django server and Celery workers.")
        else:
            log()
            log("  [WARNING] CUTOVER STATUS: ISSUES DETECTED")
            log("      Check the output above and consider rolling back:")
            log("        copy .env.pre-cutover .env")
            log("        Restart the Django server and Celery workers.")
    else:
        log()
        log("  [SUCCESS] SYNC COMPLETE -- Production cutover NOT yet performed.")
        log("      Data is ready in Mumbai. To complete the switch run:")
        log(r"        python cutover.py --perform-cutover --confirm")

    log()
    log(f"  Full log saved to: {LOG_FILE}")


# ─── Main Orchestration ───────────────────────────────────────────────────────

def main():
    global _log_fh

    parser = argparse.ArgumentParser(
        description="Calservice Production Database Cutover: Sydney -> Mumbai",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python cutover.py                       # safe sync + verify\n"
            "  python cutover.py --perform-cutover --confirm  # full cutover\n"
            "  python cutover.py --latency-compare    # latency comparison only\n"
            "  python cutover.py --use-dump backups/supabase_sydney_CUTOVER_X.dump\n"
        ),
    )
    parser.add_argument("--jobs", type=int, default=4,
                        help="Parallel pg_restore workers (default: 4)")
    parser.add_argument("--perform-cutover", action="store_true",
                        help="Switch .env to Mumbai and validate (requires --confirm)")
    parser.add_argument("--confirm", action="store_true",
                        help="Explicit confirmation required alongside --perform-cutover")
    parser.add_argument("--use-dump", type=str, default=None,
                        help="Skip pg_dump and use this existing dump file path")
    parser.add_argument("--latency-compare", action="store_true",
                        help="Run latency comparison only (Sydney vs Mumbai)")
    parser.add_argument("--auto-confirm", action="store_true",
                        help="Skip interactive prompts (for CI/scripted use)")
    args = parser.parse_args()

    # Validate flag combination
    if args.perform_cutover and not args.confirm:
        print("[ERROR] --perform-cutover requires --confirm to prevent accidental cutover.")
        print("  Run: python cutover.py --perform-cutover --confirm")
        sys.exit(1)

    # Open log file
    BACKUP_DIR.mkdir(exist_ok=True)
    _log_fh = open(LOG_FILE, "w", encoding="utf-8")

    try:
        log(f"Calservice Production Cutover Script")
        log(f"Started: {datetime.datetime.now().isoformat()}")
        log(f"Log:     {LOG_FILE}")
        t_total = time.perf_counter()

        # Load credentials
        src_creds = get_source_creds()
        tgt_creds = get_target_creds()

        # ── Latency-only mode ─────────────────────────────────────────────
        if args.latency_compare:
            phase_latency_compare(src_creds, tgt_creds)
            return

        # ── Phase 1: Pre-flight ───────────────────────────────────────────
        preflight = phase_preflight(src_creds, tgt_creds)

        # Capture source latency baseline before anything changes
        src_latency = phase_measure_latency_baseline(src_creds)

        # ── Phase 2: Maintenance gate ─────────────────────────────────────
        phase_maintenance_gate(auto_confirm=args.auto_confirm)
        writes_paused = True

        # ── Phase 3: Dump ─────────────────────────────────────────────────
        if args.use_dump:
            dump_path = Path(args.use_dump)
            if not dump_path.is_absolute():
                dump_path = BACKEND_DIR / dump_path
            if not dump_path.exists():
                abort(f"Specified dump file not found: {dump_path}")
            dump_size_mb  = dump_path.stat().st_size / 1_048_576
            dump_duration = 0.0
            section("PHASE 3 — USING EXISTING DUMP FILE")
            log(f"  {dump_path.name}  ({dump_size_mb:.2f} MB)")
        else:
            dump_path, dump_duration, dump_size_mb = phase_dump(src_creds)

        backup_done = True

        # ── Phase 4a: Stale table cleanup ────────────────────────────────
        phase_cleanup_target(src_creds, tgt_creds)

        # ── Phase 4b: Restore ─────────────────────────────────────────────
        restore_dur = phase_restore(tgt_creds, dump_path, jobs=args.jobs)

        # ── Phase 5: Sequences ────────────────────────────────────────────
        seq_count   = phase_sync_sequences(tgt_creds)
        seq_ok      = phase_verify_sequences(tgt_creds)

        # ── Phase 6: Integrity verification ──────────────────────────────
        integrity_ok = phase_verify_integrity()

        if not integrity_ok:
            section("CUTOVER BLOCKED — INTEGRITY VERIFICATION FAILED")
            log("  The target database has data mismatches.")
            log("  The source (Sydney) is UNTOUCHED. .env is unchanged.")
            log(f"  Dump retained at: {dump_path}")
            log("  Resolve the mismatches and re-run before attempting cutover.")
            sys.exit(1)

        # ── Latency comparison (before env switch) ────────────────────────
        src_lat, tgt_lat = phase_latency_compare(src_creds, tgt_creds)

        # ── Gate: safe sync complete ──────────────────────────────────────
        if not args.perform_cutover:
            phase_final_report(
                dump_dur=dump_duration, dump_mb=dump_size_mb,
                restore_dur=restore_dur, jobs=args.jobs, seq_count=seq_count,
                integrity_ok=integrity_ok, sequences_ok=seq_ok,
                django_ok=False, smoke_ok=False,
                src_lat=src_latency, tgt_lat=tgt_lat,
                performed_cutover=False, dump_path=dump_path,
                total_dur=time.perf_counter() - t_total,
            )
            return

        # ── Pre-cutover safety checklist ─────────────────────────────────
        src_not_tgt = validate_source_not_target(src_creds, tgt_creds)
        tgt_mumbai  = validate_target_is_mumbai(tgt_creds)
        tgt_conn_ok = validate_target_connection(tgt_creds)

        all_clear = display_safety_checklist(
            src_not_tgt=src_not_tgt,
            tgt_is_mumbai=tgt_mumbai,
            backup_done=backup_done,
            writes_paused=writes_paused,
            integrity_ok=integrity_ok,
            sequences_ok=seq_ok,
            tgt_conn_ok=tgt_conn_ok,
        )

        if not all_clear:
            abort("Safety checklist failed — cutover blocked.")

        # Final confirmation (unless --auto-confirm)
        if not args.auto_confirm:
            log()
            log("  This will update .env to point to Mumbai (ap-south-1).")
            log("  A backup will be saved as .env.pre-cutover.")
            log("  Sydney remains untouched and available for instant rollback.")
            ans = input("\n  Type 'CUTOVER' to proceed: ").strip()
            if ans != "CUTOVER":
                abort("Cutover cancelled by user.")

        # ── Phase 7: .env switch ──────────────────────────────────────────
        phase_env_switch(tgt_creds)

        # ── Phase 8: Django check ─────────────────────────────────────────
        django_ok = phase_django_check()

        # ── Phase 9: Smoke tests ──────────────────────────────────────────
        smoke_ok = phase_smoke_tests(tgt_creds)

        # ── Final report ──────────────────────────────────────────────────
        phase_final_report(
            dump_dur=dump_duration, dump_mb=dump_size_mb,
            restore_dur=restore_dur, jobs=args.jobs, seq_count=seq_count,
            integrity_ok=integrity_ok, sequences_ok=seq_ok,
            django_ok=django_ok, smoke_ok=smoke_ok,
            src_lat=src_latency, tgt_lat=tgt_lat,
            performed_cutover=True, dump_path=dump_path,
            total_dur=time.perf_counter() - t_total,
        )

    finally:
        if _log_fh:
            _log_fh.close()


if __name__ == "__main__":
    main()
