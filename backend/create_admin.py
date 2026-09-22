"""
Run with:
  python manage.py shell < create_admin.py

Creates (or resets) an admin user and a customer user in the database.
"""
import django
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company
from accounts.services import create_organization_admin_user

User = get_user_model()

# ── Admin user ────────────────────────────────────────────────
admin, created = create_organization_admin_user(
    email="admin@calservices.com",
    password="admin123",
    first_name="Admin",
    last_name="User",
    is_superuser=True
)
company = Company.objects.first()
if company:
    admin.company = company
    admin.save()
print(f"{'Created' if created else 'Updated'} admin -> username: {admin.username} / password: admin123")
