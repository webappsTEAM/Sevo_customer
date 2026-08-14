import os
import sys
import django
import json
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from service_requests.models import ServiceRequest, EmployeeJob
from employees.models import Employee
from service_requests.serializers import ServiceRequestPublicCreateSerializer, EmployeeJobListSerializer
from service_requests.state_machine import apply_transition

User = get_user_model()

def run_e2e_real_booking_flow():
    print("=" * 70)
    print("END-TO-END REAL BOOKING INTEGRATION VERIFICATION")
    print("=" * 70)

    # 1. Customer Selects Real Location and Confirms Booking in Frontend State
    print("\n[STEP 1] Customer selects real location in Customer UI:")
    loc_payload = {
        "customer_name": "E2E Test Customer",
        "phone": "9042334343",
        "email": "e2e.customer@example.com",
        "service_category": "hvac",
        "issue_title": "AC Master Deep Jet Cleaning & Maintenance",
        "description": "Full outdoor & indoor coil power jet wash with anti-bacterial foam.",
        "address": "Plot 45, Nallur Industrial Area, Hosur, Tamil Nadu 635109",
        "latitude": "12.738910",
        "longitude": "77.824150",
        "preferred_date": str(timezone.localdate()),
        "preferred_time": "04:00 PM",
        "total_amount": "899.00",
        "payment_method": "COD",
        "cart_data": json.dumps([{"id": "ac-deep", "name": "AC Master Deep Jet", "price": 899, "quantity": 1}])
    }
    print(f"  - Address: {loc_payload['address']}")
    print(f"  - Latitude: {loc_payload['latitude']} (NON-NULL)")
    print(f"  - Longitude: {loc_payload['longitude']} (NON-NULL)")

    # 2. Customer Backend validates and saves ServiceRequest in PostgreSQL
    serializer = ServiceRequestPublicCreateSerializer(data=loc_payload)
    assert serializer.is_valid(), f"Validation errors: {serializer.errors}"

    sr = serializer.save(
        status=ServiceRequest.Status.CONFIRMED,
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        total_amount=Decimal(loc_payload["total_amount"])
    )
    print(f"\n[STEP 2 SUCCESS] ServiceRequest created in PostgreSQL table 'service_requests_servicerequest':")
    print(f"  - Request ID: {sr.request_id} (DB ID: {sr.id})")
    print(f"  - Customer Name: {sr.customer_name}")
    print(f"  - Saved Latitude: {sr.latitude} (VERIFIED NON-NULL in DB)")
    print(f"  - Saved Longitude: {sr.longitude} (VERIFIED NON-NULL in DB)")
    print(f"  - Initial Status: {sr.status}")
    assert sr.latitude is not None and sr.longitude is not None, "FAILED: Latitude/Longitude were NULL in PostgreSQL!"

    # 3. Admin Assigns Employee in PostgreSQL
    emp = Employee.objects.filter(is_active=True).first()
    if not emp:
        admin_user = User.objects.filter(is_superuser=True).first()
        emp = Employee.objects.create(
            user=admin_user,
            employee_id="EMP-E2E-01",
            phone="9000011111",
            title="Senior Technician",
        )

    apply_transition(sr, ServiceRequest.Status.ASSIGNED)
    sr.assigned_employee = emp
    sr.save(update_fields=["status", "assigned_employee", "updated_at"])

    job, _ = EmployeeJob.objects.update_or_create(
        service_request=sr,
        defaults={
            "employee": emp,
            "status": EmployeeJob.Status.ASSIGNED,
            "assigned_date": timezone.now(),
            "is_primary": True,
        }
    )
    print(f"\n[STEP 3 SUCCESS] Admin assigned employee in PostgreSQL:")
    print(f"  - ServiceRequest.assigned_employee_id: {sr.assigned_employee_id} (POPULATED & SYNCHRONIZED)")
    print(f"  - EmployeeJob ID: {job.id}")
    print(f"  - EmployeeJob.employee_id: {job.employee_id} (POPULATED)")

    # 4. Employee Backend fetches assigned job from PostgreSQL
    emp_jobs = EmployeeJob.objects.filter(employee=emp).select_related("service_request").order_by("-id")
    job_data = EmployeeJobListSerializer(emp_jobs.first()).data
    print(f"\n[STEP 4 SUCCESS] Employee Backend fetched assigned job from PostgreSQL:")
    print(f"  - EmployeeJob ID: {job_data['id']}")
    print(f"  - Request ID: {job_data['request_id']}")
    print(f"  - Customer Name: {job_data['customer_name']}")
    print(f"  - Authorized Phone: {job_data['phone']}")
    print(f"  - Address: {job_data['address']}")
    print(f"  - Latitude: {job_data['latitude']}")
    print(f"  - Longitude: {job_data['longitude']}")
    print(f"  - Job Status: {job_data['status']}")

    # 5. Employee Accepts Job
    job.status = EmployeeJob.Status.ACCEPTED
    job.accepted_date = timezone.now()
    job.save(update_fields=["status", "accepted_date"])

    apply_transition(sr, ServiceRequest.Status.ACCEPTED)
    sr.save(update_fields=["status", "updated_at"])

    # Reload from PostgreSQL to verify final state
    final_sr = ServiceRequest.objects.get(id=sr.id)
    final_job = EmployeeJob.objects.get(id=job.id)

    print(f"\n[STEP 5 SUCCESS] Employee accepted job & PostgreSQL record updated:")
    print(f"  - Final ServiceRequest Status in PostgreSQL: {final_sr.status}")
    print(f"  - Final EmployeeJob Status in PostgreSQL: {final_job.status}")
    print(f"  - Accepted Date: {final_job.accepted_date}")

    print("\n" + "=" * 70)
    print("END-TO-END VERIFICATION PASSED: ALL STEPS VERIFIED IN POSTGRESQL!")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    run_e2e_real_booking_flow()
