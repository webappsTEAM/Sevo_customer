"""Driver-reported trip exceptions arrive through the real webhook, show in tracking, resolve when the trip moves on."""
from unittest.mock import patch

from django.test import TestCase

from service_requests.tests.test_gt_logistics_webhook_events import LogisticsWebhookEventTests as _W


class DeliveryExceptionWebhookTests(TestCase):
    setUp = _W.setUp
    _send = _W._send

    def _report(self, code="RECEIVER_UNAVAILABLE", leg="UNLOADING", **kw):
        return self._send("logistics.delivery_exception", {"exception_type": code, "leg": leg, "notes": "Gate locked, phone off", **kw})

    def test_report_is_stored_and_customer_notified_once(self):
        self.sr.set_logistics_leg("EN_ROUTE_DROP"); self.sr.set_logistics_leg("UNLOADING")
        with patch("service_requests.notifications.send_sms_notification") as sms:
            with self.captureOnCommitCallbacks(execute=True):
                r = self._report()
            self.assertEqual(r.status_code, 200, r.content)
            self.sr.refresh_from_db()
            self.assertEqual(self.sr.delivery_exception["status"], "OPEN")
            self.assertEqual(self.sr.delivery_exception["type"], "RECEIVER_UNAVAILABLE")
            self.assertEqual(sms.call_count, 1)
            self.assertIn("Receiver not available", sms.call_args.kwargs["message"])
            with self.captureOnCommitCallbacks(execute=True):
                self._report()                                # retried report
            self.assertEqual(sms.call_count, 1)               # no second SMS

    def test_unknown_type_is_ignored(self):
        r = self._report(code="ALIENS")
        self.assertEqual(r.status_code, 200)
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.delivery_exception, {})

    def test_exception_resolves_when_trip_moves_to_next_leg(self):
        self.sr.set_logistics_leg("EN_ROUTE_DROP"); self.sr.set_logistics_leg("UNLOADING")
        with patch("service_requests.notifications.send_sms_notification"):
            self._report()
        self._send("logistics.leg_changed", {"leg": "DELIVERED"})
        self.sr.refresh_from_db()
        self.assertEqual(self.sr.delivery_exception["status"], "RESOLVED")
        self.assertIn("resolved_at", self.sr.delivery_exception)
