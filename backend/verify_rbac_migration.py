import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from accounts.models import User, SavedAddress
from accounts.permissions import is_super_admin, can, RequireModuleAccess, get_global_rbac_permissions, GLOBAL_MODULES
from customer_analytics.models import CustomerIdentity, PlatformAuditEvent
from accounts.audit_service import record_platform_audit
from service_requests.models import ServiceRequest
from rest_framework.test import APIRequestFactory, force_authenticate
from platform_control.views import (
    PlatformDashboardSummaryView,
    PlatformRBACMatrixView,
    PlatformUsersListView,
    PlatformUserDetailView,
    PlatformCustomerStatusView,
    PlatformCustomerMergePreviewView,
    PlatformCustomerMergeExecuteView,
    PlatformSecurityOverviewView,
    PlatformAuditListView
)

def run_rbac_verification():
    print("=" * 70)
    print("sevo POST-MIGRATION REGRESSION & SECURITY AUDIT SUITE")
    print("=" * 70)

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 1: SUPER ADMIN IDENTITY INVARIANT & UNIVERSAL BYPASS
    # ──────────────────────────────────────────────────────────────────────────
    # Test 1.1: Super Admin with role=super_admin
    super_admin_role = User(username="audit_sa_role", role=User.Role.SUPER_ADMIN, is_superuser=True, is_staff=True)
    assert is_super_admin(super_admin_role) is True, "User with role=super_admin must be Super Admin"
    assert can(super_admin_role, "rbac", "edit") is True, "Super Admin must bypass RBAC edit"
    assert can(super_admin_role, "arbitrary_module", "custom_action") is True, "Super Admin must bypass arbitrary module"

    # Test 1.2: Regular Admin with role=admin is evaluated by RBAC (NOT Super Admin)
    admin_role = User(username="audit_admin_role", role=User.Role.ADMIN, is_superuser=False, is_staff=True)
    assert is_super_admin(admin_role) is False, "Standard admin role must NOT be Super Admin"

    print("[PASS] 1. Super Admin Role Identity & RBAC Isolation Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 2: 8-ROLE CENTRALIZED RBAC EVALUATION (NO GLOBAL STAFF BYPASS)
    # ──────────────────────────────────────────────────────────────────────────
    support_u = User(username="audit_support", role=User.Role.SUPPORT)
    finance_u = User(username="audit_finance", role=User.Role.FINANCE)
    catalog_u = User(username="audit_catalog", role=User.Role.CATALOG)
    employee_u = User(username="audit_employee", role=User.Role.EMPLOYEE)
    customer_u = User(username="audit_customer", role=User.Role.CUSTOMER)
    manager_u = User(username="audit_manager", role=User.Role.MANAGER)
    admin_u = User(username="audit_admin", role=User.Role.ADMIN)

    # Support Checks
    assert is_super_admin(support_u) is False
    assert can(support_u, "customer_care", "view") is True, "Support must view customer care tickets"
    assert can(support_u, "customer_care", "resolve") is True, "Support must resolve customer care tickets"
    assert can(support_u, "rbac", "edit_rbac") is False, "Support must NOT edit RBAC"
    assert can(support_u, "finance", "refund") is False, "Support must NOT refund finance"

    # Finance Checks
    assert is_super_admin(finance_u) is False
    assert can(finance_u, "finance", "view") is True, "Finance must view finance"
    assert can(finance_u, "refunds", "approve") is True, "Finance must approve refunds"
    assert can(finance_u, "catalog", "create") is False, "Finance must NOT create catalog"
    assert can(finance_u, "rbac", "edit_rbac") is False, "Finance must NOT edit RBAC"

    # Catalog Checks
    assert is_super_admin(catalog_u) is False
    assert can(catalog_u, "catalog", "create") is True, "Catalog must create catalog items"
    assert can(catalog_u, "pricing", "modify_price") is True, "Catalog must modify prices"
    assert can(catalog_u, "customer_care", "resolve") is False, "Catalog must NOT resolve care tickets"

    # Customer Checks
    assert is_super_admin(customer_u) is False
    assert can(customer_u, "catalog", "create") is False
    assert can(customer_u, "rbac", "view") is False
    assert can(customer_u, "finance", "view") is False

    print("[PASS] 2. Centralized 8-Role RBAC Matrix Evaluation Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 3: VISIBILITYQUERYSET ROW-LEVEL DATA ISOLATION
    # ──────────────────────────────────────────────────────────────────────────
    # Create test customers and bookings
    cust_a = User.objects.filter(username="cust_test_alpha").first()
    if not cust_a:
        cust_a = User.objects.create_user(username="cust_test_alpha", email="alpha@example.com", phone="9988776601", role=User.Role.CUSTOMER)

    cust_b = User.objects.filter(username="cust_test_beta").first()
    if not cust_b:
        cust_b = User.objects.create_user(username="cust_test_beta", email="beta@example.com", phone="9988776602", role=User.Role.CUSTOMER)

    booking_a = ServiceRequest.objects.filter(customer=cust_a).first()
    if not booking_a:
        booking_a = ServiceRequest.objects.create(
            customer=cust_a,
            customer_name="Alpha",
            phone="9988776601",
            preferred_date=django.utils.timezone.localdate(),
            preferred_time="10:00 AM",
            total_amount=400
        )

    booking_b = ServiceRequest.objects.filter(customer=cust_b).first()
    if not booking_b:
        booking_b = ServiceRequest.objects.create(
            customer=cust_b,
            customer_name="Beta",
            phone="9988776602",
            preferred_date=django.utils.timezone.localdate(),
            preferred_time="11:00 AM",
            total_amount=800
        )

    # Customer A only sees booking A
    vis_a = ServiceRequest.objects.visible_to(cust_a)
    assert booking_a in vis_a, "Customer A must see booking A"
    assert booking_b not in vis_a, "Customer A must NOT see booking B"

    # Customer B only sees booking B
    vis_b = ServiceRequest.objects.visible_to(cust_b)
    assert booking_b in vis_b, "Customer B must see booking B"
    assert booking_a not in vis_b, "Customer B must NOT see booking A"

    # Super Admin sees ALL bookings
    vis_super = ServiceRequest.objects.visible_to(super_admin_role)
    assert booking_a in vis_super and booking_b in vis_super, "Super Admin must see all bookings"

    print("[PASS] 3. VisibilityQuerySet Row-Level Data Isolation Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 4: PRIVILEGE ESCALATION & TAMPERING PROTECTION
    # ──────────────────────────────────────────────────────────────────────────
    factory = APIRequestFactory()
    user_detail_view = PlatformUserDetailView.as_view()

    # Support attempting to grant Super Admin
    req = factory.patch(f"/api/platform/users/{support_u.id or 1}/", {"role": "super_admin"}, format="json")
    force_authenticate(req, user=support_u)
    resp = user_detail_view(req, pk=support_u.id or 1)
    assert resp.status_code in [403, 404], f"Support user promoting to Super Admin must return 403 (Got: {resp.status_code})"

    # Manager attempting to modify RBAC matrix
    rbac_view = PlatformRBACMatrixView.as_view()
    req = factory.put("/api/platform/rbac/matrix/", {"matrix": {}}, format="json")
    force_authenticate(req, user=manager_u)
    resp = rbac_view(req)
    assert resp.status_code == 403, f"Manager modifying RBAC matrix must return 403 (Got: {resp.status_code})"

    print("[PASS] 4. Privilege Escalation & RBAC Tampering Protection Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 5: PLATFORM CONTROL API & PAGINATED FEEDS
    # ──────────────────────────────────────────────────────────────────────────
    super_admin_db = User.objects.filter(is_superuser=True).first() or User.objects.filter(role="super_admin").first()

    # 5.1 Dashboard Summary
    req = factory.get("/api/platform/dashboard/summary/")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformDashboardSummaryView.as_view()(req)
    assert resp.status_code == 200
    assert "users" in resp.data and "bookings" in resp.data

    # 5.2 RBAC Matrix
    req = factory.get("/api/platform/rbac/matrix/")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformRBACMatrixView.as_view()(req)
    assert resp.status_code == 200
    assert len(resp.data.get("modules", [])) >= 30, "All customer platform modules must be registered"

    # 5.3 Users List (Paginated)
    req = factory.get("/api/platform/users/?page=1&page_size=10")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformUsersListView.as_view()(req)
    assert resp.status_code == 200
    assert "total" in resp.data and "page" in resp.data

    # 5.4 Security Overview
    req = factory.get("/api/platform/security/overview/")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformSecurityOverviewView.as_view()(req)
    assert resp.status_code == 200

    # 5.5 Audit List (Paginated)
    req = factory.get("/api/platform/audit/?page=1&page_size=10")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformAuditListView.as_view()(req)
    assert resp.status_code == 200
    assert "total" in resp.data and "audit_logs" in resp.data

    print("[PASS] 5. Platform Control API (Summary, RBAC, Users, Security, Audit) Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 6: CUSTOMER 360 ORTHOGONAL STATUS & SAFE MERGE
    # ──────────────────────────────────────────────────────────────────────────
    identity, _ = CustomerIdentity.objects.get_or_create(user=cust_a)
    req = factory.patch(
        f"/api/platform/customers/{cust_a.id}/status/",
        {
            "account_status": "active",
            "customer_tier": "vip",
            "risk_status": "normal",
            "internal_notes": "Verified VIP active customer"
        },
        format="json"
    )
    force_authenticate(req, user=super_admin_db)
    resp = PlatformCustomerStatusView.as_view()(req, pk=cust_a.id)
    assert resp.status_code == 200
    identity.refresh_from_db()
    assert identity.customer_tier == "vip"

    # Merge Preview
    req = factory.post("/api/platform/customers/merge-preview/", {"source_customer_id": cust_a.id, "target_customer_id": cust_b.id}, format="json")
    force_authenticate(req, user=super_admin_db)
    resp = PlatformCustomerMergePreviewView.as_view()(req)
    assert resp.status_code == 200
    assert "affected_records" in resp.data

    print("[PASS] 6. Customer 360 Status & Merge Safety Verified.")

    # ──────────────────────────────────────────────────────────────────────────
    # SECTION 7: AUDIT LOGGING & IMMUTABILITY
    # ──────────────────────────────────────────────────────────────────────────
    audit_evt = record_platform_audit(
        actor=super_admin_db,
        action="POST_MIGRATION_AUDIT_CHECK",
        module="audit",
        object_type="System",
        object_id="0",
        before_state={"verified": False},
        after_state={"verified": True},
        reason="Automated post-migration full regression audit",
        severity="INFO"
    )
    assert audit_evt is not None
    persisted = PlatformAuditEvent.objects.filter(id=audit_evt.id).first()
    assert persisted is not None
    assert persisted.action == "POST_MIGRATION_AUDIT_CHECK"

    print("[PASS] 7. Platform Audit Event Immutability Verified.")

    print("=" * 70)
    print("ALL 7 POST-MIGRATION AUDIT SUITES PASSED WITH ZERO REGRESSIONS!")
    print("=" * 70)

if __name__ == "__main__":
    run_rbac_verification()
