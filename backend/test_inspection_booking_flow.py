"""
test_inspection_booking_flow.py

Comprehensive test suite verifying all 6 tests from Requirement 20:
Test 1: Customer booking creates ServiceRequest, CustomerInspection, and all CustomerInspectionRateSnapshot rows.
Test 2: Customer opens booking details, verifies Diagnostic Fee = 199 and Spare Parts & Repair Rate Card from booking snapshots.
Test 3: Admin changes master rates (fee: 199 -> 249, item: 1800 -> 2000). Old booking remains 199 and 1800.
Test 4: Create new booking with new master rates. Receives 249 and 2000. Old booking still remains untouched.
Test 5: Data isolation: Customer A cannot access Customer B's booking inspection/rate-card data.
Test 6: Transaction safety: If snapshot creation fails, the entire transaction is rolled back.
"""
import os
import sys
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.conf import settings
if "testserver" not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append("testserver")

from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from service_requests.models import (
    ServiceRequest,
    CustomerInspection,
    CustomerInspectionRateSnapshot,
    ACInspectionConfiguration,
    ACInspectionRateCategory,
    ACInspectionRateItem,
)
from service_requests.services.customer_inspection_service import CustomerInspectionService

User = get_user_model()

def run_tests():
    print("=" * 60)
    print("STARTING TEST SUITE FOR AC INSPECTION & RATE CARD FLOW")
    print("=" * 60)

    # 0. Setup test users and reset master configuration
    client = APIClient()
    user_a = User.objects.filter(phone="9876543210").first()
    if not user_a:
        user_a = User.objects.create(username="test_customer_a_new", phone="9876543210", email="customer_a@example.com")

    user_b = User.objects.filter(phone="9876543211").first()
    if not user_b:
        user_b = User.objects.create(username="test_customer_b_new", phone="9876543211", email="customer_b@example.com")

    config = ACInspectionConfiguration.get_solo()
    config.diagnostic_fee = Decimal("199.00")
    config.save()

    # Find or set Outdoor Fan Motor
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

    active_items_count = ACInspectionRateItem.objects.filter(
        is_active=True, category__is_active=True
    ).count()
    print(f"Master Catalog Active Items: {active_items_count}")

    # ==========================================================
    # TEST 1: Customer Booking Creation
    # ==========================================================
    print("\n--- TEST 1: Customer Booking Creation ---")
    client.force_authenticate(user=user_a)
    payload_1 = {
        "job_type": "ESTIMATION",
        "service_category": "hvac",
        "preferred_date": "2026-09-20",
        "customer_name": "Customer A",
        "phone": "9876543210",
        "email": "customer_a@example.com",
        "address": "123 Test Street, Hosur",
        "latitude": 12.7409,
        "longitude": 77.8253,
        "ac_type": "SPLIT",
        "ac_brand": "LG",
        "ac_capacity": "1.5_TON",
        "ac_quantity": 1,
        "customer_symptom": "Not cooling",
        "payment_method": "COD",
    }
    resp1 = client.post("/api/booking/", payload_1, format="json")
    assert resp1.status_code in [200, 201], f"Test 1 booking failed: {resp1.data}"
    booking_1_id = resp1.data["data"]["id"]
    sr_1 = ServiceRequest.objects.get(pk=booking_1_id)
    assert sr_1 is not None, "ServiceRequest not found"

    # Verify DB for CustomerInspection
    ci_1 = CustomerInspection.objects.filter(service_request=sr_1).first()
    assert ci_1 is not None, "CustomerInspection record was not created!"
    assert ci_1.service_request_id == sr_1.id, "CustomerInspection.service_request_id does not point to ServiceRequest!"
    assert ci_1.inspection_name_snapshot == "AC Inspection & Diagnostic Visit", f"Unexpected name snapshot: {ci_1.inspection_name_snapshot}"
    assert ci_1.diagnostic_fee_snapshot == Decimal("199.00"), f"Fee snapshot was {ci_1.diagnostic_fee_snapshot}, expected 199.00"
    assert ci_1.quantity == 1, f"Quantity was {ci_1.quantity}, expected 1"
    assert ci_1.status == CustomerInspection.Status.BOOKED, f"Status was {ci_1.status}, expected BOOKED"

    # Verify DB for Rate Snapshots
    snapshots_1 = CustomerInspectionRateSnapshot.objects.filter(customer_inspection=ci_1)
    assert snapshots_1.count() == active_items_count, (
        f"Snapshot count ({snapshots_1.count()}) != active master items count ({active_items_count})"
    )
    motor_snap_1 = snapshots_1.filter(item_name_snapshot__icontains="Outdoor Fan Motor").first()
    assert motor_snap_1 is not None, "Outdoor Fan Motor snapshot missing!"
    assert motor_snap_1.price_snapshot == Decimal("1800.00"), f"Expected 1800.00, got {motor_snap_1.price_snapshot}"
    print(f"PASSED Test 1: ServiceRequest #{sr_1.id} -> CustomerInspection #{ci_1.id} with fee Rs.{ci_1.diagnostic_fee_snapshot} and {snapshots_1.count()} rate snapshots (Outdoor Fan Motor = Rs.{motor_snap_1.price_snapshot}).")

    # ==========================================================
    # TEST 2: Customer Opens Booking Details
    # ==========================================================
    print("\n--- TEST 2: Customer Opens Booking Details ---")
    resp2 = client.get(f"/api/booking/{sr_1.request_id}/inspection-rate-card/")
    assert resp2.status_code == 200, f"Test 2 failed: {resp2.data}"
    data2 = resp2.data["data"]
    assert float(data2["diagnostic_fee"]) == 199.0, f"Expected fee 199, got {data2['diagnostic_fee']}"
    assert len(data2["categories"]) > 0, "Expected rate categories in response"

    # Check that detail endpoint also embeds customer_inspection
    resp2_detail = client.get(f"/api/booking/{sr_1.request_id}/")
    assert resp2_detail.status_code == 200
    assert "customer_inspection" in resp2_detail.data["data"]
    ci_data = resp2_detail.data["data"]["customer_inspection"]
    assert ci_data is not None
    assert ci_data["diagnostic_fee"] == 199.0
    print(f"PASSED Test 2: Details API returned stored snapshot with fee Rs.{data2['diagnostic_fee']} across {len(data2['categories'])} categories.")

    # ==========================================================
    # TEST 3: Admin Changes Master Rate Card
    # ==========================================================
    print("\n--- TEST 3: Admin Changes Master Rates (199 -> 249, 1800 -> 2000) ---")
    config.diagnostic_fee = Decimal("249.00")
    config.save()
    fan_item.price = Decimal("2000.00")
    fan_item.save()

    # Re-fetch OLD booking #1
    resp3 = client.get(f"/api/booking/{sr_1.request_id}/inspection-rate-card/")
    assert resp3.status_code == 200
    data3 = resp3.data["data"]
    assert float(data3["diagnostic_fee"]) == 199.0, f"Old booking fee changed! Got: {data3['diagnostic_fee']}"
    motor_item_old = None
    for cat in data3["categories"]:
        for item in cat["items"]:
            if "Outdoor Fan Motor" in item["name"]:
                motor_item_old = item
                break
    assert motor_item_old is not None
    assert float(motor_item_old["numeric_price"]) == 1800.0, f"Old booking item price changed! Got: {motor_item_old['numeric_price']}"
    print(f"PASSED Test 3: Old booking #1 snapshot preserved intact: Diagnostic Fee remains Rs.199, Outdoor Fan Motor remains Rs.1800.")

    # ==========================================================
    # TEST 4: Create NEW Booking with New Master Rates
    # ==========================================================
    print("\n--- TEST 4: Create NEW Booking #2 With Updated Rates ---")
    payload_2 = dict(payload_1)
    payload_2["customer_symptom"] = "Strange noise from compressor"
    resp4 = client.post("/api/booking/", payload_2, format="json")
    assert resp4.status_code in [200, 201], f"Test 4 booking failed: {resp4.data}"
    booking_2_id = resp4.data["data"]["id"]
    sr_2 = ServiceRequest.objects.get(pk=booking_2_id)
    ci_2 = CustomerInspection.objects.get(service_request=sr_2)

    assert ci_2.diagnostic_fee_snapshot == Decimal("249.00"), f"New booking fee expected 249.00, got {ci_2.diagnostic_fee_snapshot}"
    motor_snap_2 = CustomerInspectionRateSnapshot.objects.filter(
        customer_inspection=ci_2,
        item_name_snapshot__icontains="Outdoor Fan Motor"
    ).first()
    assert motor_snap_2.price_snapshot == Decimal("2000.00"), f"New booking item price expected 2000.00, got {motor_snap_2.price_snapshot}"

    # Verify old booking #1 is STILL 199 and 1800 in DB
    ci_1.refresh_from_db()
    motor_snap_1.refresh_from_db()
    assert ci_1.diagnostic_fee_snapshot == Decimal("199.00")
    assert motor_snap_1.price_snapshot == Decimal("1800.00")
    print(f"PASSED Test 4: New booking #2 created with Diagnostic Fee = Rs.{ci_2.diagnostic_fee_snapshot} and Outdoor Fan Motor = Rs.{motor_snap_2.price_snapshot}. Old booking #1 remains Rs.199 and Rs.1800.")

    # ==========================================================
    # TEST 5: Data Isolation Between Customers
    # ==========================================================
    print("\n--- TEST 5: Customer Data Isolation ---")
    # Customer B tries to view Customer A's booking #1
    client.force_authenticate(user=user_b)
    resp5 = client.get(f"/api/booking/{sr_1.request_id}/inspection-rate-card/")
    assert resp5.status_code in [401, 403], f"Expected 403 Forbidden, got {resp5.status_code}"
    resp5_detail = client.get(f"/api/booking/{sr_1.request_id}/")
    assert resp5_detail.status_code in [401, 403], f"Expected 403 Forbidden, got {resp5_detail.status_code}"
    print(f"PASSED Test 5: Customer B received status {resp5.status_code} when attempting to access Customer A's inspection rate card.")

    # ==========================================================
    # TEST 6: Transaction Safety (Atomic Rollback on Error)
    # ==========================================================
    print("\n--- TEST 6: Transaction Safety (Atomic Rollback) ---")
    client.force_authenticate(user=user_a)
    sr_count_before = ServiceRequest.objects.count()
    ci_count_before = CustomerInspection.objects.count()
    snap_count_before = CustomerInspectionRateSnapshot.objects.count()

    # Simulate an error in rate snapshot creation by patching create_inspection_and_rate_snapshots
    original_func = CustomerInspectionService.create_inspection_and_rate_snapshots
    def failing_func(*args, **kwargs):
        raise RuntimeError("Simulated failure during rate snapshot generation")

    CustomerInspectionService.create_inspection_and_rate_snapshots = failing_func
    try:
        failing_payload = dict(payload_1)
        failing_payload["customer_symptom"] = "Simulated rollback test"
        resp6 = client.post("/api/booking/", failing_payload, format="json")
    except RuntimeError:
        pass
    finally:
        CustomerInspectionService.create_inspection_and_rate_snapshots = original_func

    sr_count_after = ServiceRequest.objects.count()
    ci_count_after = CustomerInspection.objects.count()
    snap_count_after = CustomerInspectionRateSnapshot.objects.count()

    assert sr_count_after == sr_count_before, f"Transaction leaked ServiceRequest! Before: {sr_count_before}, After: {sr_count_after}"
    assert ci_count_after == ci_count_before, f"Transaction leaked CustomerInspection! Before: {ci_count_before}, After: {ci_count_after}"
    assert snap_count_after == snap_count_before, f"Transaction leaked RateSnapshots! Before: {snap_count_before}, After: {snap_count_after}"
    print("PASSED Test 6: Atomic rollback verified. Zero orphaned ServiceRequest or CustomerInspection rows left on failure.")

    # Restore default master configuration
    config.diagnostic_fee = Decimal("199.00")
    config.save()
    fan_item.price = Decimal("1800.00")
    fan_item.save()

    print("\n" + "=" * 60)
    print("ALL 6 TESTS PASSED SUCCESSFULLY IN POSTGRESQL!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
