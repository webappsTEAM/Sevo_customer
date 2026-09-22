"""
orders/checkout_views.py

Phase 4 (DAILY_ESSENTIALS_IMPLEMENTATION_PLAN.md): the explicit unified
checkout controller. Thin orchestration only -- runs Services checkout
(BookingCreateView, untouched) and/or Grocery checkout (Phase 3's
GroceryCheckoutView, untouched) as fully independent calls, each managing
its own transaction boundary internally, never a shared one. A failure in
one must never roll back or block the other.

The backend never infers "both" just because both carts happen to be
non-empty -- the frontend must send an explicit `cart_types` list, only
ever `["services", "daily_essentials"]` after the customer has explicitly
confirmed checking out both.

Re-runs each existing view's own `.post()` unchanged, against the same
real authenticated request (so `request.user`, headers, etc. are all
genuine) but with a different body -- a plain attribute-proxy, rather than
fabricating a second WSGI request via APIRequestFactory. This is what
keeps BookingCreateView and GroceryCheckoutView byte-for-byte unchanged
per the plan's "effectively unchanged" requirement, without the fragility
of a synthetic request cycle.
"""
from rest_framework import status
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from service_requests.views import BookingCreateView

from .views import GroceryCheckoutView, _success, _error


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
    """
    Response.data is already populated by the view's own `.post()` -- no
    need to render it, since the result is embedded into another Response
    (and rendering here would fail anyway: `.render()` needs
    accepted_renderer/accepted_media_type, which are only set by
    `dispatch()`'s finalize_response(), which this bypasses on purpose).
    """
    view = view_class()
    view.request = original_request
    view.format_kwarg = None
    return view.post(_PayloadOverrideRequest(original_request, payload))


class CheckoutView(APIView):
    """
    POST /api/orders/checkout/

    Body: {
      "cart_types": ["services"] | ["daily_essentials"] | ["services", "daily_essentials"],
      "service": {...same payload BookingCreateView accepts...},  # required if "services" requested
      "grocery": {"delivery_address": "..."},                     # required if "daily_essentials" requested
    }

    Response: { "service_order": <BookingCreateView envelope> | null,
                "grocery_order": <GroceryCheckoutView envelope> | null }
    Each nested envelope carries its own success/data/message/errors, so the
    frontend can show partial success/failure clearly.
    """
    permission_classes = [IsCustomer]

    VALID_TYPES = {"services", "daily_essentials"}

    def post(self, request):
        cart_types = request.data.get("cart_types")
        if not isinstance(cart_types, list) or not cart_types:
            return _error("cart_types is required and must be a non-empty list.", status.HTTP_400_BAD_REQUEST)

        unknown = set(cart_types) - self.VALID_TYPES
        if unknown:
            return _error(f"Unknown cart_types: {sorted(unknown)}.", status.HTTP_400_BAD_REQUEST)

        result = {"service_order": None, "grocery_order": None}

        if "services" in cart_types:
            service_payload = request.data.get("service") or {}
            result["service_order"] = _run_subview(BookingCreateView, service_payload, request).data

        if "daily_essentials" in cart_types:
            grocery_payload = request.data.get("grocery") or {}
            result["grocery_order"] = _run_subview(GroceryCheckoutView, grocery_payload, request).data

        return _success(result)
