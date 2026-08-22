from django.urls import path
from .views import WorkforceWebhookView, WorkforceSlotsView, WorkforceBookingFromQuoteView

urlpatterns = [
    path("webhook/", WorkforceWebhookView.as_view(), name="workforce-webhook"),
    path("slots/", WorkforceSlotsView.as_view(), name="workforce-slots"),
    path("bookings/from-quote/", WorkforceBookingFromQuoteView.as_view(), name="workforce-booking-from-quote"),
]
