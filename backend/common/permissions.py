"""
Common Permission Classes for DRF Views.

Tenant-based authorization classes (HasCompany, IsCompanyMember) have been
completely removed. Authorization is now handled uniformly through Global RBAC
via accounts.permissions.RequireModuleAccess and accounts.permissions.is_super_admin.
"""
from rest_framework import permissions
from accounts.permissions import is_super_admin, is_admin_role, can, IsSuperAdmin, IsAdminRole, RequireModuleAccess


class IsAdminOrManager(permissions.BasePermission):
    """Role gate for admin/manager operations."""
    message = "This action requires an admin or manager role."

    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        return is_admin_role(user)
