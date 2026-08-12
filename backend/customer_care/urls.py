from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.ticket_views import CustomerCareTicketViewSet, CareAgentProfileViewSet, CareAnalyticsView

router = DefaultRouter()
router.register(r"tickets", CustomerCareTicketViewSet, basename="care-ticket")
router.register(r"agents", CareAgentProfileViewSet, basename="care-agent")

urlpatterns = [
    path("", include(router.urls)),
    path("analytics/", CareAnalyticsView.as_view(), name="care-analytics"),
]
