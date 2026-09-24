"""
backend/inventory/selectors/vegetable_stock_selectors.py

Selectors for vegetable stock status (customer and admin), and derived daily reporting.
Supports both WEIGHT (grams/kg) and COUNT (pieces/bunches/packets/dozen) unit bases.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.db.models import Sum, Q

from inventory.models import Vegetable, VegetableStockMovement
from inventory.utils.unit_conversion import (
    format_stock_for_display,
    format_grams_for_display,
    parse_pack_size,
    parse_pack_size_grams,
    UnitBasis,
)


def get_stock_status(product) -> Dict[str, Any]:
    """
    Customer-facing stock status: in_stock boolean and max_quantity unit cap.
    Never exposes exact gram/kg/piece numbers.
    - If stock_item is None -> genuinely not inventory-managed -> in_stock: True, max_quantity: None (unlimited)
    - If stock_item is not None (enrolled in inventory):
        - If stock_item.stock_quantity_grams is None or <= 0 -> in_stock: False, max_quantity: 0 (out of stock)
        - If stock_item.stock_quantity_grams > 0 -> in_stock: True, max_quantity: integer packs available
    """
    item = getattr(product, "vegetable_stock", None) or getattr(product, "stock_item", None)
    if not item and hasattr(product, "id") and product.id:
        try:
            item = getattr(product, "_cached_vegetable", None) or Vegetable.objects.filter(package=product).first()
        except Exception:
            item = None
    if not item:
        return {"in_stock": True, "max_quantity": None}

    live_units = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
    basis = getattr(item, "unit_basis", UnitBasis.WEIGHT) or UnitBasis.WEIGHT
    if live_units <= 0:
        return {
            "in_stock": False,
            "max_quantity": 0,
            "available_stock_display": format_stock_for_display(0, unit_basis=basis, unit=item.unit),
        }

    # Derive pack size base units from product.duration
    default_val = 1 if basis == UnitBasis.COUNT else 500
    unit_str = getattr(product, "duration", "") or (f"1 {item.unit or 'pcs'}" if basis == UnitBasis.COUNT else "500 g")
    pack_info = parse_pack_size(unit_str, default_val=default_val, default_basis=basis)
    pack_base_units = pack_info["base_units"]

    max_units = max(0, live_units // pack_base_units) if pack_base_units > 0 else 0
    return {
        "in_stock": max_units > 0,
        "max_quantity": max_units,
        "available_stock_display": format_stock_for_display(live_units, unit_basis=basis, unit=item.unit),
    }


def get_bulk_admin_stock_status(products: list, for_date: Optional[date] = None) -> Dict[int, Dict[str, Any]]:
    """
    Bulk optimized admin status selector to avoid N+1 queries across products:
    - opening stock (today's opening or for_date opening)
    - current stock (live available stock)
    - consumed stock (sold quantity on for_date/today)
    - restock level (default daily stock / replenishment amount)
    - reorder level (threshold warning)
    - price (base price / MRP)
    - offer_price & offer_percentage
    - vegetable_gram (pack size string e.g. "500 g", "1 kg", "1 pc")
    - unit_basis ("WEIGHT" / "COUNT")
    """
    if not products:
        return {}

    target_date = for_date or timezone.localdate()

    # Collect stock items that are present
    items = []
    item_by_prod_id = {}
    for prod in products:
        item = getattr(prod, "stock_item", None)
        if item:
            items.append(item)
            item_by_prod_id[prod.id] = item

    veg_ids = [item.id for item in items]

    # Pre-fetch target_date movements for all vegetable items in ONE query
    movements_by_veg: Dict[int, list] = {v_id: [] for v_id in veg_ids}
    if veg_ids:
        day_movements = VegetableStockMovement.objects.filter(
            vegetable_id__in=veg_ids,
            created_at__date=target_date,
        ).order_by("id")
        for m in day_movements:
            movements_by_veg[m.vegetable_id].append(m)

    # For items without target_date movements, find latest prior movement
    needed_prev_ids = [
        item.id for item in items
        if not movements_by_veg.get(item.id)
    ]
    prev_m_by_veg = {}
    if needed_prev_ids:
        prev_movements = VegetableStockMovement.objects.filter(
            vegetable_id__in=needed_prev_ids,
            created_at__date__lt=target_date,
        ).order_by("vegetable_id", "-created_at")
        for pm in prev_movements:
            if pm.vegetable_id not in prev_m_by_veg:
                prev_m_by_veg[pm.vegetable_id] = pm

    result = {}
    for prod in products:
        item = item_by_prod_id.get(prod.id)
        basis = getattr(item, "unit_basis", UnitBasis.WEIGHT) if item else UnitBasis.WEIGHT
        item_unit = getattr(item, "unit", "g") if item else "g"

        # Price & Offer % matching customer cards
        raw_base = float(prod.base_price or 0)
        raw_offer = float(prod.offer_price) if prod.offer_price is not None else None

        if raw_offer is not None and raw_offer > 0:
            if raw_offer > raw_base:
                selling_price = raw_base
                mrp_price = raw_offer
            else:
                selling_price = raw_offer
                mrp_price = raw_base
            
            offer_pct = round(((mrp_price - selling_price) / mrp_price) * 100) if mrp_price > 0 else 0
        else:
            selling_price = raw_base
            mrp_price = raw_base
            offer_pct = 0
            
            tag_val = getattr(prod, "tag", "") or ""
            if tag_val and "%" in tag_val:
                import re
                m = re.search(r"(\d+(?:\.\d+)?)\s*%", tag_val)
                if m:
                    offer_pct = round(float(m.group(1)))
                    if offer_pct > 0 and selling_price > 0:
                        mrp_price = round(selling_price / (1 - offer_pct / 100.0), 2)

        veg_gram = getattr(prod, "duration", "") or ("1 pc" if basis == UnitBasis.COUNT else "500 g")

        # Consumed Stock & Opening Stock Calculation from VegetableStockMovements
        consumed_units = 0
        opening_units = None

        if item:
            item_day_movements = movements_by_veg.get(item.id, [])
            if item_day_movements:
                earliest = item_day_movements[0]
                opening_units = earliest.balance_after_grams - earliest.delta_grams
                consumed_units = sum(abs(m.delta_grams) for m in item_day_movements if m.movement_type == VegetableStockMovement.MovementType.SOLD)
            else:
                prev_m = prev_m_by_veg.get(item.id)
                if prev_m:
                    opening_units = prev_m.balance_after_grams
                else:
                    opening_units = item.stock_quantity_grams or 0

        reorder_threshold_units = getattr(item, 'reorder_threshold', 0) if item else 0
        restock_level_units = item.default_daily_quantity_grams if item and item.default_daily_quantity_grams else 0

        if not item:
            result[prod.id] = {
                "state": "not_tracked",
                "unit_basis": "WEIGHT",
                "today_available_grams": None,
                "default_daily_grams": None,
                "today_available_display": "Not Tracked",
                "default_daily_display": "None",
                "opening_stock_grams": None,
                "opening_stock_display": "—",
                "consumed_stock_grams": 0,
                "consumed_stock_display": format_stock_for_display(0, unit_basis=UnitBasis.WEIGHT),
                "consumed_date": target_date.strftime("%Y-%m-%d"),
                "restock_level_grams": 0,
                "restock_level_display": "—",
                "reorder_level_grams": 0,
                "reorder_level_display": "—",
                "price": selling_price,
                "mrp": mrp_price,
                "offer_price": mrp_price if mrp_price != selling_price else None,
                "offer_percentage": offer_pct,
                "vegetable_gram": veg_gram,
                "unit": "g",
            }
        else:
            live_units = item.stock_quantity_grams if item.stock_quantity_grams is not None else 0
            state = "in_stock" if live_units > 0 else "out_of_stock"

            result[prod.id] = {
                "state": state,
                "unit_basis": basis,
                "today_available_grams": live_units,
                "default_daily_grams": item.default_daily_quantity_grams,
                "today_available_display": format_stock_for_display(live_units, unit_basis=basis, unit=item_unit),
                "default_daily_display": format_stock_for_display(item.default_daily_quantity_grams, unit_basis=basis, unit=item_unit) if item.default_daily_quantity_grams is not None else "None",
                "opening_stock_grams": opening_units if opening_units is not None else live_units,
                "opening_stock_display": format_stock_for_display(opening_units if opening_units is not None else live_units, unit_basis=basis, unit=item_unit),
                "consumed_stock_grams": consumed_units,
                "consumed_stock_display": format_stock_for_display(consumed_units, unit_basis=basis, unit=item_unit),
                "consumed_date": target_date.strftime("%Y-%m-%d"),
                "restock_level_grams": restock_level_units,
                "restock_level_display": format_stock_for_display(restock_level_units, unit_basis=basis, unit=item_unit) if restock_level_units else "—",
                "reorder_level_grams": reorder_threshold_units,
                "reorder_level_display": format_stock_for_display(reorder_threshold_units, unit_basis=basis, unit=item_unit) if reorder_threshold_units else "—",
                "price": selling_price,
                "mrp": mrp_price,
                "offer_price": mrp_price if mrp_price != selling_price else None,
                "offer_percentage": offer_pct,
                "vegetable_gram": veg_gram,
                "unit": item_unit or "g",
            }

    return result


def get_admin_stock_status(product, for_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Admin-facing stock status with full analytics & configuration columns.
    Delegates to get_bulk_admin_stock_status.
    """
    res = get_bulk_admin_stock_status([product], for_date=for_date)
    return res.get(product.id, {})


def get_daily_stock_history(product, start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """
    Reporting selector: derives daily opening, sold, and closing history from VegetableStockMovement.
    """
    item = getattr(product, "stock_item", None)
    if not item:
        return []

    basis = getattr(item, "unit_basis", UnitBasis.WEIGHT) or UnitBasis.WEIGHT
    item_unit = getattr(item, "unit", "g") or "g"

    movements = list(
        VegetableStockMovement.objects.filter(
            vegetable=item,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).order_by("id")
    )

    movements_by_date: Dict[date, list] = {}
    for m in movements:
        d = timezone.localtime(m.created_at).date()
        if d not in movements_by_date:
            movements_by_date[d] = []
        movements_by_date[d].append(m)

    history = []
    curr_date = start_date
    prior_closing = None

    prev_movement = VegetableStockMovement.objects.filter(
        vegetable=item,
        created_at__date__lt=start_date,
    ).order_by("-created_at").first()
    if prev_movement:
        prior_closing = prev_movement.balance_after_grams

    today = timezone.localdate()

    while curr_date <= end_date:
        day_movements = movements_by_date.get(curr_date, [])
        
        if day_movements:
            earliest = day_movements[0]
            opening = earliest.balance_after_grams - earliest.delta_grams

            sold = sum(abs(m.delta_grams) for m in day_movements if m.movement_type == VegetableStockMovement.MovementType.SOLD)
            restocked = sum(m.delta_grams for m in day_movements if m.movement_type == VegetableStockMovement.MovementType.RESTOCK)
            adjustments = sum(m.delta_grams for m in day_movements if m.movement_type == VegetableStockMovement.MovementType.ADJUSTMENT)
            latest = day_movements[-1]
            closing = latest.balance_after_grams
            prior_closing = closing
            
            movement_items = [
                {
                    "id": m.id,
                    "type": m.movement_type,
                    "type_display": m.get_movement_type_display(),
                    "delta_grams": m.delta_grams,
                    "delta_display": m.delta_display,
                    "balance_after_grams": m.balance_after_grams,
                    "balance_after_display": format_stock_for_display(m.balance_after_grams, unit_basis=basis, unit=item_unit),
                    "reason": m.reason,
                    "booking_ref": m.booking_ref,
                    "time": timezone.localtime(m.created_at).strftime("%I:%M %p"),
                }
                for m in day_movements
            ]
            has_activity = True
        else:
            if prior_closing is not None:
                opening = prior_closing
                sold = 0
                restocked = 0
                adjustments = 0
                closing = prior_closing
                movement_items = []
                has_activity = True
            elif curr_date == today and item.stock_quantity_grams is not None:
                opening = item.stock_quantity_grams or 0
                sold = 0
                restocked = 0
                adjustments = 0
                closing = item.stock_quantity_grams or 0
                movement_items = []
                has_activity = True
            else:
                opening = 0
                sold = 0
                restocked = 0
                adjustments = 0
                closing = 0
                movement_items = []
                has_activity = False

        if has_activity or curr_date == today:
            history.append({
                "date": curr_date.strftime("%Y-%m-%d"),
                "opening_grams": opening,
                "opening_display": format_stock_for_display(opening, unit_basis=basis, unit=item_unit),
                "sold_grams": sold,
                "sold_display": format_stock_for_display(sold, unit_basis=basis, unit=item_unit),
                "restocked_grams": restocked,
                "restocked_display": format_stock_for_display(restocked, unit_basis=basis, unit=item_unit),
                "adjustments_grams": adjustments,
                "closing_grams": closing,
                "closing_display": format_stock_for_display(closing, unit_basis=basis, unit=item_unit),
                "movements": movement_items,
            })

        curr_date += timedelta(days=1)

    return history
