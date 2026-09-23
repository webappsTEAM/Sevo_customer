"""
backend/inventory/signals.py

Signal handlers for inventory events, including cache invalidation for catalog services
when stock movements occur.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.cache import cache

from inventory.models import StockMovement, VegetableStockMovement

logger = logging.getLogger(__name__)


@receiver(post_save, sender=VegetableStockMovement)
def invalidate_catalog_cache_on_vegetable_stock_movement(sender, instance, created, **kwargs):
    """
    Invalidates the exact tenant-scoped cache keys for CatalogServiceListView
    when a VegetableStockMovement is recorded.
    """
    try:
        veg = instance.vegetable
        pkg = getattr(veg, "package", None) or getattr(veg, "vegetable_package", None)
        if not pkg:
            return

        company_id = instance.org_id or ""
        cat_id = pkg.service.category_id if pkg.service else ""
        service_slug = pkg.service.slug if pkg.service else "vegetables"

        statuses = ["", "ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]

        for st in statuses:
            cache.delete(f"catalog_services_list_{company_id}__{service_slug}_{st}")
            cache.delete(f"catalog_services_list_{company_id}_{cat_id}_{service_slug}_{st}")
            cache.delete(f"catalog_services_list_{company_id}_{cat_id}__{st}")
            cache.delete(f"catalog_services_list_{company_id}___{st}")

        logger.debug(
            "Invalidated catalog cache for company %s, category %s, service %s on VegetableStockMovement %s",
            company_id, cat_id, service_slug, instance.id
        )
    except Exception as exc:
        logger.warning("Error invalidating catalog cache on VegetableStockMovement: %s", exc)


@receiver(post_save, sender=StockMovement)
def invalidate_catalog_cache_on_stock_movement(sender, instance, created, **kwargs):
    """
    Fallback cache invalidation for general warehouse StockMovement.
    """
    try:
        item = instance.item
        pkg = getattr(item, "vegetable_package", None)
        if not pkg:
            return

        company_id = instance.org_id or ""
        cat_id = pkg.service.category_id if pkg.service else ""
        service_slug = pkg.service.slug if pkg.service else "vegetables"

        statuses = ["", "ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]

        for st in statuses:
            cache.delete(f"catalog_services_list_{company_id}__{service_slug}_{st}")
            cache.delete(f"catalog_services_list_{company_id}_{cat_id}_{service_slug}_{st}")
            cache.delete(f"catalog_services_list_{company_id}_{cat_id}__{st}")
            cache.delete(f"catalog_services_list_{company_id}___{st}")
    except Exception as exc:
        logger.warning("Error invalidating catalog cache on StockMovement: %s", exc)
