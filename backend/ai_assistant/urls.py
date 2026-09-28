from django.urls import path
from ai_assistant.views import (
    AIChatView,
    AIConversationListView,
    AIConversationDetailView,
    AIHandoffListView,
    AIHandoffClaimView,
    AIHandoffReplyView,
    AIHandoffCreateTicketView,
    PhotoAccessGateView,
)

app_name = "ai_assistant"

urlpatterns = [
    # Main AI Chat Gateway endpoint (mandatory trailing slash)
    path("chat/", AIChatView.as_view(), name="ai-chat"),
    # Conversation session history
    path("conversations/", AIConversationListView.as_view(), name="ai-conversations"),
    path("conversations/<uuid:pk>/", AIConversationDetailView.as_view(), name="ai-conversation-detail"),
    # Support agent inbox & claim endpoints
    path("handoffs/", AIHandoffListView.as_view(), name="ai-handoffs"),
    path("handoffs/<uuid:pk>/claim/", AIHandoffClaimView.as_view(), name="ai-handoff-claim"),
    path("handoffs/<uuid:pk>/reply/", AIHandoffReplyView.as_view(), name="ai-handoff-reply"),
    path("handoffs/<uuid:pk>/create-ticket/", AIHandoffCreateTicketView.as_view(), name="ai-handoff-create-ticket"),
    # Authenticated photo gate
    path("photos/<path:file_path>", PhotoAccessGateView.as_view(), name="ai-photo-gate"),
]
