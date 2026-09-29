import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0019_servicetier_gst_rate"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetier",
            name="max_additional_stops",
            field=models.PositiveSmallIntegerField(
                default=3,
                validators=[django.core.validators.MaxValueValidator(10)],
                help_text=(
                    "Most intermediate stops (beyond one pickup and one drop) a booking "
                    "on this tier may add. Enforced by the server on quote and booking."
                ),
            ),
        ),
    ]
