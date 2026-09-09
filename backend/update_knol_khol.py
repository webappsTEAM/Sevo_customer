import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

p_knol_khol = Package.objects.get(id=927)   # Knol Khol (Nookal)

onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
carrot_pkg = Package.objects.filter(id=879).first() or Package.objects.filter(name__icontains='Carrot').first()
cabbage_pkg = Package.objects.filter(id=885).first() or Package.objects.filter(name__icontains='Cabbage').first()

print("Deleting old recipes for Knol Khol...")
p_knol_khol.recipes.all().delete()

# ==============================================================================
# KNOL KHOL (NOOKAL) - Package ID: 927
# ==============================================================================

# Recipe 1: Knol Khol Kootu
r_kk1 = VegetableRecipe.objects.create(
    package=p_knol_khol,
    name="Knol Khol Kootu",
    slug="knol-khol-kootu",
    image="/mockups/recipes/knol_khol_nookal_knol_khol_kootu.jpg",
    short_description="Traditional South Indian stew combining tender knol khol cubes, soft moong dal, and fragrant coconut-cumin paste.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=165,
    protein="7 g",
    carbohydrates="22 g",
    fiber="5 g",
    fat="6 g",
    health_benefits=[
        "Knol khol is rich in dietary fiber, vitamin C, and glucosinolates that support cell wellness.",
        "Moong dal provides easily digestible plant protein and essential amino acids."
    ],
    health_tips=[
        "Peel the fibrous outer skin of knol khol thoroughly and dice into small uniform cubes for even cooking.",
        "Simmer gently on low heat after adding ground coconut paste to keep flavors balanced and fresh."
    ],
    instructions=[
        "Peel 250 g knol khol and cut it into small cubes.",
        "Cook 1/4 cup moong dal with 1/2 cup water and a pinch of turmeric until soft.",
        "Cook the knol khol with 1/2 cup water and salt until tender.",
        "Grind 2 tbsp grated coconut, 1/2 tsp cumin seeds, and 1 green chili with a little water.",
        "Add the coconut mixture and cooked moong dal to the knol khol.",
        "Mix well and cook on low heat for 4–5 minutes until slightly thick.",
        "Heat 1 tsp oil, add 1/2 tsp mustard seeds and curry leaves, pour over the kootu, and serve with rice."
    ],
    tags=["Kootu", "South Indian", "Protein Rich", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_kk1, package=p_knol_khol, name=p_knol_khol.name, quantity=Decimal("250"), unit="g", notes="Peeled and cubed", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_kk1, package=None, name="Moong Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_kk1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="For ground paste", is_catalog_vegetable=False, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_kk1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=3)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_kk1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Kashmiri Knol Khol Curry
r_kk2 = VegetableRecipe.objects.create(
    package=p_knol_khol,
    name="Kashmiri Knol Khol Curry",
    slug="kashmiri-knol-khol-curry",
    image="/mockups/recipes/knol_khol_nookal_knol_khol_poriyal.jpg",
    short_description="Aromatic Kashmiri-style Monji curry featuring golden-fried kohlrabi simmered in a spiced curd and fennel gravy.",
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="5 g",
    carbohydrates="14 g",
    fiber="4 g",
    fat="9 g",
    health_benefits=[
        "Fennel and asafoetida soothe the digestive tract and reduce gas/bloating.",
        "Beaten curd delivers probiotic cultures and beneficial calcium."
    ],
    health_tips=[
        "Lightly fry the knol khol pieces first until golden to seal in their sweet flavor and crunch.",
        "Whisk the curd well and stir continuously on low heat to prevent separation."
    ],
    instructions=[
        "Peel 250 g knol khol and cut it into medium-sized pieces.",
        "Heat 1 tbsp oil in a pan and lightly fry the knol khol pieces until they become lightly golden.",
        "Remove the pieces and keep them aside.",
        "In the same pan, add 1/2 tsp cumin seeds, 1/2 tsp fennel powder, a pinch of asafoetida, and 1/4 tsp turmeric powder.",
        "Add 1/2 cup beaten curd and mix well on low heat.",
        "Add the fried knol khol, 1/2 cup water, 1/2 tsp red chili powder, and salt. Cover and cook for 8–10 minutes.",
        "Simmer until the gravy thickens slightly, then turn off the heat and serve with rice or roti."
    ],
    tags=["Kashmiri", "Monji Curry", "Fennel Spiced", "Yogurt Gravy"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_kk2, package=p_knol_khol, name=p_knol_khol.name, quantity=Decimal("250"), unit="g", notes="Peeled and medium diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_kk2, package=None, name="Beaten Curd / Yogurt", quantity=Decimal("0.5"), unit="cup", notes="Whisked smooth", is_catalog_vegetable=False, sort_order=1)

# Recipe 3: Knol Khol Vegetable Soup
r_kk3 = VegetableRecipe.objects.create(
    package=p_knol_khol,
    name="Knol Khol Vegetable Soup",
    slug="knol-khol-vegetable-soup",
    image="/mockups/recipes/knol_khol_nookal_knol_khol_sambar.jpg",
    short_description="Clean, low-calorie immunity soup brimming with diced kohlrabi, carrots, shredded cabbage, and fresh cracked pepper.",
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=95,
    protein="3 g",
    carbohydrates="16 g",
    fiber="4 g",
    fat="3 g",
    health_benefits=[
        "Very low in calories and exceptionally high in dietary hydration, potassium, and vitamin C.",
        "Garlic and lemon juice enhance immune defense and metabolic detox."
    ],
    health_tips=[
        "Simmer vegetables in stock until tender-crisp so vitamins and natural crunch are retained.",
        "Add lemon juice and black pepper right at the end to keep the citrus aroma vibrant."
    ],
    instructions=[
        "Peel 250 g knol khol and cut it into small pieces.",
        "Heat 1 tsp oil in a pan and cook 2 chopped garlic cloves and 1 small chopped onion until soft.",
        "Add the knol khol, 1 small chopped carrot, 1/4 cup cabbage, and salt.",
        "Add 3 cups vegetable stock or water and bring to a boil.",
        "Cover and cook for 10–12 minutes until the vegetables become tender.",
        "Add 1/2 tsp black pepper and 1 tsp lemon juice, then mix well.",
        "Cook for another 1–2 minutes, turn off the heat, and serve hot."
    ],
    tags=["Soup", "Low Calorie", "Immunity", "Detox"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_kk3, package=p_knol_khol, name=p_knol_khol.name, quantity=Decimal("250"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
if carrot_pkg:
    RecipeIngredient.objects.create(recipe=r_kk3, package=carrot_pkg, name=carrot_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if cabbage_pkg:
    RecipeIngredient.objects.create(recipe=r_kk3, package=cabbage_pkg, name=cabbage_pkg.name, quantity=Decimal("0.25"), unit="cup", notes="Shredded", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_kk3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_kk3, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=4)

print("SUCCESS: Updated all 3 Knol Khol recipes with exact instructions, steps, and nutrition values!")
