import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Service, Package

def seed():
    packages_to_create = [
        {
            "name": "Water Tank Waterproofing",
            "slug": "wp-tank",
            "base_price": "1.50",
            "offer_price": "1.50",
            "description": "Professional internal water tank waterproofing treatment to prevent leakages and ensure clean storage.",
            "duration": "1 day",
            "includes": ["Surface cleaning and sanitation", "Chemical waterproofing coating application", "Final leak checking"],
            "excludes": ["Major wall/structural rebuilds", "Tank plumbing updates"],
            "status": "ACTIVE"
        },
        {
            "name": "Bathroom Waterproofing",
            "slug": "wp-bathroom",
            "base_price": "3500.00",
            "offer_price": "3500.00",
            "description": "Premium bathroom tile joint sealing, epoxy grouting, and under-tile moisture barrier application.",
            "duration": "1 day",
            "includes": ["Tile joint inspection and cleaning", "Epoxy grouting", "Moisture barrier seal"],
            "excludes": ["New tile replacement", "Plumbing repair"],
            "status": "ACTIVE"
        },
        {
            "name": "Terrace Waterproofing — 2 Coat",
            "slug": "wp-terrace-2",
            "base_price": "20.00",
            "offer_price": "20.00",
            "description": "Standard 2 coat terrace coating application for effective weather protection and general seepage resistance.",
            "duration": "1 day",
            "includes": ["Thorough terrace cleaning", "1st coat waterproofing layer", "2nd coat waterproofing layer"],
            "excludes": ["Major structural crack repair", "Screed concrete work"],
            "status": "ACTIVE"
        },
        {
            "name": "Terrace Waterproofing — 4 Coat",
            "slug": "wp-terrace-4",
            "base_price": "50.00",
            "offer_price": "50.00",
            "description": "Premium multi-layer 4 coat waterproofing system including fiber mesh reinforcement and a 5-year warranty.",
            "duration": "2 days",
            "includes": ["Terrace surface preparation", "Primer coat application", "Fiber mesh reinforcement layer", "2 top weather-coat layers", "5-year warranty card"],
            "excludes": ["Re-tiling charges", "Structural re-plastering"],
            "status": "ACTIVE"
        },
        {
            "name": "PU Coating / Dampness Treatment",
            "slug": "wp-pu-dampness",
            "base_price": "35.00",
            "offer_price": "35.00",
            "description": "Advanced Polyurethane (PU) chemical injection and moisture protection to treat internal wall dampness.",
            "duration": "1 day",
            "includes": ["Wall moisture audit", "PU chemical injection", "Anti-dampness primer coating"],
            "excludes": ["Full room plastering", "External wall scaffolding (if above 3 floors)"],
            "status": "ACTIVE"
        },
        {
            "name": "3 mm Tar Sheet / Gas Heating Waterproofing",
            "slug": "wp-tarsheet",
            "base_price": "100.00",
            "offer_price": "100.00",
            "description": "High-durability 3 mm APP modified bituminous membrane (tar sheet) torch-applied with gas heating.",
            "duration": "2 days",
            "includes": ["Surface primer coating", "3mm tar sheet gas torching", "Overlap joint thermal fusion"],
            "excludes": ["Screed protective concrete layer over tar sheet"],
            "status": "ACTIVE"
        },
        {
            "name": "Roof Repair / Patch Work",
            "slug": "wp-roof-repair",
            "base_price": "30.00",
            "offer_price": "30.00",
            "description": "Localized roof cracks sealing, expansion joints treatment, and protective patch overlays.",
            "duration": "1 day",
            "includes": ["Identify structural/hairline cracks", "Apply elastic crack sealant", "Protective overlay patch work"],
            "excludes": ["Complete roof reconstruction"],
            "status": "ACTIVE"
        },
        {
            "name": "Industrial Epoxy Flooring",
            "slug": "wp-epoxy",
            "base_price": "60.00",
            "offer_price": "60.00",
            "description": "High-durability seamless industrial epoxy flooring coating for chemical and abrasion resistance.",
            "duration": "2 days",
            "includes": ["Industrial floor grinding and sanding", "Primer base coat", "Premium epoxy layer application"],
            "excludes": ["Major concrete leveling or slab repair"],
            "status": "ACTIVE"
        }
    ]

    try:
        service = Service.objects.get(slug="waterproofing")
    except Service.DoesNotExist:
        print("Error: Waterproofing service not found in database.")
        return

    # Delete existing packages under waterproofing to prevent duplicate slugs
    deleted_count, _ = Package.objects.filter(service=service).delete()
    print(f"Deleted {deleted_count} existing packages under waterproofing.")
    
    for pkg_data in packages_to_create:
        pkg = Package.objects.create(
            service=service,
            name=pkg_data["name"],
            slug=pkg_data["slug"],
            base_price=pkg_data["base_price"],
            offer_price=pkg_data["offer_price"],
            description=pkg_data["description"],
            duration=pkg_data["duration"],
            includes=pkg_data["includes"],
            excludes=pkg_data["excludes"],
            status=pkg_data["status"]
        )
        print(f"Created package: {pkg.name} ({pkg.slug})")
    
    print("Successfully seeded all 8 waterproofing packages!")

if __name__ == "__main__":
    seed()
