import os, sys, django
from django.utils.text import slugify

sys.path.insert(0, r"c:\Users\USER\Documents\calservices\calservices\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

# 1. Fetch packages
methi_pkg = Package.objects.filter(name__icontains='Fenugreek').first() or Package.objects.filter(name__icontains='Methi').first()
peas_pkg = Package.objects.filter(name__icontains='Green Peas').first() or Package.objects.filter(name__icontains='Pattani').first()
potato_pkg = Package.objects.filter(name__icontains='Potato (Urulaikizhangu)').first() or Package.objects.filter(name__icontains='Potato').first()
onion_pkg = Package.objects.filter(name__icontains='Onion (Periya').first() or Package.objects.filter(name__icontains='Onion').first()
tomato_pkg = Package.objects.filter(name__icontains='Tomato').first()
ginger_pkg = Package.objects.filter(name__icontains='Ginger').first()
garlic_pkg = Package.objects.filter(name__icontains='Garlic').first()
chilli_pkg = Package.objects.filter(name__icontains='Green Chilli').first()
coriander_pkg = Package.objects.filter(name__icontains='Coriander').first()
mushroom_pkg = Package.objects.filter(name__icontains='Mushroom').first()

print(f"Methi PKG: {methi_pkg.id if methi_pkg else 'None'}")
print(f"Peas PKG: {peas_pkg.id if peas_pkg else 'None'}")

# Delete existing recipes for Methi and Green Peas
if methi_pkg:
    del_methi = methi_pkg.recipes.all().delete()
    print(f"Deleted old Methi recipes: {del_methi}")

if peas_pkg:
    del_peas = peas_pkg.recipes.all().delete()
    print(f"Deleted old Peas recipes: {del_peas}")

# ─────────────────────────────────────────────────────────────
# METHI RECIPES
# ─────────────────────────────────────────────────────────────

# Recipe 1: Methi Chole
r1 = VegetableRecipe.objects.create(
    package=methi_pkg,
    name="Methi Chole",
    slug="methi-chole",
    image="/mockups/recipes/Methi chole.jpg",
    short_description="Rich protein-packed chickpea curry simmered with fragrant fresh methi leaves and warm whole spices.",
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=390,
    protein="15g",
    carbohydrates="52g",
    fiber="13g",
    fat="14g",
    health_benefits=[
        "Chickpeas provide plant-based protein and dietary fiber for muscle health and satiety.",
        "Fresh methi leaves are rich in antioxidants, iron, and compounds that support blood sugar balance.",
        "High dietary fiber promotes smooth digestion and long-lasting energy."
    ],
    health_tips=[
        "To reduce bitterness, mix chopped methi leaves with a little salt, rest for 15 minutes, then gently squeeze and rinse.",
        "Soak chickpeas overnight for at least 8 hours for optimum softness and digestion."
    ],
    instructions=[
        "Soak ¾ cup dried chickpeas (chole) overnight in plenty of water. Drain and pressure-cook with 2 cups water and a little salt for about 5–6 whistles, or until the chickpeas are completely soft. Let the pressure release naturally.",
        "Wash 2 cups fresh methi leaves, remove the thick stems and chop them finely. If the leaves are particularly bitter, mix them with a little salt, rest for 15 minutes, then squeeze gently and rinse.",
        "Heat 1½ tbsp oil in a kadai. Add 1 bay leaf, 1-inch cinnamon, 2 cloves, 1 green cardamom and ½ tsp cumin seeds. Fry for 30–40 seconds until fragrant.",
        "Add 1 finely chopped onion, 1 tsp ginger-garlic paste and 1 green chilli. Sauté for 5–6 minutes until the onion turns golden. Add 1 chopped tomato and cook for another 4–5 minutes until soft.",
        "Add ¼ tsp turmeric, 1 tsp coriander powder, ½ tsp cumin powder, ½ tsp red chilli powder, ½ tsp fennel powder and ½ tsp garam masala. Cook for 1 minute.",
        "Add the chopped methi leaves and sauté for 3–4 minutes until they wilt and blend into the masala. Add the cooked chickpeas with ¾ cup of their cooking water and simmer for 8–10 minutes. Mash a few chickpeas with the back of the spoon to naturally thicken the gravy.",
        "Add ½ tsp amchur powder and adjust salt. Simmer for another 1–2 minutes, garnish with coriander and serve hot with roti, naan, bhatura, poori or rice."
    ],
    tags=["High Protein", "High Fiber", "North Indian Classic"],
    is_active=True,
    is_popular=True,
    sort_order=1
)

# Ingredients for Methi Chole
RecipeIngredient.objects.create(recipe=r1, package=methi_pkg, name="Fresh Methi Leaves", quantity=2, unit="cups", notes="Washed and finely chopped", sort_order=1)
RecipeIngredient.objects.create(recipe=r1, package=onion_pkg, name="Onion", quantity=1, unit="piece", notes="Finely chopped", sort_order=2)
RecipeIngredient.objects.create(recipe=r1, package=tomato_pkg, name="Tomato", quantity=1, unit="piece", notes="Chopped", sort_order=3)
RecipeIngredient.objects.create(recipe=r1, package=ginger_pkg, name="Ginger Garlic Paste", quantity=1, unit="tsp", sort_order=4)
RecipeIngredient.objects.create(recipe=r1, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", notes="Slit", sort_order=5)
RecipeIngredient.objects.create(recipe=r1, name="Dried Chickpeas (Chole)", quantity=0.75, unit="cup", notes="Soaked overnight", sort_order=6)
RecipeIngredient.objects.create(recipe=r1, name="Whole Spices & Oil", quantity=1.5, unit="tbsp", notes="Bay leaf, cinnamon, cloves, cardamom, cumin", sort_order=7)
RecipeIngredient.objects.create(recipe=r1, name="Spice Powders & Salt", quantity=1, unit="tsp", notes="Turmeric, coriander, cumin, chilli, amchur", sort_order=8)

# Recipe 2: Methi Matar
r2 = VegetableRecipe.objects.create(
    package=methi_pkg,
    name="Methi Matar",
    slug="methi-matar",
    image="/mockups/recipes/fenugreek_methi_methi_dal.jpg",
    short_description="Delicate fresh fenugreek leaves cooked with sweet green peas in a mildly spiced onion-tomato gravy.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=205,
    protein="8g",
    carbohydrates="27g",
    fiber="8g",
    fat="9g",
    health_benefits=[
        "Green peas add natural plant sweetness and vitamin C to balance the earthy minerals of methi.",
        "Methi leaves support digestion, cholesterol management, and provide essential iron.",
        "Low calorie, nutrient-dense homestyle dish perfect for daily wellness."
    ],
    health_tips=[
        "Sautéing methi leaves in warm oil before adding peas brings out their aromatic essential oils.",
        "Use fresh green peas whenever in season for the best natural sweetness."
    ],
    instructions=[
        "Wash 2 cups fresh methi leaves, remove the thick stems and chop finely. If needed, lightly salt the leaves, rest for 15 minutes, squeeze and rinse to reduce excess bitterness.",
        "Heat 1 tbsp oil in a kadai. Add ½ tsp cumin seeds and let them crackle. Add 1 finely chopped onion, 1 green chilli and 1 tsp grated ginger. Sauté for 3–4 minutes until the onion becomes soft.",
        "Add 1 chopped tomato and cook for 4–5 minutes until it becomes soft and the mixture thickens.",
        "Add ¼ tsp turmeric, ½ tsp coriander powder, ½ tsp cumin powder, ½ tsp red chilli powder and salt. Cook for 1 minute.",
        "Add the chopped methi leaves and sauté for 3–4 minutes until they wilt completely. Fresh methi pairs naturally with green peas, with the peas adding sweetness that balances the slight bitterness of the leaves.",
        "Add 1 cup green peas, along with ½ cup water. Cover and cook on low-medium heat for 8–10 minutes, until the peas are tender and the masala becomes thick.",
        "Add ½ tsp garam masala and ½ tsp amchur powder. Mix and cook uncovered for 2–3 minutes. Garnish with fresh coriander and serve with roti, chapati, paratha or rice."
    ],
    tags=["Homestyle", "Vegetarian", "Quick & Healthy"],
    is_active=True,
    is_popular=True,
    sort_order=2
)

RecipeIngredient.objects.create(recipe=r2, package=methi_pkg, name="Fresh Methi Leaves", quantity=2, unit="cups", notes="Washed and chopped", sort_order=1)
RecipeIngredient.objects.create(recipe=r2, package=peas_pkg, name="Green Peas (Pachai Pattani)", quantity=1, unit="cup", notes="Fresh or frozen", sort_order=2)
RecipeIngredient.objects.create(recipe=r2, package=onion_pkg, name="Onion", quantity=1, unit="piece", notes="Finely chopped", sort_order=3)
RecipeIngredient.objects.create(recipe=r2, package=tomato_pkg, name="Tomato", quantity=1, unit="piece", notes="Chopped", sort_order=4)
RecipeIngredient.objects.create(recipe=r2, package=ginger_pkg, name="Grated Ginger", quantity=1, unit="tsp", sort_order=5)
RecipeIngredient.objects.create(recipe=r2, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", sort_order=6)
RecipeIngredient.objects.create(recipe=r2, name="Cooking Oil & Cumin", quantity=1, unit="tbsp", sort_order=7)
RecipeIngredient.objects.create(recipe=r2, name="Spices & Seasoning", quantity=1, unit="tsp", notes="Turmeric, coriander, cumin, chilli, garam masala, amchur", sort_order=8)

# Recipe 3: Aloo Methi
r3 = VegetableRecipe.objects.create(
    package=methi_pkg,
    name="Aloo Methi",
    slug="aloo-methi",
    image="/mockups/recipes/fenugreek_methi_methi_potato_curry.jpg",
    short_description="Classic dry sauté of golden-roasted potato cubes with tender aromatic fenugreek leaves and cumin.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=225,
    protein="5g",
    carbohydrates="32g",
    fiber="6g",
    fat="9g",
    health_benefits=[
        "Potatoes provide wholesome complex carbohydrates and potassium for sustained energy.",
        "Fresh fenugreek contributes dietary fiber, iron, and blood purifying phytonutrients.",
        "Mustard oil and cumin aid digestion and enhance spice absorption."
    ],
    health_tips=[
        "Cut the potatoes into uniform small cubes so they cook evenly without getting mushy.",
        "Finish with fresh lemon juice right before serving to brighten the earthy methi flavor."
    ],
    instructions=[
        "Wash 2 cups fresh methi leaves, remove the thick stems and chop finely. If the methi is strongly bitter, sprinkle with a little salt, rest for 15 minutes, squeeze gently and rinse.",
        "Peel 300 g potatoes and cut them into small cubes. Keeping the cubes relatively small helps them cook evenly with the methi.",
        "Heat 1½ tbsp mustard oil in a kadai until hot, then reduce to medium heat. Add ½ tsp cumin seeds and let them crackle.",
        "Add 1 finely chopped green chilli and 1 tsp grated ginger. Sauté for 30–45 seconds. Add the potato cubes, ¼ tsp turmeric and salt, and mix well.",
        "Cover and cook on low-medium heat for 10–12 minutes, stirring every few minutes, until the potatoes are almost tender. Aloo Methi is traditionally prepared as a dry sabzi, with the potatoes and fresh methi sautéed together with simple spices.",
        "Add the chopped methi leaves and ½ tsp red chilli powder. Mix thoroughly and cook uncovered for 6–8 minutes. The methi will wilt and coat the potatoes while its excess moisture evaporates.",
        "Add ½ tsp coriander powder and ½ tsp amchur powder. Toss gently and cook for another 2 minutes until completely dry. Finish with 1 tsp lemon juice and serve hot with roti, paratha, dal-rice or curd."
    ],
    tags=["Dry Sabzi", "Traditional Classic", "Quick Meal"],
    is_active=True,
    is_popular=True,
    sort_order=3
)

RecipeIngredient.objects.create(recipe=r3, package=methi_pkg, name="Fresh Methi Leaves", quantity=2, unit="cups", notes="Finely chopped", sort_order=1)
RecipeIngredient.objects.create(recipe=r3, package=potato_pkg, name="Potatoes", quantity=300, unit="g", notes="Peeled and cubed", sort_order=2)
RecipeIngredient.objects.create(recipe=r3, package=ginger_pkg, name="Grated Ginger", quantity=1, unit="tsp", sort_order=3)
RecipeIngredient.objects.create(recipe=r3, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", sort_order=4)
RecipeIngredient.objects.create(recipe=r3, name="Mustard Oil & Cumin", quantity=1.5, unit="tbsp", sort_order=5)
RecipeIngredient.objects.create(recipe=r3, name="Spices & Lemon Juice", quantity=1, unit="tsp", notes="Turmeric, chilli, coriander, amchur, lemon juice", sort_order=6)

print("Created 3 Methi Recipes successfully!")

# ─────────────────────────────────────────────────────────────
# GREEN PEAS (PACHAI PATTANI) RECIPES
# ─────────────────────────────────────────────────────────────

# Recipe 1: Aloo Matar
p1 = VegetableRecipe.objects.create(
    package=peas_pkg,
    name="Aloo Matar",
    slug="aloo-matar-peas",
    image="/mockups/recipes/green_peas_pachai_pattani_peas_potato_curry.jpg",
    short_description="Beloved Indian comfort curry of tender potatoes and sweet green peas in a fragrant onion-tomato gravy.",
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=260,
    protein="7g",
    carbohydrates="39g",
    fiber="8g",
    fat="10g",
    health_benefits=[
        "Green peas are rich in dietary fiber, vitamins A, C, and K, and plant protein.",
        "Potatoes provide potassium and vitamin B6 to support heart function and vitality.",
        "Spices like cumin and ginger enhance digestive enzymes."
    ],
    health_tips=[
        "Sautéing the potato cubes in spices for 2-3 minutes before adding water locks in flavor.",
        "Garnish generously with freshly chopped coriander leaves just before turning off heat."
    ],
    instructions=[
        "Peel 250 g potatoes and cut them into medium cubes. Prepare 1 cup green peas (fresh or frozen). If using frozen peas, no need to thaw completely.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp cumin seeds, 1 bay leaf and 1-inch cinnamon. Fry for 30–40 seconds until aromatic.",
        "Add 1 finely chopped onion, 1 green chilli and 1 tsp ginger-garlic paste. Sauté for 4–5 minutes until the onion becomes golden.",
        "Add 1 chopped tomato and cook for 4–5 minutes until soft and pulpy. Add ¼ tsp turmeric, 1 tsp coriander powder, ½ tsp cumin powder, ½ tsp red chilli powder and salt. Cook for 1 minute.",
        "Add the potato cubes and mix well with the masala. Sauté for 2–3 minutes so the potatoes become coated with the spices.",
        "Add the green peas and 1 cup water. Cover and cook on low-medium heat for 12–15 minutes, until the potatoes are tender and the peas are cooked.",
        "Add ½ tsp garam masala and 1 tbsp chopped coriander. Simmer uncovered for 2–3 minutes until the gravy reaches the desired consistency. Serve hot with roti, chapati, paratha or rice."
    ],
    tags=["Comfort Food", "All-Time Favorite", "Curry"],
    is_active=True,
    is_popular=True,
    sort_order=1
)

RecipeIngredient.objects.create(recipe=p1, package=peas_pkg, name="Green Peas (Pachai Pattani)", quantity=1, unit="cup", sort_order=1)
RecipeIngredient.objects.create(recipe=p1, package=potato_pkg, name="Potato", quantity=250, unit="g", notes="Peeled and cubed", sort_order=2)
RecipeIngredient.objects.create(recipe=p1, package=onion_pkg, name="Onion", quantity=1, unit="piece", notes="Finely chopped", sort_order=3)
RecipeIngredient.objects.create(recipe=p1, package=tomato_pkg, name="Tomato", quantity=1, unit="piece", notes="Chopped pulpy", sort_order=4)
RecipeIngredient.objects.create(recipe=p1, package=ginger_pkg, name="Ginger Garlic Paste", quantity=1, unit="tsp", sort_order=5)
RecipeIngredient.objects.create(recipe=p1, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", sort_order=6)
RecipeIngredient.objects.create(recipe=p1, package=coriander_pkg, name="Fresh Coriander", quantity=1, unit="tbsp", notes="Chopped", sort_order=7)
RecipeIngredient.objects.create(recipe=p1, name="Cooking Oil & Whole Spices", quantity=1.5, unit="tbsp", notes="Cumin, bay leaf, cinnamon", sort_order=8)
RecipeIngredient.objects.create(recipe=p1, name="Ground Spices & Salt", quantity=1, unit="tsp", notes="Turmeric, coriander, cumin, chilli, garam masala", sort_order=9)

# Recipe 2: Matar Pulao
p2 = VegetableRecipe.objects.create(
    package=peas_pkg,
    name="Matar Pulao",
    slug="matar-pulao-peas",
    image="/mockups/recipes/green_peas_pachai_pattani_vegetable_peas_pulao.jpg",
    short_description="Fragrant long-grain basmati rice cooked with sweet green peas and aromatic whole spices.",
    prep_time_minutes=20,
    cook_time_minutes=20,
    total_time_minutes=40,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=365,
    protein="8g",
    carbohydrates="62g",
    fiber="5g",
    fat="11g",
    health_benefits=[
        "Basmati rice paired with green peas forms a complete amino acid profile for clean energy.",
        "Whole spices like cloves and cardamom aid digestion and prevent post-meal bloating.",
        "Naturally gluten-free and easy to digest."
    ],
    health_tips=[
        "Soak basmati rice for 20 minutes before cooking so the grains lengthen and cook without breaking.",
        "Allow the cooked pulao to rest for 5–10 minutes covered before fluffing with a fork."
    ],
    instructions=[
        "Rinse 1 cup basmati rice several times until the water becomes mostly clear. Soak for 20 minutes, then drain.",
        "Heat 1½ tbsp ghee or oil in a heavy-bottomed pot. Add 1 bay leaf, 1-inch cinnamon, 2 cloves, 2 green cardamoms and ½ tsp cumin seeds. Fry for 30–40 seconds.",
        "Add 1 small sliced onion and sauté for 3–4 minutes until lightly golden. Add 1 tsp grated ginger and 1 slit green chilli and cook for another 30 seconds.",
        "Add 1 cup green peas and sauté for 2 minutes. Add the drained rice, ¼ tsp turmeric and salt, then gently stir for 1–2 minutes without breaking the rice grains.",
        "Pour in 1½ cups hot water and bring to a full boil. The rice-to-water ratio and covered cooking method are important for keeping the grains separate.",
        "Reduce the heat to the lowest setting, cover tightly and cook for 12–15 minutes, until the water is absorbed and the rice is tender.",
        "Turn off the heat and let the pulao rest, covered, for 5–10 minutes. Fluff gently with a fork and garnish with 1 tbsp chopped coriander and a few fried onions. Serve with raita, dal or vegetable curry."
    ],
    tags=["One Pot Meal", "Rice Delicacy", "Aromatic"],
    is_active=True,
    is_popular=True,
    sort_order=2
)

RecipeIngredient.objects.create(recipe=p2, package=peas_pkg, name="Green Peas (Pachai Pattani)", quantity=1, unit="cup", sort_order=1)
RecipeIngredient.objects.create(recipe=p2, package=onion_pkg, name="Onion", quantity=1, unit="piece", notes="Sliced", sort_order=2)
RecipeIngredient.objects.create(recipe=p2, package=ginger_pkg, name="Grated Ginger", quantity=1, unit="tsp", sort_order=3)
RecipeIngredient.objects.create(recipe=p2, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", notes="Slit", sort_order=4)
RecipeIngredient.objects.create(recipe=p2, package=coriander_pkg, name="Fresh Coriander", quantity=1, unit="tbsp", notes="Garnish", sort_order=5)
RecipeIngredient.objects.create(recipe=p2, name="Basmati Rice", quantity=1, unit="cup", notes="Rinsed and soaked 20 mins", sort_order=6)
RecipeIngredient.objects.create(recipe=p2, name="Ghee / Oil & Whole Spices", quantity=1.5, unit="tbsp", notes="Bay leaf, cinnamon, cloves, cardamom, cumin", sort_order=7)

# Recipe 3: Matar Mushroom
p3 = VegetableRecipe.objects.create(
    package=peas_pkg,
    name="Matar Mushroom",
    slug="matar-mushroom-peas",
    image="/mockups/recipes/green_peas_pachai_pattani_peas_masala.jpg",
    short_description="Savory sliced button mushrooms and sweet green peas simmered in a spiced onion-tomato gravy.",
    prep_time_minutes=15,
    cook_time_minutes=20,
    total_time_minutes=35,
    difficulty=VegetableRecipe.Difficulty.MEDIUM,
    servings=2,
    calories=235,
    protein="10g",
    carbohydrates="25g",
    fiber="7g",
    fat="11g",
    health_benefits=[
        "Button mushrooms provide umami flavor, vitamin D, selenium, and cellular immunity support.",
        "Green peas contribute dietary fiber, natural iron, and phytonutrients.",
        "High protein, low calorie dish ideal for weight management and nutrient intake."
    ],
    health_tips=[
        "Sauté mushrooms on medium-high heat first to prevent them from releasing excess water in the gravy.",
        "Add a pinch of crushed kasuri methi at the very end to give restaurant-quality aroma."
    ],
    instructions=[
        "Clean 200 g button mushrooms and slice them. Prepare 1 cup green peas. Avoid soaking the mushrooms for too long; clean them well and drain before cooking.",
        "Heat 1 tbsp oil in a wide pan over medium-high heat. Add the mushrooms and cook for 4–5 minutes, stirring occasionally, until they release their moisture and begin to brown.",
        "Remove the mushrooms and keep aside. In the same pan, add 1 tbsp oil, followed by ½ tsp cumin seeds. Add 1 finely chopped onion, 1 green chilli and 1 tsp ginger-garlic paste. Sauté for 4–5 minutes until golden.",
        "Add 1½ cups chopped tomatoes and cook for 6–8 minutes until soft. Add ¼ tsp turmeric, 1 tsp coriander powder, ½ tsp cumin powder, ½ tsp red chilli powder and salt. Cook for 1 minute.",
        "Add ½ cup water and simmer the masala for 5 minutes. For a smoother curry, blend the cooked onion-tomato mixture and return it to the pan.",
        "Add 1 cup green peas and cook for 6–8 minutes. Return the sautéed mushrooms to the gravy and simmer together for another 4–5 minutes.",
        "Add ½ tsp garam masala, ½ tsp kasuri methi and 1 tbsp chopped coriander. Mix and simmer for 1–2 minutes, then switch off. Serve hot with roti, naan, paratha or steamed rice."
    ],
    tags=["Restaurant Style", "High Protein", "Curry"],
    is_active=True,
    is_popular=True,
    sort_order=3
)

RecipeIngredient.objects.create(recipe=p3, package=peas_pkg, name="Green Peas (Pachai Pattani)", quantity=1, unit="cup", sort_order=1)
RecipeIngredient.objects.create(recipe=p3, package=mushroom_pkg, name="Button Mushroom", quantity=200, unit="g", notes="Cleaned and sliced", sort_order=2)
RecipeIngredient.objects.create(recipe=p3, package=onion_pkg, name="Onion", quantity=1, unit="piece", notes="Finely chopped", sort_order=3)
RecipeIngredient.objects.create(recipe=p3, package=tomato_pkg, name="Tomatoes", quantity=1.5, unit="cups", notes="Chopped", sort_order=4)
RecipeIngredient.objects.create(recipe=p3, package=ginger_pkg, name="Ginger Garlic Paste", quantity=1, unit="tsp", sort_order=5)
RecipeIngredient.objects.create(recipe=p3, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", sort_order=6)
RecipeIngredient.objects.create(recipe=p3, package=coriander_pkg, name="Fresh Coriander", quantity=1, unit="tbsp", sort_order=7)
RecipeIngredient.objects.create(recipe=p3, name="Cooking Oil & Cumin", quantity=2, unit="tbsp", sort_order=8)
RecipeIngredient.objects.create(recipe=p3, name="Spices & Kasuri Methi", quantity=1, unit="tsp", notes="Turmeric, coriander, cumin, chilli, garam masala, kasuri methi", sort_order=9)

print("Created 3 Green Peas Recipes successfully!")
print("ALL RECIPES UPDATED SUCCESSFULLY.")
