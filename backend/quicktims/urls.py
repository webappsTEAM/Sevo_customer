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


def serve_media_resilient(request, path):
    """
    Resilient media file handler for /media/<path>:
    1. Checks MEDIA_ROOT / path
    2. Checks ASSET IMAGES / path or ASSET IMAGES / filename (matching .png, .jpg, .webp, .svg)
    3. Serves clean asset placeholder or hero fallback without 404 errors.
    """
    from pathlib import Path
    clean_path = path.lstrip("/").replace("\\", "/")

    media_root = Path(settings.MEDIA_ROOT)
    local_target = media_root / clean_path
    if local_target.is_file():
        return serve(request, clean_path, document_root=str(media_root))

    asset_root = Path(settings.BASE_DIR / "ASSET IMAGES")
    asset_target = asset_root / clean_path
    if asset_target.is_file():
        return serve(request, clean_path, document_root=str(asset_root))

    filename = Path(clean_path).name
    stem = Path(clean_path).stem
    for candidate in [
        asset_root / filename,
        asset_root / f"{stem}.png",
        asset_root / f"{stem}.jpg",
        asset_root / f"{stem}.webp",
        asset_root / f"{stem}.svg",
    ]:
        if candidate.is_file():
            return serve(request, candidate.name, document_root=str(asset_root))

    for fallback_file in ["generic_image_placeholder.svg", "hero_illustration.jpg"]:
        fallback_target = asset_root / fallback_file
        if fallback_target.is_file():
            return serve(request, fallback_file, document_root=str(asset_root))

    from django.http import HttpResponse
    return HttpResponse(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f1f5f9"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="14">SEVO Image</text></svg>',
        content_type="image/svg+xml"
    )


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
    re_path(r"^media/(?P<path>.*)$", serve_media_resilient),
]
