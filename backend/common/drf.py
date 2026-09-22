"""
DRF View Mixins and Base Classes for Global Visibility.

Replaces old CompanyScopedQuerysetMixin with VisibilityQuerysetMixin:
- get_queryset(): applies visible_to(request.user, module)
- perform_create(): saves model instance cleanly without forcing tenant isolation
"""
from rest_framework import generics, permissions, viewsets
from accounts.permissions import is_super_admin, is_admin_role, RequireModuleAccess


class VisibilityQuerysetMixin:
    """
    Mixin for DRF generic views/viewsets to enforce row-level visibility.
    """
    module_name = None

    def get_queryset(self):
        qs = self._base_queryset()
        user = getattr(self.request, "user", None)
        if hasattr(qs, "visible_to"):
            return qs.visible_to(user, module=self.module_name)
        return qs

    def _base_queryset(self):
        if getattr(self, "queryset", None) is not None:
            return self.queryset.all()
        model = self.get_serializer_class().Meta.model
        return model.objects.all()

    def perform_create(self, serializer):
        serializer.save()


# Backward-compatible alias
CompanyScopedQuerysetMixin = VisibilityQuerysetMixin


class StandardAPIView(VisibilityQuerysetMixin, generics.GenericAPIView):
    """Base for single-model APIView with standard authentication."""
    permission_classes = [permissions.IsAuthenticated]


# Backward-compatible alias
CompanyScopedAPIView = StandardAPIView


class StandardViewSet(VisibilityQuerysetMixin, viewsets.ModelViewSet):
    """Base for full CRUD ViewSet with standard authentication."""
    permission_classes: list = [permissions.IsAuthenticated]


# Backward-compatible alias
CompanyScopedViewSet = StandardViewSet


class StandardReadOnlyViewSet(VisibilityQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """Base for read-only ViewSet with standard authentication."""
    permission_classes: list = [permissions.IsAuthenticated]


# Backward-compatible alias
CompanyScopedReadOnlyViewSet = StandardReadOnlyViewSet
