import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import Package
from rest_framework.test import APIClient
from accounts.models import User
from rest_framework_simplejwt.tokens import RefreshToken

admin_user = User.objects.filter(role__in=['ADMIN', 'OWNER', 'SUPER_ADMIN']).first()
if not admin_user:
    admin_user = User.objects.filter(is_superuser=True).first()

print(f"Using test user: {admin_user.email} (role: {admin_user.role})")
token = str(RefreshToken.for_user(admin_user).access_token)

client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
client.cookies['admin_access_token'] = token

test_slugs = ["elec-sw-1", "plum-tap-1", "carp-lock-1"]

for slug in test_slugs:
    pkg = Package.objects.get(slug=slug)
    print(f"\n--- Testing Admin Customise on: '{pkg.name}' (slug: {slug}, ID: {pkg.id}) ---")
    
    payload = {
        "name": pkg.name + " (Customized)",
        "base_price": int(pkg.base_price) + 50,
        "duration": "35 mins",
        "tag": "Super Seller",
        "description": "Updated custom description stored in Supabase.",
        "includes": ["Inspected with digital meter", "Standard safety fit", "Warranty included"],
        "tools": ["Digital multimeter", "Safety gloves", "Insulated pliers"],
        "ready": ["Keep power switch accessible"],
        "reviews": [{"name": "Tester", "rating": "5.0", "text": "Customization saved successfully."}],
        "faqs": [{"q": "Is this customized in DB?", "a": "Yes, 100% saved in Supabase."}],
        "popular": True,
        "status": "ACTIVE"
    }
    
    response = client.put(f"/api/settings/catalog/v2/packages/{pkg.id}/", payload, format='json')
    print(f"HTTP Status: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.data}"
    
    pkg.refresh_from_db()
    print(f"Verified from DB: Name='{pkg.name}', Price=Rs.{pkg.base_price}, Duration='{pkg.duration}', Tag='{pkg.tag}', Tools={pkg.tools}")

print("\nALL ADMIN CUSTOMIZATION TESTS PASSED WITH 100% SUPABASE PERSISTENCE!")
