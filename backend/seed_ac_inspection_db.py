import os
import sys
import re
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import (
    ACInspectionRateCategory,
    ACInspectionRateItem,
    ACInspectionConfiguration,
)

SEED_CATEGORIES = [
    {
        "name": "Installation / Re-installation",
        "slug": "installation",
        "description": "Standard indoor, outdoor mounting, uninstallation, and relocation services.",
        "display_order": 10,
        "items": [
            {"name": "AC Installation", "price": "1199.00", "unit": "unit", "service_type": "INSTALLATION", "description": "Standard outdoor & indoor mounting"},
            {"name": "AC Re-installation", "price": "1499.00", "unit": "unit", "service_type": "INSTALLATION", "description": "Dismantle & new setup mounting"},
            {"name": "AC Uninstallation", "price": "599.00", "unit": "unit", "service_type": "INSTALLATION", "description": "Safe gas pump-down & dismount"},
            {"name": "AC Relocation", "price": "1999.00", "unit": "unit", "service_type": "INSTALLATION", "description": "Uninstallation + transport packing + re-installation"},
        ],
    },
    {
        "name": "Electrical Parts",
        "slug": "electrical",
        "description": "Capacitors, sensors, contactors, and PCB repairs.",
        "display_order": 20,
        "items": [
            {"name": "Replace Sensor", "price": "350.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Indoor/outdoor temperature sensor"},
            {"name": "Non-Inverter PCB Repair", "price": "1500.00", "unit": "per job", "service_type": "REPAIR", "description": "Standard non-inverter motherboard repair"},
            {"name": "Capacitor 2–5", "price": "250.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "2 to 5 MFD running capacitor"},
            {"name": "Capacitor 10–25", "price": "400.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "10 to 25 MFD motor capacitor"},
            {"name": "Capacitor 35–50", "price": "400.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "35 to 50 MFD compressor capacitor"},
            {"name": "Capacitor 50–60", "price": "400.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "50 to 60 MFD high-tonnage capacitor"},
            {"name": "Dual Capacitor", "price": "600.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Dual motor + compressor capacitor"},
            {"name": "Inverter PCB Repair", "price": "4000.00", "unit": "per job", "service_type": "REPAIR", "description": "Inverter AC IPM / microcontroller PCB repair"},
            {"name": "Replace LVT", "price": "900.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Low Voltage Transformer"},
            {"name": "Contactor Replacement", "price": "500.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Standard heavy duty contactor"},
            {"name": "Contactor Daikin/O-General", "price": "1500.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "OEM Daikin / O-General specialized contactor"},
            {"name": "Convert PCB with Remote", "price": "1500.00", "unit": "per set", "service_type": "REPAIR", "description": "Universal AC PCB conversion kit with remote"},
        ],
    },
    {
        "name": "Minor Parts",
        "slug": "minor",
        "description": "Pipes, thimbles, drain lines, insulation, and minor adjustments.",
        "display_order": 30,
        "items": [
            {"name": "Insulation Refix", "price": "50.00", "unit": "meter", "service_type": "ADJUSTMENT", "description": "Copper pipe thermal sleeve refix"},
            {"name": "Drain Pipe Adjustment", "price": "50.00", "unit": "point", "service_type": "ADJUSTMENT", "description": "Drain hose realign and unclog"},
            {"name": "Swing/Flap Noise Adjustment", "price": "50.00", "unit": "point", "service_type": "ADJUSTMENT", "description": "Louver noise calibration"},
            {"name": "Tighten/Replace Thimble", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Electrical terminal thimble replacement"},
            {"name": "Connector Wire Replacement (1m)", "price": "100.00", "unit": "meter", "service_type": "SPARE_PART", "description": "High-current connector copper wire"},
            {"name": "Adjust Grill Locks", "price": "50.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Front panel lock realignment"},
            {"name": "Water Leakage Repair", "price": "449.00", "unit": "job", "service_type": "REPAIR", "description": "Indoor unit water tray & drain tray fix"},
            {"name": "Adjust Pipe & Tighten Compressor Screw", "price": "50.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Vibration prevention mounting adjustments"},
        ],
    },
    {
        "name": "Gas / Refrigeration Parts",
        "slug": "gas-refrigeration",
        "description": "Compressors, copper coils, valves, and refrigerant components.",
        "display_order": 40,
        "items": [
            {"name": "Condenser/Copper Coil Repair", "price": "500.00", "unit": "point", "service_type": "REPAIR", "description": "Brazing & leak patch repair"},
            {"name": "Copper Coil Condenser 1 Ton Split", "price": "3500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Pure copper condenser coil 1 Ton"},
            {"name": "Copper Coil Condenser 1.5 Ton Split", "price": "4000.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Pure copper condenser coil 1.5 Ton"},
            {"name": "Copper Coil Condenser 2 Ton Split", "price": "4500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Pure copper condenser coil 2 Ton"},
            {"name": "Copper Cooling Coil Split AC", "price": "6000.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Indoor evaporator cooling coil"},
            {"name": "Copper Cooling Coil Window AC", "price": "4500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Window AC evaporator coil"},
            {"name": "Compressor 0.8–1 Ton", "price": "6500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Rotary compressor 0.8 - 1.0 Ton"},
            {"name": "Compressor 1.5 Ton", "price": "7500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Rotary compressor 1.5 Ton"},
            {"name": "Compressor 2 Ton", "price": "9200.00", "unit": "unit", "service_type": "SPARE_PART", "description": "High-capacity rotary compressor 2.0 Ton"},
            {"name": "Expansion Valve Replacement", "price": "1200.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Thermostatic/electronic expansion valve"},
            {"name": "Service Valve Replacement", "price": "400.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "2-way / 3-way brass service valve"},
            {"name": "Capillary & Filter Replacement", "price": "350.00", "unit": "set", "service_type": "SPARE_PART", "description": "Filter drier with capillary tube"},
            {"name": "Flare Nut Replacement", "price": "150.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Brass flare nut"},
            {"name": "Dead Nut", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Port sealing dead nut"},
            {"name": "Cooling Coil U-Band", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Copper U-bend joint"},
            {"name": "Pin Valve for Window AC", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Charging port pin valve"},
        ],
    },
    {
        "name": "Fans / Motors",
        "slug": "fans-motors",
        "description": "Indoor blowers, outdoor fan motors, and flap stepper motors.",
        "display_order": 50,
        "items": [
            {"name": "Outdoor Fan Motor", "price": "1800.00", "unit": "unit", "service_type": "SPARE_PART", "description": "AC condenser fan motor"},
            {"name": "Blower Motor Replacement", "price": "2200.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Indoor unit fan motor"},
            {"name": "Blower Replacement", "price": "1100.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Cross-flow cylindrical blower wheel"},
            {"name": "Flap/Swing Motor Replacement", "price": "400.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Air deflector stepper motor"},
            {"name": "DC Outdoor Fan Motor", "price": "3250.00", "unit": "unit", "service_type": "SPARE_PART", "description": "BLDC outdoor inverter motor"},
            {"name": "DC Indoor Fan Motor", "price": "3500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "BLDC indoor inverter blower motor"},
        ],
    },
    {
        "name": "Other Parts",
        "slug": "other-parts",
        "description": "Blades, remotes, rubber grommets, trays, and stabilizer repairs.",
        "display_order": 60,
        "items": [
            {"name": "AC Fan Blade", "price": "700.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Outdoor propeller fan blade"},
            {"name": "Swing Blade Replacement", "price": "400.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Horizontal swing louver blade"},
            {"name": "Grill Cover", "price": "1500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Front decorative cabinet fascia"},
            {"name": "Universal Remote", "price": "800.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Universal programmable AC remote control"},
            {"name": "Compressor Grommet Set", "price": "299.00", "unit": "set", "service_type": "SPARE_PART", "description": "Vibration damping rubber feet set (3 pcs)"},
            {"name": "Rubber Washer", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Heavy-duty vibration washer"},
            {"name": "Water Tray", "price": "500.00", "unit": "unit", "service_type": "SPARE_PART", "description": "Condensate collection tray"},
            {"name": "Sleeve", "price": "50.00", "unit": "per piece", "service_type": "SPARE_PART", "description": "Wall hole sleeve pipe"},
            {"name": "Stabilizer Repair – Single Boost", "price": "1500.00", "unit": "job", "service_type": "REPAIR", "description": "Relay & transformer repair for single boost"},
            {"name": "Stabilizer Repair – Double Boost", "price": "2500.00", "unit": "job", "service_type": "REPAIR", "description": "Circuit repair for wide voltage double boost"},
        ],
    },
    {
        "name": "Adjustment / Basic Services",
        "slug": "adjustment-basic",
        "description": "Routine calibrations, noise suppression, and electrical checks.",
        "display_order": 70,
        "items": [
            {"name": "External Dust/Stick Removal", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Clearing debris around outdoor unit fan"},
            {"name": "AC Cover Removed/Fixed", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Cover dismount or realignment"},
            {"name": "Electrical Contact Fixing", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Terminal cleaning & snug fit"},
            {"name": "Temperature/Remote Setting", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Mode setup & pairing calibration"},
            {"name": "Electrical Plug Adjustment", "price": "50.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "16A plug pin refitting"},
            {"name": "Stabilizer Connection", "price": "100.00", "unit": "job", "service_type": "LABOR", "description": "Safe voltage stabilizer wiring & check"},
            {"name": "Motor Noise Adjustment", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Motor shaft lubrication and balance"},
            {"name": "Blower Noise Adjustment", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Blower bearing alignment"},
            {"name": "General Noise Adjustment", "price": "0.00", "unit": "job", "service_type": "ADJUSTMENT", "description": "Chassis vibration dampening"},
        ],
    },
]


def seed_ac_inspection_database(force_reset=False):
    """
    Safely populates or updates PostgreSQL categories, items, and configuration.
    Preserves historical items without hard-deleting records that may be referenced.
    """
    print("Seeding AC Inspection relational models in PostgreSQL...")

    # 1. Configuration
    config = ACInspectionConfiguration.get_solo()
    if force_reset:
        config.diagnostic_fee = Decimal("199.00")
        config.currency = "INR"
        config.is_active = True
        config.save()
    print(f"Authoritative Diagnostic Fee: {config.currency} {config.diagnostic_fee}")

    # 2. Categories and items
    total_categories = 0
    total_items = 0

    for cat_data in SEED_CATEGORIES:
        cat_obj, _ = ACInspectionRateCategory.objects.update_or_create(
            slug=cat_data["slug"],
            defaults={
                "name": cat_data["name"],
                "description": cat_data["description"],
                "display_order": cat_data["display_order"],
                "is_active": True,
            }
        )
        total_categories += 1

        item_order = 10
        for item_data in cat_data["items"]:
            item_price = Decimal(str(item_data["price"]))
            ACInspectionRateItem.objects.update_or_create(
                category=cat_obj,
                name=item_data["name"],
                defaults={
                    "description": item_data.get("description", ""),
                    "price": item_price,
                    "unit": item_data.get("unit", "per piece"),
                    "service_type": item_data.get("service_type", "SPARE_PART"),
                    "display_order": item_order,
                    "is_active": True,
                }
            )
            item_order += 10
            total_items += 1

    print(f"Successfully seeded {total_categories} categories and {total_items} items into PostgreSQL!")


if __name__ == "__main__":
    seed_ac_inspection_database(force_reset=True)
