import urllib.request
import json
import uuid
import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_customer_id_persistence():
    print("=" * 80)
    print("CUSTOMER_ID PERSISTENCE & JOIN QUERY VERIFICATION")
    print("=" * 80)

    # Find or create an authenticated customer user in accounts_user table
    test_phone = "9042334343"
    auth_customer = User.objects.filter(phone=test_phone, role=User.Role.CUSTOMER).first()
    if not auth_customer:
        auth_customer = User.objects.create(
            username="test_gokul_customer",
            first_name="Gokul",
            last_name="Customer",
            phone=test_phone,
            email="gokul.authenticated@example.com",
            role=User.Role.CUSTOMER
        )

    print(f"\n[AUTHENTICATED CUSTOMER IDENTITY]")
    print(f"  - accounts_user.id: {auth_customer.id}")
    print(f"  - username: {auth_customer.username}")
    print(f"  - phone: {auth_customer.phone}")
    print(f"  - email: {auth_customer.email}")

    # Generate JWT access token for this authenticated customer
    refresh = RefreshToken.for_user(auth_customer)
    access_token = str(refresh.access_token)

    url = "http://127.0.0.1:8000/api/booking/"
    boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "Authorization": f"Bearer {access_token}"
    }

    cart_items = [
        {"id": "ac-repair-01", "name": "AC Repair — Split/Window", "price": 599, "quantity": 1}
    ]

    form_fields = {
        "customer_name": f"{auth_customer.first_name} {auth_customer.last_name}".strip(),
        "phone": auth_customer.phone,
        "email": auth_customer.email,
        "service_category": "hvac",
        "issue_title": "AC Repair — Split/Window",
        "description": "Authenticated customer ID persistence verification.",
        "address": "05, Bagalur Rd, KCC Nagar, Nallur, Tamil Nadu 635109, India",
        "latitude": "12.738910",
        "longitude": "77.824150",
        "preferred_date": "2026-08-16",
        "preferred_time": "06:00 PM",
        "total_amount": "599",
        "cart_data": json.dumps(cart_items),
        "payment_method": "COD"
    }

    body_bytes = bytearray()
    for name, value in form_fields.items():
        body_bytes.extend(f"--{boundary}\r\n".encode("utf-8"))
        body_bytes.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body_bytes.extend(f"{value}\r\n".encode("utf-8"))
    body_bytes.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(url, data=bytes(body_bytes), headers=headers, method="POST")

    new_req_id = None
    with urllib.request.urlopen(req) as resp:
        resp_data = resp.read().decode("utf-8")
        res_json = json.loads(resp_data)
        print("\n[BACKEND API RESPONSE]")
        print(json.dumps(res_json, indent=2))
        new_req_id = res_json.get("data", {}).get("request_id")

    assert new_req_id is not None, "FAILED: No request_id returned in API response"

    # Execute exact SQL query requested by user
    sql_query = """
        SELECT
            sr.id,
            sr.request_id,
            sr.customer_id,
            u.id AS user_id,
            sr.customer_name,
            sr.phone,
            sr.email
        FROM service_requests_servicerequest sr
        LEFT JOIN accounts_user u
            ON sr.customer_id = u.id
        WHERE sr.request_id = %s;
    """

    with connection.cursor() as cursor:
        cursor.execute(sql_query, [new_req_id])
        row = cursor.fetchone()
        columns = [col[0] for col in cursor.description]

    print("\n[SQL JOIN QUERY VERIFICATION RESULT FROM SUPABASE POSTGRESQL]")
    print(f"Query: WHERE sr.request_id = '{new_req_id}'\n")
    if row:
        for col, val in zip(columns, row):
            print(f"  {col:<15}: {val}")

        sr_id, request_id, customer_id, user_id, customer_name, phone, email = row

        print(f"\n[VERIFICATION CHECKS]")
        print(f"  - ServiceRequest DB ID : {sr_id}")
        print(f"  - Request ID           : {request_id}")
        print(f"  - ServiceRequest customer_id: {customer_id} (NON-NULL)")
        print(f"  - accounts_user user_id   : {user_id}")
        print(f"  - customer_id == user_id  : {customer_id == user_id and customer_id == auth_customer.id}")

        assert customer_id is not None, f"FAILED: customer_id is NULL"
        assert customer_id == auth_customer.id, f"FAILED: customer_id ({customer_id}) does not match authenticated accounts_user.id ({auth_customer.id})"
        assert customer_id == user_id, f"FAILED: customer_id ({customer_id}) does not match JOIN user_id ({user_id})"

        print("\n" + "=" * 80)
        print("CUSTOMER_ID PERSISTENCE VERIFICATION PASSED 100% IN POSTGRESQL!")
        print("=" * 80 + "\n")
    else:
        print(f"❌ No record found for request_id = '{new_req_id}'")

if __name__ == "__main__":
    test_customer_id_persistence()
