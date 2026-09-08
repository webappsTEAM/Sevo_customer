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
from django.core.exceptions import ValidationError

from ..models import CatalogCategory, Service, Package, AddOn, CatalogChangeLog, PackageStatus

# Fields whose change increments Package.version — the set Phase 2's booking
# snapshot will compare against to detect a stale price.
_VERSION_FIELDS = {"base_price", "offer_price", "name", "includes", "excludes"}

_PACKAGE_TRANSITIONS = {
    PackageStatus.DRAFT: {PackageStatus.ACTIVE},
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
        pass


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
    category = CatalogCategory.objects.create(**data)
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
        from django.db import transaction
        with transaction.atomic():
            for service in list(category.services.all()):
                delete_service(service, actor=actor, cascade=True)
            _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.DELETE, actor,
                 reason="Cascade delete: removed with all child services and packages.")
            category.delete()
        return
    _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.DELETE, actor)
    category.delete()


# ── Service ───────────────────────────────────────────────────────────────

def create_service(data, actor):
    service = Service.objects.create(**data)
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
        from django.db import transaction
        with transaction.atomic():
            for package in list(service.packages.all()):
                delete_package(package, actor=actor)
            _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.DELETE, actor,
                 reason="Cascade delete: removed with all child packages.")
            service.delete()
        return
    _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.DELETE, actor)
    service.delete()


# ── Package ───────────────────────────────────────────────────────────────

def create_package(data, actor):
    package = Package.objects.create(**data)
    _log(CatalogChangeLog.EntityType.PACKAGE, package.pk, package.name, CatalogChangeLog.Action.CREATE, actor)
    try:
        from django.core.cache import cache
        cache.clear()
    except Exception:
        pass
    try:
        from logistics.models import ServiceTier, LogisticsCategory
        svc_slug = getattr(package.service, "slug", "").lower()
        cat_enum = None
        if "truck" in svc_slug:
            cat_enum = LogisticsCategory.TRUCK
        elif "two-wheeler" in svc_slug or "2-wheeler" in svc_slug:
            cat_enum = LogisticsCategory.TWO_WHEELER
        elif "packers" in svc_slug or "mover" in svc_slug:
            cat_enum = LogisticsCategory.PACKERS_MOVERS
        if cat_enum:
            price_to_sync = package.base_price if package.base_price is not None else (package.offer_price or 0)
            ServiceTier.objects.update_or_create(
                slug=package.slug,
                defaults={
                    "category": cat_enum,
                    "name": package.name,
                    "capacity_label": package.tag or "Standard",
                    "starting_price": price_to_sync,
                    "description": package.description or "",
                    "city": "hosur",
                    "is_active": (package.status == "ACTIVE"),
                    "duration": package.duration or "",
                }
            )
    except Exception:
        pass
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
    pkg = _apply_updates(package, data, CatalogChangeLog.EntityType.PACKAGE, actor, reason=reason, version_fields=_VERSION_FIELDS)
    try:
        from logistics.models import ServiceTier
        tier = ServiceTier.objects.filter(slug=pkg.slug).first()
        if not tier:
            for t in ServiceTier.objects.all():
                if t.slug in pkg.slug or pkg.slug in t.slug or t.name.lower() in pkg.name.lower():
                    tier = t
                    break
        if tier:
            fields_to_update = []
            price_to_sync = pkg.base_price if pkg.base_price is not None else pkg.offer_price
            if price_to_sync is not None and tier.starting_price != price_to_sync:
                tier.starting_price = price_to_sync
                fields_to_update.append("starting_price")
            if pkg.name and tier.name != pkg.name:
                tier.name = pkg.name
                fields_to_update.append("name")
            if pkg.description is not None and tier.description != pkg.description:
                tier.description = pkg.description
                fields_to_update.append("description")
            if pkg.tag is not None and tier.icon != (pkg.tag or ""):
                tier.icon = pkg.tag or ""
                fields_to_update.append("icon")
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
            if fields_to_update:
                tier.save(update_fields=fields_to_update)
    except Exception:
        pass
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
        from logistics.models import ServiceTier
        tier = ServiceTier.objects.filter(slug=package.slug).first()
        if not tier:
            for t in ServiceTier.objects.all():
                if t.slug in package.slug or package.slug in t.slug or t.name.lower() in package.name.lower():
                    tier = t
                    break
        if tier:
            tier.is_active = (new_status == "ACTIVE")
            tier.save(update_fields=["is_active"])
    except Exception:
        pass
    _sync_goods_tables(package)
    return package


def delete_package(package, actor=None):
    try:
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
    package.delete()


# ── AddOn ─────────────────────────────────────────────────────────────────

def create_addon(data, actor):
    addon = AddOn.objects.create(**data)
    _log(CatalogChangeLog.EntityType.ADDON, addon.pk, addon.name, CatalogChangeLog.Action.CREATE, actor)
    return addon


def update_addon(addon, data, actor, reason=None):
    return _apply_updates(addon, data, CatalogChangeLog.EntityType.ADDON, actor, reason=reason)
