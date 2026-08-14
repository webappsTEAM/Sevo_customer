import os
import sys
import django
from decimal import Decimal

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from django.db import connection

def format_val(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    if isinstance(val, Decimal):
        return f"{val:.6f}" if abs(val) < 180 and "0" in str(val) else f"{val:.2f}"
    val_str = str(val).replace("\r", " ").replace("\n", " ").strip()
    if len(val_str) > 35:
        return val_str[:32] + "..."
    return val_str

def print_table(title, headers, rows):
    print("\n" + "=" * 100)
    print(f" {title.upper()}")
    print("=" * 100)
    if not rows:
        print(" (No records found)")
        return

    # Calculate column widths
    col_widths = [len(h) for h in headers]
    formatted_rows = []
    for row in rows:
        formatted_row = [format_val(v) for v in row]
        formatted_rows.append(formatted_row)
        for i, v in enumerate(formatted_row):
            col_widths[i] = max(col_widths[i], len(v))

    # Format string
    header_line = " | ".join(f"{h:<{w}}" for h, w in zip(headers, col_widths))
    sep_line = "-+-".join("-" * w for w in col_widths)

    print(header_line)
    print(sep_line)
    for r in formatted_rows:
        print(" | ".join(f"{v:<{w}}" for v, w in zip(r, col_widths)))

def inspect_db():
    with connection.cursor() as cursor:
        # -------------------------------------------------------------
        # 1. DATABASE SCHEMA REPORT
        # -------------------------------------------------------------
        cursor.execute("""
            SELECT 
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                tc.constraint_type,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.columns c
            LEFT JOIN information_schema.key_column_usage kcu 
                ON c.table_name = kcu.table_name AND c.column_name = kcu.column_name
            LEFT JOIN information_schema.table_constraints tc 
                ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
            LEFT JOIN information_schema.constraint_column_usage ccu 
                ON tc.constraint_name = ccu.constraint_name AND tc.constraint_type = 'FOREIGN KEY'
            WHERE c.table_name IN ('service_requests_servicerequest', 'service_requests_employeejob')
            ORDER BY c.table_name, c.ordinal_position;
        """)
        schema_rows = cursor.fetchall()
        schema_headers = ["TABLE_NAME", "COLUMN_NAME", "DATA_TYPE", "NULLABLE", "CONSTRAINT", "FOREIGN_TABLE", "FOREIGN_COLUMN"]
        print_table("1. Database Schema Report", schema_headers, schema_rows)

        # -------------------------------------------------------------
        # 2. SERVICE_REQUESTS_SERVICEREQUEST TABLE (LATEST 20)
        # -------------------------------------------------------------
        cursor.execute("""
            SELECT 
                id, request_id, customer_id, customer_name, phone, email,
                service_category, issue_title, description, address,
                latitude, longitude, preferred_date, preferred_time,
                payment_method, payment_status, total_amount, status,
                created_at, updated_at
            FROM service_requests_servicerequest
            ORDER BY id DESC
            LIMIT 20;
        """)
        sr_rows = cursor.fetchall()
        sr_headers = [
            "ID", "REQUEST_ID", "CUSTOMER_ID", "CUSTOMER_NAME", "PHONE", "EMAIL",
            "SERVICE_CATEGORY", "ISSUE_TITLE", "DESCRIPTION", "ADDRESS",
            "LATITUDE", "LONGITUDE", "PREFERRED_DATE", "PREFERRED_TIME",
            "PAYMENT_METHOD", "PAYMENT_STATUS", "TOTAL_AMOUNT", "STATUS",
            "CREATED_AT", "UPDATED_AT"
        ]
        print_table("2. Table: service_requests_servicerequest (Latest 20)", sr_headers, sr_rows)

        # -------------------------------------------------------------
        # 3. SERVICE_REQUESTS_EMPLOYEEJOB TABLE (LATEST 20)
        # -------------------------------------------------------------
        cursor.execute("""
            SELECT 
                id, service_request_id, employee_id, assigned_by_id,
                is_primary, status, assigned_date, accepted_date,
                started_date, completed_date
            FROM service_requests_employeejob
            ORDER BY id DESC
            LIMIT 20;
        """)
        empjob_rows = cursor.fetchall()
        empjob_headers = [
            "ID", "SERVICE_REQUEST_ID", "EMPLOYEE_ID", "ASSIGNED_BY_ID",
            "IS_PRIMARY", "STATUS", "ASSIGNED_DATE", "ACCEPTED_DATE",
            "STARTED_DATE", "COMPLETED_DATE"
        ]
        print_table("3. Table: service_requests_employeejob (Latest 20)", empjob_headers, empjob_rows)

        # -------------------------------------------------------------
        # 4. JOINED BOOKING + EMPLOYEE ASSIGNMENT REPORT (LATEST 20)
        # -------------------------------------------------------------
        cursor.execute("""
            SELECT 
                j.id AS employee_job_id,
                j.employee_id,
                sr.id AS booking_db_id,
                sr.request_id,
                sr.customer_name,
                sr.service_category,
                sr.issue_title,
                sr.address,
                sr.latitude,
                sr.longitude,
                sr.preferred_date,
                sr.preferred_time,
                sr.payment_method,
                sr.payment_status,
                sr.total_amount,
                sr.status AS booking_status,
                j.status AS job_status,
                sr.created_at,
                sr.updated_at
            FROM service_requests_servicerequest sr
            LEFT JOIN service_requests_employeejob j ON j.service_request_id = sr.id
            ORDER BY sr.id DESC
            LIMIT 20;
        """)
        joined_rows = cursor.fetchall()
        joined_headers = [
            "EMPLOYEE_JOB_ID", "EMPLOYEE_ID", "BOOKING_DB_ID", "REQUEST_ID",
            "CUSTOMER_NAME", "SERVICE_CATEGORY", "ISSUE_TITLE", "ADDRESS",
            "LATITUDE", "LONGITUDE", "PREFERRED_DATE", "PREFERRED_TIME",
            "PAYMENT_METHOD", "PAYMENT_STATUS", "TOTAL_AMOUNT",
            "BOOKING_STATUS", "JOB_STATUS", "CREATED_AT", "UPDATED_AT"
        ]
        print_table("4. Joined Booking + Employee Assignment (Latest 20)", joined_headers, joined_rows)

        # -------------------------------------------------------------
        # 5. RELATIONSHIP & DATA INTEGRITY CHECKS
        # -------------------------------------------------------------
        # Check 1: ServiceRequests without EmployeeJobs
        cursor.execute("""
            SELECT sr.id, sr.request_id, sr.customer_name, sr.status, sr.created_at
            FROM service_requests_servicerequest sr
            LEFT JOIN service_requests_employeejob j ON j.service_request_id = sr.id
            WHERE j.id IS NULL
            ORDER BY sr.id DESC LIMIT 10;
        """)
        c1_rows = cursor.fetchall()
        print_table("5.1 Check: ServiceRequests without EmployeeJobs (Unassigned / Pending)", 
                    ["ID", "REQUEST_ID", "CUSTOMER_NAME", "STATUS", "CREATED_AT"], c1_rows)

        # Check 2: EmployeeJobs without a valid ServiceRequest
        cursor.execute("""
            SELECT j.id, j.service_request_id, j.employee_id, j.status
            FROM service_requests_employeejob j
            LEFT JOIN service_requests_servicerequest sr ON sr.id = j.service_request_id
            WHERE sr.id IS NULL;
        """)
        c2_rows = cursor.fetchall()
        print_table("5.2 Check: Orphan EmployeeJobs (Without valid ServiceRequest)", 
                    ["JOB_ID", "SERVICE_REQUEST_ID", "EMPLOYEE_ID", "STATUS"], c2_rows)

        # Check 3: EmployeeJobs without an employee
        cursor.execute("""
            SELECT j.id, j.service_request_id, j.status
            FROM service_requests_employeejob j
            WHERE j.employee_id IS NULL;
        """)
        c3_rows = cursor.fetchall()
        print_table("5.3 Check: EmployeeJobs without an Employee ID", 
                    ["JOB_ID", "SERVICE_REQUEST_ID", "STATUS"], c3_rows)

        # Check 4: Assigned bookings without an assigned employee
        cursor.execute("""
            SELECT id, request_id, customer_name, status, assigned_employee_id
            FROM service_requests_servicerequest
            WHERE status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed')
              AND assigned_employee_id IS NULL;
        """)
        c4_rows = cursor.fetchall()
        print_table("5.4 Check: Assigned Bookings missing assigned_employee_id FK", 
                    ["ID", "REQUEST_ID", "CUSTOMER_NAME", "STATUS", "ASSIGNED_EMPLOYEE_ID"], c4_rows)

        # Check 5: Bookings with missing latitude/longitude
        cursor.execute("""
            SELECT id, request_id, customer_name, address, status
            FROM service_requests_servicerequest
            WHERE latitude IS NULL OR longitude IS NULL
            ORDER BY id DESC LIMIT 10;
        """)
        c5_rows = cursor.fetchall()
        print_table("5.5 Check: Bookings missing Latitude/Longitude Coordinates", 
                    ["ID", "REQUEST_ID", "CUSTOMER_NAME", "ADDRESS", "STATUS"], c5_rows)

        # Check 6: Duplicate EmployeeJobs for the same ServiceRequest (where is_primary=True)
        cursor.execute("""
            SELECT service_request_id, COUNT(*) as cnt
            FROM service_requests_employeejob
            WHERE is_primary = TRUE
            GROUP BY service_request_id
            HAVING COUNT(*) > 1;
        """)
        c6_rows = cursor.fetchall()
        print_table("5.6 Check: Duplicate Primary EmployeeJobs per ServiceRequest", 
                    ["SERVICE_REQUEST_ID", "PRIMARY_JOB_COUNT"], c6_rows)

        # -------------------------------------------------------------
        # 6. SUMMARY COUNT STATISTICS
        # -------------------------------------------------------------
        cursor.execute("SELECT COUNT(*) FROM service_requests_servicerequest;")
        sr_total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM service_requests_employeejob;")
        empjob_total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM service_requests_servicerequest WHERE status IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed');")
        assigned_total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM service_requests_servicerequest WHERE status NOT IN ('assigned', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed');")
        unassigned_total = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM service_requests_servicerequest WHERE latitude IS NULL OR longitude IS NULL;")
        missing_coords_total = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) 
            FROM service_requests_employeejob j
            LEFT JOIN service_requests_servicerequest sr ON sr.id = j.service_request_id
            WHERE sr.id IS NULL;
        """)
        orphan_jobs_total = cursor.fetchone()[0]

        cursor.execute("""
            SELECT COUNT(*) 
            FROM service_requests_servicerequest 
            WHERE status NOT IN ('draft', 'new_request', 'pending_payment', 'waiting_for_payment', 'confirmed', 'reviewed', 'assigned', 'received', 'accepted', 'on_the_way', 'arrived', 'in_progress', 'completed', 'awaiting_verification', 'verified', 'feedback_pending', 'feedback_received', 'closed', 'rejected', 'cancelled', 'rescheduled', 'rework_requested', 'follow_up_required');
        """)
        invalid_status_total = cursor.fetchone()[0]

        print("\n" + "=" * 60)
        print("CALSERVICES DATABASE INSPECTION")
        print("=" * 60)
        print(f"ServiceRequests found: {sr_total}")
        print(f"EmployeeJobs found: {empjob_total}")
        print(f"Assigned bookings: {assigned_total}")
        print(f"Unassigned bookings: {unassigned_total}")
        print(f"Bookings missing coordinates: {missing_coords_total}")
        print(f"Orphan EmployeeJobs: {orphan_jobs_total}")
        print(f"Invalid status records: {invalid_status_total}")
        print("=" * 60)
        print("DATABASE INSPECTION COMPLETE")
        print("=" * 60 + "\n")

if __name__ == "__main__":
    inspect_db()
