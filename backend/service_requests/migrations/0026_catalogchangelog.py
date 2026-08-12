from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('service_requests', '0025_addon'),
    ]

    operations = [
        migrations.CreateModel(
            name='CatalogChangeLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('entity_type', models.CharField(choices=[('CATEGORY', 'Category'), ('SERVICE', 'Service'), ('PACKAGE', 'Package'), ('ADDON', 'Add-on')], max_length=20)),
                ('entity_id', models.PositiveIntegerField(db_index=True)),
                ('entity_name', models.CharField(blank=True, default='', max_length=200)),
                ('action', models.CharField(choices=[('CREATE', 'Created'), ('UPDATE', 'Updated'), ('STATUS_CHANGE', 'Status Changed')], max_length=20)),
                ('field_name', models.CharField(blank=True, default='', max_length=100)),
                ('old_value', models.TextField(blank=True, default='')),
                ('new_value', models.TextField(blank=True, default='')),
                ('reason', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('changed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='catalog_change_actions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='catalogchangelog',
            index=models.Index(fields=['entity_type', 'entity_id'], name='service_req_entity__idx'),
        ),
    ]
