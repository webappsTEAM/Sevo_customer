from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from service_requests.models import ServiceRequest
from ai_assistant.guardrails.output_guard import OutputGuard
from ai_assistant.tools.customer_tools import GetOrderDetailsTool

User = get_user_model()


class BusinessRulesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="rule_tester",
            email="rules@example.com",
            phone="9876500000",
            password="TestPassword123!",
            role="customer",
        )
        self.client.force_authenticate(user=self.user)

    def test_rule_4_599_fallback_treated_as_unavailable(self):
        """
        CalServices Rule #4:
        If cart_data is empty and total_amount resolves to 599 (the default fallback),
        the bot MUST treat it as unavailable and NOT quote 599.0 as a factual price.
        """
        sr_empty_cart = ServiceRequest.objects.create(
            customer=self.user,
            customer_name="Rule Tester",
            phone="9876500000",
            email="rules@example.com",
            service_category="hvac",
            issue_title="AC Inspection",
            preferred_date="2026-09-20",
            status="confirmed",
            cart_data=[],  # empty cart
            total_amount="599.00",  # legacy serializer fallback
        )

        tool = GetOrderDetailsTool()
        result = tool.execute({"user": self.user}, order_id=str(sr_empty_cart.id))

        order_data = result.get("order", {})
        total_display = str(order_data.get("total_amount"))

        # The price must NOT be reported as "599.00" or "599"
        self.assertNotIn("599", total_display)
        self.assertIn("Unavailable", total_display)

    def test_rule_5_fabricated_technician_sentinel_suppressed(self):
        """
        CalServices Rule #5:
        If list serializer / unassigned booking carries 'Service Partner' or mockups/service_plumbing.png,
        the system must tell the customer 'A technician will be assigned shortly' and NOT state 'Service Partner' or 4.9.
        """
        mock_booking_data = {
            "id": 101,
            "status": "confirmed",
            "technician_name": "Service Partner",
            "technician_photo": "/mockups/service_plumbing.png",
            "technician_rating": 4.9,
            "cart_data": [{"price": 299, "quantity": 1}],
            "total_amount": "299.00",
        }

        sanitized = OutputGuard.sanitize_booking_data(mock_booking_data)

        self.assertIsNone(sanitized.get("technician_name"))
        self.assertIsNone(sanitized.get("technician_rating"))
        self.assertIn("A technician will be assigned shortly", sanitized.get("technician_status_display", ""))

    def test_rule_6_available_actions_dictates_capabilities(self):
        """
        CalServices Rule #6:
        What can be done with a booking is read strictly from available_actions,
        not re-derived from status enum.
        """
        sr = ServiceRequest.objects.create(
            customer=self.user,
            customer_name="Rule Tester",
            phone="9876500000",
            email="rules@example.com",
            service_category="electrical",
            issue_title="Switchboard Repair",
            preferred_date="2026-09-20",
            status="in_progress",  # in_progress cannot be cancelled
            cart_data=[{"price": 400, "quantity": 1}],
            total_amount="400.00",
        )

        tool = GetOrderDetailsTool()
        result = tool.execute({"user": self.user}, order_id=str(sr.id))

        actions = result["order"]["available_actions"]
        # In progress bookings cannot be cancelled
        self.assertFalse(actions.get("can_cancel", True))

    def test_sevo_branding_in_system_prompt(self):
        """Chatbot system prompt must mandate SEVO branding and forbid Cal services."""
        from ai_assistant.router.agent_router import AgentRouter
        prompt = AgentRouter.get_system_prompt("customer", {"user": self.user})
        self.assertIn("SEVO Customer Web App", prompt)
        self.assertIn("NEVER address or refer to the platform, company, or web app as 'Cal services'", prompt)
        self.assertIn("Customer is angry → Acknowledge → Apologize → Help", prompt)
        self.assertIn("Always be humble and polite", prompt)

    def test_output_guard_replaces_calservices_with_sevo(self):
        """OutputGuard must replace any mention of CalServices or Cal services with SEVO."""
        text1 = "Welcome to CalServices! How can I help you today?"
        self.assertEqual(OutputGuard.sanitize_llm_response(text1), "Welcome to SEVO! How can I help you today?")

        text2 = "According to Cal Services policy, your booking is confirmed."
        self.assertEqual(OutputGuard.sanitize_llm_response(text2), "According to SEVO policy, your booking is confirmed.")

    def test_chatbot_personality_rules_conversational_behavior(self):
        """Mock provider handles customer complaints, mistakes, frustration and thanks with humility."""
        from ai_assistant.llm.mock_provider import MockDeterministicProvider
        provider = MockDeterministicProvider()

        # Bad service complaint
        res = provider.generate([{"role": "user", "content": "Your service is very bad. What is this?"}], [], "", {})
        self.assertIn("We apologize for the inconvenience", res.content)
        self.assertIn("I’m sorry about this", res.content)

        # Delayed delivery
        res = provider.generate([{"role": "user", "content": "Why is my order still not delivered?"}], [], "", {})
        self.assertIn("I’m sorry for the delay", res.content)

        # Frustration
        res = provider.generate([{"role": "user", "content": "This is useless!"}], [], "", {})
        self.assertIn("I’m sorry this has been frustrating", res.content)

        # Company mistake
        res = provider.generate([{"role": "user", "content": "You people made a mistake."}], [], "", {})
        self.assertIn("We’re sorry about the mistake", res.content)

        # Helping
        res = provider.generate([{"role": "user", "content": "Are you even helping me?"}], [], "", {})
        self.assertIn("Yes, I’m here to help", res.content)

        # Already told
        res = provider.generate([{"role": "user", "content": "I already told you this!"}], [], "", {})
        self.assertIn("I’m sorry about that", res.content)

        # Thanks
        res = provider.generate([{"role": "user", "content": "Thanks"}], [], "", {})
        self.assertEqual(res.content, "You’re very welcome!")

        # Bye
        res = provider.generate([{"role": "user", "content": "Bye"}], [], "", {})
        self.assertEqual(res.content, "Goodbye! Have a great day!")

        # Greeting with name introduction
        res = provider.generate([{"role": "user", "content": "Hi ,I am namrutha"}], [], "", {})
        self.assertIn("Hello Namrutha!", res.content)
        self.assertIn("Welcome to SEVO", res.content)
        self.assertNotIn("According to SEVO policies", res.content)
        self.assertNotIn("Villa Deep Cleaning", res.content)

        # Generic greeting
        res = provider.generate([{"role": "user", "content": "Hello"}], [], "", {})
        self.assertIn("Welcome to SEVO", res.content)
        self.assertIn("How can I assist you", res.content)

    def test_delayed_order_lists_orders_and_asks_which_order(self):
        """When user asks why order is delayed, bot lists orders and asks 'Which order are you referring to?'."""
        from ai_assistant.llm.mock_provider import MockDeterministicProvider
        provider = MockDeterministicProvider()
        context = {"user": self.user, "user_id": self.user.id}

        # Step 1: Detects tool call to list customer orders
        res1 = provider.generate([{"role": "user", "content": "Why is my order still not delivered?"}], [], "", context)
        self.assertTrue(len(res1.tool_calls) > 0)
        self.assertEqual(res1.tool_calls[0]["function"]["name"], "get_customer_orders")

        # Step 2: Synthesize tool results with orders
        raw_tool_result = {
            "bookings": [
                {"booking_id": 5937, "issue_title": "AC Inspection", "status_display": "On The Way"},
                {"booking_id": 5938, "issue_title": "Vegetable Basket", "status_display": "Confirmed"},
            ]
        }
        res2 = provider._synthesize_tool_result(raw_tool_result, "Why is my order still not delivered?", context)
        self.assertIn("I’m sorry for the delay. Let me check your order status.", res2.content)
        self.assertIn("Order #5937", res2.content)
        self.assertIn("Order #5938", res2.content)
        self.assertIn("Which order are you referring to?", res2.content)

    def test_gemini_provider_multi_key_fallback(self):
        """GeminiProvider rotates to next API key when first key returns 401/403 or 429."""
        from ai_assistant.llm.gemini_provider import GeminiProvider
        from unittest.mock import patch, MagicMock

        provider = GeminiProvider(api_key=["bad_key_11111111", "good_key_22222222"])
        self.assertEqual(len(provider.api_keys), 2)

        def mock_post(url, json=None, timeout=None):
            resp = MagicMock()
            if "bad_key_11111111" in url:
                resp.status_code = 429
                resp.text = '{"error": {"code": 429, "message": "Resource Exhausted"}}'
            elif "good_key_22222222" in url:
                resp.status_code = 200
                resp.json.return_value = {
                    "candidates": [{
                        "content": {"parts": [{"text": "Response from second key"}]}
                    }]
                }
            return resp

        with patch("requests.post", side_effect=mock_post):
            res = provider.generate([{"role": "user", "content": "Hello"}], [], "", {})
            self.assertEqual(res.content, "Response from second key")
            self.assertIn("key: ...222222", res.provider_name)

    def test_get_llm_provider_collects_multiple_keys(self):
        """get_llm_provider detects comma-separated and numbered environment variables."""
        from ai_assistant.llm import get_llm_provider
        from ai_assistant.llm.gemini_provider import GeminiProvider
        import os

        env_backup = dict(os.environ)
        try:
            for k in list(os.environ.keys()):
                if k.startswith("GEMINI_API_KEY"):
                    del os.environ[k]
            os.environ["GEMINI_API_KEY"] = "key_alpha_12345678, key_beta_87654321"
            os.environ["GEMINI_API_KEY_2"] = "key_gamma_11223344"
            provider = get_llm_provider()
            self.assertIsInstance(provider, GeminiProvider)
            self.assertEqual(len(provider.api_keys), 3)
            self.assertIn("key_alpha_12345678", provider.api_keys)
            self.assertIn("key_beta_87654321", provider.api_keys)
            self.assertIn("key_gamma_11223344", provider.api_keys)
        finally:
            os.environ.clear()
            os.environ.update(env_backup)



