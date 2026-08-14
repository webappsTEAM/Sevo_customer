import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

cats = CatalogCategory.objects.filter(name__icontains="AC")
for c in cats:
    print(f"Category: {c.name} (id: {c.id}, slug: {c.slug})")
    for s in Service.objects.filter(category=c):
        pkgs = Package.objects.filter(service=s)
        print(f"  • Service: {s.name} (id: {s.id}, slug: {s.slug}) -> {pkgs.count()} packages")
        for p in pkgs:
            print(f"      - {p.name} (id: {p.id}, slug: {p.slug}, Rs.{p.base_price})")
