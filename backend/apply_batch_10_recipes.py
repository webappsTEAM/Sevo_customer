import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import VegetableRecipe, RecipeIngredient, Package

# 1. Sweet Corn (886: Sweet Corn Cob (Cholam))
p_corn = Package.objects.get(id=886)
p_corn.recipes.all().delete()

r_c1 = VegetableRecipe.objects.create(
    package=p_corn,
    name='Sweet Corn Pakoda',
    slug='sweet-corn-pakoda',
    servings=2,
    calories=295,
    protein='8 g',
    carbohydrates='39 g',
    fiber='5 g',
    fat='13 g',
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty='Easy',
    instructions=[
        "Boil 1 cup sweet corn kernels for 4–5 minutes until tender. Drain completely and allow them to cool. Sweet corn is especially suitable for this version because its natural sweetness balances the spicy coating.",
        "Coarsely crush about ½ cup of the cooked corn using a blender or masher. Keep the remaining ½ cup whole so the pakodas have visible sweet-corn pieces.",
        "Add the crushed and whole corn to a bowl. Add ¼ cup onion, 1 green chilli, 1 tsp ginger and 2 tbsp coriander leaves.",
        "Add ½ cup besan, 2 tbsp rice flour, ¼ tsp turmeric, ½ tsp chilli powder, ½ tsp garam masala, ¼ tsp cumin powder, hing and salt. Mix thoroughly. Corn pakoda commonly uses besan with spices and herbs, while rice flour can increase crispness.",
        "Mix without adding much water. The moisture from the corn should help bind the mixture. If necessary, add 1–2 tsp water at a time until you get a thick, scoopable mixture.",
        "Heat oil over medium heat. Drop small portions of the mixture into the hot oil and fry for 3–4 minutes, turning occasionally, until golden brown and crisp. Avoid overcrowding the pan.",
        "Drain on kitchen paper. Serve hot with mint chutney, coriander chutney or tomato ketchup. A light sprinkle of chaat masala makes the sweet-corn flavor stand out."
    ],
    health_benefits=["Sweet corn is rich in lutein and zeaxanthin for vision health.", "Besan and spices provide wholesome plant-based protein."],
    health_tips=["Coarsely crush half the corn to ensure the pakoda batter holds shape without needing excess water."],
    tags=["Snacks", "Quick Recipes", "Monsoon Special"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_c1, package=p_corn, name=p_corn.name, quantity=1, unit='cup', notes='Sweet corn kernels', is_catalog_vegetable=True, sort_order=0)

r_c2 = VegetableRecipe.objects.create(
    package=p_corn,
    name='Cheese Corn',
    slug='cheese-corn',
    servings=2,
    calories=285,
    protein='10 g',
    carbohydrates='27 g',
    fiber='3 g',
    fat='17 g',
    prep_time_minutes=5,
    cook_time_minutes=8,
    total_time_minutes=13,
    difficulty='Easy',
    instructions=[
        "Boil 1½ cups sweet corn kernels for 4–5 minutes. Drain very well so excess water does not make the cheese mixture watery.",
        "Heat a small pan over low-medium heat and add 1 tbsp butter. Add the cooked sweet corn and sauté for 2 minutes.",
        "Add 2 tbsp milk and cook for 1 minute, stirring continuously. The milk helps create a creamy coating around the corn.",
        "Reduce the heat to low. Add ½ cup grated cheese gradually and stir for 1–2 minutes until the cheese melts and coats the corn.",
        "Add 1 tbsp mayonnaise, ¼ tsp black pepper, ¼ tsp chilli flakes, ¼ tsp oregano and a small pinch of salt. Mix until creamy. Adjust salt carefully because cheese and mayonnaise already contain salt.",
        "Cook for another 1–2 minutes on very low heat. Do not boil the mixture, as high heat can make the melted cheese oily or stringy.",
        "Transfer to serving bowls and garnish with 1 tbsp chopped spring onion. Serve immediately while warm and creamy. For a more snack-style presentation, serve it in small cups with a little extra cheese on top."
    ],
    health_benefits=["Cheese provides calcium and protein.", "Sweet corn gives essential dietary fiber and antioxidants."],
    health_tips=["Keep the flame on very low when melting cheese so it remains smooth and glossy."],
    tags=["Snacks", "Kids Special", "Quick Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_c2, package=p_corn, name=p_corn.name, quantity=1.5, unit='cups', notes='Boiled kernels', is_catalog_vegetable=True, sort_order=0)

r_c3 = VegetableRecipe.objects.create(
    package=p_corn,
    name='Corn Fritters',
    slug='corn-fritters',
    servings=2,
    calories=250,
    protein='7 g',
    carbohydrates='37 g',
    fiber='3 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty='Easy',
    instructions=[
        "Boil 1 cup sweet corn kernels for 4–5 minutes. Drain completely and allow them to cool.",
        "Coarsely crush about ½ cup corn, leaving the remaining ½ cup whole. This gives the fritters a soft interior with juicy corn pieces throughout.",
        "Add the corn to a bowl with ¼ cup onion, 1 green chilli, 2 tbsp coriander and 1 tbsp grated cheese.",
        "Add ½ cup all-purpose flour, 2 tbsp corn flour, ½ tsp baking powder, ¼ tsp black pepper, ¼ tsp chilli flakes, ¼ tsp garlic powder and salt. Mix well.",
        "Add 3 tbsp milk gradually and mix until you have a thick batter. It should be thick enough to hold its shape when dropped into the pan.",
        "Heat 1–2 tbsp oil in a flat pan over medium heat. Drop spoonfuls of batter and gently flatten them. Cook for 3–4 minutes per side until crisp and golden. Cook in batches rather than overcrowding the pan.",
        "Drain briefly on kitchen paper and serve hot with sweet chilli sauce, mint yogurt dip or tomato ketchup. These fritters are intentionally different from the besan-based pakoda: they have a softer, pancake-like center with crisp edges."
    ],
    health_benefits=["Provides balanced energy from carbohydrates and dietary fiber.", "Sweet corn enhances flavor with natural sweetness."],
    health_tips=["Shallow-fry on medium flame for golden, crisp edges and a soft tender interior."],
    tags=["Snacks", "Breakfast", "Easy Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_c3, package=p_corn, name=p_corn.name, quantity=1, unit='cup', notes='Sweet corn kernels', is_catalog_vegetable=True, sort_order=0)

print("Updated Sweet Corn!")

# 2. French Beans (887: French Beans (Beans))
p_beans = Package.objects.get(id=887)
p_beans.recipes.all().delete()

r_b1 = VegetableRecipe.objects.create(
    package=p_beans,
    name='Loobyeh (Lubia Sabz)',
    slug='loobyeh-lubia-sabz',
    servings=2,
    calories=145,
    protein='4 g',
    carbohydrates='17 g',
    fiber='6 g',
    fat='8 g',
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty='Easy',
    instructions=[
        "Wash 250 g fresh green beans thoroughly. Trim both ends and cut the beans into 2–3 cm pieces.",
        "Heat 1½ tbsp oil in a wide pan. Add ½ tsp cumin seeds and let them crackle for a few seconds.",
        "Add finely chopped 1 small onion, 2 garlic cloves and 1 green chilli. Sauté for 3–4 minutes until the onion turns lightly golden.",
        "Add ½ tsp turmeric, ½ tsp coriander powder, ½ tsp red chilli powder and salt. Stir for 30 seconds.",
        "Add the chopped green beans and mix thoroughly with the masala. Cook uncovered for 4–5 minutes, stirring occasionally.",
        "Add ½ cup chopped tomatoes and ¼ cup water. Cover and cook on low-medium heat for 10–12 minutes, until the beans are tender but not mushy.",
        "Finish with ½ tsp lemon juice and 1 tbsp chopped coriander. Cook uncovered for another 1–2 minutes so excess moisture evaporates. Serve warm with rice, roti or flatbread."
    ],
    health_benefits=["French beans are packed with vitamin K, silicon, and dietary fiber.", "A light, nutrient-rich Mediterranean-style green bean braise."],
    health_tips=["Simmer until green beans are tender but still retain vibrant color and bite."],
    tags=["Healthy", "Low Calorie", "Dinner"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_b1, package=p_beans, name=p_beans.name, quantity=250, unit='g', notes='Fresh green beans', is_catalog_vegetable=True, sort_order=0)

r_b2 = VegetableRecipe.objects.create(
    package=p_beans,
    name='Aloo Beans',
    slug='aloo-beans',
    servings=2,
    calories=235,
    protein='5 g',
    carbohydrates='35 g',
    fiber='7 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty='Easy',
    instructions=[
        "Wash 200 g green beans, trim the ends and cut into small pieces. Peel 2 medium potatoes and cut them into small cubes.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp cumin seeds and allow them to crackle.",
        "Add 1 small chopped onion, 1 green chilli and 1 tsp grated ginger. Sauté for 3–4 minutes until the onion becomes soft.",
        "Add ½ tsp turmeric, ½ tsp red chilli powder, ½ tsp coriander powder and salt. Stir for 30 seconds.",
        "Add the potato cubes and sauté for 4–5 minutes, allowing the potatoes to get lightly coated with the spices.",
        "Add the chopped beans and ¼ cup water. Cover and cook on low-medium heat for 12–15 minutes, stirring every few minutes, until both potatoes and beans are tender.",
        "Add ½ tsp garam masala and ½ tsp amchur powder. Mix and cook uncovered for another 2–3 minutes. Garnish with coriander and serve with roti, paratha or dal-rice."
    ],
    health_benefits=["Balanced mix of dietary fiber from green beans and energy from potatoes.", "Ginger and cumin support healthy digestion."],
    health_tips=["Sauté potatoes for a few minutes before adding beans so both cook at the same rate."],
    tags=["Traditional", "Lunch", "Easy Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_b2, package=p_beans, name=p_beans.name, quantity=200, unit='g', notes='Trimmed and chopped', is_catalog_vegetable=True, sort_order=0)

r_b3 = VegetableRecipe.objects.create(
    package=p_beans,
    name='Salade Niçoise',
    slug='salade-nicoise',
    servings=2,
    calories=315,
    protein='24 g',
    carbohydrates='13 g',
    fiber='5 g',
    fat='19 g',
    prep_time_minutes=15,
    cook_time_minutes=10,
    total_time_minutes=25,
    difficulty='Easy',
    instructions=[
        "Place 2 eggs in a saucepan, cover with water and bring to a gentle boil. Cook for 10 minutes, then cool immediately in cold water. Peel and quarter them.",
        "Wash and prepare 2 ripe tomatoes, ½ cucumber, ½ small green capsicum and ½ small onion. Cut the tomatoes into wedges, cucumber into slices, capsicum into thin strips and onion into thin rings.",
        "Arrange a bed of fresh lettuce leaves on two serving plates. Place the tomatoes, cucumber, capsicum and onion over the lettuce without mixing everything together.",
        "Add 1 small can of tuna, about 75 g drained, dividing it between the two plates. Traditional versions commonly use tuna or anchovies as the main savory element.",
        "Add the quartered boiled eggs and ¼ cup black/Niçoise olives around the vegetables.",
        "Whisk together 1½ tbsp extra-virgin olive oil, 1 tsp lemon juice, a small pinch of salt and black pepper. For a stricter traditional style, olive oil can be used as the primary dressing.",
        "Drizzle the dressing over the salad just before serving. Finish with a few fresh basil leaves and serve immediately for the best crisp texture."
    ],
    health_benefits=["High-protein, omega-3 rich Mediterranean classic with healthy monounsaturated fats from olive oil.", "Abundant in fresh vitamins and minerals."],
    health_tips=["Dress just prior to serving to ensure crisp lettuce and juicy tomatoes."],
    tags=["Salad", "High Protein", "Mediterranean"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_b3, package=p_beans, name=p_beans.name, quantity=100, unit='g', notes='Fresh crisp additions', is_catalog_vegetable=True, sort_order=0)

print("Updated French Beans!")

# 3. Bitter Gourd (888: Bitter Gourd (Pavakkai))
p_bg = Package.objects.get(id=888)
p_bg.recipes.all().delete()

r_bg1 = VegetableRecipe.objects.create(
    package=p_bg,
    name='Bharwa Karela',
    slug='bharwa-karela',
    servings=2,
    calories=225,
    protein='5 g',
    carbohydrates='23 g',
    fiber='8 g',
    fat='13 g',
    prep_time_minutes=20,
    cook_time_minutes=25,
    total_time_minutes=45,
    difficulty='Easy',
    instructions=[
        "Wash 4 small tender bitter gourds and pat them dry. Make a lengthwise slit in each karela while keeping the base intact. Carefully scoop out the seeds and inner pith. Lightly rub the inside and outside with salt and rest for 30 minutes to mellow some of the bitterness. Rinse and squeeze gently.",
        "Prepare the stuffing by mixing 1½ tbsp coriander powder, 1 tsp fennel powder, 1 tsp amchur powder, ½ tsp turmeric, ½ tsp red chilli powder, ½ tsp cumin powder, 1 tbsp roasted gram flour and salt.",
        "Fill each karela generously with the prepared spice mixture. Secure each stuffed karela with kitchen thread so the filling stays inside while cooking. Stuffed karela traditionally uses a dry spiced filling and is pan-fried slowly.",
        "Heat 1½ tbsp oil in a wide pan. Place the stuffed karelas inside and cook over low heat for 15–18 minutes, turning them every 2–3 minutes so they brown evenly.",
        "Add 1 large sliced onion around the karelas. Continue cooking for 6–8 minutes until the onion becomes golden and slightly caramelized. The sweetness of browned onion helps balance the bitterness.",
        "If any stuffing mixture remains, sprinkle it over the onions and karela. Cook uncovered for another 2–3 minutes, allowing the masala to become aromatic and slightly crisp.",
        "Turn off the heat and carefully remove the threads before serving. Garnish with fresh coriander and serve warm with roti, paratha or dal-rice."
    ],
    health_benefits=["Charantin and polypeptide-p in bitter gourd assist in regulating blood sugar.", "Fennel and amchur aid digestion."],
    health_tips=["Salting and squeezing karela beforehand significantly reduces sharp bitterness."],
    tags=["Traditional", "Diabetes Friendly", "Dinner"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bg1, package=p_bg, name=p_bg.name, quantity=4, unit='small pcs', notes='Fresh tender bitter gourds', is_catalog_vegetable=True, sort_order=0)

r_bg2 = VegetableRecipe.objects.create(
    package=p_bg,
    name='Karela Pyaz Sabji',
    slug='karela-pyaz-sabji',
    servings=2,
    calories=150,
    protein='3 g',
    carbohydrates='18 g',
    fiber='6 g',
    fat='8 g',
    prep_time_minutes=15,
    cook_time_minutes=20,
    total_time_minutes=35,
    difficulty='Easy',
    instructions=[
        "Wash 250 g bitter gourd, trim the ends and slice into thin half-moons. Remove the seeds if they are mature. Sprinkle with ½ tsp salt and leave for 20–30 minutes. Rinse and squeeze gently to reduce some of the bitterness.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp cumin seeds and let them crackle. Add 1 sliced onion and sauté for 5–6 minutes until soft and lightly golden.",
        "Add 2 chopped garlic cloves and 1 green chilli. Cook for 1 minute, stirring continuously.",
        "Add the sliced karela along with ½ tsp turmeric, ½ tsp coriander powder, ½ tsp red chilli powder, ½ tsp cumin powder and salt. Mix thoroughly.",
        "Cook uncovered over medium-low heat for 12–15 minutes, stirring every few minutes. This allows the karela to become tender while developing a roasted flavor.",
        "Add ½ tsp amchur powder and ½ tsp fennel powder. Mix and cook for another 3–4 minutes until the karela and onions become lightly caramelized and almost dry.",
        "Finish with 1 tbsp chopped coriander and a small squeeze of lemon juice. Serve hot with roti, paratha or plain rice. The combination of bitter gourd and sweet caramelized onion creates a balanced sweet-bitter-spicy flavor."
    ],
    health_benefits=["Caramelized onions supply natural sweetness while bitter gourd delivers potent antioxidants.", "Low glycemic index side dish."],
    health_tips=["Slow roast on medium-low heat without a lid for crisp, caramelized edges."],
    tags=["Healthy", "Traditional", "Side Dish"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bg2, package=p_bg, name=p_bg.name, quantity=250, unit='g', notes='Thin half-moons', is_catalog_vegetable=True, sort_order=0)

r_bg3 = VegetableRecipe.objects.create(
    package=p_bg,
    name='Goya Champuru',
    slug='goya-champuru',
    servings=2,
    calories=365,
    protein='25 g',
    carbohydrates='10 g',
    fiber='3 g',
    fat='25 g',
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Wash 1 medium bitter melon (goya) and cut it lengthwise. Scrape out the seeds and white inner pith, then slice it into thin 3–4 mm pieces. Toss with ½ tsp salt and let it sit for 10 minutes, then rinse and drain well.",
        "Press 200 g firm tofu between paper towels for 10–15 minutes to remove excess water. Cut or tear it into bite-sized pieces.",
        "Heat 1 tbsp vegetable oil in a large wok or frying pan. Add the tofu and stir-fry for 3–4 minutes until the outside becomes lightly golden. Transfer to a plate.",
        "Add 100 g thinly sliced pork to the same pan and cook for 3–4 minutes until fully cooked. Traditional Goya Champuru commonly combines bitter melon with pork, tofu and egg.",
        "Add the drained bitter melon and stir-fry over medium-high heat for 3–4 minutes. Keep it slightly crisp rather than cooking it until completely soft.",
        "Return the tofu to the pan. Add 1 tbsp soy sauce, 1 tsp mirin, ½ tsp sesame oil and a pinch of black pepper. Toss everything together for 1–2 minutes.",
        "Beat 2 eggs and pour them over the stir-fry. Gently fold for 1–2 minutes until the eggs are just set. Turn off the heat and serve immediately with steamed rice. The egg and tofu provide a mild, creamy contrast to the bitter melon."
    ],
    health_benefits=["High-protein Okinawan longevity staple rich in vitamins C and minerals.", "Tofu and eggs temper the sharpness of bitter melon."],
    health_tips=["Quickly stir-fry goya on high heat so it remains crisp and retains nutrients."],
    tags=["Okinawan", "High Protein", "Stir Fry"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bg3, package=p_bg, name=p_bg.name, quantity=1, unit='medium pc', notes='Sliced bitter melon', is_catalog_vegetable=True, sort_order=0)

print("Updated Bitter Gourd!")

# 4. Bottle Gourd (889: Bottle Gourd (Surakkai))
p_bot = Package.objects.get(id=889)
p_bot.recipes.all().delete()

r_bot1 = VegetableRecipe.objects.create(
    package=p_bot,
    name='Dudhi Kofta',
    slug='dudhi-kofta',
    servings=2,
    calories=310,
    protein='9 g',
    carbohydrates='32 g',
    fiber='6 g',
    fat='16 g',
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty='Easy',
    instructions=[
        "Wash, peel and grate 250 g bottle gourd (dudhi/lauki). Squeeze out the excess water thoroughly. Taste a small piece first; if the bottle gourd tastes bitter, discard it rather than using it.",
        "Add the grated dudhi to a bowl with ½ cup besan, ½ tsp red chilli powder, ¼ tsp turmeric, ½ tsp cumin powder, ½ tsp garam masala, ½ tsp ginger-green chilli paste and salt. Mix into a thick mixture.",
        "Divide the mixture into 8 small portions and shape them into round koftas. If the mixture feels too wet, add a little extra besan.",
        "Heat oil for frying over medium heat. Carefully add the koftas and fry for 4–5 minutes, turning occasionally, until golden and cooked through. Drain on kitchen paper.",
        "For the gravy, heat 1 tbsp oil in a kadai. Add ½ tsp cumin seeds, followed by ½ finely chopped onion, 1 tsp ginger and 1 tsp garlic. Sauté for 4–5 minutes until lightly golden.",
        "Add 1 cup tomato puree, ¼ tsp turmeric, ½ tsp red chilli powder, ½ tsp coriander powder, ½ tsp garam masala and salt. Cook for 7–8 minutes until the tomato mixture thickens and the oil begins to separate. Add ¾ cup water and simmer for another 5 minutes. A tomato-onion gravy is a common base for lauki kofta.",
        "Gently add the fried koftas to the gravy and simmer on low heat for 3–4 minutes. Garnish with coriander and serve with roti, naan or steamed rice."
    ],
    health_benefits=["Bottle gourd is over 92% water, keeping the body hydrated and light on digestion.", "Besan in koftas provides vegetable protein."],
    health_tips=["Squeeze out excess water thoroughly before making kofta balls so they hold firm shape without absorbing oil."],
    tags=["Curry", "Dinner", "Comfort Food"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bot1, package=p_bot, name=p_bot.name, quantity=250, unit='g', notes='Fresh grated dudhi', is_catalog_vegetable=True, sort_order=0)

r_bot2 = VegetableRecipe.objects.create(
    package=p_bot,
    name='Lauki Thepla',
    slug='lauki-thepla',
    servings=2,
    calories=290,
    protein='9 g',
    carbohydrates='45 g',
    fiber='8 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Wash, peel and grate 1 cup bottle gourd. Check a tiny piece for bitterness before using it.",
        "Add the grated lauki to a mixing bowl with 1½ cups whole-wheat flour, 2 tbsp besan, 1 tsp ginger-green chilli paste, ½ tsp cumin powder, ½ tsp coriander powder, ½ tsp red chilli powder, ¼ tsp turmeric, 1 tsp sesame seeds and salt.",
        "Mix everything well. The grated lauki will release moisture, so add water little by little only if required. Knead into a soft but firm dough. Lauki thepla recipes commonly rely on the vegetable's moisture while kneading the dough.",
        "Add 1 tsp oil and knead for another 1–2 minutes. Cover and rest the dough for 10 minutes.",
        "Divide into 6 equal balls. Dust each with flour and roll into thin, round theplas approximately 15–16 cm wide.",
        "Heat a tawa over medium heat. Place one thepla on the hot tawa and cook for about 30–45 seconds until small bubbles appear. Flip, apply a little oil, then flip again and cook both sides for 1–2 minutes until golden spots appear.",
        "Repeat with the remaining dough. Serve hot with plain yogurt, pickle, chutney or Lauki Raita. Thepla is traditionally cooked on a hot tawa and can be kept soft by avoiding excessive heat."
    ],
    health_benefits=["Whole wheat and bottle gourd provide complex carbs and dietary fiber.", "Sesame seeds supply natural calcium and healthy fats."],
    health_tips=["Rely on the moisture released by grated lauki for kneading to achieve the softest theplas."],
    tags=["Breakfast", "Travel Food", "Gujarati Special"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bot2, package=p_bot, name=p_bot.name, quantity=1, unit='cup', notes='Grated fresh lauki', is_catalog_vegetable=True, sort_order=0)

r_bot3 = VegetableRecipe.objects.create(
    package=p_bot,
    name='Lauki Raita',
    slug='lauki-raita',
    servings=2,
    calories=125,
    protein='6 g',
    carbohydrates='9 g',
    fiber='1 g',
    fat='7 g',
    prep_time_minutes=10,
    cook_time_minutes=7,
    total_time_minutes=17,
    difficulty='Easy',
    instructions=[
        "Wash, peel and grate 150 g bottle gourd. Check that it is not bitter before cooking.",
        "Place the grated lauki in a saucepan with ¼ cup water and a small pinch of salt. Cover and cook for 5–7 minutes until soft. Cooking grated lauki before adding it to yogurt is a standard preparation method.",
        "Drain the cooked lauki and allow it to cool completely. Gently squeeze out excess water without making the lauki completely dry.",
        "Whisk 1½ cups chilled plain yogurt/curd until smooth. Add ½ tsp roasted cumin powder, ¼ tsp red chilli powder, ¼ tsp black salt and regular salt.",
        "Add the cooled lauki to the yogurt and mix gently until evenly combined.",
        "For a flavorful tempering, heat 1 tsp oil in a small pan. Add ½ tsp cumin seeds and 5–6 curry leaves. Let them crackle for 20–30 seconds, then switch off the heat.",
        "Pour the tempering over the raita and garnish with 1 tbsp chopped coriander and a pinch of roasted cumin powder. Chill for 15–20 minutes and serve with pulao, biryani, paratha or a regular Indian meal."
    ],
    health_benefits=["Cooling, gut-friendly probiotics from curd combined with hydrating bottle gourd.", "Light and easy to digest."],
    health_tips=["Let cooked grated lauki cool completely before stirring into chilled yogurt to prevent curd splitting."],
    tags=["Raita", "Cooling", "Side Dish"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_bot3, package=p_bot, name=p_bot.name, quantity=150, unit='g', notes='Grated tender lauki', is_catalog_vegetable=True, sort_order=0)

print("Updated Bottle Gourd!")

# 5. Snake Gourd (890: Snake Gourd (Pudalangai))
p_snk = Package.objects.get(id=890)
p_snk.recipes.all().delete()

r_snk1 = VegetableRecipe.objects.create(
    package=p_snk,
    name='Snake Gourd Tambuli',
    slug='snake-gourd-tambuli',
    servings=2,
    calories=125,
    protein='5 g',
    carbohydrates='10 g',
    fiber='2 g',
    fat='7 g',
    prep_time_minutes=8,
    cook_time_minutes=8,
    total_time_minutes=16,
    difficulty='Easy',
    instructions=[
        "Wash, peel lightly and chop 200 g snake gourd into small pieces. Remove the soft inner seeds and membrane if they are mature.",
        "Cook the snake gourd with ¼ cup water and a pinch of salt over medium heat for 7–8 minutes, until completely tender. Allow it to cool slightly.",
        "Blend the cooked snake gourd with ¼ cup fresh coconut, 1 green chilli, ½ tsp cumin seeds and ¼ cup water into a smooth, slightly thick paste.",
        "Whisk 1 cup plain yogurt/curd until smooth. Add the cooled snake-gourd mixture and mix gently until evenly combined.",
        "Add ¼ tsp turmeric, ¼ tsp black pepper powder and salt. Adjust the consistency with a little water if needed. Tambuli is traditionally a thin, cooling yogurt-based preparation.",
        "For tempering, heat 1 tsp coconut oil. Add ½ tsp mustard seeds, 1 dried red chilli and 5–6 curry leaves. Let them crackle for 20–30 seconds.",
        "Pour the tempering over the tambuli and mix lightly. Chill for 10–15 minutes and serve with hot rice."
    ],
    health_benefits=["Cooling and soothing for the digestive tract.", "Coconut and curd provide natural electrolytes and probiotics."],
    health_tips=["Serve slightly chilled over warm steamed rice for optimal taste."],
    tags=["Cooling", "South Indian", "Quick Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_snk1, package=p_snk, name=p_snk.name, quantity=200, unit='g', notes='Peeled and chopped', is_catalog_vegetable=True, sort_order=0)

r_snk2 = VegetableRecipe.objects.create(
    package=p_snk,
    name='Chichinda Ki Sabji / Padwal Bhaji',
    slug='chichinda-ki-sabji-padwal-bhaji',
    servings=2,
    calories=165,
    protein='5 g',
    carbohydrates='19 g',
    fiber='6 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty='Easy',
    instructions=[
        "Wash 300 g snake gourd (chichinda/padwal). Peel lightly, cut lengthwise and remove the seeds and soft inner pith. Chop into bite-sized pieces.",
        "Rinse 2 tbsp chana dal and soak it in hot water for 30 minutes. Drain completely before using. Chana dal adds texture and protein to this style of padwal bhaji.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp mustard seeds and ½ tsp cumin seeds. Once they crackle, add 6–8 curry leaves and 1 chopped green chilli.",
        "Add the chopped snake gourd, ¼ tsp turmeric, a pinch of hing and salt. Stir-fry for 2–3 minutes.",
        "Add the soaked chana dal and ½ cup water. Mix well, cover and cook on low-medium heat for 12–15 minutes, stirring occasionally, until both the dal and snake gourd are tender.",
        "Remove the lid and cook for another 3–5 minutes until most of the excess moisture evaporates. The sabji should be soft but not watery.",
        "Add 3 tbsp freshly grated coconut and 1 tbsp chopped coriander. Mix gently and cook for 1–2 minutes. Serve warm with chapati, dal-rice, sambar-rice or rasam-rice."
    ],
    health_benefits=["Chana dal and coconut add protein and healthy fats to hydrating snake gourd.", "High in dietary fiber and essential minerals."],
    health_tips=["Pre-soak chana dal in hot water so it cooks to tender perfection along with the snake gourd."],
    tags=["Traditional", "Lunch", "Healthy"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_snk2, package=p_snk, name=p_snk.name, quantity=300, unit='g', notes='Fresh snake gourd', is_catalog_vegetable=True, sort_order=0)

r_snk3 = VegetableRecipe.objects.create(
    package=p_snk,
    name='Pudalangai Poriyal',
    slug='pudalangai-poriyal',
    servings=2,
    calories=145,
    protein='4 g',
    carbohydrates='16 g',
    fiber='5 g',
    fat='8 g',
    prep_time_minutes=8,
    cook_time_minutes=15,
    total_time_minutes=23,
    difficulty='Easy',
    instructions=[
        "Wash 300 g pudalangai (snake gourd) thoroughly. Cut it lengthwise, scrape out the seeds and inner membrane, then chop into small pieces. This is the usual preparation before making pudalangai poriyal.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp mustard seeds, ½ tsp urad dal and ½ tsp chana dal. Fry for 30–45 seconds until the dals turn lightly golden.",
        "Add 6–8 curry leaves, 1 chopped green chilli and ½ small finely chopped onion. Sauté for 2–3 minutes until the onion becomes translucent.",
        "Add the chopped pudalangai and salt. Stir-fry over medium-high heat for 3 minutes, allowing the vegetable to pick up the tempering flavors.",
        "Reduce the heat, cover and cook for 7–10 minutes. Snake gourd releases considerable moisture while cooking, so additional water usually isn't necessary.",
        "Remove the lid and cook on medium-high heat for another 2–3 minutes, stirring occasionally until the excess moisture dries and the vegetable becomes tender.",
        "Add ¼ tsp turmeric, ½ tsp sambar powder and 3 tbsp freshly grated coconut. Mix gently and sauté for 2 minutes. Turn off the heat and serve with steamed rice, sambar or rasam. Coconut is a traditional finishing element in pudalangai poriyal."
    ],
    health_benefits=["Low in calories and exceptionally hydrating.", "Traditional coconut and dal tempering provides pleasant crunch and nutrition."],
    health_tips=["Cook uncovered at the end to allow excess moisture to evaporate, giving crisp-tender poriyal."],
    tags=["Poriyal", "South Indian", "Lunch"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_snk3, package=p_snk, name=p_snk.name, quantity=300, unit='g', notes='Fresh pudalangai', is_catalog_vegetable=True, sort_order=0)

print("Updated Snake Gourd!")

# 6. Ridge Gourd (891: Ridge Gourd (Peerkangai))
p_rdg = Package.objects.get(id=891)
p_rdg.recipes.all().delete()

r_rdg1 = VegetableRecipe.objects.create(
    package=p_rdg,
    name='Peerkangai Thuvaiyal',
    slug='peerkangai-thuvaiyal',
    servings=2,
    calories=155,
    protein='5 g',
    carbohydrates='16 g',
    fiber='4 g',
    fat='8 g',
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty='Easy',
    instructions=[
        "Wash, lightly peel and chop 200 g ridge gourd (peerkangai) into small pieces. Check a small piece for bitterness before cooking; discard it if bitter.",
        "Heat 1 tsp oil in a kadai. Add 2 tbsp urad dal, 1 tbsp chana dal and a pinch of hing. Roast on low heat for 2–3 minutes until the dals turn golden.",
        "Add 3 dried red chillies and roast for another 30–45 seconds until crisp. Transfer everything to a plate and allow it to cool. This roasted-dal and chilli base is characteristic of peerkangai thuvaiyal.",
        "In the same kadai, add 1 tsp oil and the chopped ridge gourd. Add a pinch of salt and sauté for 6–8 minutes until the vegetable becomes soft and slightly mushy.",
        "Add 1 tsp tamarind paste and cook for another 1 minute. Turn off the heat and let the mixture cool completely.",
        "Grind the roasted dals, chillies and cooked ridge gourd together with salt into a thick, coarse chutney. Avoid adding water unless absolutely necessary.",
        "Heat 1 tsp oil separately. Add ½ tsp mustard seeds and 5–6 curry leaves. Once they crackle, pour the tempering over the thuvaiyal. Serve with hot rice, idli or dosa."
    ],
    health_benefits=["High in dietary fiber, vitamin C, and zinc.", "Lentils supply plant protein and satiety."],
    health_tips=["Do not add extra water when grinding thuvaiyal to keep its rich, thick texture."],
    tags=["Thuvaiyal", "Chutney", "South Indian"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rdg1, package=p_rdg, name=p_rdg.name, quantity=200, unit='g', notes='Lightly peeled and chopped', is_catalog_vegetable=True, sort_order=0)

r_rdg2 = VegetableRecipe.objects.create(
    package=p_rdg,
    name='Beerakaya Vepudu',
    slug='beerakaya-vepudu',
    servings=2,
    calories=165,
    protein='5 g',
    carbohydrates='14 g',
    fiber='5 g',
    fat='10 g',
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty='Easy',
    instructions=[
        "Wash and peel 300 g ridge gourd. Cut it lengthwise, remove any mature seeds and chop into small cubes. Check for bitterness before cooking.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp mustard seeds and ½ tsp cumin seeds. Let them crackle for 20–30 seconds.",
        "Add 6–8 curry leaves, 2 chopped garlic cloves and 1 green chilli. Sauté for 1 minute until fragrant.",
        "Add the chopped ridge gourd, ¼ tsp turmeric, ½ tsp red chilli powder and salt. Mix thoroughly and cook uncovered over medium heat for 5–6 minutes.",
        "Cover and cook on low-medium heat for another 7–8 minutes. Ridge gourd naturally releases moisture, so additional water is generally unnecessary for this type of stir-fry.",
        "Remove the lid and increase the heat slightly. Cook for 3–4 minutes, stirring occasionally, until the excess moisture evaporates and the vegetable becomes tender.",
        "Add 2 tbsp roasted peanut powder and 1 tbsp chopped coriander. Toss well and cook for 1–2 minutes. Serve hot with steamed rice and dal."
    ],
    health_benefits=["Peanut powder adds healthy fats and plant protein.", "Ridge gourd aids digestion and maintains healthy metabolism."],
    health_tips=["Toss peanut powder in during the last 2 minutes so it coats the gourd evenly without turning soggy."],
    tags=["Andhra Style", "Stir Fry", "Lunch"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rdg2, package=p_rdg, name=p_rdg.name, quantity=300, unit='g', notes='Cubed ridge gourd', is_catalog_vegetable=True, sort_order=0)

r_rdg3 = VegetableRecipe.objects.create(
    package=p_rdg,
    name='Ridge Gourd Upkari',
    slug='ridge-gourd-upkari',
    servings=2,
    calories=140,
    protein='3 g',
    carbohydrates='13 g',
    fiber='4 g',
    fat='9 g',
    prep_time_minutes=8,
    cook_time_minutes=12,
    total_time_minutes=20,
    difficulty='Easy',
    instructions=[
        "Wash and lightly peel 300 g ridge gourd. Remove the ends and any mature seeds, then cut the vegetable into small cubes. Check a piece for bitterness before proceeding.",
        "Heat 1 tbsp coconut oil in a kadai. Add ½ tsp mustard seeds, ½ tsp urad dal and ½ tsp cumin seeds. Allow them to crackle and turn lightly golden.",
        "Add 1 dried red chilli, 6–8 curry leaves and a pinch of hing. Fry for 20–30 seconds until aromatic.",
        "Add the chopped ridge gourd and salt. Stir-fry for 2–3 minutes over medium heat.",
        "Cover and cook on low heat for 8–10 minutes. Stir once or twice while cooking. The ridge gourd should become tender while retaining some shape.",
        "Remove the lid and cook uncovered for 3–4 minutes until the remaining moisture evaporates. Add ¼ tsp turmeric and ½ tsp red chilli powder and toss gently.",
        "Add ¼ cup freshly grated coconut and mix well. Cook for 1–2 minutes, then turn off the heat. Serve warm as a side dish with rice, dal or chapati."
    ],
    health_benefits=["Light on the stomach and rich in dietary fiber.", "Coconut oil and fresh coconut add rich coastal flavor."],
    health_tips=["Avoid peeling too deeply to retain maximum fiber and vitamins right under the skin."],
    tags=["Konkani Special", "Simple & Healthy", "Side Dish"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rdg3, package=p_rdg, name=p_rdg.name, quantity=300, unit='g', notes='Small cubes', is_catalog_vegetable=True, sort_order=0)

print("Updated Ridge Gourd!")

# 7. Beetroot (892: Beetroot)
p_beet = Package.objects.get(id=892)
p_beet.recipes.all().delete()

r_beet1 = VegetableRecipe.objects.create(
    package=p_beet,
    name='Beet Hummus',
    slug='beet-hummus',
    servings=2,
    calories=190,
    protein='6 g',
    carbohydrates='24 g',
    fiber='6 g',
    fat='8 g',
    prep_time_minutes=10,
    cook_time_minutes=40,
    total_time_minutes=50,
    difficulty='Easy',
    instructions=[
        "Wash 1 medium beetroot thoroughly, trim the ends and roast at 200°C for 35–45 minutes until completely fork-tender. Allow it to cool, peel and chop. Roasting gives the hummus a naturally sweet, earthy flavor.",
        "Add the roasted beetroot to a blender or food processor along with ¾ cup cooked chickpeas, 1 tbsp tahini, 1 small garlic clove, 1 tbsp lemon juice and ½ tsp cumin powder.",
        "Blend for 1–2 minutes until the mixture becomes smooth. Scrape down the sides as needed.",
        "Slowly add 1 tbsp extra-virgin olive oil while blending. Add 1–2 tbsp cold water if necessary to achieve a creamy consistency.",
        "Taste and adjust with salt, lemon juice and cumin. Blend again for 30 seconds until silky and evenly colored.",
        "Transfer to a shallow serving bowl. Use the back of a spoon to create a small swirl on the surface.",
        "Finish with a drizzle of olive oil, sesame seeds and chopped coriander or mint. Serve chilled or at room temperature with pita, crackers, cucumber or carrot sticks."
    ],
    health_benefits=["Beets are high in nitrates which boost athletic performance and lower blood pressure.", "Chickpeas and tahini add fiber and plant protein."],
    health_tips=["Roast beet whole in foil to concentrate natural sweetness before pureeing."],
    tags=["Dip", "Mediterranean", "Healthy Snacks"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_beet1, package=p_beet, name=p_beet.name, quantity=1, unit='medium pc', notes='Roasted beetroot', is_catalog_vegetable=True, sort_order=0)

r_beet2 = VegetableRecipe.objects.create(
    package=p_beet,
    name='Harvard Beets',
    slug='harvard-beets',
    servings=2,
    calories=105,
    protein='2 g',
    carbohydrates='24 g',
    fiber='4 g',
    fat='0 g',
    prep_time_minutes=10,
    cook_time_minutes=25,
    total_time_minutes=35,
    difficulty='Easy',
    instructions=[
        "Wash, peel and slice 300 g beetroot into thin rounds or small wedges. Keeping the pieces similar in size helps them cook evenly.",
        "Place the beetroot in a saucepan, cover with water and cook for 20–25 minutes until tender but still holding its shape. Drain, reserving ¼ cup of the cooking liquid.",
        "In a small saucepan, combine ¼ cup beet cooking liquid, 2 tbsp apple cider vinegar, 1½ tbsp sugar, ½ tsp salt and a pinch of black pepper.",
        "Bring the mixture to a gentle simmer for 2–3 minutes, stirring until the sugar completely dissolves. The vinegar-sugar combination gives Harvard beets their characteristic sweet-and-tangy flavor.",
        "Mix 1 tsp cornstarch with 1 tbsp cold water to make a smooth slurry. Slowly whisk it into the simmering vinegar mixture.",
        "Cook for 1–2 minutes, stirring continuously, until the sauce becomes glossy and lightly thickened. Add the cooked beetroot and gently coat all the pieces.",
        "Simmer together for 3–4 minutes. Turn off the heat and allow the beets to rest in the sauce for 5 minutes before serving. Serve warm or chilled as a colorful side dish."
    ],
    health_benefits=["Fat-free, antioxidant-dense sweet and tangy side dish.", "Folate and betaine support cardiovascular health."],
    health_tips=["Reserve some beet boiling liquid to give the glaze deep ruby color and flavor."],
    tags=["Side Dish", "Sweet & Tangy", "Classic"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_beet2, package=p_beet, name=p_beet.name, quantity=300, unit='g', notes='Peeled and sliced', is_catalog_vegetable=True, sort_order=0)

r_beet3 = VegetableRecipe.objects.create(
    package=p_beet,
    name='Borscht',
    slug='borscht',
    servings=2,
    calories=175,
    protein='5 g',
    carbohydrates='29 g',
    fiber='7 g',
    fat='6 g',
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty='Easy',
    instructions=[
        "Wash, peel and grate 200 g beetroot. Chop 1 small potato, 1 small carrot, ½ small onion and 1 cup cabbage into thin pieces.",
        "Heat 1 tbsp oil in a deep pot. Add the onion and carrot and sauté for 3–4 minutes until they soften. Add 1 minced garlic clove and cook for another 30 seconds.",
        "Add the grated beetroot and 1 tbsp tomato paste. Stir and cook for 3–4 minutes. This helps develop the deep color and savory flavor of the soup.",
        "Add the chopped potato, cabbage and 3 cups vegetable stock or water. Season with salt, black pepper and 1 bay leaf.",
        "Bring to a boil, then reduce the heat and simmer uncovered for 18–20 minutes, until the potato, cabbage and beetroot are tender.",
        "Add 1 tsp lemon juice or vinegar and ½ tsp sugar to balance the earthy sweetness of the beetroot. Simmer for another 2–3 minutes and adjust the seasoning.",
        "Remove the bay leaf and serve the borscht hot. Top each bowl with 1 tbsp sour cream or plain yogurt and fresh dill or coriander. The soup can also be chilled and served cold."
    ],
    health_benefits=["Packed with dietary fiber, vitamin C, and antioxidants from multiple vegetables.", "Comforting, nutrient-dense soup."],
    health_tips=["Finish with a splash of fresh lemon juice or vinegar to brighten the earthy beetroot flavor."],
    tags=["Soup", "European Classic", "Comfort Food"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_beet3, package=p_beet, name=p_beet.name, quantity=200, unit='g', notes='Grated beetroot', is_catalog_vegetable=True, sort_order=0)

print("Updated Beetroot!")

# 8. Radish (893: Radish (Mullangi))
p_rad = Package.objects.get(id=893)
p_rad.recipes.all().delete()

r_rad1 = VegetableRecipe.objects.create(
    package=p_rad,
    name='Mooli Raita',
    slug='mooli-raita',
    servings=2,
    calories=105,
    protein='6 g',
    carbohydrates='9 g',
    fiber='2 g',
    fat='5 g',
    prep_time_minutes=10,
    cook_time_minutes=0,
    total_time_minutes=10,
    difficulty='Easy',
    instructions=[
        "Wash, peel and grate 1 medium mooli (about 150 g). Sprinkle with a small pinch of salt and leave for 5 minutes.",
        "Squeeze the grated mooli gently to remove excess water. This keeps the raita from becoming watery.",
        "Whisk 1½ cups chilled plain curd until smooth and creamy.",
        "Add the squeezed mooli, ½ tsp roasted cumin powder, ¼ tsp red chilli powder, ¼ tsp chaat masala and black salt. Mix well.",
        "Add 1 tbsp finely chopped coriander and mix gently. Taste and adjust salt or chaat masala.",
        "For extra freshness, add ½ tsp lemon juice and mix well. Keep the raita chilled for 10–15 minutes so the flavors blend.",
        "Garnish with a little roasted cumin powder and coriander. Serve chilled with mooli paratha, pulao, biryani or roti."
    ],
    health_benefits=["Radish stimulates digestion and liver function.", "Curd provides cooling probiotics and calcium."],
    health_tips=["Gently squeeze grated radish so raita maintains a creamy consistency without becoming watery."],
    tags=["Raita", "Cooling", "Quick Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rad1, package=p_rad, name=p_rad.name, quantity=150, unit='g', notes='Grated fresh mooli', is_catalog_vegetable=True, sort_order=0)

r_rad2 = VegetableRecipe.objects.create(
    package=p_rad,
    name='Mooli Paratha',
    slug='mooli-paratha',
    servings=2,
    calories=285,
    protein='8 g',
    carbohydrates='43 g',
    fiber='7 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Knead 1½ cups whole-wheat flour with 1 tsp oil, a pinch of salt and water as needed into a soft, smooth dough. Cover and rest for 15–20 minutes.",
        "Grate 2 medium mooli and mix with a small pinch of salt. Rest for 10–15 minutes, then squeeze out as much moisture as possible. Keeping the filling dry makes rolling easier.",
        "Mix the squeezed mooli with 1 tsp grated ginger, 1 green chilli, ½ tsp ajwain, ½ tsp red chilli powder, ½ tsp garam masala, ½ tsp amchur powder and 2 tbsp chopped coriander.",
        "Divide the dough into 4 equal balls. Roll one ball into a small thick circle. Place a portion of the mooli filling in the center, gather the edges and seal completely. Stuffed mooli paratha is traditionally prepared this way.",
        "Dust with flour and gently roll the stuffed dough into a 15–16 cm round paratha. Use light, even pressure so the filling does not break through.",
        "Heat a tawa over medium heat. Place the paratha and cook for 1–2 minutes until bubbles appear. Flip, spread a little oil or ghee, then flip again and cook for 1–2 minutes per side until golden brown spots develop.",
        "Repeat with the remaining dough and filling. Serve hot with Mooli Raita, pickle, chutney or butter."
    ],
    health_benefits=["Whole-wheat and radish provide rich dietary fiber.", "Ajwain and ginger help in smooth digestion."],
    health_tips=["Squeeze out every drop of juice from grated radish before stuffing to prevent tearing."],
    tags=["Breakfast", "Punjabi Special", "Comfort Food"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rad2, package=p_rad, name=p_rad.name, quantity=2, unit='medium pcs', notes='Grated mooli', is_catalog_vegetable=True, sort_order=0)

r_rad3 = VegetableRecipe.objects.create(
    package=p_rad,
    name='Chinese Braised Radish',
    slug='chinese-braised-radish',
    servings=2,
    calories=135,
    protein='3 g',
    carbohydrates='18 g',
    fiber='5 g',
    fat='6 g',
    prep_time_minutes=10,
    cook_time_minutes=30,
    total_time_minutes=40,
    difficulty='Easy',
    instructions=[
        "Wash and peel 400 g white radish (daikon/mooli). Cut it into thick rounds or chunky rectangular pieces so they hold their shape during braising.",
        "Heat 1 tbsp neutral oil in a wok or deep pan. Add 2 sliced garlic cloves, 1 tsp grated ginger and 2 chopped spring onions. Stir-fry for 30–45 seconds until fragrant.",
        "Add the radish pieces and stir-fry over medium-high heat for 3–4 minutes, allowing the edges to become lightly golden.",
        "Add 1½ tbsp light soy sauce, 1 tsp dark soy sauce, 1 tsp rice vinegar, 1 tsp sugar and ½ tsp sesame oil. Toss until the radish is evenly coated.",
        "Pour in 1 cup vegetable stock or water. Bring to a gentle boil, then reduce the heat to low.",
        "Cover and braise for 20–25 minutes, turning the radish occasionally. The finished radish should be very tender and deeply seasoned, while still retaining its shape. Braising radish with soy-based seasoning is a common Chinese preparation.",
        "Remove the lid and simmer for another 3–5 minutes until the liquid reduces into a glossy sauce. Garnish with spring onion and toasted sesame seeds. Serve hot with steamed rice."
    ],
    health_benefits=["Low-calorie, deeply flavorful Asian braise rich in dietary fiber and glucosinolates.", "Promotes healthy digestion."],
    health_tips=["Cut daikon into thick chunks so they stay intact while soaking up the savory braising broth."],
    tags=["Asian", "Braised", "Dinner"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_rad3, package=p_rad, name=p_rad.name, quantity=400, unit='g', notes='White radish chunks', is_catalog_vegetable=True, sort_order=0)

print("Updated Radish!")

# 9. Mint Leaves (894: Mint Leaves (Pudina))
p_mnt = Package.objects.get(id=894)
p_mnt.recipes.all().delete()

r_mnt1 = VegetableRecipe.objects.create(
    package=p_mnt,
    name='Pudina Rice',
    slug='pudina-rice',
    servings=2,
    calories=345,
    protein='7 g',
    carbohydrates='58 g',
    fiber='4 g',
    fat='11 g',
    prep_time_minutes=15,
    cook_time_minutes=20,
    total_time_minutes=35,
    difficulty='Easy',
    instructions=[
        "Rinse 1 cup basmati rice until the water runs mostly clear. Soak for 20 minutes, then drain. This helps the grains cook separately.",
        "Blend 1 cup fresh mint leaves, ¼ cup coriander leaves, 1 green chilli, ½-inch ginger, 2 garlic cloves and 2 tbsp grated coconut with a little water into a smooth green paste.",
        "Heat 1½ tbsp oil in a heavy pan. Add 1 small cinnamon stick, 2 cloves, 1 cardamom and ½ tsp cumin seeds. Fry for 30–40 seconds until fragrant.",
        "Add 1 small sliced onion and sauté for 3–4 minutes until soft and lightly golden. Add the mint paste, ¼ tsp turmeric, ½ tsp red chilli powder and salt, then cook for 2–3 minutes until the raw smell disappears.",
        "Add the drained rice and gently mix for 1 minute, coating the grains with the mint masala.",
        "Add 1½ cups hot water and bring to a boil. Cover tightly and cook on low heat for 12–15 minutes, until the rice is tender and the water is absorbed.",
        "Switch off the heat and let the rice rest, covered, for 5 minutes. Fluff gently with a fork and finish with 1 tsp lemon juice and 1 tbsp roasted cashews or peanuts. Serve with raita or plain yogurt."
    ],
    health_benefits=["Mint calms stomach discomfort and improves digestion.", "Whole spices add aroma and antioxidant value."],
    health_tips=["Sauté mint paste on medium flame until aromatic before adding basmati rice."],
    tags=["Rice Dishes", "Lunch", "Flavorful"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_mnt1, package=p_mnt, name=p_mnt.name, quantity=1, unit='cup', notes='Fresh pudina leaves', is_catalog_vegetable=True, sort_order=0)

r_mnt2 = VegetableRecipe.objects.create(
    package=p_mnt,
    name='Pudina Paani',
    slug='pudina-paani',
    servings=2,
    calories=25,
    protein='1 g',
    carbohydrates='6 g',
    fiber='1 g',
    fat='0 g',
    prep_time_minutes=8,
    cook_time_minutes=0,
    total_time_minutes=8,
    difficulty='Easy',
    instructions=[
        "Wash 1 packed cup fresh mint leaves and ½ cup coriander leaves thoroughly. Remove any thick stems.",
        "Add the mint, coriander, 1 green chilli, ½-inch ginger and 1 tbsp lemon juice to a blender.",
        "Add 1½ cups cold water and blend for 30–45 seconds until the herbs are finely crushed.",
        "Strain the mixture through a fine sieve if you prefer a smooth drink. Press the pulp gently to extract the flavorful liquid.",
        "Add another ½ cup chilled water, ½ tsp roasted cumin powder, ¼ tsp black salt and regular salt. Mix well.",
        "Add 1–2 tsp jaggery syrup according to taste. Stir until completely dissolved. For a sharper version, add another ½ tsp lemon juice.",
        "Fill two glasses with ice and pour in the pudina paani. Garnish with fresh mint and a lemon wedge. Serve immediately as a refreshing mint drink."
    ],
    health_benefits=["Ultra-refreshing, low-calorie hydrator that relieves acidity and indigestion.", "Rich in vitamin C and minerals."],
    health_tips=["Serve over crushed ice with a squeeze of fresh lemon for the best cooling effect."],
    tags=["Beverage", "Detox", "Cooling"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_mnt2, package=p_mnt, name=p_mnt.name, quantity=1, unit='cup', notes='Fresh mint leaves', is_catalog_vegetable=True, sort_order=0)

r_mnt3 = VegetableRecipe.objects.create(
    package=p_mnt,
    name='Mint Mojito',
    slug='mint-mojito',
    servings=2,
    calories=55,
    protein='0 g',
    carbohydrates='14 g',
    fiber='1 g',
    fat='0 g',
    prep_time_minutes=5,
    cook_time_minutes=0,
    total_time_minutes=5,
    difficulty='Easy',
    instructions=[
        "Divide ½ cup fresh mint leaves between two tall glasses. Add 1 lime, cut into wedges, to each glass.",
        "Add 1 tbsp sugar syrup to each glass. Gently muddle the mint and lime for 15–20 seconds to release the mint oils and lime juice. Avoid crushing the mint too aggressively.",
        "Add plenty of ice cubes to each glass and stir for 10–15 seconds until chilled.",
        "Add 1 tbsp fresh lime juice to each glass for a stronger citrus flavor.",
        "Slowly pour ½ cup chilled soda water into each glass. The soda gives the mojito its characteristic light, sparkling finish.",
        "Stir gently from the bottom upward for 5–10 seconds, keeping the carbonation intact. Taste and add a little more sugar syrup or lime if required.",
        "Garnish with a fresh mint sprig and lime wedge. Serve immediately while the drink is cold and fizzy."
    ],
    health_benefits=["Sparkling citrus refresher with digestive essential oils from fresh mint leaves.", "Refreshing zero-fat mocktail."],
    health_tips=["Muddle mint gently so essential oils release without releasing bitter chlorophyll."],
    tags=["Mocktail", "Party Drink", "Quick Recipes"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_mnt3, package=p_mnt, name=p_mnt.name, quantity=0.5, unit='cup', notes='Fresh mint leaves', is_catalog_vegetable=True, sort_order=0)

print("Updated Mint Leaves!")

# 10. Drumstick (895: Drumstick (Murungakkai))
p_drm = Package.objects.get(id=895)
p_drm.recipes.all().delete()

r_drm1 = VegetableRecipe.objects.create(
    package=p_drm,
    name='Drumstick Masala Curry',
    slug='drumstick-masala-curry',
    servings=2,
    calories=185,
    protein='5 g',
    carbohydrates='18 g',
    fiber='6 g',
    fat='11 g',
    prep_time_minutes=10,
    cook_time_minutes=18,
    total_time_minutes=28,
    difficulty='Easy',
    instructions=[
        "Wash 3 drumsticks (about 250 g), lightly scrape the outer skin and cut them into 5–6 cm pieces. Check that the pods are fresh and tender.",
        "Heat 1½ tbsp oil in a kadai. Add ½ tsp mustard seeds and ½ tsp cumin seeds. Once they crackle, add 1 small sliced onion, 1 green chilli and 1 tsp ginger-garlic paste. Sauté for 3–4 minutes.",
        "Add 1 chopped tomato and cook for 4–5 minutes until soft and pulpy.",
        "Add ¼ tsp turmeric, 1 tsp coriander powder, ½ tsp cumin powder, ½ tsp red chilli powder and salt. Cook for 1 minute so the spices become aromatic.",
        "Add the drumstick pieces and ¾ cup water. Mix well, cover and cook on low-medium heat for 12–15 minutes, turning the pieces occasionally, until tender.",
        "Add 2 tbsp grated coconut and ½ tsp garam masala. Simmer uncovered for 3–4 minutes until the gravy thickens and coats the drumsticks.",
        "Finish with 1 tbsp chopped coriander and ½ tsp lemon juice. Serve hot with steamed rice, chapati or dosa."
    ],
    health_benefits=["Drumstick is packed with vitamin C, calcium, and bioactive compounds.", "Aids in bone strength and blood purification."],
    health_tips=["Lightly scrape outer skin rather than deep peeling to preserve pulp integrity while cooking."],
    tags=["Curry", "Traditional", "Dinner"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_drm1, package=p_drm, name=p_drm.name, quantity=3, unit='pcs', notes='Fresh tender drumsticks', is_catalog_vegetable=True, sort_order=0)

r_drm2 = VegetableRecipe.objects.create(
    package=p_drm,
    name='Drumstick Coconut Curry',
    slug='drumstick-coconut-curry',
    servings=2,
    calories=205,
    protein='5 g',
    carbohydrates='19 g',
    fiber='6 g',
    fat='13 g',
    prep_time_minutes=12,
    cook_time_minutes=20,
    total_time_minutes=32,
    difficulty='Easy',
    instructions=[
        "Prepare 3 drumsticks by washing, lightly scraping and cutting them into 5–6 cm pieces. Cook them with ¾ cup water, ¼ tsp turmeric and a pinch of salt for 8–10 minutes until partially tender.",
        "For the masala, blend ¼ cup fresh coconut, 1 small onion, 2 dried red chillies, 1 tsp coriander seeds, ½ tsp cumin seeds and ½-inch ginger with a little water into a smooth paste.",
        "Heat 1 tbsp coconut oil in a kadai. Add ½ tsp mustard seeds and let them crackle. Add 6–8 curry leaves and a pinch of hing.",
        "Add the ground coconut masala and cook on low heat for 4–5 minutes, stirring regularly until the raw aroma disappears.",
        "Add the partially cooked drumsticks and their cooking liquid. Mix gently and add another ½ cup water if needed.",
        "Cover and simmer on low heat for 8–10 minutes until the drumsticks are completely tender and the coconut gravy becomes thick and flavorful.",
        "Add ½ tsp tamarind extract and adjust salt. Simmer for another 2 minutes, then switch off. Serve with hot rice, dosa or appam."
    ],
    health_benefits=["Rich coconut gravy provides medium-chain fatty acids.", "Drumstick pulp delivers antioxidants and vital micronutrients."],
    health_tips=["Use the drumstick cooking broth in the gravy so water-soluble vitamins are not lost."],
    tags=["Coastal", "South Indian", "Curry"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_drm2, package=p_drm, name=p_drm.name, quantity=3, unit='pcs', notes='Cut pieces', is_catalog_vegetable=True, sort_order=0)

r_drm3 = VegetableRecipe.objects.create(
    package=p_drm,
    name='Drumstick Sambar',
    slug='drumstick-sambar',
    servings=2,
    calories=245,
    protein='11 g',
    carbohydrates='34 g',
    fiber='8 g',
    fat='8 g',
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty='Easy',
    instructions=[
        "Rinse ½ cup toor dal thoroughly. Pressure cook it with 1½ cups water and ¼ tsp turmeric for about 3–4 whistles or until completely soft. Mash until smooth.",
        "Wash and lightly scrape 3 drumsticks, then cut them into 5–6 cm pieces. Chop 1 small onion and 1 medium tomato. Soak 1 tbsp tamarind in warm water for 10–15 minutes and extract the pulp.",
        "Heat 1 tbsp sesame oil in a pot. Add ½ tsp mustard seeds. When they crackle, add 1 dried red chilli, 5–6 curry leaves, a pinch of fenugreek seeds and hing.",
        "Add the onion and tomato and sauté for 3–4 minutes. Add the drumstick pieces, ¼ tsp turmeric and 1 cup water. Cover and cook for 10–12 minutes until the drumsticks are tender.",
        "Add 1½ tbsp sambar powder, the tamarind extract and salt. Mix well and simmer for 5–6 minutes until the raw tamarind aroma disappears.",
        "Add the cooked mashed dal and mix thoroughly. Add ½–¾ cup water depending on the desired consistency. Simmer gently for another 5–7 minutes.",
        "Turn off the heat, add 1 tbsp chopped coriander and cover for 5 minutes so the tempering and sambar flavors infuse. Serve hot with steamed rice, idli, dosa or vada."
    ],
    health_benefits=["High-protein lentil stew infused with fiber-dense drumstick goodness.", "Supports overall immunity and digestive balance."],
    health_tips=["Simmer drumsticks in tamarind water first so they absorb the tangy sambar spices."],
    tags=["Sambar", "South Indian", "Staple"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_drm3, package=p_drm, name=p_drm.name, quantity=3, unit='pcs', notes='Drumstick pieces', is_catalog_vegetable=True, sort_order=0)

print("Updated Drumstick!")

# 11. Drumstick Leaves (896: Drumstick Leaves (Murungai Keerai))
p_ml = Package.objects.get(id=896)
p_ml.recipes.all().delete()

r_ml1 = VegetableRecipe.objects.create(
    package=p_ml,
    name='Murungai Keerai Flatbread',
    slug='murungai-keerai-flatbread',
    servings=2,
    calories=295,
    protein='10 g',
    carbohydrates='45 g',
    fiber='8 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Wash 1 packed cup fresh murungai keerai (moringa/drumstick leaves) thoroughly. Remove the thick stems, drain well and finely chop the leaves.",
        "Add the chopped leaves to 1½ cups whole-wheat flour along with 2 tbsp besan, ½ tsp cumin seeds, ½ tsp ajwain, ¼ tsp turmeric, ½ tsp red chilli powder and salt.",
        "Add 1 finely chopped green chilli, 1 tsp grated ginger, 2 tbsp chopped onion and 1 tbsp curd. Mix everything thoroughly so the moringa leaves are evenly distributed.",
        "Gradually add water and knead for 5–6 minutes into a soft, smooth dough. Add 1 tsp oil, knead briefly, cover and rest for 15 minutes.",
        "Divide the dough into 6 equal balls. Dust each with flour and roll into a thin round flatbread approximately 15 cm wide.",
        "Heat a tawa over medium heat. Cook each flatbread for about 1 minute per side, applying a little oil and flipping until both sides develop golden-brown spots.",
        "Serve the moringa flatbreads warm with curd, pickle, chutney or vegetable curry."
    ],
    health_benefits=["Moringa leaves are recognized superfoods packed with iron, calcium, and vitamins A & C.", "Whole wheat and besan provide sustained energy."],
    health_tips=["Remove all hard stalks and finely chop the tender leaves for smooth dough rolling."],
    tags=["Flatbread", "Superfood", "Breakfast"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_ml1, package=p_ml, name=p_ml.name, quantity=1, unit='packed cup', notes='Fresh murungai keerai', is_catalog_vegetable=True, sort_order=0)

r_ml2 = VegetableRecipe.objects.create(
    package=p_ml,
    name='Munagaku Podi',
    slug='munagaku-podi',
    servings=2,
    calories=145,
    protein='7 g',
    carbohydrates='19 g',
    fiber='6 g',
    fat='5 g',
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty='Easy',
    instructions=[
        "Wash 2 packed cups fresh munagaku (moringa/drumstick leaves) thoroughly. Remove the thick stems and spread the leaves on a clean cloth until completely dry.",
        "Dry-roast the moringa leaves over low heat for 5–7 minutes, stirring continuously, until they become dry and slightly crisp. Do not burn or heavily brown them.",
        "Remove the leaves. In the same pan, dry-roast 2 tbsp urad dal and 2 tbsp chana dal over low-medium heat for 3–4 minutes until golden and aromatic.",
        "Add 4 dried red chillies, 1 tsp cumin seeds, 1 tsp coriander seeds and a small piece of tamarind. Roast for another 1–2 minutes.",
        "Add 1 tbsp sesame seeds and a pinch of hing. Roast for 30–45 seconds, then switch off the heat. Allow everything to cool completely.",
        "Grind the roasted dal-spice mixture with salt into a coarse powder. Add the roasted moringa leaves and pulse again until you get a slightly coarse podi.",
        "Serve about 2–3 tbsp per person, mixed with hot rice and a little ghee or sesame oil. It can also be sprinkled over idli or dosa."
    ],
    health_benefits=["Incredible source of bioavailable iron and plant-based protein.", "Supports daily vitality and lactation."],
    health_tips=["Dry roast moringa leaves on low flame until crisp without charring to retain dark green color and vitamins."],
    tags=["Podi", "Superfood", "Traditional"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_ml2, package=p_ml, name=p_ml.name, quantity=2, unit='packed cups', notes='Fresh moringa leaves', is_catalog_vegetable=True, sort_order=0)

r_ml3 = VegetableRecipe.objects.create(
    package=p_ml,
    name='Murungai Keerai Adai',
    slug='murungai-keerai-adai',
    servings=2,
    calories=315,
    protein='13 g',
    carbohydrates='48 g',
    fiber='9 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=15,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Wash and soak ¼ cup raw rice, ¼ cup chana dal, 2 tbsp toor dal and 2 tbsp urad dal in enough water for 2–3 hours.",
        "Drain and grind with 2 dried red chillies, ½ tsp cumin seeds, ½ tsp fennel seeds and a small piece of ginger. Add just enough water to make a thick, slightly coarse batter.",
        "Wash 1 packed cup murungai keerai, remove the thick stems and finely chop the leaves.",
        "Add the chopped moringa leaves to the batter along with ¼ cup finely chopped onion, 1 chopped green chilli, 6 chopped curry leaves, a pinch of hing and salt. Mix thoroughly.",
        "Heat a dosa tawa and lightly grease it. Pour one ladle of batter and spread gently into a thick circular adai. Make a small hole in the center to help it cook evenly.",
        "Drizzle about ½ tsp oil around the edges. Cook over medium heat for 2–3 minutes, flip and cook the other side for another 2 minutes until crisp and golden.",
        "Repeat with the remaining batter and serve the adai hot with coconut chutney, tomato chutney, sambar or a little jaggery."
    ],
    health_benefits=["High protein and iron combination of mixed lentils and moringa leaves.", "Wholesome gluten-free South Indian breakfast."],
    health_tips=["Make a small depression in center of adai while cooking to ensure crisp and uniform browning."],
    tags=["Adai", "Breakfast", "High Protein"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_ml3, package=p_ml, name=p_ml.name, quantity=1, unit='packed cup', notes='Fresh leaves', is_catalog_vegetable=True, sort_order=0)

print("Updated Drumstick Leaves!")

# 12. Small Onion (899: Onion (Chinna Vengayam))
p_smon = Package.objects.get(id=899)
p_smon.recipes.all().delete()

r_smon1 = VegetableRecipe.objects.create(
    package=p_smon,
    name='Chinna Vengaya Sambar',
    slug='chinna-vengaya-sambar',
    servings=2,
    calories=250,
    protein='10 g',
    carbohydrates='32 g',
    fiber='7 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=25,
    total_time_minutes=40,
    difficulty='Easy',
    instructions=[
        "Rinse ½ cup toor dal and pressure-cook it with 1¼ cups water and ¼ tsp turmeric for about 3–4 whistles, until completely soft. Mash until smooth.",
        "Peel 150 g chinna vengayam (small onions/shallots) and keep them whole. Soak small lemon-sized tamarind in warm water for 10–15 minutes, then extract the juice.",
        "Heat 1 tbsp gingelly oil in a kadai. Add ½ tsp mustard seeds, ¼ tsp fenugreek seeds, 1 dried red chilli, 6–8 curry leaves and a pinch of hing. Allow them to crackle.",
        "Add the whole shallots and sauté for 5–6 minutes until they become translucent and lightly golden. Keeping the shallots whole allows them to become soft and naturally sweet while cooking.",
        "Add 1 chopped tomato, 1½ tsp sambar powder, ¼ tsp turmeric and salt. Cook for 3–4 minutes until the tomato softens.",
        "Add the tamarind extract and ½ cup water. Cover and simmer for 8–10 minutes until the shallots are tender and the raw tamarind smell disappears. Then add the mashed dal and enough water to reach a flowing sambar consistency. Simmer for another 5 minutes.",
        "Add ½ tsp grated jaggery and 1 tbsp chopped coriander. Simmer for 1–2 minutes, switch off the heat and let the sambar rest for 10 minutes before serving with rice, idli or dosa."
    ],
    health_benefits=["Shallots provide rich quercetin, sulfur compounds, and dietary antioxidants.", "Toor dal supplies healthy plant protein."],
    health_tips=["Sauté shallots in gingelly oil until translucent to unlock their natural caramel sweetness."],
    tags=["Sambar", "Traditional", "South Indian"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_smon1, package=p_smon, name=p_smon.name, quantity=150, unit='g', notes='Peeled whole shallots', is_catalog_vegetable=True, sort_order=0)

r_smon2 = VegetableRecipe.objects.create(
    package=p_smon,
    name='Chinna Vengaya Chutney / Thogayal',
    slug='chinna-vengaya-chutney-thogayal',
    servings=2,
    calories=175,
    protein='5 g',
    carbohydrates='19 g',
    fiber='4 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=12,
    total_time_minutes=22,
    difficulty='Easy',
    instructions=[
        "Peel 150 g chinna vengayam and cut the larger shallots in half. Heat 1 tsp sesame oil in a pan and sauté the shallots for 5–6 minutes until soft and lightly browned.",
        "Remove the shallots. In the same pan, add 1 tsp sesame oil, 2 tbsp urad dal and 1 tbsp chana dal. Roast on low-medium heat for 2–3 minutes until golden.",
        "Add 4 dried red chillies and ½ tsp cumin seeds. Roast for another 30–45 seconds, then switch off the heat.",
        "Add the roasted ingredients to a blender along with 1 tbsp grated coconut, a small piece of tamarind and salt. Pulse into a coarse mixture.",
        "Add the sautéed shallots and grind again, adding only 1–2 tbsp water if required. Keep the texture slightly coarse rather than completely smooth.",
        "Taste and balance with a little extra tamarind or salt. The caramelized shallots should give the thogayal a naturally sweet, deep flavor.",
        "Heat 1 tsp sesame oil, add ½ tsp mustard seeds and 5–6 curry leaves, let them crackle and pour over the chutney. Serve with hot rice and sesame oil/ghee, idli, dosa or curd rice."
    ],
    health_benefits=["Roasted dals and shallots deliver protein, antioxidants, and digestive fiber.", "Traditional immunity-boosting chutney."],
    health_tips=["Grind coarsely without too much water for an authentic rustic thogayal consistency."],
    tags=["Thogayal", "Chutney", "Side Dish"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_smon2, package=p_smon, name=p_smon.name, quantity=150, unit='g', notes='Fresh shallots', is_catalog_vegetable=True, sort_order=0)

r_smon3 = VegetableRecipe.objects.create(
    package=p_smon,
    name='Chinna Vengaya Poriyal',
    slug='chinna-vengaya-poriyal',
    servings=2,
    calories=165,
    protein='3 g',
    carbohydrates='19 g',
    fiber='4 g',
    fat='9 g',
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty='Easy',
    instructions=[
        "Peel 200 g chinna vengayam. Leave small shallots whole and halve the larger ones so they cook evenly.",
        "Heat 1½ tbsp sesame oil in a kadai. Add ½ tsp mustard seeds and allow them to crackle. Add ½ tsp urad dal, 1 dried red chilli and 6–8 curry leaves.",
        "Add the shallots and a small pinch of salt. Sauté over medium heat for 6–8 minutes, stirring frequently, until the onions become soft and lightly golden.",
        "Add 2 chopped garlic cloves and 1 green chilli. Cook for another 1 minute until fragrant.",
        "Add ¼ tsp turmeric, ½ tsp red chilli powder, ½ tsp coriander powder and a pinch of hing. Mix well and cook for 30–45 seconds.",
        "Add ¼ cup water, cover and cook on low heat for 5–7 minutes until the shallots are completely tender. Remove the lid and cook for another 2–3 minutes until the moisture evaporates.",
        "Add 2 tbsp freshly grated coconut and 1 tbsp chopped coriander. Toss gently and cook for 1–2 minutes. Serve warm as a side dish with rice, sambar, rasam or curd rice."
    ],
    health_benefits=["Helps improve cardiovascular health and boosts immune defenses.", "Rich in prebiotics supporting gut microflora."],
    health_tips=["Simmer with a splash of water so shallots become sweet and melt-in-mouth tender."],
    tags=["Poriyal", "South Indian", "Lunch"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_smon3, package=p_smon, name=p_smon.name, quantity=200, unit='g', notes='Fresh small onions', is_catalog_vegetable=True, sort_order=0)

print("Updated Small Onion!")

# 13. Spring Onion (900: Spring Onion (Vengaya Thaal))
p_spo = Package.objects.get(id=900)
p_spo.recipes.all().delete()

r_spo1 = VegetableRecipe.objects.create(
    package=p_spo,
    name='Cong You Bing',
    slug='cong-you-bing',
    servings=2,
    calories=295,
    protein='7 g',
    carbohydrates='43 g',
    fiber='2 g',
    fat='11 g',
    prep_time_minutes=20,
    cook_time_minutes=15,
    total_time_minutes=35,
    difficulty='Easy',
    instructions=[
        "Mix 1½ cups all-purpose flour and ½ tsp salt. Gradually add about ½ cup hot water, mixing until a rough dough forms. Knead for 5–7 minutes until smooth and elastic. Hot water helps create the tender, layered texture typical of cong you bing.",
        "Cover the dough and rest for 30 minutes. Meanwhile, finely chop ¾ cup spring onions, using both the green and tender white portions.",
        "Divide the dough into 4 balls. Lightly oil the work surface and roll one ball into a very thin rectangle. Brush with 1 tsp sesame oil, then scatter chopped spring onions and a pinch of white pepper over the surface.",
        "Roll the dough loosely from one long edge into a rope. Coil the rope into a spiral, tuck the end underneath and gently flatten it.",
        "Roll the spiral again into a 15–16 cm round pancake, using gentle pressure so the layers remain intact.",
        "Heat 1–2 tsp oil in a skillet over medium heat. Cook the pancake for about 2–3 minutes per side, flipping several times until crisp, golden and flaky. Gently press the edges during cooking to encourage the layers to separate.",
        "Repeat with the remaining dough. Cut into wedges and serve immediately with a dip made from soy sauce, rice vinegar, sesame oil and chilli."
    ],
    health_benefits=["Spring onions provide essential vitamins A, C, and K.", "Crisp layered pancake offering great satisfaction and energy."],
    health_tips=["Use hot water for kneading and rest the dough to create signature flaky, delicate layers."],
    tags=["Chinese", "Street Food", "Snacks"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_spo1, package=p_spo, name=p_spo.name, quantity=0.75, unit='cup', notes='Chopped spring onions', is_catalog_vegetable=True, sort_order=0)

r_spo2 = VegetableRecipe.objects.create(
    package=p_spo,
    name='Spring Onion Pakoras',
    slug='spring-onion-pakoras',
    servings=2,
    calories=275,
    protein='8 g',
    carbohydrates='32 g',
    fiber='5 g',
    fat='13 g',
    prep_time_minutes=10,
    cook_time_minutes=10,
    total_time_minutes=20,
    difficulty='Easy',
    instructions=[
        "Wash 2 cups spring onions thoroughly. Separate the white and green portions, then finely chop both. Allow them to drain well so excess moisture does not make the batter loose.",
        "Add the spring onions to a bowl with ¾ cup besan, 2 tbsp rice flour, 1 chopped green chilli, 1 tsp grated ginger, ½ tsp cumin seeds, ½ tsp red chilli powder, ¼ tsp turmeric, a pinch of hing and salt.",
        "Mix everything thoroughly. The spring onions will release some moisture, so add only 1–2 tbsp water if necessary. The mixture should be thick enough to hold its shape when pressed together.",
        "Rest the mixture for 5 minutes. Meanwhile, heat oil over medium heat for frying.",
        "Take small portions of the mixture and gently drop them into the hot oil. Do not make the pakoras too large, otherwise the center may remain soft.",
        "Fry for 3–4 minutes, turning occasionally, until crisp and deep golden on the outside. Fry in batches so the oil temperature remains steady.",
        "Drain on kitchen paper and serve immediately with mint chutney, coriander chutney or tomato ketchup. For extra crunch, sprinkle a little chaat masala before serving."
    ],
    health_benefits=["Rich in allicin and antioxidants supporting cardiovascular wellness.", "Gram flour and rice flour combine to provide crisp protein."],
    health_tips=["Fry small spoonfuls on medium heat so pakoras cook through evenly with a crunchy crust."],
    tags=["Pakora", "Tea Time", "Snacks"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_spo2, package=p_spo, name=p_spo.name, quantity=2, unit='cups', notes='Chopped greens & whites', is_catalog_vegetable=True, sort_order=0)

r_spo3 = VegetableRecipe.objects.create(
    package=p_spo,
    name='Spring Onion Paratha',
    slug='spring-onion-paratha',
    servings=2,
    calories=285,
    protein='9 g',
    carbohydrates='43 g',
    fiber='7 g',
    fat='9 g',
    prep_time_minutes=15,
    cook_time_minutes=12,
    total_time_minutes=27,
    difficulty='Easy',
    instructions=[
        "Add 1½ cups whole-wheat flour, ¾ cup finely chopped spring onions, 1 chopped green chilli, 1 tsp ginger-garlic paste, ½ tsp ajwain, ¼ tsp turmeric, ¼ tsp red chilli powder, ¼ tsp garam masala, 1 tbsp oil and salt to a mixing bowl. Spring onion paratha can be made by mixing the chopped onions directly into the dough rather than stuffing them separately.",
        "Mix thoroughly. Add water gradually and knead for 5–6 minutes into a soft, pliable dough. Add water carefully because the spring onions release moisture as they are kneaded.",
        "Cover the dough and rest for 15 minutes. Divide it into 6 equal balls.",
        "Dust each ball lightly with flour and roll into a round approximately 15–16 cm wide. Keep the paratha moderately thin so the spring onions cook properly.",
        "Heat a tawa over medium heat. Place one paratha on it and cook for 30–45 seconds, until small bubbles appear.",
        "Flip and spread a little oil or ghee over the surface. Flip again and cook both sides for 1–2 minutes each, pressing gently around the edges until golden-brown spots appear.",
        "Repeat with the remaining dough. Serve hot with curd, pickle, mint chutney or white butter."
    ],
    health_benefits=["Whole-wheat and spring onions provide dietary fiber and essential minerals.", "Ajwain enhances digestion."],
    health_tips=["Incorporate spring onions directly into flour before adding water to prevent excess dough moisture."],
    tags=["Paratha", "Breakfast", "North Indian"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_spo3, package=p_spo, name=p_spo.name, quantity=0.75, unit='cup', notes='Finely chopped spring onions', is_catalog_vegetable=True, sort_order=0)

print("Updated Spring Onion!")

# 14. Sweet Potato (901: Sweet Potato (Chakkara Valli))
p_sp = Package.objects.get(id=901)
p_sp.recipes.all().delete()

r_sp1 = VegetableRecipe.objects.create(
    package=p_sp,
    name='Shakarkand Chaat',
    slug='shakarkand-chaat',
    servings=2,
    calories=190,
    protein='3 g',
    carbohydrates='38 g',
    fiber='6 g',
    fat='4 g',
    prep_time_minutes=10,
    cook_time_minutes=15,
    total_time_minutes=25,
    difficulty='Easy',
    instructions=[
        "Wash 300 g sweet potatoes (shakarkand) thoroughly. Boil or steam for 15–20 minutes until fork-tender but not mushy. Allow them to cool, peel and cut into bite-sized cubes.",
        "For a more flavorful street-style version, heat 1 tsp oil in a pan and add the sweet-potato cubes. Pan-roast for 5–6 minutes, turning occasionally, until the outside becomes lightly crisp.",
        "Transfer the roasted sweet potato to a bowl. Add ½ tsp chaat masala, ½ tsp roasted cumin powder, ¼ tsp black salt and ¼ tsp red chilli powder.",
        "Add 1 tbsp finely chopped onion, 1 green chilli and 1 tbsp fresh coriander. Gently toss everything together.",
        "Add 1 tbsp tamarind chutney and 1 tsp lemon juice. The sweet, spicy and tangy combination is characteristic of shakarkandi chaat.",
        "Mix gently so the sweet-potato cubes remain intact. Taste and adjust the chaat masala, lemon juice or chutney according to preference.",
        "Transfer to serving bowls and garnish with 2 tbsp pomegranate seeds and fresh coriander. Serve immediately while the sweet potato is still slightly warm and crisp."
    ],
    health_benefits=["Packed with beta-carotene (provitamin A), potassium, and gut-friendly fiber.", "Naturally sweet, low-fat healthy snack."],
    health_tips=["Pan-roast boiled sweet potato cubes briefly for crisp caramelized edges."],
    tags=["Chaat", "Healthy Snacks", "Street Food"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_sp1, package=p_sp, name=p_sp.name, quantity=300, unit='g', notes='Fresh sweet potatoes', is_catalog_vegetable=True, sort_order=0)

r_sp2 = VegetableRecipe.objects.create(
    package=p_sp,
    name='Camote Cue',
    slug='camote-cue',
    servings=2,
    calories=245,
    protein='2 g',
    carbohydrates='43 g',
    fiber='5 g',
    fat='9 g',
    prep_time_minutes=8,
    cook_time_minutes=18,
    total_time_minutes=26,
    difficulty='Easy',
    instructions=[
        "Wash and peel 300 g sweet potatoes. Cut them into thick diagonal pieces or rounds, approximately 1–1½ cm thick, so they remain firm while cooking.",
        "Heat 2 tbsp neutral cooking oil in a wide frying pan over medium heat. Add the sweet-potato pieces in a single layer and cook for 5–7 minutes, turning occasionally.",
        "Sprinkle 3 tbsp brown sugar evenly over the sweet potatoes. Let it sit for about 1 minute until the sugar begins to melt around the pieces.",
        "Continue cooking for 5–7 minutes, gently turning the sweet potatoes as the sugar melts. The sugar should begin coating the surface rather than burning.",
        "Reduce the heat to low and continue turning the sweet potatoes for another 5–8 minutes. The melted sugar will caramelize and form a shiny, sticky coating. Traditional camote cue gets its characteristic caramelized exterior from brown sugar cooked with the sweet potato.",
        "Check with a fork. The sweet potato should be tender inside and deeply caramelized outside. If the sugar begins to darken too quickly, reduce the heat immediately.",
        "Transfer the caramel-coated sweet potatoes to a lightly greased plate or parchment and allow them to cool for 2–3 minutes. Serve warm, either as pieces or threaded onto bamboo skewers."
    ],
    health_benefits=["Sweet potatoes provide sustained energy with low glycemic response.", "Natural source of vitamins A, C, and manganese."],
    health_tips=["Maintain low heat once brown sugar melts so it caramelizes into a glossy glaze without burning."],
    tags=["Filipino Street Food", "Dessert", "Snacks"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_sp2, package=p_sp, name=p_sp.name, quantity=300, unit='g', notes='Thick diagonal slices', is_catalog_vegetable=True, sort_order=0)

r_sp3 = VegetableRecipe.objects.create(
    package=p_sp,
    name='Sweet Potato Soup',
    slug='sweet-potato-soup',
    servings=2,
    calories=185,
    protein='4 g',
    carbohydrates='34 g',
    fiber='6 g',
    fat='7 g',
    prep_time_minutes=10,
    cook_time_minutes=20,
    total_time_minutes=30,
    difficulty='Easy',
    instructions=[
        "Wash, peel and cut 300 g sweet potato into small cubes. Also chop ½ small onion, 1 small carrot and 2 garlic cloves.",
        "Heat 1 tbsp olive oil in a pot. Add the onion and garlic and sauté for 3–4 minutes until softened.",
        "Add the carrot and sweet potato. Stir-fry for 2–3 minutes, allowing the vegetables to lightly roast and develop flavor.",
        "Add 2 cups vegetable stock, ½ tsp grated ginger, ¼ tsp black pepper, ¼ tsp chilli flakes and salt. Bring to a boil.",
        "Reduce the heat, cover and simmer for 15–18 minutes, until the sweet potato and carrot are completely tender. Similar sweet-potato soups use simmering followed by blending to create a smooth texture.",
        "Turn off the heat and allow the soup to cool slightly. Blend carefully until smooth and creamy. If it is too thick, add a little extra vegetable stock or hot water.",
        "Return the soup to the pot and gently reheat for 2 minutes. Finish with 1 tsp lemon juice and 1 tbsp chopped coriander. Serve hot with toasted bread or croutons."
    ],
    health_benefits=["Warm, comforting antioxidant-packed soup.", "Ginger and garlic add warming anti-inflammatory benefits."],
    health_tips=["Blend with hot stock until velvety smooth; serve with lemon squeeze to balance richness."],
    tags=["Soup", "Healthy", "Dinner"],
    is_active=True,
    is_popular=True
)
RecipeIngredient.objects.create(recipe=r_sp3, package=p_sp, name=p_sp.name, quantity=300, unit='g', notes='Sweet potato cubes', is_catalog_vegetable=True, sort_order=0)

print("Updated Sweet Potato!")
print("ALL 10 VEGETABLES UPDATED SUCCESSFULLY IN DATABASE!")
