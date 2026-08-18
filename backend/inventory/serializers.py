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
            'is_returnable', 'created_at'
        ]
        read_only_fields = ['available_quantity', 'created_at']

    def create(self, validated_data):
        validated_data['available_quantity'] = validated_data.get('total_quantity', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'total_quantity' in validated_data:
            diff = validated_data['total_quantity'] - instance.total_quantity
            instance.available_quantity += diff
        return super().update(instance, validated_data)


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
