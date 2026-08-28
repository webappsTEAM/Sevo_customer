# Hand-written migration -- see 0056_gt_c03_insurance.py for why. Verified
# by loading via importlib against a locally-installed Django to confirm
# the Migration class parses and matches the model definition -- not
# verified against the live database. Run
# `python manage.py makemigrations --check --dry-run` before applying.
#
# HS-D-04: adds NotificationOutbox -- see the model docstring in
# service_requests/models.py for the full rationale.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0056_gt_c03_insurance'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationOutbox',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recipient', models.EmailField(db_index=True, max_length=254)),
                ('subject', models.CharField(max_length=255)),
                ('body_text', models.TextField(blank=True, default='')),
                ('body_html', models.TextField(blank=True, default='')),
                ('from_email', models.CharField(blank=True, default='', max_length=255)),
                ('status', models.CharField(choices=[('SENT', 'Sent'), ('FAILED', 'Failed')], db_index=True, max_length=10)),
                ('error', models.TextField(blank=True, default='')),
                ('attempt_count', models.PositiveSmallIntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_attempt_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'service_requests_notification_outbox',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notificationoutbox',
            index=models.Index(fields=['status', 'created_at'], name='notif_outbox_status_crt_idx'),
        ),
    ]
