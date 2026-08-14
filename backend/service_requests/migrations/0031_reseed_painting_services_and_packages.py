from django.db import migrations

def reseed_painting_catalog(apps, schema_editor):
    CatalogCategory = apps.get_model('service_requests', 'CatalogCategory')
    Service = apps.get_model('service_requests', 'Service')
    Package = apps.get_model('service_requests', 'Package')

    # Get the "Painting & Waterproofing" category
    category = CatalogCategory.objects.filter(slug__in=["painting", "paintings"]).first()
    if not category:
        return

    # Delete all existing services and packages for the painting category
    # to clean up old seeded/bridge data.
    services_to_del = Service.objects.filter(category=category)
    Package.objects.filter(service__in=services_to_del).delete()
    services_to_del.delete()

    # Define the 5 new services and their exact packages matching the booking flow
    painting_structure = {
        "Interior Painting": {
            "slug": "interior-painting",
            "packages": [
                {"name": "Single Wall", "slug": "int-single-wall", "desc": "Inspection of one focus wall, moisture checking, and measurement.", "price": 0},
                {"name": "One Room", "slug": "int-one-room", "desc": "Measurement and putty/paint assessment for a single room.", "price": 0},
                {"name": "Two or More Rooms", "slug": "int-multi-room", "desc": "Comprehensive consultation for two or more rooms.", "price": 0},
                {"name": "Full Home", "slug": "int-full-home", "desc": "Complete house painting assessment including all walls and ceilings.", "price": 0},
                {"name": "Ceiling", "slug": "int-ceiling", "desc": "Ceiling inspection, leakage check, and measurement.", "price": 0}
            ]
        },
        "Exterior Painting": {
            "slug": "exterior-painting",
            "packages": [
                {"name": "Exterior Wall", "slug": "ext-wall", "desc": "Exterior wall check, cracks checking, and pressure wash assessment.", "price": 49},
                {"name": "Building Exterior", "slug": "ext-building", "desc": "Full building external paint assessment and safety review.", "price": 49},
                {"name": "Compound Wall", "slug": "ext-compound", "desc": "Compound wall length measurement and weather-coat suggestions.", "price": 49},
                {"name": "Terrace", "slug": "ext-terrace", "desc": "Terrace floor assessment and heat-resistant paint options.", "price": 49}
            ]
        },
        "Waterproofing": {
            "slug": "waterproofing",
            "packages": [
                {"name": "Terrace Waterproofing", "slug": "wp-terrace", "desc": "Terrace leakage detection, mapping, and joint water testing.", "price": 49},
                {"name": "Bathroom Waterproofing", "slug": "wp-bathroom", "desc": "Bathroom floor and wall tile joint inspection for moisture.", "price": 49},
                {"name": "Wall Waterproofing", "slug": "wp-wall", "desc": "Moisture meter check of internal damp walls and leakage source detection.", "price": 49},
                {"name": "Roof Waterproofing", "slug": "wp-roof", "desc": "Roof slab checking, crack width testing, and protective coating assessment.", "price": 49},
                {"name": "Crack Filling", "slug": "wp-crack", "desc": "Identification of structural/hairline cracks and sealant suggestions.", "price": 49}
            ]
        },
        "Wood & Metal": {
            "slug": "wood-metal",
            "packages": [
                {"name": "Doors", "slug": "wm-doors", "desc": "Wooden/metal doors surface rust check, sanding estimation.", "price": 49},
                {"name": "Windows", "slug": "wm-windows", "desc": "Window grill and frame surface protection check.", "price": 49},
                {"name": "Grills", "slug": "wm-grills", "desc": "Balcony/staircase grills rust removal and paint planning.", "price": 49},
                {"name": "Cabinets", "slug": "wm-cabinets", "desc": "Kitchen or bedroom wooden cabinet wood condition review.", "price": 49},
                {"name": "Gates", "slug": "wm-gates", "desc": "Main gate rust scraping and PU/enamel coat assessment.", "price": 49}
            ]
        },
        "Texture Decor": {
            "slug": "texture-decor",
            "packages": [
                {"name": "Texture Finish", "slug": "td-texture", "desc": "Consultation on accent wall patterns, stencils, and metallic textures.", "price": 49},
                {"name": "Designer Finish", "slug": "td-designer", "desc": "Custom high-end designs, glazes, and pattern catalog showcase.", "price": 49},
                {"name": "Stencil Decor", "slug": "td-stencil", "desc": "Living room or bedroom stencil pattern consultation.", "price": 49},
                {"name": "Accent Wall Painting", "slug": "td-accent", "desc": "Single focal wall color selection and texture mockups.", "price": 49}
            ]
        }
    }

    for svc_name, svc_data in painting_structure.items():
        # Create Service
        svc = Service.objects.create(
            category=category,
            name=svc_name,
            slug=svc_data["slug"],
            description=f"{svc_name} services and package rates.",
            is_active=True
        )
        # Create Packages under Service
        for pkg in svc_data["packages"]:
            Package.objects.create(
                service=svc,
                name=pkg["name"],
                slug=pkg["slug"],
                description=pkg["desc"],
                base_price=pkg["price"],
                status="ACTIVE",
                popular=False
            )

def reverse_fix(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0030_fix_painting_packages_linkage'),
    ]

    operations = [
        migrations.RunPython(reseed_painting_catalog, reverse_fix),
    ]
