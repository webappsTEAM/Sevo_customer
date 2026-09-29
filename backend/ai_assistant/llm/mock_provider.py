import re
from typing import List, Dict, Any, Optional
from ai_assistant.llm.base import BaseLLMProvider, LLMResponse


class MockDeterministicProvider(BaseLLMProvider):
    """
    Deterministic rule-based provider for automated testing and local environments
    where an external LLM API key is not configured.
    Enforces all CalServices business rules and coordinates tool calls and RAG context.
    """

    def generate(
        self,
        messages: List[Dict[str, str]],
        tools: List[Dict[str, Any]],
        system_prompt: str,
        context: Dict[str, Any],
    ) -> LLMResponse:
        # Find latest user message
        user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_msg = m.get("content", "")
                break

        query_clean = user_msg.strip()
        rag_context = context.get("rag_context", "")

        # Check for conversational etiquette / personality rules & human customer-service replies
        conv_reply = self._detect_conversational_response(query_clean, context)
        if conv_reply:
            return LLMResponse(content=conv_reply, tool_calls=[])

        # Check if previous turn executed a tool
        last_turn = messages[-1] if messages else {}
        if last_turn.get("role") == "tool":
            return self._synthesize_tool_result(last_turn.get("content", ""), query_clean, context)

        # Determine if a tool call is needed based on query
        tool_calls = self._detect_tool_calls(query_clean, context)
        if tool_calls:
            return LLMResponse(
                content="",
                tool_calls=tool_calls,
            )

        # If RAG knowledge context is present, synthesize answer from RAG
        if rag_context:
            return self._synthesize_rag_response(rag_context, query_clean)

        # Fallback conversational response
        return LLMResponse(
            content=(
                "I can only assist with questions related to SEVO services, bookings, and our platform. "
                "Please let me know if you need help with any home services, repairs, cleaning, or deliveries!"
            ),
            tool_calls=[],
        )

    def _detect_tool_calls(self, query: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        user = context.get("user")
        is_auth = bool(user and getattr(user, "is_authenticated", False))
        q = query.lower()

        # 1. Booking / Order tracking or selection by number
        order_num_match = re.search(r"\b(?:track|tracking|status|where is|order|booking|request|details of)?\s*#?([0-9]{3,8})\b", q)
        if order_num_match and is_auth:
            target_id = order_num_match.group(1).strip()
            return [{
                "id": "call_order_1",
                "function": {
                    "name": "get_order_details",
                    "arguments": {"order_id": target_id},
                },
            }]

        # 2. Tracking with non-numeric target or ID
        track_match = re.search(r"\b(?:track|tracking|status|where is)\b.*?(?:booking|order|service)?\s*#?([A-Za-z0-9-]+)", q)
        if track_match and is_auth:
            target_id = track_match.group(1).strip()
            if target_id and not target_id in {"the", "my", "a"}:
                return [{
                    "id": "call_track_1",
                    "function": {
                        "name": "get_delivery_status",
                        "arguments": {"order_id": target_id},
                    },
                }]

        # 3. Delayed delivery or order listing inquiries without ID
        is_order_inquiry = any(kw in q for kw in [
            "my bookings", "my orders", "recent bookings", "active bookings",
            "show bookings", "list bookings", "why is my order still not delivered",
            "order still not delivered", "still not delivered", "why is my delivery late",
            "late delivery", "where is my order", "track my order", "check my order",
            "status of my order", "order status"
        ])
        if is_order_inquiry and is_auth:
            status_filter = "active" if "active" in q else None
            return [{
                "id": "call_list_orders_1",
                "function": {
                    "name": "get_customer_orders",
                    "arguments": {"status": status_filter, "limit": 5},
                },
            }]

        # 4. Customer Profile & Addresses
        if any(kw in q for kw in ["my profile", "my address", "saved addresses", "my account", "my phone", "my email"]) and is_auth:
            return [{
                "id": "call_profile_1",
                "function": {
                    "name": "get_customer_profile",
                    "arguments": {},
                },
            }]

        # 5. Catalog Search
        if any(kw in q for kw in ["search", "price of", "cost of", "package", "packages", "service", "clean", "plumb", "paint", "ac", "repair"]):
            # Ignore pure policy queries
            if not any(pol in q for pol in ["policy", "refund", "terms", "vendor", "partner", "how to"]):
                clean_search = re.sub(r"(?i)\b(search|find|show me|what is the price of|how much is|cost of)\b", "", q)
                clean_search = re.sub(r"[?!.,]", "", clean_search).strip()
                if clean_search:
                    return [{
                        "id": "call_search_1",
                        "function": {
                            "name": "search_products",
                            "arguments": {"query": clean_search},
                        },
                    }]

        return []

    def _synthesize_tool_result(self, raw_result: Any, user_query: str, context: Dict[str, Any]) -> LLMResponse:
        import json
        if isinstance(raw_result, str):
            try:
                data = json.loads(raw_result)
            except Exception:
                data = {"raw": raw_result}
        else:
            data = raw_result

        # Handle customer orders list
        if "bookings" in data:
            bookings = data.get("bookings", [])
            q_lower = (user_query or "").lower()
            is_delivery_or_status = any(kw in q_lower for kw in [
                "why is my order still not delivered",
                "order still not delivered",
                "still not delivered",
                "why is my delivery late",
                "late delivery",
                "delayed",
                "where is my order",
                "where is",
                "track my order",
                "check my order",
                "status of my order",
                "my orders",
                "my bookings",
                "active bookings",
                "show bookings",
                "list bookings",
            ])

            if not bookings:
                if is_delivery_or_status:
                    return LLMResponse(
                        content=(
                            "I’m sorry for the delay. Let me check your order status.\n\n"
                            "I couldn't find any active orders under your account. Could you please share your Order ID so I can check for you?"
                        ),
                        tool_calls=[],
                    )
                return LLMResponse(
                    content="You do not have any active bookings at the moment. How can I help you book a service today?",
                    tool_calls=[],
                )

            # Build list of orders
            order_lines = []
            for b in bookings[:5]:
                bid = b.get("booking_id") or b.get("id")
                title = b.get("issue_title") or b.get("service_category") or "Order"
                status_txt = b.get("status_display") or b.get("status") or "Active"
                order_lines.append(f"• **Order #{bid}**: {title} (Status: **{status_txt}**)")

            orders_list_str = "\n".join(order_lines)
            intro = (
                "I’m sorry for the delay. Let me check your order status.\n\nHere are your orders:"
                if any(w in q_lower for w in ["delay", "still not", "not delivered", "late"])
                else "Here are your current orders:"
            )

            msg = (
                f"{intro}\n\n"
                f"{orders_list_str}\n\n"
                f"Which order are you referring to?"
            )
            return LLMResponse(content=msg, tool_calls=[])

        # Handle specific order detail
        if "order" in data:
            o = data["order"]
            tech_info = o.get("technician")
            if tech_info and tech_info.get("name"):
                tech_display = f"{tech_info.get('name')}"
            else:
                tech_display = o.get("technician_status") or "Assigning shortly"

            price_display = o.get("total_amount")
            if not price_display or price_display == "None":
                price_display = "To be estimated upon inspection"
            else:
                price_display = f"₹{price_display}" if not str(price_display).startswith("₹") else str(price_display)

            title = o.get("title") or o.get("category") or "Service"
            status_txt = o.get("status_display") or o.get("status")

            resp = (
                f"**Booking #{o.get('booking_id')} — {title}**\n"
                f"• Status: **{status_txt}**\n"
                f"• Slot: {o.get('date')} ({o.get('time')})\n"
                f"• Professional: {tech_display}\n"
                f"• Total: **{price_display}** ({o.get('payment_status', 'Pending')})\n"
                f"• Address: {o.get('address', 'On file')}"
            )
            return LLMResponse(content=resp, tool_calls=[])

        # Handle delivery status
        if "can_track" in data:
            can_track = data.get("can_track", False)
            if can_track:
                loc = data.get("technician_location_name") or "on the way to your location"
                return LLMResponse(
                    content=(
                        f"Your technician for Booking #{data.get('order_id')} is currently **{loc}** (Status: **{data.get('status')}**). "
                        f"You can view real-time movement on your [Live GPS Map]({data.get('tracking_url')})."
                    ),
                    tool_calls=[],
                )
            else:
                return LLMResponse(content=data.get("message", "Tracking details will be active once your technician departs."), tool_calls=[])

        # Handle catalog search
        if "packages" in data:
            pkgs = data.get("packages", [])
            if not pkgs:
                return LLMResponse(
                    content=f"No matching service packages found for '{data.get('query')}'. You can try searching for 'AC service', 'cleaning', or 'plumbing'.",
                    tool_calls=[],
                )
            lines = [f"Here are available {data.get('query', '')} packages:"]
            for p in pkgs[:4]:
                dur = f" ({p['duration']})" if p.get("duration") else ""
                lines.append(f"• **{p['name']}**: ₹{p['price']}{dur}")
            lines.append("\nWould you like help booking any of these?")
            return LLMResponse(content="\n".join(lines), tool_calls=[])

        # Handle customer profile
        if "profile" in data:
            prof = data["profile"]
            return LLMResponse(
                content=(
                    f"Hi {prof.get('first_name', 'there')}! You are registered with phone **{prof.get('phone', 'N/A')}** "
                    f"and email **{prof.get('email', 'N/A')}**."
                ),
                tool_calls=[],
            )

        # Default tool result serialization
        return LLMResponse(content=str(data), tool_calls=[])

    def _synthesize_rag_response(self, rag_context: str, query: str) -> LLMResponse:
        q_lower = query.lower()

        # Cancellation
        if "cancellation" in q_lower or "cancel" in q_lower:
            return LLMResponse(
                content=(
                    "You can cancel your booking **100% free of charge** up to 2 hours before your scheduled appointment slot. "
                    "If cancelled when the technician is already dispatched, a nominal visit fee (up to ₹149) may apply."
                ),
                tool_calls=[],
            )

        # Refund
        if "refund" in q_lower:
            return LLMResponse(
                content=(
                    "Approved refunds are automatically credited back to your original payment method or wallet within **5 to 7 business days**."
                ),
                tool_calls=[],
            )

        # Partner / Vendor
        if "vendor" in q_lower or "partner" in q_lower or "join" in q_lower:
            return LLMResponse(
                content=(
                    "You can join SEVO as a verified service partner! Apply directly through our partner portal: https://calservices-vendor.vercel.app."
                ),
                tool_calls=[],
            )

        # How to book
        if any(w in q_lower for w in ["how to book", "how do i book", "how can i book", "guide me to book", "steps to book", "book a service", "book services", "how does booking work"]):
            return LLMResponse(
                content=(
                    "**How to Book a Doorstep Service on SEVO:**\n\n"
                    "1. **Explore the Catalog**: Browse service categories from our [Service Catalog](/booking) (Cleaning, HVAC/AC Repair, Plumbing, Painting, Masonry, Logistics).\n"
                    "2. **Select Service & Package**: Choose your required package and review transparent pricing (all in INR ₹ with GST breakdown).\n"
                    "3. **Choose Date & Slot**: Pick your convenient appointment date and preferred time slot.\n"
                    "4. **Add Address & Verify Zone**: Enter your service address. Our system automatically confirms technician serviceability in your area.\n"
                    "5. **Confirm & Checkout**: Complete your booking securely using UPI, Card, NetBanking, or Cash on Delivery (COD).\n\n"
                    "Once confirmed, a verified professional will be assigned, and you can track their live GPS location and ETA right inside the app!"
                ),
                tool_calls=[],
            )

        # Generic RAG context presentation
        clean_context = rag_context.replace("--- VERIFIED KNOWLEDGE BASE CONTEXT ---", "").replace("--- END KNOWLEDGE CONTEXT ---", "").strip()
        return LLMResponse(
            content=f"According to SEVO policies:\n\n{clean_context[:600]}",
            tool_calls=[],
        )

    def _detect_conversational_response(self, query: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        q = (query or "").strip().lower()
        user = context.get("user") if context else None
        is_auth = bool(user and getattr(user, "is_authenticated", False))

        # 1. Gratitude & Closing
        if re.search(r"^(?:thanks|thank you|thx|tq)\b", q):
            return "You’re very welcome!"
        if re.search(r"^(?:bye|goodbye|see you|have a good day)\b", q):
            return "Goodbye! Have a great day!"

        # 2. Angry / Bad service complaints
        if any(p in q for p in ["service is very bad", "service is bad", "terrible service", "pathetic service", "worst service", "horrible service", "bad service"]):
            return "I’m sorry about this. We apologize for the inconvenience. Let me help you with this."

        # 3. Delayed delivery or orders:
        # Authenticated users proceed to tool calling to fetch and list their real orders.
        # Unauthenticated guests are asked to log in or share their Order ID.
        if any(p in q for p in ["why is my order still not delivered", "order still not delivered", "still not delivered", "why is my delivery late", "late delivery"]):
            if not is_auth:
                return "I’m sorry for the delay. Let me check your order status.\n\nPlease log in or share your Order ID so I can look up your order for you."
            return None

        # 4. Frustration / useless
        if any(p in q for p in ["this is useless", "useless app", "useless service", "waste of time"]):
            return "I’m sorry this has been frustrating. Let me see how I can help."

        # 5. Company mistake
        if any(p in q for p in ["you people made a mistake", "you made a mistake", "your mistake", "mistake by you"]):
            return "We’re sorry about the mistake. Let me help you resolve it."

        # 6. Are you even helping me?
        if any(p in q for p in ["are you even helping me", "are you helping me", "can you even help", "are you listening"]):
            return "Yes, I’m here to help. Please tell me what happened."

        # 7. I already told you this!
        if any(p in q for p in ["i already told you this", "i already told you", "i already said that", "i already mentioned"]):
            return "I’m sorry about that. Let me check it again."

        return None
