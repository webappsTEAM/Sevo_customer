from django.urls import path

from .views import LaneListView, ServiceAreaListView, ServiceTierListView

urlpatterns = [
    path("tiers/", ServiceTierListView.as_view(), name="logistics-tiers"),
    path("lanes/", LaneListView.as_view(), name="logistics-lanes"),
    path("areas/", ServiceAreaListView.as_view(), name="logistics-areas"),
]
