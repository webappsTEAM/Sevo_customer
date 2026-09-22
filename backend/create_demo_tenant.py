import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from companies.models import Company, Domain

def create_demo_tenant():
    schema_name = "demo_v2"
    domain_name = "demo-v2.localhost"
    
    if not Company.objects.filter(schema_name=schema_name).exists():
        tenant = Company.objects.create(
            company_name="Demo Company",
            schema_name=schema_name,
        )
        Domain.objects.create(
            domain=domain_name,
            tenant=tenant,
            is_primary=True
        )
    print(f"Tenant '{schema_name}' and domain '{domain_name}' created.")

if __name__ == "__main__":
    create_demo_tenant()
