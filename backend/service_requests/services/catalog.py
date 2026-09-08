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

from ..models import CatalogCategory, Service, Package, AddOn, CatalogChangeLog, PackageStatus

logger = logging.getLogger(__name__)


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
    category = CatalogCategory.objects.create(**data)
    _log(CatalogChangeLog.EntityType.CATEGORY, category.pk, category.name, CatalogChangeLog.Action.CREATE, actor)
    return category


def update_category(category, data, actor, reason=None):
    return _apply_updates(category, data, CatalogChangeLog.EntityType.CATEGORY, actor, reason=reason)


def delete_category(category):
    if category.services.exists():
        raise ValidationError({"detail": "Cannot delete a category that still has services. Move or delete its services first."})
    category.delete()


# ── Service ───────────────────────────────────────────────────────────────

def create_service(data, actor):
    service = Service.objects.create(**data)
    _log(CatalogChangeLog.EntityType.SERVICE, service.pk, service.name, CatalogChangeLog.Action.CREATE, actor)
    return service


def update_service(service, data, actor, reason=None):
    return _apply_updates(service, data, CatalogChangeLog.EntityType.SERVICE, actor, reason=reason)


def delete_service(service):
    if service.packages.exists():
        raise ValidationError({"detail": "Cannot delete a service that still has packages. Move or delete its packages first."})
    service.delete()


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
    The ServiceTier a Package maps to, by EXACT slug or canonical slug alias, or None.

    Avoids unsafe substring matching while deterministically resolving
    canonical Packers & Movers slug variants (1-rk-1-bhk-shifting <-> 1rk-1bhk-shifting).
    Exact slug equality is tried first, followed by canonical alias dictionary.
    """
    from logistics.models import ServiceTier

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
            # Keyed on the package's own slug, so this creates or updates
            # exactly one tier and can never reach a different one.
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
    _pre_tier = _logistics_tier_for_package(package)
    if _pre_tier is not None:
        # Only gate on price-bearing fields that flow into the fare engine.
        _price_fields_changing = {
            f for f in ("base_price", "offer_price")
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


def delete_package(package):
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
    package.delete()


# ── AddOn ─────────────────────────────────────────────────────────────────

def create_addon(data, actor):
    addon = AddOn.objects.create(**data)
    _log(CatalogChangeLog.EntityType.ADDON, addon.pk, addon.name, CatalogChangeLog.Action.CREATE, actor)
    return addon


def update_addon(addon, data, actor, reason=None):
    return _apply_updates(addon, data, CatalogChangeLog.EntityType.ADDON, actor, reason=reason)
