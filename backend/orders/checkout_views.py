"""
orders/checkout_views.py

Unified checkout controller. Supports Services, Daily Essentials, and Marketplace carts.
Runs each checkout controller independently with separate transaction boundaries.
"""
from rest_framework import status
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from service_requests.views import BookingCreateView

from .views import GroceryCheckoutView, _success, _error
from .marketplace_views import MarketplaceCheckoutView


class _PayloadOverrideRequest:
    """
    Proxies everything to the real request except `.data`, which returns
    an override payload. Lets an existing view's `.post(request)` be
    re-run with a different body in the same request/response cycle.
    """
    def __init__(self, original_request, payload):
        self._original = original_request
        self._payload = payload

    @property
    def data(self):
        return self._payload

    def __getattr__(self, name):
        return getattr(self._original, name)


def _run_subview(view_class, payload, original_request):
    view = view_class()
    view.request = original_request
    view.format_kwarg = None
    return view.post(_PayloadOverrideRequest(original_request, payload))


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/

    Body: {
      "cart_types": ["services"] | ["daily_essentials"] | ["marketplace"] | combination,
      "service": {...BookingCreateView payload...},
      "grocery": {"delivery_address": "..."},
      "marketplace": {"delivery_address": "...", "payment_method": "UPI", ...}
    }
    """
    permission_classes = [IsCustomer]

    VALID_TYPES = {"services", "daily_essentials", "marketplace"}

    def post(self, request):
        cart_types = request.data.get("cart_types")
        if not isinstance(cart_types, list) or not cart_types:
            return _error("cart_types is required and must be a non-empty list.", status.HTTP_400_BAD_REQUEST)

        unknown = set(cart_types) - self.VALID_TYPES
        if unknown:
            return _error(f"Unknown cart_types: {sorted(unknown)}.", status.HTTP_400_BAD_REQUEST)

        result = {
            "service_order": None,
            "grocery_order": None,
            "marketplace_order": None,
        }

        if "services" in cart_types:
            service_payload = request.data.get("service") or {}
            result["service_order"] = _run_subview(BookingCreateView, service_payload, request).data

        if "daily_essentials" in cart_types:
            grocery_payload = request.data.get("grocery") or {}
            result["grocery_order"] = _run_subview(GroceryCheckoutView, grocery_payload, request).data

        if "marketplace" in cart_types:
            marketplace_payload = request.data.get("marketplace") or {}
            result["marketplace_order"] = _run_subview(MarketplaceCheckoutView, marketplace_payload, request).data

        return _success(result)
