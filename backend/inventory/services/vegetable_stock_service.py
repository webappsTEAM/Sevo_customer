"""
backend/inventory/services/vegetable_stock_service.py

Service layer for company-scoped Vegetable Stock management, daily 4 AM reset,
self-healing lazy reset, atomic deadlock-free booking reservations, and cancellation restoration.
Supports both WEIGHT (grams/kg) and COUNT (discrete pieces/bunches/dozen) stock bases.
"""
import logging
from django.db import transaction
from django.utils import timezone
from django.conf import settings
from rest_framework.exceptions import ValidationError

from inventory.models import Vegetable, VegetableStockMovement
from inventory.utils.unit_conversion import (
    to_base_units,
    unit_basis_for_unit,
    format_stock_for_display,
    UnitBasis,
)

logger = logging.getLogger(__name__)


class InsufficientStockError(Exception):
    """
    Raised when requested stock exceeds available live stock during booking reservation.
    Only contains product_name and requested_units — never exposes available_units.
    """
    def __init__(self, product_name: str, requested_units: int, unit_basis: str = UnitBasis.WEIGHT, unit_label: str = "g"):
        self.product_name = product_name
        self.requested_units = requested_units
        self.requested_grams = requested_units  # Backward-compatible attribute
        self.unit_basis = unit_basis
        self.unit_label = unit_label
        formatted_req = format_stock_for_display(requested_units, unit_basis=unit_basis, unit=unit_label)
        super().__init__(f"Insufficient stock for {product_name}: requested {formatted_req}.")


def _resolve_vegetable_item(product):
    """
    Safely resolves the linked Vegetable model instance for a Package.
    Checks reverse OneToOne 'vegetable_stock', direct attribute 'stock_item', and fallback DB query.
    """
    if not product:
        return None
    if isinstance(product, Vegetable):
        return product
    if hasattr(product, "vegetable_stock"):
        try:
            return product.vegetable_stock
        except Exception:
            pass
    stock_item = getattr(product, "stock_item", None)
    if isinstance(stock_item, Vegetable):
        return stock_item
    return Vegetable.objects.filter(package=product).first()


@transaction.atomic
def add_stock(product, quantity, unit, company, entered_by_user=None) -> Vegetable:
    """
    ADDITIVE RESTOCK.
    Adds converted base units (grams for WEIGHT, pieces for COUNT) to live stock.
    Creates and links the Vegetable if one does not exist yet.
    Logs VegetableStockMovement (RESTOCK).
    """
    basis = unit_basis_for_unit(unit)
    units_to_add = to_base_units(quantity, unit, unit_basis=basis)
    
    # Resolve linked Vegetable or create one
    item = _resolve_vegetable_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit_basis=basis,
            unit=unit or ("pcs" if basis == UnitBasis.COUNT else "g"),
            stock_quantity_grams=0,
            default_daily_quantity_grams=None,
        )
        if hasattr(product, "stock_item_id"):
            product.stock_item = item
            product.save(update_fields=["stock_item"])
    else:
        item = Vegetable.objects.select_for_update().get(id=item.id)
        if item.unit_basis and basis != item.unit_basis:
            raise ValidationError(
                f"Unit '{unit}' ({basis}) is not compatible with vegetable '{item.name}' ({item.unit_basis})."
            )

    current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
    new_stock = current_stock + units_to_add
    item.stock_quantity_grams = new_stock
    if unit:
        item.unit = unit
        item.unit_basis = unit_basis_for_unit(unit)
    item.save(update_fields=["stock_quantity_grams", "unit", "unit_basis"])

    VegetableStockMovement.objects.create(
        org=company,
        vegetable=item,
        movement_type=VegetableStockMovement.MovementType.RESTOCK,
        unit_basis=item.unit_basis,
        unit_label=item.unit,
        delta_grams=units_to_add,
        balance_after_grams=new_stock,
        reason=f"Restocked {quantity} {unit}",
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def adjust_stock(product, quantity, unit, reason: str, company, entered_by_user=None) -> Vegetable:
    """
    ABSOLUTE SET (Manual Correction).
    Sets stock to the exact converted base units. Reason is required.
    Logs VegetableStockMovement (ADJUSTMENT) with computed delta and reason.
    """
    if not reason or not str(reason).strip():
        raise ValueError("Reason is required for manual stock adjustment.")

    basis = unit_basis_for_unit(unit)
    target_units = to_base_units(quantity, unit, allow_zero=True, unit_basis=basis)
    item = _resolve_vegetable_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit_basis=basis,
            unit=unit or ("pcs" if basis == UnitBasis.COUNT else "g"),
            stock_quantity_grams=target_units,
            default_daily_quantity_grams=None,
        )
        if hasattr(product, "stock_item_id"):
            product.stock_item = item
            product.save(update_fields=["stock_item"])
        delta = target_units
    else:
        item = Vegetable.objects.select_for_update().get(id=item.id)
        if item.unit_basis and basis != item.unit_basis:
            raise ValidationError(
                f"Unit '{unit}' ({basis}) is not compatible with vegetable '{item.name}' ({item.unit_basis})."
            )
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        delta = target_units - current_stock
        item.stock_quantity_grams = target_units
        if unit:
            item.unit = unit
            item.unit_basis = unit_basis_for_unit(unit)
        item.save(update_fields=["stock_quantity_grams", "unit", "unit_basis"])

    VegetableStockMovement.objects.create(
        org=company,
        vegetable=item,
        movement_type=VegetableStockMovement.MovementType.ADJUSTMENT,
        unit_basis=item.unit_basis,
        unit_label=item.unit,
        delta_grams=delta,
        balance_after_grams=target_units,
        reason=str(reason).strip(),
        entered_by=entered_by_user,
    )

    return item


@transaction.atomic
def set_default_daily_quantity(product, quantity, unit, company, entered_by_user=None, apply_now: bool = False) -> Vegetable:
    """
    Sets default_daily_quantity_grams as a baseline restock capacity / reference level.
    Stock remains strictly persistent and only changes via explicit Restock, Adjustment, Sale, or Cancellation.
    """
    basis = unit_basis_for_unit(unit)
    if quantity is None or quantity == "":
        default_units = None
    else:
        default_units = to_base_units(quantity, unit, allow_zero=True, unit_basis=basis)

    item = _resolve_vegetable_item(product)
    if not item:
        item = Vegetable.objects.create(
            org=company,
            package=product,
            name=f"{product.name} (Produce)",
            sku=f"VEG-{product.slug.upper()[:20]}",
            unit_basis=basis,
            unit=unit or ("pcs" if basis == UnitBasis.COUNT else "g"),
            stock_quantity_grams=None,
            default_daily_quantity_grams=default_units,
        )
        if hasattr(product, "stock_item_id"):
            product.stock_item = item
            product.save(update_fields=["stock_item"])
        return item

    item = Vegetable.objects.select_for_update().get(id=item.id)
    if item.unit_basis and basis != item.unit_basis:
        raise ValidationError(
            f"Unit '{unit}' ({basis}) is not compatible with vegetable '{item.name}' ({item.unit_basis})."
        )
    item.default_daily_quantity_grams = default_units
    if unit:
        item.unit = unit
        item.unit_basis = unit_basis_for_unit(unit)
    item.save(update_fields=["default_daily_quantity_grams", "unit", "unit_basis"])

    return item


@transaction.atomic
def reserve_stock_for_booking_items(items: list, company=None, booking_ref: str = "") -> None:
    """
    items: list of dicts: {"product": Package, "quantity": numeric/str, "unit": 'kg'|'g'|'pcs'|'bunch'|'dozen'}
    Atomic, deadlock-free reservation:
    1. Collects tracked stock_item ids, sorts them ascending.
    2. Locks all tracked items via select_for_update().filter(id__in=sorted_ids).order_by('id').
    3. Validates that every tracked item has live stock >= requested units.
       If ANY fails, raises InsufficientStockError (rolling back transaction).
    4. Deducts stock and logs one VegetableStockMovement (SOLD) per tracked item with real booking_ref.
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
        stock_item = _resolve_vegetable_item(prod)
        if stock_item is None:
            continue
        qty = entry.get("quantity")
        if qty is None or qty == "":
            raise ValidationError(
                f"Missing quantity for product '{getattr(prod, 'name', 'Unknown')}'."
            )
        unit_str = entry.get("unit", stock_item.unit or "g")
        basis = stock_item.unit_basis or unit_basis_for_unit(unit_str)
        try:
            req_units = to_base_units(qty, unit_str, unit_basis=basis)
        except (ValueError, TypeError):
            continue

        item_ids_to_lock.add(stock_item.id)
        parsed_requests.append({
            "product": prod,
            "stock_item_id": stock_item.id,
            "requested_units": req_units,
            "unit_basis": basis,
            "unit_label": unit_str,
        })

    if not parsed_requests:
        return

    # Deadlock-free locking: sorted ascending by ID
    sorted_ids = sorted(list(item_ids_to_lock))
    locked_items = {
        item.id: item
        for item in Vegetable.objects.select_for_update().filter(id__in=sorted_ids).order_by("id")
    }

    # Aggregate requested units per vegetable item in case multi-line entries reference same product
    aggregated_requested = {}
    for req in parsed_requests:
        sid = req["stock_item_id"]
        aggregated_requested[sid] = aggregated_requested.get(sid, 0) + req["requested_units"]

    # Validate availability for ALL items
    for req in parsed_requests:
        sid = req["stock_item_id"]
        item = locked_items[sid]
        avail = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        total_needed = aggregated_requested[sid]
        if avail < total_needed:
            raise InsufficientStockError(
                product_name=req["product"].name,
                requested_units=req["requested_units"],
                unit_basis=item.unit_basis,
                unit_label=item.unit,
            )

    # All pass: deduct stock and record SOLD stock movements
    for req in parsed_requests:
        sid = req["stock_item_id"]
        item = locked_items[sid]
        units_sold = req["requested_units"]
        new_balance = item.stock_quantity_grams - units_sold
        item.stock_quantity_grams = new_balance
        item.save(update_fields=["stock_quantity_grams"])

        display_qty = format_stock_for_display(units_sold, unit_basis=item.unit_basis, unit=item.unit)
        org_inst = company or getattr(item, "org", None)
        VegetableStockMovement.objects.create(
            org=org_inst,
            vegetable=item,
            movement_type=VegetableStockMovement.MovementType.SOLD,
            unit_basis=item.unit_basis,
            unit_label=item.unit,
            delta_grams=-units_sold,
            balance_after_grams=new_balance,
            reason=f"Sold {display_qty} in booking {booking_ref}",
            booking_ref=booking_ref,
        )


@transaction.atomic
def release_stock_for_booking(service_request) -> None:
    """
    Restores stock upon booking cancellation or rejection.
    Idempotent: checks no prior RESTOCKED_ON_CANCELLATION movement exists for this booking_ref.
    Restores exact base units deducted during booking for all tracked items.
    """
    booking_ref = getattr(service_request, "request_id", "") or getattr(service_request, "order_number", "")
    if not booking_ref:
        return

    company = getattr(service_request, "company", None) or getattr(service_request, "org", None)
    if not company and hasattr(service_request, "customer"):
        company = getattr(service_request.customer, "company", None)

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
        restored_units = abs(sm.delta_grams)
        current_stock = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
        new_stock = current_stock + restored_units
        item.stock_quantity_grams = new_stock
        item.save(update_fields=["stock_quantity_grams"])

        display_restored = format_stock_for_display(restored_units, unit_basis=item.unit_basis, unit=item.unit)
        VegetableStockMovement.objects.create(
            org=item.org,
            vegetable=item,
            movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION,
            unit_basis=item.unit_basis,
            unit_label=item.unit,
            delta_grams=restored_units,
            balance_after_grams=new_stock,
            reason=f"Restored {display_restored} upon cancellation of booking {booking_ref}",
            booking_ref=booking_ref,
        )


@transaction.atomic
def process_return_stock_resolution(vegetable_return, restock_item: bool = False, entered_by=None) -> VegetableStockMovement | None:
    """
    Processes stock consequences for resolved VegetableReturn.
    - Idempotent: If return is already linked to a stock_movement, returns it.
    - If resolution_action == REPLACEMENT:
        Validates that available stock >= required units.
        Raises ValidationError if insufficient stock to fulfill replacement.
        Deducts units and creates VegetableStockMovement (RETURN_REPLACEMENT).
    - If resolution_action == REFUND:
        - If restock_item is True: adds units back to stock and creates VegetableStockMovement (RESTOCKED_ON_RETURN).
        - If restock_item is False: leaves live stock unchanged and logs write-off loss as VegetableStockMovement (RETURN_WRITEOFF).
    Links created stock movement to vegetable_return.stock_movement.
    """
    if not vegetable_return:
        return None

    if vegetable_return.stock_movement:
        return vegetable_return.stock_movement

    action = vegetable_return.resolution_action
    if action not in ["REPLACEMENT", "REFUND"]:
        return None

    # Resolve package and quantity
    package = None
    quantity_units = 0
    if vegetable_return.item:
        package = vegetable_return.item.package
        quantity_units = vegetable_return.item.quantity_base_units
    elif vegetable_return.order:
        first_item = vegetable_return.order.items.select_related("package").first()
        if first_item:
            package = first_item.package
            quantity_units = sum(it.quantity_base_units for it in vegetable_return.order.items.all())

    if not package or quantity_units <= 0:
        return None

    # Resolve linked Vegetable
    veg = getattr(package, "stock_item", None)
    if not veg:
        veg = Vegetable.objects.filter(package=package).first()
    if not veg:
        veg = Vegetable.objects.filter(name=package.name).first()

    if not veg:
        return None

    # Lock vegetable row
    veg = Vegetable.objects.select_for_update().get(id=veg.id)
    current_stock = veg.stock_quantity_grams if veg.stock_quantity_grams is not None else 0
    company = veg.org
    order_number = vegetable_return.order.order_number if vegetable_return.order else ""
    ret_number = vegetable_return.return_number

    qty_display = format_stock_for_display(quantity_units, unit_basis=veg.unit_basis, unit=veg.unit)
    stock_display = format_stock_for_display(current_stock, unit_basis=veg.unit_basis, unit=veg.unit)

    if action == "REPLACEMENT":
        if current_stock < quantity_units:
            raise ValidationError(
                f"Insufficient stock to fulfill replacement for '{veg.name}': "
                f"required {qty_display}, but only {stock_display} available in live inventory."
            )

        new_stock = current_stock - quantity_units
        veg.stock_quantity_grams = new_stock
        veg.save(update_fields=["stock_quantity_grams"])

        movement = VegetableStockMovement.objects.create(
            org=company,
            vegetable=veg,
            movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT,
            unit_basis=veg.unit_basis,
            unit_label=veg.unit,
            delta_grams=-quantity_units,
            balance_after_grams=new_stock,
            reason=f"Replacement dispatched for return {ret_number} (Order {order_number})",
            booking_ref=order_number,
            entered_by=entered_by,
        )
        vegetable_return.stock_movement = movement
        vegetable_return.save(update_fields=["stock_movement"])
        return movement

    elif action == "REFUND":
        if restock_item:
            new_stock = current_stock + quantity_units
            veg.stock_quantity_grams = new_stock
            veg.save(update_fields=["stock_quantity_grams"])

            movement = VegetableStockMovement.objects.create(
                org=company,
                vegetable=veg,
                movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_RETURN,
                unit_basis=veg.unit_basis,
                unit_label=veg.unit,
                delta_grams=quantity_units,
                balance_after_grams=new_stock,
                reason=f"Restocked {qty_display} on return {ret_number} (Order {order_number})",
                booking_ref=order_number,
                entered_by=entered_by,
            )
            vegetable_return.stock_movement = movement
            vegetable_return.save(update_fields=["stock_movement"])
            return movement
        else:
            movement = VegetableStockMovement.objects.create(
                org=company,
                vegetable=veg,
                movement_type=VegetableStockMovement.MovementType.RETURN_WRITEOFF,
                unit_basis=veg.unit_basis,
                unit_label=veg.unit,
                delta_grams=0,
                balance_after_grams=current_stock,
                reason=f"Return {ret_number} write-off ({qty_display} spoiled/damaged): {vegetable_return.get_reason_display()}",
                booking_ref=order_number,
                entered_by=entered_by,
            )
            vegetable_return.stock_movement = movement
            vegetable_return.save(update_fields=["stock_movement"])
            return movement

    return None
