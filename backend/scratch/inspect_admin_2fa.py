import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp, qrcode, io, base64
from django.contrib.auth import get_user_model
User = get_user_model()

admin = User.objects.filter(username="admin").first()
if admin:
    print(f"Admin user: {admin.username}, totp_secret: '{admin.totp_secret}', two_fa_enabled: {admin.two_fa_enabled}")
