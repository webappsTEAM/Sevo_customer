import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import Max
from service_requests.models import Package

def reset_sequence():
    max_id = Package.objects.aggregate(max_id=Max('id'))['max_id'] or 0
    next_id = max_id + 1
    cursor = connection.cursor()
    cursor.execute(f"ALTER SEQUENCE service_requests_package_id_seq RESTART WITH {next_id}")
    print(f"   [Sequence reset] Next ID will be: {next_id}")

def fix_and_seed():
    print("1. Deleting all packages where service_id is NULL...")
    deleted_count, _ = Package.objects.order_by().filter(service__isnull=True).delete()
    print(f"   Deleted {deleted_count} orphaned packages.")
    reset_sequence()

    print("\n2. Seeding Goods & Transports packages...")
    from align_customer_prices import sync_prices
    sync_prices()
    reset_sequence()

    print("\n3. Seeding Home Services & Pest Control packages...")
    from seed_all_home_services import seed as seed_home
    seed_home()
    reset_sequence()

    print("\n4. Seeding Kitchen packages...")
    from seed_kitchen_packages import seed as seed_kitchen
    seed_kitchen()
    reset_sequence()

    print("\n5. Seeding Paintings packages...")
    reseed_painting = __import__(
        'service_requests.migrations.0031_reseed_painting_services_and_packages',
        fromlist=['reseed_painting_catalog']
    )
    reseed_painting.reseed_painting_catalog(apps, None)
    reset_sequence()

    print("\nSeeding complete!")

if __name__ == '__main__':
    fix_and_seed()
