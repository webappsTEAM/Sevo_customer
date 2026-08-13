import os
import sys
import django
from django.db.models import Max

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus

KITCHEN_PACKAGES_DATA = [
    # Full Kitchen Packages
    {
        "slug": "occ-basic",
        "name": "Full Kitchen cleaning(Basic)",
        "price": 1459,
        "duration": "2 hrs",
        "description": "Complete surface cleaning of tiles, slab, gas stove, and sink.",
        "includes": [
            "Kitchen tiles, floor & slab cleaning + Mopping",
            "Gas stove / hob cleaning",
            "Sink & under-sink cleaning",
            "Exhaust fan cleaning",
            "Windows & switchboards cleaning",
            "Cabinet exterior cleaning",
            "Dining table cleaning",
            "Utensil removal / rearrangement not included"
        ]
    },
    {
        "slug": "occ-deep",
        "name": "Full Kitchen Cleaning – Deep Clean",
        "price": 1959,
        "duration": "3 hrs",
        "description": "Deep steam sanitization of kitchen counters, cabinets, chimney, and hobs.",
        "includes": [
            "Includes everything in Basic, plus:",
            "Cabinet interior & exterior cleaning",
            "Exhaust fan deep cleaning",
            "Utensil removal & rearrangement"
        ]
    },
    {
        "slug": "empty-kitchen",
        "name": "Empty Kitchen Cleaning",
        "price": 849,
        "duration": "2.5 hrs",
        "description": "Thorough deep cleaning of empty kitchen spaces before moving in or after moving out.",
        "includes": [
            "Thorough degreasing of wall tiles, countertops, and exhaust fans",
            "Detailed cleaning of kitchen floors, windows, switchboards, and cabinets (exterior)",
            "Deep sanitization of sink and under-sink area (utensils removal not included)"
        ]
    },
    # Cabinet & Tile Care
    {
        "slug": "kitchen-tiles-slabs",
        "name": "Kitchen Tiles and Slabs Cleaning",
        "price": 299,
        "duration": "45 mins",
        "description": "Oil & grease stain removal from backsplash, tiles, counter, and slab.",
        "includes": [
            "Tile and slab cleaning: Remove oil and grease stains",
            "Degreases tiles & slabs and deep cleans grout for a fresh kitchen"
        ]
    },
    {
        "slug": "cabinet-trolley-clean",
        "name": "Cabinet & Trolley Cleaning (Interior & exterior)",
        "price": 899,
        "duration": "1.5 hrs",
        "description": "Thorough inside-out degreasing, sanitization, and dust-wipe of all kitchen cabinets & trolleys.",
        "includes": [
            "Interior & exterior cabinet wet-wiping & degreasing",
            "Removal of food residue, spills & accumulated oil layers",
            "Trolley tracks vacuuming, wiping & structural sanitization"
        ]
    },
    # Appliances
    {
        "slug": "fridge-single",
        "name": "Fridge cleaning - Single door",
        "price": 399,
        "duration": "1 hr",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "fridge-double",
        "name": "Fridge cleaning - Double door",
        "price": 549,
        "duration": "1.5 hrs",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "fridge-triple",
        "name": "Fridge cleaning - Side by side/ Triple door",
        "price": 799,
        "duration": "2 hrs",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "microwave-clean",
        "name": "Microwave cleaning",
        "price": 199,
        "duration": "15 mins",
        "description": "Complete interior grease removal and sanitization of turntable.",
        "includes": [
            "Interior & exterior cleaning",
            "Turntable & glass door cleaning",
            "Food stain & grease removal"
        ]
    },
    {
        "slug": "chimney-clean",
        "name": "Chimney Cleaning",
        "price": 399,
        "duration": "45 mins",
        "description": "Deep filter degreasing and external hood surface cleaning.",
        "includes": [
            "Filter & exterior cleaning",
            "Grease & oil buildup removal",
            "Hood & accessible surface cleaning"
        ]
    },
    {
        "slug": "chimney-stove-clean",
        "name": "Chimney & stove cleaning",
        "price": 499,
        "duration": "1 hr 10 mins",
        "description": "Combined steam deep cleaning of kitchen chimney and gas stove.",
        "includes": [
            "Stovetops, burners, mesh & filter cleaning with steam",
            "Includes motor cleaning, repair & automatic chimney cleaning"
        ]
    },
    {
        "slug": "stove-2b",
        "name": "Gas stove cleaning - 2 burners",
        "price": 99,
        "duration": "30 mins",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "stove-3b",
        "name": "Gas stove cleaning - 3 burners",
        "price": 149,
        "duration": "45 mins",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "stove-4b",
        "name": "Gas stove cleaning - 4+ burners",
        "price": 199,
        "duration": "1 hr",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "dishwasher-clean",
        "name": "Dishwasher Cleaning",
        "price": 599,
        "duration": "1 hr",
        "description": "Thorough interior rack wash and food debris clearing.",
        "includes": [
            "Interior & exterior cleaning",
            "Filter, racks & tray cleaning",
            "Food residue & buildup removal"
        ]
    },
    {
        "slug": "air-fryer-clean",
        "name": "Air fryer cleaning",
        "price": 199,
        "duration": "30 mins",
        "description": "Air fryer interior wet wipe and tray wash.",
        "includes": [
            "Wet wiping of interior to remove oil stains & odour",
            "Cleaning of tray to remove food spills"
        ]
    },
    {
        "slug": "otg-clean",
        "name": "OTG cleaning",
        "price": 399,
        "duration": "50 mins",
        "description": "Oven interior crumb removal and grease wipe down.",
        "includes": [
            "Cleaning of interior to remove food crumbs & spills",
            "Exterior & back panel cleaning to remove oil & grease"
        ]
    },
    {
        "slug": "sandwich-clean",
        "name": "Sandwich Maker/Griller cleaning",
        "price": 99,
        "duration": "15 mins",
        "description": "Sandwich maker deep cleaning to remove charred food spills.",
        "includes": [
            "Deep cleaning of plates to remove stuck food & char marks",
            "Exterior wipe to remove oil, grease & food stains"
        ]
    },
    # Quick Extra Services
    {
        "slug": "quick-sink-under-sink",
        "name": "Sink & under sink cleaning",
        "price": 129,
        "duration": "20 mins",
        "description": "Deep scrubbing of sink and under-sink sanitization.",
        "includes": [
            "Deep scrub & sanitization of kitchen sink",
            "Wiping and disinfecting under-sink area",
            "Removal of waste, odors, and food particles"
        ]
    },
    {
        "slug": "quick-kitchen-window",
        "name": "Kitchen Window Cleaning",
        "price": 399,
        "duration": "30 mins",
        "description": "Detailed glass panel and frame grease cleaning.",
        "includes": [
            "Glass panes dusting and wet wiping",
            "Window frames, sill, and tracks cleaning",
            "Removal of oil fumes and grease residue"
        ]
    },
    {
        "slug": "quick-dining-table",
        "name": "Dining Table & Chairs Cleaning",
        "price": 449,
        "duration": "30 mins",
        "description": "Detailed dining table surface cleaning and grease removal.",
        "includes": [
            "Surface cleaning & sanitation",
            "Removal of food stains & greasy layers",
            "Wiping & drying of tabletop"
        ]
    },
    {
        "slug": "quick-fan-clean",
        "name": "Ceiling Fan Cleaning",
        "price": 89,
        "duration": "30 mins",
        "description": "Detailed ceiling fan dusting and blade wipe down.",
        "includes": [
            "Fan blade cleaning",
            "Motor housing & cover dusting",
            "Dust & surface grime removal"
        ]
    },
    {
        "slug": "quick-exhaust-fan-clean",
        "name": "Kitchen Exhaust Fan Cleaning",
        "price": 99,
        "duration": "30 mins",
        "description": "Kitchen exhaust fan degreasing and grill dusting.",
        "includes": [
            "Exhaust fan blades cleaning",
            "Fan cover / grill cleaning",
            "Dust and grease removal"
        ]
    },
    {
        "slug": "quick-balcony-upto-4ft",
        "name": "Balcony Cleaning: Upto 4 ft Width",
        "price": 399,
        "duration": "30 mins",
        "description": "Washing and scrubbing of balcony floor and railings.",
        "includes": [
            "Balcony floor washing & scrubbing",
            "Dusting of railing and windows",
            "Clearance of cobwebs and dust bunnies"
        ]
    },
    {
        "slug": "quick-balcony-above-4ft",
        "name": "Balcony Cleaning: Above 4 ft Width",
        "price": 549,
        "duration": "50 mins",
        "description": "Deep floor scrubbing and mesh cleaning for large balconies.",
        "includes": [
            "Deep floor scrubbing & balcony washing",
            "Railing, windows, and mesh cleaning",
            "Thorough dust and dirt clearance"
        ]
    },
    {
        "slug": "quick-door-clean",
        "name": "Door Cleaning",
        "price": 89,
        "duration": "10 mins",
        "description": "Thorough wiping and dusting of doors to remove fingerprints and dirt.",
        "includes": [
            "Wiping of door panels and frames",
            "Removal of smudges, dust & fingerprint marks",
            "Handle sanitization"
        ]
    }
]

def seed():
    print("Seeding kitchen packages...")
    category = CatalogCategory.objects.filter(slug="home_pest_control").first()
    if not category:
        print("ERROR: 'home_pest_control' category not found.")
        return

    service, _ = Service.objects.get_or_create(
        slug="kitchen-cleaning",
        defaults={
            "category": category,
            "name": "Kitchen Cleaning",
            "description": "Complete kitchen deep cleaning, cabinet organization & appliance service.",
            "is_active": True,
            "sort_order": 5
        }
    )

    # Delete legacy packages if any
    Package.objects.filter(slug__in=["empty-kitchen-small", "empty-kitchen-large"]).delete()

    # Get max ID to avoid sequence issues
    max_id = Package.objects.aggregate(Max('id'))['id__max'] or 0

    for pkg_data in KITCHEN_PACKAGES_DATA:
        # Check if already exists
        pkg = Package.objects.filter(slug=pkg_data["slug"]).first()
        if pkg:
            # Update fields
            pkg.service = service
            pkg.name = pkg_data["name"]
            pkg.base_price = pkg_data["price"]
            pkg.duration = pkg_data["duration"]
            pkg.description = pkg_data["description"]
            pkg.includes = pkg_data["includes"]
            pkg.status = PackageStatus.ACTIVE
            pkg.save()
            print(f"-> Updated package: {pkg.name}")
        else:
            # Create manually assigning id
            max_id += 1
            pkg = Package.objects.create(
                id=max_id,
                slug=pkg_data["slug"],
                service=service,
                name=pkg_data["name"],
                base_price=pkg_data["price"],
                duration=pkg_data["duration"],
                description=pkg_data["description"],
                includes=pkg_data["includes"],
                status=PackageStatus.ACTIVE
            )
            print(f"-> Created package (ID: {pkg.id}): {pkg.name}")

    print("Kitchen packages seeded successfully.")

if __name__ == '__main__':
    seed()
