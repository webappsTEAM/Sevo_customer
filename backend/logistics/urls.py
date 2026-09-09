from django.urls import path

from .admin_views import (
    AdminServiceTierDetailView,
    AdminServiceTierHistoryView,
    AdminServiceTierListView,
)
from .views import LaneListView, LogisticsQuoteView, PackersMoversQuoteView, ServiceAreaListView, ServiceTierListView

urlpatterns = [
    path("tiers/", ServiceTierListView.as_view(), name="logistics-tiers"),
    path("lanes/", LaneListView.as_view(), name="logistics-lanes"),
    path("areas/", ServiceAreaListView.as_view(), name="logistics-areas"),
    path("quote/", LogisticsQuoteView.as_view(), name="logistics-quote"),
    path("packers-movers/quote/", PackersMoversQuoteView.as_view(), name="packers-movers-quote"),

    # Administrator rate-card management. Separate from the public catalog
    # above: the per-km rate card is not customer-facing, and these require
    # the `pricing` RBAC module rather than being open like the tier list.
    path("admin/tiers/", AdminServiceTierListView.as_view(), name="logistics-admin-tiers"),
    path("admin/tiers/<int:pk>/", AdminServiceTierDetailView.as_view(), name="logistics-admin-tier-detail"),
    path("admin/tiers/<int:pk>/history/", AdminServiceTierHistoryView.as_view(), name="logistics-admin-tier-history"),
]
