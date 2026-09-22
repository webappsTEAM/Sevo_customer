import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# Get Packages
p_baby_corn = Package.objects.get(id=919)           # Baby Corn - Packet
p_green_amaranthus = Package.objects.get(id=920)    # Green Amaranthus Leaves
p_red_amaranthus = Package.objects.get(id=921)      # Red Amaranthus Leaves

# Catalog ingredient helper packages
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
spring_onion_pkg = Package.objects.filter(id=900).first() or Package.objects.filter(name__icontains='Spring Onion').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()
carrot_pkg = Package.objects.filter(id=879).first() or Package.objects.filter(name__icontains='Carrot').first()
cabbage_pkg = Package.objects.filter(id=885).first() or Package.objects.filter(name__icontains='Cabbage').first()
capsicum_pkg = Package.objects.filter(id=883).first() or Package.objects.filter(name__icontains='Green Capsicum').first()
mushroom_pkg = Package.objects.filter(id=882).first() or Package.objects.filter(name__icontains='Mushroom').first()

print("Deleting old recipes for Baby Corn, Green Amaranthus, Red Amaranthus...")
p_baby_corn.recipes.all().delete()
p_green_amaranthus.recipes.all().delete()
p_red_amaranthus.recipes.all().delete()

# ==============================================================================
# 1. BABY CORN - PACKET - Package ID: 919
# ==============================================================================

# Recipe 1: Baby Corn Manchurian
r_bc1 = VegetableRecipe.objects.create(
    package=p_baby_corn,
    name="Baby Corn Manchurian",
    slug="baby-corn-manchurian",
    image="/mockups/recipes/baby_corn_-_packet_baby_corn_manchurian.jpg",
    short_description="Crisp batter-fried baby corn pieces tossed in a tangy, spicy Indo-Chinese garlic and chilli sauce with crunchy bell peppers.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=285,
    protein="5 g",
    carbohydrates="40 g",
    fiber="4 g",
    fat="12 g",
    health_benefits=[
        "Baby corn is rich in dietary fiber, folate, and B-vitamins.",
        "Garlic, ginger, and peppers provide anti-inflammatory and metabolism-supporting benefits."
    ],
    health_tips=[
        "Coat the baby corn evenly in a thick batter and fry on medium-high heat for maximum crispness.",
        "Toss the fried baby corn into the Manchurian sauce right before serving to maintain the crunch."
    ],
    instructions=[
        "Wash 200 g baby corn and cut each into 2–3 pieces.",
        "Mix 2 tbsp corn flour, 2 tbsp maida, 1/4 tsp pepper, and salt with a little water to make a thick batter.",
        "Coat the baby corn with the batter and fry in hot oil until golden and crispy.",
        "Heat 1 tbsp oil and cook 3 chopped garlic cloves, 1 tsp ginger, and 1 green chili for 30 seconds.",
        "Add 1 small chopped onion and 1/2 chopped capsicum. Cook for 2–3 minutes.",
        "Add 1 tbsp soy sauce, 1½ tbsp tomato ketchup, 1/2 tbsp chili sauce, and 1/2 tsp vinegar. Mix well.",
        "Add the fried baby corn, mix until well coated, add spring onion, and serve hot."
    ],
    tags=["Indo-Chinese", "Manchurian", "Crispy", "Party Appetizer"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_bc1, package=p_baby_corn, name=p_baby_corn.name, quantity=Decimal("200"), unit="g", notes="Cut into 2-3 pieces", is_catalog_vegetable=True, sort_order=0)
if capsicum_pkg:
    RecipeIngredient.objects.create(recipe=r_bc1, package=capsicum_pkg, name=capsicum_pkg.name, quantity=Decimal("0.5"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bc1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if spring_onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bc1, package=spring_onion_pkg, name=spring_onion_pkg.name, quantity=Decimal("1"), unit="stalk", notes="Chopped for garnish", is_catalog_vegetable=True, sort_order=3)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_bc1, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("3"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Baby Corn Stir Fry
r_bc2 = VegetableRecipe.objects.create(
    package=p_baby_corn,
    name="Baby Corn Stir Fry",
    slug="baby-corn-stir-fry",
    image="/mockups/recipes/baby_corn_-_packet_baby_corn_stir_fry.jpg",
    short_description="Flavorful everyday stir fry with tender sliced baby corn, crunchy capsicum, tomatoes, and aromatic warm spices.",
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="5 g",
    carbohydrates="22 g",
    fiber="5 g",
    fat="6 g",
    health_benefits=[
        "Low calorie, nutrient-dense stir fry rich in antioxidants, vitamin C, and fiber.",
        "Cumin and ginger-garlic support digestive health and nutrient absorption."
    ],
    health_tips=[
        "Slice baby corn thinly on a diagonal for quick, even cooking while maintaining a tender crunch.",
        "Cover on low flame so baby corn cooks in its own natural steam before flash sautéing uncovered."
    ],
    instructions=[
        "Wash 200 g baby corn and cut into thin pieces.",
        "Heat 1 tbsp oil in a pan and add 1/2 tsp cumin seeds.",
        "Add 1 tsp ginger-garlic paste and cook for 30 seconds.",
        "Add 1 small sliced onion and cook until slightly soft.",
        "Add 1 small chopped tomato and cook until soft.",
        "Add baby corn, 1/2 chopped capsicum, 1/4 tsp turmeric, 1/2 tsp red chili powder, 1/2 tsp garam masala, and salt. Cover and cook for 6–8 minutes.",
        "Remove the lid, cook for 2 minutes, add coriander leaves, and serve hot."
    ],
    tags=["Stir Fry", "Quick Recipes", "High Fiber", "Roti Side"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_bc2, package=p_baby_corn, name=p_baby_corn.name, quantity=Decimal("200"), unit="g", notes="Thinly sliced", is_catalog_vegetable=True, sort_order=0)
if capsicum_pkg:
    RecipeIngredient.objects.create(recipe=r_bc2, package=capsicum_pkg, name=capsicum_pkg.name, quantity=Decimal("0.5"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_bc2, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bc2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Sliced", is_catalog_vegetable=True, sort_order=3)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_bc2, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=4)

# Recipe 3: Baby Corn Vegetable Soup
r_bc3 = VegetableRecipe.objects.create(
    package=p_baby_corn,
    name="Baby Corn Vegetable Soup",
    slug="baby-corn-vegetable-soup",
    image="/mockups/recipes/baby_corn_-_packet_baby_corn_vegetable_soup.jpg",
    short_description="Clear, warming vegetable soup loaded with thinly sliced baby corn, carrots, cabbage, capsicum, and fresh mushrooms.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="4 g",
    carbohydrates="18 g",
    fiber="4 g",
    fat="3 g",
    health_benefits=[
        "Extremely light on calories while offering a rainbow spectrum of vitamins and minerals.",
        "Mushrooms, garlic, and ginger bolster natural immunity."
    ],
    health_tips=[
        "Slowly pour the corn flour slurry while whisking continuously to achieve a smooth, silky soup consistency.",
        "Add crushed black pepper and fresh coriander right before turning off the stove."
    ],
    instructions=[
        "Wash 6–8 baby corn pieces and slice them thinly.",
        "Heat 1 tsp oil and cook 2 chopped garlic cloves, 1 tsp ginger, and 1 green chili for 1 minute.",
        "Add 1 small chopped carrot, 1/4 cup cabbage, 1/4 cup capsicum, and 1/4 cup mushrooms. Cook for 2–3 minutes.",
        "Add the baby corn, 3 cups vegetable stock or water, and salt. Cover and cook for 8–10 minutes.",
        "Add 1/2 tsp black pepper and mix well.",
        "Mix 1 tbsp corn flour with 3 tbsp water and slowly add it to the soup while stirring.",
        "Cook for 2–3 minutes until slightly thick, add coriander leaves, and serve hot."
    ],
    tags=["Soup", "Low Calorie", "Immunity Booster", "Warm Bowl"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_bc3, package=p_baby_corn, name=p_baby_corn.name, quantity=Decimal("8"), unit="pieces", notes="Thinly sliced", is_catalog_vegetable=True, sort_order=0)
if carrot_pkg:
    RecipeIngredient.objects.create(recipe=r_bc3, package=carrot_pkg, name=carrot_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if cabbage_pkg:
    RecipeIngredient.objects.create(recipe=r_bc3, package=cabbage_pkg, name=cabbage_pkg.name, quantity=Decimal("0.25"), unit="cup", notes="Shredded", is_catalog_vegetable=True, sort_order=2)
if capsicum_pkg:
    RecipeIngredient.objects.create(recipe=r_bc3, package=capsicum_pkg, name=capsicum_pkg.name, quantity=Decimal("0.25"), unit="cup", notes="Diced", is_catalog_vegetable=True, sort_order=3)
if mushroom_pkg:
    RecipeIngredient.objects.create(recipe=r_bc3, package=mushroom_pkg, name=mushroom_pkg.name, quantity=Decimal("0.25"), unit="cup", notes="Sliced", is_catalog_vegetable=True, sort_order=4)


# ==============================================================================
# 2. GREEN AMARANTHUS LEAVES - Package ID: 920
# ==============================================================================

# Recipe 1: Green Amaranthus Leaves Poriyal
r_ga1 = VegetableRecipe.objects.create(
    package=p_green_amaranthus,
    name="Green Amaranthus Leaves Poriyal",
    slug="green-amaranthus-leaves-poriyal",
    image="/mockups/recipes/green_amaranthus_leaves_green_amaranthus_poriyal.jpg",
    short_description="Classic South Indian green keerai poriyal sautéed with garlic, onions, mustard tempering, and fresh grated coconut.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=125,
    protein="4 g",
    carbohydrates="10 g",
    fiber="4 g",
    fat="8 g",
    health_benefits=[
        "Rich in plant-based iron, calcium, vitamin A, and dietary fiber.",
        "Garlic and coconut support cardiovascular and digestive wellness."
    ],
    health_tips=[
        "Cook greens covered for 5-7 minutes only until just wilted to preserve heat-sensitive micronutrients and color.",
        "Ensure excess moisture evaporates before folding in fresh coconut."
    ],
    instructions=[
        "Wash 250 g green amaranthus leaves well and chop them finely.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds, 1/2 tsp urad dal, and a few curry leaves.",
        "When the mustard seeds start popping, add 2 chopped garlic cloves and 1 small chopped onion.",
        "Cook until the onion becomes soft.",
        "Add the chopped amaranthus leaves, 1/4 tsp turmeric powder, and salt.",
        "Cover and cook for 5–7 minutes until the leaves become soft. Remove the lid and cook until the extra water dries.",
        "Add 2 tbsp grated coconut, mix well, cook for 1 minute, and turn off the heat."
    ],
    tags=["Poriyal", "Keerai", "Iron Rich", "South Indian"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_ga1, package=p_green_amaranthus, name=p_green_amaranthus.name, quantity=Decimal("250"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_ga1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_ga1, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_ga1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Green Amaranthus Leaves Kootu
r_ga2 = VegetableRecipe.objects.create(
    package=p_green_amaranthus,
    name="Green Amaranthus Leaves Kootu",
    slug="green-amaranthus-leaves-kootu",
    image="/mockups/recipes/green_amaranthus_leaves_amaranthus_kootu.jpg",
    short_description="Wholesome, comforting stew of tender green amaranthus leaves and yellow moong dal with cumin-coconut paste.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=175,
    protein="8 g",
    carbohydrates="23 g",
    fiber="6 g",
    fat="6 g",
    health_benefits=[
        "Moong dal provides easy-to-digest plant protein and amino acids.",
        "Amaranthus leaves provide essential bioavailable iron, potassium, and magnesium."
    ],
    health_tips=[
        "Cook moong dal until soft and mash lightly for a luscious kootu base.",
        "Simmer gently for 3-4 minutes after adding ground coconut paste to blend the flavours."
    ],
    instructions=[
        "Wash 250 g green amaranthus leaves and chop them finely.",
        "Cook 1/4 cup moong dal with 1/2 cup water and a pinch of turmeric until soft.",
        "Cook the chopped amaranthus leaves with 1/2 cup water and salt until soft.",
        "Grind 2 tbsp grated coconut, 1/2 tsp cumin seeds, and 1–2 dry red chilies with a little water.",
        "Add the ground coconut mixture and cooked moong dal to the amaranthus leaves.",
        "Mix well and cook on low heat for 3–4 minutes until the kootu becomes slightly thick.",
        "Heat 1 tsp oil, add 1/2 tsp mustard seeds, 1/2 tsp urad dal, and a few curry leaves. When the mustard seeds start popping, pour over the kootu and serve with rice."
    ],
    tags=["Kootu", "Keerai Kootu", "Protein Rich", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_ga2, package=p_green_amaranthus, name=p_green_amaranthus.name, quantity=Decimal("250"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_ga2, package=None, name="Moong Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_ga2, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="For ground paste", is_catalog_vegetable=False, sort_order=2)

# Recipe 3: Green Amaranthus Leaves Puli Kuzhambu
r_ga3 = VegetableRecipe.objects.create(
    package=p_green_amaranthus,
    name="Green Amaranthus Leaves Puli Kuzhambu",
    slug="green-amaranthus-leaves-puli-kuzhambu",
    image="/mockups/recipes/green_amaranthus_leaves_amaranthus_dal.jpg",
    short_description="Tangy and savory South Indian tamarind curry simmered with fresh green amaranthus, sesame oil, and garlic.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=120,
    protein="4 g",
    carbohydrates="15 g",
    fiber="5 g",
    fat="6 g",
    health_benefits=[
        "Sesame oil and tamarind stimulate healthy digestion and liver metabolism.",
        "Dark leafy greens in tangy broth enhance plant iron absorption."
    ],
    health_tips=[
        "Use authentic sesame oil (gingelly oil) for tempering to achieve traditional Chettinad flavor.",
        "Simmer tamarind gravy until raw acidity mellows into a thick, aromatic sauce."
    ],
    instructions=[
        "Wash 250 g green amaranthus leaves and chop them finely.",
        "Soak a small lemon-sized piece of tamarind in 1 cup warm water and extract the tamarind water.",
        "Heat 1 tbsp sesame oil in a pan. Add 1/2 tsp mustard seeds, a few curry leaves, and a pinch of asafoetida (perungayam).",
        "Add 1 small chopped onion and 2 chopped garlic cloves. Cook until the onion becomes soft.",
        "Add the chopped amaranthus leaves, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, and salt. Cook for 3–4 minutes.",
        "Add the tamarind water and 1/2 cup water. Mix well and simmer for 8–10 minutes until the leaves are fully cooked and the gravy slightly thickens.",
        "Turn off the heat and serve hot with steamed rice."
    ],
    tags=["Puli Kuzhambu", "Tamarind Curry", "Traditional", "Sesame Oil"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_ga3, package=p_green_amaranthus, name=p_green_amaranthus.name, quantity=Decimal("250"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_ga3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_ga3, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 3. RED AMARANTHUS LEAVES - Package ID: 921
# ==============================================================================

# Recipe 1: Red Amaranthus Dal
r_ra1 = VegetableRecipe.objects.create(
    package=p_red_amaranthus,
    name="Red Amaranthus Dal",
    slug="red-amaranthus-dal",
    image="/mockups/recipes/red_amaranthus_leaves_red_keerai_dal.jpg",
    short_description="Traditional Thotakura Pappu combining vibrant red amaranthus leaves with protein-rich toor dal, garlic, and cumin.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=175,
    protein="9 g",
    carbohydrates="25 g",
    fiber="6 g",
    fat="5 g",
    health_benefits=[
        "High in betalains and anthocyanins that provide powerful antioxidant and cell protection.",
        "Toor dal delivers high biological value protein and sustained satiety."
    ],
    health_tips=[
        "Cook toor dal till soft and mash slightly before combining with the sautéed red amaranthus.",
        "Tomatoes enhance natural iron absorption from the red leafy greens."
    ],
    instructions=[
        "Wash 200 g red amaranthus leaves and chop them finely.",
        "Cook 1/4 cup toor dal with 1 cup water and 1/4 tsp turmeric until soft.",
        "Heat 1 tsp oil in a pan and add 1/2 tsp cumin seeds, 2 chopped garlic cloves, and 1 green chili.",
        "Add 1 small chopped tomato and cook until soft.",
        "Add the chopped amaranthus leaves, 1/2 tsp red chili powder, and salt. Cook for 4–5 minutes.",
        "Add the cooked dal and 1/2 cup water. Mix well and simmer for 5 minutes.",
        "Turn off the heat and serve hot with rice or roti."
    ],
    tags=["Dal", "Thotakura Pappu", "High Protein", "Antioxidant Rich"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_ra1, package=p_red_amaranthus, name=p_red_amaranthus.name, quantity=Decimal("200"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_ra1, package=None, name="Toor Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft", is_catalog_vegetable=False, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_ra1, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_ra1, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_ra1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Red Amaranthus Coconut Milk Curry
r_ra2 = VegetableRecipe.objects.create(
    package=p_red_amaranthus,
    name="Red Amaranthus Coconut Milk Curry",
    slug="red-amaranthus-coconut-milk-curry",
    image="/mockups/recipes/red_amaranthus_leaves_red_keerai_kootu.jpg",
    short_description="Subtle and velvety red amaranth curry gently simmered in thin coconut milk with tamarind and a hint of jaggery.",
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=145,
    protein="4 g",
    carbohydrates="14 g",
    fiber="4 g",
    fat="9 g",
    health_benefits=[
        "Coconut milk provides easily metabolized healthy fats that enhance fat-soluble vitamin absorption.",
        "Jaggery and tamarind balance minerals while offering a delicate authentic South Indian palate."
    ],
    health_tips=[
        "Add thin coconut milk on low heat and cook gently for 2-3 minutes to prevent curdling.",
        "A pinch of jaggery rounds out the subtle earthiness of red amaranth leaves."
    ],
    instructions=[
        "Wash 250 g red amaranthus leaves and chop them roughly.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp cumin seeds, 2 chopped garlic cloves, and 1 green chili.",
        "Add the amaranthus leaves, a little salt, and 2 tbsp water. Cover and cook for 5–6 minutes.",
        "Add 1/2 tsp tamarind water and 1/2 tsp jaggery. Mix well.",
        "Add 1/2 cup thin coconut milk and cook on low heat for 2–3 minutes.",
        "Heat 1 tsp oil separately and add 1/2 tsp mustard seeds, 1 dry red chili, and a few curry leaves.",
        "Pour the seasoning over the curry, mix gently, and serve with rice."
    ],
    tags=["Coconut Milk Curry", "Traditional", "Subtle Flavours", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_ra2, package=p_red_amaranthus, name=p_red_amaranthus.name, quantity=Decimal("250"), unit="g", notes="Roughly chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_ra2, package=None, name="Thin Coconut Milk", quantity=Decimal("0.5"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_ra2, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=2)

# Recipe 3: Red Amaranthus Vadai
r_ra3 = VegetableRecipe.objects.create(
    package=p_red_amaranthus,
    name="Red Amaranthus Vadai",
    slug="red-amaranthus-vadai",
    image="/mockups/recipes/red_amaranthus_leaves_red_keerai_poriyal.jpg",
    short_description="Crispy, golden South Indian Keerai Vadai packed with protein-rich chana dal, finely chopped red amaranthus, and spices.",
    prep_time_minutes=70,
    cook_time_minutes=15,
    total_time_minutes=85,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=265,
    protein="9 g",
    carbohydrates="34 g",
    fiber="7 g",
    fat="10 g",
    health_benefits=[
        "Chana dal and red amaranth combine for high fiber, high plant protein, and essential minerals.",
        "A wholesome traditional snack loaded with antioxidants."
    ],
    health_tips=[
        "Drain soaked chana dal completely before grinding coarsely without adding water.",
        "Fry on medium heat so the vadai turns crisp on the outside while cooking tender inside."
    ],
    instructions=[
        "Wash 100 g red amaranthus leaves and chop them finely.",
        "Soak 1/2 cup chana dal in water for 1–2 hours, then drain completely.",
        "Grind the dal with 2 dry red chilies, 1/2 tsp cumin seeds, and salt into a coarse mixture.",
        "Add the chopped amaranthus leaves and 1 small chopped onion. Mix well.",
        "Take small portions of the mixture and flatten them into thin vadai.",
        "Heat oil and fry the vadai on medium heat until both sides become golden and crisp.",
        "Remove the vadai, place them on a paper towel, and serve hot with chutney."
    ],
    tags=["Keerai Vadai", "Snack", "Crispy", "High Protein"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_ra3, package=p_red_amaranthus, name=p_red_amaranthus.name, quantity=Decimal("100"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_ra3, package=None, name="Chana Dal", quantity=Decimal("0.5"), unit="cup", notes="Soaked and coarsely ground", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_ra3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)

print("SUCCESS: Created all 9 updated recipes with exact instructions, steps, and nutrition values!")
