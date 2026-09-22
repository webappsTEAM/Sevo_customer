import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package

print("CATEGORIES IN DB:")
for c in CatalogCategory.objects.all():
    print(f"ID: {c.id} | Slug: {c.slug} | Name: {c.name}")
    services = Service.objects.filter(category=c)
    print(f"  Services ({services.count()}):")
    for s in services:
        pkgs = Package.objects.filter(service=s)
        print(f"    - Service: {s.name} (Slug: {s.slug}) | Packages count: {pkgs.count()}")
        for p in pkgs:
            print(f"      * Package: {p.name} (Slug: {p.slug})")
