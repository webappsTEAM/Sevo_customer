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

from .models import GoodsCategory, GoodsItem, ServiceTier, PackersMoversConfig
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
    PackersMoversConfigSerializer,
    ServiceTierChangeLogSerializer,
    ServiceTierPricingSerializer,
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
        tier = self._tier(pk)
        if not tier:
            return _fail("Service tier not found.", "TIER_NOT_FOUND", status.HTTP_404_NOT_FOUND)

        data = request.data if isinstance(request.data, dict) else {}
        reason = str(data.get("reason") or "").strip()

        from .pricing_admin import changed_fields
        try:
            pending = changed_fields(tier, data)
        except DjangoValidationError as exc:
            # An unparseable rate. Reported as a field error rather than
            # accepted as "clear this field" -- see changed_fields().
            return _fail(
                "Some values were rejected.", "VALIDATION_ERROR",
                status.HTTP_400_BAD_REQUEST,
                errors=exc.message_dict if hasattr(exc, "message_dict") else {"__all__": exc.messages},
            )

        if not pending:
            return _ok(
                ServiceTierPricingSerializer(tier).data,
                changed=[], message="No changes to save.",
            )

        # A rate change without a reason is not auditable after the fact --
        # "who changed it" answers half the question operations actually asks.
        if any(f in PRICING_FIELDS for f in pending) and not reason:
            return _fail(
                "A reason is required when changing rates. It is recorded in the "
                "pricing history alongside the old and new values.",
                "REASON_REQUIRED", status.HTTP_400_BAD_REQUEST,
                fields=[f for f in pending if f in PRICING_FIELDS],
            )

        try:
            tier, rows = update_tier_pricing(
                tier, data, request.user,
                reason=reason,
                expected_updated_at=data.get("expected_updated_at"),
            )
        except PricingPermissionError as exc:
            return _fail(str(exc), "PRICING_FORBIDDEN", status.HTTP_403_FORBIDDEN,
                         fields=exc.fields)
        except PricingConflictError as exc:
            return _fail(str(exc), "TIER_CHANGED_ELSEWHERE", status.HTTP_409_CONFLICT,
                         current=ServiceTierPricingSerializer(self._tier(pk)).data)
        except DjangoValidationError as exc:
            return _fail(
                "Some values were rejected.", "VALIDATION_ERROR",
                status.HTTP_400_BAD_REQUEST,
                errors=exc.message_dict if hasattr(exc, "message_dict") else {"__all__": exc.messages},
            )

        return _ok(
            ServiceTierPricingSerializer(tier).data,
            changed=[r.field_name for r in rows],
            message="Rates updated. %s" % PRICE_LOCK_NOTICE,
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

        for field in ("icon", "description", "min_vehicle_class"):
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
        for field_name, attr in dec_fields.items():
            if field_name in data:
                try:
                    val = Decimal(str(data[field_name]))
                    if val < Decimal("0"):
                        return _fail(f"{field_name} cannot be negative.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)
                    old_val = getattr(config, attr)
                    if val != old_val:
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
                except (InvalidOperation, TypeError, ValueError):
                    return _fail(f"Invalid decimal for {field_name}.", "INVALID_VALUE", status.HTTP_400_BAD_REQUEST)

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

        if "is_active" in data:
            b_val = bool(data["is_active"])
            if b_val != config.is_active:
                setattr(config, "is_active", b_val)
                changes.append("is_active")

        if changes:
            config.save()

        return _ok(PackersMoversConfigSerializer(config).data, changed=changes, message="P&M pricing config updated successfully.")


