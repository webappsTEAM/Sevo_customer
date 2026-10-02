from django.db import migrations


def delete_migrated_vegetable_rows(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        # Delete related StockMovement records for vegetable items
        cursor.execute(
            """
            DELETE FROM inventory_stockmovement 
            WHERE item_id IN (
                SELECT id FROM inventory_inventoryitem 
                WHERE sku LIKE 'VEG-%' OR stock_quantity_grams IS NOT NULL
            )
            """
        )
        # Delete the vegetable items themselves from inventory_inventoryitem
        cursor.execute(
            """
            DELETE FROM inventory_inventoryitem 
            WHERE sku LIKE 'VEG-%' OR stock_quantity_grams IS NOT NULL
            """
        )


def reverse_delete(apps, schema_editor):
    # If rolling back, restore rows into InventoryItem and StockMovement from Vegetable
    Vegetable = apps.get_model('inventory', 'Vegetable')
    VegetableStockMovement = apps.get_model('inventory', 'VegetableStockMovement')
    InventoryItem = apps.get_model('inventory', 'InventoryItem')
    StockMovement = apps.get_model('inventory', 'StockMovement')

    for veg in Vegetable.objects.all():
        item, _ = InventoryItem.objects.get_or_create(
            sku=veg.sku,
            org_id=veg.org_id,
            defaults={
                'name': veg.name,
                'category': 'consumable',
                'unit': veg.unit or '',
                'stock_quantity_grams': veg.stock_quantity_grams,
                'default_daily_quantity_grams': veg.default_daily_quantity_grams,
                'last_reset_date': veg.last_reset_date,
                'image': veg.image or '',
            }
        )

        for mv in VegetableStockMovement.objects.filter(vegetable=veg):
            StockMovement.objects.get_or_create(
                org_id=mv.org_id,
                item=item,
                movement_type=mv.movement_type,
                delta_grams=mv.delta_grams,
                balance_after_grams=mv.balance_after_grams,
                reason=mv.reason or '',
                booking_ref=mv.booking_ref or '',
                entered_by_id=mv.entered_by_id,
                created_at=mv.created_at,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0010_migrate_vegetable_data_step1'),
        ('service_requests', '0088_repoint_package_stock_item_to_vegetable'),
    ]

    operations = [
        migrations.RunPython(delete_migrated_vegetable_rows, reverse_delete),
    ]
