from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds ServiceTier.image, mirrored from service_requests.Package.image by
    the sync bridge in service_requests/services/catalog.py, so the
    customer-facing Mini Truck / 2-Wheeler booking pages can show the admin's
    actual uploaded "Package Image" instead of only the built-in technical
    line-drawing per vehicle class.
    """

    dependencies = [
        ("logistics", "0006_servicetier_pricing_validators"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetier",
            name="image",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
    ]
