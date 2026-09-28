"""
backend/service_requests/cache_utils.py

Centralized cache invalidation utility for catalog services, categories, and produce inventory.
Ensures that any stock changes (restock, adjustment, daily reset, order placement, cancellation,
return, claim write-off, or admin details update) immediately invalidate public storefront caches.
"""
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


def clear_catalog_cache(service_slug="vegetables", cat_id=""):
    """
    Clears all public catalog service and category cache entries across all backends
    (Redis, LocMem, Memcached) and across all parameter variants.
    """
    # 1. Broad pattern deletion if supported (e.g. django-redis)
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("*catalog_services_list*")
            cache.delete_pattern("*catalog_categories*")
            cache.delete_pattern("*catalog*")
    except Exception as exc:
        logger.debug("delete_pattern not supported or failed: %s", exc)

    # 2. In-memory LocMemCache eviction
    try:
        if hasattr(cache, "_cache") and hasattr(cache._cache, "keys"):
            raw_keys = list(cache._cache.keys())
            for k in raw_keys:
                if "catalog" in str(k):
                    cache._cache.pop(k, None)
                    if hasattr(cache, "_expire_info"):
                        cache._expire_info.pop(k, None)
    except Exception:
        pass

    # 3. Direct redis client scan_iter for Redis backend
    try:
        client_pool = getattr(cache, "_cache", None) or getattr(cache, "client", None)
        if client_pool:
            r = client_pool.get_client() if hasattr(client_pool, "get_client") else client_pool
            if hasattr(r, "scan_iter"):
                keys = list(r.scan_iter(match="*catalog*", count=1000))
                if keys:
                    r.delete(*keys)
    except Exception:
        pass

    # 4. Explicit sweep of all potential cache keys used by CatalogServiceListView
    statuses = ["", "ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]
    slugs = list({"", "vegetables", str(service_slug or "").strip()})
    categories = list({"", str(cat_id or "").strip()})

    for s in slugs:
        for c in categories:
            for st in statuses:
                cache.delete(f"catalog_services_list_{c}_{s}_{st}")
                cache.delete(f"catalog_services_list__{s}_{st}")
                cache.delete(f"catalog_services_list_{c}__{st}")
                cache.delete(f"catalog_services_list___{st}")
                # Also delete company-prefixed keys if any legacy signals created them
                for comp in range(1, 10):
                    cache.delete(f"catalog_services_list_{comp}_{c}_{s}_{st}")
                    cache.delete(f"catalog_services_list_{comp}__{s}_{st}")
                    cache.delete(f"catalog_services_list_{comp}_{c}__{st}")
                    cache.delete(f"catalog_services_list_{comp}___{st}")

    # 5. Categories list keys
    cache.delete("catalog_categories_list")
    cache.delete("public_catalog_categories")
    cache.delete("public_catalog_packages")
