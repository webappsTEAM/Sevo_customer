import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package
from companies.models import Company
from django_tenants.utils import schema_context

tenants = Company.objects.exclude(schema_name="public")
for tenant in tenants:
    with schema_context(tenant.schema_name):
        print(f"Tenant: {tenant.schema_name}")
        for p in Package.objects.all():
            print(f"  Package: name={p.name}, slug={p.slug}, service_slug={p.service.slug if p.service else 'None'}, category_slug={p.service.category.slug if p.service and p.service.category else 'None'}")
