from django.db import connection

cur = connection.cursor()

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='service_requests_addon' ORDER BY column_name")
print('ADDON COLUMNS:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name IN ('service_requests_bookingaddon','service_requests_serviceaddon','service_requests_workextensionitem')")
print('TABLES PRESENT:', [r[0] for r in cur.fetchall()])

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='service_requests_workextensionitem' ORDER BY column_name")
print('WORKEXTENSIONITEM COLUMNS:', [r[0] for r in cur.fetchall()])
