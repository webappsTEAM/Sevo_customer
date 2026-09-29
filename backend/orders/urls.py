from django.urls import path

from .views import GroceryCheckoutView, MyOrdersView
from .checkout_views import CheckoutView
from .marketplace_views import (
    MarketplaceCheckoutView,
    MarketplaceInitiatePaymentView,
    MarketplaceVerifyPaymentView,
    MarketplaceRazorpayWebhookView,
    MarketplaceDeliverySlotsView,
    MarketplaceOrderDetailView,
    MarketplaceOrderCancelView,
)

urlpatterns = [
    path("grocery/checkout/", GroceryCheckoutView.as_view(), name="grocery-checkout"),
    path("marketplace/checkout/initiate-payment/", MarketplaceInitiatePaymentView.as_view(), name="marketplace-checkout-initiate-payment"),
    path("marketplace/checkout/verify-payment/", MarketplaceVerifyPaymentView.as_view(), name="marketplace-checkout-verify-payment"),
    path("marketplace/razorpay-webhook/", MarketplaceRazorpayWebhookView.as_view(), name="marketplace-razorpay-webhook"),
    path("marketplace/delivery-slots/", MarketplaceDeliverySlotsView.as_view(), name="marketplace-delivery-slots"),
    path("marketplace/checkout/", MarketplaceCheckoutView.as_view(), name="marketplace-checkout"),
    path("marketplace/<str:order_number>/cancel/", MarketplaceOrderCancelView.as_view(), name="marketplace-order-cancel"),
    path("marketplace/<str:order_number>/", MarketplaceOrderDetailView.as_view(), name="marketplace-order-detail"),
    path("my/", MyOrdersView.as_view(), name="my-orders"),
    path("checkout/", CheckoutView.as_view(), name="unified-checkout"),
]
