import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus, PaymentPolicy

ELECTRICIAN_SUBSERVICES = [
    {
        "name": "Switches & Sockets",
        "slug": "switches-sockets",
        "icon": "Zap",
        "image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&q=80&fit=crop",
        "description": "Switch replacement, heavy 16A/25A appliance sockets & 3-pin bedside socket fixes",
        "sort_order": 1,
        "packages": [
            {
                "name": "Switch / Socket Replacement",
                "slug": "switch-socket-replacement",
                "tag": "Quick Fix",
                "base_price": Decimal("149.00"),
                "duration": "30 mins",
                "description": "Replacement or new fitting of modular switch, 6A/16A socket, or regulator.",
                "includes": ["Old socket removal & new fit", "Earth voltage verification", "30-day warranty"]
            },
            {
                "name": "Heavy Appliance Socket (16A/25A)",
                "slug": "heavy-appliance-socket",
                "tag": "Heavy Load",
                "base_price": Decimal("249.00"),
                "duration": "45 mins",
                "description": "High-grade 16A power socket installation for AC, Geyser, Washing Machine, or Oven.",
                "includes": ["Heavy wire stripping & terminal clamp", "MCB safety check"]
            },
            {
                "name": "Bedside Switchboard / 3-Pin Socket Fix",
                "slug": "bedside-switchboard-fix",
                "tag": "Daily Fix",
                "base_price": Decimal("199.00"),
                "duration": "30 mins",
                "description": "Fix loose contact socket, burnt switch plate, or add new extension point.",
                "includes": ["Internal wire tightening", "Insulation sleeve fit", "Voltage load check"]
            }
        ]
    },
    {
        "name": "Fan & Lighting",
        "slug": "fan-lighting",
        "icon": "Sun",
        "image": "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=300&q=80&fit=crop",
        "description": "Ceiling fans, regulators, noise/wobble repairs, exhaust fans, LED panels & chandeliers",
        "sort_order": 2,
        "packages": [
            {
                "name": "Ceiling Fan Repair / Fitting",
                "slug": "ceiling-fan-repair-fitting",
                "tag": "Best Seller",
                "base_price": Decimal("249.00"),
                "duration": "45 mins",
                "description": "Ceiling fan installation, downrod assembly, canopy alignment & safety wire hook mounting.",
                "includes": ["New fan mounting & downrod fit", "Safety wire hook installation", "Speed & balance test"]
            },
            {
                "name": "Fan Regulator / Speed Switch Replacement",
                "slug": "fan-regulator-switch-replacement",
                "tag": "Quick Fix",
                "base_price": Decimal("149.00"),
                "duration": "30 mins",
                "description": "Replace burnt or non-working step regulator knob to restore 5-speed fan control.",
                "includes": ["Modular regulator replace", "Terminal insulation check", "5-speed current test"]
            },
            {
                "name": "Fan Noise, Wobble & Bearing Repair",
                "slug": "fan-noise-wobble-repair",
                "tag": "Troubleshooting",
                "base_price": Decimal("199.00"),
                "duration": "45 mins",
                "description": "Fix squeaking/humming fan noise, bearing lubrication, blade angle adjustment & wobble clamp.",
                "includes": ["Bearing greasing/lubrication", "Blade pitch alignment", "Noise & wobble elimination"]
            },
            {
                "name": "Fan Slow Speed / Capacitor Change",
                "slug": "fan-slow-speed-capacitor",
                "tag": "Essential",
                "base_price": Decimal("299.00"),
                "duration": "45 mins",
                "description": "Fix slow rotating fan caused by degraded capacitor or coil resistance.",
                "includes": ["Heavy capacitor replacement", "Winding resistance test", "High speed rotation verification"]
            },
            {
                "name": "Exhaust Fan Installation / Repair",
                "slug": "exhaust-fan-install-repair",
                "tag": "Popular",
                "base_price": Decimal("249.00"),
                "duration": "45 mins",
                "description": "Kitchen or bathroom exhaust fan wall mounting, shutter flap adjustment, and motor wiring.",
                "includes": ["Exhaust fan wall fit", "Vibration pad insertion", "Air flow test"]
            },
            {
                "name": "LED Spot Light / Panel Light Fitting",
                "slug": "led-spot-panel-light",
                "tag": "Lighting",
                "base_price": Decimal("149.00"),
                "duration": "30 mins",
                "description": "False ceiling LED panel cut-out fitting, driver replacement, or tube light mounting.",
                "includes": ["LED driver connection", "Spring clip flush fit", "Illumination check"]
            },
            {
                "name": "Decorative Chandelier & Hanging Lamp",
                "slug": "chandelier-hanging-lamp",
                "tag": "Heavy Decor",
                "base_price": Decimal("499.00"),
                "duration": "1 hr",
                "description": "Heavy ceiling fastener anchor drilling, chandelier wire assembly, and glass shade assembly.",
                "includes": ["Ceiling anchor bolt fitting", "Wire harness connection", "Weight load check"]
            }
        ]
    },
    {
        "name": "MCB & Wiring",
        "slug": "mcb-wiring",
        "icon": "ShieldAlert",
        "image": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=300&q=80&fit=crop",
        "description": "MCB breaker replacement, overload trips, short-circuit diagnostics & full room wiring checks",
        "sort_order": 3,
        "packages": [
            {
                "name": "MCB Fuse Breaker Replacement",
                "slug": "mcb-fuse-breaker-replacement",
                "tag": "Safety Essential",
                "base_price": Decimal("399.00"),
                "duration": "45 mins",
                "description": "Single/Double pole MCB replacement to stop frequent tripping & electrical overload.",
                "includes": ["Tripping diagnosis", "Single/Double Pole MCB fit", "Distribution board check"]
            },
            {
                "name": "Full Room Safety Wiring Check",
                "slug": "full-room-safety-wiring",
                "tag": "Comprehensive",
                "base_price": Decimal("699.00"),
                "duration": "1.5 hrs",
                "description": "Complete earthing verification, phase leakage test, and heavy load cabling report.",
                "includes": ["Neutral & Earth leakage test", "Short circuit safety scan", "Digital safety report"]
            }
        ]
    },
    {
        "name": "Inverter & Heavy Appliance",
        "slug": "inverter-heavy-appliance",
        "icon": "Zap",
        "image": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&q=80&fit=crop",
        "description": "Inverter wiring, battery terminal greasing, backup bypass switch & heavy stabilizer setup",
        "sort_order": 4,
        "packages": [
            {
                "name": "Inverter & Battery Setup",
                "slug": "inverter-battery-setup",
                "tag": "Heavy Power",
                "base_price": Decimal("499.00"),
                "duration": "1 hr",
                "description": "Inverter wall connection, battery terminal grease, bypass switch setup & load division.",
                "includes": ["Heavy terminal wiring", "Distilled water top-up check", "Automatic switchover test"]
            }
        ]
    }
]

def sync_electrician():
    print("Syncing Electrician sub-services and packages...")
    cat = CatalogCategory.objects.filter(slug="electrician_plumbing_carpentry").first()
    if not cat:
        cat = CatalogCategory.objects.create(
            name="Electrician, Plumbing & Carpentry",
            slug="electrician_plumbing_carpentry",
            sort_order=2,
            is_active=True
        )

    for s_data in ELECTRICIAN_SUBSERVICES:
        service, _ = Service.objects.update_or_create(
            slug=s_data["slug"],
            defaults={
                "category": cat,
                "name": s_data["name"],
                "icon": s_data["icon"],
                "image": s_data["image"],
                "description": s_data["description"],
                "sort_order": s_data["sort_order"],
                "is_active": True
            }
        )
        print(f"Service: {service.name} ({service.slug})")

        for p_data in s_data["packages"]:
            pkg, _ = Package.objects.update_or_create(
                slug=p_data["slug"],
                defaults={
                    "service": service,
                    "name": p_data["name"],
                    "tag": p_data.get("tag", ""),
                    "base_price": p_data["base_price"],
                    "duration": p_data["duration"],
                    "description": p_data["description"],
                    "includes": p_data.get("includes", []),
                    "status": PackageStatus.ACTIVE,
                    "payment_policy": PaymentPolicy.BOTH,
                    "popular": True
                }
            )
            print(f"  * Package: {pkg.name} (INR {pkg.base_price})")

    # Clean up duplicate legacy generic 'electrical' or 'electrician' if desired
    legacy = Service.objects.filter(slug__in=["electrician", "electrical"]).all()
    for l in legacy:
        if not l.packages.exists() and l.slug not in [s["slug"] for s in ELECTRICIAN_SUBSERVICES]:
            print(f"Removing empty legacy service: {l.name}")
            l.delete()

    print("Electrician sub-services synchronized successfully!")

if __name__ == '__main__':
    sync_electrician()
