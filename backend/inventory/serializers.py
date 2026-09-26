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
    sku = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

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

    def get_sku(self, obj):
        item = getattr(obj, "stock_item", None)
        return item.sku if item else ""

    def get_category(self, obj):
        item = getattr(obj, "stock_item", None)
        if item and item.category:
            return {
                "id": item.category.id,
                "name": item.category.name,
                "slug": item.category.slug,
                "image": item.category.image,
            }
        return None


class VegetableCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)
    parent_slug = serializers.CharField(source="parent.slug", read_only=True, default=None)
    full_path = serializers.CharField(read_only=True)
    depth = serializers.IntegerField(read_only=True)
    unit_of_measurement_display = serializers.CharField(source="get_unit_of_measurement_display", read_only=True, default=None)
    ancestors = serializers.SerializerMethodField()
    vegetables_count = serializers.SerializerMethodField()
    direct_vegetables_count = serializers.SerializerMethodField()
    subcategories_count = serializers.SerializerMethodField()
    is_leaf = serializers.BooleanField(read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    bundled_vegetables = serializers.SerializerMethodField()
    subcategories = serializers.SerializerMethodField()

    class Meta:
        from inventory.models import VegetableCategory
        model = VegetableCategory
        fields = [
            'id', 'parent', 'parent_name', 'parent_slug',
            'full_path', 'depth', 'ancestors',
            'name', 'slug', 'description', 'image',
            'sort_order', 'is_active', 'unit_of_measurement', 'unit_of_measurement_display', 'status', 'source', 'is_leaf',
            'requested_by', 'requested_by_name', 'requested_at',
            'rejection_reason', 'is_resubmission',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'vegetables_count', 'direct_vegetables_count', 'subcategories_count',
            'bundled_vegetables', 'subcategories',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_leaf', 'full_path', 'depth', 'ancestors', 'source']

    def get_ancestors(self, obj):
        return [{
            "id": a.id,
            "name": a.name,
            "slug": a.slug,
        } for a in obj.get_ancestors()]

    def get_direct_vegetables_count(self, obj):
        return obj.vegetables.count()

    def get_vegetables_count(self, obj):
        # Direct count on this category
        return getattr(obj, "_vegetables_count", None) or obj.vegetables.count()

    def get_subcategories_count(self, obj):
        return obj.subcategories.count()

    def get_subcategories(self, obj):
        # Only serialize direct children
        subs = obj.subcategories.all().order_by("sort_order", "name")
        return [{
            "id": s.id,
            "name": s.name,
            "slug": s.slug,
            "full_path": s.full_path,
            "depth": s.depth,
            "is_leaf": s.is_leaf,
            "unit_of_measurement": s.unit_of_measurement,
            "unit_of_measurement_display": s.get_unit_of_measurement_display(),
            "status": s.status,
            "vegetables_count": s.vegetables.count(),
            "subcategories_count": s.subcategories.count(),
        } for s in subs]

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username or obj.requested_by.email
        return "Admin"

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username or obj.reviewed_by.email
        return None

    def get_bundled_vegetables(self, obj):
        vegs = obj.vegetables.select_related("package").all()
        result = []
        for v in vegs:
            pkg = v.package
            result.append({
                "id": v.id,
                "name": v.name,
                "sku": v.sku,
                "unit": v.unit,
                "status": v.status,
                "price": str(pkg.base_price) if pkg else "0.00",
                "mrp": str(pkg.offer_price) if pkg and pkg.offer_price else None,
                "image": v.image or (pkg.image if pkg else ""),
            })
        return result


class VegetableCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        from inventory.models import VegetableCategory
        model = VegetableCategory
        fields = [
            'id', 'parent', 'name', 'slug', 'description', 'image',
            'sort_order', 'is_active', 'unit_of_measurement', 'status', 'source',
        ]
        extra_kwargs = {
            'slug': {'required': False},
            'status': {'required': False},
            'source': {'required': False},
            'parent': {'required': False, 'allow_null': True},
            'unit_of_measurement': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        parent = attrs.get('parent')
        instance = getattr(self, 'instance', None)

        if parent:
            if instance and parent.id == instance.id:
                raise serializers.ValidationError({"parent": "A category cannot be its own parent."})

            # Cycle prevention
            curr = parent
            visited = set()
            while curr is not None:
                if instance and curr.id == instance.id:
                    raise serializers.ValidationError({"parent": "Cannot set a category as a descendant of itself (cycle detected)."})
                if curr.id in visited:
                    break
                visited.add(curr.id)
                curr = curr.parent

        return attrs


class VegetableApprovalItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True, default="Uncategorized")
    category_slug = serializers.CharField(source="category.slug", read_only=True, default="")
    category_parent_name = serializers.CharField(source="category.parent.name", read_only=True, default=None)
    category_full_path = serializers.CharField(source="category.full_path", read_only=True, default="Uncategorized")
    category_unit_of_measurement = serializers.CharField(source="category.unit_of_measurement", read_only=True, default=None)
    category_unit_of_measurement_display = serializers.CharField(source="category.get_unit_of_measurement_display", read_only=True, default=None)
    category_status = serializers.CharField(source="category.status", read_only=True, default="PENDING")
    price = serializers.SerializerMethodField()
    mrp = serializers.SerializerMethodField()
    pack_size = serializers.SerializerMethodField()
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        from inventory.models import Vegetable
        model = Vegetable
        fields = [
            'id', 'name', 'sku', 'unit', 'image', 'status', 'source',
            'category', 'category_name', 'category_slug', 'category_parent_name', 'category_full_path',
            'category_unit_of_measurement', 'category_unit_of_measurement_display', 'category_status',
            'price', 'mrp', 'pack_size',
            'requested_by', 'requested_by_name', 'requested_at',
            'rejection_reason', 'is_resubmission',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'created_at', 'updated_at',
        ]

    def get_price(self, obj):
        if obj.package:
            return str(obj.package.base_price)
        return "0.00"

    def get_mrp(self, obj):
        if obj.package and obj.package.offer_price:
            return str(obj.package.offer_price)
        return None

    def get_pack_size(self, obj):
        if obj.package and obj.package.duration:
            return obj.package.duration
        return obj.unit or "500g"

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username or obj.requested_by.email
        return "Vendor / Admin"

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username or obj.reviewed_by.email
        return None


class ApprovalActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["APPROVE", "REJECT"])
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, data):
        if data["action"] == "REJECT" and not data.get("rejection_reason", "").strip():
            raise serializers.ValidationError({"rejection_reason": "Rejection reason is required when rejecting a request."})
        return data


class SingleCatalogRequestSerializer(serializers.Serializer):
    request_type = serializers.ChoiceField(choices=["category", "vegetable", "category_with_vegetable"], default="vegetable")
    # Category fields
    parent_id = serializers.IntegerField(required=False, allow_null=True)
    category_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    category_slug = serializers.CharField(required=False, allow_blank=True)
    category_description = serializers.CharField(required=False, allow_blank=True)
    category_image = serializers.CharField(required=False, allow_blank=True)
    category_unit = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    # Vegetable / Produce fields
    vegetable_name = serializers.CharField(required=False, allow_blank=True)
    vegetable_sku = serializers.CharField(required=False, allow_blank=True)
    vegetable_unit = serializers.CharField(required=False, allow_blank=True, allow_null=True, default="")
    price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    mrp = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    pack_size = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    pack_value = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    image_url = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    tag = serializers.CharField(required=False, allow_blank=True)
    # Resubmission reference (if vendor is resubmitting an existing rejected record)
    resubmit_id = serializers.IntegerField(required=False, allow_null=True)
    resubmit_type = serializers.ChoiceField(choices=["category", "vegetable"], required=False, allow_null=True)

    def validate(self, data):
        price = data.get("price")
        mrp = data.get("mrp")
        if price is not None and mrp is not None:
            if price > mrp:
                raise serializers.ValidationError({"price": "Selling price cannot exceed MRP."})
            if price < 0 or mrp < 0:
                raise serializers.ValidationError({"price": "Prices cannot be negative."})
        return data


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


class VegetableClaimListSerializer(serializers.ModelSerializer):
    vegetable_name = serializers.CharField(source="vegetable.name", read_only=True)
    vegetable_sku = serializers.CharField(source="vegetable.sku", read_only=True)
    vegetable_image = serializers.SerializerMethodField()
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    quantity_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()

    class Meta:
        from inventory.models import VegetableClaim
        model = VegetableClaim
        fields = [
            "id", "claim_number", "vegetable", "vegetable_name", "vegetable_sku", "vegetable_image",
            "reason", "reason_label", "quantity_grams", "quantity_display", "estimated_loss_amount",
            "status", "status_label", "stock_movement", "created_by", "created_by_name",
            "approved_by", "approved_by_name", "created_at", "resolved_at",
        ]

    def get_vegetable_image(self, obj):
        if obj.vegetable:
            if obj.vegetable.image:
                return obj.vegetable.image
            if obj.vegetable.package and obj.vegetable.package.image:
                return obj.vegetable.package.image
        return "/mockups/vegetables_realistic.png"

    def get_quantity_display(self, obj):
        from inventory.utils.unit_conversion import format_grams_for_display
        return format_grams_for_display(obj.quantity_grams)

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        name = getattr(obj.created_by, "get_full_name", lambda: "")()
        return name or getattr(obj.created_by, "username", "")

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return None
        name = getattr(obj.approved_by, "get_full_name", lambda: "")()
        return name or getattr(obj.approved_by, "username", "")


class VegetableClaimDetailSerializer(serializers.ModelSerializer):
    vegetable_name = serializers.CharField(source="vegetable.name", read_only=True)
    vegetable_sku = serializers.CharField(source="vegetable.sku", read_only=True)
    vegetable_image = serializers.SerializerMethodField()
    current_stock_grams = serializers.IntegerField(source="vegetable.stock_quantity_grams", read_only=True)
    current_stock_display = serializers.SerializerMethodField()
    reason_label = serializers.CharField(source="get_reason_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    quantity_display = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    stock_movement_detail = serializers.SerializerMethodField()

    class Meta:
        from inventory.models import VegetableClaim
        model = VegetableClaim
        fields = [
            "id", "claim_number", "vegetable", "vegetable_name", "vegetable_sku", "vegetable_image",
            "current_stock_grams", "current_stock_display",
            "reason", "reason_label", "quantity_grams", "quantity_display", "estimated_loss_amount",
            "status", "status_label", "stock_movement", "stock_movement_detail", "notes",
            "created_by", "created_by_name", "approved_by", "approved_by_name",
            "created_at", "resolved_at",
        ]

    def get_vegetable_image(self, obj):
        if obj.vegetable:
            if obj.vegetable.image:
                return obj.vegetable.image
            if obj.vegetable.package and obj.vegetable.package.image:
                return obj.vegetable.package.image
        return "/mockups/vegetables_realistic.png"

    def get_quantity_display(self, obj):
        from inventory.utils.unit_conversion import format_grams_for_display
        return format_grams_for_display(obj.quantity_grams)

    def get_current_stock_display(self, obj):
        from inventory.utils.unit_conversion import format_grams_for_display
        return format_grams_for_display(obj.vegetable.stock_quantity_grams or 0)

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return ""
        name = getattr(obj.created_by, "get_full_name", lambda: "")()
        return name or getattr(obj.created_by, "username", "")

    def get_approved_by_name(self, obj):
        if not obj.approved_by:
            return None
        name = getattr(obj.approved_by, "get_full_name", lambda: "")()
        return name or getattr(obj.approved_by, "username", "")

    def get_stock_movement_detail(self, obj):
        if not obj.stock_movement:
            return None
        return {
            "id": obj.stock_movement.id,
            "movement_type": obj.stock_movement.movement_type,
            "delta_grams": obj.stock_movement.delta_grams,
            "balance_after_grams": obj.stock_movement.balance_after_grams,
            "reason": obj.stock_movement.reason,
            "created_at": obj.stock_movement.created_at.isoformat() if obj.stock_movement.created_at else None,
        }


class VegetableClaimCreateSerializer(serializers.Serializer):
    vegetable_id = serializers.IntegerField(required=True)
    reason = serializers.ChoiceField(choices=[
        ("WAREHOUSE_SPOILAGE", "Warehouse Spoilage / Rot"),
        ("TRANSIT_DAMAGE", "Transit / Delivery Damage"),
        ("QC_FAILURE", "QC / Inspection Failure"),
        ("EXPIRED", "Shelf Life Expired"),
        ("INVENTORY_DISCREPANCY", "Stock Discrepancy / Missing"),
        ("OTHER", "Other"),
    ])
    quantity = serializers.FloatField(required=True)
    unit = serializers.ChoiceField(choices=["g", "kg", "grams", "kilograms"], default="kg")
    estimated_loss_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class VegetableClaimActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["APPROVE", "REJECT", "RESOLVE"])
    notes = serializers.CharField(required=False, allow_blank=True, default="")



