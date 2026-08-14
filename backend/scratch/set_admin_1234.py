import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.contrib.auth import get_user_model, authenticate
from companies.models import Company

User = get_user_model()
company = Company.objects.first()

admins = [
    {"username": "admin", "email": "admin@caldim.in"},
    {"username": "admin@caltrack.com", "email": "admin@caltrack.com"},
    {"username": "suryaramya111111@gmail.com", "email": "suryaramya111111@gmail.com"},
    {"username": "admin@test.com", "email": "admin@test.com"},
]

for acc in admins:
    user = User.objects.filter(username=acc["username"]).first() or User.objects.filter(email=acc["email"]).first()
    if not user:
        user = User.objects.create(username=acc["username"], email=acc["email"])
    
    user.set_password("Admin@1234")
    user.role = "admin"
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.two_fa_enabled = False  # Set to False so it logs in directly without 2FA prompt
    if company:
        user.company = company
    user.save()
    print(f"Set password 'Admin@1234' for user: {user.username} ({user.email})")

print("\nVerifying authentication with 'Admin@1234':")
for acc in admins:
    u = authenticate(username=acc["username"], password="Admin@1234")
    print(f"Auth '{acc['username']}': {u is not None}")
