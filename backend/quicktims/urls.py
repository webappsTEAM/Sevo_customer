from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from accounts.views import CustomerLocationDetectView

urlpatterns = [
    path("api/customer/location/detect/", CustomerLocationDetectView.as_view(), name="api-customer-location-detect"),
    path("api/auth/", include("accounts.urls")),
    path("api/company/", include("companies.urls")),
    path("api/employees/", include("employees.urls")),
    path("api/time/", include("time_tracking.urls")),
    path("api/leaves/", include("leaves.urls")),
    path("api/payroll/", include("payroll.urls")),
    path("api/scheduling/", include("scheduling.urls")),
    path("api/reports/", include("reports.urls")),
    path("api/tasks/", include("tasks.urls")),
    path("api/live-locations/", include("live_locations.urls")),
    path("api/compliance/", include("compliance.urls")),
    path("api/inventory/", include("inventory.urls")),
    path("api/settings/", include("settings_hub.urls")),
    path("api/mileage/", include("mileage.urls")),
    path("api/trial/", include("trial_management.urls")),
    path("api/", include("service_requests.urls")),
    path("api/logistics/", include("logistics.urls")),
    path("api/customer-care/", include("customer_care.urls")),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
