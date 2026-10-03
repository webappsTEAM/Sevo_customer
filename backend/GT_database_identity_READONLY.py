"""SEVO -- database IDENTITY check (QA/local vs staging vs production). READ ONLY.

Run in the CUSTOMER backend:   python manage.py shell < GT_database_identity_READONLY.py

  * The session is forced read-only first (PostgreSQL rejects any write).
  * No passwords, secrets, connection strings, e-mails, phone numbers or names are printed.
    People appear only as counts and yes/no flags; client addresses are masked to /24.
It answers: when was this database born, who/what is writing to it, is the deployed app connected to it,
and does its traffic look like real customers or like a test harness.
"""
from django.db import connection

TEST_RE = r"(test|qa|demo|example|mailinator|dummy|fake|sample)"


def hdr(t):
    print("\n" + "=" * 8, t, "=" * 8)


def show(sql, params=None, limit=100):
    try:
        with connection.cursor() as c:
            c.execute(sql, params or [])
            cols = [d[0] for d in c.description]
            rows = c.fetchmany(limit)
        for r in rows:
            print({k: (str(v) if v is not None else None) for k, v in zip(cols, r)})
        if not rows:
            print("(no rows)")
    except Exception as e:
        print("  could not read:", type(e).__name__, str(e)[:150])
        try:
            connection.rollback()
        except Exception:
            pass


with connection.cursor() as c:
    c.execute("SET default_transaction_read_only = on")
    c.execute("SET statement_timeout = '30s'")
    c.execute("SHOW default_transaction_read_only")
    print("session read-only:", c.fetchone()[0])
    c.execute("SELECT current_database(), now()")
    print("database:", c.fetchone())

hdr("1. WHEN WAS THIS DATABASE BORN? (first migration, first user, first booking)")
show("SELECT min(applied) AS first_migration_applied, max(applied) AS last_migration_applied, count(*) AS migrations FROM django_migrations")
show("SELECT min(date_joined) AS first_user, max(date_joined) AS last_user, count(*) AS users FROM accounts_user")
show("SELECT min(created_at) AS first_booking, max(created_at) AS last_booking, count(*) AS bookings, count(DISTINCT customer_id) AS distinct_customers FROM service_requests_servicerequest")

hdr("2. HOW MUCH REAL-LOOKING USE? (flags only)")
show("""SELECT count(*) FILTER (WHERE last_login IS NOT NULL) AS users_ever_logged_in,
               count(*) FILTER (WHERE last_login > now() - interval '7 days') AS logged_in_last_7d,
               count(*) FILTER (WHERE lower(coalesce(email,'')||' '||coalesce(username,'')) ~ %s) AS looks_like_test_accounts,
               count(*) FILTER (WHERE is_staff OR is_superuser) AS staff_accounts
        FROM accounts_user""", [TEST_RE])
show("""SELECT date_trunc('day', created_at) AS day, count(*) AS bookings, count(DISTINCT customer_id) AS customers
        FROM service_requests_servicerequest GROUP BY 1 ORDER BY 1 DESC LIMIT 30""")
show("""SELECT payment_method, payment_status, count(*) AS n, coalesce(sum(total_amount),0) AS total_value
        FROM service_requests_servicerequest GROUP BY 1,2 ORDER BY n DESC""")
show("""SELECT count(*) FILTER (WHERE lower(coalesce(u.email,'')||' '||coalesce(u.username,'')) ~ %s) AS bookings_by_test_looking_accounts,
               count(*) AS all_bookings
        FROM service_requests_servicerequest s JOIN accounts_user u ON u.id = s.customer_id""", [TEST_RE])

hdr("3. WHAT ELSE LIVES ON THIS SERVER AND WHERE IS THE WRITE TRAFFIC? (all non-template databases)")
show("""SELECT d.datname, pg_size_pretty(pg_database_size(d.datname)) AS size, s.numbackends AS connections_now,
               s.xact_commit, s.tup_inserted, s.tup_updated, s.tup_deleted, s.stats_reset
        FROM pg_database d LEFT JOIN pg_stat_database s ON s.datid = d.oid
        WHERE NOT d.datistemplate ORDER BY s.xact_commit DESC NULLS LAST""")

hdr("4. WHO IS CONNECTED RIGHT NOW (grouped; client addresses masked to /24)")
show("""SELECT datname, usename, application_name,
               regexp_replace(coalesce(host(client_addr),'local'), '\\.[0-9]+$', '.x') AS client_net,
               state, count(*) AS n, min(backend_start) AS oldest_connection, max(query_start) AS latest_query
        FROM pg_stat_activity WHERE datname IS NOT NULL GROUP BY 1,2,3,4,5 ORDER BY 1, n DESC""")

hdr("5. DOES THE DEPLOYED APP USE THIS DATABASE? (long-lived connections from non-laptop addresses)")
show("""SELECT datname, count(*) AS connections_older_than_1h
        FROM pg_stat_activity WHERE backend_start < now() - interval '1 hour' AND datname IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC""")
print("\nIDENTITY CHECK COMPLETE: nothing was written (session was read-only).")
