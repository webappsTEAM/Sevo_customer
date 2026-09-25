"""
Centralized Global Authorization & RBAC Engine for sevo.

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
    "time_slots": {
        "admin": [
            "view", "create", "edit", "delete",
            "view_time_slot_management", "create_time_slot_configuration",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "manager": [
            "view", "edit", "view_time_slot_management",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "catalog": [
            "view", "edit", "view_time_slot_management",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "support": ["view", "view_time_slot_management"],
        "finance": [],
    },
    "time_slot_management": {
        "admin": [
            "view", "create", "edit", "delete",
            "view_time_slot_management", "create_time_slot_configuration",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "manager": [
            "view", "edit", "view_time_slot_management",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "catalog": [
            "view", "edit", "view_time_slot_management",
            "edit_time_slot_configuration", "manage_weekly_schedule", "manage_date_override"
        ],
        "support": ["view", "view_time_slot_management"],
        "finance": [],
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

GLOBAL_RBAC_CACHE_KEY = "sevo_global_rbac_matrix"


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


_NON_SUPER_ROLES = {"admin", "manager", "support", "catalog", "finance", "customer", "employee"}


def is_super_admin(user) -> bool:
    """
    Single canonical check for Super Admin.
    Universal unrestricted global bypass.
    Does NOT require tenant or company context.

    Note: `is_superuser` alone does NOT grant Super Admin when the account
    has an explicit non-super role (e.g. "admin"). This mirrors the
    frontend's isSuperAdmin() guard (auth/authorization.js) and is
    deliberate defense-in-depth: this codebase previously had (now
    removed) code paths that force-set is_superuser=True on plain Admin
    accounts, and an unconditional bypass here would have silently
    honored that instead of catching it. A genuine Django superuser
    account with no assigned role (role is empty/unset) still bypasses
    normally, same as always.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    role = str(getattr(user, "role", "")).lower()
    if role in {"super_admin", "superadmin"}:
        return True
    if getattr(user, "is_superuser", False) and role not in _NON_SUPER_ROLES:
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


def get_effective_module_actions(user, module: str) -> list:
    """
    Single source of truth for "what actions can this user perform on this
    module", combining the role-based Global RBAC matrix with a per-user
    override on User.custom_permissions (set by a Super Admin via
    Platform > Users — see platform_control.views.PlatformUserDetailView /
    PlatformUserInviteView).

    Override semantics:
      - If the user has NEVER been through Customize Access (custom_permissions
        is None/{} -- the common case for every account that predates this
        feature, or any account a Super Admin invited without touching the
        permission checklist), every module falls back to that user's role
        default, unchanged -- exactly the original behavior, so there is
        zero regression for existing accounts.
      - If the user HAS been through Customize Access (custom_permissions is
        a non-empty dict -- e.g. Admin 1 was only ever given {"catalog":
        [...]}), custom_permissions becomes a COMPLETE allowlist, not a
        sparse override on top of the role default. A module that IS a key
        gets exactly that list (an empty list is an explicit "No Access").
        A module that is NOT a key gets [] -- no fallback to the role
        default. Without this, an Admin the Super Admin restricted to only
        "Catalog" would silently keep every other module the base "admin"
        role grants by default (marketing, cms, inventory, users export,
        etc.), which contradicts both the Invite Admin UI's own promise
        ("A module left fully unchecked means no access") and the
        "Admin 1 can access only what was assigned" requirement this
        feature exists for.

    Used by both `can()` below and UserSerializer.get_permissions() so the
    frontend's already-existing permission UI (auth/authorization.js) and
    the backend's actual enforcement never disagree.
    """
    if not user or not getattr(user, "is_authenticated", False):
        return []

    custom = getattr(user, "custom_permissions", None) or {}
    has_been_customized = isinstance(custom, dict) and len(custom) > 0

    if has_been_customized:
        if module in custom:
            value = custom.get(module)
            return value if isinstance(value, list) else []
        # Customize Access has been used for this account and this module
        # was left unchecked -- that's an explicit "no access", not "fall
        # back to whatever the role would normally get".
        return []

    role = str(getattr(user, "role", "customer")).lower()
    rbac_matrix = get_global_rbac_permissions()
    module_perms = rbac_matrix.get(module, {})
    role_actions = list(module_perms.get(role, []))

    # Specialized care agent role resolution — only reached when this
    # module has no explicit per-user override (see docstring above).
    # Merged with (not replacing) the role's own actions, matching the
    # original behavior where this only ever added view/reply/export on
    # top of whatever the role could already do.
    if module in ("customer_care", "complaints", "customers"):
        try:
            from customer_care.permissions import get_care_access
            care_access = get_care_access(user)
            if care_access.get("has_access"):
                for extra in ("view", "reply", "export"):
                    if extra not in role_actions:
                        role_actions.append(extra)
        except Exception:
            pass

    return role_actions


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

    return action in get_effective_module_actions(user, module)


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
