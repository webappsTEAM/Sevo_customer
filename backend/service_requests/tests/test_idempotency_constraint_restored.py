"""
Migration 0087 dropped unique_customer_idempotency_key (and two ServiceRequest indexes) although the
model still declares them; 0100/0101 restore them. The data step must make that safe on a database that
has accumulated duplicates in the meantime.
"""
import importlib
import uuid

from django.apps import apps
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db import connection
from django.test import TestCase, TransactionTestCase

from service_requests.models import ServiceRequest

User = get_user_model()


def _sr(customer, key):
    n = uuid.uuid4().hex[:8]
    return ServiceRequest.objects.create(
        request_id=f"IDEM{n}", customer=customer, customer_name="C", phone="9000000000",
        service_category="goods_transport_truck", issue_title="x", address="a",
        preferred_date="2026-09-28", idempotency_key=key,
    )


class IdempotencyConstraintTests(TestCase):
    def setUp(self):
        self.a = User.objects.create_user(username="ida", email="ida@example.com", password="x", phone="9111111111")
        self.b = User.objects.create_user(username="idb", email="idb@example.com", password="x", phone="9222222222")

    def test_the_database_now_refuses_a_duplicate_key_for_one_customer(self):
        _sr(self.a, "k-1")
        with self.assertRaises(IntegrityError), transaction.atomic():
            _sr(self.a, "k-1")

    def test_same_key_for_different_customers_and_blank_keys_are_fine(self):
        _sr(self.a, "k-2")
        _sr(self.b, "k-2")
        _sr(self.a, "")
        _sr(self.a, "")
        _sr(self.a, None)
        _sr(self.a, None)


class DedupeDataStepTests(TransactionTestCase):
    def test_the_data_step_keeps_the_first_booking_and_blanks_later_duplicates(self):
        migration = importlib.import_module("service_requests.migrations.0100_dedupe_idempotency_keys")
        a = User.objects.create_user(username="ida2", email="ida2@example.com", password="x", phone="9333333333")
        b = User.objects.create_user(username="idb2", email="idb2@example.com", password="x", phone="9444444444")
        constraint = [c for c in ServiceRequest._meta.constraints if c.name == "unique_customer_idempotency_key"][0]

        # Build duplicates the way a live database could hold them (constraint dropped by 0087).
        with connection.constraint_checks_disabled(), connection.schema_editor() as editor:
            editor.remove_constraint(ServiceRequest, constraint)
        try:
            first, second, third = _sr(a, "dup"), _sr(a, "dup"), _sr(a, "dup")
            other = _sr(b, "dup")
            migration._blank_duplicate_idempotency_keys(apps, None)
            self.assertEqual(ServiceRequest.objects.get(pk=first.pk).idempotency_key, "dup")
            self.assertEqual(ServiceRequest.objects.get(pk=second.pk).idempotency_key, "")
            self.assertEqual(ServiceRequest.objects.get(pk=third.pk).idempotency_key, "")
            self.assertEqual(ServiceRequest.objects.get(pk=other.pk).idempotency_key, "dup")
        finally:
            with connection.constraint_checks_disabled(), connection.schema_editor() as editor:
                editor.add_constraint(ServiceRequest, constraint)
