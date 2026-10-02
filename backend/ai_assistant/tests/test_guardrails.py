from django.test import TestCase
from ai_assistant.guardrails.input_guard import InputGuard
from ai_assistant.guardrails.output_guard import OutputGuard


class GuardrailsTests(TestCase):
    def test_write_action_cancel_is_intercepted(self):
        """Disallowed write actions (cancel) in Phase 1 are blocked with guidance."""
        result = InputGuard.inspect("Please cancel my booking #123")
        self.assertTrue(result.is_blocked)
        self.assertEqual(result.category, "write_action")
        self.assertIn("My Bookings", result.response_override)

    def test_write_action_reschedule_is_intercepted(self):
        """Disallowed write actions (reschedule) in Phase 1 are blocked with guidance."""
        result = InputGuard.inspect("I want to reschedule my appointment to tomorrow")
        self.assertTrue(result.is_blocked)
        self.assertEqual(result.category, "write_action")
        self.assertIn("Reschedule Booking", result.response_override)

    def test_refund_intent_enters_support_flow(self):
        """Refund, return, and replacement intents enter the deterministic support flow instead of canned write blocks."""
        queries = [
            "Give me a refund for my order",
            "I want to return my product",
            "I need a replacement for my item",
        ]
        for q in queries:
            result = InputGuard.inspect(q)
            self.assertFalse(result.is_blocked, f"Query '{q}' should not be blocked")
            self.assertEqual(result.category, "support_intent")
            self.assertTrue(result.is_support_intent)

    def test_informational_policy_query_is_not_blocked_as_write(self):
        """Questions asking *about* cancellation policies must not be misclassified as write commands."""
        result = InputGuard.inspect("What is your cancellation policy?")
        self.assertFalse(result.is_blocked)

    def test_informational_booking_queries_reach_llm(self):
        """Customer questions about booking procedures and available services must flow to RAG + LLM."""
        queries = [
            "How do i book a service",
            "how can i book a service",
            "guide me to book a service",
            "services available",
            "book services",
            "book a service",
            "steps to book a service",
            "i want to book a service",
            "what services do you offer",
        ]
        for q in queries:
            result = InputGuard.inspect(q)
            self.assertFalse(result.is_blocked, f"Query '{q}' should not be blocked by InputGuard")

    def test_secrets_and_otps_are_scrubbed_from_output(self):
        """Rule #8: start_otp and tracking_token must never be surfaced."""
        dirty_booking = {
            "id": 999,
            "start_otp": "837492",
            "payment_confirmation_otp": "123456",
            "tracking_token": "token_abc123xyz",
            "total_amount": "500.00",
            "cart_data": [{"price": 500, "quantity": 1}],
        }

        clean = OutputGuard.sanitize_booking_data(dirty_booking)
        self.assertNotIn("start_otp", clean)
        self.assertNotIn("payment_confirmation_otp", clean)
        self.assertNotIn("tracking_token", clean)

    def test_text_level_otp_scrubbing(self):
        """Regex-level scrubbing removes leaked OTP numbers from textual responses."""
        dirty_text = "Your start OTP is 829471. Please share it with the technician."
        scrubbed = OutputGuard.sanitize_llm_response(dirty_text)
        self.assertNotIn("829471", scrubbed)
        self.assertIn("[OTP Hidden for Security]", scrubbed)

    def test_out_of_scope_queries_are_intercepted(self):
        """Off-topic queries like celebrities, beverages, jokes, and trivia are intercepted."""
        off_topic_queries = [
            "who is mycheal jackson",
            "who is michael jackson",
            "what is pepsi",
            "what is coca cola",
            "tell me a joke",
            "write a poem about trees",
            "who is elon musk",
            "what is the capital of france",
        ]
        for q in off_topic_queries:
            result = InputGuard.inspect(q)
            self.assertTrue(result.is_blocked, f"Expected '{q}' to be blocked as out of scope")
            self.assertEqual(result.category, "out_of_scope")
            self.assertIn("Sevo services", result.response_override)

    def test_in_scope_sevo_queries_are_not_blocked(self):
        """Legitimate Sevo inquiries about services, technicians, and bookings must not be blocked."""
        in_scope = [
            "who is my technician",
            "who is the driver",
            "who is assigned to my booking",
            "what is ac inspection",
            "what is jet cleaning",
            "what is the price of mini truck",
            "where is my order",
        ]
        for q in in_scope:
            result = InputGuard.inspect(q)
            self.assertFalse(result.is_blocked, f"In-scope query '{q}' was unexpectedly blocked")
