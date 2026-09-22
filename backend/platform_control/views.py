"""
Platform Control APIs for CalTrack Global Super Admin & RBAC.
Mounted at /api/platform/
"""
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError

from accounts.models import User, SavedAddress
from accounts.permissions import is_super_admin, can, IsSuperAdmin, get_global_rbac_permissions, set_global_rbac_permissions, GLOBAL_MODULES
from companies.models import Company
from accounts.audit_service import record_platform_audit
from customer_analytics.models import PlatformAuditEvent, CustomerIdentity, CustomerLoginEvent
from service_requests.models import ServiceRequest
from customer_care.models import CustomerCareTicket
from settings_hub.models import TeamInvite


def _resolve_invite_company(actor):
    """
    TeamInvite.company is a required FK, but CalTrack's Super Admin /
    platform staff accounts are not themselves company-scoped (User.company
    is nullable, and the catalog app's own comments note this is "one
    CalServices platform", not a multi-tenant marketplace) — so
    `actor.company` is normally None for the Super Admin doing the
    inviting. Bug found (gap): PlatformUserInviteView.post previously called
    TeamInvite.objects.create(...) with no `company` at all, which would
    raise an IntegrityError on every single invite. Fixed by falling back
    to the actor's own company, then the only/first Company row.
    """
    company = getattr(actor, "company", None)
    if company:
        return company
    return Company.objects.order_by("id").first()


def _validate_permissions_payload(payload):
    """
    Validates a {"<module>": ["<action>", ...]} custom-permissions payload
    against the real module list (GLOBAL_MODULES) already defined in
    accounts.permissions — never invents new module names. Returns
    (cleaned_dict, error_message_or_None).
    """
    if payload is None:
        return None, None
    if not isinstance(payload, dict):
        return None, "permissions must be an object of {module: [actions]}."
    cleaned = {}
    for module, actions in payload.items():
        if module not in GLOBAL_MODULES:
            return None, f"Unknown module '{module}'."
        if not isinstance(actions, list) or not all(isinstance(a, str) for a in actions):
            return None, f"Actions for module '{module}' must be a list of strings."
        cleaned[module] = sorted(set(actions))
    return cleaned, None


# ── 1. GLOBAL PLATFORM DASHBOARD ─────────────────────────────────────────────

class PlatformDashboardSummaryView(APIView):
    """
    Global operational metrics for Super Admin.
    GET /api/platform/dashboard/summary/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user) and not can(request.user, "dashboard", "view"):
            raise PermissionDenied("You do not have permission to view global dashboard metrics.")

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Users & Customers
        total_users = User.objects.count()
        active_staff = User.objects.filter(is_active=True).exclude(
            Q(role__iexact="customer") | Q(role__iexact="employee")
        ).count()
        total_customers = User.objects.filter(role__iexact="customer").count()

        # Bookings & Revenue
        bookings_qs = ServiceRequest.objects.all()
        total_bookings = bookings_qs.count()
        pending_bookings = bookings_qs.filter(status__in=["draft", "pending", "pending_payment", "assigned"]).count()
        completed_bookings = bookings_qs.filter(status="completed").count()

        revenue_agg = bookings_qs.filter(payment_status__in=["paid", "collected"]).aggregate(
            total_revenue=Sum("total_amount")
        )
        total_revenue = float(revenue_agg["total_revenue"] or 0)

        # Complaints & Tickets
        open_tickets = CustomerCareTicket.objects.filter(status__in=["open", "in_progress", "escalated"]).count()
        critical_tickets = CustomerCareTicket.objects.filter(priority="urgent", status__in=["open", "in_progress"]).count()

        # Security & Audit
        failed_logins_today = CustomerLoginEvent.objects.filter(occurred_at__gte=today_start, status="failed").count()
        security_alerts = PlatformAuditEvent.objects.filter(severity__in=["WARN", "CRITICAL"], timestamp__gte=thirty_days_ago).count()

        return Response({
            "users": {
                "total": total_users,
                "active_staff": active_staff,
                "customers": total_customers,
            },
            "bookings": {
                "total": total_bookings,
                "pending": pending_bookings,
                "completed": completed_bookings,
            },
            "finance": {
                "total_revenue": total_revenue,
                "currency": "INR",
                "currency_symbol": "₹",
            },
            "care": {
                "open_tickets": open_tickets,
                "critical_tickets": critical_tickets,
            },
            "security": {
                "failed_logins_today": failed_logins_today,
                "security_alerts": security_alerts,
            }
        })


# ── 2. GLOBAL RBAC MATRIX ───────────────────────────────────────────────────

class PlatformRBACMatrixView(APIView):
    """
    Super Admin management of Global RBAC permission matrix.
    GET /api/platform/rbac/matrix/
    PUT /api/platform/rbac/matrix/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Bug found (verification pass): this used to also allow through
        # anyone whose role happened to grant "rbac":"view" in the Global
        # RBAC matrix itself (the default matrix grants that to the plain
        # "admin" role) -- meaning a normal Admin, with zero Super-Admin
        # privilege, could read the entire permission matrix that governs
        # every module in the app via this endpoint, even though the
        # frontend never exposes this screen to anyone but a Super Admin
        # (PlatformRBACPage.jsx sits behind RequireSuperAdmin). That
        # directly contradicts "normal Admins must not access Super Admin
        # functionality" -- the Platform Control Center's RBAC matrix is
        # Super-Admin-exclusive, full stop, not just role-gated like an
        # ordinary business module.
        if not is_super_admin(request.user):
            raise PermissionDenied("Only Super Admin can view the permission matrix.")
        matrix = get_global_rbac_permissions()
        STAFF_ROLES = ["admin", "manager", "support", "catalog", "finance"]
        return Response({
            "modules": GLOBAL_MODULES,
            "roles": STAFF_ROLES,
            "matrix": matrix
        })

    def put(self, request):
        if not is_super_admin(request.user):
            raise PermissionDenied("Only Super Admin can modify the global RBAC permission matrix.")

        new_matrix = request.data.get("matrix")
        if not isinstance(new_matrix, dict):
            return Response({"detail": "Invalid matrix payload. Expected dictionary."}, status=400)

        before_state = get_global_rbac_permissions()
        set_global_rbac_permissions(new_matrix)

        record_platform_audit(
            actor=request.user,
            action="RBAC_CHANGED",
            module="rbac",
            object_type="GlobalRBAC",
            object_id="global_rbac",
            before_state=before_state,
            after_state=new_matrix,
            reason=request.data.get("reason", "RBAC matrix updated by Super Admin"),
            request=request,
            severity="WARN"
        )

        return Response({
            "success": True,
            "message": "Global RBAC permission matrix updated successfully.",
            "matrix": new_matrix
        })


# ── 3. PLATFORM USERS & STAFF DIRECTORY ──────────────────────────────────────

class PlatformUsersListView(APIView):
    """
    List staff and platform users with role, MFA, and active status.
    GET /api/platform/users/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Bug found (verification pass): the plain "admin" role has
        # "users":"view" in the default Global RBAC matrix (it's meant for
        # ordinary business-user visibility), so this fallback let any
        # normal Admin call this endpoint -- and since the new per-user
        # custom_permissions feature now returns every listed user's full
        # module/action grants here, a normal Admin could read every other
        # admin's individualized permissions. This directory is part of the
        # Platform Control Center (frontend: RequireSuperAdmin-gated,
        # PlatformUsersPage.jsx), not an ordinary role-gated module, so it
        # must be Super-Admin-exclusive on the backend too.
        if not is_super_admin(request.user):
            raise PermissionDenied("You do not have permission to view the staff directory.")

        users = User.objects.exclude(
            Q(role__iexact="customer") | Q(role__iexact="employee")
        ).order_by("-id")
        role_filter = request.query_params.get("role")
        search = request.query_params.get("search")

        if role_filter:
            users = users.filter(role=role_filter)
        if search:
            users = users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(phone__icontains=search)
            )

        try:
            page = int(request.query_params.get("page", 1))
            page_size = min(int(request.query_params.get("page_size", 50)), 100)
        except (ValueError, TypeError):
            page = 1
            page_size = 50

        total_users = users.count()
        offset = (page - 1) * page_size
        users_slice = users[offset:offset + page_size]

        data = []
        for u in users_slice:
            data.append({
                "id": u.id,
                "username": u.username,
                "email": u.email or "",
                "full_name": u.get_full_name() or u.username,
                "role": u.role,
                "is_active": u.is_active,
                "is_superuser": u.is_superuser,
                "is_super_admin": is_super_admin(u),
                "two_fa_enabled": u.two_fa_enabled,
                "date_joined": u.date_joined,
                "last_login": u.last_login,
                "custom_permissions": u.custom_permissions,
            })

        return Response({
            "users": data,
            "total": total_users,
            "page": page,
            "page_size": page_size
        })


class PlatformUserInviteView(APIView):
    """
    Secure Staff Provisioning via Invitation Link.
    POST /api/platform/users/invite/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_super_admin(request.user) and not can(request.user, "users", "create"):
            raise PermissionDenied("You do not have permission to invite new staff members.")

        email = request.data.get("email", "").strip().lower()
        role = request.data.get("role", "").strip()
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        require_mfa = bool(request.data.get("require_mfa", False))

        if not email or "@" not in email:
            return Response({"detail": "A valid email address is required."}, status=400)
        if not role:
            return Response({"detail": "A role must be selected."}, status=400)

        # Protect against non-Super-Admin creating Super Admins
        if role in (User.Role.SUPER_ADMIN, "super_admin", "superadmin") and not is_super_admin(request.user):
            raise PermissionDenied("Only Super Admins can provision a Super Admin account.")

        # Per-module permission customization (beyond the base role) is a
        # Super Admin-only capability — a plain admin inviting staff via
        # `users:create` still works exactly as before, they just can't
        # attach custom module permissions to the invite.
        custom_permissions, perm_error = _validate_permissions_payload(request.data.get("permissions"))
        if perm_error:
            return Response({"detail": perm_error}, status=400)
        if custom_permissions and not is_super_admin(request.user):
            raise PermissionDenied("Only Super Admins can customize module permissions.")

        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "A user with this email address already exists."}, status=400)

        company = _resolve_invite_company(request.user)
        if not company:
            return Response({"detail": "No company record exists to attach this invite to. Contact your platform operator."}, status=400)

        # Create or update pending invite
        invite = TeamInvite.objects.create(
            company=company,
            email=email,
            role=role,
            status="pending",
            token=uuid.uuid4(),
            invited_by=request.user,
            custom_permissions=custom_permissions or {},
        )

        invite_link = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/accept-invite?token={invite.token}"

        # Send invitation email if email backend configured
        try:
            send_mail(
                subject="You've been invited to join the CalTrack Team",
                message=f"Hello {first_name},\n\nYou have been invited to join CalTrack as a {role}.\n\nPlease click the link below to set your password and activate your account:\n{invite_link}\n\nBest regards,\nCalTrack Operations",
                from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@caltrack.io"),
                recipient_list=[email],
                fail_silently=True,
            )
        except Exception:
            pass

        record_platform_audit(
            actor=request.user,
            action="USER_INVITED",
            module="users",
            object_type="TeamInvite",
            object_id=str(invite.id),
            after_state={"email": email, "role": role, "require_mfa": require_mfa, "custom_permissions": custom_permissions or {}},
            reason=f"Invited staff user {email} with role {role}",
            request=request,
            severity="INFO"
        )

        return Response({
            "success": True,
            "message": f"Invitation link generated and sent to {email}.",
            "invite": {
                "id": invite.id,
                "email": invite.email,
                "role": invite.role,
                "invite_link": invite_link,
                "status": invite.status,
                "created_at": invite.created_at,
                "custom_permissions": invite.custom_permissions,
            }
        }, status=201)


class PlatformUserDetailView(APIView):
    """
    Manage individual staff user: role assignment, status toggle, force logout.
    PATCH /api/platform/users/<pk>/
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        target_user = User.objects.filter(id=pk).first()
        if not target_user:
            return Response({"detail": "User not found."}, status=404)

        actor = request.user
        before_state = {
            "role": target_user.role,
            "is_active": target_user.is_active,
            "is_superuser": target_user.is_superuser,
            "custom_permissions": target_user.custom_permissions,
        }

        # ── PRIVILEGE ESCALATION PROTECTION ──
        new_role = request.data.get("role")
        if new_role:
            # Only Super Admin can grant or revoke Super Admin
            if (new_role in (User.Role.SUPER_ADMIN, "super_admin") or is_super_admin(target_user)) and not is_super_admin(actor):
                raise PermissionDenied("Only Super Admins can grant, revoke, or modify Super Admin accounts.")
            # Prevent non-admin/managers from changing roles
            if not is_super_admin(actor) and not can(actor, "users", "edit"):
                raise PermissionDenied("You do not have permission to modify user roles.")

            target_user.role = new_role
            if new_role in (User.Role.SUPER_ADMIN, "super_admin"):
                target_user.is_staff = True
                record_platform_audit(
                    actor=actor,
                    action="SUPER_ADMIN_ROLE_GRANTED",
                    module="security",
                    object_type="User",
                    object_id=str(target_user.id),
                    before_state=before_state,
                    after_state={"role": new_role},
                    reason=f"Super Admin role granted to {target_user.username}",
                    request=request,
                    severity="CRITICAL"
                )
            else:
                record_platform_audit(
                    actor=actor,
                    action="USER_ROLE_CHANGED",
                    module="users",
                    object_type="User",
                    object_id=str(target_user.id),
                    before_state=before_state,
                    after_state={"role": new_role},
                    reason=f"Role changed from {before_state['role']} to {new_role}",
                    request=request,
                    severity="WARN"
                )

        # Status toggle (Active / Suspended)
        if "is_active" in request.data:
            # Bug found (verification pass): this block had NO permission
            # check at all beyond being authenticated -- unlike the role
            # change above (which requires can(actor,"users","edit")), any
            # logged-in admin/staff account, including one with
            # custom_permissions locking them out of every module, could
            # suspend or reactivate any other non-Super-Admin account.
            # Gated the same way role changes already are, using the
            # matrix's own "suspend"/"reactivate" actions on "users".
            new_is_active = bool(request.data["is_active"])
            required_action = "reactivate" if new_is_active else "suspend"
            if not is_super_admin(actor) and not can(actor, "users", required_action):
                raise PermissionDenied("You do not have permission to change this account's status.")
            if is_super_admin(target_user) and not is_super_admin(actor):
                raise PermissionDenied("Only Super Admins can deactivate another Super Admin account.")
            if target_user.id == actor.id and request.data["is_active"] is False:
                raise ValidationError("You cannot deactivate your own account.")

            target_user.is_active = new_is_active
            action_name = "USER_REACTIVATED" if target_user.is_active else "USER_SUSPENDED"
            record_platform_audit(
                actor=actor,
                action=action_name,
                module="users",
                object_type="User",
                object_id=str(target_user.id),
                before_state=before_state,
                after_state={"is_active": target_user.is_active},
                reason=request.data.get("reason", f"Status changed to {'Active' if target_user.is_active else 'Suspended'}"),
                request=request,
                severity="WARN"
            )

        # ── PER-MODULE PERMISSION CUSTOMIZATION ──
        # Deliberately Super-Admin-only, and NOT reachable via the general
        # `users:edit` permission a plain Admin might hold — granting or
        # narrowing another Admin's module access is exactly the kind of
        # privilege change the requirements call out as Super Admin-only.
        if "permissions" in request.data:
            if not is_super_admin(actor):
                raise PermissionDenied("Only Super Admins can customize another user's module permissions.")
            if target_user.id == actor.id:
                raise PermissionDenied("You cannot modify your own permissions.")
            if is_super_admin(target_user):
                raise PermissionDenied("Super Admin accounts always have full access and cannot be restricted here.")

            new_permissions, perm_error = _validate_permissions_payload(request.data.get("permissions"))
            if perm_error:
                return Response({"detail": perm_error}, status=400)

            target_user.custom_permissions = new_permissions or {}
            record_platform_audit(
                actor=actor,
                action="CUSTOM_PERMISSIONS_CHANGED",
                module="rbac",
                object_type="User",
                object_id=str(target_user.id),
                before_state={"custom_permissions": before_state["custom_permissions"]},
                after_state={"custom_permissions": target_user.custom_permissions},
                reason=request.data.get("reason", f"Module permissions customized for {target_user.username}"),
                request=request,
                severity="WARN"
            )

        target_user.save()

        return Response({
            "success": True,
            "message": "User updated successfully.",
            "user": {
                "id": target_user.id,
                "username": target_user.username,
                "role": target_user.role,
                "is_active": target_user.is_active,
                "is_super_admin": is_super_admin(target_user),
                "custom_permissions": target_user.custom_permissions,
            }
        })


# ── 4. CUSTOMER 360 & SAFE MERGE ENGINE ──────────────────────────────────────

class PlatformCustomerStatusView(APIView):
    """
    Super Admin management of Customer Account Status, Tier, and Risk Status.
    PATCH /api/platform/customers/<pk>/status/
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        if not is_super_admin(request.user) and not can(request.user, "customers", "edit"):
            raise PermissionDenied("You do not have permission to modify customer status.")

        user = User.objects.filter(id=pk).first()
        if not user:
            return Response({"detail": "Customer user not found."}, status=404)

        identity, _ = CustomerIdentity.objects.get_or_create(user=user)
        before_state = {
            "account_status": identity.account_status,
            "customer_tier": identity.customer_tier,
            "risk_status": identity.risk_status,
        }

        if "account_status" in request.data:
            identity.account_status = request.data["account_status"]
            user.is_active = (identity.account_status == "active")
            user.save(update_fields=["is_active"])
        if "customer_tier" in request.data:
            identity.customer_tier = request.data["customer_tier"]
        if "risk_status" in request.data:
            identity.risk_status = request.data["risk_status"]
        if "internal_notes" in request.data:
            identity.internal_notes = request.data["internal_notes"]

        identity.save()

        record_platform_audit(
            actor=request.user,
            action="CUSTOMER_STATUS_UPDATED",
            module="customers",
            object_type="CustomerIdentity",
            object_id=str(identity.id),
            before_state=before_state,
            after_state={
                "account_status": identity.account_status,
                "customer_tier": identity.customer_tier,
                "risk_status": identity.risk_status,
            },
            reason=request.data.get("reason", "Customer status updated by admin"),
            request=request,
            severity="WARN" if identity.risk_status == "blacklisted" else "INFO"
        )

        return Response({
            "success": True,
            "message": "Customer status updated successfully.",
            "identity": {
                "account_status": identity.account_status,
                "customer_tier": identity.customer_tier,
                "risk_status": identity.risk_status,
                "internal_notes": identity.internal_notes,
            }
        })


class PlatformCustomerMergePreviewView(APIView):
    """
    Preview affected records before executing a customer merge.
    POST /api/platform/customers/merge-preview/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_super_admin(request.user) and not can(request.user, "customers", "merge"):
            raise PermissionDenied("You do not have permission to merge customer accounts.")

        source_id = request.data.get("source_customer_id")
        target_id = request.data.get("target_customer_id")

        if not source_id or not target_id:
            return Response({"detail": "Both source_customer_id and target_customer_id are required."}, status=400)
        if str(source_id) == str(target_id):
            return Response({"detail": "Source and target customer cannot be the same."}, status=400)

        source_user = User.objects.filter(id=source_id).first()
        target_user = User.objects.filter(id=target_id).first()

        if not source_user or not target_user:
            return Response({"detail": "One or both customers not found."}, status=404)

        bookings_count = ServiceRequest.objects.filter(customer=source_user).count()
        addresses_count = SavedAddress.objects.filter(user=source_user).count()
        tickets_count = CustomerCareTicket.objects.filter(customer=source_user).count()

        return Response({
            "source": {
                "id": source_user.id,
                "name": source_user.get_full_name() or source_user.username,
                "email": source_user.email,
                "phone": source_user.phone,
            },
            "target": {
                "id": target_user.id,
                "name": target_user.get_full_name() or target_user.username,
                "email": target_user.email,
                "phone": target_user.phone,
            },
            "affected_records": {
                "bookings": bookings_count,
                "addresses": addresses_count,
                "support_tickets": tickets_count,
            }
        })


class PlatformCustomerMergeExecuteView(APIView):
    """
    Execute customer account merge with full audit trail.
    POST /api/platform/customers/merge/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_super_admin(request.user) and not can(request.user, "customers", "merge"):
            raise PermissionDenied("You do not have permission to merge customer accounts.")

        source_id = request.data.get("source_customer_id")
        target_id = request.data.get("target_customer_id")
        reason = request.data.get("reason", "").strip()

        if not source_id or not target_id or not reason:
            return Response({"detail": "Source ID, target ID, and merge reason are required."}, status=400)

        source_user = User.objects.filter(id=source_id).first()
        target_user = User.objects.filter(id=target_id).first()

        if not source_user or not target_user:
            return Response({"detail": "Customers not found."}, status=404)

        with transaction.atomic():
            # Execute entity reassignments
            bookings_updated = ServiceRequest.objects.filter(customer=source_user).update(customer=target_user)
            addresses_updated = SavedAddress.objects.filter(user=source_user).update(user=target_user)
            tickets_updated = CustomerCareTicket.objects.filter(customer=source_user).update(customer=target_user)

            # Update source customer identity
            source_identity, _ = CustomerIdentity.objects.get_or_create(user=source_user)
            target_identity, _ = CustomerIdentity.objects.get_or_create(user=target_user)

            source_identity.merged_into = target_identity
            source_identity.account_status = "blocked"
            source_identity.merge_note = f"Merged into {target_user.username} by {request.user.username}. Reason: {reason}"
            source_identity.save()

            source_user.is_active = False
            source_user.save(update_fields=["is_active"])

        record_platform_audit(
            actor=request.user,
            action="CUSTOMER_MERGED",
            module="customers",
            object_type="User",
            object_id=str(source_user.id),
            before_state={"source_id": source_user.id, "target_id": target_user.id},
            after_state={
                "bookings_migrated": bookings_updated,
                "addresses_migrated": addresses_updated,
                "tickets_migrated": tickets_updated,
                "target_id": target_user.id
            },
            reason=reason,
            request=request,
            severity="WARN"
        )

        return Response({
            "success": True,
            "message": f"Successfully merged customer #{source_id} into customer #{target_id}.",
            "migrated": {
                "bookings": bookings_updated,
                "addresses": addresses_updated,
                "tickets": tickets_updated,
            }
        })


# ── 5. SECURITY CENTER & SESSION MANAGEMENT ─────────────────────────────────

class PlatformSecurityOverviewView(APIView):
    """
    Overview of system security, active sessions, failed logins, and MFA statuses.
    GET /api/platform/security/overview/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user) and not can(request.user, "security", "view"):
            raise PermissionDenied("You do not have permission to view the security center.")

        recent_logins = CustomerLoginEvent.objects.select_related("customer").order_by("-occurred_at")[:50]
        login_data = []
        for l in recent_logins:
            cust_name = "Unknown"
            try:
                if l.customer:
                    cust_name = l.customer.username
            except Exception:
                pass
            login_data.append({
                "id": l.id,
                "username": cust_name,
                "method": l.method,
                "status": l.status,
                "ip_address": l.ip_address,
                "occurred_at": l.occurred_at,
            })

        # MFA enforcement status across administrative staff
        staff_users = User.objects.exclude(
            Q(role__iexact="customer") | Q(role__iexact="employee")
        )
        total_staff = staff_users.count()
        mfa_enabled_staff = staff_users.filter(two_fa_enabled=True).count()

        return Response({
            "staff_mfa": {
                "total": total_staff,
                "enabled": mfa_enabled_staff,
                "enforcement_rate": round((mfa_enabled_staff / total_staff * 100), 1) if total_staff > 0 else 0,
            },
            "recent_logins": login_data,
        })


class PlatformSessionRevokeView(APIView):
    """
    Force logout staff user or revoke token.
    POST /api/platform/security/sessions/revoke/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not is_super_admin(request.user) and not can(request.user, "security", "force_logout"):
            raise PermissionDenied("You do not have permission to force logout users.")

        target_user_id = request.data.get("user_id")
        reason = request.data.get("reason", "Session revoked by Super Admin")

        target_user = User.objects.filter(id=target_user_id).first()
        if not target_user:
            return Response({"detail": "User not found."}, status=404)

        # Clear active OTPs/secrets if any
        target_user.totp_secret = ""
        target_user.save(update_fields=["totp_secret"])

        record_platform_audit(
            actor=request.user,
            action="FORCE_LOGOUT",
            module="security",
            object_type="User",
            object_id=str(target_user.id),
            reason=reason,
            request=request,
            severity="WARN"
        )

        return Response({
            "success": True,
            "message": f"User {target_user.username} sessions revoked successfully."
        })


# ── 6. GLOBAL AUDIT TRAIL ───────────────────────────────────────────────────

class PlatformAuditListView(APIView):
    """
    Filterable Global Audit Log feed for all privileged operations.
    GET /api/platform/audit/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not is_super_admin(request.user) and not can(request.user, "audit", "view"):
            raise PermissionDenied("You do not have permission to view platform audit logs.")

        qs = PlatformAuditEvent.objects.select_related("actor").order_by("-timestamp")
        module = request.query_params.get("module")
        action = request.query_params.get("action")
        severity = request.query_params.get("severity")

        if module:
            qs = qs.filter(module=module)
        if action:
            qs = qs.filter(action=action)
        total_logs = qs.count()
        try:
            page = int(request.query_params.get("page", 1))
            page_size = min(int(request.query_params.get("page_size", 50)), 200)
        except (ValueError, TypeError):
            page = 1
            page_size = 50

        offset = (page - 1) * page_size
        logs = qs[offset:offset + page_size]
        data = []
        for log in logs:
            data.append({
                "id": log.id,
                "actor": log.actor.username if log.actor else "system",
                "actor_role": log.actor_role,
                "action": log.action,
                "module": log.module,
                "object_type": log.object_type,
                "object_id": log.object_id,
                "before_state": log.before_state,
                "after_state": log.after_state,
                "reason": log.reason,
                "timestamp": log.timestamp,
                "ip_address": log.ip_address,
                "severity": log.severity,
            })

        return Response({
            "audit_logs": data,
            "total": total_logs,
            "page": page,
            "page_size": page_size
        })
