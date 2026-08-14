import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp
from django.contrib.auth import get_user_model
from companies.models import Company

User = get_user_model()
company = Company.objects.first()

SHARED_SECRET = "ZFHWH563SEIWI6PSIYGDC2SCC2AAZ7NR"

admin_users = [
    "admin",
    "suryaramya111111@gmail.com",
    "admin@caltrack.com",
    "admin@caldim.in",
    "admin@test.com"
]

for username_or_email in admin_users:
    u = User.objects.filter(username=username_or_email).first() or User.objects.filter(email=username_or_email).first()
    if not u:
        u = User.objects.create(username=username_or_email, email=username_or_email)
    
    u.set_password("Admin@1234")
    u.totp_secret = SHARED_SECRET
    u.two_fa_enabled = True
    u.role = "admin"
    u.is_staff = True
    u.is_superuser = True
    u.is_active = True
    if company:
        u.company = company
    u.save()
    print(f"Updated user '{u.username}' (email: '{u.email}') with secret '{SHARED_SECRET}' and password 'Admin@1234'")

totp = pyotp.TOTP(SHARED_SECRET)
print(f"\nSUCCESS! Secret synchronized with 2fa_qr.png: {SHARED_SECRET}")
print(f"Current live 6-digit TOTP code right now: {totp.now()}")
