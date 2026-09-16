from django.urls import path

from .views import GroceryCheckoutView, MyOrdersView
from .checkout_views import CheckoutView

urlpatterns = [
    path("grocery/checkout/", GroceryCheckoutView.as_view(), name="grocery-checkout"),
    path("my/", MyOrdersView.as_view(), name="my-orders"),
    path("checkout/", CheckoutView.as_view(), name="unified-checkout"),
]
