from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("service_requests", "0074_relax_package_legacy_columns"),
    ]

    operations = [
        migrations.AddField(
            model_name="package",
            name="sub_service_key",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
    ]
