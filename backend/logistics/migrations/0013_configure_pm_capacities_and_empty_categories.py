# Data migration for logistics app.
# 1. Configures physical capacities (max_weight_kg, max_cft, crew_size, vehicle_class) on Packers & Movers ServiceTiers.
# 2. Populates starter items for empty categories (textiles_garments, hardware_electrical).
from decimal import Decimal
from django.db import migrations


def configure_pm_and_empty_categories(apps, schema_editor):
    ServiceTier = apps.get_model("logistics", "ServiceTier")
    GoodsCategory = apps.get_model("logistics", "GoodsCategory")
    GoodsItem = apps.get_model("logistics", "GoodsItem")

    # 1. Update Packers & Movers tiers in Hosur
    pm_updates = {
        "1rk-1bhk-shifting": {
            "vehicle_class": "truck",
            "max_weight_kg": Decimal("750.00"),
            "max_cft": Decimal("250.00"),
            "crew_size": 2,
        },
        "2bhk-3bhk-shifting": {
            "vehicle_class": "truck",
            "max_weight_kg": Decimal("1800.00"),
            "max_cft": Decimal("500.00"),
            "crew_size": 3,
        },
        "villa-office-relocation": {
            "vehicle_class": "heavy_truck",
            "max_weight_kg": Decimal("4000.00"),
            "max_cft": Decimal("1000.00"),
            "crew_size": 5,
        },
    }

    for slug, attrs in pm_updates.items():
        tiers = ServiceTier.objects.filter(slug=slug, category="packers_movers")
        for tier in tiers:
            tier.vehicle_class = attrs["vehicle_class"]
            if tier.max_weight_kg is None or tier.max_weight_kg <= 0:
                tier.max_weight_kg = attrs["max_weight_kg"]
            if tier.max_cft is None or tier.max_cft <= 0:
                tier.max_cft = attrs["max_cft"]
            if tier.crew_size is None or tier.crew_size <= 0:
                tier.crew_size = attrs["crew_size"]
            tier.save(update_fields=["vehicle_class", "max_weight_kg", "max_cft", "crew_size", "updated_at"])

    # 2. Populate starter items for textiles_garments
    cat_textiles = GoodsCategory.objects.filter(slug="textiles_garments").first()
    if cat_textiles:
        textiles_items = [
            {
                "slug": "garment_carton_medium",
                "name": "Garment Carton Box (Medium)",
                "unit": "carton",
                "default_weight_kg": Decimal("15.00"),
                "default_cft": Decimal("3.50"),
                "is_two_wheeler_compatible": True,
                "order": 1,
            },
            {
                "slug": "fabric_roll_10m",
                "name": "Textile Fabric Roll (10m)",
                "unit": "roll",
                "default_weight_kg": Decimal("25.00"),
                "default_cft": Decimal("4.00"),
                "is_two_wheeler_compatible": False,
                "is_heavy": True,
                "order": 2,
            },
        ]
        for it in textiles_items:
            GoodsItem.objects.get_or_create(
                slug=it["slug"],
                defaults={
                    **it,
                    "category": cat_textiles,
                    "is_active": True,
                }
            )

    # 3. Populate starter items for hardware_electrical
    cat_hardware = GoodsCategory.objects.filter(slug="hardware_electrical").first()
    if cat_hardware:
        hardware_items = [
            {
                "slug": "handyman_tool_kit",
                "name": "Electrician / Handyman Toolkit",
                "unit": "kit",
                "default_weight_kg": Decimal("8.00"),
                "default_cft": Decimal("1.50"),
                "is_two_wheeler_compatible": True,
                "order": 1,
            },
            {
                "slug": "fasteners_hardware_box",
                "name": "Fasteners & Hardware Box (15 kg)",
                "unit": "box",
                "default_weight_kg": Decimal("15.00"),
                "default_cft": Decimal("1.00"),
                "is_two_wheeler_compatible": True,
                "order": 2,
            },
        ]
        for it in hardware_items:
            GoodsItem.objects.get_or_create(
                slug=it["slug"],
                defaults={
                    **it,
                    "category": cat_hardware,
                    "is_active": True,
                }
            )


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0012_alter_goodsitem_default_cft_and_more"),
    ]

    operations = [
        migrations.RunPython(configure_pm_and_empty_categories, migrations.RunPython.noop),
    ]
