from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Read-only: reports which columns/tables from migration 0058 actually exist on the live DB."

    def handle(self, *args, **options):
        cur = connection.cursor()

        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='service_requests_addon' ORDER BY column_name"
        )
        print("ADDON COLUMNS:", [r[0] for r in cur.fetchall()])

        cur.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_name IN ('service_requests_bookingaddon','service_requests_serviceaddon','service_requests_workextensionitem')"
        )
        print("TABLES PRESENT:", [r[0] for r in cur.fetchall()])

        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='service_requests_workextensionitem' ORDER BY column_name"
        )
        print("WORKEXTENSIONITEM COLUMNS:", [r[0] for r in cur.fetchall()])
