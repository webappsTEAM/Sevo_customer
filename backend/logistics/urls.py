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
    AdminLogisticsSlotListView,
    AdminLogisticsSlotDetailView,
    AdminLaneListView,
    AdminLaneDetailView,
    AdminGTFaqListView,
    AdminGTFaqDetailView,
    AdminPMAddOnListView,
    AdminPMAddOnDetailView,
)
from .public_policy_views import PublicGTPolicyView, InsuranceTermsView
from .admin_policy_views import (
    AdminGTPolicyDetailView,
    AdminGTPolicyListView,
    AdminGTPolicyOverviewView,
)
from .views import (
    CargoFitmentEvaluationView,
    GoodsCategoryListView,
    GoodsItemListView,
    GTFaqListView,
    LaneListView,
    LogisticsQuoteView,
    PTLConfigView,
    PTLQuoteView,
    LogisticsSlotAvailabilityView,
    PackersMoversInventoryView, PackersMoversAddOnsView,
    PackersMoversQuoteView,
    ServiceAreaListView,
    ServiceTierListView,
)

from .admin_list_views import AdminListDetailView, AdminListView

urlpatterns = [
    path("tiers/", ServiceTierListView.as_view(), name="logistics-tiers"),
    path("lanes/", LaneListView.as_view(), name="logistics-lanes"),
    path("areas/", ServiceAreaListView.as_view(), name="logistics-areas"),
    path("quote/", LogisticsQuoteView.as_view(), name="logistics-quote"),
    path("ptl/config/", PTLConfigView.as_view(), name="logistics-ptl-config"),
    path("ptl/quote/", PTLQuoteView.as_view(), name="logistics-ptl-quote"),
    path("slots/", LogisticsSlotAvailabilityView.as_view(), name="logistics-slots"),
    path("goods-categories/", GoodsCategoryListView.as_view(), name="logistics-goods-categories"),
    path("goods-items/", GoodsItemListView.as_view(), name="logistics-goods-items"),
    path("evaluate-cargo/", CargoFitmentEvaluationView.as_view(), name="logistics-evaluate-cargo"),
    path("packers-movers/inventory/", PackersMoversInventoryView.as_view(), name="packers-movers-inventory"),
    path("packers-movers/addons/", PackersMoversAddOnsView.as_view(), name="packers-movers-addons"),
    path("packers-movers/quote/", PackersMoversQuoteView.as_view(), name="packers-movers-quote"),
    path("faqs/", GTFaqListView.as_view(), name="logistics-faqs"),

    # Administrator rate-card, catalog, P&M, slot, lane & FAQ management.
    path("admin/tiers/", AdminServiceTierListView.as_view(), name="logistics-admin-tiers"),
    path("admin/tiers/<int:pk>/", AdminServiceTierDetailView.as_view(), name="logistics-admin-tier-detail"),
    path("admin/tiers/<int:pk>/history/", AdminServiceTierHistoryView.as_view(), name="logistics-admin-tier-history"),
    path("admin/categories/", AdminGoodsCategoryListView.as_view(), name="logistics-admin-categories"),
    path("admin/categories/<int:pk>/", AdminGoodsCategoryDetailView.as_view(), name="logistics-admin-category-detail"),
    path("admin/items/", AdminGoodsItemListView.as_view(), name="logistics-admin-items"),
    path("admin/items/<int:pk>/", AdminGoodsItemDetailView.as_view(), name="logistics-admin-item-detail"),
    path("admin/packers-movers-config/", AdminPackersMoversConfigView.as_view(), name="logistics-admin-pm-config"),
    path("admin/slots/", AdminLogisticsSlotListView.as_view(), name="logistics-admin-slots"),
    path("admin/slots/<int:pk>/", AdminLogisticsSlotDetailView.as_view(), name="logistics-admin-slot-detail"),
    path("admin/lanes/", AdminLaneListView.as_view(), name="logistics-admin-lanes"),
    path("admin/lanes/<int:pk>/", AdminLaneDetailView.as_view(), name="logistics-admin-lane-detail"),
    path("policies/", PublicGTPolicyView.as_view(), name="logistics-public-policies"),
    path("insurance-terms/", InsuranceTermsView.as_view(), name="logistics-insurance-terms"),
    path("admin/policies/", AdminGTPolicyOverviewView.as_view(), name="logistics-admin-policies"),
    path("admin/policies/<str:kind>/", AdminGTPolicyListView.as_view(), name="logistics-admin-policy-list"),
    path("admin/policies/<str:kind>/<int:pk>/", AdminGTPolicyDetailView.as_view(), name="logistics-admin-policy-detail"),
    path("admin/faqs/", AdminGTFaqListView.as_view(), name="logistics-admin-faqs"),
    path("admin/faqs/<int:pk>/", AdminGTFaqDetailView.as_view(), name="logistics-admin-faq-detail"),
    path("admin/pm-addons/", AdminPMAddOnListView.as_view(), name="logistics-admin-pm-addons"),
    path("admin/pm-addons/<int:pk>/", AdminPMAddOnDetailView.as_view(), name="logistics-admin-pm-addon-detail"),
    path("admin/lists/<str:resource>/", AdminListView.as_view(), name="logistics-admin-list"),
    path("admin/lists/<str:resource>/<int:pk>/", AdminListDetailView.as_view(), name="logistics-admin-list-detail"),
]

