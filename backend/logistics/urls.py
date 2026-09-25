from django.urls import path

from .admin_views import (
    AdminGoodsCategoryDetailView,
    AdminGoodsCategoryListView,
    AdminGoodsItemDetailView,
    AdminGoodsItemListView,
    AdminPackersMoversConfigView,
    AdminServiceTierDetailView,
    AdminServiceTierHistoryView,
    AdminServiceTierListView,
)
from .views import (
    CargoFitmentEvaluationView,
    GoodsCategoryListView,
    GoodsItemListView,
    LaneListView,
    LogisticsQuoteView,
    LogisticsSlotAvailabilityView,
    PackersMoversInventoryView,
    PackersMoversQuoteView,
    ServiceAreaListView,
    ServiceTierListView,
)

urlpatterns = [
    path("tiers/", ServiceTierListView.as_view(), name="logistics-tiers"),
    path("lanes/", LaneListView.as_view(), name="logistics-lanes"),
    path("areas/", ServiceAreaListView.as_view(), name="logistics-areas"),
    path("quote/", LogisticsQuoteView.as_view(), name="logistics-quote"),
    path("slots/", LogisticsSlotAvailabilityView.as_view(), name="logistics-slots"),
    path("goods-categories/", GoodsCategoryListView.as_view(), name="logistics-goods-categories"),
    path("goods-items/", GoodsItemListView.as_view(), name="logistics-goods-items"),
    path("evaluate-cargo/", CargoFitmentEvaluationView.as_view(), name="logistics-evaluate-cargo"),
    path("packers-movers/inventory/", PackersMoversInventoryView.as_view(), name="packers-movers-inventory"),
    path("packers-movers/quote/", PackersMoversQuoteView.as_view(), name="packers-movers-quote"),

    # Administrator rate-card, catalog & P&M configuration management.
    path("admin/tiers/", AdminServiceTierListView.as_view(), name="logistics-admin-tiers"),
    path("admin/tiers/<int:pk>/", AdminServiceTierDetailView.as_view(), name="logistics-admin-tier-detail"),
    path("admin/tiers/<int:pk>/history/", AdminServiceTierHistoryView.as_view(), name="logistics-admin-tier-history"),
    path("admin/categories/", AdminGoodsCategoryListView.as_view(), name="logistics-admin-categories"),
    path("admin/categories/<int:pk>/", AdminGoodsCategoryDetailView.as_view(), name="logistics-admin-category-detail"),
    path("admin/items/", AdminGoodsItemListView.as_view(), name="logistics-admin-items"),
    path("admin/items/<int:pk>/", AdminGoodsItemDetailView.as_view(), name="logistics-admin-item-detail"),
    path("admin/packers-movers-config/", AdminPackersMoversConfigView.as_view(), name="logistics-admin-pm-config"),
]

