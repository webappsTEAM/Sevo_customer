"""Regression: a failing raw-SQL lookup against a vendor-owned table must not
poison the caller's PostgreSQL transaction (found by the final forensic QA run
on real PostgreSQL: SQLite tolerates this, PostgreSQL aborts the transaction)."""
from django.db import connection
from django.test import TestCase

from service_requests.models import ServiceRequest
import workforce_integration.services as svc


class QuoteHistoryDoesNotPoisonTransactionTests(TestCase):
    def _service_cls(self):
        for name in dir(svc):
            obj = getattr(svc, name)
            if isinstance(obj, type) and hasattr(obj, "get_quote_history_by_booking_id"):
                return obj
        self.fail("class exposing get_quote_history_by_booking_id not found")

    def test_missing_vendor_table_returns_empty_and_connection_stays_usable(self):
        with connection.cursor() as c:
            c.execute("DROP TABLE IF EXISTS workforce_quote")
        result = self._service_cls().get_quote_history_by_booking_id(12345)
        self.assertEqual(result, [])
        # Would raise InFailedSqlTransaction on PostgreSQL before the fix.
        self.assertGreaterEqual(ServiceRequest.objects.count(), 0)

    def test_get_quote_by_booking_id_missing_table_keeps_connection_usable(self):
        with connection.cursor() as c:
            c.execute("DROP TABLE IF EXISTS workforce_quote")
        cls = self._service_cls()
        cls.get_quote_by_booking_id("12345")  # result irrelevant; must not raise/poison
        self.assertGreaterEqual(ServiceRequest.objects.count(), 0)
