"""
calservices/backend/scripts/execute_catalog_modernization.py

Authoritative Catalog Modernization Script for SEVO.
Executes all catalog corrections via service_requests.services.catalog domain
services, with complete CatalogChangeLog audit trail and cache invalidation.
Preserves all historical booking data by archiving duplicates instead of deleting.
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

from django.db import transaction
from service_requests.models import CatalogCategory, Service, Package, AddOn, PackageStatus
from service_requests.services.catalog import (
    create_category, update_category, delete_category,
    create_service, update_service,
    create_package, update_package, transition_package_status,
    create_addon, update_addon
)
from seed_ac_and_repair_services_data import AC_APPLIANCE_DATA, MAINTENANCE_DATA
from settings_hub.views_catalog_v2 import clear_catalog_cache
from django.core.cache import cache

def run_modernization():
    print("=" * 60)
    print("STARTING SEVO CATALOG MODERNIZATION")
    print("=" * 60)

    actor = None # System Migration
    audit_reason = "Urban Company-style Marketplace Simplicity Modernization"

    with cast(Any, transaction.atomic()):
        # ── 0. SYNCHRONIZE DATABASE SEQUENCES ────────────────────────────────────
        from django.db import connection
        with connection.cursor() as cursor:
            resets = [
                ('service_requests_package_id_seq', 'service_requests_package'),
                ('service_requests_service_id_seq', 'service_requests_service'),
                ('service_requests_catalogcategory_id_seq', 'service_requests_catalogcategory'),
                ('goods_packages_id_seq', 'goods_packages'),
                ('vegetables_packages_id_seq', 'vegetables_packages'),
            ]
            for seq, tbl in resets:
                try:
                    cursor.execute(f"SELECT setval('{seq}', (SELECT COALESCE(MAX(id), 1) FROM {tbl}), true);")
                except Exception:
                    pass

        # ── 1. CATEGORY STANDARDIZATION ──────────────────────────────────────────
        print("\n[Step 1] Standardizing Categories...")
        
        # Category 16: Cleaning -> Cleaning & Pest Control
        cat_clean = CatalogCategory.objects.filter(id=16).first()
        if cat_clean:
            update_category(cat_clean, {
                'name': 'Cleaning & Pest Control',
                'description': 'Professional home deep cleaning, bathroom descaling, kitchen degreasing & pest control.',
                'sort_order': 1,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 16 -> 'Cleaning & Pest Control' (Order: 1)")

        # Category 17: Paintings -> Painting & Waterproofing
        cat_paint = CatalogCategory.objects.filter(id=17).first()
        if cat_paint:
            update_category(cat_paint, {
                'name': 'Painting & Waterproofing',
                'description': 'Interior & exterior wall painting, waterproof chemical treatment, and wood polish with laser estimation.',
                'sort_order': 2,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 17 -> 'Painting & Waterproofing' (Order: 2)")

        # Category: Electrician, Plumber & Carpenter (Activate 7th Pillar)
        cat_maint = CatalogCategory.objects.filter(slug='electrician_plumbing_carpentry').first()
        if not cat_maint:
            cat_maint = create_category({
                'name': 'Electrician, Plumber & Carpenter',
                'slug': 'electrician_plumbing_carpentry',
                'description': 'Expert doorstep electricians, plumbers, and carpenters in Hosur. Verified pros, transparent rates & 30-day warranty.',
                'sort_order': 3,
                'is_active': True,
                'icon': 'Wrench'
            }, actor=actor)
            print(f"  ✓ Created Category #{cat_maint.id} -> 'Electrician, Plumber & Carpenter' (Order: 3)")
        else:
            update_category(cat_maint, {
                'name': 'Electrician, Plumber & Carpenter',
                'description': 'Expert doorstep electricians, plumbers, and carpenters in Hosur. Verified pros, transparent rates & 30-day warranty.',
                'sort_order': 3,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print(f"  ✓ Updated Category #{cat_maint.id} -> 'Electrician, Plumber & Carpenter' (Order: 3)")

        # Category 15: AC & Appliance -> AC & Appliance Repair
        cat_ac = CatalogCategory.objects.filter(id=15).first()
        if cat_ac:
            update_category(cat_ac, {
                'name': 'AC & Appliance Repair',
                'description': 'Doorstep AC service, jet cleaning, gas charging, refrigerator, washing machine & microwave repairs.',
                'sort_order': 4,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 15 -> 'AC & Appliance Repair' (Order: 4)")

        # Category 11: Mason -> Masonry & Civil Work
        cat_mason = CatalogCategory.objects.filter(id=11).first()
        if cat_mason:
            update_category(cat_mason, {
                'name': 'Masonry & Civil Work',
                'description': 'Expert tile fixing, wall plastering, crack repair, and minor home civil construction.',
                'sort_order': 5,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 11 -> 'Masonry & Civil Work' (Order: 5)")

        # Category 12: Goods & Transport
        cat_gt = CatalogCategory.objects.filter(id=12).first()
        if cat_gt:
            update_category(cat_gt, {
                'name': 'Goods & Transport',
                'description': 'Fast mini-trucks (Tata Ace, 3-Wheeler, Pickup), 2-wheeler parcel delivery, and house shifting in Hosur.',
                'sort_order': 6,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 12 -> 'Goods & Transport' (Order: 6)")

        # Category 18: Vegetables & Groceries
        cat_veg = CatalogCategory.objects.filter(id=18).first()
        if cat_veg:
            update_category(cat_veg, {
                'name': 'Farm-Fresh Vegetables & Groceries',
                'description': 'Directly from Hosur farmers to your doorstep in 8–15 mins.',
                'sort_order': 7,
                'is_active': True
            }, actor=actor, reason=audit_reason)
            print("  ✓ Updated Category 18 -> 'Farm-Fresh Vegetables & Groceries' (Order: 7)")

        # Deactivate/delete empty zombie categories 35, 37, 38
        for zid in [35, 37, 38]:
            zcat = CatalogCategory.objects.filter(id=zid).first()
            if zcat and not zcat.services.exists():
                delete_category(zcat, actor=actor)
                print(f"  ✓ Cleaned up empty zombie Category #{zid} ({zcat.slug})")


        # ── 2. DEDUPLICATE & ARCHIVE CONFLICTING PACKAGES ────────────────────────
        print("\n[Step 2] Archiving Duplicate & Conflicting Packages...")
        archive_map = {
            # AC Repair duplicates
            598: "Duplicate of #278 (Less/No Cooling diagnostics)",
            599: "Duplicate of #493 (Noise/vibration diagnostics)",
            600: "Duplicate of #279 (Water leakage repair)",
            601: "Duplicate of #493 (Noise/smell diagnostics)",
            597: "Redundant generic inspection (#597)",
            # AC Gas Refill duplicates
            602: "Duplicate of #280 (Gas charging & leak fix)",
            603: "Duplicate of #280 (Gas charging)",
            # AC Installation duplicates
            606: "Duplicate of #282 (Split AC installation)",
            607: "Conflicting window AC installation (799 vs 599)",
            608: "Duplicate of #283 (Split AC uninstallation)",
            # Mini truck dummy test package
            991: "Dummy test package (4 wheel, Rs.10)",
            # Duplicate vegetable
            955: "Duplicate of #888 (Bitter Gourd (Pavakkai))",
        }
        for pid, rsn in archive_map.items():
            pkg = Package.objects.filter(id=pid).first()
            if pkg and pkg.status != PackageStatus.ARCHIVED:
                transition_package_status(pkg, PackageStatus.ARCHIVED, actor=actor, reason=f"{audit_reason}: {rsn}")
                print(f"  ✓ Archived Package #{pid} ('{pkg.name}') — {rsn}")


        # ── 3. AC & APPLIANCE ENRICHMENT & SEEDING ───────────────────────────────
        print("\n[Step 3] Restructuring AC & Appliance Services & Packages...")
        
        svc_ac_clean = Service.objects.filter(id=62).first() # ac-service-cleaning
        svc_ac_install = Service.objects.filter(id=65).first() # ac-installation

        # Relocate Pkg #973 (Full Installation) from Service 62 to Service 65
        pkg973 = Package.objects.filter(id=973, service_id=62).first()
        if pkg973 and svc_ac_install:
            update_package(pkg973, {
                'service_id': svc_ac_install.id,
                'name': 'Split AC Standard Installation (Standard Fit)',
                'duration': '1.5 hrs',
                'description': 'Standard split AC mounting with copper piping connection and electrical check.',
                'includes': ['Indoor and outdoor unit mounting', 'Copper piping connection (up to standard length)', 'Cooling performance check']
            }, actor=actor, reason="Relocated installation package to AC Installation service")
            print("  ✓ Relocated Pkg #973 from Service 62 to Service 65")

        # Seed real AC Cleaning packages on Service 62 from AC_APPLIANCE_DATA
        if svc_ac_clean:
            ac_clean_entry = AC_APPLIANCE_DATA.get('ac-service-cleaning')
            ac_clean_specs: list[dict[str, Any]] = ac_clean_entry.get('packages', []) if isinstance(ac_clean_entry, dict) and isinstance(ac_clean_entry.get('packages'), list) else []
            for pdata in ac_clean_specs:
                pslug = pdata.get('slug')
                existing_pkg = Package.objects.filter(service=svc_ac_clean, slug=pslug).first()
                pkg_fields = {
                    'name': pdata.get('name'),
                    'slug': pslug,
                    'service': svc_ac_clean,
                    'base_price': Decimal(str(pdata.get('price'))),
                    'offer_price': Decimal(str(pdata.get('price'))),
                    'duration': pdata.get('duration'),
                    'tag': pdata.get('tag', ''),
                    'description': pdata.get('description', ''),
                    'includes': pdata.get('includes', []),
                    'status': PackageStatus.ACTIVE,
                    'image': pdata.get('image', ''),
                }
                if not existing_pkg:
                    created_pkg = create_package(pkg_fields, actor=actor)
                    print(f"  ✓ Created AC Cleaning Pkg #{created_pkg.id}: '{created_pkg.name}' (₹{created_pkg.base_price})")
                    # Add add-ons
                    for add_item in pdata.get('addons', []):
                        create_addon({
                            'package': created_pkg,
                            'name': add_item.get('name'),
                            'price': Decimal(str(add_item.get('price'))),
                            'description': add_item.get('description', ''),
                            'sort_order': add_item.get('sort_order', 1),
                            'is_active': True
                        }, actor=actor)
                else:
                    update_package(existing_pkg, pkg_fields, actor=actor, reason=audit_reason)
                    print(f"  ✓ Updated AC Cleaning Pkg #{existing_pkg.id}: '{existing_pkg.name}'")

        # Standardize Refrigerator Service (Service 130)
        svc_fridge = Service.objects.filter(id=130).first()
        if svc_fridge:
            update_service(svc_fridge, {
                'name': 'Refrigerator Repair',
                'slug': 'refrigerator',
                'description': 'Doorstep single and double door refrigerator diagnostics, cooling fix & gas charging.'
            }, actor=actor, reason=audit_reason)
            print("  ✓ Standardized Service 130 -> 'Refrigerator Repair'")

            # Update existing fridge packages
            p971 = Package.objects.filter(id=971).first()
            if p971:
                update_package(p971, {
                    'name': 'Refrigerator Gas Charging & Leak Check',
                    'base_price': Decimal('999.00'),
                    'offer_price': Decimal('899.00'),
                    'duration': '45 mins',
                    'tag': 'Best Value',
                    'description': 'Full refrigerant top-up/recharge with compressor pressure test.',
                    'includes': ['High-pressure nitrogen leak test', 'Standard refrigerant gas top-up', 'Compressor cooling test', '30-day warranty']
                }, actor=actor, reason=audit_reason)

            p989 = Package.objects.filter(id=989).first()
            if p989:
                update_package(p989, {
                    'name': 'Compressor & Motor Diagnostics',
                    'base_price': Decimal('499.00'),
                    'offer_price': Decimal('399.00'),
                    'duration': '45 mins',
                    'tag': 'Diagnostic',
                    'description': 'Thorough inspection of refrigerator compressor, starting relay, and motor circuit.',
                    'includes': ['Compressor ampere load testing', 'Relay and capacitor check', 'Temperature thermostat check', 'Transparent quote before part change']
                }, actor=actor, reason=audit_reason)

            p990 = Package.objects.filter(id=990).first()
            if p990:
                update_package(p990, {
                    'name': 'Water Leakage & Drain Clearing',
                    'base_price': Decimal('349.00'),
                    'offer_price': Decimal('299.00'),
                    'duration': '30 mins',
                    'description': 'Clearing blocked defrost drain tubes and repairing internal leakage.',
                    'includes': ['Defrost tray flushing', 'Internal drain line de-icing & unclogging', 'Door gasket seal inspection']
                }, actor=actor, reason=audit_reason)

            # Add missing standard inspection packages from AC_APPLIANCE_DATA for refrigerator
            fridge_entry = AC_APPLIANCE_DATA.get('refrigerator')
            fridge_specs: list[dict[str, Any]] = fridge_entry.get('packages', []) if isinstance(fridge_entry, dict) and isinstance(fridge_entry.get('packages'), list) else []
            for r_pkg in fridge_specs:
                if not Package.objects.filter(service=svc_fridge, slug=r_pkg.get('slug')).exists():
                    n_pkg = create_package({
                        'service': svc_fridge,
                        'slug': r_pkg.get('slug'),
                        'name': r_pkg.get('name'),
                        'base_price': Decimal(str(r_pkg.get('price'))),
                        'offer_price': Decimal(str(r_pkg.get('price'))),
                        'duration': r_pkg.get('duration'),
                        'tag': r_pkg.get('tag', ''),
                        'description': r_pkg.get('description', ''),
                        'includes': r_pkg.get('includes', []),
                        'status': PackageStatus.ACTIVE,
                    }, actor=actor)
                    print(f"  ✓ Added Refrigerator Pkg #{n_pkg.id}: '{n_pkg.name}'")

        # Create/Populate Washing Machine, TV Display, Microwave under ac_appliance if not present
        other_appliance_services = [
            ('washing-machine', 'Washing Machine Repair', 'Washing Machine repair, drum cleaning, spin error & water intake fix.'),
            ('tv-display', 'TV Installation & Repair', 'Smart TV wall mounting, backlight repair, sound issue & screen diagnostics.'),
            ('microwave', 'Microwave Repair', 'Microwave oven heating repair, turntable motor, touch panel & spark fix.'),
        ]
        for s_slug, s_name, s_desc in other_appliance_services:
            svc_obj = Service.objects.filter(category=cat_ac, slug=s_slug).first()
            if not svc_obj:
                svc_obj = create_service({
                    'category': cat_ac,
                    'slug': s_slug,
                    'name': s_name,
                    'description': s_desc,
                    'is_active': True
                }, actor=actor)
                print(f"  ✓ Created Appliance Service #{svc_obj.id}: '{s_name}'")
            
            # Seed packages from AC_APPLIANCE_DATA
            s_entry = AC_APPLIANCE_DATA.get(s_slug)
            s_pkgs: list[dict[str, Any]] = s_entry.get('packages', []) if isinstance(s_entry, dict) and isinstance(s_entry.get('packages'), list) else []
            for spkg in s_pkgs:
                if not Package.objects.filter(service=svc_obj, slug=spkg.get('slug')).exists():
                    npkg = create_package({
                        'service': svc_obj,
                        'slug': spkg.get('slug'),
                        'name': spkg.get('name'),
                        'base_price': Decimal(str(spkg.get('price'))),
                        'offer_price': Decimal(str(spkg.get('price'))),
                        'duration': spkg.get('duration'),
                        'tag': spkg.get('tag', ''),
                        'description': spkg.get('description', ''),
                        'includes': spkg.get('includes', []),
                        'status': PackageStatus.ACTIVE,
                    }, actor=actor)
                    print(f"    ✓ Added Pkg #{npkg.id}: '{npkg.name}' on {s_name}")


        # ── 4. CLEANING & PEST CONTROL ENRICHMENT ─────────────────────────────────
        print("\n[Step 4] Restructuring Cleaning & Pest Control...")

        # Service 25: Bathroom Cleaning
        svc_bath = Service.objects.filter(id=25).first()
        if svc_bath:
            p988 = Package.objects.filter(id=988).first()
            bath_incl = [
                "Deep tile descaling and yellow stain scrub",
                "Toilet pot/commode inside & outside sanitization",
                "Washbasin, vanity mirror & chrome tap buffing",
                "Exhaust fan, geyser exterior & door wipe down",
                "Floor mechanical scrubbing & deodorizing wash"
            ]
            bath_excl = [
                "Inside cabinet storage cleaning",
                "Severe grout reconstruction or tile re-plastering"
            ]
            if p988:
                update_package(p988, {
                    'name': 'Intense Bathroom Deep Cleaning (1 Bathroom)',
                    'base_price': Decimal('399.00'),
                    'offer_price': Decimal('349.00'),
                    'duration': '45-60 mins',
                    'tag': 'Best Seller',
                    'description': 'Intensive single bathroom deep scrub with tile descaling and mirror buffing.',
                    'includes': bath_incl,
                    'excludes': bath_excl,
                    'status': PackageStatus.ACTIVE
                }, actor=actor, reason=audit_reason)
                print("  ✓ Updated Pkg #988 -> 'Intense Bathroom Deep Cleaning (1 Bathroom)' (ACTIVE, ₹349)")

            # Add 2 Bathrooms and 3 Bathrooms Combos
            if not Package.objects.filter(service=svc_bath, slug='2-bathrooms-deep-cleaning-combo').exists():
                pkg_bath2 = create_package({
                    'service': svc_bath,
                    'slug': '2-bathrooms-deep-cleaning-combo',
                    'name': '2 Bathrooms Deep Cleaning Combo',
                    'base_price': Decimal('799.00'),
                    'offer_price': Decimal('699.00'),
                    'duration': '1.5 - 2 hrs',
                    'tag': 'Save ₹100',
                    'description': 'Deep cleaning package for 2 bathrooms with complete tile and fitting sanitization.',
                    'includes': bath_incl,
                    'excludes': bath_excl,
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Pkg #{pkg_bath2.id}: '2 Bathrooms Deep Cleaning Combo' (₹699)")

            if not Package.objects.filter(service=svc_bath, slug='3-bathrooms-deep-cleaning-combo').exists():
                pkg_bath3 = create_package({
                    'service': svc_bath,
                    'slug': '3-bathrooms-deep-cleaning-combo',
                    'name': '3 Bathrooms Deep Cleaning Combo',
                    'base_price': Decimal('1199.00'),
                    'offer_price': Decimal('999.00'),
                    'duration': '2 - 2.5 hrs',
                    'tag': 'Best Value',
                    'description': 'Deep cleaning package for 3 bathrooms with complete tile and fitting sanitization.',
                    'includes': bath_incl,
                    'excludes': bath_excl,
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Pkg #{pkg_bath3.id}: '3 Bathrooms Deep Cleaning Combo' (₹999)")

        # Service 23: Kitchen Cleaning -> Relocate non-kitchen packages to Service 26
        svc_fullhouse = Service.objects.filter(id=26).first()
        non_kitchen_pids = [330, 332, 333, 334] # Fan, Balcony, Door
        for nk_id in non_kitchen_pids:
            nk_pkg = Package.objects.filter(id=nk_id, service_id=23).first()
            if nk_pkg and svc_fullhouse:
                update_package(nk_pkg, {
                    'service_id': svc_fullhouse.id
                }, actor=actor, reason="Relocated non-kitchen package to Full House Cleaning")
                print(f"  ✓ Relocated Pkg #{nk_id} ('{nk_pkg.name}') from Kitchen to Full House Cleaning")

        # Service 26: Full House Cleaning -> Disambiguate identical package names
        fullhouse_map = {
            185: ("Full Apartment Cleaning — Classic", "Essential deep clean for occupied apartments covering all rooms, kitchen and bathrooms."),
            186: ("Full Apartment Cleaning — Gold", "Intensive deep clean for apartments with machine floor scrubbing and kitchen cabinet interiors."),
            187: ("Full Apartment Cleaning — Diamond", "Premium full apartment transformation with sofa shampooing, balcony wash & glass buffing."),
            188: ("Unoccupied Apartment Move-in Clean", "Thorough vacant flat clean before moving in or after tenant move-out."),
            189: ("Villa Deep Cleaning — Classic", "Comprehensive deep cleaning for duplex and independent villas up to 2,500 sq.ft."),
            190: ("Villa Deep Cleaning — Gold", "Intensive villa deep clean with machine floor scrubbing, terrace wipe & window frame detailing."),
            191: ("Villa Deep Cleaning — Diamond", "Ultra-premium villa clean covering full estate, balconies, bathrooms, and fabric care."),
            192: ("Unoccupied Villa Move-in Clean", "End-to-end vacant villa clean for ready-to-move homes.")
        }
        for f_id, (f_name, f_desc) in fullhouse_map.items():
            f_pkg = Package.objects.filter(id=f_id).first()
            if f_pkg:
                update_package(f_pkg, {
                    'name': f_name,
                    'description': f_desc
                }, actor=actor, reason=audit_reason)
                print(f"  ✓ Disambiguated Pkg #{f_id} -> '{f_name}'")

        # Service 28: Termite Control -> Fix corrupt inclusions
        termite_incl = [
            "Comprehensive inspection of infected wooden door frames, skirting boards & furniture",
            "Drill-Fill-Seal chemical barrier injection using odorless government-approved termiticide",
            "Skirting and threshold chemical wall barrier treatment",
            "1-Year warranty certificate with free re-inspection and touch-up if termites reappear"
        ]
        termite_excl = [
            "Carpentry replacement of hollow or structurally damaged wood",
            "Garden soil or external boundary wall treatment"
        ]
        for t_id in [200, 201, 202]:
            t_pkg = Package.objects.filter(id=t_id).first()
            if t_pkg:
                update_package(t_pkg, {
                    'includes': termite_incl,
                    'excludes': termite_excl,
                    'duration': '2-3 hrs'
                }, actor=actor, reason="Replaced corrupt kitchen inclusions with authentic termite treatment specs")
                print(f"  ✓ Corrected inclusions for Termite Pkg #{t_id} ('{t_pkg.name}')")

        # Add Cockroach & Ant Control to Service 28 if not present
        svc_pest = Service.objects.filter(id=28).first()
        if svc_pest:
            update_service(svc_pest, {
                'name': 'Pest & Termite Control',
                'slug': 'pest-control',
                'description': 'Odourless cockroach gel treatment, ant barrier spray, and 1-year termite eradication.'
            }, actor=actor, reason=audit_reason)
            if not Package.objects.filter(service=svc_pest, slug='cockroach-ant-control-apartment').exists():
                pkg_cockroach = create_package({
                    'service': svc_pest,
                    'slug': 'cockroach-ant-control-apartment',
                    'name': 'Intense Cockroach & Ant Control (Apartment)',
                    'base_price': Decimal('799.00'),
                    'offer_price': Decimal('699.00'),
                    'duration': '45 mins',
                    'tag': 'Most Popular',
                    'description': '100% odorless herbal gel application in kitchen cabinets plus perimeter ant barrier spray.',
                    'includes': [
                        "Odorless Bayer Maxforce gel dots in all kitchen drawers, hinges & appliances",
                        "Perimeter anti-ant chemical spray along floor skirting and drains",
                        "Safe for kids, seniors, and pets (no need to vacate house)",
                        "60-Day protection with free single re-service guarantee"
                    ],
                    'excludes': [
                        "Deep cleaning of dead insects after treatment",
                        "Outdoor garden spray"
                    ],
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Pkg #{pkg_cockroach.id}: 'Intense Cockroach & Ant Control' (₹699)")


        # ── 5. PAINTING & WATERPROOFING DURATION & RATE CLARITY ───────────────────
        print("\n[Step 5] Modernizing Painting & Waterproofing Durations & Rates...")

        # Service 91: Interior Painting
        svc_paint_int = Service.objects.filter(id=91).first()
        if svc_paint_int:
            # Add Free Laser Consultation
            if not Package.objects.filter(service=svc_paint_int, slug='free-interior-laser-consultation').exists():
                pkg_free_paint = create_package({
                    'service': svc_paint_int,
                    'slug': 'free-interior-laser-consultation',
                    'name': 'Free On-Site Laser Measurement & Color Consultation',
                    'base_price': Decimal('0.00'),
                    'offer_price': Decimal('0.00'),
                    'duration': '45 mins',
                    'tag': 'Free Visit',
                    'description': 'Expert painting advisor visits your home with digital laser meter and shade cards. Transparent instant estimate.',
                    'includes': [
                        "Accurate digital laser wall area measurement (no estimation errors)",
                        "Wall health check (dampness and moisture meter analysis)",
                        "Shade card selection (Asian Paints / Berger premium finishes)",
                        "Zero-obligation on-site digital quotation"
                    ],
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Free Consultation Pkg #{pkg_free_paint.id} on Interior Painting")

            # Fix raw integer durations
            paint_dur_map = {
                737: ("1-2 days", "Interior wall repainting with 2 coats of premium emulsion. Rate: ₹12/sq.ft."),
                738: ("2-3 days", "Full single room refresh with putty touchup, primer and 2 coats. Rate: ₹12/sq.ft."),
                739: ("3-5 days", "Two bedroom interior painting with wall protection sheeting. Rate: ₹12/sq.ft."),
                740: ("1-2 weeks", "Complete apartment / house interior painting with masking and deep cleanup. Rate: ₹12/sq.ft."),
                741: ("1 day", "Ceiling flat white anti-glare emulsion painting. Rate: ₹10/sq.ft.")
            }
            for pid, (dur_str, desc_str) in paint_dur_map.items():
                p = Package.objects.filter(id=pid).first()
                if p:
                    update_package(p, {
                        'duration': dur_str,
                        'description': desc_str
                    }, actor=actor, reason=audit_reason)
                    print(f"  ✓ Fixed duration for Interior Paint Pkg #{pid} -> '{dur_str}'")

        # Service 92: Exterior Painting
        svc_paint_ext = Service.objects.filter(id=92).first()
        if svc_paint_ext:
            ext_dur_map = {
                742: ("2-3 days", "Weatherproof exterior emulsion coat. Rate: ₹18/sq.ft."),
                743: ("3-5 days", "Full exterior house facade painting with anti-fungal coat. Rate: ₹18/sq.ft."),
                744: ("5-7 days", "High-rise building exterior painting with scaffolding. Rate: ₹18/sq.ft."),
                745: ("1-2 days", "Boundary and compound wall weather protection. Rate: ₹18/sq.ft.")
            }
            for pid, (dur_str, desc_str) in ext_dur_map.items():
                p = Package.objects.filter(id=pid).first()
                if p:
                    update_package(p, {
                        'duration': dur_str,
                        'description': desc_str
                    }, actor=actor, reason=audit_reason)
                    print(f"  ✓ Fixed duration for Exterior Paint Pkg #{pid} -> '{dur_str}'")

        # Service 93: Waterproofing
        svc_waterproof = Service.objects.filter(id=93).first()
        if svc_waterproof:
            waterproof_map = {
                746: ("1-2 days", "Water tank food-grade epoxy waterproof lining. Rate: ₹1,700 lump sum."),
                747: ("1-2 days", "Bathroom tile joint injection without breaking tiles. Rate: ₹3,500 lump sum."),
                748: ("2-3 days", "Terrace elastomeric coating with mesh reinforcement. Rate: ₹20/sq.ft."),
                749: ("3-4 days", "4-Coat heavy duty UV-resistant terrace waterproofing. Rate: ₹50/sq.ft."),
                750: ("1-2 days", "Polyurethane chemical pressure injection for wall dampness. Rate: ₹35/sq.ft."),
            }
            for pid, (dur_str, desc_str) in waterproof_map.items():
                p = Package.objects.filter(id=pid).first()
                if p:
                    update_package(p, {
                        'duration': dur_str,
                        'description': desc_str
                    }, actor=actor, reason=audit_reason)
                    print(f"  ✓ Fixed duration for Waterproofing Pkg #{pid} -> '{dur_str}'")

        # Service 94: Wood & Metal
        svc_wood = Service.objects.filter(id=94).first()
        if svc_wood:
            for p in svc_wood.packages.all():
                dur_raw = str(p.duration or "").replace("days", "").strip()
                if dur_raw.isdigit():
                    update_package(p, {
                        'duration': f"{dur_raw} days",
                        'description': f"{p.description or p.name}. Unit rate: ₹85/sq.ft."
                    }, actor=actor, reason=audit_reason)
                    print(f"  ✓ Fixed duration for Wood/Metal Pkg #{p.id} -> '{dur_raw} days'")


        # ── 6. MASONRY & CIVIL WORK ENRICHMENT ────────────────────────────────────
        print("\n[Step 6] Enriching Masonry & Civil Work...")
        svc_masonry = Service.objects.filter(id=120).first()
        svc_tile = Service.objects.filter(id=121).first()

        if svc_masonry:
            p992 = Package.objects.filter(id=992).first()
            if p992:
                update_package(p992, {
                    'name': 'Small Masonry & Brick Wall Construction',
                    'duration': '2-3 days',
                    'description': 'Brick laying, partition wall erection, and plastering. Unit rate: ₹120/sq.ft (min 500 sq.ft order).'
                }, actor=actor, reason=audit_reason)
                print("  ✓ Standardized Pkg #992 -> 'Small Masonry & Brick Wall Construction'")

            # Add Free Site Inspection
            if not Package.objects.filter(service=svc_masonry, slug='free-masonry-site-inspection').exists():
                pkg_mason_free = create_package({
                    'service': svc_masonry,
                    'slug': 'free-masonry-site-inspection',
                    'name': 'Free On-Site Masonry Inspection & Estimation',
                    'base_price': Decimal('0.00'),
                    'offer_price': Decimal('0.00'),
                    'duration': '45 mins',
                    'tag': 'Free Visit',
                    'description': 'Experienced civil mason visits site to assess brickwork, plastering or core cutting needs.',
                    'includes': [
                        "On-site visual assessment of structural cracking or masonry requirements",
                        "Measurement and material calculation",
                        "Detailed transparent quotation without obligation"
                    ],
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Free Inspection Pkg #{pkg_mason_free.id} on Masonry")

            # Add Core cutting package
            if not Package.objects.filter(service=svc_masonry, slug='civil-core-cutting-chipping').exists():
                pkg_core = create_package({
                    'service': svc_masonry,
                    'slug': 'civil-core-cutting-chipping',
                    'name': 'Civil Core Cutting & Chipping (Per Point)',
                    'base_price': Decimal('499.00'),
                    'offer_price': Decimal('449.00'),
                    'duration': '1 hr',
                    'tag': 'Precision Cut',
                    'description': 'Diamond core cutting for AC pipes, kitchen chimney vents (up to 6 inch diameter).',
                    'includes': [
                        "Heavy duty diamond core drill machine usage",
                        "Clean circular cut through reinforced concrete/brick wall",
                        "Debris cleanup around cut site"
                    ],
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Pkg #{pkg_core.id}: 'Civil Core Cutting & Chipping'")

        if svc_tile:
            p993 = Package.objects.filter(id=993).first()
            if p993:
                update_package(p993, {
                    'name': 'Complete Bathroom Floor & Wall Tile Replacement',
                    'duration': '2-3 days',
                    'description': 'Removal of old tiles, waterproof leveling, new tile installation & epoxy grouting. ₹10,000 lump sum labor.'
                }, actor=actor, reason=audit_reason)
                print("  ✓ Standardized Pkg #993 -> 'Complete Bathroom Floor & Wall Tile Replacement'")

            # Add Tile Re-Grouting package
            if not Package.objects.filter(service=svc_tile, slug='tile-re-grouting-crack-repair').exists():
                pkg_grout = create_package({
                    'service': svc_tile,
                    'slug': 'tile-re-grouting-crack-repair',
                    'name': 'Tile Re-grouting & Crack Repair (Per Bathroom)',
                    'base_price': Decimal('1499.00'),
                    'offer_price': Decimal('1299.00'),
                    'duration': '3-4 hrs',
                    'tag': 'Leak Stopper',
                    'description': 'Scraping old degraded grout, applying waterproof epoxy grout and sealing loose tiles.',
                    'includes': [
                        "Mechanical grout joint raking to remove black mold & grime",
                        "Application of high-strength waterproof epoxy tile grout",
                        "Fixing loose edge tiles and sealing skirting perimeter",
                        "Prevents under-floor water leakage to rooms below"
                    ],
                    'status': PackageStatus.ACTIVE
                }, actor=actor)
                print(f"  ✓ Created Pkg #{pkg_grout.id}: 'Tile Re-grouting & Crack Repair'")


        # ── 7. GOODS & TRANSPORT LABELS & DURATION ────────────────────────────────
        print("\n[Step 7] Clarifying Goods & Transport Specifications...")
        
        # Mini Truck (Service 131)
        gt_truck_specs = {
            982: ("3 Wheeler (500 kg Capacity)", "15-20 mins", "Compact 3-wheeler ideal for boxes, small appliances and market goods up to 500 kg."),
            983: ("Tata Ace (750 kg Capacity)", "15-20 mins", "The reliable 'Chhota Hathi' for furniture, electronics, and medium commercial loads up to 750 kg."),
            984: ("Pickup 8ft (1.2 Ton Capacity)", "20-25 mins", "Spacious open 8-foot bed truck for heavy machinery, raw materials and furniture up to 1,200 kg."),
            985: ("1.7 Ton Heavy Mini Truck", "25-30 mins", "Heavy duty goods carrier for large bulk loads, construction material, and industrial stock.")
        }
        for pid, (tname, tdur, tdesc) in gt_truck_specs.items():
            p = Package.objects.filter(id=pid).first()
            if p:
                update_package(p, {
                    'name': tname,
                    'duration': tdur,
                    'description': tdesc,
                    'includes': [
                        "Fast vehicle arrival in Hosur",
                        "Verified professional driver",
                        "Live GPS route tracking via SMS/App",
                        "Standard loading assistance from driver"
                    ]
                }, actor=actor, reason=audit_reason)
                print(f"  ✓ Updated Truck Pkg #{pid} -> '{tname}'")

        # 2-Wheeler (Service 132)
        p986 = Package.objects.filter(id=986).first()
        if p986:
            update_package(p986, {
                'name': '2-Wheeler Instant Parcel Delivery (Up to 20 kg)',
                'duration': '30-45 mins',
                'description': 'On-demand 2-wheeler courier for documents, lunch boxes, clothes and small parcels.'
            }, actor=actor, reason=audit_reason)
            print("  ✓ Fixed 2-Wheeler Pkg #986 duration to '30-45 mins'")

        p987 = Package.objects.filter(id=987).first()
        if p987:
            update_package(p987, {
                'name': '2-Wheeler Electric Express Courier',
                'duration': '15-30 mins',
                'description': 'Eco-friendly electric bike delivery for quick errands and express documents.'
            }, actor=actor, reason=audit_reason)
            print("  ✓ Fixed 2-Wheeler Electric Pkg #987 duration to '15-30 mins'")

        p978 = Package.objects.filter(id=978).first()
        if p978:
            update_package(p978, {
                'name': '2-Wheeler Standard Parcel Courier',
                'duration': '30-45 mins',
                'description': 'Standard doorstep parcel delivery service across Hosur.'
            }, actor=actor, reason=audit_reason)
            print("  ✓ Fixed 2-Wheeler Parcel Pkg #978 duration to '30-45 mins'")

        # Packers & Movers (Service 133)
        svc_movers = Service.objects.filter(id=133).first()
        if svc_movers:
            update_service(svc_movers, {
                'name': 'Packers & Movers',
                'description': 'Hassle-free household and office shifting within Hosur and outstation.'
            }, actor=actor, reason=audit_reason)
            mover_pkgs = {
                979: ("1 RK / 1 BHK Household Shifting", "2-4 hrs", "Complete shifting for 1 RK or 1 BHK apartment with packing materials and transit truck."),
                980: ("2 BHK / 3 BHK Household Shifting", "4-6 hrs", "Comprehensive packing, loading, dedicated moving truck and unloading for 2-3 BHK flats."),
                981: ("Villa / Corporate Office Relocation", "Full Day", "Dedicated packing crew, multi-layer protective wrapping, and heavy item moving.")
            }
            for pid, (mname, mdur, mdesc) in mover_pkgs.items():
                p = Package.objects.filter(id=pid).first()
                if p:
                    update_package(p, {
                        'name': mname,
                        'duration': mdur,
                        'description': mdesc,
                        'includes': [
                            "Professional packing materials (bubble wrap, corrugated sheets, stretch film)",
                            "Trained loading and unloading crew",
                            "Dedicated closed container moving vehicle",
                            "Basic furniture dismantling and reassembly"
                        ]
                    }, actor=actor, reason=audit_reason)
                    print(f"  ✓ Enriched Packers & Movers Pkg #{pid} -> '{mname}'")


        # ── 8. SEED DEDICATED ELECTRICIAN, PLUMBER & CARPENTER PILLAR ─────────────
        print("\n[Step 8] Seeding Services & Packages for Electrician, Plumber & Carpenter...")
        
        maint_services_defs = [
            ('electrician', 'Electrician Services', 'Doorstep electrical repair, fan installation, switch replacement, and MCB tripping diagnostics.', 1),
            ('plumbing', 'Plumber Services', 'Tap repair, washbasin drainage, water leakage fix, and commode flush repairs.', 2),
            ('carpentry', 'Carpenter Services', 'Door lock installation, hinge repairs, furniture assembly, and wooden work.', 3),
        ]

        for s_slug, s_name, s_desc, s_order in maint_services_defs:
            svc_obj = Service.objects.filter(category=cat_maint, slug=s_slug).first()
            if not svc_obj:
                svc_obj = create_service({
                    'category': cat_maint,
                    'slug': s_slug,
                    'name': s_name,
                    'description': s_desc,
                    'is_active': True,
                    'sort_order': s_order
                }, actor=actor)
                print(f"  ✓ Created Maintenance Service #{svc_obj.id}: '{s_name}'")
            else:
                update_service(svc_obj, {
                    'name': s_name,
                    'description': s_desc,
                    'is_active': True
                }, actor=actor, reason=audit_reason)

            # Seed packages from MAINTENANCE_DATA
            m_data = MAINTENANCE_DATA.get(s_slug)
            m_pkgs: list[dict[str, Any]] = m_data.get('packages', []) if isinstance(m_data, dict) and isinstance(m_data.get('packages'), list) else []
            for mpkg in m_pkgs:
                pslug = mpkg.get('slug')
                existing_p = Package.objects.filter(service=svc_obj, slug=pslug).first()
                p_fields = {
                    'name': mpkg.get('name'),
                    'slug': pslug,
                    'service': svc_obj,
                    'base_price': Decimal(str(mpkg.get('base_price', mpkg.get('price', 199)))),
                    'offer_price': Decimal(str(mpkg.get('offer_price', mpkg.get('price', 199)))),
                    'duration': mpkg.get('duration', '30 mins'),
                    'tag': mpkg.get('tag', ''),
                    'description': mpkg.get('description', ''),
                    'includes': mpkg.get('includes', []),
                    'status': PackageStatus.ACTIVE,
                    'image': mpkg.get('image', ''),
                }
                if not existing_p:
                    np = create_package(p_fields, actor=actor)
                    print(f"    ✓ Created Pkg #{np.id}: '{np.name}' (₹{np.base_price}) on {s_name}")
                else:
                    update_package(existing_p, p_fields, actor=actor, reason=audit_reason)
                    print(f"    ✓ Updated Pkg #{existing_p.id}: '{existing_p.name}' on {s_name}")


        # ── 9. FARM-FRESH PRODUCE TYPOS ───────────────────────────────────────────
        print("\n[Step 9] Correcting Farm-Fresh Produce Typos...")

        p874 = Package.objects.filter(id=874).first()
        if p874:
            update_package(p874, {
                'duration': '1 bunch'
            }, actor=actor, reason="Set duration unit to 1 bunch")
            print("  ✓ Updated Pkg #874: 'Curry Leaves' (1 bunch)")


        # ── 10. CACHE INVALIDATION ────────────────────────────────────────────────
        print("\n[Step 10] Clearing Catalog Caches...")
        clear_catalog_cache()
        cache.clear()
        print("  ✓ Cleared all catalog cache layers")

    print("\n" + "=" * 60)
    print("SEVO CATALOG MODERNIZATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == '__main__':
    run_modernization()
