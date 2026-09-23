"""
workforce_integration/marketplace_urls.py
"""
from django.urls import path
from .marketplace_views import (
    MarketplaceProductListView,
    MarketplaceProductDetailView,
    MarketplaceCategoryListView,
    MarketplaceCartValidateView,
)

urlpatterns = [
    path("products/", MarketplaceProductListView.as_view(), name="customer-marketplace-products"),
    path("products/<int:pk>/", MarketplaceProductDetailView.as_view(), name="customer-marketplace-product-detail"),
    path("categories/", MarketplaceCategoryListView.as_view(), name="customer-marketplace-categories"),
    path("cart/validate/", MarketplaceCartValidateView.as_view(), name="customer-marketplace-cart-validate"),
]
