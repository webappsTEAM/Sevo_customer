import os
import django
from dotenv import load_dotenv

# Load .env explicitly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'), override=True)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.contrib.auth import get_user_model
from companies.models import Company

User = get_user_model()

try:
    company = Company.objects.first()
    
    user, created = User.objects.get_or_create(username='admin')
    user.set_password('admin123')
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.first_name = 'Admin'
    user.role = 'admin'
    if company:
        user.company = company
    user.save()

    if created:
        print('SUCCESS: Created new admin user with password: admin123')
    else:
        print('SUCCESS: Reset existing admin user password to: admin123')
except Exception as e:
    print('ERROR:', e)
