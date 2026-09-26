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
    VegetableDetailsUpdateView,
    VegetableCategoryListCreateView,
    VegetableCategoryDetailView,
    VegetableCategoryApprovalListView,
    VegetableCategoryApprovalActionView,
    VegetableApprovalListView,
    VegetableApprovalActionView,
    VegetableMyRequestsListView,
    VegetableSingleRequestView,
    VegetableCatalogTemplateView,
    VegetableCatalogPreviewView,
    VegetableCatalogCommitView,
    VegetableClaimListCreateView,
    VegetableClaimDetailView,
    VegetableClaimActionView,
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
    path('vegetable-stock/<int:product_id>/update-details/', VegetableDetailsUpdateView.as_view(), name='vegetable-stock-update-details'),
    
    # Vegetable Categories CRUD & Approval
    path('vegetable-categories/', VegetableCategoryListCreateView.as_view(), name='vegetable-category-list-create'),
    path('vegetable-categories/<int:pk>/', VegetableCategoryDetailView.as_view(), name='vegetable-category-detail'),
    path('vegetable-categories/approval-queue/', VegetableCategoryApprovalListView.as_view(), name='vegetable-category-approval-queue'),
    path('vegetable-categories/<int:pk>/review/', VegetableCategoryApprovalActionView.as_view(), name='vegetable-category-review'),

    # Vegetable Requests & Approval
    path('vegetables/approval-queue/', VegetableApprovalListView.as_view(), name='vegetable-approval-queue'),
    path('vegetables/<int:pk>/review/', VegetableApprovalActionView.as_view(), name='vegetable-review'),
    path('vegetables/my-requests/', VegetableMyRequestsListView.as_view(), name='vegetable-my-requests'),
    path('vegetables/single-request/', VegetableSingleRequestView.as_view(), name='vegetable-single-request'),

    # Vegetable Catalog Bulk Upload
    path('vegetables/catalog-template/', VegetableCatalogTemplateView.as_view(), name='vegetable-catalog-template'),
    path('vegetables/catalog-preview/', VegetableCatalogPreviewView.as_view(), name='vegetable-catalog-preview'),
    path('vegetables/catalog-commit/', VegetableCatalogCommitView.as_view(), name='vegetable-catalog-commit'),

    # Vegetable Claims & Stock Write-offs
    path('vegetables/claims/', VegetableClaimListCreateView.as_view(), name='vegetable-claim-list-create'),
    path('vegetables/claims/<int:pk>/', VegetableClaimDetailView.as_view(), name='vegetable-claim-detail'),
    path('vegetables/claims/<int:pk>/action/', VegetableClaimActionView.as_view(), name='vegetable-claim-action'),

    path('', include(router.urls)),
]



