"""
Provision the physical `service_requests_servicerequest.assigned_employee_id`
COLUMN on databases that do not have it.

This app removed its own `assigned_employee` field in
0038_remove_workforce_models_and_fields, when the whole workforce concern moved
to the vendor app. That RemoveField is a real one (no SeparateDatabaseAndState),
so every database built from this migration chain ends up WITHOUT the column.

Production still has it: production's physical schema predates the Django-owned
lineage and is Supabase-side, which is also why
0059_unconstrain_legacy_columns had to list `assigned_employee_id` among the
"legacy columns" it relaxes -- a column this app no longer models but that is
still physically there.

The vendor app needs that column. Its ServiceRequest mirror declares

    assigned_employee = ForeignKey("employees.Employee", SET_NULL, null=True)

on a managed=False model, so Django emits no DDL for it in either app and
nothing creates the column on a fresh database. The vendor ORM then fails with
ProgrammingError: column service_requests_servicerequest.assigned_employee_id
does not exist, on both reads and writes -- which takes out dispatch,
acceptance, no-show handling and job completion.

This app owns the physical table (ServiceRequest is managed), so this app
provisions the column. The migration deliberately does NOT live in the vendor
project: both apps declare an app labelled `service_requests` and share one
django_migrations table, so a vendor migration under that label would collide
with this app's history by (app, name). The sibling
workforce_api.0023_own_workforce_mirror_tables documents that same constraint
and excludes this table for exactly this reason.

Like 0071_restore_package_service_column, this migration carries NO state
operations. The Customer model intentionally does not declare the field and
must not start to: a plain `makemigrations` sees no drift before or after this
runs. It only reconciles the database, and only when reconciliation is needed:

  * table not present yet   -> returns; there is nothing to reconcile;
  * column already present  -> returns, so production and every existing
                               database are untouched and cannot fail with
                               "column already exists";
  * column missing          -> adds it as `bigint NULL`, nothing more.

What it deliberately does NOT add, because production has none of them and a
fresh database must be a replica of production rather than a stricter
environment:

  * no FOREIGN KEY to employees_employee. That table is created by the vendor
    project's employees.0002_own_employee_tables, which runs AFTER this app,
    so the constraint could not be satisfied here even if it were wanted.
    Production carries 0 FK constraints on this column.
  * no index. Production's three indexes on this column were created manually
    through the Supabase SQL Editor, as workforce_api.0014_performance_indexes
    documents. Adding one here would give neither parity (production has
    three) nor safety (it would duplicate the plain btree).
  * no default and no NOT NULL. The column is nullable in production and
    46 of 79 rows hold NULL.

Nothing is dropped, renamed, truncated or rewritten in any branch, and no row
is read or modified. Reverse is a deliberate no-op.
"""
from django.db import migrations, models

TABLE = "service_requests_servicerequest"
COLUMN = "assigned_employee_id"


def _columns(connection):
    with connection.cursor() as cursor:
        return {c.name for c in connection.introspection.get_table_description(cursor, TABLE)}


def provision_assigned_employee_column(apps, schema_editor):
    connection = schema_editor.connection

    if TABLE not in connection.introspection.table_names():
        return  # nothing to reconcile yet -- and this migration never creates the table

    if COLUMN in _columns(connection):
        return  # already correct -- the common case on any existing database

    # Built here rather than taken from a model on purpose: the Customer app
    # does not declare this field and must not, so there is no model field to
    # borrow. BigIntegerField(null=True) is what produces exactly
    #   ALTER TABLE "service_requests_servicerequest"
    #       ADD COLUMN "assigned_employee_id" bigint NULL;
    # and, with db_index defaulting to False, no index alongside it. Going
    # through the schema editor rather than raw SQL keeps the operation correct
    # on SQLite too, which is what the test suite runs on.
    ServiceRequest = apps.get_model("service_requests", "ServiceRequest")
    field = models.BigIntegerField(null=True, blank=True)
    field.set_attributes_from_name(COLUMN)
    schema_editor.add_field(ServiceRequest, field)


def noop_reverse(apps, schema_editor):
    """
    Deliberately does nothing.

    Reversing would mean dropping a column that production has carried since
    before 0038 and that currently holds 33 live technician assignments. The
    vendor app reads and writes it continuously.
    """
    return


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0071_restore_package_service_column"),
    ]

    operations = [
        migrations.RunPython(provision_assigned_employee_column, noop_reverse),
    ]
