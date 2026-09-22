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
    path("api/customer-care/", include("customer_care.urls")),
    path("api/workforce-integration/", include("workforce_integration.urls")),
    path("api/customers/", include("customer_analytics.urls")),
    path("api/platform/", include("platform_control.urls")),
    path("api/", include("service_requests.urls")),
    re_path(r"^assets/(?P<path>.*)$", serve, {"document_root": str(settings.BASE_DIR / "ASSET IMAGES")}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
