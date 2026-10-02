from django.urls import path
from .views import (
    AdminVegetableOrderListView,
    AdminVegetableOrderDetailView,
    AdminVegetableOrderTransitionView,
    VegetableAdminDashboardStatsView,
    CustomerVegetableReturnCreateView,
    AdminVegetableReturnListView,
    AdminVegetableReturnDetailView,
    AdminVegetableReturnActionView,
    CustomerVegetableSlotsView,
    AdminVegetableSlotConfigView,
    CustomerVegetablePricingConfigView,
    AdminVegetablePricingConfigView,
)

urlpatterns = [
    path('slots/', CustomerVegetableSlotsView.as_view(), name='vegetable-orders-slots'),
    path('pricing-config/', CustomerVegetablePricingConfigView.as_view(), name='vegetable-orders-pricing-config'),
    path('admin/slots/', AdminVegetableSlotConfigView.as_view(), name='vegetable-orders-admin-slots'),
    path('admin/pricing-config/', AdminVegetablePricingConfigView.as_view(), name='vegetable-orders-admin-pricing-config'),
    path('admin/', AdminVegetableOrderListView.as_view(), name='vegetable-orders-admin-list'),
    path('admin/<int:pk>/', AdminVegetableOrderDetailView.as_view(), name='vegetable-orders-admin-detail'),
    path('admin/<int:pk>/transition/', AdminVegetableOrderTransitionView.as_view(), name='vegetable-orders-admin-transition'),
    path('admin/dashboard/', VegetableAdminDashboardStatsView.as_view(), name='vegetable-orders-admin-dashboard'),
    path('customer/returns/', CustomerVegetableReturnCreateView.as_view(), name='vegetable-orders-customer-return-create'),
    path('admin/returns/', AdminVegetableReturnListView.as_view(), name='vegetable-orders-admin-return-list'),
    path('admin/returns/<int:pk>/', AdminVegetableReturnDetailView.as_view(), name='vegetable-orders-admin-return-detail'),
    path('admin/returns/<int:pk>/action/', AdminVegetableReturnActionView.as_view(), name='vegetable-orders-admin-return-action'),
]

