from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0007_inventoryitem_default_daily_quantity_grams_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='inventoryitem',
            name='image',
            field=models.CharField(blank=True, default='', max_length=500),
        ),
    ]
