"""
workforce_integration/marketplace_client.py

Client for communicating with the external Sevo-vendor Seller Hub integration APIs.
All server-to-server calls pass through this client using shared integration secrets.
Does not store or duplicate vendor catalog or inventory tables locally.
"""
import logging
import os
import requests
from django.conf import settings

logger = logging.getLogger("workforce_integration.marketplace")

WORKFORCE_API_BASE_URL = (os.getenv("WORKFORCE_API_BASE_URL") or "http://127.0.0.1:8001/api/workforce").replace("localhost", "127.0.0.1").rstrip("/")


class MarketplaceIntegrationClient:
    """Server-to-server client for Seller Hub product and order lifecycle."""

    @classmethod
    def _get_base_url(cls):
        base = (
            getattr(settings, "WORKFORCE_API_BASE_URL", None)
            or os.getenv("WORKFORCE_API_BASE_URL")
            or "http://127.0.0.1:8001/api/workforce"
        )
        return str(base).replace("localhost", "127.0.0.1").rstrip("/")

    @classmethod
    def _get_secret(cls):
        secret = (
            getattr(settings, "SEVO_INTEGRATION_SECRET", None)
            or os.getenv("SEVO_INTEGRATION_SECRET")
            or getattr(settings, "WORKFORCE_WEBHOOK_SECRET", None)
            or os.getenv("WORKFORCE_WEBHOOK_SECRET")
            or ""
        )
        return secret.strip() if secret else ""

    @classmethod
    def _headers(cls):
        secret = cls._get_secret()
        if not secret:
            logger.error("Marketplace client cannot call Vendor: SEVO_INTEGRATION_SECRET / WORKFORCE_WEBHOOK_SECRET is not configured.")
            return None
        return {
            "Authorization": f"Bearer {secret}",
            "X-Sevo-Integration-Secret": secret,
            "X-Workforce-Webhook-Secret": secret,
            "Content-Type": "application/json",
            "X-CalServices-Source": "calservices-platform",
        }

    @classmethod
    def get_categories(cls, tree=True, parent_id=None, hide_empty=True) -> dict:
        """
        Queries active Seller Hub category tree or flat list from Vendor.
        GET {cls._get_base_url()}/marketplace/categories/
        """
        params = {
            "tree": "true" if tree else "false",
            "hide_empty": "true" if hide_empty else "false",
        }
        if parent_id is not None:
            params["parent_id"] = str(parent_id).strip()

        headers = cls._headers()
        if not headers:
            logger.error("Vendor category request aborted: integration secret not configured.")
            return {"success": False, "status_code": 401, "message": "Integration secret not configured", "data": None}

        endpoint = "/marketplace/categories/"
        url = f"{cls._get_base_url()}{endpoint}"
        try:
            url = f"{cls._get_base_url()}{endpoint}"
            response = requests.get(url, params=params, headers=headers, timeout=20)
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        return {"success": True, "status_code": 200, "data": data}
                    logger.error(f"Vendor category endpoint {endpoint} returned non-list JSON payload with status 200")
                    return {"success": False, "status_code": 200, "message": "Malformed category payload from vendor", "data": None}
                except Exception as json_err:
                    logger.error(f"Vendor category endpoint {endpoint} returned malformed JSON: {json_err}")
                    return {"success": False, "status_code": 200, "message": "Malformed JSON from vendor", "data": None}

            logger.error(f"Vendor category endpoint {endpoint} failed with HTTP status {response.status_code}")
            return {
                "success": False,
                "status_code": response.status_code,
                "message": f"Vendor returned status {response.status_code}",
                "data": None,
            }
        except requests.Timeout:
            logger.error(f"Vendor category endpoint {endpoint} request timed out")
            return {
                "success": False,
                "status_code": 504,
                "message": "Marketplace category service timed out",
                "data": None,
            }
        except Exception as e:
            logger.error(f"Vendor category endpoint {endpoint} network error: {type(e).__name__}")
            return {
                "success": False,
                "status_code": 503,
                "message": "Marketplace category service unreachable",
                "data": None,
            }

    @classmethod
    def fetch_products(cls, search=None, category=None, category_slug=None, category_id=None, seller_id=None, page=1, page_size=20) -> dict:
        """
        Queries published, approved, in-stock products from Vendor marketplace feed.
        """
        params = {
            "page": page,
            "page_size": page_size,
        }
        if search:
            params["search"] = str(search).strip()
        if category_id is not None:
            params["category_id"] = category_id
        elif category_slug is not None:
            params["category_slug"] = str(category_slug).strip()
        elif category:
            cat_str = str(category).strip()
            if cat_str.isdigit():
                params["category_id"] = int(cat_str)
            elif cat_str.lower() != "all":
                params["category_slug"] = cat_str
        if seller_id:
            params["seller_id"] = str(seller_id).strip()

        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured", "data": {"count": 0, "results": []}}
        try:
            url = f"{cls._get_base_url()}/marketplace/products/"
            response = requests.get(url, params=params, headers=headers, timeout=20)
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "data": data}
            if response.status_code == 404:
                try:
                    err_json = response.json()
                    if err_json.get("code") == "CATEGORY_NOT_FOUND" or "Category" in err_json.get("error", ""):
                        return {
                            "success": False,
                            "status_code": 404,
                            "code": "CATEGORY_NOT_FOUND",
                            "message": err_json.get("error", "Category not found or inactive."),
                        }
                except Exception:
                    pass
                return {"success": False, "status_code": 404, "message": "Products not found", "data": {"count": 0, "results": []}}
            logger.warning(f"Vendor marketplace products returned {response.status_code}: {response.text[:300]}")
            return {"success": False, "status_code": response.status_code, "message": "Failed to fetch marketplace products", "data": {"count": 0, "results": []}}
        except Exception as e:
            logger.error(f"Error fetching marketplace products: {e}")
            return {"success": False, "message": "Marketplace service unreachable", "data": {"count": 0, "results": []}}

    @classmethod
    def fetch_product_detail(cls, product_id: int) -> dict:
        """
        Queries detailed info for a single published marketplace product.
        """
        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured"}
        try:
            url = f"{cls._get_base_url()}/marketplace/products/{product_id}/"
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code == 200:
                return {"success": True, "data": response.json()}
            elif response.status_code == 404:
                return {"success": False, "status_code": 404, "message": "Product not found or unavailable"}
            logger.warning(f"Vendor marketplace product {product_id} detail returned {response.status_code}: {response.text[:300]}")
            return {"success": False, "status_code": response.status_code, "message": "Failed to fetch product details"}
        except Exception as e:
            logger.error(f"Error fetching product {product_id} detail: {e}")
            return {"success": False, "message": "Marketplace service unreachable"}

    @classmethod
    def validate_cart(cls, seller_id: int, items: list) -> dict:
        """
        Validates live pricing and stock availability before checkout.
        `items` format: [{"product_id": int, "requested_quantity": int, "expected_unit_price": str/float}]
        """
        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured"}
        payload = {
            "seller_id": seller_id,
            "items": items,
        }
        try:
            url = f"{cls._get_base_url()}/marketplace/cart/validate/"
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            if response.status_code == 200:
                data = response.json()
                return {"success": True, "validation": data, "is_valid": data.get("is_valid", False)}
            logger.warning(f"Vendor cart validation returned {response.status_code}: {response.text[:300]}")
            return {"success": False, "status_code": response.status_code, "message": "Failed to validate cart with vendor"}
        except Exception as e:
            logger.error(f"Error validating marketplace cart: {e}")
            return {"success": False, "message": "Marketplace validation service unreachable"}

    @classmethod
    def intake_order(
        cls,
        source_order_id: str,
        seller_id: int,
        customer_name: str,
        customer_phone: str,
        customer_email: str,
        fulfilment_type: str,
        delivery_address: dict,
        payment_snapshot: dict,
        items: list,
        delivery_group_id: str = "",
        warehouse_id: int = None,
        warehouse_name: str = "",
    ) -> dict:
        """
        Intakes canonical customer order to Vendor Seller Hub and atomically reserves stock.
        Idempotent on `source_order_id`.
        """
        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured", "retryable": True}
        payload = {
            "source_order_id": source_order_id,
            "seller_id": seller_id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "customer_email": customer_email,
            "fulfilment_type": fulfilment_type or "DELIVERY",
            "delivery_address": delivery_address if isinstance(delivery_address, dict) else {"formatted": str(delivery_address)},
            "payment_snapshot": payment_snapshot,
            "items": items,
            "delivery_group_id": delivery_group_id,
            "warehouse_id": warehouse_id,
            "warehouse_name": warehouse_name,
        }
        try:
            url = f"{cls._get_base_url()}/marketplace/orders/intake/"
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            if response.status_code in [200, 201]:
                return {"success": True, "data": response.json(), "status_code": response.status_code}
            elif response.status_code == 409:
                err_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "success": False,
                    "status_code": 409,
                    "error": err_data.get("code") or "insufficient_stock",
                    "message": err_data.get("error") or "Insufficient stock for requested items",
                    "details": err_data,
                }
            elif response.status_code in [400, 404, 422]:
                err_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "message": err_data.get("error") or "Vendor order intake rejected",
                    "details": err_data,
                }
            logger.warning(f"Vendor order intake failed ({response.status_code}): {response.text[:500]}")
            return {"success": False, "status_code": response.status_code, "message": "Vendor order intake failed", "retryable": True}
        except Exception as e:
            logger.error(f"Error in marketplace order intake: {e}")
            return {"success": False, "message": "Vendor intake service unreachable", "retryable": True}

    @classmethod
    def cancel_order(
        cls,
        source_order_id: str,
        cancellation_reason: str = "Customer cancelled order",
        cancelled_by: str = "CUSTOMER",
        cancellation_notes: str = "",
    ) -> dict:
        """
        Notifies Vendor of order cancellation and atomically releases reserved stock.
        Idempotent on `source_order_id`.
        """
        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured", "retryable": True}
        payload = {
            "cancellation_reason": cancellation_reason,
            "cancelled_by": cancelled_by,
            "cancellation_notes": cancellation_notes,
        }
        try:
            url = f"{cls._get_base_url()}/marketplace/orders/{source_order_id}/cancel/"
            response = requests.post(url, json=payload, headers=headers, timeout=20)
            if response.status_code in [200, 204]:
                return {"success": True, "data": response.json() if response.text else {}}
            elif response.status_code == 400:
                err_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                return {
                    "success": False,
                    "status_code": 400,
                    "message": err_data.get("error") or "Vendor rejected cancellation: Order cannot be cancelled.",
                    "details": err_data,
                }
            logger.warning(f"Vendor order cancel failed ({response.status_code}): {response.text[:400]}")
            return {"success": False, "status_code": response.status_code, "message": "Failed to release vendor reservation", "retryable": True}
        except Exception as e:
            logger.error(f"Error cancelling marketplace order on vendor: {e}")
            return {"success": False, "message": "Vendor cancellation service unreachable", "retryable": True}

    @classmethod
    def fetch_order_status(cls, source_order_id: str) -> dict:
        """
        Queries authoritative order status snapshot from Vendor status endpoint.
        GET {cls._get_base_url()}/marketplace/orders/{source_order_id}/status/
        """
        headers = cls._headers()
        if not headers:
            return {"success": False, "message": "Integration secret not configured", "retryable": True}
        try:
            url = f"{cls._get_base_url()}/marketplace/orders/{source_order_id}/status/"
            response = requests.get(url, headers=headers, timeout=8)
            if response.status_code == 200:
                return {"success": True, "data": response.json(), "status_code": 200}
            elif response.status_code == 404:
                return {"success": False, "status_code": 404, "message": "Order not found on vendor"}
            logger.warning(f"Vendor order status query returned {response.status_code}: {response.text[:300]}")
            return {"success": False, "status_code": response.status_code, "message": "Failed to fetch order status from vendor", "retryable": True}
        except Exception as e:
            logger.error(f"Error querying vendor order status: {e}")
            return {"success": False, "message": "Vendor status service unreachable", "retryable": True}
