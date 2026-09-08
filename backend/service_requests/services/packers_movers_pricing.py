"""
service_requests/services/packers_movers_pricing.py

SEVO Packers & Movers — Complete Relocation Estimation & Quoting Engine.
Implements canonical inventory itemization, volume (CFT) calculation,
vehicle sizing recommendation, packing tier estimation, floor/lift labor
adjustments, furniture dismantling/reassembly, and server-authoritative
quote snapshot generation with cryptographic / cache integrity.
"""

import math
import uuid
import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import timedelta
from typing import Dict, Any, List, Optional, Tuple

from django.core.cache import cache
from django.core import signing
from django.utils import timezone

from .logistics_pricing import _money, _PAISE

logger = logging.getLogger(__name__)

# ── Canonical Inventory Catalog ──────────────────────────────────────────────
# Defines standard household goods volume (CFT), estimated weight (kg),
# fragility, and dismantle/reassembly costs.
CANONICAL_INVENTORY_CATALOG: Dict[str, Dict[str, Any]] = {
    # ── Bedrooms ──
    "baby wooden bed": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 20.0, "fragile": False, "dismantle": True, "dismantle_charge": 200.0},
    "bunk bed - dismantlable": {"category": "Bedrooms", "cft": 50.0, "weight_kg": 65.0, "fragile": False, "dismantle": True, "dismantle_charge": 450.0},
    "cradle - dismantleable": {"category": "Bedrooms", "cft": 12.0, "weight_kg": 15.0, "fragile": False, "dismantle": True, "dismantle_charge": 150.0},
    "diwan cum bed": {"category": "Bedrooms", "cft": 35.0, "weight_kg": 45.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "double bed - dismantlable": {"category": "Bedrooms", "cft": 45.0, "weight_kg": 50.0, "fragile": False, "dismantle": True, "dismantle_charge": 350.0},
    "king size bed - with storage": {"category": "Bedrooms", "cft": 60.0, "weight_kg": 80.0, "fragile": False, "dismantle": True, "dismantle_charge": 450.0},
    "king size bed - without storage": {"category": "Bedrooms", "cft": 50.0, "weight_kg": 55.0, "fragile": False, "dismantle": True, "dismantle_charge": 350.0},
    "queen size bed - with storage": {"category": "Bedrooms", "cft": 50.0, "weight_kg": 65.0, "fragile": False, "dismantle": True, "dismantle_charge": 400.0},
    "queen size bed - without storage": {"category": "Bedrooms", "cft": 45.0, "weight_kg": 50.0, "fragile": False, "dismantle": True, "dismantle_charge": 350.0},
    "single bed - foldable": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "single bed - with storage": {"category": "Bedrooms", "cft": 30.0, "weight_kg": 35.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0},
    "single bed - without storage": {"category": "Bedrooms", "cft": 25.0, "weight_kg": 25.0, "fragile": False, "dismantle": True, "dismantle_charge": 200.0},
    "single bed non storage - dismantlable": {"category": "Bedrooms", "cft": 25.0, "weight_kg": 25.0, "fragile": False, "dismantle": True, "dismantle_charge": 200.0},
    "single bed storage - dismantlable": {"category": "Bedrooms", "cft": 30.0, "weight_kg": 35.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0},
    "double bed mattress - foldable": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "double bed mattress - non foldable": {"category": "Bedrooms", "cft": 25.0, "weight_kg": 25.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "single bed mattress - foldable": {"category": "Bedrooms", "cft": 10.0, "weight_kg": 10.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "single bed mattress - non foldable": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "bed side table": {"category": "Bedrooms", "cft": 5.0, "weight_kg": 8.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "center table": {"category": "Bedrooms", "cft": 12.0, "weight_kg": 15.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "study /computer table": {"category": "Bedrooms", "cft": 20.0, "weight_kg": 25.0, "fragile": False, "dismantle": True, "dismantle_charge": 200.0},
    "arm chair": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 12.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "bean bag/pouffe": {"category": "Bedrooms", "cft": 8.0, "weight_kg": 4.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "office chair": {"category": "Bedrooms", "cft": 15.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "split air conditioner (ac)": {"category": "Bedrooms", "cft": 12.0, "weight_kg": 40.0, "fragile": True, "dismantle": True, "dismantle_charge": 500.0},
    "window air conditioner (ac)": {"category": "Bedrooms", "cft": 10.0, "weight_kg": 45.0, "fragile": True, "dismantle": True, "dismantle_charge": 300.0},
    "single door wardrobe": {"category": "Bedrooms", "cft": 25.0, "weight_kg": 40.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0},
    "double door wardrobe": {"category": "Bedrooms", "cft": 45.0, "weight_kg": 70.0, "fragile": False, "dismantle": True, "dismantle_charge": 400.0},
    "triple door wardrobe": {"category": "Bedrooms", "cft": 65.0, "weight_kg": 100.0, "fragile": False, "dismantle": True, "dismantle_charge": 600.0},
    "four door wardrobe": {"category": "Bedrooms", "cft": 85.0, "weight_kg": 130.0, "fragile": False, "dismantle": True, "dismantle_charge": 800.0},
    "five door wardrobe": {"category": "Bedrooms", "cft": 110.0, "weight_kg": 160.0, "fragile": False, "dismantle": True, "dismantle_charge": 1000.0},
    "sliding door wardrobe": {"category": "Bedrooms", "cft": 60.0, "weight_kg": 90.0, "fragile": False, "dismantle": True, "dismantle_charge": 600.0},
    "steel almirah medium": {"category": "Bedrooms", "cft": 35.0, "weight_kg": 60.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "steel almirah large": {"category": "Bedrooms", "cft": 50.0, "weight_kg": 85.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "dressing table": {"category": "Bedrooms", "cft": 25.0, "weight_kg": 35.0, "fragile": True, "dismantle": True, "dismantle_charge": 250.0},
    "book shelf small": {"category": "Bedrooms", "cft": 10.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "book shelf medium": {"category": "Bedrooms", "cft": 20.0, "weight_kg": 30.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "book shelf large": {"category": "Bedrooms", "cft": 35.0, "weight_kg": 50.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},

    # ── Living Room ──
    "1 seater sofa": {"category": "Living Room", "cft": 15.0, "weight_kg": 20.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "1 seater sofa - leather": {"category": "Living Room", "cft": 15.0, "weight_kg": 25.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "2 seater sofa": {"category": "Living Room", "cft": 30.0, "weight_kg": 40.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "2 seater sofa - leather": {"category": "Living Room", "cft": 30.0, "weight_kg": 50.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "3 seater sofa": {"category": "Living Room", "cft": 45.0, "weight_kg": 55.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "3 seater sofa - l shape": {"category": "Living Room", "cft": 60.0, "weight_kg": 75.0, "fragile": False, "dismantle": True, "dismantle_charge": 300.0},
    "3 seater sofa - leather": {"category": "Living Room", "cft": 45.0, "weight_kg": 65.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "4 seater sofa": {"category": "Living Room", "cft": 60.0, "weight_kg": 75.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "5 seater sofa - l shape": {"category": "Living Room", "cft": 80.0, "weight_kg": 100.0, "fragile": False, "dismantle": True, "dismantle_charge": 400.0},
    "7 seater sofa - l shape": {"category": "Living Room", "cft": 110.0, "weight_kg": 140.0, "fragile": False, "dismantle": True, "dismantle_charge": 500.0},
    "recliner sofa 1-seater": {"category": "Living Room", "cft": 20.0, "weight_kg": 35.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "recliner sofa 2-seater": {"category": "Living Room", "cft": 40.0, "weight_kg": 65.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "recliner sofa 3-seater": {"category": "Living Room", "cft": 60.0, "weight_kg": 95.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "sofa cum bed": {"category": "Living Room", "cft": 45.0, "weight_kg": 65.0, "fragile": False, "dismantle": True, "dismantle_charge": 300.0},
    "dining chair": {"category": "Living Room", "cft": 8.0, "weight_kg": 8.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "dining table only - 4 seater": {"category": "Living Room", "cft": 25.0, "weight_kg": 35.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0},
    "dining table only - 6 seater": {"category": "Living Room", "cft": 35.0, "weight_kg": 50.0, "fragile": False, "dismantle": True, "dismantle_charge": 350.0},
    "dining table only - 8 seater": {"category": "Living Room", "cft": 50.0, "weight_kg": 70.0, "fragile": False, "dismantle": True, "dismantle_charge": 450.0},
    "glass top dining table only - 4 seater": {"category": "Living Room", "cft": 25.0, "weight_kg": 40.0, "fragile": True, "dismantle": True, "dismantle_charge": 350.0},
    "glass top dining table only - 6 seater": {"category": "Living Room", "cft": 35.0, "weight_kg": 60.0, "fragile": True, "dismantle": True, "dismantle_charge": 450.0},
    "glass top dining table only - 8 seater": {"category": "Living Room", "cft": 50.0, "weight_kg": 80.0, "fragile": True, "dismantle": True, "dismantle_charge": 550.0},
    "marble top dining table only - 4 seater": {"category": "Living Room", "cft": 25.0, "weight_kg": 70.0, "fragile": True, "dismantle": True, "dismantle_charge": 400.0},
    "marble top dining table only - 6 seater": {"category": "Living Room", "cft": 35.0, "weight_kg": 100.0, "fragile": True, "dismantle": True, "dismantle_charge": 500.0},
    "marble top dining table only - 8 seater": {"category": "Living Room", "cft": 50.0, "weight_kg": 140.0, "fragile": True, "dismantle": True, "dismantle_charge": 600.0},
    "lcd/led 52\" - 65\"": {"category": "Living Room", "cft": 12.0, "weight_kg": 22.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "lcd/led 65\" & above": {"category": "Living Room", "cft": 16.0, "weight_kg": 30.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "lcd/led tv 40\" & below": {"category": "Living Room", "cft": 6.0, "weight_kg": 12.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "lcd/led tv 42\" - 50\"": {"category": "Living Room", "cft": 8.0, "weight_kg": 16.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "lcd/led tv 52\" & above": {"category": "Living Room", "cft": 12.0, "weight_kg": 22.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "regular tv (old model)": {"category": "Living Room", "cft": 10.0, "weight_kg": 25.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "coffee table large": {"category": "Living Room", "cft": 15.0, "weight_kg": 20.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "coffee table small": {"category": "Living Room", "cft": 8.0, "weight_kg": 10.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "entertainment/tv unit": {"category": "Living Room", "cft": 25.0, "weight_kg": 35.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0},
    "tv table": {"category": "Living Room", "cft": 15.0, "weight_kg": 20.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "shoe rack metal": {"category": "Living Room", "cft": 8.0, "weight_kg": 10.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "shoe rack wooden": {"category": "Living Room", "cft": 10.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "music/video system": {"category": "Living Room", "cft": 8.0, "weight_kg": 15.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},

    # ── Kitchen & Appliances ──
    "single door refrigerator": {"category": "Kitchen", "cft": 25.0, "weight_kg": 45.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "double door refrigerator": {"category": "Kitchen", "cft": 40.0, "weight_kg": 75.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "gas stove / hob": {"category": "Kitchen", "cft": 5.0, "weight_kg": 8.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "lpg gas cylinder": {"category": "Kitchen", "cft": 4.0, "weight_kg": 30.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "washing machine <6.9kg": {"category": "Kitchen", "cft": 18.0, "weight_kg": 35.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "washing machine 7-7.9kg": {"category": "Kitchen", "cft": 22.0, "weight_kg": 45.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "washing machine 8kg+": {"category": "Kitchen", "cft": 25.0, "weight_kg": 55.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "microwave oven & otg": {"category": "Kitchen", "cft": 6.0, "weight_kg": 15.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "water purifier": {"category": "Kitchen", "cft": 4.0, "weight_kg": 8.0, "fragile": True, "dismantle": True, "dismantle_charge": 150.0},
    "mixer grinder": {"category": "Kitchen", "cft": 3.0, "weight_kg": 6.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "wet grinder": {"category": "Kitchen", "cft": 5.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "dish washer": {"category": "Kitchen", "cft": 20.0, "weight_kg": 45.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "hood chimney": {"category": "Kitchen", "cft": 8.0, "weight_kg": 15.0, "fragile": False, "dismantle": True, "dismantle_charge": 300.0},

    # ── Cartons & Packaging ──
    "small": {"category": "Cartons", "cft": 3.0, "weight_kg": 10.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "medium": {"category": "Cartons", "cft": 5.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "large": {"category": "Cartons", "cft": 8.0, "weight_kg": 25.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "gunny bag": {"category": "Cartons", "cft": 4.0, "weight_kg": 12.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "(1.5ft x 1.5ft x 2ft)": {"category": "Cartons", "cft": 4.5, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},

    # ── Miscellaneous ──
    "bicycle": {"category": "Miscellaneous", "cft": 15.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
    "electronic keyboard": {"category": "Miscellaneous", "cft": 6.0, "weight_kg": 10.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "guitar": {"category": "Miscellaneous", "cft": 5.0, "weight_kg": 6.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0},
    "suitcases and trolleys": {"category": "Miscellaneous", "cft": 8.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0},
}


# ── Vehicle Sizing Standards ────────────────────────────────────────────────
VEHICLE_SIZING_TABLE = [
    {
        "code": "tata_ace",
        "name": "1-Ton / Mini Truck",
        "max_cft": 220.0,
        "payload_kg": 750.0,
        "base_fare": Decimal("850.00"),
        "per_km_rate": Decimal("25.00"),
        "free_km": Decimal("3.00"),
        "base_labor": Decimal("400.00"),
        "crew_size": 2,
    },
    {
        "code": "bolero_maxi",
        "name": "8ft Pickup / Bolero Maxi",
        "max_cft": 450.0,
        "payload_kg": 1200.0,
        "base_fare": Decimal("1450.00"),
        "per_km_rate": Decimal("35.00"),
        "free_km": Decimal("3.00"),
        "base_labor": Decimal("700.00"),
        "crew_size": 3,
    },
    {
        "code": "canter_14ft",
        "name": "14ft Canter",
        "max_cft": 750.0,
        "payload_kg": 2500.0,
        "base_fare": Decimal("2450.00"),
        "per_km_rate": Decimal("45.00"),
        "free_km": Decimal("5.00"),
        "base_labor": Decimal("1100.00"),
        "crew_size": 4,
    },
    {
        "code": "heavy_truck_17ft",
        "name": "17ft / 19ft Heavy Truck",
        "max_cft": 99999.0,
        "payload_kg": 4500.0,
        "base_fare": Decimal("3850.00"),
        "per_km_rate": Decimal("60.00"),
        "free_km": Decimal("5.00"),
        "base_labor": Decimal("1600.00"),
        "crew_size": 5,
    },
]


def match_catalog_item(item_name: str) -> Dict[str, Any]:
    """Finds catalog attributes for item_name with fuzzy / keyword fallback."""
    key = str(item_name or "").strip().lower()
    if key in CANONICAL_INVENTORY_CATALOG:
        return CANONICAL_INVENTORY_CATALOG[key]

    # Keyword heuristics
    if "sofa" in key:
        return {"category": "Living Room", "cft": 30.0, "weight_kg": 40.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0}
    if "bed" in key:
        return {"category": "Bedrooms", "cft": 45.0, "weight_kg": 50.0, "fragile": False, "dismantle": True, "dismantle_charge": 350.0}
    if "mattress" in key:
        return {"category": "Bedrooms", "cft": 20.0, "weight_kg": 20.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0}
    if "wardrobe" in key or "almirah" in key:
        return {"category": "Bedrooms", "cft": 45.0, "weight_kg": 70.0, "fragile": False, "dismantle": True, "dismantle_charge": 400.0}
    if "refrigerator" in key or "fridge" in key:
        return {"category": "Kitchen", "cft": 30.0, "weight_kg": 50.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0}
    if "washing" in key:
        return {"category": "Kitchen", "cft": 20.0, "weight_kg": 40.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0}
    if "tv" in key or "lcd" in key or "led" in key:
        return {"category": "Living Room", "cft": 10.0, "weight_kg": 15.0, "fragile": True, "dismantle": False, "dismantle_charge": 0.0}
    if "table" in key:
        return {"category": "Living Room", "cft": 20.0, "weight_kg": 25.0, "fragile": False, "dismantle": True, "dismantle_charge": 250.0}
    if "chair" in key:
        return {"category": "Living Room", "cft": 8.0, "weight_kg": 8.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0}
    if "carton" in key or "box" in key:
        return {"category": "Cartons", "cft": 5.0, "weight_kg": 15.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0}

    # Safe default for unknown item
    return {"category": "General", "cft": 5.0, "weight_kg": 10.0, "fragile": False, "dismantle": False, "dismantle_charge": 0.0}


def calculate_inventory_metrics(inventory: Any) -> Dict[str, Any]:
    """
    Parses inventory lines (dict or list) into total volume, weight, counts,
    and detailed line item breakdowns.
    """
    items_list = []
    total_cft = 0.0
    total_weight = 0.0
    total_count = 0
    fragile_count = 0
    dismantlable_count = 0
    total_dismantle_cost = Decimal("0.00")

    if isinstance(inventory, dict):
        # Format: {"Double Bed - Dismantlable": 1, "Single Door Refrigerator": 1}
        raw_items = [{"name": k, "quantity": v} for k, v in inventory.items()]
    elif isinstance(inventory, list):
        raw_items = inventory
    else:
        raw_items = []

    for item in raw_items:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or item.get("item") or "").strip()
        try:
            qty = int(item.get("quantity") or item.get("qty") or 1)
        except (ValueError, TypeError):
            qty = 1
        if qty <= 0 or not name:
            continue

        meta = match_catalog_item(name)
        unit_cft = float(item.get("cft") or meta["cft"])
        unit_weight = float(item.get("weight_kg") or meta["weight_kg"])
        is_fragile = bool(item.get("fragile") if "fragile" in item else meta["fragile"])
        can_dismantle = bool(item.get("dismantle") if "dismantle" in item else meta["dismantle"])
        dismantle_charge = Decimal(str(item.get("dismantle_charge") or meta["dismantle_charge"] or 0))

        line_cft = round(unit_cft * qty, 2)
        line_weight = round(unit_weight * qty, 2)

        total_cft += line_cft
        total_weight += line_weight
        total_count += qty

        if is_fragile:
            fragile_count += qty
        if can_dismantle:
            dismantlable_count += qty
            total_dismantle_cost += _money(dismantle_charge * qty)

        items_list.append({
            "name": name,
            "category": meta["category"],
            "quantity": qty,
            "unit_cft": unit_cft,
            "total_cft": line_cft,
            "unit_weight_kg": unit_weight,
            "total_weight_kg": line_weight,
            "is_fragile": is_fragile,
            "can_dismantle": can_dismantle,
            "unit_dismantle_charge": str(dismantle_charge),
            "total_dismantle_charge": str(_money(dismantle_charge * qty)),
        })

    total_cft = round(total_cft, 1)
    total_weight = round(total_weight, 1)

    return {
        "items": items_list,
        "total_cft": total_cft,
        "total_weight_kg": total_weight,
        "total_count": total_count,
        "fragile_count": fragile_count,
        "dismantlable_count": dismantlable_count,
        "default_dismantle_cost": total_dismantle_cost,
    }


def recommend_vehicle_for_volume(volume_cft: float) -> Dict[str, Any]:
    """Selects appropriate transport vehicle based on total move volume."""
    for tier in VEHICLE_SIZING_TABLE:
        if volume_cft <= tier["max_cft"]:
            return tier
    return VEHICLE_SIZING_TABLE[-1]


def compute_packers_movers_quote(
    *,
    pickup_lat: float,
    pickup_lng: float,
    drop_lat: float,
    drop_lng: float,
    inventory: Any,
    packing_tier: str = "standard",       # "no_packing" | "standard" | "premium"
    dismantling_required: bool = True,
    unpacking_required: bool = False,
    pickup_floor: int = 0,
    pickup_has_lift: bool = True,
    drop_floor: int = 0,
    drop_has_lift: bool = True,
    relocation_type: str = "Within City",
    service_tier_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Server-authoritative calculation for a complete relocation booking.
    Returns the comprehensive quotation breakdown dictionary.
    """
    # 1. Routing & Distance
    from .routing import get_route_eta
    route = get_route_eta(pickup_lat, pickup_lng, drop_lat, drop_lng)
    if route is not None:
        distance_km = _money(str(route.get("distance_km") or "5.0"))
        distance_source = route.get("source", "google_maps")
    else:
        # Straight-line fallback
        distance_km = Decimal("8.50")
        distance_source = "straight_line_estimate"

    # 2. Inventory Metrics
    metrics = calculate_inventory_metrics(inventory)
    total_cft = metrics["total_cft"]

    # Minimum floor volume if empty inventory provided
    effective_cft = max(30.0, total_cft)

    # 3. Vehicle Sizing
    vehicle = recommend_vehicle_for_volume(effective_cft)

    # 4. Transport Charge
    free_km = vehicle["free_km"]
    chargeable_km = max(Decimal("0.00"), distance_km - free_km)
    base_fare = vehicle["base_fare"]
    per_km_rate = vehicle["per_km_rate"]
    distance_charge = _money(chargeable_km * per_km_rate)
    transport_total = _money(base_fare + distance_charge)

    # 5. Packing Charges
    packing_clean = (packing_tier or "standard").lower().strip()
    if packing_clean in ("no_packing", "none", "customer_packed"):
        packing_charge = Decimal("0.00")
        packing_rate_per_cft = Decimal("0.00")
        packing_label = "No Packing (Customer Packed)"
    elif packing_clean == "premium":
        packing_rate_per_cft = Decimal("6.00")
        fragile_addon = Decimal("200.00") * metrics["fragile_count"]
        packing_charge = _money((Decimal(str(effective_cft)) * packing_rate_per_cft) + fragile_addon)
        packing_label = "Premium 4-Layer Fragile Packing"
    else:
        # Standard
        packing_clean = "standard"
        packing_rate_per_cft = Decimal("3.50")
        packing_charge = _money(Decimal(str(effective_cft)) * packing_rate_per_cft)
        packing_label = "Standard Multi-Layer Protective Packing"

    # 6. Labor & Floor Surcharge
    base_labor = vehicle["base_labor"]
    crew_size = vehicle["crew_size"]

    # Floor charge: ₹120 per floor without lift per 100 CFT block (minimum 1 block)
    cft_blocks = max(1, math.ceil(effective_cft / 100.0))
    rate_per_floor_block = Decimal("120.00")

    pickup_floor_charge = Decimal("0.00")
    if not pickup_has_lift and pickup_floor > 0:
        pickup_floor_charge = _money(Decimal(str(pickup_floor)) * rate_per_floor_block * Decimal(str(cft_blocks)))

    drop_floor_charge = Decimal("0.00")
    if not drop_has_lift and drop_floor > 0:
        drop_floor_charge = _money(Decimal(str(drop_floor)) * rate_per_floor_block * Decimal(str(cft_blocks)))

    floor_labor_total = _money(pickup_floor_charge + drop_floor_charge)
    total_labor = _money(base_labor + floor_labor_total)

    # 7. Dismantling & Reassembly
    dismantle_total = Decimal("0.00")
    if dismantling_required:
        dismantle_total = _money(metrics["default_dismantle_cost"])

    # 8. Unpacking
    unpacking_charge = Decimal("0.00")
    if unpacking_required:
        unpacking_charge = _money(Decimal(str(effective_cft)) * Decimal("2.00"))

    # 9. Subtotal & GST
    subtotal = _money(
        transport_total
        + packing_charge
        + total_labor
        + dismantle_total
        + unpacking_charge
    )
    gst = _money(subtotal * Decimal("0.18"))
    total = _money(subtotal + gst)

    # 10. Service Tier Floor Guard (if applicable)
    requires_survey = (total_cft > 800.0) or ("between" in relocation_type.lower() and total_cft > 600.0)

    quote_id = f"PMQ-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    valid_until = timezone.now() + timedelta(hours=48)

    breakdown = {
        "quote_id": quote_id,
        "service_category": "packers_movers",
        "relocation_type": relocation_type,
        "requires_survey": requires_survey,
        "survey_status": "SURVEY_REQUIRED" if requires_survey else "INSTANT_ESTIMATE_APPROVED",
        "valid_until": valid_until.isoformat(),
        "total": total,
        "subtotal": subtotal,
        "distance_km": distance_km,
        "chargeable_km": chargeable_km,
        "distance_charge": distance_charge,
        "base_fare": base_fare,
        "additional_stops": 0,
        "additional_stop_charge": Decimal("0.00"),
        "rate_additional_stop": Decimal("0.00"),
        "rate_per_km": per_km_rate,
        "free_km": free_km,
        "currency": "INR",
        # Inventory Summary
        "inventory_summary": {
            "total_items": metrics["total_count"],
            "total_cft": total_cft,
            "effective_cft": effective_cft,
            "total_weight_kg": metrics["total_weight_kg"],
            "fragile_count": metrics["fragile_count"],
            "dismantlable_count": metrics["dismantlable_count"],
            "items": metrics["items"],
        },
        # Recommended Vehicle
        "vehicle": {
            "code": vehicle["code"],
            "name": vehicle["name"],
            "crew_size": crew_size,
            "payload_kg": vehicle["payload_kg"],
            "base_fare": str(vehicle["base_fare"]),
            "per_km_rate": str(vehicle["per_km_rate"]),
            "free_km": str(vehicle["free_km"]),
        },
        # Distance & Route
        "route": {
            "pickup_lat": float(pickup_lat),
            "pickup_lng": float(pickup_lng),
            "drop_lat": float(drop_lat),
            "drop_lng": float(drop_lng),
            "distance_km": str(distance_km),
            "chargeable_km": str(chargeable_km),
            "distance_source": distance_source,
        },
        # Floors & Access
        "access": {
            "pickup_floor": pickup_floor,
            "pickup_has_lift": pickup_has_lift,
            "pickup_floor_charge": str(pickup_floor_charge),
            "drop_floor": drop_floor,
            "drop_has_lift": drop_has_lift,
            "drop_floor_charge": str(drop_floor_charge),
            "rate_per_floor_block": str(rate_per_floor_block),
        },
        # Itemized Cost Breakdown
        "pricing": {
            "transport_base_fare": str(base_fare),
            "transport_distance_charge": str(distance_charge),
            "transport_total": str(transport_total),
            "packing_tier": packing_clean,
            "packing_label": packing_label,
            "packing_rate_per_cft": str(packing_rate_per_cft),
            "packing_charge": str(packing_charge),
            "base_labor_charge": str(base_labor),
            "floor_labor_charge": str(floor_labor_total),
            "labor_total": str(total_labor),
            "dismantling_required": dismantling_required,
            "dismantling_charge": str(dismantle_total),
            "unpacking_required": unpacking_required,
            "unpacking_charge": str(unpacking_charge),
            "subtotal": str(subtotal),
            "gst_rate": "18%",
            "gst_amount": str(gst),
            "total": str(total),
            "currency": "INR",
        },
        "total": total,
    }

    # Cache quote for 48h (in seconds: 172800)
    cache_key = f"pm_quote_{quote_id}"
    cache.set(cache_key, breakdown, timeout=172800)

    # Also generate a cryptographic signature token for process-independent verification
    token = signing.dumps({
        "quote_id": quote_id,
        "total": str(total),
        "subtotal": str(subtotal),
        "valid_until": valid_until.isoformat(),
        "total_cft": total_cft,
    })
    breakdown["signature_token"] = token

    return breakdown


def verify_packers_movers_quote(quote_id: str, submitted_total: Any = None) -> Tuple[bool, Optional[Dict[str, Any]], str]:
    """
    Verifies that a quote_id exists, has not expired, and matches the server's
    calculated amount. Returns (is_valid, breakdown, error_message).
    """
    if not quote_id:
        return False, None, "Missing quote ID."

    cache_key = f"pm_quote_{quote_id}"
    cached = cache.get(cache_key)

    if not cached:
        return False, None, f"Quote '{quote_id}' has expired or is invalid."

    valid_until_str = cached.get("valid_until")
    if valid_until_str:
        try:
            valid_until = timezone.datetime.fromisoformat(valid_until_str)
            if timezone.is_naive(valid_until):
                valid_until = timezone.make_aware(valid_until)
            if timezone.now() > valid_until:
                return False, None, f"Quote '{quote_id}' expired at {valid_until_str}."
        except Exception:
            pass

    quote_total = cached.get("total")
    if submitted_total is not None:
        try:
            sub_dec = _money(submitted_total)
            q_dec = _money(quote_total)
            if sub_dec != q_dec:
                return False, None, f"Submitted total ₹{sub_dec} does not match verified server quote ₹{q_dec}."
        except Exception as e:
            return False, None, f"Invalid total amount format: {e}"

    return True, cached, ""
