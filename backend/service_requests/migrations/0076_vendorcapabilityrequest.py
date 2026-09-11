import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0075_package_sub_service_key"),
    ]

    operations = [
        migrations.CreateModel(
            name="VendorCapabilityRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("vendor_id", models.CharField(db_index=True, max_length=100)),
                ("vendor_name", models.CharField(blank=True, default="", max_length=200)),
                ("status", models.CharField(choices=[("PENDING", "Pending Review"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")], db_index=True, default="PENDING", max_length=10)),
                ("note", models.TextField(blank=True, default="")),
                ("decision_note", models.TextField(blank=True, default="")),
                ("decided_by", models.CharField(blank=True, default="", max_length=200)),
                ("decided_at", models.DateTimeField(blank=True, null=True)),
                ("requested_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("service", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="vendor_capability_requests", to="service_requests.service")),
            ],
            options={
                "verbose_name": "Vendor Service Capability Request",
                "ordering": ["-requested_at"],
            },
        ),
        migrations.AddIndex(
            model_name="vendorcapabilityrequest",
            index=models.Index(fields=["vendor_id", "status"], name="vcr_vendor_status_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="vendorcapabilityrequest",
            unique_together={("vendor_id", "service")},
        ),
    ]
