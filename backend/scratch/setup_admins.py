import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.contrib.auth import get_user_model, authenticate
from companies.models import Company

User = get_user_model()
company = Company.objects.first()
print(f"Default company: {company.company_name if company else 'None'}")

# Reset/Ensure standard admin accounts
admin_accounts = [
    {"username": "admin", "email": "admin@caldim.in"},
    {"username": "suryaramya111111@gmail.com", "email": "suryaramya111111@gmail.com"},
    {"username": "admin@test.com", "email": "admin@test.com"},
]

for acc in admin_accounts:
    user = User.objects.filter(username=acc["username"]).first() or User.objects.filter(email=acc["email"]).first()
    if not user:
        user = User.objects.create(username=acc["username"], email=acc["email"])
    
    user.set_password("admin123")
    user.role = "admin"
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.two_fa_enabled = False
    if company:
        user.company = company
    user.save()
    print(f"Successfully configured: username='{user.username}', email='{user.email}' with password='admin123'")

print("\nVerifying authentications:")
for acc in admin_accounts:
    u1 = authenticate(username=acc["username"], password="admin123")
    u2 = authenticate(username=acc["email"], password="admin123")
    print(f"Auth by username '{acc['username']}': {u1 is not None} | Auth by email '{acc['email']}': {u2 is not None}")
