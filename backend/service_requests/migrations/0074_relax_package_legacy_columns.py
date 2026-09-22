"""
Relax any physical `service_requests_package` column that Django's Package
model does not declare but that is still NOT NULL with no default on the
live database.

This is the same class of problem 0059_unconstrain_legacy_columns,
0071_restore_package_service_column and
0072_provision_assigned_employee_column each already fix for their own
tables: production's physical schema (Supabase-side) predates parts of this
app's Django-owned migration lineage, so it carries columns this app's
models no longer declare (or never declared). Every INSERT this app issues
naturally omits such a column, since Django has no field for it -- so a
plain `Package.objects.create(...)` fails with

    IntegrityError: null value in column "<column>" of relation
    "service_requests_package" violates not-null constraint

for a row that is otherwise completely valid by every rule this app actually
enforces. This surfaced via the new `_create_or_raise` error handling
(catalog.py) as a 400 "Could not create package ...: null value in column
..." instead of the unhandled 500 it used to be -- the error handling did
its job; this migration fixes the actual drift it revealed.

Unlike 0059 (which lists exact legacy column names up front), this migration
does not hardcode which column is missing: it discovers, at run time, every
NOT NULL / no-default column physically present on the table that the
current Package model does not map to a field, and relaxes exactly those.
That keeps this safe to re-run (a column already matched to a model field,
or already nullable, or already defaulted, is left untouched) and catches
this whole class of drift on this table in one place, rather than needing a
new one-column migration each time another one is discovered.

Nothing is dropped, renamed, or rewritten, and no row is read or modified --
only `ALTER COLUMN ... DROP NOT NULL` on columns this app cannot and does
not populate.
"""
from django.db import migrations

TABLE = "service_requests_package"


def relax_unmodeled_not_null_columns(apps, schema_editor):
    connection = schema_editor.connection
    if connection.vendor != "postgresql":
        return  # DROP NOT NULL via information_schema is a Postgres-specific repair

    if TABLE not in connection.introspection.table_names():
        return  # nothing to reconcile yet

    Package = apps.get_model("service_requests", "Package")
    known_columns = {
        f.column for f in Package._meta.get_fields() if hasattr(f, "column") and f.column
    }

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
              AND is_nullable = 'NO' AND column_default IS NULL;
            """,
            [TABLE],
        )
        not_null_no_default = [row[0] for row in cursor.fetchall()]

        for col in not_null_no_default:
            if col in known_columns:
                continue  # a real, modeled field -- Django supplies it on every write
            cursor.execute(f'ALTER TABLE "{TABLE}" ALTER COLUMN "{col}" DROP NOT NULL;')


def noop_reverse(apps, schema_editor):
    """
    Deliberately does nothing.

    Reversing would mean re-imposing a NOT NULL constraint on a column this
    app never populates, which would simply reintroduce the same
    IntegrityError on every future package create.
    """
    return


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0073_merge_20260908_1402"),
    ]

    operations = [
        migrations.RunPython(relax_unmodeled_not_null_columns, noop_reverse),
    ]
