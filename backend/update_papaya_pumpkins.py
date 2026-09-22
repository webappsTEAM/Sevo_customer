import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# Get Packages
p_raw_papaya = Package.objects.get(id=926)      # Raw Papaya (Pappalikkai)
p_green_pumpkin = Package.objects.get(id=931)   # Green Pumpkin (Pusanikkai)
p_disco_pumpkin = Package.objects.get(id=933)   # Disco Pumpkin

# Catalog ingredient helper packages
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()
carrot_pkg = Package.objects.filter(id=879).first() or Package.objects.filter(name__icontains='Carrot').first()

print("Deleting old recipes for Raw Papaya, Green Pumpkin, Disco Pumpkin...")
p_raw_papaya.recipes.all().delete()
p_green_pumpkin.recipes.all().delete()
p_disco_pumpkin.recipes.all().delete()

# ==============================================================================
# 1. RAW PAPAYA (PAPPALIKKAI) - Package ID: 926
# ==============================================================================

# Recipe 1: Raw Papaya Sabzi
r_rp1 = VegetableRecipe.objects.create(
    package=p_raw_papaya,
    name="Raw Papaya Sabzi",
    slug="raw-papaya-sabzi",
    image="/mockups/recipes/raw_papaya_pappalikkai_raw_papaya_poriyal.jpg",
    short_description="Everyday spiced semi-dry raw papaya curry cooked with cumin, onions, tomatoes, and tangy amchur powder.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=120,
    protein="2 g",
    carbohydrates="18 g",
    fiber="4 g",
    fat="5 g",
    health_benefits=[
        "Raw papaya contains the digestive enzyme papain, which supports protein breakdown and gut health.",
        "Low in calories and packed with antioxidants and vitamin C."
    ],
    health_tips=[
        "Peel and discard seeds thoroughly before cubing into small, even pieces.",
        "Add amchur (dry mango powder) right before taking off heat to retain its sharp tang."
    ],
    instructions=[
        "Peel 300 g raw papaya, remove the seeds, and cut it into small cubes.",
        "Heat 1 tbsp oil and add 1/2 tsp cumin seeds. Add 1 small chopped onion and cook until soft.",
        "Add 1 tsp ginger-garlic paste and cook for 1 minute.",
        "Add 1 chopped tomato, 1/4 tsp turmeric, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt. Cook until the tomato becomes soft.",
        "Add the raw papaya and mix well.",
        "Add 1/3 cup water, cover, and cook for 12–15 minutes until tender.",
        "Add 1/2 tsp amchur powder and coriander leaves, mix well, and serve."
    ],
    tags=["Sabzi", "North Indian", "Low Calorie", "Everyday Side"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_rp1, package=p_raw_papaya, name=p_raw_papaya.name, quantity=Decimal("300"), unit="g", notes="Peeled and cubed", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_rp1, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=3)

# Recipe 2: Raw Papaya Kofta Curry
r_rp2 = VegetableRecipe.objects.create(
    package=p_raw_papaya,
    name="Raw Papaya Kofta Curry",
    slug="raw-papaya-kofta-curry",
    image="/mockups/recipes/raw_papaya_pappalikkai_raw_papaya_curry.jpg",
    short_description="Golden spiced raw papaya dumplings simmered gently in a rich, savory onion-tomato gravy.",
    prep_time_minutes=20,
    cook_time_minutes=20,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=245,
    protein="7 g",
    carbohydrates="29 g",
    fiber="5 g",
    fat="11 g",
    health_benefits=[
        "Besan and papaya combine to provide complete plant protein and dietary fiber.",
        "A wholesome gourmet vegetarian curry providing sustained energy."
    ],
    health_tips=[
        "Squeeze out extra water from grated papaya so koftas require minimal besan and stay soft inside.",
        "Simmer koftas gently in the gravy for only 3-4 minutes so they absorb gravy without breaking."
    ],
    instructions=[
        "Peel 300 g raw papaya, remove the seeds, grate it, and squeeze out the extra water.",
        "Mix the papaya with 3 tbsp besan, 1/4 tsp turmeric, 1/2 tsp red chili powder, 1/2 tsp coriander powder, and salt.",
        "Make small round balls from the mixture and shallow-fry them in 1½ tbsp oil until golden.",
        "Heat 1 tbsp oil in another pan and cook 1 small chopped onion until soft. Add 1 tsp ginger-garlic paste and cook for 1 minute.",
        "Add 1 chopped tomato, 1/4 tsp turmeric, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt. Cook until soft.",
        "Add 3/4 cup water and simmer for 5 minutes. Add the fried koftas and cook gently for another 3–4 minutes.",
        "Add coriander leaves, turn off the heat, and serve with rice or roti."
    ],
    tags=["Kofta Curry", "Gourmet", "High Protein", "North Indian"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_rp2, package=p_raw_papaya, name=p_raw_papaya.name, quantity=Decimal("300"), unit="g", notes="Grated and squeezed", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_rp2, package=None, name="Besan (Gram Flour)", quantity=Decimal("3"), unit="tbsp", notes="Binding flour", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_rp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_rp2, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Raw Papaya Salad
r_rp3 = VegetableRecipe.objects.create(
    package=p_raw_papaya,
    name="Raw Papaya Salad",
    slug="raw-papaya-salad",
    image="/mockups/recipes/raw_papaya_pappalikkai_raw_papaya_kootu.jpg",
    short_description="Crisp, refreshing Som Tum style raw papaya and carrot salad tossed with roasted peanuts, lemon, and soy-sweet dressing.",
    prep_time_minutes=15,
    cook_time_minutes=0,
    total_time_minutes=15,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="3 g",
    carbohydrates="15 g",
    fiber="4 g",
    fat="4 g",
    health_benefits=[
        "Raw green papaya delivers live enzymes and high amounts of vitamin C and beta-carotene.",
        "Roasted peanuts add heart-healthy unsaturated fats and protein crunch."
    ],
    health_tips=[
        "Grate papaya into thin julienne strips for authentic texture.",
        "Let the dressed salad rest for 5 minutes before serving so the flavors infuse deeply."
    ],
    instructions=[
        "Peel 250 g raw papaya, remove the seeds, and grate it into thin strips.",
        "Add 1 small chopped carrot and 1 chopped green chili.",
        "Add 1 tbsp roasted peanuts and 1 tbsp chopped coriander leaves.",
        "In a small bowl, mix 1 tbsp lemon juice, 1 tsp soy sauce, 1/2 tsp sugar, and a pinch of salt.",
        "Pour the dressing over the raw papaya mixture.",
        "Mix everything gently until the dressing coats the vegetables evenly.",
        "Rest for 5 minutes and serve fresh."
    ],
    tags=["Salad", "Som Tum Style", "Low Calorie", "Vegan"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_rp3, package=p_raw_papaya, name=p_raw_papaya.name, quantity=Decimal("250"), unit="g", notes="Grated thin strips", is_catalog_vegetable=True, sort_order=0)
if carrot_pkg:
    RecipeIngredient.objects.create(recipe=r_rp3, package=carrot_pkg, name=carrot_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped/julienned", is_catalog_vegetable=True, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_rp3, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_rp3, package=None, name="Roasted Peanuts", quantity=Decimal("1"), unit="tbsp", notes="Crushed", is_catalog_vegetable=False, sort_order=3)


# ==============================================================================
# 2. GREEN PUMPKIN (PUSANIKKAI) - Package ID: 931
# ==============================================================================

# Recipe 1: Pumpkin Halwa
r_gp1 = VegetableRecipe.objects.create(
    package=p_green_pumpkin,
    name="Pumpkin Halwa",
    slug="green-pumpkin-halwa",
    image="/mockups/recipes/green_pumpkin_pusanikkai_pumpkin_poriyal.jpg",
    short_description="Rich, melt-in-the-mouth traditional dessert made from slow-cooked pumpkin, milk, ghee, cardamom, and roasted nuts.",
    prep_time_minutes=10,
    cook_time_minutes=25,
    total_time_minutes=35,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=230,
    protein="4 g",
    carbohydrates="32 g",
    fiber="2 g",
    fat="10 g",
    health_benefits=[
        "Pumpkin is naturally sweet, vitamin A-packed, and low in starch.",
        "Pure ghee and cardamom provide healthy fats and aromatic digestive support."
    ],
    health_tips=[
        "Cook grated pumpkin in ghee until raw water evaporates completely before adding milk.",
        "Add cardamom powder and nuts at the end to keep the aroma rich and festive."
    ],
    instructions=[
        "Peel and grate 300 g yellow pumpkin.",
        "Heat 1 tbsp ghee in a pan and add the grated pumpkin.",
        "Cook on medium heat for 8–10 minutes until the pumpkin becomes soft and most of the water dries.",
        "Add 1/2 cup milk and cook for 5–7 minutes until the milk reduces.",
        "Add 3 tbsp sugar and mix well.",
        "Cook for another 5–7 minutes until the mixture becomes thick, then add 1/4 tsp cardamom powder.",
        "Add 1 tbsp chopped cashews and raisins, mix well, and serve warm."
    ],
    tags=["Dessert", "Halwa", "Festive", "Traditional Sweet"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_gp1, package=p_green_pumpkin, name=p_green_pumpkin.name, quantity=Decimal("300"), unit="g", notes="Peeled and grated", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_gp1, package=None, name="Milk", quantity=Decimal("0.5"), unit="cup", notes="Full cream", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_gp1, package=None, name="Ghee", quantity=Decimal("1"), unit="tbsp", notes="Pure cow ghee", is_catalog_vegetable=False, sort_order=2)
RecipeIngredient.objects.create(recipe=r_gp1, package=None, name="Cashews & Raisins", quantity=Decimal("1"), unit="tbsp", notes="Chopped", is_catalog_vegetable=False, sort_order=3)

# Recipe 2: Pumpkin Soup
r_gp2 = VegetableRecipe.objects.create(
    package=p_green_pumpkin,
    name="Pumpkin Soup",
    slug="green-pumpkin-soup",
    image="/mockups/recipes/green_pumpkin_pusanikkai_pumpkin_kootu.jpg",
    short_description="Velvety smooth, golden pumpkin soup flavored with sautéed garlic, onions, black pepper, and fresh lemon.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="2 g",
    carbohydrates="18 g",
    fiber="3 g",
    fat="4 g",
    health_benefits=[
        "High in beta-carotene, lutein, and vitamin A for glowing skin and ocular vitality.",
        "Ultra low-calorie comfort bowl that aids hydration and digestion."
    ],
    health_tips=[
        "Simmer pumpkin in vegetable stock until fork tender before blending for a silky texture.",
        "Finish with fresh lemon juice and crushed black pepper right before serving."
    ],
    instructions=[
        "Peel 300 g yellow pumpkin, remove the seeds, and cut it into small pieces.",
        "Heat 1 tsp oil in a pan and add 2 chopped garlic cloves.",
        "Add 1 small chopped onion and cook until soft.",
        "Add the pumpkin, 1/4 tsp black pepper, and salt.",
        "Add 2½ cups vegetable stock or water, cover, and cook for 12–15 minutes until the pumpkin becomes soft.",
        "Allow it to cool slightly, then blend until smooth.",
        "Pour the soup back into the pan, heat for 2 minutes, add 1 tsp lemon juice, and serve hot."
    ],
    tags=["Soup", "Low Calorie", "Antioxidant Rich", "Warm Bowl"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_gp2, package=p_green_pumpkin, name=p_green_pumpkin.name, quantity=Decimal("300"), unit="g", notes="Peeled and diced", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_gp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_gp2, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("2"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=2)

# Recipe 3: Pumpkin Sambar
r_gp3 = VegetableRecipe.objects.create(
    package=p_green_pumpkin,
    name="Pumpkin Sambar",
    slug="green-pumpkin-sambar",
    image="/mockups/recipes/green_pumpkin_pusanikkai_pumpkin_sambar.jpg",
    short_description="Classic South Indian sambar made with naturally sweet pumpkin chunks, toor dal, tamarind, and sesame oil tempering.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=190,
    protein="7 g",
    carbohydrates="24 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Toor dal provides essential amino acids and plant protein.",
        "Pumpkin contributes potassium and dietary fiber to this wholesome lentil stew."
    ],
    health_tips=[
        "Cut pumpkin into medium-sized pieces so they do not break apart during simmering.",
        "Use sesame (gingelly) oil for tempering to get the traditional authentic South Indian aroma."
    ],
    instructions=[
        "Cook 1/4 cup toor dal with 1 cup water and a pinch of turmeric until soft, then mash it well.",
        "Peel and cut 250 g yellow pumpkin into medium-sized pieces.",
        "Cook the pumpkin with 1 cup water, 1/4 tsp turmeric, and salt until tender.",
        "Add 1/2 cup tamarind water and 1 tbsp sambar powder. Mix well and cook for 5 minutes.",
        "Add the mashed dal and 1/2 cup water. Mix well and simmer for 5–6 minutes.",
        "Heat 1 tbsp sesame oil separately and add 1/2 tsp mustard seeds, 6–8 curry leaves, 1 dry red chili, and a pinch of asafoetida (perungayam).",
        "Add the seasoning to the sambar, mix well, turn off the heat, and serve with rice, idli, or dosa."
    ],
    tags=["Sambar", "South Indian Classic", "High Protein", "Traditional"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_gp3, package=p_green_pumpkin, name=p_green_pumpkin.name, quantity=Decimal("250"), unit="g", notes="Peeled and medium diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_gp3, package=None, name="Toor Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft and mashed", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_gp3, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("8"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 3. DISCO PUMPKIN - Package ID: 933
# ==============================================================================

# Recipe 1: Pumpkin Erissery
r_dp1 = VegetableRecipe.objects.create(
    package=p_disco_pumpkin,
    name="Pumpkin Erissery",
    slug="disco-pumpkin-erissery",
    image="/mockups/recipes/disco_pumpkin_pumpkin_kootu.jpg",
    short_description="Traditional Kerala-style Mathanga Erissery prepared with pumpkin, ground cumin-coconut paste, and coconut oil tempering.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="3 g",
    carbohydrates="18 g",
    fiber="5 g",
    fat="9 g",
    health_benefits=[
        "Coconut oil and fresh coconut supply healthy medium-chain triglycerides (MCTs).",
        "Pumpkin provides dietary fiber, antioxidants, and beta-carotene."
    ],
    health_tips=[
        "Cook pumpkin until tender but intact before gently stirring in the coconut paste.",
        "A hint of coconut oil in the tempering gives an authentic Kerala Sadya flavor."
    ],
    instructions=[
        "Peel 300 g yellow pumpkin, remove the seeds, and cut it into medium-sized pieces.",
        "Cook the pumpkin with 1/2 cup water, 1/4 tsp turmeric powder, and salt until tender.",
        "Grind 1/4 cup grated coconut, 1/2 tsp cumin seeds, and 1 green chili with a little water.",
        "Add the coconut mixture to the cooked pumpkin and mix gently.",
        "Cook on low heat for 3–4 minutes until the mixture becomes slightly thick.",
        "Heat 1 tsp coconut oil and add 1/2 tsp mustard seeds, 1 dry red chili, and a few curry leaves.",
        "Add the seasoning to the pumpkin, mix well, and serve with rice."
    ],
    tags=["Erissery", "Kerala Sadya", "Coconut Stew", "Traditional"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_dp1, package=p_disco_pumpkin, name=p_disco_pumpkin.name, quantity=Decimal("300"), unit="g", notes="Peeled and medium diced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_dp1, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="For ground paste", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_dp1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=2)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_dp1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=3)

# Recipe 2: Pumpkin Curry
r_dp2 = VegetableRecipe.objects.create(
    package=p_disco_pumpkin,
    name="Pumpkin Curry",
    slug="disco-pumpkin-curry",
    image="/mockups/recipes/disco_pumpkin_pumpkin_poriyal.jpg",
    short_description="Flavorful, homestyle spiced pumpkin curry simmered in an onion-tomato masala base with coriander.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=145,
    protein="3 g",
    carbohydrates="20 g",
    fiber="4 g",
    fat="7 g",
    health_benefits=[
        "Lycopene from tomatoes and carotenoids from pumpkin deliver powerful cellular protection.",
        "Light on stomach and rich in potassium for blood pressure regulation."
    ],
    health_tips=[
        "Sauté onions and tomatoes till oil lightly surfaces before mixing in pumpkin cubes.",
        "Simmer covered in 1/2 cup water so pumpkin softens without becoming overly mushy."
    ],
    instructions=[
        "Peel 300 g pumpkin, remove the seeds, and cut it into small cubes.",
        "Heat 1 tbsp oil in a pan and add 1/2 tsp cumin seeds.",
        "Add 1 small chopped onion and cook until it becomes soft.",
        "Add 1 chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt. Cook until the tomato becomes soft.",
        "Add the pumpkin and mix well with the spices.",
        "Add 1/2 cup water, cover, and cook for 10–12 minutes until the pumpkin becomes tender.",
        "Remove the lid, cook for 2–3 minutes until the curry thickens, add coriander leaves, and serve."
    ],
    tags=["Curry", "Homestyle", "Roti Side", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_dp2, package=p_disco_pumpkin, name=p_disco_pumpkin.name, quantity=Decimal("300"), unit="g", notes="Peeled and small cubed", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_dp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_dp2, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_dp2, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Garnish", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Pumpkin Pie
r_dp3 = VegetableRecipe.objects.create(
    package=p_disco_pumpkin,
    name="Pumpkin Pie",
    slug="disco-pumpkin-pie",
    image="/mockups/recipes/disco_pumpkin_pumpkin_sambar.jpg",
    short_description="Classic spiced pumpkin pie baked in a buttery pastry crust with cinnamon, nutmeg, and condensed milk.",
    prep_time_minutes=20,
    cook_time_minutes=40,
    total_time_minutes=60,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=310,
    protein="6 g",
    carbohydrates="42 g",
    fiber="2 g",
    fat="13 g",
    health_benefits=[
        "Pumpkin provides dietary fiber and beta-carotene even in baked desserts.",
        "Cinnamon and nutmeg enhance insulin sensitivity and blood circulation."
    ],
    health_tips=[
        "Cook and blend pumpkin puree until silky smooth before combining with milk and spices.",
        "Cool pie completely for at least 20 minutes to allow the filling to set before slicing."
    ],
    instructions=[
        "Preheat the oven to 180°C and place one 8-inch pie crust in a pie dish.",
        "Cook 300 g pumpkin pieces with a little water until soft, then mash or blend until smooth.",
        "In a bowl, mix 1 cup pumpkin puree, 1/4 cup condensed milk, 1 egg, 1/2 tsp cinnamon powder, and a pinch of nutmeg powder.",
        "Pour the pumpkin mixture evenly into the pie crust.",
        "Bake at 180°C for 35–40 minutes until the filling is set around the edges and slightly soft in the center.",
        "Remove from the oven and allow the pie to cool for at least 20 minutes before cutting.",
        "Cut into 2 portions and serve warm or chilled."
    ],
    tags=["Dessert", "Baked Pie", "Holiday Classic", "Gourmet Baking"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_dp3, package=p_disco_pumpkin, name=p_disco_pumpkin.name, quantity=Decimal("300"), unit="g", notes="Cooked and pureed", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_dp3, package=None, name="Condensed Milk", quantity=Decimal("0.25"), unit="cup", notes="Sweetened", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_dp3, package=None, name="Pie Crust", quantity=Decimal("1"), unit="piece", notes="8-inch pie base", is_catalog_vegetable=False, sort_order=2)

print("SUCCESS: Updated all 9 recipes for Raw Papaya, Green Pumpkin, and Disco Pumpkin!")
