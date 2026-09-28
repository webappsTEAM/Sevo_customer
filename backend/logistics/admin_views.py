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
from decimal import Decimal, InvalidOperation
from django.utils.text import slugify

from .models import GoodsCategory, GoodsItem, ServiceTier, PackersMoversConfig, LogisticsSlot, Lane, GTFaq
from .pricing_admin import (
    DESCRIPTIVE_FIELDS,
    PRICING_FIELDS,
    PricingConflictError,
    PricingPermissionError,
    tier_history,
    update_tier_pricing,
)
from .serializers import (
    AdminGoodsCategorySerializer,
    AdminGoodsItemSerializer,
    AdminLogisticsSlotSerializer,
    PackersMoversConfigSerializer,
    ServiceTierChangeLogSerializer,
    ServiceTierPricingSerializer,
    LaneSerializer,
    GTFaqSerializer,
)

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
    from accounts.permissions import can, is_super_admin
    if is_super_admin(user):
        return True
    return can(user, "pricing", action) or can(user, "catalog", action)


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


# -----------------------------------------------------------------------------
# GOODS CATEGORY ADMINISTRATOR ENDPOINTS
# -----------------------------------------------------------------------------

class AdminGoodsCategoryListView(APIView):
    """
    GET  /api/logistics/admin/categories/  -- list all categories (with item counts)
    POST /api/logistics/admin/categories/  -- create a new goods category
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        qs = GoodsCategory.objects.all().prefetch_related("items")

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        allows_2w = (request.query_params.get("allows_two_wheeler") or "").strip().lower()
        if allows_2w in ("true", "1", "yes"):
            qs = qs.filter(allows_two_wheeler=True)
        elif allows_2w in ("false", "0", "no"):
            qs = qs.filter(allows_two_wheeler=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        qs = qs.order_by("order", "name")
        data = AdminGoodsCategorySerializer(qs, many=True).data
        return _ok(data, total_count=len(data))

    def post(self, request):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to create goods categories.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        data = request.data if isinstance(request.data, dict) else {}
        name = str(data.get("name") or "").strip()
        if not name:
            return _fail("Category name is required.", "NAME_REQUIRED", status.HTTP_400_BAD_REQUEST)

        raw_slug = str(data.get("slug") or "").strip()
        slug = slugify(raw_slug) if raw_slug else slugify(name)
        if not slug:
            return _fail("A valid slug could not be generated.", "INVALID_SLUG", status.HTTP_400_BAD_REQUEST)

        if GoodsCategory.objects.filter(slug=slug).exists():
            return _fail(f"Category slug '{slug}' is already in use.", "DUPLICATE_SLUG", status.HTTP_400_BAD_REQUEST)

        try:
            order = int(data.get("order") or 0)
        except (ValueError, TypeError):
            order = 0

        category = GoodsCategory.objects.create(
            name=name,
            slug=slug,
            icon=str(data.get("icon") or "package").strip(),
            description=str(data.get("description") or "").strip(),
            info_banner=str(data.get("info_banner") or "").strip(),
            allows_two_wheeler=bool(data.get("allows_two_wheeler", True)),
            min_vehicle_class=str(data.get("min_vehicle_class") or "any").strip(),
            order=order,
            is_prohibited=bool(data.get("is_prohibited", False)),
            is_active=bool(data.get("is_active", True)),
        )

        from service_requests.models import CatalogChangeLog
        CatalogChangeLog.objects.create(
            entity_type="GoodsCategory",
            entity_id=category.id,
            field_name="created",
            old_value="",
            new_value=category.name,
            changed_by=request.user,
            reason=str(data.get("reason") or "Created via Logistics Admin API").strip(),
        )

        return Response(
            {"success": True, "data": AdminGoodsCategorySerializer(category).data, "message": "Goods category created successfully."},
            status=status.HTTP_201_CREATED,
        )


class AdminGoodsCategoryDetailView(APIView):
    """
    GET    /api/logistics/admin/categories/<pk>/  -- get one category
    PATCH  /api/logistics/admin/categories/<pk>/  -- update category fields
    DELETE /api/logistics/admin/categories/<pk>/  -- soft-deactivate category
    """
    permission_classes = [permissions.IsAuthenticated]

    def _cat(self, pk):
        return GoodsCategory.objects.filter(pk=pk).first()

    def get(self, request, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        cat = self._cat(pk)
        if not cat:
            return _fail("Goods category not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(AdminGoodsCategorySerializer(cat).data)

    def patch(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit goods categories.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        cat = self._cat(pk)
        if not cat:
            return _fail("Goods category not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        from service_requests.models import CatalogChangeLog
        reason = str(data.get("reason") or "Updated via Logistics Admin API").strip()

        changes = []
        if "name" in data:
            new_name = str(data["name"] or "").strip()
            if not new_name:
                return _fail("Category name cannot be empty.", "INVALID_NAME", status.HTTP_400_BAD_REQUEST)
            if new_name != cat.name:
                CatalogChangeLog.objects.create(entity_type="GoodsCategory", entity_id=cat.id, field_name="name", old_value=cat.name, new_value=new_name, changed_by=request.user, reason=reason)
                cat.name = new_name
                changes.append("name")

        if "slug" in data:
            new_slug = slugify(str(data["slug"] or "").strip())
            if new_slug and new_slug != cat.slug:
                if GoodsCategory.objects.filter(slug=new_slug).exclude(pk=cat.pk).exists():
                    return _fail(f"Slug '{new_slug}' is already taken.", "DUPLICATE_SLUG", status.HTTP_400_BAD_REQUEST)
                CatalogChangeLog.objects.create(entity_type="GoodsCategory", entity_id=cat.id, field_name="slug", old_value=cat.slug, new_value=new_slug, changed_by=request.user, reason=reason)
                cat.slug = new_slug
                changes.append("slug")

        for field in ("icon", "description", "info_banner", "min_vehicle_class"):
            if field in data:
                val = str(data[field] or "").strip()
                old_val = getattr(cat, field)
                if val != old_val:
                    CatalogChangeLog.objects.create(entity_type="GoodsCategory", entity_id=cat.id, field_name=field, old_value=str(old_val), new_value=val, changed_by=request.user, reason=reason)
                    setattr(cat, field, val)
                    changes.append(field)

        for bool_field in ("allows_two_wheeler", "is_prohibited", "is_active"):
            if bool_field in data:
                bval = bool(data[bool_field])
                old_b = getattr(cat, bool_field)
                if bval != old_b:
                    CatalogChangeLog.objects.create(entity_type="GoodsCategory", entity_id=cat.id, field_name=bool_field, old_value=str(old_b), new_value=str(bval), changed_by=request.user, reason=reason)
                    setattr(cat, bool_field, bval)
                    changes.append(bool_field)

        if "order" in data:
            try:
                ord_val = int(data["order"])
                if ord_val != cat.order:
                    CatalogChangeLog.objects.create(entity_type="GoodsCategory", entity_id=cat.id, field_name="order", old_value=str(cat.order), new_value=str(ord_val), changed_by=request.user, reason=reason)
                    cat.order = ord_val
                    changes.append("order")
            except (ValueError, TypeError):
                pass

        if changes:
            cat.save()

        return _ok(AdminGoodsCategorySerializer(cat).data, changed=changes, message="Goods category updated successfully.")

    def delete(self, request, pk):
        """Soft-deactivate to prevent orphan historical records."""
        if not _can(request.user, "edit"):
            return _fail("Permission denied to deactivate goods categories.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        cat = self._cat(pk)
        if not cat:
            return _fail("Goods category not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        from service_requests.models import CatalogChangeLog
        cat.is_active = False
        cat.save()
        CatalogChangeLog.objects.create(
            entity_type="GoodsCategory",
            entity_id=cat.id,
            field_name="is_active",
            old_value="True",
            new_value="False",
            changed_by=request.user,
            reason=str(request.data.get("reason") if isinstance(request.data, dict) else "" or "Soft-deactivated by admin").strip(),
        )
        return _ok(AdminGoodsCategorySerializer(cat).data, message="Goods category deactivated successfully.")


# -----------------------------------------------------------------------------
# GOODS ITEM ADMINISTRATOR ENDPOINTS
# -----------------------------------------------------------------------------

class AdminGoodsItemListView(APIView):
    """
    GET  /api/logistics/admin/items/  -- list items with category and filtering
    POST /api/logistics/admin/items/  -- create a new cargo goods item
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        qs = GoodsItem.objects.select_related("category").all()

        cat = (request.query_params.get("category") or "").strip()
        if cat:
            if cat.isdigit():
                qs = qs.filter(category_id=int(cat))
            else:
                qs = qs.filter(category__slug__iexact=cat)

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        is_prohibited = (request.query_params.get("is_prohibited") or "").strip().lower()
        if is_prohibited in ("true", "1", "yes"):
            qs = qs.filter(is_prohibited=True)
        elif is_prohibited in ("false", "0", "no"):
            qs = qs.filter(is_prohibited=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(slug__icontains=search))

        qs = qs.order_by("category__order", "category__name", "order", "name")
        data = AdminGoodsItemSerializer(qs, many=True).data
        return _ok(data, total_count=len(data))

    def post(self, request):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to create goods items.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        data = request.data if isinstance(request.data, dict) else {}
        name = str(data.get("name") or "").strip()
        if not name:
            return _fail("Item name is required.", "NAME_REQUIRED", status.HTTP_400_BAD_REQUEST)

        cat_id = data.get("category") or data.get("category_id")
        if not cat_id:
            return _fail("Category ID is required.", "CATEGORY_REQUIRED", status.HTTP_400_BAD_REQUEST)

        if isinstance(cat_id, str) and not cat_id.isdigit():
            category = GoodsCategory.objects.filter(slug__iexact=cat_id).first()
        else:
            category = GoodsCategory.objects.filter(id=int(cat_id)).first()

        if not category:
            return _fail("Selected category does not exist.", "INVALID_CATEGORY", status.HTTP_400_BAD_REQUEST)

        raw_slug = str(data.get("slug") or "").strip()
        slug = slugify(raw_slug) if raw_slug else slugify(f"{category.slug}-{name}")
        if not slug:
            return _fail("A valid slug could not be generated.", "INVALID_SLUG", status.HTTP_400_BAD_REQUEST)

        if GoodsItem.objects.filter(slug=slug).exists():
            return _fail(f"Goods item slug '{slug}' is already in use.", "DUPLICATE_SLUG", status.HTTP_400_BAD_REQUEST)

        raw_wt = data.get("default_weight_kg")
        if raw_wt is None or str(raw_wt).strip() == "":
            return _fail("Item weight is required and cannot be blank.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)
        try:
            wt = Decimal(str(raw_wt).strip())
            if wt <= Decimal("0"):
                return _fail("Item weight must be greater than zero.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            return _fail("Enter a valid numeric weight in kg.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)

        raw_cft = data.get("default_cft")
        if raw_cft is None or str(raw_cft).strip() == "":
            return _fail("Item volume in CFT is required and cannot be blank.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)
        try:
            cft = Decimal(str(raw_cft).strip())
            if cft <= Decimal("0"):
                return _fail("Item volume must be greater than zero.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            return _fail("Enter a valid numeric volume in CFT.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)

        try:
            handling_fee = Decimal(str(data.get("special_handling_charge") or "0.00"))
            if handling_fee < Decimal("0"):
                return _fail("Special handling charge cannot be negative.", "INVALID_HANDLING_FEE", status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            handling_fee = Decimal("0.00")

        try:
            order = int(data.get("order") or 0)
        except (ValueError, TypeError):
            order = 0

        item = GoodsItem.objects.create(
            category=category,
            name=name,
            slug=slug,
            subcategory=str(data.get("subcategory") or "").strip(),
            unit=str(data.get("unit") or "piece").strip(),
            default_weight_kg=wt,
            default_cft=cft,
            is_fragile=bool(data.get("is_fragile", False)),
            is_heavy=bool(data.get("is_heavy", False)),
            is_oversized=bool(data.get("is_oversized", False)),
            is_prohibited=bool(data.get("is_prohibited", False)),
            requires_special_handling=bool(data.get("requires_special_handling", False) or handling_fee > 0),
            special_handling_charge=handling_fee,
            is_two_wheeler_compatible=bool(data.get("is_two_wheeler_compatible", True)),
            order=order,
            is_active=bool(data.get("is_active", True)),
        )

        from service_requests.models import CatalogChangeLog
        CatalogChangeLog.objects.create(
            entity_type="GoodsItem",
            entity_id=item.id,
            field_name="created",
            old_value="",
            new_value=f"{item.name} ({item.category.name}) - {wt}kg",
            changed_by=request.user,
            reason=str(data.get("reason") or "Created via Logistics Admin API").strip(),
        )

        return Response(
            {"success": True, "data": AdminGoodsItemSerializer(item).data, "message": "Goods item created successfully."},
            status=status.HTTP_201_CREATED,
        )


class AdminGoodsItemDetailView(APIView):
    """
    GET    /api/logistics/admin/items/<pk>/  -- get one item
    PATCH  /api/logistics/admin/items/<pk>/  -- update item properties
    DELETE /api/logistics/admin/items/<pk>/  -- soft-deactivate item
    """
    permission_classes = [permissions.IsAuthenticated]

    def _item(self, pk):
        return GoodsItem.objects.filter(pk=pk).first()

    def get(self, request, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        item = self._item(pk)
        if not item:
            return _fail("Goods item not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(AdminGoodsItemSerializer(item).data)

    def patch(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit goods items.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        item = self._item(pk)
        if not item:
            return _fail("Goods item not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        from service_requests.models import CatalogChangeLog
        reason = str(data.get("reason") or "Updated via Logistics Admin API").strip()
        changes = []

        if "category" in data:
            cat_id = data["category"]
            if isinstance(cat_id, str) and not cat_id.isdigit():
                new_cat = GoodsCategory.objects.filter(slug__iexact=cat_id).first()
            else:
                new_cat = GoodsCategory.objects.filter(id=int(cat_id)).first()
            if not new_cat:
                return _fail("Specified category does not exist.", "INVALID_CATEGORY", status.HTTP_400_BAD_REQUEST)
            if new_cat.id != item.category_id:
                CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="category", old_value=item.category.name, new_value=new_cat.name, changed_by=request.user, reason=reason)
                item.category = new_cat
                changes.append("category")

        if "name" in data:
            new_name = str(data["name"] or "").strip()
            if not new_name:
                return _fail("Item name cannot be empty.", "INVALID_NAME", status.HTTP_400_BAD_REQUEST)
            if new_name != item.name:
                CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="name", old_value=item.name, new_value=new_name, changed_by=request.user, reason=reason)
                item.name = new_name
                changes.append("name")

        if "slug" in data:
            new_slug = slugify(str(data["slug"] or "").strip())
            if new_slug and new_slug != item.slug:
                if GoodsItem.objects.filter(slug=new_slug).exclude(pk=item.pk).exists():
                    return _fail(f"Slug '{new_slug}' is already taken.", "DUPLICATE_SLUG", status.HTTP_400_BAD_REQUEST)
                CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="slug", old_value=item.slug, new_value=new_slug, changed_by=request.user, reason=reason)
                item.slug = new_slug
                changes.append("slug")

        if "default_weight_kg" in data:
            raw_wt = data.get("default_weight_kg")
            if raw_wt is None or str(raw_wt).strip() == "":
                return _fail("Weight cannot be blank.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)
            try:
                new_wt = Decimal(str(raw_wt).strip())
                if new_wt <= Decimal("0"):
                    return _fail("Weight must be greater than zero.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)
                if new_wt != item.default_weight_kg:
                    CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="default_weight_kg", old_value=str(item.default_weight_kg), new_value=str(new_wt), changed_by=request.user, reason=reason)
                    item.default_weight_kg = new_wt
                    changes.append("default_weight_kg")
            except (InvalidOperation, TypeError, ValueError):
                return _fail("Invalid weight number.", "INVALID_WEIGHT", status.HTTP_400_BAD_REQUEST)

        if "default_cft" in data:
            raw_cft = data.get("default_cft")
            if raw_cft is None or str(raw_cft).strip() == "":
                return _fail("CFT volume cannot be blank.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)
            try:
                new_cft = Decimal(str(raw_cft).strip())
                if new_cft <= Decimal("0"):
                    return _fail("CFT volume must be greater than zero.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)
                if new_cft != item.default_cft:
                    CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="default_cft", old_value=str(item.default_cft), new_value=str(new_cft), changed_by=request.user, reason=reason)
                    item.default_cft = new_cft
                    changes.append("default_cft")
            except (InvalidOperation, TypeError, ValueError):
                return _fail("Invalid CFT number.", "INVALID_CFT", status.HTTP_400_BAD_REQUEST)

        if "special_handling_charge" in data:
            try:
                new_fee = Decimal(str(data["special_handling_charge"]))
                if new_fee < Decimal("0"):
                    return _fail("Special handling charge cannot be negative.", "INVALID_HANDLING_FEE", status.HTTP_400_BAD_REQUEST)
                if new_fee != item.special_handling_charge:
                    # GT audit Update 8: special_handling_charge is a real
                    # money field (feeds both GT and P&M fare calculations --
                    # see cargo_fitment.py / packers_movers_pricing.py) but
                    # this whole view was previously gated only on plain
                    # "edit" at the top of patch(). Require modify_price
                    # specifically for this field, checked here (before any
                    # mutation or audit-log write for it) so the other
                    # descriptive fields above/below stay on plain "edit".
                    if not _can(request.user, "modify_price"):
                        return _fail(
                            "Changing a goods item's special handling charge "
                            "requires the 'modify_price' permission on the "
                            "Pricing module.",
                            "PRICING_FORBIDDEN", status.HTTP_403_FORBIDDEN,
                        )
                    CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="special_handling_charge", old_value=str(item.special_handling_charge), new_value=str(new_fee), changed_by=request.user, reason=reason)
                    item.special_handling_charge = new_fee
                    if new_fee > 0:
                        item.requires_special_handling = True
                    changes.append("special_handling_charge")
            except (InvalidOperation, TypeError, ValueError):
                return _fail("Invalid special handling charge.", "INVALID_HANDLING_FEE", status.HTTP_400_BAD_REQUEST)

        for bfield in ("is_fragile", "is_heavy", "is_oversized", "is_prohibited", "requires_special_handling", "is_two_wheeler_compatible", "is_active"):
            if bfield in data:
                bval = bool(data[bfield])
                old_b = getattr(item, bfield)
                if bval != old_b:
                    CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name=bfield, old_value=str(old_b), new_value=str(bval), changed_by=request.user, reason=reason)
                    setattr(item, bfield, bval)
                    changes.append(bfield)

        if "subcategory" in data:
            sub_val = str(data["subcategory"] or "").strip()
            if sub_val != item.subcategory:
                CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="subcategory", old_value=item.subcategory, new_value=sub_val, changed_by=request.user, reason=reason)
                item.subcategory = sub_val
                changes.append("subcategory")

        if "unit" in data:
            u_val = str(data["unit"] or "").strip()
            if u_val and u_val != item.unit:
                CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="unit", old_value=item.unit, new_value=u_val, changed_by=request.user, reason=reason)
                item.unit = u_val
                changes.append("unit")

        if "order" in data:
            try:
                ord_val = int(data["order"])
                if ord_val != item.order:
                    CatalogChangeLog.objects.create(entity_type="GoodsItem", entity_id=item.id, field_name="order", old_value=str(item.order), new_value=str(ord_val), changed_by=request.user, reason=reason)
                    item.order = ord_val
                    changes.append("order")
            except (ValueError, TypeError):
                pass

        if changes:
            item.save()

        return _ok(AdminGoodsItemSerializer(item).data, changed=changes, message="Goods item updated successfully.")

    def delete(self, request, pk):
        """Soft-deactivate to prevent orphan historical records."""
        if not _can(request.user, "edit"):
            return _fail("Permission denied to deactivate goods items.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        item = self._item(pk)
        if not item:
            return _fail("Goods item not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        from service_requests.models import CatalogChangeLog
        item.is_active = False
        item.save()
        CatalogChangeLog.objects.create(
            entity_type="GoodsItem",
            entity_id=item.id,
            field_name="is_active",
            old_value="True",
            new_value="False",
            changed_by=request.user,
            reason=str(request.data.get("reason") if isinstance(request.data, dict) else "" or "Soft-deactivated by admin").strip(),
        )
        return _ok(AdminGoodsItemSerializer(item).data, message="Goods item deactivated successfully.")


class AdminPackersMoversConfigView(APIView):
    """
    GET /api/logistics/admin/packers-movers-config/?city=Hosur
    PATCH /api/logistics/admin/packers-movers-config/
    Governs live Admin configuration of Packers & Movers relocation pricing parameters.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view P&M pricing config.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        city = request.query_params.get("city", "Hosur").strip()
        from .models import PackersMoversConfig
        from .serializers import PackersMoversConfigSerializer
        config = PackersMoversConfig.objects.filter(city__iexact=city, is_active=True).first()
        if not config:
            config = PackersMoversConfig.objects.filter(is_active=True).first()
        if not config:
            return _fail(f"No active P&M config found for city '{city}'.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(PackersMoversConfigSerializer(config).data)

    def patch(self, request):
        # GT audit Update 7: this used to gate the ENTIRE patch (including
        # the six rate fields below, which are genuine live pricing inputs
        # to the P&M fare engine -- see packers_movers_pricing.py) on plain
        # "edit". Per the RBAC matrix (accounts/permissions.py), "manager"
        # and "finance" both hold pricing:edit but explicitly NOT
        # pricing:modify_price -- exactly the roles the modify_price split
        # exists to keep away from rates. _can(request.user, "edit") alone
        # is still the right gate for this endpoint to be reachable at all
        # (and for survey_cft_threshold/is_active, which are not money), but
        # the six rate fields need the stronger check below.
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit P&M pricing config.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        data = request.data if isinstance(request.data, dict) else {}
        city = data.get("city", "Hosur").strip()
        from .models import PackersMoversConfig
        from .serializers import PackersMoversConfigSerializer
        from service_requests.models import CatalogChangeLog
        config = PackersMoversConfig.objects.filter(city__iexact=city).first()
        if not config:
            config = PackersMoversConfig.objects.filter(is_active=True).first()
        if not config:
            return _fail(f"No P&M config found for city '{city}'.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        reason = str(data.get("reason") or "Admin P&M pricing update").strip()
        changes = []

        dec_fields = {
            "standard_packing_rate_cft": "standard_packing_rate_cft",
            "premium_packing_rate_cft": "premium_packing_rate_cft",
            "premium_fragile_addon": "premium_fragile_addon",
            "floor_rate_no_lift_per_100cft": "floor_rate_no_lift_per_100cft",
            "unpacking_rate_cft": "unpacking_rate_cft",
            "gst_rate": "gst_rate",
        }

        # ── Pricing permission gate (Update 7 fix) ──────────────────────────
        # Parse and validate every rate field FIRST, without mutating config
        # or writing any audit row, so a denied request leaves the database
        # completely untouched -- not even a partial write of the fields the
        # actor "would have" been allowed to change, since all six here are
        # money. Only after confirming at least one rate field would actually
        # change value do we require modify_price; a request that resends the
        # same values needs no elevated permission.
        _parsed_dec = {}
        for field_name, attr in dec_fields.items():
            if field_name in data:
                try:
                    val = Decimal(str(data[field_name]))
                except (InvalidOperation, TypeError, ValueError):
                    return _fail(f"Invalid decimal for {field_name}.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
                if val < Decimal("0"):
                    return _fail(f"{field_name} cannot be negative.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
                if val != getattr(config, attr):
                    _parsed_dec[field_name] = val
        if _parsed_dec and not _can(request.user, "modify_price"):
            return _fail(
                "Changing Packers & Movers pricing rates requires the "
                "'modify_price' permission on the Pricing module.",
                "PRICING_FORBIDDEN", status.HTTP_403_FORBIDDEN,
            )
        # ── End pricing permission gate ─────────────────────────────────────

        for field_name, attr in dec_fields.items():
            if field_name in _parsed_dec:
                val = _parsed_dec[field_name]
                old_val = getattr(config, attr)
                CatalogChangeLog.objects.create(
                    entity_type="PackersMoversConfig",
                    entity_id=config.id,
                    field_name=field_name,
                    old_value=str(old_val),
                    new_value=str(val),
                    changed_by=request.user,
                    reason=reason,
                )
                setattr(config, attr, val)
                changes.append(field_name)

        if "survey_cft_threshold" in data:
            try:
                s_val = float(data["survey_cft_threshold"])
                if s_val < 50.0:
                    return _fail("survey_cft_threshold must be at least 50 CFT.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
                old_s = config.survey_cft_threshold
                if s_val != old_s:
                    CatalogChangeLog.objects.create(
                        entity_type="PackersMoversConfig",
                        entity_id=config.id,
                        field_name="survey_cft_threshold",
                        old_value=str(old_s),
                        new_value=str(s_val),
                        changed_by=request.user,
                        reason=reason,
                    )
                    config.survey_cft_threshold = s_val
                    changes.append("survey_cft_threshold")
            except (ValueError, TypeError):
                return _fail("Invalid number for survey_cft_threshold.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)

        # Helper-count limit: crew-size / operations setting, not money, so
        # plain "edit" is enough (same as survey_cft_threshold).
        if "max_helpers" in data:
            from .models import MAX_HELPERS_CAP
            raw_h = data["max_helpers"]
            try:
                if isinstance(raw_h, bool) or float(raw_h) != int(float(raw_h)):
                    raise ValueError
                h_val = int(float(raw_h))
            except (ValueError, TypeError):
                return _fail("max_helpers must be a whole number.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
            if h_val < 0 or h_val > MAX_HELPERS_CAP:
                return _fail(f"max_helpers must be between 0 and {MAX_HELPERS_CAP}.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
            if h_val != config.max_helpers:
                CatalogChangeLog.objects.create(
                    entity_type="PackersMoversConfig",
                    entity_id=config.id,
                    field_name="max_helpers",
                    old_value=str(config.max_helpers),
                    new_value=str(h_val),
                    changed_by=request.user,
                    reason=reason,
                )
                config.max_helpers = h_val
                changes.append("max_helpers")

        if "is_active" in data:
            b_val = bool(data["is_active"])
            if b_val != config.is_active:
                setattr(config, "is_active", b_val)
                changes.append("is_active")

        if changes:
            config.save()

        return _ok(PackersMoversConfigSerializer(config).data, changed=changes, message="P&M pricing config updated successfully.")


class AdminLogisticsSlotListView(APIView):
    """
    GET  /api/logistics/admin/slots/  -- list all operating slots with filters
    POST /api/logistics/admin/slots/  -- create a new operating time slot
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        qs = LogisticsSlot.objects.all()

        cat = (request.query_params.get("category") or "").strip().lower()
        if cat:
            qs = qs.filter(Q(category="") | Q(category__iexact=cat))

        city = (request.query_params.get("city") or "").strip().lower()
        if city:
            qs = qs.filter(Q(city="") | Q(city__iexact=city))

        group = (request.query_params.get("group") or "").strip()
        if group:
            qs = qs.filter(group__iexact=group)

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(slot_label__icontains=search) | Q(group__icontains=search))

        qs = qs.order_by("category", "city", "order", "start_time")
        data = AdminLogisticsSlotSerializer(qs, many=True).data
        return _ok(data, total_count=len(data))

    def post(self, request):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to create slots.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        data = request.data if isinstance(request.data, dict) else {}
        slot_label = str(data.get("slot_label") or "").strip()
        if not slot_label:
            return _fail("Slot label is required (e.g. '08:00 AM - 09:00 AM').", "LABEL_REQUIRED", status.HTTP_400_BAD_REQUEST)

        group = str(data.get("group") or "Morning").strip()
        category = str(data.get("category") or "").strip()
        city = str(data.get("city") or "").strip().lower()

        try:
            capacity = int(data.get("capacity") or 10)
            if capacity < 1:
                return _fail("Capacity must be at least 1.", "INVALID_CAPACITY", status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError):
            capacity = 10

        try:
            order = int(data.get("order") or 0)
        except (ValueError, TypeError):
            order = 0

        slot = LogisticsSlot.objects.create(
            category=category,
            city=city,
            group=group,
            slot_label=slot_label,
            capacity=capacity,
            order=order,
            is_active=bool(data.get("is_active", True)),
        )

        from service_requests.models import CatalogChangeLog
        CatalogChangeLog.objects.create(
            entity_type="LogisticsSlot",
            entity_id=slot.id,
            field_name="created",
            old_value="",
            new_value=f"[{category or 'all'}/{city or 'all'}] {slot_label}",
            changed_by=request.user,
            reason=str(data.get("reason") or "Created via Logistics Admin API").strip(),
        )

        return _ok(AdminLogisticsSlotSerializer(slot).data, message="Operating slot created successfully.")


class AdminLogisticsSlotDetailView(APIView):
    """
    GET    /api/logistics/admin/slots/<pk>/  -- slot detail
    PATCH  /api/logistics/admin/slots/<pk>/  -- update slot configuration
    DELETE /api/logistics/admin/slots/<pk>/  -- toggle active / delete
    """
    permission_classes = [permissions.IsAuthenticated]

    def _slot(self, pk):
        return LogisticsSlot.objects.filter(pk=pk).first()

    def get(self, request, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        slot = self._slot(pk)
        if not slot:
            return _fail("Logistics slot not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(AdminLogisticsSlotSerializer(slot).data)

    def patch(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit slots.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        slot = self._slot(pk)
        if not slot:
            return _fail("Logistics slot not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        from service_requests.models import CatalogChangeLog
        reason = str(data.get("reason") or "Updated via Logistics Admin API").strip()
        changes = []

        for str_field in ("slot_label", "group", "category", "city"):
            if str_field in data:
                val = str(data[str_field] or "").strip()
                old_val = getattr(slot, str_field)
                if val != old_val:
                    CatalogChangeLog.objects.create(
                        entity_type="LogisticsSlot", entity_id=slot.id,
                        field_name=str_field, old_value=str(old_val), new_value=val,
                        changed_by=request.user, reason=reason
                    )
                    setattr(slot, str_field, val)
                    changes.append(str_field)

        if "capacity" in data:
            try:
                c_val = int(data["capacity"])
                if c_val >= 1 and c_val != slot.capacity:
                    CatalogChangeLog.objects.create(
                        entity_type="LogisticsSlot", entity_id=slot.id,
                        field_name="capacity", old_value=str(slot.capacity), new_value=str(c_val),
                        changed_by=request.user, reason=reason
                    )
                    slot.capacity = c_val
                    changes.append("capacity")
            except (ValueError, TypeError):
                pass

        if "order" in data:
            try:
                ord_val = int(data["order"])
                if ord_val != slot.order:
                    CatalogChangeLog.objects.create(
                        entity_type="LogisticsSlot", entity_id=slot.id,
                        field_name="order", old_value=str(slot.order), new_value=str(ord_val),
                        changed_by=request.user, reason=reason
                    )
                    slot.order = ord_val
                    changes.append("order")
            except (ValueError, TypeError):
                pass

        if "is_active" in data:
            b_val = bool(data["is_active"])
            if b_val != slot.is_active:
                CatalogChangeLog.objects.create(
                    entity_type="LogisticsSlot", entity_id=slot.id,
                    field_name="is_active", old_value=str(slot.is_active), new_value=str(b_val),
                    changed_by=request.user, reason=reason
                )
                slot.is_active = b_val
                changes.append("is_active")

        if changes:
            slot.save()

        return _ok(AdminLogisticsSlotSerializer(slot).data, changed=changes, message="Slot updated successfully.")

    def delete(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to deactivate slots.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        slot = self._slot(pk)
        if not slot:
            return _fail("Logistics slot not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        slot.is_active = False
        slot.save(update_fields=["is_active", "updated_at"])
        return _ok(AdminLogisticsSlotSerializer(slot).data, message="Slot deactivated successfully.")


class AdminLaneListView(APIView):
    """
    GET  /api/logistics/admin/lanes/  -- list all lanes with filtering
    POST /api/logistics/admin/lanes/  -- create a new fixed-fare lane
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view lanes.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        qs = Lane.objects.all()
        cat = (request.query_params.get("category") or "").strip().lower()
        if cat:
            qs = qs.filter(category__iexact=cat)

        city = (request.query_params.get("city") or "").strip().lower()
        if city:
            qs = qs.filter(city__iexact=city)

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(destination_label__icontains=search) | Q(city__icontains=search))

        qs = qs.order_by("category", "city", "order", "id")
        data = LaneSerializer(qs, many=True).data
        return _ok(data, total_count=len(data))

    def post(self, request):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to create lanes.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        data = request.data if isinstance(request.data, dict) else {}
        destination_label = str(data.get("destination_label") or "").strip()
        if not destination_label:
            return _fail("Destination label is required (e.g. 'Bengaluru Hub').", "LABEL_REQUIRED", status.HTTP_400_BAD_REQUEST)

        category = str(data.get("category") or "goods_transport_truck").strip()
        city = str(data.get("city") or "Hosur").strip()

        try:
            fare = Decimal(str(data.get("fare") or "0.00"))
            if fare < Decimal("0.00"):
                return _fail("Fare must be non-negative.", "INVALID_FARE", status.HTTP_400_BAD_REQUEST)
        except (InvalidOperation, TypeError, ValueError):
            return _fail("Invalid fare amount.", "INVALID_FARE", status.HTTP_400_BAD_REQUEST)

        distance_km = None
        if data.get("distance_km") not in (None, ""):
            try:
                distance_km = Decimal(str(data["distance_km"]))
            except (InvalidOperation, TypeError, ValueError):
                pass

        dest_lat = None
        if data.get("destination_latitude") not in (None, ""):
            try:
                dest_lat = Decimal(str(data["destination_latitude"]))
            except (InvalidOperation, TypeError, ValueError):
                pass

        dest_lng = None
        if data.get("destination_longitude") not in (None, ""):
            try:
                dest_lng = Decimal(str(data["destination_longitude"]))
            except (InvalidOperation, TypeError, ValueError):
                pass

        try:
            order = int(data.get("order") or 0)
        except (ValueError, TypeError):
            order = 0

        lane = Lane.objects.create(
            category=category,
            city=city,
            destination_label=destination_label,
            destination_latitude=dest_lat,
            destination_longitude=dest_lng,
            distance_km=distance_km,
            eta_label=str(data.get("eta_label") or "").strip(),
            fare=fare,
            currency=str(data.get("currency") or "INR").strip(),
            order=order,
            is_active=bool(data.get("is_active", True)),
        )

        from service_requests.models import CatalogChangeLog
        CatalogChangeLog.objects.create(
            entity_type="Lane",
            entity_id=lane.id,
            field_name="created",
            old_value="",
            new_value=f"[{category}/{city}] -> {destination_label} (₹{fare})",
            changed_by=request.user,
            reason=str(data.get("reason") or "Created via Logistics Admin API").strip(),
        )

        return _ok(LaneSerializer(lane).data, message="Lane created successfully.")


class AdminLaneDetailView(APIView):
    """
    GET    /api/logistics/admin/lanes/<pk>/  -- lane detail
    PATCH  /api/logistics/admin/lanes/<pk>/  -- update lane
    DELETE /api/logistics/admin/lanes/<pk>/  -- toggle active / delete
    """
    permission_classes = [permissions.IsAuthenticated]

    def _lane(self, pk):
        return Lane.objects.filter(pk=pk).first()

    def get(self, request, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view lane.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        lane = self._lane(pk)
        if not lane:
            return _fail("Lane not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(LaneSerializer(lane).data)

    def patch(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit lanes.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        lane = self._lane(pk)
        if not lane:
            return _fail("Lane not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        reason = str(data.get("reason") or "Updated via Logistics Admin API").strip()
        from service_requests.models import CatalogChangeLog

        changes = []
        for str_field in ("category", "city", "destination_label", "eta_label", "currency"):
            if str_field in data:
                val = str(data[str_field] or "").strip()
                old_val = getattr(lane, str_field, "")
                if val != old_val:
                    CatalogChangeLog.objects.create(
                        entity_type="Lane", entity_id=lane.id,
                        field_name=str_field, old_value=str(old_val), new_value=val,
                        changed_by=request.user, reason=reason
                    )
                    setattr(lane, str_field, val)
                    changes.append(str_field)

        for dec_field in ("fare", "distance_km", "destination_latitude", "destination_longitude"):
            if dec_field in data:
                raw_val = data[dec_field]
                old_val = getattr(lane, dec_field)
                if raw_val in (None, ""):
                    new_val = None
                else:
                    try:
                        new_val = Decimal(str(raw_val))
                    except (InvalidOperation, TypeError, ValueError):
                        continue
                if new_val != old_val:
                    CatalogChangeLog.objects.create(
                        entity_type="Lane", entity_id=lane.id,
                        field_name=dec_field, old_value=str(old_val), new_value=str(new_val),
                        changed_by=request.user, reason=reason
                    )
                    setattr(lane, dec_field, new_val)
                    changes.append(dec_field)

        if "order" in data:
            try:
                ord_val = int(data["order"])
                if ord_val != lane.order:
                    CatalogChangeLog.objects.create(
                        entity_type="Lane", entity_id=lane.id,
                        field_name="order", old_value=str(lane.order), new_value=str(ord_val),
                        changed_by=request.user, reason=reason
                    )
                    lane.order = ord_val
                    changes.append("order")
            except (ValueError, TypeError):
                pass

        if "is_active" in data:
            b_val = bool(data["is_active"])
            if b_val != lane.is_active:
                CatalogChangeLog.objects.create(
                    entity_type="Lane", entity_id=lane.id,
                    field_name="is_active", old_value=str(lane.is_active), new_value=str(b_val),
                    changed_by=request.user, reason=reason
                )
                lane.is_active = b_val
                changes.append("is_active")

        if changes:
            lane.save()

        return _ok(LaneSerializer(lane).data, changed=changes, message="Lane updated successfully.")

    def delete(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to deactivate lanes.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        lane = self._lane(pk)
        if not lane:
            return _fail("Lane not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        lane.is_active = False
        lane.save(update_fields=["is_active", "updated_at"])
        return _ok(LaneSerializer(lane).data, message="Lane deactivated successfully.")


class AdminGTFaqListView(APIView):
    """
    GET  /api/logistics/admin/faqs/  -- list all GT FAQs with filtering
    POST /api/logistics/admin/faqs/  -- create a new FAQ
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view FAQs.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        qs = GTFaq.objects.all()
        cat = (request.query_params.get("category") or "").strip().lower()
        if cat:
            qs = qs.filter(Q(category="") | Q(category__iexact=cat))

        city = (request.query_params.get("city") or "").strip().lower()
        if city:
            qs = qs.filter(Q(city="") | Q(city__iexact=city))

        is_active = (request.query_params.get("is_active") or "").strip().lower()
        if is_active in ("true", "1", "yes"):
            qs = qs.filter(is_active=True)
        elif is_active in ("false", "0", "no"):
            qs = qs.filter(is_active=False)

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(question__icontains=search) | Q(answer__icontains=search))

        qs = qs.order_by("category", "city", "order", "id")
        data = GTFaqSerializer(qs, many=True).data
        return _ok(data, total_count=len(data))

    def post(self, request):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to create FAQs.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)

        data = request.data if isinstance(request.data, dict) else {}
        question = str(data.get("question") or "").strip()
        answer = str(data.get("answer") or "").strip()
        if not question or not answer:
            return _fail("Both question and answer are required.", "FIELDS_REQUIRED", status.HTTP_400_BAD_REQUEST)

        category = str(data.get("category") or "").strip().lower()
        city = str(data.get("city") or "").strip().lower()

        try:
            order = int(data.get("order") or 0)
        except (ValueError, TypeError):
            order = 0

        faq = GTFaq.objects.create(
            category=category,
            city=city,
            question=question,
            answer=answer,
            order=order,
            is_active=bool(data.get("is_active", True)),
        )

        from service_requests.models import CatalogChangeLog
        CatalogChangeLog.objects.create(
            entity_type="GTFaq",
            entity_id=faq.id,
            field_name="created",
            old_value="",
            new_value=f"[{category or 'all'}/{city or 'all'}] {question[:50]}",
            changed_by=request.user,
            reason=str(data.get("reason") or "Created via Logistics Admin API").strip(),
        )

        return _ok(GTFaqSerializer(faq).data, message="FAQ created successfully.")


class AdminGTFaqDetailView(APIView):
    """
    GET    /api/logistics/admin/faqs/<pk>/  -- FAQ detail
    PATCH  /api/logistics/admin/faqs/<pk>/  -- update FAQ
    DELETE /api/logistics/admin/faqs/<pk>/  -- toggle active / delete
    """
    permission_classes = [permissions.IsAuthenticated]

    def _faq(self, pk):
        return GTFaq.objects.filter(pk=pk).first()

    def get(self, request, pk):
        if not _can(request.user, "view"):
            return _fail("Permission denied to view FAQ.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        faq = self._faq(pk)
        if not faq:
            return _fail("FAQ not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return _ok(GTFaqSerializer(faq).data)

    def patch(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to edit FAQs.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        faq = self._faq(pk)
        if not faq:
            return _fail("FAQ not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        reason = str(data.get("reason") or "Updated via Logistics Admin API").strip()
        from service_requests.models import CatalogChangeLog

        changes = []
        for str_field in ("category", "city", "question", "answer"):
            if str_field in data:
                val = str(data[str_field] or "").strip()
                old_val = getattr(faq, str_field, "")
                if val != old_val:
                    CatalogChangeLog.objects.create(
                        entity_type="GTFaq", entity_id=faq.id,
                        field_name=str_field, old_value=str(old_val)[:200], new_value=val[:200],
                        changed_by=request.user, reason=reason
                    )
                    setattr(faq, str_field, val)
                    changes.append(str_field)

        if "order" in data:
            try:
                ord_val = int(data["order"])
                if ord_val != faq.order:
                    CatalogChangeLog.objects.create(
                        entity_type="GTFaq", entity_id=faq.id,
                        field_name="order", old_value=str(faq.order), new_value=str(ord_val),
                        changed_by=request.user, reason=reason
                    )
                    faq.order = ord_val
                    changes.append("order")
            except (ValueError, TypeError):
                pass

        if "is_active" in data:
            b_val = bool(data["is_active"])
            if b_val != faq.is_active:
                CatalogChangeLog.objects.create(
                    entity_type="GTFaq", entity_id=faq.id,
                    field_name="is_active", old_value=str(faq.is_active), new_value=str(b_val),
                    changed_by=request.user, reason=reason
                )
                faq.is_active = b_val
                changes.append("is_active")

        if changes:
            faq.save()

        return _ok(GTFaqSerializer(faq).data, changed=changes, message="FAQ updated successfully.")

    def delete(self, request, pk):
        if not _can(request.user, "edit"):
            return _fail("Permission denied to deactivate FAQs.", "FORBIDDEN", status.HTTP_403_FORBIDDEN)
        faq = self._faq(pk)
        if not faq:
            return _fail("FAQ not found.", "NOT_FOUND", status.HTTP_404_NOT_FOUND)

        faq.is_active = False
        faq.save(update_fields=["is_active", "updated_at"])
        return _ok(GTFaqSerializer(faq).data, message="FAQ deactivated successfully.")




