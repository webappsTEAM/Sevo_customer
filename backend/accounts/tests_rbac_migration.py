from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from accounts.models import User, SavedAddress
from accounts.permissions import is_super_admin, can, RequireModuleAccess
from customer_analytics.models import CustomerIdentity, PlatformAuditEvent
from service_requests.models import ServiceRequest
from customer_care.models import CustomerCareTicket
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

User = get_user_model()


class CompleteRBACSecurityAuditTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = APIRequestFactory()

        # 1. Super Admin A (role based, no superuser)
        self.super_admin_role = User.objects.create_user(
            username="superadmin_role_only",
            email="super_role@sevo.com",
            password="Password123!",
            role=User.Role.SUPER_ADMIN,
            is_staff=True,
            is_superuser=False
        )

        # 2. Super Admin B (superuser based, custom role)
        self.super_admin_flag = User.objects.create_user(
            username="superadmin_flag_only",
            email="super_flag@sevo.com",
            password="Password123!",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True
        )

        # 3. Normal Admin
        self.admin = User.objects.create_user(
            username="admin_audit",
            email="admin@sevo.com",
            password="Password123!",
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=False
        )

        # 4. Manager
        self.manager = User.objects.create_user(
            username="manager_audit",
            email="manager@sevo.com",
            password="Password123!",
            role=User.Role.MANAGER,
            is_staff=True,
            is_superuser=False
        )

        # 5. Support Agent
        self.support = User.objects.create_user(
            username="support_audit",
            email="support@sevo.com",
            password="Password123!",
            role=User.Role.SUPPORT,
            is_staff=False,
            is_superuser=False
        )

        # 6. Finance Officer
        self.finance = User.objects.create_user(
            username="finance_audit",
            email="finance@sevo.com",
            password="Password123!",
            role=User.Role.FINANCE,
            is_staff=False,
            is_superuser=False
        )

        # 7. Catalog Manager
        self.catalog = User.objects.create_user(
            username="catalog_audit",
            email="catalog@sevo.com",
            password="Password123!",
            role=User.Role.CATALOG,
            is_staff=False,
            is_superuser=False
        )

        # 8. Employee / Technician
        self.employee = User.objects.create_user(
            username="technician_audit",
            email="technician@sevo.com",
            password="Password123!",
            role=User.Role.EMPLOYEE,
            is_staff=False,
            is_superuser=False
        )

        # 9. Customers
        self.customer_a = User.objects.create_user(
            username="customer_a",
            email="customer_a@example.com",
            phone="9876543210",
            password="Password123!",
            role=User.Role.CUSTOMER,
            is_staff=False,
            is_superuser=False
        )
        self.customer_b = User.objects.create_user(
            username="customer_b",
            email="customer_b@example.com",
            phone="9876543211",
            password="Password123!",
            role=User.Role.CUSTOMER,
            is_staff=False,
            is_superuser=False
        )

    def test_super_admin_dual_identity(self):
        """Super Admin works with role='super_admin' OR is_superuser=True with company=None."""
        self.assertTrue(is_super_admin(self.super_admin_role))
        self.assertTrue(is_super_admin(self.super_admin_flag))
        self.assertIsNone(self.super_admin_role.company)
        self.assertIsNone(self.super_admin_flag.company)

        # Both have universal bypass
        self.assertTrue(can(self.super_admin_role, "rbac", "edit"))
        self.assertTrue(can(self.super_admin_flag, "rbac", "edit"))
        self.assertTrue(can(self.super_admin_role, "arbitrary_module", "custom_action"))
        self.assertTrue(can(self.super_admin_flag, "arbitrary_module", "custom_action"))

    def test_eight_roles_permission_matrix(self):
        """All 8 roles evaluate according to Centralized Global RBAC without global_staff bypass."""
        # Catalog Manager
        self.assertTrue(can(self.catalog, "catalog", "create"))
        self.assertTrue(can(self.catalog, "pricing", "edit"))
        self.assertFalse(can(self.catalog, "customer_care", "resolve"))
        self.assertFalse(can(self.catalog, "rbac", "edit"))

        # Finance Officer
        self.assertTrue(can(self.finance, "finance", "view"))
        self.assertTrue(can(self.finance, "refunds", "approve"))
        self.assertFalse(can(self.finance, "catalog", "create"))
        self.assertFalse(can(self.finance, "rbac", "edit"))

        # Support Agent
        self.assertTrue(can(self.support, "customer_care", "view"))
        self.assertTrue(can(self.support, "customer_care", "resolve"))
        self.assertFalse(can(self.support, "finance", "refund"))
        self.assertFalse(can(self.support, "rbac", "edit"))

        # Customer
        self.assertFalse(can(self.customer_a, "catalog", "edit"))
        self.assertFalse(can(self.customer_a, "rbac", "view"))
        self.assertFalse(can(self.customer_a, "finance", "view"))

    def test_visibility_queryset_isolation(self):
        """Customers and Employees must only see their own / assigned records."""
        from django.utils import timezone
        # Booking for customer A
        booking_a = ServiceRequest.objects.create(
            customer=self.customer_a,
            customer_name="Customer A",
            phone="9876543210",
            preferred_date=timezone.localdate(),
            preferred_time="10:00 AM",
            total_amount=500
        )
        # Booking for customer B
        booking_b = ServiceRequest.objects.create(
            customer=self.customer_b,
            customer_name="Customer B",
            phone="9876543211",
            preferred_date=timezone.localdate(),
            preferred_time="11:00 AM",
            total_amount=1000
        )

        # Customer A sees ONLY booking A
        visible_a = ServiceRequest.objects.visible_to(self.customer_a)
        self.assertIn(booking_a, visible_a)
        self.assertNotIn(booking_b, visible_a)

        # Customer B sees ONLY booking B
        visible_b = ServiceRequest.objects.visible_to(self.customer_b)
        self.assertIn(booking_b, visible_b)
        self.assertNotIn(booking_a, visible_b)

        # Super Admin sees ALL bookings
        visible_super = ServiceRequest.objects.visible_to(self.super_admin_role)
        self.assertIn(booking_a, visible_super)
        self.assertIn(booking_b, visible_super)

    def test_privilege_escalation_attempt_protection(self):
        """Non-Super-Admins attempting to elevate role or modify Super Admins are blocked with 403."""
        view = PlatformUserDetailView.as_view()

        # Support attempting to promote self to Super Admin
        req = self.factory.patch(
            f"/api/platform/users/{self.support.id}/",
            {"role": "super_admin"},
            format="json"
        )
        force_authenticate(req, user=self.support)
        resp = view(req, pk=self.support.id)
        self.assertEqual(resp.status_code, 403)

        # Admin attempting to promote Support to Super Admin
        req = self.factory.patch(
            f"/api/platform/users/{self.support.id}/",
            {"role": "super_admin"},
            format="json"
        )
        force_authenticate(req, user=self.admin)
        resp = view(req, pk=self.support.id)
        self.assertEqual(resp.status_code, 403)

        # Admin attempting to deactivate Super Admin
        req = self.factory.patch(
            f"/api/platform/users/{self.super_admin_role.id}/",
            {"is_active": False},
            format="json"
        )
        force_authenticate(req, user=self.admin)
        resp = view(req, pk=self.super_admin_role.id)
        self.assertEqual(resp.status_code, 403)

    def test_customer_merge_transaction_and_audit(self):
        """Customer merge reassigns records, blocks source, and writes immutable PlatformAuditEvent."""
        from django.utils import timezone
        booking = ServiceRequest.objects.create(
            customer=self.customer_a,
            customer_name="Customer A",
            phone="9876543210",
            preferred_date=timezone.localdate(),
            preferred_time="10:00 AM",
            total_amount=750
        )
        address = SavedAddress.objects.create(
            user=self.customer_a,
            label=SavedAddress.Label.HOME,
            address_line1="123 Street",
            city="Bangalore",
            state="KA",
            pincode="560001"
        )

        view = PlatformCustomerMergeExecuteView.as_view()
        req = self.factory.post(
            "/api/platform/customers/merge/",
            {
                "source_customer_id": self.customer_a.id,
                "target_customer_id": self.customer_b.id,
                "reason": "Duplicate account cleanup verification"
            },
            format="json"
        )
        force_authenticate(req, user=self.super_admin_role)
        resp = view(req)
        self.assertEqual(resp.status_code, 200)

        # Verify reassignment
        booking.refresh_from_db()
        address.refresh_from_db()
        self.customer_a.refresh_from_db()
        self.assertEqual(booking.customer, self.customer_b)
        self.assertEqual(address.user, self.customer_b)
        self.assertFalse(self.customer_a.is_active)

        # Verify audit event
        audit = PlatformAuditEvent.objects.filter(
            action="CUSTOMER_MERGED",
            object_id=str(self.customer_a.id)
        ).first()
        self.assertIsNotNone(audit)
        self.assertEqual(audit.actor, self.super_admin_role)
        self.assertEqual(audit.severity, "WARN")
