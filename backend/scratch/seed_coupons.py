import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Coupon

INITIAL_COUPONS = [
  {
    "code": "WELCOME100",
    "name": "First Order Discount",
    "description": "Get ₹100 OFF on your first booking",
    "discount_type": "flat",
    "discount_value": 100,
    "max_discount": 100,
    "customer_eligibility": "New Customers Only",
    "order_type": "First Order Only",
    "service_eligibility": "All Services",
    "min_booking": 499,
    "usage_per_customer": 1,
    "total_usage_limit": 1000,
    "current_usage": 142,
    "stacking": "No",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "status": "Active"
  },
  {
    "code": "SUMMER500",
    "name": "Summer AC Mega Saver",
    "description": "Get flat ₹500 OFF on full home AC servicing & gas refill",
    "discount_type": "flat",
    "discount_value": 500,
    "max_discount": 500,
    "customer_eligibility": "All Customers",
    "order_type": "Any Order",
    "service_eligibility": "Selected Category (AC & Heating)",
    "min_booking": 1999,
    "usage_per_customer": 2,
    "total_usage_limit": 500,
    "current_usage": 310,
    "stacking": "No",
    "start_date": "2026-04-01",
    "end_date": "2026-08-31",
    "status": "Active"
  },
  {
    "code": "ACFEST20",
    "name": "Festival 20% Discount",
    "description": "Get 20% OFF up to ₹300 on appliance check-up",
    "discount_type": "percentage",
    "discount_value": 20,
    "max_discount": 300,
    "customer_eligibility": "Existing Customers",
    "order_type": "Any Order",
    "service_eligibility": "Selected Category (Appliance Repair)",
    "min_booking": 799,
    "usage_per_customer": 1,
    "total_usage_limit": 300,
    "current_usage": 0,
    "stacking": "Yes",
    "start_date": "2026-09-01",
    "end_date": "2026-10-15",
    "status": "Scheduled"
  },
  {
    "code": "CLEAN15",
    "name": "Deep Cleaning Special",
    "description": "15% OFF on full house deep cleaning packages",
    "discount_type": "percentage",
    "discount_value": 15,
    "max_discount": 250,
    "customer_eligibility": "All Customers",
    "order_type": "Any Order",
    "service_eligibility": "Selected Category (Cleaning)",
    "min_booking": 599,
    "usage_per_customer": 1,
    "total_usage_limit": 200,
    "current_usage": 89,
    "stacking": "No",
    "start_date": "2026-02-01",
    "end_date": "2026-06-30",
    "status": "Paused"
  },
  {
    "code": "FESTIVE200",
    "name": "Diwali Fest Offer",
    "description": "Flat ₹200 OFF on home repairs & plumbing",
    "discount_type": "flat",
    "discount_value": 200,
    "max_discount": 200,
    "customer_eligibility": "All Customers",
    "order_type": "Any Order",
    "service_eligibility": "All Services",
    "min_booking": 999,
    "usage_per_customer": 1,
    "total_usage_limit": 1000,
    "current_usage": 1000,
    "stacking": "No",
    "start_date": "2025-10-01",
    "end_date": "2025-11-15",
    "status": "Expired"
  }
]

created_count = 0
for data in INITIAL_COUPONS:
    c, created = Coupon.objects.get_or_create(code=data["code"], defaults=data)
    if created:
        created_count += 1
        print(f"Created coupon {c.code}")
    else:
        print(f"Coupon {c.code} already exists")

print(f"Total Coupons in Database: {Coupon.objects.count()}")
