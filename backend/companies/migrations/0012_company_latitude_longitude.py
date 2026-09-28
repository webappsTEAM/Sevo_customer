# Generated for Phase S: Company store coordinates

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0011_alter_company_data_region_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='latitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='company',
            name='longitude',
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
    ]
