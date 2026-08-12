from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0023_backfill_service_bridge'),
    ]

    operations = [
        # Package.service is now fully backfilled by 0023 — tighten to
        # required and drop the old direct category FK it replaces.
        migrations.AlterField(
            model_name='package',
            name='service',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='packages', to='service_requests.service'),
        ),
        migrations.RemoveField(
            model_name='package',
            name='category',
        ),
        migrations.AlterField(
            model_name='package',
            name='slug',
            field=models.SlugField(unique=True),
        ),
        # Free up the "services" related_name (previously held by
        # Package.category) and let Service.category use it, matching the
        # final model definition.
        migrations.AlterField(
            model_name='service',
            name='category',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='services', to='service_requests.catalogcategory'),
        ),
        migrations.RenameField(
            model_name='package',
            old_name='price',
            new_name='base_price',
        ),
        migrations.AddField(
            model_name='package',
            name='offer_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='package',
            name='payment_policy',
            field=models.CharField(choices=[('ONLINE_ONLY', 'Online Only'), ('BOTH', 'Online + COD'), ('COD_ONLY', 'COD Only')], default='BOTH', max_length=20),
        ),
        migrations.AddField(
            model_name='package',
            name='status',
            field=models.CharField(choices=[('DRAFT', 'Draft'), ('ACTIVE', 'Active'), ('INACTIVE', 'Inactive'), ('ARCHIVED', 'Archived')], default='DRAFT', max_length=20),
        ),
        migrations.AddField(
            model_name='package',
            name='version',
            field=models.PositiveIntegerField(default=1),
        ),
        migrations.AddField(
            model_name='package',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='package',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.RemoveField(
            model_name='package',
            name='is_active',
        ),
        migrations.AlterModelOptions(
            name='package',
            options={'ordering': ['service__category__sort_order', 'service__name', 'name']},
        ),
        migrations.AddField(
            model_name='catalogcategory',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='catalogcategory',
            name='sort_order',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterModelOptions(
            name='catalogcategory',
            options={'ordering': ['sort_order', 'name']},
        ),
    ]
