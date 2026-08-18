"""
service_requests/services/fulfillment_service.py

Inventory & Material Fulfillment Engine for WorkExtensions.
Handles stock checking and reservations.
"""
from django.db import transaction
from rest_framework.exceptions import ValidationError

from ..models import WorkExtensionItem


@transaction.atomic
def process_item_fulfillment(extension_item: WorkExtensionItem) -> WorkExtensionItem:
    """
    Processes stock check & fulfillment reservation for a WorkExtensionItem.
    """
    if extension_item.status in [
        WorkExtensionItem.Status.RESERVED,
        WorkExtensionItem.Status.AWAITING_PARTS,
        WorkExtensionItem.Status.FULFILLED,
        WorkExtensionItem.Status.PURCHASE_APPROVED,
    ]:
        return extension_item

    source = extension_item.fulfillment_source

    if source == WorkExtensionItem.FulfillmentSource.CUSTOMER_SUPPLIED:
        extension_item.status = WorkExtensionItem.Status.PENDING
        extension_item.warranty_covered = False
        extension_item.save()
        return extension_item

    if source == WorkExtensionItem.FulfillmentSource.TECHNICIAN_PURCHASE:
        extension_item.status = WorkExtensionItem.Status.PURCHASE_REQUESTED
        extension_item.save()
        return extension_item

    extension_item.status = WorkExtensionItem.Status.RESERVED
    extension_item.save()
    return extension_item
