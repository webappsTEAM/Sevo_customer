import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

p_baby_potato = Package.objects.get(id=897)   # Baby Potato (Urulaikizhangu)
p_ooty_potato = Package.objects.get(id=898)   # Ooty Potato

# Catalog ingredient helper packages
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()
spinach_pkg = Package.objects.filter(id=878).first() or Package.objects.filter(name__icontains='Spinach').first()

print("Deleting old recipes for Baby Potato and Ooty Potato...")
p_baby_potato.recipes.all().delete()
p_ooty_potato.recipes.all().delete()

# ==============================================================================
# 1. BABY POTATO (URULAIKIZHANGU) - Package ID: 897
# ==============================================================================

# Recipe 1: Baby Potato Egg Curry
r_bp1 = VegetableRecipe.objects.create(
    package=p_baby_potato,
    name="Baby Potato Egg Curry",
    slug="baby-potato-egg-curry",
    image="/mockups/recipes/baby_potato_urulaikizhangu_baby_potato_masala.jpg",
    short_description="Flavorful, protein-rich curry featuring tender halved baby potatoes and boiled eggs simmered in a spiced onion-tomato gravy.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=275,
    protein="11 g",
    carbohydrates="31 g",
    fiber="4 g",
    fat="12 g",
    health_benefits=[
        "Boiled eggs provide complete, high-quality animal protein and choline for brain and muscle function.",
        "Potatoes offer sustained complex carbohydrates, potassium, and vitamin B6."
    ],
    health_tips=[
        "Boil baby potatoes until just fork-tender so they absorb gravy without falling apart.",
        "Add halved boiled eggs in the last 2 minutes so the yolks stay intact and rich."
    ],
    instructions=[
        "Wash 250 g baby potatoes and boil them until tender. Peel and cut them into halves.",
        "Boil 2 eggs, peel them, and cut them into halves.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp cumin seeds and 1 small chopped onion. Cook until the onion becomes soft.",
        "Add 1 tsp ginger-garlic paste and cook for 1 minute.",
        "Add 1 chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt. Cook until the tomato becomes soft.",
        "Add the baby potatoes and 3/4 cup water. Cover and cook for 8–10 minutes until the curry thickens.",
        "Add the boiled eggs, cook for 2 minutes, add coriander leaves, and serve hot."
    ],
    tags=["Egg Curry", "High Protein", "Comfort Food", "Roti Side"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_bp1, package=p_baby_potato, name=p_baby_potato.name, quantity=Decimal("250"), unit="g", notes="Boiled and halved", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bp1, package=None, name="Eggs", quantity=Decimal("2"), unit="pieces", notes="Hard boiled and halved", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bp1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_bp1, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_bp1, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Poori Aloo Koora
r_bp2 = VegetableRecipe.objects.create(
    package=p_baby_potato,
    name="Poori Aloo Koora",
    slug="poori-aloo-koora",
    image="/mockups/recipes/baby_potato_urulaikizhangu_baby_potato_kurma.jpg",
    short_description="Classic South Indian turmeric-spiced potato gravy cooked with ginger, green chilies, onions, and curry leaves.",
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=205,
    protein="4 g",
    carbohydrates="31 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Potatoes provide steady energy, dietary potassium, and vitamin C.",
        "Ginger and green chilies kindle digestive enzymes and boost circulation."
    ],
    health_tips=[
        "Lightly mash a couple of baby potato pieces against the side of the pan to naturally thicken the yellow gravy.",
        "Pair fresh with hot, fluffy pooris or dosas."
    ],
    instructions=[
        "Wash 300 g baby potatoes and boil them until tender. Peel and cut them into small pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds, 1/2 tsp urad dal, and a few curry leaves.",
        "Add 1 sliced onion, 2 green chilies, and 1 tsp grated ginger. Cook until the onion becomes soft.",
        "Add 1/4 tsp turmeric powder and salt. Mix well.",
        "Add the cooked baby potatoes and mix gently.",
        "Add 1/2 cup water, cover, and cook for 5–7 minutes until the curry becomes slightly thick.",
        "Add chopped coriander leaves, mix well, turn off the heat, and serve with hot poori."
    ],
    tags=["Poori Masala", "Breakfast Special", "South Indian", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_bp2, package=p_baby_potato, name=p_baby_potato.name, quantity=Decimal("300"), unit="g", notes="Boiled and diced", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="piece", notes="Sliced", is_catalog_vegetable=True, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_bp2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("2"), unit="pieces", notes="Slit", is_catalog_vegetable=True, sort_order=2)
if ginger_pkg:
    RecipeIngredient.objects.create(recipe=r_bp2, package=ginger_pkg, name=ginger_pkg.name, quantity=Decimal("1"), unit="tsp", notes="Grated", is_catalog_vegetable=True, sort_order=3)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_bp2, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=4)

# Recipe 3: Baby Potato Aloo Palak
r_bp3 = VegetableRecipe.objects.create(
    package=p_baby_potato,
    name="Baby Potato Aloo Palak",
    slug="baby-potato-aloo-palak",
    image="/mockups/recipes/baby_potato_urulaikizhangu_baby_potato_roast.jpg",
    short_description="Golden pan-roasted baby potatoes simmered in a luscious, vibrant spiced spinach and tomato gravy.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=225,
    protein="7 g",
    carbohydrates="29 g",
    fiber="6 g",
    fat="9 g",
    health_benefits=[
        "Spinach delivers iron, folate, lutein, and bone-strengthening vitamin K.",
        "Baby potatoes offer gentle dietary fiber, potassium, and sustained energy."
    ],
    health_tips=[
        "Blanch spinach leaves for only 2 minutes in boiling water and plunge in cold water to keep the brilliant emerald green color.",
        "Pan-sear baby potatoes until lightly golden before folding into spinach gravy for superior texture."
    ],
    instructions=[
        "Wash 250 g baby potatoes and boil them until tender. Peel and cut them into halves.",
        "Wash 200 g spinach leaves and blanch them in hot water for 2 minutes. Blend with 1 green chili to make a smooth paste.",
        "Heat 1 tbsp oil in a pan and lightly cook the baby potatoes for 4–5 minutes until lightly golden. Remove and keep aside.",
        "In the same pan, add 1/2 tsp cumin seeds, 1 small chopped onion, and 1 tsp ginger-garlic paste. Cook until the onion becomes soft.",
        "Add 1 chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1/2 tsp coriander powder, and salt. Cook until the tomato becomes soft.",
        "Add the spinach paste and 1/4 cup water. Cook for 4–5 minutes, then add the baby potatoes and simmer for another 3–4 minutes.",
        "Add 1/2 tsp garam masala, mix gently, turn off the heat, and serve with roti or rice."
    ],
    tags=["Aloo Palak", "Iron Rich", "Nutritious Greens", "North Indian Classic"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_bp3, package=p_baby_potato, name=p_baby_potato.name, quantity=Decimal("250"), unit="g", notes="Boiled, halved, and roasted", is_catalog_vegetable=True, sort_order=0)
if spinach_pkg:
    RecipeIngredient.objects.create(recipe=r_bp3, package=spinach_pkg, name=spinach_pkg.name, quantity=Decimal("200"), unit="g", notes="Blanched and pureed", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_bp3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bp3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 2. OOTY POTATO - Package ID: 898
# ==============================================================================

# Recipe 1: Potato Palya
r_op1 = VegetableRecipe.objects.create(
    package=p_ooty_potato,
    name="Potato Palya",
    slug="potato-palya",
    image="/mockups/recipes/ooty_potato_ooty_potato_fry.jpg",
    short_description="Karnataka-style tempered potato dry curry with mustard, urad dal, green chilies, onions, and turmeric.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=185,
    protein="4 g",
    carbohydrates="31 g",
    fiber="5 g",
    fat="7 g",
    health_benefits=[
        "Fresh Ooty potatoes provide creamy texture, complex carbohydrates, and essential electrolytes.",
        "Tempered urad dal adds a crunchy protein bite and healthy minerals."
    ],
    health_tips=[
        "Sauté onions until translucent before mixing in the boiled potato pieces.",
        "Gently toss on medium flame for 5–6 minutes so the potatoes turn light golden."
    ],
    instructions=[
        "Wash 300 g potatoes, boil until tender, peel, and cut into small pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds and 1/2 tsp urad dal.",
        "When the mustard seeds start popping, add a few curry leaves and 1 chopped green chili.",
        "Add 1 small chopped onion and cook until it becomes soft.",
        "Add the potatoes, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, and salt. Mix gently.",
        "Cook on medium heat for 5–6 minutes until the potatoes become lightly golden.",
        "Add 1 tbsp chopped coriander leaves, mix well, turn off the heat, and serve."
    ],
    tags=["Palya", "South Indian", "Everyday Side", "Quick Meal"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_op1, package=p_ooty_potato, name=p_ooty_potato.name, quantity=Decimal("300"), unit="g", notes="Boiled and diced", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_op1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_op1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_op1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=3)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_op1, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Urulai Roast
r_op2 = VegetableRecipe.objects.create(
    package=p_ooty_potato,
    name="Urulai Roast",
    slug="urulai-roast",
    image="/mockups/recipes/ooty_potato_potato_masala.jpg",
    short_description="Crispy, spicy Tamil-style potato roast coated in aromatic spices and slow-roasted in a wide pan.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=220,
    protein="4 g",
    carbohydrates="32 g",
    fiber="5 g",
    fat="9 g",
    health_benefits=[
        "Potatoes supply dietary vitamin B6, magnesium, and resistant starch for cellular energy.",
        "Cumin and coriander spices stimulate digestion."
    ],
    health_tips=[
        "Spread potato cubes in a single layer in a wide pan without stirring too frequently to develop a crispy crust.",
        "Boil potatoes until just tender so they retain sharp cubical edges during pan-roasting."
    ],
    instructions=[
        "Wash 300 g potatoes, boil until just tender, peel, and cut into small cubes.",
        "Mix the potatoes with 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, 1/2 tsp cumin powder, and salt.",
        "Heat 1½ tbsp oil in a wide pan and add 1/2 tsp mustard seeds and a few curry leaves.",
        "Add the seasoned potatoes and spread them evenly in the pan.",
        "Cook on medium heat for 5–6 minutes without stirring too often.",
        "Turn the potato pieces gently and cook for another 6–8 minutes until the outside becomes golden and crisp.",
        "Turn off the heat and serve hot with rice, sambar, or rasam."
    ],
    tags=["Roast", "Crispy Potato", "Tamil Classic", "Side Dish"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_op2, package=p_ooty_potato, name=p_ooty_potato.name, quantity=Decimal("300"), unit="g", notes="Boiled and cubed", is_catalog_vegetable=True, sort_order=0)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_op2, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=1)

# Recipe 3: Ooty Potato Kurma
r_op3 = VegetableRecipe.objects.create(
    package=p_ooty_potato,
    name="Ooty Potato Kurma",
    slug="ooty-potato-kurma",
    image="/mockups/recipes/ooty_potato_potato_kurma.jpg",
    short_description="Rich hotel-style Nilgiri potato kurma cooked with tender Ooty potatoes in a fragrant fennel-coconut-roasted gram paste.",
    prep_time_minutes=15,
    cook_time_minutes=18,
    total_time_minutes=33,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=235,
    protein="5 g",
    carbohydrates="35 g",
    fiber="5 g",
    fat="9 g",
    health_benefits=[
        "Fennel seeds and roasted gram soothe the stomach and provide natural body and creaminess.",
        "Fresh Ooty potatoes absorb the aromatic kurma spices for rich nourishment."
    ],
    health_tips=[
        "Grind roasted gram (pottukadalai) and coconut smoothly to yield a silky, luscious gravy.",
        "Simmer covered for 12–15 minutes so the potatoes absorb the aromatic fennel-infused broth."
    ],
    instructions=[
        "Wash 300 g Ooty potatoes, peel them, and cut them into medium-sized pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp fennel seeds and 1 small sliced onion. Cook until the onion becomes soft.",
        "Add 1 tsp ginger-garlic paste and 1 chopped green chili. Cook for 1 minute.",
        "Add 1 chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, and salt. Cook until the tomato becomes soft.",
        "Grind 1/4 cup grated coconut, 1/2 tsp fennel seeds, 1 tbsp roasted gram, and 2 tbsp water into a smooth paste.",
        "Add the coconut paste, potatoes, and 1 cup water. Cover and cook for 12–15 minutes until the potatoes become tender and the kurma thickens.",
        "Add 1 tbsp chopped coriander leaves, mix well, turn off the heat, and serve with chapati, dosa, or rice."
    ],
    tags=["Kurma", "Hotel Style", "Nilgiri Special", "Chapati Side"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_op3, package=p_ooty_potato, name=p_ooty_potato.name, quantity=Decimal("300"), unit="g", notes="Peeled and medium diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_op3, package=None, name="Grated Coconut & Roasted Gram", quantity=Decimal("0.25"), unit="cup", notes="For ground kurma paste", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_op3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Sliced", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_op3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_op3, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=4)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_op3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=5)

print("SUCCESS: Updated all 6 recipes for Baby Potato and Ooty Potato!")
