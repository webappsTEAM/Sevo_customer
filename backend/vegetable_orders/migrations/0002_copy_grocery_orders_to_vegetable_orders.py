from django.db import migrations


def copy_grocery_orders_to_vegetable_orders(apps, schema_editor):
    try:
        GroceryOrder = apps.get_model('orders', 'GroceryOrder')
        GroceryOrderItem = apps.get_model('orders', 'GroceryOrderItem')
        VegetableOrder = apps.get_model('vegetable_orders', 'VegetableOrder')
        VegetableOrderItem = apps.get_model('vegetable_orders', 'VegetableOrderItem')
    except LookupError:
        return

    for go in GroceryOrder.objects.all():
        vo, created = VegetableOrder.objects.get_or_create(
            id=go.id,
            defaults={
                'order_number': go.order_number,
                'customer_id': go.customer_id,
                'status': go.status,
                'total_amount': go.total_amount,
                'delivery_address': go.delivery_address,
                'created_at': go.created_at,
                'updated_at': go.updated_at,
            }
        )
        if not created:
            vo.order_number = go.order_number
            vo.customer_id = go.customer_id
            vo.status = go.status
            vo.total_amount = go.total_amount
            vo.delivery_address = go.delivery_address
            vo.save()

    for gi in GroceryOrderItem.objects.all():
        VegetableOrderItem.objects.get_or_create(
            id=gi.id,
            defaults={
                'order_id': gi.order_id,
                'package_id': gi.package_id,
                'quantity_grams': gi.quantity_grams,
                'unit_price_snapshot': gi.unit_price_snapshot,
                'line_amount': gi.line_amount,
                'created_at': gi.created_at,
                'updated_at': gi.updated_at,
            }
        )

    # If PostgreSQL, sync the auto-increment primary key sequences
    if schema_editor.connection.vendor == 'postgresql':
        with schema_editor.connection.cursor() as cursor:
            cursor.execute("""
                SELECT setval(pg_get_serial_sequence('vegetable_orders_vegetableorder', 'id'), COALESCE(MAX(id), 1))
                FROM vegetable_orders_vegetableorder;
                SELECT setval(pg_get_serial_sequence('vegetable_orders_vegetableorderitem', 'id'), COALESCE(MAX(id), 1))
                FROM vegetable_orders_vegetableorderitem;
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('vegetable_orders', '0001_initial'),
        ('orders', '0002_grocery_order'),
    ]

    operations = [
        migrations.RunPython(
            copy_grocery_orders_to_vegetable_orders,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
