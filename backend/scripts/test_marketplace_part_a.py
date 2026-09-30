import os
import sys
import json
import time
import datetime
import requests
import django

# Setup Django environment
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from orders.models import MarketplaceOrder, MarketplaceOrderItem, MarketplaceOrderEvent
from carts.models import Cart, CartItem, CartType, CartStatus
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

User = get_user_model()

print("="*80)
print("EXECUTION OF LIVE TEST: PART A")
print("="*80)

# A1. Confirm Secrets & Vendor Base URL
print("\n--- A1. Configuration & Vendor URL Confirmation ---")
customer_secret = getattr(settings, "SEVO_INTEGRATION_SECRET", None) or os.getenv("SEVO_INTEGRATION_SECRET") or ""
customer_webhook_secret = getattr(settings, "WORKFORCE_WEBHOOK_SECRET", None) or os.getenv("WORKFORCE_WEBHOOK_SECRET") or ""
base_url = getattr(settings, "WORKFORCE_API_BASE_URL", None) or os.getenv("WORKFORCE_API_BASE_URL") or ""

print(f"SEVO_INTEGRATION_SECRET configured: {bool(customer_secret)} (length={len(customer_secret)})")
print(f"WORKFORCE_WEBHOOK_SECRET configured: {bool(customer_webhook_secret)} (length={len(customer_webhook_secret)})")
print(f"WORKFORCE_API_BASE_URL: {base_url}")

# Test ping to vendor API directly with headers
headers = MarketplaceIntegrationClient._headers()
try:
    v_resp = requests.get(f"{base_url.rstrip('/')}/marketplace/categories/", headers=headers, timeout=5)
    print(f"Vendor API Direct Probe status: {v_resp.status_code}")
    vendor_alive = (v_resp.status_code == 200)
except Exception as e:
    print(f"Vendor API Direct Probe failed: {e}")
    vendor_alive = False

print(f"Vendor API Live & Authenticated: {vendor_alive}")

# A2. Call GET /api/marketplace/categories/ and GET /api/marketplace/products/
print("\n--- A2. Query Marketplace Categories & Products ---")
start_a2 = time.time()
cat_url = "http://127.0.0.1:8000/api/marketplace/categories/"
cat_resp = requests.get(cat_url)
print(f"GET {cat_url} -> Status: {cat_resp.status_code}")

prod_url = "http://127.0.0.1:8000/api/marketplace/products/?search=TEST-AUDIT-20260930111254"
prod_resp = requests.get(prod_url)
print(f"GET {prod_url} -> Status: {prod_resp.status_code}")
prod_data = prod_resp.json()
print("Product Response Data:")
print(json.dumps(prod_data, indent=2))

# Find test product 953
target_product = None
if isinstance(prod_data, dict) and "results" in prod_data:
    for p in prod_data["results"]:
        if p.get("id") == 953 or "TEST-AUDIT-20260930111254" in p.get("title", ""):
            target_product = p
            break
elif isinstance(prod_data, list):
    for p in prod_data:
        if p.get("id") == 953 or "TEST-AUDIT-20260930111254" in p.get("title", ""):
            target_product = p
            break

print(f"\nTarget Product Found: {bool(target_product)}")
if target_product:
    print(f"  ID: {target_product.get('id')}")
    print(f"  Title: {target_product.get('title')}")
    print(f"  Category: {target_product.get('category_name')} / {target_product.get('category_path')}")
    print(f"  Price: {target_product.get('selling_price')} (MRP: {target_product.get('mrp')})")
    print(f"  Stock: {target_product.get('available_stock')} (in_stock: {target_product.get('in_stock')})")
    print(f"  Seller ID: {target_product.get('seller_id')}")

# Note time elapsed since approval (timestamp in title 2026-09-30 11:12:54)
now_time = datetime.datetime.now()
try:
    approval_time = datetime.datetime(2026, 9, 30, 11, 12, 54)
    elapsed = now_time - approval_time
    print(f"Time elapsed since approval (11:12:54): {elapsed} (approx {int(elapsed.total_seconds())}s)")
except Exception as e:
    print(f"Elapsed time calculation error: {e}")

# A3. Validate Cart with valid quantity (5)
print("\n--- A3. POST /api/marketplace/cart/validate/ (Valid Quantity: 5) ---")
seller_id = target_product.get("seller_id", 1) if target_product else 1
val_url = "http://127.0.0.1:8000/api/marketplace/cart/validate/"
val_payload_5 = {
    "seller_id": seller_id,
    "items": [
        {
            "product_id": 953,
            "requested_quantity": 5,
            "expected_unit_price": "48.00"
        }
    ]
}
val_resp_5 = requests.post(val_url, json=val_payload_5)
print(f"POST {val_url} (qty=5) -> Status: {val_resp_5.status_code}")
print("Response:")
print(json.dumps(val_resp_5.json(), indent=2))

# A4. Validate Cart with excessive quantity (999)
print("\n--- A4. POST /api/marketplace/cart/validate/ (Excess Quantity: 999) ---")
val_payload_999 = {
    "seller_id": seller_id,
    "items": [
        {
            "product_id": 953,
            "requested_quantity": 999,
            "expected_unit_price": "48.00"
        }
    ]
}
val_resp_999 = requests.post(val_url, json=val_payload_999)
print(f"POST {val_url} (qty=999) -> Status: {val_resp_999.status_code}")
print("Response:")
print(json.dumps(val_resp_999.json(), indent=2))

# A5. Complete full checkout via Cash on Delivery
print("\n--- A5. Customer COD Checkout ---")
# Get or create test customer
customer, created = User.objects.get_or_create(
    username="cust_audit_live",
    defaults={
        "email": "audit_customer@sevo.com",
        "role": "customer",
        "is_active": True,
    }
)
token = str(RefreshToken.for_user(customer).access_token)
auth_headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
    "X-Idempotency-Key": "test_idemp_audit_cod_953_v1"
}

# Ensure clean active cart
Cart.objects.filter(customer=customer, cart_type=CartType.MARKETPLACE).delete()
cart = Cart.objects.create(customer=customer, cart_type=CartType.MARKETPLACE, status=CartStatus.ACTIVE)

# Add item to cart via API
add_item_url = "http://127.0.0.1:8000/api/carts/marketplace/items/"
add_item_payload = {
    "seller_product_id": 953,
    "quantity": 5
}
add_resp = requests.post(add_item_url, json=add_item_payload, headers=auth_headers)
print(f"POST {add_item_url} -> Status: {add_resp.status_code}")
print("Add item response:", add_resp.json())

# Submit COD checkout
checkout_url = "http://127.0.0.1:8000/api/orders/marketplace/checkout/"
checkout_payload = {
    "delivery_address": "42 Market Street, Gandhipuram, Coimbatore 641012",
    "customer_name": "Audit Customer",
    "customer_phone": "+919876543210",
    "customer_email": "audit_customer@sevo.com",
    "payment_method": "COD",
    "fulfilment_type": "DELIVERY",
    "idempotency_key": "test_idemp_audit_cod_953_v1"
}

checkout_resp = requests.post(checkout_url, json=checkout_payload, headers=auth_headers)
print(f"POST {checkout_url} -> Status: {checkout_resp.status_code}")
checkout_data = checkout_resp.json()
print("Checkout Response:")
print(json.dumps(checkout_data, indent=2))

order_number = checkout_data.get("data", {}).get("order_number") or ""
source_order_id = order_number
print(f"\nCreated Source Order ID: {source_order_id}")

# Fetch the MarketplaceOrder DB row
order_obj = MarketplaceOrder.objects.filter(order_number=order_number).first()
if order_obj:
    print(f"MarketplaceOrder DB Row:")
    print(f"  order_number: {order_obj.order_number}")
    print(f"  vendor_order_id: {order_obj.vendor_order_id}")
    print(f"  vendor_order_number: {order_obj.vendor_order_number}")
    print(f"  status: {order_obj.status} ({order_obj.get_status_display()})")
    print(f"  payment_method: {order_obj.payment_method}")
    print(f"  payment_status: {order_obj.payment_status}")
    print(f"  vendor_intake_synced: {order_obj.vendor_intake_synced}")
    print(f"  total_amount: {order_obj.total_amount}")
    print(f"  delivery_group_id: {order_obj.delivery_group_id}")
    print(f"  items count: {order_obj.items.count()}")
    for item in order_obj.items.all():
        print(f"    - Item: {item.product_title} (ID: {item.seller_product_id}), Qty: {item.quantity}, Price: {item.unit_price_snapshot}, Line: {item.line_amount}")

# A6. Re-submit EXACT same checkout request (idempotency check)
print("\n--- A6. Re-submit EXACT same checkout request (Idempotency Check) ---")
re_checkout_resp = requests.post(checkout_url, json=checkout_payload, headers=auth_headers)
print(f"POST {checkout_url} (Re-submit) -> Status: {re_checkout_resp.status_code}")
re_checkout_data = re_checkout_resp.json()
print("Re-checkout Response:")
print(json.dumps(re_checkout_data, indent=2))

# Verify count of orders in DB
orders_count = MarketplaceOrder.objects.filter(order_number=order_number).count()
print(f"MarketplaceOrder count with order_number={order_number}: {orders_count} (Expected: 1)")
