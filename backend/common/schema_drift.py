"""
Schema drift detection — compares what Django's models/migrations *believe*
about the database against what is actually there.

Born from the django-tenants -> single-schema migration, where several
migrations were recorded as "applied" in django_migrations without their
DDL ever having run against the `public` schema. Django trusts migration
history by default and never re-verifies it against the live database,
so this kind of drift is otherwise invisible until something crashes in
production.

This module is intentionally DB-introspection-first: every "missing X"
finding is derived from comparing live `information_schema`/constraint
data against the current model definitions, not from trusting
django_migrations. Migration history is checked separately and attributed
back to specific migration files on a best-effort basis.
"""
from __future__ import annotations

import ast
import os
from dataclasses import dataclass, field as dc_field
from typing import Optional

from django.apps import apps
from django.conf import settings
from django.db import connection
from django.db.migrations.loader import MigrationLoader
from django.db.migrations.recorder import MigrationRecorder
from django.db.migrations.exceptions import InconsistentMigrationHistory

# Directories we never want to scan for stray tenant-switching code —
# generated/vendored/test code isn't part of the running request path.
_RUNTIME_SCAN_EXCLUDE_DIRS = {"migrations", "tests", "__pycache__", ".venv", "venv"}
_TENANT_CODE_PATTERNS = (
    "django_tenants",
    "schema_context",
    "connection.set_tenant",
    "set_schema_to_public",
    "TenantMainMiddleware",
)


@dataclass
class Finding:
    severity: str  # "critical" | "warning"
    category: str
    message: str


@dataclass
class DriftReport:
    tables_checked: int = 0
    columns_checked: int = 0
    missing_tables: list = dc_field(default_factory=list)
    extra_tables: list = dc_field(default_factory=list)
    missing_columns: list = dc_field(default_factory=list)
    extra_columns: list = dc_field(default_factory=list)
    type_mismatches: list = dc_field(default_factory=list)
    nullability_mismatches: list = dc_field(default_factory=list)
    pk_issues: list = dc_field(default_factory=list)
    fk_issues: list = dc_field(default_factory=list)
    unique_issues: list = dc_field(default_factory=list)
    index_issues: list = dc_field(default_factory=list)
    ghost_migrations: list = dc_field(default_factory=list)
    pending_migrations: list = dc_field(default_factory=list)
    duplicate_migrations: list = dc_field(default_factory=list)
    history_errors: list = dc_field(default_factory=list)
    runtime_findings: list = dc_field(default_factory=list)

    def all_findings(self) -> list[Finding]:
        out = []
        out += [Finding("critical", "Missing Table", m) for m in self.missing_tables]
        out += [Finding("warning", "Extra Table", m) for m in self.extra_tables]
        out += [Finding("critical", "Missing Column", m) for m in self.missing_columns]
        out += [Finding("warning", "Extra Column", m) for m in self.extra_columns]
        out += [Finding("warning", "Type Mismatch", m) for m in self.type_mismatches]
        out += [Finding("warning", "Nullability Mismatch", m) for m in self.nullability_mismatches]
        out += [Finding("critical", "Primary Key Issue", m) for m in self.pk_issues]
        out += [Finding("warning", "Foreign Key Issue", m) for m in self.fk_issues]
        out += [Finding("warning", "Unique Constraint Issue", m) for m in self.unique_issues]
        out += [Finding("warning", "Index Issue", m) for m in self.index_issues]
        out += [Finding("critical", "Ghost Migration", m) for m in self.ghost_migrations]
        out += [Finding("warning", "Pending Migration", m) for m in self.pending_migrations]
        out += [Finding("critical", "Duplicate Migration Record", m) for m in self.duplicate_migrations]
        out += [Finding("critical", "Migration History", m) for m in self.history_errors]
        out += [Finding("critical", "Runtime Schema", m) for m in self.runtime_findings]
        return out

    @property
    def critical_count(self) -> int:
        return sum(1 for f in self.all_findings() if f.severity == "critical")

    @property
    def warning_count(self) -> int:
        return sum(1 for f in self.all_findings() if f.severity == "warning")

    @property
    def passed(self) -> bool:
        return self.critical_count == 0


# ── Structural (live schema vs. models.py) ──────────────────────────────

def _managed_models():
    return [m for m in apps.get_models() if m._meta.managed]


def check_structure(report: DriftReport, schema: str = "public") -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = %s",
            [schema],
        )
        existing_tables = {r[0] for r in cursor.fetchall()}

        cursor.execute(
            "SELECT table_name, column_name, data_type, udt_name, is_nullable "
            "FROM information_schema.columns WHERE table_schema = %s",
            [schema],
        )
        existing_columns: dict[str, dict[str, tuple]] = {}
        for table, col, data_type, udt_name, is_nullable in cursor.fetchall():
            existing_columns.setdefault(table, {})[col] = (data_type, udt_name, is_nullable == "YES")

        model_tables = set()
        for model in _managed_models():
            table = model._meta.db_table
            model_tables.add(table)
            report.tables_checked += 1

            for m2m in model._meta.many_to_many:
                through = m2m.remote_field.through
                if through is not None:
                    model_tables.add(through._meta.db_table)

            if table not in existing_tables:
                report.missing_tables.append(
                    f"{model._meta.app_label}.{model.__name__} -> table '{table}' does not exist in {schema}"
                )
                continue

            model_columns = {}
            for f in model._meta.get_fields():
                if not hasattr(f, "column") or f.many_to_many:
                    continue
                model_columns[f.column] = f
                report.columns_checked += 1

            db_cols = existing_columns.get(table, {})

            for col_name, f in model_columns.items():
                if col_name not in db_cols:
                    report.missing_columns.append(
                        f"{model._meta.app_label}.{model.__name__}.{f.name} -> {table}.{col_name} does not exist"
                    )
                    continue

                data_type, udt_name, db_nullable = db_cols[col_name]
                model_nullable = getattr(f, "null", False)
                if getattr(f, "primary_key", False):
                    model_nullable = False
                if bool(model_nullable) != bool(db_nullable):
                    report.nullability_mismatches.append(
                        f"{model._meta.app_label}.{model.__name__}.{f.name} ({table}.{col_name}): "
                        f"model null={model_nullable}, db nullable={db_nullable}"
                    )

            extra = set(db_cols) - set(model_columns)
            for col_name in sorted(extra):
                report.extra_columns.append(f"{table}.{col_name} exists in DB but no model field maps to it")

        extra_tables = existing_tables - model_tables - {"django_migrations", "django_content_type",
                                                           "django_session", "django_admin_log",
                                                           "auth_group", "auth_group_permissions",
                                                           "auth_permission"}
        for t in sorted(extra_tables):
            if t.startswith("django_celery_beat_"):
                continue
            report.extra_tables.append(f"table '{t}' exists in {schema} but no managed model maps to it")


def check_constraints(report: DriftReport, schema: str = "public") -> None:
    with connection.cursor() as cursor:
        for model in _managed_models():
            table = model._meta.db_table
            try:
                constraints = connection.introspection.get_constraints(cursor, table)
            except Exception:
                continue  # table missing — already reported by check_structure

            has_pk = any(c["primary_key"] for c in constraints.values())
            if not has_pk:
                report.pk_issues.append(f"{table}: no primary key constraint found in database")

            fk_targets = {
                tuple(c["foreign_key"]) for c in constraints.values() if c.get("foreign_key")
            }
            for f in model._meta.get_fields():
                if not (getattr(f, "many_to_one", False) or getattr(f, "one_to_one", False)):
                    continue
                if not hasattr(f, "column") or f.column is None:
                    continue
                related_table = f.related_model._meta.db_table
                col = f.column
                matched = any(
                    c.get("columns") == [col] and c.get("foreign_key")
                    for c in constraints.values()
                )
                if not matched:
                    report.fk_issues.append(
                        f"{model._meta.app_label}.{model.__name__}.{f.name} ({table}.{col}) "
                        f"-> {related_table}: no FK constraint found in database"
                    )

            for f in model._meta.get_fields():
                if not (getattr(f, "unique", False) and hasattr(f, "column")):
                    continue
                if getattr(f, "primary_key", False):
                    continue
                col = f.column
                matched = any(
                    c.get("unique") and c.get("columns") == [col]
                    for c in constraints.values()
                )
                if not matched:
                    report.unique_issues.append(
                        f"{model._meta.app_label}.{model.__name__}.{f.name} ({table}.{col}): "
                        f"unique=True on model but no unique constraint/index found in database"
                    )

            expected_index_field_sets = []
            for idx in getattr(model._meta, "indexes", []):
                cols = tuple(idx.fields)
                cols = tuple(c.lstrip("-") for c in cols)
                expected_index_field_sets.append((idx.name, cols))

            existing_index_cols = [tuple(c["columns"]) for c in constraints.values() if c.get("index")]
            for idx_name, cols in expected_index_field_sets:
                model_cols = []
                for cname in cols:
                    try:
                        model_cols.append(model._meta.get_field(cname).column)
                    except Exception:
                        model_cols.append(cname)
                if tuple(model_cols) not in existing_index_cols:
                    report.index_issues.append(
                        f"{model._meta.app_label}.{model.__name__}: expected index '{idx_name}' "
                        f"on {model_cols} not found in database"
                    )


# ── Migration integrity ──────────────────────────────────────────────────

def check_migrations(report: DriftReport) -> None:
    recorder = MigrationRecorder(connection)
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT app, name, COUNT(*) FROM django_migrations GROUP BY app, name HAVING COUNT(*) > 1"
        )
        for app, name, count in cursor.fetchall():
            report.duplicate_migrations.append(f"{app}.{name} is recorded as applied {count} times")

    loader = MigrationLoader(connection, ignore_no_migrations=True)
    try:
        loader.check_consistent_history(connection)
    except InconsistentMigrationHistory as exc:
        report.history_errors.append(str(exc))

    applied = recorder.applied_migrations()  # {(app, name): Migration record}

    # Best-effort ghost-migration attribution: for every missing table/column
    # already found by check_structure, find the migration file that
    # introduces it and check whether Django believes that migration is
    # applied. If it is, but the table/column is missing -> ghost migration.
    missing_tables_by_table = {}
    for msg in report.missing_tables:
        table = msg.split("table '")[1].split("'")[0]
        missing_tables_by_table[table] = msg

    missing_cols_by_table_col = {}
    for msg in report.missing_columns:
        # "<app>.<Model>.<field> -> <table>.<col> does not exist"
        try:
            right = msg.split(" -> ")[1]
            table_col = right.split(" does not exist")[0]
            table, col = table_col.rsplit(".", 1)
            missing_cols_by_table_col[(table, col)] = msg
        except Exception:
            continue

    if not missing_tables_by_table and not missing_cols_by_table_col:
        return

    for (app_label, migration_name), migration in loader.disk_migrations.items():
        if (app_label, migration_name) not in applied:
            continue  # not applied at all — not a ghost, just pending (handled elsewhere)

        try:
            model = None
            app_config = apps.get_app_config(app_label)
        except Exception:
            continue

        for op in migration.operations:
            op_name = type(op).__name__
            model_name = getattr(op, "model_name", None) or getattr(op, "name", None)
            if not model_name:
                continue
            try:
                model = apps.get_model(app_label, model_name)
            except Exception:
                model = None

            if op_name == "CreateModel" and model is not None:
                table = model._meta.db_table
                if table in missing_tables_by_table:
                    report.ghost_migrations.append(
                        f"{app_label}.{migration_name} creates model '{model_name}' "
                        f"(table '{table}') but the table does not exist in the database"
                    )
            elif op_name == "AddField" and model is not None:
                field_name = getattr(op, "name", None)
                try:
                    col = model._meta.get_field(field_name).column
                except Exception:
                    continue
                table = model._meta.db_table
                if (table, col) in missing_cols_by_table_col:
                    report.ghost_migrations.append(
                        f"{app_label}.{migration_name} adds field '{field_name}' "
                        f"({table}.{col}) but the column does not exist in the database"
                    )

    # Migrations that exist on disk but are not applied at all — routine
    # "you forgot to run migrate" case, not a ghost. Worth surfacing as a
    # lower-severity heads-up.
    for (app_label, migration_name) in loader.disk_migrations:
        if (app_label, migration_name) not in applied:
            report.pending_migrations.append(f"{app_label}.{migration_name} exists on disk but is not applied")


# ── Runtime verification ─────────────────────────────────────────────────

def check_runtime(report: DriftReport, expected_schema: str = "public") -> None:
    if "django_tenants" in settings.INSTALLED_APPS:
        report.runtime_findings.append("'django_tenants' is still present in INSTALLED_APPS")

    for mw in settings.MIDDLEWARE:
        if "django_tenants" in mw:
            report.runtime_findings.append(f"Tenant middleware still registered: {mw}")

    with connection.cursor() as cursor:
        cursor.execute("SHOW search_path")
        search_path = cursor.fetchone()[0]
        first_schema = search_path.split(",")[0].strip()
        if first_schema != expected_schema:
            report.runtime_findings.append(
                f"Connection search_path resolves to '{first_schema}' first, expected '{expected_schema}' "
                f"(full search_path: {search_path!r})"
            )

    _scan_source_for_tenant_code(report)


def _scan_source_for_tenant_code(report: DriftReport) -> None:
    # 'common' is excluded deliberately — this module IS the detector, so its
    # own source legitimately contains the pattern strings it's looking for.
    local_apps = [
        cfg for cfg in apps.get_app_configs()
        if str(cfg.path).startswith(str(settings.BASE_DIR))
        and ".venv" not in str(cfg.path)
        and cfg.label != "common"
    ]
    for cfg in local_apps:
        for root, dirs, files in os.walk(cfg.path):
            dirs[:] = [d for d in dirs if d not in _RUNTIME_SCAN_EXCLUDE_DIRS]
            for fname in files:
                if not fname.endswith(".py"):
                    continue
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as fh:
                        content = fh.read()
                except Exception:
                    continue
                for pattern in _TENANT_CODE_PATTERNS:
                    if pattern in content:
                        rel = os.path.relpath(fpath, settings.BASE_DIR)
                        report.runtime_findings.append(f"'{pattern}' found in {rel}")


def run_all_checks(schema: str = "public") -> DriftReport:
    report = DriftReport()
    check_structure(report, schema=schema)
    check_constraints(report, schema=schema)
    check_migrations(report)
    check_runtime(report, expected_schema=schema)
    return report
