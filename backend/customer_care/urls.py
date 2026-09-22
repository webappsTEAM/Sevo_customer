from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.ticket_views import (
    CustomerCareTicketViewSet,
    CareAgentProfileViewSet,
    CareAnalyticsView,
    CustomerSearchView,
    Customer360View,
    CustomerCommunicationHistoryView,
    MessageTemplateViewSet,
    CustomerSupportTicketView,
)

router = DefaultRouter()
router.register(r"tickets", CustomerCareTicketViewSet, basename="care-ticket")
router.register(r"agents", CareAgentProfileViewSet, basename="care-agent")
router.register(r"templates", MessageTemplateViewSet, basename="message-template")

urlpatterns = [
    path("", include(router.urls)),
    path("my-ticket/", CustomerSupportTicketView.as_view(), name="customer-support-ticket"),
    path("analytics/", CareAnalyticsView.as_view(), name="care-analytics"),
    path("customers/search/", CustomerSearchView.as_view(), name="customer-search"),
    path("customers/<int:pk>/360/", Customer360View.as_view(), name="customer-360"),
    path("customers/<int:pk>/communication-history/", CustomerCommunicationHistoryView.as_view(), name="customer-comm-history"),
]


