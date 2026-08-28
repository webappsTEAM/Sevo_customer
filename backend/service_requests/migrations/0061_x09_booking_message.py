# X-09: in-app chat between customer and technician for a booking.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0060_gt_b03_logistics_leg"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BookingMessage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("sender_persona", models.CharField(choices=[("customer", "Customer"), ("technician", "Technician"), ("admin", "Admin")], max_length=15)),
                ("sender_name", models.CharField(blank=True, default="", max_length=200)),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("read_at_customer", models.DateTimeField(blank=True, null=True)),
                ("read_at_technician", models.DateTimeField(blank=True, null=True)),
                ("booking", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to="service_requests.servicerequest")),
                ("sender_user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sent_booking_messages", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "service_requests_booking_message",
                "ordering": ["created_at"],
            },
        ),
    ]
