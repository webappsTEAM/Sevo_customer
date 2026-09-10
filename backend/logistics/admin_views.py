"""
logistics/admin_views.py

Administrator endpoints for the Goods & Transport rate card.

Deliberately separate from views.py, which serves the customer-facing
read-only catalog and the public quote endpoint. Nothing here computes a
fare: quote_logistics_fare() remains the single calculation authority, and
these endpoints only govern the rows it reads.

Every response carries `price_lock_notice`. That is not decoration -- the
single most dangerous misconception an operator can hold about this screen is
that changing a rate re-prices work already booked. It does not: a quote
records the rates it used, and reconciliation re-prices from that snapshot.
Saying so on every response is cheaper than a support incident.
"""
import logging

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import RequireModuleAccess
from .models import ServiceTier
from .pricing_admin import (
    DESCRIPTIVE_FIELDS,
    PRICING_FIELDS,
    PricingConflictError,
    PricingPermissionError,
    tier_history,
    update_tier_pricing,
)
from .serializers import ServiceTierChangeLogSerializer, ServiceTierPricingSerializer

logger = logging.getLogger(__name__)

PRICE_LOCK_NOTICE = (
    "Rate changes apply to NEW quotes and bookings only. Jobs already booked "
    "keep the price they were quoted at, including any that are still in "
    "progress."
)


def _ok(data, **extra):
    body = {"success": True, "data": data, "price_lock_notice": PRICE_LOCK_NOTICE}
    body.update(extra)
    return Response(body, status=status.HTTP_200_OK)


def _fail(message, code, http_status, **extra):
    body = {"success": False, "error_code": code, "message": message}
    body.update(extra)
    return Response(body, status=http_status)


class AdminServiceTierListView(APIView):
    """
    GET /api/logistics/admin/tiers/

    Filters: ?city= &category= &is_active=true|false &search=
    Reading the rate card needs `pricing:view`; the per-km rates are not
    public, which is why this is not the same endpoint the booking pages use.
    """
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("pricing", "view")]

    def get(self, request):
        qs = ServiceTier.objects.all()

        city = (request.query_params.get("city") or "").strip()
        if city:
            qs = qs.filter(city__iexact=city)

        category = (request.query_params.get("category") or "").strip()
        if category:
            qs = qs.filter(category=category)

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        qs = qs.order_by("category", "city", "order", "slug")
        return _ok(
            ServiceTierPricingSerializer(qs, many=True).data,
            meta={
                # .order_by() clears Meta.ordering FIRST. Without it Django adds
                # the ordering columns (category, order, name) to the SELECT to
                # satisfy ORDER BY, and on PostgreSQL DISTINCT then applies to
                # the whole row -- so the city filter listed one entry per tier
                # ("Hosur" nine times) instead of one entry per city.
                "cities": sorted(
                    ServiceTier.objects.order_by()
                    .values_list("city", flat=True)
                    .distinct()
                ),
                "categories": [
                    {"value": v, "label": l}
                    for v, l in ServiceTier._meta.get_field("category").choices
                ],
                "pricing_fields": list(PRICING_FIELDS),
                "descriptive_fields": list(DESCRIPTIVE_FIELDS),
                "can_modify_price": _can(request.user, "modify_price"),
                "can_edit": _can(request.user, "edit"),
            },
        )


def _can(user, action):
    from accounts.permissions import can
    return can(user, "pricing", action)


class AdminServiceTierDetailView(APIView):
    """
    GET   /api/logistics/admin/tiers/<pk>/   -- one tier      (pricing:view)
    PATCH /api/logistics/admin/tiers/<pk>/   -- edit it       (per-field, see below)

    PATCH body: any editable field, plus
        reason               required when a pricing field changes
        expected_updated_at  optional; refuses if the tier moved since you loaded it

    Permission is decided PER FIELD, not per request. The RBAC matrix already
    separates `edit` from `modify_price` on the pricing module -- finance and
    manager hold `edit`, only admin and catalog hold `modify_price`. Gating
    the endpoint on `modify_price` would stop finance deactivating a tier;
    gating it on `edit` would let them rewrite the rate card.
    """
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("pricing", "view")]

    def _tier(self, pk):
        return ServiceTier.objects.filter(pk=pk).first()

    def get(self, request, pk):
        tier = self._tier(pk)
        if not tier:
            return _fail("Service tier not found.", "TIER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(ServiceTierPricingSerializer(tier).data)

    def patch(self, request, pk):
        # Goods & Transport unification, Phase 2: Package is now the single
        # place admins edit GT pricing (see the "Goods & Transport Distance
        # Pricing" section on the Package edit modal, Catalog > Packages).
        # ServiceTier is kept only as an auto-synced mirror written by the
        # Package save bridge (service_requests/services/catalog.py) so the
        # live fare engine, existing bookings' logistics_tier FK, and this
        # rate card's read/history views keep working unchanged. Editing a
        # tier directly here would silently diverge from its Package and get
        # overwritten by the next Package save, so it's refused outright
        # rather than left as a trap. GET and the history view are untouched
        # -- this screen is still useful as a read-only rate-card reference.
        #
        # update_tier_pricing/changed_fields (pricing_admin.py) are kept as
        # dead code below this cutover rather than deleted, since they are
        # still the exact logic a future, deliberate schema migration (full
        # ServiceTier retirement, explicitly deferred) would want to reuse
        # or delete outright -- not resurrected here.
        tier = self._tier(pk)
        if not tier:
            return _fail("Service tier not found.", "TIER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _fail(
            "Goods & Transport pricing is now managed from Catalog > Packages "
            "(open the package and edit its “Goods & Transport Distance "
            "Pricing” section). This rate card is read-only and no longer "
            "accepts edits directly, so a change made here would just be "
            "overwritten the next time the linked package is saved.",
            "PRICING_MANAGED_VIA_PACKAGE", status.HTTP_409_CONFLICT,
        )


class AdminServiceTierHistoryView(APIView):
    """
    GET /api/logistics/admin/tiers/<pk>/history/

    The audit trail for one tier, from CatalogChangeLog -- the same store the
    rest of the catalog is audited in, not a second one.
    """
    permission_classes = [permissions.IsAuthenticated, RequireModuleAccess("pricing", "view")]

    def get(self, request, pk):
        if not ServiceTier.objects.filter(pk=pk).exists():
            return _fail("Service tier not found.", "TIER_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        rows = tier_history(pk)
        return _ok(ServiceTierChangeLogSerializer(rows, many=True).data)
