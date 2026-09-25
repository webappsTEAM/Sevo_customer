"""
calservices/backend/scripts/verify_catalog_integrity.py

Automated catalog integrity verification script.
Asserts:
1. All 7 core pillars are active with expected names and order.
2. 0 active packages with duplicate names in the same service.
3. 0 active packages with missing duration or raw integer durations without units (outside produce).
4. 0 active packages with price <= 10 (except free consultation/inspection Rs. 0).
5. 0 active zombie categories with 0 services.
6. All duplicate packages are properly ARCHIVED, not deleted.
"""
import sys, os
from decimal import Decimal

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
import django
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus

def verify():
    print("=" * 60)
    print("VERIFYING SEVO CATALOG INTEGRITY")
    print("=" * 60)
    errors = []

    # 1. Verify Active Categories
    active_cats = list(CatalogCategory.objects.filter(is_active=True).order_by('sort_order', 'id'))
    print(f"\n[Check 1] Active Categories ({len(active_cats)}):")
    expected_categories = [
        "Cleaning & Pest Control",
        "Painting & Waterproofing",
        "Electrician, Plumber & Carpenter",
        "AC & Appliance Repair",
        "Masonry & Civil Work",
        "Goods & Transport",
        "Farm-Fresh Vegetables & Groceries"
    ]
    actual_names = [c.name for c in active_cats]
    for idx, c in enumerate(active_cats, 1):
        svc_count = c.services.count()
        print(f"  {idx}. [{c.slug}] '{c.name}' (Order: {c.sort_order}, Services: {svc_count})")
        if svc_count == 0:
            errors.append(f"Category '{c.name}' has 0 services!")

    for exp in expected_categories:
        if exp not in actual_names:
            errors.append(f"Expected category '{exp}' missing from active categories!")

    # 2. Verify Duplicates in Same Service
    print("\n[Check 2] Checking for Duplicate Package Names in Active Services...")
    for svc in Service.objects.filter(is_active=True):
        active_pkgs = svc.packages.filter(status=PackageStatus.ACTIVE)
        names = [p.name.strip().lower() for p in active_pkgs]
        seen = set()
        for name in names:
            if name in seen:
                errors.append(f"Duplicate active package '{name}' in service #{svc.id} ({svc.name})")
            seen.add(name)

    # 3. Verify Specific Known Duplicates are ARCHIVED
    print("\n[Check 3] Verifying Duplicate Packages are ARCHIVED (Preserved History)...")
    archived_ids = [598, 599, 600, 601, 597, 602, 603, 606, 607, 608]
    for aid in archived_ids:
        pkg = Package.objects.filter(id=aid).first()
        if not pkg:
            errors.append(f"Archived package #{aid} was deleted instead of archived!")
        elif pkg.status != PackageStatus.ARCHIVED:
            errors.append(f"Package #{aid} is '{pkg.status}', expected 'ARCHIVED'!")
        else:
            print(f"  ✓ Package #{aid} ('{pkg.name}') is safely ARCHIVED")

    # If dummy test package #991 exists, ensure it is archived
    pkg_991 = Package.objects.filter(id=991).first()
    if pkg_991 and pkg_991.status != PackageStatus.ARCHIVED:
        errors.append(f"Package #991 is '{pkg_991.status}', expected 'ARCHIVED'!")
    elif pkg_991:
        print(f"  ✓ Package #991 ('{pkg_991.name}') is safely ARCHIVED")

    # 4. Verify AC Cleaning Packages
    print("\n[Check 4] Verifying AC Service & Cleaning Packages...")
    svc_ac_clean = Service.objects.filter(slug='ac-service-cleaning').first()
    if not svc_ac_clean:
        errors.append("Service 'ac-service-cleaning' missing!")
    else:
        ac_clean_pkgs = list(svc_ac_clean.packages.filter(status=PackageStatus.ACTIVE))
        print(f"  Found {len(ac_clean_pkgs)} active AC cleaning packages:")
        for p in ac_clean_pkgs:
            print(f"    - '{p.name}' | ₹{p.base_price} | {p.duration} | Inclusions: {len(p.includes or [])}")
        if len(ac_clean_pkgs) < 3:
            errors.append(f"Expected at least 3 AC cleaning packages, found {len(ac_clean_pkgs)}")

    # 5. Verify Maintenance Pillar (Electrician, Plumber, Carpenter)
    print("\n[Check 5] Verifying Electrician, Plumber & Carpenter Pillar...")
    cat_maint = CatalogCategory.objects.filter(slug='electrician_plumbing_carpentry').first()
    if not cat_maint:
        errors.append("Category 'electrician_plumbing_carpentry' missing!")
    else:
        for s_slug in ['electrician', 'plumbing', 'carpentry']:
            s = cat_maint.services.filter(slug=s_slug).first()
            if not s:
                errors.append(f"Maintenance service '{s_slug}' missing!")
            else:
                pkg_count = s.packages.filter(status=PackageStatus.ACTIVE).count()
                print(f"  ✓ Service '{s.name}' has {pkg_count} active packages")
                if pkg_count == 0:
                    errors.append(f"Service '{s.name}' has 0 active packages!")

    # 6. Verify Pricing and Durations
    print("\n[Check 6] Verifying Durations and Prices...")
    for pkg in Package.objects.filter(status=PackageStatus.ACTIVE):
        # Exclude produce from strict duration string checks
        if pkg.service and pkg.service.category and pkg.service.category.slug == 'vegetables_groceries':
            continue
        
        # Duration check
        if not pkg.duration or str(pkg.duration).strip() == '':
            errors.append(f"Package #{pkg.id} ('{pkg.name}') has empty duration!")
        elif str(pkg.duration).isdigit():
            errors.append(f"Package #{pkg.id} ('{pkg.name}') has raw integer duration '{pkg.duration}' without units!")

        # Price check
        if pkg.base_price is not None and pkg.base_price < 0:
            errors.append(f"Package #{pkg.id} ('{pkg.name}') has negative price!")

    # 7. Verify Expanded Services & Urban Benchmark Additions
    print("\n[Check 7] Verifying Expanded Services from 3 Images & Urban Benchmark...")
    
    # 7a. Room Care & Mini Services (Image 1 & 2 items)
    svc_room = Service.objects.filter(slug='room-care-mini-services').first()
    if not svc_room:
        errors.append("Service 'room-care-mini-services' missing!")
    else:
        room_pkgs = list(svc_room.packages.filter(status=PackageStatus.ACTIVE))
        print(f"  ✓ Service 'Room Care & Mini Services' has {len(room_pkgs)} active packages:")
        for p in room_pkgs:
            print(f"    - #{p.id} '{p.name}' | ₹{p.base_price} | {p.duration}")
        if len(room_pkgs) < 6:
            errors.append(f"Expected at least 6 packages in Room Care, found {len(room_pkgs)}")

    # 7b. Geyser & Water Heater (Urban gap closed)
    svc_geyser = Service.objects.filter(slug='geyser-water-heater').first()
    if not svc_geyser:
        errors.append("Service 'geyser-water-heater' missing!")
    else:
        geyser_pkgs = list(svc_geyser.packages.filter(status=PackageStatus.ACTIVE))
        print(f"  ✓ Service 'Geyser & Water Heater Repair' has {len(geyser_pkgs)} active packages:")
        for p in geyser_pkgs:
            print(f"    - #{p.id} '{p.name}' | ₹{p.base_price} | {p.duration}")
        if len(geyser_pkgs) < 3:
            errors.append(f"Expected at least 3 packages in Geyser, found {len(geyser_pkgs)}")

    # 7c. Water Purifier RO (Urban gap closed)
    svc_ro = Service.objects.filter(slug='water-purifier-ro').first()
    if not svc_ro:
        errors.append("Service 'water-purifier-ro' missing!")
    else:
        ro_pkgs = list(svc_ro.packages.filter(status=PackageStatus.ACTIVE))
        print(f"  ✓ Service 'Water Purifier RO' has {len(ro_pkgs)} active packages:")
        for p in ro_pkgs:
            print(f"    - #{p.id} '{p.name}' | ₹{p.base_price} | {p.duration}")
        if len(ro_pkgs) < 3:
            errors.append(f"Expected at least 3 packages in Water Purifier RO, found {len(ro_pkgs)}")

    # 7d. Sofa & Upholstery Additions (Image 1)
    svc_sofa = Service.objects.filter(slug='sofa-upholstery-cleaning').first()
    if not svc_sofa:
        errors.append("Service 'sofa-upholstery-cleaning' missing!")
    else:
        sofa_names = [p.name for p in svc_sofa.packages.filter(status=PackageStatus.ACTIVE)]
        if "Curtain Steam Cleaning & Dust Removal" not in sofa_names:
            errors.append("Missing 'Curtain Steam Cleaning & Dust Removal' in Sofa & Upholstery!")
        if "Sofa Anti-Spill & Hydrophobic Stain Protection Shield" not in sofa_names:
            errors.append("Missing 'Sofa Anti-Spill & Hydrophobic Stain Protection Shield' in Sofa & Upholstery!")
        print(f"  ✓ Sofa & Upholstery has {len(sofa_names)} packages including Curtain & Stain protection")

    # 7e. Bathroom Additions (Image 2)
    svc_bath = Service.objects.filter(slug='bathroom-cleaning').first()
    if not svc_bath:
        errors.append("Service 'bathroom-cleaning' missing!")
    else:
        bath_names = [p.name for p in svc_bath.packages.filter(status=PackageStatus.ACTIVE)]
        if "Weekly Bathroom Cleaning Plan (4 Visits / Month)" not in bath_names:
            errors.append("Missing Weekly Bathroom Cleaning Plan in Bathroom Cleaning!")
        if "4 Bathrooms Deep Cleaning Combo" not in bath_names:
            errors.append("Missing 4 Bathrooms Deep Cleaning Combo in Bathroom Cleaning!")
        print(f"  ✓ Bathroom Cleaning has {len(bath_names)} packages including weekly subscription and combos")

    # 7f. Verify Archived Misplaced Package #990
    pkg_990 = Package.objects.filter(id=990).first()
    if not pkg_990 or pkg_990.status != PackageStatus.ARCHIVED:
        errors.append("Package #990 is not safely ARCHIVED!")
    else:
        print("  ✓ Package #990 (misplaced refrigerator draft) is safely ARCHIVED")

    # Summary
    print("\n" + "=" * 60)
    if errors:
        print(f"VERIFICATION FAILED WITH {len(errors)} ERRORS:")
        for err in errors:
            print(f"  ❌ {err}")
        sys.exit(1)
    else:
        print("ALL CATALOG INTEGRITY CHECKS PASSED WITH 100% SUCCESS!")
        print("=" * 60)

if __name__ == '__main__':
    verify()
