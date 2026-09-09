"""
backend/inventory/selectors/vegetable_stock_selectors.py

Selectors for vegetable stock status (customer and admin), and derived daily reporting.
"""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.db.models import Sum, Q

from inventory.models import InventoryItem, StockMovement
from inventory.utils.unit_conversion import format_grams_for_display, parse_pack_size_grams


def get_stock_status(product) -> Dict[str, Any]:
    """
    Customer-facing stock status: in_stock boolean and max_quantity unit cap.
    Never exposes exact gram/kg numbers.
    - If stock_item is None -> not tracked -> in_stock: True, max_quantity: None
    - If stock_item.stock_quantity_grams is None -> not tracked -> in_stock: True, max_quantity: None
    - If stock_item.stock_quantity_grams > 0 -> in_stock: True, max_quantity: integer packs available
    - If stock_item.stock_quantity_grams <= 0 -> in_stock: False, max_quantity: 0
    """
    item = getattr(product, "stock_item", None)
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


def get_admin_stock_status(product) -> Dict[str, Any]:
    """
    Admin-facing stock status distinguishing three states:
    - "not_tracked": stock_item is None or stock_quantity_grams is None
    - "out_of_stock": stock_item exists and stock_quantity_grams == 0
    - "in_stock": stock_item exists and stock_quantity_grams > 0
    """
    item = getattr(product, "stock_item", None)
    if not item or item.stock_quantity_grams is None:
        return {
            "state": "not_tracked",
            "today_available_grams": None,
            "default_daily_grams": item.default_daily_quantity_grams if item else None,
            "today_available_display": "Not Tracked",
            "default_daily_display": format_grams_for_display(item.default_daily_quantity_grams) if item and item.default_daily_quantity_grams else "None",
            "unit": item.unit if item else "",
        }

    live_grams = item.stock_quantity_grams
    state = "in_stock" if live_grams > 0 else "out_of_stock"

    return {
        "state": state,
        "today_available_grams": live_grams,
        "default_daily_grams": item.default_daily_quantity_grams,
        "today_available_display": format_grams_for_display(live_grams),
        "default_daily_display": format_grams_for_display(item.default_daily_quantity_grams) if item.default_daily_quantity_grams is not None else "None",
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
    item = getattr(product, "stock_item", None)
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
