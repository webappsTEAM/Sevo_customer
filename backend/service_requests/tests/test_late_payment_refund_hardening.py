"""
service_requests/tests/test_late_payment_refund_hardening.py

Tests for:
1. Automated refund creation on late payment verification when booking is cancelled.
2. Row-level locking on CustomerBookingCancelView.
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory

from service_requests.models import ServiceRequest
from service_requests.payment_views import PaymentVerifyView
from service_requests.views import CustomerBookingCancelView


class LatePaymentRefundHardeningTests(SimpleTestCase):
    # CustomerBookingCancelView.post() opens a real DB transaction
    # (atomic_transaction()) even when every model call inside it is mocked,
    # because Django's transaction machinery talks to the connection
    # directly. SimpleTestCase forbids DB access by default; declaring
    # `databases` here (Django's documented escape hatch) allows the
    # transaction wrapper to open/close without granting any real query the
    # mocks don't already intercept.
    databases = {"default"}

    def setUp(self):
        self.factory = APIRequestFactory()

    @patch("service_requests.payment_views.settings.PAYMENT_SANDBOX_MODE", True)
    @patch("service_requests.payment_views.settings.RAZORPAY_KEY_ID", "")
    @patch("service_requests.payment_views.settings.RAZORPAY_KEY_SECRET", "")
    @patch("service_requests.payment_views._verify_booking_ownership", return_value=True)
    @patch("service_requests.payment_views.ServiceRequest.objects.get")
    @patch("service_requests.payment_views.Payment.objects.filter")
    @patch("service_requests.payment_views.apply_transition")
    @patch("service_requests.services.create_refund_request")
    def test_late_payment_on_cancelled_booking_triggers_refund_creation(
        self, mock_create_refund, mock_apply_trans, mock_payment_filter, mock_sr_get, mock_ownership
    ):
        sr = MagicMock()
        sr.id = 999
        sr.pk = 999
        sr.request_id = "SR-999"
        sr.status = ServiceRequest.Status.CANCELLED
        sr.payment_status = ServiceRequest.PaymentStatus.PENDING
        sr.total_amount = Decimal("450.00")
        sr.customer = MagicMock()
        sr.transaction_id = ""
        sr.invoice_id = ""
        mock_sr_get.return_value = sr

        payment_mock = MagicMock()
        payment_mock.status = ServiceRequest.PaymentStatus.PENDING
        payment_mock.gateway = "razorpay"
        mock_payment_filter.return_value.order_by.return_value.first.return_value = payment_mock

        from rest_framework.exceptions import ValidationError
        mock_apply_trans.side_effect = ValidationError("Invalid transition from CANCELLED to CONFIRMED")

        view = PaymentVerifyView.as_view()
        req = self.factory.post("/api/payment/verify/", {
            "booking_id": 999,
            "order_id": "order_test_123",
        }, format="json")

        response = view(req)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(sr.payment_status, ServiceRequest.PaymentStatus.PAID)
        mock_create_refund.assert_called_once()
        call_kwargs = mock_create_refund.call_args[1]
        self.assertEqual(call_kwargs["booking"], sr)
        self.assertEqual(call_kwargs["amount"], Decimal("450.00"))

    @patch("django.db.transaction.atomic")
    @patch("service_requests.views.ServiceRequestDetailSerializer")
    @patch("service_requests.notifications.notify_customer_cancelled")
    @patch("service_requests.views.ServiceRequest.objects.get")
    @patch("service_requests.views.ServiceRequest.objects.select_for_update")
    @patch("service_requests.views.apply_transition")
    @patch("service_requests.views.WorkforceIntegrationService.cancel_workforce_job")
    def test_cancel_booking_acquires_select_for_update(
        self, mock_wf_cancel, mock_apply_trans, mock_sr_sfu, mock_sr_get, mock_notify, mock_serializer, mock_atomic
    ):
        sr = MagicMock()
        sr.pk = 101
        sr.id = 101
        sr.status = ServiceRequest.Status.CONFIRMED
        sr.otp_verified = False
        sr.tracking_token = "token123"
        sr.phone = "9876543210"
        from django.utils import timezone
        sr.created_at = timezone.now()
        sr.payment_status = ServiceRequest.PaymentStatus.PENDING
        mock_sr_get.return_value = sr
        mock_sr_sfu.return_value.get.return_value = sr

        view = CustomerBookingCancelView.as_view()
        req = self.factory.post("/api/bookings/101/cancel/", {
            "token": "token123",
            "reason": "Change of plans",
        }, format="json")

        response = view(req, pk=101)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_sr_sfu.assert_called_once()
        mock_apply_trans.assert_called_once_with(sr, ServiceRequest.Status.CANCELLED, actor=None)
