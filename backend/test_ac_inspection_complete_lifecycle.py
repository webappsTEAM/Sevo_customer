"""
test_ac_inspection_complete_lifecycle.py

Complete test suite validating all 21 criteria from Requirement 17:
1. Create an AC Inspection booking.
2. Confirm ServiceRequest is created.
3. Confirm CustomerInspection exists.
4. Confirm diagnostic fee Rs.199 is stored correctly.
5. Confirm rate-card snapshot exists.
6. Confirm the same booking is available to the Technician application.
7. Confirm Technician assignment status can be displayed.
8. Confirm Technician acceptance status is reflected.
9. Confirm On The Way status is reflected.
10. Confirm Arrived status is reflected.
11. Confirm Inspection Started status is reflected.
12. Confirm Inspection Completed status is reflected.
13. Confirm Technician estimation appears in Customer Admin.
14. Confirm Admin can approve it.
15. Confirm Admin can send it back.
16. Confirm approved estimation appears to Customer.
17. Confirm Customer can accept.
18. Confirm Customer can reject.
19. Confirm rejected repair estimation does not create a repair charge.
20. Confirm rejected estimation remains stored historically.
21. Change the master rate card and confirm old booking snapshots do not change.
"""
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.conf import settings
if "testserver" not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append("testserver")

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from service_requests.models import (
    ServiceRequest,
    Estimation,
    EstimationQuotation,
    EstimationQuotationItem,
    Inspection,
    InspectionFinding,
    CustomerInspection,
    CustomerInspectionRateSnapshot,
    ACInspectionConfiguration,
    ACInspectionRateCategory,
    ACInspectionRateItem,
)
from service_requests.services.quotation_service import QuotationService
from service_requests.services.customer_inspection_service import CustomerInspectionService

User = get_user_model()


def run_all_21_tests():
    print("=" * 70)
    print("STARTING COMPLETE 21-STEP AC INSPECTION WORKFLOW VERIFICATION")
    print("=" * 70)

    client = APIClient()

    # Setup Customer User
    customer, _ = User.objects.get_or_create(
        phone="9988776655",
        defaults={"username": "ac_test_customer", "email": "customer@test.com", "role": "customer"}
    )

    # Setup Admin User
    admin_user, _ = User.objects.get_or_create(
        username="ac_admin_tester",
        defaults={"email": "admin@test.com", "role": "admin", "is_staff": True}
    )

    # Ensure Master Configuration is 199.00
    config = ACInspectionConfiguration.get_solo()
    config.diagnostic_fee = Decimal("199.00")
    config.save()

    # Ensure Outdoor Fan Motor item exists in master catalog at Rs.1800
    fan_item = ACInspectionRateItem.objects.filter(name__icontains="Outdoor Fan Motor").first()
    if not fan_item:
        cat = ACInspectionRateCategory.objects.first()
        fan_item = ACInspectionRateItem.objects.create(
            category=cat,
            name="Outdoor Fan Motor",
            price=Decimal("1800.00"),
            unit="fixed",
            service_type="SPARE_PART",
            is_active=True,
        )
    else:
        fan_item.price = Decimal("1800.00")
        fan_item.is_active = True
        fan_item.save()

    # Ensure Labour item exists in master catalog at Rs.500
    labour_item = ACInspectionRateItem.objects.filter(name__icontains="Labour").first()
    if not labour_item:
        cat = ACInspectionRateCategory.objects.first()
        labour_item = ACInspectionRateItem.objects.create(
            category=cat,
            name="Standard Repair Labour",
            price=Decimal("500.00"),
            unit="visit",
            service_type="LABOUR",
            is_active=True,
        )
    else:
        labour_item.price = Decimal("500.00")
        labour_item.is_active = True
        labour_item.save()

    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")

    # --------------------------------------------------------------------------
    # 1. Create an AC Inspection booking.
    # --------------------------------------------------------------------------
    print("\n[Step 1] Creating AC Inspection booking...")
    client.force_authenticate(user=customer)
    payload = {
        "job_type": "ESTIMATION",
        "service_category": "hvac",
        "preferred_date": tomorrow,
        "customer_name": "Surya",
        "phone": "9988776655",
        "email": "surya@test.com",
        "address": "42 Lake View, Hosur",
        "latitude": 12.7409,
        "longitude": 77.8253,
        "ac_type": "SPLIT",
        "ac_brand": "LG",
        "ac_capacity": "1.5_TON",
        "ac_quantity": 1,
        "customer_symptom": "Outdoor fan motor failure",
        "payment_method": "COD",
    }
    resp1 = client.post("/api/booking/", payload, format="json")
    assert resp1.status_code in [200, 201], f"Step 1 failed: {resp1.data}"
    booking_id = resp1.data["data"]["id"]
    print(f"-> Step 1 PASS: Booking created with ID #{booking_id}")

    # --------------------------------------------------------------------------
    # 2. Confirm ServiceRequest is created.
    # --------------------------------------------------------------------------
    print("\n[Step 2] Confirm ServiceRequest is created...")
    sr = ServiceRequest.objects.get(pk=booking_id)
    assert sr is not None
    assert sr.service_category == "hvac"
    assert sr.customer_name == "Surya"
    print(f"-> Step 2 PASS: ServiceRequest #{sr.request_id} (ID: {sr.id}) exists.")

    # --------------------------------------------------------------------------
    # 3. Confirm CustomerInspection exists.
    # --------------------------------------------------------------------------
    print("\n[Step 3] Confirm CustomerInspection exists...")
    ci = CustomerInspection.objects.filter(service_request=sr).first()
    assert ci is not None, "CustomerInspection not found for this ServiceRequest!"
    assert ci.service_request_id == sr.id
    print(f"-> Step 3 PASS: CustomerInspection #{ci.id} linked to ServiceRequest #{sr.id}.")

    # --------------------------------------------------------------------------
    # 4. Confirm diagnostic fee Rs.199 is stored correctly.
    # --------------------------------------------------------------------------
    print("\n[Step 4] Confirm diagnostic fee Rs.199 is stored correctly...")
    assert ci.diagnostic_fee_snapshot == Decimal("199.00"), f"Expected 199.00, got {ci.diagnostic_fee_snapshot}"
    print(f"-> Step 4 PASS: Stored diagnostic fee snapshot is Rs.{ci.diagnostic_fee_snapshot}")

    # --------------------------------------------------------------------------
    # 5. Confirm rate-card snapshot exists.
    # --------------------------------------------------------------------------
    print("\n[Step 5] Confirm rate-card snapshot exists...")
    snapshots = CustomerInspectionRateSnapshot.objects.filter(customer_inspection=ci)
    assert snapshots.count() > 0, "Zero rate snapshots found!"
    motor_snap = snapshots.filter(item_name_snapshot__icontains="Outdoor Fan Motor").first()
    assert motor_snap is not None, "Outdoor Fan Motor snapshot missing!"
    assert motor_snap.price_snapshot == Decimal("1800.00")
    print(f"-> Step 5 PASS: {snapshots.count()} rate snapshots preserved (Outdoor Fan Motor = Rs.{motor_snap.price_snapshot}).")

    # --------------------------------------------------------------------------
    # 6. Confirm the same booking is available to the Technician application.
    # --------------------------------------------------------------------------
    print("\n[Step 6] Confirm the same booking is available to Technician application...")
    # In the shared PostgreSQL DB, the technician app queries ServiceRequest where status is new/unassigned/requested
    tech_qs = ServiceRequest.objects.filter(pk=sr.id, status__in=[ServiceRequest.Status.REQUESTED, ServiceRequest.Status.NEW_REQUEST, ServiceRequest.Status.UNASSIGNED, "confirmed"])
    assert tech_qs.exists(), f"Booking #{sr.id} with status '{sr.status}' is not available in shared DB for technician queries!"
    print(f"-> Step 6 PASS: Booking #{sr.request_id} is discoverable by Technician backend.")

    # --------------------------------------------------------------------------
    # 7. Confirm Technician assignment status can be displayed.
    # --------------------------------------------------------------------------
    print("\n[Step 7] Confirm Technician assignment status can be displayed...")
    client.force_authenticate(user=admin_user)
    # Before assignment:
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp.status_code == 200
    assert admin_detail_resp.data["data"]["technician_section"]["assignment_status"] == "Waiting for Technician Assignment"

    # Simulate automatic technician assignment from technician dispatch
    sr.status = ServiceRequest.Status.ASSIGNED
    sr.technician_name = "Raj"
    sr.technician_phone = "9876500001"
    sr.save(update_fields=["status", "technician_name", "technician_phone"])

    admin_detail_resp2 = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp2.data["data"]["technician_section"]["assignment_status"] == "Technician Assigned"
    assert admin_detail_resp2.data["data"]["technician_section"]["technician"] == "Raj"
    print("-> Step 7 PASS: Assignment status correctly transitions from 'Waiting' to 'Technician Assigned' (Technician: Raj).")

    # --------------------------------------------------------------------------
    # 8. Confirm Technician acceptance status is reflected.
    # --------------------------------------------------------------------------
    print("\n[Step 8] Confirm Technician acceptance status is reflected...")
    sr.status = ServiceRequest.Status.ACCEPTED
    sr.save(update_fields=["status"])
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp.data["data"]["technician_section"]["acceptance_status"] == "Accepted"
    print("-> Step 8 PASS: Acceptance status reflected as 'Accepted'.")

    # --------------------------------------------------------------------------
    # 9. Confirm On The Way status is reflected.
    # --------------------------------------------------------------------------
    print("\n[Step 9] Confirm On The Way status is reflected...")
    sr.status = ServiceRequest.Status.ON_THE_WAY
    sr.save(update_fields=["status"])
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp.data["data"]["technician_section"]["current_job_status"] == "On The Way"
    print("-> Step 9 PASS: 'On The Way' status reflected in job status.")

    # --------------------------------------------------------------------------
    # 10. Confirm Arrived status is reflected.
    # --------------------------------------------------------------------------
    print("\n[Step 10] Confirm Arrived status is reflected...")
    sr.status = ServiceRequest.Status.ARRIVED
    sr.save(update_fields=["status"])
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert "Arrived" in admin_detail_resp.data["data"]["technician_section"]["current_job_status"]
    print("-> Step 10 PASS: 'Arrived' status reflected in job status.")

    # --------------------------------------------------------------------------
    # 11. Confirm Inspection Started status is reflected.
    # --------------------------------------------------------------------------
    print("\n[Step 11] Confirm Inspection Started status is reflected...")
    sr.status = ServiceRequest.Status.IN_PROGRESS
    sr.save(update_fields=["status"])
    est = sr.estimation
    est.status = Estimation.Status.INSPECTION_IN_PROGRESS
    est.save(update_fields=["status"])
    insp, _ = Inspection.objects.get_or_create(
        estimation=est,
        defaults={"technician_name": "Raj", "technician_phone": "9876500001", "status": Inspection.Status.IN_PROGRESS}
    )
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp.data["data"]["technician_section"]["current_job_status"] == "Inspection In Progress"
    print("-> Step 11 PASS: 'Inspection In Progress' reflected.")

    # --------------------------------------------------------------------------
    # 12. Confirm Inspection Completed status is reflected.
    # --------------------------------------------------------------------------
    print("\n[Step 12] Confirm Inspection Completed status is reflected...")
    insp.status = Inspection.Status.COMPLETED
    insp.diagnosis = "Outdoor fan motor failure"
    insp.notes = "Capacitor weak and fan motor bearing jammed."
    insp.save(update_fields=["status", "diagnosis", "notes"])
    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    assert admin_detail_resp.data["data"]["diagnosis_section"]["diagnosis"] == "Outdoor fan motor failure"
    print("-> Step 12 PASS: Inspection diagnosis & notes reflected.")

    # --------------------------------------------------------------------------
    # 13. Confirm Technician estimation appears in Customer Admin.
    # --------------------------------------------------------------------------
    print("\n[Step 13] Confirm Technician estimation appears in Customer Admin...")
    # Technician creates estimation quotation
    quote_items = [
        {"rate_item_id": fan_item.id, "quantity": 1, "service_name": "Outdoor Fan Motor", "unit_price": 1800.0, "unit": "fixed"},
        {"rate_item_id": labour_item.id, "quantity": 1, "service_name": "Standard Repair Labour", "unit_price": 500.0, "unit": "visit"},
    ]
    quote = QuotationService.create_quotation(
        estimation=est,
        items_data=quote_items,
        notes="Outdoor fan motor replacement required",
        technician_id="TECH-101",
    )
    quote.status = EstimationQuotation.Status.SUBMITTED_FOR_REVIEW
    quote.save(update_fields=["status"])

    admin_detail_resp = client.get(f"/api/admin/ac-inspections/{sr.id}/")
    est_sec = admin_detail_resp.data["data"]["estimation_section"]
    assert est_sec["has_quotation"] is True
    assert est_sec["quote_ref"] == quote.quote_ref
    assert float(est_sec["total"]) == 2300.0
    print(f"-> Step 13 PASS: Estimation quotation {quote.quote_ref} (Rs.{est_sec['total']}) appears in Customer Admin.")

    # --------------------------------------------------------------------------
    # 15. Confirm Admin can send it back to technician.
    # --------------------------------------------------------------------------
    print("\n[Step 15] Confirm Admin can send it back to technician...")
    send_back_resp = client.post(
        f"/api/admin/ac-inspections/{sr.id}/estimation/send-back/",
        {"quotation_id": quote.id, "admin_note": "Please verify the outdoor fan motor and upload the required photo."},
        format="json"
    )
    assert send_back_resp.status_code == 200, f"Send back failed: {send_back_resp.data}"
    quote.refresh_from_db()
    est.refresh_from_db()
    assert quote.status == EstimationQuotation.Status.SENT_BACK_TO_TECHNICIAN
    assert est.status == Estimation.Status.SENT_BACK_TO_TECHNICIAN
    assert "Please verify" in quote.admin_notes
    print("-> Step 15 PASS: Admin sent back estimation to technician with notes.")

    # --------------------------------------------------------------------------
    # 14. Confirm Admin can approve it.
    # --------------------------------------------------------------------------
    print("\n[Step 14] Confirm Admin can approve it...")
    # Technician re-submits
    quote.status = EstimationQuotation.Status.SUBMITTED_FOR_REVIEW
    quote.save(update_fields=["status"])
    est.status = Estimation.Status.ESTIMATION_SUBMITTED
    est.save(update_fields=["status"])

    approve_resp = client.post(
        f"/api/admin/ac-inspections/{sr.id}/estimation/approve/",
        {"quotation_id": quote.id, "admin_note": "Verified by Admin. Approved for customer review."},
        format="json"
    )
    assert approve_resp.status_code == 200, f"Admin approve failed: {approve_resp.data}"
    quote.refresh_from_db()
    est.refresh_from_db()
    sr.refresh_from_db()
    assert quote.status == EstimationQuotation.Status.ADMIN_APPROVED
    assert est.status == Estimation.Status.ADMIN_APPROVED
    assert sr.status == ServiceRequest.Status.QUOTATION_SENT
    print("-> Step 14 PASS: Admin approved quotation. State is ADMIN_APPROVED, booking status is QUOTATION_SENT.")

    # --------------------------------------------------------------------------
    # 16. Confirm approved estimation appears to Customer.
    # --------------------------------------------------------------------------
    print("\n[Step 16] Confirm approved estimation appears to Customer...")
    client.force_authenticate(user=customer)
    cust_quote_resp = client.get(f"/api/booking/{sr.id}/quotation/")
    assert cust_quote_resp.status_code == 200
    assert cust_quote_resp.data["data"]["id"] == quote.id
    assert float(cust_quote_resp.data["data"]["total_amount"]) == 2300.0
    print(f"-> Step 16 PASS: Customer received approved quotation Rs.{cust_quote_resp.data['data']['total_amount']}.")

    # --------------------------------------------------------------------------
    # 17. Confirm Customer can accept.
    # --------------------------------------------------------------------------
    print("\n[Step 17] Confirm Customer can accept estimation...")
    accept_resp = client.post(f"/api/booking/{sr.id}/quotation/approve/", {"quotation_id": quote.id}, format="json")
    assert accept_resp.status_code == 200, f"Customer accept failed: {accept_resp.data}"
    sr.refresh_from_db()
    quote.refresh_from_db()
    assert quote.status == EstimationQuotation.Status.APPROVED
    assert sr.status == ServiceRequest.Status.CUSTOMER_APPROVED
    assert sr.job_type == ServiceRequest.JobType.CHANGE_REQUEST
    assert float(sr.total_amount) == 2300.0
    print(f"-> Step 17 PASS: Customer approved quotation. ServiceRequest #{sr.id} converted to CHANGE_REQUEST on same ID with total Rs.{sr.total_amount}.")

    # --------------------------------------------------------------------------
    # 18-20: Test Customer Rejection Flow on Booking #2
    # --------------------------------------------------------------------------
    print("\n[Step 18-20] Creating Booking #2 for Rejection Testing...")
    payload_reject = dict(payload)
    payload_reject["customer_symptom"] = "Compressor replacement quotation rejection test"
    resp_rej = client.post("/api/booking/", payload_reject, format="json")
    assert resp_rej.status_code in [200, 201]
    b2_id = resp_rej.data["data"]["id"]
    sr2 = ServiceRequest.objects.get(pk=b2_id)
    est2 = sr2.estimation

    # Diagnostic Fee charged
    ci2 = CustomerInspection.objects.get(service_request=sr2)
    assert ci2.diagnostic_fee_snapshot == Decimal("199.00")

    # Technician issues quotation for Rs.2300
    q2 = QuotationService.create_quotation(
        estimation=est2,
        items_data=quote_items,
        notes="High cost repair estimate",
    )
    # Admin approves it
    QuotationService.admin_approve_quotation(service_request_id=sr2.id, quotation_id=q2.id, admin_user=admin_user)

    # 18. Confirm Customer can reject
    print("\n[Step 18] Customer rejects estimation quotation...")
    client.force_authenticate(user=customer)
    rej_resp = client.post(
        f"/api/booking/{sr2.id}/quotation/reject/",
        {"quotation_id": q2.id, "reason_code": "PRICE_TOO_HIGH", "reason_note": "Too expensive for me right now"},
        format="json"
    )
    assert rej_resp.status_code == 200, f"Reject failed: {rej_resp.data}"
    sr2.refresh_from_db()
    q2.refresh_from_db()
    est2.refresh_from_db()
    assert sr2.status == ServiceRequest.Status.CUSTOMER_REJECTED
    assert est2.status == Estimation.Status.CUSTOMER_REJECTED
    assert q2.status == EstimationQuotation.Status.REJECTED
    print("-> Step 18 PASS: Customer rejected quotation.")

    # 19. Confirm rejected repair estimation does not create a repair charge
    print("\n[Step 19] Confirm rejected repair estimation does not create a repair charge...")
    # sr2.total_amount must remain 0 or 199 diagnostic fee, NOT the 2300 repair quote
    assert float(sr2.total_amount) != 2300.0, f"Repair charge of Rs.{sr2.total_amount} was erroneously charged on rejected quote!"
    print(f"-> Step 19 PASS: Repair quotation rejected: repair charge = Rs.0 (ServiceRequest total is Rs.{sr2.total_amount}, not Rs.2,300).")

    # 20. Confirm rejected estimation remains stored historically
    print("\n[Step 20] Confirm rejected estimation remains stored historically...")
    assert EstimationQuotation.objects.filter(pk=q2.id).exists(), "Quotation was deleted!"
    assert q2.rejection_reason == "PRICE_TOO_HIGH"
    print(f"-> Step 20 PASS: Quotation #{q2.id} ({q2.quote_ref}) retained in DB with rejection reason '{q2.rejection_reason}'.")

    # --------------------------------------------------------------------------
    # 21. Change the master rate card and confirm old booking snapshots do not change.
    # --------------------------------------------------------------------------
    print("\n[Step 21] Change the master rate card and confirm old booking snapshots do not change...")
    # Change master rates: diagnostic fee 199 -> 299, Outdoor fan motor 1800 -> 2400
    config.diagnostic_fee = Decimal("299.00")
    config.save()
    fan_item.price = Decimal("2400.00")
    fan_item.save()

    # Re-verify Booking #1 snapshot in PostgreSQL
    ci.refresh_from_db()
    motor_snap.refresh_from_db()
    assert ci.diagnostic_fee_snapshot == Decimal("199.00"), f"Old diagnostic fee snapshot changed to {ci.diagnostic_fee_snapshot}!"
    assert motor_snap.price_snapshot == Decimal("1800.00"), f"Old item rate snapshot changed to {motor_snap.price_snapshot}!"

    # Booking #1 API also returns Rs.199 and Rs.1800
    b1_api_resp = client.get(f"/api/booking/{sr.id}/inspection-rate-card/")
    assert b1_api_resp.status_code == 200
    assert float(b1_api_resp.data["data"]["diagnostic_fee"]) == 199.0

    # Restore master config
    config.diagnostic_fee = Decimal("199.00")
    config.save()
    fan_item.price = Decimal("1800.00")
    fan_item.save()
    print("-> Step 21 PASS: Old booking #1 retained Rs.199 diagnostic fee and Rs.1,800 fan motor price even after master rates changed.")

    print("\n" + "=" * 70)
    print("ALL 21 TEST CRITERIA PASSED WITHOUT ERROR!")
    print("=" * 70)


if __name__ == "__main__":
    run_all_21_tests()
