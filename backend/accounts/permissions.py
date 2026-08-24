"""
Centralized Global Authorization & RBAC Engine for CalTrack.

Architectural Principles:
1. is_super_admin(user) is the single canonical global bypass across all modules and records.
2. All non-super-admin users are evaluated strictly through Global RBAC via can(user, module, action).
3. Authorization is completely independent of company, tenant, or request.company.
4. Visibility (row-level data access) is decoupled from authorization and handled via VisibilityQuerySet.
"""
from rest_framework.permissions import BasePermission
from django.core.cache import cache

# Global list of all customer & administrative application modules
GLOBAL_MODULES = [
    "dashboard", "users", "customers", "bookings",
    "service_requests", "dispatch", "live_tracking",
    "service_zones", "catalog", "pricing", "marketing", "coupons",
    "customer_care", "complaints", "reviews", "payments", "refunds",
    "finance", "invoices", "inventory", "reports", "analytics",
    "cms", "notifications", "security", "audit", "rbac",
    "settings", "system_settings", "feature_flags", "integrations", "api", "webhooks"
]

# Canonical Global RBAC Permission Matrix for standard administrative roles
DEFAULT_GLOBAL_RBAC = {
    "dashboard": {
        "admin": ["view", "export"],
        "manager": ["view", "export"],
        "support": ["view"],
        "catalog": ["view"],
        "finance": ["view", "export"],
    },
    "customers": {
        "admin": ["view", "create", "edit", "delete", "export", "suspend", "reactivate", "vip", "flag", "blacklist", "merge", "unmerge", "add_note", "manage_addresses", "book_on_behalf"],
        "manager": ["view", "create", "edit", "export", "suspend", "reactivate", "vip", "flag", "add_note", "manage_addresses", "book_on_behalf"],
        "support": ["view", "create", "edit", "export", "vip", "add_note", "manage_addresses", "book_on_behalf"],
        "catalog": [],
        "finance": ["view", "export"],
    },
    "bookings": {
        "admin": ["view", "create", "edit", "assign", "reassign", "reschedule", "cancel", "refund", "approve", "override", "export"],
        "manager": ["view", "create", "edit", "assign", "reassign", "reschedule", "cancel", "approve", "export"],
        "support": ["view", "create", "edit", "reschedule", "cancel"],
        "catalog": ["view"],
        "finance": ["view", "refund", "export"],
    },
    "service_requests": {
        "admin": ["view", "create", "edit", "assign", "reassign", "reschedule", "cancel", "refund", "approve", "override", "export"],
        "manager": ["view", "create", "edit", "assign", "reassign", "reschedule", "cancel", "approve", "export"],
        "support": ["view", "create", "edit", "reschedule", "cancel"],
        "catalog": ["view"],
        "finance": ["view", "refund", "export"],
    },
    "users": {
        "admin": ["view", "create", "edit", "suspend", "reactivate", "force_logout", "export"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "dispatch": {
        "admin": ["view", "assign", "reassign", "emergency_override", "export"],
        "manager": ["view", "assign", "reassign", "export"],
        "support": ["view"],
        "catalog": [],
        "finance": [],
    },
    "live_tracking": {
        "admin": ["view", "assign", "reassign", "emergency_override", "export"],
        "manager": ["view", "assign", "reassign", "export"],
        "support": ["view"],
        "catalog": [],
        "finance": [],
    },
    "service_zones": {
        "admin": ["view", "create", "edit", "delete", "toggle_active"],
        "manager": ["view", "edit"],
        "support": ["view"],
        "catalog": ["view"],
        "finance": [],
    },
    "catalog": {
        "admin": ["view", "create", "edit", "delete", "publish", "modify_price", "export"],
        "manager": ["view", "create", "edit"],
        "catalog": ["view", "create", "edit", "delete", "publish", "modify_price", "export"],
        "support": ["view"],
        "finance": ["view"],
    },
    "pricing": {
        "admin": ["view", "create", "edit", "delete", "publish", "modify_price", "export"],
        "manager": ["view", "edit"],
        "catalog": ["view", "create", "edit", "publish", "modify_price", "export"],
        "support": ["view"],
        "finance": ["view", "edit"],
    },
    "marketing": {
        "admin": ["view", "create", "edit", "delete", "publish", "export"],
        "manager": ["view", "create", "edit", "export"],
        "catalog": ["view", "create", "edit"],
        "support": ["view"],
        "finance": ["view"],
    },
    "coupons": {
        "admin": ["view", "create", "edit", "delete", "publish", "export"],
        "manager": ["view", "create", "edit", "export"],
        "catalog": ["view", "create", "edit"],
        "support": ["view"],
        "finance": ["view"],
    },
    "customer_care": {
        "admin": ["view", "reply", "escalate", "resolve", "issue_compensation", "refund", "export"],
        "manager": ["view", "reply", "escalate", "resolve", "export"],
        "support": ["view", "reply", "escalate", "resolve", "export"],
        "catalog": [],
        "finance": ["view"],
    },
    "complaints": {
        "admin": ["view", "reply", "escalate", "resolve", "issue_compensation", "refund", "export"],
        "manager": ["view", "reply", "escalate", "resolve", "export"],
        "support": ["view", "reply", "escalate", "resolve", "export"],
        "catalog": [],
        "finance": ["view"],
    },
    "reviews": {
        "admin": ["view", "reply", "delete", "feature", "export"],
        "manager": ["view", "reply", "export"],
        "support": ["view", "reply"],
        "catalog": ["view"],
        "finance": [],
    },
    "payments": {
        "admin": ["view", "export", "adjust", "record_offline_payment"],
        "manager": ["view", "export"],
        "finance": ["view", "export", "adjust", "record_offline_payment"],
        "support": ["view"],
        "catalog": [],
    },
    "refunds": {
        "admin": ["view", "approve", "reject", "export"],
        "manager": ["view", "export"],
        "finance": ["view", "approve", "reject", "export"],
        "support": ["view"],
        "catalog": [],
    },
    "finance": {
        "admin": ["view", "export", "approve", "refund", "adjust", "manage_invoices", "record_offline_payment"],
        "manager": ["view", "export"],
        "finance": ["view", "export", "approve", "refund", "adjust", "manage_invoices", "record_offline_payment"],
        "support": ["view"],
        "catalog": [],
    },
    "invoices": {
        "admin": ["view", "create", "edit", "export", "send"],
        "manager": ["view", "export"],
        "finance": ["view", "create", "edit", "export", "send"],
        "support": ["view"],
        "catalog": [],
    },
    "inventory": {
        "admin": ["view", "create", "edit", "delete", "adjust_stock", "transfer", "export"],
        "manager": ["view", "adjust_stock", "transfer", "export"],
        "finance": ["view", "export"],
        "catalog": ["view"],
        "support": ["view"],
    },
    "reports": {
        "admin": ["view", "export_financials", "export_operational", "schedule"],
        "manager": ["view", "export_operational"],
        "finance": ["view", "export_financials"],
        "catalog": ["view"],
        "support": [],
    },
    "analytics": {
        "admin": ["view", "export_financials", "export_operational"],
        "manager": ["view", "export_operational"],
        "finance": ["view", "export_financials"],
        "catalog": ["view"],
        "support": [],
    },
    "cms": {
        "admin": ["view", "edit_banners", "edit_sections", "publish_live"],
        "manager": ["view", "edit_sections"],
        "catalog": ["view", "edit_sections"],
        "support": [],
        "finance": [],
    },
    "notifications": {
        "admin": ["view", "send_broadcast", "configure_templates"],
        "manager": ["view"],
        "support": ["view"],
        "catalog": [],
        "finance": [],
    },
    "security": {
        "admin": ["view", "force_logout", "revoke_tokens", "configure_mfa"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "audit": {
        "admin": ["view", "export_logs"],
        "manager": [],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "rbac": {
        "admin": ["view", "edit_rbac"],
        "manager": [],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "settings": {
        "admin": ["view", "modify"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "system_settings": {
        "admin": ["view", "modify"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "feature_flags": {
        "admin": ["view", "toggle_flags"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "integrations": {
        "admin": ["view", "edit", "configure"],
        "manager": ["view"],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "api": {
        "admin": ["view", "edit", "generate_tokens"],
        "manager": [],
        "support": [],
        "catalog": [],
        "finance": [],
    },
    "webhooks": {
        "admin": ["view", "create", "edit", "delete", "test"],
        "manager": [],
        "support": [],
        "catalog": [],
        "finance": [],
    },
}

GLOBAL_RBAC_CACHE_KEY = "caltrack_global_rbac_matrix"


def get_global_rbac_permissions() -> dict:
    """Returns the effective global RBAC matrix from cache, DB, or default fallback."""
    cached = cache.get(GLOBAL_RBAC_CACHE_KEY)
    if cached and isinstance(cached, dict):
        return cached

    # Try loading persisted global RBAC matrix from HomePageConfig or default
    try:
        from settings_hub.models import HomePageConfig
        cfg = HomePageConfig.objects.filter(key="global_rbac").first()
        if cfg and cfg.config_data and isinstance(cfg.config_data, dict):
            cache.set(GLOBAL_RBAC_CACHE_KEY, cfg.config_data, timeout=3600)
            return cfg.config_data
    except Exception:
        pass

    return DEFAULT_GLOBAL_RBAC


def set_global_rbac_permissions(matrix: dict) -> None:
    """Persists updated global RBAC matrix."""
    from settings_hub.models import HomePageConfig
    HomePageConfig.objects.update_or_create(
        key="global_rbac",
        defaults={"config_data": matrix}
    )
    cache.set(GLOBAL_RBAC_CACHE_KEY, matrix, timeout=3600)


def is_super_admin(user) -> bool:
    """
    Single canonical check for Super Admin.
    Universal unrestricted global bypass.
    Does NOT require tenant or company context.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    role = str(getattr(user, "role", "")).lower()
    if role in {"super_admin", "superadmin"}:
        return True
    if getattr(user, "is_superuser", False) and role not in {"admin", "manager", "support", "catalog", "finance", "employee", "customer"}:
        return True
    return False


def is_admin_role(user) -> bool:
    """
    Checks if user is Super Admin, Admin, Manager, Operations, or Staff.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if is_super_admin(user) or getattr(user, "is_staff", False):
        return True
    role = str(getattr(user, "role", "")).lower()
    return role in {"admin", "manager", "operations", "catalog", "finance", "support"}


def can(user, module: str, action: str) -> bool:
    """
    Central permission evaluator for all roles and domain actions.
    Independent of company or tenant context.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not getattr(user, "is_active", True):
        return False

    # Super Admin has unconditional universal bypass
    if is_super_admin(user):
        return True

    role = str(getattr(user, "role", "customer")).lower()

    # Specialized care agent role resolution
    if module in ("customer_care", "complaints", "customers") and action in ("view", "reply", "export"):
        try:
            from customer_care.permissions import get_care_access
            care_access = get_care_access(user)
            if care_access.get("has_access"):
                return True
        except Exception:
            pass

    rbac_matrix = get_global_rbac_permissions()
    module_perms = rbac_matrix.get(module, {})
    role_actions = module_perms.get(role, [])

    return action in role_actions


class IsSuperAdmin(BasePermission):
    """Restricts access strictly to Super Admin."""
    def has_permission(self, request, view):
        return is_super_admin(getattr(request, "user", None))


class IsAdminRole(BasePermission):
    """Allows access for admin and manager roles, as well as superusers and staff."""
    def has_permission(self, request, view):
        return is_admin_role(getattr(request, "user", None))


class IsEmployeeRole(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated and getattr(user, "role", None) == "employee")


class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, "user", None)
        return bool(user and user.is_authenticated)


def RequireModuleAccess(module_name: str, required_action: str):
    """
    DRF Permission class evaluating can(user, module, action).
    """
    class _RequireModuleAccess(BasePermission):
        def has_permission(self, request, view):
            return can(getattr(request, "user", None), module_name, required_action)

        def __call__(self):
            return self

    return _RequireModuleAccess()
