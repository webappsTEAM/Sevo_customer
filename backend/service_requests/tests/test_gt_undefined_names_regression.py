"""
Regressions for NameError crashes found by static analysis (pyflakes) on paths
Goods & Transport depends on. Each was a missing import that only fails when the
code path actually runs.
"""
import os
from decimal import Decimal
from unittest.mock import patch

from django.test import SimpleTestCase


class DetectCustomerLocationTests(SimpleTestCase):
    def test_reverse_geocode_without_a_server_key_does_not_crash(self):
        # `os` was never imported, so live-location detection (used when a
        # customer picks "use my current location" for a pickup address) raised
        # NameError instead of falling back.
        from accounts.customer_services import detect_customer_location
        env = {k: v for k, v in os.environ.items() if "GOOGLE_MAPS" not in k}
        with patch.dict(os.environ, env, clear=True), \
                patch("urllib.request.urlopen", side_effect=OSError("offline")):
            result = detect_customer_location(12.74, 77.82)
        self.assertTrue(result is None or isinstance(result, dict))


class HomeServicesTipParsingTests(SimpleTestCase):
    def test_module_resolves_invalid_operation(self):
        import service_requests.services.home_services_pricing as m
        self.assertTrue(hasattr(m, "InvalidOperation"))
