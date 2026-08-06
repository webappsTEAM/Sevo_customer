# Repair migration: 0002_inventory_extensions was recorded as applied in
# the `public` schema's django_migrations table but its DDL never actually
# ran there (it only ran against old per-tenant schemas under
# django-tenants). Re-issues the same AddField operations for real.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0003_inventorytransfer_org"),
    ]

    operations = [
        migrations.AddField(
            model_name="inventoryitem",
            name="reserved_quantity",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="inventoryitem",
            name="reorder_quantity",
            field=models.PositiveIntegerField(default=10),
        ),
        migrations.AddField(
            model_name="inventoryitem",
            name="pending_purchase_quantity",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="inventoryitem",
            name="expected_delivery_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
