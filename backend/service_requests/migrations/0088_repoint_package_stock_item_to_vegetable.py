import django.db.models.deletion
from django.db import migrations, models


def null_out_stock_item_ids(apps, schema_editor):
    Package = apps.get_model('service_requests', 'Package')
    Package.objects.all().update(stock_item_id=None)


def populate_vegetable_stock_item_ids(apps, schema_editor):
    Package = apps.get_model('service_requests', 'Package')
    Vegetable = apps.get_model('inventory', 'Vegetable')

    for veg in Vegetable.objects.all():
        pkg = None
        if veg.package_id:
            pkg = Package.objects.filter(id=veg.package_id).first()
        if not pkg and veg.sku:
            slug_part = veg.sku.replace('VEG-', '').lower()
            pkg = Package.objects.filter(service__slug='vegetables', slug__icontains=slug_part).first()
        if not pkg:
            clean_name = veg.name.replace(' (Produce)', '').strip()
            pkg = Package.objects.filter(service__slug='vegetables', name__iexact=clean_name).first()

        if pkg:
            Package.objects.filter(id=pkg.id).update(stock_item_id=veg.id)
            Vegetable.objects.filter(id=veg.id).update(package_id=pkg.id)


def reverse_populate_inventory_stock_item_ids(apps, schema_editor):
    Package = apps.get_model('service_requests', 'Package')
    InventoryItem = apps.get_model('inventory', 'InventoryItem')
    Vegetable = apps.get_model('inventory', 'Vegetable')

    Package.objects.all().update(stock_item_id=None)
    for veg in Vegetable.objects.all():
        item = InventoryItem.objects.filter(sku=veg.sku).first()
        if item and veg.package_id:
            Package.objects.filter(id=veg.package_id).update(stock_item_id=item.id)


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0010_migrate_vegetable_data_step1'),
        ('service_requests', '0087_alter_catalogchangelog_action_and_more'),
    ]

    operations = [
        # 1. Null out old InventoryItem FK references
        migrations.RunPython(null_out_stock_item_ids, migrations.RunPython.noop),
        # 2. Alter foreign key constraint to inventory_vegetable
        migrations.AlterField(
            model_name='package',
            name='stock_item',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='vegetable_package',
                to='inventory.vegetable'
            ),
        ),
        # 3. Populate new Vegetable FK references
        migrations.RunPython(populate_vegetable_stock_item_ids, reverse_populate_inventory_stock_item_ids),
    ]
