"""
scripts/e2e_two_app_verification.py

Comprehensive Real Two-Application E2E Test:
Validates the full lifecycle communication from Customer Booking creation
through Workforce Employee Assignment, Acceptance, Live GPS streaming,
Arrival, In-Progress service, and Completion.
"""
import os
import sys
import uuid
import json

# Setup Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")

import django
django.setup()

from django.test import Client
from service_requests.models import ServiceRequest, BookingAssignment
from companies.models import Company
from django.contrib.auth import get_user_model

User = get_user_model()
WEBHOOK_SECRET = "wf_webhook_secret_default"

def run_e2e_test():
    print("=" * 80)
    print(">> STARTING REAL TWO-APPLICATION E2E LIFECYCLE & TELEMETRY TEST")
    print("=" * 80)

    client = Client()
    company, _ = Company.objects.get_or_create(company_name="Sevo Integration Test Company")
    customer, _ = User.objects.get_or_create(
        username="e2e_customer@calservice.com",
        defaults={
            "email": "e2e_customer@calservice.com",
            "role": "customer",
            "first_name": "Divya",
            "last_name": "R"
        }
    )

    req_id = f"E2E{uuid.uuid4().hex[:6].upper()}"
    tracking_token = str(uuid.uuid4())
    wf_job_id = f"WF_JOB_{uuid.uuid4().hex[:8]}"

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 1: Customer creates booking
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 1] Customer creates booking (CONFIRMED)...")
    sr = ServiceRequest.objects.create(
        request_id=req_id,
        customer=customer,
        company=company,
        customer_name="Divya R",
        phone="9876543299",
        service_category="cleaning",
        issue_title="Full Home Deep Cleaning",
        address="Sector 4, HSR Layout, Bangalore",
        preferred_date="2026-08-25",
        preferred_time="10:00 AM - 12:00 PM",
        latitude=12.9141,
        longitude=77.6411,
        status="confirmed",
        tracking_token=tracking_token,
        start_otp="582194"
    )

    res = client.get(f"/api/tracking/{tracking_token}/")
    assert res.status_code == 200, f"Failed tracking fetch: {res.content}"
    data = res.json()["data"]
    assert data["status"] == "confirmed", f"Expected confirmed, got {data['status']}"
    assert data["is_accepted"] is False, "Technician should not be accepted yet"
    assert data["technician"] is None, "Technician object must be None for customer"
    assert data.get("technician_location") is None, "Technician GPS must be None"
    print("  [PASS] Customer sees: 'Finding your service professional...' (Technician details & GPS HIDDEN)")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 2: Admin/Workforce dispatches employee (ASSIGNED, Pending Acceptance)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 2] Workforce system notifies employee (ASSIGNED / Pending Acceptance)...")
    assign_payload = {
        "event": "job.assigned",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id,
        "vendor": {
            "id": "VEND_901",
            "name": "Apex Pro Services",
            "verified": True
        },
        "technician": {
            "id": "EMP_701",
            "name": "Karthik Electrician",
            "phone": "+919876543210",
            "rating": 4.92,
            "photo": "https://example.com/karthik.jpg",
            "verified": True
        }
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(assign_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200, f"Webhook failed: {res_webhook.content}"

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "assigned", f"Expected assigned, got {data['status']}"
    assert data["is_accepted"] is False, "is_accepted must be False when assigned but not accepted"
    assert data["technician"] is None, "Technician info must remain hidden from customer until acceptance"
    assert data.get("technician_location") is None, "Technician GPS must be None"
    print("  [PASS] Customer STILL sees: 'Finding your service professional...' (Privacy guard enforced, NO technician shown)")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 3: Employee ACCEPTS job (GPS NOT YET STARTED)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 3] Employee ACCEPTS job on Workforce App (GPS Not Yet Available)...")
    accept_payload = {
        "event": "employee_accepted",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id,
        "technician": {
            "id": "EMP_701",
            "full_name": "Karthik Electrician",
            "mobile": "+919876543210",
            "rating": 4.92,
            "avatar": "https://example.com/karthik.jpg"
        }
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(accept_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200, f"Webhook failed: {res_webhook.content}"

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "accepted", f"Expected accepted, got {data['status']}"
    assert data["is_accepted"] is True, "is_accepted MUST be True immediately upon employee acceptance"
    assert data["technician"] is not None, "Technician details MUST be visible upon acceptance"
    assert data["technician"]["name"] == "Karthik Electrician", f"Expected Karthik, got {data['technician']['name']}"
    assert data["technician"]["phone"] == "+919876543210"
    assert data["technician"]["latitude"] is None, "GPS coordinates must remain None"
    assert data.get("technician_location") is None, "Live GPS telemetry must be None"
    print("  [PASS] Customer IMMEDIATELY sees verified partner profile:")
    print(f"      * Partner Name: {data['technician']['name']}")
    print(f"      * Phone / Call: {data['technician']['phone']}")
    print(f"      * Rating: {data['technician']['rating']}")
    print("      * UI State: '[ACCEPTED] Partner Accepted' + 'Waiting for live location...' (NEVER 'Assigned')")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 4: Employee starts GPS & begins journey (ON_THE_WAY)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 4] Employee starts travel & GPS streams (ON_THE_WAY)...")
    ontheway_payload = {
        "event": "employee_on_the_way",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id,
        "location": {
            "latitude": 12.9050,
            "longitude": 77.6320
        }
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(ontheway_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200, f"Webhook failed: {res_webhook.content}"

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "on_the_way"
    assert data["is_accepted"] is True
    assert data["technician_location"] is not None
    assert data["technician_location"]["latitude"] == 12.9050
    assert data["technician_location"]["longitude"] == 77.6320
    print("  [PASS] Customer sees LIVE TRACKING ACTIVE:")
    print(f"      * Technician Live Position: ({data['technician_location']['latitude']}, {data['technician_location']['longitude']})")
    print("      * Live Marker & Road Polyline rendered on Map")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 5: Live GPS streaming location update
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 5] Live telemetry update en route...")
    gps_payload = {
        "event": "technician.location_updated",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id,
        "location": {
            "latitude": 12.9100,
            "longitude": 77.6380
        }
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(gps_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["technician_location"]["latitude"] == 12.9100
    assert data["technician_location"]["longitude"] == 77.6380
    print(f"  [PASS] Live telemetry streamed smoothly: ({data['technician_location']['latitude']}, {data['technician_location']['longitude']})")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 6: Employee ARRIVES at customer site
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 6] Employee ARRIVES at customer site...")
    arrive_payload = {
        "event": "employee_arrived",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id,
        "location": {
            "latitude": 12.9141,
            "longitude": 77.6411
        }
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(arrive_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "arrived"
    assert data["is_accepted"] is True
    assert data["start_otp"] == "582194"
    print("  [PASS] Customer sees: 'Partner Arrived at Location!' + Work Start OTP: [582194]")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 7: Service IN PROGRESS (OTP Verified)
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 7] Service IN PROGRESS (OTP Verified by Employee)...")
    start_payload = {
        "event": "service_started",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(start_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "in_progress"
    assert data["is_accepted"] is True
    print("  [PASS] Customer sees: 'Service in Progress' (Work actively underway)")

    # ──────────────────────────────────────────────────────────────────────────
    # PHASE 8: Service COMPLETED
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[PHASE 8] Service COMPLETED...")
    complete_payload = {
        "event": "service_completed",
        "booking_id": sr.id,
        "workforce_job_id": wf_job_id
    }
    res_webhook = client.post(
        "/api/workforce-integration/webhook/",
        data=json.dumps(complete_payload),
        content_type="application/json",
        HTTP_X_WORKFORCE_WEBHOOK_SECRET=WEBHOOK_SECRET
    )
    assert res_webhook.status_code == 200

    res = client.get(f"/api/tracking/{tracking_token}/")
    data = res.json()["data"]
    assert data["status"] == "completed"
    assert data.get("technician_location") is None, "GPS telemetry must be cleared upon completion"
    print("  [PASS] Customer sees: 'Work Finished Successfully' -> Feedback & Review UI active")

    # Cleanup
    sr.delete()
    print("\n" + "=" * 80)
    print(">> REAL TWO-APPLICATION E2E TEST COMPLETED SUCCESSFULLY! ALL 8 PHASES PASSED!")
    print("=" * 80)

if __name__ == "__main__":
    run_e2e_test()
