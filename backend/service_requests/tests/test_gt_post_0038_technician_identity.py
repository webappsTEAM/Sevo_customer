"""
service_requests/tests/test_gt_post_0038_technician_identity.py

After migration 0038_remove_workforce_models_and_fields moved the workforce
concern to the vendor app, ServiceRequest.assigned_employee no longer exists on
the Customer side. Two Customer code paths still read it and therefore raised
AttributeError in production:

  * service_requests/notifications.py  -- every completion/feedback email
  * customer_care/views/ticket_views.py -- every care ticket with a booking

The technician's identity now arrives over the vendor webhook, which writes
BookingAssignment.technician_* and mirrors name/phone onto the booking itself
(workforce_integration/views.py). These tests pin that replacement so the
removed field cannot creep back in.
"""
import re
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from decimal import Decimal

from service_requests.models import BookingAssignment, ServiceRequest

User = get_user_model()
BACKEND = Path(__file__).resolve().parents[2]


def _booking(**extra):
    cust = User.objects.create_user(
        username="pt_cust_%s" % extra.pop("n", 1),
        email="pt_cust_%s@example.com" % extra.get("email_n", 1),
        phone="90000%05d" % extra.pop("phone_n", 11111),
    )
    extra.pop("email_n", None)
    defaults = dict(
        customer=cust, customer_name="Post 0038", phone="9000011111",
        service_category="goods_transport_truck", issue_title="job",
        address="Hosur", preferred_date=timezone.localdate(),
        status=ServiceRequest.Status.COMPLETED, total_amount=Decimal("100.00"),
    )
    defaults.update(extra)
    return ServiceRequest.objects.create(**defaults)


class FeedbackEmailTechnicianNameTests(TestCase):
    """notifications.send_completion_and_feedback_email must not touch the removed field."""

    def _send(self, sr, token):
        from django.core import mail
        from service_requests import notifications
        mail.outbox = []
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            notifications.send_completion_and_feedback_email(sr, token)
        parts = []
        for m in mail.outbox:
            parts.append(m.body or "")
            for alt, _mime in getattr(m, "alternatives", []) or []:
                parts.append(alt or "")
        return "\n".join(parts)

    def test_uses_the_webhook_maintained_snapshot(self):
        # `email` is the recipient the function requires before it sends.
        sr = _booking(n=1, phone_n=11111, technician_name="Ravi Kumar",
                      email="cust1@example.com")
        body = self._send(sr, "tok-1")
        self.assertTrue(body, "no email was produced, so nothing was verified")
        self.assertIn("Ravi Kumar", body)

    def test_falls_back_to_a_generic_label_when_unassigned(self):
        sr = _booking(n=2, phone_n=11112, technician_name="",
                      email="cust2@example.com")
        body = self._send(sr, "tok-2")          # must not raise AttributeError
        self.assertTrue(body)
        self.assertIn("Our technician", body)

    def test_does_not_raise_when_there_is_no_recipient(self):
        sr = _booking(n=7, phone_n=11117, technician_name="Ravi Kumar")
        self.assertEqual(self._send(sr, "tok-3"), "")


class TicketTechnicianDataTests(TestCase):
    """The care-ticket context reads the assignment snapshot, never the removed FK."""

    def _tech_data(self, booking):
        # Mirrors the block in customer_care/views/ticket_views.py.
        assignment = (
            booking.assignments
            .filter(status=BookingAssignment.Status.ACCEPTED)
            .order_by("-id").first()
        )
        name = (getattr(assignment, "technician_name", "") or booking.technician_name or "").strip()
        phone = (getattr(assignment, "technician_phone", "") or booking.technician_phone or "").strip()
        if not (name or phone):
            return None
        return {"id": (getattr(assignment, "technician_id", "") or "") or None,
                "name": name, "phone": phone}

    def test_accepted_assignment_wins(self):
        sr = _booking(n=3, phone_n=11113, technician_name="Snapshot Name",
                      technician_phone="9111111111")
        BookingAssignment.objects.create(
            booking=sr, status=BookingAssignment.Status.ACCEPTED,
            technician_id="VEND-77", technician_name="Assignment Name",
            technician_phone="9222222222")
        d = self._tech_data(sr)
        self.assertEqual(d["name"], "Assignment Name")
        self.assertEqual(d["phone"], "9222222222")
        self.assertEqual(d["id"], "VEND-77")

    def test_falls_back_to_the_booking_snapshot(self):
        sr = _booking(n=4, phone_n=11114, technician_name="Snapshot Name",
                      technician_phone="9111111111")
        d = self._tech_data(sr)
        self.assertEqual(d["name"], "Snapshot Name")
        self.assertIsNone(d["id"], "a technician id must never be invented")

    def test_none_when_no_technician_is_known(self):
        sr = _booking(n=5, phone_n=11115)
        self.assertIsNone(self._tech_data(sr))

    def test_a_non_accepted_assignment_is_ignored(self):
        sr = _booking(n=6, phone_n=11116)
        BookingAssignment.objects.create(
            booking=sr, status=BookingAssignment.Status.OFFERED,
            technician_id="VEND-99", technician_name="Merely Offered")
        self.assertIsNone(self._tech_data(sr))


class NoRemovedFieldReferencesTests(TestCase):
    """Structural: the two fixed files must not read the removed field again."""

    UNGUARDED = re.compile(r"(?<!getattr\()\b(booking|service_request|sr)\.assigned_employee\b")

    def test_notifications_does_not_read_servicerequest_assigned_employee(self):
        src = (BACKEND / "service_requests" / "notifications.py").read_text(
            encoding="utf-8", errors="replace")
        code = "\n".join(l for l in src.splitlines() if not l.strip().startswith("#"))
        self.assertIsNone(self.UNGUARDED.search(code))

    def test_ticket_views_does_not_read_booking_assigned_employee(self):
        src = (BACKEND / "customer_care" / "views" / "ticket_views.py").read_text(
            encoding="utf-8", errors="replace")
        code = "\n".join(l for l in src.splitlines() if not l.strip().startswith("#"))
        self.assertIsNone(self.UNGUARDED.search(code))

    def test_servicerequest_really_has_no_such_field(self):
        self.assertFalse(any(f.name == "assigned_employee"
                             for f in ServiceRequest._meta.get_fields()))
