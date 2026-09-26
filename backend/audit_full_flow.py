import os
import sys
import json
import django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.conf import settings
settings.ALLOWED_HOSTS = ['*']

from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APIClient
from inventory.models import Vegetable, VegetableStockMovement, VegetableClaim
from service_requests.models import Package
from vegetable_orders.models import VegetableOrder, VegetableOrderItem, VegetableReturn
from inventory.selectors.vegetable_stock_selectors import get_stock_status, get_bulk_admin_stock_status
from inventory.services.vegetable_stock_service import reserve_stock_for_booking_items, release_stock_for_booking

User = get_user_model()

def run_audit():
    client = APIClient()
    admin_user = User.objects.filter(is_superuser=True).first()
    customer_user = User.objects.filter(role='CUSTOMER').first()

    if not admin_user:
        admin_user = User.objects.create_superuser('audit_admin', 'admin@audit.test', 'pass123')
    if not customer_user:
        customer_user = User.objects.create_user('audit_cust', 'cust@audit.test', 'pass123', role='CUSTOMER')

    client.force_authenticate(user=admin_user)

    # Identify test products
    weight_veg = Vegetable.objects.filter(unit_basis='WEIGHT', name__icontains='Bottle Gourd').first() or Vegetable.objects.filter(unit_basis='WEIGHT').first()
    count_veg = Vegetable.objects.filter(unit_basis='COUNT', name__icontains='Lemon').first() or Vegetable.objects.filter(unit_basis='COUNT').first()

    assert weight_veg is not None, "Weight vegetable not found"
    assert count_veg is not None, "Count vegetable not found"

    weight_pkg = weight_veg.package
    count_pkg = count_veg.package

    print("================================================================================")
    print("                 END-TO-END STOCK FLOW AUDIT (REAL DATA)                       ")
    print("================================================================================")
    print(f"Weight Product: {weight_veg.name} (ID={weight_veg.id}, PkgID={weight_pkg.id if weight_pkg else 'None'}, Basis={weight_veg.unit_basis}, Unit={weight_veg.unit})")
    print(f"Count Product:  {count_veg.name} (ID={count_veg.id}, PkgID={count_pkg.id if count_pkg else 'None'}, Basis={count_veg.unit_basis}, Unit={count_veg.unit})")
    print("================================================================================\n")

    results = []

    # =========================================================================
    # STEP 1: INVENTORY - Set known stock & reorder level via Edit Details API
    # =========================================================================
    print("--- STEP 1: INVENTORY (Edit Details Save & Verification) ---")
    
    # Weight Product: 2000g stock, 400g reorder level
    w_init_stock = 2000
    w_init_reorder = 400
    w_resp = client.patch(
        f"/api/inventory/vegetable-stock/{weight_pkg.id}/update-details/",
        {
            "current_stock_quantity": w_init_stock,
            "current_stock_unit": "g",
            "reorder_level_quantity": w_init_reorder,
            "reorder_level_unit": "g",
        },
        format="json"
    )
    assert w_resp.status_code == 200, f"Weight Edit Details failed: {w_resp.data}"

    # Count Product: 20 pcs stock, 4 pcs reorder level
    c_init_stock = 20
    c_init_reorder = 4
    c_resp = client.patch(
        f"/api/inventory/vegetable-stock/{count_pkg.id}/update-details/",
        {
            "current_stock_quantity": c_init_stock,
            "current_stock_unit": "pcs",
            "reorder_level_quantity": c_init_reorder,
            "reorder_level_unit": "pcs",
        },
        format="json"
    )
    assert c_resp.status_code == 200, f"Count Edit Details failed: {c_resp.data}"

    # DB Direct Verification
    weight_veg.refresh_from_db()
    count_veg.refresh_from_db()
    print(f"DB Check Weight Veg ID {weight_veg.id}: stock_quantity_grams={weight_veg.stock_quantity_grams}g (expected 2000g), reorder_threshold={weight_veg.reorder_threshold}g (expected 400g)")
    print(f"DB Check Count Veg ID {count_veg.id}: stock_quantity_grams={count_veg.stock_quantity_grams} pcs (expected 20 pcs), reorder_threshold={count_veg.reorder_threshold} pcs (expected 4 pcs)")

    step1_weight_db_ok = (weight_veg.stock_quantity_grams == 2000 and weight_veg.reorder_threshold == 400)
    step1_count_db_ok = (count_veg.stock_quantity_grams == 20 and count_veg.reorder_threshold == 4)

    # Table Overview Verification
    overview = get_bulk_admin_stock_status([weight_pkg, count_pkg])
    w_overview = overview[weight_pkg.id]
    c_overview = overview[count_pkg.id]

    print(f"Table Check Weight: available='{w_overview['today_available_display']}', state='{w_overview['state']}', reorder='{w_overview['reorder_level_display']}'")
    print(f"Table Check Count:  available='{c_overview['today_available_display']}', state='{c_overview['state']}', reorder='{c_overview['reorder_level_display']}'")

    step1_pass = step1_weight_db_ok and step1_count_db_ok and w_overview['state'] == 'in_stock' and c_overview['state'] == 'in_stock'
    results.append(("Step 1: Inventory Edit Details", "PASS" if step1_pass else "FAIL", {
        "Weight": f"DB={weight_veg.stock_quantity_grams}g, Reorder={weight_veg.reorder_threshold}g, Display='{w_overview['today_available_display']}', State='{w_overview['state']}'",
        "Count": f"DB={count_veg.stock_quantity_grams} pcs, Reorder={count_veg.reorder_threshold} pcs, Display='{c_overview['today_available_display']}', State='{c_overview['state']}'"
    }))
    print(f"Result Step 1: {'PASS' if step1_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 2: ORDERS - Place customer order (500g weight, 5 pcs count)
    # =========================================================================
    print("--- STEP 2: ORDERS (Order Placement & Stock Reservation) ---")
    w_order1_qty = 500  # 500g
    c_order1_qty = 5    # 5 pcs

    order1 = VegetableOrder.objects.create(
        customer=customer_user,
        status=VegetableOrder.Status.PLACED,
        total_amount=Decimal("150.00"),
        delivery_address="Audit Test Address 1",
    )
    VegetableOrderItem.objects.create(
        order=order1,
        package=weight_pkg,
        quantity_grams=w_order1_qty,
        unit_basis="WEIGHT",
        unit_label="g",
        unit_price_snapshot=Decimal("40.00"),
        line_amount=Decimal("40.00"),
    )
    VegetableOrderItem.objects.create(
        order=order1,
        package=count_pkg,
        quantity_grams=c_order1_qty,
        unit_basis="COUNT",
        unit_label="pcs",
        unit_price_snapshot=Decimal("10.00"),
        line_amount=Decimal("50.00"),
    )

    # Deduct / reserve stock
    reserve_stock_for_booking_items(
        items=[
            {"product": weight_pkg, "quantity": w_order1_qty, "unit": "g"},
            {"product": count_pkg, "quantity": c_order1_qty, "unit": "pcs"},
        ],
        company=weight_veg.org,
        booking_ref=order1.order_number,
    )

    weight_veg.refresh_from_db()
    count_veg.refresh_from_db()

    w_m1 = VegetableStockMovement.objects.filter(vegetable=weight_veg, movement_type=VegetableStockMovement.MovementType.SOLD).latest("created_at")
    c_m1 = VegetableStockMovement.objects.filter(vegetable=count_veg, movement_type=VegetableStockMovement.MovementType.SOLD).latest("created_at")

    print(f"After Order 1 Weight: Stock={weight_veg.stock_quantity_grams}g (Expected 1500g), Movement delta={w_m1.delta_grams}g (display='{w_m1.delta_display}')")
    print(f"After Order 1 Count:  Stock={count_veg.stock_quantity_grams} pcs (Expected 15 pcs), Movement delta={c_m1.delta_grams} pcs (display='{c_m1.delta_display}')")

    step2_pass = (weight_veg.stock_quantity_grams == 1500 and w_m1.delta_grams == -500 and
                  count_veg.stock_quantity_grams == 15 and c_m1.delta_grams == -5)
    results.append(("Step 2: Customer Order Reservation", "PASS" if step2_pass else "FAIL", {
        "Weight": f"Stock 2000g -> {weight_veg.stock_quantity_grams}g, Movement: {w_m1.movement_type} {w_m1.delta_display}",
        "Count": f"Stock 20 pcs -> {count_veg.stock_quantity_grams} pcs, Movement: {c_m1.movement_type} {c_m1.delta_display}"
    }))
    print(f"Result Step 2: {'PASS' if step2_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 3: CANCEL - Cancel Order 1 before delivery & confirm full restoration
    # =========================================================================
    print("--- STEP 3: CANCEL (Order Cancellation & Stock Restoration) ---")
    order1.transition_to(VegetableOrder.Status.CANCELLED)

    weight_veg.refresh_from_db()
    count_veg.refresh_from_db()

    w_m_cancel = VegetableStockMovement.objects.filter(vegetable=weight_veg, movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION).latest("created_at")
    c_m_cancel = VegetableStockMovement.objects.filter(vegetable=count_veg, movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_CANCELLATION).latest("created_at")

    print(f"After Cancel Weight: Stock={weight_veg.stock_quantity_grams}g (Expected 2000g), Movement delta={w_m_cancel.delta_grams}g (display='{w_m_cancel.delta_display}')")
    print(f"After Cancel Count:  Stock={count_veg.stock_quantity_grams} pcs (Expected 20 pcs), Movement delta={c_m_cancel.delta_grams} pcs (display='{c_m_cancel.delta_display}')")

    step3_pass = (weight_veg.stock_quantity_grams == 2000 and w_m_cancel.delta_grams == 500 and
                  count_veg.stock_quantity_grams == 20 and c_m_cancel.delta_grams == 5)
    results.append(("Step 3: Order Cancellation Restore", "PASS" if step3_pass else "FAIL", {
        "Weight": f"Stock 1500g -> {weight_veg.stock_quantity_grams}g, Movement: {w_m_cancel.movement_type} {w_m_cancel.delta_display}",
        "Count": f"Stock 15 pcs -> {count_veg.stock_quantity_grams} pcs, Movement: {c_m_cancel.movement_type} {c_m_cancel.delta_display}"
    }))
    print(f"Result Step 3: {'PASS' if step3_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 4: RETURNS - Order 2 -> Deliver -> Replacement & Refund+Restock
    # =========================================================================
    print("--- STEP 4: RETURNS (Replacement & Refund with Restock) ---")
    w_order2_qty = 400  # 400g total
    c_order2_qty = 4    # 4 pcs total

    order2 = VegetableOrder.objects.create(
        customer=customer_user,
        status=VegetableOrder.Status.PLACED,
        total_amount=Decimal("120.00"),
        delivery_address="Audit Test Address 2",
    )
    # 200g returned line + 200g kept line
    oi_w2 = VegetableOrderItem.objects.create(
        order=order2,
        package=weight_pkg,
        quantity_grams=200,
        unit_basis="WEIGHT",
        unit_label="g",
        unit_price_snapshot=Decimal("20.00"),
        line_amount=Decimal("20.00"),
    )
    VegetableOrderItem.objects.create(
        order=order2,
        package=weight_pkg,
        quantity_grams=200,
        unit_basis="WEIGHT",
        unit_label="g",
        unit_price_snapshot=Decimal("20.00"),
        line_amount=Decimal("20.00"),
    )

    # 2 pcs returned line + 2 pcs kept line
    oi_c2 = VegetableOrderItem.objects.create(
        order=order2,
        package=count_pkg,
        quantity_grams=2,
        unit_basis="COUNT",
        unit_label="pcs",
        unit_price_snapshot=Decimal("10.00"),
        line_amount=Decimal("20.00"),
    )
    VegetableOrderItem.objects.create(
        order=order2,
        package=count_pkg,
        quantity_grams=2,
        unit_basis="COUNT",
        unit_label="pcs",
        unit_price_snapshot=Decimal("10.00"),
        line_amount=Decimal("20.00"),
    )

    reserve_stock_for_booking_items(
        items=[
            {"product": weight_pkg, "quantity": w_order2_qty, "unit": "g"},
            {"product": count_pkg, "quantity": c_order2_qty, "unit": "pcs"},
        ],
        company=weight_veg.org,
        booking_ref=order2.order_number,
    )

    # Deliver order2
    order2.transition_to(VegetableOrder.Status.PACKED)
    order2.transition_to(VegetableOrder.Status.OUT_FOR_DELIVERY)
    order2.transition_to(VegetableOrder.Status.DELIVERED)

    weight_veg.refresh_from_db()
    count_veg.refresh_from_db()
    print(f"Order 2 Delivered: Weight Stock={weight_veg.stock_quantity_grams}g (Expected 1600g), Count Stock={count_veg.stock_quantity_grams} pcs (Expected 16 pcs)")

    # 4a: Return on Weight Product: 200g -> REPLACEMENT (deducts 200g additional stock)
    w_return_qty = 200
    ret_w = VegetableReturn.objects.create(
        order=order2,
        item=oi_w2,
        customer=customer_user,
        reason=VegetableReturn.Reason.POOR_QUALITY,
        status=VegetableReturn.Status.REQUESTED,
        customer_notes="Bruised gourd",
    )
    # Admin resolves as REPLACEMENT via API endpoint
    ret_w_resp = client.post(
        f"/api/vegetable-orders/admin/returns/{ret_w.id}/action/",
        {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
            "admin_notes": "Replacement sent",
        },
        format="json"
    )
    assert ret_w_resp.status_code == 200, f"Return Replacement failed: {ret_w_resp.data}"

    weight_veg.refresh_from_db()
    w_m_repl = VegetableStockMovement.objects.filter(vegetable=weight_veg, movement_type=VegetableStockMovement.MovementType.RETURN_REPLACEMENT).latest("created_at")
    print(f"Return 1 (Replacement) Weight: Stock={weight_veg.stock_quantity_grams}g (Expected 1400g), Movement delta={w_m_repl.delta_grams}g (display='{w_m_repl.delta_display}')")

    # Idempotency check: try resolving same return again
    ret_w_resp2 = client.post(
        f"/api/vegetable-orders/admin/returns/{ret_w.id}/action/",
        {
            "status": "RESOLVED",
            "resolution_action": "REPLACEMENT",
            "admin_notes": "Replacement sent duplicate check",
        },
        format="json"
    )
    weight_veg.refresh_from_db()
    w_repl_idempotent = (weight_veg.stock_quantity_grams == 1400)
    print(f"Idempotency Check (Weight Replacement): Stock={weight_veg.stock_quantity_grams}g (Unchanged at 1400g: {w_repl_idempotent})")

    # 4b: Return on Count Product: 2 pcs -> REFUND with restock_item=True (adds 2 pcs back to stock)
    c_return_qty = 2
    ret_c = VegetableReturn.objects.create(
        order=order2,
        item=oi_c2,
        customer=customer_user,
        reason=VegetableReturn.Reason.DAMAGED_OR_SPOILED,
        status=VegetableReturn.Status.REQUESTED,
        customer_notes="2 extra lemons returned",
    )
    # Admin resolves as REFUND + Restock
    ret_c_resp = client.post(
        f"/api/vegetable-orders/admin/returns/{ret_c.id}/action/",
        {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "restock_item": True,
            "refund_amount": "20.00",
            "admin_notes": "Refund approved and restocked",
        },
        format="json"
    )
    assert ret_c_resp.status_code == 200, f"Return Refund failed: {ret_c_resp.data}"

    count_veg.refresh_from_db()
    c_m_restock = VegetableStockMovement.objects.filter(vegetable=count_veg, movement_type=VegetableStockMovement.MovementType.RESTOCKED_ON_RETURN).latest("created_at")
    print(f"Return 2 (Refund + Restock) Count: Stock={count_veg.stock_quantity_grams} pcs (Expected 18 pcs), Movement delta={c_m_restock.delta_grams} pcs (display='{c_m_restock.delta_display}')")

    # Idempotency check: try resolving count return again
    ret_c_resp2 = client.post(
        f"/api/vegetable-orders/admin/returns/{ret_c.id}/action/",
        {
            "status": "RESOLVED",
            "resolution_action": "REFUND",
            "restock_item": True,
            "refund_amount": "20.00",
            "admin_notes": "Duplicate check",
        },
        format="json"
    )
    count_veg.refresh_from_db()
    c_refund_idempotent = (count_veg.stock_quantity_grams == 18)
    print(f"Idempotency Check (Count Refund+Restock): Stock={count_veg.stock_quantity_grams} pcs (Unchanged at 18 pcs: {c_refund_idempotent})")

    step4_pass = (weight_veg.stock_quantity_grams == 1400 and w_m_repl.delta_grams == -200 and w_repl_idempotent and
                  count_veg.stock_quantity_grams == 18 and c_m_restock.delta_grams == 2 and c_refund_idempotent)
    results.append(("Step 4: Returns (Replacement & Refund+Restock)", "PASS" if step4_pass else "FAIL", {
        "Weight": f"Stock 1600g -> {weight_veg.stock_quantity_grams}g (-200g replacement deduction), Movement: {w_m_repl.movement_type} {w_m_repl.delta_display}, Idempotent={w_repl_idempotent}",
        "Count": f"Stock 16 pcs -> {count_veg.stock_quantity_grams} pcs (+2 pcs refund restock), Movement: {c_m_restock.movement_type} {c_m_restock.delta_display}, Idempotent={c_refund_idempotent}"
    }))
    print(f"Result Step 4: {'PASS' if step4_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 5: CLAIMS - File Claim & Approve (Write-off with floor at 0)
    # =========================================================================
    print("--- STEP 5: CLAIMS (Spoilage Write-Off & Floor at 0) ---")
    # Claim 1: Bottle Gourd 100g spoilage
    w_claim_qty = 100
    claim_w_resp = client.post(
        "/api/inventory/vegetables/claims/",
        {
            "vegetable_id": weight_veg.id,
            "quantity": w_claim_qty,
            "unit": "g",
            "reason": "WAREHOUSE_SPOILAGE",
            "notes": "End-to-end audit spoilage",
        },
        format="json"
    )
    assert claim_w_resp.status_code == 201, f"Create Weight Claim failed: {claim_w_resp.data}"
    w_claim_id = claim_w_resp.data["data"]["id"]

    # Approve Claim 1
    claim_w_appr = client.post(
        f"/api/inventory/vegetables/claims/{w_claim_id}/action/",
        {"action": "APPROVE", "notes": "Approved in audit"},
        format="json"
    )
    assert claim_w_appr.status_code == 200, f"Approve Weight Claim failed: {claim_w_appr.data}"

    weight_veg.refresh_from_db()
    w_m_claim = VegetableStockMovement.objects.filter(vegetable=weight_veg, movement_type=VegetableStockMovement.MovementType.CLAIM_WRITEOFF).latest("created_at")
    print(f"After Claim 1 Weight: Stock={weight_veg.stock_quantity_grams}g (Expected 1300g), Movement delta={w_m_claim.delta_grams}g (display='{w_m_claim.delta_display}')")

    # Claim 2: Fresh Lemon 3 pcs spoilage
    c_claim_qty = 3
    claim_c_resp = client.post(
        "/api/inventory/vegetables/claims/",
        {
            "vegetable_id": count_veg.id,
            "quantity": c_claim_qty,
            "unit": "pcs",
            "reason": "WAREHOUSE_SPOILAGE",
            "notes": "End-to-end audit lemon spoilage",
        },
        format="json"
    )
    assert claim_c_resp.status_code == 201, f"Create Count Claim failed: {claim_c_resp.data}"
    c_claim_id = claim_c_resp.data["data"]["id"]

    # Approve Claim 2
    claim_c_appr = client.post(
        f"/api/inventory/vegetables/claims/{c_claim_id}/action/",
        {"action": "APPROVE", "notes": "Approved in audit"},
        format="json"
    )
    assert claim_c_appr.status_code == 200, f"Approve Count Claim failed: {claim_c_appr.data}"

    count_veg.refresh_from_db()
    c_m_claim = VegetableStockMovement.objects.filter(vegetable=count_veg, movement_type=VegetableStockMovement.MovementType.CLAIM_WRITEOFF).latest("created_at")
    print(f"After Claim 2 Count:  Stock={count_veg.stock_quantity_grams} pcs (Expected 15 pcs), Movement delta={c_m_claim.delta_grams} pcs (display='{c_m_claim.delta_display}')")

    # Claim Floor at 0 Test: create excessive claim on a dummy stock vegetable
    temp_veg = Vegetable.objects.create(
        org=weight_veg.org,
        name="Floor Test Vegetable",
        unit="g",
        unit_basis="WEIGHT",
        stock_quantity_grams=50,
    )
    claim_floor_resp = client.post(
        "/api/inventory/vegetables/claims/",
        {
            "vegetable_id": temp_veg.id,
            "quantity": 200,
            "unit": "g",
            "reason": "INVENTORY_DISCREPANCY",
            "notes": "Testing floor at 0",
        },
        format="json"
    )
    temp_claim_id = claim_floor_resp.data["data"]["id"]
    client.post(f"/api/inventory/vegetables/claims/{temp_claim_id}/action/", {"action": "APPROVE"})
    temp_veg.refresh_from_db()
    floor_ok = (temp_veg.stock_quantity_grams == 0)
    print(f"Floor at 0 test: started with 50g, claimed 200g -> balance={temp_veg.stock_quantity_grams}g (Expected 0g: {floor_ok})")
    temp_veg.delete()

    step5_pass = (weight_veg.stock_quantity_grams == 1300 and w_m_claim.delta_grams == -100 and
                  count_veg.stock_quantity_grams == 15 and c_m_claim.delta_grams == -3 and floor_ok)
    results.append(("Step 5: Claims Approval Write-Off", "PASS" if step5_pass else "FAIL", {
        "Weight": f"Stock 1400g -> {weight_veg.stock_quantity_grams}g (-100g spoilage), Movement: {w_m_claim.movement_type} {w_m_claim.delta_display}",
        "Count": f"Stock 18 pcs -> {count_veg.stock_quantity_grams} pcs (-3 pcs spoilage), Movement: {c_m_claim.movement_type} {c_m_claim.delta_display}",
        "FloorAtZero": f"Excess claim floored to 0: {floor_ok}"
    }))
    print(f"Result Step 5: {'PASS' if step5_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 6: CROSS-CHECK - Mathematical ledger arithmetic reconciliation
    # =========================================================================
    print("--- STEP 6: CROSS-CHECK (Mathematical Arithmetic Reconciliation) ---")
    
    # Weight Item Calculation:
    # 2000g (Start) - 500g (Order 1) + 500g (Cancel 1) - 400g (Order 2) - 200g (Return Repl) - 100g (Claim) = 1300g
    expected_w_final = 2000 - 500 + 500 - 400 - 200 - 100
    actual_w_db = weight_veg.stock_quantity_grams

    # Count Item Calculation:
    # 20 pcs (Start) - 5 pcs (Order 1) + 5 pcs (Cancel 1) - 4 pcs (Order 2) + 2 pcs (Return Restock) - 3 pcs (Claim) = 15 pcs
    expected_c_final = 20 - 5 + 5 - 4 + 2 - 3
    actual_c_db = count_veg.stock_quantity_grams

    # Inventory Table check
    fresh_pkgs = list(Package.objects.filter(id__in=[weight_pkg.id, count_pkg.id]).select_related("stock_item"))
    overview_final = get_bulk_admin_stock_status(fresh_pkgs)
    w_final_ov = overview_final[weight_pkg.id]
    c_final_ov = overview_final[count_pkg.id]

    print(f"Weight Arithmetic: Expected={expected_w_final}g, DB={actual_w_db}g, Table Display='{w_final_ov['today_available_display']}'")
    print(f"Count Arithmetic:  Expected={expected_c_final} pcs, DB={actual_c_db} pcs, Table Display='{c_final_ov['today_available_display']}'")

    w_arith_ok = (actual_w_db == expected_w_final and w_final_ov["today_available_grams"] == expected_w_final)
    c_arith_ok = (actual_c_db == expected_c_final and c_final_ov["today_available_grams"] == expected_c_final)

    step6_pass = w_arith_ok and c_arith_ok
    results.append(("Step 6: Running Arithmetic Cross-Check", "PASS" if step6_pass else "FAIL", {
        "Weight": f"2000 - 500 + 500 - 400 - 200 + 0 - 100 = {expected_w_final}g | Actual DB = {actual_w_db}g (Match: {w_arith_ok})",
        "Count": f"20 - 5 + 5 - 4 + 0 + 2 - 3 = {expected_c_final} pcs | Actual DB = {actual_c_db} pcs (Match: {c_arith_ok})"
    }))
    print(f"Result Step 6: {'PASS' if step6_pass else 'FAIL'}\n")

    # =========================================================================
    # STEP 7: LOW-STOCK ALERT (Dashboard) - Threshold alert trigger & clearing
    # =========================================================================
    print("--- STEP 7: LOW-STOCK ALERT DASHBOARD (Threshold Alerts) ---")
    
    # 7a: Current state: Weight stock is 1300g, reorder threshold is 400g -> should NOT be low stock
    dash_resp1 = client.get("/api/vegetable-orders/admin/dashboard/")
    assert dash_resp1.status_code == 200
    alerts1 = dash_resp1.data.get("low_stock_alerts", [])
    w_in_alerts1 = any(item["id"] == weight_veg.id for item in alerts1)
    print(f"State 1 (Stock=1300g, Threshold=400g): In low stock alerts? {w_in_alerts1} (Expected: False)")

    # 7b: Drop stock to 300g (below 400g threshold) via Edit Details -> should APPEAR in low stock alerts
    client.patch(
        f"/api/inventory/vegetable-stock/{weight_pkg.id}/update-details/",
        {
            "current_stock_quantity": 300,
            "current_stock_unit": "g",
            "reorder_level_quantity": 400,
            "reorder_level_unit": "g",
        },
        format="json"
    )
    dash_resp2 = client.get("/api/vegetable-orders/admin/dashboard/")
    alerts2 = dash_resp2.data.get("low_stock_alerts", [])
    w_in_alerts2 = any(item["id"] == weight_veg.id for item in alerts2)
    print(f"State 2 (Stock=300g, Threshold=400g): In low stock alerts? {w_in_alerts2} (Expected: True)")

    # 7c: Restock back to 1000g (above 400g threshold) -> should CLEAR from low stock alerts
    client.patch(
        f"/api/inventory/vegetable-stock/{weight_pkg.id}/update-details/",
        {
            "current_stock_quantity": 1000,
            "current_stock_unit": "g",
            "reorder_level_quantity": 400,
            "reorder_level_unit": "g",
        },
        format="json"
    )
    dash_resp3 = client.get("/api/vegetable-orders/admin/dashboard/")
    alerts3 = dash_resp3.data.get("low_stock_alerts", [])
    w_in_alerts3 = any(item["id"] == weight_veg.id for item in alerts3)
    print(f"State 3 (Stock=1000g, Threshold=400g): In low stock alerts? {w_in_alerts3} (Expected: False)")

    step7_pass = (not w_in_alerts1) and w_in_alerts2 and (not w_in_alerts3)
    results.append(("Step 7: Dashboard Low-Stock Alert Trigger & Clear", "PASS" if step7_pass else "FAIL", {
        "AboveThreshold (1300g > 400g)": f"In Alert = {w_in_alerts1} (Pass: {not w_in_alerts1})",
        "BelowThreshold (300g <= 400g)": f"In Alert = {w_in_alerts2} (Pass: {w_in_alerts2})",
        "RestoredAboveThreshold (1000g > 400g)": f"In Alert = {w_in_alerts3} (Pass: {not w_in_alerts3})"
    }))
    print(f"Result Step 7: {'PASS' if step7_pass else 'FAIL'}\n")

    # =========================================================================
    # SUMMARY TABLE
    # =========================================================================
    print("================================================================================")
    print("                            AUDIT SUMMARY TABLE                                ")
    print("================================================================================")
    all_passed = True
    for step_name, status_val, details in results:
        status_flag = "[ PASS ]" if status_val == "PASS" else "[ FAIL ]"
        if status_val != "PASS":
            all_passed = False
        print(f"{status_flag} {step_name}")
        for k, v in details.items():
            print(f"         * {k}: {v}")
    print("================================================================================")
    print(f"OVERALL AUDIT VERDICT: {'ALL 7 STEPS PASSED PERFECTLY' if all_passed else 'SOME STEPS FAILED'}")
    print("================================================================================")

    return all_passed

if __name__ == '__main__':
    success = run_audit()
    sys.exit(0 if success else 1)
