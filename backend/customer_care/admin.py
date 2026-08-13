from django.contrib import admin
from .models import (
    CustomerCareTicket,
    TicketMessage,
    TicketAttachment,
    TicketActivity,
    Escalation,
    CommunicationLog,
    CareAgentProfile
)

class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 0
    raw_id_fields = ("sender",)

class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0
    raw_id_fields = ("uploaded_by",)

class TicketActivityInline(admin.TabularInline):
    model = TicketActivity
    extra = 0
    raw_id_fields = ("actor",)

class EscalationInline(admin.TabularInline):
    model = Escalation
    extra = 0
    raw_id_fields = ("escalated_by", "escalated_to_user")

class CommunicationLogInline(admin.TabularInline):
    model = CommunicationLog
    extra = 0
    raw_id_fields = ("logged_by",)

@admin.register(CustomerCareTicket)
class CustomerCareTicketAdmin(admin.ModelAdmin):
    list_display = (
        "ticket_number",
        "company",
        "category",
        "priority",
        "status",
        "assigned_agent",
        "created_at"
    )
    list_filter = ("status", "priority", "category", "company")
    search_fields = ("ticket_number", "customer_name", "phone", "email")
    raw_id_fields = ("customer", "booking", "assigned_agent", "created_by")
    inlines = [
        TicketMessageInline,
        TicketAttachmentInline,
        TicketActivityInline,
        EscalationInline,
        CommunicationLogInline
    ]

@admin.register(CareAgentProfile)
class CareAgentProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "company", "care_role", "refund_approval_limit", "is_active")
    list_filter = ("care_role", "is_active", "company")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "assigned_by")

admin.site.register(TicketMessage)
admin.site.register(TicketAttachment)
admin.site.register(TicketActivity)
admin.site.register(Escalation)
admin.site.register(CommunicationLog)
