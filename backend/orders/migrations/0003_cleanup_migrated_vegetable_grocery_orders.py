from django.db import migrations


def cleanup_migrated_vegetable_orders(apps, schema_editor):
    GroceryOrder = apps.get_model('orders', 'GroceryOrder')
    GroceryOrderItem = apps.get_model('orders', 'GroceryOrderItem')
    VegetableOrder = apps.get_model('vegetable_orders', 'VegetableOrder')

    # Find IDs of orders that have been successfully migrated to VegetableOrder
    migrated_ids = list(VegetableOrder.objects.values_list('id', flat=True))

    if migrated_ids:
        # Delete line items first
        GroceryOrderItem.objects.filter(order_id__in=migrated_ids).delete()
        # Delete order headers
        GroceryOrder.objects.filter(id__in=migrated_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0002_grocery_order'),
        ('vegetable_orders', '0002_copy_grocery_orders_to_vegetable_orders'),
    ]

    operations = [
        migrations.RunPython(cleanup_migrated_vegetable_orders, migrations.RunPython.noop),
    ]
