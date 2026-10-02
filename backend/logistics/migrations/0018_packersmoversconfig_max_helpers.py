import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0017_goodscategory_info_banner_goodsitem_subcategory"),
    ]

    operations = [
        migrations.AddField(
            model_name="packersmoversconfig",
            name="max_helpers",
            field=models.PositiveSmallIntegerField(
                default=2,
                help_text="Maximum number of extra helpers a customer may request on a P&M booking (0-20). Crew-size/operations setting only -- no price is attached.",
                validators=[django.core.validators.MaxValueValidator(20)],
            ),
        ),
    ]
