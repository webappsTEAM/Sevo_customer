from django.db import migrations

def fix_painting_linkages(apps, schema_editor):
    CatalogCategory = apps.get_model('service_requests', 'CatalogCategory')
    Service = apps.get_model('service_requests', 'Service')
    Package = apps.get_model('service_requests', 'Package')

    # Get the "Painting" category
    category = CatalogCategory.objects.filter(slug__in=["painting", "paintings"]).first()
    if not category:
        return

    # Check/Create the 5 original services under this category
    service_mapping = {
        "Interior Painting": "interior-painting",
        "Exterior Painting": "exterior-painting",
        "Waterproofing": "waterproofing",
        "Wood & Metal": "wood-metal",
        "Texture Decor": "texture-decor"
    }

    services_in_db = {}
    for name, slug in service_mapping.items():
        svc, created = Service.objects.get_or_create(
            slug=slug,
            defaults={
                "category": category,
                "name": name,
                "description": f"{name} services & pricing packages.",
                "is_active": True
            }
        )
        services_in_db[name] = svc

    # Define package name mappings to their target service
    package_to_service_map = {
        "Interior Painting": "Interior Painting",
        "Exterior Painting": "Exterior Painting",
        "Wall Putty": "Interior Painting",
        "Texture Painting": "Texture Decor",
        "Waterproof Coating": "Waterproofing",
        "Ceiling Painting": "Interior Painting",
        "Wall Crack Repair": "Waterproofing",
        "Single Room Makeover": "Interior Painting",
        "Complete Home Painting": "Interior Painting",
        "Texture & Decor Painting": "Texture Decor",
    }

    # Find the old bridge service (name "Painting")
    old_bridge_service = Service.objects.filter(category=category, name="Painting").first()
    if old_bridge_service:
        # Reassign packages
        for pkg in Package.objects.filter(service=old_bridge_service):
            target_service_name = package_to_service_map.get(pkg.name)
            if target_service_name and target_service_name in services_in_db:
                pkg.service = services_in_db[target_service_name]
                pkg.save(update_fields=["service", "updated_at"])
        
        # Finally, delete the redundant old bridge service
        if old_bridge_service.packages.count() == 0:
            old_bridge_service.delete()

def reverse_fix(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('service_requests', '0029_merge_20260813_0948'),
    ]

    operations = [
        migrations.RunPython(fix_painting_linkages, reverse_fix),
    ]
