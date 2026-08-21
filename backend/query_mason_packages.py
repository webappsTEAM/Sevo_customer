import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, Service, CatalogCategory

print("ALL PACKAGES:")
for p in Package.objects.all():
    print(f"ID: {p.id} | Slug: {p.slug} | Name: {p.name} | BasePrice: {p.base_price} | Service: {p.service.name if p.service else 'None'} | Category: {p.service.category.slug if p.service and p.service.category else 'None'}")
