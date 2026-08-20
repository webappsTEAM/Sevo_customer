from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0035_merge_20260817_1018'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name='package',
                    name='service',
                ),
                migrations.AddField(
                    model_name='package',
                    name='service',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='packages',
                        to='service_requests.service',
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    DROP TABLE IF EXISTS service_requests_package_service;
                    """,
                    reverse_sql=""
                ),
            ],
        ),
    ]
