from rest_framework import serializers
from django.contrib.auth import get_user_model
from customer_care.models import (
    CustomerCareTicket,
    TicketMessage,
    TicketAttachment,
    TicketActivity,
    Escalation,
    CommunicationLog,
    CareAgentProfile,
    MessageTemplate,
    CancellationRequest,
)

User = get_user_model()

class CareAgentProfileSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = CareAgentProfile
        fields = (
            "id",
            "user",
            "user_username",
            "user_email",
            "care_role",
            "refund_approval_limit",
            "is_active",
            "created_at",
            "updated_at",
        )

class TicketMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username", read_only=True)

    class Meta:
        model = TicketMessage
        fields = (
            "id",
            "sender",
            "sender_username",
            "sender_persona",
            "message",
            "is_internal_note",
            "created_at",
        )

    def to_representation(self, instance):
        # Drops internal notes if serializing for a customer context
        if instance.is_internal_note and self.context.get("for_customer"):
            return None
        return super().to_representation(instance)

class TicketAttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source="uploaded_by.username", read_only=True)

    class Meta:
        model = TicketAttachment
        fields = (
            "id",
            "file",
            "uploaded_by",
            "uploaded_by_username",
            "created_at",
        )

class TicketActivitySerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = TicketActivity
        fields = (
            "id",
            "actor",
            "actor_username",
            "activity_type",
            "from_status",
            "to_status",
            "description",
            "created_at",
        )

class EscalationSerializer(serializers.ModelSerializer):
    escalated_by_username = serializers.CharField(source="escalated_by.username", read_only=True)
    escalated_to_username = serializers.CharField(source="escalated_to_user.username", read_only=True)

    class Meta:
        model = Escalation
        fields = (
            "id",
            "escalated_by",
            "escalated_by_username",
            "escalated_to_tier",
            "escalated_to_user",
            "escalated_to_username",
            "reason",
            "is_resolved",
            "resolution_note",
            "created_at",
            "resolved_at",
        )

class CommunicationLogSerializer(serializers.ModelSerializer):
    logged_by_username = serializers.CharField(source="logged_by.username", read_only=True)

    class Meta:
        model = CommunicationLog
        fields = (
            "id",
            "channel",
            "direction",
            "summary",
            "duration_seconds",
            "logged_by",
            "logged_by_username",
            "occurred_at",
            "created_at",
        )

class TicketListSerializer(serializers.ModelSerializer):
    assigned_agent_username = serializers.CharField(source="assigned_agent.username", read_only=True)
    customer_username = serializers.CharField(source="customer.username", read_only=True)
    booking_request_id = serializers.CharField(source="booking.request_id", read_only=True)
    linked_refund_request_refund_id = serializers.CharField(source="linked_refund_request.refund_id", read_only=True)
    linked_refund_request_status = serializers.CharField(source="linked_refund_request.status", read_only=True)
    linked_refund_request_amount = serializers.DecimalField(source="linked_refund_request.requested_amount", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CustomerCareTicket
        fields = (
            "id",
            "ticket_number",
            "customer",
            "customer_username",
            "customer_name",
            "phone",
            "email",
            "booking",
            "booking_request_id",
            "linked_complaint",
            "linked_refund_request",
            "linked_refund_request_refund_id",
            "linked_refund_request_status",
            "linked_refund_request_amount",
            "linked_reschedule_request",
            "category",
            "priority",
            "status",
            "channel",
            "assigned_agent",
            "assigned_agent_username",
            "created_at",
            "updated_at",
            "sla_due_at",
            "first_response_at",
            "resolved_at",
            "closed_at",
        )

class CancellationRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source="requested_by.username", read_only=True)
    approved_by_username = serializers.CharField(source="approved_by.username", read_only=True)
    refund_request_refund_id = serializers.CharField(source="refund_request.refund_id", read_only=True)

    class Meta:
        model = CancellationRequest
        fields = (
            "id",
            "ticket",
            "booking",
            "reason",
            "reason_note",
            "retention_offered",
            "retention_outcome",
            "refund_request",
            "refund_request_refund_id",
            "requested_by",
            "requested_by_username",
            "approved_by",
            "approved_by_username",
            "status",
            "created_at",
            "decided_at",
        )

class MessageTemplateSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model = MessageTemplate
        fields = (
            "id",
            "name",
            "channel",
            "category",
            "body",
            "is_active",
            "created_by",
            "created_by_username",
            "created_at",
        )

class TicketDetailSerializer(TicketListSerializer):
    messages = serializers.SerializerMethodField()
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    activities = TicketActivitySerializer(many=True, read_only=True)
    escalations = EscalationSerializer(many=True, read_only=True)
    communication_logs = CommunicationLogSerializer(many=True, read_only=True)
    cancellation_requests = CancellationRequestSerializer(many=True, read_only=True)

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + (
            "messages",
            "attachments",
            "activities",
            "escalations",
            "communication_logs",
            "cancellation_requests",
            "resolution_summary",
        )

    def get_messages(self, obj):
        qs = obj.messages.all().order_by("created_at")
        if self.context.get("for_customer"):
            qs = qs.filter(is_internal_note=False)
        return TicketMessageSerializer(qs, many=True, context=self.context).data
