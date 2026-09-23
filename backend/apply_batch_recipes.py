import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import VegetableRecipe, RecipeIngredient, Package

onion_pkg = Package.objects.get(id=869)
tomato_pkg = Package.objects.filter(name__icontains='tomato').first()
garlic_pkg = Package.objects.get(id=870)
potato_pkg = Package.objects.get(id=872)
green_chilli_pkg = Package.objects.get(id=873)

# 1. CAULIFLOWER (884: Cauliflower (Pookosu))
cauli_pkg = Package.objects.get(id=884)
print('Cauliflower recipes before:', list(cauli_pkg.recipes.values_list('name', flat=True)))
cauli_pkg.recipes.all().delete()

ca1 = VegetableRecipe.objects.create(
    package=cauli_pkg,
    name='Cauliflower Cheese Gratin',
    slug='cauliflower-cheese-gratin',
    servings=2,
    calories=310,
    protein='15 g',
    carbohydrates='20 g',
    fiber='4 g',
    fat='19 g',
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        'Cut 1 small cauliflower into small pieces. Bring a pot of salted water to a boil and cook the cauliflower for 4-5 minutes until it is slightly soft. Drain the water well.',
        'Heat 1 tablespoon of butter in a pan over medium heat. Add 1 tablespoon of plain flour and mix well for about 1 minute.',
        'Slowly add 3/4 cup milk while stirring continuously. Cook for 3-4 minutes until the sauce becomes slightly thick.',
        'Add 1/2 cup grated cheddar cheese, 1/4 teaspoon black pepper, and salt as needed. Mix until the cheese melts and the sauce becomes smooth.',
        'Add the cooked cauliflower to the cheese sauce and mix gently. Transfer everything to a small baking dish.',
        'Sprinkle another 1/4 cup grated cheese on top. Bake at 200°C for 15-20 minutes until the cheese melts and the top becomes golden.',
        'Let it rest for 2-3 minutes and serve warm as a side dish or light meal.'
    ],
    health_benefits=[
        'Cauliflower provides antioxidant glucosinolates and vitamins C & K.',
        'Cheddar cheese provides dietary calcium and bone-strengthening protein.'
    ],
    health_tips=[
        'Parboil cauliflower florets just until tender-crisp so they retain structure when baked.',
        'Whisk milk in gradually to ensure a silky, lump-free cheese sauce.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Comfort Food'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ca1, package=cauli_pkg, name=cauli_pkg.name, quantity=1, unit='small head', notes='Fresh florets', is_catalog_vegetable=True, sort_order=0)

ca2 = VegetableRecipe.objects.create(
    package=cauli_pkg,
    name='Cauliflower Steaks',
    slug='cauliflower-steaks',
    servings=2,
    calories=145,
    protein='5 g',
    carbohydrates='13 g',
    fiber='5 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        'Remove the leaves from 1 medium-sized cauliflower. Cut the cauliflower into 2 thick slices, about 2-3 cm thick, keeping the stem attached so the slices stay together.',
        'Place the cauliflower slices on a plate. Brush both sides with 1 tablespoon of olive oil. Add 1/2 teaspoon paprika, 1/2 teaspoon garlic powder, 1/4 teaspoon black pepper, and salt as needed.',
        'Heat a wide pan over medium-high heat. Place the cauliflower slices in the pan and cook for 3-4 minutes on each side until lightly brown.',
        'Transfer the cauliflower slices to a baking tray. Bake at 200°C for 15-20 minutes until the center becomes soft.',
        'Remove from the oven and add 1 tablespoon of lemon juice over the cauliflower.',
        'Sprinkle 1 tablespoon of chopped coriander or parsley on top and serve warm.'
    ],
    health_benefits=[
        'Low calorie and nutrient-dense alternative to traditional roasts.',
        'Olive oil and seasonings provide heart-healthy unsaturated fats and antioxidants.'
    ],
    health_tips=[
        'Keep the core intact when slicing so the cauliflower slices hold together.',
        'Sear in pan first for smoky caramelized edges before baking.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Low Calorie'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ca2, package=cauli_pkg, name=cauli_pkg.name, quantity=1, unit='medium head', notes='Fresh whole head', is_catalog_vegetable=True, sort_order=0)

ca3 = VegetableRecipe.objects.create(
    package=cauli_pkg,
    name='Gobi Manchurian',
    slug='gobi-manchurian',
    servings=2,
    calories=345,
    protein='8 g',
    carbohydrates='47 g',
    fiber='4 g',
    fat='14 g',
    prep_time_minutes=12,
    cook_time_minutes=15,
    total_time_minutes=27,
    difficulty='Easy',
    instructions=[
        'Cut 250 g cauliflower into small pieces and wash them well. Boil water with a little salt and cook the cauliflower for 2-3 minutes. Drain the water completely.',
        'In a bowl, mix 1/2 cup plain flour, 2 tablespoons corn flour, 1/2 teaspoon red chili powder, and salt. Add water little by little and mix until you get a thick batter.',
        'Add the cauliflower pieces to the batter and mix until they are well covered.',
        'Heat enough oil in a deep pan for frying. Add the cauliflower pieces in small batches and fry for 4-5 minutes until they become golden and crispy. Remove them and place them on a paper towel.',
        'Heat 1 tablespoon of oil in another pan. Add 1 tablespoon finely chopped garlic, 1 small chopped onion, and 1/2 chopped green bell pepper. Cook for 2-3 minutes.',
        'Add 1 tablespoon soy sauce, 1 tablespoon tomato sauce, 1 teaspoon chili sauce, and 1/2 teaspoon vinegar. Mix well and cook for 1-2 minutes.',
        'Add the fried cauliflower and mix well so the sauce covers all the pieces. Cook for another 1-2 minutes.',
        'Add 1 tablespoon of chopped spring onion and serve hot.'
    ],
    health_benefits=[
        'Cauliflower adds fiber and essential micronutrients to an Indo-Chinese favorite.',
        'Garlic and capsicum contribute immunity-enhancing compounds.'
    ],
    health_tips=[
        'Drain cauliflower thoroughly before battering for extra crispiness.',
        'Toss fried florets in hot sauce right before serving to maintain crunch.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Indo-Chinese'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ca3, package=cauli_pkg, name=cauli_pkg.name, quantity=250, unit='g', notes='Fresh florets', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=ca3, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=ca3, package=garlic_pkg, name=garlic_pkg.name, quantity=1, unit='tbsp', notes='Finely chopped', is_catalog_vegetable=True, sort_order=2)

print('Updated Cauliflower recipes!')

# 2. CABBAGE (885: Cabbage (Muttaikose))
cabbage_pkg = Package.objects.get(id=885)
print('Cabbage recipes before:', list(cabbage_pkg.recipes.values_list('name', flat=True)))
cabbage_pkg.recipes.all().delete()

cb1 = VegetableRecipe.objects.create(
    package=cabbage_pkg,
    name='Roasted Cabbage Steaks',
    slug='roasted-cabbage-steaks',
    servings=2,
    calories=125,
    protein='3 g',
    carbohydrates='12 g',
    fiber='5 g',
    fat='8 g',
    prep_time_minutes=10,
    cook_time_minutes=25,
    total_time_minutes=35,
    difficulty='Easy',
    instructions=[
        'Remove the outer leaves from 1 small cabbage. Cut the cabbage into 2 thick slices, about 2-3 cm thick. Keep the stem attached so the slices stay together.',
        'Place the cabbage slices on a baking tray. Brush both sides with 1 tablespoon of oil.',
        'Sprinkle 1/2 teaspoon garlic powder, 1/2 teaspoon paprika, 1/4 teaspoon black pepper, and salt as needed over both sides.',
        'Heat the oven to 200°C. Bake the cabbage for 20-25 minutes, turning it halfway through cooking.',
        'Continue baking for another 5-10 minutes until the edges become golden and the center is soft.',
        'Remove from the oven and add 1 teaspoon lemon juice. Sprinkle 1 tablespoon of chopped coriander leaves on top and serve warm.'
    ],
    health_benefits=[
        'Cabbage is abundant in vitamin C, anthocyanins, and digestive fiber.',
        'Low calorie side dish with natural caramelized sweetness.'
    ],
    health_tips=[
        'Leave stem attached to keep the cabbage steaks from separating.',
        'Roast until edges are deeply caramelized for peak flavor.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Low Calorie'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cb1, package=cabbage_pkg, name=cabbage_pkg.name, quantity=1, unit='small cabbage', notes='Fresh whole head', is_catalog_vegetable=True, sort_order=0)

cb2 = VegetableRecipe.objects.create(
    package=cabbage_pkg,
    name='Cabbage Peanut Stir-Fry',
    slug='cabbage-peanut-stir-fry',
    servings=2,
    calories=220,
    protein='7 g',
    carbohydrates='18 g',
    fiber='6 g',
    fat='15 g',
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty='Easy',
    instructions=[
        'Thinly slice 300 g cabbage. Finely chop 3 garlic cloves, 1 small green chili, and 2 spring onions.',
        'Roughly crush 1/4 cup roasted peanuts and keep them aside.',
        'Heat 1 tablespoon of oil in a wide pan over medium-high heat. Add the garlic and green chili. Cook for about 1 minute.',
        'Add the sliced cabbage and cook for 4-5 minutes, stirring often. Keep the cabbage slightly crunchy instead of cooking it until very soft.',
        'Add 1 tablespoon soy sauce, 1/2 teaspoon red chili flakes, 1/2 teaspoon sesame oil, and salt only if needed. Mix well and cook for another 1-2 minutes.',
        'Add the crushed peanuts and chopped spring onions. Mix well and cook for 1 minute.',
        'Turn off the heat and serve hot with rice, chapati, or noodles.'
    ],
    health_benefits=[
        'Roasted peanuts supply healthy unsaturated fats and vegetable protein.',
        'Cabbage provides digestive fiber and essential glucosinolates.'
    ],
    health_tips=[
        'Stir fry quickly on high heat so cabbage stays crisp-tender and colorful.',
        'Add crushed peanuts right at the end to keep them crunchy.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Stir Fry'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cb2, package=cabbage_pkg, name=cabbage_pkg.name, quantity=300, unit='g', notes='Thinly shredded', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cb2, package=garlic_pkg, name=garlic_pkg.name, quantity=3, unit='cloves', notes='Finely chopped', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=cb2, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=2)

cb3 = VegetableRecipe.objects.create(
    package=cabbage_pkg,
    name='Cabbage Cheese Gratin',
    slug='cabbage-cheese-gratin',
    servings=2,
    calories=285,
    protein='13 g',
    carbohydrates='23 g',
    fiber='4 g',
    fat='17 g',
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        'Cut 300 g cabbage into medium-sized pieces. Heat the oven to 180°C.',
        'Heat 1 teaspoon of oil in a pan over medium heat. Add the cabbage and cook for 5-7 minutes until it becomes slightly soft. This also helps remove some of the water from the cabbage.',
        'In another pan, melt 1 tablespoon of butter over low heat. Add 1 tablespoon of plain flour and mix for about 1 minute.',
        'Slowly add 3/4 cup milk while stirring. Cook for 3-4 minutes until the mixture becomes slightly thick.',
        'Add 1/2 cup grated cheddar cheese, 1/4 teaspoon black pepper, and salt as needed. Mix until the cheese melts.',
        'Add the cooked cabbage to the cheese mixture and mix well. Transfer it to a small baking dish.',
        'Sprinkle 1/4 cup grated cheese and 1 tablespoon breadcrumbs on top. Bake at 180°C for 15-20 minutes until the cheese melts and the top becomes golden. The roasting and baking approach is consistent with established cabbage gratin methods.',
        'Let it cool for 2-3 minutes and serve warm.'
    ],
    health_benefits=[
        'Cabbage is packed with gut-healthy fiber and micronutrients.',
        'Cheddar cheese provides calcium and protein.'
    ],
    health_tips=[
        'Sauté cabbage first to release moisture before baking into cheese sauce.',
        'Top with a pinch of breadcrumbs for an extra crunchy gratin crust.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Comfort Food'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cb3, package=cabbage_pkg, name=cabbage_pkg.name, quantity=300, unit='g', notes='Fresh pieces', is_catalog_vegetable=True, sort_order=0)

print('Updated Cabbage recipes!')

# 3. CARROT (879: Orange Carrot (Local Carrot))
carrot_pkg = Package.objects.get(id=879)
sweet_potato_pkg = Package.objects.filter(name__icontains='sweet potato').first()
print('Carrot recipes before:', list(carrot_pkg.recipes.values_list('name', flat=True)))
carrot_pkg.recipes.all().delete()

ct1 = VegetableRecipe.objects.create(
    package=carrot_pkg,
    name='Carrot Cutlet',
    slug='carrot-cutlet',
    servings=2,
    calories=210,
    protein='4 g',
    carbohydrates='32 g',
    fiber='5 g',
    fat='8 g',
    prep_time_minutes=12,
    cook_time_minutes=15,
    total_time_minutes=27,
    difficulty='Easy',
    instructions=[
        'Peel and grate 2 medium-sized carrots. Boil 1 medium-sized potato until soft, peel it, and mash well. Finely chop 1/2 small onion, 1 green chili, and 1 tablespoon coriander leaves.',
        'Heat 1 teaspoon oil in a pan over medium heat. Add the chopped onion and green chili. Cook for 2-3 minutes until the onion becomes soft.',
        'Add the grated carrot, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, 1/4 teaspoon garam masala, and salt as needed. Cook for 4-5 minutes until the carrot softens and excess moisture evaporates.',
        'Transfer the carrot mixture to a bowl. Add the mashed potato, 2 tablespoons breadcrumbs, and 1 tablespoon chopped coriander leaves. Mix everything well until it forms a firm mixture.',
        'Divide the mixture into 6 equal portions. Shape each portion into a round or oval cutlet. If the mixture feels soft, add another 1 tablespoon breadcrumbs.',
        'Coat each cutlet lightly with breadcrumbs. Heat 1 tablespoon oil in a flat pan over medium heat. Place the cutlets gently on the pan and cook for 3-4 minutes on each side until golden brown and crisp.',
        'Remove the cutlets and place them on a paper towel for a few minutes. Serve hot with mint chutney, tomato ketchup, or yogurt dip.'
    ],
    health_benefits=[
        'Carrots are rich in beta-carotene (provitamin A) for eye health and immunity.',
        'Mashed potato and carrot blend provides balanced energy and fiber.'
    ],
    health_tips=[
        'Sauté grated carrots to remove moisture before mixing with potatoes.',
        'Shallow fry on medium flame for a crisp exterior without absorbing excess oil.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Snacks'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ct1, package=carrot_pkg, name=carrot_pkg.name, quantity=2, unit='pcs', notes='Grated medium carrots', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=ct1, package=potato_pkg, name=potato_pkg.name, quantity=1, unit='pc', notes='Boiled & mashed', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=ct1, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=ct1, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Finely chopped', is_catalog_vegetable=True, sort_order=3)

ct2 = VegetableRecipe.objects.create(
    package=carrot_pkg,
    name='Carrot Kheer',
    slug='carrot-kheer',
    servings=2,
    calories=245,
    protein='6 g',
    carbohydrates='31 g',
    fiber='3 g',
    fat='11 g',
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        'Peel and grate 2 medium-sized carrots finely. Heat 1 teaspoon ghee in a heavy-bottomed pan over low-medium heat.',
        'Add the grated carrots and sauté for 4-5 minutes until they soften and the raw carrot smell disappears.',
        'Add 1 1/2 cups full-fat milk and mix well. Bring the mixture to a gentle boil, then reduce the heat and simmer for 12-15 minutes, stirring occasionally.',
        'Add 2 tablespoons sugar and 1/4 teaspoon cardamom powder. Mix well and cook for another 5-6 minutes until the kheer becomes slightly thick and creamy.',
        'Heat 1 teaspoon ghee in a small pan. Add 1 tablespoon chopped cashews and 1 tablespoon raisins. Fry for 1-2 minutes until the cashews turn lightly golden and the raisins become plump.',
        'Add the fried cashews and raisins to the carrot kheer. Mix gently and cook for another 1-2 minutes.',
        'Turn off the heat and allow the kheer to rest for 5 minutes. Serve warm or chilled. Garnish with a few chopped cashews before serving.'
    ],
    health_benefits=[
        'Carrots provide beta-carotene and natural sweetness.',
        'Milk and nuts provide protein, healthy fats, and calcium.'
    ],
    health_tips=[
        'Grate carrots finely so they cook evenly into a velvety pudding consistency.',
        'Sauté in ghee before adding milk to deepen flavor and aroma.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Desserts'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ct2, package=carrot_pkg, name=carrot_pkg.name, quantity=2, unit='pcs', notes='Finely grated', is_catalog_vegetable=True, sort_order=0)

ct3 = VegetableRecipe.objects.create(
    package=carrot_pkg,
    name='Carrot Tikki',
    slug='carrot-tikki',
    servings=2,
    calories=185,
    protein='4 g',
    carbohydrates='29 g',
    fiber='5 g',
    fat='6 g',
    prep_time_minutes=12,
    cook_time_minutes=12,
    total_time_minutes=24,
    difficulty='Easy',
    instructions=[
        'Peel and grate 2 medium-sized carrots. Boil 1 medium-sized sweet potato until soft, peel it, and mash it thoroughly. Finely chop 1 small green chili and 1 tablespoon coriander leaves.',
        'Heat 1 teaspoon oil in a pan. Add the grated carrots and cook over medium heat for 4-5 minutes until they soften and most of their moisture evaporates.',
        'Transfer the carrots to a mixing bowl. Add the mashed sweet potato, 2 tablespoons roasted gram flour (pottukadalai powder), 1/2 teaspoon cumin powder, 1/4 teaspoon red chili powder, 1/4 teaspoon garam masala, 1/4 teaspoon chaat masala, and salt as needed.',
        'Add the chopped green chili and coriander leaves. Mix everything thoroughly until you get a soft but firm mixture. If the mixture is sticky, add 1 additional tablespoon roasted gram flour.',
        'Divide the mixture into 6 portions. Shape each portion into a small round tikki and gently flatten it with your fingers.',
        'Heat 1 tablespoon oil in a non-stick or flat pan over medium heat. Place the tikkis without overcrowding the pan. Cook for 3-4 minutes on each side until the outside becomes golden and crisp.',
        'Remove the tikkis and serve hot with mint-coriander chutney, yogurt dip, or a light tomato salsa. For a more colorful presentation, garnish with chopped coriander and a small sprinkle of chaat masala.'
    ],
    health_benefits=[
        'Sweet potato and carrots provide complex carbohydrates, fiber, and vitamin A.',
        'Roasted gram flour adds wholesome plant protein.'
    ],
    health_tips=[
        'Cook tikkis on medium flame with minimal oil for a guilt-free crispy crust.',
        'Use roasted gram flour (pottukadalai powder) for a firm binding without extra moisture.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Snacks'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=ct3, package=carrot_pkg, name=carrot_pkg.name, quantity=2, unit='pcs', notes='Grated medium carrots', is_catalog_vegetable=True, sort_order=0)
if sweet_potato_pkg:
    RecipeIngredient.objects.create(recipe=ct3, package=sweet_potato_pkg, name=sweet_potato_pkg.name, quantity=1, unit='pc', notes='Boiled & mashed', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=ct3, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Finely chopped', is_catalog_vegetable=True, sort_order=2)

print('Updated Carrot recipes!')

# 4. CUCUMBER (880: Green Cucumber (Vellarikai))
cucum_pkg = Package.objects.get(id=880)
print('Cucumber recipes before:', list(cucum_pkg.recipes.values_list('name', flat=True)))
cucum_pkg.recipes.all().delete()

cu1 = VegetableRecipe.objects.create(
    package=cucum_pkg,
    name='Stir-Fried Cucumbers',
    slug='stir-fried-cucumbers',
    servings=2,
    calories=105,
    protein='2 g',
    carbohydrates='9 g',
    fiber='2 g',
    fat='7 g',
    prep_time_minutes=8,
    cook_time_minutes=8,
    total_time_minutes=16,
    difficulty='Easy',
    instructions=[
        'Wash 2 medium-sized cucumbers and cut them into medium-thick half-moon pieces. Slice 1/2 medium-sized onion thinly. Slit 1 green chili and keep all the ingredients aside.',
        'Heat 1 tablespoon of oil in a wide pan over medium-high heat. Add 1/2 teaspoon mustard seeds, 1/4 teaspoon cumin seeds, and 6-8 curry leaves. Let the mustard seeds splutter.',
        'Add the sliced onion and green chili. Stir-fry for 2-3 minutes until the onion becomes slightly soft while still retaining some crunch.',
        'Add the cucumber pieces, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Toss everything well.',
        'Cook uncovered over medium-high heat for 4-5 minutes, stirring occasionally. The cucumber should become lightly tender but should not turn completely soft or watery.',
        'Add 1/2 teaspoon crushed black pepper and 1/2 teaspoon lemon juice. Toss well and cook for another 1-2 minutes until the spices coat the cucumber evenly.',
        'Turn off the heat and add 1 tablespoon chopped coriander leaves. Give it one final toss and serve immediately as a side dish with rice, chapati, dosa, or curd rice.'
    ],
    health_benefits=[
        'Cucumbers are over 95% water, providing excellent hydration and minerals.',
        'Very low in calories and gentle on digestion.'
    ],
    health_tips=[
        'Stir fry quickly over high flame without covering so cucumbers remain crisp.',
        'Serve immediately to enjoy fresh crunch.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Side Dish'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cu1, package=cucum_pkg, name=cucum_pkg.name, quantity=2, unit='pcs', notes='Half-moon slices', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cu1, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Thin slices', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=cu1, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Slit chili', is_catalog_vegetable=True, sort_order=2)

cu2 = VegetableRecipe.objects.create(
    package=cucum_pkg,
    name='Cucumber Tambuli',
    slug='cucumber-tambuli',
    servings=2,
    calories=135,
    protein='4 g',
    carbohydrates='9 g',
    fiber='2 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=5,
    total_time_minutes=15,
    difficulty='Easy',
    instructions=[
        'Wash and peel 1 medium-sized cucumber if the skin is thick. Chop it into small pieces. Measure 1/2 cup grated fresh coconut and keep it aside.',
        'Add the chopped cucumber, grated coconut, 1 small green chili, 1/2 teaspoon cumin seeds, and a small pinch of salt to a blender. Add 2-3 tablespoons of water and blend until smooth.',
        'Transfer the cucumber-coconut mixture to a bowl. Add 3/4 cup thick buttermilk and mix gently until the mixture becomes smooth and pourable. Add a little water if needed to achieve a light, drinkable consistency. This uncooked cucumber-coconut base with buttermilk is characteristic of cucumber tambuli.',
        'Heat 1 teaspoon oil in a small tempering pan over medium heat. Add 1/2 teaspoon mustard seeds and allow them to splutter.',
        'Add 1 dried red chili, 5-6 curry leaves, and a small pinch of asafoetida (hing). Fry for 20-30 seconds until aromatic.',
        'Turn off the heat and allow the tempering to cool for a few seconds. Pour it over the cucumber-buttermilk mixture and stir gently.',
        'Taste and adjust the salt if needed. Chill for 10-15 minutes if desired and serve as a cooling side dish with hot steamed rice. Cucumber tambuli is traditionally served with rice.'
    ],
    health_benefits=[
        'Buttermilk and coconut provide cooling probiotics and electrolytes.',
        'Refreshing traditional accompaniment perfect for warm days.'
    ],
    health_tips=[
        'Use fresh coconut for a naturally sweet, aromatic base.',
        'Serve slightly chilled alongside hot steamed rice.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Cooling'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cu2, package=cucum_pkg, name=cucum_pkg.name, quantity=1, unit='pc', notes='Peeled & chopped', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cu2, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Small green chili', is_catalog_vegetable=True, sort_order=1)

cu3 = VegetableRecipe.objects.create(
    package=cucum_pkg,
    name='Smashed Cucumber Salad (Pai Huang Gua)',
    slug='smashed-cucumber-salad-pai-huang-gua',
    servings=2,
    calories=105,
    protein='2 g',
    carbohydrates='11 g',
    fiber='2 g',
    fat='5 g',
    prep_time_minutes=15,
    cook_time_minutes=0,
    total_time_minutes=15,
    difficulty='Easy',
    instructions=[
        'Wash 2 medium-sized cucumbers thoroughly and trim both ends. Cut each cucumber into 2-3 large sections. Place each piece on a cutting board and gently smash it using the flat side of a heavy knife or a rolling pin until it cracks open. This creates irregular edges that hold the dressing well.',
        'Cut the smashed cucumber into bite-sized diagonal pieces. Place them in a mixing bowl and sprinkle with 1/2 teaspoon salt. Toss well and leave for 15-20 minutes so excess water is released.',
        'Drain the cucumber well and gently pat it dry with a clean kitchen towel or paper towel. This helps prevent the salad from becoming watery.',
        'For the dressing, mix 1 tablespoon light soy sauce, 1 tablespoon rice vinegar, 1 teaspoon sesame oil, 1 teaspoon chili oil, and 1/2 teaspoon sugar in a small bowl. Stir until the sugar dissolves. These soy-vinegar-sesame flavors are typical of smashed cucumber salad preparations.',
        'Add 2 finely minced garlic cloves and 1/2 teaspoon red chili flakes to the dressing. Mix well and let it sit for 2-3 minutes so the garlic and chili flavors develop.',
        'Pour the dressing over the smashed cucumber pieces. Toss thoroughly for 1-2 minutes, making sure the dressing reaches all the cracked surfaces of the cucumber.',
        'Add 1 teaspoon toasted sesame seeds and 1 tablespoon chopped coriander leaves. Toss once more and serve immediately as a refreshing side dish or appetizer. Smashed cucumber salads are generally served fresh because the cucumber gradually releases more water as it sits.'
    ],
    health_benefits=[
        'Hydrating, high in antioxidants with digestion-boosting garlic and vinegar.',
        'Crispy, savory Asian-style appetizer.'
    ],
    health_tips=[
        'Smashing cucumbers creates rough crevices that cling onto the dressing.',
        'Salt and drain beforehand to prevent a soggy salad.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Salad'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cu3, package=cucum_pkg, name=cucum_pkg.name, quantity=2, unit='pcs', notes='Fresh cucumbers', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cu3, package=garlic_pkg, name=garlic_pkg.name, quantity=2, unit='cloves', notes='Finely minced', is_catalog_vegetable=True, sort_order=1)

print('Updated Cucumber recipes!')

# 5. CAPSICUM (883: Green Capsicum (Kudai Milagaai))
caps_pkg = Package.objects.get(id=883)
print('Capsicum recipes before:', list(caps_pkg.recipes.values_list('name', flat=True)))
caps_pkg.recipes.all().delete()

cp1 = VegetableRecipe.objects.create(
    package=caps_pkg,
    name='Capsicum Sandwich',
    slug='capsicum-sandwich',
    servings=2,
    calories=285,
    protein='9 g',
    carbohydrates='31 g',
    fiber='3 g',
    fat='14 g',
    prep_time_minutes=10,
    cook_time_minutes=8,
    total_time_minutes=18,
    difficulty='Easy',
    instructions=[
        'Wash and finely chop 1 medium capsicum and 1/2 small onion. Keep the vegetables small so the sandwich is easy to bite and cooks evenly.',
        'Heat a pan and add 1/2 tsp butter. Add the chopped onion and capsicum and sauté on medium-high heat for 3–4 minutes. Keep the capsicum slightly crunchy rather than completely soft.',
        'Transfer the vegetables to a bowl. Add 1/4 cup grated cheese, 1 tbsp mayonnaise, 1/2 tsp oregano, 1/2 tsp chilli flakes, 1/2 tsp black pepper and a small pinch of salt. Mix well. This type of capsicum-cheese-herb filling is also commonly used for capsicum toast sandwiches.',
        'Spread a thin layer of butter on one side of each bread slice. Place the capsicum-cheese filling generously over the unbuttered side of two slices.',
        'Cover with the remaining bread slices, keeping the buttered sides facing outward.',
        'Heat a tawa or sandwich pan. Place the sandwiches and toast on medium-low heat for 2–3 minutes per side, pressing gently until the bread becomes crisp and golden and the cheese melts.',
        'Cut each sandwich diagonally into triangles and serve hot with tomato ketchup, mint chutney or a yogurt dip.'
    ],
    health_benefits=[
        'Capsicum is an excellent source of vitamin C and carotenoids.',
        'Cheese provides protein and calcium for sustained energy.'
    ],
    health_tips=[
        'Sauté capsicum briefly so it stays crunchy inside the warm melted cheese.',
        'Toast on medium-low heat with butter for a crispy golden crust.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Snacks'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cp1, package=caps_pkg, name=caps_pkg.name, quantity=1, unit='pc', notes='Medium green capsicum', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cp1, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=1)

cp2 = VegetableRecipe.objects.create(
    package=caps_pkg,
    name='Capsicum Besan Bhaji',
    slug='capsicum-besan-bhaji',
    servings=2,
    calories=235,
    protein='8 g',
    carbohydrates='27 g',
    fiber='6 g',
    fat='11 g',
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty='Easy',
    instructions=[
        'Wash and chop 2 medium capsicums into small square pieces. Chop 1/2 onion, 2 garlic cloves and 1 green chilli. Keep everything ready.',
        'Heat a dry kadai on low heat. Add 1/2 cup besan and roast for 5–6 minutes, stirring continuously until aromatic and lightly golden. Remove and keep aside. Roasting the besan first prevents a raw flour taste.',
        'In the same kadai, heat 1 tbsp oil. Add 1/2 tsp mustard seeds and 1/2 tsp cumin seeds. When they crackle, add curry leaves, onion, garlic and green chilli. Sauté for 3–4 minutes until the onion becomes soft.',
        'Add 1/4 tsp turmeric, 1/2 tsp red chilli powder and a pinch of hing. Mix for about 20 seconds on low heat, making sure the spices do not burn.',
        'Add the chopped capsicum and salt. Stir well, add 1/4 cup water, cover and cook on low heat for 5–7 minutes until the capsicum becomes tender but still retains some texture.',
        'Add the roasted besan gradually, about 1–2 tbsp at a time, mixing after each addition. Cook for another 2–3 minutes until the besan coats the capsicum and becomes slightly crumbly. This gradual addition is characteristic of capsicum besan bhaji.',
        'Switch off the heat. Add 1 tbsp coriander leaves and 1/2 tsp lemon juice and mix well. Serve warm with roti, chapati, paratha or dal-rice.'
    ],
    health_benefits=[
        'Gram flour (besan) adds plant-based protein and low-GI carbohydrates.',
        'Capsicum delivers antioxidant vitamins A & C.'
    ],
    health_tips=[
        'Roast besan on low heat until nutty aroma develops before combining.',
        'Add roasted besan in batches to coat capsicum evenly without lumps.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Side Dish'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cp2, package=caps_pkg, name=caps_pkg.name, quantity=2, unit='pcs', notes='Chopped squares', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cp2, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=cp2, package=garlic_pkg, name=garlic_pkg.name, quantity=2, unit='cloves', notes='Finely chopped', is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=cp2, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Chopped chili', is_catalog_vegetable=True, sort_order=3)

cp3 = VegetableRecipe.objects.create(
    package=caps_pkg,
    name='Stuffed Capsicum (Bharwa Shimla Mirch)',
    slug='stuffed-capsicum-bharwa-shimla-mirch',
    servings=2,
    calories=275,
    protein='7 g',
    carbohydrates='38 g',
    fiber='7 g',
    fat='11 g',
    prep_time_minutes=15,
    cook_time_minutes=18,
    total_time_minutes=33,
    difficulty='Easy',
    instructions=[
        'Boil 2 medium potatoes until completely tender, peel them and roughly mash them. Steam or boil 1/4 cup green peas and keep aside.',
        'Wash 4 small-medium capsicums and carefully cut around the top. Remove the seeds and inner white portions without breaking the outer shell. Small-to-medium capsicums work particularly well because they cook more evenly.',
        'Heat 1 tsp oil in a pan. Add 1/2 tsp cumin seeds. Once they crackle, add onion, green chilli and grated ginger. Sauté for 3–4 minutes until the onion becomes translucent.',
        'Add 1/4 tsp turmeric, 1/2 tsp red chilli powder, 1/2 tsp coriander powder and salt. Mix for 30 seconds. Add the mashed potatoes and cooked peas and sauté for 2–3 minutes.',
        'Add 1/2 tsp garam masala and 1/2 tsp amchur powder. Mix thoroughly and cook for another 1–2 minutes. Turn off the heat and add 1 tbsp chopped coriander. Potato-based spiced filling is a classic preparation for Bharwa Shimla Mirch.',
        'Fill each hollow capsicum generously with the potato-pea mixture. Press the filling gently into the cavity without packing it too tightly.',
        'Heat the remaining 1/2 tbsp oil in a wide pan. Place the stuffed capsicums upright, cover and cook on low heat for 12–15 minutes, rotating them every few minutes so all sides develop light char marks and the capsicum becomes tender. This stovetop turning method is commonly used when baking is not preferred.'
    ],
    health_benefits=[
        'Green peas and potatoes provide wholesome fiber and complex carbs.',
        'Capsicums are high in antioxidants and boost immunity.'
    ],
    health_tips=[
        'Use small-to-medium capsicums for uniform stovetop cooking.',
        'Turn gently while cooking on low flame so skin chars lightly without burning.'
    ],
    tags=['Quick Recipes', 'Easy Recipes', 'Main Course'],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=cp3, package=caps_pkg, name=caps_pkg.name, quantity=4, unit='pcs', notes='Small-medium capsicums', is_catalog_vegetable=True, sort_order=0)
RecipeIngredient.objects.create(recipe=cp3, package=potato_pkg, name=potato_pkg.name, quantity=2, unit='pcs', notes='Boiled & mashed', is_catalog_vegetable=True, sort_order=1)
RecipeIngredient.objects.create(recipe=cp3, package=onion_pkg, name=onion_pkg.name, quantity=1, unit='pc', notes='Small chopped', is_catalog_vegetable=True, sort_order=2)
RecipeIngredient.objects.create(recipe=cp3, package=green_chilli_pkg, name=green_chilli_pkg.name, quantity=1, unit='pc', notes='Chopped chili', is_catalog_vegetable=True, sort_order=3)

print('Updated Capsicum recipes!')
