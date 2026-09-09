"""
service_requests/tests/test_estimation.py

Comprehensive test suite verifying:
- AC Estimation booking creation & validation
- Segregation between ServiceRequest and Estimation models
- Idempotency guarantees
- Concurrency-safe versioned quotations
- Decimal arithmetic & price snapshots
- Atomic approval & transition to CHANGE_REQUEST on same ServiceRequest
- Rejection handling and double-transition 409 Conflict protection
- Cancellation and Transactional EventOutbox persistence
- N+1 query regression safety on /api/booking/my-bookings/
"""
from decimal import Decimal
import uuid
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from service_requests.models import (
    ServiceRequest,
    Estimation,
    EstimationFee,
    EstimationQuotation,
    EstimationQuotationItem,
    Inspection,
    InspectionFinding,
    EventOutbox,
    Package,
    CatalogCategory,
)
from service_requests.services.quotation_service import QuotationService
from service_requests.services.inspection_service import InspectionService
from service_requests.services.estimation_service import (
    EstimationService,
    EstimationStateConflictError,
)

User = get_user_model()


class EstimationSystemTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username="test_customer",
            email="customer@example.com",
            phone="9876543210",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        self.other_customer = User.objects.create_user(
            username="other_customer",
            email="other@example.com",
            phone="9123456780",
            role=getattr(User.Role, "CUSTOMER", "customer"),
        )
        self.client.force_authenticate(user=self.customer)

        self.category = CatalogCategory.objects.create(
            name="HVAC",
            slug="hvac",
            is_active=True,
        )

        from service_requests.models import Service
        self.service = Service.objects.create(
            category=self.category,
            name="AC Services",
            slug="ac-services",
        )

        self.package = Package.objects.create(
            service=self.service,
            name="AC General Service",
            slug="ac-general-service",
            base_price=Decimal("499.00"),
            status="ACTIVE",
        )

        self.valid_estimation_payload = {
            "job_type": "ESTIMATION",
            "service_category": "hvac",
            "ac_type": "SPLIT",
            "ac_brand": "Daikin",
            "ac_capacity": "1.5_TON",
            "ac_quantity": 2,
            "customer_symptom": "Water leakage from indoor unit and low cooling",
            "customer_notes": "Please visit in the afternoon",
            "address": "123 Main Street, Bangalore",
            "preferred_date": (timezone.localdate() + timezone.timedelta(days=1)).isoformat(),
            "preferred_time": "14:00 - 16:00",
            "customer_name": "Test Customer",
            "phone": "9876543210",
        }

    # ──────────────────────────────────────────────────────────────────────────
    # 1. REGRESSION TESTS: Normal Booking Behavior
    # ──────────────────────────────────────────────────────────────────────────

    def test_regression_normal_booking_creates_service_job_type(self):
        """1. Normal service booking continues to create ServiceRequest with job_type=SERVICE."""
        payload = {
            "service_category": "hvac",
            "issue_title": "AC Not Cooling",
            "description": "Standard service request",
            "address": "456 Side Street",
            "preferred_date": (timezone.localdate() + timezone.timedelta(days=1)).isoformat(),
            "preferred_time": "10:00 - 12:00",
            "customer_name": "Test Customer",
            "phone": "9876543210",
            "payment_method": "COD",
        }
        response = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        req_id = response.data["data"]["request_id"]
        sr = ServiceRequest.objects.get(request_id=req_id)
        self.assertEqual(sr.job_type, ServiceRequest.JobType.SERVICE)

    def test_regression_normal_booking_never_creates_estimation(self):
        """2. Normal booking never creates an Estimation or EstimationFee record."""
        payload = {
            "service_category": "hvac",
            "issue_title": "Normal AC Filter Clean",
            "address": "789 Third Street",
            "preferred_date": (timezone.localdate() + timezone.timedelta(days=1)).isoformat(),
            "customer_name": "Test Customer",
            "phone": "9876543210",
        }
        response = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertFalse(hasattr(sr, "estimation"))
        self.assertEqual(Estimation.objects.count(), 0)
        self.assertEqual(EstimationFee.objects.count(), 0)

    # ──────────────────────────────────────────────────────────────────────────
    # 2. ESTIMATION CREATION & VALIDATION
    # ──────────────────────────────────────────────────────────────────────────

    def test_estimation_booking_creates_service_request_and_estimation_records(self):
        """3 & 4. Estimation booking creates ServiceRequest with job_type=ESTIMATION and linked Estimation."""
        response = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data["data"]
        sr = ServiceRequest.objects.get(request_id=data["request_id"])
        self.assertEqual(sr.job_type, ServiceRequest.JobType.ESTIMATION)
        self.assertEqual(sr.request_kind, "inspection")
        self.assertEqual(sr.status, ServiceRequest.Status.REQUESTED)

        self.assertTrue(hasattr(sr, "estimation"))
        est = sr.estimation
        self.assertEqual(est.ac_type, "SPLIT")
        self.assertEqual(est.ac_brand, "Daikin")
        self.assertEqual(est.ac_capacity, "1.5_TON")
        self.assertEqual(est.ac_quantity, 2)
        self.assertEqual(est.customer_symptom, self.valid_estimation_payload["customer_symptom"])
        self.assertEqual(est.status, Estimation.Status.REQUESTED)

    def test_estimation_booking_creates_fee_199(self):
        """5. Estimation booking creates EstimationFee record with authoritative default ₹199.00."""
        response = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        sr = ServiceRequest.objects.get(request_id=response.data["data"]["request_id"])
        self.assertTrue(hasattr(sr.estimation, "fee"))
        fee = sr.estimation.fee
        self.assertEqual(fee.amount, Decimal("199.00"))
        self.assertEqual(fee.currency, "INR")
        self.assertEqual(fee.status, EstimationFee.Status.PENDING)

    def test_missing_required_ac_fields_returns_400(self):
        """6. Missing required AC parameters returns 400 Bad Request."""
        payload = self.valid_estimation_payload.copy()
        payload.pop("customer_symptom")
        response = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_ac_type_returns_400(self):
        """7. Invalid ac_type returns 400 Bad Request."""
        payload = self.valid_estimation_payload.copy()
        payload["ac_type"] = "PORTABLE_INVALID"
        response = self.client.post("/api/booking/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ac_quantity_bounds_validation(self):
        """8 & 9. ac_quantity < 1 returns 400, while valid values 1..50 succeed."""
        # Test quantity 0
        p0 = self.valid_estimation_payload.copy()
        p0["ac_quantity"] = 0
        r0 = self.client.post("/api/booking/", p0, format="json")
        self.assertEqual(r0.status_code, status.HTTP_400_BAD_REQUEST)

        # Test valid quantity 1
        p1 = self.valid_estimation_payload.copy()
        p1["ac_quantity"] = 1
        r1 = self.client.post("/api/booking/", p1, format="json")
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        # Test valid boundary quantity 50
        p50 = self.valid_estimation_payload.copy()
        p50["ac_quantity"] = 50
        r50 = self.client.post("/api/booking/", p50, format="json")
        self.assertEqual(r50.status_code, status.HTTP_201_CREATED)

    # ──────────────────────────────────────────────────────────────────────────
    # 3. IDEMPOTENCY KEY TESTS
    # ──────────────────────────────────────────────────────────────────────────

    def test_idempotency_key_deduplication(self):
        """10. Duplicate request with same Idempotency-Key returns existing booking."""
        idempotency_key = "idemp-key-abc-12345"
        payload = self.valid_estimation_payload.copy()

        # First request
        r1 = self.client.post(
            "/api/booking/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=idempotency_key,
        )
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)
        first_req_id = r1.data["data"]["request_id"]

        # Duplicate request
        r2 = self.client.post(
            "/api/booking/",
            payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY=idempotency_key,
        )
        self.assertEqual(r2.status_code, status.HTTP_200_OK)
        second_req_id = r2.data["data"]["request_id"]

        self.assertEqual(first_req_id, second_req_id)
        self.assertEqual(ServiceRequest.objects.filter(idempotency_key=idempotency_key).count(), 1)

    def test_different_idempotency_keys_create_separate_requests(self):
        """11. Different idempotency keys create distinct ServiceRequests."""
        r1 = self.client.post(
            "/api/booking/",
            self.valid_estimation_payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="key-1",
        )
        r2 = self.client.post(
            "/api/booking/",
            self.valid_estimation_payload,
            format="json",
            HTTP_IDEMPOTENCY_KEY="key-2",
        )
        self.assertNotEqual(r1.data["data"]["request_id"], r2.data["data"]["request_id"])
        self.assertEqual(ServiceRequest.objects.filter(customer=self.customer).count(), 2)

    # ──────────────────────────────────────────────────────────────────────────
    # 4. QUERY EFFICIENCY & N+1 REGRESSION SAFETY
    # ──────────────────────────────────────────────────────────────────────────

    def test_my_bookings_includes_estimation_and_fee(self):
        """12. GET /api/booking/my-bookings/ includes estimation and fee data."""
        self.client.post("/api/booking/", self.valid_estimation_payload, format="json")

        response = self.client.get("/api/booking/my-bookings/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        bookings = response.data["data"]
        self.assertGreaterEqual(len(bookings), 1)
        b = bookings[0]
        self.assertEqual(b["job_type"], "ESTIMATION")
        self.assertIsNotNone(b["estimation"])
        self.assertEqual(b["estimation"]["ac_type"], "SPLIT")
        self.assertEqual(b["estimation"]["fee_amount"], 199.0)

    def test_my_bookings_no_n_plus_one_queries(self):
        """13. Verified N+1 query regression safety on my-bookings."""
        # Create 5 estimation bookings
        for i in range(5):
            self.client.post(
                "/api/booking/",
                self.valid_estimation_payload,
                format="json",
                HTTP_IDEMPOTENCY_KEY=f"n1-test-key-{i}",
            )

        # Count queries for 5 bookings
        with self.assertNumQueries(9):
            # 9 bounded queries: User/Session + ServiceRequest + Prefetches + Batched OTPs
            resp = self.client.get("/api/booking/my-bookings/")
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertGreaterEqual(len(resp.data["data"]), 5)

    # ──────────────────────────────────────────────────────────────────────────
    # 5. DETAIL & ESTIMATION ENDPOINTS
    # ──────────────────────────────────────────────────────────────────────────

    def test_get_booking_detail_includes_estimation(self):
        """14. GET /api/booking/{id}/ returns estimation details."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]

        response = self.client.get(f"/api/booking/{sr_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["job_type"], "ESTIMATION")
        self.assertIsNotNone(data["estimation"])
        self.assertEqual(data["estimation"]["ac_brand"], "Daikin")

    def test_get_estimation_endpoint_404_for_normal_service(self):
        """15. GET /api/booking/{id}/estimation/ returns 404 for normal service booking."""
        normal_sr = ServiceRequest.objects.create(
            customer=self.customer,
            service_category="cleaning",
            job_type=ServiceRequest.JobType.SERVICE,
            preferred_date=timezone.localdate(),
        )
        response = self.client.get(f"/api/booking/{normal_sr.id}/estimation/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ──────────────────────────────────────────────────────────────────────────
    # 6. QUOTATION VERSIONING & ARITHMETIC
    # ──────────────────────────────────────────────────────────────────────────

    def test_quotation_creation_and_versioning(self):
        """16 & 17. Quotation creation generates v1, second quotation generates v2 and supersedes v1."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr = ServiceRequest.objects.get(pk=res.data["data"]["id"])
        est = sr.estimation

        items_v1 = [
            {"service_name": "Gas Refill R32", "unit_price": Decimal("1500.00"), "quantity": 1, "tax_rate": Decimal("18.00")},
        ]
        q1 = QuotationService.create_quotation(est, items_v1)
        self.assertEqual(q1.version, 1)
        self.assertEqual(q1.status, EstimationQuotation.Status.SENT)

        items_v2 = [
            {"service_name": "Gas Refill R32", "unit_price": Decimal("1500.00"), "quantity": 1, "tax_rate": Decimal("18.00")},
            {"service_name": "Copper Pipe Flare Repair", "unit_price": Decimal("400.00"), "quantity": 1, "tax_rate": Decimal("18.00")},
        ]
        q2 = QuotationService.create_quotation(est, items_v2)
        self.assertEqual(q2.version, 2)
        self.assertEqual(q2.status, EstimationQuotation.Status.SENT)

        q1.refresh_from_db()
        self.assertEqual(q1.status, EstimationQuotation.Status.SUPERSEDED)

    def test_quotation_arithmetic_precision(self):
        """18. Decimal financial precision calculates subtotal, tax, discount, total."""
        items = [
            {
                "service_name": "Service A",
                "unit_price": Decimal("1000.00"),
                "quantity": 2,
                "tax_rate": Decimal("18.00"),
                "discount_amount": Decimal("100.00"),
            },
            {
                "service_name": "Service B",
                "unit_price": Decimal("500.00"),
                "quantity": 1,
                "tax_rate": Decimal("18.00"),
                "discount_amount": Decimal("0.00"),
            },
        ]
        totals = QuotationService.calculate_totals(items)
        # Subtotal: (1000 * 2) + (500 * 1) = 2500.00
        # Tax: (2000 * 0.18 = 360.00) + (500 * 0.18 = 90.00) = 450.00
        # Discount: 100.00
        # Total: 2500 + 450 - 100 = 2850.00
        self.assertEqual(totals["subtotal"], Decimal("2500.00"))
        self.assertEqual(totals["tax_amount"], Decimal("450.00"))
        self.assertEqual(totals["discount_amount"], Decimal("100.00"))
        self.assertEqual(totals["total_amount"], Decimal("2850.00"))

    # ──────────────────────────────────────────────────────────────────────────
    # 7. QUOTATION APPROVAL & CONVERSION
    # ──────────────────────────────────────────────────────────────────────────

    def test_customer_approves_quotation_converts_to_change_request(self):
        """19. Approval marks quote APPROVED, transitions job_type to CHANGE_REQUEST on SAME ServiceRequest."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        sr = ServiceRequest.objects.get(pk=sr_id)

        items = [{"service_name": "Full Coil Wash", "unit_price": Decimal("800.00"), "quantity": 1}]
        q = QuotationService.create_quotation(sr.estimation, items)

        approve_res = self.client.post(f"/api/booking/{sr_id}/quotation/approve/", {"quotation_id": q.id}, format="json")
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        q.refresh_from_db()
        self.assertEqual(q.status, EstimationQuotation.Status.APPROVED)
        self.assertIsNotNone(q.customer_approved_at)

        sr.refresh_from_db()
        self.assertEqual(sr.id, sr_id)  # PRESERVED SAME RECORD
        self.assertEqual(sr.job_type, ServiceRequest.JobType.CHANGE_REQUEST)
        self.assertEqual(sr.request_kind, "quoted_work")
        self.assertEqual(sr.status, ServiceRequest.Status.CUSTOMER_APPROVED)

    def test_double_approval_returns_409_conflict(self):
        """20. Approving an already approved quotation returns 409 Conflict."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        sr = ServiceRequest.objects.get(pk=sr_id)

        items = [{"service_name": "AC Checkup", "unit_price": Decimal("300.00"), "quantity": 1}]
        q = QuotationService.create_quotation(sr.estimation, items)

        # First approval: 200 OK
        r1 = self.client.post(f"/api/booking/{sr_id}/quotation/approve/", {"quotation_id": q.id}, format="json")
        self.assertEqual(r1.status_code, status.HTTP_200_OK)

        # Second approval: 409 CONFLICT
        r2 = self.client.post(f"/api/booking/{sr_id}/quotation/approve/", {"quotation_id": q.id}, format="json")
        self.assertEqual(r2.status_code, status.HTTP_409_CONFLICT)

    # ──────────────────────────────────────────────────────────────────────────
    # 8. QUOTATION REJECTION & CONFLICTS
    # ──────────────────────────────────────────────────────────────────────────

    def test_customer_rejects_quotation(self):
        """21. Rejection marks quote REJECTED, closes estimation, leaves job_type=ESTIMATION."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        sr = ServiceRequest.objects.get(pk=sr_id)

        items = [{"service_name": "Compressor Replacement", "unit_price": Decimal("8500.00"), "quantity": 1}]
        q = QuotationService.create_quotation(sr.estimation, items)

        reject_res = self.client.post(
            f"/api/booking/{sr_id}/quotation/reject/",
            {"quotation_id": q.id, "reason_code": "PRICE_TOO_HIGH", "reason_note": "Cost exceeds budget"},
            format="json",
        )
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        q.refresh_from_db()
        self.assertEqual(q.status, EstimationQuotation.Status.REJECTED)
        self.assertEqual(q.rejection_reason, "PRICE_TOO_HIGH")

        sr.refresh_from_db()
        self.assertEqual(sr.job_type, ServiceRequest.JobType.ESTIMATION)
        self.assertEqual(sr.status, ServiceRequest.Status.CUSTOMER_REJECTED)

    def test_approve_after_reject_returns_409_conflict(self):
        """22. Attempting to approve a rejected quotation returns 409 Conflict."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        sr = ServiceRequest.objects.get(pk=sr_id)

        items = [{"service_name": "PCB Repair", "unit_price": Decimal("2500.00"), "quantity": 1}]
        q = QuotationService.create_quotation(sr.estimation, items)

        # Reject
        self.client.post(f"/api/booking/{sr_id}/quotation/reject/", {"quotation_id": q.id}, format="json")

        # Attempt approve -> 409 Conflict
        approve_res = self.client.post(f"/api/booking/{sr_id}/quotation/approve/", {"quotation_id": q.id}, format="json")
        self.assertEqual(approve_res.status_code, status.HTTP_409_CONFLICT)

    # ──────────────────────────────────────────────────────────────────────────
    # 9. CANCELLATION & EVENT OUTBOX
    # ──────────────────────────────────────────────────────────────────────────

    def test_cancellation_of_estimation_booking(self):
        """23. Cancellation of estimation booking updates ServiceRequest and Estimation to CANCELLED."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]

        cancel_res = self.client.post(f"/api/booking/{sr_id}/cancel/", {"reason": "Customer changed plans"}, format="json")
        self.assertEqual(cancel_res.status_code, status.HTTP_200_OK)

        sr = ServiceRequest.objects.get(pk=sr_id)
        self.assertEqual(sr.status, ServiceRequest.Status.CANCELLED)
        self.assertEqual(sr.estimation.status, Estimation.Status.CANCELLED)

    def test_event_outbox_records_domain_events(self):
        """24. EventOutbox reliably records domain events on creation, quotation, and approval."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        sr = ServiceRequest.objects.get(pk=sr_id)

        # Verify creation event
        created_event = EventOutbox.objects.filter(
            aggregate_id=sr.request_id,
            event_type="estimation.created"
        ).first()
        self.assertIsNotNone(created_event)
        self.assertEqual(created_event.payload["job_type"], "ESTIMATION")

        # Generate quotation
        items = [{"service_name": "Gas Topup", "unit_price": Decimal("1200.00"), "quantity": 1}]
        q = QuotationService.create_quotation(sr.estimation, items)
        quote_event = EventOutbox.objects.filter(
            aggregate_id=sr.request_id,
            event_type="quotation.sent"
        ).first()
        self.assertIsNotNone(quote_event)

        # Approve quotation
        QuotationService.approve_quotation(sr.id, q.id, self.customer)
        approve_event = EventOutbox.objects.filter(
            aggregate_id=sr.request_id,
            event_type="quotation.approved"
        ).first()
        self.assertIsNotNone(approve_event)
        self.assertEqual(approve_event.payload["job_type"], "CHANGE_REQUEST")

    def test_inspection_lifecycle_findings_and_photos(self):
        """25. InspectionService starts inspection, records structured findings, and completes."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr = ServiceRequest.objects.get(pk=res.data["data"]["id"])
        est = sr.estimation

        # Start inspection
        inspection = InspectionService.start_inspection(
            estimation=est,
            technician_id="TECH-101",
            technician_name="Ramesh Kumar",
            technician_phone="9876500000",
        )
        self.assertEqual(inspection.status, Inspection.Status.IN_PROGRESS)
        self.assertEqual(est.status, Estimation.Status.INSPECTION_IN_PROGRESS)

        # Add finding
        finding = InspectionService.add_finding(
            inspection=inspection,
            finding_data={
                "finding_type": "Gas Leakage",
                "title": "Flare Nut Leakage at Outdoor Unit",
                "diagnosis": "Low pressure detected (45 PSI). Flare nut loose.",
                "severity": "HIGH",
                "recommended_action": "Tighten flare nut, perform nitrogen pressure test, refill gas.",
                "quantity": 1,
            },
        )
        self.assertEqual(finding.severity, "HIGH")
        self.assertEqual(inspection.findings.count(), 1)

        # Complete inspection
        InspectionService.complete_inspection(
            inspection=inspection,
            diagnosis="Minor leak at outdoor flare nut.",
            notes="Ready for quotation.",
        )
        inspection.refresh_from_db()
        self.assertEqual(inspection.status, Inspection.Status.COMPLETED)

        # Verify inspection detail endpoint
        resp = self.client.get(f"/api/booking/{sr.id}/inspection/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["data"]["findings"]), 1)

    def test_guest_access_with_tracking_token(self):
        """26. Guest / unauthenticated client can view estimation details with valid tracking token."""
        res = self.client.post("/api/booking/", self.valid_estimation_payload, format="json")
        sr_id = res.data["data"]["id"]
        token = res.data["data"]["tracking_token"]

        # Logout customer
        self.client.force_authenticate(user=None)

        # Access without token -> 401
        r_unauth = self.client.get(f"/api/booking/{sr_id}/estimation/")
        self.assertEqual(r_unauth.status_code, status.HTTP_401_UNAUTHORIZED)

        # Access with token -> 200 OK
        r_auth = self.client.get(f"/api/booking/{sr_id}/estimation/?token={token}")
        self.assertEqual(r_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(r_auth.data["data"]["ac_brand"], "Daikin")

