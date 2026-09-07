# Hand-written migration -- see the migration-authoring note in
# service_requests/migrations/0053_hs_e01_gt_d03_snapshot_fields.py for why
# (no way to run `manage.py makemigrations` against a matching environment in
# this sandbox). Verified by loading via importlib against a locally-
# installed Django to confirm the Migration class parses and the fields
# match the model definition -- not verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# HS-D-05: adds CustomerNotificationPreference, giving customers the same
# per-channel/per-type notification opt-out the vendor app already gives
# employees (WorkforceNotificationPreference).

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0022_alter_user_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomerNotificationPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('booking_confirmations', models.BooleanField(default=True)),
                ('reschedule_updates', models.BooleanField(default=True)),
                ('technician_updates', models.BooleanField(default=True)),
                ('completion_feedback', models.BooleanField(default=True)),
                ('payment_receipts', models.BooleanField(default=True)),
                ('refund_updates', models.BooleanField(default=True)),
                ('complaint_updates', models.BooleanField(default=True)),
                ('promotional_offers', models.BooleanField(default=False)),
                ('channel_email', models.BooleanField(default=True)),
                ('channel_sms', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='notification_preference', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'accounts_customer_notification_preference',
            },
        ),
    ]
