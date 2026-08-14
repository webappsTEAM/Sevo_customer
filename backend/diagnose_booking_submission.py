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

def run_diagnostic_booking_trace():
    print("=" * 60)
    print("========== CUSTOMER BOOKING TRACE ==========")
    print("=" * 60)

    # 1. Simulate exact frontend state from BookingPage.jsx when user picks address vs when lat/lng are missing
    print("\n--- TEST SCENARIO A: Standard Customer UI Address Pick (Missing Lat/Lng in State) ---")
    frontend_payload_a = {
        "customer_name": "Diagnostic Customer A",
        "phone": "9042334343",
        "email": "customer.a@example.com",
        "service_category": "hvac",
        "issue_title": "Foam & Power Jet AC Service — Split",
        "description": "Standard cleaning request",
        "address": "222, Nallur, Tamil Nadu, 635109",
        # latitude and longitude omitted from frontend state
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "04:00 PM",
        "total_amount": "698.00",
        "payment_method": "COD",
        "cart_data": json.dumps([{"id": "hvac-std", "name": "AC General Service", "price": 698, "quantity": 1}])
    }

    print("\n[1] FRONTEND PAYLOAD (SCENARIO A):")
    for k, v in frontend_payload_a.items():
        print(f"  {k}: {v}")
    print("  latitude: MISSING/UNDEFINED")
    print("  longitude: MISSING/UNDEFINED")

    # Pass to backend serializer
    serializer_a = ServiceRequestPublicCreateSerializer(data=frontend_payload_a)
    is_valid_a = serializer_a.is_valid()
    print(f"\n[2] BACKEND REQUEST.DATA Received: {list(frontend_payload_a.keys())}")
    print(f"[3] SERIALIZER VALIDATED_DATA (is_valid={is_valid_a}):")
    print(f"  latitude in validated_data: {'latitude' in serializer_a.validated_data}")
    print(f"  longitude in validated_data: {'longitude' in serializer_a.validated_data}")

    sr_a = serializer_a.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=Decimal(frontend_payload_a["total_amount"])
    )
    print(f"\n[4] DATABASE RECORD AFTER SAVE (SCENARIO A):")
    print(f"  Request ID: {sr_a.request_id} (DB ID: {sr_a.id})")
    print(f"  Address: {sr_a.address}")
    print(f"  Latitude: {sr_a.latitude} ({'PRESENT' if sr_a.latitude else 'NULL/NONE'})")
    print(f"  Longitude: {sr_a.longitude} ({'PRESENT' if sr_a.longitude else 'NULL/NONE'})")


    print("\n" + "=" * 60)
    print("--- TEST SCENARIO B: Location Confirmed via Map/Reverse-Geocoding (Lat/Lng Present in State) ---")
    frontend_payload_b = {
        "customer_name": "Diagnostic Customer B",
        "phone": "9042334343",
        "email": "customer.b@example.com",
        "service_category": "hvac",
        "issue_title": "Foam & Power Jet AC Service — Split",
        "description": "Standard cleaning request",
        "address": "222, Nallur, Tamil Nadu, 635109",
        "latitude": "12.740100",
        "longitude": "77.825300",
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "04:00 PM",
        "total_amount": "698.00",
        "payment_method": "COD",
        "cart_data": json.dumps([{"id": "hvac-std", "name": "AC General Service", "price": 698, "quantity": 1}])
    }

    print("\n[1] FRONTEND PAYLOAD (SCENARIO B):")
    for k, v in frontend_payload_b.items():
        print(f"  {k}: {v}")

    serializer_b = ServiceRequestPublicCreateSerializer(data=frontend_payload_b)
    is_valid_b = serializer_b.is_valid()
    print(f"\n[2] BACKEND REQUEST.DATA Received: {list(frontend_payload_b.keys())}")
    print(f"[3] SERIALIZER VALIDATED_DATA (is_valid={is_valid_b}):")
    print(f"  latitude: {serializer_b.validated_data.get('latitude')}")
    print(f"  longitude: {serializer_b.validated_data.get('longitude')}")

    sr_b = serializer_b.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=Decimal(frontend_payload_b["total_amount"])
    )
    print(f"\n[4] DATABASE RECORD AFTER SAVE (SCENARIO B):")
    print(f"  Request ID: {sr_b.request_id} (DB ID: {sr_b.id})")
    print(f"  Address: {sr_b.address}")
    print(f"  Latitude: {sr_b.latitude} ({'PRESENT' if sr_b.latitude else 'NULL/NONE'})")
    print(f"  Longitude: {sr_b.longitude} ({'PRESENT' if sr_b.longitude else 'NULL/NONE'})")

    print("\n" + "=" * 60)
    print("========== DIAGNOSTIC TRACE COMPLETE ==========")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    run_diagnostic_booking_trace()
