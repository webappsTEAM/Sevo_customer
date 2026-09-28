from django.urls import path
from ai_assistant.views import (
    AIChatView,
    AIConversationListView,
    AIConversationDetailView,
)

app_name = "ai_assistant"

urlpatterns = [
    # Main AI Chat Gateway endpoint (mandatory trailing slash)
    path("chat/", AIChatView.as_view(), name="ai-chat"),
    # Conversation session history
    path("conversations/", AIConversationListView.as_view(), name="ai-conversations"),
    path("conversations/<uuid:pk>/", AIConversationDetailView.as_view(), name="ai-conversation-detail"),
]
