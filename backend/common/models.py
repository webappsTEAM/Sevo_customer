"""
Global Row-Level Visibility and QuerySet Architecture for sevo.

Separates authorization from data visibility:
- is_super_admin(user) has universal global visibility across all rows.
- Non-super-admin users have their record visibility determined strictly
  by real domain relationships (customer ownership, technician assignment,
  support queue, finance scope) via apply_visibility_rules(user).
- Company exists strictly as business data (e.g. for_company(company)),
  never as an authorization gate.
"""
from django.db import models
from django.db.models import Q
from accounts.models import User
from accounts.permissions import is_super_admin, can


class VisibilityQuerySet(models.QuerySet):
    """
    Unified QuerySet providing domain-specific visibility filtering.
    """
    company_field = "company"

    def for_company(self, company):
        """
        Business-data query helper to filter records belonging to an explicit Company entity.
        """
        if company is None:
            return self.none()
        return self.filter(**{self.company_field: company})

    def visible_to(self, user, module: str = None):
        """
        Filters queryset to rows visible to `user` based on authorization and domain relationships.
        """
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()

        # Super Admin has unrestricted global visibility
        if is_super_admin(user):
            return self

        # If module is provided, check that user has view permission
        if module and not can(user, module, "view"):
            return self.none()

        return self.apply_visibility_rules(user)

    def apply_visibility_rules(self, user):
        """
        Enforces domain-specific row-level visibility matching actual model relations.
        Uses centralized User.Role constants.
        """
        role = getattr(user, "role", User.Role.CUSTOMER)
        model = self.model
        model_name = model._meta.model_name

        # 1. Customers see only their own data
        if role == User.Role.CUSTOMER:
            filters = Q()
            matched = False
            if hasattr(model, "customer"):
                filters |= Q(customer=user)
                matched = True
            if hasattr(model, "user"):
                filters |= Q(user=user)
                matched = True
            if hasattr(model, "raised_by"):
                filters |= Q(raised_by=user)
                matched = True
            return self.filter(filters) if matched else self.none()

        # 2. Field Employees / Technicians see assigned jobs, attendance, and operational tasks
        if role == getattr(User.Role, "EMPLOYEE", "employee"):
            filters = Q()
            matched = False
            if hasattr(model, "assigned_technician"):
                filters |= Q(assigned_technician=user)
                matched = True
            if hasattr(model, "assigned_employee"):
                filters |= Q(assigned_employee__user=user)
                matched = True
            if hasattr(model, "employee"):
                filters |= Q(employee=user)
                try:
                    filters |= Q(employee__user=user)
                except Exception:
                    pass
                matched = True
            if hasattr(model, "technician"):
                filters |= Q(technician=user)
                matched = True
            if hasattr(model, "user") and model_name in ["attendance", "employeeprofile", "employee", "customerloginevent"]:
                filters |= Q(user=user)
                matched = True
            return self.filter(filters) if matched else self.none()

        # 3. Support / Care Agents follow real customer care queue and customer support scopes
        if role == User.Role.SUPPORT:
            try:
                from customer_care.models import CareAgentProfile
                profile = CareAgentProfile.objects.filter(user=user).first()
                if profile and model_name == "customercareticket":
                    return self.filter(
                        Q(assigned_agent=user) |
                        Q(tier=profile.tier, assigned_agent__isnull=True)
                    )
            except Exception:
                pass
            if hasattr(model, "assigned_agent"):
                return self.filter(Q(assigned_agent=user) | Q(assigned_agent__isnull=True))
            return self

        # 4. Catalog Managers see only catalog, pricing, services, and category domains
        if role == getattr(User.Role, "CATALOG", "catalog"):
            if model_name in ["catalogcategory", "service", "package", "addon", "coupon", "offer"]:
                return self
            return self.none()

        # 5. Finance sees payments, bookings, invoices, refunds, coupons, and ledger
        if role == getattr(User.Role, "FINANCE", "finance"):
            if model_name in ["servicerequest", "invoice", "refundrequest", "payment", "coupon", "couponusage"]:
                return self
            return self.none()

        # 6. Managers & Admins follow operational business visibility
        return self

    def active(self):
        """Filters active records for models supporting is_active."""
        if any(f.name == "is_active" for f in self.model._meta.get_fields()):
            return self.filter(is_active=True)
        return self


# Backward-compatible alias for existing imports
CompanyScopedQuerySet = VisibilityQuerySet


def VisibilityManager(company_field: str = "company"):
    """Manager factory bound to a VisibilityQuerySet."""
    queryset_cls = type(
        f"VisibilityQuerySet_{company_field}",
        (VisibilityQuerySet,),
        {"company_field": company_field},
    )
    return models.Manager.from_queryset(queryset_cls)()


# Backward-compatible alias
CompanyScopedManager = VisibilityManager


class VisibilityModel(models.Model):
    """
    Abstract base model carrying a business company relationship and VisibilityManager.
    """
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="%(app_label)s_%(class)s_set",
    )

    objects = VisibilityManager()

    class Meta:
        abstract = True


# Backward-compatible alias
CompanyScopedModel = VisibilityModel
