"""
DRF view-layer half of the CompanyScoped framework. Eliminates the
`.filter(company=request.company)` (or `.filter(org=request.company)`)
that was hand-written in nearly every admin/employee view before this
existed — see common/models.py for the queryset/manager half and
common/permissions.py for the permission classes these compose with.
"""
from rest_framework import generics, permissions, viewsets

from common.permissions import HasCompany, IsCompanyMember


class CompanyScopedQuerysetMixin:
    """
    Mixin for any DRF generic view/viewset backed by a company-scoped
    model. Add to a view alongside generics.GenericAPIView / ModelViewSet
    (that's what CompanyScopedAPIView / CompanyScopedViewSet below do).

    - get_queryset(): scoped to request.company automatically. Returns an
      empty queryset (not all rows, not a 500) if request.company is None,
      so this fails closed even if HasCompany was left off by mistake.
    - perform_create(): stamps request.company onto new objects, so
      "which company does this belong to" only has to be answered once,
      not in every view's create().

    Override `company_field` on the view for models using `org` instead
    of `company` (inventory, several payroll models).

    Does NOT require a `queryset` class attribute to be set — falls back
    to `self.get_serializer_class().Meta.model.objects.all()` if it isn't,
    so dropping this mixin into an existing view that only sets
    `serializer_class` (the common case in this codebase) just works.
    """
    company_field = "company"

    def get_queryset(self):
        qs = self._base_queryset()
        company = getattr(self.request, "company", None)
        if company is None:
            return qs.none()
        return qs.filter(**{self.company_field: company})

    def _base_queryset(self):
        if getattr(self, "queryset", None) is not None:
            return self.queryset.all()
        model = self.get_serializer_class().Meta.model
        return model.objects.all()

    def perform_create(self, serializer):
        company = getattr(self.request, "company", None)
        serializer.save(**{self.company_field: company})


class CompanyScopedAPIView(CompanyScopedQuerysetMixin, generics.GenericAPIView):
    """Base for a single-model admin/employee APIView. Requires auth + a resolved company."""
    permission_classes = [permissions.IsAuthenticated, HasCompany, IsCompanyMember]


class CompanyScopedViewSet(CompanyScopedQuerysetMixin, viewsets.ModelViewSet):
    """Base for a full CRUD admin/employee ViewSet, scoped end to end."""
    permission_classes = [permissions.IsAuthenticated, HasCompany, IsCompanyMember]


class CompanyScopedReadOnlyViewSet(CompanyScopedQuerysetMixin, viewsets.ReadOnlyModelViewSet):
    """Same scoping, for endpoints that should never accept writes."""
    permission_classes = [permissions.IsAuthenticated, HasCompany, IsCompanyMember]
