"""
service_requests/tests/test_package_service_column.py

Migration 0071 reconciles service_requests_package.service_id with the model
state that 0036 changed without touching the database.

The original defect could not be caught on SQLite -- SQLite rebuilds a table
from model state on almost any schema change, so the column silently comes
back there while PostgreSQL faithfully leaves it missing. These tests
therefore exercise the migration's DECISION LOGIC directly, which is
backend-independent, plus the model/database agreement that must hold on
whatever backend the suite is running.
"""
from django.db import connection
from django.test import TestCase

from service_requests.models import Package, Service, CatalogCategory


def _migration_module():
    import importlib
    return importlib.import_module(
        "service_requests.migrations.0071_restore_package_service_column"
    )


class PackageServiceColumnAgreementTests(TestCase):
    """Whatever the backend, the model and the table must agree."""

    def test_service_id_exists_in_the_database(self):
        with connection.cursor() as cursor:
            cols = {
                c.name
                for c in connection.introspection.get_table_description(
                    cursor, "service_requests_package"
                )
            }
        self.assertIn(
            "service_id", cols,
            "Package.service_id is in the model but not in the database -- "
            "migration 0071 did not run or was reverted",
        )

    def test_no_package_column_is_missing_from_the_database(self):
        with connection.cursor() as cursor:
            cols = {
                c.name
                for c in connection.introspection.get_table_description(
                    cursor, "service_requests_package"
                )
            }
        model_cols = {f.column for f in Package._meta.local_fields}
        self.assertEqual(
            sorted(model_cols - cols), [],
            "Package model columns missing from the database",
        )

    def test_a_package_can_actually_be_read_through_its_service(self):
        # The query that used to raise ProgrammingError on PostgreSQL.
        cat = CatalogCategory.objects.create(slug="gt-col", name="GT Col")
        svc = Service.objects.create(slug="gt-col-svc", name="Svc", category=cat)
        Package.objects.create(slug="gt-col-pkg", name="Pkg", service=svc, base_price="10.00")
        self.assertEqual(Package.objects.filter(service=svc).count(), 1)
        self.assertEqual(Package.objects.select_related("service").first().service, svc)


class RestoreColumnDecisionTests(TestCase):
    """
    The three branches of the migration function, driven directly.

    The dangerous one is the third: Package.service is NOT NULL, so a table
    that already has rows but lost the column cannot be reconciled without
    deciding which Service each package belongs to. The migration must refuse
    rather than invent a value or silently add a nullable column that
    disagrees with the state.
    """

    def setUp(self):
        self.mod = _migration_module()

    def test_is_a_noop_when_the_column_is_already_present(self):
        calls = []

        class Editor:
            connection = connection

            def add_field(self, *a, **k):
                calls.append(a)

        self.mod.restore_service_column(None, Editor())
        self.assertEqual(calls, [], "migration touched a database that was already correct")

    def test_refuses_when_the_column_is_missing_and_rows_exist(self):
        cat = CatalogCategory.objects.create(slug="gt-refuse", name="R")
        svc = Service.objects.create(slug="gt-refuse-svc", name="S", category=cat)
        Package.objects.create(slug="gt-refuse-pkg", name="P", service=svc, base_price="10.00")

        original = self.mod._columns
        self.mod._columns = lambda conn: set()          # pretend the column is gone
        try:
            class Editor:
                connection = connection

                def add_field(self, *a, **k):
                    raise AssertionError("must not add a NOT NULL column to a populated table")

            with self.assertRaises(RuntimeError) as ctx:
                self.mod.restore_service_column(None, Editor())
            self.assertIn("data decision", str(ctx.exception))
        finally:
            self.mod._columns = original

    def test_reverse_never_drops_the_column(self):
        class Editor:
            connection = connection

            def remove_field(self, *a, **k):
                raise AssertionError("reverse must not drop service_id")

        self.assertIsNone(self.mod.noop_reverse(None, Editor()))
