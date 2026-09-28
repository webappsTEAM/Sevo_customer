import urllib.request
import json
import os
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'quicktims.settings'
django.setup()

from service_requests.models import (
    ACInspectionConfiguration,
    ACInspectionRateCategory,
    ACInspectionRateItem,
)

print("=" * 70)
print("VERIFYING END-TO-END DYNAMIC AC INSPECTION: ADMIN -> DB -> CUSTOMER & VENDOR")
print("=" * 70)

# Step 1: Admin Customizes Diagnostic Fee to ₹299 in Database
print("\n[Step 1] Admin customizes Diagnostic Fee to Rs.299 in DB...")
config = ACInspectionConfiguration.get_solo()
original_fee = float(config.diagnostic_fee)
config.diagnostic_fee = 299.00
config.save()
print("Saved diagnostic_fee = 299.00 in PostgreSQL.")

# Step 2: Fetch Customer API (port 8000)
print("\n[Step 2] Customer side fetches live rate card from backend (port 8000)...")
req = urllib.request.Request("http://127.0.0.1:8000/api/service-requests/ac-inspection/rate-card/")
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    cust_data = json.loads(resp.read().decode("utf-8"))["data"]
print(f"-> Customer receives dynamic fee: Rs.{cust_data['diagnostic_fee']}")
assert cust_data['diagnostic_fee'] == 299.0, f"Expected 299.0, got {cust_data['diagnostic_fee']}"

# Step 3: Fetch Vendor API (port 8001)
print("\n[Step 3] Vendor side fetches live rate card from backend (port 8001)...")
req = urllib.request.Request("http://127.0.0.1:8001/api/vendor/rate-card/")
with urllib.request.urlopen(req) as resp:
    assert resp.status == 200
    vendor_data = json.loads(resp.read().decode("utf-8"))["data"]
print(f"-> Vendor receives dynamic fee: Rs.{vendor_data['diagnostic_fee']}")
assert vendor_data['diagnostic_fee'] == 299.0, f"Expected 299.0, got {vendor_data['diagnostic_fee']}"

# Step 4: Admin Customizes a Category & Item in Database
print("\n[Step 4] Admin creates new dynamic category & rate item in DB...")
test_cat = ACInspectionRateCategory.objects.create(
    name="Compressor Inverter Services",
    slug="compressor-inverter-services",
    display_order=8
)
test_item = ACInspectionRateItem.objects.create(
    category=test_cat,
    name="Dual Inverter Board Overhaul",
    price=3499.00,
    unit="unit",
    service_type="SPARE_PART",
    display_order=1
)
print(f"Created category '{test_cat.name}' with item '{test_item.name}' (Rs.{test_item.price})")

# Step 5: Verify Customer receives the new dynamic category and item
print("\n[Step 5] Checking Customer API for new category & item...")
with urllib.request.urlopen("http://127.0.0.1:8000/api/service-requests/ac-inspection/rate-card/") as resp:
    cust_cats = json.loads(resp.read().decode("utf-8"))["data"]["categories"]
    matched_cust_cat = next((c for c in cust_cats if c["name"] == "Compressor Inverter Services"), None)
    assert matched_cust_cat is not None, "New category not found on Customer side!"
    matched_cust_item = next((i for i in matched_cust_cat["items"] if i["name"] == "Dual Inverter Board Overhaul"), None)
    assert matched_cust_item is not None, "New item not found on Customer side!"
    print(f"-> Customer successfully received: '{matched_cust_item['name']}' @ Rs.{matched_cust_item['price']}")

# Step 6: Verify Vendor receives the new dynamic category and item
print("\n[Step 6] Checking Vendor API for new category & item...")
with urllib.request.urlopen("http://127.0.0.1:8001/api/vendor/rate-card/") as resp:
    vendor_cats = json.loads(resp.read().decode("utf-8"))["data"]["categories"]
    matched_vendor_cat = next((c for c in vendor_cats if c["name"] == "Compressor Inverter Services"), None)
    assert matched_vendor_cat is not None, "New category not found on Vendor side!"
    matched_vendor_item = next((i for i in matched_vendor_cat["items"] if i["name"] == "Dual Inverter Board Overhaul"), None)
    assert matched_vendor_item is not None, "New item not found on Vendor side!"
    print(f"-> Vendor successfully received: '{matched_vendor_item['name']}' @ Rs.{matched_vendor_item['price']}")

# Step 7: Clean up test data and restore original fee
print("\n[Step 7] Restoring original configuration in PostgreSQL...")
test_item.delete()
test_cat.delete()
config.diagnostic_fee = original_fee
config.save()
print(f"Restored diagnostic_fee = {original_fee} and removed test items.")

print("\n" + "=" * 70)
print("SUCCESS: 100% DYNAMIC ADMIN -> DB -> CUSTOMER & VENDOR FLOW VERIFIED!")
print("=" * 70)
