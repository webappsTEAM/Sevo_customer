import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Coupon
from rest_framework.test import APIRequestFactory
from service_requests.views import CustomerCouponValidateView, CouponDetailView

factory = APIRequestFactory()

print("=========================================================")
print("  STEP 1: Set Coupon WELCOME100 Discount = Rs.100 in DB")
print("=========================================================")
cpn, _ = Coupon.objects.get_or_create(code="WELCOME100")
cpn.discount_value = 100.00
cpn.min_booking = 499.00
cpn.customer_eligibility = "All Customers"
cpn.status = "Active"
cpn.save()
print(f"DB Record Updated: Code={cpn.code}, Discount=Rs.{cpn.discount_value}")

print("\n=========================================================")
print("  STEP 2: Customer Validates WELCOME100 for Cart Rs.599")
print("=========================================================")
request = factory.post('/api/customer/coupons/validate/', {"code": "WELCOME100", "cart_total": 599}, format='json')
response = CustomerCouponValidateView.as_view()(request)
print("Validation API Response:", response.data["data"])
print(f"Calculated Discount Amount: Rs.{response.data['data']['discountAmount']}")
assert response.data['data']['discountAmount'] == 100.0, "Expected Rs.100 discount!"

print("\n=========================================================")
print("  STEP 3: Admin Updates WELCOME100 Discount = Rs.150 in DB")
print("=========================================================")
cpn.discount_value = 150.00
cpn.save()
print(f"DB Record Updated: Code={cpn.code}, New Discount=Rs.{cpn.discount_value}")

print("\n=========================================================")
print("  STEP 4: Customer Re-Validates WELCOME100 for Cart Rs.599")
print("=========================================================")
request = factory.post('/api/customer/coupons/validate/', {"code": "WELCOME100", "cart_total": 599}, format='json')
response = CustomerCouponValidateView.as_view()(request)
print("Validation API Response:", response.data["data"])
print(f"Calculated Discount Amount: Rs.{response.data['data']['discountAmount']}")
assert response.data['data']['discountAmount'] == 150.0, "Expected Rs.150 discount!"

print("\n=========================================================")
print("  SUCCESS: End-to-End Dynamic Updates Verified 100%!")
print("=========================================================")
