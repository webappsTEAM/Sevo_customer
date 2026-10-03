"""SEVO GT -- READ-ONLY production impact audit (booking #47 + QA configuration footprint).

Run in the CUSTOMER backend:   python manage.py shell < GT_production_impact_audit_READONLY.py

Safety:
  * The database session is forced READ ONLY before anything runs (PostgreSQL itself rejects any write).
  * Only SELECTs. No passwords, keys, connection strings, e-mails, phone numbers or names are printed:
    personal data is reduced to yes/no flags, ids and timestamps.
  * The server host is shown only as a short hash so you can compare it with your deploy config.
"""
import hashlib
import os
from django.conf import settings
from django.db import connection

BOOKING_ID = 47
SINCE = "2026-09-25"          # QA work started around here; widen if needed
TEST_WORDS = ("test", "qa", "demo", "example", "mailinator", "dummy", "fake", "sample")
SAFE_COLS = ("id", "status", "booking_status", "payment_status", "payment_method", "entry_type", "event_type",
             "event_name", "kind", "job_id", "service_request_id", "amount", "amount_due", "amount_paid",
             "total_amount", "gross_job_amount", "signed_amount", "net_amount", "commission_rate_applied",
             "currency", "created_at", "updated_at", "occurred_at", "timestamp")


def hdr(t):
    print("\n" + "=" * 8, t, "=" * 8)


def q(sql, params=None, limit=None):
    with connection.cursor() as c:
        c.execute(sql, params or [])
        cols = [d[0] for d in c.description] if c.description else []
        rows = c.fetchmany(limit) if limit else c.fetchall()
    return cols, rows


def show(sql, params=None, limit=200):
    try:
        cols, rows = q(sql, params, limit)
        for r in rows:
            print({k: (str(v) if v is not None else None) for k, v in zip(cols, r)})
        if not rows:
            print("(no rows)")
    except Exception as e:  # never stop the audit
        print("  could not read:", type(e).__name__, str(e)[:160])
        try:
            connection.rollback()
        except Exception:
            pass


def flag_text(s):
    s = (s or "").lower()
    return any(w in s for w in TEST_WORDS)


# ---------------------------------------------------------------- 0. read-only enforcement
hdr("0. SESSION")
with connection.cursor() as c:
    c.execute("SET default_transaction_read_only = on")
    c.execute("SET statement_timeout = '30s'")
    c.execute("SHOW default_transaction_read_only")
    print("session read-only:", c.fetchone()[0])
    c.execute("SELECT current_database(), now()")
    db, now = c.fetchone()

print("database name:", db, "| server time:", now)
print("Django DEBUG:", settings.DEBUG, "| ENVIRONMENT env var:", os.environ.get("ENVIRONMENT"))
host = str(settings.DATABASES["default"].get("HOST", ""))
print("DB host hash (compare with your deploy config):", hashlib.sha256(host.encode()).hexdigest()[:10])

# ---------------------------------------------------------------- 1. who is connected to this database
hdr("1. CONNECTIONS TO THIS DATABASE (grouped; client addresses masked to /24)")
show("""SELECT usename, application_name,
               regexp_replace(host(client_addr), '\\.[0-9]+$', '.x') AS client_net, count(*) AS n
        FROM pg_stat_activity WHERE datname = current_database()
        GROUP BY 1,2,3 ORDER BY n DESC""")

# ---------------------------------------------------------------- 2. booking #47
hdr("2. BOOKING #%s" % BOOKING_ID)
show("""SELECT id, request_id, service_category, status, payment_method, payment_status, total_amount,
               created_at, updated_at, customer_id, logistics_tier_id, logistics_lane_id,
               (fare_breakdown IS NOT NULL) AS has_fare_snapshot,
               length(coalesce(idempotency_key,'')) AS idem_key_len,
               lower(coalesce(idempotency_key,'')) ~ '(test|qa|demo|probe|e2e)' AS idem_key_looks_test
        FROM service_requests_servicerequest WHERE id = %s""", [BOOKING_ID])

try:
    from service_requests.models import ServiceRequest
    sr = ServiceRequest.objects.filter(pk=BOOKING_ID).select_related("customer").first()
    if sr is None:
        print("booking #%s not found" % BOOKING_ID)
    else:
        u = sr.customer
        print("customer: user id", getattr(u, "id", None),
              "| joined", getattr(u, "date_joined", None), "| last_login", getattr(u, "last_login", None),
              "| is_staff", getattr(u, "is_staff", None), "| is_superuser", getattr(u, "is_superuser", None))
        print("customer looks like test data (e-mail/name/phone patterns):",
              flag_text(getattr(u, "email", "")) or flag_text(getattr(u, "username", "")),
              "| phone is repeated-digit/sequence pattern:",
              str(getattr(u, "phone", "") or "")[-10:] in {"9876543210", "1234567890", "0123456789"}
              or len(set(str(getattr(u, "phone", "") or "")[-10:])) <= 2)
        total = ServiceRequest.objects.filter(customer=u).count()
        print("this customer's bookings:", total)
        for r in ServiceRequest.objects.filter(customer=u).order_by("created_at")[:20]:
            print("   booking", r.id, r.created_at, r.status, r.service_category, r.total_amount)
        fb = sr.fare_breakdown or {}
        print("fare snapshot keys:", sorted(fb.keys())[:25] if isinstance(fb, dict) else type(fb).__name__,
              "| fare_basis:", fb.get("fare_basis") if isinstance(fb, dict) else None,
              "| lane_id:", fb.get("lane_id") if isinstance(fb, dict) else None)
except Exception as e:
    print("ORM section could not run:", type(e).__name__, str(e)[:160])

hdr("2b. BOOKINGS AROUND IT (cadence: is #47 isolated or part of a burst of tests?)")
show("""SELECT id, created_at, status, service_category, payment_method, payment_status, total_amount, customer_id
        FROM service_requests_servicerequest ORDER BY id DESC LIMIT 15""")
show("""SELECT date_trunc('day', created_at) AS day, count(*) AS bookings
        FROM service_requests_servicerequest WHERE created_at >= %s GROUP BY 1 ORDER BY 1""", [SINCE])

# ---------------------------------------------------------------- 3. every table that points at booking #47
hdr("3. RECORDS LINKED TO BOOKING #%s (payment, vendor/job, invoice, settlement, tracking, events...)" % BOOKING_ID)
FK_COLS = ("job_id", "service_request_id", "booking_id", "servicerequest_id")
try:
    _, tables = q("""SELECT table_name, column_name FROM information_schema.columns
                     WHERE table_schema='public' AND column_name = ANY(%s)
                     ORDER BY table_name""", [list(FK_COLS)])
    for tname, col in tables:
        try:
            _, cnt = q('SELECT count(*) FROM "%s" WHERE "%s" = %%s' % (tname, col), [BOOKING_ID])
        except Exception:
            connection.rollback()
            continue
        if cnt[0][0] == 0:
            continue
        _, avail = q("""SELECT column_name FROM information_schema.columns
                        WHERE table_schema='public' AND table_name=%s""", [tname])
        have = [a[0] for a in avail]
        pick = [c for c in SAFE_COLS if c in have][:12]
        print("\n-- %s (%s rows via %s)" % (tname, cnt[0][0], col))
        if pick:
            show('SELECT %s FROM "%s" WHERE "%s" = %%s ORDER BY 1 LIMIT 25'
                 % (", ".join('"%s"' % c for c in pick), tname, col), [BOOKING_ID], 25)
except Exception as e:
    print("discovery failed:", type(e).__name__, str(e)[:160])

# ---------------------------------------------------------------- 4. configuration footprint
hdr("4. CONFIGURATION RECORDS (ids, activity flags, created/updated -- compare with when QA ran)")
CFG = [
    ("ServiceZone", "settings_hub_servicezone", "id, name, zone_type, status, is_active, created_by_id, vehicle_classes, radius_meters, created_at, updated_at"),
    ("ServiceZoneService (counts per zone)", "settings_hub_servicezoneservice",
     "zone_id, count(*) AS services, sum((is_available)::int) AS available, sum((service_slug ILIKE 'goods%%' OR service_slug='packers_movers')::int) AS gt_services"),
    ("ServiceTier", "logistics_servicetier", "id, category, name, is_active, base_fare, per_km_rate, minimum_fare, starting_price, gst_rate, ptl_eligible, max_weight_kg, created_at, updated_at"),
    ("LogisticsSlot", "logistics_logisticsslot", "id, category, city, slot_label, capacity, is_active, created_at, updated_at"),
    ("Lane", "logistics_lane", "id, category, destination_label, fare, ptl_rate_per_kg, is_active, created_at, updated_at"),
    ("GTPTLPricingPolicy", "service_requests_gtptlpricingpolicy", "id, is_enabled, rate_per_kg, minimum_chargeable_weight_kg, minimum_fare, is_active, created_at, updated_at"),
    ("GTClaimPolicy", "service_requests_gtclaimpolicy", "id, service_category, applies_to_ptl, is_enabled, included_liability_cap, claim_window_hours, is_active, updated_at"),
    ("GTCancellationPolicy", "service_requests_gtcancellationpolicy", "*"),
    ("GTWaitingChargePolicy", "service_requests_gtwaitingchargepolicy", "*"),
    ("GTTaxPolicy", "service_requests_gttaxpolicy", "*"),
    ("GTOperationsConfig", "service_requests_gtoperationsconfig", "id, is_active, eway_bill_required_above, updated_at"),
    ("PackersMoversConfig", "logistics_packersmoversconfig", "id, city, gst_rate, is_active, created_at, updated_at"),
    ("ProhibitedGoodsRule", "logistics_prohibitedgoodsrule", "id, label, is_active"),
]
for label, table, cols in CFG:
    print("\n-- " + label)
    if "count(*)" in cols:
        show("SELECT %s FROM %s GROUP BY zone_id ORDER BY zone_id" % (cols, table))
    else:
        show("SELECT %s FROM %s ORDER BY 1 LIMIT 120" % (cols, table), None, 120)

# ---------------------------------------------------------------- 5. change history written through the API/Admin
hdr("5. CATALOG CHANGE LOG since %s (Admin/API writes; shows who changed what)" % SINCE)
show("""SELECT l.created_at, l.entity_type, l.entity_id, l.field_name,
               left(coalesce(l.old_value,''),40) AS old_value, left(coalesce(l.new_value,''),60) AS new_value,
               l.changed_by_id, u.is_staff, u.is_superuser, left(coalesce(l.reason,''),50) AS reason
        FROM service_requests_catalogchangelog l LEFT JOIN accounts_user u ON u.id = l.changed_by_id
        WHERE l.created_at >= %s ORDER BY l.created_at LIMIT 300""", [SINCE], 300)

hdr("5b. DJANGO ADMIN LOG since %s" % SINCE)
show("""SELECT a.action_time, ct.app_label, ct.model, a.object_id, a.action_flag, a.user_id
        FROM django_admin_log a JOIN django_content_type ct ON ct.id = a.content_type_id
        WHERE a.action_time >= %s ORDER BY a.action_time LIMIT 200""", [SINCE], 200)

# ---------------------------------------------------------------- 6. migrations and users created during the QA window
hdr("6. MIGRATIONS APPLIED to this database since %s" % SINCE)
show("SELECT applied, app, name FROM django_migrations WHERE applied >= %s ORDER BY applied", [SINCE], 200)

hdr("6b. USERS CREATED since %s (flags only)" % SINCE)
try:
    from django.contrib.auth import get_user_model
    U = get_user_model()
    for u in U.objects.filter(date_joined__gte=SINCE).order_by("date_joined")[:60]:
        print({"id": u.id, "joined": str(u.date_joined), "last_login": str(u.last_login), "is_staff": u.is_staff,
               "is_superuser": u.is_superuser, "role": getattr(u, "role", None),
               "email_or_username_looks_test": flag_text(getattr(u, "email", "")) or flag_text(getattr(u, "username", ""))})
except Exception as e:
    print("could not read users:", type(e).__name__, str(e)[:160])

print("\nAUDIT COMPLETE: nothing was written (session was read-only).")
