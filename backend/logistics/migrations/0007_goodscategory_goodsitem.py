# Hand-written additive migration for logistics app.
# Follows the repo standard (see 0006_servicetier_pricing_validators):
# avoids autodetector stop on unrelated Addon.package drift.
from decimal import Decimal
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0006_servicetier_pricing_validators"),
    ]

    operations = [
        migrations.AddField(
            model_name="servicetier",
            name="max_weight_kg",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Maximum payload capacity in kg. If null, computed from capacity_label.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="servicetier",
            name="max_cft",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Maximum cargo volume in cubic feet (CFT). If null, computed from dimensions_label.",
                max_digits=8,
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="GoodsCategory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("name", models.CharField(max_length=150)),
                ("icon", models.CharField(blank=True, default="package", max_length=50)),
                ("description", models.TextField(blank=True, default="")),
                ("allows_two_wheeler", models.BooleanField(default=True)),
                ("min_vehicle_class", models.CharField(blank=True, default="any", max_length=30)),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Goods Category",
                "verbose_name_plural": "Goods Categories",
                "ordering": ["order", "name"],
            },
        ),
        migrations.CreateModel(
            name="GoodsItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("slug", models.SlugField(max_length=100, unique=True)),
                ("name", models.CharField(max_length=150)),
                ("unit", models.CharField(default="piece", max_length=30)),
                ("default_weight_kg", models.DecimalField(decimal_places=2, default=Decimal("5.00"), max_digits=7)),
                ("default_cft", models.DecimalField(decimal_places=2, default=Decimal("1.00"), max_digits=7)),
                ("is_fragile", models.BooleanField(default=False)),
                ("is_heavy", models.BooleanField(default=False)),
                ("is_oversized", models.BooleanField(default=False)),
                ("requires_special_handling", models.BooleanField(default=False)),
                ("special_handling_charge", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=8)),
                ("is_two_wheeler_compatible", models.BooleanField(default=True)),
                ("order", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="logistics.goodscategory",
                    ),
                ),
            ],
            options={
                "verbose_name": "Goods Item",
                "verbose_name_plural": "Goods Items",
                "ordering": ["category", "order", "name"],
            },
        ),
    ]
