import os
import sys
import django

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection
from service_requests.models import Coupon, CouponCategory, CouponService, CouponPackage, CouponUsage, ServiceRequest

with connection.schema_editor() as schema_editor:
    print("Creating junction and usage tables...")
    for model in [CouponCategory, CouponService, CouponPackage, CouponUsage]:
        try:
            schema_editor.create_model(model)
            print(f"{model.__name__} table created successfully!")
        except Exception as e:
            print(f"Notice for {model.__name__}: {e}")

    # Add columns to ServiceRequest if missing
    with connection.cursor() as cursor:
        cursor.execute("""
            ALTER TABLE service_requests_servicerequest 
            ADD COLUMN IF NOT EXISTS coupon_id integer REFERENCES service_requests_coupon(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS coupon_code_snapshot varchar(50) DEFAULT '',
            ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS subtotal_amount numeric(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS final_amount numeric(10,2) DEFAULT 0.00;
        """)
        print("ServiceRequest coupon fields verified!")

