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

from inventory.models import InventoryItem, StockMovement
from inventory.utils.unit_conversion import to_grams

logger = logging.getLogger(__name__)


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
def add_stock(product, quantity, unit, company, entered_by_user=None) -> InventoryItem:
    """
    ADDITIVE RESTOCK.
    Adds converted grams to the live stock_quantity_grams.
    Creates and links the InventoryItem if one does not exist yet.
    Logs StockMovement (RESTOCK).
    """
    grams_to_add = to_grams(quantity, unit)
    
    # Resolve linked InventoryItem or create one
    item = product.stock_item
    if not item:
        item = InventoryItem.objects.create(
            org=company,
            name=f"{product.name} (Produce)",
            category=InventoryItem.Category.CONSUMABLE,
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=0,
            default_daily_quantity_grams=None,
            total_quantity=0,
            available_quantity=0,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
    else:
        # Lock item row for update
        item = InventoryItem.objects.select_for_update().get(id=item.id)

    current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
    new_stock = current_stock + grams_to_add
    item.stock_quantity_grams = new_stock
    if unit:
        item.unit = unit
    item.save(update_fields=["stock_quantity_grams", "unit"])

    StockMovement.objects.create(
        org=company,
        item=item,
        movement_type=StockMovement.MovementType.RESTOCK,
        delta_grams=grams_to_add,
        balance_after_grams=new_stock,
        reason=f"Restocked {quantity} {unit}",
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def adjust_stock(product, quantity, unit, reason: str, company, entered_by_user=None) -> InventoryItem:
    """
    ABSOLUTE SET (Manual Correction).
    Sets stock_quantity_grams to the exact converted value. Reason is required.
    Logs StockMovement (ADJUSTMENT) with computed delta and reason.
    """
    if not reason or not str(reason).strip():
        raise ValueError("Reason is required for manual stock adjustment.")

    target_grams = to_grams(quantity, unit, allow_zero=True)
    item = product.stock_item
    if not item:
        item = InventoryItem.objects.create(
            org=company,
            name=f"{product.name} (Produce)",
            category=InventoryItem.Category.CONSUMABLE,
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=target_grams,
            default_daily_quantity_grams=None,
            total_quantity=0,
            available_quantity=0,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
        delta = target_grams
    else:
        item = InventoryItem.objects.select_for_update().get(id=item.id)
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        delta = target_grams - current_stock
        item.stock_quantity_grams = target_grams
        if unit:
            item.unit = unit
        item.save(update_fields=["stock_quantity_grams", "unit"])

    StockMovement.objects.create(
        org=company,
        item=item,
        movement_type=StockMovement.MovementType.ADJUSTMENT,
        delta_grams=delta,
        balance_after_grams=target_grams,
        reason=str(reason).strip(),
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def set_default_daily_quantity(product, quantity, unit, company, entered_by_user=None, apply_now: bool = False) -> InventoryItem:
    """
    Sets default_daily_quantity_grams.
    If apply_now is True, immediately applies daily reset for today.
    """
    if quantity is None or quantity == "":
        default_grams = None
    else:
        default_grams = to_grams(quantity, unit, allow_zero=True)

    item = product.stock_item
    if not item:
        item = InventoryItem.objects.create(
            org=company,
            name=f"{product.name} (Produce)",
            category=InventoryItem.Category.CONSUMABLE,
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit=unit or "g",
            stock_quantity_grams=default_grams if apply_now else None,
            default_daily_quantity_grams=default_grams,
            last_reset_date=timezone.localdate() if (apply_now and default_grams is not None) else None,
            total_quantity=0,
            available_quantity=0,
        )
        product.stock_item = item
        product.save(update_fields=["stock_item"])
        if apply_now and default_grams is not None:
            StockMovement.objects.create(
                org=company,
                item=item,
                movement_type=StockMovement.MovementType.DAILY_RESET,
                delta_grams=default_grams,
                balance_after_grams=default_grams,
                reason="Immediate daily reset upon setting default stock",
                entered_by=entered_by_user,
            )
        return item

    item = InventoryItem.objects.select_for_update().get(id=item.id)
    item.default_daily_quantity_grams = default_grams
    if unit:
        item.unit = unit
    item.save(update_fields=["default_daily_quantity_grams", "unit"])

    if apply_now and default_grams is not None:
        apply_daily_reset(item, company, entered_by=entered_by_user, force=True)
        item.refresh_from_db()

    return item


@transaction.atomic
def apply_daily_reset(item: InventoryItem, company, entered_by=None, force: bool = False) -> bool:
    """
    Applies the daily reset for an item to its default_daily_quantity_grams.
    IDEMPOTENT per business date: if last_reset_date == today, skips unless force=True.
    Skips if default_daily_quantity_grams is None.
    Logs StockMovement (DAILY_RESET).
    """
    if item.default_daily_quantity_grams is None:
        return False

    today = timezone.localdate()
    if not force and item.last_reset_date == today:
        return False

    # Lock row
    item = InventoryItem.objects.select_for_update().get(id=item.id)
    current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
    new_stock = item.default_daily_quantity_grams
    delta = new_stock - current_stock

    item.stock_quantity_grams = new_stock
    item.last_reset_date = today
    item.save(update_fields=["stock_quantity_grams", "last_reset_date"])

    StockMovement.objects.create(
        org=company,
        item=item,
        movement_type=StockMovement.MovementType.DAILY_RESET,
        delta_grams=delta,
        balance_after_grams=new_stock,
        reason=f"Daily reset to default capacity ({new_stock}g)",
        entered_by=entered_by,
    )
    return True


def ensure_daily_reset_applied(item: InventoryItem, company) -> None:
    """
    Lightweight self-healing check:
    If default_daily_quantity_grams is set AND last_reset_date < today (or None),
    applies the daily reset before proceeding.
    """
    if item and item.default_daily_quantity_grams is not None:
        today = timezone.localdate()
        if item.last_reset_date is None or item.last_reset_date < today:
            apply_daily_reset(item, company)


@transaction.atomic
def reserve_stock_for_booking_items(items: list, company, booking_ref: str) -> None:
    """
    items: list of dicts: {"product": Package, "quantity": numeric/str, "unit": 'kg'|'g'}
    Atomic, deadlock-free reservation:
    1. Collects tracked stock_item ids, sorts them ascending.
    2. Runs ensure_daily_reset_applied() on all tracked items.
    3. Locks all tracked items via select_for_update().filter(id__in=sorted_ids).order_by('id').
    4. Validates that every tracked item has stock_quantity_grams >= requested_grams.
       If ANY fails, raises InsufficientStockError (rolling back transaction).
    5. Deducts stock_quantity_grams and logs one StockMovement (SOLD) per tracked item with real booking_ref.
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
        qty = entry.get("quantity")
        if qty is None or qty == "":
            raise ValidationError(
                f"Missing quantity for product '{getattr(prod, 'name', 'Unknown')}'."
            )
        req_grams = to_grams(qty, entry.get("unit", "g"))
        stock_item = prod.stock_item
        if stock_item is not None:
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
        for item in InventoryItem.objects.select_for_update().filter(id__in=sorted_ids).order_by("id")
    }

    # First pass: ensure daily reset is applied for each locked item
    for item in locked_items.values():
        ensure_daily_reset_applied(item, company)
        # Reload locked item in case daily reset updated stock_quantity_grams
        item.refresh_from_db()

    # Aggregate requested grams per inventory item in case multi-line entries reference same product
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

        StockMovement.objects.create(
            org=company,
            item=item,
            movement_type=StockMovement.MovementType.SOLD,
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
    already_restored = StockMovement.objects.filter(
        booking_ref=booking_ref,
        movement_type=StockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
    ).exists()

    if already_restored:
        return

    # Find all SOLD movements for this booking_ref
    sold_movements = list(StockMovement.objects.filter(
        booking_ref=booking_ref,
        movement_type=StockMovement.MovementType.SOLD,
    ).select_related("item"))

    if not sold_movements:
        return

    # Lock affected items in ascending order
    item_ids = sorted(list({sm.item_id for sm in sold_movements}))
    locked_items = {
        item.id: item
        for item in InventoryItem.objects.select_for_update().filter(id__in=item_ids).order_by("id")
    }

    for sm in sold_movements:
        item = locked_items[sm.item_id]
        restored_grams = abs(sm.delta_grams)
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        new_stock = current_stock + restored_grams
        item.stock_quantity_grams = new_stock
        item.save(update_fields=["stock_quantity_grams"])

        StockMovement.objects.create(
            org=company,
            item=item,
            movement_type=StockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
            delta_grams=restored_grams,
            balance_after_grams=new_stock,
            reason=f"Restored {restored_grams}g upon cancellation of booking {booking_ref}",
            booking_ref=booking_ref,
        )
