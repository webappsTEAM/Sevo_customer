"""GT_REFUND_CAP: refund requests can never exceed what was paid (concurrent late-payment verifications used to create duplicate full refunds)."""
import uuid
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import User
from companies.models import Company
from service_requests import services as sr_services
from service_requests.models import Payment, RefundReason, RefundRequest, RefundStatus, RefundType, ServiceRequest


class RefundCapTests(TestCase):
    def setUp(self):
        co = Company.objects.create(company_name="RC Co", display_id="COMP-RC-1")
        self.user = User.objects.create_user(username="rc_cust", email="rc@example.com", phone="9876543277", role="customer")
        self.sr = ServiceRequest.objects.create(
            request_id="GT-RC-001", company=co, customer=self.user, customer_name="Ravi Kumar", phone="9876543277", email="rc@example.com",
            service_category="goods_transport_truck", issue_title="x", status=ServiceRequest.Status.CANCELLED, payment_method=ServiceRequest.PaymentMethod.ONLINE,
            payment_status=ServiceRequest.PaymentStatus.PAID, total_amount=Decimal("190.00"), preferred_date=timezone.now().date(), preferred_time="09:00 AM",
            tracking_token=uuid.uuid4(), start_otp="123456")
        Payment.objects.create(service_request=self.sr, customer=self.user, amount=Decimal("190.00"), status=ServiceRequest.PaymentStatus.PAID, gateway="razorpay")

    def _refund(self, amount="190.00"):
        return sr_services.create_refund_request(booking=self.sr, customer=self.user, amount=Decimal(amount), reason=RefundReason.OTHER)

    def test_second_full_refund_for_same_payment_is_refused(self):
        self._refund()
        with self.assertRaises(ValidationError):
            self._refund()
        self.assertEqual(RefundRequest.objects.filter(booking=self.sr).count(), 1)

    def test_partial_refunds_within_paid_amount_are_allowed(self):
        self._refund("100.00"); self._refund("90.00")
        with self.assertRaises(ValidationError):
            self._refund("1.00")

    def test_rejected_refund_frees_the_amount(self):
        rr = self._refund()
        rr.status = RefundStatus.REJECTED; rr.save(update_fields=["status"])
        self._refund()   # allowed again

    def test_two_paid_payments_allow_refunding_the_duplicate(self):
        Payment.objects.create(service_request=self.sr, customer=self.user, amount=Decimal("190.00"), status=ServiceRequest.PaymentStatus.PAID, gateway="razorpay")
        self._refund(); self._refund()
