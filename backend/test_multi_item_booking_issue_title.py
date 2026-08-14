import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.utils import timezone
from service_requests.models import ServiceRequest
from service_requests.serializers import ServiceRequestPublicCreateSerializer

def test_multi_item_booking_issue_title():
    print("=" * 70)
    print("MULTI-ITEM BOOKING ISSUE_TITLE VALIDATION & CART PRESERVATION TEST")
    print("=" * 70)

    # Multi-item cart with service containing commas and multiple quantities
    selected_cart_items = [
        {"id": "plumb-sink-tap", "name": "Sink, Tap, Valve & Pipe Repair", "price": 499, "quantity": 3},
        {"id": "ac-repair-split", "name": "AC Repair — Split/Window", "price": 599, "quantity": 2},
        {"id": "ac-less-cooling", "name": "Less/No Cooling", "price": 499, "quantity": 1},
        {"id": "ac-power-issue", "name": "Power Issue", "price": 499, "quantity": 1},
        {"id": "ac-water-leakage", "name": "Water Leakage", "price": 399, "quantity": 1},
        {"id": "ac-noise-smell", "name": "Unwanted Noise/Smell", "price": 399, "quantity": 1},
        {"id": "ac-foam-split", "name": "Foam & Power Jet AC Service — Split", "price": 599, "quantity": 1},
        {"id": "ac-foam-window", "name": "Foam & Power Jet AC Service — Window", "price": 499, "quantity": 1},
        {"id": "ac-power-jet-split", "name": "Power Jet AC Service — Split", "price": 499, "quantity": 1},
        {"id": "ac-power-jet-window", "name": "Power Jet AC Service — Window", "price": 399, "quantity": 1},
        {"id": "ac-anti-rust", "name": "Anti-Rust Deep Clean AC Service", "price": 799, "quantity": 1},
        {"id": "ac-gas-leak", "name": "Gas Leak Fix & Refill", "price": 1799, "quantity": 1},
        {"id": "ac-gas-charge", "name": "Gas Charging", "price": 1499, "quantity": 1},
        {"id": "ac-valve-replace", "name": "Service Valve Replacement", "price": 399, "quantity": 1},
    ]

    total_amount = sum(item["price"] * item["quantity"] for item in selected_cart_items)

    first_item_name = selected_cart_items[0]["name"]
    extra_count = len(selected_cart_items) - 1
    issue_title = f"{first_item_name} (+{extra_count} other items)"

    payload = {
        "customer_name": "Gokul Customer",
        "phone": "9042334343",
        "email": "gokul@example.com",
        "service_category": "hvac",
        "issue_title": issue_title,
        "description": "Multi-item booking with commas in service name.",
        "address": "05, Bagalur Rd, KCC Nagar, Nallur, Tamil Nadu 635109, India",
        "latitude": "12.738910",
        "longitude": "77.824150",
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "06:00 PM",
        "total_amount": str(total_amount),
        "payment_method": "COD",
        "cart_data": json.dumps(selected_cart_items)
    }

    print("\n[BEFORE SUBMISSION LOGS]")
    print(f"issue_title: {payload['issue_title']}")
    print(f"issue_title length: {len(payload['issue_title'])}")
    print(f"cart_data item count: {len(selected_cart_items)}")

    # Validate against DRF serializer
    serializer = ServiceRequestPublicCreateSerializer(data=payload)
    is_valid = serializer.is_valid()
    if not is_valid:
        print("\n❌ SERIALIZER VALIDATION FAILED:")
        print(serializer.errors)
        sys.exit(1)

    # Save to PostgreSQL
    sr = serializer.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=Decimal(payload["total_amount"])
    )

    print("\n[POSTGRESQL RECORD SAVED]")
    print(f"  - Request ID: {sr.request_id} (DB ID: {sr.id})")
    print(f"  - Saved issue_title: '{sr.issue_title}'")
    print(f"  - issue_title length: {len(sr.issue_title)} (<= 300)")
    print(f"  - Latitude: {sr.latitude}")
    print(f"  - Longitude: {sr.longitude}")

    # Parse saved cart_data from PostgreSQL
    saved_cart = sr.cart_data
    if isinstance(saved_cart, str):
        saved_cart = json.loads(saved_cart)

    print(f"  - Saved cart_data item count: {len(saved_cart)} items (100% PRESERVED)")
    for item in saved_cart:
        print(f"     * {item['name']} | qty: {item['quantity']} | price: {item['price']}")

    # Verifications
    assert len(sr.issue_title) <= 300, f"FAILED: issue_title exceeds 300 characters ({len(sr.issue_title)})"
    assert "," in sr.issue_title, "FAILED: Comma in service title was incorrectly stripped/replaced"
    assert len(saved_cart) == len(selected_cart_items), f"FAILED: cart_data item count mismatch ({len(saved_cart)} vs {len(selected_cart_items)})"
    assert saved_cart[0]["quantity"] == 3, f"FAILED: Item quantity not preserved ({saved_cart[0]['quantity']})"
    assert str(sr.latitude) == "12.738910", f"FAILED: Latitude not preserved ({sr.latitude})"
    assert str(sr.longitude) == "77.824150", f"FAILED: Longitude not preserved ({sr.longitude})"

    print("\n" + "=" * 70)
    print("ALL VERIFICATIONS PASSED SUCCESSFULLY IN POSTGRESQL!")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    test_multi_item_booking_issue_title()
