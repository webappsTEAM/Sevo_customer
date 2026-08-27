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

def sync_prices():
    print("Aligning package and vehicle prices with customer services...")

    # 1. Update/Ensure Goods & Transports ServiceTiers
    tiers_data = [
        {"slug": "3-wheeler", "name": "3 Wheeler", "capacity_label": "500kg", "starting_price": Decimal("160.00"), "weight_class": "light", "category": "mini_truck"},
        {"slug": "tata-ace", "name": "Tata Ace", "capacity_label": "750kg", "starting_price": Decimal("205.00"), "weight_class": "light", "category": "mini_truck"},
        {"slug": "pickup-8ft", "name": "Pickup 8ft", "capacity_label": "1250 kg", "starting_price": Decimal("300.00"), "weight_class": "heavy", "category": "mini_truck"},
        {"slug": "1-7-ton", "name": "1.7 ton", "capacity_label": "1700 kg", "starting_price": Decimal("380.00"), "weight_class": "heavy", "category": "mini_truck"},
        {"slug": "2-wheeler", "name": "2 Wheeler", "capacity_label": "20 kg", "starting_price": Decimal("48.00"), "weight_class": "light", "category": "two_wheeler"},
        {"slug": "2-wheeler-electric-express", "name": "2 Wheeler Electric / Express", "capacity_label": "20 kg", "starting_price": Decimal("55.00"), "weight_class": "light", "category": "two_wheeler"},
    ]

    for td in tiers_data:
        tier, _ = ServiceTier.objects.update_or_create(
            slug=td["slug"],
            defaults={
                "name": td["name"],
                "capacity_label": td["capacity_label"],
                "starting_price": td["starting_price"],
                "weight_class": td["weight_class"],
                "category": td["category"],
                "is_active": True
            }
        )
        print(f"ServiceTier: {tier.name} -> INR {tier.starting_price}")

    # 2. Synchronize Package table under Goods & Transports
    truck_svc = Service.objects.filter(slug="truck").first()
    two_wheeler_svc = Service.objects.filter(slug="two-wheeler").first()
    packers_svc = Service.objects.filter(slug="packers-movers").first()

    # Delete old outdated truck packages with incorrect prices (550, 950, 350)
    if truck_svc:
        Package.objects.filter(service=truck_svc).delete()
        truck_packages = [
            {"slug": "3-wheeler", "name": "3 Wheeler (500kg)", "base_price": Decimal("160.00"), "duration": "15 mins", "tag": "Light Load", "description": "5ft x 6ft cargo bed, ideal for groceries, small appliances & up to 500kg parcels."},
            {"slug": "tata-ace", "name": "Tata Ace (750kg)", "base_price": Decimal("205.00"), "duration": "20 mins", "tag": "Best Seller", "description": "6ft x 7ft bed, ideal for 1 BHK furniture, refrigerators & business stock up to 750kg."},
            {"slug": "pickup-8ft", "name": "Pickup 8ft (1250 kg)", "base_price": Decimal("300.00"), "duration": "20 mins", "tag": "Coming Soon", "description": "5.5ft x 8ft covered bed, ideal for sofas, double beds & commercial inventory up to 1250kg."},
            {"slug": "1-7-ton", "name": "1.7 ton (1700 kg)", "base_price": Decimal("380.00"), "duration": "30 mins", "tag": "Coming Soon", "description": "6.1ft x 9ft heavy Bolero bed for industrial machinery & large commercial loads up to 1700kg."},
        ]
        for tp in truck_packages:
            Package.objects.create(
                service=truck_svc,
                slug=tp["slug"],
                name=tp["name"],
                base_price=tp["base_price"],
                offer_price=None,
                duration=tp["duration"],
                tag=tp["tag"],
                description=tp["description"],
                status=PackageStatus.ACTIVE,
                payment_policy=PaymentPolicy.BOTH,
                popular=True
            )
            print(f"  Package Truck: {tp['name']} -> INR {tp['base_price']}")

    if two_wheeler_svc:
        Package.objects.filter(service=two_wheeler_svc).delete()
        two_wheeler_packages = [
            {"slug": "2-wheeler", "name": "2 Wheeler Parcel Delivery (20 kg)", "base_price": Decimal("48.00"), "duration": "15 mins", "tag": "Fast Dispatch", "description": "Small parcels, documents, grocery boxes & light local deliveries up to 20 kg."},
            {"slug": "2-wheeler-electric-express", "name": "2 Wheeler Electric / Express (20 kg)", "base_price": Decimal("55.00"), "duration": "12 mins", "tag": "Eco Express", "description": "Zero emission electric delivery for urgent documents, medicines, and packages up to 20 kg."},
        ]
        for twp in two_wheeler_packages:
            Package.objects.create(
                service=two_wheeler_svc,
                slug=twp["slug"],
                name=twp["name"],
                base_price=twp["base_price"],
                offer_price=None,
                duration=twp["duration"],
                tag=twp["tag"],
                description=twp["description"],
                status=PackageStatus.ACTIVE,
                payment_policy=PaymentPolicy.BOTH,
                popular=True
            )
            print(f"  Package Two Wheeler: {twp['name']} -> INR {twp['base_price']}")

    if packers_svc:
        Package.objects.filter(service=packers_svc).delete()
        packers_packages = [
            {"slug": "1-rk-1-bhk-shifting", "name": "1 RK / 1 BHK Shifting", "base_price": Decimal("1499.00"), "duration": "3 hrs", "tag": "Popular", "description": "Complete packing, loading, transport & unloading for 1 RK / 1 BHK households with bubble wrap protection."},
            {"slug": "2-bhk-3-bhk-shifting", "name": "2 BHK / 3 BHK Shifting", "base_price": Decimal("2999.00"), "duration": "5 hrs", "tag": "Best Value", "description": "Multi-layer packing, disassembly, dedicated large truck & safety transit for 2 to 3 BHK homes."},
            {"slug": "villa-office-relocation", "name": "Villa / Office Relocation", "base_price": Decimal("4499.00"), "duration": "1 day", "tag": "Comprehensive", "description": "Full corporate office or luxury villa shifting with dedicated moving crew and transit insurance."},
        ]
        for pmp in packers_packages:
            Package.objects.create(
                service=packers_svc,
                slug=pmp["slug"],
                name=pmp["name"],
                base_price=pmp["base_price"],
                offer_price=None,
                duration=pmp["duration"],
                tag=pmp["tag"],
                description=pmp["description"],
                status=PackageStatus.ACTIVE,
                payment_policy=PaymentPolicy.BOTH,
                popular=True
            )
            print(f"  Package Packers & Movers: {pmp['name']} -> INR {pmp['base_price']}")

    print("Customer prices synchronized perfectly!")

if __name__ == '__main__':
    sync_prices()
