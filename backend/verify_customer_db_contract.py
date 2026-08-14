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

def verify_customer_database_contract():
    print("=" * 80)
    print("CUSTOMER APPLICATION -> SUPABASE POSTGRESQL CONTRACT VERIFICATION")
    print("=" * 80)

    # 1. Multi-item cart with different quantities, prices, and package details
    customer_cart_items = [
        {
            "id": "pkg_ac_repair_01",
            "name": "AC Repair — Split/Window",
            "price": 599,
            "quantity": 2,
            "category": "hvac",
            "description": "Comprehensive diagnostic & repair for split/window AC."
        },
        {
            "id": "pkg_plumbing_sink_02",
            "name": "Sink, Tap, Valve & Pipe Repair",
            "price": 499,
            "quantity": 3,
            "category": "plumbing",
            "description": "Fixing leaks, tap replacements, and valve servicing."
        },
        {
            "id": "pkg_ac_gas_03",
            "name": "Gas Leak Fix & Refill",
            "price": 1799,
            "quantity": 1,
            "category": "hvac",
            "description": "Pressure test, leak sealing, and gas recharging."
        }
    ]

    total_amount = sum(Decimal(str(item["price"])) * item["quantity"] for item in customer_cart_items)

    # Construct issue_title (primary item + extra count)
    first_item_name = customer_cart_items[0]["name"]
    extra_count = len(customer_cart_items) - 1
    issue_title = f"{first_item_name} (+{extra_count} other items)"

    # Payload matching Customer Frontend → Customer Backend POST /api/booking/
    customer_payload = {
        "customer_name": "Gokul Customer",
        "phone": "9042334343",
        "email": "gokul.customer@calservices.com",
        "service_category": "hvac",
        "issue_title": issue_title,
        "description": "Customer requested multi-service booking for home maintenance.",
        "address": "05, Bagalur Rd, KCC Nagar, Nallur, Tamil Nadu 635109, India",
        "latitude": "12.738910",
        "longitude": "77.824150",
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "06:00 PM",
        "total_amount": str(total_amount),
        "payment_method": "COD",
        "cart_data": json.dumps(customer_cart_items)
    }

    # Pass through Customer DRF Serializer (same as POST /api/booking/)
    serializer = ServiceRequestPublicCreateSerializer(data=customer_payload)
    if not serializer.is_valid():
        print("\n❌ CUSTOMER BACKEND SERIALIZER VALIDATION FAILED:")
        print(serializer.errors)
        print("\nRESULT: FAIL")
        sys.exit(1)

    # Save record into shared PostgreSQL database
    saved_request = serializer.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=total_amount
    )

    # Re-fetch fresh record directly from PostgreSQL database by primary key
    db_record = ServiceRequest.objects.get(id=saved_request.id)

    # Parse stored cart_data JSON from PostgreSQL
    stored_cart = db_record.cart_data
    if isinstance(stored_cart, str):
        stored_cart = json.loads(stored_cart)

    # Verification checks
    checks = {
        "Request ID present": bool(db_record.request_id),
        "Customer Name matches": db_record.customer_name == "Gokul Customer",
        "Phone matches": db_record.phone == "9042334343",
        "Email matches": db_record.email == "gokul.customer@calservices.com",
        "Category matches": db_record.service_category == "hvac",
        "Issue Title concise & <= 300 chars": len(db_record.issue_title) <= 300 and db_record.issue_title == issue_title,
        "Address saved": db_record.address == customer_payload["address"],
        "Latitude non-null & accurate": str(db_record.latitude) == "12.738910",
        "Longitude non-null & accurate": str(db_record.longitude) == "77.824150",
        "Preferred Date saved": str(db_record.preferred_date) == customer_payload["preferred_date"],
        "Preferred Time saved": db_record.preferred_time == "06:00 PM",
        "Payment Method saved": db_record.payment_method == "COD",
        "Payment Status saved": db_record.payment_status == "pending",
        "Total Amount matches": db_record.total_amount == total_amount,
        "Cart item count preserved": len(stored_cart) == len(customer_cart_items),
        "Item quantities preserved": stored_cart[0]["quantity"] == 2 and stored_cart[1]["quantity"] == 3,
        "Item prices preserved": stored_cart[0]["price"] == 599 and stored_cart[1]["price"] == 499,
    }

    all_passed = all(checks.values())

    # Format output report
    print("\nCUSTOMER BOOKING DATABASE VERIFICATION\n")
    print(f"Request ID:      {db_record.request_id} (DB Primary Key: {db_record.id})")
    print(f"Customer:        {db_record.customer_name} (Phone: {db_record.phone}, Email: {db_record.email})")
    print(f"Service:         {db_record.service_category}")
    print(f"Issue Title:     {db_record.issue_title} (Length: {len(db_record.issue_title)} chars)")
    print(f"Cart Items:      {len(stored_cart)} distinct items preserved (Total Qty: {sum(i['quantity'] for i in stored_cart)})")
    print(f"Address:         {db_record.address}")
    print(f"Latitude:        {db_record.latitude}")
    print(f"Longitude:       {db_record.longitude}")
    print(f"Preferred Date:  {db_record.preferred_date}")
    print(f"Preferred Time:  {db_record.preferred_time}")
    print(f"Payment Method:  {db_record.payment_method}")
    print(f"Payment Status:  {db_record.payment_status}")
    print(f"Total Amount:    INR {db_record.total_amount}")
    print(f"Status:          {db_record.status}")
    print(f"Created At:      {db_record.created_at}")

    print("\nCART DETAILS PERSISTED IN POSTGRESQL:")
    for idx, item in enumerate(stored_cart, 1):
        print(f"  [{idx}] {item['name']} | Qty: {item['quantity']} | Unit Price: INR {item['price']} | Subtotal: INR {item['price'] * item['quantity']}")

    print("\nVERIFICATION CHECKS SUMMARY:")
    for check_name, status in checks.items():
        symbol = "[PASS]" if status else "[FAIL]"
        print(f"  {symbol} {check_name}")

    print("\n" + "=" * 80)
    if all_passed:
        print("RESULT: PASS")
    else:
        print("RESULT: FAIL")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    verify_customer_database_contract()
