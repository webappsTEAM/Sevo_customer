import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from django.contrib.auth import authenticate, get_user_model
User = get_user_model()

print("Testing authentication for admin accounts:")
test_cases = [
    ("suryaramya111111@gmail.com", "admin123"),
    ("suryaramya111111@gmail.com", "password"),
    ("suryaramya111111@gmail.com", "admin@123"),
    ("admin", "admin123"),
    ("admin@caldim.in", "admin123"),
    ("admin", "admin"),
    ("admin", "Admin@123"),
    ("admin", "password"),
    ("admin@test.com", "admin123"),
]

for username, pwd in test_cases:
    user = authenticate(username=username, password=pwd)
    print(f"Auth '{username}' with '{pwd}' -> {user}")
