"""
Audit (default) or restore (--apply) the Admin-side Goods & Transport configuration.

    python manage.py restore_gt_admin_config            # read-only report, changes nothing
    python manage.py restore_gt_admin_config --apply    # fill in what is missing

Why this exists: GT Admin configuration was lost (Round 6 report). It lives only in the
database, so a deploy / migrate never brings it back. This command compares the live
database with what the implemented GT code needs and restores ONLY what is missing.

Rules it follows:
* Fill-missing only. It never edits, overwrites, reactivates or deletes an existing row.
  A row an admin switched off stays off; a rate an admin tuned stays tuned.
* Values come from evidence, never invented:
    - logistics/restore_data/gt_admin_config_2026-09-23.json -- the GT rows of the Django
      dumpdata backup taken 2026-09-23 (backend/backups/pre_vegetable_orders_split_backup.json),
      i.e. the real Admin configuration before the loss;
    - the repo's own seed data (seed_logistics_hosur.py slot grids / FAQs, and migration
      0021's prohibited-goods list).
  Anything with no evidence (cancellation fee, waiting rate, PTL rate, ...) is reported, not
  set: those models fall back to documented safe defaults and are business decisions for
  Admin > GT Pricing > Policies.
* List catalogues (lanes, areas, goods categories/items, FAQs, slots, prohibited rules) are
  restored only where the whole scope is empty (e.g. no truck lanes at all for Hosur). A scope
  with some rows is reported with the missing entries but left alone, because the difference
  may be a deliberate admin deletion; pass --include-partial to also add those.
* Service coverage uses the booking gate's own rules (settings_hub.service_zone_engine,
  strict canonical slugs) and the booking endpoint's company resolver, so what it reports as
  covered is exactly what a booking will accept.
"""
import importlib
import json
from decimal import Decimal
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

EVIDENCE = Path(__file__).resolve().parents[2] / "restore_data" / "gt_admin_config_2026-09-23.json"

GT_ZONE_SLUGS = {
    # canonical slug the booking gate requires -> legacy slug older zones carry
    "goods_transport_truck": ("truck", "Mini Truck"),
    "goods_transport_two_wheeler": ("two-wheeler", "Two Wheeler"),
    "packers_movers": ("packers-movers", "Packers & Movers"),
}


_TIER_RATE_FIELDS = ("base_fare", "per_km_rate", "free_km", "minimum_fare", "loading_unloading_charge",
                     "additional_stop_charge", "surge_multiplier")


def _fields(model):
    return {f.name for f in model._meta.concrete_fields} | {f.attname for f in model._meta.concrete_fields}


def _only(model, data, drop=()):
    """Evidence values for fields the current model has. A None for a NOT NULL column is
    dropped so the model default applies (the backup predates some columns' defaults)."""
    by_name = {}
    for f in model._meta.concrete_fields:
        by_name[f.name] = f
        by_name[f.attname] = f
    return {k: v for k, v in data.items()
            if k in by_name and k not in drop and not k.startswith("_") and not (v is None and not by_name[k].null)}


class Command(BaseCommand):
    help = "Audit (default) or restore (--apply) missing Admin GT configuration, fill-missing only."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Create the missing rows. Without it nothing is written.")
        parser.add_argument("--include-partial", action="store_true",
                            help="Also add missing entries to list scopes that are only partly empty.")

    # ── output ──────────────────────────────────────────────────────────────
    def _row(self, status, area, detail):
        self.counts[status] = self.counts.get(status, 0) + 1
        style = {"OK": self.style.SUCCESS, "RESTORED": self.style.SUCCESS, "MISSING": self.style.ERROR,
                 "LEGACY": self.style.WARNING, "WARN": self.style.WARNING, "PARTIAL": self.style.WARNING}.get(status, str)
        self.stdout.write(style(f"[{status:8}] {area:28} {detail}"))

    def _gap(self, area, detail, fix):
        """A missing item: restore it on --apply, otherwise report it."""
        if self.apply:
            fix()
            self._row("RESTORED", area, detail)
        else:
            self._row("MISSING", area, detail)

    # ── entry ───────────────────────────────────────────────────────────────
    def handle(self, *args, **opts):
        self.apply = opts["apply"]
        self.partial = opts["include_partial"]
        self.counts = {}
        self.ev = json.loads(EVIDENCE.read_text(encoding="utf-8"))
        from service_requests.views import _get_company
        self.company = _get_company(object())
        self.stdout.write(("APPLY" if self.apply else "AUDIT (read-only)") + f" -- evidence: {EVIDENCE.name}")
        with transaction.atomic():
            self.cities()
            self.coverage()
            self.catalog_and_tiers()
            self.lists()
            self.report_only()
        summary = ", ".join(f"{k}={v}" for k, v in sorted(self.counts.items()))
        self.stdout.write(self.style.MIGRATE_HEADING(f"Summary: {summary}"))
        if not self.apply and (self.counts.get("MISSING") or self.counts.get("LEGACY")):
            self.stdout.write("Run again with --apply to restore the MISSING / LEGACY items.")

    # ── cities ──────────────────────────────────────────────────────────────
    def cities(self):
        from settings_hub.models import City
        for c in self.ev["cities"]:
            row = City.objects.filter(slug=c["slug"]).first()
            if row:
                state = "launched" if row.is_launched else "not launched"
                expected = "launched" if c["is_launched"] else "not launched"
                status = "OK" if (state == expected and row.is_active) else "WARN"
                self._row(status, "City", f"{row.name}: {state}{'' if row.is_active else ', hidden'}"
                          + ("" if status == "OK" else f" (evidence: {expected}; left as the admin set it)"))
            else:
                self._gap("City", f"{c['name']} ({'launched' if c['is_launched'] else 'coming soon'})",
                          lambda c=c: City.objects.create(**_only(City, c)))

    # ── service coverage ────────────────────────────────────────────────────
    def coverage(self):
        from settings_hub.models import City, ServiceZone, ServiceZoneService
        if self.company is None:
            self._row("WARN", "Coverage", "No operating company resolvable (DEFAULT_COMPANY_SLUG); bookings get no company.")
            return
        zones = list(ServiceZone.objects.filter(company=self.company, is_active=True).prefetch_related("zone_services"))
        if not zones:
            self._row("WARN", "Coverage", f"Company '{self.company.slug}' has NO active zones: booking runs open-access (no geofence).")
        other = ServiceZoneService.objects.filter(service_slug__in=list(GT_ZONE_SLUGS), zone__is_active=True) \
            .exclude(zone__company=self.company).values_list("zone__name", "zone__company__slug").distinct()
        for name, co in other:
            self._row("WARN", "Coverage", f"GT zone '{name}' belongs to company '{co}', which bookings never use.")

        ev_zone = self.ev["zones"][0]
        for slug, (legacy, label) in GT_ZONE_SLUGS.items():
            serving = [z for z in zones if any(a.service_slug == slug and a.is_available for a in z.zone_services.all())]
            if serving:
                self._row("OK", "Coverage", f"{label}: {', '.join(sorted(z.name for z in serving))}")
                continue
            legacy_rows = [(z, a) for z in zones for a in z.zone_services.all()
                           if a.service_slug == legacy and a.is_available]
            if legacy_rows:
                names = ", ".join(sorted({z.name for z, _ in legacy_rows}))
                if self.apply:
                    for z, a in legacy_rows:
                        ServiceZoneService.objects.get_or_create(
                            zone=z, service_slug=slug, defaults={"service_name": label, "is_available": True})
                    self._row("RESTORED", "Coverage", f"{label}: added '{slug}' next to legacy '{legacy}' on {names}")
                else:
                    self._row("LEGACY", "Coverage", f"{label}: zones {names} only carry legacy slug '{legacy}', which the "
                                                    f"booking gate ignores -> {label} is refused there")
                continue

            def fix(slug=slug, label=label):
                zone = ServiceZone.objects.filter(
                    company=self.company, zone_type="circle", center_lat=ev_zone["center_lat"],
                    center_lng=ev_zone["center_lng"]).first()
                if zone is None:
                    city = City.objects.filter(slug=ev_zone["city_slug"]).first()
                    zone = ServiceZone.objects.create(
                        company=self.company, city=city, name="Hosur (Goods & Transport)",
                        description="Restored from the 2026-09-23 backup (50 km Hosur coverage).",
                        color=ev_zone["color"], status=ServiceZone.STATUS_ACTIVE, zone_type="circle",
                        center_lat=ev_zone["center_lat"], center_lng=ev_zone["center_lng"],
                        radius_meters=ev_zone["radius_meters"])
                ServiceZoneService.objects.get_or_create(
                    zone=zone, service_slug=slug, defaults={"service_name": label, "is_available": True})
            self._gap("Coverage", f"{label}: no active zone serves it -> Hosur 50 km circle "
                                  f"({ev_zone['center_lat']}, {ev_zone['center_lng']})", fix)

    # ── catalog packages + vehicle tiers ────────────────────────────────────
    def catalog_and_tiers(self):
        from logistics.models import ServiceTier
        from service_requests.models import CatalogCategory, Package, Service
        from service_requests.services import catalog as cat

        ev_tiers = {t["_pk"]: t for t in self.ev["tiers"]}
        ev_cat = self.ev["catalog_categories"][0]
        ev_svcs = {s["_pk"]: s for s in self.ev["services"]}

        def ensure_category():
            row = CatalogCategory.objects.filter(slug=ev_cat["slug"]).first()
            return row or CatalogCategory.objects.create(**_only(CatalogCategory, ev_cat, drop=("id",)))

        def ensure_service(ev_svc):
            row = Service.objects.filter(slug=ev_svc["slug"]).first()
            if row:
                return row
            data = _only(Service, ev_svc, drop=("id", "category", "category_id"))
            return Service.objects.create(category=ensure_category(), **data)

        for s in ev_svcs.values():
            if Service.objects.filter(slug=s["slug"]).exists():
                self._row("OK", "Catalog service", s["name"])
            else:
                self._gap("Catalog service", f"{s['name']} ({s['slug']})", lambda s=s: ensure_service(s))

        def fill_capacity(tier, ev_tier):
            changed = []
            for f in ("max_weight_kg", "max_cft", "vehicle_class", "crew_size", "includes", "icon",
                      "dimensions_label", "weight_class", "duration"):
                if f in ev_tier and ev_tier[f] not in (None, "", []) and getattr(tier, f, None) in (None, "", []):
                    val = ev_tier[f]
                    if f in ("max_weight_kg", "max_cft"):
                        val = Decimal(str(val))
                    setattr(tier, f, val)
                    changed.append(f)
            if changed:
                tier.save(update_fields=changed + ["updated_at"])

        for p in self.ev["packages"]:
            ev_tier = ev_tiers.get(p.get("gt_service_tier_id")) or {}
            label = f"{p['name']} ({p['slug']})"
            pkg = Package.objects.filter(slug=p["slug"]).first()
            tier = cat._logistics_tier_for_package(pkg) if pkg else ServiceTier.objects.filter(slug=p["slug"]).first()
            if pkg and tier:
                note = "" if tier.is_active else " -- tier inactive (left as set)"
                self._row("OK", "Vehicle tier", f"{label}: {tier.max_weight_kg or '?'} kg, per km {tier.per_km_rate}{note}")
            elif pkg and not tier:
                def fix(pkg=pkg, ev_tier=ev_tier):
                    enum = cat._logistics_category_for_service_slug(pkg.service.slug, service=pkg.service, package=pkg)
                    t = ServiceTier.objects.create(slug=pkg.slug, **cat._gt_tier_defaults_from_package(pkg, enum))
                    fill_capacity(t, ev_tier)
                    Package.objects.filter(pk=pkg.pk).update(gt_service_tier_id=t.id)
                self._gap("Vehicle tier", f"{label}: catalog package exists but its ServiceTier is gone "
                                          f"(the fare engine cannot price it)", fix)
            elif tier and not pkg:
                def fix(tier=tier, p=p):
                    svc = ensure_service(ev_svcs[p["service"]])
                    data = _only(Package, p, drop=("id", "service", "service_id", "gt_service_tier_id"))
                    # Pricing mirrors the LIVE tier, not the backup, so nothing an admin tuned is reverted.
                    data.update(gt_base_fare=tier.base_fare, gt_per_km_rate=tier.per_km_rate, gt_free_km=tier.free_km,
                                gt_loading_unloading_charge=tier.loading_unloading_charge,
                                gt_additional_stop_charge=tier.additional_stop_charge,
                                gt_surge_multiplier=tier.surge_multiplier, gt_minimum_fare=tier.minimum_fare,
                                base_price=tier.starting_price,
                                status="ACTIVE" if tier.is_active else "INACTIVE")
                    Package.objects.create(service=svc, gt_service_tier_id=tier.id, **data)
                self._gap("Vehicle tier", f"{label}: tier exists but its catalog package is gone "
                                          f"(Admin cannot edit its price)", fix)
            else:
                def fix(p=p, ev_tier=ev_tier):
                    svc = ensure_service(ev_svcs[p["service"]])
                    data = _only(Package, p, drop=("id", "service", "service_id", "gt_service_tier_id"))
                    data["service"] = svc
                    # The backup kept the live rates on the tier (package gt_* were blank); the
                    # package is the Admin source the tier mirrors, so seed it from the tier.
                    for f in _TIER_RATE_FIELDS:
                        if data.get("gt_" + f) in (None, "") and ev_tier.get(f) not in (None, ""):
                            data["gt_" + f] = Decimal(str(ev_tier[f]))
                    pkg = cat.create_package(data, None)   # the Admin path: creates + links the ServiceTier
                    t = cat._logistics_tier_for_package(pkg)
                    if t is not None:
                        fill_capacity(t, ev_tier)
                self._gap("Vehicle tier", f"{label}: package and tier both missing "
                                          f"(max {ev_tier.get('max_weight_kg')} kg, per km {ev_tier.get('per_km_rate')})", fix)

        ptl = ServiceTier.objects.filter(ptl_eligible=True, is_active=True).count()
        self._row("INFO", "Vehicle tier", f"{ptl} active tier(s) marked PTL-eligible (Admin > Rate card > PTL toggle).")

    # ── list catalogues ─────────────────────────────────────────────────────
    def _list_scope(self, area, scope, existing_keys, wanted, create):
        """wanted: [(key, label, data)]. Restores all when the scope is empty; partial per flag."""
        missing = [w for w in wanted if w[0] not in existing_keys]
        if not missing:
            self._row("OK", area, f"{scope}: {len(existing_keys)} row(s)")
            return
        if existing_keys and not self.partial:
            self._row("PARTIAL", area, f"{scope}: {len(existing_keys)} row(s); not in DB but in evidence: "
                                       + "; ".join(m[1] for m in missing)[:300] + " (left alone; --include-partial adds them)")
            return
        what = f"{scope}: {len(missing)} row(s)" + (" (scope was empty)" if not existing_keys else " (partial)")
        self._gap(area, what, lambda: [create(m[2]) for m in missing])

    def lists(self):
        from logistics.models import (GoodsCategory, GoodsItem, GTFaq, Lane, LogisticsSlot, PackersMoversConfig,
                                      ProhibitedGoodsRule, ServiceArea)
        seed = importlib.import_module("logistics.management.commands.seed_logistics_hosur")

        # Service areas (Hosur)
        have = {a.name.lower() for a in ServiceArea.objects.filter(city__iexact="Hosur")}
        self._list_scope("Service areas", "Hosur", have,
                         [(a["name"].lower(), a["name"], a) for a in self.ev["service_areas"]],
                         lambda a: ServiceArea.objects.create(**_only(ServiceArea, a)))

        # Lanes per category (Hosur)
        for category in ("truck", "two_wheeler", "packers_movers"):
            have = {l.destination_label.lower() for l in Lane.objects.filter(category=category, city__iexact="Hosur")}
            wanted = [(l["destination_label"].lower(), l["destination_label"], l)
                      for l in self.ev["lanes"] if l["category"] == category]
            self._list_scope("Lanes", f"{category} from Hosur", have, wanted,
                             lambda l: Lane.objects.create(**_only(Lane, l)))

        # Goods categories + items
        ev_cat_slug = {c["_pk"]: c["slug"] for c in self.ev["goods_categories"]}
        have = set(GoodsCategory.objects.values_list("slug", flat=True))
        self._list_scope("Goods categories", "all", have,
                         [(c["slug"], c["name"], c) for c in self.ev["goods_categories"]],
                         lambda c: GoodsCategory.objects.create(**_only(GoodsCategory, c, drop=("id",))))
        for cat_row in GoodsCategory.objects.all() if self.apply else GoodsCategory.objects.filter(slug__in=have):
            have_items = set(GoodsItem.objects.filter(category=cat_row).values_list("slug", flat=True))
            wanted = [(i["slug"], i["name"], i) for i in self.ev["goods_items"]
                      if ev_cat_slug.get(i["category"]) == cat_row.slug and not GoodsItem.objects.filter(slug=i["slug"])
                      .exclude(category=cat_row).exists()]
            if wanted or have_items:
                self._list_scope("Goods items", cat_row.slug, have_items, wanted,
                                 lambda i, c=cat_row: GoodsItem.objects.create(
                                     category=c, **_only(GoodsItem, i, drop=("id", "category", "category_id"))))
        if not self.apply and not have:
            self._row("MISSING", "Goods items", f"{len(self.ev['goods_items'])} item(s) come back with their categories")

        # Packers & Movers pricing config (Hosur)
        if PackersMoversConfig.objects.filter(city__iexact="Hosur").exists():
            self._row("OK", "P&M config", "Hosur")
        else:
            c = self.ev["pm_configs"][0]
            self._gap("P&M config", f"Hosur (packing {c['standard_packing_rate_cft']}/{c['premium_packing_rate_cft']} per CFT)",
                      lambda: PackersMoversConfig.objects.create(**_only(PackersMoversConfig, c)))

        # FAQs (seed data) per category
        for category in ("truck", "two_wheeler", "packers_movers"):
            have = set(GTFaq.objects.filter(category=category).values_list("question", flat=True))
            wanted = [(f["question"], f["question"][:40], f) for f in seed.GT_FAQS if f["category"] == category]
            self._list_scope("FAQs", category, have, wanted, lambda f: GTFaq.objects.create(**f, is_active=True))

        # Booking slots (seed grids) per category, Hosur
        import datetime  # noqa: F401  (grids hold datetime.time values)
        grids = {"truck": (seed.TRUCK_2W_SLOTS, 10), "two_wheeler": (seed.TRUCK_2W_SLOTS, 10),
                 "packers_movers": (seed.PM_SLOTS, 8)}
        for category, (grid, cap) in grids.items():
            have = set(LogisticsSlot.objects.filter(category=category, city__iexact="hosur").values_list("slot_label", flat=True))
            wanted = [(lbl, lbl, dict(category=category, city="hosur", slot_label=lbl, group=grp, start_time=st,
                                      end_time=et, order=o, capacity=cap, is_active=True))
                      for grp, lbl, st, et, o in grid]
            self._list_scope("Slots", f"{category} Hosur", have, wanted, lambda d: LogisticsSlot.objects.create(**d))

        # Prohibited goods (migration 0021 seed)
        mig = importlib.import_module("logistics.migrations.0021_prohibitedgoodsrule")
        have = set(ProhibitedGoodsRule.objects.values_list("label", flat=True))
        self._list_scope("Prohibited goods", "rules", have, [(lbl, lbl, (lbl, kws, pm)) for lbl, kws, pm in mig.SEED],
                         lambda r: ProhibitedGoodsRule.objects.create(
                             label=r[0], keywords="\n".join(r[1]), applies_to_packers_movers=r[2],
                             message=f"{r[0]} cannot be booked on sevo Goods & Transport."))

    # ── report only (no evidence of values; safe defaults apply) ────────────
    def report_only(self):
        from logistics.models import LogisticsSlot, PackersMoversSurchargeRule, PMAddOnService
        from logistics.admin_policy_views import KINDS
        for kind, spec in KINDS.items():
            active = spec["model"].objects.filter(is_active=True).count()
            self._row("INFO", "Policy", f"{kind}: {active} active row(s)"
                      + ("" if active else " -- none, the documented safe default applies (edit in Policies tab)"))
        from service_requests.models import GTPTLPricingPolicy
        ptl = GTPTLPricingPolicy.objects.filter(is_active=True).order_by("-id").first()
        ptl_slots = LogisticsSlot.objects.filter(category="ptl", is_active=True).count()
        self._row("INFO", "PTL", f"policy {'enabled @ Rs.' + str(ptl.rate_per_kg) + '/kg' if ptl and ptl.is_enabled else 'off'}; "
                                 f"{ptl_slots} active PTL slot(s). PTL needs an enabled policy, >=1 eligible tier and a PTL slot "
                                 f"-- all Admin settings; no rate is assumed here.")
        self._row("INFO", "P&M add-ons", f"{PMAddOnService.objects.filter(is_active=True).count()} active (optional catalogue)")
        self._row("INFO", "P&M surcharges", f"{PackersMoversSurchargeRule.objects.filter(is_active=True).count()} active (optional)")
