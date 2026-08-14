import os
import sys
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from service_requests.models import ServiceRequest
from service_requests.serializers import ServiceRequestPublicCreateSerializer, ServiceRequestListSerializer

User = get_user_model()

def test_customer_booking_database_persistence():
    print("=" * 60)
    print("TESTING CUSTOMER BOOKING POSTGRESQL PERSISTENCE")
    print("=" * 60)

    # Simulate Customer submitting checkout payload from Frontend
    payload = {
        "customer_name": "Gokul Customer",
        "phone": "9042334343",
        "email": "gokul.customer@example.com",
        "service_category": "hvac",
        "issue_title": "AC General Service & Cleaning",
        "description": "Standard foam jet cleaning of indoor cooling coils.",
        "address": "222, Nallur, Tamil Nadu, 635109",
        "latitude": "12.740100",
        "longitude": "77.825300",
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "04:00 PM",
        "total_amount": "599.00",
        "payment_method": "COD",
        "cart_data": [
            {
                "id": "hvac-std",
                "name": "AC General Service",
                "price": 599,
                "quantity": 1
            }
        ]
    }

    # Validate with DRF Serializer (same as BookingCreateView)
    serializer = ServiceRequestPublicCreateSerializer(data=payload)
    assert serializer.is_valid(), f"Serializer errors: {serializer.errors}"
    
    # Save booking to PostgreSQL database
    sr = serializer.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=Decimal(payload["total_amount"])
    )
    print(f"\n[CONFIRM BOOKING SUCCESS] Record saved in PostgreSQL table 'service_requests_servicerequest':")
    print(f"  - Request ID: {sr.request_id} (ID: {sr.id})")
    print(f"  - Customer Name: {sr.customer_name}")
    print(f"  - Phone: {sr.phone}")
    print(f"  - Email: {sr.email}")
    print(f"  - Service Category: {sr.service_category}")
    print(f"  - Selected Package: {sr.issue_title}")
    print(f"  - Address: {sr.address}")
    print(f"  - Lat/Lng: {sr.latitude}, {sr.longitude}")
    print(f"  - Preferred Date & Time: {sr.preferred_date} {sr.preferred_time}")
    print(f"  - Amount: Rs.{sr.total_amount}")
    print(f"  - Payment Method: {sr.payment_method} ({sr.payment_status})")
    print(f"  - Status: {sr.status}")
    print(f"  - Created At: {sr.created_at}")

    # Verify Customer My Bookings query from PostgreSQL
    my_bookings = ServiceRequest.objects.filter(phone="9042334343").order_by("-id")
    assert my_bookings.filter(id=sr.id).exists(), "Saved booking not found in PostgreSQL query!"
    print(f"\n[CUSTOMER MY BOOKINGS QUERY SUCCESS] Retrieved {my_bookings.count()} booking(s) from PostgreSQL database for customer phone 9042334343.")

    print("=" * 60)
    print("ALL CUSTOMER PERSISTENCE CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_customer_booking_database_persistence()
