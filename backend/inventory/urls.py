from django.urls import path, include
from rest_framework.routers import DefaultRouter
from inventory.views import (
    InventoryItemViewSet,
    InventoryAlertViewSet,
    InventoryTransferViewSet,
    VegetableStockListView,
    VegetableStockRestockView,
    VegetableStockAdjustView,
    VegetableStockSetDefaultView,
    VegetableStockHistoryView,
)

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-items')
router.register(r'alerts', InventoryAlertViewSet, basename='inventory-alerts')
router.register(r'transfers', InventoryTransferViewSet, basename='inventory-transfers')

urlpatterns = [
    path('vegetable-stock/', VegetableStockListView.as_view(), name='vegetable-stock-list'),
    path('vegetable-stock/<int:product_id>/restock/', VegetableStockRestockView.as_view(), name='vegetable-stock-restock'),
    path('vegetable-stock/<int:product_id>/adjust/', VegetableStockAdjustView.as_view(), name='vegetable-stock-adjust'),
    path('vegetable-stock/<int:product_id>/set-default/', VegetableStockSetDefaultView.as_view(), name='vegetable-stock-set-default'),
    path('vegetable-stock/<int:product_id>/history/', VegetableStockHistoryView.as_view(), name='vegetable-stock-history'),
    path('', include(router.urls)),
]

