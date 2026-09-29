import os
import json
import uuid
from typing import Dict, Any, List, cast
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.utils import timezone
from django.core.files.storage import default_storage
from django.db import transaction
from django.http import FileResponse, Http404

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


def is_support_agent_or_admin(user) -> bool:
    """Checks whether user is authorized as care agent, support staff, or admin."""
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    if getattr(user, "role", "") in ["admin", "manager", "support"]:
        return True
    try:
        from customer_care.permissions import get_care_access
        access = get_care_access(user)
        return bool(access.get("has_access"))
    except Exception:
        return False


class IsSupportAgentOrAdmin(permissions.BasePermission):
    """
    Gated permission so only authenticated support, care, and admin roles can call server-side.
    """
    def has_permission(self, request, view):
        return is_support_agent_or_admin(request.user)


class AIChatView(APIView):
    """
    POST /api/ai/chat/
    Centralized AI Gateway for CalServices.
    Flow: Authenticate -> Route -> Retrieve (RAG / Read-Only Tools) -> Validate -> Answer.
    Supports deterministic Intake + Handoff for return/refund/replacement.
    Trailing slash mandatory (APPEND_SLASH = False).
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        image_file = request.FILES.get("image")
        user_message = (request.data.get("message") or "").strip()
        conv_id_str = request.data.get("conversation_id")

        if not user_message and image_file:
            user_message = "Uploaded photo for verification"

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

        conv_meta = conversation.metadata or {}

        # 2a. If conversation is already handed off to human support, AI is muted
        if conv_meta.get("handed_to_human"):
            ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.USER,
                content=user_message,
            )
            return Response({
                "success": True,
                "data": {
                    "conversation_id": str(conversation.id),
                    "message": "",
                    "agent": agent_type,
                    "expects": "text",
                    "options": [],
                    "handed_off": True,
                    "created_at": timezone.now().isoformat(),
                },
            }, status=status.HTTP_200_OK)

        # 2b. If conversation is already in support flow, advance the deterministic wizard
        if conv_meta.get("flow") == "support":
            return self._handle_support_flow(conversation, user_message, request, context)

        # 3. Input Guard (Prompt Injection defense + Read-Only Write Action Interception + Support Intent Detection)
        input_check = InputGuard.inspect(user_message)
        if input_check.is_blocked:
            # Persist user turn and intercepted guidance turn
            ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.USER,
                content=user_message,
            )
            asst_msg = ChatMessage.objects.create(
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
                    "expects": "text",
                    "options": [],
                    "handed_off": False,
                    "created_at": asst_msg.created_at.isoformat(),
                },
            }, status=status.HTTP_200_OK)

        # 3b. Check for return / refund / replacement support intake intent
        if input_check.category == "support_intent" or input_check.is_support_intent:
            if not is_authenticated:
                # Unauthenticated guest is guided to log in rather than entering flow
                login_guidance = "Please log in to your account to request a return, refund, or replacement for your orders."
                ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.USER,
                    content=user_message,
                )
                asst_msg = ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.ASSISTANT,
                    content=login_guidance,
                )
                return Response({
                    "success": True,
                    "data": {
                        "conversation_id": str(conversation.id),
                        "message": login_guidance,
                        "agent": agent_type,
                        "expects": "text",
                        "options": [],
                        "handed_off": False,
                        "created_at": asst_msg.created_at.isoformat(),
                    },
                }, status=status.HTTP_200_OK)

            # Start support wizard
            conv_meta["flow"] = "support"
            conv_meta["support_step"] = "INIT"
            conv_meta["support_data"] = {}
            conversation.metadata = conv_meta
            conversation.save()
            return self._handle_support_flow(conversation, user_message, request, context, is_initial=True)

        # 4. Retrieve RAG Knowledge from Approved allowlist (skip for direct booking/order lookups)
        is_order_query = any(w in user_message.lower() for w in ["my booking", "my order", "active booking", "where is", "track", "status of", "check my"])
        rag_chunks = [] if is_order_query else KnowledgeRetriever.retrieve(user_message, top_k=3)
        rag_context = KnowledgeRetriever.format_context(rag_chunks) if rag_chunks else ""
        context["rag_context"] = rag_context

        # 5. Build System Prompt & History
        past_msgs = list(
            conversation.messages.filter(sender__in=[SenderType.USER, SenderType.ASSISTANT])
            .order_by("-created_at")[:6]
        )
        past_msgs.reverse()
        context["is_followup"] = len(past_msgs) > 0

        system_prompt = AgentRouter.get_system_prompt(agent_type, context)

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
                        bookings = t_res.get("bookings") or ([t_res.get("order")] if t_res.get("order") else [])
                        if bookings:
                            is_delayed_q = any(w in user_message.lower() for w in ["delay", "still not", "not delivered", "where is", "status", "track"])
                            if is_delayed_q:
                                fallback_lines.append("I’m sorry for the delay. Let me check your order status.\n\nHere are your orders:")
                            else:
                                fallback_lines.append("Here are your current orders:")
                            for b in bookings[:5]:
                                bid = b.get("booking_id") or b.get("id") or b.get("order_id")
                                title = b.get("issue_title") or b.get("service_category") or b.get("title") or "Order"
                                st = b.get("status_display") or b.get("status") or "Active"
                                fallback_lines.append(f"• **Order #{bid}**: {title} (Status: **{st}**)")
                            fallback_lines.append("\nWhich order are you referring to?")
                if fallback_lines:
                    final_answer = "\n".join(fallback_lines)

        if not final_answer or final_answer.startswith("I apologize, but I am currently experiencing"):
            final_answer = (
                "I apologize, but I am momentarily experiencing high service traffic. "
                "Please try asking your question again in a moment, or let me know if you would like assistance connecting with our support team."
            )

        # 9. Output Guard: Scrub secrets, tokens, enforce 599 fallback and technician sentinel
        safe_response = OutputGuard.sanitize_llm_response(final_answer, is_followup=context.get("is_followup", False))

        # Extract choice chips if bot is asking which order the customer refers to
        options = []
        if "which order are you referring to" in safe_response.lower():
            for et in executed_tools:
                if et.get("tool") == "get_customer_orders":
                    t_bookings = et.get("result", {}).get("bookings", [])
                    for b in t_bookings[:5]:
                        bid = b.get("booking_id") or b.get("id")
                        title = b.get("issue_title") or b.get("service_category") or "Order"
                        options.append({
                            "label": f"Order #{bid} ({title})",
                            "value": f"Order #{bid}",
                        })

        # Save assistant message
        msg_metadata = {}
        if rag_chunks:
            msg_metadata["sources"] = [rc["title"] for rc in rag_chunks]
        if options:
            msg_metadata["options"] = options
        asst_msg = ChatMessage.objects.create(
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
                "sources": [rc["title"] for rc in rag_chunks] if not executed_tools else [],
                "expects": "text",
                "options": options,
                "handed_off": False,
                "created_at": asst_msg.created_at.isoformat(),
            },
        }, status=status.HTTP_200_OK)

    def _handle_support_flow(self, conversation, user_message, request, context, is_initial=False):
        """
        Deterministic, rule-based wizard for Return / Refund / Replace support intake.
        Phase 1: Strictly Intake + Handoff.
        AI never decides, approves, calculates refunds, or creates tickets.
        """
        meta = conversation.metadata or {}
        step = meta.get("support_step", "SELECT_ORDER")
        support_data = meta.get("support_data", {})

        # Record incoming user turn
        ChatMessage.objects.create(
            conversation=conversation,
            sender=SenderType.USER,
            content=user_message,
        )

        reason_options = [
            {"label": "Damaged", "value": "Damaged"},
            {"label": "Wrong item", "value": "Wrong item"},
            {"label": "Missing item", "value": "Missing item"},
            {"label": "Not as described", "value": "Not as described"},
            {"label": "Quality issue", "value": "Quality issue"},
            {"label": "Other", "value": "Other"},
        ]

        # Case 1: Initial entry or selecting order
        if is_initial or step in ("INIT", "SELECT_ORDER"):
            if is_initial or step == "INIT":
                # Step 2: SELECT_ORDER - call get_customer_orders
                orders_res = default_tool_registry.execute("get_customer_orders", {"limit": 10}, context)
                bookings = orders_res.get("bookings") or []
                if not bookings:
                    msg = "You do not have any recent orders or bookings eligible for a return, refund, or replacement."
                    meta["flow"] = None
                    conversation.metadata = meta
                    conversation.save()
                    asst_msg = ChatMessage.objects.create(
                        conversation=conversation,
                        sender=SenderType.ASSISTANT,
                        content=msg,
                    )
                    return Response({
                        "success": True,
                        "data": {
                            "conversation_id": str(conversation.id),
                            "message": msg,
                            "agent": conversation.agent_type,
                            "expects": "text",
                            "options": [],
                            "handed_off": False,
                            "created_at": asst_msg.created_at.isoformat(),
                        },
                    }, status=status.HTTP_200_OK)

                if len(bookings) == 1:
                    # One order -> auto-select
                    b = bookings[0]
                    order_id = str(b.get("booking_id") or b.get("request_id"))
                    detail_res = default_tool_registry.execute("get_order_details", {"order_id": order_id}, context)
                    order_info = detail_res.get("order") or b
                    title = order_info.get("title") or order_info.get("category") or f"Order #{order_id}"
                    status_str = order_info.get("status_display") or order_info.get("status") or "Confirmed"

                    meta["active_order_id"] = order_id
                    meta["support_step"] = "CAPTURE_REASON"
                    meta["support_data"] = {
                        "order_id": order_id,
                        "order_title": title,
                        "status": status_str,
                    }
                    conversation.metadata = meta
                    conversation.save()

                    reply_text = (
                        f"I've selected your order **{title}** (#{order_id}). "
                        f"Current status: **{status_str}**.\n\n"
                        "Please select the reason for your return, refund, or replacement:"
                    )
                    asst_msg = ChatMessage.objects.create(
                        conversation=conversation,
                        sender=SenderType.ASSISTANT,
                        content=reply_text,
                        metadata={"expects": "choice", "options": reason_options},
                    )
                    return Response({
                        "success": True,
                        "data": {
                            "conversation_id": str(conversation.id),
                            "message": reply_text,
                            "agent": conversation.agent_type,
                            "expects": "choice",
                            "options": reason_options,
                            "handed_off": False,
                            "created_at": asst_msg.created_at.isoformat(),
                        },
                    }, status=status.HTTP_200_OK)

                # Several orders -> present as choices
                meta["support_step"] = "SELECT_ORDER"
                conversation.metadata = meta
                conversation.save()

                order_opts = []
                for b in bookings[:6]:
                    b_id = str(b.get("booking_id") or b.get("request_id"))
                    t = b.get("issue_title") or b.get("service_category") or f"Order #{b_id}"
                    st_val = b.get("status_display") or b.get("status") or ""
                    order_opts.append({"label": f"#{b_id} - {t} ({st_val})", "value": b_id})

                reply_text = "I can help you with a return, refund, or replacement. Which order is this regarding?"
                asst_msg = ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.ASSISTANT,
                    content=reply_text,
                    metadata={"expects": "choice", "options": order_opts},
                )
                return Response({
                    "success": True,
                    "data": {
                        "conversation_id": str(conversation.id),
                        "message": reply_text,
                        "agent": conversation.agent_type,
                        "expects": "choice",
                        "options": order_opts,
                        "handed_off": False,
                        "created_at": asst_msg.created_at.isoformat(),
                    },
                }, status=status.HTTP_200_OK)

            else:
                # User responded to SELECT_ORDER with an order ID
                selected_val = user_message.strip().lstrip("#")
                detail_res = default_tool_registry.execute("get_order_details", {"order_id": selected_val}, context)
                if detail_res.get("error") or not detail_res.get("order"):
                    # Present options again
                    orders_res = default_tool_registry.execute("get_customer_orders", {"limit": 10}, context)
                    bookings = orders_res.get("bookings") or []
                    order_opts = []
                    for b in bookings[:6]:
                        b_id = str(b.get("booking_id") or b.get("request_id"))
                        t = b.get("issue_title") or b.get("service_category") or f"Order #{b_id}"
                        st_val = b.get("status_display") or b.get("status") or ""
                        order_opts.append({"label": f"#{b_id} - {t} ({st_val})", "value": b_id})

                    reply_text = "I couldn't locate that order in your account. Please select one of your orders below:"
                    asst_msg = ChatMessage.objects.create(
                        conversation=conversation,
                        sender=SenderType.ASSISTANT,
                        content=reply_text,
                        metadata={"expects": "choice", "options": order_opts},
                    )
                    return Response({
                        "success": True,
                        "data": {
                            "conversation_id": str(conversation.id),
                            "message": reply_text,
                            "agent": conversation.agent_type,
                            "expects": "choice",
                            "options": order_opts,
                            "handed_off": False,
                            "created_at": asst_msg.created_at.isoformat(),
                        },
                    }, status=status.HTTP_200_OK)

                order_info = detail_res["order"]
                order_id = str(order_info.get("booking_id") or order_info.get("request_id") or selected_val)
                title = order_info.get("title") or order_info.get("category") or f"Order #{order_id}"
                status_str = order_info.get("status_display") or order_info.get("status") or "Confirmed"

                meta["active_order_id"] = order_id
                meta["support_step"] = "CAPTURE_REASON"
                meta["support_data"] = {
                    "order_id": order_id,
                    "order_title": title,
                    "status": status_str,
                }
                conversation.metadata = meta
                conversation.save()

                reply_text = (
                    f"Selected order **#{order_id}** ({title}). "
                    f"Current status: **{status_str}**.\n\n"
                    "Please select the reason for your return, refund, or replacement:"
                )
                asst_msg = ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.ASSISTANT,
                    content=reply_text,
                    metadata={"expects": "choice", "options": reason_options},
                )
                return Response({
                    "success": True,
                    "data": {
                        "conversation_id": str(conversation.id),
                        "message": reply_text,
                        "agent": conversation.agent_type,
                        "expects": "choice",
                        "options": reason_options,
                        "handed_off": False,
                        "created_at": asst_msg.created_at.isoformat(),
                    },
                }, status=status.HTTP_200_OK)

        # Case 2: CAPTURE_REASON
        elif step == "CAPTURE_REASON":
            captured_reason = user_message.strip()
            support_data["reason"] = captured_reason
            meta["support_data"] = support_data
            meta["support_step"] = "UPLOAD_IMAGE"
            conversation.metadata = meta
            conversation.save()

            is_missing = "missing" in captured_reason.lower()
            if is_missing:
                reply_text = "Please upload a photo of the received package or delivery if available, or tap **Skip** if you do not have a photo."
                opts = [{"label": "Skip", "value": "SKIP"}]
            else:
                reply_text = "Please upload a photo showing the issue with your item or service."
                opts = []

            asst_msg = ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.ASSISTANT,
                content=reply_text,
                metadata={"expects": "image", "options": opts},
            )
            return Response({
                "success": True,
                "data": {
                    "conversation_id": str(conversation.id),
                    "message": reply_text,
                    "agent": conversation.agent_type,
                    "expects": "image",
                    "options": opts,
                    "handed_off": False,
                    "created_at": asst_msg.created_at.isoformat(),
                },
            }, status=status.HTTP_200_OK)

        # Case 3: UPLOAD_IMAGE -> HANDOFF
        elif step == "UPLOAD_IMAGE":
            image_file = request.FILES.get("image")
            is_skip = user_message.strip().upper() == "SKIP"

            photo_url = None
            photo_name = None

            if image_file:
                # Validate size (5MB max)
                if image_file.size > 5 * 1024 * 1024:
                    reply_text = "The uploaded image exceeds the 5MB size limit. Please upload a smaller photo."
                    asst_msg = ChatMessage.objects.create(
                        conversation=conversation,
                        sender=SenderType.ASSISTANT,
                        content=reply_text,
                        metadata={"expects": "image", "options": []},
                    )
                    return Response({
                        "success": True,
                        "data": {
                            "conversation_id": str(conversation.id),
                            "message": reply_text,
                            "agent": conversation.agent_type,
                            "expects": "image",
                            "options": [],
                            "handed_off": False,
                            "created_at": asst_msg.created_at.isoformat(),
                        },
                    }, status=status.HTTP_200_OK)

                fname = f"support_photos/{uuid.uuid4().hex}_{image_file.name}"
                saved_path = default_storage.save(fname, image_file)
                photo_url = f"/api/ai/photos/{fname}"
                photo_name = image_file.name
            elif is_skip:
                photo_url = None
                photo_name = "Skipped"
            else:
                is_missing = "missing" in str(support_data.get("reason", "")).lower()
                reply_text = "Please upload a photo or tap **Skip** to continue." if is_missing else "Please upload a photo showing the issue to continue."
                opts = [{"label": "Skip", "value": "SKIP"}] if is_missing else []
                asst_msg = ChatMessage.objects.create(
                    conversation=conversation,
                    sender=SenderType.ASSISTANT,
                    content=reply_text,
                    metadata={"expects": "image", "options": opts},
                )
                return Response({
                    "success": True,
                    "data": {
                        "conversation_id": str(conversation.id),
                        "message": reply_text,
                        "agent": conversation.agent_type,
                        "expects": "image",
                        "options": opts,
                        "handed_off": False,
                        "created_at": asst_msg.created_at.isoformat(),
                    },
                }, status=status.HTTP_200_OK)

            # Package context & HANDOFF
            support_data["photo_url"] = photo_url
            support_data["photo_name"] = photo_name
            support_data["handed_off_at"] = timezone.now().isoformat()

            meta["support_data"] = support_data
            meta["handed_to_human"] = True
            meta["support_step"] = "HANDOFF"
            conversation.metadata = meta
            conversation.save()

            handoff_line = (
                "Thank you. I've shared your order details, reason, and photo with our support team. "
                "A support agent will continue this chat with you shortly."
            )
            asst_msg = ChatMessage.objects.create(
                conversation=conversation,
                sender=SenderType.ASSISTANT,
                content=handoff_line,
                metadata={"handed_off": True, "expects": "text", "options": [], "support_data": support_data},
            )

            # Audit log
            AIAuditLog.objects.create(
                user_id=context["user_id"],
                role=context["role"],
                agent_type=conversation.agent_type,
                user_query=user_message,
                status=AuditStatus.SUCCESS,
                authorization_result=AuthorizationResult.GRANTED,
                details={
                    "flow": "support_handoff",
                    "order_id": support_data.get("order_id"),
                    "reason": support_data.get("reason"),
                    "photo_attached": bool(photo_url),
                },
            )

            return Response({
                "success": True,
                "data": {
                    "conversation_id": str(conversation.id),
                    "message": handoff_line,
                    "agent": conversation.agent_type,
                    "expects": "text",
                    "options": [],
                    "handed_off": True,
                    "created_at": asst_msg.created_at.isoformat(),
                },
            }, status=status.HTTP_200_OK)

        # Fallback if unknown step
        meta["flow"] = None
        conversation.metadata = meta
        conversation.save()
        return Response({"success": False, "message": "Support flow ended."}, status=status.HTTP_400_BAD_REQUEST)


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

    def delete(self, request):
        Conversation.objects.filter(user=request.user).delete()
        return Response(
            {"success": True, "message": "All conversations deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AIConversationDetailView(APIView):
    """
    GET /api/ai/conversations/<uuid:pk>/
    Retrieves full message history for a specific conversation owned by the customer or guest.

    DELETE /api/ai/conversations/<uuid:pk>/
    Deletes a specific conversation.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        user = request.user
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        try:
            if is_authenticated and is_support_agent_or_admin(user):
                conv = Conversation.objects.get(pk=pk)
            elif is_authenticated:
                conv = Conversation.objects.get(pk=pk, user=user)
            else:
                conv = Conversation.objects.get(pk=pk, user__isnull=True)
        except Conversation.DoesNotExist:
            return Response(
                {"success": False, "message": "Conversation not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        conv_meta = conv.metadata or {}
        messages = conv.messages.filter(sender__in=[SenderType.USER, SenderType.ASSISTANT]).order_by("created_at")
        msg_list = [
            {
                "id": str(m.id),
                "sender": m.sender,
                "content": m.content,
                "created_at": m.created_at.isoformat(),
                "sources": (m.metadata.get("sources") if isinstance(m.metadata, dict) else []) or [],
                "expects": (m.metadata.get("expects") if isinstance(m.metadata, dict) else None) or "text",
                "options": (m.metadata.get("options") if isinstance(m.metadata, dict) else None) or [],
                "handed_off": bool(m.metadata.get("handed_off")) if isinstance(m.metadata, dict) else False,
            }
            for m in messages
        ]

        return Response({
            "success": True,
            "data": {
                "id": str(conv.id),
                "title": conv.title,
                "agent_type": conv.agent_type,
                "handed_off": bool(conv_meta.get("handed_to_human")),
                "flow": conv_meta.get("flow"),
                "support_step": conv_meta.get("support_step"),
                "support_data": conv_meta.get("support_data"),
                "claimed_by": conv_meta.get("claimed_by"),
                "claimed_by_name": conv_meta.get("claimed_by_name"),
                "claimed_at": conv_meta.get("claimed_at"),
                "ticket_id": conv_meta.get("ticket_id"),
                "ticket_number": conv_meta.get("ticket_number"),
                "messages": msg_list,
            },
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk=None):
        user = request.user
        is_authenticated = bool(user and getattr(user, "is_authenticated", False))
        try:
            if is_authenticated and is_support_agent_or_admin(user):
                conv = Conversation.objects.get(pk=pk)
            elif is_authenticated:
                conv = Conversation.objects.get(pk=pk, user=user)
            else:
                conv = Conversation.objects.get(pk=pk, user__isnull=True)
        except Conversation.DoesNotExist:
            return Response(
                {"success": False, "message": "Conversation not found or unauthorized."},
                status=status.HTTP_404_NOT_FOUND,
            )

        conv.delete()
        return Response(
            {"success": True, "message": "Conversation deleted successfully."},
            status=status.HTTP_200_OK,
        )


class AIHandoffListView(APIView):
    """
    GET /api/ai/handoffs/
    Query params: state=unclaimed|claimed|all (default: unclaimed)
    Permissions: support/care/admin only (server-side gated).
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSupportAgentOrAdmin]

    def get(self, request):
        state = request.query_params.get("state", "unclaimed").lower().strip()
        conv_qs = Conversation.objects.all().order_by("-updated_at")

        handoffs = []
        for conv in conv_qs:
            meta = conv.metadata or {}
            if not meta.get("handed_to_human"):
                continue

            claimed_by = meta.get("claimed_by")
            if state == "unclaimed" and claimed_by:
                continue
            if state == "claimed" and not claimed_by:
                continue

            support_data = meta.get("support_data") or {}
            customer_name = ""
            customer_email = ""
            customer_phone = ""
            if conv.user:
                customer_name = conv.user.get_full_name() or conv.user.username
                customer_email = getattr(conv.user, "email", "")
                customer_phone = getattr(conv.user, "phone", "")

            handoffs.append({
                "id": str(conv.id),
                "conversation_id": str(conv.id),
                "customer_id": conv.user.id if conv.user else None,
                "customer_name": customer_name or "Guest Customer",
                "customer_email": customer_email,
                "customer_phone": customer_phone,
                "order_id": support_data.get("order_id"),
                "status": support_data.get("status", "Handed Off"),
                "reason": support_data.get("reason"),
                "photo_url": support_data.get("photo_url"),
                "photo_name": support_data.get("photo_name"),
                "handed_off_at": support_data.get("handed_off_at") or conv.updated_at.isoformat(),
                "claimed_by": claimed_by,
                "claimed_by_name": meta.get("claimed_by_name"),
                "claimed_at": meta.get("claimed_at"),
                "ticket_id": meta.get("ticket_id"),
                "ticket_number": meta.get("ticket_number"),
                "message_count": conv.messages.count(),
            })

        return Response({"success": True, "data": handoffs}, status=status.HTTP_200_OK)


class AIHandoffClaimView(APIView):
    """
    POST /api/ai/handoffs/<conv_id>/claim/
    Atomically claims a handed-off conversation for the current agent.
    Rejects with 409 Conflict if already claimed by someone else.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSupportAgentOrAdmin]

    def post(self, request, pk):
        try:
            with cast(Any, transaction.atomic()):
                conv = Conversation.objects.select_for_update().get(id=pk)
                meta = conv.metadata or {}
                if not meta.get("handed_to_human"):
                    return Response({"success": False, "message": "Conversation is not handed off to support."}, status=status.HTTP_400_BAD_REQUEST)

                existing_claimed_by = meta.get("claimed_by")
                if existing_claimed_by and str(existing_claimed_by) != str(request.user.id):
                    holder = meta.get("claimed_by_name") or f"agent #{existing_claimed_by}"
                    return Response({
                        "success": False,
                        "message": f"Conversation is already claimed by {holder}.",
                        "claimed_by": existing_claimed_by,
                        "claimed_by_name": holder,
                    }, status=status.HTTP_409_CONFLICT)

                agent_name = request.user.get_full_name() or request.user.username
                meta["claimed_by"] = request.user.id
                meta["claimed_by_name"] = agent_name
                meta["claimed_at"] = timezone.now().isoformat()
                conv.metadata = meta
                conv.save()

                return Response({
                    "success": True,
                    "message": f"Conversation claimed by {agent_name}.",
                    "data": {
                        "conversation_id": str(conv.id),
                        "claimed_by": request.user.id,
                        "claimed_by_name": agent_name,
                        "claimed_at": meta["claimed_at"],
                    },
                }, status=status.HTTP_200_OK)
        except Conversation.DoesNotExist:
            return Response({"success": False, "message": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)


class AIHandoffReplyView(APIView):
    """
    POST /api/ai/handoffs/<conv_id>/reply/
    Agent posts a human response message into the handed-off conversation.
    Appears directly in the customer's chat widget. The AI remains silent.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSupportAgentOrAdmin]

    def post(self, request, pk):
        message_text = request.data.get("message", "").strip()
        if not message_text:
            return Response({"success": False, "message": "Message text is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            conv = Conversation.objects.get(id=pk)
            meta = conv.metadata or {}
            if not meta.get("handed_to_human"):
                return Response({"success": False, "message": "Conversation is not handed off to human support."}, status=status.HTTP_400_BAD_REQUEST)

            agent_name = request.user.get_full_name() or request.user.username

            msg = ChatMessage.objects.create(
                conversation=conv,
                sender=SenderType.ASSISTANT,
                content=message_text,
                metadata={
                    "is_human_agent": True,
                    "agent_id": request.user.id,
                    "agent_name": agent_name,
                    "handed_off": True,
                },
            )
            conv.updated_at = timezone.now()
            conv.save(update_fields=["updated_at"])

            return Response({
                "success": True,
                "data": {
                    "id": str(msg.id),
                    "sender": "assistant",
                    "content": msg.content,
                    "agent_name": agent_name,
                    "created_at": msg.created_at.isoformat(),
                },
            }, status=status.HTTP_201_CREATED)
        except Conversation.DoesNotExist:
            return Response({"success": False, "message": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)


class AIHandoffCreateTicketView(APIView):
    """
    POST /api/ai/handoffs/<conv_id>/create-ticket/
    Human action: Creates a CustomerCareTicket from the packaged support_data,
    links it to the conversation, and assigns it to the claiming agent.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsSupportAgentOrAdmin]

    def post(self, request, pk):
        try:
            with cast(Any, transaction.atomic()):
                conv = Conversation.objects.select_for_update().get(id=pk)
                meta = conv.metadata or {}
                if not meta.get("handed_to_human"):
                    return Response({"success": False, "message": "Conversation is not handed off to support."}, status=status.HTTP_400_BAD_REQUEST)

                # Check if ticket already created
                existing_ticket_id = meta.get("ticket_id")
                if existing_ticket_id:
                    return Response({
                        "success": True,
                        "message": "Ticket already exists for this conversation.",
                        "data": {
                            "ticket_id": existing_ticket_id,
                            "ticket_number": meta.get("ticket_number"),
                        },
                    }, status=status.HTTP_200_OK)

                support_data = meta.get("support_data") or {}
                reason = support_data.get("reason") or "Customer return/refund intake"
                order_id = support_data.get("order_id")

                booking_obj = None
                if order_id:
                    try:
                        from service_requests.models import ServiceRequest
                        booking_obj = ServiceRequest.objects.filter(id=order_id).first()
                    except Exception:
                        pass

                from customer_care.models import CustomerCareTicket, TicketMessage

                # Determine category
                category = CustomerCareTicket.Category.OTHER
                reason_lower = reason.lower()
                if "refund" in reason_lower:
                    category = CustomerCareTicket.Category.REFUND
                elif "damaged" in reason_lower or "missing" in reason_lower:
                    category = CustomerCareTicket.Category.MISSING_DAMAGED
                elif "quality" in reason_lower:
                    category = CustomerCareTicket.Category.SERVICE_QUALITY

                customer_user = conv.user
                cust_name = customer_user.get_full_name() if customer_user else (support_data.get("customer_name") or "Customer")
                cust_phone = getattr(customer_user, "phone", "") or ""
                cust_email = getattr(customer_user, "email", "") or ""

                agent_name = request.user.get_full_name() or request.user.username

                ticket = CustomerCareTicket.objects.create(
                    customer=customer_user,
                    customer_name=cust_name,
                    phone=cust_phone,
                    email=cust_email,
                    booking=booking_obj,
                    category=category,
                    priority=CustomerCareTicket.Priority.HIGH,
                    status=CustomerCareTicket.Status.ASSIGNED,
                    channel=CustomerCareTicket.Channel.CHAT,
                    assigned_agent=request.user,
                    created_by=request.user,
                    resolution_summary=(
                        f"Created by agent {agent_name} from AI Mitra handoff.\n"
                        f"Order ID: {order_id or 'N/A'}\n"
                        f"Reason: {reason}\n"
                        f"Photo: {support_data.get('photo_name') or 'None'}\n"
                        f"Handed off at: {support_data.get('handed_off_at') or 'N/A'}"
                    ),
                )

                # Post initial system note in ticket
                TicketMessage.objects.create(
                    ticket=ticket,
                    sender=request.user,
                    sender_persona=TicketMessage.SenderPersona.SYSTEM,
                    message=f"Ticket created from AI Mitra live chat handoff (Conv ID: {conv.id}). Intake reason: {reason}.",
                )

                # Link ticket to conversation metadata
                meta["ticket_id"] = ticket.id
                meta["ticket_number"] = ticket.ticket_number
                meta["claimed_by"] = request.user.id
                meta["claimed_by_name"] = agent_name
                meta["claimed_at"] = meta.get("claimed_at") or timezone.now().isoformat()
                conv.metadata = meta
                conv.save()

                return Response({
                    "success": True,
                    "message": f"Customer Care Ticket {ticket.ticket_number} created successfully.",
                    "data": {
                        "ticket_id": ticket.id,
                        "ticket_number": ticket.ticket_number,
                        "category": ticket.category,
                        "status": ticket.status,
                    },
                }, status=status.HTTP_201_CREATED)
        except Conversation.DoesNotExist:
            return Response({"success": False, "message": "Conversation not found."}, status=status.HTTP_404_NOT_FOUND)


class PhotoAccessGateView(APIView):
    """
    GET /api/ai/photos/<path:file_path>
    Authenticated view for serving support photos.
    Only allows:
    - Support/Care/Admin agents
    - The customer who owns the conversation containing this photo
    Never public/unauthenticated.
    """
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, file_path):
        # Sanitize path to prevent directory traversal
        clean_path = os.path.normpath(file_path).replace("\\", "/")
        if ".." in clean_path or clean_path.startswith("/"):
            raise Http404("Invalid file path.")

        # Ensure path is within support_photos/
        if not clean_path.startswith("support_photos/"):
            clean_path = f"support_photos/{clean_path}"

        # Check authorization
        user = request.user
        authorized = False
        if is_support_agent_or_admin(user):
            authorized = True
        else:
            # Customer check: Does this user own a conversation with this photo?
            owned_convs = Conversation.objects.filter(user=user, metadata__handed_to_human=True)
            for c in owned_convs:
                meta = c.metadata or {}
                s_data = meta.get("support_data") or {}
                p_url = s_data.get("photo_url") or ""
                p_name = s_data.get("photo_name") or ""
                if clean_path in p_url or (clean_path.split("/")[-1] in p_url):
                    authorized = True
                    break

        if not authorized:
            return Response({"detail": "You do not have permission to access this photo."}, status=status.HTTP_403_FORBIDDEN)

        if not default_storage.exists(clean_path):
            raise Http404("Photo not found.")

        f = default_storage.open(clean_path, "rb")
        content_type = "image/jpeg"
        if clean_path.lower().endswith(".png"):
            content_type = "image/png"
        elif clean_path.lower().endswith(".webp"):
            content_type = "image/webp"

        return FileResponse(f, content_type=content_type)
