from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.exceptions import PermissionDenied

from companies.models import Company
from customer_care.models import CustomerCareTicket, CareAgentProfile, TicketActivity
from customer_care.permissions import get_care_access
from customer_care.services import ticket_service, refund_bridge

User = get_user_model()

class CustomerCareTestCase(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Care Corp", slug="care-corp")

        self.admin_user = User.objects.create_user(
            username="admin_user",
            email="admin@care.com",
            password="Password123",
            role="admin",
            company=self.company
        )

        self.exec_user = User.objects.create_user(
            username="exec_user",
            email="exec@care.com",
            password="Password123",
            role="employee",
            company=self.company
        )
        self.exec_profile = CareAgentProfile.objects.create(
            company=self.company,
            user=self.exec_user,
            care_role="care_executive",
            refund_approval_limit=Decimal("0.00"),
            is_active=True
        )

        self.senior_user = User.objects.create_user(
            username="senior_user",
            email="senior@care.com",
            password="Password123",
            role="employee",
            company=self.company
        )
        self.senior_profile = CareAgentProfile.objects.create(
            company=self.company,
            user=self.senior_user,
            care_role="senior_care",
            refund_approval_limit=Decimal("2000.00"),
            is_active=True
        )

    def test_get_care_access(self):
        admin_access = get_care_access(self.admin_user)
        self.assertTrue(admin_access["has_access"])
        self.assertEqual(admin_access["tier"], "admin")
        self.assertIsNone(admin_access["refund_limit"])

        exec_access = get_care_access(self.exec_user)
        self.assertTrue(exec_access["has_access"])
        self.assertEqual(exec_access["tier"], "care_executive")
        self.assertEqual(exec_access["refund_limit"], Decimal("0.00"))

        senior_access = get_care_access(self.senior_user)
        self.assertTrue(senior_access["has_access"])
        self.assertEqual(senior_access["tier"], "senior_care")
        self.assertEqual(senior_access["refund_limit"], Decimal("2000.00"))

    def test_ticket_creation_and_transitions(self):
        ticket = ticket_service.create_ticket(
            company=self.company,
            created_by=self.admin_user,
            category="general",
            priority="medium",
            channel="portal",
            customer_name="John Doe",
            email="john@doe.com"
        )
        self.assertEqual(ticket.status, "new")
        self.assertIsNotNone(ticket.sla_due_at)

        ticket = ticket_service.change_ticket_status(ticket, self.admin_user, "assigned")
        self.assertEqual(ticket.status, "assigned")

        ticket = ticket_service.change_ticket_status(ticket, self.admin_user, "in_progress")
        self.assertEqual(ticket.status, "in_progress")

        with self.assertRaises(ValidationError):
            ticket_service.change_ticket_status(ticket, self.admin_user, "closed")
