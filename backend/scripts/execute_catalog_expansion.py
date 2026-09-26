"""
calservices/backend/scripts/execute_catalog_expansion.py

Executes catalog expansion for SEVO:
1. Integrates 3 Handwritten Reference Images (Living & Bedroom, Bathroom, Kitchen).
2. Closes Urban Company benchmark service gaps (Room Care, Curtains, Weekly Bathrooms, Geyser, RO Purifier).
3. Relocates mini-services from Full House Cleaning to dedicated Room Care & Mini Services.
4. Safely archives draft/misplaced package #990.
5. Preserves all historical bookings, customer records, and vendor links.
"""
import sys, os
from decimal import Decimal
from typing import Any, cast

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Setup Django environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
import django
django.setup()

from django.db import transaction, connection
from service_requests.models import CatalogCategory, Service, Package, AddOn, PackageStatus
from service_requests.services.catalog import (
    create_service, update_service,
    create_package, update_package, transition_package_status,
)
from settings_hub.views_catalog_v2 import clear_catalog_cache

def run_expansion():
    print("=" * 60)
    print("STARTING SEVO CATALOG EXPANSION & REFERENCE INTEGRATION")
    print("=" * 60)

    actor = None # System Migration
    audit_reason = "Customer Experience Reference Images & Urban Gap Expansion"

    with cast(Any, transaction.atomic()):
        # ── 0. SYNCHRONIZE DATABASE SEQUENCES ────────────────────────────────────
        with connection.cursor() as cursor:
            resets = [
                ('service_requests_package_id_seq', 'service_requests_package'),
                ('service_requests_service_id_seq', 'service_requests_service'),
                ('service_requests_catalogcategory_id_seq', 'service_requests_catalogcategory'),
            ]
            for seq, tbl in resets:
                try:
                    cursor.execute(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {tbl}), true);")
                except Exception:
                    pass
        print("✓ Database sequences synchronized")

        cat_clean = CatalogCategory.objects.filter(slug='home_pest_control').first()
        cat_appliance = CatalogCategory.objects.filter(slug='ac_appliance').first()

        if not cat_clean or not cat_appliance:
            print("ERROR: Required categories not found!")
            return

        # ── 1. EXPAND CLEANING & PEST CONTROL (CATEGORY 16) ─────────────────────
        print("\n--- 1. Expanding Cleaning & Pest Control (Category 16) ---")

        # A. Rename Service #24: sofa-cleaning -> sofa-upholstery-cleaning
        svc_sofa = Service.objects.filter(slug__in=['sofa-cleaning', 'sofa-upholstery-cleaning']).first()
        if svc_sofa:
            update_service(svc_sofa, {
                'name': 'Sofa, Carpet & Upholstery Cleaning',
                'slug': 'sofa-upholstery-cleaning',
                'description': 'Deep shampooing, dust mite extraction, and stain protection for fabric/leather sofas, carpets, mattresses, and curtains.',
            }, actor=actor, reason=audit_reason)
            print(f"  ✓ Updated Service #{svc_sofa.id}: 'Sofa, Carpet & Upholstery Cleaning'")

            # Add Curtain Cleaning
            if not Package.objects.filter(service=svc_sofa, slug='curtain-cleaning').exists():
                p_curtain = create_package({
                    'service': svc_sofa,
                    'slug': 'curtain-cleaning',
                    'name': 'Curtain Steam Cleaning & Dust Removal',
                    'base_price': Decimal('399.00'),
                    'offer_price': Decimal('299.00'),
                    'duration': '30 mins',
                    'tag': 'Fabric Care',
                    'description': 'High-temperature steam sanitization and vacuum dust extraction per window/pair of panels without removing curtains.',
                    'includes': [
                        'High-suction dust and allergen extraction',
                        'Hot steam disinfection to kill dust mites',
                        'Wrinkle relaxation and fabric deodorization',
                        'Suitable for sheer, blackout, and heavy cotton drapes'
                    ],
                    'status': PackageStatus.ACTIVE,
                    'image': '/mockups/service_cleaning.png',
                }, actor=actor)
                print(f"  ✓ Created Package #{p_curtain.id}: 'Curtain Steam Cleaning & Dust Removal'")

            # Add Sofa Stain Protection
            if not Package.objects.filter(service=svc_sofa, slug='sofa-stain-protection').exists():
                p_stain = create_package({
                    'service': svc_sofa,
                    'slug': 'sofa-stain-protection',
                    'name': 'Sofa Anti-Spill & Hydrophobic Stain Protection Shield',
                    'base_price': Decimal('499.00'),
                    'offer_price': Decimal('399.00'),
                    'duration': '45 mins',
                    'tag': 'Protection',
                    'description': 'Invisible hydrophobic barrier spray protecting sofa fabric against tea, coffee, food, and water stains for up to 6 months.',
                    'includes': [
                        'Surface dusting and lint removal',
                        'Even nanotech hydrophobic shield application',
                        'Repels liquids and oil spills without altering fabric texture',
                        'Safe for kids and pets'
                    ],
                    'status': PackageStatus.ACTIVE,
                    'image': '/mockups/service_cleaning.png',
                }, actor=actor)
                print(f"  ✓ Created Package #{p_stain.id}: 'Sofa Anti-Spill & Hydrophobic Stain Protection Shield'")

        # B. Expand Bathroom Cleaning (Service #25)
        svc_bath = Service.objects.filter(slug='bathroom-cleaning').first()
        if svc_bath:
            bath_additions = [
                {
                    'slug': '4-bathrooms-deep-cleaning-combo',
                    'name': '4 Bathrooms Deep Cleaning Combo',
                    'base_price': Decimal('1599.00'),
                    'offer_price': Decimal('1299.00'),
                    'duration': '2.5 - 3 hrs',
                    'tag': 'Best Value Combo',
                    'description': 'Complete intensive descaling and disinfection of 4 bathrooms for large apartments and independent villas.',
                    'includes': [
                        'Hard water stain & limescale removal from all tiles and fittings',
                        'Commode, washbasin, and vanity deep sanitization',
                        'Mirror & glass shower partition de-scaling',
                        'Floor machine scrub & drain anti-odor flush'
                    ],
                },
                {
                    'slug': 'weekly-bathroom-subscription',
                    'name': 'Weekly Bathroom Cleaning Plan (4 Visits / Month)',
                    'base_price': Decimal('1499.00'),
                    'offer_price': Decimal('1199.00'),
                    'duration': '4 Visits / Month',
                    'tag': 'Monthly Plan (Save 20%)',
                    'description': 'Weekly scheduled maintenance visit (4 deep cleans a month) keeping your bathroom sparkling and lime-free year-round.',
                    'includes': [
                        '1 scheduled visit every week (4 visits total)',
                        'Complete tile, commode, and washbasin scrub each visit',
                        'Mirror polishing and tap shining',
                        'Floor sanitization and fresh fragrance treatment'
                    ],
                },
                {
                    'slug': 'intense-bathroom-fan-combo',
                    'name': 'Intense Bathroom + Exhaust / Ceiling Fan Combo',
                    'base_price': Decimal('549.00'),
                    'offer_price': Decimal('429.00'),
                    'duration': '1 hr',
                    'tag': 'Popular Combo',
                    'description': 'Intensive single bathroom deep scrub plus complete exhaust fan or ceiling fan degreasing and blade cleaning.',
                    'includes': [
                        'Full 1-bathroom deep cleaning and descaling',
                        'Exhaust fan mesh removal, degreasing & motor wipe',
                        'Ceiling fan blade wipe and dust removal',
                        'Mirror polish & floor sanitization'
                    ],
                },
                {
                    'slug': 'bathroom-drain-clean',
                    'name': 'Bathroom Drain De-scaling & Anti-Odor Flush',
                    'base_price': Decimal('199.00'),
                    'offer_price': Decimal('149.00'),
                    'duration': '20 mins',
                    'tag': 'Add-On Mini',
                    'description': 'Enzymatic drain declogging and foam flush removing hair clogs, soap scum, and foul sewage odors.',
                    'includes': [
                        'Drain grate removal and debris clearance',
                        'Anti-odor enzymatic deep foam flush',
                        'Limescale removal around drain rim'
                    ],
                },
                {
                    'slug': 'bathroom-mirror-clean',
                    'name': 'Mirror & Glass Partition Water Stain De-scaling',
                    'base_price': Decimal('149.00'),
                    'offer_price': Decimal('99.00'),
                    'duration': '15 mins',
                    'tag': 'Add-On Mini',
                    'description': 'Specialized acid-free glass polishing removing stubborn hard water white spots from mirrors and shower cubicles.',
                    'includes': [
                        'Hard water scale chemical polish',
                        'Streak-free microfiber buffing',
                        'Hydrophobic glass coat for water runoff'
                    ],
                }
            ]
            for bdata in bath_additions:
                if not Package.objects.filter(service=svc_bath, slug=bdata['slug']).exists():
                    bp = create_package({
                        'service': svc_bath,
                        'slug': bdata['slug'],
                        'name': bdata['name'],
                        'base_price': bdata['base_price'],
                        'offer_price': bdata['offer_price'],
                        'duration': bdata['duration'],
                        'tag': bdata['tag'],
                        'description': bdata['description'],
                        'includes': bdata['includes'],
                        'status': PackageStatus.ACTIVE,
                        'image': '/mockups/service_cleaning.png',
                    }, actor=actor)
                    print(f"  ✓ Created Bathroom Package #{bp.id}: '{bp.name}'")

        # C. Create Service #140: Room Care & Mini Services
        svc_room_care = Service.objects.filter(slug='room-care-mini-services').first()
        if not svc_room_care:
            svc_room_care = create_service({
                'category': cat_clean,
                'slug': 'room-care-mini-services',
                'name': 'Room Care & Mini Services',
                'description': 'Individual room deep cleaning (living room, bedroom), balcony scrubbing, window washing, and ceiling fan maintenance.',
                'sort_order': 4,
                'is_active': True,
                'icon': 'Sparkles',
            }, actor=actor)
            print(f"  ✓ Created Service #{svc_room_care.id}: 'Room Care & Mini Services'")
        else:
            print(f"  ✓ Service #{svc_room_care.id}: 'Room Care & Mini Services' already exists")

        # Seed Living Room & Bedroom Deep Cleaning
        room_pkgs = [
            {
                'slug': 'living-room-deep-cleaning',
                'name': 'Living Room Deep Cleaning (Sofa, Windows & Cobwebs)',
                'base_price': Decimal('899.00'),
                'offer_price': Decimal('699.00'),
                'duration': '1.5 - 2 hrs',
                'tag': 'Room Care',
                'description': 'Comprehensive living room care covering sofa dry vacuuming, window glass cleaning, high cobweb removal, TV cabinet dusting, and floor machine scrub.',
                'includes': [
                    'Sofa dry vacuuming and cushion dusting',
                    'Window glass and track wiping',
                    'Cobweb removal from ceiling corners & fan dusting',
                    'TV unit, coffee table, and shelf surface wiping',
                    'Complete floor scrubbing and mopping'
                ]
            },
            {
                'slug': 'bedroom-essential-cleaning',
                'name': 'Bedroom Essential Deep Cleaning',
                'base_price': Decimal('649.00'),
                'offer_price': Decimal('499.00'),
                'duration': '1 - 1.5 hrs',
                'tag': 'Room Care',
                'description': 'Detailed bedroom cleaning including wardrobe exterior wiping, bed frame sanitization, mattress dry dusting, window wiping, and floor buffing.',
                'includes': [
                    'Wardrobe & dressing table exterior wipe',
                    'Bed frame sanitization and mattress dry vacuuming',
                    'Window pane wiping and ceiling fan dusting',
                    'Door and switchboard wipe down',
                    'Under-bed dust removal and floor wet scrub'
                ]
            }
        ]
        for rdata in room_pkgs:
            if not Package.objects.filter(service=svc_room_care, slug=rdata['slug']).exists():
                rp = create_package({
                    'service': svc_room_care,
                    'slug': rdata['slug'],
                    'name': rdata['name'],
                    'base_price': rdata['base_price'],
                    'offer_price': rdata['offer_price'],
                    'duration': rdata['duration'],
                    'tag': rdata['tag'],
                    'description': rdata['description'],
                    'includes': rdata['includes'],
                    'status': PackageStatus.ACTIVE,
                    'image': '/mockups/service_cleaning.png',
                }, actor=actor)
                print(f"  ✓ Created Room Care Package #{rp.id}: '{rp.name}'")

        # D. Relocate Mini Packages from Full House Cleaning to Room Care & Mini Services
        # Packages: #194, #195 (Windows), #330 (Fan), #332, #333 (Balcony), #334 (Door)
        relocated_ids = [
            (194, Decimal('149.00'), '30 mins', 'Upto 4x4 ft glass pane & track scrub'),
            (195, Decimal('249.00'), '1 hr', 'Above 4x4 ft glass facade & track scrub'),
            (330, Decimal('99.00'), '15 mins', 'Blade degreasing, canopy wipe & motor dusting'),
            (332, Decimal('199.00'), '30 mins', 'Floor pressure scrub, railing wipe & drain rinse'),
            (333, Decimal('299.00'), '50 mins', 'Floor pressure scrub, railing wipe & plant area clean'),
            (334, Decimal('99.00'), '10 mins', 'Door panel polish, frame wipe & handle disinfection'),
        ]
        for pkg_id, price, duration, inc_note in relocated_ids:
            p_obj = Package.objects.filter(id=pkg_id).first()
            if p_obj:
                update_package(p_obj, {
                    'service_id': svc_room_care.id,
                    'base_price': price + Decimal('50.00'),
                    'offer_price': price,
                    'duration': duration,
                    'includes': [inc_note, 'Eco-friendly cleaning solution', 'Lint-free microfiber wipe']
                }, actor=actor, reason="Relocated mini package from Full House Cleaning to Room Care")
                print(f"  ✓ Relocated Package #{pkg_id} ('{p_obj.name}') to Room Care & Mini Services (Price: ₹{price})")

        # E. Clarify Service #26 as Full Home Deep Cleaning
        svc_full = Service.objects.filter(slug='full-house-cleaning').first()
        if svc_full:
            update_service(svc_full, {
                'name': 'Full Home Deep Cleaning',
                'description': 'Intensive multi-hour deep sanitization for entire occupied apartments, vacant move-in homes, and duplex villas.',
            }, actor=actor, reason=audit_reason)
            print(f"  ✓ Updated Service #{svc_full.id}: 'Full Home Deep Cleaning'")


        # ── 2. EXPAND APPLIANCE REPAIR (CATEGORY 15) ─────────────────────────────
        print("\n--- 2. Expanding AC & Appliance Repair (Category 15) ---")

        # A. Create Service #141: Geyser / Water Heater Repair
        svc_geyser = Service.objects.filter(slug='geyser-water-heater').first()
        if not svc_geyser:
            svc_geyser = create_service({
                'category': cat_appliance,
                'slug': 'geyser-water-heater',
                'name': 'Geyser & Water Heater Repair',
                'description': 'Expert doorstep repair, heating coil replacement, thermostat repair, descaling, and installation for electric & gas geysers.',
                'sort_order': 9,
                'is_active': True,
                'icon': 'Flame',
            }, actor=actor)
            print(f"  ✓ Created Service #{svc_geyser.id}: 'Geyser & Water Heater Repair'")
        else:
            print(f"  ✓ Service #{svc_geyser.id}: 'Geyser & Water Heater Repair' already exists")

        geyser_pkgs = [
            {
                'slug': 'geyser-repair-diagnostics',
                'name': 'Geyser Inspection & Heating / Thermostat Diagnostics',
                'base_price': Decimal('349.00'),
                'offer_price': Decimal('249.00'),
                'duration': '30-45 mins',
                'tag': 'Diagnostics',
                'description': 'Inspection for no heating, power tripping, thermostat malfunction, or tank leakage.',
                'includes': [
                    'Thermostat & thermal cutout test',
                    'Heating element continuity check',
                    'Power cord, plug & earthing inspection',
                    'Transparent quote for spare replacement if needed'
                ]
            },
            {
                'slug': 'geyser-deep-descaling',
                'name': 'Geyser Deep Tank Descaling & Rust Flush',
                'base_price': Decimal('649.00'),
                'offer_price': Decimal('499.00'),
                'duration': '1 hr',
                'tag': 'Maintenance',
                'description': 'Complete draining of geyser tank, heating element removal, calcium scale scrape, and tank sediment flushing.',
                'includes': [
                    'Safe geyser draining and heating element dismount',
                    'Chemical limescale scrape from heating coil',
                    'Tank bottom sludge and rust sediment flush',
                    'Gasket seal check to prevent post-service leaks'
                ]
            },
            {
                'slug': 'geyser-installation',
                'name': 'Geyser Installation & Wall Mount Fit',
                'base_price': Decimal('499.00'),
                'offer_price': Decimal('399.00'),
                'duration': '45 mins',
                'tag': 'Installation',
                'description': 'Heavy-duty wall mounting, inlet/outlet pipe connection, and electrical safety check for up to 25L geysers.',
                'includes': [
                    'Heavy-duty wall anchor drilling and mounting',
                    'Inlet and outlet connection with pressure release valve',
                    'Leakage test under normal water pressure',
                    'Earthing check and heating test'
                ]
            }
        ]
        for gdata in geyser_pkgs:
            if not Package.objects.filter(service=svc_geyser, slug=gdata['slug']).exists():
                gp = create_package({
                    'service': svc_geyser,
                    'slug': gdata['slug'],
                    'name': gdata['name'],
                    'base_price': gdata['base_price'],
                    'offer_price': gdata['offer_price'],
                    'duration': gdata['duration'],
                    'tag': gdata['tag'],
                    'description': gdata['description'],
                    'includes': gdata['includes'],
                    'status': PackageStatus.ACTIVE,
                    'image': '/mockups/service_cleaning.png',
                }, actor=actor)
                print(f"  ✓ Created Geyser Package #{gp.id}: '{gp.name}'")

        # B. Create Service #142: Water Purifier (RO) Service & Repair
        svc_ro = Service.objects.filter(slug='water-purifier-ro').first()
        if not svc_ro:
            svc_ro = create_service({
                'category': cat_appliance,
                'slug': 'water-purifier-ro',
                'name': 'Water Purifier (RO) Service & Repair',
                'description': 'Doorstep RO/UV water purifier service, pre-filter replacement, membrane flush, TDS calibration, and motor repair.',
                'sort_order': 10,
                'is_active': True,
                'icon': 'Droplets',
            }, actor=actor)
            print(f"  ✓ Created Service #{svc_ro.id}: 'Water Purifier (RO) Service & Repair'")
        else:
            print(f"  ✓ Service #{svc_ro.id}: 'Water Purifier (RO) Service & Repair' already exists")

        ro_pkgs = [
            {
                'slug': 'ro-service-checkup',
                'name': 'RO Purifier General Service & TDS Health Test',
                'base_price': Decimal('349.00'),
                'offer_price': Decimal('249.00'),
                'duration': '30-45 mins',
                'tag': 'Checkup',
                'description': 'Input/output TDS calibration, pump pressure check, tube leakage audit, and pre-filter sediment inspection.',
                'includes': [
                    'Digital TDS level test before and after filtration',
                    'Sediment bowl & pre-filter housing cleaning',
                    'Booster pump pressure & adapter voltage test',
                    'Tube & joint leakage inspection'
                ]
            },
            {
                'slug': 'ro-filter-membrane-replacement',
                'name': 'Complete RO Filter & Membrane Replacement Labor',
                'base_price': Decimal('749.00'),
                'offer_price': Decimal('599.00'),
                'duration': '1 hr',
                'tag': 'Full Service',
                'description': 'Replacement of sediment filter, pre-carbon, post-carbon, and RO membrane with thorough internal tank sanitization.',
                'includes': [
                    'Full filter set replacement labor (Sediment, Carbon, RO Membrane)',
                    'Internal storage tank chemical sanitization',
                    'SMPS power adapter & auto-cut float valve inspection',
                    'Final pure water TDS calibration'
                ]
            },
            {
                'slug': 'ro-installation-dismount',
                'name': 'Water Purifier Installation & Wall Mount',
                'base_price': Decimal('449.00'),
                'offer_price': Decimal('349.00'),
                'duration': '45 mins',
                'tag': 'Installation',
                'description': 'Wall mounting, diverter valve fitment to tap, waste water pipe routing, and first flush calibration.',
                'includes': [
                    'Wall plate drilling & stable mounting',
                    'Inlet valve tap diverter connection',
                    'Drain water pipe securing',
                    'Leakage test & initial tank flush'
                ]
            }
        ]
        for rdata in ro_pkgs:
            if not Package.objects.filter(service=svc_ro, slug=rdata['slug']).exists():
                rop = create_package({
                    'service': svc_ro,
                    'slug': rdata['slug'],
                    'name': rdata['name'],
                    'base_price': rdata['base_price'],
                    'offer_price': rdata['offer_price'],
                    'duration': rdata['duration'],
                    'tag': rdata['tag'],
                    'description': rdata['description'],
                    'includes': rdata['includes'],
                    'status': PackageStatus.ACTIVE,
                    'image': '/mockups/service_cleaning.png',
                }, actor=actor)
                print(f"  ✓ Created RO Package #{rop.id}: '{rop.name}'")

        # C. Archive draft package #990 (water-leak under Refrigerator)
        pkg_990 = Package.objects.filter(id=990).first()
        if pkg_990 and pkg_990.status != PackageStatus.ARCHIVED:
            transition_package_status(pkg_990, PackageStatus.ARCHIVED, actor=actor, reason="Archived draft misplaced package under Refrigerator")
            print("  ✓ Safely ARCHIVED misplaced Package #990 under Refrigerator")

        # Invalidate all catalog caches
        clear_catalog_cache()
        print("\n✓ Catalog caches successfully cleared")

    print("\n" + "=" * 60)
    print("SEVO CATALOG EXPANSION COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_expansion()
