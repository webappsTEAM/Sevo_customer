"""
service_requests/services/catalog.py

Business logic for the Service Catalog admin module
(CatalogCategory -> Service -> Package -> AddOn). Views must go through these
functions rather than calling serializer.save() directly, per CLAUDE.md:
"Business logic: NEVER in views — always in a service function or model
method" (the old views_catalog.py violated this; this module is where that
stops for the catalog).

Every mutation writes a CatalogChangeLog row via a local import wrapped in
try/except, mirroring RescheduleStatusHistory's write-site convention in
services/__init__.py — history-logging must never block the actual save.

Callers must pass already-validated data (e.g. a DRF serializer's
`validated_data`), not raw request.data — the equality checks in
_apply_updates rely on values already being coerced to the model's real
Python types (Decimal, list, etc.), not raw JSON strings.
"""
import logging

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from ..models import CatalogCategory, Service, Package, AddOn, CatalogChangeLog, PackageStatus

logger = logging.getLogger(__name__)


def _delete_or_raise(instance, label):
    """
    Runs instance.delete() and turns any DB-level IntegrityError (a FK
    constraint the exists() pre-checks above didn't know about -- schema
    drift, a stray reference from another app, etc.) into the same
    ValidationError shape the "still has services/packages" checks use,
    instead of letting it bubble up as an unhandled 500. The original DB
    message is included so the real constraint is visible in the toast
    rather than swallowed.
    """
    try:
        instance.delete()
    except IntegrityError as exc:
        logger.exception("IntegrityError deleting %s", label)
        raise ValidationError({"detail": f"Cannot delete {label}: still referenced elsewhere ({exc})."})


def _create_or_raise(model_cls, data, label):
    """
    Mirror of _delete_or_raise for creation: turns a DB-level IntegrityError
    (a duplicate slug DRF's UniqueValidator didn't catch because of a race,
    a bad/stale FK id, a DB-level NOT NULL a form field left out, etc.) into
    a clean ValidationError the view can turn into a 400 with the real
    reason, instead of an unhandled 500 with no message the admin can act
    on -- same category of bug as the delete-side crashes fixed earlier.
    """
    try:
        return model_cls.objects.create(**data)
    except IntegrityError as exc:
        logger.exception("IntegrityError creating %s", label)
        raise ValidationError({"detail": f"Could not create {label}: {exc}"})


def _detach_workforce_service_assignments(service_id):
    """
    workforce_employee_service is a real table with a hard FK to
    service_requests_service(id) -- but it belongs to the separate
    workforce/staffing system and has no Django model anywhere in this
    project, so the ORM has no idea it exists and can't cascade through it
    the way it does for AddOn/VegetableRecipe (both declared on_delete=CASCADE
    against Package). Without this, deleting a Service that any employee is
    assigned to fails with a raw Postgres IntegrityError -- that's exactly
    what _delete_or_raise above started surfacing instead of crashing with
    an unhandled 500, which is how this table was found in the first place.

    Best-effort by design, same convention as the ServiceTier cleanup in
    delete_package below: if the table doesn't exist in this environment
    (e.g. a dev DB without the workforce integration set up), this is a
    silent no-op rather than blocking the delete on an unrelated system.
    """
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM workforce_employee_service WHERE service_id = %s", [service_id])
    except Exception:
        logger.exception("Could not detach workforce assignments for service #%s", service_id)


class LogisticsPricingPermissionError(PermissionError):
    """
    Raised by update_package() when a caller tries to change the base_price
    of a Package that maps to a logistics ServiceTier without holding
    pricing:modify_price.

    Separate from Django's PermissionDenied so the view can return a
    structured 403 body (error_code PRICING_FORBIDDEN) rather than the
    generic DRF 403, matching the shape that logisticsAdminService.js
    already handles from the GT rate-card endpoint.
    """
    pass

# Fields whose change increments Package.version — the set Phase 2's booking
# snapshot will compare against to detect a stale price.
_VERSION_FIELDS = {"base_price", "offer_price", "name", "includes", "excludes"}

_PACKAGE_TRANSITIONS = {
    PackageStatus.DRAFT: {PackageStatus.ACTIVE, PackageStatus.ARCHIVED},
    PackageStatus.ACTIVE: {PackageStatus.INACTIVE, PackageStatus.ARCHIVED},
    PackageStatus.INACTIVE: {PackageStatus.ACTIVE, PackageStatus.ARCHIVED},
    PackageStatus.ARCHIVED: set(),
}


def _log(entity_type, entity_id, entity_name, action, actor, field_name="", old_value="", new_value="", reason=""):
    try:
        from ..models import CatalogChangeLog as _CatalogChangeLog
        _CatalogChangeLog.objects.create(
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            action=action,
            field_name=field_name,
            old_value="" if old_value in (None, "") else str(old_value),
            new_value="" if new_value in (None, "") else str(new_value),
            reason=reason or "",
            changed_by=actor if (actor and hasattr(actor, "id")) else None,
        )
    except Exception:
        # Still not re-raised -- an audit failure must not roll back the
        # catalog edit the administrator just made. But a silently missing
        # audit row is worse than a noisy one: it makes the trail look
        # complete when it is not, and this trail is what answers "who
        # changed this price".
        logger.exception(
            "Could not write a CatalogChangeLog row for %s #%s (%s / %s); "
            "this change is NOT in the audit trail.",
            entity_type, entity_id, action, field_name or "-",
        )


def _apply_updates(instance, data, entity_type, actor, reason=None, version_fields=None):
    """Diff `data` against `instance`, save changed fields, write one
    CatalogChangeLog UPDATE row per changed field. Returns the saved instance."""
    changed_fields = []
    bump_version = False
    old_image_to_cleanup = None

    for field_name, new_value in data.items():
        if not hasattr(instance, field_name):
            continue
        old_value = getattr(instance, field_name)
        if old_value == new_value:
            continue
        
        # Track previous image for safe cleanup after DB persistence
        if field_name == "image" and old_value and new_value:
            old_image_to_cleanup = str(old_value)

        setattr(instance, field_name, new_value)
        changed_fields.append(field_name)
        _log(entity_type, instance.pk, str(instance), CatalogChangeLog.Action.UPDATE, actor,
             field_name=field_name, old_value=old_value, new_value=new_value, reason=reason)
        if version_fields and field_name in version_fields:
            bump_version = True

    if bump_version and hasattr(instance, "version"):
        instance.version = instance.version + 1
        changed_fields.append("version")

    if changed_fields:
        instance.save()
        
        # Safely delete previous image from Supabase only after DB update succeeds
        if old_image_to_cleanup:
            try:
                from utils.supabase_storage import SupabaseStorageService
                SupabaseStorageService.delete_file(old_image_to_cleanup)
            except Exception:
                pass

        try:
            from django.core.cache import cache
            cache.clear()
        except Exception:
            pass
    return instance


# ── Category ──────────────────────────────────────────────────────────────

def create_category(data, actor):
    category = _create_or_raise(CatalogCategory, data, f'category "{data.get("name", "")}"')
    _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.CREATE, actor)
    return category


def update_category(category, data, actor, reason=None):
    return _apply_updates(category, data, CatalogChangeLog.EntityType.CATEGORY, actor, reason=reason)


def delete_category(category, actor=None, cascade=False):
    """
    Deletes a category. Blocked by default if it still has services attached
    -- this is intentional data-integrity protection, not a bug: deleting a
    category out from under live services/packages would orphan them.

    Pass cascade=True (surfaced to the admin as an explicit "delete everything
    inside this category too" confirmation, never the default) to instead
    delete every service under this category -- and every package under each
    of those services -- before deleting the category itself, all inside one
    transaction so a mid-way failure can't leave a half-deleted category.
    """
    if category.services.exists():
        if not cascade:
            raise ValidationError({"detail": "Cannot delete a category that still has services. Move or delete its services first."})
        with transaction.atomic():
            for service in list(category.services.all()):
                delete_service(service, actor=actor, cascade=True)
            _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.DELETE, actor,
                 reason="Cascade delete: removed with all child services and packages.")
            _delete_or_raise(category, f'category "{category.name}"')
        return
    _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.DELETE, actor)
    _delete_or_raise(category, f'category "{category.name}"')


# ── Service ───────────────────────────────────────────────────────────────

def create_service(data, actor):
    service = _create_or_raise(Service, data, f'service "{data.get("name", "")}"')
    _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.CREATE, actor)
    return service


def update_service(service, data, actor, reason=None):
    return _apply_updates(service, data, CatalogChangeLog.EntityType.SERVICE, actor, reason=reason)


def delete_service(service, actor=None, cascade=False):
    """
    Deletes a service. Blocked by default if it still has packages attached
    -- same reasoning as delete_category above.

    Pass cascade=True to delete every package under this service first. When
    called directly (not via delete_category's cascade), this runs in its
    own transaction so a partial package-delete failure can't leave the
    service in a half-deleted state.
    """
    if service.packages.exists():
        if not cascade:
            raise ValidationError({"detail": "Cannot delete a service that still has packages. Move or delete its packages first."})
        with transaction.atomic():
            for package in list(service.packages.all()):
                delete_package(package, actor=actor)
            _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.DELETE, actor,
                 reason="Cascade delete: removed with all child packages.")
            _detach_workforce_service_assignments(service.pk)
            _delete_or_raise(service, f'service "{service.name}"')
        return
    _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.DELETE, actor)
    _detach_workforce_service_assignments(service.pk)
    _delete_or_raise(service, f'service "{service.name}"')


# Canonical bidirectional slug aliases between Package and ServiceTier.
# Reconciles hyphenated variants (e.g. 1-rk-1-bhk-shifting vs 1rk-1bhk-shifting)
# without unsafe substring guessing.
CANONICAL_LOGISTICS_TIER_SLUG_MAP = {
    "1-rk-1-bhk-shifting": "1rk-1bhk-shifting",
    "1rk-1bhk-shifting": "1rk-1bhk-shifting",
    "2-bhk-3-bhk-shifting": "2bhk-3bhk-shifting",
    "2bhk-3bhk-shifting": "2bhk-3bhk-shifting",
    "villa-office-relocation": "villa-office-relocation",
}


def _logistics_tier_for_package(package):
    """
    The ServiceTier a Package maps to, or None.

    Lookup order:
      1. package.gt_service_tier_id, if set -- the authoritative, rename-proof
         link (see the field's docstring in models.py). Once a tier exists
         for a package, this is always trusted over slug matching, because a
         later admin rename of the package's name/slug must NOT sever the
         link the way pure slug-matching used to.
      2. Exact slug match -- for legacy packages saved before this field
         existed.
      3. Canonical alias match -- reconciles hyphenated Packers & Movers slug
         variants (1-rk-1-bhk-shifting vs 1rk-1bhk-shifting).

    Deliberately no substring guessing here (unsafe -- see
    CANONICAL_LOGISTICS_TIER_SLUG_MAP's own comment).
    """
    from logistics.models import ServiceTier

    tier_id = getattr(package, "gt_service_tier_id", None)
    if tier_id:
        tier = ServiceTier.objects.filter(pk=tier_id).first()
        if tier:
            return tier
        # The linked row is gone (e.g. deleted directly in Django admin
        # before that surface was locked down) -- fall through to slug
        # matching rather than treating the package as unlinked forever.

    slug = (getattr(package, "slug", "") or "").strip().lower()
    if not slug:
        return None

    # 1. Exact slug match
    tier = ServiceTier.objects.filter(slug=slug).first()
    if tier:
        return tier

    # 2. Canonical alias match
    canonical_slug = CANONICAL_LOGISTICS_TIER_SLUG_MAP.get(slug)
    if canonical_slug and canonical_slug != slug:
        return ServiceTier.objects.filter(slug=canonical_slug).first()

    return None


def _logistics_category_for_service_slug(svc_slug, service=None, package=None):
    """
    LogisticsCategory a Service or Package maps to canonically.
    Prioritizes:
    1. Direct ServiceTier link on package (if present)
    2. Service's parent CatalogCategory slug
    3. Explicit service slug matching
    """
    from logistics.models import LogisticsCategory

    if package and getattr(package, "gt_service_tier_id", None):
        try:
            from logistics.models import ServiceTier
            tier = ServiceTier.objects.filter(id=package.gt_service_tier_id).first()
            if tier and tier.category:
                return tier.category
        except Exception:
            pass

    cat_slug = ""
    if service:
        cat_slug = getattr(getattr(service, "category", None), "slug", "") or ""
    cat_slug = cat_slug.lower()

    if cat_slug in ("goods_transport_truck", "trucks", "truck", "mini-trucks", "mini_trucks"):
        return LogisticsCategory.TRUCK
    if cat_slug in ("goods_transport_two_wheeler", "two-wheelers", "two_wheelers", "2-wheelers"):
        return LogisticsCategory.TWO_WHEELER
    if cat_slug in ("packers_movers", "packers-and-movers", "packers-movers", "relocation"):
        return LogisticsCategory.PACKERS_MOVERS

    svc_slug = (svc_slug or (getattr(service, "slug", "") if service else "")).lower()
    if "truck" in svc_slug:
        return LogisticsCategory.TRUCK
    if "two-wheeler" in svc_slug or "2-wheeler" in svc_slug or "wheeler" in svc_slug:
        return LogisticsCategory.TWO_WHEELER
    if "packers" in svc_slug or "mover" in svc_slug:
        return LogisticsCategory.PACKERS_MOVERS
    return None


def _gt_tier_defaults_from_package(package, cat_enum):
    """The ServiceTier field values a Package should currently be mirrored
    to, as a dict suitable for update_or_create's `defaults=` or for
    setattr-ing onto an existing tier. Single source of truth for "what does
    this package's tier look like right now", used by both a brand new tier
    (create_package, and update_package's re-link fallback) and kept
    logically identical to the incremental diff update_package normally does
    on an already-linked tier."""
    price_to_sync = package.base_price if package.base_price is not None else (package.offer_price or 0)
    gt_city = (package.gt_city or "").strip().lower()
    if not gt_city:
        try:
            from settings_hub.models import City
            active_city = City.objects.filter(is_active=True, is_launched=True).first()
            gt_city = active_city.slug if active_city else "hosur"
        except Exception:
            gt_city = "hosur"
    return {
        "category": cat_enum,
        "name": package.name,
        "capacity_label": package.tag or "Standard",
        "starting_price": price_to_sync,
        "description": package.description or "",
        "city": gt_city,
        "is_active": (package.status == "ACTIVE"),
        "duration": package.duration or "",
        "image": package.image or "",
        "weight_class": package.gt_weight_class or "",
        "dimensions_label": package.gt_dimensions_label or "",
        "base_fare": package.gt_base_fare,
        "per_km_rate": package.gt_per_km_rate,
        "free_km": package.gt_free_km if package.gt_free_km is not None else 0,
        "loading_unloading_charge": package.gt_loading_unloading_charge if package.gt_loading_unloading_charge is not None else 0,
        "additional_stop_charge": package.gt_additional_stop_charge if package.gt_additional_stop_charge is not None else 0,
        "surge_multiplier": package.gt_surge_multiplier if package.gt_surge_multiplier is not None else 1,
        "minimum_fare": package.gt_minimum_fare,
    }


def _package_for_logistics_tier(tier):
    """
    The active Package a ServiceTier maps to, by exact slug or canonical alias, or None.
    """
    from service_requests.models import Package

    if not tier or not getattr(tier, "slug", None):
        return None

    slug = tier.slug.strip().lower()
    pkg = Package.objects.filter(slug=slug, status="ACTIVE").first()
    if pkg:
        return pkg

    for pkg_slug, mapped_tier_slug in CANONICAL_LOGISTICS_TIER_SLUG_MAP.items():
        if mapped_tier_slug == slug and pkg_slug != slug:
            pkg = Package.objects.filter(slug=pkg_slug, status="ACTIVE").first()
            if pkg:
                return pkg

    return Package.objects.filter(slug=slug).first()



# ── Package ───────────────────────────────────────────────────────────────

def create_package(data, actor):
    package = _create_or_raise(Package, data, f'package "{data.get("name", "")}"')
    _log(CatalogChangeLog.EntityType.PACKAGE, package.pk, package.name, CatalogChangeLog.Action.CREATE, actor)
    try:
        from django.core.cache import cache
        cache.clear()
    except Exception:
        pass
    try:
        from logistics.models import ServiceTier
        cat_enum = _logistics_category_for_service_slug(getattr(package.service, "slug", ""), service=getattr(package, "service", None), package=package)
        if cat_enum:
            if not package.gt_city:
                try:
                    from settings_hub.models import City
                    active_city = City.objects.filter(is_active=True, is_launched=True).first()
                    package.gt_city = active_city.slug if active_city else "hosur"
                except Exception:
                    package.gt_city = "hosur"
                package.save(update_fields=["gt_city"])
            # Keyed on the package's own slug, so a brand new package creates
            # its own new tier rather than colliding with an unrelated one.
            tier, _created = ServiceTier.objects.update_or_create(
                slug=package.slug,
                defaults=_gt_tier_defaults_from_package(package, cat_enum),
            )
            # Lock in the rename-proof link immediately (see
            # Package.gt_service_tier_id's docstring) so this package never
            # depends on slug matching again after today.
            if package.gt_service_tier_id != tier.id:
                package.gt_service_tier_id = tier.id
                package.save(update_fields=["gt_service_tier_id"])
    except Exception:
        # Not re-raised: a logistics-tier mirror failing must not roll back a
        # catalog package the admin just created. But it is no longer
        # swallowed silently -- an out-of-step tier is a pricing
        # inconsistency, and nobody could previously see one had happened.
        logger.exception(
            "Could not sync new Package #%s (%s) to its logistics ServiceTier; "
            "the tier may be missing or stale.",
            getattr(package, "pk", "?"), getattr(package, "slug", "?"),
        )
    _sync_goods_tables(package)
    return package


def _sync_goods_tables(package):
    try:
        from django.db import connection
        import json
        with connection.cursor() as cursor:
            # Sync to goods_packages
            cursor.execute("""
                UPDATE goods_packages
                SET base_price = %s,
                    name = %s,
                    duration = %s,
                    tag = %s,
                    description = %s,
                    includes = %s::jsonb,
                    status = %s,
                    is_active = (%s = 'ACTIVE'),
                    updated_at = NOW()
                WHERE id = %s;
            """, [
                package.base_price or 0, package.name, package.duration,
                package.tag, package.description,
                json.dumps(package.includes if isinstance(package.includes, list) else []),
                package.status or 'ACTIVE', package.status, package.id
            ])
            # Sync to goods_and_transport
            cursor.execute("""
                WITH updated_json AS (
                    SELECT 
                        12 as cat_id,
                        jsonb_agg(
                            jsonb_build_object(
                                'id', s.id,
                                'name', s.name,
                                'slug', s.slug,
                                'description', s.description,
                                'packages', COALESCE((
                                    SELECT jsonb_agg(
                                        jsonb_build_object(
                                            'id', p.id,
                                            'name', p.name,
                                            'price', p.base_price,
                                            'duration', p.duration,
                                            'tag', p.tag,
                                            'description', p.description
                                        ) ORDER BY p.id
                                    )
                                    FROM service_requests_package p
                                    WHERE p.service_id = s.id
                                ), '[]'::jsonb)
                            ) ORDER BY s.id
                        ) as services_json
                    FROM service_requests_service s
                    WHERE s.category_id = 12
                )
                UPDATE goods_and_transport gt
                SET services = uj.services_json,
                    updated_at = NOW()
                FROM updated_json uj
                WHERE gt.category_id = uj.cat_id;
            """)

            # Sync to vegetables_packages
            cursor.execute("""
                UPDATE vegetables_packages
                SET base_price = %s,
                    name = %s,
                    duration = %s,
                    tag = %s,
                    description = %s,
                    image = %s,
                    includes = %s::jsonb,
                    status = %s,
                    is_active = (%s = 'ACTIVE'),
                    updated_at = NOW()
                WHERE master_package_id = %s OR id = %s;
            """, [
                package.base_price or 0, package.name, package.duration,
                package.tag, package.description, package.image or '',
                json.dumps(package.includes if isinstance(package.includes, list) else []),
                package.status or 'ACTIVE', package.status, package.id, package.id
            ])

            # Sync to vegetables_and_groceries
            cursor.execute("""
                WITH updated_json AS (
                    SELECT 
                        18 as cat_id,
                        jsonb_agg(
                            jsonb_build_object(
                                'id', s.id,
                                'name', s.name,
                                'slug', s.slug,
                                'description', s.description,
                                'packages', COALESCE((
                                    SELECT jsonb_agg(
                                        jsonb_build_object(
                                            'id', p.id,
                                            'name', p.name,
                                            'price', p.base_price,
                                            'duration', p.duration,
                                            'tag', p.tag,
                                            'description', p.description,
                                            'image', p.image
                                        ) ORDER BY p.id
                                    )
                                    FROM service_requests_package p
                                    WHERE p.service_id = s.id
                                ), '[]'::jsonb)
                            ) ORDER BY s.id
                        ) as services_json
                    FROM service_requests_service s
                    WHERE s.category_id = 18
                )
                UPDATE vegetables_and_groceries vg
                SET services = uj.services_json,
                    updated_at = NOW()
                FROM updated_json uj
                WHERE vg.category_id = uj.cat_id;
            """)
    except Exception:
        pass


def update_package(package, data, actor, reason=None):
    # ── GT pricing permission gate ─────────────────────────────────────────
    # If this package maps to a logistics ServiceTier AND base_price is
    # changing, the caller must hold pricing:modify_price and supply a reason.
    # This mirrors the same control enforced by logistics/pricing_admin.py for
    # direct edits via /catalog/goods-transport-rates.
    #
    # The check runs BEFORE _apply_updates so a permission failure never
    # partially writes the package and then errors — the whole call is clean.
    #
    # Non-logistics packages (home services, etc.) have no matching
    # ServiceTier, so _logistics_tier_for_package returns None and this block
    # is never reached for them.
    try:
        _pre_tier = _logistics_tier_for_package(package)
    except Exception:
        _pre_tier = None
    if _pre_tier is not None:
        # Only gate on price-bearing fields that flow into the fare engine.
        #
        # GT audit follow-up to Updates 6-9: this originally checked only
        # base_price/offer_price. But this same function later mirrors nine
        # gt_* fields straight onto the linked ServiceTier's fare fields (see
        # _gt_field_map below) with no other permission check in between --
        # so a catalog:edit-only actor could set gt_per_km_rate/gt_base_fare/
        # gt_surge_multiplier/etc. and silently move the live GT/P&M fare
        # engine's rates, bypassing the modify_price control entirely. Seven
        # of the nine gt_* fields are genuine money fields (the same ones
        # PRICING_FIELDS in the now-dead logistics/pricing_admin.py already
        # names); gt_weight_class and gt_dimensions_label are descriptive and
        # correctly stay on plain catalog:edit. Listing them alongside
        # base_price/offer_price keeps a mixed payload (e.g. a descriptive
        # gt_dimensions_label change bundled with an unauthorized
        # gt_per_km_rate change) from letting the price change slip through
        # under cover of the legitimate one -- ANY of these fields changing
        # trips the same gate, and the gate still runs before _apply_updates,
        # so a denied request writes nothing at all.
        _price_fields_changing = {
            f for f in (
                "base_price", "offer_price",
                "gt_base_fare", "gt_per_km_rate", "gt_free_km",
                "gt_loading_unloading_charge", "gt_additional_stop_charge",
                "gt_surge_multiplier", "gt_minimum_fare",
            )
            if f in data and data[f] != getattr(package, f)
        }
        if _price_fields_changing:
            from accounts.permissions import can as _can
            if not _can(actor, "pricing", "modify_price"):
                raise LogisticsPricingPermissionError(
                    "Changing the price of a Goods & Transport package updates the "
                    "ServiceTier starting fare and requires the 'modify_price' "
                    "permission on the Pricing module. "
                    "Use Goods & Transport Rates to change this price, or ask a "
                    "Pricing Admin to make the change."
                )
            if not (reason or "").strip():
                raise ValidationError(
                    {"reason": [
                        "A reason is required when changing a Goods & Transport "
                        "package price. It is recorded in the pricing audit trail."
                    ]}
                )
    # ── End GT permission gate ─────────────────────────────────────────────

    pkg = _apply_updates(package, data, CatalogChangeLog.EntityType.PACKAGE, actor, reason=reason, version_fields=_VERSION_FIELDS)
    try:
        tier = _logistics_tier_for_package(pkg)

        if tier is None:
            # No tier matched this package at all -- either it's not a Goods
            # & Transport package (cat_enum will be None and this is a
            # no-op), or it WAS one and lost its link, e.g. by being renamed
            # to a slug that no ServiceTier shares (the exact bug that let a
            # renamed/new GT package silently vanish from the customer
            # booking page while its old tier kept showing stale data).
            # Create the tier it should have had instead of doing nothing.
            from logistics.models import ServiceTier
            cat_enum = _logistics_category_for_service_slug(getattr(pkg.service, "slug", ""), service=getattr(pkg, "service", None), package=pkg)
            if cat_enum:
                if not pkg.gt_city:
                    try:
                        from settings_hub.models import City
                        active_city = City.objects.filter(is_active=True, is_launched=True).first()
                        pkg.gt_city = active_city.slug if active_city else "hosur"
                    except Exception:
                        pkg.gt_city = "hosur"
                    pkg.save(update_fields=["gt_city"])
                tier, _created = ServiceTier.objects.update_or_create(
                    slug=pkg.slug,
                    defaults=_gt_tier_defaults_from_package(pkg, cat_enum),
                )
                logger.info(
                    "Package #%s (%s) had no linked ServiceTier -- created/relinked #%s.",
                    pkg.pk, pkg.slug, tier.pk,
                )

        if tier is not None and pkg.gt_service_tier_id != tier.id:
            pkg.gt_service_tier_id = tier.id
            pkg.save(update_fields=["gt_service_tier_id"])

        if tier:
            fields_to_update = []
            price_to_sync = pkg.base_price if pkg.base_price is not None else pkg.offer_price
            if price_to_sync is not None and tier.starting_price != price_to_sync:
                old_starting_price = tier.starting_price
                tier.starting_price = price_to_sync
                fields_to_update.append("starting_price")
            else:
                old_starting_price = None
            if pkg.name and tier.name != pkg.name:
                tier.name = pkg.name
                fields_to_update.append("name")
            if pkg.description is not None and tier.description != pkg.description:
                tier.description = pkg.description
                fields_to_update.append("description")
            if pkg.tag is not None and tier.icon != (pkg.tag or ""):
                tier.icon = pkg.tag or ""
                fields_to_update.append("icon")
            # Package.tag is the admin's capacity label (see
            # Package.gt_dimensions_label) and create_package mirrors it into
            # capacity_label, but this incremental path never did -- so after
            # any later edit the customer card kept the stale original text.
            # A blank tag does not overwrite an existing label.
            if pkg.tag and tier.capacity_label != pkg.tag:
                tier.capacity_label = pkg.tag
                fields_to_update.append("capacity_label")
            if pkg.status:
                tier_is_active = (pkg.status == "ACTIVE")
                if tier.is_active != tier_is_active:
                    tier.is_active = tier_is_active
                    fields_to_update.append("is_active")
            if pkg.includes is not None and tier.includes != pkg.includes:
                tier.includes = pkg.includes
                fields_to_update.append("includes")
            if pkg.duration is not None and tier.duration != pkg.duration:
                tier.duration = pkg.duration
                fields_to_update.append("duration")
            if pkg.image is not None and tier.image != (pkg.image or ""):
                tier.image = pkg.image or ""
                fields_to_update.append("image")

            # Phase 1 Goods & Transport unification: mirror the gt_*
            # distance-pricing fields the admin can now edit on the Package
            # itself onto the same-named (minus prefix) ServiceTier fields.
            # A gt_* field left blank/None is treated as "admin hasn't set
            # this here yet" and does NOT overwrite an existing tier value --
            # this keeps a tier someone already configured via the old
            # Goods & Transport Rates screen intact until the Package copy
            # is actually filled in.
            _gt_field_map = (
                ("gt_weight_class", "weight_class"),
                ("gt_dimensions_label", "dimensions_label"),
                ("gt_base_fare", "base_fare"),
                ("gt_per_km_rate", "per_km_rate"),
                ("gt_free_km", "free_km"),
                ("gt_loading_unloading_charge", "loading_unloading_charge"),
                ("gt_additional_stop_charge", "additional_stop_charge"),
                ("gt_surge_multiplier", "surge_multiplier"),
                ("gt_minimum_fare", "minimum_fare"),
            )
            for pkg_field, tier_field in _gt_field_map:
                pkg_value = getattr(pkg, pkg_field, None)
                if pkg_value in (None, "") :
                    continue
                if getattr(tier, tier_field) != pkg_value:
                    setattr(tier, tier_field, pkg_value)
                    fields_to_update.append(tier_field)
            if pkg.gt_city and tier.city != pkg.gt_city:
                tier.city = pkg.gt_city
                fields_to_update.append("city")

            if fields_to_update:
                tier.save(update_fields=fields_to_update)
                logger.info(
                    "Package #%s (%s) synced to ServiceTier #%s: %s",
                    pkg.pk, pkg.slug, tier.pk, ", ".join(fields_to_update),
                )
                # Write a tier-level audit row for the starting_price sync so
                # the GT rate card's history view shows this change, matching
                # the audit trail produced by logistics/pricing_admin.py.
                if "starting_price" in fields_to_update and old_starting_price is not None:
                    _log(
                        CatalogChangeLog.EntityType.SERVICE_TIER,
                        tier.id,
                        f"{tier.name} ({getattr(tier, 'get_category_display', lambda: tier.category)()}, {tier.city})",
                        CatalogChangeLog.Action.UPDATE,
                        actor,
                        field_name="starting_price",
                        old_value=old_starting_price,
                        new_value=price_to_sync,
                        reason=f"[via package #{pkg.pk}] {reason or ''}",
                    )
    except (LogisticsPricingPermissionError, ValidationError):
        # Permission and validation errors must propagate cleanly — they are
        # not mirror failures and must not be swallowed.
        raise
    except Exception:
        # Same reasoning as create_package: never roll back the package edit
        # over a mirror failure, but never hide one either.
        logger.exception(
            "Could not sync Package #%s (%s) to its logistics ServiceTier; "
            "the tier may now be stale.",
            getattr(pkg, "pk", "?"), getattr(pkg, "slug", "?"),
        )
    _sync_goods_tables(pkg)
    return pkg


def transition_package_status(package, new_status, actor, reason=None):
    if new_status not in PackageStatus.values:
        raise ValidationError({"detail": f"Unknown status '{new_status}'."})
    current = package.status
    if new_status == current:
        raise ValidationError({"detail": f"Package is already '{current}'."})
    allowed = _PACKAGE_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise ValidationError({
            "detail": f"Invalid package transition from '{current}' to '{new_status}'. Allowed: {sorted(allowed) or 'none'}."
        })
    package.status = new_status
    package.save(update_fields=["status", "updated_at"])
    try:
        from django.core.cache import cache
        cache.clear()
    except Exception:
        pass
    _log(CatalogChangeLog.EntityType.PACKAGE, package.pk, package.name, CatalogChangeLog.Action.STATUS_CHANGE, actor,
         field_name="status", old_value=current, new_value=new_status, reason=reason)
    try:
        # Uses the same rename-proof lookup as update_package now, instead
        # of this function's own separate fuzzy-substring fallback -- that
        # fallback (t.slug in package.slug or ...) could match the WRONG
        # tier (e.g. any tier whose slug happens to be a substring of this
        # package's slug), which is exactly the kind of ambiguity
        # gt_service_tier_id exists to avoid.
        tier = _logistics_tier_for_package(package)
        if tier:
            tier.is_active = (new_status == "ACTIVE")
            tier.save(update_fields=["is_active"])
    except Exception:
        pass
    _sync_goods_tables(package)
    return package


def delete_package(package, actor=None):
    try:
        tier = _logistics_tier_for_package(package)
        if tier:
            tier.delete()
        else:
            # Fallback for a package that was never linked (pre-existing
            # rows from before gt_service_tier_id existed).
            from logistics.models import ServiceTier
            ServiceTier.objects.filter(slug=package.slug).delete()
    except Exception:
        pass
    try:
        from django.core.cache import cache
        cache.clear()
    except Exception:
        pass
    _log(CatalogChangeLog.EntityType.PACKAGE, package.pk, package.name, CatalogChangeLog.Action.DELETE, actor)
    _delete_or_raise(package, f'package "{package.name}"')


# ── AddOn ─────────────────────────────────────────────────────────────────

def create_addon(data, actor):
    addon = _create_or_raise(AddOn, data, f'add-on "{data.get("name", "")}"')
    _log(CatalogChangeLog.EntityType.ADDON, addon.pk, addon.name, CatalogChangeLog.Action.CREATE, actor)
    return addon


def update_addon(addon, data, actor, reason=None):
    # ── AddOn pricing permission gate ───────────────────────────────────────
    # GT audit Update 9: AddOn.price is a real customer-facing charge, but
    # this function used to be a bare pass-through to _apply_updates() with
    # no price check at all -- unlike update_package() above, which at least
    # gated base_price/offer_price. AdminAddOnDetailView.put() is only gated
    # by catalog:edit, so without this check any catalog:edit-only actor
    # could freely change price. Mirrors the same modify_price + reason
    # requirement update_package() enforces for its price fields, and runs
    # before _apply_updates() so a denied request writes nothing.
    if "price" in data and data["price"] != getattr(addon, "price", None):
        from accounts.permissions import can as _can
        if not _can(actor, "pricing", "modify_price"):
            raise LogisticsPricingPermissionError(
                "Changing an add-on's price requires the 'modify_price' "
                "permission on the Pricing module."
            )
        if not (reason or "").strip():
            raise ValidationError(
                {"reason": [
                    "A reason is required when changing an add-on's price. "
                    "It is recorded in the pricing audit trail."
                ]}
            )
    # ── End AddOn permission gate ───────────────────────────────────────────
    return _apply_updates(addon, data, CatalogChangeLog.EntityType.ADDON, actor, reason=reason)
