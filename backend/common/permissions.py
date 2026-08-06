"""
Reusable company-isolation permission classes. Pair with the querysets in
common/models.py and the view mixins in common/drf.py — permissions here
handle the "can this request touch this object at all" question;
common/drf.py's mixins handle "scope the list/create to the right company"
so the two together remove the need to hand-write either per view.
"""
from rest_framework import permissions


class HasCompany(permissions.BasePermission):
    """
    Blocks the request entirely if it has no resolved company.

    Use only on admin/employee-only endpoints. Never add this to a
    customer-facing or marketplace endpoint — those are expected to have
    request.company == None by design (a customer isn't tied to one
    vendor), and this permission would incorrectly lock them out.
    """
    message = "No company associated with this account."

    def has_permission(self, request, view):
        return bool(getattr(request, "company", None))


class IsCompanyMember(permissions.BasePermission):
    """
    Object-level permission: the object must belong to request.company.

    Works for both direct (`obj.company`) and indirect (`obj.org`, or a
    dotted chain like `obj.employee.company`) relationships — set
    `company_field` on the view to a dotted path when the FK isn't a
    top-level `company`/`org` attribute, e.g.:

        class SomeView(...):
            company_field = "employee__company"   # queryset-style, for get_queryset()
            # has_object_permission below walks it as obj.employee.company
    """
    message = "This object does not belong to your company."

    default_field_candidates = ("company", "org")

    def has_object_permission(self, request, view, obj):
        company = getattr(request, "company", None)
        if company is None:
            return False

        field_path = getattr(view, "company_field", None)
        if field_path:
            target = obj
            for part in field_path.split("__"):
                target = getattr(target, part, None)
                if target is None:
                    return False
            return target.pk == company.pk

        for candidate in self.default_field_candidates:
            if hasattr(obj, candidate):
                value = getattr(obj, candidate)
                return value is not None and value.pk == company.pk

        # Object has neither a configured company_field nor a
        # company/org attribute — fail closed rather than silently
        # allowing access.
        return False


class IsAdminOrManager(permissions.BasePermission):
    """Role gate — pairs with HasCompany/IsCompanyMember, doesn't replace them."""
    message = "This action requires an admin or manager role."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or user.is_staff:
            return True
        return str(getattr(user, "role", "")).lower() in {"admin", "manager"}


def validate_same_company(instance, company, field_name="related object", company_field="company"):
    """
    Raise a DRF ValidationError if `instance`'s company doesn't match
    `company`. Use inside a serializer's validate_<field>() (or validate())
    when a request references another company-scoped object by id — e.g.
    assigning a task to an employee_id, or an inventory_item_id to a work
    extension — to stop a company-A admin from referencing company-B's
    data just by guessing/enumerating ids.

        def validate_employee(self, employee):
            validate_same_company(employee, self.context["request"].company)
            return employee
    """
    from rest_framework import serializers as drf_serializers

    instance_company = getattr(instance, company_field, None)
    if instance_company is None or company is None or instance_company.pk != company.pk:
        raise drf_serializers.ValidationError(f"{field_name} does not belong to your company.")
