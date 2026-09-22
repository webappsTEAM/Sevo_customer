from django.urls import path

from .views import GroceryCheckoutView, MyOrdersView
from .checkout_views import CheckoutView
from .marketplace_views import (
    MarketplaceCheckoutView,
    MarketplaceOrderDetailView,
    MarketplaceOrderCancelView,
)

urlpatterns = [
    path("grocery/checkout/", GroceryCheckoutView.as_view(), name="grocery-checkout"),
    path("marketplace/checkout/", MarketplaceCheckoutView.as_view(), name="marketplace-checkout"),
    path("marketplace/<str:order_number>/cancel/", MarketplaceOrderCancelView.as_view(), name="marketplace-order-cancel"),
    path("marketplace/<str:order_number>/", MarketplaceOrderDetailView.as_view(), name="marketplace-order-detail"),
    path("my/", MyOrdersView.as_view(), name="my-orders"),
    path("checkout/", CheckoutView.as_view(), name="unified-checkout"),
]
