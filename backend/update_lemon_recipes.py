import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

p_lemon = Package.objects.get(id=877)   # Lemon (Elumichai Pazham)

print("Deleting old recipes for Lemon...")
p_lemon.recipes.all().delete()

# ==============================================================================
# LEMON (ELUMICHAI PAZHAM) - Package ID: 877
# ==============================================================================

# Recipe 1: Lemon Bars
r_l1 = VegetableRecipe.objects.create(
    package=p_lemon,
    name="Lemon Bars",
    slug="lemon-bars",
    image="/mockups/recipes/lemon_elumichai_pazham_lemon_rice.jpg",
    short_description="Classic tangy-sweet lemon squares with a buttery, crisp shortbread crust topped with luscious baked lemon curd.",
    prep_time_minutes=20,
    cook_time_minutes=40,
    total_time_minutes=60,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=320,
    protein="5 g",
    carbohydrates="44 g",
    fiber="1 g",
    fat="14 g",
    health_benefits=[
        "Fresh lemon juice provides natural vitamin C, bioflavonoids, and citric acid.",
        "Eggs deliver dietary protein and healthy fats."
    ],
    health_tips=[
        "Use fresh freshly squeezed lemon juice for bright, natural citrus acidity.",
        "Allow lemon bars to cool completely before slicing for clean, sharp edges."
    ],
    instructions=[
        "Preheat the oven to 175°C and line a small baking dish with parchment paper.",
        "Mix 1/2 cup flour, 2 tbsp powdered sugar, and 3 tbsp softened butter until crumbly.",
        "Press the mixture evenly into the baking dish and bake for 15–18 minutes until lightly golden.",
        "In another bowl, whisk 2 eggs, 1/2 cup sugar, 1 tbsp flour, and a pinch of salt.",
        "Add 1/4 cup fresh lemon juice and mix well.",
        "Pour the lemon mixture over the warm crust and bake at 160°C for 18–22 minutes until the center is set.",
        "Cool completely, cut into 2 portions, and dust with powdered sugar before serving."
    ],
    tags=["Dessert", "Baking", "Lemon Curd", "Sweet Treat"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_l1, package=p_lemon, name=p_lemon.name, quantity=Decimal("2"), unit="pieces", notes="Freshly juiced (1/4 cup)", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_l1, package=None, name="Eggs", quantity=Decimal("2"), unit="pieces", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_l1, package=None, name="All-Purpose Flour", quantity=Decimal("0.55"), unit="cup", notes="For crust and curd", is_catalog_vegetable=False, sort_order=2)
RecipeIngredient.objects.create(recipe=r_l1, package=None, name="Butter & Sugar", quantity=Decimal("0.5"), unit="cup", notes="Softened butter and granulated sugar", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Avgolemono Soup
r_l2 = VegetableRecipe.objects.create(
    package=p_lemon,
    name="Avgolemono Soup",
    slug="avgolemono-soup",
    image="/mockups/recipes/lemon_elumichai_pazham_lemon_rasam.jpg",
    short_description="Traditional Greek chicken and rice soup thickened with a silky, velvet egg-lemon (Avgolemono) sauce.",
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=235,
    protein="20 g",
    carbohydrates="22 g",
    fiber="1 g",
    fat="8 g",
    health_benefits=[
        "Chicken breast delivers high lean protein for muscle repair and immunity.",
        "Warm lemon-infused broth and eggs soothe the respiratory and digestive tracts."
    ],
    health_tips=[
        "Temper the egg-lemon mixture slowly with hot broth before pouring it back to prevent curdling.",
        "Do not boil the soup once the egg-lemon sauce is introduced; heat gently on low."
    ],
    instructions=[
        "Heat 2 cups chicken stock in a pot and add 100 g boneless chicken. Simmer for 12–15 minutes until the chicken is cooked.",
        "Remove the chicken, shred it into small pieces, and keep aside.",
        "Add 1/4 cup rice to the stock and cook for 12–15 minutes until tender.",
        "In a bowl, whisk 1 egg with 2 tbsp fresh lemon juice.",
        "Slowly add about 1/2 cup hot soup to the egg mixture while whisking continuously.",
        "Slowly pour the egg mixture back into the pot while stirring. Do not boil the soup after adding the egg mixture.",
        "Add the shredded chicken, salt, and black pepper. Mix well, heat gently for 1–2 minutes, and serve."
    ],
    tags=["Soup", "Greek Cuisine", "High Protein", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_l2, package=p_lemon, name=p_lemon.name, quantity=Decimal("1"), unit="piece", notes="Freshly juiced (2 tbsp)", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_l2, package=None, name="Boneless Chicken", quantity=Decimal("100"), unit="g", notes="Shredded", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_l2, package=None, name="Egg", quantity=Decimal("1"), unit="piece", notes="Whisked for sauce", is_catalog_vegetable=False, sort_order=2)
RecipeIngredient.objects.create(recipe=r_l2, package=None, name="Rice & Chicken Stock", quantity=Decimal("2"), unit="cups", notes="Rice cooked in stock", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Chicken Piccata
r_l3 = VegetableRecipe.objects.create(
    package=p_lemon,
    name="Chicken Piccata",
    slug="chicken-piccata",
    image="/mockups/recipes/lemon_elumichai_pazham_lemon_vegetable_salad.jpg",
    short_description="Tender pan-seared chicken cutlets served in a luscious, tangy pan sauce made with lemon juice, butter, and capers.",
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=365,
    protein="39 g",
    carbohydrates="12 g",
    fiber="1 g",
    fat="18 g",
    health_benefits=[
        "Extremely high in lean protein, niacin, and phosphorus.",
        "Capers and fresh lemon juice offer potent polyphenols and digestive stimulation."
    ],
    health_tips=[
        "Pound chicken cutlets to an even 1/2-inch thickness so they sear quickly and stay juicy.",
        "Swirl cold butter into the lemon-pan sauce off the direct flame for a glossy emulsified sauce."
    ],
    instructions=[
        "Cut 2 boneless chicken breasts in half horizontally and gently flatten them to an even thickness.",
        "Season with salt and pepper, then coat both sides lightly with 1/4 cup flour.",
        "Heat 1 tbsp olive oil and 1 tbsp butter in a pan. Cook the chicken for 2–3 minutes on each side until golden and fully cooked.",
        "Remove the chicken and keep it aside. Add 1/4 cup chicken stock and 2 tbsp lemon juice to the same pan.",
        "Add 1½ tbsp capers and cook for 2–3 minutes, scraping the cooked bits from the pan.",
        "Add 1 tbsp butter and stir until the sauce becomes smooth.",
        "Return the chicken to the pan, coat with the lemon-caper sauce, add chopped parsley, and serve hot."
    ],
    tags=["Italian", "Chicken Piccata", "High Protein", "Gourmet Dinner"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_l3, package=p_lemon, name=p_lemon.name, quantity=Decimal("1"), unit="piece", notes="Freshly juiced (2 tbsp)", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_l3, package=None, name="Chicken Breasts", quantity=Decimal("2"), unit="pieces", notes="Boneless cutlets", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_l3, package=None, name="Capers & Butter", quantity=Decimal("2"), unit="tbsp", notes="For pan sauce", is_catalog_vegetable=False, sort_order=2)

print("SUCCESS: Updated all 3 Lemon recipes with exact instructions, steps, and nutrition values!")
