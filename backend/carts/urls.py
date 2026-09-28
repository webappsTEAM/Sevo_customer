from django.urls import path

from .views import CartDetailView, CartItemListView, CartItemDetailView, CartClearView

urlpatterns = [
    path("<str:cart_type>/", CartDetailView.as_view(), name="cart-detail"),
    path("<str:cart_type>/clear/", CartClearView.as_view(), name="cart-clear"),
    path("<str:cart_type>/items/", CartItemListView.as_view(), name="cart-item-list"),
    path("<str:cart_type>/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
]
