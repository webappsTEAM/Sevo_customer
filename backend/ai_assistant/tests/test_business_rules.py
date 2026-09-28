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
