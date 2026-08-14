import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

print("=== ALL CATEGORIES ===")
for cat in CatalogCategory.objects.all():
    print(f"Cat ID: {cat.id} | Name: '{cat.name}' | Slug: '{cat.slug}'")

print("\n=== ALL SERVICES ===")
for svc in Service.objects.all():
    print(f"Svc ID: {svc.id} | Name: '{svc.name}' | Slug: '{svc.slug}' | Cat: {svc.category.name if svc.category else 'None'} | Packages Count: {svc.packages.count()}")
    for pkg in svc.packages.all():
        print(f"   -> Pkg: '{pkg.name}' (id: {pkg.id}, slug: {pkg.slug}, price: {pkg.base_price}, has_vd: {bool(pkg.tools or pkg.ready or pkg.reviews or pkg.faqs)})")
