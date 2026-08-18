from django.urls import path, include
from rest_framework.routers import DefaultRouter
from inventory.views import (
    InventoryItemViewSet,
    InventoryAlertViewSet,
    InventoryTransferViewSet,
)

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-items')
router.register(r'alerts', InventoryAlertViewSet, basename='inventory-alerts')
router.register(r'transfers', InventoryTransferViewSet, basename='inventory-transfers')

urlpatterns = [
    path('', include(router.urls)),
]
