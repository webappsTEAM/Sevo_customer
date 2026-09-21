import json
import uuid
from typing import Dict, Any, List
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from accounts.authentication import CookieJWTAuthentication
from ai_assistant.models import (
    Conversation,
    ChatMessage,
    AIAuditLog,
    AgentType,
    SenderType,
    AuditStatus,
    AuthorizationResult,
)
from ai_assistant.guardrails.input_guard import InputGuard
from ai_assistant.guardrails.output_guard import OutputGuard
from ai_assistant.router.agent_router import AgentRouter
from ai_assistant.rag.retriever import KnowledgeRetriever
from ai_assistant.tools.registry import default_tool_registry
from ai_assistant.llm import get_llm_provider


class AIChatView(APIView):
    """
    POST /api/ai/chat/
    Centralized AI Gateway for CalServices.
    Flow: Authenticate -> Route -> Retrieve (RAG / Read-Only Tools) -> Validate -> Answer.
    Trailing slash mandatory (APPEND_SLASH = False).
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        user_message = (request.data.get("message") or "").strip()
        conv_id_str = request.data.get("conversation_id")

        if not user_message:
            return Response(
                {"success": False, "message": "The 'message' field is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Build trusted server-side context (Identity strictly from JWT, never user input)
        context: Dict[str, Any] = {
            "request": request,
            "user": user if is_authenticated else None,
            "user_id": str(user.id) if is_authenticated else None,
            "role": getattr(user, "role", "public") if is_authenticated else "public",
            "query": user_message,
        }

        # 2. Determine or resolve conversation
        conversation = None
        if conv_id_str:
            try:
                c_uuid = uuid.UUID(str(conv_id_str).strip())
                qs = Conversation.objects.filter(id=c_uuid)
                if is_authenticated:
                    # Enforce isolation: cannot resume someone else's conversation
                    conversation = qs.filter(user=user).first()
                else:
                    conversation = qs.filter(user__isnull=True).first()
            except (ValueError, TypeError):
                pass

        if not conversation:
            agent_type = AgentRouter.route(context)
            conversation = Conversation.objects.create(
                user=user if is_authenticated else None,
                agent_type=agent_type,
                title=user_message[:40],
            )
        else:
            agent_type = conversation.agent_type

        context["agent_type"] = agent_type
        context["conversation_id"] = str(conversation.id)

        # 3. Input Guard (Prompt Injection defense + Read-Only Write Action Interception)
        input_check = InputGuard.inspect(user_message)
        if input_check.is_blocked:
            # Persist user turn and intercepted guidance turn
            ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.USER,
                content=user_message,
            )
            ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.ASSISTANT,
                content=input_check.response_override or "Action unavailable in read-only mode.",
                metadata={"blocked_by_guardrail": True, "category": input_check.category},
            )
            AIAuditLog.objects.create(
                user_id=context["user_id"],
                role=context["role"],
                agent_type=agent_type,
                user_query=user_message,
                status=AuditStatus.BLOCKED_BY_GUARDRAIL,
                authorization_result=AuthorizationResult.DENIED if input_check.category == "injection" else AuthorizationResult.NOT_REQUIRED,
                details={"reason": input_check.reason, "category": input_check.category},
            )
            return Response({
                "success": True,
                "data": {
                    "conversation_id": str(conversation.id),
                    "message": input_check.response_override,
                    "agent": agent_type,
                    "blocked_by_guardrail": True,
                },
            }, status=status.HTTP_200_OK)

        # 4. Retrieve RAG Knowledge from Approved allowlist
        rag_chunks = KnowledgeRetriever.retrieve(user_message, top_k=3)
        rag_context = KnowledgeRetriever.format_context(rag_chunks)
        context["rag_context"] = rag_context

        # 5. Build System Prompt & History
        system_prompt = AgentRouter.get_system_prompt(agent_type, context)
        past_msgs = list(
            conversation.messages.filter(sender__in=[SenderType.USER, SenderType.ASSISTANT])
            .order_by("-created_at")[:6]
        )
        past_msgs.reverse()

        history: List[Dict[str, str]] = []
        for pm in past_msgs:
            role_map = {
                SenderType.USER: "user",
                SenderType.ASSISTANT: "assistant",
            }
            history.append({"role": role_map.get(pm.sender, "user"), "content": pm.content})

        history.append({"role": "user", "content": user_message})

        # Save incoming user message
        ChatMessage.objects.create(
            conversation=conversation,
            sender=SenderType.USER,
            content=user_message,
        )

        # 6. Retrieve available read-only tool schemas for current context
        tool_schemas = default_tool_registry.get_schemas_for_context(context)

        # 7. LLM Processing & Tool Calling
        provider = get_llm_provider()
        llm_resp = provider.generate(
            messages=history,
            tools=tool_schemas,
            system_prompt=system_prompt,
            context=context,
        )

        # 8. If tool calls requested, execute each strictly through registry
        executed_tools = []
        final_answer = llm_resp.content

        if llm_resp.tool_calls:
            for tc in llm_resp.tool_calls:
                fn = tc.get("function", {})
                t_name = fn.get("name", "")
                t_args = fn.get("arguments", {})
                if isinstance(t_args, str):
                    try:
                        t_args = json.loads(t_args)
                    except Exception:
                        t_args = {}

                t_res = default_tool_registry.execute(t_name, t_args, context)
                executed_tools.append({"tool": t_name, "args": t_args, "result": t_res})

                # Append tool result to conversation turns
                ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.TOOL,
                    content=json.dumps(t_res),
                    metadata={"tool_name": t_name},
                )
                history.append({"role": "tool", "content": json.dumps(t_res)})

            # Ask LLM to synthesize final response with tool results
            second_resp = provider.generate(
                messages=history,
                tools=[],
                system_prompt=system_prompt,
                context=context,
            )
            final_answer = (second_resp.content or "").strip()

            # If LLM synthesis failed or hit temporary limit, fallback to direct tool presentation
            if not final_answer or final_answer.startswith("I apologize, but I am currently experiencing"):
                fallback_lines = []
                for et in executed_tools:
                    t_name = et.get("tool")
                    t_res = et.get("result", {})
                    if t_name == "search_products":
                        pkgs = t_res.get("packages", [])
                        if pkgs:
                            fallback_lines.append("Here are the available service packages:")
                            for p in pkgs[:5]:
                                name = p.get("name", "Service")
                                price = p.get("price")
                                duration = p.get("duration_minutes")
                                price_str = f"₹{price}" if price else "Price on inquiry"
                                dur_str = f" ({duration} mins)" if duration else ""
                                fallback_lines.append(f"• **{name}**: {price_str}{dur_str}")
                            fallback_lines.append("\nWould you like me to help you book one of these services?")
                    elif t_name in ("get_customer_orders", "get_order_details"):
                        orders = t_res.get("orders") or ([t_res.get("order")] if t_res.get("order") else [])
                        if orders:
                            fallback_lines.append("Here are your current bookings:")
                            for o in orders[:5]:
                                oid = o.get("order_id") or o.get("id")
                                title = o.get("service_title") or o.get("service_name") or "Booking"
                                st = o.get("status", "Active")
                                fallback_lines.append(f"• **{title}** (ID: {oid}) - Status: **{st}**")
                if fallback_lines:
                    final_answer = "\n".join(fallback_lines)

        if not final_answer or final_answer.startswith("I apologize, but I am currently experiencing"):
            if rag_chunks:
                top_chunk = rag_chunks[0]
                final_answer = f"Based on CalServices information:\n\n{top_chunk.get('content', '')}"

        # 9. Output Guard: Scrub secrets, tokens, enforce 599 fallback and technician sentinel
        safe_response = OutputGuard.sanitize_llm_response(final_answer)

        # Save assistant message
        msg_metadata = {}
        if rag_chunks:
            msg_metadata["sources"] = [rc["title"] for rc in rag_chunks]
        ChatMessage.objects.create(
            conversation=conversation,
            sender=SenderType.ASSISTANT,
            content=safe_response,
            tool_calls=executed_tools,
            metadata=msg_metadata,
        )

        # Record successful audit entry
        AIAuditLog.objects.create(
            user_id=context["user_id"],
            role=context["role"],
            agent_type=agent_type,
            user_query=user_message,
            status=AuditStatus.SUCCESS,
            authorization_result=AuthorizationResult.GRANTED,
            details={"tools_invoked": [et["tool"] for et in executed_tools], "rag_chunks_count": len(rag_chunks)},
        )

        return Response({
            "success": True,
            "data": {
                "conversation_id": str(conversation.id),
                "message": safe_response,
                "agent": agent_type,
                "sources": [rc["title"] for rc in rag_chunks],
            },
        }, status=status.HTTP_200_OK)


class AIConversationListView(APIView):
    """
    GET /api/ai/conversations/
    Lists previous chat sessions for the authenticated customer.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(user=request.user).order_by("-updated_at")[:20]
        data = [
            {
                "id": str(c.id),
                "title": c.title,
                "agent_type": c.agent_type,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "message_count": c.messages.count(),
            }
            for c in conversations
        ]
        return Response({"success": True, "data": data}, status=status.HTTP_200_OK)


class AIConversationDetailView(APIView):
    """
    GET /api/ai/conversations/<uuid:pk>/
    Retrieves full message history for a specific conversation owned by the customer or guest.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        user = request.user
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        try:
            if is_authenticated:
                conv = Conversation.objects.get(pk=pk, user=user)
            else:
                conv = Conversation.objects.get(pk=pk, user__isnull=True)
        except Conversation.DoesNotExist:
            return Response(
                {"success": False, "message": "Conversation not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        messages = conv.messages.filter(sender__in=[SenderType.USER, SenderType.ASSISTANT]).order_by("created_at")
        msg_list = [
            {
                "id": str(m.id),
                "sender": m.sender,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "sources": (m.metadata.get("sources") if isinstance(m.metadata, dict) else []) or [],
            }
            for m in messages
        ]

        return Response({
            "success": True,
            "data": {
                "id": str(conv.id),
                "title": conv.title,
                "agent_type": conv.agent_type,
                "messages": msg_list,
            },
        }, status=status.HTTP_200_OK)
