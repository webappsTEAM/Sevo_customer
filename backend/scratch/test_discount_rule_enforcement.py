import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Coupon
from rest_framework.test import APIRequestFactory
from service_requests.views import CustomerCouponValidateView

factory = APIRequestFactory()

def run_test(test_name, disc_val, max_disc, cart_total, expected_disc, expected_final):
    print(f"\n--- Running {test_name} ---")
    cpn, _ = Coupon.objects.get_or_create(code="WELCOME100")
    cpn.discount_type = "flat"
    cpn.discount_value = disc_val
    cpn.max_discount = max_disc
    cpn.min_booking = 499.00
    cpn.customer_eligibility = "All Customers"
    cpn.status = "Active"
    cpn.save()
    print(f"DB Configured: Discount Value=Rs.{disc_val}, Max Discount=Rs.{max_disc}, Min Booking=Rs.499")

    request = factory.post('/api/customer/coupons/validate/', {"code": "WELCOME100", "cart_total": cart_total}, format='json')
    response = CustomerCouponValidateView.as_view()(request)
    data = response.data.get("data", {})
    
    disc_amount = data.get("discountAmount")
    final_amt = data.get("final_amount")

    print(f"Validation Result: Discount Amount=Rs.{disc_amount}, Final Amount=Rs.{final_amt}")
    assert response.status_code == 200, f"{test_name} Failed API Status"
    assert disc_amount == expected_disc, f"{test_name} Failed: Expected discount {expected_disc}, got {disc_amount}"
    assert final_amt == expected_final, f"{test_name} Failed: Expected final {expected_final}, got {final_amt}"
    print(f"PASSED {test_name} Successfully! (Discount={disc_amount}, Final={final_amt})")

print("=========================================================")
print("  ENFORCED DISCOUNT RULE VALIDATION SUITE")
print("=========================================================")

# Test A: discount_value=100, max_discount=100, subtotal=599 -> Expected: discount=100, final=499
run_test("Test A (Normal Cap Match)", 100.0, 100.0, 599.0, 100.0, 499.0)

# Test B: discount_value=150, max_discount=150, subtotal=599 -> Expected: discount=150, final=449
run_test("Test B (Uncapped High Savings)", 150.0, 150.0, 599.0, 150.0, 449.0)

# Test C: discount_value=150, max_discount=100, subtotal=599 -> Expected: discount=100, final=499 (max_discount enforced)
run_test("Test C (Max Discount Cap Enforced)", 150.0, 100.0, 599.0, 100.0, 499.0)

print("\n=========================================================")
print("  ALL 3 TEST SUITES PASSED 100%! RULE ENFORCEMENT VERIFIED")
print("=========================================================")
