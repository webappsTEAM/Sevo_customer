import os
import sys
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from django.db import transaction
from service_requests.models import (
    Service, Package, PackageVariant, VegetableRecipe, 
    RecipeIngredient, VegetableRecommendation
)
from inventory.models import (
    Vegetable, VegetableCategory, VegetableStockMovement, VegetableClaim
)
from orders.models import GroceryOrder, GroceryOrderItem
from carts.models import CartItem
from vegetable_orders.models import VegetableOrder, VegetableOrderItem

print("==================================================")
print("REMOVING VEGETABLE DATA FROM DATABASE")
print("==================================================")

with transaction.atomic():
    # 1. Cart Items referencing vegetable packages
    veg_pkgs = Package.objects.filter(service__name__icontains='vegetable')
    c_items = CartItem.objects.filter(package__in=veg_pkgs)
    c_count = c_items.count()
    c_items.delete()
    print(f"1. Deleted CartItems: {c_count}")

    # 2. Grocery orders / items referencing vegetable packages
    g_items = GroceryOrderItem.objects.filter(package__in=veg_pkgs)
    g_count = g_items.count()
    g_items.delete()
    print(f"2. Deleted GroceryOrderItems: {g_count}")
    
    # 3. Recipe Ingredients & Vegetable Recommendations
    rec_count = VegetableRecommendation.objects.count()
    VegetableRecommendation.objects.all().delete()
    print(f"3. Deleted VegetableRecommendations: {rec_count}")

    ing_count = RecipeIngredient.objects.count()
    RecipeIngredient.objects.all().delete()
    print(f"4. Deleted RecipeIngredients: {ing_count}")

    recip_count = VegetableRecipe.objects.count()
    VegetableRecipe.objects.all().delete()
    print(f"5. Deleted VegetableRecipes: {recip_count}")

    # 4. Inventory data (Claims, Stock Movements, Produce, Categories)
    claim_count = VegetableClaim.objects.count()
    VegetableClaim.objects.all().delete()
    print(f"6. Deleted VegetableClaims: {claim_count}")

    mov_count = VegetableStockMovement.objects.count()
    VegetableStockMovement.objects.all().delete()
    print(f"7. Deleted VegetableStockMovements: {mov_count}")

    veg_count = Vegetable.objects.count()
    Vegetable.objects.all().delete()
    print(f"8. Deleted Inventory Vegetables: {veg_count}")

    cat_count = VegetableCategory.objects.count()
    VegetableCategory.objects.all().delete()
    print(f"9. Deleted VegetableCategories: {cat_count}")

    # 5. Package Variants for vegetable packages
    pv_items = PackageVariant.objects.filter(package__in=veg_pkgs)
    pv_count = pv_items.count()
    pv_items.delete()
    print(f"10. Deleted PackageVariants: {pv_count}")

    # 6. Vegetable Packages
    pkg_count = veg_pkgs.count()
    veg_pkgs.delete()
    print(f"11. Deleted Vegetable Packages: {pkg_count}")

    # 7. Check if any remaining packages exist with 'vegetable' or 'produce' in title/name
    other_veg_pkgs = Package.objects.filter(name__icontains='vegetable')
    if other_veg_pkgs.exists():
        other_count = other_veg_pkgs.count()
        other_veg_pkgs.delete()
        print(f"12. Deleted Additional Vegetable Packages: {other_count}")

    print("\nAll vegetable data removed successfully!")

print("\n--- Final DB Verification ---")
print("Remaining Vegetable Packages:", Package.objects.filter(service__name__icontains='vegetable').count())
print("Remaining Inventory Vegetables:", Vegetable.objects.count())
print("Remaining Vegetable Categories:", VegetableCategory.objects.count())
print("Remaining Vegetable Recipes:", VegetableRecipe.objects.count())
print("Remaining Recipe Ingredients:", RecipeIngredient.objects.count())
