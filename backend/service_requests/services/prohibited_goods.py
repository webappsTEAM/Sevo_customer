"""
service_requests/services/prohibited_goods.py

Server-Authoritative Cargo Safety & Prohibited Goods Gate for Goods & Transport.

Enforces business and safety policy preventing dangerous, illegal, or hazardous
cargo from being booked or dispatched through CalTrack Goods & Transport and
Packers & Movers services.

Covered Prohibited Categories:
1. WEAPONS_AND_FIREARMS: Firearms, ammunition, explosives, weapons, military combat gear.
2. EXPLOSIVES_AND_PYROTECHNICS: Commercial/unlicensed fireworks, dynamite, gunpowder, blasting agents.
3. NARCOTICS_AND_CONTRABAND: Illegal narcotics, drugs, cannabis/ganja, contraband substances.
4. HAZARDOUS_AND_TOXIC_CHEMICALS: Bulk industrial acids, toxic waste, radioactive materials, poisons.
5. FLAMMABLE_FUELS_AND_COMBUSTIBLES: Raw petroleum, bulk gasoline/diesel containers, unsealed volatile solvents.
6. RESTRICTED_WILDLIFE: Protected wildlife, ivory, contraband animal articles.

Household Exemptions:
Packers & Movers household shifting legitimately transports domestic items
(e.g., kitchen cutlery, sealed domestic cooking gas cylinders, household cleaning agents).
Legitimate domestic patterns are preserved and never blocked.
"""

import re
from typing import Tuple, Optional, Dict, Any, List

from .logistics_pricing import LOGISTICS_CATEGORIES

# ── Prohibited Cargo Pattern Definitions ──────────────────────────────────────
PROHIBITED_CATEGORIES = {
    "WEAPONS_AND_FIREARMS": {
        "label": "Weapons, Firearms & Ammunition",
        "patterns": [
            r"\b(firearm|firearms|gun|guns|pistol|pistols|revolver|revolvers|rifle|rifles|shotgun|ammunition|ammo|bullets|grenade|grenades|bomb|bombs|explosive device|military weapon|dagger|switchblade)\b",
        ],
        "message": "Transportation of firearms, ammunition, military weapons, or explosive devices is strictly prohibited.",
    },
    "EXPLOSIVES_AND_PYROTECHNICS": {
        "label": "Explosives & Pyrotechnics",
        "patterns": [
            r"\b(dynamite|gunpowder|blasting cap|detonator|fireworks|firecracker|crackers|pyrotechnic|pyrotechnics|rDX|tNT)\b",
        ],
        "message": "Transportation of fireworks, crackers, dynamite, or commercial pyrotechnics is strictly prohibited.",
    },
    "NARCOTICS_AND_CONTRABAND": {
        "label": "Illegal Drugs & Narcotics",
        "patterns": [
            r"\b(narcotic|narcotics|ganja|weed|cannabis|marijuana|cocaine|heroin|opium|methamphetamine|illicit drugs|contraband)\b",
        ],
        "message": "Transportation of narcotics, cannabis, illegal drugs, or unlawful contraband is strictly prohibited.",
    },
    "HAZARDOUS_AND_TOXIC": {
        "label": "Hazardous & Toxic Chemicals",
        "patterns": [
            r"\b(toxic chemical|radioactive|biohazard|hazardous waste|asbestos|cyanide|mercury concentrate|bulk industrial acid|chemical poison)\b",
        ],
        "message": "Transportation of radioactive materials, biohazards, toxic waste, or lethal chemical poisons is strictly prohibited.",
    },
    "FLAMMABLE_FUELS": {
        "label": "Highly Flammable Fuels & Volatiles",
        "patterns": [
            r"\b(raw petrol|crude oil|gasoline barrel|diesel fuel drum|bulk kerosene|naptha|aviation fuel)\b",
        ],
        "message": "Transportation of unsealed bulk fuel, raw petrol, or volatile flammable crude is strictly prohibited.",
    },
    "RESTRICTED_WILDLIFE": {
        "label": "Illegal Wildlife & Animal Articles",
        "patterns": [
            r"\b(ivory|elephant tusk|tiger skin|endangered animal|poached wildlife)\b",
        ],
        "message": "Transportation of protected wildlife, ivory, or restricted animal parts is strictly prohibited.",
    },
}

# ── Household Inventory Exemptions (P&M) ──────────────────────────────────────
# Terms that might match loose substrings but are standard household moving items
HOUSEHOLD_SAFE_TERMS = {
    "kitchen knife", "kitchen knives", "knife set", "cutlery", "crockery",
    "gas stove", "stove", "hob", "gas cylinder", "lpg gas cylinder", "cooking cylinder",
    "household detergent", "cleaning bleach", "mosquito coil", "paint bucket",
    "fire extinguisher", "puja crackers",
}


def _is_household_safe(text: str) -> bool:
    """Checks whether the text explicitly refers to legitimate household inventory."""
    t = text.lower()
    for safe in HOUSEHOLD_SAFE_TERMS:
        if safe in t:
            return True
    return False


def validate_cargo_safety(
    *,
    description: str = "",
    goods_type: str = "",
    cart_data: Any = None,
    service_category: str = "",
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Evaluates whether the cargo declared for a Goods & Transport or
    Packers & Movers booking complies with safety policies.

    Returns:
        (is_allowed: bool, rejection_message: Optional[str], category_code: Optional[str])

    - Non-GT bookings (e.g. AC Repair, Plumbing) bypass cargo checks: (True, None, None).
    - If cargo matches a prohibited category without a legitimate household exemption:
      returns (False, message, category_code).
    """
    category = (service_category or "").strip().lower()
    if category not in LOGISTICS_CATEGORIES:
        return True, None, None

    # Collect all customer-provided description text
    text_corpus = []
    if description:
        text_corpus.append(str(description))
    if goods_type:
        text_corpus.append(str(goods_type))

    # Extract item names from cart_data (truck/2w goods_type or P&M inventory items)
    if isinstance(cart_data, list):
        for entry in cart_data:
            if isinstance(entry, dict):
                if entry.get("goods_type"):
                    text_corpus.append(str(entry.get("goods_type")))
                inv = entry.get("inventory") or entry.get("items")
                if isinstance(inv, dict):
                    text_corpus.extend([str(k) for k in inv.keys()])
                elif isinstance(inv, list):
                    for it in inv:
                        if isinstance(it, dict) and (it.get("name") or it.get("item")):
                            text_corpus.append(str(it.get("name") or it.get("item")))
                        elif isinstance(it, str):
                            text_corpus.append(it)
    elif isinstance(cart_data, dict):
        inv = cart_data.get("inventory") or cart_data.get("items")
        if isinstance(inv, dict):
            text_corpus.extend([str(k) for k in inv.keys()])
        elif isinstance(inv, list):
            for it in inv:
                if isinstance(it, dict) and (it.get("name") or it.get("item")):
                    text_corpus.append(str(it.get("name") or it.get("item")))
                elif isinstance(it, str):
                    text_corpus.append(it)

    combined_text = " ".join(text_corpus).strip().lower()
    if not combined_text:
        # If no description was entered, serializer's required description check catches it
        return True, None, None

    # Check each prohibited category
    for cat_code, cat_meta in PROHIBITED_CATEGORIES.items():
        for pat in cat_meta["patterns"]:
            match = re.search(pat, combined_text, re.IGNORECASE)
            if match:
                matched_term = match.group(0)
                # Check for household safe exemption (e.g. kitchen knife in P&M)
                if _is_household_safe(combined_text) and matched_term in {"knife", "knives", "gas cylinder", "cylinder"}:
                    continue
                return False, cat_meta["message"], cat_code

    return True, None, None
