import inspect
import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


def _check_constraint(expr, name):
    if "condition" in inspect.signature(models.CheckConstraint.__init__).parameters:
        return models.CheckConstraint(condition=expr, name=name)
    return models.CheckConstraint(check=expr, name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0090_servicerequest_dispatch_attempts_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ACInspectionConfiguration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('diagnostic_fee', models.DecimalField(decimal_places=2, default=Decimal('199.00'), help_text='Authoritative doorstep inspection fee', max_digits=10)),
                ('currency', models.CharField(default='INR', max_length=10)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'AC Inspection Configuration',
                'verbose_name_plural': 'AC Inspection Configurations',
            },
        ),
        migrations.CreateModel(
            name='ACInspectionRateCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=150)),
                ('slug', models.SlugField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True, default='')),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'AC Inspection Rate Category',
                'verbose_name_plural': 'AC Inspection Rate Categories',
                'ordering': ['display_order', 'id'],
            },
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='category_name_snapshot',
            field=models.CharField(blank=True, default='', help_text='Immutable snapshot of category name at quote creation', max_length=255),
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='item_name_snapshot',
            field=models.CharField(blank=True, default='', help_text='Immutable snapshot of part/service name at quote creation', max_length=255),
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='selected_at',
            field=models.DateTimeField(blank=True, help_text='Timestamp when technician selected this item', null=True),
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='unit_price_snapshot',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='Immutable snapshot of unit price', max_digits=12, null=True),
        ),
        migrations.CreateModel(
            name='ACInspectionRateItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True, default='')),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('unit', models.CharField(blank=True, default='per piece', max_length=50)),
                ('service_type', models.CharField(blank=True, choices=[('SPARE_PART', 'Spare Part'), ('LABOR', 'Labor / Service'), ('REPAIR', 'Repair'), ('INSTALLATION', 'Installation'), ('ADJUSTMENT', 'Adjustment / Maintenance')], default='SPARE_PART', max_length=50)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('is_active', models.BooleanField(db_index=True, default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('category', models.ForeignKey(help_text='Category this rate item belongs to', on_delete=django.db.models.deletion.PROTECT, related_name='items', to='service_requests.acinspectionratecategory')),
            ],
            options={
                'verbose_name': 'AC Inspection Rate Item',
                'verbose_name_plural': 'AC Inspection Rate Items',
                'ordering': ['display_order', 'id'],
            },
        ),
        migrations.AddField(
            model_name='estimationquotationitem',
            name='rate_item',
            field=models.ForeignKey(blank=True, help_text='Reference to original AC rate item if quoted from rate card', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='quotation_snapshots', to='service_requests.acinspectionrateitem'),
        ),
        migrations.AddIndex(
            model_name='acinspectionrateitem',
            index=models.Index(fields=['category', 'is_active'], name='service_req_categor_450aaf_idx'),
        ),
        migrations.AddIndex(
            model_name='acinspectionrateitem',
            index=models.Index(fields=['is_active', 'display_order'], name='service_req_is_acti_952f10_idx'),
        ),
        migrations.AddConstraint(
            model_name='acinspectionrateitem',
            constraint=_check_constraint(models.Q(('price__gte', Decimal('0.00'))), name='check_ac_rate_item_price_gte_0'),
        ),
    ]
