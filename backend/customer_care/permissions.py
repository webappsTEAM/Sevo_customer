from rest_framework import permissions
from .models import CareAgentProfile

CARE_ROLE_REFUND_LIMITS = {
    CareAgentProfile.CareRole.CARE_EXECUTIVE: 0,
    CareAgentProfile.CareRole.SENIOR_CARE: 2000,
    CareAgentProfile.CareRole.OPS_MANAGER: 10000,
    CareAgentProfile.CareRole.ADMIN: None,
}

def get_care_access(user):
    """
    Get the care role and refund limit for a user.
    Admin or Manager users get implicit top-tier care access (as Admin).
    Other employees must have an active CareAgentProfile in their company.
    Customers have no access.
    """
    if not user or not user.is_authenticated:
        return {"has_access": False, "tier": None, "refund_limit": 0}

    # Admin/Manager roles or superuser/staff status get implicit top-tier access
    if user.role in ["admin", "manager"] or user.is_superuser or user.is_staff:
        return {
            "has_access": True,
            "tier": "admin",
            "refund_limit": None,  # Unlimited
        }

    # Otherwise, check CareAgentProfile
    try:
        profile = CareAgentProfile.objects.filter(user=user, is_active=True).first()
        if profile:
            limit = profile.refund_approval_limit
            if limit is None:
                limit = CARE_ROLE_REFUND_LIMITS.get(profile.care_role, 0)
            return {
                "has_access": True,
                "tier": profile.care_role,
                "refund_limit": limit,
            }
    except Exception:
        pass

    return {"has_access": False, "tier": None, "refund_limit": 0}

class IsCareAgent(permissions.BasePermission):
    """
    Allows access only to care agents (either implicit or explicit).
    """
    def has_permission(self, request, view):
        access = get_care_access(request.user)
        return access["has_access"]

class CanAssignTickets(permissions.BasePermission):
    """
    Allows ticket assignment only to Senior Care, Ops Manager, and Admin roles.
    """
    def has_permission(self, request, view):
        access = get_care_access(request.user)
        if not access["has_access"]:
            return False
        return access["tier"] in ["senior_care", "ops_manager", "admin"]
