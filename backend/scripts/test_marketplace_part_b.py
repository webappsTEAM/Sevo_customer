import os
import sys
import json
import time
import datetime
import requests
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.test import APIRequestFactory, force_authenticate
from orders.models import MarketplaceOrder, MarketplaceOrderItem, MarketplaceOrderEvent
from carts.models import Cart, CartItem, CartType, CartStatus
from workforce_integration.marketplace_client import MarketplaceIntegrationClient

User = get_user_model()
customer = User.objects.get(username="cust_audit_live")
token = str(RefreshToken.for_user(customer).access_token)
auth_headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

print("="*80)
print("EXECUTION OF LIVE TEST: PART B")
print("="*80)

# ==============================================================================
# B1. Attempt NEW checkout for Product 953 with OLD price (48.00)
# ==============================================================================
print("\n" + "="*50)
print("--- B1. Stale Price Checkout Attempt (Product 953 @ Rs.48.00) ---")
print("="*50)

# Clear customer marketplace cart and create an item with old snapshot price 48.00
Cart.objects.filter(customer=customer, cart_type=CartType.MARKETPLACE).delete()
cart = Cart.objects.create(customer=customer, cart_type=CartType.MARKETPLACE, status=CartStatus.ACTIVE)
cart_item = CartItem.objects.create(
    cart=cart,
    seller_product_id=953,
    product_title="TEST-AUDIT-20260930111254",
    product_sku="SKU-AUDIT-20260930111254",
    unit_price_snapshot=48.00,
    mrp_snapshot=60.00,
    quantity=2,
    seller_id=1944,
    seller_name="Swathi Vegetables",
)

# Test cart validate first with old price 48.00
val_url = "http://127.0.0.1:8000/api/marketplace/cart/validate/"
val_payload = {
    "seller_id": 1944,
    "items": [
        {
            "product_id": 953,
            "requested_quantity": 2,
            "expected_unit_price": "48.00"
        }
    ]
}
val_resp = requests.post(val_url, json=val_payload)
print(f"POST {val_url} -> Status: {val_resp.status_code}")
print("Validation Response:", json.dumps(val_resp.json(), indent=2))

# Attempt Checkout with stale price
checkout_url = "http://127.0.0.1:8000/api/orders/marketplace/checkout/"
checkout_payload_stale = {
    "delivery_address": "42 Market Street, Gandhipuram, Coimbatore 641012",
    "customer_name": "Audit Customer",
    "customer_phone": "+919876543210",
    "customer_email": "audit_customer@sevo.com",
    "payment_method": "COD",
    "fulfilment_type": "DELIVERY",
    "idempotency_key": f"test_stale_price_{int(time.time())}"
}

chk_resp = requests.post(checkout_url, json=checkout_payload_stale, headers=auth_headers)
print(f"\nPOST {checkout_url} (Stale Price Checkout) -> Status: {chk_resp.status_code}")
print("Response Body:", json.dumps(chk_resp.json(), indent=2))

# Confirm cart is preserved
cart.refresh_from_db()
print(f"Cart Preserved (Status={cart.status}, Items Count={cart.items.count()}): {cart.items.count() > 0}")

# ==============================================================================
# B2. Check MarketplaceOrder MKT00025 for status updates and events
# ==============================================================================
print("\n" + "="*50)
print("--- B2. Verify Status Transitions & Events on MKT00025 ---")
print("="*50)

order_mkt25 = MarketplaceOrder.objects.filter(order_number="MKT00025").prefetch_related("events", "items").first()
if order_mkt25:
    print(f"Order: {order_mkt25.order_number}")
    print(f"  Current Status: {order_mkt25.status} ({order_mkt25.get_status_display()})")
    print(f"  Vendor Order ID: {order_mkt25.vendor_order_id}")
    print(f"  Vendor Order Number: {order_mkt25.vendor_order_number}")
    print(f"  Last Applied Sequence: {order_mkt25.last_applied_vendor_sequence}")
    print(f"  Total Events Count: {order_mkt25.events.count()}")
    print("\n  Recorded MarketplaceOrderEvent rows:")
    for ev in order_mkt25.events.all().order_by("sequence"):
        print(f"    - Seq {ev.sequence}: event_id={ev.event_id} | event_type={ev.event_type} | vendor_status={ev.vendor_status} -> mapped_status={ev.mapped_status} | occurred_at={ev.occurred_at} | received_at={ev.received_at}")

# Also test GET /api/orders/marketplace/MKT00025/
detail_url = "http://127.0.0.1:8000/api/orders/marketplace/MKT00025/"
detail_resp = requests.get(detail_url, headers=auth_headers)
print(f"\nGET {detail_url} -> Status: {detail_resp.status_code}")
print("Order Detail API Response Status Field:", detail_resp.json().get("data", {}).get("status"))

# ==============================================================================
# B3. Place Test Order on Product 958 and Immediately Cancel
# ==============================================================================
print("\n" + "="*50)
print("--- B3. Place Test Order (Product 958) & Cancel Endpoint ---")
print("="*50)

# Clear cart and add product 958
Cart.objects.filter(customer=customer, cart_type=CartType.MARKETPLACE).delete()
cart = Cart.objects.create(customer=customer, cart_type=CartType.MARKETPLACE, status=CartStatus.ACTIVE)

add_item_url = "http://127.0.0.1:8000/api/carts/marketplace/items/"
add_item_payload_958 = {
    "seller_product_id": 958,
    "quantity": 2
}
add_resp_958 = requests.post(add_item_url, json=add_item_payload_958, headers=auth_headers)
print(f"POST {add_item_url} (Product 958, Qty 2) -> Status: {add_resp_958.status_code}")
print("Add Item Response:", add_resp_958.json())

# Checkout Product 958
checkout_payload_958 = {
    "delivery_address": "42 Market Street, Gandhipuram, Coimbatore 641012",
    "customer_name": "Audit Customer",
    "customer_phone": "+919876543210",
    "customer_email": "audit_customer@sevo.com",
    "payment_method": "COD",
    "fulfilment_type": "DELIVERY",
    "idempotency_key": f"test_cancel_flow_{int(time.time())}"
}
chk_resp_958 = requests.post(checkout_url, json=checkout_payload_958, headers=auth_headers)
print(f"\nPOST {checkout_url} -> Status: {chk_resp_958.status_code}")
chk_data_958 = chk_resp_958.json()
print("Order Placed Response:", json.dumps(chk_data_958, indent=2))

order_num_958 = chk_data_958.get("data", {}).get("order_number") or ""
print(f"\nNew Order Placed: {order_num_958}")

# Verify DB state before cancel
order_obj_958 = MarketplaceOrder.objects.filter(order_number=order_num_958).first()
if order_obj_958:
    print(f"DB State Before Cancel: Status={order_obj_958.status}, Vendor Order ID={order_obj_958.vendor_order_id}, Vendor Order Num={order_obj_958.vendor_order_number}")

# Now cancel the order via POST /api/orders/marketplace/<order_number>/cancel/
cancel_url = f"http://127.0.0.1:8000/api/orders/marketplace/{order_num_958}/cancel/"
cancel_payload = {
    "cancellation_reason": "Live audit cancellation flow test"
}
cancel_resp = requests.post(cancel_url, json=cancel_payload, headers=auth_headers)
print(f"\nPOST {cancel_url} -> Status: {cancel_resp.status_code}")
print("Cancel Response:", json.dumps(cancel_resp.json(), indent=2))

# Verify DB state after cancel
order_obj_958.refresh_from_db()
print(f"DB State After Cancel: Status={order_obj_958.status} ({order_obj_958.get_status_display()}), Cancelled At={order_obj_958.cancelled_at}, Reason={order_obj_958.cancellation_reason}")

# ==============================================================================
# B4. Failure Injection: Set WORKFORCE_API_BASE_URL to Unreachable URL
# ==============================================================================
print("\n" + "="*50)
print("--- B4. Failure Injection (Unreachable Vendor URL) ---")
print("="*50)

# Temporarily alter settings / env variable in-process and test customer facing endpoints
orig_base_url = settings.WORKFORCE_API_BASE_URL
invalid_base_url = "http://127.0.0.1:59999/api/workforce"

print(f"Temporarily setting WORKFORCE_API_BASE_URL to {invalid_base_url}...")
settings.WORKFORCE_API_BASE_URL = invalid_base_url
os.environ["WORKFORCE_API_BASE_URL"] = invalid_base_url

# 1. Product fetch attempt under failure
from workforce_integration.marketplace_views import MarketplaceProductListView

factory = APIRequestFactory()
prod_req = factory.get("/api/marketplace/products/")
prod_view = MarketplaceProductListView.as_view()
t0 = time.time()
resp_fail_prod = prod_view(prod_req)
dur_fetch = time.time() - t0
print(f"Product Fetch with Unreachable Vendor (took {dur_fetch:.2f}s):")
print(f"  Status: {resp_fail_prod.status_code}")
print(f"  Data: {resp_fail_prod.data}")

# 2. Checkout attempt under failure
# Put product 958 in cart
Cart.objects.filter(customer=customer, cart_type=CartType.MARKETPLACE).delete()
cart = Cart.objects.create(customer=customer, cart_type=CartType.MARKETPLACE, status=CartStatus.ACTIVE)
CartItem.objects.create(
    cart=cart,
    seller_product_id=958,
    product_title="TEST-CANCEL-20260930113038",
    product_sku="SKU-CANCEL-20260930113038",
    unit_price_snapshot=40.00,
    mrp_snapshot=50.00,
    quantity=1,
    seller_id=1944,
    seller_name="Swathi Vegetables",
)

from orders.marketplace_views import MarketplaceCheckoutView
from rest_framework.test import APIRequestFactory, force_authenticate

factory = APIRequestFactory()
req = factory.post("/api/orders/marketplace/checkout/", checkout_payload_958, format='json')
force_authenticate(req, user=customer)
view = MarketplaceCheckoutView.as_view()
t0 = time.time()
resp_fail_chk = view(req)
dur_chk = time.time() - t0
print(f"\nCheckout Attempt with Unreachable Vendor (took {dur_chk:.2f}s):")
print(f"  Status: {resp_fail_chk.status_code}")
print(f"  Data: {resp_fail_chk.data}")

# Restore original URL
print(f"\nRestoring original WORKFORCE_API_BASE_URL to {orig_base_url}...")
settings.WORKFORCE_API_BASE_URL = orig_base_url
os.environ["WORKFORCE_API_BASE_URL"] = orig_base_url

# Verify normal operation resumes
res_resumed = MarketplaceIntegrationClient.fetch_product_detail(product_id=958)
print(f"Normal Operation Verification (fetch_product_detail 958): Success={res_resumed.get('success')}")
