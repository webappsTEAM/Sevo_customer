import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

p_amla = Package.objects.filter(id=925).first() or Package.objects.filter(name__icontains='Amla').first()
p_coriander = Package.objects.get(id=875)       # Coriander Bunch (Kothamalli)
p_curry_leaves = Package.objects.get(id=874)    # Curry Leaves (Karuvepillai)

# Helper packages for ingredient relationships
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
cucumber_pkg = Package.objects.filter(id=880).first() or Package.objects.filter(name__icontains='Cucumber').first()
carrot_pkg = Package.objects.filter(id=879).first() or Package.objects.filter(name__icontains='Carrot').first()
capsicum_pkg = Package.objects.filter(id=883).first() or Package.objects.filter(name__icontains='Capsicum').first()
corn_pkg = Package.objects.filter(id=886).first() or Package.objects.filter(name__icontains='Sweet Corn').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()
lemon_pkg = Package.objects.filter(id=877).first() or Package.objects.filter(name__icontains='Lemon').first()

print("Deleting old recipes for Coriander, Curry Leaves (and Amla if present)...")
if p_amla:
    p_amla.recipes.all().delete()
p_coriander.recipes.all().delete()
p_curry_leaves.recipes.all().delete()

# ==============================================================================
# 1. AMLA (NELLIKAAI) - Package ID: 925
# ==============================================================================

if p_amla:
    r_a1 = VegetableRecipe.objects.create(
        package=p_amla,
        name="Nellikai Pachadi",
        slug="nellikai-pachadi",
        image="/mockups/recipes/amla_nellikaai_amla_rice.jpg",
        short_description="Cooling, probiotic South Indian yogurt relish with coarse grated Indian gooseberries, coconut, green chilies, and cucumber.",
        prep_time_minutes=10,
        cook_time_minutes=3,
        total_time_minutes=13,
        difficulty=VegetableRecipe.Difficulty.EASY,
        servings=2,
        calories=105,
        protein="5 g",
        carbohydrates="10 g",
        fiber="2 g",
        fat="5 g",
        health_benefits=[
            "Amla delivers massive doses of natural vitamin C, tannins, and immunity-enhancing antioxidants.",
            "Probiotic curd and cooling cucumber soothe gastric acidity and nurture gut microbiome."
        ],
        health_tips=[
            "Deseed fresh amla and pulse coarsely without excess water for the best pachadi texture.",
            "Serve chilled alongside spicy South Indian gravies or hot steamed rice."
        ],
        instructions=[
            "Wash 5–6 fresh nellikai and remove the seeds.",
            "Grind the nellikai with 2 tbsp grated coconut, 1 green chili, and a little salt into a coarse mixture.",
            "Whisk 1 cup thick curd until smooth.",
            "Add the nellikai mixture to the curd and mix well.",
            "Add 2 tbsp grated cucumber and mix gently.",
            "Heat 1 tsp oil and add 1/2 tsp mustard seeds and a few curry leaves. Cook until the mustard seeds start popping.",
            "Pour the seasoning over the pachadi, mix well, and serve chilled."
        ],
        tags=["Pachadi", "Probiotic", "Immunity Booster", "Cooling Relish"],
        is_active=True,
        is_popular=True,
        sort_order=0
    )
    RecipeIngredient.objects.create(recipe=r_a1, package=p_amla, name=p_amla.name, quantity=Decimal("6"), unit="pieces", notes="Deseeded and coarsely crushed", is_catalog_vegetable=True, sort_order=0)
    RecipeIngredient.objects.create(recipe=r_a1, package=None, name="Thick Curd / Yogurt", quantity=Decimal("1"), unit="cup", notes="Whisked smooth", is_catalog_vegetable=False, sort_order=1)
    RecipeIngredient.objects.create(recipe=r_a1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=2)
    if cucumber_pkg:
        RecipeIngredient.objects.create(recipe=r_a1, package=cucumber_pkg, name=cucumber_pkg.name, quantity=Decimal("2"), unit="tbsp", notes="Grated", is_catalog_vegetable=True, sort_order=3)
    if chilli_pkg:
        RecipeIngredient.objects.create(recipe=r_a1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For coarse grind", is_catalog_vegetable=True, sort_order=4)

    # Recipe 2: Nellikai Oorugai
    r_a2 = VegetableRecipe.objects.create(
        package=p_amla,
        name="Nellikai Oorugai",
        slug="nellikai-oorugai",
        image="/mockups/recipes/amla_nellikaai_amla_chutney.jpg",
        short_description="Instant South Indian style amla pickle simmered in sesame oil, red chili, mustard, and roasted fenugreek powder.",
        prep_time_minutes=15,
        cook_time_minutes=12,
        total_time_minutes=27,
        difficulty=VegetableRecipe.Difficulty.EASY,
        servings=2,
        calories=115,
        protein="2 g",
        carbohydrates="9 g",
        fiber="4 g",
        fat="8 g",
        health_benefits=[
            "Amla helps purify blood, supports liver vitality, and strengthens capillary resistance.",
            "Roasted fenugreek and sesame oil provide digestive enzymes and healthy fats."
        ],
        health_tips=[
            "Steam amla until segments open naturally; this keeps the pickle tender and easy to deseed.",
            "Use authentic sesame (gingelly) oil and finish with roasted methi powder for deep flavor."
        ],
        instructions=[
            "Wash 150 g nellikai and steam or boil for about 10 minutes until slightly soft.",
            "Allow them to cool, remove the seeds, and separate the nellikai into small pieces.",
            "Heat 1½ tbsp sesame oil and add 1/2 tsp mustard seeds and a pinch of asafoetida (perungayam).",
            "Add the nellikai pieces, 1/4 tsp turmeric powder, 1 tsp red chili powder, and salt.",
            "Cook on low heat for 7–10 minutes until the spices coat the nellikai well.",
            "Add 1/4 tsp roasted fenugreek powder and mix well.",
            "Turn off the heat, cool completely, and serve as a pickle with curd rice or rice."
        ],
        tags=["Pickle", "Oorugai", "Instant Pickle", "Traditional"],
        is_active=True,
        is_popular=True,
        sort_order=1
    )
    RecipeIngredient.objects.create(recipe=r_a2, package=p_amla, name=p_amla.name, quantity=Decimal("150"), unit="g", notes="Steamed, deseeded segments", is_catalog_vegetable=True, sort_order=0)
    RecipeIngredient.objects.create(recipe=r_a2, package=None, name="Sesame Oil", quantity=Decimal("1.5"), unit="tbsp", notes="Gingelly oil", is_catalog_vegetable=False, sort_order=1)

    # Recipe 3: Amla Sabzi
    r_a3 = VegetableRecipe.objects.create(
        package=p_amla,
        name="Amla Sabzi",
        slug="amla-sabzi",
        image="/mockups/recipes/amla_nellikaai_amla_vegetable_salad.jpg",
        short_description="Wholesome North Indian spiced gooseberry dry curry cooked with onions, tomatoes, coriander, and amchur.",
        prep_time_minutes=10,
        cook_time_minutes=15,
        total_time_minutes=25,
        difficulty=VegetableRecipe.Difficulty.EASY,
        servings=2,
        calories=125,
        protein="2 g",
        carbohydrates="13 g",
        fiber="4 g",
        fat="7 g",
        health_benefits=[
            "Supports metabolic detox, skin glow, and blood glucose balance.",
            "Cumin, coriander, and tomato lycopene create a nutrient-dense vegetable side."
        ],
        health_tips=[
            "Boil gooseberries for 5–7 minutes so the sharp astringency mellows into a savory bite.",
            "Cook covered with 1/4 cup water so amla segments absorb the spiced tomato gravy."
        ],
        instructions=[
            "Wash 200 g nellikai and boil for 5–7 minutes until slightly soft. Cool and remove the seeds.",
            "Heat 1 tbsp oil in a pan and add 1/2 tsp cumin seeds.",
            "Add 1 small chopped onion and cook until it becomes soft.",
            "Add 1 chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt. Cook until the tomato becomes soft.",
            "Add the nellikai pieces and mix gently with the masala.",
            "Add 1/4 cup water, cover, and cook for 5–6 minutes until the nellikai absorbs the spices.",
            "Add 1/2 tsp amchur powder and chopped coriander leaves, mix well, and serve hot."
        ],
        tags=["Sabzi", "Low Calorie", "Immunity Booster", "Roti Side"],
        is_active=True,
        is_popular=True,
        sort_order=2
    )
    RecipeIngredient.objects.create(recipe=r_a3, package=p_amla, name=p_amla.name, quantity=Decimal("200"), unit="g", notes="Boiled and deseeded", is_catalog_vegetable=True, sort_order=0)
    if onion_pkg:
        RecipeIngredient.objects.create(recipe=r_a3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
    if tomato_pkg:
        RecipeIngredient.objects.create(recipe=r_a3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 2. CORIANDER BUNCH (KOTHAMALLI) - Package ID: 875
# ==============================================================================

# Recipe 1: Coriander Chutney
r_c1 = VegetableRecipe.objects.create(
    package=p_coriander,
    name="Coriander Chutney",
    slug="coriander-chutney",
    image="/mockups/recipes/coriander_bunch_kothamalli_coriander_chutney.jpg",
    short_description="Vibrant, zesty all-purpose green chutney blended fresh with coriander leaves, green chili, garlic, ginger, roasted cumin, and lemon.",
    prep_time_minutes=10,
    cook_time_minutes=0,
    total_time_minutes=10,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=35,
    protein="1 g",
    carbohydrates="5 g",
    fiber="2 g",
    fat="1 g",
    health_benefits=[
        "Coriander binds and aids elimination of heavy metals while providing natural vitamin K and antioxidants.",
        "Lemon and raw garlic bolster respiratory resilience and digestive fire."
    ],
    health_tips=[
        "Blend using chilled water or ice cubes to retain the bright green chlorophyll color.",
        "Add fresh lemon juice to preserve vibrant color and deliver sharp tang."
    ],
    instructions=[
        "Wash 1 cup fresh coriander leaves and remove the thick stems.",
        "Add the coriander leaves, 1 green chili, 2 garlic cloves, and 1/2 inch ginger to a blender.",
        "Add 1/2 tsp roasted cumin powder, salt, and 1 tsp lemon juice.",
        "Add 2–3 tbsp water and blend until smooth.",
        "Taste and add more salt or lemon juice if needed.",
        "Transfer the chutney to a bowl and mix well.",
        "Serve fresh with idli, dosa, samosa, pakora, or other snacks."
    ],
    tags=["Chutney", "Green Chutney", "Low Calorie", "Snack Accompaniment"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_c1, package=p_coriander, name=p_coriander.name, quantity=Decimal("1"), unit="cup", notes="Fresh leaves washed", is_catalog_vegetable=True, sort_order=0)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_c1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Green chili", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_c1, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Peeled", is_catalog_vegetable=True, sort_order=2)
if ginger_pkg:
    RecipeIngredient.objects.create(recipe=r_c1, package=ginger_pkg, name=ginger_pkg.name, quantity=Decimal("0.5"), unit="inch", notes="Fresh", is_catalog_vegetable=True, sort_order=3)
if lemon_pkg:
    RecipeIngredient.objects.create(recipe=r_c1, package=lemon_pkg, name=lemon_pkg.name, quantity=Decimal("1"), unit="tsp", notes="Fresh lemon juice", is_catalog_vegetable=True, sort_order=4)

# Recipe 2: Coriander Rice
r_c2 = VegetableRecipe.objects.create(
    package=p_coriander,
    name="Coriander Rice",
    slug="coriander-rice",
    image="/mockups/recipes/coriander_bunch_kothamalli_coriander_rice.jpg",
    short_description="Fragrant South Indian style variety rice tossed with aromatic blended coriander-ginger-garlic paste and cumin tempering.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=310,
    protein="6 g",
    carbohydrates="55 g",
    fiber="3 g",
    fat="8 g",
    health_benefits=[
        "Coriander supports blood sugar regulation and provides digestive linalool and borneol.",
        "Basmati rice delivers clean complex carbohydrates for active stamina."
    ],
    health_tips=[
        "Cook basmati rice till fluffy and allow grains to cool completely before mixing to prevent mushiness.",
        "Sauté the ground paste on medium flame for 2–3 minutes until raw herbal aroma subsides."
    ],
    instructions=[
        "Cook 1 cup basmati rice with 1½ cups water until the grains are separate, then keep aside.",
        "Blend 1 cup coriander leaves, 2 green chilies, 1/2 inch ginger, 2 garlic cloves, and 1/2 tsp cumin seeds with 2 tbsp water.",
        "Heat 1 tbsp oil in a pan and add 1/2 tsp cumin seeds.",
        "Add 1 small chopped onion and cook until it becomes soft.",
        "Add the coriander paste, a pinch of turmeric, and salt. Cook for 2–3 minutes.",
        "Add the cooked rice and mix gently until the coriander mixture coats the rice evenly.",
        "Cook for 2 minutes, turn off the heat, and serve hot with raita or salad."
    ],
    tags=["Variety Rice", "Lunchbox Special", "South Indian", "Aromatic"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_c2, package=p_coriander, name=p_coriander.name, quantity=Decimal("1"), unit="cup", notes="Blended for paste", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_c2, package=None, name="Basmati Rice", quantity=Decimal("1"), unit="cup", notes="Cooked separate grains", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_c2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_c2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("2"), unit="pieces", notes="For paste", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Coriander Vegetable Salad
r_c3 = VegetableRecipe.objects.create(
    package=p_coriander,
    name="Coriander Vegetable Salad",
    slug="coriander-vegetable-salad",
    image="/mockups/recipes/coriander_bunch_kothamalli_coriander_vegetable_salad.jpg",
    short_description="Crisp garden salad with fresh chopped coriander, cucumbers, carrots, sweet corn, roasted peanuts, and lemon-pepper dressing.",
    prep_time_minutes=10,
    cook_time_minutes=0,
    total_time_minutes=10,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="3 g",
    carbohydrates="14 g",
    fiber="4 g",
    fat="5 g",
    health_benefits=[
        "Loaded with dietary fiber, beta-carotene, vitamin C, and cellular hydration.",
        "Roasted peanuts and fresh herbs provide satisfying crunch and plant micronutrients."
    ],
    health_tips=[
        "Chop coriander roughly and fold into vegetables right before serving for maximal freshness.",
        "Dress with lemon juice and crushed black pepper immediately before eating."
    ],
    instructions=[
        "Wash 1 cup coriander leaves and chop them roughly.",
        "Chop 1 small cucumber, 1 small carrot, 1 small tomato, and 1/2 small capsicum into small pieces.",
        "Add all the vegetables and coriander leaves to a large bowl.",
        "Add 2 tbsp boiled sweet corn and 1 tbsp roasted peanuts.",
        "In a small bowl, mix 1 tbsp lemon juice, 1/4 tsp black pepper, and salt.",
        "Pour the lemon dressing over the salad and mix gently.",
        "Serve immediately as a fresh side dish or light snack."
    ],
    tags=["Salad", "Low Calorie", "Crisp Salad", "Fresh Herbs"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_c3, package=p_coriander, name=p_coriander.name, quantity=Decimal("1"), unit="cup", notes="Roughly chopped", is_catalog_vegetable=True, sort_order=0)
if cucumber_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=cucumber_pkg, name=cucumber_pkg.name, quantity=Decimal("1"), unit="small", notes="Diced", is_catalog_vegetable=True, sort_order=1)
if carrot_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=carrot_pkg, name=carrot_pkg.name, quantity=Decimal("1"), unit="small", notes="Diced", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="small", notes="Diced", is_catalog_vegetable=True, sort_order=3)
if corn_pkg:
    RecipeIngredient.objects.create(recipe=r_c3, package=corn_pkg, name=corn_pkg.name, quantity=Decimal("2"), unit="tbsp", notes="Boiled sweet corn", is_catalog_vegetable=True, sort_order=4)


# ==============================================================================
# 3. CURRY LEAVES (KARUVEPILLAI) - Package ID: 874
# ==============================================================================

# Recipe 1: Karuveppilai Podi
r_cl1 = VegetableRecipe.objects.create(
    package=p_curry_leaves,
    name="Karuveppilai Podi",
    slug="karuveppilai-podi",
    image="/mockups/recipes/curry_leaves_karuvepillai_curry_leaf_rice.jpg",
    short_description="Traditional Tamil herbal spice powder made with dry-roasted crisp curry leaves, dals, cumin, black pepper, and red chilies.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=95,
    protein="4 g",
    carbohydrates="10 g",
    fiber="3 g",
    fat="4 g",
    health_benefits=[
        "Curry leaves are packed with iron, calcium, folic acid, and alkaloids that promote hair and metabolic wellness.",
        "Roasted lentils and black pepper stimulate digestion and nutrient assimilation."
    ],
    health_tips=[
        "Dry curry leaves completely on a clean towel before roasting so they become crisp without burning.",
        "Grind to a slightly coarse powder for authentic South Indian podi texture."
    ],
    instructions=[
        "Wash 1 cup curry leaves and dry them completely so there is no moisture.",
        "Dry-roast 2 tbsp urad dal, 2 tbsp chana dal, 1 tsp cumin, 1 tsp black pepper and 3–4 dry red chilies until lightly golden.",
        "Add the curry leaves to the same pan and roast on low heat until they become crisp.",
        "Turn off the heat and let all the roasted ingredients cool completely.",
        "Add everything to a mixer with salt and grind into a slightly coarse powder.",
        "Mix well and check the salt and spice level.",
        "Serve with hot rice and sesame oil, or with idli or dosa."
    ],
    tags=["Podi", "Gunpowder", "Hair Health", "Traditional"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_cl1, package=p_curry_leaves, name=p_curry_leaves.name, quantity=Decimal("1"), unit="cup", notes="Dried and roasted crisp", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cl1, package=None, name="Urad Dal & Chana Dal", quantity=Decimal("4"), unit="tbsp", notes="Roasted golden", is_catalog_vegetable=False, sort_order=1)

# Recipe 2: Karuveppilai Thokku
r_cl2 = VegetableRecipe.objects.create(
    package=p_curry_leaves,
    name="Karuveppilai Thokku",
    slug="karuveppilai-thokku",
    image="/mockups/recipes/curry_leaves_karuvepillai_curry_leaf_chutney.jpg",
    short_description="Rich, tangy, glossy curry leaf relish simmered in sesame oil with tamarind pulp, red chilies, and asafoetida.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=145,
    protein="3 g",
    carbohydrates="12 g",
    fiber="5 g",
    fat="10 g",
    health_benefits=[
        "Rich concentration of antioxidants and bioflavonoids that support liver detox.",
        "Tamarind and sesame oil act as natural preservatives and digestive stimulants."
    ],
    health_tips=[
        "Cook the paste on low heat until oil separates around the edges for extended shelf life.",
        "Use cold-pressed gingelly oil for an authentic Chettinad thokku aroma."
    ],
    instructions=[
        "Wash 2 cups curry leaves and dry them completely.",
        "Soak a small lemon-sized piece of tamarind in warm water and extract the thick pulp.",
        "Heat 1 tsp sesame oil and cook the curry leaves on low heat for 4–5 minutes until slightly crisp; cool.",
        "Grind the curry leaves with 3–4 dry red chilies, salt and the tamarind pulp into a thick paste.",
        "Heat 1 tbsp sesame oil, add 1/2 tsp mustard seeds and a pinch of asafoetida (perungayam).",
        "Add the curry leaf paste and cook on low heat, stirring regularly, until thick and the raw smell goes away.",
        "Add 1 tsp sesame oil, cook until the mixture becomes thick and glossy, then cool and serve with rice, idli or dosa."
    ],
    tags=["Thokku", "Traditional Relish", "Long Shelf Life", "Digestive"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_cl2, package=p_curry_leaves, name=p_curry_leaves.name, quantity=Decimal("2"), unit="cups", notes="Washed and dried", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cl2, package=None, name="Tamarind Pulp", quantity=Decimal("3"), unit="tbsp", notes="Thick extract", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_cl2, package=None, name="Sesame Oil", quantity=Decimal("1.5"), unit="tbsp", notes="Gingelly oil", is_catalog_vegetable=False, sort_order=2)

# Recipe 3: Karuveppilai Sadam
r_cl3 = VegetableRecipe.objects.create(
    package=p_curry_leaves,
    name="Karuveppilai Sadam",
    slug="karuveppilai-sadam",
    image="/mockups/recipes/curry_leaves_karuvepillai_curry_leaf_rasam.jpg",
    short_description="Temple-style fragrant curry leaf rice tossed with roasted crunchy peanuts, urad dal, and sesame oil seasoning.",
    prep_time_minutes=15,
    cook_time_minutes=12,
    total_time_minutes=27,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=310,
    protein="6 g",
    carbohydrates="52 g",
    fiber="4 g",
    fat="9 g",
    health_benefits=[
        "Curry leaves help protect against oxidative stress and improve lipid profile.",
        "Peanuts and urad dal provide satisfying crunch and plant protein."
    ],
    health_tips=[
        "Cook rice until individual grains are separate and allow to cool before mixing.",
        "Roast peanuts until golden brown for maximum nutty crunch in every bite."
    ],
    instructions=[
        "Cook 1 cup rice with enough water and let it cool slightly.",
        "Grind 1 cup curry leaves with 2 dry red chilies, 1 tsp cumin and a pinch of salt into a coarse paste without adding much water.",
        "Heat 1 tbsp sesame oil and add 1/2 tsp mustard seeds.",
        "Add 1 tsp urad dal and 2 tbsp peanuts; cook until lightly golden.",
        "Add the curry leaf mixture and cook for 2–3 minutes on low heat.",
        "Add the cooked rice and salt, then gently mix everything together.",
        "Cook for 2 minutes, turn off the heat and serve warm or at room temperature."
    ],
    tags=["Variety Rice", "Curry Leaf Rice", "Temple Style", "Lunchbox"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_cl3, package=p_curry_leaves, name=p_curry_leaves.name, quantity=Decimal("1"), unit="cup", notes="Fresh ground paste", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cl3, package=None, name="Cooked Rice", quantity=Decimal("1"), unit="cup", notes="Cooled separate grains", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_cl3, package=None, name="Peanuts", quantity=Decimal("2"), unit="tbsp", notes="Roasted crunchy", is_catalog_vegetable=False, sort_order=2)

print("SUCCESS: Updated all 9 recipes for Amla, Coriander, and Curry Leaves!")
