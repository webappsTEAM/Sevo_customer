import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

print(f"Total Categories: {CatalogCategory.objects.count()}")
print(f"Total Services: {Service.objects.count()}")
print(f"Total Packages: {Package.objects.count()}")

empty_tools_count = Package.objects.filter(tools=[]).count()
empty_faqs_count = Package.objects.filter(faqs=[]).count()
empty_includes_count = Package.objects.filter(includes=[]).count()

print(f"Packages with empty tools: {empty_tools_count}")
print(f"Packages with empty faqs: {empty_faqs_count}")
print(f"Packages with empty includes: {empty_includes_count}")

# Check sample package from each major category
for cat in CatalogCategory.objects.all():
    first_pkg = Package.objects.filter(service__category=cat).first()
    if first_pkg:
        print(f"\n[Category: {cat.name}]")
        print(f"  Package: {first_pkg.name} (id: {first_pkg.id}, slug: {first_pkg.slug})")
        print(f"  Price: {first_pkg.base_price}, Duration: {first_pkg.duration}, Tag: {first_pkg.tag}")
        print(f"  Tools: {len(first_pkg.tools)} items, Ready: {len(first_pkg.ready)} items, Reviews: {len(first_pkg.reviews)} items, FAQs: {len(first_pkg.faqs)} items")
