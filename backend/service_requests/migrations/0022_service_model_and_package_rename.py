from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0021_merge_20260810_1005'),
    ]

    operations = [
        # Step 1: rename CatalogService -> Package (state only, no data risk).
        migrations.RenameModel(
            old_name='CatalogService',
            new_name='Package',
        ),
        # Step 2: create the new middle layer, Category -> Service -> Package.
        migrations.CreateModel(
            name='Service',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField(unique=True)),
                ('description', models.TextField(blank=True)),
                ('icon', models.CharField(blank=True, max_length=200)),
                ('image', models.CharField(blank=True, max_length=500)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='services_v2', to='service_requests.catalogcategory')),
            ],
            options={
                'ordering': ['category__sort_order', 'category__name', 'sort_order', 'name'],
            },
        ),
        # Step 3: nullable FK for now — populated by the data migration in 0023,
        # then tightened to non-null and category removed in 0024.
        migrations.AddField(
            model_name='package',
            name='service',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name='packages', to='service_requests.service'),
        ),
    ]
