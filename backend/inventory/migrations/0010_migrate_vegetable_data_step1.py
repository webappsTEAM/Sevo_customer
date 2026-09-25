from django.db import migrations


def copy_vegetable_data(apps, schema_editor):
    InventoryItem = apps.get_model('inventory', 'InventoryItem')
    StockMovement = apps.get_model('inventory', 'StockMovement')
    Vegetable = apps.get_model('inventory', 'Vegetable')
    VegetableStockMovement = apps.get_model('inventory', 'VegetableStockMovement')
    Package = apps.get_model('service_requests', 'Package')

    # Select all vegetable inventory items
    veg_items = InventoryItem.objects.filter(sku__startswith='VEG-')
    if not veg_items.exists():
        veg_items = InventoryItem.objects.filter(stock_quantity_grams__isnull=False)

    for old_item in veg_items:
        # Find linked Package if any
        pkg = Package.objects.filter(stock_item_id=old_item.id).first()

        veg_obj, created = Vegetable.objects.update_or_create(
            sku=old_item.sku,
            org_id=old_item.org_id,
            defaults={
                'name': old_item.name,
                'package_id': pkg.id if pkg else None,
                'unit': old_item.unit or '',
                'stock_quantity_grams': old_item.stock_quantity_grams,
                'default_daily_quantity_grams': old_item.default_daily_quantity_grams,
                'last_reset_date': old_item.last_reset_date,
                'image': old_item.image or '',
            }
        )

        # Copy all related StockMovement rows
        movements = StockMovement.objects.filter(item_id=old_item.id).order_by('created_at', 'id')
        for mv in movements:
            # Check for existing to ensure idempotency
            exists = VegetableStockMovement.objects.filter(
                vegetable=veg_obj,
                movement_type=mv.movement_type,
                delta_grams=mv.delta_grams,
                balance_after_grams=mv.balance_after_grams,
                created_at=mv.created_at,
                booking_ref=mv.booking_ref or '',
            ).exists()

            if not exists:
                VegetableStockMovement.objects.create(
                    org_id=mv.org_id,
                    vegetable=veg_obj,
                    movement_type=mv.movement_type,
                    delta_grams=mv.delta_grams,
                    balance_after_grams=mv.balance_after_grams,
                    reason=mv.reason or '',
                    booking_ref=mv.booking_ref or '',
                    entered_by_id=mv.entered_by_id,
                    created_at=mv.created_at,
                )


def reverse_copy(apps, schema_editor):
    # Step 1 is purely additive; reversing can delete the copied rows in new tables
    VegetableStockMovement = apps.get_model('inventory', 'VegetableStockMovement')
    Vegetable = apps.get_model('inventory', 'Vegetable')
    VegetableStockMovement.objects.all().delete()
    Vegetable.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0009_create_vegetable_models'),
        ('service_requests', '0087_alter_catalogchangelog_action_and_more'),
    ]

    operations = [
        migrations.RunPython(copy_vegetable_data, reverse_copy),
    ]
