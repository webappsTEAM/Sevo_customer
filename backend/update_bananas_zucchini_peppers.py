import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# Get Packages
p_raw_banana = Package.objects.get(id=914)       # Raw Banana (Vazhakkai)
p_banana_stem = Package.objects.get(id=915)      # Banana Stem (Vazhai Thandu)
p_green_zucchini = Package.objects.get(id=916)   # Green Zucchini
p_yellow_pepper = Package.objects.get(id=917)    # Yellow Bell Pepper (Manjal Kuda Milagai)
p_red_pepper = Package.objects.get(id=918)       # Red Bell Pepper

# Catalog ingredient helper packages
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
small_onion_pkg = Package.objects.filter(id=899).first() or Package.objects.filter(name__icontains='Chinna Vengayam').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()
carrot_pkg = Package.objects.filter(id=879).first() or Package.objects.filter(name__icontains='Carrot').first()
peas_pkg = Package.objects.filter(id=904).first() or Package.objects.filter(name__icontains='Green Peas').first()
corn_pkg = Package.objects.filter(id=886).first() or Package.objects.filter(name__icontains='Sweet Corn').first()
potato_pkg = Package.objects.filter(id=872).first() or Package.objects.filter(name__icontains='Potato').first()

print("Deleting old recipes for Raw Banana, Banana Stem, Green Zucchini, Yellow Bell Pepper, Red Bell Pepper...")
p_raw_banana.recipes.all().delete()
p_banana_stem.recipes.all().delete()
p_green_zucchini.recipes.all().delete()
p_yellow_pepper.recipes.all().delete()
p_red_pepper.recipes.all().delete()

# ==============================================================================
# 1. RAW BANANA (VAZHAKKAI) - Package ID: 914
# ==============================================================================

# Recipe 1: Vazhakkai Poriyal
r_rb1 = VegetableRecipe.objects.create(
    package=p_raw_banana,
    name="Vazhakkai Poriyal",
    slug="vazhakkai-poriyal",
    image="/mockups/recipes/raw_banana_vazhakkai_raw_banana_poriyal.jpg",
    short_description="Subtly spiced South Indian raw banana dry curry seasoned with mustard, urad dal, and fresh grated coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=180,
    protein="2 g",
    carbohydrates="30 g",
    fiber="5 g",
    fat="7 g",
    health_benefits=[
        "Raw banana is rich in resistant starch and prebiotic fiber supporting gut health.",
        "A wholesome low-sodium, mineral-rich vegetable side dish."
    ],
    health_tips=[
        "Immerse peeled and cut banana pieces in water to avoid oxidation and discoloration.",
        "Add grated coconut right at the end to keep the aroma sweet and fresh."
    ],
    instructions=[
        "Wash 2 medium raw bananas, peel them lightly, and cut them into small pieces.",
        "Keep the pieces in water to prevent them from changing color.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds, 1/2 tsp urad dal, and 1/2 tsp cumin seeds.",
        "When the mustard seeds start popping, add 1 dry red chili and 6–8 curry leaves.",
        "Add the raw banana pieces, 1/4 tsp turmeric powder, and salt. Mix well.",
        "Add 1/4 cup water, cover, and cook for 8–10 minutes until the banana becomes tender.",
        "Remove the lid and cook for 2–3 minutes until the extra water dries.",
        "Add 2 tbsp grated coconut and mix gently.",
        "Cook for 1 minute, then turn off the heat and serve."
    ],
    tags=["Poriyal", "South Indian", "Homestyle", "High Fiber"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_rb1, package=p_raw_banana, name=p_raw_banana.name, quantity=Decimal("2"), unit="pieces", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_rb1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_rb1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("8"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)

# Recipe 2: Vazhakkai Podimas
r_rb2 = VegetableRecipe.objects.create(
    package=p_raw_banana,
    name="Vazhakkai Podimas",
    slug="vazhakkai-podimas",
    image="/mockups/recipes/raw_banana_vazhakkai_raw_banana_masala.jpg",
    short_description="Delicate, comforting Tamil-style grated raw banana crumble sautéed with ginger, green chilies, and coconut.",
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=175,
    protein="3 g",
    carbohydrates="29 g",
    fiber="5 g",
    fat="7 g",
    health_benefits=[
        "Ginger and green chili aid digestion and elevate metabolic rate.",
        "Steamed grated plantain provides gentle, easily digestible complex carbs."
    ],
    health_tips=[
        "Cook raw banana pieces just until tender (4-6 min) so they grate neatly without turning mushy.",
        "A splash of lemon juice at the end adds a bright zesty finish."
    ],
    instructions=[
        "Wash 2 medium raw bananas and cut each into 2–3 large pieces.",
        "Boil water in a pan and cook the raw banana pieces for 4–6 minutes until they become tender but do not become too soft.",
        "Remove the bananas, allow them to cool, and peel the skin.",
        "Grate the cooked raw banana into small pieces and keep aside.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds and 1 tsp urad dal.",
        "When the mustard seeds start popping, add 1 chopped green chili, 1 tsp grated ginger, and 6–8 curry leaves.",
        "Add the grated raw banana and salt. Mix gently and cook for 3–4 minutes.",
        "Add 2 tbsp grated coconut and mix well.",
        "Cook for 1 minute, then turn off the heat.",
        "Add 1 tsp lemon juice if desired and serve."
    ],
    tags=["Podimas", "South Indian", "Traditional", "Light Meal"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_rb2, package=p_raw_banana, name=p_raw_banana.name, quantity=Decimal("2"), unit="pieces", notes="Boiled and grated", is_catalog_vegetable=True, sort_order=0)
if ginger_pkg:
    RecipeIngredient.objects.create(recipe=r_rb2, package=ginger_pkg, name=ginger_pkg.name, quantity=Decimal("1"), unit="tsp", notes="Grated", is_catalog_vegetable=True, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_rb2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_rb2, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Aratikaya Fry
r_rb3 = VegetableRecipe.objects.create(
    package=p_raw_banana,
    name="Aratikaya Fry",
    slug="aratikaya-fry",
    image="/mockups/recipes/raw_banana_vazhakkai_raw_banana_fry.jpg",
    short_description="Andhra style crispy spiced raw banana fry roasted golden with cumin, red chili, and curry leaves.",
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=190,
    protein="2 g",
    carbohydrates="31 g",
    fiber="4 g",
    fat="8 g",
    health_benefits=[
        "Raw plantains provide sustained slow-release energy and dietary potassium.",
        "Spices promote cardiovascular vitality and appetite regulation."
    ],
    health_tips=[
        "Roast slowly on low-medium flame for crispy golden edges without burning the spices.",
        "Stir gently every few minutes so the banana rounds brown evenly."
    ],
    instructions=[
        "Wash 2 medium raw bananas, peel them, and cut them into small round or cube-shaped pieces.",
        "Keep the cut banana pieces in water to prevent them from turning dark.",
        "Heat 1½ tbsp oil in a pan. Add 1/2 tsp cumin seeds and 1/2 tsp mustard seeds.",
        "When the mustard seeds start popping, add 6–8 curry leaves.",
        "Drain the water from the banana pieces and add them to the pan.",
        "Add 1/4 tsp turmeric powder, 1/2 tsp red chili powder, and salt. Mix well.",
        "Cook on low-medium heat for 10–12 minutes, stirring gently every few minutes.",
        "Continue cooking until the banana pieces become tender and golden brown.",
        "Cook for another 2–3 minutes until the edges become slightly crispy.",
        "Turn off the heat and serve hot with rice, dal, sambar, or rasam."
    ],
    tags=["Aratikaya Fry", "Crispy Fry", "Andhra Style", "Side Dish"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_rb3, package=p_raw_banana, name=p_raw_banana.name, quantity=Decimal("2"), unit="pieces", notes="Peeled and sliced", is_catalog_vegetable=True, sort_order=0)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_rb3, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("8"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=1)


# ==============================================================================
# 2. BANANA STEM (VAZHAI THANDU) - Package ID: 915
# ==============================================================================

# Recipe 1: Vazhaithandu Poriyal
r_bs1 = VegetableRecipe.objects.create(
    package=p_banana_stem,
    name="Vazhaithandu Poriyal",
    slug="vazhaithandu-poriyal",
    image="/mockups/recipes/banana_stem_vazhai_thandu_vazhaithandu_poriyal.jpg",
    short_description="Nutrient-dense Tamil style banana stem stir fry cooked with soaked moong dal, spices, and coconut.",
    prep_time_minutes=15,
    cook_time_minutes=12,
    total_time_minutes=27,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=135,
    protein="5 g",
    carbohydrates="17 g",
    fiber="5 g",
    fat="6 g",
    health_benefits=[
        "Banana stem is known for kidney stone prevention, detoxification, and high dietary fiber.",
        "Moong dal adds wholesome light protein."
    ],
    health_tips=[
        "Keep chopped banana stem in buttermilk-water to prevent oxidation and browning.",
        "Remove the fibrous rings thoroughly while slicing for tender bites."
    ],
    instructions=[
        "Remove the outer layers of 250 g banana stem and cut the tender part into thin slices.",
        "Remove the thin fibers while cutting and chop the slices into small pieces.",
        "Keep the chopped banana stem in water mixed with 2 tbsp buttermilk to prevent it from changing color.",
        "Soak 2 tbsp moong dal in water for 15–20 minutes.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds, 1 tsp urad dal, 1/2 tsp cumin seeds, and curry leaves.",
        "When the mustard seeds start popping, add 1 chopped green chili and the drained banana stem.",
        "Add 1/4 tsp turmeric powder and salt. Mix well.",
        "Add the soaked moong dal, cover, and cook on low heat for 8–10 minutes until the banana stem becomes tender.",
        "Add 1/2 tsp sambar powder and 2 tbsp grated coconut. Mix well.",
        "Cook for another 2 minutes, then turn off the heat and serve."
    ],
    tags=["Poriyal", "Kidney Care", "South Indian", "Detox"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_bs1, package=p_banana_stem, name=p_banana_stem.name, quantity=Decimal("250"), unit="g", notes="Finely chopped and defibered", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bs1, package=None, name="Moong Dal", quantity=Decimal("2"), unit="tbsp", notes="Soaked", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_bs1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_bs1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=3)

# Recipe 2: Vazhaithandu Mor Kootu
r_bs2 = VegetableRecipe.objects.create(
    package=p_banana_stem,
    name="Vazhaithandu Mor Kootu",
    slug="vazhaithandu-mor-kootu",
    image="/mockups/recipes/banana_stem_vazhai_thandu_banana_stem_kootu.jpg",
    short_description="Cooling banana stem and ground cumin-coconut gravy finished with beaten yogurt and coconut oil tempering.",
    prep_time_minutes=15,
    cook_time_minutes=12,
    total_time_minutes=27,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=125,
    protein="5 g",
    carbohydrates="13 g",
    fiber="4 g",
    fat="6 g",
    health_benefits=[
        "Combines cooling probiotic curd with hydrating, detoxifying plantain stem.",
        "Excellent for renal wellness, hydration, and acidity relief."
    ],
    health_tips=[
        "Let the cooked mixture cool slightly before adding beaten curd so the yogurt remains silky smooth.",
        "A teaspoon of coconut oil in the tempering gives an authentic Kerala/Tamil Brahmin aroma."
    ],
    instructions=[
        "Remove the outer layers of 250 g banana stem and cut the tender part into small pieces.",
        "Remove the thin fibers and keep the chopped banana stem in water mixed with a little buttermilk.",
        "Cook the banana stem with 1/2 cup water and salt until it becomes tender.",
        "Grind 2 tbsp grated coconut, 1/2 tsp cumin seeds, and 1 green chili with a little water to make a smooth paste.",
        "Add the coconut paste to the cooked banana stem and mix well.",
        "Cook on low heat for 4–5 minutes.",
        "Turn off the heat and allow it to cool slightly.",
        "Beat 1/2 cup thick curd until smooth and add it to the banana stem mixture.",
        "Mix gently without boiling the curd.",
        "Heat 1 tsp coconut oil in a small pan. Add 1/2 tsp mustard seeds, 1 dry red chili, and a few curry leaves.",
        "When the mustard seeds start popping, pour the seasoning over the kootu.",
        "Mix gently and serve with rice."
    ],
    tags=["Mor Kootu", "Probiotic", "Cooling", "Traditional"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_bs2, package=p_banana_stem, name=p_banana_stem.name, quantity=Decimal("250"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bs2, package=None, name="Thick Curd / Yogurt", quantity=Decimal("0.5"), unit="cup", notes="Beaten smooth", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_bs2, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_bs2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Vazhaithandu Usli
r_bs3 = VegetableRecipe.objects.create(
    package=p_banana_stem,
    name="Vazhaithandu Usli",
    slug="vazhaithandu-usli",
    image="/mockups/recipes/banana_stem_vazhai_thandu_banana_stem_salad.jpg",
    short_description="High-protein steamed spiced lentil crumble tossed with tender simmered banana stem.",
    prep_time_minutes=60,
    cook_time_minutes=20,
    total_time_minutes=80,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=235,
    protein="11 g",
    carbohydrates="29 g",
    fiber="7 g",
    fat="8 g",
    health_benefits=[
        "Toor and chana dal provide rich plant protein and complex carbohydrates.",
        "Dietary fiber aids regular digestion and long-lasting fullness."
    ],
    health_tips=[
        "Soak dal for 1 hour and grind coarsely without excess water for the perfect crumbly texture.",
        "Slow roast on low heat while breaking dal dumplings into dry, aromatic bits."
    ],
    instructions=[
        "Remove the outer layers of 250 g banana stem and cut the tender part into small pieces.",
        "Remove the thin fibers and keep the chopped banana stem in water mixed with a little buttermilk.",
        "Soak 1/4 cup toor dal and 2 tbsp chana dal in water for 1 hour.",
        "Drain the dal and grind it with 2 dry red chilies, 1/4 tsp turmeric powder, a pinch of asafoetida (perungayam), and salt. Make a coarse paste without adding much water.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds.",
        "When the mustard seeds start popping, add the drained banana stem.",
        "Add a little salt, cover, and cook on low heat for 5–7 minutes until the banana stem starts becoming tender.",
        "Add the ground dal mixture and mix well.",
        "Cook on low heat for 10–12 minutes, stirring occasionally, until the dal is fully cooked and the banana stem becomes tender.",
        "Break the cooked dal mixture into small pieces while stirring.",
        "Cook for another 2–3 minutes until the mixture becomes dry.",
        "Turn off the heat and serve with rice and kuzhambu."
    ],
    tags=["Paruppu Usli", "High Protein", "Traditional", "South Indian"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_bs3, package=p_banana_stem, name=p_banana_stem.name, quantity=Decimal("250"), unit="g", notes="Finely chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bs3, package=None, name="Toor Dal & Chana Dal", quantity=Decimal("0.35"), unit="cup", notes="Soaked and coarsely ground", is_catalog_vegetable=False, sort_order=1)


# ==============================================================================
# 3. GREEN ZUCCHINI - Package ID: 916
# ==============================================================================

# Recipe 1: Green Zucchini Fritters
r_gz1 = VegetableRecipe.objects.create(
    package=p_green_zucchini,
    name="Green Zucchini Fritters",
    slug="green-zucchini-fritters",
    image="/mockups/recipes/green_zucchini_zucchini_stir_fry.jpg",
    short_description="Crispy, golden pan-fried zucchini fritters made with besan, wheat flour, onions, and green chilies.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=220,
    protein="7 g",
    carbohydrates="27 g",
    fiber="5 g",
    fat="10 g",
    health_benefits=[
        "Zucchini provides hydration, vitamin C, and lutein for skin and eye health.",
        "Besan and whole wheat flour offer wholesome protein and dietary fiber."
    ],
    health_tips=[
        "Salt and squeeze grated zucchini thoroughly to remove excess moisture for crisp fritters.",
        "Pan fry with minimal oil over medium heat until golden on both sides."
    ],
    instructions=[
        "Wash 2 medium green zucchini and grate them using the large holes of a grater.",
        "Place the grated zucchini in a bowl, add a little salt, and leave for 5 minutes.",
        "Squeeze out the extra water from the zucchini.",
        "Add 1/4 cup besan, 2 tbsp wheat flour, 1 small chopped onion, 1 chopped green chili, 1/2 tsp black pepper, and salt.",
        "Mix well to make a thick mixture.",
        "Heat 1½ tbsp oil in a pan over medium heat.",
        "Take small portions of the mixture, place them in the pan, and flatten them slightly.",
        "Cook for 3–4 minutes until the bottom becomes golden.",
        "Turn them gently and cook for another 3–4 minutes until both sides are golden and crisp.",
        "Remove from the pan and serve hot with yogurt or chutney."
    ],
    tags=["Fritters", "Snacks", "Low Calorie", "Crispy"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_gz1, package=p_green_zucchini, name=p_green_zucchini.name, quantity=Decimal("2"), unit="medium", notes="Grated and squeezed", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_gz1, package=None, name="Besan (Gram Flour)", quantity=Decimal("0.25"), unit="cup", notes="Binding flour", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_gz1, package=None, name="Wheat Flour", quantity=Decimal("2"), unit="tbsp", notes="Flour", is_catalog_vegetable=False, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_gz1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_gz1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Stuffed Green Zucchini
r_gz2 = VegetableRecipe.objects.create(
    package=p_green_zucchini,
    name="Stuffed Green Zucchini",
    slug="stuffed-green-zucchini",
    image="/mockups/recipes/green_zucchini_zucchini_vegetable_roast.jpg",
    short_description="Baked zucchini boats filled with spiced green peas, onions, and melted golden cheese.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=210,
    protein="9 g",
    carbohydrates="19 g",
    fiber="5 g",
    fat="12 g",
    health_benefits=[
        "High in vitamin A, vitamin C, calcium, and vegetable protein from green peas.",
        "A nutrient-rich gourmet meal that is naturally portion-controlled."
    ],
    health_tips=[
        "Scoop out the zucchini center carefully leaving a 1/2 inch border to hold filling securely.",
        "Sauté filling until completely dry before stuffing to keep zucchini boats crisp."
    ],
    instructions=[
        "Wash 2 medium green zucchini and cut each lengthwise into two halves.",
        "Carefully scoop out the soft inside of the zucchini, leaving a thick outer layer.",
        "Heat 1 tbsp oil in a pan. Add 1 small chopped onion and cook until soft.",
        "Add 1/2 cup cooked green peas, the chopped zucchini inside, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt.",
        "Cook for 4–5 minutes until the filling becomes dry.",
        "Place the zucchini halves on a baking tray and fill them with the prepared mixture.",
        "Sprinkle 1/4 cup grated cheese over the top.",
        "Bake at 180°C for 12–15 minutes until the zucchini becomes tender and the cheese melts.",
        "Remove from the oven and serve hot."
    ],
    tags=["Baked", "Stuffed Vegetables", "Gourmet", "High Protein"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_gz2, package=p_green_zucchini, name=p_green_zucchini.name, quantity=Decimal("2"), unit="medium", notes="Cut lengthwise and hollowed", is_catalog_vegetable=True, sort_order=0)
if peas_pkg:
    RecipeIngredient.objects.create(recipe=r_gz2, package=peas_pkg, name=peas_pkg.name, quantity=Decimal("0.5"), unit="cup", notes="Cooked green peas", is_catalog_vegetable=True, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_gz2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_gz2, package=None, name="Grated Cheese", quantity=Decimal("0.25"), unit="cup", notes="For topping", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Green Zucchini Vegetable Soup
r_gz3 = VegetableRecipe.objects.create(
    package=p_green_zucchini,
    name="Green Zucchini Vegetable Soup",
    slug="green-zucchini-vegetable-soup",
    image="/mockups/recipes/green_zucchini_zucchini_soup.jpg",
    short_description="Warm, comforting soup brimming with tender zucchini cubes, carrots, sweet corn, and a hint of lemon.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=125,
    protein="4 g",
    carbohydrates="20 g",
    fiber="4 g",
    fat="4 g",
    health_benefits=[
        "Extremely low in calories yet rich in electrolytes, hydration, and antioxidants.",
        "Carrots, garlic, and sweet corn contribute beta-carotene and immune resilience."
    ],
    health_tips=[
        "Lightly mash some zucchini and vegetables against the pot wall to create natural thickness.",
        "Finish with fresh lemon juice right before serving for a lively citrus aroma."
    ],
    instructions=[
        "Wash 2 medium green zucchini and cut them into small pieces.",
        "Heat 1 tsp oil in a pan and add 2 chopped garlic cloves.",
        "Add 1 small chopped onion and cook until soft.",
        "Add the zucchini, 1 small chopped carrot, 1/2 cup sweet corn, salt, and 1/4 tsp black pepper.",
        "Add 2½ cups water or vegetable stock.",
        "Cover and cook for 10–12 minutes until the vegetables become tender.",
        "Mash some of the zucchini and vegetables lightly with a spoon to make the soup slightly thick.",
        "Add 1 tsp lemon juice and mix well.",
        "Cook for another 1 minute and turn off the heat.",
        "Serve hot."
    ],
    tags=["Soup", "Low Calorie", "Immunity", "Healthy Dinner"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_gz3, package=p_green_zucchini, name=p_green_zucchini.name, quantity=Decimal("2"), unit="medium", notes="Diced", is_catalog_vegetable=True, sort_order=0)
if carrot_pkg:
    RecipeIngredient.objects.create(recipe=r_gz3, package=carrot_pkg, name=carrot_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if corn_pkg:
    RecipeIngredient.objects.create(recipe=r_gz3, package=corn_pkg, name=corn_pkg.name, quantity=Decimal("0.5"), unit="cup", notes="Sweet corn kernels", is_catalog_vegetable=True, sort_order=2)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_gz3, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 4. YELLOW BELL PEPPER (MANJAL KUDA MILAGAI) - Package ID: 917
# ==============================================================================

# Recipe 1: Yellow Bell Pepper Bajji
r_yp1 = VegetableRecipe.objects.create(
    package=p_yellow_pepper,
    name="Yellow Bell Pepper Bajji",
    slug="yellow-bell-pepper-bajji",
    image="/mockups/recipes/yellow_bell_pepper_manjal_kuda_milagai_yellow_pepper_stir_fry.jpg",
    short_description="Crispy, golden tea-time bajjis made with sweet yellow pepper strips dipped in spiced gram flour batter.",
    prep_time_minutes=10,
    cook_time_minutes=8,
    total_time_minutes=18,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=250,
    protein="7 g",
    carbohydrates="29 g",
    fiber="5 g",
    fat="12 g",
    health_benefits=[
        "Yellow bell peppers are among the richest dietary sources of vitamin C and carotenoids.",
        "Besan delivers plant protein and essential iron."
    ],
    health_tips=[
        "Make batter thick enough to coat strips evenly without sliding off.",
        "Maintain oil at steady medium heat so peppers cook through while crust turns golden-crisp."
    ],
    instructions=[
        "Wash 2 yellow bell peppers, remove the seeds, and cut them into thick strips.",
        "In a bowl, add 1/2 cup besan, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, a pinch of asafoetida (perungayam), and salt.",
        "Add water little by little and mix to make a thick batter.",
        "Heat oil in a deep pan over medium heat.",
        "Dip each yellow bell pepper strip into the batter and coat it well.",
        "Carefully place the coated pieces into the hot oil.",
        "Fry for 3–4 minutes, turning them occasionally, until golden and crisp.",
        "Remove and place on a paper towel to remove excess oil.",
        "Serve hot with coconut chutney or tomato sauce."
    ],
    tags=["Bajji", "Fritters", "Tea Time", "Monsoon Special"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_yp1, package=p_yellow_pepper, name=p_yellow_pepper.name, quantity=Decimal("2"), unit="pieces", notes="Cut into thick strips", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_yp1, package=None, name="Besan (Gram Flour)", quantity=Decimal("0.5"), unit="cup", notes="For batter", is_catalog_vegetable=False, sort_order=1)

# Recipe 2: Stuffed Yellow Bell Pepper
r_yp2 = VegetableRecipe.objects.create(
    package=p_yellow_pepper,
    name="Stuffed Yellow Bell Pepper",
    slug="stuffed-yellow-bell-pepper",
    image="/mockups/recipes/yellow_bell_pepper_manjal_kuda_milagai_yellow_pepper_rice.jpg",
    short_description="Whole yellow bell peppers stuffed with spiced peas, rice, and onions, oven-baked under a melted cheese crown.",
    prep_time_minutes=15,
    cook_time_minutes=20,
    total_time_minutes=35,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=270,
    protein="9 g",
    carbohydrates="36 g",
    fiber="6 g",
    fat="10 g",
    health_benefits=[
        "Rich in antioxidant carotenoids (lutein, zeaxanthin) that support ocular health.",
        "Rice, peas, and cheese combine for complete protein and sustained energy."
    ],
    health_tips=[
        "Carefully de-seed peppers from top without cutting through the bottom base.",
        "Bake at 180°C until peppers wrinkle slightly and cheese browns appetizingly."
    ],
    instructions=[
        "Wash 2 large yellow bell peppers and cut off the tops.",
        "Remove the seeds and the white inner parts without breaking the peppers.",
        "Heat 1 tbsp oil in a pan and add 1 small chopped onion.",
        "Cook until the onion becomes soft.",
        "Add 1/2 cup cooked peas, 1/2 cup cooked rice, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1/2 tsp coriander powder, and salt.",
        "Mix well and cook for 3–4 minutes until the filling becomes dry.",
        "Fill the yellow bell peppers with the prepared mixture.",
        "Place the stuffed peppers in a baking dish and sprinkle 1/4 cup grated cheese on top.",
        "Bake at 180°C for 15–20 minutes until the peppers become tender and the cheese melts.",
        "Remove from the oven, allow them to cool for 2–3 minutes, and serve."
    ],
    tags=["Baked", "Stuffed Pepper", "Cheesy", "Gourmet Dinner"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_yp2, package=p_yellow_pepper, name=p_yellow_pepper.name, quantity=Decimal("2"), unit="large", notes="Whole, tops removed", is_catalog_vegetable=True, sort_order=0)
if peas_pkg:
    RecipeIngredient.objects.create(recipe=r_yp2, package=peas_pkg, name=peas_pkg.name, quantity=Decimal("0.5"), unit="cup", notes="Cooked peas", is_catalog_vegetable=True, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_yp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_yp2, package=None, name="Cooked Rice", quantity=Decimal("0.5"), unit="cup", notes="Steamed", is_catalog_vegetable=False, sort_order=3)
RecipeIngredient.objects.create(recipe=r_yp2, package=None, name="Grated Cheese", quantity=Decimal("0.25"), unit="cup", notes="For topping", is_catalog_vegetable=False, sort_order=4)

# Recipe 3: Yellow Bell Pepper Besan Curry
r_yp3 = VegetableRecipe.objects.create(
    package=p_yellow_pepper,
    name="Yellow Bell Pepper Besan Curry",
    slug="yellow-bell-pepper-besan-curry",
    image="/mockups/recipes/yellow_bell_pepper_manjal_kuda_milagai_yellow_pepper_soup.jpg",
    short_description="Traditional dry curry combining sweet diced yellow bell peppers coated in roasted spiced gram flour (besan).",
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=190,
    protein="7 g",
    carbohydrates="23 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Provides rich vitamin C along with roasted gram flour protein.",
        "Spices like cumin and mustard promote smooth gastrointestinal digestion."
    ],
    health_tips=[
        "Sprinkle water in gentle splashes while mixing besan to coat peppers evenly without lumps.",
        "Cover on low heat so the besan cooks completely until fragrant and dry."
    ],
    instructions=[
        "Wash 2 yellow bell peppers, remove the seeds, and cut them into small pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds and 1/2 tsp cumin seeds.",
        "When the mustard seeds start popping, add 1 small chopped onion and cook until soft.",
        "Add the yellow bell pepper pieces, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, and salt.",
        "Cook for 4–5 minutes until the pepper becomes slightly tender.",
        "Add 1/4 cup besan and mix well so the flour coats the peppers.",
        "Sprinkle 1/4 cup water little by little while mixing to prevent lumps.",
        "Cover and cook on low heat for 5–6 minutes until the besan is fully cooked.",
        "Remove the lid and cook for another 2–3 minutes until the mixture becomes dry.",
        "Add 1 tbsp chopped coriander leaves, mix well, and turn off the heat."
    ],
    tags=["Besan Curry", "Dry Curry", "High Fiber", "Roti Side"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_yp3, package=p_yellow_pepper, name=p_yellow_pepper.name, quantity=Decimal("2"), unit="pieces", notes="Diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_yp3, package=None, name="Besan (Gram Flour)", quantity=Decimal("0.25"), unit="cup", notes="Spiced coating", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_yp3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_yp3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 5. RED BELL PEPPER - Package ID: 918
# ==============================================================================

# Recipe 1: Stuffed Red Bell Pepper
r_rp1 = VegetableRecipe.objects.create(
    package=p_red_pepper,
    name="Stuffed Red Bell Pepper",
    slug="stuffed-red-bell-pepper",
    image="/mockups/recipes/red_bell_pepper_red_pepper_pasta.jpg",
    short_description="Oven-roasted whole red bell peppers filled with seasoned potatoes, green peas, and molten cheese.",
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=250,
    protein="8 g",
    carbohydrates="32 g",
    fiber="6 g",
    fat="11 g",
    health_benefits=[
        "Red bell peppers contain high levels of vitamin C and lycopene for cellular health.",
        "Wholesome potato-peas filling delivers potassium and plant protein."
    ],
    health_tips=[
        "Bake at 200°C so peppers caramelize and soften while cheese develops golden spots.",
        "Allow to rest for 2 minutes after baking for easy slicing and serving."
    ],
    instructions=[
        "Wash 2 large red bell peppers and cut off the tops.",
        "Remove the seeds and white inner parts.",
        "Heat 1 tbsp oil in a pan and add 1 small chopped onion.",
        "Cook until the onion becomes soft.",
        "Add 1/2 cup cooked peas, 1/2 cup cooked potato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1/2 tsp coriander powder, and salt.",
        "Mix well and cook for 3–4 minutes until the filling becomes dry.",
        "Fill the red bell peppers with the prepared mixture.",
        "Place them in a baking dish and sprinkle 1/4 cup grated cheese on top.",
        "Bake at 200°C for 20–25 minutes until the peppers become tender and the cheese melts.",
        "Remove from the oven, rest for 2 minutes, and serve hot."
    ],
    tags=["Baked", "Stuffed Pepper", "High Fiber", "Gourmet Dinner"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_rp1, package=p_red_pepper, name=p_red_pepper.name, quantity=Decimal("2"), unit="large", notes="Whole, tops removed", is_catalog_vegetable=True, sort_order=0)
if potato_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=potato_pkg, name=potato_pkg.name, quantity=Decimal("0.5"), unit="cup", notes="Boiled and mashed", is_catalog_vegetable=True, sort_order=1)
if peas_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=peas_pkg, name=peas_pkg.name, quantity=Decimal("0.5"), unit="cup", notes="Boiled green peas", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
RecipeIngredient.objects.create(recipe=r_rp1, package=None, name="Grated Cheese", quantity=Decimal("0.25"), unit="cup", notes="For topping", is_catalog_vegetable=False, sort_order=4)

# Recipe 2: Roasted Red Bell Pepper Soup
r_rp2 = VegetableRecipe.objects.create(
    package=p_red_pepper,
    name="Roasted Red Bell Pepper Soup",
    slug="roasted-red-bell-pepper-soup",
    image="/mockups/recipes/red_bell_pepper_red_pepper_vegetable_soup.jpg",
    short_description="Silky, vibrant soup made by simmering sweet red peppers, tomatoes, garlic, and stock, blended until smooth.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="3 g",
    carbohydrates="16 g",
    fiber="4 g",
    fat="4 g",
    health_benefits=[
        "Extremely low calorie and supercharged with lycopene, vitamin A, and vitamin C.",
        "Garlic and black pepper strengthen immunity and improve digestive fire."
    ],
    health_tips=[
        "Simmer red peppers and tomatoes till soft before blending for a velvety, creamy consistency.",
        "Add a splash of fresh lemon juice at the end to balance sweet roasted undertones."
    ],
    instructions=[
        "Wash 2 medium red bell peppers, remove the seeds, and cut them into large pieces.",
        "Heat 1 tsp oil in a pan and add 2 chopped garlic cloves.",
        "Add 1 small chopped onion and cook until soft.",
        "Add the red bell peppers and 1 chopped tomato.",
        "Add 1/4 tsp black pepper and salt. Cook for 5–6 minutes until the vegetables become soft.",
        "Add 2 cups vegetable stock or water and cook for 10–12 minutes.",
        "Allow the mixture to cool slightly, then blend until smooth.",
        "Pour the blended soup back into the pan and cook for another 3–4 minutes.",
        "Add 1 tsp lemon juice and mix well.",
        "Turn off the heat and serve hot."
    ],
    tags=["Roasted Soup", "Low Calorie", "Antioxidant Rich", "Warm Bowl"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_rp2, package=p_red_pepper, name=p_red_pepper.name, quantity=Decimal("2"), unit="medium", notes="Diced", is_catalog_vegetable=True, sort_order=0)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_rp2, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="medium", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_rp2, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_rp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Red Bell Pepper Bajji
r_rp3 = VegetableRecipe.objects.create(
    package=p_red_pepper,
    name="Red Bell Pepper Bajji",
    slug="red-bell-pepper-bajji",
    image="/mockups/recipes/red_bell_pepper_red_pepper_stir_fry.jpg",
    short_description="Delectable South Indian style bajjis made with sweet red bell pepper slices in crisp besan-rice flour batter.",
    prep_time_minutes=10,
    cook_time_minutes=8,
    total_time_minutes=18,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=245,
    protein="7 g",
    carbohydrates="29 g",
    fiber="5 g",
    fat="12 g",
    health_benefits=[
        "Red bell peppers provide natural vitamin C, beta-carotene, and bioflavonoids.",
        "Besan-rice flour crust provides plant protein and crunch."
    ],
    health_tips=[
        "Rice flour added to besan ensures extra crispness and prevents oil absorption.",
        "Fry until outer coating is deep golden and crisp."
    ],
    instructions=[
        "Wash 2 large red bell peppers, remove the seeds, and cut them into thick strips.",
        "In a bowl, add 1/2 cup besan, 2 tbsp rice flour, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, a pinch of asafoetida (perungayam), and salt.",
        "Add water little by little and mix to make a thick batter.",
        "Heat oil in a deep pan over medium heat.",
        "Dip each red bell pepper piece into the batter and coat it well.",
        "Carefully place the coated pieces into the hot oil.",
        "Fry for 3–4 minutes, turning them occasionally, until golden and crisp.",
        "Remove and place on a paper towel to remove excess oil.",
        "Serve hot with coconut chutney or tomato sauce."
    ],
    tags=["Bajji", "Fritters", "Crispy", "Snacks"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_rp3, package=p_red_pepper, name=p_red_pepper.name, quantity=Decimal("2"), unit="large", notes="Cut into thick strips", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_rp3, package=None, name="Besan (Gram Flour)", quantity=Decimal("0.5"), unit="cup", notes="For batter", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_rp3, package=None, name="Rice Flour", quantity=Decimal("2"), unit="tbsp", notes="For crispness", is_catalog_vegetable=False, sort_order=2)

print("SUCCESS: Created all 15 updated recipes with exact instructions, steps, and nutrition values!")
