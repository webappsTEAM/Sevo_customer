import datetime
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.models import User
from service_requests.models import ServiceRequest
from ai_assistant.views import (
    AIChatView,
    AIHandoffListView,
    AIHandoffClaimView,
    AIHandoffReplyView,
    AIHandoffCreateTicketView,
    PhotoAccessGateView,
)
from ai_assistant.models import Conversation, ChatMessage, SenderType
from ai_assistant.guardrails.input_guard import InputGuard


class SupportIntakeFlowTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AIChatView.as_view()
        self.handoff_list_view = AIHandoffListView.as_view()
        self.handoff_claim_view = AIHandoffClaimView.as_view()
        self.handoff_reply_view = AIHandoffReplyView.as_view()
        self.handoff_create_ticket_view = AIHandoffCreateTicketView.as_view()
        self.photo_gate_view = PhotoAccessGateView.as_view()

        # Create two test customers
        self.user_a = User.objects.create_user(
            username="test_customer_a",
            email="customera@example.com",
            phone="9876543210",
            role="customer",
        )
        self.user_b = User.objects.create_user(
            username="test_customer_b",
            email="customerb@example.com",
            phone="9123456780",
            role="customer",
        )

        # Create two support agents
        self.agent_bob = User.objects.create_user(
            username="agent_bob",
            email="bob@sevo.in",
            role="support",
            first_name="Bob",
            last_name="Support",
        )
        self.agent_alice = User.objects.create_user(
            username="agent_alice",
            email="alice@sevo.in",
            role="support",
            first_name="Alice",
            last_name="Care",
        )

        # Create orders for user A
        self.order_a1 = ServiceRequest.objects.create(
            customer=self.user_a,
            service_category="ac_repair",
            issue_title="AC Cooling Inspection",
            status="completed",
            total_amount=799.00,
            address="123 Alpha St, Hosur",
            preferred_date=datetime.date(2026, 10, 1),
            preferred_time="10:00 AM",
        )
        self.order_a2 = ServiceRequest.objects.create(
            customer=self.user_a,
            service_category="cleaning",
            issue_title="Deep Kitchen Cleaning",
            status="confirmed",
            total_amount=1499.00,
            address="123 Alpha St, Hosur",
            preferred_date=datetime.date(2026, 10, 2),
            preferred_time="02:00 PM",
        )

        # Create order for user B
        self.order_b1 = ServiceRequest.objects.create(
            customer=self.user_b,
            service_category="plumbing",
            issue_title="Pipe Leakage Fix",
            status="completed",
            total_amount=499.00,
            address="456 Beta St, Hosur",
            preferred_date=datetime.date(2026, 10, 3),
            preferred_time="11:00 AM",
        )

    @patch("ai_assistant.views.get_llm_provider")
    def test_guest_is_told_to_login(self, mock_get_llm):
        """Unauthenticated guest is instructed to log in rather than entering support flow."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = "Mock LLM answer"
        mock_get_llm.return_value = mock_llm

        req = self.factory.post(
            "/api/ai/chat/",
            {"message": "I want a refund for my order"},
            format="json",
        )
        resp = self.view(req)
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("data", {})
        self.assertIn("Please log in to your account", data.get("message", ""))
        self.assertFalse(data.get("handed_off", False))

        # Ensure LLM was never called
        mock_llm.generate.assert_not_called()

    @patch("ai_assistant.views.get_llm_provider")
    def test_intent_enters_support_flow_with_multiple_orders(self, mock_get_llm):
        """Authenticated customer with multiple orders is presented with choice chips."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = "Mock LLM answer"
        mock_get_llm.return_value = mock_llm

        req = self.factory.post(
            "/api/ai/chat/",
            {"message": "I need a replacement for my order"},
            format="json",
        )
        force_authenticate(req, user=self.user_a)

        resp = self.view(req)
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("data", {})
        self.assertEqual(data.get("expects"), "choice")
        options = data.get("options", [])
        self.assertTrue(len(options) >= 2)

        # Options must only contain User A's orders, NOT User B's orders
        opt_values = [str(o.get("value")) for o in options]
        self.assertIn(str(self.order_a1.id), opt_values)
        self.assertIn(str(self.order_a2.id), opt_values)
        self.assertNotIn(str(self.order_b1.id), opt_values)

        # Ensure LLM was not called
        mock_llm.generate.assert_not_called()

    @patch("ai_assistant.views.get_llm_provider")
    def test_order_selection_is_ownership_scoped(self, mock_get_llm):
        """User A cannot select User B's order ID in the support flow."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = "Mock LLM answer"
        mock_get_llm.return_value = mock_llm

        # Step 1: Start flow
        req1 = self.factory.post(
            "/api/ai/chat/",
            {"message": "I want a refund"},
            format="json",
        )
        force_authenticate(req1, user=self.user_a)
        resp1 = self.view(req1)
        conv_id = resp1.data["data"]["conversation_id"]

        # Step 2: User A attempts to select User B's order
        req2 = self.factory.post(
            "/api/ai/chat/",
            {"message": str(self.order_b1.id), "conversation_id": conv_id},
            format="json",
        )
        force_authenticate(req2, user=self.user_a)
        resp2 = self.view(req2)
        data2 = resp2.data.get("data", {})

        # Should reject unauthorized order and re-present User A's orders
        self.assertIn("couldn't locate that order", data2.get("message", "").lower())
        opt_values = [str(o.get("value")) for o in data2.get("options", [])]
        self.assertNotIn(str(self.order_b1.id), opt_values)
        self.assertIn(str(self.order_a1.id), opt_values)

    @patch("ai_assistant.views.get_llm_provider")
    def test_single_order_auto_selects(self, mock_get_llm):
        """If user has only 1 order, it is auto-selected directly advancing to reason capture."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = "Mock LLM answer"
        mock_get_llm.return_value = mock_llm

        # User B only has order_b1
        req = self.factory.post(
            "/api/ai/chat/",
            {"message": "Return my product"},
            format="json",
        )
        force_authenticate(req, user=self.user_b)

        resp = self.view(req)
        self.assertEqual(resp.status_code, 200)
        data = resp.data.get("data", {})
        # Should state order was auto-selected and ask for reason
        self.assertIn(str(self.order_b1.id), data.get("message", ""))
        self.assertEqual(data.get("expects"), "choice")
        labels = [o["label"] for o in data.get("options", [])]
        self.assertIn("Damaged", labels)
        self.assertIn("Missing item", labels)

    @patch("ai_assistant.views.get_llm_provider")
    def test_full_flow_through_handoff_and_silence(self, mock_get_llm):
        """End-to-end support flow: Intent -> Select Order -> Reason -> Upload Image -> Handoff -> AI Muted."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = "Mock LLM answer"
        mock_get_llm.return_value = mock_llm

        # 1. Intent
        req1 = self.factory.post(
            "/api/ai/chat/",
            {"message": "I want a refund"},
            format="json",
        )
        force_authenticate(req1, user=self.user_a)
        resp1 = self.view(req1)
        conv_id = resp1.data["data"]["conversation_id"]

        # 2. Select Order A1
        req2 = self.factory.post(
            "/api/ai/chat/",
            {"message": str(self.order_a1.id), "conversation_id": conv_id},
            format="json",
        )
        force_authenticate(req2, user=self.user_a)
        resp2 = self.view(req2)
        self.assertEqual(resp2.data["data"]["expects"], "choice")

        # 3. Select Reason: Missing item
        req3 = self.factory.post(
            "/api/ai/chat/",
            {"message": "Missing item", "conversation_id": conv_id},
            format="json",
        )
        force_authenticate(req3, user=self.user_a)
        resp3 = self.view(req3)
        self.assertEqual(resp3.data["data"]["expects"], "image")
        options3 = resp3.data["data"]["options"]
        self.assertTrue(any(o["value"] == "SKIP" for o in options3))

        # 4. Upload Image (or Skip)
        image_content = b"fake image content"
        image_file = SimpleUploadedFile("package_proof.jpg", image_content, content_type="image/jpeg")
        req4 = self.factory.post(
            "/api/ai/chat/",
            {"image": image_file, "conversation_id": conv_id},
            format="multipart",
        )
        force_authenticate(req4, user=self.user_a)
        resp4 = self.view(req4)
        data4 = resp4.data["data"]

        # Assert exact handoff line and state
        self.assertTrue(data4["handed_off"])
        expected_handoff_line = (
            "Thank you. I've shared your order details, reason, and photo with our support team. "
            "A support agent will continue this chat with you shortly."
        )
        self.assertEqual(data4["message"], expected_handoff_line)

        # Verify conversation metadata in DB
        conv = Conversation.objects.get(id=conv_id)
        self.assertTrue(conv.metadata.get("handed_to_human"))
        self.assertEqual(conv.metadata.get("support_step"), "HANDOFF")
        self.assertEqual(conv.metadata["support_data"]["order_id"], str(self.order_a1.id))
        self.assertEqual(conv.metadata["support_data"]["reason"], "Missing item")

        # 5. Subsequent message: AI MUST NOT CALL LLM AND MUST RETURN SILENT / MUTED
        req5 = self.factory.post(
            "/api/ai/chat/",
            {"message": "Hello, are you still there?", "conversation_id": conv_id},
            format="json",
        )
        force_authenticate(req5, user=self.user_a)
        resp5 = self.view(req5)
        data5 = resp5.data["data"]

        self.assertTrue(data5["handed_off"])
        self.assertEqual(data5["message"], "")
        mock_llm.generate.assert_not_called()

    def test_cancel_pay_reschedule_remain_strictly_blocked(self):
        """Mutations like cancel, pay, reschedule remain strictly blocked with guidance."""
        blocked_commands = [
            ("Please cancel my booking #1234", "cancel"),
            ("reschedule my appointment to tomorrow", "reschedule"),
            ("pay for my order now", "pay"),
        ]
        for query, expected_action in blocked_commands:
            result = InputGuard.inspect(query)
            self.assertTrue(result.is_blocked, f"Query '{query}' was expected to be blocked!")
            self.assertEqual(result.category, "write_action")
            self.assertFalse(result.is_support_intent)

    @patch("ai_assistant.views.get_llm_provider")
    def test_crossover_from_discovery_to_support_flow(self, mock_get_llm):
        """A conversation started in discovery/catalog mode switches to support flow when user requests refund."""
        mock_llm = MagicMock()
        mock_llm.generate.return_value = MagicMock(content="Here are our AC cleaning packages: Basic AC Service at ₹799.", tool_calls=[])
        mock_get_llm.return_value = mock_llm

        # Step 1: Start in discovery / catalog exploration
        req1 = self.factory.post(
            "/api/ai/chat/",
            {"message": "Show me AC cleaning packages"},
            format="json",
        )
        force_authenticate(req1, user=self.user_a)
        resp1 = self.view(req1)
        self.assertEqual(resp1.status_code, 200)
        conv_id = resp1.data["data"]["conversation_id"]

        conv_db = Conversation.objects.get(id=conv_id)
        self.assertNotEqual(conv_db.metadata.get("flow"), "support")

        # Step 2: Mid-conversation crossover - user switches to refund request
        req2 = self.factory.post(
            "/api/ai/chat/",
            {"message": "Actually I want a refund for my order", "conversation_id": conv_id},
            format="json",
        )
        force_authenticate(req2, user=self.user_a)
        resp2 = self.view(req2)
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.data.get("data", {})

        # Should have transitioned into support flow with choice chips
        self.assertEqual(data2.get("expects"), "choice")
        conv_db.refresh_from_db()
        self.assertEqual(conv_db.metadata.get("flow"), "support")
        self.assertEqual(conv_db.metadata.get("support_step"), "SELECT_ORDER")

    def test_handoff_inbox_gating_and_listing(self):
        """Inbox endpoint /api/ai/handoffs/ is 403 for customers and lists unclaimed handoffs for support agents."""
        # Create a handed-off conversation
        conv = Conversation.objects.create(
            user=self.user_a,
            agent_type="support",
            metadata={
                "flow": "support",
                "support_step": "HANDOFF",
                "handed_to_human": True,
                "support_data": {
                    "order_id": str(self.order_a1.id),
                    "reason": "Damaged package",
                    "status": "completed",
                    "photo_url": "/api/ai/photos/support_photos/proof123.jpg",
                    "photo_name": "proof123.jpg",
                },
            },
        )

        # 1. Non-support customer request is 403 Forbidden
        req_cust = self.factory.get("/api/ai/handoffs/")
        force_authenticate(req_cust, user=self.user_a)
        resp_cust = self.handoff_list_view(req_cust)
        self.assertEqual(resp_cust.status_code, 403)

        # 2. Support agent request succeeds
        req_agent = self.factory.get("/api/ai/handoffs/")
        force_authenticate(req_agent, user=self.agent_bob)
        resp_agent = self.handoff_list_view(req_agent)
        self.assertEqual(resp_agent.status_code, 200)
        items = resp_agent.data.get("data", [])
        self.assertTrue(any(i["conversation_id"] == str(conv.id) for i in items))
        item = next(i for i in items if i["conversation_id"] == str(conv.id))
        self.assertEqual(item["reason"], "Damaged package")
        self.assertIsNone(item["claimed_by"])

    def test_handoff_claim_concurrency(self):
        """Two agents claiming the same conversation: second claim is rejected with 409 Conflict."""
        conv = Conversation.objects.create(
            user=self.user_a,
            agent_type="support",
            metadata={
                "handed_to_human": True,
                "support_data": {"order_id": str(self.order_a1.id), "reason": "Wrong item"},
            },
        )

        # Agent Bob claims first -> 200 OK
        req_bob = self.factory.post(f"/api/ai/handoffs/{conv.id}/claim/")
        force_authenticate(req_bob, user=self.agent_bob)
        resp_bob = self.handoff_claim_view(req_bob, pk=conv.id)
        self.assertEqual(resp_bob.status_code, 200)
        self.assertEqual(resp_bob.data["data"]["claimed_by"], self.agent_bob.id)

        # Agent Alice tries to claim second -> 409 Conflict
        req_alice = self.factory.post(f"/api/ai/handoffs/{conv.id}/claim/")
        force_authenticate(req_alice, user=self.agent_alice)
        resp_alice = self.handoff_claim_view(req_alice, pk=conv.id)
        self.assertEqual(resp_alice.status_code, 409)
        self.assertIn("already claimed", resp_alice.data["message"].lower())

    def test_create_ticket_by_agent(self):
        """Agent creates exactly one CustomerCareTicket, linked to conversation metadata and assigned to agent."""
        conv = Conversation.objects.create(
            user=self.user_a,
            agent_type="support",
            metadata={
                "handed_to_human": True,
                "claimed_by": self.agent_bob.id,
                "claimed_by_name": "Bob Support",
                "support_data": {
                    "order_id": str(self.order_a1.id),
                    "reason": "Quality issue with cooling",
                    "photo_name": "ac_leak.jpg",
                },
            },
        )

        req = self.factory.post(f"/api/ai/handoffs/{conv.id}/create-ticket/")
        force_authenticate(req, user=self.agent_bob)
        resp = self.handoff_create_ticket_view(req, pk=conv.id)
        self.assertEqual(resp.status_code, 201)
        ticket_id = resp.data["data"]["ticket_id"]
        ticket_number = resp.data["data"]["ticket_number"]

        from customer_care.models import CustomerCareTicket
        ticket = CustomerCareTicket.objects.get(id=ticket_id)
        self.assertEqual(ticket.assigned_agent, self.agent_bob)
        self.assertEqual(ticket.created_by, self.agent_bob)
        self.assertEqual(ticket.customer, self.user_a)
        self.assertEqual(ticket.booking, self.order_a1)

        conv.refresh_from_db()
        self.assertEqual(conv.metadata["ticket_id"], ticket.id)
        self.assertEqual(conv.metadata["ticket_number"], ticket_number)

        # Calling again returns existing ticket without duplicating
        resp_dup = self.handoff_create_ticket_view(req, pk=conv.id)
        self.assertEqual(resp_dup.status_code, 200)
        self.assertEqual(resp_dup.data["data"]["ticket_id"], ticket.id)

    @patch("ai_assistant.views.get_llm_provider")
    def test_agent_reply_and_ai_remains_muted(self, mock_get_llm):
        """Agent reply posts into conversation, reaching customer widget; subsequent customer turns keep AI muted."""
        mock_llm = MagicMock()
        mock_get_llm.return_value = mock_llm

        conv = Conversation.objects.create(
            user=self.user_a,
            agent_type="support",
            metadata={
                "flow": "support",
                "support_step": "HANDOFF",
                "handed_to_human": True,
                "claimed_by": self.agent_bob.id,
                "support_data": {"order_id": str(self.order_a1.id), "reason": "Damaged"},
            },
        )

        # 1. Agent sends reply
        req_reply = self.factory.post(
            f"/api/ai/handoffs/{conv.id}/reply/",
            {"message": "Hello! I am Bob from customer care. I see your photo and I am processing your replacement."},
            format="json",
        )
        force_authenticate(req_reply, user=self.agent_bob)
        resp_reply = self.handoff_reply_view(req_reply, pk=conv.id)
        self.assertEqual(resp_reply.status_code, 201)

        # Verify chat message created
        last_msg = conv.messages.order_by("-created_at").first()
        self.assertEqual(last_msg.sender, SenderType.ASSISTANT)
        self.assertTrue(last_msg.metadata.get("is_human_agent"))
        self.assertEqual(last_msg.metadata.get("agent_name"), "Bob Support")

        # 2. Customer sends a reply in chat -> AI must NOT invoke LLM, returns empty muted response
        req_cust = self.factory.post(
            "/api/ai/chat/",
            {"message": "Thanks Bob, how long will it take?", "conversation_id": str(conv.id)},
            format="json",
        )
        force_authenticate(req_cust, user=self.user_a)
        resp_cust = self.view(req_cust)
        self.assertEqual(resp_cust.status_code, 200)
        self.assertTrue(resp_cust.data["data"]["handed_off"])
        self.assertEqual(resp_cust.data["data"]["message"], "")
        mock_llm.generate.assert_not_called()

    def test_photo_access_gate(self):
        """Photo gate allows owning customer and support agents; rejects unauthorized customers and anonymous."""
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile

        fname = "support_photos/secure_proof_test.jpg"
        default_storage.save(fname, ContentFile(b"test image content"))

        conv = Conversation.objects.create(
            user=self.user_a,
            agent_type="support",
            metadata={
                "handed_to_human": True,
                "support_data": {
                    "photo_url": f"/api/ai/photos/{fname}",
                    "photo_name": "secure_proof_test.jpg",
                },
            },
        )

        # 1. Unauthorized Customer User B is 403 Forbidden
        req_b = self.factory.get(f"/api/ai/photos/{fname}")
        force_authenticate(req_b, user=self.user_b)
        resp_b = self.photo_gate_view(req_b, file_path=fname)
        self.assertEqual(resp_b.status_code, 403)

        # 2. Owning Customer User A is allowed
        req_a = self.factory.get(f"/api/ai/photos/{fname}")
        force_authenticate(req_a, user=self.user_a)
        resp_a = self.photo_gate_view(req_a, file_path=fname)
        self.assertEqual(resp_a.status_code, 200)

        # 3. Support Agent Bob is allowed
        req_bob = self.factory.get(f"/api/ai/photos/{fname}")
        force_authenticate(req_bob, user=self.agent_bob)
        resp_bob = self.photo_gate_view(req_bob, file_path=fname)
        self.assertEqual(resp_bob.status_code, 200)

