"""
backend/inventory/utils/unit_conversion.py

Centralized unit conversion and display formatting for Vegetable Stock.
Supports two distinct, genuine unit bases:
1. WEIGHT: Base unit is integer grams (g). Supported input units: kg, g.
2. COUNT: Base unit is integer pieces/count (pcs). Supported input units: pcs, pc, piece, bunch, packet, dozen.
"""
from decimal import Decimal
import math
import re


class UnitBasis:
    WEIGHT = "WEIGHT"
    COUNT = "COUNT"


WEIGHT_UNITS = {
    "kg", "kilogram", "kilograms", "kilo", "kilos",
    "g", "gram", "grams", "gm", "gms"
}

COUNT_UNITS = {
    "pc", "pcs", "piece", "pieces",
    "bunch", "bunches",
    "packet", "packets", "pkt", "pkts", "box", "boxes",
    "dozen", "dozens", "dz",
    "unit", "units"
}


def unit_basis_for_unit(unit_str: str) -> str:
    """
    Classifies a given unit string as either UnitBasis.WEIGHT or UnitBasis.COUNT.
    Defaults to UnitBasis.WEIGHT for legacy or unspecified units.
    """
    if not unit_str or not isinstance(unit_str, str):
        return UnitBasis.WEIGHT
    
    clean = unit_str.strip().lower()
    if clean in COUNT_UNITS:
        return UnitBasis.COUNT
    if clean in WEIGHT_UNITS:
        return UnitBasis.WEIGHT
    
    # Check substring keywords
    for u in COUNT_UNITS:
        if u in clean:
            return UnitBasis.COUNT
    return UnitBasis.WEIGHT


def parse_pack_size(duration_or_unit_str: str, default_val: int = 500, default_basis: str = UnitBasis.WEIGHT) -> dict:
    """
    Parses pack size strings into normalized base units, unit string, and unit basis.
    Examples:
    - '500 g' -> {'base_units': 500, 'unit': 'g', 'unit_basis': 'WEIGHT', 'display': '500 g'}
    - '1 kg' -> {'base_units': 1000, 'unit': 'kg', 'unit_basis': 'WEIGHT', 'display': '1 kg'}
    - '1 pc' -> {'base_units': 1, 'unit': 'pcs', 'unit_basis': 'COUNT', 'display': '1 pc'}
    - '6 pcs' -> {'base_units': 6, 'unit': 'pcs', 'unit_basis': 'COUNT', 'display': '6 pcs'}
    - '1 bunch' -> {'base_units': 1, 'unit': 'bunch', 'unit_basis': 'COUNT', 'display': '1 bunch'}
    - '1 dozen' -> {'base_units': 12, 'unit': 'dozen', 'unit_basis': 'COUNT', 'display': '1 dozen'}
    """
    if not duration_or_unit_str:
        return {
            "base_units": default_val,
            "unit": "g" if default_basis == UnitBasis.WEIGHT else "pcs",
            "unit_basis": default_basis,
            "display": f"{default_val} {'g' if default_basis == UnitBasis.WEIGHT else 'pcs'}"
        }

    s = str(duration_or_unit_str).strip()

    # 1. Check weight patterns: '500 g', '1 kg', '1.5 kg', '250 grams'
    m_weight = re.search(r'(\d+(?:\.\d+)?)\s*(kg|kilogram|kilograms|g|gram|grams|gm|gms)\b', s, re.IGNORECASE)
    if m_weight:
        try:
            val = float(m_weight.group(1))
            u = m_weight.group(2).lower()
            base_units = to_base_units(val, u, unit_basis=UnitBasis.WEIGHT)
            return {
                "base_units": base_units,
                "unit": u,
                "unit_basis": UnitBasis.WEIGHT,
                "display": s
            }
        except Exception:
            pass

    # 2. Check count patterns: '1 pc', '4 pcs', '1 bunch', '2 bunches', '1 dozen', '1 packet'
    m_count = re.search(r'(\d+(?:\.\d+)?)\s*(pc|pcs|piece|pieces|bunch|bunches|packet|packets|pkt|pkts|box|boxes|dozen|dozens|dz|unit|units)\b', s, re.IGNORECASE)
    if m_count:
        try:
            val = float(m_count.group(1))
            u = m_count.group(2).lower()
            base_units = to_base_units(val, u, unit_basis=UnitBasis.COUNT)
            return {
                "base_units": base_units,
                "unit": u,
                "unit_basis": UnitBasis.COUNT,
                "display": s
            }
        except Exception:
            pass

    # Fallback to pure numeric or default
    m_num = re.search(r'^(\d+(?:\.\d+)?)$', s)
    if m_num:
        try:
            val = float(m_num.group(1))
            base_units = to_base_units(val, "g" if default_basis == UnitBasis.WEIGHT else "pcs", unit_basis=default_basis)
            return {
                "base_units": base_units,
                "unit": "g" if default_basis == UnitBasis.WEIGHT else "pcs",
                "unit_basis": default_basis,
                "display": s
            }
        except Exception:
            pass

    return {
        "base_units": default_val,
        "unit": "g" if default_basis == UnitBasis.WEIGHT else "pcs",
        "unit_basis": default_basis,
        "display": s
    }


def parse_pack_size_grams(duration_or_unit_str: str, default_grams: int = 500) -> int:
    """
    Backward-compatible pack size resolver. Returns exact integer base units (grams or pieces).
    """
    parsed = parse_pack_size(duration_or_unit_str, default_val=default_grams)
    return parsed["base_units"]


def to_base_units(quantity, unit: str = "g", allow_zero: bool = False, unit_basis: str = None) -> int:
    """
    Convert and round to nearest whole integer base units (grams for WEIGHT, whole count for COUNT).
    Reject negative or non-numeric input. Reject zero unless allow_zero=True.
    """
    if quantity is None:
        raise ValueError("Quantity cannot be None")

    try:
        if isinstance(quantity, str):
            # Clean out unit strings if present
            cleaned = quantity.strip().lower()
            for u in sorted(list(WEIGHT_UNITS | COUNT_UNITS), key=len, reverse=True):
                cleaned = re.sub(rf'\b{u}\b', '', cleaned).strip()
            val = float(cleaned)
        else:
            val = float(quantity)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid numeric quantity: {quantity}")

    if math.isnan(val) or math.isinf(val):
        raise ValueError(f"Invalid numeric quantity: {quantity}")

    if allow_zero:
        if val < 0:
            raise ValueError(f"Quantity must be greater than or equal to zero, got: {quantity}")
    else:
        if val <= 0:
            raise ValueError(f"Quantity must be a positive number greater than zero, got: {quantity}")

    unit_clean = str(unit or "g").strip().lower()
    inferred_basis = unit_basis_for_unit(unit_clean)
    basis = inferred_basis if inferred_basis == UnitBasis.COUNT else (unit_basis or inferred_basis)

    if basis == UnitBasis.COUNT or inferred_basis == UnitBasis.COUNT:
        if unit_clean in ["dozen", "dozens", "dz"]:
            base_units = round(val * 12.0)
        else:
            base_units = round(val)
    else:
        # WEIGHT basis
        if unit_clean in ["kg", "kilogram", "kilograms", "kilo", "kilos"]:
            base_units = round(val * 1000.0)
        elif unit_clean in ["g", "gram", "grams", "gm", "gms"]:
            base_units = round(val)
        else:
            raise ValueError(f"Unsupported weight unit: '{unit}'. Allowed units are 'kg' or 'g'.")

    if not allow_zero and base_units <= 0:
        raise ValueError("Converted base units must be at least 1 unit.")

    return int(max(0, base_units))


def to_grams(quantity, unit: str = "g", allow_zero: bool = False) -> int:
    """
    Backward-compatible alias for to_base_units with automatic unit basis resolution.
    """
    basis = unit_basis_for_unit(unit)
    return to_base_units(quantity, unit=unit, allow_zero=allow_zero, unit_basis=basis)


def format_stock_for_display(quantity: int, unit_basis: str = UnitBasis.WEIGHT, unit: str = "") -> str:
    """
    Format integer base units into a clean human-readable string for admin displays.
    - WEIGHT: 18000 -> "18 kg", 18500 -> "18.5 kg", 500 -> "500 g"
    - COUNT: 50 -> "50 pcs" (or "50 bunches", "12 pkts", etc.)
    """
    if quantity is None:
        return f"0 {'pcs' if unit_basis == UnitBasis.COUNT else 'g'}"

    try:
        q = int(quantity)
    except (ValueError, TypeError):
        return f"0 {'pcs' if unit_basis == UnitBasis.COUNT else 'g'}"

    if unit_basis == UnitBasis.COUNT:
        u_label = unit.strip() if unit else "pcs"
        if u_label in ["pc", "pcs", "piece", "pieces"]:
            return f"{q} pc" if q == 1 else f"{q} pcs"
        if u_label in ["bunch", "bunches"]:
            return f"{q} bunch" if q == 1 else f"{q} bunches"
        if u_label in ["packet", "packets", "pkt", "pkts"]:
            return f"{q} pkt" if q == 1 else f"{q} pkts"
        if u_label in ["dozen", "dozens", "dz"]:
            return f"{q} pcs ({q // 12} dz)" if q >= 12 and q % 12 == 0 else f"{q} pcs"
        return f"{q} {u_label}"

    # WEIGHT basis formatting
    if q >= 1000:
        kg = q / 1000.0
        if kg.is_integer():
            return f"{int(kg)} kg"
        return f"{kg:.2f}".rstrip("0").rstrip(".") + " kg"
    return f"{q} g"


def format_grams_for_display(grams: int) -> str:
    """
    Backward-compatible helper formatting grams.
    """
    return format_stock_for_display(grams, unit_basis=UnitBasis.WEIGHT)
