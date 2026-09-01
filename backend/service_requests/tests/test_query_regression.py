import uuid
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient
from django.core.cache import cache

from service_requests.models import ServiceRequest, BookingAssignment, RescheduleRequest, WorkExtension, RefundRequest

User = get_user_model()


class QueryRegressionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        cache.clear()

        # Create Admin user
        self.admin_user = User.objects.create_user(
            username="admin_reg_test",
            email="admin_reg@example.com",
            password="password123",
            role=getattr(User.Role, "ADMIN", "admin")
        )

        # Create Customer user
        self.customer_user = User.objects.create_user(
            username="cust_reg_test",
            email="cust_reg@example.com",
            password="password123",
            role=getattr(User.Role, "CUSTOMER", "customer")
        )

    def tearDown(self):
        cache.clear()

    def _create_booking(self, customer, email, phone, status=ServiceRequest.Status.NEW_REQUEST, create_refund=True):
        """Helper to create a complete booking with related objects to test prefetch coverage."""
        booking = ServiceRequest.objects.create(
            customer=customer,
            email=email,
            phone=phone,
            status=status,
            preferred_date=timezone.localdate(),
            total_amount=Decimal("499.00")
        )
        # Create related objects
        BookingAssignment.objects.create(
            booking=booking,
            technician_name="Ramesh Tech",
            technician_phone="9876543210",
            status="accepted"
        )
        RescheduleRequest.objects.create(
            booking=booking,
            requested_by=customer,
            new_date=timezone.localdate(),
            status="pending"
        )
        WorkExtension.objects.create(
            service_request=booking,
            technician_estimate=Decimal("150.00"),
            final_customer_amount=Decimal("150.00"),
            status="pending"
        )
        # If terminal state, add refund request
        if create_refund and status in [ServiceRequest.Status.COMPLETED, ServiceRequest.Status.CLOSED, ServiceRequest.Status.VERIFIED]:
            RefundRequest.objects.create(
                booking=booking,
                customer=customer,
                amount=Decimal("150.00"),
                status="pending"
            )
        return booking

    def test_admin_list_query_scaling_is_constant(self):
        # 1. Baseline: 1 booking
        self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211")
        self.client.force_authenticate(user=self.admin_user)

        with CaptureQueriesContext(connection) as ctx_baseline:
            response = self.client.get("/api/admin/service-requests/")
        
        self.assertEqual(response.status_code, 200)
        baseline_queries = len(ctx_baseline)
        
        # Verify response structure and pagination
        data = response.json().get("data", {})
        self.assertIn("results", data)
        self.assertIn("count", data)
        self.assertEqual(data["count"], 1)
        self.assertEqual(len(data["results"]), 1)

        # 2. Add 5 more bookings with related records
        for i in range(5):
            self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211")

        with CaptureQueriesContext(connection) as ctx_scaled:
            response_scaled = self.client.get("/api/admin/service-requests/")

        self.assertEqual(response_scaled.status_code, 200)
        scaled_queries = len(ctx_scaled)
        
        data_scaled = response_scaled.json().get("data", {})
        self.assertEqual(data_scaled["count"], 6)
        self.assertEqual(len(data_scaled["results"]), 6)

        # Query count MUST be exactly identical (O(1) scaling)
        print(f"[Admin List] Queries with 1 item: {baseline_queries} | with 6 items: {scaled_queries}")
        self.assertEqual(baseline_queries, scaled_queries)

    def test_my_bookings_query_scaling_is_constant(self):
        # 1. Baseline: 1 booking
        self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211")
        self.client.force_authenticate(user=self.customer_user)

        with CaptureQueriesContext(connection) as ctx_baseline:
            response = self.client.get("/api/booking/my-bookings/")

        self.assertEqual(response.status_code, 200)
        baseline_queries = len(ctx_baseline)
        
        # Verify unpaginated list response
        data = response.json()
        self.assertIn("data", data)
        self.assertIsInstance(data["data"], list)
        self.assertEqual(len(data["data"]), 1)

        # 2. Add 5 more bookings
        for i in range(5):
            self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211")

        with CaptureQueriesContext(connection) as ctx_scaled:
            response_scaled = self.client.get("/api/booking/my-bookings/")

        self.assertEqual(response_scaled.status_code, 200)
        scaled_queries = len(ctx_scaled)

        data_scaled = response_scaled.json()
        self.assertEqual(len(data_scaled["data"]), 6)

        # Query count must remain identical (O(1) scaling)
        print(f"[My Bookings] Queries with 1 item: {baseline_queries} | with 6 items: {scaled_queries}")
        self.assertEqual(baseline_queries, scaled_queries)

    def test_active_bookings_query_scaling_is_constant(self):
        # 1. Baseline: 1 booking
        self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211", status=ServiceRequest.Status.ACCEPTED)
        self.client.force_authenticate(user=self.customer_user)

        with CaptureQueriesContext(connection) as ctx_baseline:
            response = self.client.get("/api/customer/active-bookings/")

        self.assertEqual(response.status_code, 200)
        baseline_queries = len(ctx_baseline)

        # Verify unpaginated list response
        data = response.json()
        self.assertIn("data", data)
        self.assertIsInstance(data["data"], list)
        self.assertEqual(len(data["data"]), 1)

        # 2. Add 5 more bookings
        for i in range(5):
            self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211", status=ServiceRequest.Status.ACCEPTED)

        with CaptureQueriesContext(connection) as ctx_scaled:
            response_scaled = self.client.get("/api/customer/active-bookings/")

        self.assertEqual(response_scaled.status_code, 200)
        scaled_queries = len(ctx_scaled)

        data_scaled = response_scaled.json()
        self.assertEqual(len(data_scaled["data"]), 6)

        # Query count must remain identical (O(1) scaling)
        print(f"[Active Bookings] Queries with 1 item: {baseline_queries} | with 6 items: {scaled_queries}")
        self.assertEqual(baseline_queries, scaled_queries)

    def test_refunds_eligible_bookings_query_scaling_is_constant(self):
        # 1. Baseline: 1 booking
        self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211", status=ServiceRequest.Status.COMPLETED, create_refund=False)
        self.client.force_authenticate(user=self.customer_user)

        with CaptureQueriesContext(connection) as ctx_baseline:
            response = self.client.get("/api/customer/refunds/eligible-bookings/")

        self.assertEqual(response.status_code, 200)
        baseline_queries = len(ctx_baseline)

        # Verify unpaginated list response
        data = response.json()
        self.assertIn("data", data)
        self.assertIsInstance(data["data"], list)
        self.assertEqual(len(data["data"]), 1)

        # 2. Add 5 more eligible bookings
        for i in range(5):
            self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211", status=ServiceRequest.Status.COMPLETED, create_refund=False)

        with CaptureQueriesContext(connection) as ctx_scaled:
            response_scaled = self.client.get("/api/customer/refunds/eligible-bookings/")

        self.assertEqual(response_scaled.status_code, 200)
        scaled_queries = len(ctx_scaled)

        data_scaled = response_scaled.json()
        self.assertEqual(len(data_scaled["data"]), 6)

        # Query count must remain identical (O(1) scaling)
        print(f"[Refund Eligible] Queries with 1 item: {baseline_queries} | with 6 items: {scaled_queries}")
        self.assertEqual(baseline_queries, scaled_queries)

    @patch("workforce_integration.services.requests.get")
    def test_live_location_cache_hit_prevents_db_and_http_egress(self, mock_get):
        booking = self._create_booking(self.customer_user, "cust_reg@example.com", "9876543211", status=ServiceRequest.Status.ACCEPTED)
        
        # Mock Workforce tracking and quote endpoint responses
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "technician": {"id": "TECH-1", "name": "Ramesh Kumar", "phone": "9876543210"},
            "location": {"latitude": 12.34, "longitude": 56.78}
        }
        mock_get.return_value = mock_resp

        url = f"/api/booking/{booking.id}/live-location/?token={booking.tracking_token}"

        # 1. First Call: Cache Miss (Triggers external HTTP calls)
        with CaptureQueriesContext(connection) as ctx_miss:
            response_miss = self.client.get(url)

        self.assertEqual(response_miss.status_code, 200)
        miss_queries = len(ctx_miss)
        miss_http_calls = mock_get.call_count
        self.assertGreaterEqual(miss_http_calls, 1) # At least 1 tracking call on cache miss

        # 2. Second Call: Cache Hit (Triggers 0 external HTTP calls, and hits query cache)
        mock_get.reset_mock()
        with CaptureQueriesContext(connection) as ctx_hit:
            response_hit = self.client.get(url)

        self.assertEqual(response_hit.status_code, 200)
        hit_queries = len(ctx_hit)
        hit_http_calls = mock_get.call_count

        print(f"[Live Location] Miss queries: {miss_queries} (HTTP: {miss_http_calls}) | Hit queries: {hit_queries} (HTTP: {hit_http_calls})")
        self.assertEqual(hit_http_calls, 0)
        self.assertLessEqual(hit_queries, 6)
