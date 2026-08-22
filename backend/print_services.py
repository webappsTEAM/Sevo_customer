import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Service, CatalogCategory

mason_cat = CatalogCategory.objects.get(slug="mason")
print(f"Category: {mason_cat.name} | ID: {mason_cat.id} | Slug: {mason_cat.slug}")

services = Service.objects.filter(category=mason_cat)
for s in services:
    print(f"Service ID: {s.id} | Name: {s.name} | Slug: {s.slug}")
