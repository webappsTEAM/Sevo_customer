"""
Restore the `service_requests_package.service_id` COLUMN.

Migration 0036 ("revert package service m2m") undid 0031 in migration STATE
only: its state_operations put the ForeignKey back, but its
database_operations did nothing except DROP the old m2m join table. So the
column 0031 had removed was never recreated, and every database built from
this migration chain ends up with a Package model that Django believes has
`service_id` and a table that does not.

It survived unnoticed because SQLite rebuilds a table from model state on
almost any schema change, so the test suite (which runs on SQLite) silently
gets the column back, while PostgreSQL faithfully does not. On a fresh
PostgreSQL, any query touching Package.service fails with
ProgrammingError: column service_requests_package.service_id does not exist,
which takes out the catalog pages and the Package -> ServiceTier sync.

This migration carries NO state_operations: the state is already correct (a
plain `makemigrations` sees no drift). It only reconciles the database to it,
and only when reconciliation is actually needed:

  * column already present  -> does nothing, so an existing production
                               database where the column survived 0031 is
                               untouched and cannot fail with
                               "column already exists";
  * column missing, table empty
                            -> adds it through the schema editor, which
                               creates the FK constraint and index correctly
                               on every backend;
  * column missing, table has rows
                            -> refuses, loudly. Package.service is NOT NULL
                               and there is no correct value to invent for an
                               existing row; which Service each package
                               belongs to is a data decision for an operator,
                               not something a migration may guess.

Nothing is dropped and no data is deleted or rewritten in any branch.
"""
from django.db import migrations

TABLE = "service_requests_package"
COLUMN = "service_id"


def _columns(connection):
    with connection.cursor() as cursor:
        return {c.name for c in connection.introspection.get_table_description(cursor, TABLE)}


def restore_service_column(apps, schema_editor):
    connection = schema_editor.connection

    if TABLE not in connection.introspection.table_names():
        return  # nothing to reconcile yet

    if COLUMN in _columns(connection):
        return  # already correct -- the common case on an existing database

    with connection.cursor() as cursor:
        cursor.execute("SELECT EXISTS (SELECT 1 FROM %s)" % TABLE)
        has_rows = bool(cursor.fetchone()[0])

    if has_rows:
        raise RuntimeError(
            "service_requests_package.%s is missing and the table already has "
            "rows. Package.service is NOT NULL, so this migration cannot add "
            "the column without deciding which Service every existing package "
            "belongs to -- a data decision, not a schema one. Populate the "
            "mapping first (or add the column manually as NULL, backfill it, "
            "then set NOT NULL) and re-run. No data has been changed."
            % COLUMN
        )

    Package = apps.get_model("service_requests", "Package")
    schema_editor.add_field(Package, Package._meta.get_field("service"))


def noop_reverse(apps, schema_editor):
    """
    Deliberately does nothing.

    Reversing would mean dropping a column that other databases legitimately
    have had since before 0031, which would destroy the link between every
    package and its service.
    """
    return


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0070_catalogchangelog_service_tier_entity"),
    ]

    operations = [
        migrations.RunPython(restore_service_column, noop_reverse),
    ]
