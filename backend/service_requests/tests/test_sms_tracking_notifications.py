"""
service_requests/tests/test_sms_tracking_notifications.py

Comprehensive test suite verifying:
1. Booking creates tracking token (UUID).
2. Booking confirmation invokes notification.
3. Booking confirmation SMS receives correct phone number.
4. SMS contains correct tracking URL.
5. Tracking URL uses actual production frontend route/base path.
6. Missing SMS credentials do not fail booking (graceful skip).
7. Driver accepted sends SMS.
8. Driver on way sends SMS.
9. Consignee SMS uses drop_contact_phone.
10. Repeated webhook does not send duplicate SMS (idempotency).
11. Tracking token remains UUID and secure.
12. Existing email notifications still work.
13. Existing WebSocket notifications still work.
"""

import json
import os
import uuid
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.services import MockSMSProvider, TwilioSMSProvider, get_sms_provider
from service_requests.models import ServiceRequest, NotificationOutbox
from companies.models import Company
from service_requests.notifications import (
    build_customer_tracking_url,
    send_sms_notification,
    send_booking_confirmation,
    notify_technician_assigned,
    notify_technician_on_the_way,
    notify_delivery_recipient,
    notify_customer_cancelled,
    send_completion_and_feedback_email,
    broadcast_tracking_event,
)

User = get_user_model()


class SMSTrackingNotificationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="test_customer",
            email="customer@example.com",
            password="testpassword123",
            phone="9876543210",
        )
        self.company = Company.objects.create(
            company_name="Test Services Ltd",
            slug="test-services",
        )
        self.booking = ServiceRequest.objects.create(
            customer=self.user,
            customer_name="John Doe",
            phone="9876543210",
            email="customer@example.com",
            service_category="goods_transport_truck",
            issue_title="Transport 50 Boxes",
            description="Goods movement",
            address="10 Industrial Estate, City",
            drop_address="55 Market Road, Town",
            drop_contact_name="Alice Smith",
            drop_contact_phone="9988776655",
            drop_contact_email="alice@example.com",
            company=self.company,
            preferred_date=timezone.now().date(),
            total_amount=Decimal("1250.00"),
            status=ServiceRequest.Status.CONFIRMED,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Booking creates tracking token & 11. Tracking token remains UUID
    # ─────────────────────────────────────────────────────────────────────────
    def test_01_booking_creates_uuid_tracking_token(self):
        """Test 1 & 11: Booking automatically generates a secure, unpredictable UUID tracking token."""
        self.assertIsNotNone(self.booking.tracking_token)
        # Verify it is a valid UUID4
        parsed_uuid = uuid.UUID(str(self.booking.tracking_token))
        self.assertEqual(parsed_uuid.version, 4)
        # Must not be sequential or related to request_id
        self.assertNotEqual(str(self.booking.tracking_token), str(self.booking.id))
        self.assertNotEqual(str(self.booking.tracking_token), str(self.booking.request_id))

    # ─────────────────────────────────────────────────────────────────────────
    # 2. Booking confirmation invokes notification
    # ─────────────────────────────────────────────────────────────────────────
    def test_02_booking_confirmation_invokes_notification(self):
        """Test 2: Booking confirmation invokes SMS and email notification architecture."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            send_booking_confirmation(self.booking)

            self.assertTrue(mock_send_sms.called)
            # Verify outbox records
            sms_outbox = NotificationOutbox.objects.filter(
                subject=f"SMS:booking:{self.booking.request_id}:booking-confirmed"
            ).first()
            self.assertIsNotNone(sms_outbox)
            self.assertEqual(sms_outbox.status, "SENT")

            # Verify email sent
            self.assertTrue(len(mail.outbox) > 0)
            self.assertIn(self.booking.request_id, mail.outbox[0].subject)

    # ─────────────────────────────────────────────────────────────────────────
    # 3. Booking confirmation SMS receives correct phone number
    # ─────────────────────────────────────────────────────────────────────────
    def test_03_booking_confirmation_sms_phone_number(self):
        """Test 3: Booking confirmation SMS is dispatched to customer's phone number."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            send_booking_confirmation(self.booking)
            mock_send_sms.assert_called_once()
            called_phone, _ = mock_send_sms.call_args[0]
            self.assertEqual(called_phone, "9876543210")

    # ─────────────────────────────────────────────────────────────────────────
    # 4. SMS contains correct tracking URL
    # ─────────────────────────────────────────────────────────────────────────
    def test_04_sms_contains_correct_tracking_url(self):
        """Test 4: SMS content contains the canonisevoing URL."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            send_booking_confirmation(self.booking)
            _, called_msg = mock_send_sms.call_args[0]
            expected_token = str(self.booking.tracking_token)
            self.assertIn(f"/tracking/{expected_token}", called_msg)
            self.assertIn(self.booking.request_id, called_msg)
            self.assertIn("SEVO:", called_msg)

    # ─────────────────────────────────────────────────────────────────────────
    # 5. Tracking URL uses actual production frontend route/base path
    # ─────────────────────────────────────────────────────────────────────────
    def test_05_canonical_tracking_url_routing(self):
        """Test 5: Canonisevoing helper builds correct dev and production paths without exposing sequential IDs."""
        # Dev URL
        with override_settings(DEBUG=True, FRONTEND_URL="http://localhost:5173"):
            dev_url = build_customer_tracking_url(self.booking)
            self.assertEqual(dev_url, f"http://localhost:5173/tracking/{self.booking.tracking_token}")

        # Production URL with /sevo subpath
        with override_settings(DEBUG=False, FRONTEND_URL="https://calservices.com"):
            with patch.dict(os.environ, {"FRONTEND_BASE_PATH": "/sevo"}, clear=False):
                prod_url = build_customer_tracking_url(self.booking)
                self.assertEqual(prod_url, f"https://calservices.com/sevo/tracking/{self.booking.tracking_token}")

        # When FRONTEND_URL already includes /sevo
        with override_settings(DEBUG=False, FRONTEND_URL="https://calservices.com/sevo"):
            prod_url2 = build_customer_tracking_url(self.booking)
            self.assertEqual(prod_url2, f"https://calservices.com/sevo/tracking/{self.booking.tracking_token}")

        # Crucial security assertion: sequential ID is never part of public tracking URL
        self.assertNotEqual(prod_url.rstrip("/").split("/")[-1], str(self.booking.id))
        self.assertNotEqual(prod_url.rstrip("/").split("/")[-1], str(self.booking.request_id))

    # ─────────────────────────────────────────────────────────────────────────
    # 6. Missing SMS credentials do not fail booking (graceful skip)
    # ─────────────────────────────────────────────────────────────────────────
    def test_06_missing_sms_credentials_graceful_behavior(self):
        """Test 6: Missing SMS credentials log clearly, record SKIPPED status, and never fail booking."""
        with override_settings(SMS_PROVIDER="twilio", DEBUG=False, TESTING=False):
            with patch.dict(os.environ, {"TWILIO_ACCOUNT_SID": "", "TWILIO_AUTH_TOKEN": ""}):
                # Booking confirmation must not raise
                try:
                    send_booking_confirmation(self.booking)
                except Exception as exc:
                    self.fail(f"send_booking_confirmation raised an unexpected exception: {exc}")

                # NotificationOutbox record should reflect SKIPPED
                outbox = NotificationOutbox.objects.filter(
                    subject=f"SMS:booking:{self.booking.request_id}:booking-confirmed"
                ).first()
                self.assertIsNotNone(outbox)
                self.assertEqual(outbox.status, "SKIPPED")
                self.assertIn("unconfigured", outbox.error.lower())

    # ─────────────────────────────────────────────────────────────────────────
    # 7. Driver accepted sends SMS
    # ─────────────────────────────────────────────────────────────────────────
    def test_07_driver_accepted_sends_sms(self):
        """Test 7: notify_technician_assigned dispatches SMS with driver name and tracking URL."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            notify_technician_assigned(self.booking, technician_name="Ramesh Kumar")
            mock_send_sms.assert_called_once()
            called_phone, called_msg = mock_send_sms.call_args[0]
            self.assertEqual(called_phone, "9876543210")
            self.assertIn("accepted", called_msg.lower())
            self.assertIn(f"/tracking/{self.booking.tracking_token}", called_msg)
            self.assertIn(self.booking.request_id, called_msg)

    # ─────────────────────────────────────────────────────────────────────────
    # 8. Driver on way sends SMS
    # ─────────────────────────────────────────────────────────────────────────
    def test_08_driver_on_way_sends_sms(self):
        """Test 8: notify_technician_on_the_way dispatches SMS with tracking URL."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            notify_technician_on_the_way(self.booking, technician_name="Ramesh Kumar")
            mock_send_sms.assert_called_once()
            called_phone, called_msg = mock_send_sms.call_args[0]
            self.assertEqual(called_phone, "9876543210")
            self.assertIn("on the way", called_msg.lower())
            self.assertIn(f"/tracking/{self.booking.tracking_token}", called_msg)

    # ─────────────────────────────────────────────────────────────────────────
    # 9. Consignee SMS uses drop_contact_phone
    # ─────────────────────────────────────────────────────────────────────────
    def test_09_consignee_sms_uses_drop_contact_phone(self):
        """Test 9: notify_delivery_recipient dispatches SMS to drop_contact_phone."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            notify_delivery_recipient(self.booking, technician_name="Ramesh Kumar")
            mock_send_sms.assert_called_once()
            called_phone, called_msg = mock_send_sms.call_args[0]
            self.assertEqual(called_phone, "9988776655")  # Drop contact phone
            self.assertIn("delivery is on the way", called_msg.lower())
            self.assertIn(f"/tracking/{self.booking.tracking_token}", called_msg)

    # ─────────────────────────────────────────────────────────────────────────
    # 10. Repeated webhook does not send duplicate SMS (idempotency)
    # ─────────────────────────────────────────────────────────────────────────
    def test_10_repeated_webhook_duplicate_protection(self):
        """Test 10: Repeated event deliveries do not trigger duplicate SMS messages."""
        event_key = f"booking:{self.booking.request_id}:driver-accepted"
        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            # First send
            first_res = send_sms_notification(
                mobile_number=self.booking.phone,
                message="Test Message",
                event_key=event_key,
                service_request=self.booking,
            )
            self.assertTrue(first_res)
            self.assertEqual(mock_send_sms.call_count, 1)

            # Second send (same event key)
            second_res = send_sms_notification(
                mobile_number=self.booking.phone,
                message="Test Message",
                event_key=event_key,
                service_request=self.booking,
            )
            self.assertTrue(second_res)
            # Provider should NOT have been called a second time
            self.assertEqual(mock_send_sms.call_count, 1)

            # Check persistent outbox count
            outbox_count = NotificationOutbox.objects.filter(
                subject=f"SMS:{event_key}",
                status="SENT"
            ).count()
            self.assertEqual(outbox_count, 1)

    # ─────────────────────────────────────────────────────────────────────────
    # 12. Existing email notifications still work
    # ─────────────────────────────────────────────────────────────────────────
    def test_12_existing_email_notifications_still_work(self):
        """Test 12: Existing email notifications continue functioning as expected."""
        with patch.object(MockSMSProvider, "send_sms", return_value=True):
            send_booking_confirmation(self.booking)
            notify_technician_assigned(self.booking, "Ramesh")
            notify_technician_on_the_way(self.booking, "Ramesh")
            notify_delivery_recipient(self.booking, "Ramesh")
            notify_customer_cancelled(self.booking, reason="Customer request")

            # Outbox should have collected all 5 emails
            self.assertEqual(len(mail.outbox), 5)
            subjects = [m.subject for m in mail.outbox]
            self.assertTrue(any("Booking Confirmation" in s for s in subjects))
            self.assertTrue(any("technician has been assigned" in s for s in subjects))
            self.assertTrue(any("on the way" in s for s in subjects))
            self.assertTrue(any("delivery is on the way" in s for s in subjects))
            self.assertTrue(any("Booking Cancelled" in s for s in subjects))

    # ─────────────────────────────────────────────────────────────────────────
    # 13. Existing WebSocket notifications still work
    # ─────────────────────────────────────────────────────────────────────────
    def test_13_existing_websocket_notifications_still_work(self):
        """Test 13: WebSocket broadcasting still succeeds without raising exceptions."""
        try:
            broadcast_tracking_event(self.booking, event_type="employee_accepted")
            broadcast_tracking_event(self.booking, event_type="employee_on_the_way")
        except Exception as exc:
            self.fail(f"broadcast_tracking_event raised an exception: {exc}")

    # ─────────────────────────────────────────────────────────────────────────
    # 14. Full end-to-end webhook dispatch with repeated delivery
    # ─────────────────────────────────────────────────────────────────────────
    def test_14_end_to_end_webhook_sms_and_duplicate_guard(self):
        """Test 14: End-to-end Vendor -> Customer webhook for employee_on_the_way dispatches customer & consignee SMS, and retried webhook is deduplicated."""
        from workforce_integration.views import WORKFORCE_WEBHOOK_SECRET
        import hmac
        import hashlib

        webhook_url = "/api/workforce-integration/webhook/"
        payload = {
            "event": "employee_on_the_way",
            "booking_id": self.booking.request_id,
            "event_id": f"evt_test_on_way_{self.booking.request_id}",
            "payload": {
                "booking_id": self.booking.request_id,
                "workforce_job_id": "WF-TEST-100",
                "employee": {
                    "name": "Suresh Driver",
                    "phone": "9800000001",
                },
                "location": {
                    "latitude": "12.9716",
                    "longitude": "77.5946",
                }
            }
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        sig = hmac.new(WORKFORCE_WEBHOOK_SECRET.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()

        with patch.object(MockSMSProvider, "send_sms", return_value=True) as mock_send_sms:
            # 1. First webhook delivery
            with self.captureOnCommitCallbacks(execute=True):
                res1 = self.client.post(
                    webhook_url,
                    data=payload,
                    format="json",
                    HTTP_X_WORKFORCE_SIGNATURE=sig,
                    HTTP_X_WORKFORCE_WEBFORCE_SECRET=WORKFORCE_WEBHOOK_SECRET,
                    HTTP_X_WORKFORCE_WEBHOOK_SECRET=WORKFORCE_WEBHOOK_SECRET,
                )
            self.assertEqual(res1.status_code, 200)

            # Customer SMS + Consignee SMS should both be sent
            self.assertEqual(mock_send_sms.call_count, 2)
            called_recipients = [call[0][0] for call in mock_send_sms.call_args_list]
            self.assertIn("9876543210", called_recipients)  # Customer
            self.assertIn("9988776655", called_recipients)  # Consignee

            # 2. Repeated webhook delivery (simulating network retry)
            with self.captureOnCommitCallbacks(execute=True):
                res2 = self.client.post(
                    webhook_url,
                    data=payload,
                    format="json",
                    HTTP_X_WORKFORCE_SIGNATURE=sig,
                    HTTP_X_WORKFORCE_WEBFORCE_SECRET=WORKFORCE_WEBHOOK_SECRET,
                    HTTP_X_WORKFORCE_WEBHOOK_SECRET=WORKFORCE_WEBHOOK_SECRET,
                )
            self.assertEqual(res2.status_code, 200)
            # Call count should STILL be 2, no duplicates!
            self.assertEqual(mock_send_sms.call_count, 2)

