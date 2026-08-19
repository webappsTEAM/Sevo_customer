import os
import sys
import django
from datetime import datetime, timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import ServiceRequest
from service_requests.views import _build_tracking_payload
from django.db import connection

print('=== 1. CREATING/RESOLVING TEST SERVICE REQUEST ===')
sr = ServiceRequest.objects.filter(request_id='SR-VERIFY-001').first()
if not sr:
    sr = ServiceRequest.objects.create(
        request_id='SR-VERIFY-001',
        customer_name='Ananya Sharma',
        phone='9876543210',
        email='ananya@example.com',
        service_category='ac_repair',
        issue_title='AC Cooling Issue & General Service',
        address='123 Koramangala 4th Block, Bengaluru',
        latitude=12.9352,
        longitude=77.6245,
        preferred_date=datetime.now().date(),
        status='on_the_way',
    )
else:
    sr.status = 'on_the_way'
    sr.save()

# Assign employee 7206
with connection.cursor() as cursor:
    cursor.execute('UPDATE service_requests_servicerequest SET assigned_employee_id = 7206 WHERE id = %s', [sr.id])
    
    # 2. Tracking session
    cursor.execute('''
        INSERT INTO workforce_job_tracking_session (job_id, employee_id, company_id, status, started_at, consecutive_arrival_fixes, last_latitude, last_longitude, last_heading, last_speed, last_accuracy, last_captured_at, last_received_at, created_at, updated_at)
        VALUES (%s, 7206, 1, 'ACTIVE', NOW(), 0, 12.9715, 77.5945, 45.0, 5.5, 3.2, NOW(), NOW(), NOW(), NOW())
        ON CONFLICT DO NOTHING;
    ''', [sr.id])
    cursor.execute('SELECT id FROM workforce_job_tracking_session WHERE job_id = %s ORDER BY id DESC LIMIT 1', [sr.id])
    session_id = cursor.fetchone()[0]

print(f'1. ServiceRequest: {sr.request_id} (ID: {sr.id})')
print(f'2. Assigned Employee ID: 7206')
print(f'3. Workforce Job ID: WFJ-{sr.request_id}')
print(f'4. Tracking Session ID: {session_id}')

# 5. GPS A
print('\n=== GPS A ===')
with connection.cursor() as cursor:
    cursor.execute('''
        UPDATE workforce_job_tracking_session 
        SET last_latitude = 12.9715, last_longitude = 77.5945, last_heading = 45.0, last_speed = 5.5, last_captured_at = NOW(), last_received_at = NOW()
        WHERE id = %s
    ''', [session_id])
    cursor.execute('''
        INSERT INTO workforce_job_location_point (tracking_session_id, job_id, employee_id, latitude, longitude, heading, speed, accuracy, captured_at, received_at, sequence_number, created_at)
        VALUES (%s, %s, 7206, 12.9715, 77.5945, 45.0, 5.5, 3.2, NOW(), NOW(), 1, NOW())
    ''', [session_id, sr.id])

sr.refresh_from_db()
pA = _build_tracking_payload(sr, has_full_access=True)
lat_a = pA['technician']['latitude']
lng_a = pA['technician']['longitude']
head_a = pA['technician_location']['heading']
speed_a = pA['technician_location']['speed']
tech_a = pA['technician']['name']
print(f'GPS A Sent: (12.9715, 77.5945, heading=45.0, speed=5.5)')
print(f'API Returned: Lat: {lat_a}, Lng: {lng_a}, Heading: {head_a}, Speed: {speed_a}, Technician: {tech_a}')
assert lat_a == 12.9715
assert lng_a == 77.5945
assert head_a == 45.0
assert speed_a == 5.5
assert tech_a == 'Ravi Kumar'

# 6. GPS B
print('\n=== GPS B ===')
with connection.cursor() as cursor:
    cursor.execute('''
        UPDATE workforce_job_tracking_session 
        SET last_latitude = 12.9725, last_longitude = 77.5955, last_heading = 50.0, last_speed = 6.2, last_captured_at = NOW(), last_received_at = NOW()
        WHERE id = %s
    ''', [session_id])
    cursor.execute('''
        INSERT INTO workforce_job_location_point (tracking_session_id, job_id, employee_id, latitude, longitude, heading, speed, accuracy, captured_at, received_at, sequence_number, created_at)
        VALUES (%s, %s, 7206, 12.9725, 77.5955, 50.0, 6.2, 3.0, NOW(), NOW(), 2, NOW())
    ''', [session_id, sr.id])

sr.refresh_from_db()
pB = _build_tracking_payload(sr, has_full_access=True)
lat_b = pB['technician']['latitude']
lng_b = pB['technician']['longitude']
head_b = pB['technician_location']['heading']
speed_b = pB['technician_location']['speed']
print(f'GPS B Sent: (12.9725, 77.5955, heading=50.0, speed=6.2)')
print(f'API Returned: Lat: {lat_b}, Lng: {lng_b}, Heading: {head_b}, Speed: {speed_b}')
assert lat_b == 12.9725
assert lng_b == 77.5955
assert head_b == 50.0
assert speed_b == 6.2

# 7. GPS C
print('\n=== GPS C ===')
with connection.cursor() as cursor:
    cursor.execute('''
        UPDATE workforce_job_tracking_session 
        SET last_latitude = 12.9735, last_longitude = 77.5965, last_heading = 55.0, last_speed = 6.8, last_captured_at = NOW(), last_received_at = NOW()
        WHERE id = %s
    ''', [session_id])
    cursor.execute('''
        INSERT INTO workforce_job_location_point (tracking_session_id, job_id, employee_id, latitude, longitude, heading, speed, accuracy, captured_at, received_at, sequence_number, created_at)
        VALUES (%s, %s, 7206, 12.9735, 77.5965, 55.0, 6.8, 2.8, NOW(), NOW(), 3, NOW())
    ''', [session_id, sr.id])

sr.refresh_from_db()
pC = _build_tracking_payload(sr, has_full_access=True)
lat_c = pC['technician']['latitude']
lng_c = pC['technician']['longitude']
head_c = pC['technician_location']['heading']
speed_c = pC['technician_location']['speed']
print(f'GPS C Sent: (12.9735, 77.5965, heading=55.0, speed=6.8)')
print(f'API Returned: Lat: {lat_c}, Lng: {lng_c}, Heading: {head_c}, Speed: {speed_c}')
assert lat_c == 12.9735
assert lng_c == 77.5965
assert head_c == 55.0
assert speed_c == 6.8

# 8. Arrival State
print('\n=== ARRIVED ===')
sr.status = 'arrived'
sr.save(update_fields=['status'])
pArr = _build_tracking_payload(sr, has_full_access=True)
print(f"Status: {pArr['status']}, ETA: {pArr['technician']['eta_minutes']}, Distance: {pArr['technician']['distance_km']}, Start OTP: {pArr['start_otp']}")
assert pArr['status'] == 'arrived'
assert pArr['technician']['eta_minutes'] == 0
assert pArr['start_otp'] is not None

# 9. In Progress State
print('\n=== IN PROGRESS ===')
sr.status = 'in_progress'
sr.save(update_fields=['status'])
pProg = _build_tracking_payload(sr, has_full_access=True)
print(f"Status: {pProg['status']}, ETA: {pProg['technician']['eta_minutes']}, Distance: {pProg['technician']['distance_km']}")
assert pProg['status'] == 'in_progress'

# 10. Completed State
print('\n=== COMPLETED ===')
sr.status = 'completed'
sr.save(update_fields=['status'])
pComp = _build_tracking_payload(sr, has_full_access=True)
print(f"Status: {pComp['status']}, Freshness: {pComp['freshness']}, Tech Loc: {pComp['technician_location']}, Tech Lat: {pComp['technician']['latitude']}")
assert pComp['status'] == 'completed'
assert pComp['technician_location'] is None
assert pComp['technician']['latitude'] is None
assert pComp['freshness'] == 'COMPLETED'

print('\n========================================================')
print('E2E REAL TELEMETRY & LIFECYCLE TRACE COMPLETED 100% OK!')
print('========================================================')
