import urllib.request
import json

url = "http://127.0.0.1:8000/api/auth/login/"
for username in ["admin", "admin@caltrack.com", "suryaramya111111@gmail.com"]:
    payload = json.dumps({"username": username, "password": "Admin@1234"}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=payload, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"Login '{username}' -> Status {resp.status}, Body: {resp.read().decode('utf-8')}")
    except Exception as e:
        print(f"Login '{username}' failed: {e}")
