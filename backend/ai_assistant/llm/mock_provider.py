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
                    content="You do not have any active or past bookings under this account.",
                    tool_calls=[],
                )
            lines = ["Here are your recent bookings:"]
            for b in bookings:
                status_txt = b.get("status_display") or b.get("status")
                price_txt = b.get("total_amount") or "To be estimated upon inspection"
                tech_txt = b.get("technician_name") or b.get("technician_status") or "A technician will be assigned shortly."
                lines.append(
                    f"• **Booking #{b.get('booking_id')}** ({b.get('service_category')} - {b.get('issue_title')}): "
                    f"Status: **{status_txt}** | Preferred Slot: {b.get('preferred_date')} ({b.get('preferred_time')}) | "
                    f"Technician: {tech_txt}"
                )
            return LLMResponse(content="\n".join(lines), tool_calls=[])

        # Handle specific order detail
        if "order" in data:
            o = data["order"]
            avail_actions = o.get("available_actions", {})
            action_lines = []
            if avail_actions.get("can_cancel"):
                action_lines.append("Cancel Booking")
            if avail_actions.get("can_reschedule"):
                action_lines.append("Reschedule Booking")
            if avail_actions.get("can_track"):
                action_lines.append("Live GPS Tracking")
            if avail_actions.get("can_pay"):
                action_lines.append("Pay Online")
            if avail_actions.get("can_give_feedback"):
                action_lines.append("Submit Feedback")
            if avail_actions.get("can_request_refund"):
                action_lines.append("Request Refund")

            tech_info = o.get("technician")
            if tech_info and tech_info.get("name"):
                tech_display = f"{tech_info.get('name')} (Rating: {tech_info.get('rating', '5.0')})"
            else:
                tech_display = o.get("technician_status") or "A technician will be assigned shortly."

            price_display = o.get("total_amount")
            if not price_display or price_display == "None":
                price_display = "Unavailable (to be estimated upon inspection)"

            resp = (
                f"**Booking Details for #{o.get('booking_id')} ({o.get('request_id')}):**\n"
                f"• **Service:** {o.get('category')} — {o.get('title')}\n"
                f"• **Status:** {o.get('status_display')}\n"
                f"• **Date & Slot:** {o.get('date')} ({o.get('time')})\n"
                f"• **Address:** {o.get('address')}\n"
                f"• **Technician:** {tech_display}\n"
                f"• **Total Amount:** {price_display}\n"
                f"• **Payment Status:** {o.get('payment_status')}\n"
                f"• **What you can do:** {', '.join(action_lines) if action_lines else 'No modifications available at this stage'}"
            )
            return LLMResponse(content=resp, tool_calls=[])

        # Handle delivery status
        if "can_track" in data:
            can_track = data.get("can_track", False)
            if can_track:
                return LLMResponse(
                    content=(
                        f"**Live Tracking for Booking #{data.get('order_id')}:**\n"
                        f"• Status: **{data.get('status')}**\n"
                        f"• Technician Location: {data.get('technician_location_name')}\n"
                        f"• You can open live GPS map tracking directly on your [Tracking Screen]({data.get('tracking_url')})."
                    ),
                    tool_calls=[],
                )
            else:
                return LLMResponse(content=data.get("message", "Tracking is currently unavailable."), tool_calls=[])

        # Handle catalog search
        if "packages" in data:
            pkgs = data.get("packages", [])
            if not pkgs:
                return LLMResponse(
                    content=f"No matching service packages found for '{data.get('query')}'. Try searching for 'AC cleaning', 'plumbing', or 'painting'.",
                    tool_calls=[],
                )
            lines = [f"Found {len(pkgs)} available service packages:"]
            for p in pkgs:
                lines.append(f"• **{p['name']}** ({p['category']}): ₹{p['price']} | Duration: {p['duration']}")
                if p.get("description"):
                    lines.append(f"  _{p['description']}_")
            return LLMResponse(content="\n".join(lines), tool_calls=[])

        # Handle customer profile
        if "profile" in data:
            prof = data["profile"]
            addr_count = len(prof.get("saved_addresses", []))
            return LLMResponse(
                content=(
                    f"**Account Profile:**\n"
                    f"• Name: {prof.get('first_name', '')} {prof.get('last_name', '')}\n"
                    f"• Email: {prof.get('email', '')}\n"
                    f"• Phone: {prof.get('phone', '')}\n"
                    f"• Saved Addresses: {addr_count} saved address(es)"
                ),
                tool_calls=[],
            )

        # Default tool result serialization
        return LLMResponse(content=str(data), tool_calls=[])

    def _synthesize_rag_response(self, rag_context: str, query: str) -> LLMResponse:
        # Generate an authoritative summary using the retrieved RAG context
        q_lower = query.lower()

        if "cancellation" in q_lower or "cancel" in q_lower:
            return LLMResponse(
                content=(
                    "**CalServices Cancellation Policy:**\n\n"
                    "• **Free Cancellation:** You can cancel free of charge if cancelled more than 2 hours before "
                    "your scheduled appointment slot, or before a technician is dispatched.\n"
                    "• **Late Fee:** A nominal visitation charge (up to ₹149) may apply if cancelled within 2 hours of the slot "
                    "or after the technician is on the way.\n"
                    "• **Inspection Visits:** Diagnostic/inspection charges (typically ₹199) are non-refundable once completed."
                ),
                tool_calls=[],
            )

        if "refund" in q_lower:
            return LLMResponse(
                content=(
                    "**CalServices Refund Policy:**\n\n"
                    "• Approved refunds are credited back to your original payment method or wallet within **5 to 7 business days**.\n"
                    "• If you experienced service quality issues, report within 48 hours to request a complimentary rework inspection."
                ),
                tool_calls=[],
            )

        if "vendor" in q_lower or "partner" in q_lower or "join" in q_lower or "become" in q_lower:
            return LLMResponse(
                content=(
                    "**Becoming a CalServices Partner / Professional:**\n\n"
                    "• **Requirements:** Valid government photo ID (Aadhaar / PAN), verified trade experience, and your own tools.\n"
                    "• **Benefits:** Flexible schedule, steady local customer demand, and weekly direct bank payouts.\n"
                    "• **How to Apply:** Visit the partner portal at https://calservices-vendor.vercel.app to apply online."
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
