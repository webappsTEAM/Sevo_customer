"""
Reusable row-level company isolation — the ORM half of the CompanyScoped
framework. See common/MODEL_CLASSIFICATION.md for which models this applies
to, and common/drf.py / common/permissions.py for the DRF-facing half.

Design note — why existing models don't all inherit CompanyScopedModel:
Most company-owned models in this codebase already carry their own
`company` (or, in inventory/payroll, `org`) ForeignKey, added long before
this framework existed. Retrofitting them to inherit CompanyScopedModel
would mean either renaming `org` -> `company` everywhere (a real, riskier
migration touching live data) or ending up with a duplicate FK column.
Neither is "required for company isolation" — the isolation guarantee
comes from the manager/queryset, not from which field name is used or
whether the field is inherited vs. declared directly. So:

  - NEW models that don't have a company FK yet: inherit CompanyScopedModel.
  - EXISTING models: keep their own field, just swap `objects` to
    CompanyScopedManager(company_field=...) — zero schema change.

Both paths get identical for_company() / visible_to() / active() methods.
"""
from django.db import models


class CompanyScopedQuerySet(models.QuerySet):
    """
    Queryset for any model with a FK to companies.Company. The FK's field
    name is configurable via `company_field` (default "company") so this
    works unmodified for the `org`-named fields in inventory/payroll.
    """

    company_field = "company"

    def for_company(self, company):
        """
        Rows belonging to exactly one company. `company` may be a Company
        instance, a pk, or None — None always returns an empty queryset
        rather than silently returning everything, since an empty/unknown
        company is never a valid reason to see all companies' data.
        """
        if company is None:
            return self.none()
        return self.filter(**{self.company_field: company})

    def visible_to(self, user):
        """
        Rows visible to `user`, matching the platform's role model:
          - superuser                       -> everything
          - staff user with a company        -> that company's rows only
          - anyone else (no company, e.g. a
            customer, or an unauthenticated
            request)                         -> nothing

        Mixed models (bookings, refunds, complaints — see
        MODEL_CLASSIFICATION.md) should NOT rely on visible_to() for their
        customer-facing querysets; filter by the customer field directly
        instead. visible_to() is for the admin/employee side only.
        """
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()
        if getattr(user, "is_superuser", False):
            return self
        company = getattr(user, "company", None)
        if company is None:
            return self.none()
        return self.for_company(company)

    def active(self):
        """
        Rows not marked inactive, for models that have an `is_active`
        field. No-op passthrough for models that don't — lets callers use
        `Model.objects.for_company(c).active()` generically without
        needing to know whether the model supports it.
        """
        if any(f.name == "is_active" for f in self.model._meta.get_fields()):
            return self.filter(is_active=True)
        return self


def CompanyScopedManager(company_field: str = "company"):
    """
    Manager factory bound to a given company FK field name.

        class InventoryItem(models.Model):
            org = models.ForeignKey(Company, ...)
            objects = CompanyScopedManager(company_field="org")

        InventoryItem.objects.for_company(company)
        InventoryItem.objects.visible_to(request.user)
        InventoryItem.objects.for_company(company).active()

    A plain `CompanyScopedManager()` (default company_field="company") is
    also what CompanyScopedModel below uses.
    """
    queryset_cls = type(
        f"CompanyScopedQuerySet_{company_field}",
        (CompanyScopedQuerySet,),
        {"company_field": company_field},
    )
    return models.Manager.from_queryset(queryset_cls)()


class CompanyScopedModel(models.Model):
    """
    Abstract base for NEW models directly owned by exactly one Company.

    Do not add this to a model that already has its own company/org FK —
    see the module docstring. Do not add this to Global or Mixed models
    (see MODEL_CLASSIFICATION.md) — a customer-facing or lookup model
    inheriting this would silently make every row require a company,
    which is wrong for those models by design.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)s_set",
    )

    objects = CompanyScopedManager()

    class Meta:
        abstract = True
