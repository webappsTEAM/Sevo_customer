from django.db.models.signals import post_save
from django.dispatch import receiver
from service_requests.models import Complaint
from customer_care.models import CustomerCareTicket
from customer_care.services import ticket_service
from django.core.exceptions import ValidationError

@receiver(post_save, sender=Complaint)
def auto_create_ticket_from_complaint(sender, instance, created, **kwargs):
    if created:
        if CustomerCareTicket.objects.filter(linked_complaint=instance).exists():
            return

        company = getattr(instance.booking, "company", None)
        if not company:
            from companies.models import Company
            company = Company.objects.first()

        category_map = {
            Complaint.Category.WRONG_BILLING: "billing",
            Complaint.Category.TECHNICIAN_LATE: "scheduling",
            Complaint.Category.POOR_SERVICE: "feedback",
            Complaint.Category.QUALITY_ISSUE: "feedback",
        }
        ticket_category = category_map.get(instance.category, "general")

        priority_map = {
            Complaint.Priority.LOW: "low",
            Complaint.Priority.MEDIUM: "medium",
            Complaint.Priority.HIGH: "high",
            Complaint.Priority.CRITICAL: "critical",
        }
        ticket_priority = priority_map.get(instance.priority, "medium")

        try:
            ticket_service.create_ticket(
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
        if CustomerCareTicket.objects.filter(booking=booking, category="feedback").exists():
            return

        customer = booking.customer
        customer_name = (customer.get_full_name() or customer.username) if customer else "Unknown Customer"
        email = customer.email if customer else ""
        phone = getattr(customer, "phone", "") if customer else ""

        try:
            ticket_service.create_ticket(
                company=company,
                created_by=customer or booking.created_by or User.objects.first(),
                category="feedback",
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
