from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationPreference",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email_security_alerts", models.BooleanField(default=True)),
                ("email_login_alerts", models.BooleanField(default=True)),
                ("email_leave_updates", models.BooleanField(default=True)),
                ("email_payroll_ready", models.BooleanField(default=True)),
                ("email_task_assigned", models.BooleanField(default=True)),
                ("email_weekly_digest", models.BooleanField(default=False)),
                ("email_product_updates", models.BooleanField(default=False)),
                ("email_shift_reminders", models.BooleanField(default=True)),
                ("inapp_security_alerts", models.BooleanField(default=True)),
                ("inapp_leave_updates", models.BooleanField(default=True)),
                ("inapp_task_assigned", models.BooleanField(default=True)),
                ("inapp_clock_reminders", models.BooleanField(default=True)),
                ("inapp_announcements", models.BooleanField(default=True)),
                ("inapp_payroll_ready", models.BooleanField(default=True)),
                ("sms_security_alerts", models.BooleanField(default=False)),
                ("sms_clock_reminders", models.BooleanField(default=False)),
                ("sms_leave_updates", models.BooleanField(default=False)),
                ("sms_shift_reminders", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="notification_prefs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"verbose_name": "Notification Preference"},
        ),
        migrations.CreateModel(
            name="LoginSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("session_key", models.CharField(max_length=64, unique=True)),
                ("device_type", models.CharField(choices=[("browser", "Browser"), ("mobile", "Mobile"), ("api", "API")], default="browser", max_length=20)),
                ("device_name", models.CharField(blank=True, max_length=200)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("last_active", models.DateTimeField(default=django.utils.timezone.now)),
                ("is_current", models.BooleanField(default=False)),
                ("revoked", models.BooleanField(default=False)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="login_sessions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-last_active"]},
        ),
        migrations.CreateModel(
            name="LoginHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.TextField(blank=True)),
                ("location", models.CharField(blank=True, max_length=200)),
                ("status", models.CharField(choices=[("success", "Success"), ("failed", "Failed"), ("mfa_required", "MFA Required")], default="success", max_length=20)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="login_history", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="APIKey",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("key_prefix", models.CharField(max_length=10)),
                ("key_hash", models.CharField(max_length=128)),
                ("scopes", models.JSONField(default=list)),
                ("last_used_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("revoked", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="api_keys", to="companies.company")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_api_keys", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="Webhook",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("url", models.URLField(max_length=500)),
                ("secret", models.CharField(max_length=64)),
                ("events", models.JSONField(default=list)),
                ("status", models.CharField(choices=[("active", "Active"), ("paused", "Paused"), ("failing", "Failing")], default="active", max_length=20)),
                ("last_triggered_at", models.DateTimeField(blank=True, null=True)),
                ("failure_count", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="webhooks", to="companies.company")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_webhooks", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="TeamInvite",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField()),
                ("role", models.CharField(choices=[("admin", "Admin"), ("manager", "Manager"), ("employee", "Employee")], default="employee", max_length=20)),
                ("token", models.CharField(max_length=64, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("expired", "Expired"), ("revoked", "Revoked")], default="pending", max_length=20)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("accepted_at", models.DateTimeField(blank=True, null=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="team_invites", to="companies.company")),
                ("invited_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sent_invites", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
    ]
