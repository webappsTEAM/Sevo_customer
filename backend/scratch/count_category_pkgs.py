import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

cat = CatalogCategory.objects.get(slug="electrician_plumbing_carpentry")
print(f"Pillar: {cat.name} (Total Packages: {Package.objects.filter(service__category=cat).count()})")

for s in Service.objects.filter(category=cat):
    pkgs = Package.objects.filter(service=s)
    print(f"  • {s.name} ({s.slug}): {pkgs.count()} packages")
