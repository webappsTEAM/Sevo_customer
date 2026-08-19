import os
import sys
import django

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import ServiceRequest
from service_requests.views import _build_tracking_payload

count = 0
for sr in ServiceRequest.objects.all():
    _build_tracking_payload(sr, has_full_access=True)
    count += 1

print(f"Successfully reconciled {count} ServiceRequests with live workforce employee & telemetry tables.")
