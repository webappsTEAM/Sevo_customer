import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp, qrcode
from django.contrib.auth import get_user_model

User = get_user_model()
admin = User.objects.filter(username="admin").first()

if not admin:
    admin = User.objects.create(username="admin", email="admin@caltrack.com", role="admin")

# Use a permanent clean Base32 secret (or generate one)
secret = admin.totp_secret if admin.totp_secret else pyotp.random_base32()
admin.totp_secret = secret
admin.two_fa_enabled = True
admin.set_password("Admin@1234")
admin.save(update_fields=["totp_secret", "two_fa_enabled", "password"])

# Generate QR code for Authenticator App
totp = pyotp.TOTP(secret)
uri = totp.provisioning_uri(name="admin@caltrack.com", issuer_name="CalServices")
img = qrcode.make(uri)
img.save("2fa_qr.png")

print(f"2FA ENABLED for admin!")
print(f"Manual Entry Secret Key: {secret}")
print(f"Current Live 6-digit TOTP Code: {totp.now()}")
print(f"QR Code saved to: 2fa_qr.png")
