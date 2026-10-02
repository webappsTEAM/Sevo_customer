"""
settings_hub/views_pricing.py

Admin-configurable pricing (platform fee, GST, delivery fee, handling
fee, etc.) for the customer mobile app. Added 2026-10-01 per explicit
request ("The Tax fixing Platform fee and free delivery cost should be
fix by the admin not the hard coded... please be give access to
customer admin to fix those inside setting module that should be
change dynamically") — these values used to be hardcoded directly in
the Flutter app with no way to change them without a new app build.

GET is public (AllowAny) so the mobile app can read the live values
without requiring a logged-in session — same pattern as
PublicLegalConfigAPIView and HomePageConfigAPIView.GET. PUT requires
the `pricing:edit` Global RBAC action (admin, manager and finance
roles all have it by default — see accounts/permissions.py).
"""
from decimal import Decimal, InvalidOperation

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, RequireModuleAccess
from .models import PricingConfig

# Field name -> (max_digits, decimal_places) is enforced by the model;
# this is just the ordered list of fields this endpoint reads/writes.
EDITABLE_FIELDS = [
    "platform_fee",
    "gst_percent",
    "min_advance_percent",
    "min_advance_amount",
    "delivery_fee",
    "free_delivery_threshold",
    "handling_fee",
    "small_cart_fee",
    "small_cart_threshold",
]


def _serialize(cfg: PricingConfig) -> dict:
    return {field: str(getattr(cfg, field)) for field in EDITABLE_FIELDS}


class PricingConfigAPIView(APIView):
    """
    GET /api/settings/pricing/  — public, read-only, used by the mobile app.
    PUT /api/settings/pricing/  — admin/manager/finance only.
    """

    def get_permissions(self):
        if self.request.method == "PUT":
            return [IsAdminRole(), RequireModuleAccess("pricing", "edit")]
        return [permissions.AllowAny()]

    def get(self, request):
        cfg, _ = PricingConfig.objects.get_or_create(key="default")
        return Response({"success": True, "data": _serialize(cfg)})

    def put(self, request):
        cfg, _ = PricingConfig.objects.get_or_create(key="default")
        payload = request.data or {}

        errors = {}
        updates = {}
        for field in EDITABLE_FIELDS:
            if field not in payload:
                continue
            raw = payload[field]
            try:
                value = Decimal(str(raw))
            except (InvalidOperation, TypeError, ValueError):
                errors[field] = "Must be a valid number."
                continue
            if value < 0:
                errors[field] = "Must not be negative."
                continue
            updates[field] = value

        if errors:
            return Response(
                {"success": False, "message": "Validation error.", "errors": errors},
                status=400,
            )

        for field, value in updates.items():
            setattr(cfg, field, value)
        cfg.updated_by = request.user if request.user and request.user.is_authenticated else None
        cfg.save()

        return Response({"success": True, "data": _serialize(cfg)})
