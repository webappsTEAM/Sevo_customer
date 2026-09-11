# Hand-written additive migration for logistics app.
# Follows repo baseline: avoids autodetector stop on unrelated Addon.package drift.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0007_goodscategory_goodsitem"),
    ]

    operations = [
        migrations.AddField(
            model_name="goodscategory",
            name="is_prohibited",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="goodsitem",
            name="is_prohibited",
            field=models.BooleanField(default=False),
        ),
    ]
