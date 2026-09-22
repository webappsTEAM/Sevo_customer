"""
Docker Seed Script - CalServices
================================
Creates the public company, a demo company, an admin user,
and a customer user.

Run from backend/:
  python seed_docker.py
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company, Domain

User = get_user_model()


def separator(title):
    print(f"\n{'=' * 55}")
    print(f"  {title}")
    print(f"{'=' * 55}")


# == Step 1: Public company =====================================================
separator("Step 1: Public company")

public_tenant, created = Company.objects.get_or_create(
    schema_name="public",
    defaults={"company_name": "Public Tenant"},
)
Domain.objects.get_or_create(
    domain="localhost",
    tenant=public_tenant,
    defaults={"is_primary": True},
)
print(f"  [{'CREATED' if created else 'EXISTS '}] Public company -> domain: localhost")


# == Step 2: Demo company =======================================================
separator("Step 2: Demo company")

demo_company, created = Company.objects.get_or_create(
    schema_name="demo",
    defaults={"company_name": "CalServices Demo Co."},
)
if created:
    Domain.objects.create(
        domain="demo.localhost",
        tenant=demo_company,
        is_primary=True,
    )
print(f"  [{'CREATED' if created else 'EXISTS '}] Demo company -> domain: demo.localhost")


# == Step 3: Admin user ========================================================
separator("Step 3: Admin user")

admin, created = User.objects.get_or_create(
    username="admin@calservices.com",
    defaults={
        "email": "admin@calservices.com",
        "first_name": "Admin",
        "last_name": "User",
        "role": "admin",
        "is_staff": True,
        "is_superuser": True,
        "is_active": True,
        "company": demo_company,
    }
)
admin.set_password("Admin@1234")
admin.save()
print(f"  [{'CREATED' if created else 'UPDATED'}] Admin -> admin@calservices.com / Admin@1234")
print("\nDone! Database seeded successfully.")
