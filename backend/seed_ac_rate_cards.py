import os
import sys
import re
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import ACRepairRateCard

RATE_CARD_SEED_DATA = [
    {
        "category": "installation",
        "category_name": "Installation / Re-installation",
        "items": [
            {"item_code": "inst-1", "name": "AC Installation", "price": "From ₹1,199", "note": "Includes standard outdoor & indoor mounting"},
            {"item_code": "inst-2", "name": "AC Re-installation", "price": "From ₹1,499", "note": "Includes dismantle & new setup mounting"},
            {"item_code": "inst-3", "name": "AC Uninstallation", "price": "₹599", "note": "Safe gas pump-down & dismount"},
            {"item_code": "inst-4", "name": "AC Relocation", "price": "From ₹1,999", "note": "Uninstallation + transport packing + re-installation"},
        ],
    },
    {
        "category": "electrical",
        "category_name": "Electrical Parts",
        "items": [
            {"item_code": "elec-1", "name": "Replace Sensor", "price": "₹350", "note": ""},
            {"item_code": "elec-2", "name": "Non-Inverter PCB Repair", "price": "₹1,500", "note": ""},
            {"item_code": "elec-3", "name": "Capacitor 2–5", "price": "₹250", "note": ""},
            {"item_code": "elec-4", "name": "Capacitor 10–25", "price": "₹400", "note": ""},
            {"item_code": "elec-5", "name": "Capacitor 35–50", "price": "₹400", "note": ""},
            {"item_code": "elec-6", "name": "Capacitor 50–60", "price": "₹400", "note": ""},
            {"item_code": "elec-7", "name": "Dual Capacitor", "price": "₹600", "note": ""},
            {"item_code": "elec-8", "name": "Inverter PCB Repair", "price": "₹4,000", "note": ""},
            {"item_code": "elec-9", "name": "Replace LVT", "price": "₹900", "note": ""},
            {"item_code": "elec-10", "name": "Contactor Replacement", "price": "₹500", "note": ""},
            {"item_code": "elec-11", "name": "Contactor Daikin/O-General", "price": "₹1,500", "note": ""},
            {"item_code": "elec-12", "name": "Convert PCB with Remote", "price": "₹1,500", "note": ""},
        ],
    },
    {
        "category": "minor",
        "category_name": "Minor Parts",
        "items": [
            {"item_code": "min-1", "name": "Insulation Refix", "price": "₹50", "note": ""},
            {"item_code": "min-2", "name": "Drain Pipe Adjustment", "price": "₹50", "note": ""},
            {"item_code": "min-3", "name": "Swing/Flap Noise Adjustment", "price": "₹50", "note": ""},
            {"item_code": "min-4", "name": "Tighten/Replace Thimble", "price": "₹50", "note": ""},
            {"item_code": "min-5", "name": "Connector Wire Replacement (1m)", "price": "₹100", "note": ""},
            {"item_code": "min-6", "name": "Adjust Grill Locks", "price": "₹50", "note": ""},
            {"item_code": "min-7", "name": "Water Leakage Repair", "price": "₹449", "note": ""},
            {"item_code": "min-8", "name": "Adjust Pipe & Tighten Compressor Screw", "price": "₹50", "note": ""},
        ],
    },
    {
        "category": "gas_refrigeration",
        "category_name": "Gas / Refrigeration Parts",
        "items": [
            {"item_code": "gas-1", "name": "Condenser/Copper Coil Repair", "price": "₹500", "note": ""},
            {"item_code": "gas-2", "name": "Copper Coil Condenser 1 Ton Split", "price": "₹3,500", "note": ""},
            {"item_code": "gas-3", "name": "Copper Coil Condenser 1.5 Ton Split", "price": "₹4,000", "note": ""},
            {"item_code": "gas-4", "name": "Copper Coil Condenser 2 Ton Split", "price": "₹4,500", "note": ""},
            {"item_code": "gas-5", "name": "Copper Cooling Coil Split AC", "price": "₹6,000", "note": ""},
            {"item_code": "gas-6", "name": "Copper Cooling Coil Window AC", "price": "₹4,500", "note": ""},
            {"item_code": "gas-7", "name": "Compressor 0.8–1 Ton", "price": "₹6,500", "note": ""},
            {"item_code": "gas-8", "name": "Compressor 1.5 Ton", "price": "₹7,500", "note": ""},
            {"item_code": "gas-9", "name": "Compressor 2 Ton", "price": "₹9,200", "note": ""},
            {"item_code": "gas-10", "name": "Expansion Valve Replacement", "price": "₹1,200", "note": ""},
            {"item_code": "gas-11", "name": "Service Valve Replacement", "price": "₹400", "note": ""},
            {"item_code": "gas-12", "name": "Capillary & Filter Replacement", "price": "₹350", "note": ""},
            {"item_code": "gas-13", "name": "Flare Nut Replacement", "price": "₹150", "note": ""},
            {"item_code": "gas-14", "name": "Dead Nut", "price": "₹50", "note": ""},
            {"item_code": "gas-15", "name": "Cooling Coil U-Band", "price": "₹50", "note": ""},
            {"item_code": "gas-16", "name": "Pin Valve for Window AC", "price": "₹50", "note": ""},
        ],
    },
    {
        "category": "fans_motors",
        "category_name": "Fans / Motors",
        "items": [
            {"item_code": "fan-1", "name": "Outdoor Fan Motor", "price": "₹1,800", "note": ""},
            {"item_code": "fan-2", "name": "Blower Motor Replacement", "price": "₹2,200", "note": ""},
            {"item_code": "fan-3", "name": "Blower Replacement", "price": "₹1,100", "note": ""},
            {"item_code": "fan-4", "name": "Flap/Swing Motor Replacement", "price": "₹400", "note": ""},
            {"item_code": "fan-5", "name": "DC Outdoor Fan Motor", "price": "₹3,250", "note": ""},
            {"item_code": "fan-6", "name": "DC Indoor Fan Motor", "price": "₹3,500", "note": ""},
        ],
    },
    {
        "category": "other_parts",
        "category_name": "Other Parts",
        "items": [
            {"item_code": "oth-1", "name": "AC Fan Blade", "price": "₹700", "note": ""},
            {"item_code": "oth-2", "name": "Swing Blade Replacement", "price": "₹400", "note": ""},
            {"item_code": "oth-3", "name": "Grill Cover", "price": "₹1,500", "note": ""},
            {"item_code": "oth-4", "name": "Universal Remote", "price": "₹800", "note": ""},
            {"item_code": "oth-5", "name": "Compressor Grommet Set", "price": "₹299", "note": ""},
            {"item_code": "oth-6", "name": "Rubber Washer", "price": "₹50", "note": ""},
            {"item_code": "oth-7", "name": "Water Tray", "price": "₹500", "note": ""},
            {"item_code": "oth-8", "name": "Sleeve", "price": "₹50/piece", "note": ""},
            {"item_code": "oth-9", "name": "Stabilizer Repair – Single Boost", "price": "₹1,500", "note": ""},
            {"item_code": "oth-10", "name": "Stabilizer Repair – Double Boost", "price": "₹2,500", "note": ""},
        ],
    },
    {
        "category": "adjustment_basic",
        "category_name": "Adjustment / Basic Services",
        "items": [
            {"item_code": "adj-1", "name": "External Dust/Stick Removal", "price": "Free", "note": ""},
            {"item_code": "adj-2", "name": "AC Cover Removed/Fixed", "price": "Free", "note": ""},
            {"item_code": "adj-3", "name": "Electrical Contact Fixing", "price": "Free", "note": ""},
            {"item_code": "adj-4", "name": "Temperature/Remote Setting", "price": "Free", "note": ""},
            {"item_code": "adj-5", "name": "Electrical Plug Adjustment", "price": "₹50", "note": ""},
            {"item_code": "adj-6", "name": "Stabilizer Connection", "price": "₹100", "note": ""},
            {"item_code": "adj-7", "name": "Motor Noise Adjustment", "price": "Free", "note": ""},
            {"item_code": "adj-8", "name": "Blower Noise Adjustment", "price": "Free", "note": ""},
            {"item_code": "adj-9", "name": "General Noise Adjustment", "price": "Free", "note": ""},
        ],
    },
]


def extract_numeric_price(price_str):
    if not price_str or "free" in price_str.lower():
        return Decimal("0.00")
    # Clean string: remove commas and extract digits
    cleaned = price_str.replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if match:
        return Decimal(match.group(1))
    return None


def seed_ac_repair_rate_card():
    print("Seeding AC Repair & Spare Parts Rate Card into database...")
    deleted_count, _ = ACRepairRateCard.objects.all().delete()
    print(f"Cleared {deleted_count} previous records.")

    created_total = 0
    sort_idx = 10

    for cat_data in RATE_CARD_SEED_DATA:
        cat_id = cat_data["category"]
        cat_name = cat_data["category_name"]

        for item in cat_data["items"]:
            base_rate = extract_numeric_price(item["price"])
            ACRepairRateCard.objects.create(
                category=cat_id,
                category_name=cat_name,
                item_code=item["item_code"],
                name=item["name"],
                price=item["price"],
                base_rate=base_rate,
                note=item.get("note", ""),
                is_active=True,
                sort_order=sort_idx,
            )
            sort_idx += 10
            created_total += 1

    print(f"Successfully seeded {created_total} AC spare parts & repair items into ACRepairRateCard table!")


if __name__ == "__main__":
    seed_ac_repair_rate_card()
