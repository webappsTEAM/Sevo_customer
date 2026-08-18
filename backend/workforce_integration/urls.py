from django.urls import path
from .views import WorkforceWebhookView, WorkforceSlotsView

urlpatterns = [
    path("webhook/", WorkforceWebhookView.as_view(), name="workforce-webhook"),
    path("slots/", WorkforceSlotsView.as_view(), name="workforce-slots"),
]
