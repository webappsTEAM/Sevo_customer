"""
Django management command: check_db_data
Run: python manage.py check_db_data
"""
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Verify logistics and vegetable catalog data in the database"

    def handle(self, *args, **options):
        W = self.stdout.write
        S = self.style.SUCCESS
        E = self.style.ERROR

        # ── 1. logistics tables ───────────────────────────────────────────────
        from logistics.models import ServiceTier, Lane, ServiceArea

        W(self.style.MIGRATE_HEADING("\n=== LOGISTICS MODULE (Goods & Transport) ==="))

        tier_count = ServiceTier.objects.count()
        W(f"\n[ServiceTier] total rows: {tier_count}")
        if tier_count == 0:
            W(E("  WARNING: NO tiers found - seed_logistics_hosur may not have been run!"))
        for tier in ServiceTier.objects.all().order_by("category", "order"):
            W(f"  [{tier.category}] {tier.name} | Rs.{tier.starting_price} | active={tier.is_active}")

        lane_count = Lane.objects.count()
        W(f"\n[Lane] total rows: {lane_count}")
        if lane_count == 0:
            W(E("  WARNING: NO lanes found!"))
        for lane in Lane.objects.all().order_by("category", "order"):
            W(f"  [{lane.category}] {lane.city} -> {lane.destination_label} | Rs.{lane.fare} | active={lane.is_active}")

        area_count = ServiceArea.objects.count()
        W(f"\n[ServiceArea] total rows: {area_count}")
        if area_count == 0:
            W(E("  WARNING: NO service areas found!"))
        for area in ServiceArea.objects.all().order_by("city", "order"):
            W(f"  [{area.city}] {area.name} | active={area.is_active}")

        # ── 2. migration status ───────────────────────────────────────────────
        W(self.style.MIGRATE_HEADING("\n=== APPLIED MIGRATIONS (logistics + service_requests) ==="))
        with connection.cursor() as cur:
            cur.execute(
                "SELECT app, name FROM django_migrations "
                "WHERE app IN ('logistics','service_requests') "
                "ORDER BY app, name"
            )
            rows = cur.fetchall()
            for app, name in rows:
                W(f"  {app}: {name}")

        # ── 3. ServiceRequest logistics columns ───────────────────────────────
        W(self.style.MIGRATE_HEADING("\n=== SERVICE_REQUEST logistics columns ==="))
        with connection.cursor() as cur:
            cur.execute(
                "SELECT column_name, data_type FROM information_schema.columns "
                "WHERE table_name = 'service_requests_servicerequest' "
                "AND column_name IN ('drop_address','logistics_tier_id','logistics_lane_id')"
            )
            cols = cur.fetchall()
            if cols:
                for c in cols:
                    W(S(f"  OK {c[0]}: {c[1]}"))
            else:
                W(E("  FAIL: Columns not found - migration 0020 not yet applied!"))

        # ── 4. CatalogCategory overview ───────────────────────────────────────
        W(self.style.MIGRATE_HEADING("\n=== CATALOG CATEGORIES ==="))
        try:
            from service_requests.models import CatalogCategory
            cats = CatalogCategory.objects.all().order_by("sort_order", "name")
            W(f"  Total categories: {cats.count()}")
            for cat in cats:
                try:
                    scount = cat.services.count()
                except Exception:
                    scount = "?"
                flag = "ACTIVE" if cat.is_active else "INACTIVE"
                W(f"  [{cat.sort_order}] {cat.name} (slug={cat.slug}) | services={scount} | {flag}")
        except Exception as e:
            W(E(f"  CatalogCategory check failed: {e}"))

        # ── 5. Vegetables specifically ────────────────────────────────────────
        W(self.style.MIGRATE_HEADING("\n=== VEGETABLES & GROCERIES ENTRIES ==="))
        try:
            from service_requests.models import CatalogCategory
            veg_cats = CatalogCategory.objects.filter(
                slug__in=["vegetables_groceries", "vegetables", "groceries"]
            )
            if not veg_cats.exists():
                W(E("  FAIL: No vegetables/groceries CatalogCategory found!"))
            for cat in veg_cats:
                W(S(f"  OK Category: {cat.name} (slug={cat.slug}) | active={cat.is_active}"))
                try:
                    svcs = cat.services.all()
                    if svcs.count() == 0:
                        W(E(f"    WARNING: No services inside this category!"))
                    for svc in svcs:
                        W(f"    - {svc.name} | Rs.{svc.price} | active={svc.is_active}")
                except Exception as e2:
                    W(E(f"    Services error: {e2}"))
        except Exception as e:
            W(E(f"  Error: {e}"))

        W(self.style.SUCCESS("\nDB check complete."))
