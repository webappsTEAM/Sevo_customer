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
        self.company = Company.objects.create(company_name="Care Corp", slug="care-corp")

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

        self.manager_user = User.objects.create_user(
            username="manager_user",
            email="manager@care.com",
            password="Password123",
            role="employee",
            company=self.company
        )
        self.manager_profile = CareAgentProfile.objects.create(
            company=self.company,
            user=self.manager_user,
            care_role="ops_manager",
            refund_approval_limit=Decimal("15000.00"),
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

        manager_access = get_care_access(self.manager_user)
        self.assertTrue(manager_access["has_access"])
        self.assertEqual(manager_access["tier"], "ops_manager")
        self.assertEqual(manager_access["refund_limit"], Decimal("15000.00"))

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

    def test_reschedule_bridge_auto_approve(self):
        from service_requests.models import ServiceRequest
        from django.utils import timezone
        from datetime import timedelta
        
        booking = ServiceRequest.objects.create(
            company=self.company,
            customer=self.admin_user,
            customer_name="Test Cust",
            phone="1234567890",
            preferred_date=timezone.now().date() + timedelta(days=2),
            preferred_time="09:00 - 11:00",
            status="confirmed",
            payment_status="pending"
        )
        
        ticket = ticket_service.create_ticket(
            company=self.company,
            created_by=self.admin_user,
            category="general",
            priority="medium",
            channel="portal",
            customer_name="Test Cust",
            phone="1234567890",
            booking=booking
        )
        
        from customer_care.services import reschedule_bridge
        rr = reschedule_bridge.create_reschedule_via_ticket(
            ticket=ticket,
            actor=self.admin_user,
            new_date=timezone.now().date() + timedelta(days=3),
            new_time_slot="11:00 - 13:00",
            reason="Customer request",
            notes="Please reschedule"
        )
        
        self.assertEqual(rr.status, "RESCHEDULED")
        
        booking.refresh_from_db()
        self.assertEqual(booking.preferred_date, timezone.now().date() + timedelta(days=3))

    def test_cancellation_bridge(self):
        from service_requests.models import ServiceRequest
        from django.utils import timezone
        from datetime import timedelta
        
        booking = ServiceRequest.objects.create(
            company=self.company,
            customer=self.admin_user,
            customer_name="Test Cust",
            phone="1234567890",
            preferred_date=timezone.now().date() + timedelta(days=2),
            status="confirmed",
            payment_status="paid",
            total_amount=Decimal("150.00"),
            final_amount=Decimal("150.00")
        )
        
        ticket = ticket_service.create_ticket(
            company=self.company,
            created_by=self.admin_user,
            category="general",
            priority="medium",
            channel="portal",
            customer_name="Test Cust",
            phone="1234567890",
            booking=booking
        )
        
        from customer_care.services import cancellation_bridge
        cancel_req = cancellation_bridge.request_cancellation_via_ticket(
            ticket=ticket,
            actor=self.admin_user,
            reason="No longer needed",
            reason_note="Cancelled by customer"
        )
        
        self.assertEqual(cancel_req.status, "pending")
        self.assertIsNotNone(cancel_req.refund_request)
        self.assertEqual(cancel_req.refund_request.requested_amount, Decimal("150.00"))
        
        cancellation_bridge.approve_cancellation_via_ticket(ticket, self.admin_user, is_approved=True)
        cancel_req.refresh_from_db()
        booking.refresh_from_db()
        
        self.assertEqual(cancel_req.status, "completed")
        self.assertEqual(booking.status, "cancelled")

    def test_cancellation_bridge_late_fee(self):
        from service_requests.models import ServiceRequest
        from django.utils import timezone
        from datetime import timedelta
        
        booking = ServiceRequest.objects.create(
            company=self.company,
            customer=self.admin_user,
            customer_name="Test Cust",
            phone="1234567890",
            preferred_date=timezone.now().date(),
            status="confirmed",
            payment_status="paid",
            total_amount=Decimal("1000.00"),
            final_amount=Decimal("1000.00")
        )
        
        ticket = ticket_service.create_ticket(
            company=self.company,
            created_by=self.admin_user,
            category="general",
            priority="medium",
            channel="portal",
            customer_name="Test Cust",
            phone="1234567890",
            booking=booking
        )
        
        from customer_care.services import cancellation_bridge
        cancel_req = cancellation_bridge.request_cancellation_via_ticket(
            ticket=ticket,
            actor=self.admin_user,
            reason="No longer needed",
            reason_note="Cancelled late"
        )
        
        self.assertEqual(cancel_req.status, "pending")
        self.assertIsNotNone(cancel_req.refund_request)
        self.assertEqual(cancel_req.refund_request.requested_amount, Decimal("900.00"))
        self.assertEqual(cancel_req.refund_request.refund_type, "PARTIAL")

    def test_sla_auto_escalation_task(self):
        from django.utils import timezone
        from datetime import timedelta
        
        ticket = ticket_service.create_ticket(
            company=self.company,
            created_by=self.admin_user,
            category="general",
            priority="critical",
            channel="portal",
            customer_name="John Doe",
            email="john@doe.com"
        )
        
        ticket.sla_due_at = timezone.now() - timedelta(hours=1)
        ticket.save()
        
        from customer_care.tasks import auto_escalate_sla_violations
        auto_escalate_sla_violations()
        
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "escalated")
        self.assertTrue(ticket.escalations.filter(escalated_to_tier="ops_manager").exists())

    def test_low_rating_auto_ticket(self):
        from service_requests.models import ServiceRequest, ServiceFeedback
        from django.utils import timezone
        
        booking = ServiceRequest.objects.create(
            company=self.company,
            customer=self.admin_user,
            customer_name="Test Cust",
            phone="1234567890",
            preferred_date=timezone.now().date(),
            status="confirmed",
            payment_status="paid",
            final_amount=Decimal("100.00")
        )
        
        feedback = ServiceFeedback.objects.create(
            service_request=booking,
            rating=2,
            is_submitted=True,
            submitted_at=timezone.now()
        )
        
        from customer_care.models import CustomerCareTicket
        ticket = CustomerCareTicket.objects.filter(booking=booking, category="service_quality").first()
        self.assertIsNotNone(ticket)
        self.assertEqual(ticket.priority, "high")
        self.assertEqual(ticket.customer, self.admin_user)

