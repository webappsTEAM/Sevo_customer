import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package

CORE_CATEGORIES = [
    {
        "name": "Goods & Transports",
        "slug": "goods_transports",
        "icon": "Truck",
        "image": "/mockups/category_goods_transports.png",
        "description": "Mini trucks, two-wheelers & full house packers and movers relocation",
        "sort_order": 1,
        "service_slugs": ["truck", "two-wheeler", "packers-movers"]
    },
    {
        "name": "Electrician, Plumbing & Carpentry",
        "slug": "electrician_plumbing_carpentry",
        "icon": "Wrench",
        "image": "/mockups/category_repair.png",
        "description": "Certified electricians, plumbers and carpentry woodwork specialists",
        "sort_order": 2,
        "service_slugs": ["electrician", "plumber", "carpentry", "electrical", "plumbing", "carpentry-services"]
    },
    {
        "name": "AC & Appliance",
        "slug": "ac_appliance",
        "icon": "Wind",
        "image": "/mockups/category_appliance.png",
        "description": "Air conditioner jet servicing, refrigerators, washing machines, microwaves & TVs",
        "sort_order": 3,
        "service_slugs": ["air-conditioner", "refrigerator", "washing-machine", "tv-display", "microwave-oven", "hvac", "appliance_repair"]
    },
    {
        "name": "Home Services & Pest Control",
        "slug": "home_pest_control",
        "icon": "Sparkles",
        "image": "/mockups/category_cleaning.png",
        "description": "Deep house cleaning, bathroom sanitization, sofa care & odorless pest control",
        "sort_order": 4,
        "service_slugs": ["full-house-cleaning", "bathroom-cleaning", "kitchen-cleaning", "sofa-cleaning", "cockroach-control", "termite-control", "ants-bed-bugs-control", "cleaning", "pest_control", "general", "security"]
    },
    {
        "name": "Paintings",
        "slug": "paintings",
        "icon": "Palette",
        "image": "/mockups/category_painting.png",
        "description": "Interior & exterior wall painting, waterproofing & texture designs",
        "sort_order": 5,
        "service_slugs": ["interior-painting", "exterior-painting", "waterproofing", "wood-metal", "texture-decor", "painting"]
    },
    {
        "name": "Mason",
        "slug": "mason",
        "icon": "Hammer",
        "image": "/mockups/service_building.png",
        "description": "Brick & block work, plastering, wall partitions & civil construction",
        "sort_order": 6,
        "service_slugs": ["brick-block-work", "plastering-wall-repair", "wall-partition-construction", "wall-breaking-demolition", "mason"]
    },
    {
        "name": "Farm-Fresh Vegetables & Groceries",
        "slug": "vegetables_groceries",
        "icon": "Carrot",
        "image": "/mockups/vegetables_realistic.png",
        "description": "100% farm-fresh daily green vegetables and grocery essentials",
        "sort_order": 7,
        "service_slugs": ["vegetables", "groceries"]
    }
]

def align():
    print("Aligning catalog to 6 Core Specialized Pillars + Vegetables...")
    for cat_data in CORE_CATEGORIES:
        category, _ = CatalogCategory.objects.update_or_create(
            slug=cat_data["slug"],
            defaults={
                "name": cat_data["name"],
                "icon": cat_data["icon"],
                "image": cat_data["image"],
                "description": cat_data["description"],
                "sort_order": cat_data["sort_order"],
                "is_active": True
            }
        )
        print(f"Pillar: {category.name} ({category.slug})")

        for s_slug in cat_data["service_slugs"]:
            try:
                srv = Service.objects.filter(slug=s_slug).first()
                if srv:
                    srv.category = category
                    srv.save()
                    print(f"  -> Assigned service '{srv.name}' to '{category.name}'")
            except Exception as e:
                print(f"  -> Error assigning {s_slug}: {e}")

    # Remove empty old categories if any have 0 services
    for old_cat in CatalogCategory.objects.all():
        if old_cat.slug not in [c["slug"] for c in CORE_CATEGORIES]:
            if not old_cat.services.exists():
                print(f"Removing empty legacy category: {old_cat.name}")
                old_cat.delete()

    print("Alignment completed successfully!")

if __name__ == '__main__':
    align()
