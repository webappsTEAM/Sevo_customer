import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package
from service_requests.serializers import ServiceSerializer, PackageSerializer

cat = CatalogCategory.objects.get(slug="electrician_plumbing_carpentry")
print("Category:", cat.id, cat.name, cat.slug)

services = Service.objects.filter(category=cat)
print("Services:", len(services))
for s in services:
    pkgs = Package.objects.filter(service=s)
    print(f"  Service: {s.name} (id: {s.id}, slug: {s.slug}) -> Packages: {pkgs.count()}")
    for p in pkgs:
        print(f"     -> Pkg ID: {p.id} | Slug: {p.slug} | Name: {p.name} | Price: {p.base_price}")
