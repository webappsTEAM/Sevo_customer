import os, sys, django
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# Get Packages
p_ivy_gourd = Package.objects.get(id=909)       # Ivy Gourd (Kovakkai)
p_broad_beans = Package.objects.get(id=910)     # Broad Beans (Avarakkai)
p_cluster_beans = Package.objects.get(id=911)   # Cluster Beans (Kothavarangai)
p_cowpea_beans = Package.objects.get(id=912)    # Cowpea Beans (Karamani)
p_colocasia = Package.objects.get(id=913)       # Colocasia (Seppankizhangu)

# Catalog ingredient helper packages
onion_pkg = Package.objects.filter(id=869).first() or Package.objects.filter(name__icontains='Onion (Periya').first()
small_onion_pkg = Package.objects.filter(id=899).first() or Package.objects.filter(name__icontains='Chinna Vengayam').first()
tomato_pkg = Package.objects.filter(id=868).first() or Package.objects.filter(name__icontains='Tomato').first()
chilli_pkg = Package.objects.filter(id=873).first() or Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(id=875).first() or Package.objects.filter(name__icontains='Coriander').first()
curry_pkg = Package.objects.filter(id=874).first() or Package.objects.filter(name__icontains='Curry Leaves').first()
garlic_pkg = Package.objects.filter(id=870).first() or Package.objects.filter(name__icontains='Garlic').first()
ginger_pkg = Package.objects.filter(id=871).first() or Package.objects.filter(name__icontains='Ginger').first()

print("Deleting old recipes for Ivy Gourd, Broad Beans, Cluster Beans, Cowpea Beans, Colocasia...")
p_ivy_gourd.recipes.all().delete()
p_broad_beans.recipes.all().delete()
p_cluster_beans.recipes.all().delete()
p_cowpea_beans.recipes.all().delete()
p_colocasia.recipes.all().delete()

# ==============================================================================
# 1. IVY GOURD (KOVAKKAI) - Package ID: 909
# ==============================================================================

# Recipe 1: Kovakkai Mor Kuzhambu
r_i1 = VegetableRecipe.objects.create(
    package=p_ivy_gourd,
    name="Kovakkai Mor Kuzhambu",
    slug="kovakkai-mor-kuzhambu",
    image="/mockups/recipes/ivy_gourd_kovakkai_kovakkai_masala.jpg",
    short_description="Tender sliced ivy gourd cooked in a rich, fragrant coconut-curd curry tempered with mustard and curry leaves.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=185,
    protein="5 g",
    carbohydrates="18 g",
    fiber="4 g",
    fat="11 g",
    health_benefits=[
        "Ivy gourd helps regulate blood glucose levels and supports metabolism.",
        "Probiotic-rich yogurt and coconut promote a healthy gut microbiome."
    ],
    health_tips=[
        "Turn off the heat before adding beaten yogurt to prevent curdling.",
        "Soak raw rice briefly before grinding with coconut for natural body and thickness."
    ],
    instructions=[
        "Wash 250 g kovakkai (ivy gourd), remove both ends, and cut each one lengthwise into thin pieces.",
        "Add the sliced kovakkai, 3/4 cup water, and a small pinch of salt to a pan. Cover and cook for about 8-10 minutes until the kovakkai becomes soft.",
        "For the coconut paste, blend 1/3 cup grated coconut, 1 green chili, 1 teaspoon soaked raw rice, and a little water until smooth.",
        "Add the coconut paste to the cooked kovakkai. Mix well and cook on low heat for about 4-5 minutes until the raw smell of the coconut goes away.",
        "Beat 1/2 cup slightly sour curd until smooth. Turn off the heat and add the curd to the pan. Mix well. Do not boil after adding the curd, as it may separate.",
        "Heat 1 teaspoon of oil in a small pan. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon cumin seeds, 1 dry red chili, and 5-6 curry leaves. Cook until the mustard seeds start popping.",
        "Pour the seasoning over the mor kuzhambu and mix gently. Serve hot with steamed rice."
    ],
    tags=["Mor Kuzhambu", "South Indian", "Comfort Food", "Probiotic"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_i1, package=p_ivy_gourd, name=p_ivy_gourd.name, quantity=Decimal("250"), unit="g", notes="Cut lengthwise", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_i1, package=None, name="Sour Curd / Yogurt", quantity=Decimal("0.5"), unit="cup", notes="Beaten smooth", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_i1, package=None, name="Grated Coconut", quantity=Decimal("0.33"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_i1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=3)

# Recipe 2: Kovakkai Fry
r_i2 = VegetableRecipe.objects.create(
    package=p_ivy_gourd,
    name="Kovakkai Fry",
    slug="kovakkai-fry",
    image="/mockups/recipes/ivy_gourd_kovakkai_kovakkai_fry.jpg",
    short_description="Crispy, spiced ivy gourd fritters tossed with rice flour, gram flour, and South Indian spices.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=285,
    protein="6 g",
    carbohydrates="30 g",
    fiber="5 g",
    fat="16 g",
    health_benefits=[
        "Crisp ivy gourd provides essential dietary fiber and antioxidants.",
        "Gram flour provides plant protein and sustained energy."
    ],
    health_tips=[
        "Coat with very little water so the flour forms a crisp crust without becoming batter-heavy.",
        "Fry in small batches to maintain optimal oil temperature and crispness."
    ],
    instructions=[
        "Wash 250 g kovakkai, remove both ends, and cut each one lengthwise into thin pieces.",
        "In a bowl, add the kovakkai, 2 tablespoons rice flour, 1 tablespoon gram flour, 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, and salt as needed. Mix well.",
        "Add 1-2 tablespoons of water and mix until the flour and spices lightly cover the kovakkai. Do not add too much water.",
        "Heat enough oil in a pan for shallow or deep frying. Add the coated kovakkai in small batches.",
        "Fry for about 4-5 minutes, turning occasionally, until the kovakkai becomes golden and crispy.",
        "Remove the kovakkai from the oil and place it on a paper towel to remove extra oil.",
        "Serve hot as a side dish with rice, sambar, rasam, or curd rice."
    ],
    tags=["Crispy Fry", "Side Dish", "Quick Recipes"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_i2, package=p_ivy_gourd, name=p_ivy_gourd.name, quantity=Decimal("250"), unit="g", notes="Cut lengthwise", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_i2, package=None, name="Rice Flour", quantity=Decimal("2"), unit="tbsp", notes="For coating", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_i2, package=None, name="Gram Flour (Besan)", quantity=Decimal("1"), unit="tbsp", notes="For coating", is_catalog_vegetable=False, sort_order=2)

# Recipe 3: Kovakkai Poriyal
r_i3 = VegetableRecipe.objects.create(
    package=p_ivy_gourd,
    name="Kovakkai Poriyal",
    slug="kovakkai-poriyal",
    image="/mockups/recipes/ivy_gourd_kovakkai_kovakkai_poriyal.jpg",
    short_description="Classic homestyle ivy gourd stir fry sautéed with lentils, mild spices, and freshly grated coconut.",
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="4 g",
    carbohydrates="17 g",
    fiber="5 g",
    fat="8 g",
    health_benefits=[
        "Rich in dietary fiber and essential micronutrients supporting digestion.",
        "Tempered lentils and grated coconut add texture, healthy fats, and protein."
    ],
    health_tips=[
        "Cut kovakkai into thin round slices for even cooking and tender-crisp texture.",
        "Roast uncovered for the final 4-5 minutes to get light roasted edges."
    ],
    instructions=[
        "Wash 250 g kovakkai, remove both ends, and cut each one into thin round slices.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, 1/2 teaspoon chana dal, and 5-6 curry leaves. Cook until the mustard seeds start popping and the dals turn light golden.",
        "Add the sliced kovakkai, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, and salt as needed. Mix well.",
        "Sprinkle 2 tablespoons of water, cover the pan, and cook on low heat for 8-10 minutes. Stir occasionally until the kovakkai becomes soft.",
        "Remove the lid and cook for another 4-5 minutes, stirring occasionally, until the extra water dries and the kovakkai becomes slightly crispy.",
        "Add 2 tablespoons grated coconut and mix well. Cook for another 1-2 minutes.",
        "Turn off the heat and serve hot with rice, sambar, rasam, or curd rice."
    ],
    tags=["Poriyal", "South Indian", "Homestyle", "High Fiber"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_i3, package=p_ivy_gourd, name=p_ivy_gourd.name, quantity=Decimal("250"), unit="g", notes="Thin round slices", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_i3, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_i3, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 2. BROAD BEANS (AVARAKKAI) - Package ID: 910
# ==============================================================================

# Recipe 1: Avarakkai Poriyal
r_bb1 = VegetableRecipe.objects.create(
    package=p_broad_beans,
    name="Avarakkai Poriyal",
    slug="avarakkai-poriyal",
    image="/mockups/recipes/broad_beans_avarakkai_avarakkai_poriyal.jpg",
    short_description="Everyday South Indian broad beans stir fry seasoned with mustard, urad dal, and fresh coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=150,
    protein="5 g",
    carbohydrates="16 g",
    fiber="6 g",
    fat="8 g",
    health_benefits=[
        "Broad beans are loaded with dietary fiber, iron, and plant-based protein.",
        "Coconut and mild spices support heart health and digestion."
    ],
    health_tips=[
        "De-string both edges of the broad beans thoroughly for tender and palatable bites.",
        "Cook covered with minimal water to preserve water-soluble vitamins."
    ],
    instructions=[
        "Wash 250 g broad beans. Remove the ends and the thin string along the sides. Cut the beans into small pieces.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, and 5-6 curry leaves. Cook until the mustard seeds start popping and the dal becomes light golden.",
        "Add the chopped broad beans, 1/4 teaspoon turmeric powder, and salt as needed. Mix well.",
        "Add 1/4 cup water, cover the pan, and cook for 8-10 minutes. Stir occasionally until the beans become tender.",
        "Remove the lid and cook for another 2-3 minutes until the extra water dries.",
        "Add 1/4 cup grated coconut and mix well. Cook for another 1-2 minutes and serve hot with rice."
    ],
    tags=["Poriyal", "South Indian", "High Fiber", "Everyday Side"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_bb1, package=p_broad_beans, name=p_broad_beans.name, quantity=Decimal("250"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bb1, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_bb1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)

# Recipe 2: Avarakkai Kootu
r_bb2 = VegetableRecipe.objects.create(
    package=p_broad_beans,
    name="Avarakkai Kootu",
    slug="avarakkai-kootu",
    image="/mockups/recipes/broad_beans_avarakkai_broad_beans_kootu.jpg",
    short_description="Comforting broad beans and yellow moong dal simmered with fragrant cumin-coconut paste.",
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=180,
    protein="7 g",
    carbohydrates="22 g",
    fiber="7 g",
    fat="8 g",
    health_benefits=[
        "High protein and dietary fiber combination helps promote satiety and digestive regularity.",
        "Moong dal provides easy-to-digest nourishment."
    ],
    health_tips=[
        "Pressure cook moong dal and broad beans together to save time and ensure uniform softness.",
        "Do not boil heavily after adding coconut paste to retain fresh coconut flavor."
    ],
    instructions=[
        "Wash 200 g broad beans, remove the ends and strings, and cut them into small pieces. Wash 1/4 cup moong dal.",
        "Add the moong dal, broad beans, 1/4 teaspoon turmeric powder, and 1 cup water to a pressure cooker. Cook until the dal and beans become soft. Broad-bean kootu commonly combines the vegetable with moong dal and coconut.",
        "Grind 1/4 cup grated coconut, 1 green chili, and 1/2 teaspoon cumin seeds with a little water until smooth.",
        "Add the coconut mixture and salt to the cooked beans and dal. Mix well and cook on low heat for 3-4 minutes.",
        "Heat 1 teaspoon oil in a small pan. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, and 5-6 curry leaves. Cook until the mustard seeds start popping.",
        "Add this seasoning to the kootu and mix well. Serve hot with rice."
    ],
    tags=["Kootu", "South Indian", "Protein Rich", "Comfort Food"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_bb2, package=p_broad_beans, name=p_broad_beans.name, quantity=Decimal("200"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_bb2, package=None, name="Moong Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked soft", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_bb2, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=2)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_bb2, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="For paste", is_catalog_vegetable=True, sort_order=3)

# Recipe 3: Avarakkai Masala Curry
r_bb3 = VegetableRecipe.objects.create(
    package=p_broad_beans,
    name="Avarakkai Masala Curry",
    slug="avarakkai-masala-curry",
    image="/mockups/recipes/broad_beans_avarakkai_avarakkai_sambar.jpg",
    short_description="Savory, spiced broad beans curry simmered in onion-tomato gravy with ginger-garlic and coriander.",
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=175,
    protein="5 g",
    carbohydrates="21 g",
    fiber="7 g",
    fat="8 g",
    health_benefits=[
        "Lycopene from tomatoes combined with fiber-rich beans supports heart wellness.",
        "Ginger and garlic boost immunity and enhance nutrient bioavailability."
    ],
    health_tips=[
        "Cook the onion-tomato masala base until fragrant before adding the broad beans.",
        "Simmer covered on low heat so the broad beans absorb the rich spiced gravy."
    ],
    instructions=[
        "Wash 250 g broad beans. Remove the ends and strings, then cut the beans into small pieces.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon urad dal. Cook until the mustard seeds start popping.",
        "Add 1 small chopped onion and 5-6 curry leaves. Cook for 3-4 minutes until the onion becomes soft.",
        "Add 1 teaspoon ginger-garlic paste and cook for 1 minute. Add 1 medium-sized chopped tomato and cook for 3-4 minutes until the tomato becomes soft.",
        "Add 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
        "Add the chopped broad beans and 1/2 cup water. Mix well, cover the pan, and cook for 10-12 minutes until the beans become soft. Onion-tomato based broad-bean curry is a recognized South Indian preparation.",
        "Remove the lid and cook for another 3-4 minutes until the extra water reduces and the curry reaches the desired consistency.",
        "Add 1 tablespoon chopped coriander leaves, mix well, and serve hot with rice, chapati, or roti."
    ],
    tags=["Masala Curry", "Side Dish", "Homestyle", "High Fiber"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_bb3, package=p_broad_beans, name=p_broad_beans.name, quantity=Decimal("250"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_bb3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_bb3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="medium", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_bb3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Chopped", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 3. CLUSTER BEANS (KOTHAVARANGAI) - Package ID: 911
# ==============================================================================

# Recipe 1: Cluster Beans Thogayal
r_cb1 = VegetableRecipe.objects.create(
    package=p_cluster_beans,
    name="Cluster Beans Thogayal",
    slug="cluster-beans-thogayal",
    image="/mockups/recipes/cluster_beans_kothavarangai_cluster_beans_curry.jpg",
    short_description="Traditional Tamil chutney relish made with sautéed cluster beans, shallots, garlic, tamarind, and coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=170,
    protein="5 g",
    carbohydrates="18 g",
    fiber="7 g",
    fat="9 g",
    health_benefits=[
        "Cluster beans (guar) have a low glycemic index and are rich in soluble fiber (galactomannan).",
        "Shallots and garlic promote vascular health and immunity."
    ],
    health_tips=[
        "Sauté cluster beans until tender before grinding to eliminate any bitterness.",
        "Grind to a slightly coarse paste for best texture when mixed with hot rice and sesame oil."
    ],
    instructions=[
        "Wash 200 g cluster beans, remove the ends, and cut them into small pieces.",
        "Heat 1 tablespoon of oil in a pan. Add 1 teaspoon cumin seeds, 5 small shallots, 3 garlic cloves, 1 green chili, and 2 dry red chilies. Cook for 2-3 minutes until the shallots become soft.",
        "Add the chopped cluster beans and cook for 5-7 minutes until they become soft. Add 1 small chopped tomato and cook for another 2-3 minutes.",
        "Add a small piece of tamarind and salt as needed. Cook for another 2 minutes and turn off the heat. Let the mixture cool slightly.",
        "Put the cooked mixture into a mixer. Add 1 tablespoon grated coconut and grind to a slightly coarse paste. Add a little water only if needed.",
        "Heat 1 teaspoon of oil in a small pan. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, a small pinch of asafoetida, and a few curry leaves. Cook until the mustard seeds start popping.",
        "Add the seasoning to the thogayal and mix well. Serve with hot rice and a little sesame oil."
    ],
    tags=["Thogayal", "Chutney", "Traditional", "Low GI"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_cb1, package=p_cluster_beans, name=p_cluster_beans.name, quantity=Decimal("200"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
if small_onion_pkg:
    RecipeIngredient.objects.create(recipe=r_cb1, package=small_onion_pkg, name=small_onion_pkg.name, quantity=Decimal("5"), unit="pieces", notes="Shallots", is_catalog_vegetable=True, sort_order=1)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_cb1, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("3"), unit="cloves", notes="Peeled", is_catalog_vegetable=True, sort_order=2)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_cb1, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=3)
RecipeIngredient.objects.create(recipe=r_cb1, package=None, name="Grated Coconut", quantity=Decimal("1"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=4)

# Recipe 2: Kothavarangai Pulikootu
r_cb2 = VegetableRecipe.objects.create(
    package=p_cluster_beans,
    name="Kothavarangai Pulikootu",
    slug="kothavarangai-pulikootu",
    image="/mockups/recipes/cluster_beans_kothavarangai_kothavarangai_sambar.jpg",
    short_description="Tangy, spiced cluster beans and toor dal stew with freshly roasted coconut-spice paste and tamarind extract.",
    prep_time_minutes=15,
    cook_time_minutes=20,
    total_time_minutes=35,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=190,
    protein="8 g",
    carbohydrates="27 g",
    fiber="8 g",
    fat="6 g",
    health_benefits=[
        "Toor dal and cluster beans combine for comprehensive plant protein and dietary fiber.",
        "Tamarind and roasted spices stimulate gastric juices and aid healthy metabolism."
    ],
    health_tips=[
        "Mash the cooked toor dal lightly so the gravy has an even, velvety consistency.",
        "Cook cluster beans till tender before adding tamarind water so they cook thoroughly."
    ],
    instructions=[
        "Wash 250 g cluster beans, remove the ends, and cut them into small pieces. Wash 1/4 cup toor dal.",
        "Cook the toor dal with 1 cup of water and 1/4 teaspoon turmeric powder until it becomes soft. Mash it lightly and keep it aside.",
        "Add the chopped cluster beans, 1 cup water, and a little salt to a pan. Cover and cook for 8-10 minutes until the beans become tender.",
        "Grind 2 tablespoons grated coconut, 1 teaspoon coriander seeds, 1/2 teaspoon cumin seeds, 2 dry red chilies, and 1 tablespoon grated coconut with a little water until you get a smooth paste.",
        "Add the ground mixture and 1/2 cup tamarind water to the cooked cluster beans. Mix well and cook for 4-5 minutes.",
        "Add the cooked dal and mix well. Cook on low heat for another 3-4 minutes until the curry becomes slightly thick. Avoid cooking it for too long after adding the dal.",
        "Heat 1 teaspoon oil in a small pan. Add 1/2 teaspoon mustard seeds, 1 dry red chili, and a few curry leaves. Cook until the mustard seeds start popping.",
        "Add this seasoning to the pulikootu, mix well, and serve hot with rice."
    ],
    tags=["Pulikootu", "South Indian", "Tangy Stew", "Protein Rich"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_cb2, package=p_cluster_beans, name=p_cluster_beans.name, quantity=Decimal("250"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cb2, package=None, name="Toor Dal", quantity=Decimal("0.25"), unit="cup", notes="Cooked and mashed", is_catalog_vegetable=False, sort_order=1)
RecipeIngredient.objects.create(recipe=r_cb2, package=None, name="Grated Coconut", quantity=Decimal("3"), unit="tbsp", notes="For ground masala", is_catalog_vegetable=False, sort_order=2)

# Recipe 3: Kothavarangai Poriyal
r_cb3 = VegetableRecipe.objects.create(
    package=p_cluster_beans,
    name="Kothavarangai Poriyal",
    slug="kothavarangai-poriyal",
    image="/mockups/recipes/cluster_beans_kothavarangai_kothavarangai_poriyal.jpg",
    short_description="Simple, wholesome cluster beans dry curry with golden urad dal tempering and grated coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="5 g",
    carbohydrates="17 g",
    fiber="7 g",
    fat="8 g",
    health_benefits=[
        "Extremely rich in dietary fiber that helps lower cholesterol and regulates blood sugar.",
        "A light, nutrient-dense side dish suitable for balanced everyday lunches."
    ],
    health_tips=[
        "Chop cluster beans finely and steam covered so they become completely tender.",
        "Toss with coconut right at the end to keep the coconut sweet and fragrant."
    ],
    instructions=[
        "Wash 250 g cluster beans, remove the ends, and cut them into small pieces.",
        "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon urad dal, and a few curry leaves. Cook until the mustard seeds start popping and the dal becomes light golden.",
        "Add the chopped cluster beans, 1/4 teaspoon turmeric powder, and salt as needed. Mix well.",
        "Add 1/2 cup water, cover the pan, and cook for about 8-10 minutes. Stir occasionally until the beans become soft.",
        "Remove the lid and cook for another 2-3 minutes until the extra water dries.",
        "Add 1/4 cup grated coconut and mix well. Cook for another 1-2 minutes and turn off the heat.",
        "Serve hot with rice, sambar, rasam, or curd rice."
    ],
    tags=["Poriyal", "South Indian", "High Fiber", "Everyday Side"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_cb3, package=p_cluster_beans, name=p_cluster_beans.name, quantity=Decimal("250"), unit="g", notes="Trimmed and chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cb3, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_cb3, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)


# ==============================================================================
# 4. COWPEA BEANS (KARAMANI) - Package ID: 912
# ==============================================================================

# Recipe 1: Cowpea Beans Poriyal
r_cp1 = VegetableRecipe.objects.create(
    package=p_cowpea_beans,
    name="Cowpea Beans Poriyal",
    slug="cowpea-beans-poriyal",
    image="/mockups/recipes/cowpea_beans_karamani_karamani_poriyal.jpg",
    short_description="Fresh green cowpea beans sautéed with mustard, green chili, curry leaves, and grated coconut.",
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=155,
    protein="5 g",
    carbohydrates="17 g",
    fiber="6 g",
    fat="8 g",
    health_benefits=[
        "Fresh cowpea beans are rich in dietary fiber, folates, and essential minerals.",
        "Light tempering aids digestion without adding excessive calories."
    ],
    health_tips=[
        "Cut fresh cowpea pods into uniform small pieces for consistent cooking.",
        "Cook covered with 1/4 cup water until just tender, then dry excess moisture."
    ],
    instructions=[
        "Wash 250 g fresh cowpea beans and cut them into small pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds and 1/2 tsp urad dal.",
        "When the mustard seeds start popping, add 6–8 curry leaves and 1 chopped green chili.",
        "Add the cowpea beans, 1/4 tsp turmeric powder, 1/4 tsp red chili powder, and salt.",
        "Add 1/4 cup water, cover, and cook for 8–10 minutes until the beans become tender.",
        "Remove the lid and cook for 2–3 minutes until the extra water dries.",
        "Add 2 tbsp grated coconut and mix well.",
        "Cook for 1 minute, then turn off the heat and serve."
    ],
    tags=["Poriyal", "South Indian", "High Fiber", "Homestyle"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_cp1, package=p_cowpea_beans, name=p_cowpea_beans.name, quantity=Decimal("250"), unit="g", notes="Fresh, chopped", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cp1, package=None, name="Grated Coconut", quantity=Decimal("2"), unit="tbsp", notes="Fresh", is_catalog_vegetable=False, sort_order=1)
if chilli_pkg:
    RecipeIngredient.objects.create(recipe=r_cp1, package=chilli_pkg, name=chilli_pkg.name, quantity=Decimal("1"), unit="piece", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_cp1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("8"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=3)

# Recipe 2: Cowpea Beans Coconut Curry
r_cp2 = VegetableRecipe.objects.create(
    package=p_cowpea_beans,
    name="Cowpea Beans Coconut Curry",
    slug="cowpea-beans-coconut-curry",
    image="/mockups/recipes/cowpea_beans_karamani_karamani_kuzhambu.jpg",
    short_description="Tender fresh cowpea beans simmered in an onion-tomato and grated coconut gravy.",
    prep_time_minutes=10,
    cook_time_minutes=16,
    total_time_minutes=26,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=185,
    protein="6 g",
    carbohydrates="21 g",
    fiber="7 g",
    fat="9 g",
    health_benefits=[
        "Combines vitamins, fiber, and heart-healthy medium-chain fats from coconut.",
        "Warm spices and ginger-garlic paste boost immunity and digestion."
    ],
    health_tips=[
        "Simmer the beans in 3/4 cup water until tender before adding coconut.",
        "Pairs excellently with both steamed rice and warm rotis."
    ],
    instructions=[
        "Wash 250 g fresh cowpea beans and cut them into small pieces.",
        "Heat 1 tbsp oil in a pan. Add 1/2 tsp mustard seeds, 1/2 tsp cumin seeds, and 6–8 curry leaves.",
        "Add 1 small chopped onion and cook until the onion becomes soft.",
        "Add 1 tsp ginger-garlic paste and cook for 1 minute.",
        "Add 1 small chopped tomato, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt.",
        "Cook until the tomato becomes soft.",
        "Add the cowpea beans and 3/4 cup water. Cover and cook for 10–12 minutes until the beans become tender.",
        "Add 1/4 cup grated coconut and mix well.",
        "Cook for another 2–3 minutes, then turn off the heat.",
        "Serve hot with rice or roti."
    ],
    tags=["Coconut Curry", "South Indian", "Gravy", "High Fiber"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_cp2, package=p_cowpea_beans, name=p_cowpea_beans.name, quantity=Decimal("250"), unit="g", notes="Fresh, chopped", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_cp2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_cp2, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=r_cp2, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="Fresh", is_catalog_vegetable=False, sort_order=3)

# Recipe 3: Cowpea Beans Masala Fry
r_cp3 = VegetableRecipe.objects.create(
    package=p_cowpea_beans,
    name="Cowpea Beans Masala Fry",
    slug="cowpea-beans-masala-fry",
    image="/mockups/recipes/cowpea_beans_karamani_karamani_vegetable_curry.jpg",
    short_description="Flavorful garlic and onion dry masala sauté with tender cowpea beans and warm garam masala.",
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=175,
    protein="6 g",
    carbohydrates="20 g",
    fiber="7 g",
    fat="9 g",
    health_benefits=[
        "Garlic and spices provide anti-inflammatory and cardiovascular benefits.",
        "High dietary fiber promotes smooth digestion."
    ],
    health_tips=[
        "Uncover for the last 3-4 minutes to roast the beans with spices until dry and fragrant.",
        "Garnish with fresh coriander leaves right before serving."
    ],
    instructions=[
        "Wash 250 g fresh cowpea beans and cut them into small pieces.",
        "Heat 1½ tbsp oil in a pan. Add 1/2 tsp mustard seeds and 1/2 tsp cumin seeds.",
        "Add 3 chopped garlic cloves, 1 green chili, and 1 small chopped onion. Cook until the onion becomes soft.",
        "Add 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, 1/4 tsp garam masala, and salt.",
        "Add the cowpea beans and mix well.",
        "Add 1/4 cup water, cover, and cook for 8–10 minutes until the beans become tender.",
        "Remove the lid and cook for 3–4 minutes until the extra water dries.",
        "Add 1 tbsp chopped coriander leaves and mix well.",
        "Turn off the heat and serve hot."
    ],
    tags=["Masala Fry", "Spicy Side", "Quick Recipes"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_cp3, package=p_cowpea_beans, name=p_cowpea_beans.name, quantity=Decimal("250"), unit="g", notes="Fresh, chopped", is_catalog_vegetable=True, sort_order=0)
if garlic_pkg:
    RecipeIngredient.objects.create(recipe=r_cp3, package=garlic_pkg, name=garlic_pkg.name, quantity=Decimal("3"), unit="cloves", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_cp3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=2)
if coriander_pkg:
    RecipeIngredient.objects.create(recipe=r_cp3, package=coriander_pkg, name=coriander_pkg.name, quantity=Decimal("1"), unit="tbsp", notes="Chopped", is_catalog_vegetable=True, sort_order=3)


# ==============================================================================
# 5. COLOCASIA (SEPPANKIZHANGU) - Package ID: 913
# ==============================================================================

# Recipe 1: Seppankizhangu Roast
r_cl1 = VegetableRecipe.objects.create(
    package=p_colocasia,
    name="Seppankizhangu Roast",
    slug="seppankizhangu-roast",
    image="/mockups/recipes/colocasia_seppankizhangu_seppankizhangu_roast.jpg",
    short_description="Iconic South Indian crispy taro root roast coated with spiced rice flour and pan-fried to golden perfection.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=225,
    protein="3 g",
    carbohydrates="35 g",
    fiber="5 g",
    fat="9 g",
    health_benefits=[
        "Colocasia is rich in complex carbohydrates, potassium, and dietary fiber.",
        "Resistant starch in taro supports gut health and steady energy release."
    ],
    health_tips=[
        "Boil colocasia until just fork-tender; avoid overcooking so round slices do not turn mushy.",
        "A tablespoon of rice flour ensures a super-crisp golden exterior."
    ],
    instructions=[
        "Wash 250 g colocasia and cook it in water until it becomes tender but does not break apart.",
        "Allow it to cool, peel the skin, and cut the colocasia into thick round pieces.",
        "Add 1/2 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, 1 tbsp rice flour, and salt. Mix gently.",
        "Heat 1½ tbsp oil in a pan and add 1/2 tsp mustard seeds and a few curry leaves.",
        "Add the colocasia pieces and spread them evenly in the pan.",
        "Cook on medium heat for 5–6 minutes until the bottom becomes golden.",
        "Turn the pieces gently and cook for another 5–6 minutes until both sides become golden and slightly crispy.",
        "Turn off the heat and serve hot with rice, sambar, or rasam."
    ],
    tags=["Roast", "Crispy", "South Indian Classic", "Taro"],
    is_active=True,
    is_popular=True,
    sort_order=0
)
RecipeIngredient.objects.create(recipe=r_cl1, package=p_colocasia, name=p_colocasia.name, quantity=Decimal("250"), unit="g", notes="Boiled and sliced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cl1, package=None, name="Rice Flour", quantity=Decimal("1"), unit="tbsp", notes="For crispy coating", is_catalog_vegetable=False, sort_order=1)
if curry_pkg:
    RecipeIngredient.objects.create(recipe=r_cl1, package=curry_pkg, name=curry_pkg.name, quantity=Decimal("6"), unit="leaves", notes="Fresh", is_catalog_vegetable=True, sort_order=2)

# Recipe 2: Seppankizhangu Coconut Poriyal
r_cl2 = VegetableRecipe.objects.create(
    package=p_colocasia,
    name="Seppankizhangu Coconut Poriyal",
    slug="seppankizhangu-coconut-poriyal",
    image="/mockups/recipes/colocasia_seppankizhangu_seppankizhangu_fry.jpg",
    short_description="Traditional colocasia dry curry tossed in a coarse onion-coconut-cumin masala with a hint of tamarind.",
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=250,
    protein="4 g",
    carbohydrates="38 g",
    fiber="6 g",
    fat="10 g",
    health_benefits=[
        "Taro root provides dietary fiber and essential minerals.",
        "Tamarind and spices aid smooth digestion and complement taro's natural earthiness."
    ],
    health_tips=[
        "Grind the coconut-onion-cumin paste coarsely without excess water.",
        "A small piece of tamarind neutralizes any potential acridity from colocasia."
    ],
    instructions=[
        "Wash 250 g colocasia and cook it in water until tender.",
        "Cool, peel the skin, and cut the colocasia into thick pieces.",
        "Grind 1/4 cup grated coconut, 1/2 small onion, 1/2 tsp cumin seeds, and 1/4 tsp turmeric powder into a coarse paste.",
        "Heat 1½ tbsp oil in a pan. Add 1/2 tsp mustard seeds and a few curry leaves.",
        "Add the colocasia pieces and cook on low-medium heat for 4–5 minutes.",
        "Add the coconut mixture, 1/2 tsp sambar powder, a small piece of tamarind, and salt.",
        "Mix gently and cook for 5–6 minutes until the masala coats the colocasia well.",
        "Cook until the colocasia becomes lightly roasted, then turn off the heat.",
        "Serve hot with rice, sambar, or mor kuzhambu."
    ],
    tags=["Poriyal", "Coconut Masala", "South Indian", "Traditional"],
    is_active=True,
    is_popular=True,
    sort_order=1
)
RecipeIngredient.objects.create(recipe=r_cl2, package=p_colocasia, name=p_colocasia.name, quantity=Decimal("250"), unit="g", notes="Boiled and sliced", is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=r_cl2, package=None, name="Grated Coconut", quantity=Decimal("0.25"), unit="cup", notes="For coarse paste", is_catalog_vegetable=False, sort_order=1)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_cl2, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("0.5"), unit="small", notes="For paste", is_catalog_vegetable=True, sort_order=2)

# Recipe 3: Seppankizhangu Tomato Curry
r_cl3 = VegetableRecipe.objects.create(
    package=p_colocasia,
    name="Seppankizhangu Tomato Curry",
    slug="seppankizhangu-tomato-curry",
    image="/mockups/recipes/colocasia_seppankizhangu_colocasia_masala.jpg",
    short_description="Tender colocasia pieces simmered in a luscious onion-tomato gravy flavored with ginger-garlic and warm spices.",
    prep_time_minutes=15,
    cook_time_minutes=18,
    total_time_minutes=33,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=235,
    protein="4 g",
    carbohydrates="36 g",
    fiber="6 g",
    fat="9 g",
    health_benefits=[
        "Cooked taro absorbs tomato antioxidants and delivers steady complex carbs.",
        "A wholesome, comforting curry rich in potassium and dietary fiber."
    ],
    health_tips=[
        "Cook the tomato masala till thick and oil separates slightly before adding the boiled colocasia.",
        "Simmer covered for 6-8 minutes so colocasia absorbs the deep tangy flavors."
    ],
    instructions=[
        "Wash 250 g colocasia and cook it in water until tender.",
        "Cool, peel the skin, and cut the colocasia into medium-sized pieces.",
        "Heat 1½ tbsp oil in a pan. Add 1/2 tsp cumin seeds.",
        "Add 1 small chopped onion and cook until it becomes soft.",
        "Add 1 tsp ginger-garlic paste and cook for 1 minute.",
        "Add 2 chopped tomatoes, 1/4 tsp turmeric powder, 1/2 tsp red chili powder, 1 tsp coriander powder, and salt.",
        "Cook until the tomatoes become soft and the masala becomes thick.",
        "Add the cooked colocasia and 1/2 cup water. Mix gently.",
        "Cover and cook for 6–8 minutes so the colocasia absorbs the masala.",
        "Remove the lid and cook for another 2–3 minutes until the curry reaches the desired consistency.",
        "Turn off the heat and serve hot with rice or roti."
    ],
    tags=["Tomato Curry", "Gravy", "Comfort Food", "Taro"],
    is_active=True,
    is_popular=True,
    sort_order=2
)
RecipeIngredient.objects.create(recipe=r_cl3, package=p_colocasia, name=p_colocasia.name, quantity=Decimal("250"), unit="g", notes="Boiled and chopped", is_catalog_vegetable=True, sort_order=0)
if onion_pkg:
    RecipeIngredient.objects.create(recipe=r_cl3, package=onion_pkg, name=onion_pkg.name, quantity=Decimal("1"), unit="small", notes="Chopped", is_catalog_vegetable=True, sort_order=1)
if tomato_pkg:
    RecipeIngredient.objects.create(recipe=r_cl3, package=tomato_pkg, name=tomato_pkg.name, quantity=Decimal("2"), unit="pieces", notes="Chopped", is_catalog_vegetable=True, sort_order=2)

print("SUCCESS: Created all 15 updated recipes with exact instructions, steps, and nutrition values!")
