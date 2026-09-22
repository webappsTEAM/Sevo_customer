from django.urls import path
from .views import (
    WorkforceWebhookView, WorkforceSlotsView, WorkforceBookingFromQuoteView,
    WorkforceCatalogListView, WorkforceCapabilityRequestListCreateView,
)

urlpatterns = [
    path("webhook/", WorkforceWebhookView.as_view(), name="workforce-webhook"),
    path("slots/", WorkforceSlotsView.as_view(), name="workforce-slots"),
    path("bookings/from-quote/", WorkforceBookingFromQuoteView.as_view(), name="workforce-booking-from-quote"),
    # Vendor skill-approval flow (see VendorCapabilityRequest in service_requests/models.py):
    # the Workforce app browses the catalog here, submits capability
    # requests here, and reads their approval status back from the same
    # endpoint. Admin-side approve/reject lives under settings_hub instead
    # (IsAdminRole-gated), not here.
    path("catalog/", WorkforceCatalogListView.as_view(), name="workforce-catalog"),
    path("vendor-capabilities/", WorkforceCapabilityRequestListCreateView.as_view(), name="workforce-vendor-capabilities"),
]
