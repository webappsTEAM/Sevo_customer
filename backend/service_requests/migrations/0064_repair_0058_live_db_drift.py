# Hand-written repair migration.
#
# Django's migration table records `0058_alter_addon_options_addon_addon_type_and_more`
# as applied on the live VPS database, but it never actually ran there --
# none of its columns/tables exist (confirmed via direct information_schema
# introspection on 2026-09-07). This migration re-applies exactly those
# missing pieces, verified one-for-one against 0058's own operations, so
# Django's recorded history and the live schema finally agree.
#
# Purely additive: new nullable/defaulted columns and two new tables. No
# existing column is dropped or altered destructively, so this is safe to
# run against a database with live data.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0063_merge_20260904_1456'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='addon',
            options={'ordering': ['sort_order', 'name']},
        ),
        migrations.AddField(
            model_name='addon',
            name='addon_type',
            field=models.CharField(choices=[('customer_selectable', 'Customer Selectable (Type A)'), ('technician_assessment', 'Technician Assessment Required (Type B)')], db_index=True, default='customer_selectable', max_length=30),
        ),
        migrations.AddField(
            model_name='addon',
            name='base_price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name='addon',
            name='category_slug',
            field=models.CharField(blank=True, db_index=True, default='ac', max_length=100),
        ),
        migrations.AddField(
            model_name='addon',
            name='is_quantity_allowed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='addon',
            name='max_quantity',
            field=models.PositiveIntegerField(default=10),
        ),
        migrations.AddField(
            model_name='addon',
            name='service',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='addons', to='service_requests.service'),
        ),
        migrations.AddField(
            model_name='addon',
            name='unit',
            field=models.CharField(default='Per Piece', max_length=50),
        ),
        migrations.AddField(
            model_name='addon',
            name='vendor_availability',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='workextensionitem',
            name='addon',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='work_extension_items', to='service_requests.addon'),
        ),
        migrations.AddField(
            model_name='workextensionitem',
            name='proof_images',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='workextensionitem',
            name='technician_notes',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='workextensionitem',
            name='unit',
            field=models.CharField(blank=True, default='Per Piece', max_length=50),
        ),
        migrations.AddField(
            model_name='workextensionitem',
            name='unit_price',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AlterField(
            model_name='addon',
            name='package',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='addons', to='service_requests.package'),
        ),
        migrations.CreateModel(
            name='BookingAddOn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('addon_name_snapshot', models.CharField(max_length=200)),
                ('addon_type', models.CharField(choices=[('customer_selectable', 'Customer Selectable (Type A)'), ('technician_assessment', 'Technician Assessment Required (Type B)')], default='customer_selectable', max_length=30)),
                ('quantity', models.PositiveIntegerField(default=1)),
                ('unit', models.CharField(default='Per Piece', max_length=50)),
                ('unit_price', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('line_total', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('status', models.CharField(choices=[('selected', 'Customer Selected'), ('pending_approval', 'Pending Customer Approval'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('completed', 'Completed')], default='selected', max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('addon', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='booking_instances', to='service_requests.addon')),
                ('booking', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='booking_addons', to='service_requests.servicerequest')),
            ],
            options={
                'ordering': ['created_at'],
            },
        ),
        migrations.CreateModel(
            name='ServiceAddOn',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('price_override', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('display_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('addon', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_mappings', to='service_requests.addon')),
                ('service', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_addons', to='service_requests.service')),
            ],
            options={
                'ordering': ['display_order', 'addon__name'],
                'unique_together': {('service', 'addon')},
            },
        ),
    ]
