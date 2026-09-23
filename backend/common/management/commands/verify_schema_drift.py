"""
python manage.py verify_schema_drift

Compares the live database schema against Django's current models AND
migration history, and reports where they disagree. See
common/schema_drift.py for the detection logic and docstring — this file
is just the CLI presentation layer.
"""
import sys

from django.core.management.base import BaseCommand

from common.schema_drift import run_all_checks


def _section(title):
    line = "=" * 70
    return f"\n{line}\n{title}\n{line}"


class Command(BaseCommand):
    help = "Verify the live database schema matches Django models and migration history."

    def add_arguments(self, parser):
        parser.add_argument(
            "--schema", default="public",
            help="Schema to verify against (default: public).",
        )
        parser.add_argument(
            "--strict", action="store_true",
            help="Treat warnings (extra columns, type/nullability mismatches, "
                 "missing FK/unique/index) as failures too.",
        )
        parser.add_argument(
            "--quiet", action="store_true",
            help="Only print the summary, not every finding.",
        )

    def handle(self, *args, **options):
        schema = options["schema"]
        strict = options["strict"]
        quiet = options["quiet"]

        report = run_all_checks(schema=schema)

        self.stdout.write(_section("Schema Drift Report"))
        self.stdout.write(f"Schema checked: {schema}")
        self.stdout.write(f"Tables checked: {report.tables_checked}")
        self.stdout.write(f"Columns checked: {report.columns_checked}")

        if not quiet:
            self._print_list("Missing Tables", report.missing_tables)
            self._print_list("Extra Tables", report.extra_tables)
            self._print_list("Missing Columns", report.missing_columns)
            self._print_list("Extra Columns", report.extra_columns)
            self._print_list("Type Mismatches", report.type_mismatches)
            self._print_list("Nullability Mismatches", report.nullability_mismatches)
            self._print_list("Primary Key Issues", report.pk_issues)
            self._print_list("Foreign Key Issues", report.fk_issues)
            self._print_list("Unique Constraint Issues", report.unique_issues)
            self._print_list("Index Issues", report.index_issues)

            self.stdout.write(_section("Migration Drift"))
            self._print_list("Ghost Migrations (applied but DDL missing)", report.ghost_migrations)
            self._print_list("Duplicate Migration Records", report.duplicate_migrations)
            self._print_list("Migration History Errors", report.history_errors)
            self._print_list("Pending Migrations (on disk, not yet applied)", report.pending_migrations)

            self.stdout.write(_section("Runtime Schema"))
            self._print_list("Findings", report.runtime_findings)
            if not report.runtime_findings:
                self.stdout.write("  Application resolves to the expected single schema. "
                                   "No tenant-switching code detected.")

        self.stdout.write(_section("Summary"))
        self.stdout.write(f"Critical findings: {report.critical_count}")
        self.stdout.write(f"Warnings: {report.warning_count}")

        failed = report.critical_count > 0 or (strict and report.warning_count > 0)
        status = self.style.ERROR("FAIL") if failed else self.style.SUCCESS("PASS")
        self.stdout.write(f"\nOVERALL: {status}\n")

        if failed:
            sys.exit(1)

    def _print_list(self, title, items):
        self.stdout.write(f"\n{title} ({len(items)})")
        if not items:
            self.stdout.write("  none")
            return
        for item in items:
            self.stdout.write(f"  - {item}")
