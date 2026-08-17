import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Package

print("=== PAINTING & MASONRY PACKAGES DETAIL ===")
for pkg in Package.objects.all().select_related("service", "service__category"):
    cat_slug = pkg.service.category.slug if pkg.service and pkg.service.category else ""
    if cat_slug in ["painting", "paintings", "mason", "masons", "3", "11"]:
        print(f"ID: {pkg.id}, Name: {pkg.name}, Service Slug: {pkg.service.slug if pkg.service else 'None'}, Service Name: {pkg.service.name if pkg.service else 'None'}, Cat Slug: {cat_slug}")
