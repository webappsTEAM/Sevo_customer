import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

# Generic fallback templates based on category / service type
DEFAULT_CAT_DATA = {
    "home_pest_control": {
        "tools": ["Eco-certified pest chemicals & gels", "ULV cold fogging sprayers", "Bait applicator guns", "Protective safety masks & gloves"],
        "ready": ["Keep food items and cooking utensils covered", "Keep pets and children away from treated zones", "Provide access to kitchen corners and drainage points"],
        "reviews": [{"name": "Suresh K.", "rating": "4.9", "text": "Extremely effective pest treatment. Zero cockroaches seen after 2 days."}],
        "faqs": [{"q": "Is the chemical odor-free and safe for children?", "a": "Yes, we use government-approved Bayer eco-gel and low-odor sprays safe for residential homes."}]
    },
    "paintings": {
        "tools": ["Laser distance meter & moisture detector", "Airless spray painter & roller sets", "Drop cloth & masking tapes", "High-grit sanding machine"],
        "ready": ["Keep furniture moved to the center of the room", "Ensure continuous power supply for sanding tools"],
        "reviews": [{"name": "Pooja N.", "rating": "5.0", "text": "Exceptional wall finish and sharp edging. Cleaned up completely after work."}],
        "faqs": [{"q": "Do you offer warranty on paint finish?", "a": "Yes, 3-year warranty against flaking and bubbling on all premium interior/exterior paints."}]
    },
    "goods_transports": {
        "tools": ["Heavy-duty hydraulic tail-lift / ramp", "Cargo securing ratchet straps & bungee ropes", "Multi-layered corrugated bubble rolls", "Furniture moving dollies"],
        "ready": ["Keep all electronics safely unplugged", "Label fragile boxes clearly", "Ensure parking permission at pickup and delivery gates"],
        "reviews": [{"name": "Arun Kumar", "rating": "4.9", "text": "On-time arrival, professional loading and zero scratches on our sofa and fridge."}],
        "faqs": [{"q": "Are toll charges and driver helper charges included?", "a": "Base fare includes driver assistance. Toll charges, if applicable on route, are charged at actuals."}]
    }
}

updated_count = 0
for pkg in Package.objects.all():
    changed = False
    cat_slug = pkg.service.category.slug if (pkg.service and pkg.service.category) else ""
    defaults = DEFAULT_CAT_DATA.get(cat_slug, {
        "tools": ["Professional grade safety & service kit", "Digital testing equipment", "Protective work covers"],
        "ready": ["Continuous power supply", "Working water connection", "Service area accessible and cleared"],
        "reviews": [{"name": "Verified Customer", "rating": "5.0", "text": "Prompt service and professional execution."}],
        "faqs": [{"q": "Is warranty included for this service?", "a": "Yes, standard 30-day service warranty covers all workmanship."}]
    })

    if not pkg.tools or len(pkg.tools) == 0:
        pkg.tools = defaults["tools"]
        changed = True
    if not pkg.ready or len(pkg.ready) == 0:
        pkg.ready = defaults["ready"]
        changed = True
    if not pkg.reviews or len(pkg.reviews) == 0:
        pkg.reviews = defaults["reviews"]
        changed = True
    if not pkg.faqs or len(pkg.faqs) == 0:
        pkg.faqs = defaults["faqs"]
        changed = True
    if not pkg.includes or len(pkg.includes) == 0:
        pkg.includes = [f"Complete inspection & diagnostics for {pkg.name}", "Standard servicing using professional tools", "Post-service functionality and safety check"]
        changed = True
    if not pkg.duration:
        pkg.duration = "30-45 mins"
        changed = True
    if pkg.status != "ACTIVE":
        pkg.status = "ACTIVE"
        changed = True

    if changed:
        pkg.save()
        updated_count += 1

print(f"Successfully populated all Supabase packages! Updated {updated_count} packages.")
