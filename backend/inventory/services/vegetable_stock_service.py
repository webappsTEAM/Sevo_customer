"""
backend/inventory/services/vegetable_stock_service.py

Service layer for company-scoped Vegetable Stock management, daily 4 AM reset,
self-healing lazy reset, atomic deadlock-free booking reservations, and cancellation restoration.
All stock maths operate strictly on integer grams.
"""
import logging
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.exceptions import ValidationError

from inventory.models import Vegetable, VegetableStockMovement
from inventory.utils.unit_conversion import to_grams

logger = logging.getLogger(__name__)


def _safe_get_product_stock_item(product):
    try:
        return getattr(product, "stock_item", None)
    except ObjectDoesNotExist:
        return None


class InsufficientStockError(Exception):
    """
    Raised when requested stock exceeds available live stock during booking reservation.
    Only contains product_name and requested_grams — never exposes available_grams.
    """
    def __init__(self, product_name: str, requested_grams: int):
        self.product_name = product_name
        self.requested_grams = requested_grams
        super().__init__(f"Insufficient stock for {product_name}: requested {requested_grams}g.")


@transaction.atomic
def add_stock(product, quantity, unit, company, entered_by_user=None) -> Vegetable:
    """
    ADDITIVE RESTOCK.
    Adds converted grams to the live stock_quantity_grams.
    Creates and links the Vegetable if one does not exist yet.
    Logs VegetableStockMovement (RESTOCK).
    """
    grams_to_add = to_grams(quantity, unit)
    
    # Resolve linked Vegetable or create one
    item = _safe_get_product_stock_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=0,
            default_daily_quantity_grams=None,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
    else:
        # Lock item row for update
        item = Vegetable.objects.select_for_update().get(id=item.id)

    current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
    new_stock = current_stock + grams_to_add
    item.stock_quantity_grams = new_stock
    if unit:
        item.unit = unit
    item.save(update_fields=["stock_quantity_grams", "unit"])

    VegetableStockMovement.objects.create(
        org=company,
        vegetable=item,
        movement_type=VegetableStockMovement.MovementType.RESTOCK,
        delta_grams=grams_to_add,
        balance_after_grams=new_stock,
        reason=f"Restocked {quantity} {unit}",
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def adjust_stock(product, quantity, unit, reason: str, company, entered_by_user=None) -> Vegetable:
    """
    ABSOLUTE SET (Manual Correction).
    Sets stock_quantity_grams to the exact converted value. Reason is required.
    Logs VegetableStockMovement (ADJUSTMENT) with computed delta and reason.
    """
    if not reason or not reason.strip():
        raise ValueError("Reason is required for manual stock adjustment.")

    target_grams = to_grams(quantity, unit, allow_zero=True)
    item = _safe_get_product_stock_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=target_grams,
            default_daily_quantity_grams=None,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
        delta = target_grams
    else:
        item = Vegetable.objects.select_for_update().get(id=item.id)
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        delta = target_grams - current_stock
        item.stock_quantity_grams = target_grams
        if unit:
            item.unit = unit
        item.save(update_fields=["stock_quantity_grams", "unit"])

    VegetableStockMovement.objects.create(
        org=company,
        vegetable=item,
        movement_type=VegetableStockMovement.MovementType.ADJUSTMENT,
        delta_grams=delta,
        balance_after_grams=target_grams,
        reason=reason.strip(),
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def set_default_daily_quantity(product, quantity, unit, company, entered_by_user=None, apply_now: bool = False) -> Vegetable:
    """
    Sets default_daily_quantity_grams as a baseline restock capacity / reference level.
    Stock remains strictly persistent and only changes via explicit Restock, Adjustment, Sale, or Cancellation.
    """
    if quantity is None or quantity == "":
        default_grams = None
    else:
        default_grams = to_grams(quantity, unit, allow_zero=True)

    item = _safe_get_product_stock_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=None,
            default_daily_quantity_grams=default_grams,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
        return item

    item = Vegetable.objects.select_for_update().get(id=item.id)
    item.default_daily_quantity_grams = default_grams
    if unit:
        item.unit = unit
    item.save(update_fields=["default_daily_quantity_grams", "unit"])

    return item


@transaction.atomic
def reserve_stock_for_booking_items(items: list, company, booking_ref: str) -> None:
    """
    items: list of dicts: {"product": Package, "quantity": numeric/str, "unit": 'kg'|'g'}
    Atomic, deadlock-free reservation:
    1. Collects tracked stock_item ids, sorts them ascending.
    2. Locks all tracked items via select_for_update().filter(id__in=sorted_ids).order_by('id').
    3. Validates that every tracked item has stock_quantity_grams >= requested_grams.
       If ANY fails, raises InsufficientStockError (rolling back transaction).
    4. Deducts stock_quantity_grams and logs one VegetableStockMovement (SOLD) per tracked item with real booking_ref.
    """
    if not items or not booking_ref:
        return

    # Parse and validate line item requests
    parsed_requests = []
    item_ids_to_lock = set()

    for entry in items:
        prod = entry.get("product")
        if not prod:
            continue
        stock_item = _safe_get_product_stock_item(prod)
        if stock_item is None:
            continue
        qty = entry.get("quantity")
        if qty is None or qty == "":
            raise ValidationError(
                f"Missing quantity for product '{getattr(prod, 'name', 'Unknown')}'."
            )
        try:
            req_grams = to_grams(qty, entry.get("unit", "g"))
        except (ValueError, TypeError):
            continue

        item_ids_to_lock.add(stock_item.id)
        parsed_requests.append({
            "product": prod,
            "stock_item_id": stock_item.id,
            "requested_grams": req_grams,
        })

    if not parsed_requests:
        return

    # Deadlock-free locking: sorted ascending by ID
    sorted_ids = sorted(list(item_ids_to_lock))
    locked_items = {
        item.id: item
        for item in Vegetable.objects.select_for_update().filter(id__in=sorted_ids).order_by("id")
    }

    # Aggregate requested grams per vegetable item in case multi-line entries reference same product
    aggregated_requested = {}
    for req in parsed_requests:
        sid = req["stock_item_id"]
        aggregated_requested[sid] = aggregated_requested.get(sid, 0) + req["requested_grams"]

    # Validate availability for ALL items
    for req in parsed_requests:
        sid = req["stock_item_id"]
        item = locked_items[sid]
        avail = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        total_needed = aggregated_requested[sid]
        if avail < total_needed:
            raise InsufficientStockError(
                product_name=req["product"].name,
                requested_grams=req["requested_grams"],
            )

    # All pass: deduct stock and record SOLD stock movements
    for req in parsed_requests:
        sid = req["stock_item_id"]
        item = locked_items[sid]
        grams_sold = req["requested_grams"]
        new_balance = item.stock_quantity_grams - grams_sold
        item.stock_quantity_grams = new_balance
        item.save(update_fields=["stock_quantity_grams"])

        VegetableStockMovement.objects.create(
            org=company,
            vegetable=item,
            movement_type=VegetableStockMovement.MovementType.SOLD,
            delta_grams=-grams_sold,
            balance_after_grams=new_balance,
            reason=f"Sold {grams_sold}g in booking {booking_ref}",
            booking_ref=booking_ref,
        )


@transaction.atomic
def release_stock_for_booking(service_request) -> None:
    """
    Restores stock upon booking cancellation or rejection.
    Idempotent: checks no prior RESTOCKED_ON_CANCELLATION movement exists for this booking_ref.
    Restores exact grams deducted during booking for all tracked items.
    """
    booking_ref = service_request.request_id
    if not booking_ref:
        return

    company = service_request.company

    # Check for already restored
    already_restored = VegetableStockMovement.objects.filter(
        booking_ref=booking_ref,
        movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
    ).exists()

    if already_restored:
        return

    # Find all SOLD movements for this booking_ref
    sold_movements = list(VegetableStockMovement.objects.filter(
        booking_ref=booking_ref,
        movement_type=VegetableStockMovement.MovementType.SOLD,
    ).select_related("vegetable"))

    if not sold_movements:
        return

    # Lock affected items in ascending order
    veg_ids = sorted(list({sm.vegetable_id for sm in sold_movements}))
    locked_items = {
        item.id: item
        for item in Vegetable.objects.select_for_update().filter(id__in=veg_ids).order_by("id")
    }

    for sm in sold_movements:
        item = locked_items[sm.vegetable_id]
        restored_grams = abs(sm.delta_grams)
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        new_stock = current_stock + restored_grams
        item.stock_quantity_grams = new_stock
        item.save(update_fields=["stock_quantity_grams"])

        VegetableStockMovement.objects.create(
            org=company,
            vegetable=item,
            movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
            delta_grams=restored_grams,
            balance_after_grams=new_stock,
            reason=f"Restored {restored_grams}g upon cancellation of booking {booking_ref}",
            booking_ref=booking_ref,
        )
