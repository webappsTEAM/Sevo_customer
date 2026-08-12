import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus, PaymentPolicy
from logistics.models import ServiceTier

def fix():
    print("Fixing all Truck packages and ServiceTiers...")

    # 1. Update ServiceTiers in logistics
    tiers = [
        {"slug": "3-wheeler", "name": "3 Wheeler", "capacity_label": "500kg", "starting_price": Decimal("160.00"), "weight_class": "light", "category": "mini_truck"},
        {"slug": "tata-ace", "name": "Tata Ace", "capacity_label": "750kg", "starting_price": Decimal("205.00"), "weight_class": "light", "category": "mini_truck"},
        {"slug": "pickup-8ft", "name": "Pickup 8ft", "capacity_label": "1250 kg", "starting_price": Decimal("300.00"), "weight_class": "heavy", "category": "mini_truck"},
        {"slug": "1-7-ton", "name": "1.7 ton", "capacity_label": "1700 kg", "starting_price": Decimal("380.00"), "weight_class": "heavy", "category": "mini_truck"},
    ]

    for t in tiers:
        st, _ = ServiceTier.objects.update_or_create(
            slug=t["slug"],
            defaults={
                "name": t["name"],
                "capacity_label": t["capacity_label"],
                "starting_price": t["starting_price"],
                "weight_class": t["weight_class"],
                "category": t["category"],
                "is_active": True
            }
        )
        print(f"ServiceTier: {st.name} -> INR {st.starting_price}")

    # Remove any unwanted ServiceTiers like tata-407 if not in customer UI
    ServiceTier.objects.filter(slug="tata-407").delete()

    # 2. Find all services related to Truck
    truck_services = Service.objects.filter(slug__in=["truck", "mini-truck"]).all()
    if not truck_services.exists():
        goods_cat = CatalogCategory.objects.filter(slug="goods_transports").first()
        truck_svc = Service.objects.create(category=goods_cat, name="Truck", slug="truck", is_active=True, sort_order=1)
        truck_services = [truck_svc]

    for ts in truck_services:
        # Delete all old packages for this service
        Package.objects.filter(service=ts).delete()
        print(f"Cleaned old packages for service: {ts.name}")

        # Insert exact 4 packages
        exact_packages = [
            {
                "slug": "3-wheeler",
                "name": "3 Wheeler (500kg)",
                "base_price": Decimal("160.00"),
                "duration": "15 mins",
                "tag": "Light Load",
                "description": "5ft x 6ft cargo bed, ideal for groceries, small appliances & up to 500kg parcels."
            },
            {
                "slug": "tata-ace",
                "name": "Tata Ace (750kg)",
                "base_price": Decimal("205.00"),
                "duration": "20 mins",
                "tag": "Best Seller",
                "description": "6ft x 7ft bed, ideal for 1 BHK furniture, refrigerators & business stock up to 750kg."
            },
            {
                "slug": "pickup-8ft",
                "name": "Pickup 8ft (1250 kg)",
                "base_price": Decimal("300.00"),
                "duration": "20 mins",
                "tag": "Heavy (above 750kg)",
                "description": "5.5ft x 8ft covered bed, ideal for sofas, double beds & commercial inventory up to 1250kg."
            },
            {
                "slug": "1-7-ton",
                "name": "1.7 ton (1700 kg)",
                "base_price": Decimal("380.00"),
                "duration": "30 mins",
                "tag": "Heavy (above 750kg)",
                "description": "6.1ft x 9ft heavy Bolero bed for industrial machinery & large commercial loads up to 1700kg."
            },
        ]

        for ep in exact_packages:
            pkg = Package.objects.create(
                service=ts,
                slug=ep["slug"],
                name=ep["name"],
                base_price=ep["base_price"],
                offer_price=None,
                duration=ep["duration"],
                tag=ep["tag"],
                description=ep["description"],
                status=PackageStatus.ACTIVE,
                payment_policy=PaymentPolicy.BOTH,
                popular=True
            )
            print(f"Created exact package: {pkg.name} with price INR {pkg.base_price}")

    print("All Truck packages successfully updated to 160, 205, 300, 380!")

if __name__ == '__main__':
    fix()
