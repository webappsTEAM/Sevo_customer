import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from common.models import CompanyScopedModel

def generate_ticket_number():
    today = timezone.now().strftime("%Y%m%d")
    suffix = uuid.uuid4().hex[:4].upper()
    return f"CCT-{today}-{suffix}"

class CustomerCareTicket(CompanyScopedModel):
    class Category(models.TextChoices):
        GENERAL = "general", "General Support"
        BILLING = "billing", "Billing & Payments"
        TECHNICAL = "technical", "Technical Issue"
        SCHEDULING = "scheduling", "Scheduling & Dispatch"
        FEEDBACK = "feedback", "Customer Feedback"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        NEW = "new", "New"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In Progress"
        WAITING_ON_CUSTOMER = "waiting_on_customer", "Waiting on Customer"
        WAITING_ON_INTERNAL = "waiting_on_internal", "Waiting on Internal"
        ESCALATED = "escalated", "Escalated"
        RESOLVED = "resolved", "Resolved"
        REOPENED = "reopened", "Reopened"
        CLOSED = "closed", "Closed"

    class Channel(models.TextChoices):
        PORTAL = "portal", "Customer Portal"
        CALL = "call", "Phone Call"
        EMAIL = "email", "Email"
        CHAT = "chat", "Live Chat"
        OTHER = "other", "Other"

    ticket_number = models.CharField(
        max_length=30, unique=True, default=generate_ticket_number, editable=False
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tickets",
    )
    # Fields to log details for walk-in or call-logged tickets with no portal account
    customer_name = models.CharField(max_length=150, blank=True, default="")
    phone = models.CharField(max_length=30, blank=True, default="")
    email = models.EmailField(blank=True, default="")

    booking = models.ForeignKey(
        "service_requests.ServiceRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tickets",
    )
    linked_complaint = models.ForeignKey(
        "service_requests.Complaint",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tickets",
    )
    linked_refund_request = models.ForeignKey(
        "service_requests.RefundRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tickets",
    )
    linked_reschedule_request = models.ForeignKey(
        "service_requests.RescheduleRequest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="care_tickets",
    )

    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.GENERAL
    )
    priority = models.CharField(
        max_length=20, choices=Priority.choices, default=Priority.MEDIUM
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.NEW
    )
    channel = models.CharField(
        max_length=20, choices=Channel.choices, default=Channel.PORTAL
    )

    assigned_agent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_care_tickets",
    )

    sla_due_at = models.DateTimeField(null=True, blank=True)
    first_response_at = models.DateTimeField(null=True, blank=True)
    resolution_summary = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.ticket_number} - {self.category} ({self.status})"

class TicketMessage(models.Model):
    class SenderPersona(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        AGENT = "agent", "Support Agent"
        SYSTEM = "system", "System Auto-Log"

    ticket = models.ForeignKey(
        CustomerCareTicket, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    sender_persona = models.CharField(
        max_length=20, choices=SenderPersona.choices, default=SenderPersona.AGENT
    )
    message = models.TextField()
    is_internal_note = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Message from {self.sender_persona} on {self.ticket.ticket_number}"

class TicketAttachment(models.Model):
    ticket = models.ForeignKey(
        CustomerCareTicket, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="customer_care/attachments/")
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment on {self.ticket.ticket_number} by {self.uploaded_by.username}"

class TicketActivity(models.Model):
    ticket = models.ForeignKey(
        CustomerCareTicket, on_delete=models.CASCADE, related_name="activities"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    activity_type = models.CharField(max_length=50)
    from_status = models.CharField(max_length=20, null=True, blank=True)
    to_status = models.CharField(max_length=20, null=True, blank=True)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Activity {self.activity_type} on {self.ticket.ticket_number}"

class Escalation(models.Model):
    ticket = models.ForeignKey(
        CustomerCareTicket, on_delete=models.CASCADE, related_name="escalations"
    )
    escalated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="escalated_tickets"
    )
    escalated_to_tier = models.CharField(max_length=30)
    escalated_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="escalated_to_me",
    )
    reason = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Escalation for {self.ticket.ticket_number} to {self.escalated_to_tier}"

class CommunicationLog(models.Model):
    class Channel(models.TextChoices):
        CALL = "call", "Phone Call"
        SMS = "sms", "SMS Message"
        WHATSAPP = "whatsapp", "WhatsApp"
        EMAIL = "email", "Email"
        IN_PERSON = "in_person", "In Person"

    class Direction(models.TextChoices):
        INBOUND = "inbound", "Inbound"
        OUTBOUND = "outbound", "Outbound"

    ticket = models.ForeignKey(
        CustomerCareTicket, on_delete=models.CASCADE, related_name="communication_logs"
    )
    channel = models.CharField(max_length=20, choices=Channel.choices)
    direction = models.CharField(max_length=10, choices=Direction.choices)
    summary = models.TextField()
    duration_seconds = models.IntegerField(null=True, blank=True)
    logged_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    occurred_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log ({self.channel}) on {self.ticket.ticket_number}"

class CareAgentProfile(CompanyScopedModel):
    class CareRole(models.TextChoices):
        CARE_EXECUTIVE = "care_executive", "Care Executive"
        SENIOR_CARE = "senior_care", "Senior Care"
        OPS_MANAGER = "ops_manager", "Ops Manager"
        ADMIN = "admin", "Admin Support"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="care_profile"
    )
    care_role = models.CharField(max_length=30, choices=CareRole.choices)
    refund_approval_limit = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    is_active = models.BooleanField(default=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_agents",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.care_role}"
