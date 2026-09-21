import uuid
from django.conf import settings
from django.db import models


class AgentType(models.TextChoices):
    CUSTOMER = "customer", "Customer Agent"
    VENDOR = "vendor", "Vendor Agent"
    PUBLIC = "public", "Public Agent"


class SenderType(models.TextChoices):
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"
    SYSTEM = "system", "System"
    TOOL = "tool", "Tool"


class AuthorizationResult(models.TextChoices):
    GRANTED = "granted", "Granted"
    DENIED = "denied", "Denied"
    NOT_REQUIRED = "not_required", "Not Required"


class AuditStatus(models.TextChoices):
    SUCCESS = "success", "Success"
    ERROR = "error", "Error"
    BLOCKED_BY_GUARDRAIL = "blocked_by_guardrail", "Blocked by Guardrail"


class KnowledgeCategory(models.TextChoices):
    POLICY = "policy", "Policy"
    PACKAGE = "package", "Package"
    VENDOR_GUIDE = "vendor_guide", "Vendor Guide"
    FAQ = "faq", "FAQ"
    HELP = "help", "Help"


class Conversation(models.Model):
    """
    Session container for an AI interaction sequence.
    Keyed by conversation_id, user_id, and active persona agent.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="ai_conversations",
        db_index=True,
    )
    agent_type = models.CharField(
        max_length=32,
        choices=AgentType.choices,
        default=AgentType.CUSTOMER,
        db_index=True,
    )
    title = models.CharField(max_length=255, default="New Conversation")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Conversation {self.id} ({self.agent_type}) - User: {self.user_id or 'Anonymous'}"


class ChatMessage(models.Model):
    """
    Individual turn within a conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
        db_index=True,
    )
    sender = models.CharField(max_length=16, choices=SenderType.choices)
    content = models.TextField()
    tool_calls = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.sender}] {self.conversation_id}: {self.content[:40]}"


class AIAuditLog(models.Model):
    """
    Immutable compliance & safety log for every AI query, tool call, and authorization check.
    Never stores credentials, passwords, raw payment details, or OTPs.
    """
    user_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    role = models.CharField(max_length=50, blank=True, default="")
    agent_type = models.CharField(max_length=50, default="customer")
    user_query = models.TextField()
    tool_name = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    resource_id = models.CharField(max_length=100, null=True, blank=True, db_index=True)
    authorization_result = models.CharField(
        max_length=30,
        choices=AuthorizationResult.choices,
        default=AuthorizationResult.NOT_REQUIRED,
    )
    status = models.CharField(
        max_length=30,
        choices=AuditStatus.choices,
        default=AuditStatus.SUCCESS,
    )
    details = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"AuditLog {self.id} [{self.status}] Tool: {self.tool_name} User: {self.user_id}"


class KnowledgeChunk(models.Model):
    """
    Verified knowledge chunk for RAG. Only populated from the approved knowledge allow-list.
    """
    source_id = models.CharField(max_length=200, db_index=True)
    source_category = models.CharField(
        max_length=50,
        choices=KnowledgeCategory.choices,
        default=KnowledgeCategory.POLICY,
        db_index=True,
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    embedding = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["source_category", "title"]

    def __str__(self):
        return f"[{self.source_category}] {self.title} ({self.source_id})"
