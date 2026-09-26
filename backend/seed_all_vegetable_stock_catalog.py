"""
seed_all_vegetable_stock_catalog.py

Populates and links all 67 fresh vegetable packages into the Warehouse Stock Catalog (InventoryItem).
Ensures:
- Produce photo is attached to both InventoryItem and Package
- Base price / unit cost are synchronized
- SKU is clean and deterministic
- Initial stock quantities and pack sizes are correctly calculated
"""
import os
import re
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import Package, Service
from inventory.models import InventoryItem, StockMovement
from companies.models import Company
from inventory.utils.unit_conversion import parse_pack_size_grams

def get_vegetable_produce_photo(name):
    n = (name or "").lower().strip()
    if not n:
        return "/mockups/vegetables_realistic.png"

    # 1. Tomatoes
    if any(k in n for k in ["tomato", "thakkali", "tamatar", "cherry"]):
        return "/mockups/veg_tomato.png"

    # 2. Onions & Shallots
    if any(k in n for k in ["spring onion", "vengaya thaal"]):
        return "/mockups/veg/spring_onion.jpg"
    if any(k in n for k in ["chinna vengayam", "sambar onion", "sambhar onion", "small onion", "shallot"]):
        return "/mockups/veg/onion.jpg"
    if any(k in n for k in ["periya vengayam", "onion", "vengayam", "pyaz"]):
        return "/mockups/veg/onion.jpg"

    # 3. Potatoes
    if any(k in n for k in ["sweet potato", "sakkaraivalli", "chakkara", "shakarkand"]):
        return "/mockups/veg/sweet_potato.jpg"
    if "baby potato" in n:
        return "/mockups/veg/baby_potato.jpg"
    if any(k in n for k in ["potato", "urulaikilangu", "urulaikizhangu", "aloo", "ooty potato"]):
        return "/mockups/veg/potato.jpg"

    # 4. Carrots
    if any(k in n for k in ["carrot", "gajar"]):
        return "/mockups/veg/carrot.jpg"

    # 5. Cucumbers
    if any(k in n for k in ["cucumber", "vellarikkai", "vellarikai", "kheera"]):
        return "/mockups/veg/cucumber.jpg"

    # 6. Lady Finger / Okra
    if any(k in n for k in ["lady finger", "vendakkai", "vendaikkai", "bhindi", "okra"]):
        return "/mockups/veg_bhindi.png"

    # 7. Brinjal / Eggplant
    if any(k in n for k in ["brinjal", "kathirikai", "kathirikkai", "baingan"]):
        return "/mockups/veg_brinjal.png"

    # 8. Cabbage & Cauliflower
    if any(k in n for k in ["cauliflower", "pookosu", "gobi"]):
        return "/mockups/veg/cauliflower.jpg"
    if any(k in n for k in ["cabbage", "muttaikose", "patta gobi"]):
        return "/mockups/veg/cabbage.jpg"

    # 9. Beetroot & Radish
    if any(k in n for k in ["beetroot", "chukandar"]):
        return "/mockups/veg/beetroot.jpg"
    if any(k in n for k in ["radish", "mullangi", "mooli"]):
        return "/mockups/veg/radish.jpg"

    # 10. Garlic & Ginger
    if any(k in n for k in ["peeled garlic", "uricha poondu"]):
        return "/mockups/veg/peeled_garlic.jpg"
    if any(k in n for k in ["garlic", "poondu", "lehsun"]):
        return "/mockups/veg/garlic.jpg"
    if any(k in n for k in ["ginger", "inji", "adrak"]):
        return "/mockups/veg_ginger.png"

    # 11. Chillies & Capsicums
    if any(k in n for k in ["red bell pepper", "red pepper", "sigappu"]):
        return "/mockups/veg/red_bell_pepper.jpg"
    if any(k in n for k in ["yellow bell pepper", "yellow pepper", "manjal kuda"]):
        return "/mockups/veg/yellow_bell_pepper.jpg"
    if any(k in n for k in ["capsicum", "kuda milagai", "kudai milagaai", "shimla"]):
        return "/mockups/veg_capsicum_green.png"
    if any(k in n for k in ["chilli", "milagai", "milagaai", "mirch"]):
        return "/mockups/veg/green_chilli.jpg"

    # 12. Gourds
    if any(k in n for k in ["ash gourd", "sambal pusanikkai", "winter melon", "petha", "poosanikai"]):
        return "/mockups/veg_ash_gourd.png"
    if any(k in n for k in ["bitter gourd", "pavakkai", "karela"]):
        return "/mockups/veg_bitter_gourd.png"
    if any(k in n for k in ["bottle gourd", "surakkai", "lauki"]):
        return "/mockups/veg_lauki.png"
    if any(k in n for k in ["snake gourd", "pudalangai"]):
        return "/mockups/veg_snake_gourd.png"
    if any(k in n for k in ["ridge gourd", "peerangai", "peerkangai"]):
        return "/mockups/veg/ridge_gourd.jpg"
    if any(k in n for k in ["ivy gourd", "kovakkai", "tindora", "dondakaya"]):
        return "/mockups/veg_ivy_gourd.png"
    if any(k in n for k in ["chow chow", "chayote"]):
        return "/mockups/veg_chow_chow.png"
    if any(k in n for k in ["pumpkin", "parangikkai"]):
        return "/mockups/veg/pumpkin.jpg"

    # 13. Beans
    if any(k in n for k in ["baby corn"]):
        return "/mockups/veg/baby_corn.jpg"
    if any(k in n for k in ["corn", "cholam", "solam"]):
        return "/mockups/veg/corn.jpg"
    if any(k in n for k in ["broad beans", "avarakkai"]):
        return "/mockups/veg_broad_beans.png"
    if any(k in n for k in ["cluster beans", "kothavarangai", "guar"]):
        return "/mockups/veg_cluster_beans.png"
    if any(k in n for k in ["french beans", "beans"]):
        return "/mockups/veg_french_beans.png"
    if any(k in n for k in ["peas", "pattani"]):
        return "/mockups/veg/peas.jpg"

    # 14. Greens & Herbs
    if any(k in n for k in ["curry leaves", "karuveppilai", "karuvepillai"]):
        return "/mockups/veg_curry_leaves.png"
    if any(k in n for k in ["coriander", "kothamalli"]):
        return "/mockups/veg_coriander.png"
    if any(k in n for k in ["mint", "pudina"]):
        return "/mockups/veg/mint.jpg"
    if any(k in n for k in ["drumstick leaves", "moringa leaves", "murungai keerai"]):
        return "/mockups/veg_moringa_leaves.png"
    if any(k in n for k in ["fenugreek", "methi", "vendhaya keerai"]):
        return "/mockups/veg_methi.png"
    if any(k in n for k in ["spinach", "palak", "keerai"]):
        return "/mockups/veg/spinach.jpg"

    # 15. Others
    if any(k in n for k in ["drumstick", "murungakkai"]):
        return "/mockups/veg_drumstick.png"
    if any(k in n for k in ["mushroom", "kaalan"]):
        return "/mockups/veg_mushroom.png"
    if any(k in n for k in ["broccoli"]):
        return "/mockups/veg/broccoli.jpg"
    if any(k in n for k in ["lemon", "elumichai", "nimbu"]):
        return "/mockups/veg_lemon.png"
    if any(k in n for k in ["amla", "nellikai", "nellikaai"]):
        return "/mockups/veg/amla.jpg"
    if any(k in n for k in ["colocasia", "seppankizhangu", "arvi"]):
        return "/mockups/veg/arvi.jpg"
    if any(k in n for k in ["turmeric", "manjal"]):
        return "/mockups/veg/turmeric.jpg"
    if any(k in n for k in ["zucchini"]):
        return "/mockups/veg/zucchini.jpg"
    if any(k in n for k in ["papaya", "pappalikkai"]):
        return "/mockups/veg/raw_papaya.jpg"
    if any(k in n for k in ["banana stem", "vazhai thandu", "vazhaithandu"]):
        return "/mockups/veg/banana_stem.jpg"
    if any(k in n for k in ["raw banana", "vazhakkai"]):
        return "/mockups/veg/raw_banana.jpg"
    if any(k in n for k in ["banana", "vazhai"]):
        return "/mockups/veg/banana_stem.jpg"

    return "/mockups/vegetables_realistic.png"


def run():
    company = Company.objects.first()
    if not company:
        print("Error: No company found in DB!")
        return

    packages = list(Package.objects.filter(service__slug="vegetables").order_by("sort_order", "name"))
    print(f"Found {len(packages)} vegetable packages in database.")

    created_count = 0
    updated_count = 0

    for pkg in packages:
        # Determine produce photo
        photo = pkg.image.strip() if pkg.image and pkg.image.strip() else get_vegetable_produce_photo(pkg.name)

        # Generate clean SKU
        raw_slug = pkg.slug.upper().replace("VEG-", "").strip()
        sku_clean = re.sub(r"[^A-Z0-9]+", "-", raw_slug).strip("-")[:25]
        sku = f"VEG-{sku_clean}"

        pack_grams = parse_pack_size_grams(pkg.duration or "500 g", default_grams=500)
        initial_packs = 25  # 25 packs available initial stock
        initial_grams = initial_packs * pack_grams

        # Check existing linked stock item
        item = getattr(pkg, "stock_item", None)
        if not item:
            # Check by SKU or Name
            item = InventoryItem.objects.filter(sku=sku).first()
            if not item:
                item = InventoryItem.objects.filter(name=f"{pkg.name} (Produce)").first()

        if item:
            # Update existing
            item.name = f"{pkg.name} (Produce)"
            item.unit_cost = pkg.base_price
            item.image = photo
            item.warehouse_name = "Main Warehouse"
            item.category = InventoryItem.Category.CONSUMABLE
            if item.total_quantity == 0 and item.available_quantity == 0:
                item.total_quantity = initial_packs
                item.available_quantity = initial_packs
                item.stock_quantity_grams = initial_grams
                item.default_daily_quantity_grams = initial_grams
            item.save()

            pkg.stock_item = item
            pkg.image = photo
            pkg.save(update_fields=["stock_item", "image"])
            updated_count += 1
            print(f"  [UPDATED] Pkg #{pkg.id}: {pkg.name} -> Item #{item.id} (SKU: {item.sku}) | Photo: {photo}")
        else:
            # Create new
            item = InventoryItem.objects.create(
                org=company,
                name=f"{pkg.name} (Produce)",
                category=InventoryItem.Category.CONSUMABLE,
                sku=sku,
                warehouse_name="Main Warehouse",
                total_quantity=initial_packs,
                available_quantity=initial_packs,
                reserved_quantity=0,
                unit_cost=pkg.base_price,
                reorder_threshold=5,
                reorder_quantity=20,
                is_returnable=False,
                image=photo,
                unit="g",
                stock_quantity_grams=initial_grams,
                default_daily_quantity_grams=initial_grams,
            )
            pkg.stock_item = item
            pkg.image = photo
            pkg.save(update_fields=["stock_item", "image"])
            created_count += 1
            print(f"  [CREATED] Pkg #{pkg.id}: {pkg.name} -> Item #{item.id} (SKU: {item.sku}) | Photo: {photo}")

    print(f"\nSeeding completed! Created: {created_count}, Updated: {updated_count}, Total in Catalog: {InventoryItem.objects.count()}")

if __name__ == "__main__":
    run()
