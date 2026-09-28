import os
import sys
import django
from django.db import transaction

backend_dir = r"c:\Users\user\Desktop\SEVO\CUS\calservices\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package
from django.core.cache import cache

def run():
    print("=== STARTING AUTHORITATIVE CATALOG RESTRUCTURING ===")
    with transaction.atomic():
        # 1. Deactivate stray test category 40 (qwed)
        stray_cats = CatalogCategory.objects.filter(slug="qwed")
        for sc in stray_cats:
            sc.is_active = False
            sc.save(update_fields=['is_active'])
            print(f"[DEACTIVATE] Deactivated stray category [{sc.id}] {sc.name} ({sc.slug})")

        # 2. Fix Painting & Waterproofing category image (replace Bing URL with authentic asset)
        paint_cat = CatalogCategory.objects.filter(slug="paintings").first()
        if paint_cat and ("bing.com" in (paint_cat.image or "") or not paint_cat.image):
            paint_cat.image = "/assets/sevo_cat_home_repair.jpg"
            paint_cat.save(update_fields=['image'])
            print(f"[IMAGE FIX] Category [{paint_cat.id}] Painting & Waterproofing image updated to {paint_cat.image}")

        # 3. Fix missing service images
        service_image_fixes = {
            134: "/assets/sevo_pro_appliance_v2.png", # Washing Machine Repair
            135: "/assets/sevo_pro_appliance_v2.png", # TV Installation & Repair
            141: "/assets/sevo_pro_appliance_v2.png", # Geyser & Water Heater Repair
            142: "/assets/sevo_pro_appliance_v2.png", # Water Purifier (RO) Service & Repair
            140: "/assets/sevo_pro_cleaning_v2.png",  # Room Care & Mini Services
            137: "/assets/sevo_pro_electrical_v2.png", # Electrician Services
            138: "/assets/sevo_pro_plumbing_v2.png",   # Plumber Services
            139: "/assets/sevo_pro_electrical_v2.png", # Carpenter Services
        }
        for svc_id, img_url in service_image_fixes.items():
            svc = Service.objects.filter(id=svc_id).first()
            if svc:
                svc.image = img_url
                svc.save(update_fields=['image'])
                print(f"[IMAGE FIX] Service [{svc.id}] {svc.name} image updated to {img_url}")

        # 4. Define Authoritative Service Groups (subtabs) for Services
        service_groups_map = {
            # Kitchen Cleaning (23)
            23: [
                {
                    "id": "complete_kitchen",
                    "label": "Complete Kitchen",
                    "description": "Full kitchen deep scrubbing, grease removal & empty kitchen cleans",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "chimney",
                    "label": "Chimney Cleaning",
                    "description": "High-suction baffle filter degreasing & motor scrubbing",
                    "enabled": True,
                    "sort_order": 2
                },
                {
                    "id": "appliances",
                    "label": "Appliance Cleaning",
                    "description": "Sanitization for fridges, microwaves, gas stoves, air fryers & OTGs",
                    "enabled": True,
                    "sort_order": 3
                },
                {
                    "id": "cabinets_tiles",
                    "label": "Cabinets & Tiles",
                    "description": "Oil-stain descaling on wall tiles, slab polish & trolley interiors",
                    "enabled": True,
                    "sort_order": 4
                },
                {
                    "id": "mini_services",
                    "label": "Mini Services",
                    "description": "Targeted sink descaling, window care & exhaust fan degreasing",
                    "enabled": True,
                    "sort_order": 5
                }
            ],
            # Bathroom Cleaning (25)
            25: [
                {
                    "id": "deep_clean_combos",
                    "label": "Intense Deep Cleaning",
                    "description": "Limescale removal, commodes, vanity & floor machine buffing (1 to 4 Baths)",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "fan_combos",
                    "label": "Bathroom + Fan Combos",
                    "description": "Intensive bathroom scrub combined with exhaust or ceiling fan degreasing",
                    "enabled": True,
                    "sort_order": 2
                },
                {
                    "id": "subscriptions",
                    "label": "Weekly Recurring Plans",
                    "description": "Scheduled regular visits for spotless, anti-fungal maintenance",
                    "enabled": True,
                    "sort_order": 3
                },
                {
                    "id": "mini_descaling",
                    "label": "Mini Descaling & Drain Care",
                    "description": "Targeted mirror water-stain removal & enzymatic odor flush",
                    "enabled": True,
                    "sort_order": 4
                }
            ],
            # Sofa, Carpet & Upholstery Cleaning (24)
            24: [
                {
                    "id": "sofa_cleaning",
                    "label": "Sofa Cleaning",
                    "description": "Deep injection-extraction shampooing for fabric and leather sofas",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "carpet_cleaning",
                    "label": "Carpet & Rugs",
                    "description": "High-suction vacuuming & stain spot extraction",
                    "enabled": True,
                    "sort_order": 2
                },
                {
                    "id": "mattress_care",
                    "label": "Mattress & Bed Care",
                    "description": "Anti-allergen vacuuming, dust mite removal & steam sanitization",
                    "enabled": True,
                    "sort_order": 3
                },
                {
                    "id": "curtains_protection",
                    "label": "Curtains & Fabric Shield",
                    "description": "On-rod steam refresh & hydrophobic stain barrier",
                    "enabled": True,
                    "sort_order": 4
                }
            ],
            # Room Care & Mini Services (140)
            140: [
                {
                    "id": "room_deep_clean",
                    "label": "Room Deep Cleaning",
                    "description": "Focused deep sanitization for single rooms without whole-home booking",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "balcony_care",
                    "label": "Balcony Cleaning",
                    "description": "Floor pressure wash, railing wipe & bird droppings removal",
                    "enabled": True,
                    "sort_order": 2
                },
                {
                    "id": "window_care",
                    "label": "Window & Glass Care",
                    "description": "Window pane wiping, track vacuuming & mesh dusting",
                    "enabled": True,
                    "sort_order": 3
                },
                {
                    "id": "mini_fixtures",
                    "label": "Fans & Doors",
                    "description": "Ceiling fan blade degreasing & door/frame dusting",
                    "enabled": True,
                    "sort_order": 4
                }
            ],
            # Full Home Deep Cleaning (26)
            26: [
                {
                    "id": "apartments",
                    "label": "Apartment Cleaning",
                    "description": "Complete deep clean for flats & move-in cleans",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "villas",
                    "label": "Villa & Independent House",
                    "description": "Complete multi-floor scrubbing, terrace & compound wash",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # Pest & Termite Control (28)
            28: [
                {
                    "id": "pest_control",
                    "label": "General Pest & Cockroach",
                    "description": "Intense gel baiting & spray for cockroaches and ants",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "termite_control",
                    "label": "Termite Extermination",
                    "description": "Chemical barrier drilling & wood injection treatment",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # AC Gas & Refrigerant (64)
            64: [
                {
                    "id": "leak_repair",
                    "label": "Leak Test & Coil Repair",
                    "description": "Nitrogen leak detection, valve swap & copper brazing",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "gas_refill",
                    "label": "Gas Refill & Top-Up",
                    "description": "Complete refrigerant charging & pressure balancing",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # AC Installation & Uninstallation (65)
            65: [
                {
                    "id": "installation",
                    "label": "Installation",
                    "description": "Split & Window AC mounting, piping & electrical setup",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "uninstallation",
                    "label": "Uninstallation & Relocation",
                    "description": "Safe gas pump-down, dismounting & relocation combos",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # Refrigerator Repair (130)
            130: [
                {
                    "id": "diagnostics",
                    "label": "Inspection & Diagnostics",
                    "description": "Cooling issues, compressor, electrical & thermostat tests",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "gas_refill",
                    "label": "Gas Refill & Leak Check",
                    "description": "R600a / R134a charging & leak seal",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # Geyser & Water Heater (141)
            141: [
                {
                    "id": "diagnostics",
                    "label": "Diagnostics & Descaling",
                    "description": "Thermostat testing, heating coil check & deep tank descaling",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "installation",
                    "label": "Installation",
                    "description": "Wall mounting, inlet/outlet piping & safety valve setup",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # Water Purifier RO (142)
            142: [
                {
                    "id": "service_filter",
                    "label": "Checkup & Filter Replacement",
                    "description": "TDS level inspection, membrane health check & filter replacement",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "installation",
                    "label": "Installation",
                    "description": "Wall mount bracket installation & plumbing line connection",
                    "enabled": True,
                    "sort_order": 2
                }
            ],
            # Waterproofing (93)
            93: [
                {
                    "id": "terrace_roof",
                    "label": "Terrace & Roof Treatments",
                    "description": "2-Coat, 4-Coat, PU coating & tar sheet heat treatments",
                    "enabled": True,
                    "sort_order": 1
                },
                {
                    "id": "specialized",
                    "label": "Specialized Areas & Flooring",
                    "description": "Epoxy flooring, water tank & bathroom internal waterproofing",
                    "enabled": True,
                    "sort_order": 2
                }
            ]
        }

        # Apply Service Groups to Service.customization
        for svc_id, groups in service_groups_map.items():
            svc = Service.objects.filter(id=svc_id).first()
            if svc:
                cust = svc.customization or {}
                cust['subtabs'] = groups
                svc.customization = cust
                svc.save(update_fields=['customization'])
                print(f"[SERVICE GROUPS] Configured {len(groups)} groups on [{svc.id}] {svc.name}")

        # 5. Authoritative Package -> sub_service_key Mapping
        package_group_assignments = {
            # Kitchen Cleaning (23)
            310: "complete_kitchen", # Full Kitchen cleaning(Basic)
            311: "complete_kitchen", # Full Kitchen Cleaning – Deep Clean
            312: "complete_kitchen", # Empty Kitchen Cleaning
            318: "chimney",          # Chimney Cleaning
            319: "chimney",          # Chimney & stove cleaning
            315: "appliances",       # Fridge cleaning - Single door
            316: "appliances",       # Fridge cleaning - Double door
            317: "appliances",       # Fridge cleaning - Side by side/ Triple door
            411: "appliances",       # Microwave cleaning
            320: "appliances",       # Gas stove cleaning - 2 burners
            321: "appliances",       # Gas stove cleaning - 3 burners
            322: "appliances",       # Gas stove cleaning - 4+ burners
            324: "appliances",       # Air fryer cleaning
            325: "appliances",       # OTG cleaning
            326: "appliances",       # Sandwich Maker/Griller cleaning
            323: "appliances",       # Dishwasher Cleaning
            313: "cabinets_tiles",   # Kitchen Tiles and Slabs Cleaning
            314: "cabinets_tiles",   # Cabinet & Trolley Cleaning (Interior & exterior)
            329: "cabinets_tiles",   # Dining Table & Chairs Cleaning
            331: "mini_services",    # Kitchen Exhaust Fan Cleaning
            327: "mini_services",    # Sink & under sink cleaning
            328: "mini_services",    # Kitchen Window Cleaning

            # Bathroom Cleaning (25)
            988: "deep_clean_combos",  # Intense Bathroom Deep Cleaning (1 Bathroom)
            1004: "deep_clean_combos", # 2 Bathrooms Deep Cleaning Combo
            1005: "deep_clean_combos", # 3 Bathrooms Deep Cleaning Combo
            1023: "deep_clean_combos", # 4 Bathrooms Deep Cleaning Combo
            1025: "fan_combos",        # Intense Bathroom + Exhaust / Ceiling Fan Combo
            1024: "subscriptions",     # Weekly Bathroom Cleaning Plan (4 Visits / Month)
            1027: "mini_descaling",    # Mirror & Glass Partition Water Stain De-scaling
            1026: "mini_descaling",    # Bathroom Drain De-scaling & Anti-Odor Flush

            # Sofa, Carpet & Upholstery Cleaning (24)
            166: "sofa_cleaning",       # Fabric Sofa Cleaning
            168: "sofa_cleaning",       # Leather Sofa Cleaning
            167: "sofa_cleaning",       # Fabric Sofa & Cushion Cleaning
            169: "sofa_cleaning",       # Leather Sofa & Cushion Cleaning
            172: "carpet_cleaning",     # Carpet Cleaning
            170: "mattress_care",       # Mattress Deep Cleaning
            171: "mattress_care",       # Mattress & Pillow Refresh
            1021: "curtains_protection", # Curtain Steam Cleaning & Dust Removal
            1022: "curtains_protection", # Sofa Anti-Spill & Hydrophobic Stain Protection Shield

            # Room Care & Mini Services (140)
            1028: "room_deep_clean", # Living Room Deep Cleaning (Sofa, Windows & Cobwebs)
            1029: "room_deep_clean", # Bedroom Essential Deep Cleaning
            332: "balcony_care",     # Balcony Cleaning: Upto 4 ft Width
            333: "balcony_care",     # Balcony Cleaning: Above 4 ft Width
            194: "window_care",      # Window Cleaning (Upto 4 Ft X 4 Ft)
            195: "window_care",      # Window Cleaning (Above 4 Ft X 4 Ft)
            330: "mini_fixtures",    # Ceiling Fan Cleaning
            334: "mini_fixtures",    # Door Cleaning

            # Full Home Deep Cleaning (26)
            184: "apartments", # Unoccupied apartment
            185: "apartments", # Full Apartment Cleaning — Classic
            186: "apartments", # Full Apartment Cleaning — Gold
            187: "apartments", # Full Apartment Cleaning — Diamond
            188: "apartments", # Unoccupied Apartment Move-in Clean
            189: "villas",     # Villa Deep Cleaning — Classic
            190: "villas",     # Villa Deep Cleaning — Gold
            191: "villas",     # Villa Deep Cleaning — Diamond

            # Pest & Termite Control (28)
            1006: "pest_control",    # Intense Cockroach & Ant Control (Apartment)
            200: "termite_control",  # Termite Control (Kitchen & Bathroom)
            201: "termite_control",  # Apartment Termite Extermination
            202: "termite_control",  # Bungalow & Villa Termite Extermination

            # AC Gas & Refrigerant (64)
            604: "leak_repair", # Service Valve Replacement
            497: "leak_repair", # High-Pressure Nitrogen Leak Test
            498: "leak_repair", # Copper Coil Pinhole Brazing & Welding
            605: "leak_repair", # Cooling Coil / Condenser Coil Repair
            281: "gas_refill",  # AC Gas Top-Up & Pressure Balancing
            280: "gas_refill",  # Complete AC Gas Charging (R32 / R410A / R22)

            # AC Installation & Uninstallation (65)
            501: "installation",   # Heavy-Duty Outdoor AC Wall Stand Fit
            973: "installation",   # Split AC Standard Installation (Standard Fit)
            500: "installation",   # Window AC Installation
            282: "installation",   # Split AC Complete Installation
            283: "uninstallation", # Split AC Safe Uninstallation
            609: "uninstallation", # Indoor Unit Reinstallation
            610: "uninstallation", # Outdoor Unit Reinstallation
            499: "uninstallation", # Split AC Dismount & Re-Installation Combo

            # Refrigerator Repair (130)
            997: "diagnostics", # Refrigerator Inspection & Diagnostics
            989: "diagnostics", # Compressor & Motor Diagnostics
            971: "gas_refill",  # Refrigerator Gas Charging & Leak Check
            998: "gas_refill",  # Refrigerator Gas Charging (R600a / R134a)

            # Geyser & Water Heater Repair (141)
            1030: "diagnostics",  # Geyser Inspection & Heating / Thermostat Diagnostics
            1031: "diagnostics",  # Geyser Deep Tank Descaling & Rust Flush
            1032: "installation", # Geyser Installation & Wall Mount Fit

            # Water Purifier (RO) Service & Repair (142)
            1033: "service_filter", # RO Purifier General Service & TDS Health Test
            1034: "service_filter", # Complete RO Filter & Membrane Replacement Labor
            1035: "installation",   # Water Purifier Installation & Wall Mount

            # Waterproofing (93)
            940: "terrace_roof", # Terrace Waterproofing — 2 Coat
            941: "terrace_roof", # Terrace Waterproofing — 4 Coat
            944: "terrace_roof", # Roof Repair / Patch Work
            942: "terrace_roof", # PU Coating / Dampness Treatment
            943: "terrace_roof", # 3 mm Tar Sheet / Gas Heating Waterproofing
            945: "specialized",  # Industrial Epoxy Flooring
            938: "specialized",  # Water Tank Waterproofing
            939: "specialized",  # Bathroom Waterproofing

            # Mini Truck (131)
            982: "light", # 3 Wheeler (500 kg Capacity)
            983: "heavy", # Tata Ace (750 kg Capacity)
            984: "heavy", # Pickup 8ft (1.2 Ton Capacity)
            985: "heavy", # 1.7 Ton Heavy Mini Truck

            # 2-Wheeler (132)
            986: "standard",         # 2-Wheeler Instant Parcel Delivery
            978: "standard",         # 2-Wheeler Standard Parcel Courier
            987: "electric_express", # 2-Wheeler Electric Express Courier

            # Packers & Movers (133)
            979: "residential",  # 1 RK / 1 BHK Household Shifting
            980: "residential",  # 2 BHK / 3 BHK Household Shifting
            981: "villa_office", # Villa / Corporate Office Relocation
        }

        updated_packages = 0
        for pkg_id, sub_key in package_group_assignments.items():
            pkg = Package.objects.filter(id=pkg_id).first()
            if pkg:
                pkg.sub_service_key = sub_key
                pkg.save(update_fields=['sub_service_key'])
                updated_packages += 1

        print(f"[PACKAGE KEYS] Updated sub_service_key for {updated_packages} packages")

        # 6. Ensure image fallback on packages that have no image: inherit from service or category image
        pkg_img_updated = 0
        for pkg in Package.objects.filter(status='ACTIVE'):
            if not pkg.image or pkg.image.strip() == "":
                fallback_img = (pkg.service.image if pkg.service and pkg.service.image else "") or \
                               (pkg.service.category.image if pkg.service and pkg.service.category and pkg.service.category.image else "")
                if fallback_img:
                    pkg.image = fallback_img
                    pkg.save(update_fields=['image'])
                    pkg_img_updated += 1

        print(f"[PACKAGE IMAGES] Fallback image populated for {pkg_img_updated} packages")

        # Clear catalog caches
        try:
            cache.clear()
            print("[CACHE] Catalog cache cleared successfully")
        except Exception as e:
            print(f"[CACHE] Cache clear warning: {e}")

    print("=== CATALOG RESTRUCTURING COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    run()
