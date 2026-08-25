"""
Audit Logging Service for CalTrack Platform.
Records privileged actions to PlatformAuditEvent.
"""
from customer_analytics.models import PlatformAuditEvent


def record_platform_audit(
    actor=None,
    action: str = "",
    module: str = "",
    object_type: str = "",
    object_id: str = "",
    before_state=None,
    after_state=None,
    reason: str = "",
    request=None,
    severity: str = "INFO"
):
    """
    Standard function to record a PlatformAuditEvent row.
    """
    ip_address = None
    user_agent = ""
    actor_role = ""

    if request:
        if not actor and hasattr(request, "user") and request.user.is_authenticated:
            actor = request.user
        ip_address = request.META.get("HTTP_X_FORWARDED_FOR") or request.META.get("REMOTE_ADDR")
        if ip_address and "," in ip_address:
            ip_address = ip_address.split(",")[0].strip()
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:500]

    if actor and hasattr(actor, "role"):
        actor_role = str(actor.role)

    try:
        return PlatformAuditEvent.objects.create(
            actor=actor if actor and getattr(actor, "is_authenticated", False) else None,
            actor_role=actor_role,
            action=action,
            module=module,
            object_type=object_type,
            object_id=str(object_id) if object_id is not None else "",
            before_state=before_state,
            after_state=after_state,
            reason=reason or "",
            ip_address=ip_address,
            user_agent=user_agent,
            severity=severity,
        )
    except Exception as e:
        print(f"[record_platform_audit] Error writing audit log: {e}")
        return None
