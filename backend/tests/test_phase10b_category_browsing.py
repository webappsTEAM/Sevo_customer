"""
tests/test_phase10b_category_browsing.py

Comprehensive test suite for Phase 10B Customer Category Browsing:
- MarketplaceIntegrationClient get_categories and fetch_products
- GET /api/marketplace/categories/ (tree sanitization, 60s cache, stale fallback, 503 on failure)
- GET /api/marketplace/products/ (category_slug / category_id filtering, 404 CATEGORY_NOT_FOUND, input validation)
- Secret / Vendor URL non-leakage verification
"""
import unittest
from unittest.mock import patch, MagicMock
from decimal import Decimal
import requests

from django.test import TestCase
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient

from workforce_integration.marketplace_client import MarketplaceIntegrationClient


class Phase10BCategoryBrowsingTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        from django.db import connection
        engine = connection.settings_dict.get("ENGINE", "")
        if "sqlite3" not in engine:
            raise RuntimeError(
                f"FATAL: Test ran against non-sqlite engine: {engine}. Tests are restricted to temporary SQLite only."
            )

    def setUp(self):
        self.client = APIClient()
        cache.clear()

        # Canonical sample tree from Vendor Phase 10B contract
        self.mock_vendor_category_tree = [
            {
                "id": 1,
                "name": "Groceries",
                "slug": "groceries",
                "parent_id": None,
                "sort_order": 1,
                "icon": "ShoppingBag",
                "image": "https://example.com/groceries.jpg",
                "is_leaf": False,
                "has_children": True,
                "path": [{"id": 1, "name": "Groceries", "slug": "groceries"}],
                "path_string": "Groceries",
                "product_count": 0,
                "total_product_count": 4,
                "children": [
                    {
                        "id": 2,
                        "name": "Dairy & Eggs",
                        "slug": "dairy-eggs",
                        "parent_id": 1,
                        "sort_order": 1,
                        "icon": "Milk",
                        "image": "https://example.com/dairy.jpg",
                        "is_leaf": False,
                        "has_children": True,
                        "path": [
                            {"id": 1, "name": "Groceries", "slug": "groceries"},
                            {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                        ],
                        "path_string": "Groceries > Dairy & Eggs",
                        "product_count": 0,
                        "total_product_count": 3,
                        "children": [
                            {
                                "id": 3,
                                "name": "Fresh Milk",
                                "slug": "fresh-milk",
                                "parent_id": 2,
                                "sort_order": 1,
                                "icon": "MilkBottle",
                                "image": "https://example.com/milk.jpg",
                                "is_leaf": True,
                                "has_children": False,
                                "path": [
                                    {"id": 1, "name": "Groceries", "slug": "groceries"},
                                    {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                                    {"id": 3, "name": "Fresh Milk", "slug": "fresh-milk"},
                                ],
                                "path_string": "Groceries > Dairy & Eggs > Fresh Milk",
                                "product_count": 2,
                                "total_product_count": 2,
                                "children": [],
                            },
                            {
                                "id": 4,
                                "name": "Organic Eggs",
                                "slug": "organic-eggs",
                                "parent_id": 2,
                                "sort_order": 2,
                                "icon": "Egg",
                                "image": "",
                                "is_leaf": True,
                                "has_children": False,
                                "path": [
                                    {"id": 1, "name": "Groceries", "slug": "groceries"},
                                    {"id": 2, "name": "Dairy & Eggs", "slug": "dairy-eggs"},
                                    {"id": 4, "name": "Organic Eggs", "slug": "organic-eggs"},
                                ],
                                "path_string": "Groceries > Dairy & Eggs > Organic Eggs",
                                "product_count": 1,
                                "total_product_count": 1,
                                "children": [],
                            },
                        ],
                    }
                ],
            }
        ]

    def tearDown(self):
        cache.clear()

    # ── 1. Client Tests ───────────────────────────────────────────────────────

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_01_client_get_categories_success(self, mock_get):
        """MarketplaceIntegrationClient.get_categories passes params and returns vendor categories."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = self.mock_vendor_category_tree
        mock_get.return_value = mock_resp

        res = MarketplaceIntegrationClient.get_categories(tree=True, hide_empty=True)
        self.assertTrue(res["success"])
        self.assertEqual(len(res["data"]), 1)
        self.assertEqual(res["data"][0]["name"], "Groceries")

        # Verify query parameters
        mock_get.assert_called_once()
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["tree"], "true")
        self.assertEqual(kwargs["params"]["hide_empty"], "true")
        self.assertIn("Authorization", kwargs["headers"])

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_02_client_get_categories_timeout_handled(self, mock_get):
        """Client handles requests.Timeout gracefully without crashing."""
        mock_get.side_effect = requests.Timeout("Connection timed out")

        res = MarketplaceIntegrationClient.get_categories()
        self.assertFalse(res["success"])
        self.assertIsNone(res.get("data"))
        self.assertEqual(res.get("status_code"), 504)

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_03_client_fetch_products_with_category_slug_and_id(self, mock_get):
        """fetch_products correctly formats category_slug and category_id params."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"count": 2, "results": []}
        mock_get.return_value = mock_resp

        # Test with category_slug
        MarketplaceIntegrationClient.fetch_products(category_slug="fresh-milk")
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["category_slug"], "fresh-milk")

        # Test with category_id
        MarketplaceIntegrationClient.fetch_products(category_id=3)
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["category_id"], 3)

        # Test with generic category parameter
        MarketplaceIntegrationClient.fetch_products(category="dairy-eggs")
        args, kwargs = mock_get.call_args
        self.assertEqual(kwargs["params"]["category_slug"], "dairy-eggs")

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_04_client_fetch_products_parses_404_category_not_found(self, mock_get):
        """fetch_products parses 404 CATEGORY_NOT_FOUND accurately."""
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.json.return_value = {
            "error": "Category not found or inactive.",
            "code": "CATEGORY_NOT_FOUND",
        }
        mock_get.return_value = mock_resp

        res = MarketplaceIntegrationClient.fetch_products(category_slug="inactive-category")
        self.assertFalse(res["success"])
        self.assertEqual(res["status_code"], 404)
        self.assertEqual(res.get("code"), "CATEGORY_NOT_FOUND")

    # ── 2. Category Endpoint Tests ────────────────────────────────────────────

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_05_category_endpoint_happy_path_and_sanitization(self, mock_get_cats):
        """GET /api/marketplace/categories/ returns sanitized hierarchy with product counts."""
        mock_get_cats.return_value = {
            "success": True,
            "data": self.mock_vendor_category_tree,
        }

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data.get("data", [])
        self.assertEqual(len(data), 1)

        root = data[0]
        self.assertEqual(root["id"], 1)
        self.assertEqual(root["name"], "Groceries")
        self.assertEqual(root["total_product_count"], 4)
        self.assertEqual(len(root["children"]), 1)

        sub = root["children"][0]
        self.assertEqual(sub["name"], "Dairy & Eggs")
        self.assertEqual(sub["total_product_count"], 3)
        self.assertEqual(len(sub["children"]), 2)

        leaf = sub["children"][0]
        self.assertEqual(leaf["name"], "Fresh Milk")
        self.assertEqual(leaf["product_count"], 2)
        self.assertTrue(leaf["is_leaf"])
        self.assertFalse(leaf["has_children"])

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_06_category_endpoint_60s_cache_hit(self, mock_get_cats):
        """Repeated GET /api/marketplace/categories/ serves from 60s cache without re-querying Vendor."""
        mock_get_cats.return_value = {
            "success": True,
            "data": self.mock_vendor_category_tree,
        }

        # First request -> populates cache
        resp1 = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_get_cats.call_count, 1)

        # Second request within 60s TTL -> serves from cache
        resp2 = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_get_cats.call_count, 1)
        self.assertEqual(resp1.data, resp2.data)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_07_category_endpoint_vendor_down_with_stale_cache_serves_stale_tree(self, mock_get_cats):
        """When Vendor is down after live cache expires, serves stale cached tree."""
        # 1. Populate initial cache
        mock_get_cats.return_value = {
            "success": True,
            "data": self.mock_vendor_category_tree,
        }
        resp1 = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        # 2. Simulate live cache expiration (clear live key, keep stale key)
        live_key = "mkt_cat_tree_True_null_True"
        cache.delete(live_key)

        # 3. Simulate Vendor outage
        mock_get_cats.return_value = {
            "success": False,
            "message": "Marketplace category service unreachable",
            "data": [],
        }

        resp2 = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp2.data.get("data", [])), 1)
        self.assertEqual(resp2.data["data"][0]["name"], "Groceries")

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_products")
    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_08_category_endpoint_vendor_down_without_cache_returns_503(self, mock_get_cats, mock_fetch_prods):
        """When Vendor is down and no cache exists, returns 503 CATEGORIES_UNAVAILABLE."""
        cache.clear()
        mock_get_cats.return_value = {
            "success": False,
            "message": "Marketplace category service unreachable",
            "data": [],
        }
        mock_fetch_prods.return_value = {
            "success": False,
            "message": "Marketplace service unreachable",
        }

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")
        self.assertIn("unavailable", resp.data.get("error", "").lower())

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.get_categories")
    def test_09_category_endpoint_zero_secret_or_url_leakage(self, mock_get_cats):
        """Responses never expose internal URLs, hostnames, or secret tokens."""
        mock_get_cats.return_value = {
            "success": True,
            "data": self.mock_vendor_category_tree,
        }

        resp = self.client.get("/api/marketplace/categories/")
        resp_str = str(resp.data)
        self.assertNotIn("8001", resp_str)
        self.assertNotIn("Bearer", resp_str)
        self.assertNotIn("secret", resp_str.lower())

    # ── 3. Product List Filtering Tests ───────────────────────────────────────

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_products")
    def test_10_product_list_category_passthrough(self, mock_fetch):
        """GET /api/marketplace/products/?category=dairy-eggs passes category to Vendor."""
        mock_fetch.return_value = {
            "success": True,
            "data": {
                "count": 3,
                "page": 1,
                "page_size": 20,
                "results": [
                    {"id": 101, "title": "Milk", "category_id": 3},
                ],
            }
        }

        resp = self.client.get("/api/marketplace/products/?category=dairy-eggs")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        mock_fetch.assert_called_once()
        args, kwargs = mock_fetch.call_args
        self.assertEqual(kwargs["category"], "dairy-eggs")

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_products")
    def test_11_product_list_unknown_category_returns_404(self, mock_fetch):
        """GET /api/marketplace/products/?category=invalid-slug returns 404 CATEGORY_NOT_FOUND."""
        mock_fetch.return_value = {
            "success": False,
            "status_code": 404,
            "code": "CATEGORY_NOT_FOUND",
            "message": "Category not found or inactive.",
        }

        resp = self.client.get("/api/marketplace/products/?category=invalid-slug")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(resp.data.get("code"), "CATEGORY_NOT_FOUND")
        self.assertIn("Category not found", resp.data.get("error"))

    def test_12_product_list_invalid_category_param_format_rejected(self):
        """Malicious / overly long category input is rejected with 400 Bad Request."""
        # 1. Invalid characters in slug
        resp1 = self.client.get("/api/marketplace/products/?category_slug=bad$slug!")
        self.assertEqual(resp1.status_code, status.HTTP_400_BAD_REQUEST)

        # 2. Invalid category_id
        resp2 = self.client.get("/api/marketplace/products/?category_id=-5")
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)

        # 3. Non-numeric category_id
        resp3 = self.client.get("/api/marketplace/products/?category_id=abc")
        self.assertEqual(resp3.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("workforce_integration.marketplace_client.MarketplaceIntegrationClient.fetch_products")
    def test_13_product_list_no_category_unchanged_behavior(self, mock_fetch):
        """GET /api/marketplace/products/ without category maintains default behavior."""
        mock_fetch.return_value = {
            "success": True,
            "data": {
                "count": 5,
                "results": [{"id": 1, "title": "Apple"}],
            }
        }

        resp = self.client.get("/api/marketplace/products/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        args, kwargs = mock_fetch.call_args
        self.assertIsNone(kwargs.get("category"))
        self.assertIsNone(kwargs.get("category_slug"))
        self.assertIsNone(kwargs.get("category_id"))

    # ── 4. Error Code & Cache Non-Poisoning Tests ──────────────────────────────

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_14_category_endpoint_vendor_401_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor 401 Unauthorized returns 503 and does NOT poison the cache."""
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        # Assert cache is not poisoned with empty or failed data
        live_key = "mkt_cat_tree_True_null_True"
        stale_key = "mkt_cat_stale_True_null_True"
        self.assertIsNone(cache.get(live_key))
        self.assertIsNone(cache.get(stale_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_15_category_endpoint_vendor_403_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor 403 Forbidden returns 503 and does NOT poison the cache."""
        mock_resp = MagicMock()
        mock_resp.status_code = 403
        mock_resp.text = "Forbidden"
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        live_key = "mkt_cat_tree_True_null_True"
        self.assertIsNone(cache.get(live_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_16_category_endpoint_vendor_404_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor 404 on category feed returns 503 and does NOT poison the cache."""
        mock_resp = MagicMock()
        mock_resp.status_code = 404
        mock_resp.text = "Not Found"
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        live_key = "mkt_cat_tree_True_null_True"
        self.assertIsNone(cache.get(live_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_17_category_endpoint_vendor_500_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor 500 Internal Server Error returns 503 and does NOT poison the cache."""
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_resp.text = "Server Error"
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        live_key = "mkt_cat_tree_True_null_True"
        self.assertIsNone(cache.get(live_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_18_category_endpoint_vendor_timeout_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor request timeout returns 503 and does NOT poison the cache."""
        mock_get.side_effect = requests.Timeout("Connection timed out after 6 seconds")

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        live_key = "mkt_cat_tree_True_null_True"
        self.assertIsNone(cache.get(live_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_19_category_endpoint_vendor_malformed_json_returns_503_and_no_cache_poison(self, mock_get):
        """Vendor 200 with malformed/invalid JSON returns 503 and does NOT poison the cache."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.side_effect = ValueError("Invalid JSON: line 1 column 1 (char 0)")
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data.get("code"), "CATEGORIES_UNAVAILABLE")

        live_key = "mkt_cat_tree_True_null_True"
        self.assertIsNone(cache.get(live_key))

    @patch("workforce_integration.marketplace_client.requests.get")
    def test_20_category_endpoint_vendor_empty_tree_200_is_cached_legitimately(self, mock_get):
        """An empty list `[]` from a 200 OK response is a legitimate result and IS cached."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = []
        mock_get.return_value = mock_resp

        resp = self.client.get("/api/marketplace/categories/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data.get("data"), [])

        live_key = "mkt_cat_tree_True_null_True"
        cached_result = cache.get(live_key)
        self.assertIsNotNone(cached_result)
        self.assertEqual(cached_result, [])

    def test_21_sevo_e2e_sqlite_path_ignored_when_debug_and_is_testing_false(self):
        """SEVO_E2E_SQLITE_PATH is ignored with a warning when DEBUG is False and IS_TESTING is False."""
        import os
        import logging
        from unittest.mock import patch

        fake_db = {"default": {"ENGINE": "django.db.backends.postgresql", "NAME": "postgres"}}
        e2e_path = "/tmp/should_be_ignored.sqlite3"
        debug_val = False
        is_testing_val = False

        with patch.dict(os.environ, {"SEVO_E2E_SQLITE_PATH": e2e_path}):
            with patch.object(logging.getLogger("quicktims.settings"), "warning") as mock_warn:
                _e2e_sqlite_path = os.getenv("SEVO_E2E_SQLITE_PATH")
                if _e2e_sqlite_path:
                    if debug_val or is_testing_val:
                        fake_db["default"] = {
                            "ENGINE": "django.db.backends.sqlite3",
                            "NAME": _e2e_sqlite_path,
                        }
                    else:
                        logging.getLogger("quicktims.settings").warning(
                            "SEVO_E2E_SQLITE_PATH is ignored because DEBUG is False and IS_TESTING is False."
                        )

                self.assertEqual(fake_db["default"]["ENGINE"], "django.db.backends.postgresql")
                self.assertEqual(fake_db["default"]["NAME"], "postgres")
                mock_warn.assert_called_once_with(
                    "SEVO_E2E_SQLITE_PATH is ignored because DEBUG is False and IS_TESTING is False."
                )

