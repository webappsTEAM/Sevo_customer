import urllib.request
import json

url = "http://127.0.0.1:8000/api/auth/login/"
payload = json.dumps({"username": "suryaramya111111@gmail.com", "password": "admin123"}).encode("utf-8")
headers = {"Content-Type": "application/json"}

req = urllib.request.Request(url, data=payload, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        print("Body:", resp.read().decode("utf-8"))
except Exception as e:
    print(f"Request failed: {e}")
    if hasattr(e, "read"):
        print("Error body:", e.read().decode("utf-8"))
