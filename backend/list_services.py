import os
import sys
import django

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service

print("SERVICES IN DB:")
for s in Service.objects.all():
    print(f"ID: {s.id} | Slug: {s.slug} | Name: {s.name} | Category: {s.category.slug if s.category else 'None'}")
