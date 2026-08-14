import os
import sys
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from service_requests.models import ServiceRequest, EmployeeJob, JobCompletionProof
from employees.models import Employee
from live_locations.models import EmployeeLocation
from service_requests.state_machine import apply_transition

User = get_user_model()

def test_full_database_integration():
    print("=" * 60)
    print("STARTING COMPLETE DATABASE-BASED INTEGRATION VERIFICATION")
    print("=" * 60)

    # 1. Customer Booking Creation
    sr = ServiceRequest.objects.create(
        customer_name="Test Customer Gokul",
        phone="9042334343",
        email="gokul.test@example.com",
        service_category="hvac",
        issue_title="Foam & Power Jet AC Service — Split",
        description="Deep foam jet cleaning of indoor cooling coils & outdoor unit.",
        address="222, Nallur, Tamil Nadu, 635109",
        latitude=Decimal("12.740100"),
        longitude=Decimal("77.825300"),
        preferred_date=timezone.localdate(),
        preferred_time="04:00 PM",
        total_amount=Decimal("698.00"),
        payment_method="COD",
        payment_status=ServiceRequest.PaymentStatus.PENDING,
        status=ServiceRequest.Status.CONFIRMED,
    )
    print(f"\n[STEP 1 SUCCESS] Customer Booking created in PostgreSQL:")
    print(f"  - Request ID: {sr.request_id} (DB ID: {sr.id})")
    print(f"  - Service Address: {sr.address}")
    print(f"  - Location Coordinates (Lat/Lng): {sr.latitude}, {sr.longitude}")
    print(f"  - Amount: Rs.{sr.total_amount}")
    print(f"  - Initial Status: {sr.status}")

    # 2. Employee Assignment in PostgreSQL
    emp = Employee.objects.filter(is_active=True).first()
    if not emp:
        admin_user = User.objects.filter(is_superuser=True).first()
        emp = Employee.objects.create(
            user=admin_user,
            employee_id="EMP-1001",
            phone="9000011111",
            title="Senior HVAC Technician",
            company=sr.company,
        )

    apply_transition(sr, ServiceRequest.Status.ASSIGNED)
    sr.assigned_employee = emp
    sr.save(update_fields=["status", "assigned_employee", "updated_at"])

    job, created = EmployeeJob.objects.get_or_create(
        service_request=sr,
        employee=emp,
        defaults={
            "status": EmployeeJob.Status.ASSIGNED,
            "is_primary": True,
            "assigned_date": timezone.now(),
        }
    )
    print(f"\n[STEP 2 SUCCESS] Vendor/Employee Assignment persisted in PostgreSQL:")
    print(f"  - Employee: {emp}")
    print(f"  - EmployeeJob ID: {job.id}")
    print(f"  - Booking Status: {sr.status}")
    print(f"  - Job Status: {job.status}")

    # 3. Employee Backend Job Retrieval
    fetched_job = EmployeeJob.objects.select_related("service_request", "employee").get(id=job.id)
    print(f"\n[STEP 3 SUCCESS] Employee Backend fetched job from PostgreSQL:")
    print(f"  - Job Request ID: {fetched_job.service_request.request_id}")
    print(f"  - Service Description: {fetched_job.service_request.issue_title}")

    # 4. Job Lifecycle Transitions in PostgreSQL
    # Step 4a: RECEIVED
    job.status = EmployeeJob.Status.RECEIVED
    job.save(update_fields=["status"])
    apply_transition(sr, ServiceRequest.Status.RECEIVED)
    sr.save(update_fields=["status", "updated_at"])
    print(f"\n[STEP 4a SUCCESS] Status transition: RECEIVED")

    # Step 4b: ACCEPTED
    job.status = EmployeeJob.Status.ACCEPTED
    job.accepted_date = timezone.now()
    job.save(update_fields=["status", "accepted_date"])
    apply_transition(sr, ServiceRequest.Status.ACCEPTED)
    sr.save(update_fields=["status", "updated_at"])
    print(f"[STEP 4b SUCCESS] Status transition: ACCEPTED")

    # Step 4c: ON_THE_WAY (EN_ROUTE)
    job.status = EmployeeJob.Status.ON_THE_WAY
    job.save(update_fields=["status"])
    apply_transition(sr, ServiceRequest.Status.ON_THE_WAY)
    sr.save(update_fields=["status", "updated_at"])
    print(f"[STEP 4c SUCCESS] Status transition: ON_THE_WAY (EN_ROUTE)")

    # 5. Live Location Tracking Ping (Employee device location)
    ping = EmployeeLocation.objects.create(
        company=emp.company,
        employee=emp,
        lat=Decimal("12.738900"),
        lng=Decimal("77.824100"),
    )
    print(f"\n[STEP 5 SUCCESS] Realtime Employee Location Ping stored:")
    print(f"  - Employee Live Ping: Lat {ping.lat}, Lng {ping.lng}")
    print(f"  - Destination (Customer Service Location): Lat {sr.latitude}, Lng {sr.longitude}")

    # Step 4d: ARRIVED
    job.status = EmployeeJob.Status.ARRIVED
    job.save(update_fields=["status"])
    apply_transition(sr, ServiceRequest.Status.ARRIVED)
    sr.save(update_fields=["status", "updated_at"])
    print(f"\n[STEP 4d SUCCESS] Status transition: ARRIVED")

    # Step 4e: IN_PROGRESS
    job.status = EmployeeJob.Status.IN_PROGRESS
    job.started_date = timezone.now()
    job.save(update_fields=["status", "started_date"])
    apply_transition(sr, ServiceRequest.Status.IN_PROGRESS)
    sr.save(update_fields=["status", "updated_at"])
    print(f"[STEP 4e SUCCESS] Status transition: IN_PROGRESS")

    # Step 4f: COMPLETED
    proof = JobCompletionProof.objects.create(job=job, note="Service completed successfully.")
    job.status = EmployeeJob.Status.COMPLETED
    job.completed_date = timezone.now()
    job.save(update_fields=["status", "completed_date"])
    apply_transition(sr, ServiceRequest.Status.COMPLETED)
    sr.save(update_fields=["status", "updated_at"])
    print(f"[STEP 4f SUCCESS] Status transition: COMPLETED")

    # 6. Customer/Admin Read Updated Status from PostgreSQL
    final_sr = ServiceRequest.objects.get(id=sr.id)
    print(f"\n[STEP 6 SUCCESS] Customer/Admin read final updated record from PostgreSQL:")
    print(f"  - Final Booking Status: {final_sr.status}")
    print(f"  - Completed Date: {job.completed_date}")
    print("=" * 60)
    print("VERIFICATION COMPLETE: ALL STEPS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_database_integration()
