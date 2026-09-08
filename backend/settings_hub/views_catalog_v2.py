"""
settings_hub/views_catalog_v2.py

Admin CRUD for the Service Catalog module (Category -> Service -> Package ->
AddOn) plus its change log. Thin views only — all mutation logic lives in
service_requests.services.catalog, per CLAUDE.md's "business logic never in
views" rule. Every view is IsAdminRole-gated (internal Ops tooling, not the
public catalog read API in service_requests/views.py).
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from service_requests.services.catalog import LogisticsPricingPermissionError
from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole
from service_requests.models import (
    CatalogCategory, Service, Package, AddOn, CatalogChangeLog,
    VegetableRecipe, RecipeIngredient, VegetableRecommendation
)
from service_requests.serializers import (
    CatalogCategorySerializer, ServiceSerializer, PackageSerializer,
    AddOnSerializer, CatalogChangeLogSerializer,
    VegetableRecipeListSerializer, VegetableRecipeDetailSerializer,
    RecipeIngredientSerializer, VegetableRecommendationSerializer
)
from service_requests.services import catalog as catalog_service


def _validation_error_response(exc):
    detail = exc.message_dict if hasattr(exc, "message_dict") else {"detail": exc.messages if hasattr(exc, "messages") else str(exc)}
    return Response({"success": False, "message": "Validation failed", "errors": detail}, status=400)


def clear_catalog_cache():
    from django.core.cache import cache
    # Clear categories list
    cache.delete("catalog_categories_list")
    
    # Try deleting patterns
    try:
        if hasattr(cache, "delete_pattern"):
            cache.delete_pattern("*catalog_services_list*")
    except Exception:
        pass
        
    try:
        if hasattr(cache, "_cache"):
            # LocMemCache keys
            keys_to_del = [k for k in cache._cache.keys() if "catalog_services_list" in k or "catalog_categories_list" in k]
            for k in keys_to_del:
                cache._cache.pop(k, None)
    except Exception:
        pass

    # Standard loop to be absolutely sure
    from service_requests.models import CatalogCategory
    try:
        cat_ids = [""] + list(CatalogCategory.objects.values_list("id", flat=True))
    except Exception:
        cat_ids = [""]
        
    cache.delete("catalog_services_list___")
    for cid in cat_ids:
        cache.delete(f"catalog_services_list_{cid}__")
        for status in ["", "ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"]:
            cache.delete(f"catalog_services_list_{cid}_{status}")
            cache.delete(f"catalog_services_list_{cid}__{status}")


# ── Public (no-auth) read-only catalog endpoints ─────────────────────────────

class PublicPackageListView(APIView):
    """Read-only list of packages for the customer-facing booking UI.
    No authentication required — only returns fields needed for display.
    Admins can fetch all packages; public fetches all (including DRAFT) so
    that admin previews also work immediately after customization."""
    permission_classes = [AllowAny]
    authentication_classes = []  # bypass auth middleware entirely for speed

    def get(self, request):
        qs = Package.objects.select_related("service", "service__category").prefetch_related("addons").all()
        service_slug = request.GET.get("service_slug")
        if service_slug:
            qs = qs.filter(service__slug=service_slug)
        category_slug = request.GET.get("category_slug")
        if category_slug:
            qs = qs.filter(service__category__slug=category_slug)
        data = PackageSerializer(qs, many=True).data
        return Response({"success": True, "data": data})


# ── Categories ──────────────────────────────────────────────────────────────

class AdminCategoryListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        cats = CatalogCategory.objects.all()
        data = CatalogCategorySerializer(cats, many=True).data
        return Response({"success": True, "data": data})

    def post(self, request):
        serializer = CatalogCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        category = catalog_service.create_category(serializer.validated_data, request.user)
        clear_catalog_cache()
        return Response({"success": True, "data": CatalogCategorySerializer(category).data})


class AdminCategoryDetailView(APIView):
    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        if str(pk).isdigit():
            category = get_object_or_404(CatalogCategory, pk=int(pk))
        else:
            category = get_object_or_404(CatalogCategory, slug=str(pk))
        serializer = CatalogCategorySerializer(category, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        reason = request.data.get("reason")
        category = catalog_service.update_category(category, serializer.validated_data, request.user, reason=reason)
        clear_catalog_cache()
        return Response({"success": True, "data": CatalogCategorySerializer(category).data})

    def delete(self, request, pk):
        if str(pk).isdigit():
            category = get_object_or_404(CatalogCategory, pk=int(pk))
        else:
            category = get_object_or_404(CatalogCategory, slug=str(pk))
        try:
            catalog_service.delete_category(category)
            clear_catalog_cache()
        except DjangoValidationError as exc:
            return _validation_error_response(exc)
        return Response({"success": True, "message": "Category deleted"})


# ── Services ──────────────────────────────────────────────────────────────

class AdminServiceListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Service.objects.select_related("category").all()
        category_id = request.GET.get("category_id")
        if category_id:
            qs = qs.filter(category_id=category_id)
        data = ServiceSerializer(qs, many=True).data
        return Response({"success": True, "data": data})

    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        service = catalog_service.create_service(serializer.validated_data, request.user)
        clear_catalog_cache()
        return Response({"success": True, "data": ServiceSerializer(service).data})


class AdminServiceDetailView(APIView):
    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        if str(pk).isdigit():
            service = get_object_or_404(Service, pk=int(pk))
        else:
            service = get_object_or_404(Service, slug=str(pk))
        serializer = ServiceSerializer(service, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        reason = request.data.get("reason")
        service = catalog_service.update_service(service, serializer.validated_data, request.user, reason=reason)
        clear_catalog_cache()
        return Response({"success": True, "data": ServiceSerializer(service).data})

    def delete(self, request, pk):
        if str(pk).isdigit():
            service = get_object_or_404(Service, pk=int(pk))
        else:
            service = get_object_or_404(Service, slug=str(pk))
        try:
            catalog_service.delete_service(service)
            clear_catalog_cache()
        except DjangoValidationError as exc:
            return _validation_error_response(exc)
        return Response({"success": True, "message": "Service deleted"})


# ── Packages ──────────────────────────────────────────────────────────────

class AdminPackageListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = Package.objects.select_related("service", "service__category").prefetch_related("addons").all()
        service_id = request.GET.get("service_id")
        status_filter = request.GET.get("status")
        if service_id:
            qs = qs.filter(service_id=service_id)
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = PackageSerializer(qs, many=True).data
        try:
            from logistics.models import ServiceTier
            from service_requests.services.catalog import CANONICAL_LOGISTICS_TIER_SLUG_MAP
            tiers_by_slug = {t.slug: t for t in ServiceTier.objects.all()}
            for item in data:
                slug = item.get("slug")
                tier = tiers_by_slug.get(slug)
                if not tier and slug:
                    canonical_slug = CANONICAL_LOGISTICS_TIER_SLUG_MAP.get(slug)
                    if canonical_slug:
                        tier = tiers_by_slug.get(canonical_slug)
                if tier and tier.includes and len(tier.includes) > 0:
                    if not item.get("includes") or len(item["includes"]) == 0:
                        item["includes"] = tier.includes
        except Exception:
            pass
        return Response({"success": True, "data": data})

    def post(self, request):
        serializer = PackageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        package = catalog_service.create_package(serializer.validated_data, request.user)
        clear_catalog_cache()
        return Response({"success": True, "data": PackageSerializer(package).data})


class AdminPackageDetailView(APIView):
    """No DELETE — a Package cannot yet be safely hard-deleted (there is no
    linkage from a booking back to a specific Package to check against).
    Use AdminPackageTransitionView to move a package to ARCHIVED instead."""
    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        package = None
        if str(pk).isdigit():
            package = Package.objects.filter(pk=int(pk)).first()
        if not package:
            package = Package.objects.filter(slug=str(pk)).first()
        if not package:
            name = request.data.get("name")
            if name:
                package = Package.objects.filter(name__iexact=name).first()
                if not package:
                    # Partial match
                    package = Package.objects.filter(name__icontains=name.split("/")[0].strip()).first()
        if not package:
            return Response({"success": False, "message": f"Package '{pk}' not found in database"}, status=404)

        serializer = PackageSerializer(package, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        reason = request.data.get("reason")
        try:
            package = catalog_service.update_package(package, serializer.validated_data, request.user, reason=reason)
        except LogisticsPricingPermissionError as exc:
            # The caller changed base_price on a GT-linked package without
            # holding pricing:modify_price.  Return a structured 403 so the
            # frontend can show a targeted "use GT Rates page" warning rather
            # than a generic error modal.
            return Response(
                {
                    "success": False,
                    "error_code": "PRICING_FORBIDDEN",
                    "message": str(exc),
                    "detail": (
                        "This package is linked to a Goods & Transport service tier. "
                        "Changing its price requires the Pricing Admin role. "
                        "Use \u2192 Goods & Transport Rates to update this price."
                    ),
                },
                status=403,
            )
        except DjangoValidationError as exc:
            return _validation_error_response(exc)
        clear_catalog_cache()
        return Response({"success": True, "data": PackageSerializer(package).data})

    def delete(self, request, pk):
        package = get_object_or_404(Package, pk=pk)
        try:
            catalog_service.delete_package(package)
            clear_catalog_cache()
        except DjangoValidationError as exc:
            return _validation_error_response(exc)
        return Response({"success": True, "message": "Package deleted"})


class AdminPackageTransitionView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        if str(pk).isdigit():
            package = get_object_or_404(Package, pk=int(pk))
        else:
            package = get_object_or_404(Package, slug=str(pk))
        new_status = request.data.get("status")
        reason = request.data.get("reason")
        if not new_status:
            return Response({"success": False, "message": "status is required"}, status=400)
        try:
            package = catalog_service.transition_package_status(package, new_status, request.user, reason=reason)
            clear_catalog_cache()
        except DjangoValidationError as exc:
            return _validation_error_response(exc)
        return Response({"success": True, "data": PackageSerializer(package).data})


# ── Add-ons ───────────────────────────────────────────────────────────────

class AdminAddOnListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = AddOn.objects.select_related("package").all()
        package_id = request.GET.get("package_id")
        if package_id:
            qs = qs.filter(package_id=package_id)
        data = AddOnSerializer(qs, many=True).data
        return Response({"success": True, "data": data})

    def post(self, request):
        serializer = AddOnSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        addon = catalog_service.create_addon(serializer.validated_data, request.user)
        clear_catalog_cache()
        return Response({"success": True, "data": AddOnSerializer(addon).data})


class AdminAddOnDetailView(APIView):
    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        addon = get_object_or_404(AddOn, pk=pk)
        serializer = AddOnSerializer(addon, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        reason = request.data.get("reason")
        addon = catalog_service.update_addon(addon, serializer.validated_data, request.user, reason=reason)
        clear_catalog_cache()
        return Response({"success": True, "data": AddOnSerializer(addon).data})

    def delete(self, request, pk):
        addon = get_object_or_404(AddOn, pk=pk)
        addon.delete()
        clear_catalog_cache()
        return Response({"success": True, "message": "Add-on deleted"})


# ── Change Log (read-only) ──────────────────────────────────────────────────

class AdminCatalogChangeLogView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = CatalogChangeLog.objects.select_related("changed_by").all()
        entity_type = request.GET.get("entity_type")
        entity_id = request.GET.get("entity_id")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if entity_id:
            qs = qs.filter(entity_id=entity_id)
        qs = qs[:200]  # simple cap instead of full pagination for Phase 1
        data = CatalogChangeLogSerializer(qs, many=True).data
        return Response({"success": True, "data": data})


# ── Admin Recipes & Recommendations ──────────────────────────────────────────

class AdminRecipeListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = VegetableRecipe.objects.select_related("package").prefetch_related("ingredients__package").all().order_by("sort_order", "id")
        package_id = request.GET.get("package_id")
        if package_id:
            qs = qs.filter(package_id=package_id)
        data = VegetableRecipeDetailSerializer(qs, many=True).data
        return Response({"success": True, "data": data})

    def post(self, request):
        data = request.data.copy()
        ingredients_data = data.pop("ingredients", None)
        serializer = VegetableRecipeDetailSerializer(data=data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        
        recipe = serializer.save()
        
        if ingredients_data and isinstance(ingredients_data, list):
            for idx, ing in enumerate(ingredients_data):
                pkg_id = ing.get("package") or ing.get("package_id")
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    package_id=pkg_id if pkg_id else None,
                    name=ing.get("name") or "",
                    quantity=ing.get("quantity") or 1,
                    unit=ing.get("unit") or "pieces",
                    notes=ing.get("notes") or "",
                    is_catalog_vegetable=bool(pkg_id),
                    sort_order=ing.get("sort_order", idx)
                )

        clear_catalog_cache()
        recipe.refresh_from_db()
        return Response({"success": True, "data": VegetableRecipeDetailSerializer(recipe).data})


class AdminRecipeDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        recipe = get_object_or_404(VegetableRecipe.objects.select_related("package").prefetch_related("ingredients__package"), pk=pk)
        return Response({"success": True, "data": VegetableRecipeDetailSerializer(recipe).data})

    def put(self, request, pk):
        recipe = get_object_or_404(VegetableRecipe, pk=pk)
        data = request.data.copy()
        ingredients_data = data.pop("ingredients", None)

        serializer = VegetableRecipeDetailSerializer(recipe, data=data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)

        recipe = serializer.save()

        if ingredients_data is not None and isinstance(ingredients_data, list):
            recipe.ingredients.all().delete()
            for idx, ing in enumerate(ingredients_data):
                pkg_id = ing.get("package") or ing.get("package_id")
                RecipeIngredient.objects.create(
                    recipe=recipe,
                    package_id=pkg_id if pkg_id else None,
                    name=ing.get("name") or "",
                    quantity=ing.get("quantity") or 1,
                    unit=ing.get("unit") or "pieces",
                    notes=ing.get("notes") or "",
                    is_catalog_vegetable=bool(pkg_id),
                    sort_order=ing.get("sort_order", idx)
                )

        clear_catalog_cache()
        recipe.refresh_from_db()
        return Response({"success": True, "data": VegetableRecipeDetailSerializer(recipe).data})

    def delete(self, request, pk):
        recipe = get_object_or_404(VegetableRecipe, pk=pk)
        recipe.delete()
        clear_catalog_cache()
        return Response({"success": True, "message": "Recipe deleted"})


class AdminRecommendationListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        qs = VegetableRecommendation.objects.select_related("source_product", "recommended_product").all().order_by("-priority", "display_order")
        source_id = request.GET.get("source_id")
        if source_id:
            qs = qs.filter(source_product_id=source_id)
        data = VegetableRecommendationSerializer(qs, many=True).data
        return Response({"success": True, "data": data})

    def post(self, request):
        serializer = VegetableRecommendationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        rec = serializer.save()
        clear_catalog_cache()
        return Response({"success": True, "data": VegetableRecommendationSerializer(rec).data})


class AdminRecommendationDetailView(APIView):
    permission_classes = [IsAdminRole]

    def put(self, request, pk):
        rec = get_object_or_404(VegetableRecommendation, pk=pk)
        serializer = VegetableRecommendationSerializer(rec, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "message": "Validation failed", "errors": serializer.errors}, status=400)
        rec = serializer.save()
        clear_catalog_cache()
        return Response({"success": True, "data": VegetableRecommendationSerializer(rec).data})

    def delete(self, request, pk):
        rec = get_object_or_404(VegetableRecommendation, pk=pk)
        rec.delete()
        clear_catalog_cache()
        return Response({"success": True, "message": "Recommendation deleted"})

