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
                "I am your CalServices Assistant! I can help you check your bookings, "
                "track en-route technicians, explore service packages and pricing, or answer questions "
                "about our cancellation, refund, and delivery policies. How can I help you today?"
            ),
            tool_calls=[],
        )

    def _detect_tool_calls(self, query: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        user = context.get("user")
        is_auth = bool(user and getattr(user, "is_authenticated", False))
        q = query.lower()

        # 1. Booking / Order tracking
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

        # 2. Specific Order Details
        order_match = re.search(r"\b(?:booking|order|request|details of)\b.*?#?([A-Za-z0-9-]+)", q)
        if order_match and is_auth:
            target_id = order_match.group(1).strip()
            # If target looks like an ID or digits
            if target_id.isdigit() or "-" in target_id:
                return [{
                    "id": "call_order_1",
                    "function": {
                        "name": "get_order_details",
                        "arguments": {"order_id": target_id},
                    },
                }]

        # 3. List Customer Bookings
        if any(kw in q for kw in ["my bookings", "my orders", "recent bookings", "active bookings", "show bookings", "list bookings"]) and is_auth:
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
            if not bookings:
                return LLMResponse(
                    content="You do not have any active bookings at the moment. How can I help you book a service today?",
                    tool_calls=[],
                )

            # Focus exclusively on current active booking
            active_list = [b for b in bookings if str(b.get("status", "")).lower() not in {"completed", "closed", "cancelled", "rejected"}]
            target = active_list[0] if active_list else bookings[0]

            status_txt = target.get("status_display") or target.get("status") or "Confirmed"
            tech_name = target.get("technician_name")
            title = target.get("issue_title") or target.get("service_category") or "Service"
            bid = target.get("booking_id")
            slot = f"{target.get('preferred_date')} ({target.get('preferred_time')})"

            if tech_name:
                msg = (
                    f"**{tech_name}** has been assigned for your **{title}** (Booking #{bid}) "
                    f"and will reach you for your {slot} slot. Current status: **{status_txt}**."
                )
            else:
                msg = (
                    f"We are currently assigning a technician for your **{title}** (Booking #{bid}). "
                    f"Preferred slot: {slot}. We will update you with live tracking as soon as they are on the way."
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
                    "You can join CalServices as a verified service partner! Apply directly through our partner portal: https://calservices-vendor.vercel.app."
                ),
                tool_calls=[],
            )

        # How to book
        if any(w in q_lower for w in ["how to book", "how do i book", "how can i book", "steps to book", "book a service"]):
            return LLMResponse(
                content=(
                    "Booking is quick and simple:\n"
                    "1. Select your service package from the catalog.\n"
                    "2. Pick your preferred date and time slot.\n"
                    "3. Enter your address and confirm your booking.\n\n"
                    "A verified technician will be assigned with live tracking and ETA!"
                ),
                tool_calls=[],
            )

        if any(w in q_lower for w in ["how to book", "how do i book", "how can i book", "guide me to book", "steps to book", "book a service", "book services", "how does booking work"]):
            return LLMResponse(
                content=(
                    "**How to Book a Doorstep Service on CalServices (Sevo):**\n\n"
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
            content=f"According to CalServices policies:\n\n{clean_context[:600]}",
            tool_calls=[],
        )
