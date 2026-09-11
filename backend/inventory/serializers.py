from rest_framework import serializers
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'category', 'sku', 'warehouse_name',
            'total_quantity', 'available_quantity', 'reserved_quantity',
            'unit_cost', 'reorder_threshold', 'reorder_quantity',
            'pending_purchase_quantity', 'expected_delivery_date',
            'is_returnable', 'image', 'created_at'
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        if 'available_quantity' not in validated_data:
            validated_data['available_quantity'] = validated_data.get('total_quantity', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'available_quantity' in validated_data:
            instance.available_quantity = validated_data['available_quantity']
        elif 'total_quantity' in validated_data:
            diff = validated_data['total_quantity'] - instance.total_quantity
            instance.available_quantity = max(0, instance.available_quantity + diff)

        item = super().update(instance, validated_data)

        # Bi-directional sync with linked vegetable Package
        pkg = getattr(item, 'vegetable_package', None)
        if not pkg:
            try:
                from service_requests.models import Package
                pkg = Package.objects.filter(stock_item=item).first()
            except Exception:
                pkg = None

        if pkg:
            pkg_update_fields = []

            # Sync price / unit_cost
            if 'unit_cost' in validated_data and validated_data['unit_cost'] is not None:
                new_cost = validated_data['unit_cost']
                if pkg.base_price != new_cost:
                    pkg.base_price = new_cost
                    pkg_update_fields.append('base_price')

            # Sync image
            if 'image' in validated_data and validated_data['image']:
                new_img = validated_data['image']
                if pkg.image != new_img:
                    pkg.image = new_img
                    pkg_update_fields.append('image')

            # Sync name
            if 'name' in validated_data and validated_data['name']:
                clean_name = validated_data['name'].replace(' (Produce)', '').strip()
                if clean_name and pkg.name != clean_name:
                    pkg.name = clean_name
                    pkg_update_fields.append('name')

            if pkg_update_fields:
                pkg.save(update_fields=pkg_update_fields)

            # Sync stock_quantity_grams for live customer stock caps
            from inventory.utils.unit_conversion import parse_pack_size_grams
            pack_grams = parse_pack_size_grams(getattr(pkg, 'duration', '') or '500 g', default_grams=500)
            target_grams = item.available_quantity * pack_grams if pack_grams > 0 else item.available_quantity * 500

            if item.stock_quantity_grams != target_grams:
                old_grams = item.stock_quantity_grams or 0
                item.stock_quantity_grams = target_grams
                item.save(update_fields=['stock_quantity_grams'])

                # Log stock movement
                from inventory.models import StockMovement
                request = self.context.get('request')
                user = getattr(request, 'user', None) if request else None
                try:
                    StockMovement.objects.create(
                        org=item.org,
                        item=item,
                        movement_type=StockMovement.MovementType.ADJUSTMENT,
                        delta_grams=target_grams - old_grams,
                        balance_after_grams=target_grams,
                        reason="Updated via Stock Catalog admin edit",
                        entered_by=user if user and user.is_authenticated else None,
                    )
                except Exception:
                    pass

            # Invalidate catalog cache so customer app gets immediate live update
            try:
                from django.core.cache import cache
                company_id = item.org_id or ""
                cat_id = pkg.service.category_id if pkg.service else ""
                service_slug = pkg.service.slug if pkg.service else "vegetables"
                for st in ["", "ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"]:
                    cache.delete(f"catalog_services_list_{company_id}__{service_slug}_{st}")
                    cache.delete(f"catalog_services_list_{company_id}_{cat_id}_{service_slug}_{st}")
                    cache.delete(f"catalog_services_list_{company_id}_{cat_id}__{st}")
                    cache.delete(f"catalog_services_list_{company_id}___{st}")
            except Exception:
                pass

        return item


class InventoryAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = InventoryAlert
        fields = [
            'id', 'alert_type', 'item', 'item_name',
            'message', 'is_resolved', 'created_at'
        ]
        read_only_fields = ['created_at']


class InventoryTransferSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = InventoryTransfer
        fields = [
            'id', 'item', 'item_name', 'from_warehouse',
            'to_warehouse', 'quantity', 'requested_by',
            'status', 'requested_at', 'delivered_at'
        ]
        read_only_fields = ['requested_at', 'delivered_at', 'requested_by']


# ── Vegetable Stock Management Serializers ──────────────────────────────────

class VegetableStockAdminListSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(source="id")
    name = serializers.CharField()
    slug = serializers.CharField()
    image = serializers.CharField(allow_blank=True, allow_null=True)
    price = serializers.SerializerMethodField()
    mrp = serializers.SerializerMethodField()
    offer_price = serializers.SerializerMethodField()
    offer_percentage = serializers.SerializerMethodField()
    vegetable_gram = serializers.SerializerMethodField()
    state = serializers.SerializerMethodField()
    today_available_grams = serializers.SerializerMethodField()
    default_daily_grams = serializers.SerializerMethodField()
    today_available_display = serializers.SerializerMethodField()
    default_daily_display = serializers.SerializerMethodField()
    opening_stock_display = serializers.SerializerMethodField()
    opening_stock_grams = serializers.SerializerMethodField()
    consumed_stock_display = serializers.SerializerMethodField()
    consumed_stock_grams = serializers.SerializerMethodField()
    consumed_date = serializers.SerializerMethodField()
    restock_level_display = serializers.SerializerMethodField()
    restock_level_grams = serializers.SerializerMethodField()
    reorder_level_display = serializers.SerializerMethodField()
    reorder_level_grams = serializers.SerializerMethodField()
    unit = serializers.SerializerMethodField()

    def get_status_info(self, obj):
        if not hasattr(obj, "_cached_admin_status"):
            from inventory.selectors.vegetable_stock_selectors import get_admin_stock_status
            obj._cached_admin_status = get_admin_stock_status(obj)
        return obj._cached_admin_status

    def get_state(self, obj):
        return self.get_status_info(obj)["state"]

    def get_today_available_grams(self, obj):
        return self.get_status_info(obj)["today_available_grams"]

    def get_default_daily_grams(self, obj):
        return self.get_status_info(obj)["default_daily_grams"]

    def get_today_available_display(self, obj):
        return self.get_status_info(obj)["today_available_display"]

    def get_default_daily_display(self, obj):
        return self.get_status_info(obj)["default_daily_display"]

    def get_opening_stock_display(self, obj):
        return self.get_status_info(obj)["opening_stock_display"]

    def get_opening_stock_grams(self, obj):
        return self.get_status_info(obj)["opening_stock_grams"]

    def get_consumed_stock_display(self, obj):
        return self.get_status_info(obj)["consumed_stock_display"]

    def get_consumed_stock_grams(self, obj):
        return self.get_status_info(obj)["consumed_stock_grams"]

    def get_consumed_date(self, obj):
        return self.get_status_info(obj)["consumed_date"]

    def get_restock_level_display(self, obj):
        return self.get_status_info(obj)["restock_level_display"]

    def get_restock_level_grams(self, obj):
        return self.get_status_info(obj)["restock_level_grams"]

    def get_reorder_level_display(self, obj):
        return self.get_status_info(obj)["reorder_level_display"]

    def get_reorder_level_grams(self, obj):
        return self.get_status_info(obj)["reorder_level_grams"]

    def get_price(self, obj):
        return self.get_status_info(obj)["price"]

    def get_mrp(self, obj):
        return self.get_status_info(obj)["mrp"]

    def get_offer_price(self, obj):
        return self.get_status_info(obj)["offer_price"]

    def get_offer_percentage(self, obj):
        return self.get_status_info(obj)["offer_percentage"]

    def get_vegetable_gram(self, obj):
        return self.get_status_info(obj)["vegetable_gram"]

    def get_unit(self, obj):
        return self.get_status_info(obj)["unit"]


class VegetableRestockActionSerializer(serializers.Serializer):
    quantity = serializers.FloatField(required=True)
    unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg")


class VegetableAdjustActionSerializer(serializers.Serializer):
    quantity = serializers.FloatField(required=True)
    unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg")
    reason = serializers.CharField(required=True, allow_blank=False)


class VegetableSetDefaultActionSerializer(serializers.Serializer):
    quantity = serializers.FloatField(required=False, allow_null=True)
    unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg")
    apply_now = serializers.BooleanField(default=False)


class VegetableDetailsUpdateSerializer(serializers.Serializer):
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    mrp = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    offer_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    offer_percentage = serializers.FloatField(required=False, allow_null=True)
    vegetable_gram = serializers.CharField(max_length=50, required=False, allow_blank=True)
    opening_stock_quantity = serializers.FloatField(required=False, allow_null=True)
    opening_stock_unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg", required=False)
    current_stock_quantity = serializers.FloatField(required=False, allow_null=True)
    current_stock_unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg", required=False)
    restock_level_quantity = serializers.FloatField(required=False, allow_null=True)
    restock_level_unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg", required=False)
    reorder_level_quantity = serializers.FloatField(required=False, allow_null=True)
    reorder_level_unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg", required=False)

