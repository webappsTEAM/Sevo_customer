import os
import sys
import django

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import ServiceRequest
from service_requests.views import _build_tracking_payload
from django.db import connection

sr = ServiceRequest.objects.get(id=2205)
print("Before:", sr.technician_name, sr.technician_phone, sr.technician_latitude, sr.technician_longitude)

with connection.cursor() as cursor:
    cursor.execute(
        """
        SELECT e.id, u.first_name, u.last_name, COALESCE(NULLIF(e.phone, ''), u.phone, ''), u.avatar
        FROM service_requests_servicerequest sr_inner
        JOIN employees_employee e ON e.id = sr_inner.assigned_employee_id
        LEFT JOIN accounts_user u ON u.id = e.user_id
        WHERE sr_inner.id = %s
        """,
        [sr.id],
    )
    emp_row = cursor.fetchone()
    print("Emp row:", emp_row)
    if emp_row:
        first_name = emp_row[1] or ""
        last_name = emp_row[2] or ""
        full_name = f"{first_name} {last_name}".strip()
        sr.technician_name = full_name
        sr.technician_phone = emp_row[3] or ""
        if emp_row[4]:
            sr.technician_photo = emp_row[4]

    cursor.execute(
        """
        SELECT last_latitude, last_longitude, last_captured_at
        FROM workforce_job_tracking_session
        WHERE job_id = %s
        ORDER BY id DESC LIMIT 1
        """,
        [sr.id],
    )
    sess_row = cursor.fetchone()
    print("Sess row:", sess_row)
    if sess_row and sess_row[0] is not None and sess_row[1] is not None:
        sr.technician_latitude = float(sess_row[0])
        sr.technician_longitude = float(sess_row[1])
        if sess_row[2]:
            sr.technician_last_seen_at = sess_row[2]

sr.save()
print("After save:", sr.technician_name, sr.technician_phone, sr.technician_latitude, sr.technician_longitude)

payload = _build_tracking_payload(sr, has_full_access=True)
import json
print("Payload output:")
print(json.dumps(payload, indent=2, default=str))
