"""The delivered SMS/email states the final reconciled fare."""
import uuid
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from service_requests.models import ServiceRequest


class DeliveryNoticeFareTests(TestCase):
    def _sr(self, total):
        u = get_user_model().objects.create_user(
            username=f"d_{uuid.uuid4().hex[:6]}", email=f"{uuid.uuid4().hex[:6]}@e.com", password="pw12345678",
            phone=f"98{uuid.uuid4().int % 100000000:08d}", role="customer")
        return ServiceRequest.objects.create(
            customer=u, customer_name="Ravi", phone=u.phone, email=u.email,
            service_category="goods_transport_truck", issue_title="d", address="Hosur",
            preferred_date=timezone.localdate(), total_amount=total)

    def test_sms_and_email_carry_final_fare(self):
        from service_requests import notifications as n
        sr = self._sr(Decimal("612.50"))
        with patch.object(n, "send_sms_notification") as sms, patch.object(n, "send_mail", return_value=1) as mail:
            n.notify_gt_delivery_completed(sr, technician_name="Kumar")
        self.assertIn("Final fare Rs. 612.50", sms.call_args.kwargs["message"])
        self.assertIn("Final fare", mail.call_args.kwargs["html_message"])
        self.assertIn("612.50", mail.call_args.kwargs["html_message"])

    def test_no_fare_text_when_unpriced(self):
        from service_requests import notifications as n
        sr = self._sr(Decimal("0.00"))
        with patch.object(n, "send_sms_notification") as sms, patch.object(n, "send_mail", return_value=1):
            n.notify_gt_delivery_completed(sr)
        self.assertNotIn("Final fare", sms.call_args.kwargs["message"])
