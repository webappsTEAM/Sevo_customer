# Hand-written migration (this session had no way to run `manage.py
# makemigrations` against a matching Django 6.0.8 / Python 3.11 environment
# -- see HS_E_01_TECHNICIAN_ATTRIBUTION_NOTE.md and
# GT_D_03_RECIPIENT_NOTIFICATION_NOTE.md for why). All four fields are
# simple CharFields with blank=True/default="" -- non-nullable-without-
# default additions to existing tables, which Postgres and SQLite both
# handle as a same-transaction schema change with no backfill required.
#
# Before applying to the real database: run
#   python manage.py makemigrations --check --dry-run
# to confirm this matches what Django itself would generate from the
# current models.py, and review the operations below against the actual
# current migration state.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0052_remove_servicerequest_parent_request_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='servicerequest',
            name='drop_contact_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='drop_contact_phone',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='servicerequest',
            name='drop_contact_email',
            field=models.EmailField(blank=True, default='', max_length=254),
        ),
        migrations.AddField(
            model_name='servicefeedback',
            name='technician_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='servicefeedback',
            name='technician_name_snapshot',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
    ]
