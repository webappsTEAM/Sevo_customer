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

# Step 1: Login Admin
conn.request("POST", "/api/auth/login/", json.dumps({"username": "admin", "password": "Admin@1234"}), {"Content-Type": "application/json"})
res1 = conn.getresponse()
cookies1 = res1.getheader("Set-Cookie")
res1.read()
session_cookie = [c.split(";")[0].strip() for c in cookies1.split(",") if "sessionid=" in c][0]

# Step 2: 2FA challenge
conn.request("POST", "/api/auth/2fa/challenge/", json.dumps({"code": code}), {"Content-Type": "application/json", "Cookie": session_cookie})
res2 = conn.getresponse()
cookies2 = res2.getheader("Set-Cookie")
res2.read()
auth_cookies = "; ".join([c.split(";")[0].strip() for c in cookies2.split(",")])

print("Authenticated as Admin.")

# Define 3 Distinct Test Services
service_a_slug = "ceiling-fan-installation"
service_b_slug = "tap-mixer-repair-replacement"
service_c_slug = "foam-power-jet-split"

payload_a = {
    "name": "Ceiling Fan Installation / Regulator Repair",
    "base_price": 199,
    "tag": "Best Seller",
    "popular": True,
    "duration": "45 mins",
    "description": "Customized ceiling fan installation & regulator testing with precision balance.",
    "tools": ["Heavy duty step ladder", "Digital multimeter & phase tester", "Blade angle balance clip kit"],
    "ready": ["Keep the fan box in the room", "Ensure clear ceiling space"],
    "reviews": [{"name": "Aarav Sharma", "rating": "5.0", "text": "Installed our BLDC fan smoothly with zero vibration."}],
    "faqs": [{"q": "Do you balance wobbly fan blades?", "a": "Yes, we perform dynamic blade balancing with precision clips."}],
    "includes": ["Ceiling bracket & anchor fitting", "Down-rod cable threading & shackle nut locking"]
}

payload_b = {
    "name": "Tap / Mixer Installation & Leak Repair",
    "base_price": 149,
    "tag": "Most Booked",
    "popular": True,
    "duration": "30 mins",
    "description": "Professional tap and basin mixer installation with zero leakage guarantee.",
    "tools": ["Adjustable plumbing spanner set", "PTFE teflon sealing tape", "Silicone gasket seals"],
    "ready": ["Show location of main water inlet valve", "Keep bucket and cleaning cloth handy"],
    "reviews": [{"name": "Pooja Verma", "rating": "4.9", "text": "Fixed our leaking kitchen mixer in 20 minutes."}],
    "faqs": [{"q": "Are spare washers and teflon tape included?", "a": "Yes, standard Teflon tape and rubber washers are included."}],
    "includes": ["Angle valve shutoff & pressure check", "Thread sealing & cartridge seating"]
}

payload_c = {
    "name": "Foam & Power Jet AC Service (Split)",
    "base_price": 499,
    "tag": "Trending",
    "popular": True,
    "duration": "60 mins",
    "description": "Deep antibacterial foam jet wash with waterproof service jacket protection.",
    "tools": ["High-pressure 120-bar water jet pump", "pH-neutral antibacterial foam spray", "360-degree waterproof AC service catch bag"],
    "ready": ["Continuous water tap connection", "16A working power socket nearby"],
    "reviews": [{"name": "Vikram Sethi", "rating": "5.0", "text": "AC is whisper quiet and cooling is ice cold now."}],
    "faqs": [{"q": "Will dirty water spill on the walls?", "a": "No, our waterproof catch jacket channels all runoff into a bucket."}],
    "includes": ["Indoor cooling fin deep foam wash", "Outdoor condenser high-pressure jet wash"]
}

# Step 3: Save Service A, B, C via Admin API
for name, slug, payload in [("Service A", service_a_slug, payload_a), ("Service B", service_b_slug, payload_b), ("Service C", service_c_slug, payload_c)]:
    conn.request("PUT", f"/api/settings/catalog/v2/packages/{slug}/", json.dumps(payload), {"Content-Type": "application/json", "Cookie": auth_cookies})
    res = conn.getresponse()
    body = res.read().decode("utf-8")
    assert res.status == 200, f"Failed to save {name}: {body}"
    print(f"Saved {name} ({slug}) successfully -> Status 200")

# Step 4: Fetch via Public Customer Catalog API
conn.request("GET", "/api/settings/catalog/public/packages/")
res_pub = conn.getresponse()
data_pub = json.loads(res_pub.read().decode("utf-8"))
assert data_pub["success"] is True
packages_list = data_pub["data"]

pkg_a = next(p for p in packages_list if p["slug"] == service_a_slug)
pkg_b = next(p for p in packages_list if p["slug"] == service_b_slug)
pkg_c = next(p for p in packages_list if p["slug"] == service_c_slug)

print("\n--- ISOLATION VERIFICATION ---")

print("\nService A:")
print(f"  Price: {pkg_a['base_price']} | Tag: {pkg_a['tag']} | Duration: {pkg_a['duration']}")
print(f"  Tools: {pkg_a['tools']}")
print(f"  Ready: {pkg_a['ready']}")

print("\nService B:")
print(f"  Price: {pkg_b['base_price']} | Tag: {pkg_b['tag']} | Duration: {pkg_b['duration']}")
print(f"  Tools: {pkg_b['tools']}")
print(f"  Ready: {pkg_b['ready']}")

print("\nService C:")
print(f"  Price: {pkg_c['base_price']} | Tag: {pkg_c['tag']} | Duration: {pkg_c['duration']}")
print(f"  Tools: {pkg_c['tools']}")
print(f"  Ready: {pkg_c['ready']}")

# Strict Assertions for Zero Data Leakage
assert float(pkg_a['base_price']) == 199.0 and pkg_a['tag'] == "Best Seller" and pkg_a['duration'] == "45 mins"
assert float(pkg_b['base_price']) == 149.0 and pkg_b['tag'] == "Most Booked" and pkg_b['duration'] == "30 mins"
assert float(pkg_c['base_price']) == 499.0 and pkg_c['tag'] == "Trending" and pkg_c['duration'] == "60 mins"

assert "Digital multimeter & phase tester" in pkg_a['tools'] and "Digital multimeter & phase tester" not in pkg_b['tools'] and "Digital multimeter & phase tester" not in pkg_c['tools']
assert "PTFE teflon sealing tape" in pkg_b['tools'] and "PTFE teflon sealing tape" not in pkg_a['tools'] and "PTFE teflon sealing tape" not in pkg_c['tools']
assert "High-pressure 120-bar water jet pump" in pkg_c['tools'] and "High-pressure 120-bar water jet pump" not in pkg_a['tools'] and "High-pressure 120-bar water jet pump" not in pkg_b['tools']

print("\n>>> ALL CRITICAL SERVICE ISOLATION TESTS PASSED 100%! ZERO DATA LEAKAGE! <<<")
