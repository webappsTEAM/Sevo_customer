from django.db.models.signals import post_save
from django.dispatch import receiver
from service_requests.models import Complaint, ComplaintMessage
from customer_care.models import CustomerCareTicket, TicketMessage
from customer_care.services import ticket_service
from django.core.exceptions import ValidationError

@receiver(post_save, sender=Complaint)
def auto_create_ticket_from_complaint(sender, instance, created, **kwargs):
    if created:
        if CustomerCareTicket.objects.filter(linked_complaint=instance).exists():
            return

        # 1. Try to find an existing open ticket for the same customer that doesn't have a linked complaint yet
        from django.db.models import Q
        user = instance.raised_by
        q_filter = Q(customer=user) if user else Q()
        if user and user.email:
            q_filter |= Q(email__iexact=user.email)
        if user and getattr(user, "phone", ""):
            q_filter |= Q(phone=user.phone)
            
        existing_ticket = None
        if q_filter:
            existing_ticket = CustomerCareTicket.objects.filter(
                q_filter,
                linked_complaint__isnull=True
            ).exclude(status__in=["resolved", "closed"]).order_by("-created_at").first()

        if existing_ticket:
            existing_ticket.linked_complaint = instance
            existing_ticket.save(update_fields=["linked_complaint", "updated_at"])
            
            # Log the complaint's description as a customer message on the existing ticket
            if instance.description:
                TicketMessage.objects.create(
                    ticket=existing_ticket,
                    sender=instance.raised_by,
                    sender_persona=TicketMessage.SenderPersona.CUSTOMER,
                    message=instance.description,
                    is_internal_note=False
                )
            
            # Log activity
            from customer_care.models import TicketActivity
            TicketActivity.objects.create(
                ticket=existing_ticket,
                actor=user,
                activity_type="LINKED_COMPLAINT",
                description=f"Complaint #{instance.complaint_number} was linked to this ticket from the portal."
            )
            return

        # 2. Otherwise, create a new ticket
        company = getattr(instance.booking, "company", None)
        if not company:
            from companies.models import Company
            company = Company.objects.first()

        category_map = {
            Complaint.Category.WRONG_BILLING: "payment_issue",
            Complaint.Category.TECHNICIAN_LATE: "booking_issue",
            Complaint.Category.TECHNICIAN_BEHAVIOUR: "technician_issue",
            Complaint.Category.INCOMPLETE_WORK: "booking_issue",
            Complaint.Category.POOR_SERVICE: "service_quality",
            Complaint.Category.QUALITY_ISSUE: "service_quality",
            Complaint.Category.DAMAGED_PROPERTY: "missing_damaged",
        }
        ticket_category = category_map.get(instance.category, "other")

        priority_map = {
            Complaint.Priority.LOW: "low",
            Complaint.Priority.MEDIUM: "medium",
            Complaint.Priority.HIGH: "high",
            Complaint.Priority.CRITICAL: "critical",
        }
        ticket_priority = priority_map.get(instance.priority, "medium")

        try:
            ticket = ticket_service.create_ticket(
                company=company,
                created_by=instance.raised_by,
                category=ticket_category,
                priority=ticket_priority,
                channel="portal",
                customer=instance.raised_by,
                customer_name=instance.raised_by.get_full_name() or instance.raised_by.username,
                phone=getattr(instance.raised_by, "phone", ""),
                email=instance.raised_by.email,
                booking=instance.booking,
                linked_complaint=instance
            )
            
            # Log the complaint's description as a customer message on the new ticket
            if instance.description:
                TicketMessage.objects.create(
                    ticket=ticket,
                    sender=instance.raised_by,
                    sender_persona=TicketMessage.SenderPersona.CUSTOMER,
                    message=instance.description,
                    is_internal_note=False
                )
        except ValidationError:
            pass

from service_requests.models import ServiceFeedback

@receiver(post_save, sender=ServiceFeedback)
def auto_create_ticket_from_low_rating(sender, instance, created, **kwargs):
    if instance.is_submitted and instance.rating is not None and instance.rating <= 2:
        booking = instance.service_request
        company = getattr(booking, "company", None)
        if not company:
            from companies.models import Company
            company = Company.objects.first()

        # Prevent duplicate tickets for same low feedback event
        if CustomerCareTicket.objects.filter(booking=booking, category="service_quality").exists():
            return

        customer = booking.customer
        customer_name = (customer.get_full_name() or customer.username) if customer else "Unknown Customer"
        email = customer.email if customer else ""
        phone = getattr(customer, "phone", "") if customer else ""

        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            ticket_service.create_ticket(
                company=company,
                created_by=customer or getattr(booking, "created_by", None) or User.objects.first(),
                category="service_quality",
                priority="high",
                channel="portal",
                customer=customer,
                customer_name=customer_name,
                phone=phone,
                email=email,
                booking=booking
            )
        except ValidationError:
            pass


@receiver(post_save, sender=ComplaintMessage)
def sync_complaint_message_to_ticket(sender, instance, created, **kwargs):
    if created:
        ticket = CustomerCareTicket.objects.filter(linked_complaint=instance.complaint).first()
        if ticket:
            exists = TicketMessage.objects.filter(
                ticket=ticket,
                sender=instance.sender,
                message=instance.message
            ).exists()
            if not exists:
                persona = TicketMessage.SenderPersona.CUSTOMER
                if instance.sender_persona == ComplaintMessage.Persona.ADMIN:
                    persona = TicketMessage.SenderPersona.AGENT
                elif instance.sender_persona == ComplaintMessage.Persona.EMPLOYEE:
                    persona = TicketMessage.SenderPersona.AGENT
                
                TicketMessage.objects.create(
                    ticket=ticket,
                    sender=instance.sender,
                    sender_persona=persona,
                    message=instance.message,
                    is_internal_note=False
                )


@receiver(post_save, sender=TicketMessage)
def sync_ticket_message_to_complaint(sender, instance, created, **kwargs):
    if created:
        if instance.is_internal_note:
            return
        ticket = instance.ticket
        if ticket.linked_complaint:
            exists = ComplaintMessage.objects.filter(
                complaint=ticket.linked_complaint,
                sender=instance.sender,
                message=instance.message
            ).exists()
            if not exists:
                persona = ComplaintMessage.Persona.CUSTOMER
                if instance.sender_persona == TicketMessage.SenderPersona.AGENT:
                    persona = ComplaintMessage.Persona.ADMIN
                
                ComplaintMessage.objects.create(
                    complaint=ticket.linked_complaint,
                    sender=instance.sender,
                    sender_persona=persona,
                    message=instance.message
                )
