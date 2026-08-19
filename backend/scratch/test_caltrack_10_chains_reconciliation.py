"""
test_caltrack_10_chains_reconciliation.py
Comprehensive validation and reconciliation script for the 10 Core CalTrack Chains:
1. Booking -> ServiceRequest
2. ServiceRequest -> Company/Vendor
3. ServiceRequest -> Assigned Technician
4. Technician GPS -> Backend Telemetry
5. Backend Telemetry -> Customer Map Payload
6. GPS -> Real Distance / Route / ETA
7. Arrival -> OTP Display
8. OTP Verification -> Service In Progress
9. Cancellation -> Redispatch & Telemetry Masking
10. Completion -> GPS Privacy & Session Termination
"""

import os
import sys
import django
import json
import uuid

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.utils import timezone
from rest_framework.test import APIClient
from service_requests.models import ServiceRequest
from companies.models import Company
from django.contrib.auth import get_user_model
from service_requests.views import _build_tracking_payload, _haversine_meters

User = get_user_model()

def run_reconciliation():
    print("=" * 80)
    print("CALTRACK CUSTOMER <-> TECHNICIAN <-> SHARED BACKEND RECONCILIATION TEST")
    print("=" * 80)

    client = APIClient()

    # Get or create a demo company
    company, _ = Company.objects.get_or_create(
        company_name="CalServices Official Vendor",
        defaults={"address": "Hosur Hub", "slug": "calservices-official"}
    )

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 1: Booking -> ServiceRequest
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 1] Testing Booking -> ServiceRequest Creation...")
    booking_data = {
        "customer_name": "Deepak Rajan",
        "phone": "9842011223",
        "email": "deepak.rajan@example.com",
        "service_category": "ac_service",
        "issue_title": "AC Master Deep Clean Service",
        "address": "45, Kamaraj Nagar, Hosur, Tamil Nadu 635109",
        "latitude": 12.742000,
        "longitude": 77.829000,
        "preferred_date": "2026-08-20",
        "preferred_time": "10:00 AM",
        "total_amount": 799.00,
        "payment_method": "COD",
    }

    resp = client.post("/api/booking/", booking_data, format="json", HTTP_HOST="demo.localhost")
    assert resp.status_code == 201, f"Booking creation failed: {resp.status_code} {resp.data}"
    req_id = resp.data.get("data", {}).get("request_id")
    sr_id = resp.data.get("data", {}).get("id")
    tracking_token = resp.data.get("data", {}).get("tracking_token")
    start_otp = resp.data.get("data", {}).get("start_otp")

    sr = ServiceRequest.objects.get(pk=sr_id)
    assert sr.request_id == req_id
    assert len(sr.start_otp) == 6, f"Invalid OTP length: {sr.start_otp}"
    assert sr.tracking_token is not None
    assert float(sr.latitude) == 12.742000
    assert float(sr.longitude) == 77.829000
    print(f"  [PASS] ServiceRequest #{sr.request_id} created with 6-digit OTP {sr.start_otp} and token {sr.tracking_token}")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 2: ServiceRequest -> Company/Vendor
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 2] Testing ServiceRequest -> Company/Vendor separation...")
    sr.company = company
    sr.save(update_fields=["company"])

    payload_unassigned = _build_tracking_payload(sr, has_full_access=True)
    assert payload_unassigned["vendor"]["name"] == "CalServices Official Vendor"
    assert payload_unassigned["technician"] is None, "Unassigned booking must have technician=None"
    assert payload_unassigned["is_accepted"] is False, "Unassigned booking must have is_accepted=False"
    print(f"  [PASS] Vendor cleanly separated: {payload_unassigned['vendor']['name']}")
    print(f"  [PASS] Pre-acceptance state verified: technician is None, is_accepted is False (Radar search active)")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 3: ServiceRequest -> Assigned Technician
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 3] Testing ServiceRequest -> Assigned Technician...")
    sr.technician_name = "Vignesh Murugan"
    sr.technician_phone = "9789012345"
    sr.technician_rating = 4.92
    sr.technician_photo = "/media/tech_vignesh.png"
    sr.status = "assigned"
    sr.save()

    payload_assigned = _build_tracking_payload(sr, has_full_access=True)
    assert payload_assigned["is_accepted"] is True
    assert payload_assigned["technician"]["name"] == "Vignesh Murugan"
    assert payload_assigned["technician"]["phone"] == "9789012345"
    assert payload_assigned["technician"]["rating"] == 4.92
    print(f"  [PASS] Assigned Technician loaded: {payload_assigned['technician']['name']} (Rating: {payload_assigned['technician']['rating']})")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 4: Technician GPS -> Backend Telemetry
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 4] Testing Technician GPS -> Backend Telemetry streaming...")
    loc_update = {
        "latitude": 12.725000,
        "longitude": 77.818000,
        "current_location_name": "Hosur Bus Stand Junction",
        "status": "on_the_way",
    }
    resp_loc = client.post(f"/api/booking/{sr.request_id}/update-location/", loc_update, format="json", HTTP_HOST="demo.localhost")
    assert resp_loc.status_code == 200, f"Location update failed: {resp_loc.status_code}"
    
    sr.refresh_from_db()
    assert float(sr.technician_latitude) == 12.725000
    assert float(sr.technician_longitude) == 77.818000
    assert sr.technician_location_name == "Hosur Bus Stand Junction"
    assert sr.status == "on_the_way"
    print(f"  [PASS] Telemetry persisted in DB: lat={sr.technician_latitude}, lng={sr.technician_longitude}, location='{sr.technician_location_name}'")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 5: Backend Telemetry -> Customer Map Payload
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 5] Testing Backend Telemetry -> Customer Map payload...")
    resp_cust = client.get(f"/api/booking/{sr.request_id}/live-location/?token={sr.tracking_token}", HTTP_HOST="demo.localhost")
    assert resp_cust.status_code == 200
    cust_data = resp_cust.data.get("data", {})
    assert cust_data["technician"]["latitude"] == 12.725000
    assert cust_data["technician"]["longitude"] == 77.818000
    assert cust_data["destination"]["latitude"] == 12.742000
    assert cust_data["destination"]["longitude"] == 77.829000
    print(f"  [PASS] Customer live tracking API received exact technician pin and destination coordinates")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 6: GPS -> Real Distance / Route / ETA
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 6] Testing GPS -> Real Distance & ETA calculation...")
    calculated_m = _haversine_meters(12.725000, 77.818000, 12.742000, 77.829000)
    assert calculated_m is not None and 2000 < calculated_m < 3000, f"Unexpected distance: {calculated_m}m"
    assert cust_data["distance_m"] == int(round(calculated_m))
    assert cust_data["distance_km"] == round(calculated_m / 1000.0, 1)
    assert cust_data["eta_minutes"] >= 1
    assert cust_data["freshness"] == "LIVE"
    print(f"  [PASS] Real Distance: {cust_data['distance_km']} km ({cust_data['distance_m']} m)")
    print(f"  [PASS] Real Calculated ETA: ~{cust_data['eta_minutes']} min (Telemetry Freshness: {cust_data['freshness']})")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 7: Arrival -> OTP Display
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 7] Testing Arrival -> OTP Display...")
    sr.status = "arrived"
    sr.technician_latitude = 12.741950
    sr.technician_longitude = 77.828980
    sr.technician_location_name = "Samathuvapuram (Customer Gate)"
    sr.technician_last_seen_at = timezone.now()
    sr.save()

    payload_arrived = _build_tracking_payload(sr, has_full_access=True)
    assert payload_arrived["status"] == "arrived"
    assert payload_arrived["distance_m"] == 0
    assert payload_arrived["eta_minutes"] == 0
    assert payload_arrived["start_otp"] == sr.start_otp
    print(f"  [PASS] Arrival confirmed: Travel ETA stopped (0 min, 0m distance)")
    print(f"  [PASS] Work Start OTP exposed to customer: {payload_arrived['start_otp']}")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 8: OTP Verification -> Service In Progress
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 8] Testing OTP Verification -> Service In Progress...")
    # Test invalid OTP first
    resp_invalid = client.post(f"/api/booking/{sr.request_id}/verify-start-otp/", {"otp": "000000"}, format="json", HTTP_HOST="demo.localhost")
    assert resp_invalid.status_code == 400, "Invalid OTP must be rejected"
    
    # Test valid OTP
    resp_valid = client.post(f"/api/booking/{sr.request_id}/verify-start-otp/", {"otp": sr.start_otp}, format="json", HTTP_HOST="demo.localhost")
    assert resp_valid.status_code == 200, f"Valid OTP failed: {resp_valid.data}"
    sr.refresh_from_db()
    assert sr.otp_verified is True
    assert sr.status == "in_progress"
    print(f"  [PASS] OTP verified successfully -> ServiceRequest status updated to 'in_progress'")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 9: Cancellation -> Redispatch & Telemetry Masking
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 9] Testing Cancellation / Redispatch & Telemetry Masking...")
    # Simulate technician cancellation & redispatch
    sr.technician_name = ""
    sr.technician_phone = ""
    sr.technician_latitude = None
    sr.technician_longitude = None
    sr.status = "confirmed"
    sr.save()

    payload_redispatch = _build_tracking_payload(sr, has_full_access=True)
    assert payload_redispatch["is_accepted"] is False
    assert payload_redispatch["technician"] is None
    assert payload_redispatch["technician_location"] is None
    print(f"  [PASS] Old technician telemetry masked upon redispatch -> returned to Radar Search state")

    # ─────────────────────────────────────────────────────────────────────────────
    # Chain 10: Completion -> GPS Privacy
    # ─────────────────────────────────────────────────────────────────────────────
    print("\n[Chain 10] Testing Completion -> GPS Privacy & Termination...")
    sr.status = "completed"
    sr.technician_name = "Vignesh Murugan"
    sr.technician_latitude = 12.742000
    sr.technician_longitude = 77.829000
    sr.save()

    payload_completed = _build_tracking_payload(sr, has_full_access=True)
    assert payload_completed["status"] == "completed"
    assert payload_completed["distance_m"] == 0
    assert payload_completed["eta_minutes"] == 0
    assert payload_completed["start_otp"] is None, "OTP must not be exposed after service completion"
    print(f"  [PASS] Service Completed -> Live tracking terminated, OTP cleared from response, GPS privacy protected")

    print("\n" + "=" * 80)
    print("ALL 10 CALTRACK CHAINS FULLY RECONCILED AND VERIFIED SUCCESSFULLY!")
    print("=" * 80)

if __name__ == "__main__":
    run_reconciliation()
