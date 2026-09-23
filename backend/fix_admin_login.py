import os
import django
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from accounts.models import User

email = "calservices05@gmail.com"

# Find ALL matching accounts
users = User.objects.filter(email__iexact=email)
print(f"Found {users.count()} user(s) with email '{email}':")

for u in users:
    print(f"  ID={u.id} | username={u.username} | role={u.role} | is_active={u.is_active} | is_staff={u.is_staff}")

# Fix: activate the admin account
admin_user = users.filter(role="admin").first() or users.first()
if admin_user:
    admin_user.is_active   = True
    admin_user.is_staff    = True
    admin_user.is_superuser = True
    admin_user.role        = "admin"
    admin_user.save(update_fields=["is_active", "is_staff", "is_superuser", "role"])
    print(f"\n[OK] Fixed! Account ID={admin_user.id} (username={admin_user.username}) is now ACTIVE as admin.")
else:
    print("\n[ERROR] No account found to fix.")
