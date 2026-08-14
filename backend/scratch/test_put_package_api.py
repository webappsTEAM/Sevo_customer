import http.client
import json
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp
from django.contrib.auth import get_user_model
from service_requests.models import Package

User = get_user_model()
admin = User.objects.get(username="admin")
totp = pyotp.TOTP(admin.totp_secret)
code = totp.now()

conn = http.client.HTTPConnection("127.0.0.1", 8000)

# Step 1: Login
conn.request("POST", "/api/auth/login/", json.dumps({"username": "admin", "password": "Admin@1234"}), {"Content-Type": "application/json"})
res1 = conn.getresponse()
cookies1 = res1.getheader("Set-Cookie")
body1 = res1.read()
session_cookie = [c.split(";")[0].strip() for c in cookies1.split(",") if "sessionid=" in c][0]

# Step 2: 2FA challenge
conn.request("POST", "/api/auth/2fa/challenge/", json.dumps({"code": code}), {"Content-Type": "application/json", "Cookie": session_cookie})
res2 = conn.getresponse()
cookies2 = res2.getheader("Set-Cookie")
body2 = res2.read()
auth_cookies = "; ".join([c.split(";")[0].strip() for c in cookies2.split(",")])

print(f"Logged in, auth cookies: {auth_cookies}")

# Step 3: Find the ceiling fan package
pkg = Package.objects.filter(name__icontains="Ceiling Fan").first()
print(f"Testing PUT on pkg {pkg.id} ({pkg.slug})")

# Step 4: Make the exact PUT payload sent by CatalogPackagesPage.jsx
payload = {
    "name": pkg.name,
    "description": "Expert ceiling fan installation & regulator repair.",
    "base_price": 249,
    "tag": "Most Booked",
    "popular": True,
    "duration": "30-45 mins",
    "includes": ["Ceiling bracket & safety wire anchor fitting", "Down-rod cable threading & shackle nut locking"],
    "image": "",
    "offer_price": None,
    "tools": ["Sturdy step ladder", "Phase tester & crimp tool"],
    "ready": ["Keep the new fan box in the room"],
    "reviews": [{"name": "Meera S.", "rating": "4.9", "text": "Installed our heavy BLDC ceiling fan perfectly."}],
    "faqs": [{"q": "Do you install BLDC fans with remote?", "a": "Yes! We specialize in all brands."}]
}

conn.request(
    "PUT",
    f"/api/settings/catalog/v2/packages/{pkg.id}/",
    json.dumps(payload),
    {"Content-Type": "application/json", "Cookie": auth_cookies}
)
res3 = conn.getresponse()
body3 = res3.read().decode("utf-8")
print(f"\nPUT by ID ({pkg.id}): Status {res3.status}, Body: {body3}")

# Step 5: Test PUT by slug
conn.request(
    "PUT",
    f"/api/settings/catalog/v2/packages/{pkg.slug}/",
    json.dumps(payload),
    {"Content-Type": "application/json", "Cookie": auth_cookies}
)
res4 = conn.getresponse()
body4 = res4.read().decode("utf-8")
print(f"\nPUT by Slug ({pkg.slug}): Status {res4.status}, Body: {body4}")

# Step 6: Test PUT on older package IDs or virtual IDs
conn.request(
    "PUT",
    "/api/settings/catalog/v2/packages/fan-repair-install/",
    json.dumps(payload),
    {"Content-Type": "application/json", "Cookie": auth_cookies}
)
res5 = conn.getresponse()
body5 = res5.read().decode("utf-8")
print(f"\nPUT on 'fan-repair-install': Status {res5.status}, Body: {body5}")
