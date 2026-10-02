"""
backend/inventory/signals.py

Signal handlers for inventory events, including cache invalidation for catalog services
when stock movements occur.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

from inventory.models import StockMovement, VegetableStockMovement
from service_requests.cache_utils import clear_catalog_cache

logger = logging.getLogger(__name__)


@receiver(post_save, sender=VegetableStockMovement)
def invalidate_catalog_cache_on_vegetable_stock_movement(sender, instance, created, **kwargs):
    """
    Invalidates the exact tenant-scoped and public cache keys for CatalogServiceListView
    when a VegetableStockMovement is recorded.
    """
    try:
        veg = instance.vegetable
        pkg = getattr(veg, "package", None) or getattr(veg, "vegetable_package", None)
        cat_id = pkg.service.category_id if pkg and pkg.service else ""
        service_slug = pkg.service.slug if pkg and pkg.service else "vegetables"

        clear_catalog_cache(service_slug=service_slug, cat_id=cat_id)

        logger.debug(
            "Invalidated catalog cache for category %s, service %s on VegetableStockMovement %s",
            cat_id, service_slug, instance.id
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
        cat_id = pkg.service.category_id if pkg and pkg.service else ""
        service_slug = pkg.service.slug if pkg and pkg.service else "vegetables"

        clear_catalog_cache(service_slug=service_slug, cat_id=cat_id)
    except Exception as exc:
        logger.warning("Error invalidating catalog cache on StockMovement: %s", exc)

