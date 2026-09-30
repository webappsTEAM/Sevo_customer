from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.utils import timezone
from django.views.static import serve

from accounts.views import CustomerLocationDetectView


def health_check(request):
    """
    Generic liveness/readiness probe for this app.

    Bug found (gap): this app had no health-check endpoint at all -- a
    load balancer or uptime monitor had no way to distinguish "Django is
    up and can reach the database" from "the process is down/hung"
    short of hitting a real, auth-gated business endpoint. Mirrors the
    Vendor app's equivalent (workforce_core/urls.py's health_check()).
    """
    db_ok = True
    db_error = ""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception as exc:
        db_ok = False
        db_error = str(exc)

    payload = {
        "status": "ok" if db_ok else "error",
        "database": db_ok,
        "time": timezone.now().isoformat(),
    }
    if db_error:
        payload["database_error"] = db_error
    return JsonResponse(payload, status=200 if db_ok else 503)


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("api/health/", health_check, name="api-health-check"),
    path("api/customer/location/detect/", CustomerLocationDetectView.as_view(), name="api-customer-location-detect"),
    path("api/auth/", include("accounts.urls")),
    path("api/company/", include("companies.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/settings/", include("settings_hub.urls")),
    path("api/trial/", include("trial_management.urls")),
    path("api/logistics/", include("logistics.urls")),
    path("api/carts/", include("carts.urls")),
    path("api/orders/", include("orders.urls")),
    path("api/vegetable-orders/", include("vegetable_orders.urls")),
    path("api/customer-care/", include("customer_care.urls")),
    path("api/workforce-integration/", include("workforce_integration.urls")),
    path("api/marketplace/", include("workforce_integration.marketplace_urls")),
    path("api/customers/", include("customer_analytics.urls")),
    path("api/platform/", include("platform_control.urls")),
    path("api/ai/", include("ai_assistant.urls")),
    path("api/", include("service_requests.urls")),
    re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": str(settings.BASE_DIR / "ASSET IMAGES")}),
]

def serve_media_with_remote_fallback(request, path, document_root=None):
    """
    In development, if an uploaded media file is referenced in the remote DB
    but is not yet present in the local media directory, automatically fetch
    and cache it from upstream production (https://sevo.co.in/media/) so that
    catalog cards and banners render seamlessly without 404s.
    """
    from pathlib import Path
    import urllib.request
    import logging

    logger = logging.getLogger(__name__)
    doc_root = Path(document_root or settings.MEDIA_ROOT)
    full_path = doc_root / path

    if not full_path.is_file():
        remote_url = f"https://sevo.co.in/media/{path.replace('\\', '/')}"
        try:
            req = urllib.request.Request(remote_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    data = resp.read()
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(full_path, "wb") as f:
                        f.write(data)
                    logger.info("Successfully fetched upstream media: %s", path)
        except Exception as exc:
            logger.debug("Failed upstream media fallback for %s: %s", path, exc)

    return serve(request, path, document_root=document_root)


if settings.DEBUG:
    urlpatterns += [
        re_path(r"^media/(?P<path>.*)$", serve_media_with_remote_fallback, {"document_root": settings.MEDIA_ROOT}),
    ]
