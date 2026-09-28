from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from decimal import Decimal
from service_requests.models import (
    ServiceRequest, PaintingRateCard, PaintingRateCardSlab,
    PaintingQuote, PaintingQuoteItem, PaintingMeasurement, Payment,
    CatalogCategory, Service, Package
)
from companies.models import Company

User = get_user_model()

class PaintingModuleTests(APITestCase):
    def setUp(self):
        # Create test company
        self.company = Company.objects.create(
            company_name="sevo Logistics",
            slug="sevo"
        )
        # Create standard customer and admin users
        self.customer = User.objects.create_user(
            username="customer_test",
            phone="9876543210",
            email="customer@example.com",
            role="CUSTOMER"
        )
        self.admin = User.objects.create_user(
            username="admin_test",
            phone="9876543211",
            email="admin@example.com",
            role="ADMIN"
        )
        # Seed test rate card
        self.rate_card = PaintingRateCard.objects.create(
            category="Waterproofing",
            sub_service="Terrace Waterproofing — 4 Coat",
            unit="sq.ft",
            base_rate=50.00,
            classification="both"
        )

    def test_inspection_fee_geofencing_under_15km(self):
        # Coordinates very close to Hosur center (12.7409, 77.8253)
        # e.g., 12.7420, 77.8260 is < 1km away
        url = reverse("sr-booking")
        payload = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "painting",
            "issue_title": "Painting Service",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": []
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        # Should be free (₹0) since distance <= 15 km
        self.assertEqual(sr.total_amount, Decimal("0.00"))

    def test_inspection_fee_geofencing_over_15km(self):
        # Coordinates far from Hosur center (e.g. Bangalore center 12.9716, 77.5946 is ~35km away)
        url = reverse("sr-booking")
        payload = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "painting",
            "issue_title": "Painting Service",
            "address": "Bangalore Main Rd",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "total_amount": 0,
            "cart_data": []
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        # Should charge ₹300 since distance > 15 km
        self.assertEqual(sr.total_amount, Decimal("300.00"))

    def test_quote_creation_arrival_gate_enforcement(self):
        # Create a new service request in CONFIRMED state (not ARRIVED)
        sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Painting Service",
            service_category="painting",
            status=ServiceRequest.Status.CONFIRMED,
            latitude=12.7409,
            longitude=77.8253
        )
        url = reverse("admin-painting-quote-create")
        payload = {
            "booking_id": sr.id,
            "subtotal": 1000,
            "grand_total": 1000,
            "items": [{"description": "Terrace 4 Coat", "quantity": 20, "base_rate": 50, "proposed_rate": 50, "final_rate": 50, "amount": 1000, "category": "Waterproofing"}],
            "measurements": [{"area_name": "Terrace", "length": 5, "width": 4, "calculated_area": 20, "deductions": 0, "final_area": 20}]
        }
        # Attempt to create quote -> should fail with 400
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Arrival Gate active", response.data["message"])

    def test_quote_creation_prohibits_customer_paint(self):
        # Create service request in ARRIVED state
        sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Painting Service",
            service_category="painting",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        url = reverse("admin-painting-quote-create")
        # Cart item marked as CUSTOMER source
        payload = {
            "booking_id": sr.id,
            "subtotal": 1000,
            "grand_total": 1000,
            "items": [{
                "description": "Terrace 4 Coat",
                "quantity": 20,
                "base_rate": 50,
                "proposed_rate": 50,
                "final_rate": 50,
                "amount": 1000,
                "category": "Waterproofing",
                "source_type": "CUSTOMER"
            }],
            "measurements": [{"area_name": "Terrace", "length": 5, "width": 4, "calculated_area": 20, "deductions": 0, "final_area": 20}]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Customer-supplied paint materials are strictly prohibited", response.data["message"])

    def test_quote_admin_review_threshold(self):
        sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Painting Service",
            service_category="painting",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        url = reverse("admin-painting-quote-create")
        
        # Scenario 1: Quote under threshold (e.g. ₹10,000) -> SENT_TO_CUSTOMER immediately
        payload_low = {
            "booking_id": sr.id,
            "subtotal": 10000,
            "grand_total": 10000,
            "items": [{"description": "Terrace", "quantity": 200, "base_rate": 50, "proposed_rate": 50, "final_rate": 50, "amount": 10000, "category": "Waterproofing"}],
            "measurements": [{"area_name": "Terrace", "length": 20, "width": 10, "calculated_area": 200, "deductions": 0, "final_area": 200}]
        }
        res_low = self.client.post(url, payload_low, format="json")
        self.assertEqual(res_low.status_code, status.HTTP_200_OK)
        q_low = PaintingQuote.objects.get(pk=res_low.data["data"]["id"])
        self.assertEqual(q_low.status, PaintingQuote.Status.SENT_TO_CUSTOMER)

        # Scenario 2: Quote over threshold (e.g. ₹35,000) -> PENDING_ADMIN_REVIEW
        payload_high = {
            "booking_id": sr.id,
            "subtotal": 35000,
            "grand_total": 35000,
            "items": [{"description": "Terrace", "quantity": 700, "base_rate": 50, "proposed_rate": 50, "final_rate": 50, "amount": 35000, "category": "Waterproofing"}],
            "measurements": [{"area_name": "Terrace", "length": 70, "width": 10, "calculated_area": 700, "deductions": 0, "final_area": 700}]
        }
        res_high = self.client.post(url, payload_high, format="json")
        self.assertEqual(res_high.status_code, status.HTTP_200_OK)
        q_high = PaintingQuote.objects.get(pk=res_high.data["data"]["id"])
        self.assertEqual(q_high.status, PaintingQuote.Status.PENDING_ADMIN_REVIEW)

    def test_customer_quote_accept_flow(self):
        # Setup parent request
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Painting Service",
            service_category="painting",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-TEST-123",
            grand_total=Decimal("5000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER
        )
        PaintingQuoteItem.objects.create(
            quote=quote,
            category="Painting",
            description="Premium Wall Paint",
            quantity=100,
            unit="sq.ft",
            base_rate=50,
            proposed_rate=50,
            final_rate=50,
            amount=5000
        )

        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        # Customer accepts the quote
        response = self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Reload and check quote & parent ServiceRequest status
        quote.refresh_from_db()
        parent_sr.refresh_from_db()
        self.assertEqual(quote.status, PaintingQuote.Status.APPROVED)
        self.assertEqual(parent_sr.status, ServiceRequest.Status.COMPLETED)
        
        # Check child ServiceRequest was created
        child = ServiceRequest.objects.filter(parent_request=parent_sr, request_kind="quoted_work").first()
        self.assertIsNotNone(child)
        self.assertEqual(child.status, ServiceRequest.Status.CONFIRMED)
        self.assertEqual(child.total_amount, Decimal("5000.00"))

    # No live payment gateway in the test environment. Rather than mocking
    # the Razorpay client, run the documented "gateway not configured" path:
    # PaymentInitiateView issues a local sandbox order and still returns the
    # server-computed amount, which is the thing this test is about. With
    # real credentials present it would call out to Razorpay and fail with
    # 502 -- a network result, not a statement about the advance split.
    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="")
    def test_waterproofing_advance_payment_split(self):
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Painting Service",
            service_category="waterproofing",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-WP-555",
            grand_total=Decimal("20000.00"),
            advance_amount=Decimal("10000.00"),
            balance_amount=Decimal("10000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER
        )
        PaintingQuoteItem.objects.create(
            quote=quote,
            category="Waterproofing",
            description="Terrace Waterproofing 4 Coat",
            quantity=400,
            unit="sq.ft",
            base_rate=50,
            proposed_rate=50,
            final_rate=50,
            amount=20000
        )

        # Accept quote to generate child booking
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        
        child = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")
        
        # Initiate first payment (Advance).
        # Authenticate as the booking's own customer: /payment/initiate/
        # verifies ownership (HS-C-01) before issuing an order, so an
        # anonymous caller holding only a booking_id is refused -- that is
        # the control working, not a regression. A real client is either
        # logged in or supplies the tracking token.
        self.client.force_authenticate(user=self.customer)
        initiate_url = reverse("payment-initiate")
        res_pay1 = self.client.post(initiate_url, {"booking_id": child.id})
        self.assertEqual(res_pay1.status_code, status.HTTP_200_OK)
        # Should be exactly 50% advance: ₹10,000
        self.assertEqual(res_pay1.data["data"]["amount"], 10000.0)

        # Verify payment completion
        Payment.objects.create(
            customer=self.customer,
            service_request=child,
            amount=Decimal("10000.00"),
            status=ServiceRequest.PaymentStatus.PAID
        )

        # Initiate second payment (Balance)
        res_pay2 = self.client.post(initiate_url, {"booking_id": child.id})
        self.assertEqual(res_pay2.status_code, status.HTTP_200_OK)
        # Should be exactly remaining 50% balance: ₹10,000
        self.assertEqual(res_pay2.data["data"]["amount"], 10000.0)


class MasonryModuleTests(APITestCase):
    def setUp(self):
        # Create test company
        self.company = Company.objects.create(
            company_name="sevo Logistics",
            slug="sevo"
        )
        self.customer = User.objects.create_user(
            username="customer_test_mason",
            phone="9876543210",
            email="customer_mason@example.com",
            role="CUSTOMER"
        )
        self.admin = User.objects.create_user(
            username="admin_test_mason",
            phone="9876543211",
            email="admin_mason@example.com",
            role="ADMIN"
        )

        # Create Category
        self.category = CatalogCategory.objects.create(
            name="Masonry Services",
            slug="mason",
            is_active=True
        )

        # Create Service and Packages
        self.service = Service.objects.create(
            category=self.category,
            name="Masonry",
            slug="masonry",
            is_active=True,
            customization={
                "minimum_area": 500,
                "pricing_slabs": {"Small": 10000, "Medium": 10000, "Large": 20000}
            }
        )

        self.pkg_minor = Package.objects.create(
            service=self.service,
            name="Minor Masonry / Small Construction Work",
            slug="minor-masonry",
            base_price=120.00,
            status="ACTIVE"
        )

        self.pkg_tile = Package.objects.create(
            service=self.service,
            name="Bathroom Tile Fixing",
            slug="bathroom-tile-fixing",
            base_price=10000.00,
            status="ACTIVE"
        )

    def test_inspection_fee_geofencing_under_15km_mason(self):
        # Coordinates very close to Hosur center (12.7409, 77.8253)
        # e.g., 12.7420, 77.8260 is < 1km away
        url = reverse("sr-booking")
        payload = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-minor-masonry", "selectedArea": 600}]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        # Should be free (₹0) since distance <= 15 km
        self.assertEqual(sr.total_amount, Decimal("0.00"))

    def test_inspection_fee_geofencing_over_15km_mason(self):
        # Coordinates far from Hosur center (e.g. Bangalore center 12.9716, 77.5946 is ~35km away)
        url = reverse("sr-booking")
        payload = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "Bangalore Main Rd",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-minor-masonry", "selectedArea": 600}]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        # Should charge ₹300 since distance > 15 km
        self.assertEqual(sr.total_amount, Decimal("300.00"))

    def test_minor_masonry_area_validation(self):
        url = reverse("sr-booking")
        
        # Scenario 1: Rejected if area < 500 sq.ft
        payload_fail = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-minor-masonry", "selectedArea": 450}]
        }
        response = self.client.post(url, payload_fail, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Minimum service area is 500 sq.ft", response.data["message"])

        # Scenario 2: Accepted if area >= 500 sq.ft
        payload_pass = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-minor-masonry", "selectedArea": 500}]
        }
        response = self.client.post(url, payload_pass, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_bathroom_tile_fixing_size_price_validation(self):
        url = reverse("sr-booking")

        # Scenario 1: Rejected if no size selection
        payload_no_size = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-bathroom-tile-fixing"}]
        }
        response = self.client.post(url, payload_no_size, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Bathroom size choice is required", response.data["message"])

        # Scenario 2: Rejected if size is invalid (not in Small/Medium/Large)
        payload_invalid_size = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-bathroom-tile-fixing", "selectedBathroomSize": "Extra Large"}]
        }
        response = self.client.post(url, payload_invalid_size, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid bathroom size choice", response.data["message"])

        # Scenario 3: Rejected if price is incorrect (e.g. Small matched with 20000 instead of 10000)
        payload_price_mismatch = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-bathroom-tile-fixing", "selectedBathroomSize": "Small", "predefinedPrice": 20000}]
        }
        response = self.client.post(url, payload_price_mismatch, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("price mismatch", response.data["message"].lower())

        # Scenario 4: Accepted with valid size & matching price
        payload_ok = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "123 Main St, Hosur",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.7420,
            "longitude": 77.8260,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-bathroom-tile-fixing", "selectedBathroomSize": "Small", "predefinedPrice": 10000}]
        }
        response = self.client.post(url, payload_ok, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_masonry_split_payment_50_50_no_threshold(self):
        # Create quote under ₹1,000 (e.g. ₹800) -> should STILL split 50/50 for Masonry
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Masonry Quote",
            service_category="mason",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        url = reverse("admin-mason-quote-create")
        payload = {
            "booking_id": parent_sr.id,
            "subtotal": 800,
            "grand_total": 800,
            "items": [{"description": "Minor Tiling", "quantity": 1, "base_rate": 800, "proposed_rate": 800, "final_rate": 800, "amount": 800, "category": "Masonry"}],
            "measurements": [{"area_name": "Bathroom", "length": 5, "width": 4, "calculated_area": 20, "deductions": 0, "final_area": 20}]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        quote = PaintingQuote.objects.get(pk=response.data["data"]["id"])
        # Grand total is ₹800, Mason advance MUST be exactly 50% = ₹400
        self.assertEqual(quote.advance_amount, Decimal("400.00"))
        self.assertEqual(quote.balance_amount, Decimal("400.00"))

    def test_work_start_prevented_before_advance_paid(self):
        # Setup parent request
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Masonry Service",
            service_category="mason",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-999",
            grand_total=Decimal("6000.00"),
            advance_amount=Decimal("3000.00"),
            balance_amount=Decimal("3000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER
        )
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        
        child = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")
        self.assertEqual(child.status, ServiceRequest.Status.CONFIRMED)

        # Try to transition child status to ASSIGNED directly (without advance payment)
        from service_requests.state_machine import apply_transition
        from rest_framework.exceptions import ValidationError
        
        with self.assertRaises(ValidationError) as context:
            apply_transition(child, ServiceRequest.Status.ASSIGNED)
        self.assertIn("advance payment", str(context.exception).lower())

        # Pay the advance
        Payment.objects.create(
            customer=self.customer,
            service_request=child,
            amount=Decimal("3000.00"),
            status=ServiceRequest.PaymentStatus.PAID,
            razorpay_payment_id="pay_adv_123"
        )
        child.refresh_from_db()

        # Try transition again -> should succeed now that advance has been paid
        apply_transition(child, ServiceRequest.Status.ASSIGNED)
        self.assertEqual(child.status, ServiceRequest.Status.ASSIGNED)

        # Transition assigned to accepted
        apply_transition(child, ServiceRequest.Status.ACCEPTED)
        self.assertEqual(child.status, ServiceRequest.Status.ACCEPTED)

        # Transition accepted to in_progress should also succeed
        apply_transition(child, ServiceRequest.Status.IN_PROGRESS)
        self.assertEqual(child.status, ServiceRequest.Status.IN_PROGRESS)

    # Same reason as above for the gateway keys. PAYMENT_SANDBOX_MODE is the
    # switch PaymentVerifyView itself documents for exercising the flow
    # without live credentials -- without it the endpoint now (correctly)
    # refuses to mark anything paid rather than defaulting to success.
    @override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="", PAYMENT_SANDBOX_MODE=True)
    def test_payment_replay_protection_and_status_update(self):
        parent_sr = ServiceRequest.objects.create(
            company=self.company,
            customer=self.customer,
            customer_name="John Doe",
            phone="9876543210",
            address="123 Main St, Hosur",
            preferred_date=timezone.now().date(),
            preferred_time="09:00 AM",
            issue_title="Masonry Service",
            service_category="mason",
            status=ServiceRequest.Status.ARRIVED,
            latitude=12.7409,
            longitude=77.8253
        )
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-777",
            grand_total=Decimal("10000.00"),
            advance_amount=Decimal("5000.00"),
            balance_amount=Decimal("5000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER
        )
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        child = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")

        # Ownership is required here too -- see the note in
        # test_waterproofing_advance_payment_split.
        self.client.force_authenticate(user=self.customer)

        # An order_id can no longer be invented client-side: HS-C-01 made
        # /payment/verify/ reject any order this app did not itself issue
        # (before that, one unauthenticated POST with any booking_id and a
        # made-up order could mark a booking paid). So obtain a real order
        # the way a real client does, then replay against it. What this test
        # proves is unchanged -- it now actually reaches the replay path
        # instead of being turned away at the door.
        initiate_url = reverse("payment-initiate")
        res_init = self.client.post(initiate_url, {"booking_id": child.id})
        self.assertEqual(res_init.status_code, status.HTTP_200_OK)
        real_order_id = res_init.data["data"]["order_id"]

        verify_url = reverse("payment-verify")
        payload1 = {
            "payment_id": "pay_xyz_123",
            "order_id": real_order_id,
            "signature": "sig_xyz",
            "booking_id": child.id,
            "amount": 5000
        }
        res1 = self.client.post(verify_url, payload1, format="json")
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Recorded as PAID. (The old assertion was COLLECTED, which is the
        # cash-at-site state -- an online gateway payment was never that.)
        child.refresh_from_db()
        self.assertEqual(child.payment_status, ServiceRequest.PaymentStatus.PAID)

        # Replay the identical call -> idempotent success, not a second charge.
        res2 = self.client.post(verify_url, payload1, format="json")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data["success"])
        self.assertIn("already confirmed", res2.data["message"].lower())

        # And still exactly one Payment row -- the replay inserted nothing.
        self.assertEqual(Payment.objects.filter(service_request=child).count(), 1)

    def test_consultation_fee_not_counted_toward_advance(self):
        # Create consultation booking over 15km (charges ₹300)
        url = reverse("sr-booking")
        payload = {
            "customer_name": "John Doe",
            "phone": "9876543210",
            "email": "customer@example.com",
            "service_category": "mason",
            "issue_title": "Masonry Service Consultation",
            "address": "Bangalore Main Rd",
            "preferred_date": str(timezone.now().date() + timedelta(days=1)),
            "preferred_time": "09:00 AM",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "total_amount": 0,
            "cart_data": [{"id": "serv-mason-minor-masonry", "selectedArea": 600}]
        }
        response = self.client.post(url, payload, format="json")
        parent_sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertEqual(parent_sr.total_amount, Decimal("300.00"))

        # Pay consultation fee
        Payment.objects.create(
            customer=self.customer,
            service_request=parent_sr,
            amount=Decimal("300.00"),
            status=ServiceRequest.PaymentStatus.PAID,
            razorpay_payment_id="pay_consult_123"
        )
        parent_sr.payment_status = ServiceRequest.PaymentStatus.PAID
        parent_sr.status = ServiceRequest.Status.ARRIVED
        parent_sr.save()

        # Create quote
        quote = PaintingQuote.objects.create(
            service_request=parent_sr,
            quote_number="PQ-MASON-300",
            grand_total=Decimal("10000.00"),
            advance_amount=Decimal("5000.00"),
            balance_amount=Decimal("5000.00"),
            status=PaintingQuote.Status.SENT_TO_CUSTOMER
        )
        decide_url = reverse("customer-quote-decide", kwargs={"token": quote.customer_decision_token})
        self.client.post(decide_url, {"decision": "CUSTOMER_ACCEPTED"})
        child = ServiceRequest.objects.get(parent_request=parent_sr, request_kind="quoted_work")

        # The total paid on the child booking should be ₹0 (consultation payment is on parent)
        child_total_paid = sum(p.amount for p in Payment.objects.filter(service_request=child, status=ServiceRequest.PaymentStatus.PAID))
        self.assertEqual(child_total_paid, Decimal("0.00"))

        # Checking the tracking payload details via API
        tracking_url = reverse("sr-public-tracking-token", kwargs={"tracking_token": str(parent_sr.tracking_token)})
        res_track = self.client.get(tracking_url)
        self.assertEqual(res_track.status_code, status.HTTP_200_OK)
        track_data = res_track.data["data"]
        
        # Verify payment splits and advance status in tracking data
        self.assertEqual(track_data["quote_grand_total"], 10000.0)
        self.assertEqual(track_data["quote_advance_amount"], 5000.0)
        self.assertEqual(track_data["quote_balance_amount"], 5000.0)
        self.assertEqual(track_data["quote_paid_amount"], 0.0)
        self.assertFalse(track_data["advance_paid"])
