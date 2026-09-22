import os, sys, django

sys.path.insert(0, r"c:\Users\USER\Documents\calservices\calservices\backend")
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import Package, VegetableRecipe, RecipeIngredient

lettuce_pkg = Package.objects.filter(id=905).first() or Package.objects.filter(name__icontains='Lettuce').first()
tomato_pkg = Package.objects.filter(name__icontains='Tomato').first()
cucumber_pkg = Package.objects.filter(name__icontains='Cucumber').first()
onion_pkg = Package.objects.filter(name__icontains='Onion (Periya').first() or Package.objects.filter(name__icontains='Onion').first()
corn_pkg = Package.objects.filter(name__icontains='Sweet Corn').first()
coriander_pkg = Package.objects.filter(name__icontains='Coriander').first()
lemon_pkg = Package.objects.filter(name__icontains='Lemon').first()
garlic_pkg = Package.objects.filter(name__icontains='Garlic').first()
chilli_pkg = Package.objects.filter(name__icontains='Green Chilli').first()
ginger_pkg = Package.objects.filter(name__icontains='Ginger').first()
capsicum_pkg = Package.objects.filter(name__icontains='Capsicum').first()
carrot_pkg = Package.objects.filter(name__icontains='Carrot').first()

if lettuce_pkg:
    del_count = lettuce_pkg.recipes.all().delete()
    print(f"Deleted old Lettuce recipes: {del_count}")

# 1. Lettuce Salad
r1 = VegetableRecipe.objects.create(
    package=lettuce_pkg,
    name="Lettuce Salad",
    slug="lettuce-salad",
    image="/mockups/recipes/green_lettuce_lettuce_salad.jpg",
    short_description="Crisp fresh lettuce tossed with diced tomatoes, cucumbers, sweet corn, and a zesty lemon-herb vinaigrette.",
    prep_time_minutes=10,
    cook_time_minutes=0,
    total_time_minutes=10,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=125,
    protein="3g",
    carbohydrates="14g",
    fiber="4g",
    fat="7g",
    health_benefits=[
        "Fresh green lettuce provides hydration, dietary fiber, vitamin A, and vitamin K.",
        "Tomatoes and cucumbers deliver lycopene, potassium, and skin-protecting antioxidants.",
        "Olive oil and roasted sunflower seeds provide heart-healthy unsaturated fats and vitamin E."
    ],
    health_tips=[
        "Thoroughly pat the lettuce leaves dry after washing so the light dressing adheres evenly without making the salad watery.",
        "Add the lemon-olive oil dressing immediately before serving to keep the leaves exceptionally crisp."
    ],
    instructions=[
        "Wash and thoroughly dry 4 cups chopped green lettuce. Tear the leaves into bite-sized pieces.",
        "Dice 1 medium tomato, ½ cucumber, and ¼ small red onion. Add them to the lettuce.",
        "Add 2 tbsp sweet corn, 1 tbsp chopped coriander, and 1 tbsp roasted sunflower seeds for crunch.",
        "In a small bowl, mix 1½ tbsp lemon juice, 1 tbsp olive oil, ¼ tsp black pepper, ¼ tsp roasted cumin powder, and salt to taste.",
        "Pour the dressing over the vegetables just before serving.",
        "Toss gently for about 30 seconds so the lettuce stays crisp and the dressing coats everything evenly.",
        "Serve immediately as a fresh side dish or light meal. Lettuce salads commonly combine crisp lettuce with vegetables and a simple vinaigrette."
    ],
    tags=["Salad", "Low Calorie", "Crisp & Fresh"],
    is_active=True,
    is_popular=True,
    sort_order=1
)

RecipeIngredient.objects.create(recipe=r1, package=lettuce_pkg, name="Green Lettuce", quantity=4, unit="cups", notes="Washed and torn", sort_order=1)
RecipeIngredient.objects.create(recipe=r1, package=tomato_pkg, name="Tomato", quantity=1, unit="piece", notes="Diced", sort_order=2)
RecipeIngredient.objects.create(recipe=r1, package=cucumber_pkg, name="Cucumber", quantity=0.5, unit="piece", notes="Diced", sort_order=3)
RecipeIngredient.objects.create(recipe=r1, package=onion_pkg, name="Red Onion", quantity=0.25, unit="piece", notes="Diced", sort_order=4)
RecipeIngredient.objects.create(recipe=r1, package=corn_pkg, name="Sweet Corn", quantity=2, unit="tbsp", sort_order=5)
RecipeIngredient.objects.create(recipe=r1, package=coriander_pkg, name="Fresh Coriander", quantity=1, unit="tbsp", notes="Chopped", sort_order=6)
RecipeIngredient.objects.create(recipe=r1, package=lemon_pkg, name="Lemon Juice", quantity=1.5, unit="tbsp", sort_order=7)
RecipeIngredient.objects.create(recipe=r1, name="Olive Oil & Seasonings", quantity=1, unit="tbsp", notes="Olive oil, black pepper, cumin powder, sunflower seeds, salt", sort_order=8)

# 2. Garlic Lettuce Stir Fry
r2 = VegetableRecipe.objects.create(
    package=lettuce_pkg,
    name="Garlic Lettuce Stir Fry",
    slug="garlic-lettuce-stir-fry",
    image="/mockups/recipes/green_lettuce_lettuce_stir_fry.jpg",
    short_description="Quick wok-tossed crunchy lettuce with fragrant minced garlic, green chillies, capsicum, and sesame.",
    prep_time_minutes=5,
    cook_time_minutes=5,
    total_time_minutes=10,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=105,
    protein="3g",
    carbohydrates="9g",
    fiber="3g",
    fat="7g",
    health_benefits=[
        "High-heat flash cooking locks in lettuce vitamins and natural crunchy texture.",
        "Garlic provides allicin for immune health and cardiovascular wellness.",
        "Sesame oil and seeds add mineral copper and healthy fats."
    ],
    health_tips=[
        "Cook on high heat for no more than 1-2 minutes so the leaves wilt slightly while retaining their vibrant color and crunch.",
        "Dry the lettuce leaves completely prior to stir-frying to prevent steam buildup in the wok."
    ],
    instructions=[
        "Wash and dry 5 cups green lettuce, then cut the leaves into large pieces.",
        "Heat 1 tbsp sesame oil in a wide pan over medium-high heat.",
        "Add 4 finely chopped garlic cloves, 1 sliced green chilli, and ½ tsp grated ginger. Stir-fry for about 30 seconds.",
        "Add ½ cup sliced capsicum and stir-fry for 1–2 minutes while keeping it slightly crunchy.",
        "Add the chopped lettuce and immediately toss on high heat for 1–2 minutes. Do not overcook—the leaves should wilt slightly while retaining some crunch.",
        "Add 1 tsp low-sodium soy sauce, ½ tsp rice vinegar, ¼ tsp black pepper, and a small pinch of salt. Toss thoroughly.",
        "Finish with 1 tsp toasted sesame seeds and serve hot with steamed rice, noodles, or as a light vegetable side."
    ],
    tags=["Asian Stir Fry", "Quick 10-Min", "Vegan"],
    is_active=True,
    is_popular=True,
    sort_order=2
)

RecipeIngredient.objects.create(recipe=r2, package=lettuce_pkg, name="Green Lettuce", quantity=5, unit="cups", notes="Cut into large pieces", sort_order=1)
RecipeIngredient.objects.create(recipe=r2, package=garlic_pkg, name="Garlic Cloves", quantity=4, unit="cloves", notes="Finely chopped", sort_order=2)
RecipeIngredient.objects.create(recipe=r2, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", notes="Sliced", sort_order=3)
RecipeIngredient.objects.create(recipe=r2, package=ginger_pkg, name="Grated Ginger", quantity=0.5, unit="tsp", sort_order=4)
RecipeIngredient.objects.create(recipe=r2, package=capsicum_pkg, name="Capsicum", quantity=0.5, unit="cup", notes="Sliced", sort_order=5)
RecipeIngredient.objects.create(recipe=r2, name="Sesame Oil & Seeds", quantity=1, unit="tbsp", notes="Sesame oil, toasted sesame seeds", sort_order=6)
RecipeIngredient.objects.create(recipe=r2, name="Seasoning Sauces", quantity=1, unit="tsp", notes="Soy sauce, rice vinegar, black pepper, salt", sort_order=7)

# 3. Paneer Lettuce Wrap
r3 = VegetableRecipe.objects.create(
    package=lettuce_pkg,
    name="Paneer Lettuce Wrap",
    slug="paneer-lettuce-wrap",
    image="/mockups/recipes/green_lettuce_lettuce_wrap.jpg",
    short_description="Wholesome high-protein spiced crumbled paneer rolled inside crisp, chilled green lettuce leaf cups.",
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty=VegetableRecipe.Difficulty.EASY,
    servings=2,
    calories=285,
    protein="14g",
    carbohydrates="12g",
    fiber="3g",
    fat="20g",
    health_benefits=[
        "Cottage cheese (paneer) is rich in high-quality casein protein and bone-building calcium.",
        "Lettuce leaves serve as a refreshing, grain-free, ultra-low carb shell.",
        "High satiety meal suited for keto, fitness, and protein-focused lifestyles."
    ],
    health_tips=[
        "Layer two lettuce leaves together for each wrap to give sturdy structural support.",
        "Keep the lettuce leaves chilled in the refrigerator until ready to roll for maximum snap."
    ],
    instructions=[
        "Separate 8 large lettuce leaves, wash them gently, and pat completely dry. Keep them chilled while preparing the filling.",
        "Heat 1 tsp oil in a pan and sauté ½ cup finely chopped onion, ½ cup diced capsicum, and 1 chopped green chilli for 2 minutes.",
        "Add 150 g crumbled paneer, ¼ tsp turmeric, ½ tsp cumin powder, ½ tsp chilli powder, and salt. Cook for 3–4 minutes.",
        "Add 1 tbsp chopped coriander and 1 tsp lemon juice, then mix well and switch off the heat.",
        "Place two lettuce leaves together to make each wrap stronger and prevent the filling from falling through.",
        "Spoon about ¼–⅓ cup paneer filling into the center of each lettuce pair. Add a few thin cucumber and carrot strips.",
        "Fold the sides inward and roll gently. Serve immediately with 2 tbsp mint-yogurt dip. Lettuce leaves are commonly used as low-carb wrappers for vegetable or protein fillings."
    ],
    tags=["Low Carb", "High Protein", "Keto Friendly"],
    is_active=True,
    is_popular=True,
    sort_order=3
)

RecipeIngredient.objects.create(recipe=r3, package=lettuce_pkg, name="Green Lettuce Leaves", quantity=8, unit="leaves", notes="Large chilled cups", sort_order=1)
RecipeIngredient.objects.create(recipe=r3, package=onion_pkg, name="Onion", quantity=0.5, unit="cup", notes="Finely chopped", sort_order=2)
RecipeIngredient.objects.create(recipe=r3, package=capsicum_pkg, name="Capsicum", quantity=0.5, unit="cup", notes="Diced", sort_order=3)
RecipeIngredient.objects.create(recipe=r3, package=chilli_pkg, name="Green Chilli", quantity=1, unit="piece", notes="Chopped", sort_order=4)
RecipeIngredient.objects.create(recipe=r3, package=cucumber_pkg, name="Cucumber Strips", quantity=0.25, unit="cup", sort_order=5)
RecipeIngredient.objects.create(recipe=r3, package=carrot_pkg, name="Carrot Strips", quantity=0.25, unit="cup", sort_order=6)
RecipeIngredient.objects.create(recipe=r3, package=coriander_pkg, name="Fresh Coriander & Lemon", quantity=1, unit="tbsp", sort_order=7)
RecipeIngredient.objects.create(recipe=r3, name="Fresh Paneer (Cottage Cheese)", quantity=150, unit="g", notes="Crumbled", sort_order=8)
RecipeIngredient.objects.create(recipe=r3, name="Spices & Oil", quantity=1, unit="tsp", notes="Oil, turmeric, cumin, chilli powder, salt", sort_order=9)

print("Green Lettuce recipes updated successfully!")
