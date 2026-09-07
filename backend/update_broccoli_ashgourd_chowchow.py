import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# Get Vegetable Packages
p_broccoli = Package.objects.get(id=906)
p_ash_gourd = Package.objects.get(id=907)
p_chow_chow = Package.objects.get(id=908)

# Other common ingredient packages for linking
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()

print("Clearing old recipes for Broccoli, Ash Gourd, and Chow Chow...")
p_broccoli.recipes.all().delete()
p_ash_gourd.recipes.all().delete()
p_chow_chow.recipes.all().delete()

# ==============================================================================
# 1. BROCCOLI
# ==============================================================================

# Recipe 1: Broccoli Poriyal
r_b1 = VegetableRecipe.objects.create(
    package=p_broccoli,
    name="Broccoli Poriyal",
    slug="broccoli-poriyal",
    image="/mockups/recipes/broccoli_broccoli_stir_fry.jpg",
    short_description="South Indian style broccoli stir fry with tempered mustard seeds, onions, spices, and fresh grated coconut.",
    prep_time_minutes=5,
    cook_time_minutes=10,
    total_time_minutes=15,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=145,
    protein="6 g",
    carbohydrates="14 g",
    fiber="6 g",
    fat="8 g",
    health_benefits=[
        "Broccoli is packed with dietary fiber, vitamin C, and antioxidants that support immune health.",
        "Coconut and mild spices support healthy digestion and nutrient absorption."
    ],
    health_tips=[
        "Blanch broccoli florets in salted hot water for only 1 minute to retain vibrant green color and crisp texture.",
        "Add grated coconut right before turning off the heat for maximum freshness and aroma."
    ],
    instructions=[
        "Cut 250 g broccoli into small florets and wash them well. Boil water with a little salt. Turn off the heat, add the broccoli, and leave it in the hot water for about 1 minute. Drain the water and keep the broccoli aside.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon cumin seeds. Cook until the mustard seeds start popping.",
        "Add 1 small chopped onion and 6-8 curry leaves. Cook for 3-4 minutes until the onion becomes soft.",
        "Add 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, and salt as needed. Mix well.",
        "Add the broccoli and mix well. Cover the pan and cook for 4-5 minutes until the broccoli is cooked but still slightly firm.",
        "Add 2 tablespoons grated coconut and mix well. Cook for 1 minute, then turn off the heat and serve hot with rice."
    ],
    tags=["South Indian", "Poriyal", "Quick Recipes", "High Fiber"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_b1, package=p_broccoli, name=p_broccoli.name, quantity=Decimal("250"), unit="g", notes="Cut into small florets", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_b1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_b1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("8"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_b1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Broccoli Paruppu Usili
r_b2 = VegetableRecipe.objects.create(
    package=p_broccoli,
    name="Broccoli Paruppu Usili",
    slug="broccoli-paruppu-usili",
    image="/mockups/recipes/broccoli_broccoli_vegetable_roast.jpg",
    short_description="Traditional Tamil Nadu style steamed spiced dal crumble tossed with sautéed broccoli florets.",
    prep_time_minutes=35,
    cook_time_minutes=20,
    total_time_minutes=55,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=240,
    protein="11 g",
    carbohydrates="30 g",
    fiber="8 g",
    fat="9 g",
    health_benefits=[
        "Chana dal and toor dal provide high-quality plant-based protein and essential amino acids.",
        "Broccoli combined with steamed lentils delivers rich dietary fiber for gut health and long-lasting satiety."
    ],
    health_tips=[
        "Coarsely grind the soaked dal without making it a paste for authentic crumbly texture.",
        "Steam the dal dumplings well before crumbling into the hot pan."
    ],
    instructions=[
        "Wash 1/4 cup chana dal and 2 tablespoons toor dal. Soak them in water for 30 minutes. Drain the water completely.",
        "Add the soaked dal, 2 dry red chilies, 1/4 teaspoon turmeric powder, a small pinch of asafoetida, and salt to a mixer. Grind into a coarse mixture. Do not make it into a smooth paste.",
        "Place the dal mixture in a steamer and steam for about 12-15 minutes until it becomes firm. Let it cool slightly, then break it into small pieces with your fingers or a spoon.",
        "Cut 250 g broccoli into small florets. Heat 1 teaspoon of oil in a pan and add the broccoli. Cook for 4-5 minutes until it becomes slightly soft. Remove and keep it aside.",
        "Heat 1 tablespoon of oil in the same pan. Add 1/2 teaspoon mustard seeds and a few curry leaves. Cook until the mustard seeds start popping.",
        "Add the cooked dal pieces and cook for 3-4 minutes, stirring often, until they become slightly crisp.",
        "Add the cooked broccoli and mix well. Cook for another 2-3 minutes. Serve hot with rice, sambar, or rasam."
    ],
    tags=["Traditional", "High Protein", "South Indian", "Usili"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_b2, package=p_broccoli, name=p_broccoli.name, quantity=Decimal("250"), unit="g", notes="Cut into small florets", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_b2, package=None, name="Chana Dal & Toor Dal", quantity=Decimal("0.25"), unit="cup", notes="Soaked and coarsely ground", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_b2, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)

# Recipe 3: Broccoli Pepper Fry
r_b3 = VegetableRecipe.objects.create(
    package=p_broccoli,
    name="Broccoli Pepper Fry",
    slug="broccoli-pepper-fry",
    image="/mockups/recipes/broccoli_broccoli_soup.jpg",
    short_description="Flavorful and aromatic broccoli sautéed with garlic, onions, and freshly crushed black pepper.",
    prep_time_minutes=5,
    cook_time_minutes=15,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=135,
    protein="6 g",
    carbohydrates="13 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Black pepper enhances nutrient absorption and provides powerful anti-inflammatory benefits.",
        "Garlic and broccoli support cardiovascular health and digestion."
    ],
    health_tips=[
        "Use freshly cracked black pepper at the very end to retain peak pungency and aroma.",
        "Parboil broccoli with a pinch of turmeric to keep florets vibrant and clean."
    ],
    instructions=[
        "Cut 250 g broccoli into small florets and wash them well. Boil water with a little salt and 1/4 teaspoon turmeric powder. Add the broccoli and cook for 3-4 minutes. Drain the water and keep the broccoli aside.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 4 finely chopped garlic cloves, 1 sliced green chili, and 6-8 curry leaves. Cook for about 1 minute.",
        "Add 1 small sliced onion and cook for 3-4 minutes until the onion becomes light golden.",
        "Add the cooked broccoli, 1/4 teaspoon turmeric powder, and salt as needed. Mix well.",
        "Cook for 4-5 minutes, stirring occasionally, until the broccoli becomes slightly brown.",
        "Add 1 teaspoon freshly ground black pepper and mix well. Cook for another 1 minute.",
        "Turn off the heat and serve hot with rice, sambar rice, rasam rice, or curd rice."
    ],
    tags=["Pepper Fry", "Quick Recipes", "Healthy Side"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_b3, package=p_broccoli, name=p_broccoli.name, quantity=Decimal("250"), unit="g", notes="Parboiled florets", is_catalog_vegetable=True, sort_order=0)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_b3, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("4"), unit="cloves", notes="Finely chopped", is_catalog_vegetable=True, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_b3, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Sliced", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_b3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Sliced", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 2. ASH GOURD (SAMBAL PUSANIKKAI)
# ==============================================================================

# Recipe 1: Poosanikai Kootu
r_a1 = VegetableRecipe.objects.create(
    package=p_ash_gourd,
    name="Poosanikai Kootu",
    slug="poosanikai-kootu",
    image="/mockups/recipes/ash_gourd_sambal_pusanikkai_ash_gourd_kootu.jpg",
    short_description="Classic cooling Tamil Brahmin style ash gourd and moong dal stew enriched with fresh ground coconut and cumin.",
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=180,
    protein="7 g",
    carbohydrates="22 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Ash gourd is deeply hydrating, cooling, and low in calories while aiding digestion.",
        "Moong dal provides easy-to-digest plant protein and dietary minerals."
    ],
    health_tips=[
        "Do not overcook the ash gourd cubes; they should be soft yet retain their clean square shape.",
        "Grind cumin seeds with fresh coconut and green chilli smoothly for authentic kootu consistency."
    ],
    instructions=[
        "Peel 300 g ash gourd, remove the seeds, and cut it into small pieces. Wash 1/4 cup moong dal.",
        "Add the moong dal, 1/4 teaspoon turmeric powder, and 1 cup of water to a pot. Cook until the dal becomes soft.",
        "Add the chopped ash gourd, 1/2 cup of water, and salt as needed. Cover and cook for 8-10 minutes until the ash gourd becomes soft.",
        "For the coconut mixture, grind 1/4 cup grated coconut, 1 green chili, and 1/2 teaspoon cumin seeds with a little water until smooth.",
        "Add the coconut mixture to the cooked ash gourd and dal. Mix well and cook for 3-4 minutes until the mixture becomes slightly thick.",
        "Heat 1 teaspoon of oil in a small pan. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, and 6-8 curry leaves. Cook until the mustard seeds start popping.",
        "Add this mixture to the kootu and mix well. Serve hot with rice."
    ],
    tags=["Kootu", "South Indian", "Traditional", "Cooling"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_a1, package=p_ash_gourd, name=p_ash_gourd.name, quantity=Decimal("300"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_a1, package=None, name="Moong Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_a1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_a1, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Poosanikai Mor Kuzhambu
r_a2 = VegetableRecipe.objects.create(
    package=p_ash_gourd,
    name="Poosanikai Mor Kuzhambu",
    slug="poosanikai-mor-kuzhambu",
    image="/mockups/recipes/ash_gourd_sambal_pusanikkai_ash_gourd_mor_kuzhambu.jpg",
    short_description="Tangy, comforting yogurt gravy simmered with tender ash gourd and spiced coconut paste.",
    prep_time_minutes=25,
    cook_time_minutes=15,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=165,
    protein="6 g",
    carbohydrates="17 g",
    fiber="3 g",
    fat="8 g",
    health_benefits=[
        "Yogurt delivers natural probiotics that promote gut flora and improve digestive balance.",
        "Ash gourd has high water content and helps reduce bodily heat."
    ],
    health_tips=[
        "Turn off the flame before adding beaten yogurt to prevent the gravy from curdling.",
        "Soak chana and toor dal before grinding with coconut to give natural body and thickness."
    ],
    instructions=[
        "Peel 250 g ash gourd, remove the seeds, and cut it into small pieces. Cook it with 1 cup of water and a small pinch of turmeric until soft.",
        "Soak 1 tablespoon chana dal and 1 tablespoon toor dal in water for 20-30 minutes. Drain the water.",
        "Grind the soaked dal with 1/4 cup grated coconut, 1/2 teaspoon cumin seeds, and 1 green chili. Add a little water and grind until smooth.",
        "Add the ground mixture to the cooked ash gourd. Add a small pinch of asafoetida and salt as needed. Cook for 3-4 minutes until the raw smell goes away.",
        "Turn off the heat. Beat 1/2 cup sour curd until smooth and add it to the pan. Mix well. Do not boil after adding the curd.",
        "Heat 1 teaspoon of oil in a small pan. Add 1/2 teaspoon mustard seeds and 6-8 curry leaves. Cook until the mustard seeds start popping.",
        "Pour this over the mor kuzhambu and mix gently. Serve with rice."
    ],
    tags=["Mor Kuzhambu", "South Indian", "Comfort Food", "Probiotic"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_a2, package=p_ash_gourd, name=p_ash_gourd.name, quantity=Decimal("250"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_a2, package=None, name="Sour Curd / Yogurt", quantity=Decimal("0.5"), unit="cup", notes="Beaten smooth", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_a2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Ground with spices", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_a2, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Poosanikai Poriyal
r_a3 = VegetableRecipe.objects.create(
    package=p_ash_gourd,
    name="Poosanikai Poriyal",
    slug="poosanikai-poriyal",
    image="/mockups/recipes/ash_gourd_sambal_pusanikkai_ash_gourd_sambar.jpg",
    short_description="Delicate ash gourd dry curry seasoned with mustard, urad dal, sambar powder, and coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=135,
    protein="3 g",
    carbohydrates="14 g",
    fiber="4 g",
    fat="8 g",
    health_benefits=[
        "Very low in sodium and calories while providing essential electrolytes and fiber.",
        "Tempered with cumin and asafoetida for light, wholesome digestion."
    ],
    health_tips=[
        "Cook on low heat covered so ash gourd cooks in its own released moisture.",
        "Gently toss at the end to prevent the tender pieces from getting mashed."
    ],
    instructions=[
        "Peel 300 g ash gourd, remove the seeds, and cut it into small pieces.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, 1/2 teaspoon cumin seeds, and 6-8 curry leaves. Cook until the mustard seeds start popping.",
        "Add a small pinch of asafoetida, 1/4 teaspoon turmeric powder, 1/2 teaspoon sambar powder, and salt as needed. Mix quickly.",
        "Add the chopped ash gourd and mix well.",
        "Cover the pan and cook on low heat for 8-10 minutes. Stir occasionally and cook until the ash gourd becomes soft but still keeps its shape.",
        "Turn off the heat. Add 1/4 cup grated coconut and 1 tablespoon chopped coriander leaves. Mix gently and serve with rice or roti."
    ],
    tags=["Poriyal", "South Indian", "Light & Healthy", "Quick Recipes"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_a3, package=p_ash_gourd, name=p_ash_gourd.name, quantity=Decimal("300"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_a3, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_a3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Chopped", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 3. CHOW CHOW
# ==============================================================================

# Recipe 1: Chow Chow Kootu
r_c1 = VegetableRecipe.objects.create(
    package=p_chow_chow,
    name="Chow Chow Kootu",
    slug="chow-chow-kootu",
    image="/mockups/recipes/chow_chow_chow_chow_kootu.jpg",
    short_description="Traditional pressure-cooked chayote squash and yellow moong dal with cumin-coconut paste and crisp tempering.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="6 g",
    carbohydrates="20 g",
    fiber="5 g",
    fat="7 g",
    health_benefits=[
        "Chow chow (chayote) is rich in folate, vitamin C, and fiber for cellular repair and cardiovascular wellness.",
        "Moong dal provides easily absorbed plant protein."
    ],
    health_tips=[
        "Do not overcook after adding coconut paste; 3-4 minutes of gentle simmering preserves flavor.",
        "Pressure cook dal with chow chow on top for uniform texture and quick preparation."
    ],
    instructions=[
        "Peel 1 medium-sized chow chow (about 250 g), remove the seed, and cut it into small pieces. Wash 1/4 cup moong dal.",
        "Add the moong dal and 3/4 cup water to a pressure cooker. Place the chopped chow chow on top and add 1/4 teaspoon turmeric powder. Cook for about 3 whistles and allow the pressure to come down naturally.",
        "Grind 1/4 cup grated coconut, 1 green chili, and 1/2 teaspoon cumin seeds with a little water until smooth.",
        "Open the cooker and mix the cooked dal and chow chow. Add the coconut mixture and salt as needed.",
        "Cook on low heat for 3-4 minutes until everything is well mixed and the kootu becomes slightly thick. Do not cook for too long, as the chow chow can become too soft.",
        "Heat 1 teaspoon oil in a small pan. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, and 5-6 curry leaves. Cook until the mustard seeds start popping.",
        "Add this to the kootu, mix well, and serve hot with rice."
    ],
    tags=["Kootu", "South Indian", "Comfort Food", "Protein Rich"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_c1, package=p_chow_chow, name=p_chow_chow.name, quantity=Decimal("250"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_c1, package=None, name="Moong Dal", quantity=Decimal("0.25"), unit="cup", notes="Washed and cooked", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_c1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Fresh green chilli", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_c1, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Chow Chow Mor Kuzhambu
r_c2 = VegetableRecipe.objects.create(
    package=p_chow_chow,
    name="Chow Chow Mor Kuzhambu",
    slug="chow-chow-mor-kuzhambu",
    image="/mockups/recipes/chow_chow_chow_chow_poriyal.jpg",
    short_description="Subtly spiced comforting buttermilk curry cooked with tender chow chow and a fragrant coconut-chana dal base.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=145,
    protein="5 g",
    carbohydrates="15 g",
    fiber="3 g",
    fat="8 g",
    health_benefits=[
        "Buttermilk provides gut-friendly probiotic cultures and calcium.",
        "Chow chow contributes beneficial dietary fiber and vitamins with minimal calories."
    ],
    health_tips=[
        "Keep flame low and gently heat after mixing beaten curd; never let mor kuzhambu boil.",
        "Soaking 1 tbsp chana dal adds thickness and body without requiring artificial thickeners."
    ],
    instructions=[
        "Peel 1 medium-sized chow chow (about 250 g), remove the seed, and cut it into small pieces.",
        "Add the chow chow, 1/4 teaspoon turmeric powder, and 1 cup water to a pan. Cook for 8-10 minutes until the chow chow becomes soft but still holds its shape.",
        "Grind 2 tablespoons grated coconut, 1 teaspoon cumin seeds, 1 green chili, and 1 tablespoon soaked chana dal with a little water until smooth.",
        "Add the ground mixture to the cooked chow chow. Add salt as needed and cook for 3-4 minutes on low heat.",
        "Beat 1/2 cup sour curd until smooth. Turn the heat to low and add the curd to the pan. Mix well and heat gently. Do not allow the mixture to boil after adding the curd, as this can cause it to separate.",
        "Heat 1 teaspoon oil in a small pan. Add 1/2 teaspoon mustard seeds, 5-6 curry leaves, and 1 dry red chili. Cook until the mustard seeds start popping.",
        "Pour the seasoning over the mor kuzhambu, mix gently, and serve hot with rice."
    ],
    tags=["Mor Kuzhambu", "South Indian", "Probiotic", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_c2, package=p_chow_chow, name=p_chow_chow.name, quantity=Decimal("250"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_c2, package=None, name="Sour Curd / Yogurt", quantity=Decimal("0.5"), unit="cup", notes="Beaten smooth", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_c2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Fresh green chilli", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_c2, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Chow Chow Chana Masala
r_c3 = VegetableRecipe.objects.create(
    package=p_chow_chow,
    name="Chow Chow Chana Masala",
    slug="chow-chow-chana-masala",
    image="/mockups/recipes/chow_chow_chow_chow_sambar.jpg",
    short_description="Hearty, protein-packed curry with tender chayote cubes and soft chickpeas cooked in spiced onion-tomato gravy.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=235,
    protein="8 g",
    carbohydrates="34 g",
    fiber="9 g",
    fat="8 g",
    health_benefits=[
        "Chickpeas and chayote combine for high protein and superior dietary fiber content.",
        "Rich in potassium, magnesium, and antioxidant spices that support heart wellness."
    ],
    health_tips=[
        "Use pre-cooked or thoroughly soaked chickpeas for even cooking and tender texture.",
        "Simmer covered for 5-7 minutes so the chow chow and chickpeas absorb the warm spices."
    ],
    instructions=[
        "Peel 1 medium-sized chow chow (about 250 g), remove the seed, and cut it into small pieces. Use 1 cup cooked chickpeas. If using dried chickpeas, soak them overnight and cook until soft before starting.",
        "Heat 1 tablespoon oil in a pan over medium heat. Add 1/2 teaspoon cumin seeds and cook for a few seconds.",
        "Add 1 small chopped onion and 1 green chili. Cook for 3-4 minutes until the onion becomes soft.",
        "Add 1 teaspoon ginger-garlic paste and cook for 1 minute. Add 1 medium-sized chopped tomato and cook for 3-4 minutes until it becomes soft.",
        "Add 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, 1/4 teaspoon cumin powder, and salt as needed. Mix well and cook for 1 minute.",
        "Add the chopped chow chow and 1/2 cup water. Cover the pan and cook for 8-10 minutes until the chow chow becomes soft.",
        "Add the cooked chickpeas and 1/2 cup water. Mix well, cover, and cook for another 5-7 minutes so the chickpeas absorb the spices. Chayote and chickpeas are also used together in established vegetable-stew preparations.",
        "Remove the lid and cook for another 2-3 minutes until the curry reaches the desired thickness. Add 1 tablespoon chopped coriander leaves and serve hot with rice, chapati, or roti."
    ],
    tags=["Chana Masala", "High Protein", "High Fiber", "Everyday Curry"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_c3, package=p_chow_chow, name=p_chow_chow.name, quantity=Decimal("250"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_c3, package=None, name="Cooked Chickpeas (Chana)", quantity=Decimal("1"), unit="cup", notes="Boiled tender", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="medium", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Chopped for garnish", is_catalog_vegetable=True, sort_order=4)

print("SUCCESS: Created all 9 updated recipes with exact instructions, steps, and nutrition values!")
