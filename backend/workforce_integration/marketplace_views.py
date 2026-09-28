import logging
from decimal import Decimal, InvalidOperation
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

    image_val = str(node.get("image_url") or node.get("image") or "")
    icon_val = str(node.get("icon_key") or node.get("icon") or "")

    sanitized = {
        "id": node.get("id"),
        "name": str(node.get("name") or ""),
        "slug": str(node.get("slug") or ""),
        "parent_id": node.get("parent_id"),
        "sort_order": int(node.get("sort_order") or 0),
        "icon": icon_val,
        "icon_key": icon_val,
        "image": image_val,
        "image_url": image_val,
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
        level_param = request.query_params.get("level")
        top_level_param = request.query_params.get("top_level", "").lower() in ["true", "1", "yes"] or (level_param and level_param.lower() in ["root", "top"])
        if not parent_id_param or str(parent_id_param).lower() in ["null", "none", ""]:
            parent_id_param = "null"

        cache_suffix = "_top" if top_level_param else ""
        cache_key = f"mkt_cat_tree_{tree_param}_{parent_id_param}_{hide_empty_param}{cache_suffix}"
        stale_cache_key = f"mkt_cat_stale_{tree_param}_{parent_id_param}_{hide_empty_param}{cache_suffix}"

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
            if top_level_param:
                # Filter to only root/top-level categories (no parent_id or parent_id is null/None)
                sanitized = [item for item in sanitized if item.get("parent_id") is None]
                for item in sanitized:
                    item.pop("children", None)
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


def _safe_decimal_str(value, default="0"):
    """Safely coerce a value to a clean decimal string without scientific notation."""
    try:
        d = Decimal(str(value or 0))
        s = f"{d:f}"
        return s.rstrip("0").rstrip(".") if "." in s else s
    except (InvalidOperation, TypeError, ValueError):
        return default


def _sanitize_basket(basket):
    """
    Sanitize and normalise a basket/combo-offer payload from the Vendor feed.
    Handles field-name variation across vendor API versions.
    """
    if not isinstance(basket, dict):
        return {}

    raw_items = basket.get("items") or []
    items = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        items.append({
            "product_id": item.get("product_id") or item.get("seller_product_id") or item.get("id"),
            "product_title": str(item.get("product_title") or item.get("title") or ""),
            "product_sku": str(item.get("sku") or item.get("product_sku") or ""),
            "quantity": int(item.get("quantity") or 1),
            "unit": str(item.get("unit") or ""),
            "pack_size": str(item.get("pack_size") or ""),
            "mrp": _safe_decimal_str(item.get("mrp")),
            "unit_price": _safe_decimal_str(item.get("selling_price") or item.get("unit_price")),
            "primary_image": str(item.get("image_url") or item.get("primary_image") or item.get("image") or ""),
        })

    bundle_price = _safe_decimal_str(
        basket.get("selling_price") or basket.get("bundle_price") or basket.get("total_price") or basket.get("basket_price")
    )
    mrp_total = _safe_decimal_str(
        basket.get("total_mrp") or basket.get("mrp_total") or basket.get("original_total")
    )
    savings = _safe_decimal_str(
        basket.get("savings_vs_mrp") or basket.get("savings") or basket.get("discount_amount") or basket.get("saving")
    )

    return {
        "id": basket.get("id"),
        "title": str(basket.get("title") or basket.get("name") or "Combo Bundle"),
        "description": str(basket.get("description") or ""),
        "seller_id": basket.get("seller_id") or basket.get("company_id"),
        "seller_name": str(basket.get("seller_name") or basket.get("company_name") or ""),
        "warehouse_id": basket.get("warehouse_id"),
        "warehouse_name": str(basket.get("warehouse_name") or ""),
        "bundle_price": bundle_price,
        "mrp_total": mrp_total,
        "savings": savings,
        "savings_percent": basket.get("savings_percent"),
        "available_stock": basket.get("available_stock"),
        "in_stock": bool(basket.get("in_stock", True)),
        "primary_image": str(basket.get("image_url") or basket.get("primary_image") or basket.get("image") or ""),
        "items": items,
        "item_count": int(basket.get("item_count") or len(items)),
        "is_active": bool(basket.get("status") == "ACTIVE" if "status" in basket else basket.get("is_active", True)),
    }


class CustomerMarketplaceBasketListView(APIView):
    """
    GET /api/marketplace/baskets/
    Public listing of basket/combo offers from Vendor Seller Hub.
    Accepts: company_id, search, page, page_size query params.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        company_id = request.query_params.get("company_id")
        search = request.query_params.get("search")
        page = request.query_params.get("page", 1)
        page_size = request.query_params.get("page_size", 20)

        result = MarketplaceIntegrationClient.fetch_baskets(
            company_id=company_id,
            search=search,
            page=page,
            page_size=page_size,
        )
        if result.get("success"):
            raw = result["data"]
            if isinstance(raw, dict) and "results" in raw:
                sanitized = [_sanitize_basket(b) for b in raw["results"] if isinstance(b, dict)]
                return Response({**raw, "results": sanitized}, status=status.HTTP_200_OK)
            elif isinstance(raw, list):
                sanitized = [_sanitize_basket(b) for b in raw if isinstance(b, dict)]
                return Response(sanitized, status=status.HTTP_200_OK)
            return Response(raw, status=status.HTTP_200_OK)
        return _error(result.get("message", "Failed to retrieve basket offers."), status.HTTP_502_BAD_GATEWAY)


class CustomerMarketplaceBasketDetailView(APIView):
    """
    GET /api/marketplace/baskets/<int:basket_id>/
    Full basket detail with component product breakdown.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, basket_id):
        result = MarketplaceIntegrationClient.fetch_basket_detail(basket_id=basket_id)
        if result.get("success"):
            return Response(_sanitize_basket(result["data"]), status=status.HTTP_200_OK)
        if result.get("status_code") == 404:
            return _error("Basket offer not found or unavailable.", status.HTTP_404_NOT_FOUND)
        return _error(result.get("message", "Failed to fetch basket detail."), status.HTTP_502_BAD_GATEWAY)
