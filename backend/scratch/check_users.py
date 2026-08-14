import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()
users = User.objects.all()
print(f"Total users: {users.count()}")
for u in users:
    print(f"ID: {u.id}, Username: '{u.username}', Email: '{u.email}', Role: '{getattr(u, 'role', 'N/A')}', IsActive: {u.is_active}, IsSuperuser: {u.is_superuser}, 2FA: {getattr(u, 'two_fa_enabled', False)}")
