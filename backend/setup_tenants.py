import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from companies.models import Company, Domain

def create_public_tenant():
    # Create the public tenant
    if not Company.objects.filter(schema_name="public").exists():
        tenant = Company.objects.create(
            schema_name="public",
            company_name="Public Tenant",
        )
        Domain.objects.create(
            domain="localhost",
            tenant=tenant,
            is_primary=True
        )
        print("Public tenant and domain created.")
    else:
        print("Public tenant already exists.")

if __name__ == "__main__":
    create_public_tenant()
