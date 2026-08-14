import http.client
import json
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

import pyotp
from django.contrib.auth import get_user_model
User = get_user_model()
admin = User.objects.get(username="admin")
totp = pyotp.TOTP(admin.totp_secret)
code = totp.now()

conn = http.client.HTTPConnection("127.0.0.1", 8000)

# Step 1: Login with password
login_body = json.dumps({"username": "admin", "password": "Admin@1234"})
conn.request("POST", "/api/auth/login/", login_body, {"Content-Type": "application/json"})
res1 = conn.getresponse()
cookies = res1.getheader("Set-Cookie")
body1 = res1.read().decode("utf-8")
print(f"Step 1 (Password): Status {res1.status}, Body: {body1}")

# Step 2: Extract session cookie for 2FA challenge
session_cookie = None
if cookies:
    for c in cookies.split(","):
        if "sessionid=" in c:
            session_cookie = c.split(";")[0].strip()
print(f"Session Cookie: {session_cookie}")

headers2 = {"Content-Type": "application/json"}
if session_cookie:
    headers2["Cookie"] = session_cookie

challenge_body = json.dumps({"code": code})
conn.request("POST", "/api/auth/2fa/challenge/", challenge_body, headers2)
res2 = conn.getresponse()
body2 = res2.read().decode("utf-8")
print(f"Step 2 (2FA Verification with code {code}): Status {res2.status}, Body: {body2}")
print(f"Auth Cookies: {res2.getheader('Set-Cookie')}")
