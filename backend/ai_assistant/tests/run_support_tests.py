import os
import sys

# Set up paths
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, backend_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")

test_db_path = os.path.join(backend_dir, "test_db.sqlite3")

# Configure SQLite before django.setup()
from django.conf import settings
settings.DATABASES["default"] = {
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": test_db_path,
}

import django
django.setup()

from django.core.management import call_command
# Migrate if database file does not exist yet
if not os.path.exists(test_db_path):
    print("Migrating test sqlite database...")
    call_command("migrate", interactive=False, verbosity=1)

import unittest
from ai_assistant.tests.test_support_intake_flow import SupportIntakeFlowTests

if __name__ == "__main__":
    suite = unittest.TestLoader().loadTestsFromTestCase(SupportIntakeFlowTests)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)
