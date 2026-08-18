from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from accounts.views import CustomerLocationDetectView

urlpatterns = [
    path("api/customer/location/detect/", CustomerLocationDetectView.as_view(), name="api-customer-location-detect"),
    path("api/auth/", include("accounts.urls")),
    path("api/company/", include("companies.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/settings/", include("settings_hub.urls")),
    path("api/trial/", include("trial_management.urls")),
    path("api/logistics/", include("logistics.urls")),
    path("api/customer-care/", include("customer_care.urls")),
    path("api/workforce-integration/", include("workforce_integration.urls")),
    path("api/customers/", include("customer_analytics.urls")),
    path("api/", include("service_requests.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
