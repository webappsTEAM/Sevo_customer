import os
import sys
import django
from django.db.models import Max

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus
from seed_ac_and_repair_services_data import AC_APPLIANCE_DATA, MAINTENANCE_DATA

def seed():
    print("=" * 60)
    print("STARTING AC, APPLIANCE, ELECTRICAL, PLUMBING & CARPENTRY SEEDER")
    print("=" * 60)

    # ── 1. AC & Appliance ─────────────────────────────────────────────
    ac_cat, _ = CatalogCategory.objects.get_or_create(
        slug="ac_appliance",
        defaults={
            "name": "AC & Appliance",
            "description": "AC servicing, refrigerator, washing machine, TV, and home appliance repairs.",
            "is_active": True,
            "sort_order": 4
        }
    )
    print(f"\n[Category] {ac_cat.name} ({ac_cat.slug})")

    max_id = Package.objects.order_by().aggregate(Max('id'))['id__max'] or 0

    for s_slug, s_data in AC_APPLIANCE_DATA.items():
        service, _ = Service.objects.get_or_create(
            slug=s_slug,
            defaults={
                "category": ac_cat,
                "name": s_data["name"],
                "description": s_data["desc"],
                "is_active": True,
                "sort_order": s_data["order"]
            }
        )
        if service.category_id != ac_cat.id:
            service.category = ac_cat
            service.save()
        print(f"  Service: {service.name} ({service.slug})")

        for pkg_data in s_data["packages"]:
            pkg = Package.objects.order_by('id').filter(slug=pkg_data["slug"]).first()
            if pkg:
                pkg.service = service
                pkg.name = pkg_data["name"]
                pkg.base_price = pkg_data["price"]
                pkg.duration = pkg_data["duration"]
                pkg.description = pkg_data["description"]
                pkg.tag = pkg_data.get("tag", "")
                pkg.popular = pkg_data.get("popular", False)
                pkg.image = pkg_data.get("image", "")
                pkg.includes = pkg_data.get("includes", [])
                pkg.tools = pkg_data.get("tools", [])
                pkg.ready = pkg_data.get("ready", [])
                pkg.reviews = pkg_data.get("reviews", [])
                pkg.faqs = pkg_data.get("faqs", [])
                pkg.status = PackageStatus.ACTIVE
                pkg.save()
                print(f"    -> Updated package: {pkg.name}")
            else:
                max_id += 1
                pkg = Package.objects.create(
                    id=max_id,
                    slug=pkg_data["slug"],
                    service=service,
                    name=pkg_data["name"],
                    base_price=pkg_data["price"],
                    duration=pkg_data["duration"],
                    description=pkg_data["description"],
                    tag=pkg_data.get("tag", ""),
                    popular=pkg_data.get("popular", False),
                    image=pkg_data.get("image", ""),
                    includes=pkg_data.get("includes", []),
                    tools=pkg_data.get("tools", []),
                    ready=pkg_data.get("ready", []),
                    reviews=pkg_data.get("reviews", []),
                    faqs=pkg_data.get("faqs", []),
                    status=PackageStatus.ACTIVE
                )
                print(f"    -> Created package (ID {pkg.id}): {pkg.name}")

    # ── 2. Electrical, Plumbing & Carpentry ─────────────────────────────
    maint_cat, _ = CatalogCategory.objects.get_or_create(
        slug="electrician_plumbing_carpentry",
        defaults={
            "name": "Electrician, Plumbing & Carpentry",
            "description": "Licensed electricians, skilled plumbers, and master carpenters.",
            "is_active": True,
            "sort_order": 3
        }
    )
    print(f"\n[Category] {maint_cat.name} ({maint_cat.slug})")

    for s_slug, s_data in MAINTENANCE_DATA.items():
        service, _ = Service.objects.get_or_create(
            slug=s_slug,
            defaults={
                "category": maint_cat,
                "name": s_data["name"],
                "description": s_data["desc"],
                "is_active": True,
                "sort_order": s_data["order"]
            }
        )
        if service.category_id != maint_cat.id:
            service.category = maint_cat
            service.save()
        print(f"  Service: {service.name} ({service.slug})")

        for pkg_data in s_data["packages"]:
            pkg = Package.objects.order_by('id').filter(slug=pkg_data["slug"]).first()
            if pkg:
                pkg.service = service
                pkg.name = pkg_data["name"]
                pkg.base_price = pkg_data["price"]
                pkg.duration = pkg_data["duration"]
                pkg.description = pkg_data["description"]
                pkg.tag = pkg_data.get("tag", "")
                pkg.popular = pkg_data.get("popular", False)
                pkg.image = pkg_data.get("image", "")
                pkg.includes = pkg_data.get("includes", [])
                pkg.tools = pkg_data.get("tools", [])
                pkg.ready = pkg_data.get("ready", [])
                pkg.reviews = pkg_data.get("reviews", [])
                pkg.faqs = pkg_data.get("faqs", [])
                pkg.status = PackageStatus.ACTIVE
                pkg.save()
                print(f"    -> Updated package: {pkg.name}")
            else:
                max_id += 1
                pkg = Package.objects.create(
                    id=max_id,
                    slug=pkg_data["slug"],
                    service=service,
                    name=pkg_data["name"],
                    base_price=pkg_data["price"],
                    duration=pkg_data["duration"],
                    description=pkg_data["description"],
                    tag=pkg_data.get("tag", ""),
                    popular=pkg_data.get("popular", False),
                    image=pkg_data.get("image", ""),
                    includes=pkg_data.get("includes", []),
                    tools=pkg_data.get("tools", []),
                    ready=pkg_data.get("ready", []),
                    reviews=pkg_data.get("reviews", []),
                    faqs=pkg_data.get("faqs", []),
                    status=PackageStatus.ACTIVE
                )
                print(f"    -> Created package (ID {pkg.id}): {pkg.name}")

    print("\n" + "=" * 60)
    print("ALL AC, APPLIANCE, ELECTRICAL, PLUMBING & CARPENTRY PACKAGES SEEDED PROPERLY IN DATABASE!")
    print("=" * 60)

if __name__ == "__main__":
    seed()
