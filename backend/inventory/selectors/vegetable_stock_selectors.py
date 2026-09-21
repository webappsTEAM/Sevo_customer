"""
backend/inventory/selectors/vegetable_stock_selectors.py

Selectors for vegetable stock status (customer and admin), and derived daily reporting.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.db.models import Sum, Q
from django.core.exceptions import ObjectDoesNotExist

from inventory.models import InventoryItem, StockMovement
from inventory.utils.unit_conversion import format_grams_for_display, parse_pack_size_grams


def _safe_get_stock_item(product) -> Optional[InventoryItem]:
    """
    Safely retrieves product.stock_item.
    Handles ObjectDoesNotExist / InventoryItem.DoesNotExist which getattr does not catch.
    """
    try:
        return getattr(product, "stock_item", None)
    except ObjectDoesNotExist:
        return None


def get_stock_status(product) -> Dict[str, Any]:
    """
    Customer-facing stock status: in_stock boolean and max_quantity unit cap.
    Never exposes exact gram/kg numbers.
    - If stock_item is None -> not tracked -> in_stock: True, max_quantity: None
    - If stock_item.stock_quantity_grams is None -> not tracked -> in_stock: True, max_quantity: None
    - If stock_item.stock_quantity_grams > 0 -> in_stock: True, max_quantity: integer packs available
    - If stock_item.stock_quantity_grams <= 0 -> in_stock: False, max_quantity: 0
    """
    item = _safe_get_stock_item(product)
    if not item or item.stock_quantity_grams is None:
        return {"in_stock": True, "max_quantity": None}

    live_grams = item.stock_quantity_grams
    if live_grams <= 0:
        return {"in_stock": False, "max_quantity": 0}

    # Derive pack size grams from product.duration or default 500g
    unit_str = getattr(product, "duration", "") or "500 g"
    pack_grams = parse_pack_size_grams(unit_str, default_grams=500)

    max_units = max(0, live_grams // pack_grams) if pack_grams > 0 else 0
    return {
        "in_stock": max_units > 0,
        "max_quantity": max_units,
    }


def get_admin_stock_status(product, for_date: Optional[date] = None) -> Dict[str, Any]:
    """
    Admin-facing stock status with full analytics & configuration columns:
    - opening stock (today's opening or for_date opening)
    - current stock (live available stock)
    - consumed stock (sold quantity on for_date/today)
    - restock level (default daily stock / replenishment amount)
    - reorder level (threshold warning)
    - price (base price / MRP)
    - offer_price & offer_percentage
    - vegetable_gram (pack size string e.g. "500 g", "1 kg")
    """
    item = _safe_get_stock_item(product)
    target_date = for_date or timezone.localdate()

    # Price & Offer % matching customer cards (e.g. Ash Gourd: Price=₹46, MRP=₹55, Offer=16% OFF)
    raw_base = float(product.base_price or 0)
    raw_offer = float(product.offer_price) if product.offer_price is not None else None

    if raw_offer is not None and raw_offer > 0:
        # In this catalog schema, base_price is selling price (e.g. ₹46) and offer_price is MRP/original price (e.g. ₹55)
        # OR if raw_offer < raw_base: raw_offer is selling price and raw_base is MRP
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
        
        # Fallback to tag if defined (e.g. "14% OFF" for Amla, "23% OFF" for Tomato)
        tag_val = getattr(product, "tag", "") or ""
        if tag_val and "%" in tag_val:
            import re
            m = re.search(r"(\d+(?:\.\d+)?)\s*%", tag_val)
            if m:
                offer_pct = round(float(m.group(1)))
                if offer_pct > 0 and selling_price > 0:
                    mrp_price = round(selling_price / (1 - offer_pct / 100.0), 2)

    veg_gram = getattr(product, "duration", "") or "500 g"

    # Consumed Stock & Opening Stock Calculation from StockMovements
    consumed_grams = 0
    opening_grams = None
    if item:
        day_movements = list(
            StockMovement.objects.filter(
                item=item,
                created_at__date=target_date,
            ).order_by("id")
        )
        # When default daily opening stock is explicitly configured on the item, use it as opening balance
        if item.default_daily_quantity_grams is not None:
            opening_grams = item.default_daily_quantity_grams
        elif day_movements:
            earliest = day_movements[0]
            if earliest.movement_type == StockMovement.MovementType.DAILY_RESET:
                opening_grams = earliest.balance_after_grams
            else:
                opening_grams = earliest.balance_after_grams - earliest.delta_grams
            consumed_grams = sum(abs(m.delta_grams) for m in day_movements if m.movement_type == StockMovement.MovementType.SOLD)
        else:
            # Check previous closing movement
            prev_m = StockMovement.objects.filter(
                item=item,
                created_at__date__lt=target_date,
            ).order_by("-created_at").first()
            if prev_m:
                opening_grams = prev_m.balance_after_grams
            else:
                opening_grams = item.default_daily_quantity_grams or item.stock_quantity_grams or 0

        if day_movements:
            consumed_grams = sum(abs(m.delta_grams) for m in day_movements if m.movement_type == StockMovement.MovementType.SOLD)

    reorder_threshold_grams = item.reorder_threshold if item and item.reorder_threshold else 0
    restock_level_grams = item.default_daily_quantity_grams if item and item.default_daily_quantity_grams else (item.reorder_quantity if item else 0)

    if not item or item.stock_quantity_grams is None:
        return {
            "state": "not_tracked",
            "today_available_grams": None,
            "default_daily_grams": item.default_daily_quantity_grams if item else None,
            "today_available_display": "Not Tracked",
            "default_daily_display": format_grams_for_display(item.default_daily_quantity_grams) if item and item.default_daily_quantity_grams else "None",
            "opening_stock_grams": opening_grams,
            "opening_stock_display": format_grams_for_display(opening_grams) if opening_grams is not None else "—",
            "consumed_stock_grams": consumed_grams,
            "consumed_stock_display": format_grams_for_display(consumed_grams),
            "consumed_date": target_date.strftime("%Y-%m-%d"),
            "restock_level_grams": restock_level_grams,
            "restock_level_display": format_grams_for_display(restock_level_grams) if restock_level_grams else "—",
            "reorder_level_grams": reorder_threshold_grams,
            "reorder_level_display": format_grams_for_display(reorder_threshold_grams) if reorder_threshold_grams else "—",
            "price": selling_price,
            "mrp": mrp_price,
            "offer_price": mrp_price if mrp_price != selling_price else None,
            "offer_percentage": offer_pct,
            "vegetable_gram": veg_gram,
            "unit": item.unit if item else "g",
        }

    live_grams = item.stock_quantity_grams
    state = "in_stock" if live_grams > 0 else "out_of_stock"

    return {
        "state": state,
        "today_available_grams": live_grams,
        "default_daily_grams": item.default_daily_quantity_grams,
        "today_available_display": format_grams_for_display(live_grams),
        "default_daily_display": format_grams_for_display(item.default_daily_quantity_grams) if item.default_daily_quantity_grams is not None else "None",
        "opening_stock_grams": opening_grams if opening_grams is not None else live_grams,
        "opening_stock_display": format_grams_for_display(opening_grams if opening_grams is not None else live_grams),
        "consumed_stock_grams": consumed_grams,
        "consumed_stock_display": format_grams_for_display(consumed_grams),
        "consumed_date": target_date.strftime("%Y-%m-%d"),
        "restock_level_grams": restock_level_grams,
        "restock_level_display": format_grams_for_display(restock_level_grams) if restock_level_grams else "—",
        "reorder_level_grams": reorder_threshold_grams,
        "reorder_level_display": format_grams_for_display(reorder_threshold_grams) if reorder_threshold_grams else "—",
        "price": selling_price,
        "mrp": mrp_price,
        "offer_price": mrp_price if mrp_price != selling_price else None,
        "offer_percentage": offer_pct,
        "vegetable_gram": veg_gram,
        "unit": item.unit or "g",
    }


def get_bulk_admin_stock_status(products: list) -> Dict[int, Dict[str, Any]]:
    """
    Bulk optimized admin status selector to avoid N+1 queries.
    """
    result = {}
    for prod in products:
        result[prod.id] = get_admin_stock_status(prod)
    return result


def get_daily_stock_history(product, start_date: date, end_date: date) -> List[Dict[str, Any]]:
    """
    Reporting selector: derives daily opening, sold, and closing history from StockMovement.
    No dedicated history table.
    
    For each date in range [start_date, end_date]:
    - opening_grams: balance_after of the earliest movement that day (or prior day's closing).
    - sold_grams: sum of SOLD movement deltas (positive amount sold) that day.
    - closing_grams: balance_after of the latest movement that day (or live stock if date is today and no movements).
    """
    item = _safe_get_stock_item(product)
    if not item:
        return []

    # Filter all movements for this item within date window
    movements = list(
        StockMovement.objects.filter(
            item=item,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
        ).order_by("id")
    )

    # Group movements by local date
    movements_by_date: Dict[date, list] = {}
    for m in movements:
        d = timezone.localtime(m.created_at).date()
        if d not in movements_by_date:
            movements_by_date[d] = []
        movements_by_date[d].append(m)

    history = []
    curr_date = start_date
    prior_closing = None

    # Resolve baseline prior closing if movements exist before start_date
    prev_movement = StockMovement.objects.filter(
        item=item,
        created_at__date__lt=start_date,
    ).order_by("-created_at").first()
    if prev_movement:
        prior_closing = prev_movement.balance_after_grams

    today = timezone.localdate()

    while curr_date <= end_date:
        day_movements = movements_by_date.get(curr_date, [])
        
        if day_movements:
            # Earliest movement
            earliest = day_movements[0]
            # Opening stock
            if earliest.movement_type == StockMovement.MovementType.DAILY_RESET:
                opening = earliest.balance_after_grams
            else:
                # If earliest is not daily reset, opening before this movement was balance_after - delta
                opening = earliest.balance_after_grams - earliest.delta_grams

            sold = sum(abs(m.delta_grams) for m in day_movements if m.movement_type == StockMovement.MovementType.SOLD)
            restocked = sum(m.delta_grams for m in day_movements if m.movement_type == StockMovement.MovementType.RESTOCK)
            adjustments = sum(m.delta_grams for m in day_movements if m.movement_type == StockMovement.MovementType.ADJUSTMENT)
            latest = day_movements[-1]
            closing = latest.balance_after_grams
            prior_closing = closing
            
            movement_items = [
                {
                    "id": m.id,
                    "type": m.movement_type,
                    "type_display": m.get_movement_type_display(),
                    "delta_grams": m.delta_grams,
                    "delta_display": f"{'+' if m.delta_grams > 0 else '-'}{format_grams_for_display(abs(m.delta_grams))}",
                    "balance_after_grams": m.balance_after_grams,
                    "balance_after_display": format_grams_for_display(m.balance_after_grams),
                    "reason": m.reason,
                    "booking_ref": m.booking_ref,
                    "time": timezone.localtime(m.created_at).strftime("%I:%M %p"),
                }
                for m in day_movements
            ]
            has_activity = True
        else:
            # No movements on this date
            if curr_date == today and (item.stock_quantity_grams is not None or item.default_daily_quantity_grams is not None):
                opening = item.stock_quantity_grams or 0
                sold = 0
                restocked = 0
                adjustments = 0
                closing = item.stock_quantity_grams or 0
                movement_items = []
                has_activity = True
            elif prior_closing is not None:
                opening = prior_closing
                sold = 0
                restocked = 0
                adjustments = 0
                closing = prior_closing
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
                "opening_display": format_grams_for_display(opening),
                "sold_grams": sold,
                "sold_display": format_grams_for_display(sold),
                "restocked_grams": restocked,
                "restocked_display": format_grams_for_display(restocked),
                "adjustments_grams": adjustments,
                "closing_grams": closing,
                "closing_display": format_grams_for_display(closing),
                "movements": movement_items,
            })

        curr_date += timedelta(days=1)

    return history
