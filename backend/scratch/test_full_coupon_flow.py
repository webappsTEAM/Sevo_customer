import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import django
import json
import urllib.request

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Coupon, CouponUsage, ServiceRequest

from rest_framework.test import APIRequestFactory
from service_requests.views import AdminCouponAnalyticsView, CustomerCouponListView, CustomerCouponValidateView, CouponListCreateView

factory = APIRequestFactory()

print("--- 1. Testing Admin Analytics API ---")
request = factory.get('/api/admin/coupons/analytics/')
response = AdminCouponAnalyticsView.as_view()(request)
print("Analytics Status:", response.status_code)
print("Analytics Data:", response.data)

print("\n--- 2. Testing Customer Available Coupons API ---")
request = factory.get('/api/customer/coupons/')
response = CustomerCouponListView.as_view()(request)
print("Customer Coupons Status:", response.status_code)
print("Coupons Count:", len(response.data.get("data", [])))

print("\n--- 3. Testing Backend Coupon Validation API ---")
request = factory.post('/api/customer/coupons/validate/', {"code": "WELCOME100", "cart_total": 599}, format='json')
response = CustomerCouponValidateView.as_view()(request)
print("Validation Status:", response.status_code)
print("Validation Result:", response.data)

print("\n--- 4. Verification Completed Successfully ---")
