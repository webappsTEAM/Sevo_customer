# Calservice Production Cutover Guide
**Source**: Sydney `aws-0-ap-southeast-2.pooler.supabase.com`  
**Target**: Mumbai `aws-0-ap-south-1.pooler.supabase.com`  
**Script**: `backend/cutover.py`

---

## Overview

```
Sydney Supabase (ap-southeast-2)  ← source, NEVER modified
        │
        │  1. pg_dump -Fc (full binary)
        ▼
  Local dump file (backups/)
        │
        │  2. pg_restore --jobs 4 + stale-table cleanup
        ▼
Mumbai Supabase (ap-south-1)
        │
        │  3. verify_database_integrity.py (must PASS)
        ▼
   Safety Checklist (7 items must all be ✓)
        │
        │  4. --perform-cutover --confirm  ← explicit flag required
        ▼
   .env switched to Mumbai  (.env.pre-cutover backup created)
        │
        │  5. manage.py check + smoke tests
        ▼
  ┌─────────────┴─────────────────┐
  │                               │
[SUCCESS: serve from Mumbai]  [FAIL: rollback to Sydney]
```

---

## Phase 0 — Before You Start

> **⚠ Rotate the Mumbai database password first.**  
> The previous password was exposed in migration session logs and must be changed.
> 1. Go to Supabase Dashboard → Settings → Database → Reset password.
> 2. Update `TARGET_DATABASE_URL` with the new password.

Set the target URL in your terminal (never hardcode credentials):
```powershell
$env:TARGET_DATABASE_URL = "postgresql://postgres.<mumbai-id>:<new-password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
```

---

## Phase 1 — Safe Sync + Verify (No Production Impact)

Run from the `backend/` directory. Source is untouched; `.env` is not changed.

```powershell
cd c:\Users\user\Documents\Calservice\calservices\backend

$env:TARGET_DATABASE_URL = "postgresql://postgres.<mumbai-id>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"

.\.venv\Scripts\python.exe cutover.py
```

This will:
1. Validate Source != Target, Target = Mumbai
2. Check port 8000 (stop Django before proceeding)
3. Create a fresh `pg_dump -Fc` from Sydney
4. Remove stale tables from target
5. `pg_restore --jobs 4 --clean --if-exists` to Mumbai
6. Synchronize and verify sequences
7. Run `verify_database_integrity.py` (must PASS — aborts on FAIL)
8. Print Sydney vs Mumbai latency comparison
9. **Stop here** — print instructions to proceed

---

## Phase 2 — Production Cutover (Switches .env)

Only run after Phase 1 succeeds and `verify_database_integrity.py` shows PASS.

```powershell
.\.venv\Scripts\python.exe cutover.py --perform-cutover --confirm
```

> **Both `--perform-cutover` and `--confirm` are required.** Passing only one flag aborts.

Before switching `.env`, the script verifies a 7-point safety checklist:

```
✓ Source != Target
✓ Target = Mumbai (ap-south-1)
✓ Final backup completed
✓ Source writes paused
✓ Integrity verification PASS
✓ Sequence verification PASS
✓ Target connection PASS
```

If any check fails → **hard abort**. `.env` is not modified.

You will then be prompted:

```
Type 'CUTOVER' to proceed:
```

On confirm, the script:
1. Backs up `.env` → `.env.pre-cutover`
2. Updates `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`, `DB_NAME`, `DB_SSLMODE`
3. Runs `manage.py check` against Mumbai
4. Runs SQL smoke tests (auth, booking, employees, packages, FK integrity)
5. Prints final latency comparison and pass/fail summary

---

## Using an Existing Dump (Skip pg_dump)

If you already have a fresh dump from Phase 1:

```powershell
.\.venv\Scripts\python.exe cutover.py --use-dump backups\supabase_sydney_CUTOVER_<timestamp>.dump
```

---

## Latency Comparison Only

```powershell
# Via cutover.py:
.\.venv\Scripts\python.exe cutover.py --latency-compare

# Via the standalone latency tool:
.\.venv\Scripts\python.exe diagnose_latency_breakdown.py --compare
```

Both run against the current `.env` (Sydney) and `TARGET_DATABASE_URL` (Mumbai) without requiring Django.

---

## Emergency Rollback

If anything fails after the `.env` switch:

```powershell
# 1. Restore the backed-up .env:
copy .env.pre-cutover .env

# 2. Restart the server:
.\.venv\Scripts\python.exe manage.py runserver

# 3. Verify it is pointing to Sydney:
.\.venv\Scripts\python.exe manage.py check
```

Sydney has not been modified at any point. Rollback is instant.

---

## Auxiliary Supabase Services

> **Standard pg_dump does NOT copy Supabase platform services.** Migrate these separately if used:

| Service | Migration method |
|---|---|
| **Auth users** (`auth` schema) | `pg_dump -n auth` from Sydney → restore to Mumbai |
| **Storage buckets** | Supabase CLI: `supabase storage copy --source <src> --target <tgt>` |
| **Realtime** | Re-enable `supabase_realtime` publication on Mumbai tables |
| **Webhooks** | Re-configure in Supabase Dashboard → Integrations → Webhooks |
| **Edge Functions** | `supabase functions deploy --project-ref <mumbai-id>` |

---

## Post-Cutover .env Changes Summary

```diff
- DB_HOST=aws-0-ap-southeast-2.pooler.supabase.com
- DB_USER=postgres.zmwwazawnszrlbftqthe
- DB_PASSWORD=<sydney-password>
+ DB_HOST=aws-0-ap-south-1.pooler.supabase.com
+ DB_USER=postgres.zqghatybqkztzgjmmlpl
+ DB_PASSWORD=<rotated-mumbai-password>
  DB_PORT=5432
  DB_NAME=postgres
  DB_SSLMODE=require
  DB_CONN_MAX_AGE=60
```

---

## Sydney Decommission (Do NOT rush this)

> **Do not delete or pause the Sydney project** until:
> - Mumbai has been serving production traffic for ≥ 7 days
> - No rollback has been needed
> - The backup dump file (`backups/supabase_sydney_CUTOVER_*.dump`) is retained separately

Sydney remains available as a read-only safety net.
