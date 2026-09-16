import os
import sys
import django
from django.db.models import Max

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus

MASON_SERVICES_DATA = {
    "bathroom-tile-fixing": {
        "name": "Bathroom Tile Fixing",
        "desc": "Bathroom tile fixing with tiles, epoxy grout, and expert labour included. Sizes: Small, Medium, Large. 50% advance upon quote acceptance, 50% after work completion.",
        "order": 1,
        "image": "/mockups/aac_block_wall_construction.jpg",
        "customization": {
            "pricing_slabs": {
                "Small": 10000,
                "Medium": 10000,
                "Large": 20000
            },
            "payment_terms": "50% advance on vendor quote acceptance, 50% after work completion",
            "combined_material_labour": True
        },
        "packages": [
            {
                "slug": "bathroom-tile-fixing-small",
                "name": "Bathroom Tile Fixing - Small",
                "price": 10000.00,
                "duration": "Flexible",
                "tag": "Small Bathroom",
                "image": "/mockups/aac_block_wall_construction.jpg",
                "description": "Complete bathroom tile fixing for small bathrooms. Combined price includes tiles, epoxy grout, and expert labour. 50% advance upon quote acceptance, 50% after work completion.",
                "includes": [
                    "Tiles included (combined material + labour)",
                    "Epoxy waterproof grouting",
                    "Expert mason labour & leveling",
                    "No separate material or labour charges"
                ],
                "excludes": [
                    "Structural plumbing alterations",
                    "Area above standard small bathroom size"
                ],
                "ready": [
                    "Clear bathroom of personal toiletries",
                    "Ensure water and electrical access"
                ],
                "reviews": [
                    {"name": "Vikram Singh", "rating": 5, "text": "Very neat epoxy grouting and tile fixing. Great value!"}
                ],
                "faqs": [
                    {"q": "What materials are included?", "a": "Tiles, waterproof epoxy, and complete skilled labour are included in the ₹10,000 package price."},
                    {"q": "What are the payment terms?", "a": "50% advance upon vendor quote acceptance and remaining 50% after work completion."}
                ]
            },
            {
                "slug": "bathroom-tile-fixing-medium",
                "name": "Bathroom Tile Fixing - Medium",
                "price": 10000.00,
                "duration": "Flexible",
                "tag": "Medium Bathroom",
                "image": "/mockups/aac_block_wall_construction.jpg",
                "description": "Complete bathroom tile fixing for medium bathrooms. Combined price includes tiles, epoxy grout, and expert labour. 50% advance upon quote acceptance, 50% after work completion.",
                "includes": [
                    "Tiles included (combined material + labour)",
                    "Epoxy waterproof grouting",
                    "Expert mason labour & leveling",
                    "No separate material or labour charges"
                ],
                "excludes": [
                    "Structural plumbing alterations"
                ],
                "ready": [
                    "Clear bathroom of personal toiletries",
                    "Ensure water and electrical access"
                ],
                "reviews": [
                    {"name": "Priya D.", "rating": 4.9, "text": "Completed on time with perfect water-slope alignment."}
                ],
                "faqs": [
                    {"q": "What materials are included?", "a": "Tiles, waterproof epoxy, and complete skilled labour are included in the ₹10,000 package price."},
                    {"q": "What are the payment terms?", "a": "50% advance upon vendor quote acceptance and remaining 50% after work completion."}
                ]
            },
            {
                "slug": "bathroom-tile-fixing-large",
                "name": "Bathroom Tile Fixing - Large",
                "price": 20000.00,
                "duration": "Flexible",
                "tag": "Large Bathroom",
                "image": "/mockups/aac_block_wall_construction.jpg",
                "description": "Complete bathroom tile fixing for large bathrooms. Combined price includes tiles, epoxy grout, and expert labour. 50% advance upon quote acceptance, 50% after work completion.",
                "includes": [
                    "Tiles included (combined material + labour)",
                    "Epoxy waterproof grouting",
                    "Expert mason labour & leveling",
                    "No separate material or labour charges"
                ],
                "excludes": [
                    "Structural plumbing alterations"
                ],
                "ready": [
                    "Clear bathroom of personal toiletries",
                    "Ensure water and electrical access"
                ],
                "reviews": [
                    {"name": "Suresh K.", "rating": 5, "text": "Master bathroom tiling done flawlessly. Very sturdy epoxy joints."}
                ],
                "faqs": [
                    {"q": "What materials are included?", "a": "Tiles, waterproof epoxy, and complete skilled labour are included in the ₹20,000 package price."},
                    {"q": "What are the payment terms?", "a": "50% advance upon vendor quote acceptance and remaining 50% after work completion."}
                ]
            }
        ]
    },
    "minor-masonry": {
        "name": "Minor Masonry / Small Construction Work",
        "desc": "Small construction, brickwork, and plastering. ₹120/sq.ft. Minimum booking area: 500 sq.ft. Includes Concrete, M-Sand, Jalli/Gravel, Labour & required materials. 50% advance upon quote acceptance, 50% after completion.",
        "order": 2,
        "image": "/mockups/brick_wall_construction_red.jpg",
        "customization": {
            "rate": 120,
            "rate_unit": "sq.ft",
            "minimum_area": 500,
            "payment_terms": "50% advance on vendor quote acceptance, 50% after work completion",
            "combined_material_labour": True
        },
        "packages": [
            {
                "slug": "minor-masonry",
                "name": "Minor Masonry / Small Construction Work",
                "price": 120.00,
                "duration": "Flexible (Min 500 sq.ft)",
                "tag": "₹120 / sq.ft (Min 500 sq.ft)",
                "image": "/mockups/brick_wall_construction_red.jpg",
                "description": "Small construction, brickwork, and civil repair. Minimum booking area is 500 sq.ft (areas below 500 sq.ft cannot be booked). Combined price includes Concrete, M-Sand, Jalli/Gravel, Labour, and required materials.",
                "includes": [
                    "Concrete",
                    "M-Sand",
                    "Jalli / Gravel",
                    "Skilled mason labour",
                    "All required raw materials included",
                    "No separate material or labour charges"
                ],
                "excludes": [
                    "Bookings below 500 sq.ft minimum area threshold",
                    "Heavy structural high-rise casting"
                ],
                "ready": [
                    "Ensure clear access to construction site",
                    "Provide accessible water and electricity points"
                ],
                "reviews": [
                    {"name": "Rajesh Kumar", "rating": 5, "text": "Solid brickwork and great mortar quality. All materials were included as promised."},
                    {"name": "Anitha R.", "rating": 4.8, "text": "Very professional mason team. Completed the construction work on time."}
                ],
                "faqs": [
                    {"q": "What is the minimum booking area?", "a": "Minimum booking area is 500 sq.ft. Bookings below 500 sq.ft cannot be placed."},
                    {"q": "Are materials included in the ₹120/sq.ft price?", "a": "Yes! Concrete, M-Sand, Jalli/Gravel, Labour, and all required construction materials are combined in ₹120/sq.ft."},
                    {"q": "What are the payment terms?", "a": "50% advance upon vendor quote acceptance and remaining 50% after work completion."}
                ]
            }
        ]
    }
}

def seed():
    print("Updating Mason services and packages to exact vendor specification...")
    category = CatalogCategory.objects.filter(slug="mason").first()
    if not category:
        category = CatalogCategory.objects.create(
            name="Mason",
            slug="mason",
            desc="Brick, plaster & civil work",
            image="/mockups/service_building.png"
        )
        print(f"Created category: {category.name}")
    else:
        print(f"Found category: {category.name} (id={category.id})")

    # Clean up any obsolete/extra mason packages so only the vendor's exact packages exist
    current_mason_pkgs = Package.objects.filter(service__category=category)
    valid_slugs = {
        "bathroom-tile-fixing-small",
        "bathroom-tile-fixing-medium",
        "bathroom-tile-fixing-large",
        "minor-masonry"
    }
    obsolete = current_mason_pkgs.exclude(slug__in=valid_slugs)
    if obsolete.exists():
        print(f"Removing {obsolete.count()} obsolete mason packages...")
        obsolete.delete()

    max_id = Package.objects.order_by().aggregate(Max('id'))['id__max'] or 0

    for s_slug, s_data in MASON_SERVICES_DATA.items():
        service = Service.objects.filter(slug=s_slug).first()
        if not service:
            service = Service.objects.create(
                slug=s_slug,
                category=category,
                name=s_data["name"],
                description=s_data["desc"],
                image=s_data.get("image", ""),
                customization=s_data.get("customization", {}),
                is_active=True,
                sort_order=s_data["order"]
            )
            print(f"Created service: {service.name}")
        else:
            service.category = category
            service.name = s_data["name"]
            service.description = s_data["desc"]
            service.image = s_data.get("image", "")
            service.customization = s_data.get("customization", {})
            service.is_active = True
            service.sort_order = s_data["order"]
            service.save()
            print(f"Updated service: {service.name} (id={service.id})")

        for pkg_data in s_data["packages"]:
            pkg = Package.objects.order_by('id').filter(slug=pkg_data["slug"]).first()
            if pkg:
                pkg.service = service
                pkg.name = pkg_data["name"]
                pkg.base_price = pkg_data["price"]
                pkg.duration = pkg_data["duration"]
                pkg.tag = pkg_data.get("tag", "")
                pkg.description = pkg_data["description"]
                pkg.image = pkg_data.get("image") or ""
                pkg.includes = pkg_data["includes"]
                pkg.excludes = pkg_data.get("excludes", [])
                pkg.ready = pkg_data.get("ready", [])
                pkg.reviews = pkg_data.get("reviews", [])
                pkg.faqs = pkg_data.get("faqs", [])
                pkg.status = PackageStatus.ACTIVE
                pkg.save()
                print(f"  -> Updated package: {pkg.name} (id={pkg.id})")
            else:
                max_id += 1
                pkg = Package.objects.create(
                    id=max_id,
                    slug=pkg_data["slug"],
                    service=service,
                    name=pkg_data["name"],
                    base_price=pkg_data["price"],
                    duration=pkg_data["duration"],
                    tag=pkg_data.get("tag", ""),
                    description=pkg_data["description"],
                    image=pkg_data.get("image") or "",
                    includes=pkg_data["includes"],
                    excludes=pkg_data.get("excludes", []),
                    ready=pkg_data.get("ready", []),
                    reviews=pkg_data.get("reviews", []),
                    faqs=pkg_data.get("faqs", []),
                    status=PackageStatus.ACTIVE
                )
                print(f"  -> Created package (ID: {pkg.id}): {pkg.name}")

    print("Mason catalog updated successfully with exact vendor inputs!")

if __name__ == '__main__':
    seed()
