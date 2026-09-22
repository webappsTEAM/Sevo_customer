import logging
import re
from django.core.cache import cache
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from .marketplace_client import MarketplaceIntegrationClient

logger = logging.getLogger("workforce_integration.marketplace")


def _success(data=None, message="", status_code=200):
    return Response(
        {"success": True, "data": data if data is not None else {}, "message": message},
        status=status_code,
    )


def _error(message, status_code=400, errors=None):
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    return Response(body, status=status_code)


def _sanitize_category_node(node):
    if not isinstance(node, dict):
        return {}
    
    path = []
    for p in node.get("path") or []:
        if isinstance(p, dict):
            path.append({
                "id": p.get("id"),
                "name": p.get("name", ""),
                "slug": p.get("slug", ""),
            })

    sanitized = {
        "id": node.get("id"),
        "name": str(node.get("name") or ""),
        "slug": str(node.get("slug") or ""),
        "parent_id": node.get("parent_id"),
        "sort_order": int(node.get("sort_order") or 0),
        "icon": str(node.get("icon") or ""),
        "image": str(node.get("image") or ""),
        "is_leaf": bool(node.get("is_leaf", True)),
        "has_children": bool(node.get("has_children", False)),
        "path": path,
        "path_string": str(node.get("path_string") or node.get("name") or ""),
        "product_count": int(node.get("product_count") or 0),
        "total_product_count": int(node.get("total_product_count") or node.get("product_count") or 0),
    }

    if "children" in node and isinstance(node["children"], list):
        sanitized["children"] = [_sanitize_category_node(c) for c in node["children"]]
    
    return sanitized


class MarketplaceProductListView(APIView):
    """
    GET /api/marketplace/products/
    Public read-only customer product feed for Vendor-approved Seller Hub items.
    Accepts category, category_slug, category_id filters.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        search = request.query_params.get("search")
        category = request.query_params.get("category")
        category_slug = request.query_params.get("category_slug")
        category_id = request.query_params.get("category_id")
        seller_id = request.query_params.get("seller_id")
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 20)

        # Validate category_id
        if category_id is not None:
            try:
                category_id = int(category_id)
                if category_id <= 0:
                    return _error("Invalid category_id parameter.", status.HTTP_400_BAD_REQUEST)
            except (ValueError, TypeError):
                return _error("Invalid category_id format.", status.HTTP_400_BAD_REQUEST)

        # Validate category_slug
        if category_slug is not None:
            category_slug = str(category_slug).strip()
            if len(category_slug) > 100 or not re.match(r"^[a-zA-Z0-9_-]+$", category_slug):
                return _error("Invalid category_slug parameter format.", status.HTTP_400_BAD_REQUEST)

        # Validate category generic
        if category is not None:
            category = str(category).strip()
            if len(category) > 100 or not re.match(r"^[a-zA-Z0-9_\s-]+$", category):
                return _error("Invalid category parameter format.", status.HTTP_400_BAD_REQUEST)

        result = MarketplaceIntegrationClient.fetch_products(
            search=search,
            category=category,
            category_slug=category_slug,
            category_id=category_id,
            seller_id=seller_id,
            page=page,
            page_size=page_size,
        )

        if result.get("success"):
            return Response(result["data"], status=status.HTTP_200_OK)

        if result.get("status_code") == 404 and (result.get("code") == "CATEGORY_NOT_FOUND" or "Category" in result.get("message", "")):
            return Response(
                {"error": "Category not found or inactive.", "code": "CATEGORY_NOT_FOUND"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return _error(result.get("message", "Failed to retrieve marketplace products"), status.HTTP_502_BAD_GATEWAY)


class MarketplaceProductDetailView(APIView):
    """
    GET /api/marketplace/products/<int:pk>/
    Public read-only product detail.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        result = MarketplaceIntegrationClient.fetch_product_detail(product_id=pk)
        if result.get("success"):
            return Response(result["data"], status=status.HTTP_200_OK)
        if result.get("status_code") == 404:
            return _error("Product not found or unavailable.", status.HTTP_404_NOT_FOUND)
        return _error(result.get("message", "Failed to fetch product detail."), status.HTTP_502_BAD_GATEWAY)


class MarketplaceCategoryListView(APIView):
    """
    GET /api/marketplace/categories/
    Returns categories available from Vendor Seller Hub category feed.
    Cached for 60s with stale-while-error fallback.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        tree_param = request.query_params.get("tree", "true").lower() != "false"
        hide_empty_param = request.query_params.get("hide_empty", "true").lower() != "false"
        parent_id_param = request.query_params.get("parent_id")
        if not parent_id_param or str(parent_id_param).lower() in ["null", "none", ""]:
            parent_id_param = "null"

        cache_key = f"mkt_cat_tree_{tree_param}_{parent_id_param}_{hide_empty_param}"
        stale_cache_key = f"mkt_cat_stale_{tree_param}_{parent_id_param}_{hide_empty_param}"

        # 1. Try Live Cache (TTL 60s)
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return _success(cached_data)

        # 2. Call Vendor Category Feed
        res = MarketplaceIntegrationClient.get_categories(
            tree=tree_param,
            parent_id=parent_id_param if parent_id_param != "null" else None,
            hide_empty=hide_empty_param,
        )

        if res.get("success") and isinstance(res.get("data"), list):
            # An empty-but-valid list or populated list from a successful 200 response is legitimate and cached
            sanitized = [_sanitize_category_node(item) for item in res["data"] if isinstance(item, dict)]
            cache.set(cache_key, sanitized, timeout=60)
            cache.set(stale_cache_key, sanitized, timeout=86400)
            return _success(sanitized)

        # Log clear server-side failure (status and endpoint only, never secret or headers)
        status_code = res.get("status_code", "UNAVAILABLE")
        logger.error(
            f"Vendor category retrieval failed: status={status_code}, endpoint=/marketplace/categories/"
        )

        # 3. Fallback to Stale Cache if Vendor failed, timed out, or returned malformed response
        stale_data = cache.get(stale_cache_key)
        if stale_data is not None:
            logger.warning("Vendor category endpoint unreachable; serving stale cached categories.")
            return _success(stale_data)

        # 4. Vendor failed and no cached fallback exists -> 503 CATEGORIES_UNAVAILABLE
        # NEVER cache failure or error responses
        return Response(
            {
                "error": "Categories are currently unavailable.",
                "code": "CATEGORIES_UNAVAILABLE",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


class MarketplaceCartValidateView(APIView):
    """
    POST /api/marketplace/cart/validate/
    Validates pricing and stock with Vendor before checkout.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        seller_id = request.data.get("seller_id")
        items = request.data.get("items")
        if not seller_id or not items or not isinstance(items, list):
            return _error("seller_id and non-empty items list required.", status.HTTP_400_BAD_REQUEST)

        res = MarketplaceIntegrationClient.validate_cart(seller_id=int(seller_id), items=items)
        if res.get("success"):
            return Response(res["validation"], status=status.HTTP_200_OK)
        return _error(res.get("message", "Validation failed"), status.HTTP_400_BAD_REQUEST)
