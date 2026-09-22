from django.urls import path

from .views import GroceryCheckoutView, MyOrdersView, AdminOrderDetailView, CustomerOrderDetailView
from .checkout_views import CheckoutView

urlpatterns = [
    path("admin/<int:pk>/", AdminOrderDetailView.as_view(), name="order-admin-detail"),
    path("<int:pk>/", CustomerOrderDetailView.as_view(), name="order-customer-detail"),
    path("grocery/checkout/", GroceryCheckoutView.as_view(), name="grocery-checkout"),
    path("my/", MyOrdersView.as_view(), name="my-orders"),
    path("checkout/", CheckoutView.as_view(), name="unified-checkout"),
]
