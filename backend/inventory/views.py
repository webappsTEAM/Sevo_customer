from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsAdminRole
from common.drf import CompanyScopedQuerysetMixin
from common.permissions import HasCompany, IsCompanyMember
from inventory.models import InventoryItem, InventoryAlert, InventoryTransfer
from inventory.serializers import (
    InventoryItemSerializer, InventoryAlertSerializer, InventoryTransferSerializer
)


class StandardResponseMixin:
    def success_response(self, data=None, message="", status_code=status.HTTP_200_OK):
        return Response({
            "success": True,
            "data": data if data is not None else {},
            "message": message
        }, status=status_code)

    def error_response(self, message, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({
            "success": False,
            "message": message
        }, status=status_code)


class InventoryItemViewSet(CompanyScopedQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCompany, IsAdminRole, IsCompanyMember]
    serializer_class = InventoryItemSerializer
    queryset = InventoryItem.objects.all()
    company_field = "org"

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return self.success_response(data=serializer.data, message="Item created successfully", status_code=status.HTTP_201_CREATED)
        return self.error_response(message=str(serializer.errors))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return self.success_response(data=serializer.data, message="Item updated successfully")
        return self.error_response(message=str(serializer.errors))

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return self.success_response(message="Item deleted successfully")


class InventoryAlertViewSet(CompanyScopedQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCompany, IsAdminRole, IsCompanyMember]
    serializer_class = InventoryAlertSerializer
    queryset = InventoryAlert.objects.all()
    company_field = "org"

    def get_queryset(self):
        return super().get_queryset().filter(is_resolved=False)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save(update_fields=['is_resolved'])
        return self.success_response(message="Alert resolved successfully")


class InventoryTransferViewSet(CompanyScopedQuerysetMixin, StandardResponseMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCompany, IsAdminRole, IsCompanyMember]
    serializer_class = InventoryTransferSerializer
    queryset = InventoryTransfer.objects.all()
    company_field = "org"

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return self.success_response(data=serializer.data)
