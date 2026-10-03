"""GT_CONFIG_GUARD: a non-DEBUG process without WORKFORCE_API_BASE_URL must fail, never fall back to the production vendor."""
import os, subprocess, sys
from pathlib import Path
from django.test import SimpleTestCase

BACKEND = Path(__file__).resolve().parents[2]
CODE = "import os;os.environ.setdefault('DJANGO_SETTINGS_MODULE','quicktims.settings');from django.conf import settings;print('URL='+settings.WORKFORCE_API_BASE_URL)"


class WorkforceUrlGuardTests(SimpleTestCase):
    def _run(self, **env):
        e = {k: v for k, v in os.environ.items() if k not in ("WORKFORCE_API_BASE_URL", "ALLOW_DEFAULT_WORKFORCE_URL", "DJANGO_SETTINGS_MODULE", "DJANGO_DEBUG")}
        e.update(DJANGO_SECRET_KEY="k" * 64, **env)
        return subprocess.run([sys.executable, "-c", CODE], cwd=BACKEND, env=e, capture_output=True, text=True, timeout=120)

    def test_missing_url_without_debug_fails_closed(self):
        r = self._run(DJANGO_DEBUG="0")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("WORKFORCE_API_BASE_URL must be set", r.stderr)
        self.assertNotIn("vendor.sevo.co.in", r.stdout)

    def test_explicit_url_is_used(self):
        r = self._run(DJANGO_DEBUG="0", WORKFORCE_API_BASE_URL="http://stage/api/workforce/")
        self.assertIn("URL=http://stage/api/workforce", r.stdout)

    def test_debug_defaults_to_local_vendor(self):
        r = self._run(DJANGO_DEBUG="1")
        self.assertIn("URL=http://localhost:8001/api/workforce", r.stdout)

    def test_payment_sandbox_cannot_be_enabled_without_debug(self):
        r = self._run(DJANGO_DEBUG="0", WORKFORCE_API_BASE_URL="http://stage/api/workforce", PAYMENT_SANDBOX_MODE="1")
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("PAYMENT_SANDBOX_MODE must not be enabled", r.stderr)

    def test_payment_sandbox_allowed_in_debug(self):
        r = self._run(DJANGO_DEBUG="1", PAYMENT_SANDBOX_MODE="1")
        self.assertEqual(r.returncode, 0, r.stderr[-300:])
