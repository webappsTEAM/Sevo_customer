import os
import sys
import django
from django.db.models import Max

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus

SERVICES_DATA = {
    "sofa-cleaning": {
        "name": "Sofa Cleaning",
        "desc": "Sofa, mattress, carpet deep cleaning & sanitization.",
        "order": 1,
        "packages": [
            {
                "slug": "fabric-sofa-clean",
                "name": "Fabric Sofa Cleaning",
                "price": 329,
                "duration": "1 hr",
                "description": "Deep foam cleaning and vacuuming to revitalize fabric sofas.",
                "includes": [
                    "Foam cleaning of sofa seats and backrests",
                    "Deep vacuuming to remove dust and dirt",
                    "Cleaning of light stains and marks",
                    "Loose/removable cushions not included"
                ]
            },
            {
                "slug": "fabric-sofa-cushion-clean",
                "name": "Fabric Sofa & Cushion Cleaning",
                "price": 599,
                "duration": "1.5 hrs",
                "description": "Complete foam cleaning of fabric sofas including all loose cushions.",
                "includes": [
                    "Foam cleaning of sofa seats and backrests",
                    "Deep wet & dry vacuuming",
                    "Cleaning of light stains and marks",
                    "Loose/removable sofa cushions included"
                ]
            },
            {
                "slug": "leather-sofa-clean",
                "name": "Leather Sofa Cleaning",
                "price": 349,
                "duration": "1 hr",
                "description": "Gentle cleaning and conditioning to restore leather shine.",
                "includes": [
                    "Gentle cleaning of leather sofa surfaces",
                    "Removal of dust and everyday dirt",
                    "Cleaning of seats and backrests",
                    "Leather-safe conditioning"
                ]
            },
            {
                "slug": "leather-sofa-cushion-clean",
                "name": "Leather Sofa & Cushion Cleaning",
                "price": 619,
                "duration": "1.5 hrs",
                "description": "Comprehensive leather cleaning and conditioning including cushions.",
                "includes": [
                    "Gentle cleaning of leather sofa seats and backrests",
                    "Cleaning of loose/removable leather cushions",
                    "Leather-safe conditioning",
                    "Soft finishing for a clean appearance"
                ]
            },
            {
                "slug": "mattress-deep",
                "name": "Mattress Deep Cleaning",
                "price": 389,
                "duration": "1 hr",
                "description": "Deep vacuuming and shampoo wash to remove dust mites and stains.",
                "includes": [
                    "Deep vacuuming to remove dust and dirt",
                    "Shampoo cleaning of the mattress surface",
                    "Treatment for common stains and marks",
                    "Wet vacuuming to remove dirt and moisture"
                ]
            },
            {
                "slug": "mattress-pillow-refresh",
                "name": "Mattress & Pillow Refresh",
                "price": 499,
                "duration": "1.5 hrs",
                "description": "Complete mattress shampooing and pillow deep cleaning.",
                "includes": [
                    "Deep vacuuming of mattress and pillows",
                    "Shampoo cleaning for visible stains",
                    "Odour and dirt removal",
                    "Wet vacuuming for a fresher finish"
                ]
            },
            {
                "slug": "carpet-deep",
                "name": "Carpet Cleaning",
                "price": 369,
                "duration": "1 hr",
                "description": "Deep foam shampoo wash to extract deep-seated dirt from carpets.",
                "includes": [
                    "Removal of accumulated dust particles, dirt",
                    "Foam based shampooing on the carpet using a sponge",
                    "Vacuuming & wiping shampoo"
                ]
            }
        ]
    },
    "bathroom-cleaning": {
        "name": "Bathroom Cleaning",
        "desc": "Bathroom deep cleaning, machine scrubbing & subscriptions.",
        "order": 2,
        "packages": [
            {
                "slug": "bath-deep-clean",
                "name": "Deep Bathroom Cleaning (machine)",
                "price": 499,
                "duration": "60 mins",
                "description": "Deep cleaning of toilet, basin, floor and tiles. Removes soap marks, dirt and common stains.",
                "includes": [
                    "Deep cleaning of toilet, basin, floor and tiles",
                    "Removes soap marks, dirt and common stains",
                    "Detailed cleaning of shower, taps and bathroom corners"
                ]
            },
            {
                "slug": "bath-intense-clean",
                "name": "Deep Bathroom Cleaning (Hands-on)",
                "price": 300,
                "duration": "60 mins",
                "description": "Extra scrubbing for floors, tiles and bathroom fixtures. Removes stubborn dirt, soap buildup.",
                "includes": [
                    "Extra scrubbing for floors, tiles and bathroom fixtures",
                    "Removes stubborn dirt, soap buildup and common stains",
                    "Detailed cleaning of hard-to-reach bathroom areas"
                ]
            },
            {
                "slug": "bath-exhaust-fan",
                "name": "Bathroom Exhaust Fan Cleaning",
                "price": 89,
                "duration": "15 mins",
                "description": "Removes dust from the exhaust fan and outer cover. Suitable as an add-on.",
                "includes": [
                    "Removes dust from the exhaust fan and outer cover",
                    "Helps keep the fan clean and free from surface buildup",
                    "Suitable as an add-on to bathroom cleaning"
                ]
            },
            {
                "slug": "bath-washbasin-add",
                "name": "Washbasin cleaning (additional)",
                "price": 89,
                "duration": "10 mins",
                "description": "Additional washbasin cleaning for extra bathroom convenience.",
                "includes": [
                    "Washbasin surface cleaning & sanitization",
                    "Tap cleaning and polishing"
                ]
            },
            {
                "slug": "bath-ceiling-fan",
                "name": "Ceiling fan cleaning",
                "price": 89,
                "duration": "15 mins",
                "description": "Not covered in standard bathroom services.",
                "includes": [
                    "Ceiling fan dusting and blade wipe"
                ]
            },
            {
                "slug": "bath-door-add",
                "name": "Door cleaning (additional)",
                "price": 89,
                "duration": "10 mins",
                "description": "Additional bathroom door cleaning.",
                "includes": [
                    "Door panel wipe and handle sanitization"
                ]
            },
            {
                "slug": "bath-mirror-add",
                "name": "Mirror cleaning (additional)",
                "price": 59,
                "duration": "10 mins",
                "description": "Additional mirror cleaning for a crystal-clear reflection.",
                "includes": [
                    "Mirror glass cleaning and smudge removal"
                ]
            },
            {
                "slug": "bath-drain-clean",
                "name": "Drain Cleaning",
                "price": 59,
                "duration": "15 mins",
                "description": "Detailed bathroom drain block clearing and sanitization.",
                "includes": [
                    "Drain block clearance and sanitization"
                ]
            },
            {
                "slug": "sub-bath-machine",
                "name": "Bathroom Cleaning (machine)",
                "price": 350,
                "duration": "1 hr",
                "description": "Convenient weekly machine scrubbing and deep cleaning subscription.",
                "includes": [
                    "Machine scrubbing of floors and wall tiles",
                    "Deep sanitation of toilet and washbasin",
                    "Polishing of chrome fixtures and mirror dusting"
                ]
            },
            {
                "slug": "sub-bath-hands-on",
                "name": "Bathroom Cleaning (hands on)",
                "price": 215,
                "duration": "1 hr",
                "description": "Thorough hands-on scrubbing and sanitation weekly subscription.",
                "includes": [
                    "Thorough hands-on scrubbing of tiles and corners",
                    "Sanitization of toilet bowl, sink, and taps",
                    "Wiping of glass panels, door handles, and mirror shine"
                ]
            }
        ]
    },
    "full-house-cleaning": {
        "name": "Full House Cleaning",
        "desc": "Full apartment and bungalow deep cleaning services.",
        "order": 3,
        "packages": [
            {
                "slug": "unfurnished-apt-deep",
                "name": "Unoccupied apartment",
                "price": 3139,
                "duration": "3 hrs",
                "description": "Deep cleaning of empty/unfurnished apartment before moving in or after moving out.",
                "includes": [
                    "Scrubbing of floors, wall tiles, windows and balcony",
                    "Deep clean of empty kitchen cabinets & closets",
                    "Thorough sanitization of bathrooms & fixtures"
                ]
            },
            {
                "slug": "classic-apt-deep",
                "name": "Classic",
                "price": 3409,
                "duration": "4 hrs",
                "description": "Bathroom & kitchen deep cleaning, floor cleaning, cobweb removal, dusting & wiping.",
                "includes": [
                    "Intensive stain removal and deep sanitization of bathrooms & kitchen spaces",
                    "Advanced floor machine scrubbing, window panels, and glass cleaning",
                    "Thorough dusting of hard-to-reach ceiling areas, fans, and light fixtures",
                    "Balcony washdown and exterior furniture dusting with micro-fiber wipes"
                ]
            },
            {
                "slug": "gold-apt-deep",
                "name": "Gold",
                "price": 3759,
                "duration": "4 hrs",
                "description": "Includes Classic plan + interior cabinet cleaning and interior utensils cupboard.",
                "includes": [
                    "All standard features included in the Classic packages",
                    "Deep cleaning of wardrobes and drawers (interior & exterior, if empty)",
                    "Utensils removal, cabinet sanitization, and organized rearrangement"
                ]
            },
            {
                "slug": "diamond-apt-deep",
                "name": "Diamond",
                "price": 4579,
                "duration": "4 hrs 30 mins",
                "description": "Includes Gold plan + sofa, carpet & mattress shampoo wash.",
                "includes": [
                    "All premium inclusions of the Gold deep-cleaning package",
                    "Full wet shampooing and extraction wash of sofas and mattresses"
                ]
            },
            {
                "slug": "unoccupied-bungalow-deep",
                "name": "Unoccupied bungalow",
                "price": 4419,
                "duration": "5 hrs",
                "description": "Thorough deep cleaning of empty/unfurnished independent bungalow or villa.",
                "includes": [
                    "Machine floor scrubbing, windows, doors & balconies clean",
                    "Deep clean of all empty cabinets & closets",
                    "Thorough sanitization of bathrooms & fixtures"
                ]
            },
            {
                "slug": "classic-bungalow-deep",
                "name": "Classic",
                "price": 4439,
                "duration": "5 hrs",
                "description": "Bungalow-scale deep sanitation of bathrooms, kitchen, hallways, grilles, and fans.",
                "includes": [
                    "Bungalow-scale deep sanitation of all bathrooms, toilets and kitchen areas",
                    "Heavy-duty floor machine scrubbing for staircases, hallways and balconies",
                    "Complete ceiling dusting, cobweb removal, and fan/lighting wash",
                    "Comprehensive exterior glass panel, grille, and window frame washing"
                ]
            },
            {
                "slug": "gold-bungalow-deep",
                "name": "Gold",
                "price": 6729,
                "duration": "5 hrs 30 mins",
                "description": "Includes Classic bungalow plan + cupboard interior cleaning & utensil layout arrangement.",
                "includes": [
                    "All package features included in the Classic bungalow plan",
                    "Multi-level cupboard interior cleaning & polishing (if empty)",
                    "Kitchen drawer utensil removal, sanitizing and organized layout"
                ]
            },
            {
                "slug": "diamond-bungalow-deep",
                "name": "Diamond",
                "price": 8729,
                "duration": "6 hrs",
                "description": "Includes Gold bungalow plan + sofa & mattress wet shampoo wash and facade wall wash.",
                "includes": [
                    "All premium package features included in the Gold bungalow plan",
                    "Eco-friendly wet shampoo wash of sofas and master bed mattresses",
                    "High-pressure wash of stairs, patio floors and outer facade walls"
                ]
            },
             {
                "slug": "window-clean-under-4",
                "name": "Window Cleaning (Upto 4 Ft X 4 Ft)",
                "price": 399,
                "duration": "30 mins",
                "description": "Streak-free glass cleaning, sliding track vacuuming and frame wipe for standard windows.",
                "includes": [
                    "Glass panel cleaning inside and outside",
                    "Deep vacuuming of dirt and mud from sliding tracks"
                ]
            },
            {
                "slug": "window-clean-above-4",
                "name": "Window Cleaning (Above 4 Ft X 4 Ft)",
                "price": 449,
                "duration": "1 hr",
                "description": "Detailed washing of large window panes, tracks cleaning and grille wiping.",
                "includes": [
                    "Thorough cleaning of wide glass windows and frames",
                    "Removal of sticky dust from grilles & meshes"
                ]
            }
        ]
    },
    "cockroach-control": {
        "name": "Cockroach Control",
        "desc": "Dual-session gel and spray cockroach control.",
        "order": 4,
        "packages": [
            {
                "slug": "pest-kb-main",
                "name": "Cockroach Control (Kitchen & Bathroom)",
                "price": 999,
                "duration": "45 mins",
                "description": "Dual-session gel and spray treatment targeting kitchen & bathroom cockroaches.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Dual-session deep eradication with 14-day cycle window"
                ]
            },
            {
                "slug": "pest-apt-main",
                "name": "Apartment Cockroach Extermination",
                "price": 1549,
                "duration": "1 hr",
                "description": "Complete cockroach control for apartments with odorless bio-spray.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Odorless bio-spray with targeted gel dot application"
                ]
            },
            {
                "slug": "pest-bung-main",
                "name": "Bungalow & Villa Cockroach Extermination",
                "price": 2099,
                "duration": "1.5 hrs",
                "description": "Full independent house & villa cockroach eradication service.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Odorless bio-spray with targeted gel dot application"
                ]
            }
        ]
    },
    "termite-control": {
        "name": "Termite Control",
        "desc": "Drill-and-inject barrier protection for termite control.",
        "order": 5,
        "packages": [
            {
                "slug": "pest-termite-kb",
                "name": "Termite Control (Kitchen & Bathroom)",
                "price": 1499,
                "duration": "1 hr",
                "description": "Targeted drill-and-inject barrier protection for termite control in kitchens & bathrooms.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Drill & chemical pressure injection to block termites"
                ]
            },
            {
                "slug": "pest-termite-apt",
                "name": "Apartment Termite Extermination",
                "price": 2499,
                "duration": "2 hrs",
                "description": "Drilling and chemical shield treatment to safeguard apartments from termites.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Comprehensive wall base drilling & chemical shield protection"
                ]
            },
            {
                "slug": "pest-termite-bung",
                "name": "Bungalow & Villa Termite Extermination",
                "price": 3499,
                "duration": "3 hrs",
                "description": "Full home termite barrier protection and drilling shield.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Comprehensive wall base drilling & chemical shield protection"
                ]
            }
        ]
    },
    "ants-bed-bugs-control": {
        "name": "Ants & Bed Bugs Control",
        "desc": "Bed bug steam extraction and ant colony eradication.",
        "order": 6,
        "packages": [
            {
                "slug": "pest-bedbug-main",
                "name": "Bed bugs control",
                "price": 1899,
                "duration": "1.5 hrs",
                "description": "Two-stage chemical & steam extraction treatment to completely eliminate bed bugs.",
                "includes": [
                    "Thorough inspection of the entire home before treatment",
                    "Targeted treatment of beds, mattresses, cushion and other objects"
                ]
            },
            {
                "slug": "pest-ant-kb",
                "name": "Ant Control (Kitchen & Bathroom)",
                "price": 999,
                "duration": "45 mins",
                "description": "Focused gel and spray treatment targeting kitchen & bathroom ant colonies.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Dual-session deep eradication with 14-day cycle window"
                ]
            },
            {
                "slug": "pest-ant-apt",
                "name": "Apartment Ant Extermination",
                "price": 1549,
                "duration": "1 hr",
                "description": "Complete ant control for apartments with chemical spray and crevice sealing.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Complete ant treatment with chemical spray & hole sealing"
                ]
            },
            {
                "slug": "pest-ant-bung",
                "name": "Bungalow & Villa Ant Extermination",
                "price": 2099,
                "duration": "1.5 hrs",
                "description": "Whole-bungalow ant treatment including chemical perimeter barriers.",
                "includes": [
                    "Before inspection we will handle utensils",
                    "After removal customer has to keep the utensils",
                    "Complete ant treatment with chemical spray & hole sealing"
                ]
            }
        ]
    }
}

def seed():
    print("Seeding home services and packages...")
    category = CatalogCategory.objects.filter(slug="home_pest_control").first()
    if not category:
        print("ERROR: 'home_pest_control' category not found.")
        return

    # Get max ID to avoid sequence issues
    max_id = Package.objects.aggregate(Max('id'))['id__max'] or 0

    for s_slug, s_data in SERVICES_DATA.items():
        service, _ = Service.objects.get_or_create(
            slug=s_slug,
            defaults={
                "category": category,
                "name": s_data["name"],
                "description": s_data["desc"],
                "is_active": True,
                "sort_order": s_data["order"]
            }
        )
        print(f"Service: {service.name}")

        for pkg_data in s_data["packages"]:
            pkg = Package.objects.filter(slug=pkg_data["slug"]).first()
            if pkg:
                pkg.service = service
                pkg.name = pkg_data["name"]
                pkg.base_price = pkg_data["price"]
                pkg.duration = pkg_data["duration"]
                pkg.description = pkg_data["description"]
                pkg.includes = pkg_data["includes"]
                pkg.status = PackageStatus.ACTIVE
                pkg.save()
                print(f"  -> Updated package: {pkg.name}")
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
                    includes=pkg_data["includes"],
                    status=PackageStatus.ACTIVE
                )
                print(f"  -> Created package (ID: {pkg.id}): {pkg.name}")

    print("All home services and packages seeded successfully.")

if __name__ == '__main__':
    seed()
