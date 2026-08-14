import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp
from django.contrib.auth import get_user_model
User = get_user_model()

print("Admin users details:")
for u in User.objects.filter(role="admin"):
    totp = pyotp.TOTP(u.totp_secret) if u.totp_secret else None
    current_code = totp.now() if totp else "No secret"
    print(f"User: '{u.username}' (email: '{u.email}') | 2FA Enabled: {u.two_fa_enabled} | Secret: '{u.totp_secret}' | Current 6-digit TOTP: {current_code}")
