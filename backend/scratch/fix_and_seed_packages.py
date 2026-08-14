import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.apps import apps
from django.db import connection
from django.db.models import Max
from service_requests.models import CatalogCategory, Service, Package, PackageStatus, PaymentPolicy

def reset_sequence():
    max_id = Package.objects.aggregate(max_id=Max('id'))['max_id'] or 0
    next_id = max_id + 1
    cursor = connection.cursor()
    cursor.execute(f"ALTER SEQUENCE service_requests_package_id_seq RESTART WITH {next_id}")
    print(f"   [Sequence reset] Next ID will be: {next_id}")

def seed_mason_packages():
    print("Seeding Masonry & Construction packages...")
    category = CatalogCategory.objects.filter(slug="mason").first()
    if not category:
        print("ERROR: 'mason' category not found.")
        return

    mason_structure = {
        "brick-block-work": [
            {
                "name": "Brick Wall Construction",
                "slug": "brick-new",
                "price": 1499,
                "duration": "Flexible",
                "tag": "Popular",
                "desc": "High-quality red clay brick masonry work with standard cement-mortar mix.",
                "includes": ["Red brick supply & laying", "Mortar alignment check", "Curing guidance"],
                "excludes": ["Plastering (available separately)", "Painting and structural slab work"],
                "tools": ["Trowel & mortar board", "Spirit level & plumb line", "Brick hammer"],
                "ready": ["Keep brick stacking area clear", "Ensure water source is available"],
                "reviews": [{"name": "Rajesh K.", "text": "Superb brick laying alignment. Level check was perfectly done.", "rating": "5.0"}],
                "faqs": [{"q": "Do you provide red bricks?", "a": "Yes, standard red bricks supply is included in the rate."}]
            },
            {
                "name": "Block Wall Construction",
                "slug": "brick-block",
                "price": 1799,
                "duration": "Flexible",
                "tag": "Lightweight",
                "desc": "AAC concrete block laying using thin-bed adhesive mortar for fast execution.",
                "includes": ["AAC block laying", "Block adhesive jointing", "Plumb alignment check"],
                "excludes": ["Foundation excavation", "Plastering"],
                "tools": ["Block saw", "Adhesive trowel", "Rubber mallet"],
                "ready": ["AAC blocks stacked at location", "Cement adhesive bags ready"],
                "reviews": [{"name": "Vikram S.", "text": "Very clean block work. Fast and efficient.", "rating": "4.8"}],
                "faqs": [{"q": "What is AAC block?", "a": "AAC (Autoclaved Aerated Concrete) blocks are lightweight and offer excellent thermal/acoustic insulation."}]
            },
            {
                "name": "Brick/Block Wall Repair",
                "slug": "brick-repair",
                "price": 499,
                "duration": "1-2 hrs",
                "tag": "",
                "desc": "Repair damaged bricks, crumbling mortar joints, and patch structural wall cracks.",
                "includes": ["Remove damaged bricks", "Mortar repointing", "New brick replacement"],
                "excludes": ["Entire wall reconstruction"],
                "tools": ["Chipping hammer", "Joint raker", "Pointing trowel"],
                "ready": ["Access to the damaged wall section", "Clear furniture away from wall"],
                "reviews": [{"name": "Anil M.", "text": "Repaired the cracked boundary wall brickwork beautifully.", "rating": "4.7"}],
                "faqs": [{"q": "Do you patch mortar?", "a": "Yes, joint repointing with fresh cement mortar is included."}]
            }
        ],
        "plastering-wall-repair": [
            {
                "name": "Wall Plastering",
                "slug": "plaster-new",
                "price": 499,
                "duration": "Flexible",
                "tag": "Flawless",
                "desc": "Smooth plastering for newly built brick or block walls to prepare for painting.",
                "includes": ["Surface wetting", "Cement slurry coat", "Cement-sand plastering", "Screeding & leveling"],
                "excludes": ["Wall putty application", "Painting"],
                "tools": ["Plastering trowel", "Floating rule", "Wooden float"],
                "ready": ["Ensure the wall surface is clean and free of dust", "Water supply active"],
                "reviews": [{"name": "Girish T.", "text": "Perfect level on our living room wall plastering. Ready for putty now.", "rating": "4.9"}],
                "faqs": [{"q": "How long does plaster take to cure?", "a": "It needs wet curing for 7 to 10 days for maximum strength."}]
            },
            {
                "name": "Plaster Repair",
                "slug": "plaster-dmg",
                "price": 349,
                "duration": "1-2 hrs",
                "tag": "",
                "desc": "Patch up specific areas of damp, peeling, or hollow plaster to restore smooth walls.",
                "includes": ["Chipping loose plaster", "Anti-dampness treatment", "Patch plastering & smoothing"],
                "excludes": ["Full room plastering"],
                "tools": ["Scraper & wire brush", "Chisel", "Finishing trowel"],
                "ready": ["Remove paintings and wall fixtures in the repair zone"],
                "reviews": [{"name": "Sanjay P.", "text": "Patched the damp plaster section near the bathroom wall perfectly.", "rating": "4.7"}],
                "faqs": [{"q": "Does this fix dampness?", "a": "We apply an anti-dampness base coat before patching, but fixing the source leakage is recommended."}]
            },
            {
                "name": "Crack Repair",
                "slug": "plaster-crack",
                "price": 399,
                "duration": "1 hr",
                "tag": "Heavy Duty",
                "desc": "Fix structural cracks on walls using professional bonding agents and epoxy/cement grout.",
                "includes": ["V-groove crack opening", "Bonding agent application", "Epoxy/cement grout filling"],
                "excludes": ["Foundation underpinning"],
                "tools": ["Angle grinder with diamond wheel", "Grout gun", "Putty knife"],
                "ready": ["Clear space near the cracked wall areas"],
                "reviews": [{"name": "Nitin R.", "text": "Filled the deep cracks using polymer mesh. High quality job.", "rating": "4.8"}],
                "faqs": [{"q": "Will the cracks reappear?", "a": "We use flexible polymer-modified crack filler which accommodates minor thermal expansion to prevent recurrence."}]
            }
        ],
        "wall-partition-construction": [
            {
                "name": "New Partition Wall",
                "slug": "part-internal",
                "price": 1999,
                "duration": "Flexible",
                "tag": "Sturdy",
                "desc": "Erect new internal partitioning walls for room modifications.",
                "includes": ["Base anchor setup", "Internal brick/block wall building", "Plaster coat finishing"],
                "excludes": ["Electrical box carving"],
                "tools": ["Hammer drill", "Chop saw", "Mixing paddle"],
                "ready": ["Floor plan layout marking completed"],
                "reviews": [{"name": "Rohan D.", "text": "Built a clean room partition wall in just two days.", "rating": "4.8"}],
                "faqs": [{"q": "Do you plaster both sides?", "a": "Yes, double-sided plastering with smooth finish is included."}]
            },
            {
                "name": "Room Partition",
                "slug": "part-room",
                "price": 1999,
                "duration": "Flexible",
                "tag": "Most Booked",
                "desc": "Construct sturdy internal room dividers using bricks or concrete blocks.",
                "includes": ["Partition plan layout", "Anchor setup", "Brick/block partition walls construction"],
                "excludes": ["Painting and electrical wiring"],
                "tools": ["Rebar anchors", "Mason line block", "Heavy mallet"],
                "ready": ["Approve partition layout diagram beforehand"],
                "reviews": [{"name": "Aman V.", "text": "Excellent divider construction. Solid sound insulation.", "rating": "4.9"}],
                "faqs": [{"q": "Is it soundproof?", "a": "Solid brick partitions offer very good sound insulation compared to drywall."}]
            },
            {
                "name": "Half-Wall Construction",
                "slug": "part-half",
                "price": 1499,
                "duration": "Flexible",
                "tag": "Trending",
                "desc": "Build custom half-height partition walls, kitchen borders, or breakfast counter bases.",
                "includes": ["Custom brick partitions", "Counter top support construction", "Breakfast counter base"],
                "excludes": ["Granite counter top installation"],
                "tools": ["Level bubble guide", "Steel rules", "Pointing steel trowel"],
                "ready": ["Have counter top dimensions ready if building a base"],
                "reviews": [{"name": "Sneha L.", "text": "Beautiful breakfast counter brick base. Level is spot on.", "rating": "5.0"}],
                "faqs": [{"q": "Can you install the granite top?", "a": "No, granite top supply and cutting is handled by kitchen fabricators."}]
            }
        ],
        "wall-breaking-demolition": [
            {
                "name": "Wall Breaking",
                "slug": "dem-wall",
                "price": 999,
                "duration": "Flexible",
                "tag": "Safety Certified",
                "desc": "Complete demolition of non-load bearing internal brick or block walls.",
                "includes": ["Temporary shoring pillars setup", "Complete wall demolition", "Debris packing & clearing"],
                "excludes": ["Permit collection fees"],
                "tools": ["Demolition jackhammer", "Sledgehammers", "Dust containment sheets"],
                "ready": ["Obtain society/building permission prior to start", "Ensure power is active"],
                "reviews": [{"name": "Vijay P.", "text": "Very safe execution. Used props to hold the ceiling while breaking. Cleaned up debris.", "rating": "4.9"}],
                "faqs": [{"q": "Do you break load-bearing walls?", "a": "No, we only demolish non-load bearing internal partitions for safety reasons."}]
            },
            {
                "name": "Partition Removal",
                "slug": "dem-rem",
                "price": 399,
                "duration": "1-2 hrs",
                "tag": "",
                "desc": "Demolish and clear internal masonry partitions or divider walls.",
                "includes": ["Demolishing partition walls", "Debris packing & clearing"],
                "excludes": ["Rebuilding walls"],
                "tools": ["Hand sledgehammer", "Chipping chisels", "Heavy duty bags"],
                "ready": ["Switch off close electrical points"],
                "reviews": [{"name": "Kiran J.", "text": "Removed our old toilet brick divider quickly. Dust control was good.", "rating": "4.7"}],
                "faqs": [{"q": "Is debris disposal included?", "a": "Debris packing is included. Disposal carting can be added separately."}]
            },
            {
                "name": "Door/Window Opening",
                "slug": "dem-opening",
                "price": 599,
                "duration": "2 hrs",
                "tag": "Precision Cut",
                "desc": "Create standard openings in existing brick/block walls for new door or window frames.",
                "includes": ["Lintel beam installation support", "Opening cutting & edge leveling", "Window frame slot prep"],
                "excludes": ["Frame supply and fixing"],
                "tools": ["Wall saw cutter", "Hammer drill", "Chisels"],
                "ready": ["Mark the exact opening coordinates on the wall", "Lintel rebar ready"],
                "reviews": [{"name": "Harish S.", "text": "Cut the new window opening perfectly straight. Lintel support was solid.", "rating": "4.8"}],
                "faqs": [{"q": "Is lintel installation necessary?", "a": "Yes, a concrete or steel lintel is required above any wall opening to prevent top wall collapse."}]
            }
        ]
    }

    for s_slug, packages_data in mason_structure.items():
        service = Service.objects.filter(slug=s_slug).first()
        if not service:
            print(f"Service slug {s_slug} not found.")
            continue

        print(f"Service: {service.name}")
        for pkg_data in packages_data:
            pkg, created = Package.objects.update_or_create(
                slug=pkg_data["slug"],
                defaults={
                    "service": service,
                    "name": pkg_data["name"],
                    "description": pkg_data["desc"],
                    "base_price": Decimal(str(pkg_data["price"])),
                    "duration": pkg_data["duration"],
                    "tag": pkg_data["tag"],
                    "includes": pkg_data["includes"],
                    "excludes": pkg_data["excludes"],
                    "tools": pkg_data["tools"],
                    "ready": pkg_data["ready"],
                    "reviews": pkg_data["reviews"],
                    "faqs": pkg_data["faqs"],
                    "status": PackageStatus.ACTIVE,
                    "payment_policy": PaymentPolicy.BOTH,
                }
            )
            print(f"  -> {'Created' if created else 'Updated'} package: {pkg.name}")

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

    print("\n6. Seeding Masonry & Construction packages...")
    seed_mason_packages()
    reset_sequence()

    print("\nSeeding complete!")

if __name__ == '__main__':
    fix_and_seed()
