import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import VegetableRecipe

RECIPE_DETAILS = {
    # 1. Tomato
    "Tomato Rasam": {
        "servings": 2,
        "calories": 95,
        "protein": "4 g",
        "carbohydrates": "14 g",
        "fiber": "3 g",
        "fat": "3 g",
        "benefits": [
            "Tomatoes provide vitamin C and antioxidant lycopene.",
            "Light and hydrating accompaniment for meals.",
            "Coriander and curry leaves add additional micronutrients."
        ],
        "tips": [
            "Choose ripe, firm tomatoes without bruises.",
            "Use ripe tomatoes for better flavour and natural tanginess.",
            "Add coriander at the end for fresh flavour."
        ],
        "instructions": [
            "Chop 2 medium-sized tomatoes into small pieces. Cook 1/4 cup toor dal with 1/2 cup of water until soft. Mash the cooked dal well and keep it aside.",
            "Heat 1 teaspoon of oil or ghee in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/2 teaspoon cumin seeds, 1 dry red chili, and a small pinch of asafoetida (perungayam). Cook until the mustard seeds start popping. Add 6-8 curry leaves and cook for a few seconds.",
            "Add the chopped tomatoes, 1/4 teaspoon turmeric powder, 1 teaspoon rasam powder, and salt as needed. Cook for 5-6 minutes until the tomatoes become soft.",
            "Add 1 1/2 cups of water and bring the mixture to a gentle boil. Cook for another 5 minutes until the tomatoes are fully cooked and the spices are well mixed.",
            "Add the cooked and mashed dal along with 1/2 cup of water. Mix well and cook on low heat for 3-4 minutes. Avoid boiling for a long time after adding the dal.",
            "Turn off the heat and add 1 tablespoon of chopped coriander leaves. Mix well and serve hot with rice or enjoy as a light soup."
        ]
    },
    "Tomato Onion Curry": {
        "servings": 2,
        "calories": 135,
        "protein": "2 g",
        "carbohydrates": "15 g",
        "fiber": "3 g",
        "fat": "8 g",
        "benefits": [
            "Tomatoes provide vitamin C and antioxidants.",
            "Onions contain beneficial plant compounds.",
            "A simple vegetable side dish for everyday meals."
        ],
        "tips": [
            "Choose firm, ripe tomatoes and fresh onions.",
            "Avoid watery or overripe tomatoes.",
            "Cook until the tomatoes soften without becoming completely mushy."
        ],
        "instructions": [
            "Chop 2 medium-sized tomatoes and 1 large onion into small pieces. Cut 1-2 green chilies lengthwise and keep them aside.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon cumin seeds. Cook until the mustard seeds start popping. Add a small pinch of asafoetida (perungayam) and 6-8 curry leaves.",
            "Add the chopped onion and green chilies. Cook for 4-5 minutes until the onion becomes soft and light golden in color.",
            "Add the chopped tomatoes, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix everything well.",
            "Cover the pan and cook for 6-8 minutes. Stir occasionally and cook until the tomatoes become soft and the mixture is well combined.",
            "Add 2-3 tablespoons of water if you prefer a little more gravy. Cook for another 2-3 minutes. Add 1 tablespoon of chopped coriander leaves and mix well. Serve hot with rice, roti, chapati, or dosa."
        ]
    },
    "Tomato Vegetable Kurma": {
        "servings": 2,
        "calories": 215,
        "protein": "5 g",
        "carbohydrates": "25 g",
        "fiber": "5 g",
        "fat": "11 g",
        "benefits": [
            "Provides vitamins and fibre from mixed vegetables.",
            "Green peas add plant-based protein.",
            "A wholesome vegetable-based accompaniment."
        ],
        "tips": [
            "Choose firm potatoes and carrots.",
            "Use fresh green peas for better texture.",
            "Cut vegetables into similar sizes for even cooking."
        ],
        "instructions": [
            "Chop 1 medium-sized tomato, 1/2 medium-sized onion, 1/2 small carrot, 1/4 cup beans, and 1/2 medium-sized potato into small pieces. Measure 1/4 cup green peas and keep all the vegetables aside.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add 1 small cinnamon stick, 1 clove, 1 cardamom, and 1/2 bay leaf. Cook for a few seconds.",
            "Add the chopped onion and cook for 3-4 minutes until it becomes soft. Add 1/2 teaspoon ginger-garlic paste and cook for another 1-2 minutes.",
            "Add the chopped tomato, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Cook for 4-5 minutes until the tomato becomes soft.",
            "Add the carrot, beans, potato, and green peas. Add 1 cup of water and mix well. Cover the pan and cook for 10-12 minutes until the vegetables are tender.",
            "To prepare the paste, blend 2 tablespoons grated coconut, 1 teaspoon roasted gram (pottukadalai), 1/4 teaspoon cumin seeds, and 1 green chili with a little water until smooth. Add this paste to the cooked vegetables and mix well.",
            "Add up to 1/4 cup of water to get the desired consistency. Cook on low heat for 5-6 minutes until the kurma becomes thick and creamy. Add 1 tablespoon of chopped coriander leaves and mix well. Serve hot with chapati, dosa, idli, or rice."
        ]
    },

    # 2. Onion
    "Onion Sambar": {
        "servings": 2,
        "calories": 260,
        "protein": "11 g",
        "carbohydrates": "36 g",
        "fiber": "9 g",
        "fat": "8 g",
        "benefits": [
            "Onions provide antioxidants and fibre.",
            "Rich in dietary fibre, essential minerals, and plant compounds.",
            "A balanced accompaniment when prepared with toor dal."
        ],
        "tips": [
            "Choose firm onions without soft spots.",
            "Use fresh tamarind extract for a rich, authentic tang.",
            "Simmer dal and tamarind gently to blend the aromas."
        ],
        "instructions": [
            "Peel and slice 1 medium-sized onion into thin pieces. Chop 1 small tomato into small pieces. Rinse 1/2 cup toor dal and keep it aside. Soak 1 small lemon-sized ball of tamarind in 1/2 cup warm water for 10-15 minutes, then extract the juice and discard the pulp.",
            "Add the rinsed 1/2 cup toor dal, 1 1/2 cups of water, and a pinch of turmeric powder to a pressure cooker. Cook for 4-5 whistles until the dal becomes soft and mushy. Mash the cooked dal well and keep it aside.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/4 teaspoon cumin seeds, 1 dried red chili, and 6-8 curry leaves. Let the mustard seeds splutter.",
            "Add the sliced onion and cook for 3-4 minutes until it becomes soft and slightly golden. Add the chopped tomato and cook for another 3-4 minutes until the tomato becomes soft.",
            "Add 1/4 teaspoon turmeric powder, 1 teaspoon sambar powder, 1/4 teaspoon red chili powder, and salt as needed. Mix well and cook for 1-2 minutes so the spices become aromatic.",
            "Add the prepared tamarind extract and 1 cup of water. Mix well and simmer for 6-8 minutes until the raw tamarind smell disappears and the onion becomes tender.",
            "Add the mashed dal and mix well. Add up to 1/2 cup of water to get the desired sambar consistency. Simmer on low heat for 5-6 minutes. Add 1 tablespoon chopped coriander leaves, mix well, and serve hot with rice, idli, dosa, or pongal."
        ]
    },
    "Onion Tomato Curry": {
        "servings": 2,
        "calories": 155,
        "protein": "3 g",
        "carbohydrates": "16 g",
        "fiber": "4 g",
        "fat": "9 g",
        "benefits": [
            "Tomatoes provide vitamin C and lycopene.",
            "Onions provide fibre and antioxidants.",
            "Green chilli adds flavour without needing heavy ingredients."
        ],
        "tips": [
            "Use firm onions and ripe tomatoes.",
            "Chop both vegetables evenly.",
            "Cook tomatoes until soft for a naturally rich gravy."
        ],
        "instructions": [
            "Chop 2 medium-sized tomatoes into small pieces. Slice 1 medium-sized onion thinly. Slit 1 green chili lengthwise and keep all the ingredients aside.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds, 1/4 teaspoon cumin seeds, and 6-8 curry leaves. Let the mustard seeds splutter.",
            "Add the sliced onion and cook for 4-5 minutes until it becomes soft and lightly golden. Add the slit green chili and 1/2 teaspoon ginger-garlic paste. Cook for another 1-2 minutes until the raw smell disappears.",
            "Add the chopped tomatoes, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix everything well.",
            "Cover the pan and cook on medium-low heat for 6-8 minutes, stirring occasionally, until the tomatoes become soft and the mixture turns into a thick, glossy curry.",
            "Add 1/4 cup of water and mix well. Cook uncovered for another 3-4 minutes until the oil starts to separate slightly and the curry reaches the desired consistency.",
            "Add 1 tablespoon chopped coriander leaves and mix well. Turn off the heat and serve hot with rice, chapati, dosa, idli, or roti."
        ]
    },
    "Onion Pakkoda": {
        "servings": 2,
        "calories": 310,
        "protein": "7 g",
        "carbohydrates": "35 g",
        "fiber": "5 g",
        "fat": "16 g",
        "benefits": [
            "Onion provides fibre and plant compounds.",
            "Fresh coriander adds flavour and micronutrients.",
            "Best enjoyed as an occasional snack."
        ],
        "tips": [
            "Use fresh, firm onions.",
            "Do not add excess water; onions release enough moisture when mixed with spices.",
            "Fry on medium heat for even crispiness throughout."
        ],
        "instructions": [
            "Thinly slice 1 large onion. Add the sliced onion to a mixing bowl along with 1/2 teaspoon red chili powder, 1/4 teaspoon turmeric powder, 1/2 teaspoon cumin seeds, 1/2 teaspoon ajwain (omam), 1 tablespoon chopped coriander leaves, 1 chopped green chili, and salt as needed.",
            "Mix the onions and spices well with your fingers and gently squeeze the onions for 1-2 minutes. This helps the onions release a little moisture.",
            "Add 1/2 cup gram flour (besan) and 2 tablespoons rice flour. Mix well. Sprinkle 1-2 tablespoons of water only if needed to bring everything together. The mixture should be thick and sticky, not watery.",
            "Heat enough oil for deep frying in a kadai over medium heat. To check the oil, drop a small piece of batter into it. If it rises steadily with bubbles, the oil is ready.",
            "Take small portions of the onion mixture and gently drop them into the hot oil. Do not overcrowd the kadai.",
            "Fry the pakkodas over medium heat for 3-5 minutes, turning them occasionally, until they become golden brown and crispy on all sides.",
            "Remove the pakkodas using a slotted spoon and place them on a plate lined with paper towel to remove excess oil. Serve hot with coconut chutney, tomato chutney, or tea."
        ]
    },

    # Garlic
    "Cheese Garlic Bread": {
        "servings": 2,
        "calories": 300,
        "protein": "10 g",
        "carbohydrates": "30 g",
        "fiber": "2 g",
        "fat": "16 g",
        "benefits": [
            "Garlic contains allicin and antioxidants supporting cardiovascular health.",
            "Mozzarella cheese provides wholesome protein and calcium."
        ],
        "tips": [
            "Use fresh garlic cloves for maximum aroma and authentic flavor.",
            "Bake until cheese is bubbly and golden around edges."
        ],
        "instructions": [
            "Cut 4 slices of bread in half if desired. In a small bowl, mix 2 tablespoons softened butter, 2 cloves finely chopped garlic, 1 tablespoon chopped coriander leaves, and a small pinch of salt.",
            "Spread the garlic butter evenly over both sides of the bread slices.",
            "Place the bread slices on a baking tray. Sprinkle 1/2 cup grated mozzarella cheese evenly over the top.",
            "Bake in a preheated oven at 180°C for 8-10 minutes, until the cheese melts and the bread becomes lightly golden.",
            "Remove from the oven and let it cool for 1-2 minutes. Garnish with a little chopped coriander and serve warm."
        ]
    },
    "Egg Garlic Rice": {
        "servings": 2,
        "calories": 390,
        "protein": "12 g",
        "carbohydrates": "55 g",
        "fiber": "2 g",
        "fat": "14 g",
        "benefits": [
            "Eggs provide high quality complete protein and essential amino acids.",
            "Garlic supports digestive metabolism and immunity."
        ],
        "tips": [
            "Using cooled or day-old cooked rice gives the best texture without sticking.",
            "Sauté garlic on medium flame to avoid burning."
        ],
        "instructions": [
            "Cook 1 1/2 cups of rice and let it cool completely. Lightly beat 2 eggs in a bowl and keep them aside. Finely chop 4 garlic cloves and 1 small onion.",
            "Heat 1 tablespoon of oil in a large pan or wok over medium-high heat. Add the chopped garlic and onion. Cook for 2-3 minutes until the onion becomes soft.",
            "Move the onion and garlic to one side of the pan. Pour in the beaten eggs and cook while stirring until the eggs are fully cooked.",
            "Add the cooked rice, 1 tablespoon soy sauce, 1/2 teaspoon black pepper, and salt as needed. Mix everything well.",
            "Cook for 3-4 minutes, stirring occasionally, until the rice is heated through and the ingredients are evenly mixed.",
            "Add 1 tablespoon of chopped spring onions or coriander leaves. Mix well and serve hot."
        ]
    },
    "Cheese Garlic Naan": {
        "servings": 2,
        "calories": 330,
        "protein": "12 g",
        "carbohydrates": "43 g",
        "fiber": "2 g",
        "fat": "13 g",
        "benefits": [
            "Garlic promotes good gut health and blood pressure regulation.",
            "Warm cheese naan provides energy and protein."
        ],
        "tips": [
            "Cook on medium heat with lid covered briefly to ensure cheese melts completely inside.",
            "Brush butter right after cooking for a glossy restaurant-style finish."
        ],
        "instructions": [
            "Take 2 medium-sized naan breads. In a small bowl, mix 1 tablespoon of butter, 2 finely chopped garlic cloves, and 1 tablespoon of chopped coriander.",
            "Spread the garlic butter on one side of each naan.",
            "Add 1/2 cup of grated mozzarella cheese on top of each naan. Fold the naan in half and press the edges together lightly.",
            "Heat a tawa or flat pan over medium heat. Place the naan on the pan and cook for 2-3 minutes on each side, until the cheese melts and the naan turns light golden.",
            "Brush a little garlic butter on the cooked naan. Add some chopped coriander on top and serve hot."
        ]
    },

    # Potato
    "Potato Roast": {
        "servings": 2,
        "calories": 220,
        "protein": "4 g",
        "carbohydrates": "32 g",
        "fiber": "4 g",
        "fat": "9 g",
        "benefits": [
            "Potatoes provide potassium and vitamin C.",
            "Good source of dietary carbohydrates for energy."
        ],
        "tips": [
            "Cut potatoes into even small pieces for uniform roasting.",
            "Cook on low-to-medium heat with occasional stirring to get a golden crust."
        ],
        "instructions": [
            "Peel 3 medium-sized potatoes and cut them into small pieces. Keep them aside.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon cumin seeds. Cook until the mustard seeds start popping.",
            "Add 1/4 teaspoon turmeric powder, 1 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Add the chopped potatoes and mix well so the spices cover the potatoes.",
            "Cover the pan and cook for 10-12 minutes. Stir every few minutes to prevent the potatoes from sticking to the pan.",
            "Remove the lid and cook for another 5-7 minutes until the potatoes are cooked and lightly crispy. Add 1 tablespoon of chopped coriander leaves and serve hot."
        ]
    },
    "Potato Peas Curry": {
        "servings": 2,
        "calories": 235,
        "protein": "6 g",
        "carbohydrates": "38 g",
        "fiber": "7 g",
        "fat": "7 g",
        "benefits": [
            "Green peas supply plant-based protein and dietary fiber.",
            "Potatoes provide sustained energy and micronutrients."
        ],
        "tips": [
            "Use fresh green peas for better sweetness and tenderness.",
            "Simmer until potatoes are fork-tender."
        ],
        "instructions": [
            "Peel 2 medium-sized potatoes and cut them into small pieces. Measure 1/2 cup green peas and keep them aside.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon cumin seeds. Cook until the mustard seeds start popping.",
            "Add 1 small chopped onion and 1 chopped green chili. Cook for 3-4 minutes until the onion becomes soft.",
            "Add 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, 1 teaspoon coriander powder, and salt as needed. Mix well.",
            "Add the chopped potatoes and green peas. Add 1 cup of water and mix well. Cover the pan and cook for 12-15 minutes until the potatoes become soft.",
            "Add another 1/4 cup of water if you want more gravy. Cook for 3-4 minutes. Add 1 tablespoon of chopped coriander leaves and serve hot with rice, chapati, or roti."
        ]
    },
    "Aloo Gobi": {
        "servings": 2,
        "calories": 250,
        "protein": "6 g",
        "carbohydrates": "36 g",
        "fiber": "7 g",
        "fat": "10 g",
        "benefits": [
            "Cauliflower provides antioxidant glucosinolates and vitamin C.",
            "Wholesome vegetable combination rich in fiber."
        ],
        "tips": [
            "Cut cauliflower and potatoes into similar sizes.",
            "Do not overcook to keep cauliflower florets intact."
        ],
        "instructions": [
            "Peel 2 medium-sized potatoes and cut them into small pieces. Cut 2 cups of cauliflower into small pieces and wash them well.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add 1/2 teaspoon cumin seeds and cook for a few seconds.",
            "Add 1 small chopped onion and cook for 3-4 minutes until it becomes soft. Add 1 teaspoon ginger-garlic paste and cook for another 1 minute.",
            "Add 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, 1 teaspoon coriander powder, and salt as needed. Mix well.",
            "Add the potatoes and cauliflower. Mix well so the spices cover the vegetables. Add 1/2 cup of water and cover the pan.",
            "Cook for 12-15 minutes, stirring every few minutes, until the potatoes and cauliflower become soft.",
            "Remove the lid and cook for another 3-4 minutes to remove extra water. Add 1 tablespoon of chopped coriander leaves and serve hot with rice, chapati, or roti."
        ]
    },

    # Green Chilli
    "Green Chilli Fry": {
        "servings": 2,
        "calories": 105,
        "protein": "2 g",
        "carbohydrates": "8 g",
        "fiber": "3 g",
        "fat": "8 g",
        "benefits": [
            "Green chilies are rich in vitamin C and capsaicin which boosts metabolism.",
            "Light side accompaniment that enhances meal flavours."
        ],
        "tips": [
            "Use fresh, firm green chilies.",
            "Remove seeds if you prefer mild heat."
        ],
        "instructions": [
            "Wash 150 g green chilies and cut them into small pieces. Remove the seeds if you prefer less spicy food.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add 1/2 teaspoon mustard seeds and 1/2 teaspoon cumin seeds. Cook until the mustard seeds start popping.",
            "Add the chopped green chilies and a small pinch of turmeric powder. Mix well.",
            "Add 1/2 teaspoon coriander powder, 1/4 teaspoon red chili powder, and salt as needed. Mix well.",
            "Cover the pan and cook for 5-7 minutes. Stir occasionally until the green chilies become slightly soft.",
            "Remove the lid and cook for another 2-3 minutes. Add 1 tablespoon of chopped coriander leaves and serve hot as a side dish with rice or chapati."
        ]
    },
    "Green Chilli Bajji": {
        "servings": 2,
        "calories": 310,
        "protein": "8 g",
        "carbohydrates": "32 g",
        "fiber": "5 g",
        "fat": "17 g",
        "benefits": [
            "Gram flour provides plant protein and complex carbohydrates.",
            "Crispy evening tea-time snack."
        ],
        "tips": [
            "Slit chilies and remove seeds to control spice level.",
            "Fry on medium flame for a golden, crunchy exterior."
        ],
        "instructions": [
            "Wash 6 large green chilies and make a small cut along each chili. Remove some seeds if you prefer less spicy bajji.",
            "In a bowl, mix 1 cup gram flour (besan), 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, a small pinch of asafoetida, and salt as needed.",
            "Add water little by little and mix until you get a thick batter that coats the chilies well.",
            "Heat enough oil in a deep pan for frying. Dip each green chili into the batter and make sure it is fully covered.",
            "Carefully place the coated chilies into the hot oil. Fry for 3-4 minutes, turning them occasionally, until they become golden and crispy.",
            "Remove the bajjis from the oil and place them on a paper towel to remove extra oil. Serve hot with coconut chutney or tomato sauce."
        ]
    },
    "Stuffed Green Chilli": {
        "servings": 2,
        "calories": 190,
        "protein": "6 g",
        "carbohydrates": "20 g",
        "fiber": "5 g",
        "fat": "10 g",
        "benefits": [
            "Gram flour filling adds wholesome dietary fiber and minerals.",
            "Spiced appetizer with natural tang from fresh lemon juice."
        ],
        "tips": [
            "Cook covered on low heat so the filling roasts properly without burning the skin.",
            "Gently press the stuffing so it stays sealed during cooking."
        ],
        "instructions": [
            "Wash 8 large green chilies. Make a long cut in each chili without cutting it completely. Remove the seeds if you prefer less spicy food.",
            "In a bowl, mix 1/4 cup gram flour (besan), 1 teaspoon coriander powder, 1/2 teaspoon cumin powder, 1/2 teaspoon turmeric powder, 1/2 teaspoon red chili powder, and salt as needed.",
            "Add 1 tablespoon lemon juice and 1 teaspoon oil to the mixture. Mix well to make a thick filling.",
            "Fill each green chili with the prepared mixture. Press the filling gently so it stays inside the chilies.",
            "Heat 1 1/2 tablespoons of oil in a wide pan over low to medium heat. Place the stuffed chilies in the pan.",
            "Cover the pan and cook for 8-10 minutes. Turn the chilies carefully every few minutes so they cook on all sides.",
            "Remove the lid and cook for another 2-3 minutes until the chilies are soft and the filling is lightly golden. Serve hot with rice, chapati, or roti."
        ]
    },

    # Lady Finger
    "Crispy Lady Finger Fry": {
        "servings": 2,
        "calories": 230,
        "protein": "6 g",
        "carbohydrates": "29 g",
        "fiber": "7 g",
        "fat": "11 g",
        "benefits": [
            "Lady finger is packed with soluble dietary fiber that aids digestion and blood sugar control.",
            "High in folate and vitamin C for immunity."
        ],
        "tips": [
            "Dry the lady finger thoroughly with a towel before slicing to avoid stickiness.",
            "Do not add too much water to the flour coating."
        ],
        "instructions": [
            "Wash 250 g lady finger and dry them well. Cut them into thin pieces.",
            "In a bowl, add the cut lady finger, 2 tablespoons gram flour (besan), 1 tablespoon rice flour, 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Add 1 tablespoon of water and mix until the spices and flour lightly cover the lady finger. Do not add too much water.",
            "Heat 2 tablespoons of oil in a wide pan over medium heat. Add the lady finger and spread it across the pan.",
            "Cook for 10-12 minutes, stirring every few minutes, until the lady finger becomes dry and crispy.",
            "Cook for another 2-3 minutes on low heat for extra crispiness. Turn off the heat and serve hot as a side dish or snack."
        ]
    },
    "Lady Finger Peanut Masala": {
        "servings": 2,
        "calories": 275,
        "protein": "9 g",
        "carbohydrates": "24 g",
        "fiber": "8 g",
        "fat": "17 g",
        "benefits": [
            "Roasted peanuts provide healthy fats and vegetable protein.",
            "Lady finger provides dietary fiber and essential minerals."
        ],
        "tips": [
            "Sauté lady finger first until dry to eliminate stickiness completely.",
            "Use coarse peanut powder for a nice crunchy mouthfeel."
        ],
        "instructions": [
            "Wash 250 g lady finger and dry them well. Cut them into small pieces. Finely chop 1 small onion.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add the chopped lady finger and cook for 6-8 minutes until most of the moisture is gone. Remove it from the pan and keep it aside.",
            "In the same pan, add 1 teaspoon of oil. Add the chopped onion and 1 green chili. Cook for 3-4 minutes until the onion becomes soft.",
            "Add 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Add the cooked lady finger and mix well. Cook for another 2-3 minutes.",
            "Grind 1/3 cup roasted peanuts into a coarse powder. Add the peanut powder to the pan and mix well.",
            "Cook for another 2-3 minutes on low heat. Add 1 tablespoon of chopped coriander leaves and serve hot with rice or chapati."
        ]
    },
    "Lady Finger Coconut Curry": {
        "servings": 2,
        "calories": 225,
        "protein": "5 g",
        "carbohydrates": "19 g",
        "fiber": "6 g",
        "fat": "15 g",
        "benefits": [
            "Coconut milk provides natural healthy fatty acids and creamy flavor without heavy cream.",
            "Rich in antioxidants and fiber from fresh vegetables."
        ],
        "tips": [
            "Cook on low heat after adding coconut paste to prevent curdling.",
            "Sauté lady finger prior to simmering in curry to preserve bite and color."
        ],
        "instructions": [
            "Wash 200 g lady finger and dry them well. Cut them into small pieces. Chop 1 small onion and 1 medium-sized tomato.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add the chopped lady finger and cook for 5-6 minutes until it becomes slightly soft. Remove it from the pan and keep it aside.",
            "In the same pan, add the chopped onion and cook for 3-4 minutes until it becomes soft. Add the chopped tomato and cook for another 3-4 minutes.",
            "Add 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Blend 1/2 cup grated coconut with 1/2 cup water until smooth. Add this coconut mixture to the pan and mix well.",
            "Add the cooked lady finger and 1/2 cup of water. Mix well and cook on low heat for 5-7 minutes until the curry reaches the desired thickness.",
            "Add 1 tablespoon of chopped coriander leaves, mix well, and serve hot with rice, chapati, or dosa."
        ]
    },

    # Spinach (Palak Keerai)
    "Spinach Paneer Curry": {
        "servings": 2,
        "calories": 300,
        "protein": "16 g",
        "carbohydrates": "12 g",
        "fiber": "4 g",
        "fat": "21 g",
        "benefits": [
            "Spinach is exceptionally rich in iron, folate, and vitamins A & K.",
            "Paneer provides calcium and high-quality protein for bone health."
        ],
        "tips": [
            "Blanch or cook spinach briefly to retain its vibrant green color and nutrients.",
            "Pan-fry paneer lightly so it remains tender and juicy in the gravy."
        ],
        "instructions": [
            "Wash 200 g spinach well and remove any hard stems. Chop the spinach into small pieces. Cut 150 g paneer into small cubes.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add the paneer cubes and cook for 2-3 minutes until they turn light golden. Remove the paneer and keep it aside.",
            "In the same pan, add 1 small chopped onion and cook for 3-4 minutes until it becomes soft. Add 1 teaspoon ginger-garlic paste and cook for 1 minute.",
            "Add the chopped spinach and 1/4 teaspoon turmeric powder. Cook for 4-5 minutes until the spinach becomes soft.",
            "Let the spinach cool slightly. Blend it with 1/4 cup of water until smooth.",
            "Pour the spinach mixture back into the pan. Add 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well and cook for 3-4 minutes.",
            "Add the cooked paneer and 1/4 cup of water. Mix well and cook on low heat for another 3-4 minutes. Serve hot with chapati, naan, or rice."
        ]
    },
    "Spinach Garlic Stir-Fry": {
        "servings": 2,
        "calories": 105,
        "protein": "4 g",
        "carbohydrates": "9 g",
        "fiber": "4 g",
        "fat": "7 g",
        "benefits": [
            "Garlic and spinach together boost immunity and cardiovascular wellness.",
            "Low-calorie, antioxidant-packed side dish."
        ],
        "tips": [
            "Cook uncovered on medium-high heat so excess moisture evaporates quickly.",
            "Add a dash of lemon juice at the end to enhance iron absorption."
        ],
        "instructions": [
            "Wash 250 g spinach well and remove any hard stems. Chop the spinach into medium-sized pieces. Finely chop 5 garlic cloves and 1 small onion.",
            "Heat 1 tablespoon of oil in a wide pan over medium heat. Add the chopped garlic and cook for 30-40 seconds.",
            "Add the chopped onion and cook for 3-4 minutes until it becomes soft.",
            "Add the chopped spinach, 1/4 teaspoon turmeric powder, 1/2 teaspoon black pepper, and salt as needed. Mix well.",
            "Cook for 4-5 minutes without covering the pan. Stir occasionally until the spinach becomes soft and most of the water has dried.",
            "Add 1 teaspoon lemon juice and mix well. Turn off the heat and serve hot with rice, chapati, or as a side dish."
        ]
    },
    "Spinach Corn Curry": {
        "servings": 2,
        "calories": 185,
        "protein": "6 g",
        "carbohydrates": "27 g",
        "fiber": "6 g",
        "fat": "7 g",
        "benefits": [
            "Sweet corn adds dietary fiber, lutein, and natural sweetness.",
            "Spinach provides essential minerals and vitamins for daily health."
        ],
        "tips": [
            "Use juicy tender sweet corn for a rich sweet-savory flavor profile.",
            "Cook spinach on medium flame to retain nutrients."
        ],
        "instructions": [
            "Wash 200 g spinach well and chop it into small pieces. Measure 1 cup sweet corn. Finely chop 1 small onion and 1 medium-sized tomato.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add the chopped onion and cook for 3-4 minutes until it becomes soft.",
            "Add 1 teaspoon ginger-garlic paste and cook for 1 minute. Add the chopped tomato and cook for another 3-4 minutes until it becomes soft.",
            "Add the chopped spinach, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Cover the pan and cook for 4-5 minutes until the spinach becomes soft.",
            "Add 1 cup sweet corn and 1/2 cup water. Mix well and cook for another 5-6 minutes.",
            "Cook without the lid for 2-3 minutes until the curry reaches the desired thickness. Add 1 tablespoon of chopped coriander leaves and serve hot with rice, chapati, or roti."
        ]
    },

    # Brinjal (Kathirikkai)
    "Stuffed Brinjal Peanut Masala": {
        "servings": 2,
        "calories": 285,
        "protein": "8 g",
        "carbohydrates": "20 g",
        "fiber": "7 g",
        "fat": "20 g",
        "benefits": [
            "Brinjals contain nasunin, an antioxidant that protects cellular membranes.",
            "Peanuts supply healthy unsaturated fats and protein."
        ],
        "tips": [
            "Slit brinjals into four quarters keeping the stem intact so the stuffing stays inside.",
            "Turn gently while cooking so the outer skin roasts evenly."
        ],
        "instructions": [
            "Wash 6 small brinjals and make two cuts across each brinjal without cutting it completely. Keep the stem attached.",
            "Dry roast 1/4 cup peanuts in a pan for 3-4 minutes. Let them cool, then crush them into a coarse powder.",
            "In a bowl, mix the peanut powder, 2 tablespoons grated coconut, 1/2 teaspoon coriander powder, 1/2 teaspoon red chili powder, 1/4 teaspoon turmeric powder, 1/2 teaspoon cumin powder, and salt as needed.",
            "Add 1 tablespoon water to the mixture and make a thick filling. Carefully fill each brinjal with the mixture.",
            "Heat 2 tablespoons of oil in a wide pan over medium heat. Place the stuffed brinjals in the pan and cook for 2-3 minutes.",
            "Add 1/2 cup of water, cover the pan, and cook for 12-15 minutes. Turn the brinjals carefully every few minutes so they cook evenly.",
            "Remove the lid and cook for another 3-4 minutes until the extra water reduces and the brinjals become soft. Serve hot with rice or chapati."
        ]
    },
    "Brinjal Sesame Masala": {
        "servings": 2,
        "calories": 225,
        "protein": "6 g",
        "carbohydrates": "18 g",
        "fiber": "6 g",
        "fat": "15 g",
        "benefits": [
            "Sesame seeds are packed with calcium, zinc, and healthy lignans.",
            "Brinjal provides good dietary fiber and antioxidants."
        ],
        "tips": [
            "Roast sesame seeds on low flame to avoid bitterness.",
            "Sauté brinjal in oil before adding sesame powder to maintain good texture."
        ],
        "instructions": [
            "Wash 250 g brinjal and cut it into small pieces. Finely chop 1 small onion and 3 garlic cloves.",
            "Dry roast 2 tablespoons sesame seeds in a pan for 2-3 minutes until they become lightly golden. Let them cool and crush them into a coarse powder.",
            "Heat 1 1/2 tablespoons of oil in a pan over medium heat. Add the chopped onion and garlic. Cook for 3-4 minutes until the onion becomes soft.",
            "Add the chopped brinjal, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Mix well.",
            "Cover the pan and cook for 8-10 minutes. Stir every few minutes until the brinjal becomes soft.",
            "Add the sesame powder and 2 tablespoons of water. Mix well and cook for another 3-4 minutes.",
            "Turn off the heat and add 1 tablespoon of chopped coriander leaves. Serve hot with rice, chapati, or dosa."
        ]
    },
    "Brinjal Coconut Pepper Curry": {
        "servings": 2,
        "calories": 220,
        "protein": "4 g",
        "carbohydrates": "17 g",
        "fiber": "6 g",
        "fat": "16 g",
        "benefits": [
            "Black pepper stimulates digestion and enhances nutrient absorption.",
            "Coconut milk provides natural creamy texture and wholesome fats."
        ],
        "tips": [
            "Use freshly ground black pepper for the best aromatic kick.",
            "Simmer on gentle heat after adding coconut extract."
        ],
        "instructions": [
            "Wash 250 g brinjal and cut it into small pieces. Finely chop 1 small onion and 3 garlic cloves.",
            "Heat 1 tablespoon of oil in a pan over medium heat. Add the chopped onion and garlic. Cook for 3-4 minutes until the onion becomes soft.",
            "Add the chopped brinjal, 1/4 teaspoon turmeric powder, 1/2 teaspoon crushed black pepper, and salt as needed. Mix well.",
            "Cover the pan and cook for 7-8 minutes until the brinjal becomes soft. Stir occasionally to prevent it from sticking to the pan.",
            "Blend 1/2 cup grated coconut with 1/2 cup water until smooth. Add the coconut mixture to the pan and mix well.",
            "Add 1/2 cup water and cook on low heat for 5-6 minutes until the curry becomes slightly thick.",
            "Add 1 tablespoon of chopped coriander leaves, mix well, and serve hot with rice, chapati, or dosa."
        ]
    },

    # Button Mushroom (Kaalan)
    "Creamy Mushroom Pasta": {
        "servings": 2,
        "calories": 430,
        "protein": "14 g",
        "carbohydrates": "55 g",
        "fiber": "4 g",
        "fat": "18 g",
        "benefits": [
            "Button mushrooms are an excellent source of vitamin D, selenium, and B-vitamins.",
            "Comforting dinner providing carbohydrates and protein."
        ],
        "tips": [
            "Wipe mushrooms with a damp cloth instead of soaking to keep them from getting soggy.",
            "Sauté mushrooms in butter until golden before adding dairy."
        ],
        "instructions": [
            "Cook 160 g pasta in enough water with a little salt until soft. Drain the water and keep the pasta aside.",
            "Clean 200 g mushrooms and cut them into thin pieces. Finely chop 1 small onion and 3 garlic cloves.",
            "Heat 1 tablespoon of butter and 1 teaspoon of oil in a pan over medium heat. Add the chopped garlic and onion. Cook for 2-3 minutes until the onion becomes soft.",
            "Add the sliced mushrooms and cook for 5-6 minutes until they become soft and lightly golden.",
            "Add 1/2 cup milk, 1/4 cup fresh cream, 1/2 teaspoon black pepper, and salt as needed. Mix well and cook for 3-4 minutes until the sauce becomes slightly thick.",
            "Add the cooked pasta and 2 tablespoons grated cheese. Mix well and cook for another 2 minutes.",
            "Add 1 tablespoon chopped coriander or parsley. Mix well and serve hot."
        ]
    },
    "Mushroom Risotto": {
        "servings": 2,
        "calories": 480,
        "protein": "13 g",
        "carbohydrates": "68 g",
        "fiber": "4 g",
        "fat": "17 g",
        "benefits": [
            "Mushrooms are rich in antioxidants such as ergothioneine and glutathione.",
            "Rich in energy with satisfying creamy texture."
        ],
        "tips": [
            "Add warm stock ladle by ladle for a silky, classic risotto consistency.",
            "Finish with a pat of cold butter for a rich restaurant glaze."
        ],
        "instructions": [
            "Clean 200 g mushrooms and cut them into small pieces. Finely chop 1 small onion and 3 garlic cloves.",
            "Heat 1 tablespoon of butter and 1 teaspoon of oil in a pan. Add the onion and garlic. Cook for 2-3 minutes until the onion becomes soft.",
            "Add 1 cup Arborio rice and cook for 1-2 minutes while stirring. This helps the rice absorb the flavor.",
            "Add 1/2 cup warm vegetable stock and stir. Once the liquid is mostly absorbed, add another 1/2 cup. Continue adding the stock little by little until the rice becomes soft. You will need about 2 1/2 to 3 cups of stock in total. This gradual addition of stock is a standard risotto method.",
            "While the rice is cooking, heat 1 teaspoon of oil in another pan. Add the mushrooms and cook for 5-6 minutes until soft and lightly golden.",
            "Add the cooked mushrooms to the rice. Add 1/4 teaspoon black pepper and salt as needed. Mix well.",
            "Add 2 tablespoons grated Parmesan cheese and 1 tablespoon butter. Mix well until the rice becomes creamy. Add 1 tablespoon chopped parsley and serve hot."
        ]
    },
    "Smoky Mushroom Tikka": {
        "servings": 2,
        "calories": 185,
        "protein": "9 g",
        "carbohydrates": "14 g",
        "fiber": "3 g",
        "fat": "11 g",
        "benefits": [
            "Yogurt marinade supplies probiotics and calcium.",
            "Low-carb, high-antioxidant starter with natural tandoori flavors."
        ],
        "tips": [
            "Marinate for at least 20 minutes so mushrooms absorb all spices fully.",
            "Use dhungar (charcoal smoking) technique for authentic restaurant aroma."
        ],
        "instructions": [
            "Clean 250 g mushrooms and cut the larger ones in half. Keep them in a bowl.",
            "Add 1/2 cup thick yogurt, 1 teaspoon ginger-garlic paste, 1/2 teaspoon turmeric powder, 1 teaspoon red chili powder, 1 teaspoon coriander powder, 1/2 teaspoon cumin powder, 1/2 teaspoon garam masala, 1/2 teaspoon black pepper, 1 tablespoon lemon juice, and salt as needed.",
            "Add the mushrooms to the mixture and mix well until all the mushrooms are covered. Keep them aside for 20-30 minutes.",
            "Heat 1 tablespoon of oil in a wide pan over medium-high heat. Add the mushrooms and cook for 8-10 minutes. Turn them every few minutes so they cook on all sides.",
            "For a smoky taste, place a small piece of charcoal in a small heat-safe bowl and place it inside the pan. Heat the charcoal until it becomes hot, then add 2-3 drops of oil on it. Cover the pan for 1-2 minutes so the smoke flavors the mushrooms. Remove the charcoal carefully.",
            "Remove the lid and cook for another 1-2 minutes until the mushrooms are lightly roasted.",
            "Add 1 tablespoon chopped coriander leaves and a little lemon juice. Serve hot with onion slices and lemon wedges."
        ]
    },

    # Cauliflower
    "Cauliflower Cheese Gratin": {
        "servings": 2,
        "calories": 310,
        "protein": "15 g",
        "carbohydrates": "20 g",
        "fiber": "4 g",
        "fat": "19 g",
        "benefits": [
            "Cauliflower provides antioxidant glucosinolates and vitamins C & K.",
            "Cheddar cheese provides dietary calcium and bone-strengthening protein."
        ],
        "tips": [
            "Parboil cauliflower florets just until tender-crisp so they retain structure when baked.",
            "Whisk milk in gradually to ensure a silky, lump-free cheese sauce."
        ],
        "instructions": [
            "Cut 1 small cauliflower into small pieces. Bring a pot of salted water to a boil and cook the cauliflower for 4-5 minutes until it is slightly soft. Drain the water well.",
            "Heat 1 tablespoon of butter in a pan over medium heat. Add 1 tablespoon of plain flour and mix well for about 1 minute.",
            "Slowly add 3/4 cup milk while stirring continuously. Cook for 3-4 minutes until the sauce becomes slightly thick.",
            "Add 1/2 cup grated cheddar cheese, 1/4 teaspoon black pepper, and salt as needed. Mix until the cheese melts and the sauce becomes smooth.",
            "Add the cooked cauliflower to the cheese sauce and mix gently. Transfer everything to a small baking dish.",
            "Sprinkle another 1/4 cup grated cheese on top. Bake at 200°C for 15-20 minutes until the cheese melts and the top becomes golden.",
            "Let it rest for 2-3 minutes and serve warm as a side dish or light meal."
        ]
    },
    "Cauliflower Steaks": {
        "servings": 2,
        "calories": 145,
        "protein": "5 g",
        "carbohydrates": "13 g",
        "fiber": "5 g",
        "fat": "9 g",
        "benefits": [
            "Low calorie and nutrient-dense alternative to traditional roasts.",
            "Olive oil and seasonings provide heart-healthy unsaturated fats and antioxidants."
        ],
        "tips": [
            "Keep the core intact when slicing so the cauliflower slices hold together.",
            "Sear in pan first for smoky caramelized edges before baking."
        ],
        "instructions": [
            "Remove the leaves from 1 medium-sized cauliflower. Cut the cauliflower into 2 thick slices, about 2-3 cm thick, keeping the stem attached so the slices stay together.",
            "Place the cauliflower slices on a plate. Brush both sides with 1 tablespoon of olive oil. Add 1/2 teaspoon paprika, 1/2 teaspoon garlic powder, 1/4 teaspoon black pepper, and salt as needed.",
            "Heat a wide pan over medium-high heat. Place the cauliflower slices in the pan and cook for 3-4 minutes on each side until lightly brown.",
            "Transfer the cauliflower slices to a baking tray. Bake at 200°C for 15-20 minutes until the center becomes soft.",
            "Remove from the oven and add 1 tablespoon of lemon juice over the cauliflower.",
            "Sprinkle 1 tablespoon of chopped coriander or parsley on top and serve warm."
        ]
    },
    "Gobi Manchurian": {
        "servings": 2,
        "calories": 345,
        "protein": "8 g",
        "carbohydrates": "47 g",
        "fiber": "4 g",
        "fat": "14 g",
        "benefits": [
            "Cauliflower adds fiber and essential micronutrients to an Indo-Chinese favorite.",
            "Garlic and capsicum contribute immunity-enhancing compounds."
        ],
        "tips": [
            "Drain cauliflower thoroughly before battering for extra crispiness.",
            "Toss fried florets in hot sauce right before serving to maintain crunch."
        ],
        "instructions": [
            "Cut 250 g cauliflower into small pieces and wash them well. Boil water with a little salt and cook the cauliflower for 2-3 minutes. Drain the water completely.",
            "In a bowl, mix 1/2 cup plain flour, 2 tablespoons corn flour, 1/2 teaspoon red chili powder, and salt. Add water little by little and mix until you get a thick batter.",
            "Add the cauliflower pieces to the batter and mix until they are well covered.",
            "Heat enough oil in a deep pan for frying. Add the cauliflower pieces in small batches and fry for 4-5 minutes until they become golden and crispy. Remove them and place them on a paper towel.",
            "Heat 1 tablespoon of oil in another pan. Add 1 tablespoon finely chopped garlic, 1 small chopped onion, and 1/2 chopped green bell pepper. Cook for 2-3 minutes.",
            "Add 1 tablespoon soy sauce, 1 tablespoon tomato sauce, 1 teaspoon chili sauce, and 1/2 teaspoon vinegar. Mix well and cook for 1-2 minutes.",
            "Add the fried cauliflower and mix well so the sauce covers all the pieces. Cook for another 1-2 minutes.",
            "Add 1 tablespoon of chopped spring onion and serve hot."
        ]
    },

    # Cabbage
    "Roasted Cabbage Steaks": {
        "servings": 2,
        "calories": 125,
        "protein": "3 g",
        "carbohydrates": "12 g",
        "fiber": "5 g",
        "fat": "8 g",
        "benefits": [
            "Cabbage is abundant in vitamin C, anthocyanins, and digestive fiber.",
            "Low calorie side dish with natural caramelized sweetness."
        ],
        "tips": [
            "Leave stem attached to keep the cabbage steaks from separating.",
            "Roast until edges are deeply caramelized for peak flavor."
        ],
        "instructions": [
            "Remove the outer leaves from 1 small cabbage. Cut the cabbage into 2 thick slices, about 2-3 cm thick. Keep the stem attached so the slices stay together.",
            "Place the cabbage slices on a baking tray. Brush both sides with 1 tablespoon of oil.",
            "Sprinkle 1/2 teaspoon garlic powder, 1/2 teaspoon paprika, 1/4 teaspoon black pepper, and salt as needed over both sides.",
            "Heat the oven to 200°C. Bake the cabbage for 20-25 minutes, turning it halfway through cooking.",
            "Continue baking for another 5-10 minutes until the edges become golden and the center is soft.",
            "Remove from the oven and add 1 teaspoon lemon juice. Sprinkle 1 tablespoon of chopped coriander leaves on top and serve warm."
        ]
    },
    "Cabbage Peanut Stir-Fry": {
        "servings": 2,
        "calories": 220,
        "protein": "7 g",
        "carbohydrates": "18 g",
        "fiber": "6 g",
        "fat": "15 g",
        "benefits": [
            "Roasted peanuts supply healthy unsaturated fats and vegetable protein.",
            "Cabbage provides digestive fiber and essential glucosinolates."
        ],
        "tips": [
            "Stir fry quickly on high heat so cabbage stays crisp-tender and colorful.",
            "Add crushed peanuts right at the end to keep them crunchy."
        ],
        "instructions": [
            "Thinly slice 300 g cabbage. Finely chop 3 garlic cloves, 1 small green chili, and 2 spring onions.",
            "Roughly crush 1/4 cup roasted peanuts and keep them aside.",
            "Heat 1 tablespoon of oil in a wide pan over medium-high heat. Add the garlic and green chili. Cook for about 1 minute.",
            "Add the sliced cabbage and cook for 4-5 minutes, stirring often. Keep the cabbage slightly crunchy instead of cooking it until very soft.",
            "Add 1 tablespoon soy sauce, 1/2 teaspoon red chili flakes, 1/2 teaspoon sesame oil, and salt only if needed. Mix well and cook for another 1-2 minutes.",
            "Add the crushed peanuts and chopped spring onions. Mix well and cook for 1 minute.",
            "Turn off the heat and serve hot with rice, chapati, or noodles."
        ]
    },
    "Cabbage Cheese Gratin": {
        "servings": 2,
        "calories": 285,
        "protein": "13 g",
        "carbohydrates": "23 g",
        "fiber": "4 g",
        "fat": "17 g",
        "benefits": [
            "Cabbage is packed with gut-healthy fiber and micronutrients.",
            "Cheddar cheese provides calcium and protein."
        ],
        "tips": [
            "Sauté cabbage first to release moisture before baking into cheese sauce.",
            "Top with a pinch of breadcrumbs for an extra crunchy gratin crust."
        ],
        "instructions": [
            "Cut 300 g cabbage into medium-sized pieces. Heat the oven to 180°C.",
            "Heat 1 teaspoon of oil in a pan over medium heat. Add the cabbage and cook for 5-7 minutes until it becomes slightly soft. This also helps remove some of the water from the cabbage.",
            "In another pan, melt 1 tablespoon of butter over low heat. Add 1 tablespoon of plain flour and mix for about 1 minute.",
            "Slowly add 3/4 cup milk while stirring. Cook for 3-4 minutes until the mixture becomes slightly thick.",
            "Add 1/2 cup grated cheddar cheese, 1/4 teaspoon black pepper, and salt as needed. Mix until the cheese melts.",
            "Add the cooked cabbage to the cheese mixture and mix well. Transfer it to a small baking dish.",
            "Sprinkle 1/4 cup grated cheese and 1 tablespoon breadcrumbs on top. Bake at 180°C for 15-20 minutes until the cheese melts and the top becomes golden. The roasting and baking approach is consistent with established cabbage gratin methods.",
            "Let it cool for 2-3 minutes and serve warm."
        ]
    },

    # Carrot
    "Carrot Cutlet": {
        "servings": 2,
        "calories": 210,
        "protein": "4 g",
        "carbohydrates": "32 g",
        "fiber": "5 g",
        "fat": "8 g",
        "benefits": [
            "Carrots are rich in beta-carotene (provitamin A) for eye health and immunity.",
            "Mashed potato and carrot blend provides balanced energy and fiber."
        ],
        "tips": [
            "Sauté grated carrots to remove moisture before mixing with potatoes.",
            "Shallow fry on medium flame for a crisp exterior without absorbing excess oil."
        ],
        "instructions": [
            "Peel and grate 2 medium-sized carrots. Boil 1 medium-sized potato until soft, peel it, and mash well. Finely chop 1/2 small onion, 1 green chili, and 1 tablespoon coriander leaves.",
            "Heat 1 teaspoon oil in a pan over medium heat. Add the chopped onion and green chili. Cook for 2-3 minutes until the onion becomes soft.",
            "Add the grated carrot, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, 1/4 teaspoon garam masala, and salt as needed. Cook for 4-5 minutes until the carrot softens and excess moisture evaporates.",
            "Transfer the carrot mixture to a bowl. Add the mashed potato, 2 tablespoons breadcrumbs, and 1 tablespoon chopped coriander leaves. Mix everything well until it forms a firm mixture.",
            "Divide the mixture into 6 equal portions. Shape each portion into a round or oval cutlet. If the mixture feels soft, add another 1 tablespoon breadcrumbs.",
            "Coat each cutlet lightly with breadcrumbs. Heat 1 tablespoon oil in a flat pan over medium heat. Place the cutlets gently on the pan and cook for 3-4 minutes on each side until golden brown and crisp.",
            "Remove the cutlets and place them on a paper towel for a few minutes. Serve hot with mint chutney, tomato ketchup, or yogurt dip."
        ]
    },
    "Carrot Kheer": {
        "servings": 2,
        "calories": 245,
        "protein": "6 g",
        "carbohydrates": "31 g",
        "fiber": "3 g",
        "fat": "11 g",
        "benefits": [
            "Carrots provide beta-carotene and natural sweetness.",
            "Milk and nuts provide protein, healthy fats, and calcium."
        ],
        "tips": [
            "Grate carrots finely so they cook evenly into a velvety pudding consistency.",
            "Sauté in ghee before adding milk to deepen flavor and aroma."
        ],
        "instructions": [
            "Peel and grate 2 medium-sized carrots finely. Heat 1 teaspoon ghee in a heavy-bottomed pan over low-medium heat.",
            "Add the grated carrots and sauté for 4-5 minutes until they soften and the raw carrot smell disappears.",
            "Add 1 1/2 cups full-fat milk and mix well. Bring the mixture to a gentle boil, then reduce the heat and simmer for 12-15 minutes, stirring occasionally.",
            "Add 2 tablespoons sugar and 1/4 teaspoon cardamom powder. Mix well and cook for another 5-6 minutes until the kheer becomes slightly thick and creamy.",
            "Heat 1 teaspoon ghee in a small pan. Add 1 tablespoon chopped cashews and 1 tablespoon raisins. Fry for 1-2 minutes until the cashews turn lightly golden and the raisins become plump.",
            "Add the fried cashews and raisins to the carrot kheer. Mix gently and cook for another 1-2 minutes.",
            "Turn off the heat and allow the kheer to rest for 5 minutes. Serve warm or chilled. Garnish with a few chopped cashews before serving."
        ]
    },
    "Carrot Tikki": {
        "servings": 2,
        "calories": 185,
        "protein": "4 g",
        "carbohydrates": "29 g",
        "fiber": "5 g",
        "fat": "6 g",
        "benefits": [
            "Sweet potato and carrots provide complex carbohydrates, fiber, and vitamin A.",
            "Roasted gram flour adds wholesome plant protein."
        ],
        "tips": [
            "Cook tikkis on medium flame with minimal oil for a guilt-free crispy crust.",
            "Use roasted gram flour (pottukadalai powder) for a firm binding without extra moisture."
        ],
        "instructions": [
            "Peel and grate 2 medium-sized carrots. Boil 1 medium-sized sweet potato until soft, peel it, and mash it thoroughly. Finely chop 1 small green chili and 1 tablespoon coriander leaves.",
            "Heat 1 teaspoon oil in a pan. Add the grated carrots and cook over medium heat for 4-5 minutes until they soften and most of their moisture evaporates.",
            "Transfer the carrots to a mixing bowl. Add the mashed sweet potato, 2 tablespoons roasted gram flour (pottukadalai powder), 1/2 teaspoon cumin powder, 1/4 teaspoon red chili powder, 1/4 teaspoon garam masala, 1/4 teaspoon chaat masala, and salt as needed.",
            "Add the chopped green chili and coriander leaves. Mix everything thoroughly until you get a soft but firm mixture. If the mixture is sticky, add 1 additional tablespoon roasted gram flour.",
            "Divide the mixture into 6 portions. Shape each portion into a small round tikki and gently flatten it with your fingers.",
            "Heat 1 tablespoon oil in a non-stick or flat pan over medium heat. Place the tikkis without overcrowding the pan. Cook for 3-4 minutes on each side until the outside becomes golden and crisp.",
            "Remove the tikkis and serve hot with mint-coriander chutney, yogurt dip, or a light tomato salsa. For a more colorful presentation, garnish with chopped coriander and a small sprinkle of chaat masala."
        ]
    },

    # Cucumber
    "Stir-Fried Cucumbers": {
        "servings": 2,
        "calories": 105,
        "protein": "2 g",
        "carbohydrates": "9 g",
        "fiber": "2 g",
        "fat": "7 g",
        "benefits": [
            "Cucumbers are over 95% water, providing excellent hydration and minerals.",
            "Very low in calories and gentle on digestion."
        ],
        "tips": [
            "Stir fry quickly over high flame without covering so cucumbers remain crisp.",
            "Serve immediately to enjoy fresh crunch."
        ],
        "instructions": [
            "Wash 2 medium-sized cucumbers and cut them into medium-thick half-moon pieces. Slice 1/2 medium-sized onion thinly. Slit 1 green chili and keep all the ingredients aside.",
            "Heat 1 tablespoon of oil in a wide pan over medium-high heat. Add 1/2 teaspoon mustard seeds, 1/4 teaspoon cumin seeds, and 6-8 curry leaves. Let the mustard seeds splutter.",
            "Add the sliced onion and green chili. Stir-fry for 2-3 minutes until the onion becomes slightly soft while still retaining some crunch.",
            "Add the cucumber pieces, 1/4 teaspoon turmeric powder, 1/2 teaspoon red chili powder, 1/2 teaspoon coriander powder, and salt as needed. Toss everything well.",
            "Cook uncovered over medium-high heat for 4-5 minutes, stirring occasionally. The cucumber should become lightly tender but should not turn completely soft or watery.",
            "Add 1/2 teaspoon crushed black pepper and 1/2 teaspoon lemon juice. Toss well and cook for another 1-2 minutes until the spices coat the cucumber evenly.",
            "Turn off the heat and add 1 tablespoon chopped coriander leaves. Give it one final toss and serve immediately as a side dish with rice, chapati, dosa, or curd rice."
        ]
    },
    "Cucumber Tambuli": {
        "servings": 2,
        "calories": 135,
        "protein": "4 g",
        "carbohydrates": "9 g",
        "fiber": "2 g",
        "fat": "9 g",
        "benefits": [
            "Buttermilk and coconut provide cooling probiotics and electrolytes.",
            "Refreshing traditional accompaniment perfect for warm days."
        ],
        "tips": [
            "Use fresh coconut for a naturally sweet, aromatic base.",
            "Serve slightly chilled alongside hot steamed rice."
        ],
        "instructions": [
            "Wash and peel 1 medium-sized cucumber if the skin is thick. Chop it into small pieces. Measure 1/2 cup grated fresh coconut and keep it aside.",
            "Add the chopped cucumber, grated coconut, 1 small green chili, 1/2 teaspoon cumin seeds, and a small pinch of salt to a blender. Add 2-3 tablespoons of water and blend until smooth.",
            "Transfer the cucumber-coconut mixture to a bowl. Add 3/4 cup thick buttermilk and mix gently until the mixture becomes smooth and pourable. Add a little water if needed to achieve a light, drinkable consistency. This uncooked cucumber-coconut base with buttermilk is characteristic of cucumber tambuli.",
            "Heat 1 teaspoon oil in a small tempering pan over medium heat. Add 1/2 teaspoon mustard seeds and allow them to splutter.",
            "Add 1 dried red chili, 5-6 curry leaves, and a small pinch of asafoetida (hing). Fry for 20-30 seconds until aromatic.",
            "Turn off the heat and allow the tempering to cool for a few seconds. Pour it over the cucumber-buttermilk mixture and stir gently.",
            "Taste and adjust the salt if needed. Chill for 10-15 minutes if desired and serve as a cooling side dish with hot steamed rice. Cucumber tambuli is traditionally served with rice."
        ]
    },
    "Smashed Cucumber Salad (Pai Huang Gua)": {
        "servings": 2,
        "calories": 105,
        "protein": "2 g",
        "carbohydrates": "11 g",
        "fiber": "2 g",
        "fat": "5 g",
        "benefits": [
            "Hydrating, high in antioxidants with digestion-boosting garlic and vinegar.",
            "Crispy, savory Asian-style appetizer."
        ],
        "tips": [
            "Smashing cucumbers creates rough crevices that cling onto the dressing.",
            "Salt and drain beforehand to prevent a soggy salad."
        ],
        "instructions": [
            "Wash 2 medium-sized cucumbers thoroughly and trim both ends. Cut each cucumber into 2-3 large sections. Place each piece on a cutting board and gently smash it using the flat side of a heavy knife or a rolling pin until it cracks open. This creates irregular edges that hold the dressing well.",
            "Cut the smashed cucumber into bite-sized diagonal pieces. Place them in a mixing bowl and sprinkle with 1/2 teaspoon salt. Toss well and leave for 15-20 minutes so excess water is released.",
            "Drain the cucumber well and gently pat it dry with a clean kitchen towel or paper towel. This helps prevent the salad from becoming watery.",
            "For the dressing, mix 1 tablespoon light soy sauce, 1 tablespoon rice vinegar, 1 teaspoon sesame oil, 1 teaspoon chili oil, and 1/2 teaspoon sugar in a small bowl. Stir until the sugar dissolves. These soy-vinegar-sesame flavors are typical of smashed cucumber salad preparations.",
            "Add 2 finely minced garlic cloves and 1/2 teaspoon red chili flakes to the dressing. Mix well and let it sit for 2-3 minutes so the garlic and chili flavors develop.",
            "Pour the dressing over the smashed cucumber pieces. Toss thoroughly for 1-2 minutes, making sure the dressing reaches all the cracked surfaces of the cucumber.",
            "Add 1 teaspoon toasted sesame seeds and 1 tablespoon chopped coriander leaves. Toss once more and serve immediately as a refreshing side dish or appetizer. Smashed cucumber salads are generally served fresh because the cucumber gradually releases more water as it sits."
        ]
    },

    # Capsicum
    "Capsicum Sandwich": {
        "servings": 2,
        "calories": 285,
        "protein": "9 g",
        "carbohydrates": "31 g",
        "fiber": "3 g",
        "fat": "14 g",
        "benefits": [
            "Capsicum is an excellent source of vitamin C and carotenoids.",
            "Cheese provides protein and calcium for sustained energy."
        ],
        "tips": [
            "Sauté capsicum briefly so it stays crunchy inside the warm melted cheese.",
            "Toast on medium-low heat with butter for a crispy golden crust."
        ],
        "instructions": [
            "Wash and finely chop 1 medium capsicum and 1/2 small onion. Keep the vegetables small so the sandwich is easy to bite and cooks evenly.",
            "Heat a pan and add 1/2 tsp butter. Add the chopped onion and capsicum and sauté on medium-high heat for 3–4 minutes. Keep the capsicum slightly crunchy rather than completely soft.",
            "Transfer the vegetables to a bowl. Add 1/4 cup grated cheese, 1 tbsp mayonnaise, 1/2 tsp oregano, 1/2 tsp chilli flakes, 1/2 tsp black pepper and a small pinch of salt. Mix well. This type of capsicum-cheese-herb filling is also commonly used for capsicum toast sandwiches.",
            "Spread a thin layer of butter on one side of each bread slice. Place the capsicum-cheese filling generously over the unbuttered side of two slices.",
            "Cover with the remaining bread slices, keeping the buttered sides facing outward.",
            "Heat a tawa or sandwich pan. Place the sandwiches and toast on medium-low heat for 2–3 minutes per side, pressing gently until the bread becomes crisp and golden and the cheese melts.",
            "Cut each sandwich diagonally into triangles and serve hot with tomato ketchup, mint chutney or a yogurt dip."
        ]
    },
    "Capsicum Besan Bhaji": {
        "servings": 2,
        "calories": 235,
        "protein": "8 g",
        "carbohydrates": "27 g",
        "fiber": "6 g",
        "fat": "11 g",
        "benefits": [
            "Gram flour (besan) adds plant-based protein and low-GI carbohydrates.",
            "Capsicum delivers antioxidant vitamins A & C."
        ],
        "tips": [
            "Roast besan on low heat until nutty aroma develops before combining.",
            "Add roasted besan in batches to coat capsicum evenly without lumps."
        ],
        "instructions": [
            "Wash and chop 2 medium capsicums into small square pieces. Chop 1/2 onion, 2 garlic cloves and 1 green chilli. Keep everything ready.",
            "Heat a dry kadai on low heat. Add 1/2 cup besan and roast for 5–6 minutes, stirring continuously until aromatic and lightly golden. Remove and keep aside. Roasting the besan first prevents a raw flour taste.",
            "In the same kadai, heat 1 tbsp oil. Add 1/2 tsp mustard seeds and 1/2 tsp cumin seeds. When they crackle, add curry leaves, onion, garlic and green chilli. Sauté for 3–4 minutes until the onion becomes soft.",
            "Add 1/4 tsp turmeric, 1/2 tsp red chilli powder and a pinch of hing. Mix for about 20 seconds on low heat, making sure the spices do not burn.",
            "Add the chopped capsicum and salt. Stir well, add 1/4 cup water, cover and cook on low heat for 5–7 minutes until the capsicum becomes tender but still retains some texture.",
            "Add the roasted besan gradually, about 1–2 tbsp at a time, mixing after each addition. Cook for another 2–3 minutes until the besan coats the capsicum and becomes slightly crumbly. This gradual addition is characteristic of capsicum besan bhaji.",
            "Switch off the heat. Add 1 tbsp coriander leaves and 1/2 tsp lemon juice and mix well. Serve warm with roti, chapati, paratha or dal-rice."
        ]
    },
    "Stuffed Capsicum (Bharwa Shimla Mirch)": {
        "servings": 2,
        "calories": 275,
        "protein": "7 g",
        "carbohydrates": "38 g",
        "fiber": "7 g",
        "fat": "11 g",
        "benefits": [
            "Green peas and potatoes provide wholesome fiber and complex carbs.",
            "Capsicums are high in antioxidants and boost immunity."
        ],
        "tips": [
            "Use small-to-medium capsicums for uniform stovetop cooking.",
            "Turn gently while cooking on low flame so skin chars lightly without burning."
        ],
        "instructions": [
            "Boil 2 medium potatoes until completely tender, peel them and roughly mash them. Steam or boil 1/4 cup green peas and keep aside.",
            "Wash 4 small-medium capsicums and carefully cut around the top. Remove the seeds and inner white portions without breaking the outer shell. Small-to-medium capsicums work particularly well because they cook more evenly.",
            "Heat 1 tsp oil in a pan. Add 1/2 tsp cumin seeds. Once they crackle, add onion, green chilli and grated ginger. Sauté for 3–4 minutes until the onion becomes translucent.",
            "Add 1/4 tsp turmeric, 1/2 tsp red chilli powder, 1/2 tsp coriander powder and salt. Mix for 30 seconds. Add the mashed potatoes and cooked peas and sauté for 2–3 minutes.",
            "Add 1/2 tsp garam masala and 1/2 tsp amchur powder. Mix thoroughly and cook for another 1–2 minutes. Turn off the heat and add 1 tbsp chopped coriander. Potato-based spiced filling is a classic preparation for Bharwa Shimla Mirch.",
            "Fill each hollow capsicum generously with the potato-pea mixture. Press the filling gently into the cavity without packing it too tightly.",
            "Heat the remaining 1/2 tbsp oil in a wide pan. Place the stuffed capsicums upright, cover and cook on low heat for 12–15 minutes, rotating them every few minutes so all sides develop light char marks and the capsicum becomes tender. This stovetop turning method is commonly used when baking is not preferred."
        ]
    },

    # 3. Sambhar Onion
    "Small Onion Sambar": {
        "benefits": [
            "Small onions provide antioxidants and fibre.",
            "Drumstick contributes fibre and micronutrients.",
            "Dal makes the dish more filling."
        ],
        "tips": [
            "Choose small onions that are firm and dry.",
            "Peel them carefully without crushing.",
            "Use fresh drumstick for better flavour."
        ],
        "instructions": [
            "Peel the small onions.",
            "Cook the dal until soft.",
            "Sauté the onions until lightly golden.",
            "Add tomato and drumstick.",
            "Add sambar powder, turmeric and salt.",
            "Add cooked dal and simmer.",
            "Finish with tempering and serve."
        ]
    },
    "Small Onion Theeyal": {
        "benefits": [
            "Small onions provide fibre and antioxidants.",
            "Coconut adds energy and healthy fats.",
            "A flavourful traditional vegetable preparation."
        ],
        "tips": [
            "Use firm, fresh small onions.",
            "Lightly roast coconut for deeper flavour.",
            "Avoid burning the roasted ingredients."
        ],
        "instructions": [
            "Peel the small onions.",
            "Sauté them until lightly browned.",
            "Prepare roasted coconut and spices.",
            "Grind the roasted mixture into a paste.",
            "Add the paste and water to the onions.",
            "Add green chilli, turmeric and salt.",
            "Simmer until the gravy thickens."
        ]
    },
    "Small Onion Kara Kuzhambu": {
        "benefits": [
            "Small onions provide fibre and antioxidants.",
            "Tomato adds vitamin C.",
            "Brinjal contributes fibre and nutrients."
        ],
        "tips": [
            "Choose firm small onions and fresh brinjal.",
            "Cut brinjal just before cooking to reduce browning.",
            "Simmer gently to develop the flavour."
        ],
        "instructions": [
            "Peel small onions and cut brinjal.",
            "Sauté the onions until lightly golden.",
            "Add tomato and brinjal.",
            "Add kuzhambu spices, turmeric and salt.",
            "Add water and bring to a boil.",
            "Simmer until the brinjal becomes tender.",
            "Serve hot with rice."
        ]
    },

    # 4. Spring Onion
    "Spring Onion Poriyal": {
        "benefits": [
            "Spring onion provides vitamins and antioxidants.",
            "Carrot contributes beta-carotene.",
            "Green peas add fibre and plant protein."
        ],
        "tips": [
            "Choose crisp green leaves and firm white portions.",
            "Wash thoroughly before chopping.",
            "Avoid overcooking to retain colour and texture."
        ],
        "instructions": [
            "Wash and chop the spring onions.",
            "Chop the carrot.",
            "Heat oil and sauté the spring onion.",
            "Add carrot and green peas.",
            "Add salt and spices.",
            "Cover and cook until tender.",
            "Serve as a side dish."
        ]
    },
    "Spring Onion Fried Rice": {
        "benefits": [
            "Provides vegetables along with carbohydrates from rice.",
            "Green peas add fibre and plant protein.",
            "Mixed vegetables increase variety and nutrients."
        ],
        "tips": [
            "Use cooled, cooked rice for separate grains.",
            "Choose crisp spring onions and fresh vegetables.",
            "Cook vegetables quickly over medium-high heat."
        ],
        "instructions": [
            "Cook rice and allow it to cool.",
            "Chop spring onion, carrot and capsicum.",
            "Sauté the vegetables with green peas.",
            "Add cooked rice.",
            "Add salt and suitable seasonings.",
            "Toss everything on high heat.",
            "Garnish with spring onion and serve."
        ]
    },
    "Spring Onion Stir Fry": {
        "benefits": [
            "Spring onion provides antioxidants and vitamins.",
            "Cabbage provides fibre and vitamin C.",
            "Capsicum adds vitamin C and colourful nutrients."
        ],
        "tips": [
            "Select crisp cabbage and firm capsicum.",
            "Slice vegetables thinly for quick cooking.",
            "Keep the vegetables slightly crunchy."
        ],
        "instructions": [
            "Wash and slice all vegetables.",
            "Heat oil in a wide pan.",
            "Add spring onion and sauté briefly.",
            "Add cabbage and capsicum.",
            "Season with salt and spices.",
            "Stir-fry until just tender.",
            "Serve immediately."
        ]
    },

    # 5. Potato
    "Potato Roast": {
        "benefits": [
            "Potatoes provide carbohydrates for energy.",
            "They contain potassium and vitamin C.",
            "Onion adds fibre and antioxidants."
        ],
        "tips": [
            "Choose firm potatoes without green patches.",
            "Cut potatoes into equal-sized pieces.",
            "Roast on medium heat for even browning."
        ],
        "instructions": [
            "Peel and cube the potatoes.",
            "Parboil them until slightly tender.",
            "Sauté sliced onion in oil.",
            "Add potatoes, turmeric and spices.",
            "Roast until crisp and golden.",
            "Serve hot with rice or sambar."
        ]
    },
    "Potato Peas Curry": {
        "benefits": [
            "Potatoes provide energy and potassium.",
            "Green peas add fibre and plant protein.",
            "Tomatoes provide vitamin C and antioxidants."
        ],
        "tips": [
            "Use firm potatoes and bright green peas.",
            "Avoid overcooking the potatoes.",
            "Cut potatoes evenly for consistent cooking."
        ],
        "instructions": [
            "Peel and cube the potatoes.",
            "Sauté chopped tomato.",
            "Add potatoes and green peas.",
            "Add turmeric, spices and salt.",
            "Add water and cover.",
            "Cook until potatoes are tender.",
            "Serve hot."
        ]
    },
    "Aloo Gobi": {
        "benefits": [
            "Cauliflower provides fibre and vitamin C.",
            "Potato provides carbohydrates and potassium.",
            "A vegetable-rich side dish for everyday meals."
        ],
        "tips": [
            "Choose firm cauliflower florets.",
            "Avoid cauliflower with dark spots.",
            "Cook florets gently so they retain their texture."
        ],
        "instructions": [
            "Cut potato and cauliflower into pieces.",
            "Sauté tomato with spices.",
            "Add potato and cook briefly.",
            "Add cauliflower and salt.",
            "Cover and cook until tender.",
            "Stir occasionally to prevent sticking.",
            "Garnish and serve."
        ]
    },

    # 6. Baby Potato
    "Baby Potato Roast": {
        "benefits": [
            "Baby potatoes provide carbohydrates and potassium.",
            "Curry leaves contribute antioxidants.",
            "A satisfying side dish when cooked with moderate oil."
        ],
        "tips": [
            "Choose firm baby potatoes.",
            "Boil until just tender before roasting.",
            "Keep the skin on if clean for added texture."
        ],
        "instructions": [
            "Wash and boil the baby potatoes.",
            "Peel if desired.",
            "Heat oil and add curry leaves.",
            "Add potatoes, salt and spices.",
            "Roast until golden and crisp.",
            "Serve hot."
        ]
    },
    "Baby Potato Masala": {
        "benefits": [
            "Baby potatoes provide energy and potassium.",
            "Tomatoes contribute vitamin C.",
            "Onion adds fibre and antioxidants."
        ],
        "tips": [
            "Select small, firm potatoes.",
            "Do not overboil them.",
            "Roast lightly before adding them to the masala."
        ],
        "instructions": [
            "Boil and peel the baby potatoes.",
            "Sauté chopped onion.",
            "Add tomato and cook until soft.",
            "Add spices and salt.",
            "Add baby potatoes and mix gently.",
            "Cook until coated with masala.",
            "Serve hot."
        ]
    },
    "Baby Potato Kurma": {
        "benefits": [
            "Potatoes provide energy and potassium.",
            "Carrot adds beta-carotene.",
            "Peas contribute fibre and plant protein."
        ],
        "tips": [
            "Use firm baby potatoes.",
            "Cut carrots into small, even pieces.",
            "Cook vegetables until tender but not mushy."
        ],
        "instructions": [
            "Boil and peel baby potatoes.",
            "Sauté onion and tomato.",
            "Add carrot and green peas.",
            "Add kurma spices and water.",
            "Add baby potatoes.",
            "Cover and simmer until vegetables are cooked.",
            "Serve warm."
        ]
    },

    # 7. Ooty Potato
    "Ooty Potato Fry": {
        "benefits": [
            "Potatoes provide carbohydrates and potassium.",
            "Onion adds fibre and antioxidants.",
            "A simple energy-rich side dish."
        ],
        "tips": [
            "Choose firm Ooty potatoes without sprouts.",
            "Cut into thin, even pieces.",
            "Cook on medium heat for crisp edges."
        ],
        "instructions": [
            "Wash, peel and slice the potatoes.",
            "Sauté chopped onion.",
            "Add potatoes and spices.",
            "Mix well and cover briefly.",
            "Cook until tender.",
            "Roast uncovered until lightly crisp.",
            "Serve hot."
        ]
    },
    "Potato Kurma": {
        "benefits": [
            "Potato provides energy and potassium.",
            "Carrot contributes beta-carotene.",
            "Peas add fibre and plant protein."
        ],
        "tips": [
            "Choose fresh, firm potatoes.",
            "Cut all vegetables evenly.",
            "Simmer gently for a smooth kurma."
        ],
        "instructions": [
            "Peel and cube the potatoes.",
            "Sauté onion and tomato.",
            "Add carrot and green peas.",
            "Add kurma spices and water.",
            "Add potatoes.",
            "Cover and cook until tender.",
            "Serve with chapati or dosa."
        ]
    },
    "Potato Masala": {
        "benefits": [
            "Potatoes provide carbohydrates and potassium.",
            "Tomatoes provide vitamin C.",
            "Onion and green chilli add plant compounds and flavour."
        ],
        "tips": [
            "Use firm potatoes.",
            "Boil potatoes until just tender.",
            "Mash lightly instead of making them completely smooth."
        ],
        "instructions": [
            "Boil, peel and roughly mash the potatoes.",
            "Sauté onion and green chilli.",
            "Add chopped tomato.",
            "Add turmeric, spices and salt.",
            "Add mashed potato and mix.",
            "Cook for a few minutes.",
            "Serve with dosa, poori or chapati."
        ]
    },

    # 8. Orange Carrot
    "Carrot Poriyal": {
        "benefits": [
            "Carrots are rich in beta-carotene.",
            "Coconut provides healthy fats and flavour.",
            "A fibre-rich vegetable side dish."
        ],
        "tips": [
            "Choose firm, bright orange carrots.",
            "Avoid carrots that are soft or cracked.",
            "Do not overcook to retain texture."
        ],
        "instructions": [
            "Wash, peel and chop carrots.",
            "Heat oil and add seasoning.",
            "Add carrots and salt.",
            "Sprinkle a little water.",
            "Cover and cook until tender.",
            "Add grated coconut.",
            "Mix and serve."
        ]
    },
    "Carrot Peas Curry": {
        "benefits": [
            "Carrot provides beta-carotene.",
            "Green peas provide fibre and plant protein.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Use firm carrots and fresh or frozen peas.",
            "Cut carrots into similar-sized pieces.",
            "Cook until tender while retaining a slight bite."
        ],
        "instructions": [
            "Chop carrot and onion.",
            "Sauté onion until translucent.",
            "Add carrot and peas.",
            "Add turmeric, spices and salt.",
            "Add a little water.",
            "Cover and cook until tender.",
            "Serve warm."
        ]
    },
    "Carrot Sambar": {
        "benefits": [
            "Carrot provides beta-carotene and fibre.",
            "Drumstick adds fibre and minerals.",
            "Dal provides plant-based protein."
        ],
        "tips": [
            "Use fresh, firm carrots.",
            "Cut drumstick into manageable pieces.",
            "Avoid overcooking the vegetables."
        ],
        "instructions": [
            "Cook the dal until soft.",
            "Chop carrot, onion and drumstick.",
            "Sauté onion and tomato.",
            "Add vegetables and cook with water.",
            "Add sambar powder, turmeric and salt.",
            "Mix in cooked dal.",
            "Simmer and add tempering.",
            "Serve hot."
        ]
    },

    # 9. Green Cucumber
    "Cucumber Raita": {
        "benefits": [
            "Cucumber provides hydration and fibre.",
            "Coriander adds vitamins and freshness.",
            "A light accompaniment to spicy meals."
        ],
        "tips": [
            "Choose firm cucumbers with smooth skin.",
            "Chill before serving for a refreshing taste.",
            "Remove excess water if the cucumber is very watery."
        ],
        "instructions": [
            "Wash and finely chop or grate cucumber.",
            "Squeeze out excess water if needed.",
            "Mix with fresh curd.",
            "Add salt and chopped coriander.",
            "Mix gently.",
            "Chill and serve."
        ]
    },
    "Cucumber Kootu": {
        "benefits": [
            "Cucumber provides hydration and fibre.",
            "Moong dal provides plant protein.",
            "Tomato and green chilli add flavour and nutrients."
        ],
        "tips": [
            "Choose fresh, firm cucumber.",
            "Cook cucumber until just tender.",
            "Avoid excessive water to keep the kootu thick."
        ],
        "instructions": [
            "Peel and chop cucumber.",
            "Cook moong dal until soft.",
            "Cook cucumber with tomato and green chilli.",
            "Add the cooked dal.",
            "Season with salt and spices.",
            "Simmer until combined.",
            "Serve warm."
        ]
    },
    "Cucumber Salad": {
        "benefits": [
            "Cucumber supports hydration.",
            "Carrot provides beta-carotene.",
            "Lemon adds vitamin C."
        ],
        "tips": [
            "Use crisp cucumber and fresh carrots.",
            "Prepare just before serving.",
            "Add lemon at the end for freshness."
        ],
        "instructions": [
            "Wash cucumber and carrot.",
            "Slice or grate both vegetables.",
            "Add chopped coriander.",
            "Squeeze fresh lemon juice.",
            "Add a pinch of salt.",
            "Toss well and serve immediately."
        ]
    },

    # 10. Lady Finger
    "Vendakkai Poriyal": {
        "benefits": [
            "Lady finger provides fibre and folate.",
            "Onion adds antioxidants and flavour.",
            "A vegetable-rich everyday side dish."
        ],
        "tips": [
            "Choose bright green, tender lady finger.",
            "Wash and dry completely before cutting.",
            "Avoid overcrowding the pan to reduce sliminess."
        ],
        "instructions": [
            "Wash and completely dry the lady finger.",
            "Slice into small pieces.",
            "Sauté onion.",
            "Add lady finger and cook uncovered.",
            "Add salt and spices.",
            "Stir until tender and lightly roasted.",
            "Serve hot."
        ]
    },
    "Vendakkai Sambar": {
        "benefits": [
            "Lady finger provides fibre.",
            "Tomato provides vitamin C.",
            "Dal adds plant-based protein."
        ],
        "tips": [
            "Choose tender lady finger.",
            "Dry thoroughly before cutting.",
            "Lightly sauté before adding to sambar to reduce sliminess."
        ],
        "instructions": [
            "Wash, dry and slice lady finger.",
            "Sauté it briefly.",
            "Cook dal until soft.",
            "Cook tomato and onion.",
            "Add lady finger and sambar spices.",
            "Add cooked dal and simmer.",
            "Serve hot."
        ]
    },
    "Vendakkai Kara Kuzhambu": {
        "benefits": [
            "Lady finger provides fibre.",
            "Tomato provides vitamin C and antioxidants.",
            "Small onion contributes fibre and plant compounds."
        ],
        "tips": [
            "Use fresh, tender lady finger.",
            "Sauté lady finger before adding to the gravy.",
            "Simmer gently to prevent the vegetable from becoming too soft."
        ],
        "instructions": [
            "Wash, dry and cut lady finger.",
            "Sauté until lightly roasted.",
            "Sauté small onion and tomato.",
            "Add kuzhambu spices and salt.",
            "Add water and bring to a boil.",
            "Add lady finger and simmer.",
            "Serve with hot rice."
        ]
    },

    # 11. Brinjal – Vari
    "Brinjal Poriyal": {
        "benefits": [
            "Brinjal provides fibre and antioxidants.",
            "Onion adds beneficial plant compounds.",
            "A light vegetable side dish."
        ],
        "tips": [
            "Choose glossy, firm brinjals.",
            "Avoid vegetables with soft spots.",
            "Cut just before cooking to reduce browning."
        ],
        "instructions": [
            "Wash and cut brinjal.",
            "Sauté onion with seasoning.",
            "Add brinjal.",
            "Add turmeric, spices and salt.",
            "Sprinkle a little water and cover.",
            "Cook until tender.",
            "Serve hot."
        ]
    },
    "Brinjal Sambar": {
        "benefits": [
            "Brinjal provides fibre.",
            "Tomato and drumstick add vitamins and minerals.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use fresh, firm brinjal.",
            "Cut just before cooking.",
            "Do not overcook the brinjal."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Cut brinjal and drumstick.",
            "Sauté onion and tomato.",
            "Add vegetables and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper.",
            "Serve hot."
        ]
    },
    "Brinjal Kara Kuzhambu": {
        "benefits": [
            "Brinjal provides dietary fibre.",
            "Tomato provides vitamin C.",
            "Small onion contributes antioxidants."
        ],
        "tips": [
            "Choose firm, glossy brinjal.",
            "Use small brinjal pieces for even cooking.",
            "Cook until tender without breaking them apart."
        ],
        "instructions": [
            "Wash and cut brinjal.",
            "Sauté small onion.",
            "Add tomato and brinjal.",
            "Add kuzhambu spices and salt.",
            "Add water and bring to a boil.",
            "Simmer until brinjal is tender.",
            "Serve with rice."
        ]
    },

    # 12. Brinjal – Bharta
    "Brinjal Bharta": {
        "benefits": [
            "Brinjal provides fibre and antioxidants.",
            "Tomato adds vitamin C.",
            "Onion and green chilli enhance flavour and plant nutrients."
        ],
        "tips": [
            "Choose a large, firm brinjal.",
            "Roast until the skin is completely charred and inside is soft.",
            "Allow it to cool before peeling."
        ],
        "instructions": [
            "Wash and roast the whole brinjal.",
            "Turn occasionally until completely soft.",
            "Cool, peel and mash.",
            "Sauté onion and green chilli.",
            "Add chopped tomato and cook.",
            "Add mashed brinjal, salt and spices.",
            "Cook for a few minutes and serve."
        ]
    },
    "Brinjal Masala": {
        "benefits": [
            "Brinjal provides fibre.",
            "Tomato and onion provide antioxidants.",
            "A vegetable-rich accompaniment for meals."
        ],
        "tips": [
            "Choose glossy, firm brinjals.",
            "Cut into equal-sized pieces.",
            "Cook on medium heat to retain texture."
        ],
        "instructions": [
            "Wash and chop brinjal.",
            "Sauté onion.",
            "Add tomato and cook until soft.",
            "Add brinjal and spices.",
            "Add salt and a little water.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },
    "Brinjal Kootu": {
        "benefits": [
            "Brinjal provides fibre and antioxidants.",
            "Carrot adds beta-carotene.",
            "Moong dal provides plant protein."
        ],
        "tips": [
            "Use fresh brinjal and carrot.",
            "Cook dal until soft but not watery.",
            "Cut vegetables evenly."
        ],
        "instructions": [
            "Cook moong dal until soft.",
            "Chop brinjal and carrot.",
            "Cook the vegetables with tomato and spices.",
            "Add cooked dal.",
            "Add salt and required water.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },

    # 13. Cabbage
    "Cabbage Poriyal": {
        "benefits": [
            "Cabbage provides fibre and vitamin C.",
            "Carrot adds beta-carotene.",
            "Green chilli adds flavour and plant compounds."
        ],
        "tips": [
            "Choose a firm, compact cabbage.",
            "Remove damaged outer leaves.",
            "Slice thinly for quick cooking."
        ],
        "instructions": [
            "Wash and finely shred cabbage.",
            "Chop carrot and green chilli.",
            "Add seasoning to hot oil.",
            "Add vegetables and salt.",
            "Stir-fry until just tender.",
            "Add coconut if desired.",
            "Serve warm."
        ]
    },
    "Cabbage Kootu": {
        "benefits": [
            "Cabbage provides fibre and vitamin C.",
            "Moong dal adds plant protein.",
            "Carrot contributes beta-carotene."
        ],
        "tips": [
            "Use crisp cabbage.",
            "Avoid overcooking the cabbage.",
            "Keep the kootu thick rather than watery."
        ],
        "instructions": [
            "Chop cabbage and carrot.",
            "Cook moong dal until soft.",
            "Cook vegetables with a little water.",
            "Add cooked dal.",
            "Season with salt and spices.",
            "Simmer until well combined.",
            "Serve warm."
        ]
    },
    "Cabbage Peas Curry": {
        "benefits": [
            "Cabbage provides fibre and vitamin C.",
            "Green peas provide plant protein and fibre.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Use crisp cabbage and fresh peas.",
            "Slice cabbage thinly.",
            "Cook just until tender."
        ],
        "instructions": [
            "Shred the cabbage.",
            "Chop onion.",
            "Sauté onion until translucent.",
            "Add cabbage and green peas.",
            "Add spices and salt.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },

    # 14. Cauliflower
    "Gobi 65": {
        "benefits": [
            "Cauliflower provides fibre and vitamin C.",
            "Onion and green chilli add plant compounds.",
            "A vegetable-based snack or side dish."
        ],
        "tips": [
            "Choose firm, white cauliflower florets.",
            "Wash florets thoroughly.",
            "Keep the batter thick for a crisp coating."
        ],
        "instructions": [
            "Cut cauliflower into bite-sized florets.",
            "Wash and blanch briefly.",
            "Mix with spices and a thick batter.",
            "Coat each floret evenly.",
            "Fry until crisp and golden.",
            "Drain excess oil.",
            "Serve hot."
        ]
    },
    "Cauliflower Kurma": {
        "benefits": [
            "Cauliflower provides fibre and vitamin C.",
            "Carrot provides beta-carotene.",
            "Green peas add fibre and plant protein."
        ],
        "tips": [
            "Choose firm cauliflower.",
            "Blanch florets briefly before cooking if needed.",
            "Cut vegetables evenly."
        ],
        "instructions": [
            "Cut and wash cauliflower florets.",
            "Sauté onion and tomato.",
            "Add carrot and peas.",
            "Add cauliflower and kurma spices.",
            "Add water and salt.",
            "Cover and simmer until tender.",
            "Serve warm."
        ]
    },

    # 15. Beetroot
    "Beetroot Poriyal": {
        "benefits": [
            "Beetroot provides folate and antioxidants.",
            "Coconut adds healthy fats.",
            "A colourful, fibre-rich side dish."
        ],
        "tips": [
            "Choose firm beetroots with smooth skin.",
            "Avoid soft or damaged roots.",
            "Wear gloves or rinse hands after cutting to avoid staining."
        ],
        "instructions": [
            "Peel and finely chop beetroot.",
            "Heat oil and add seasoning.",
            "Add beetroot and salt.",
            "Sprinkle a little water.",
            "Cover and cook until tender.",
            "Add grated coconut.",
            "Mix and serve."
        ]
    },
    "Beetroot Kootu": {
        "benefits": [
            "Beetroot provides antioxidants and folate.",
            "Moong dal provides plant protein.",
            "Carrot adds beta-carotene."
        ],
        "tips": [
            "Use firm beetroot and fresh carrot.",
            "Cook the vegetables until tender.",
            "Keep the dal thick for better consistency."
        ],
        "instructions": [
            "Cook moong dal until soft.",
            "Chop beetroot and carrot.",
            "Cook vegetables with water and spices.",
            "Add cooked dal.",
            "Add salt and mix.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Beetroot Carrot Salad": {
        "benefits": [
            "Beetroot provides antioxidants.",
            "Carrot is rich in beta-carotene.",
            "Cucumber provides hydration and lemon adds vitamin C."
        ],
        "tips": [
            "Use crisp, fresh vegetables.",
            "Prepare shortly before serving.",
            "Add lemon just before eating."
        ],
        "instructions": [
            "Wash and peel beetroot and carrot.",
            "Grate or thinly slice them.",
            "Add chopped cucumber.",
            "Add fresh lemon juice.",
            "Add salt and coriander.",
            "Toss gently and serve fresh."
        ]
    },

    # 16. Radish
    "Radish Sambar": {
        "benefits": [
            "Radish provides fibre and vitamin C.",
            "Tomato adds antioxidants.",
            "Dal contributes plant-based protein."
        ],
        "tips": [
            "Choose firm radishes with fresh leaves if attached.",
            "Peel if the skin is thick.",
            "Slice evenly for consistent cooking."
        ],
        "instructions": [
            "Wash, peel and slice radish.",
            "Cook dal until soft.",
            "Sauté onion and tomato.",
            "Add radish and sambar spices.",
            "Cook until radish becomes tender.",
            "Add cooked dal and simmer.",
            "Temper and serve."
        ]
    },
    "Radish Poriyal": {
        "benefits": [
            "Radish provides fibre and vitamin C.",
            "Onion contributes antioxidants.",
            "Green chilli adds flavour."
        ],
        "tips": [
            "Use crisp, firm radish.",
            "Slice thinly for faster cooking.",
            "Cook uncovered initially to reduce excess moisture."
        ],
        "instructions": [
            "Wash, peel and slice radish.",
            "Sauté onion and green chilli.",
            "Add radish and salt.",
            "Add turmeric and spices.",
            "Cook until tender.",
            "Roast briefly to remove excess moisture.",
            "Serve."
        ]
    },
    "Radish Kootu": {
        "benefits": [
            "Radish provides fibre and vitamin C.",
            "Carrot contributes beta-carotene.",
            "Moong dal provides plant protein."
        ],
        "tips": [
            "Choose fresh, firm radish.",
            "Cut carrot and radish evenly.",
            "Do not overcook the vegetables."
        ],
        "instructions": [
            "Cook moong dal until soft.",
            "Chop radish and carrot.",
            "Cook vegetables with spices.",
            "Add cooked dal.",
            "Add salt and water as needed.",
            "Simmer until well combined.",
            "Serve warm."
        ]
    },

    # 17. Sweet Potato
    "Sweet Potato Roast": {
        "benefits": [
            "Sweet potato provides complex carbohydrates.",
            "Rich in beta-carotene, especially orange varieties.",
            "Onion adds fibre and antioxidants."
        ],
        "tips": [
            "Choose firm sweet potatoes without soft spots.",
            "Boil until just tender.",
            "Roast with moderate oil for crisp edges."
        ],
        "instructions": [
            "Wash, peel and cube sweet potato.",
            "Boil until slightly tender.",
            "Sauté onion.",
            "Add sweet potato and spices.",
            "Roast until golden.",
            "Serve hot."
        ]
    },
    "Sweet Potato Curry": {
        "benefits": [
            "Sweet potato provides energy and fibre.",
            "Tomato provides vitamin C.",
            "Green chilli adds flavour and plant compounds."
        ],
        "tips": [
            "Select firm sweet potatoes.",
            "Avoid overboiling before cooking.",
            "Cut into evenly sized pieces."
        ],
        "instructions": [
            "Peel and cube sweet potato.",
            "Sauté tomato and green chilli.",
            "Add sweet potato and spices.",
            "Add salt and a little water.",
            "Cover and cook until tender.",
            "Mix gently and serve."
        ]
    },
    "Sweet Potato Chaat": {
        "benefits": [
            "Sweet potato provides fibre and complex carbohydrates.",
            "Tomato adds antioxidants.",
            "Lemon provides vitamin C."
        ],
        "tips": [
            "Choose firm sweet potatoes.",
            "Boil until tender without making them mushy.",
            "Add lemon just before serving."
        ],
        "instructions": [
            "Boil and peel sweet potato.",
            "Cut into bite-sized pieces.",
            "Add chopped onion and tomato.",
            "Add coriander and chaat spices.",
            "Squeeze fresh lemon juice.",
            "Toss gently and serve."
        ]
    },

    # 18. Garlic
    "Garlic Rasam": {
        "benefits": [
            "Garlic contains beneficial sulphur compounds.",
            "Tomato provides vitamin C and lycopene.",
            "Herbs add freshness and micronutrients."
        ],
        "tips": [
            "Choose firm garlic cloves.",
            "Use fresh tomatoes for better flavour.",
            "Lightly crush garlic before cooking to release flavour."
        ],
        "instructions": [
            "Peel and lightly crush garlic.",
            "Cook chopped tomatoes until soft.",
            "Add water, rasam spices and salt.",
            "Add crushed garlic.",
            "Simmer gently until aromatic.",
            "Add curry leaves and coriander.",
            "Serve hot."
        ]
    },
    "Garlic Chutney": {
        "benefits": [
            "Garlic provides beneficial plant compounds.",
            "Tomato adds vitamin C and antioxidants.",
            "Green chilli adds flavour."
        ],
        "tips": [
            "Use fresh, firm garlic.",
            "Roast ingredients lightly for deeper flavour.",
            "Adjust chilli according to preference."
        ],
        "instructions": [
            "Peel garlic cloves.",
            "Sauté garlic, tomato and green chilli.",
            "Cook until tomatoes soften.",
            "Cool the mixture.",
            "Grind into a smooth or coarse chutney.",
            "Add salt and adjust consistency.",
            "Serve with dosa or idli."
        ]
    },
    "Garlic Vegetable Stir Fry": {
        "benefits": [
            "Garlic provides antioxidant compounds.",
            "Carrot provides beta-carotene.",
            "Capsicum and beans add fibre and vitamins."
        ],
        "tips": [
            "Use crisp vegetables.",
            "Slice vegetables evenly.",
            "Cook quickly to retain crunch."
        ],
        "instructions": [
            "Chop garlic and vegetables.",
            "Heat oil and sauté garlic.",
            "Add carrot and beans.",
            "Add capsicum.",
            "Season with salt and spices.",
            "Stir-fry until just tender.",
            "Serve immediately."
        ]
    },

    # 19. Peeled Garlic
    "Garlic Curry": {
        "benefits": [
            "Garlic provides beneficial sulphur compounds.",
            "Tomato provides antioxidants.",
            "Small onions add fibre."
        ],
        "tips": [
            "Keep peeled garlic refrigerated and use promptly.",
            "Avoid cloves with dark spots.",
            "Cook gently to prevent burning."
        ],
        "instructions": [
            "Check and rinse peeled garlic.",
            "Sauté small onions.",
            "Add garlic and cook briefly.",
            "Add chopped tomato.",
            "Add spices, salt and water.",
            "Simmer until garlic is tender.",
            "Serve hot."
        ]
    },
    "Garlic Mushroom Fry": {
        "benefits": [
            "Mushrooms provide B vitamins and minerals.",
            "Garlic adds antioxidant compounds.",
            "Capsicum provides vitamin C."
        ],
        "tips": [
            "Choose clean, firm mushrooms.",
            "Wipe mushrooms rather than soaking them.",
            "Cook on high heat to avoid excess water."
        ],
        "instructions": [
            "Clean and slice mushrooms.",
            "Chop garlic and capsicum.",
            "Sauté garlic until fragrant.",
            "Add mushrooms and cook on high heat.",
            "Add capsicum and seasonings.",
            "Stir-fry until cooked.",
            "Serve hot."
        ]
    },

    # 20. Ginger
    "Ginger Rasam": {
        "benefits": [
            "Ginger contains natural bioactive compounds.",
            "Tomato provides vitamin C and antioxidants.",
            "Coriander adds micronutrients."
        ],
        "tips": [
            "Choose firm ginger with smooth skin.",
            "Use freshly grated ginger for stronger flavour.",
            "Simmer gently rather than boiling heavily."
        ],
        "instructions": [
            "Peel and grate ginger.",
            "Cook chopped tomatoes.",
            "Add water and rasam spices.",
            "Add ginger and salt.",
            "Simmer until aromatic.",
            "Add curry leaves and coriander.",
            "Serve hot."
        ]
    },
    "Ginger Vegetable Curry": {
        "benefits": [
            "Mixed vegetables provide fibre and vitamins.",
            "Ginger adds flavour and beneficial plant compounds.",
            "Carrot and beans contribute micronutrients."
        ],
        "tips": [
            "Use fresh ginger.",
            "Choose crisp vegetables.",
            "Cut vegetables evenly."
        ],
        "instructions": [
            "Chop ginger and vegetables.",
            "Sauté ginger until fragrant.",
            "Add carrot and beans.",
            "Add capsicum.",
            "Add spices and salt.",
            "Cook until vegetables are tender.",
            "Serve hot."
        ]
    },
    "Ginger Chutney": {
        "benefits": [
            "Ginger contains bioactive compounds.",
            "Tomato provides vitamin C.",
            "Green chilli adds antioxidants and flavour."
        ],
        "tips": [
            "Use fresh, firm ginger.",
            "Roast lightly for a balanced flavour.",
            "Adjust ginger quantity according to taste."
        ],
        "instructions": [
            "Peel and chop ginger.",
            "Sauté ginger, tomato and chilli.",
            "Cook until tomato softens.",
            "Cool the mixture.",
            "Grind with salt.",
            "Adjust consistency with water.",
            "Serve with idli or dosa."
        ]
    },

    # 21. Green Chilli
    "Green Chilli Chutney": {
        "benefits": [
            "Green chilli provides vitamin C.",
            "Coriander adds antioxidants and micronutrients.",
            "Lemon adds additional vitamin C."
        ],
        "tips": [
            "Choose fresh, firm green chillies.",
            "Remove seeds for a milder chutney.",
            "Add lemon after cooling."
        ],
        "instructions": [
            "Wash green chillies and coriander.",
            "Sauté chillies briefly if desired.",
            "Add coriander and lemon juice.",
            "Grind with salt.",
            "Add a little water if required.",
            "Blend to the desired consistency.",
            "Serve fresh."
        ]
    },
    "Chilli Onion Fry": {
        "benefits": [
            "Onion provides fibre and antioxidants.",
            "Green chilli adds vitamin C.",
            "Tomato provides lycopene."
        ],
        "tips": [
            "Choose crisp onions and fresh chillies.",
            "Adjust chilli quantity to taste.",
            "Cook tomato until soft but not watery."
        ],
        "instructions": [
            "Slice onion and tomato.",
            "Chop green chilli.",
            "Sauté onion and chilli.",
            "Add tomato.",
            "Add salt and spices.",
            "Cook until soft and slightly roasted.",
            "Serve hot."
        ]
    },
    "Green Chilli Vegetable Stir Fry": {
        "benefits": [
            "Beans and carrot provide fibre.",
            "Capsicum adds vitamin C.",
            "Green chilli provides additional plant compounds."
        ],
        "tips": [
            "Use crisp vegetables.",
            "Slice vegetables thinly.",
            "Adjust green chilli according to spice preference."
        ],
        "instructions": [
            "Chop beans, carrot and capsicum.",
            "Slice green chilli.",
            "Heat oil and sauté chilli.",
            "Add beans and carrot.",
            "Add capsicum and seasonings.",
            "Stir-fry until tender-crisp.",
            "Serve immediately."
        ]
    },

    # 22. Lemon
    "Lemon Rice": {
        "benefits": [
            "Lemon provides vitamin C.",
            "Curry leaves and coriander add micronutrients.",
            "Rice provides carbohydrates for energy."
        ],
        "tips": [
            "Use freshly squeezed lemon juice.",
            "Add lemon juice after turning off the heat for fresher flavour.",
            "Use cooled rice to prevent mushiness."
        ],
        "instructions": [
            "Cook rice and allow it to cool.",
            "Prepare tempering with curry leaves and green chilli.",
            "Add the cooked rice.",
            "Mix gently with salt.",
            "Turn off the heat.",
            "Add fresh lemon juice and coriander.",
            "Mix and serve."
        ]
    },
    "Lemon Vegetable Salad": {
        "benefits": [
            "Cucumber provides hydration.",
            "Carrot and beetroot provide antioxidants.",
            "Lemon adds vitamin C."
        ],
        "tips": [
            "Use fresh, crisp vegetables.",
            "Prepare immediately before serving.",
            "Add lemon at the end."
        ],
        "instructions": [
            "Wash all vegetables.",
            "Slice cucumber, carrot and beetroot.",
            "Add fresh lemon juice.",
            "Add a pinch of salt.",
            "Mix gently.",
            "Serve immediately."
        ]
    },
    "Lemon Rasam": {
        "benefits": [
            "Lemon provides vitamin C.",
            "Tomato provides antioxidants.",
            "Coriander adds freshness and micronutrients."
        ],
        "tips": [
            "Use fresh lemon juice.",
            "Do not boil lemon juice for a long time.",
            "Add lemon after reducing the heat."
        ],
        "instructions": [
            "Cook chopped tomato with water.",
            "Add rasam spices and salt.",
            "Simmer until aromatic.",
            "Turn off the heat.",
            "Add fresh lemon juice.",
            "Garnish with coriander.",
            "Serve warm."
        ]
    },

    # 23. Curry Leaves
    "Curry Leaf Chutney": {
        "benefits": [
            "Curry leaves contain antioxidants.",
            "Tomato provides vitamin C.",
            "Green chilli adds flavour and plant compounds."
        ],
        "tips": [
            "Choose fresh green curry leaves.",
            "Wash and dry before cooking.",
            "Lightly roast for a stronger aroma."
        ],
        "instructions": [
            "Wash and dry curry leaves.",
            "Sauté curry leaves, tomato and chilli.",
            "Cook until tomato softens.",
            "Cool the mixture.",
            "Grind with salt and required water.",
            "Adjust consistency.",
            "Serve fresh."
        ]
    },
    "Curry Leaf Rice": {
        "benefits": [
            "Curry leaves provide antioxidants.",
            "Onion contributes fibre.",
            "Green chilli adds vitamin C and flavour."
        ],
        "tips": [
            "Use cooled cooked rice.",
            "Use fresh curry leaves for better aroma.",
            "Mix gently to keep rice grains separate."
        ],
        "instructions": [
            "Cook and cool the rice.",
            "Prepare tempering with curry leaves and chilli.",
            "Sauté onion.",
            "Add cooked rice.",
            "Add salt and curry leaf spice mixture.",
            "Mix gently.",
            "Serve warm."
        ]
    },
    "Curry Leaf Rasam": {
        "benefits": [
            "Curry leaves provide antioxidant compounds.",
            "Tomato provides vitamin C.",
            "Coriander adds micronutrients."
        ],
        "tips": [
            "Use fresh curry leaves.",
            "Avoid burning the leaves during tempering.",
            "Simmer gently for better flavour."
        ],
        "instructions": [
            "Cook chopped tomato.",
            "Add water, rasam spices and salt.",
            "Add curry leaves.",
            "Simmer until aromatic.",
            "Prepare a light tempering.",
            "Add coriander.",
            "Serve hot."
        ]
    },

    # 24. Coriander
    "Coriander Chutney": {
        "benefits": [
            "Coriander provides antioxidants and vitamin K.",
            "Green chilli adds vitamin C.",
            "Lemon provides additional vitamin C."
        ],
        "tips": [
            "Choose bright green, crisp coriander.",
            "Wash thoroughly and drain well.",
            "Add lemon for freshness."
        ],
        "instructions": [
            "Wash coriander and remove thick stems.",
            "Add green chilli.",
            "Add lemon juice and salt.",
            "Grind with a little water.",
            "Blend until smooth.",
            "Adjust consistency.",
            "Serve fresh."
        ]
    },
    "Coriander Rice": {
        "benefits": [
            "Coriander adds antioxidants and micronutrients.",
            "Onion provides fibre.",
            "Rice provides energy."
        ],
        "tips": [
            "Use cooled rice.",
            "Use fresh coriander leaves.",
            "Avoid overcooking the coriander paste."
        ],
        "instructions": [
            "Cook and cool rice.",
            "Grind coriander and green chilli.",
            "Sauté onion.",
            "Add coriander mixture.",
            "Cook briefly.",
            "Add rice and salt.",
            "Mix gently and serve."
        ]
    },
    "Coriander Vegetable Salad": {
        "benefits": [
            "Cucumber provides hydration.",
            "Carrot provides beta-carotene.",
            "Tomato and coriander provide antioxidants."
        ],
        "tips": [
            "Use fresh, crisp vegetables.",
            "Wash coriander thoroughly.",
            "Add dressing just before serving."
        ],
        "instructions": [
            "Wash all vegetables.",
            "Chop cucumber, carrot and tomato.",
            "Add chopped coriander.",
            "Add lemon juice and salt.",
            "Toss gently.",
            "Serve immediately."
        ]
    },

    # 25. Mint Leaves
    "Mint Chutney": {
        "benefits": [
            "Mint provides antioxidants and freshness.",
            "Coriander adds micronutrients.",
            "Lemon contributes vitamin C."
        ],
        "tips": [
            "Use bright green mint leaves.",
            "Remove damaged leaves and wash thoroughly.",
            "Use fresh lemon juice."
        ],
        "instructions": [
            "Wash mint and coriander.",
            "Add green chilli.",
            "Add lemon juice and salt.",
            "Grind with a little water.",
            "Blend until smooth.",
            "Adjust consistency.",
            "Serve fresh."
        ]
    },
    "Mint Rice": {
        "benefits": [
            "Mint and coriander provide antioxidants.",
            "Carrot contributes beta-carotene.",
            "Rice provides carbohydrates for energy."
        ],
        "tips": [
            "Use cooled cooked rice.",
            "Use fresh mint for maximum aroma.",
            "Avoid cooking the mint paste for too long."
        ],
        "instructions": [
            "Cook and cool rice.",
            "Grind mint with green chilli.",
            "Sauté onion and carrot.",
            "Add mint paste.",
            "Cook briefly.",
            "Add rice and salt.",
            "Mix gently and serve."
        ]
    },
    "Mint Vegetable Pulao": {
        "benefits": [
            "Mixed vegetables provide fibre and vitamins.",
            "Peas provide plant protein.",
            "Mint adds antioxidants and freshness."
        ],
        "tips": [
            "Use fresh mint leaves.",
            "Cut vegetables evenly.",
            "Rinse rice before cooking."
        ],
        "instructions": [
            "Wash rice and chop vegetables.",
            "Sauté onion and mint.",
            "Add carrot, beans and peas.",
            "Add rice and spices.",
            "Add measured water.",
            "Cook until rice and vegetables are tender.",
            "Rest briefly and serve."
        ]
    },

    # 26. Raw Turmeric
    "Raw Turmeric Pickle": {
        "benefits": [
            "Raw turmeric contains curcumin and other plant compounds.",
            "Lemon adds vitamin C.",
            "Green chilli adds flavour and antioxidants."
        ],
        "tips": [
            "Choose firm, fresh turmeric roots.",
            "Wash and peel carefully.",
            "Store prepared pickle refrigerated."
        ],
        "instructions": [
            "Wash and peel raw turmeric.",
            "Slice into thin pieces.",
            "Add lemon juice and salt.",
            "Add finely chopped green chilli.",
            "Mix thoroughly.",
            "Rest for the flavours to combine.",
            "Refrigerate and serve."
        ]
    },
    "Turmeric Vegetable Stir Fry": {
        "benefits": [
            "Turmeric provides curcumin.",
            "Carrot provides beta-carotene.",
            "Beans provide fibre."
        ],
        "tips": [
            "Choose firm turmeric and crisp vegetables.",
            "Slice turmeric thinly.",
            "Cook until tender without overcooking."
        ],
        "instructions": [
            "Peel and thinly slice turmeric.",
            "Chop carrot and beans.",
            "Sauté turmeric briefly.",
            "Add vegetables.",
            "Add salt and spices.",
            "Stir-fry until tender.",
            "Serve hot."
        ]
    },
    "Turmeric Ginger Chutney": {
        "benefits": [
            "Turmeric and ginger provide bioactive plant compounds.",
            "Green chilli adds vitamin C.",
            "Lemon provides additional vitamin C."
        ],
        "tips": [
            "Use fresh turmeric and ginger.",
            "Adjust the amount of turmeric for flavour.",
            "Add lemon after grinding."
        ],
        "instructions": [
            "Wash, peel and chop turmeric and ginger.",
            "Add green chilli.",
            "Sauté lightly if desired.",
            "Grind the ingredients with salt.",
            "Add fresh lemon juice.",
            "Mix well.",
            "Serve fresh."
        ]
    },

    # 27. Amla
    "Amla Rice": {
        "benefits": [
            "Amla is naturally rich in vitamin C.",
            "Curry leaves add antioxidants.",
            "Green chilli adds flavour and micronutrients."
        ],
        "tips": [
            "Choose firm, bright amla.",
            "Remove seeds before chopping.",
            "Add amla without overcooking to retain freshness."
        ],
        "instructions": [
            "Wash and grate or finely chop amla.",
            "Cook and cool rice.",
            "Prepare tempering with curry leaves and chilli.",
            "Add amla and sauté briefly.",
            "Add rice and salt.",
            "Mix gently.",
            "Serve."
        ]
    },
    "Amla Chutney": {
        "benefits": [
            "Amla provides vitamin C.",
            "Coriander contributes antioxidants.",
            "Green chilli adds flavour and vitamin C."
        ],
        "tips": [
            "Use firm fresh amla.",
            "Remove seeds before grinding.",
            "Add coriander at the end for freshness."
        ],
        "instructions": [
            "Wash and deseed amla.",
            "Chop amla and green chilli.",
            "Add coriander.",
            "Grind with salt.",
            "Add a little water if required.",
            "Blend to the desired consistency.",
            "Serve fresh."
        ]
    },
    "Amla Vegetable Salad": {
        "benefits": [
            "Amla provides vitamin C.",
            "Carrot provides beta-carotene.",
            "Cucumber provides hydration."
        ],
        "tips": [
            "Use fresh, firm amla.",
            "Slice thinly to reduce its natural sourness.",
            "Prepare shortly before serving."
        ],
        "instructions": [
            "Wash and deseed amla.",
            "Thinly slice amla and carrot.",
            "Add cucumber.",
            "Add coriander.",
            "Add lemon only if extra tanginess is desired.",
            "Add salt and toss.",
            "Serve fresh."
        ]
    },

    # 28. Fresh Rosemary
    "Rosemary Potato Roast": {
        "benefits": [
            "Potato provides carbohydrates and potassium.",
            "Rosemary contributes antioxidant plant compounds.",
            "Garlic adds beneficial sulphur compounds."
        ],
        "tips": [
            "Choose firm potatoes and fresh rosemary.",
            "Use rosemary moderately because its flavour is strong.",
            "Roast potatoes until crisp outside and soft inside."
        ],
        "instructions": [
            "Cut potatoes into cubes.",
            "Parboil until slightly tender.",
            "Toss with chopped rosemary and garlic.",
            "Add salt and spices.",
            "Roast or pan-fry until golden.",
            "Turn occasionally for even browning.",
            "Serve hot."
        ]
    },
    "Rosemary Mushroom Fry": {
        "benefits": [
            "Mushrooms provide B vitamins and minerals.",
            "Rosemary provides antioxidants.",
            "Capsicum contributes vitamin C."
        ],
        "tips": [
            "Use firm, fresh mushrooms.",
            "Clean without soaking for a long time.",
            "Cook on high heat to avoid watery texture."
        ],
        "instructions": [
            "Clean and slice mushrooms.",
            "Chop rosemary and capsicum.",
            "Sauté garlic if desired.",
            "Add mushrooms and cook on high heat.",
            "Add capsicum and rosemary.",
            "Season and stir-fry.",
            "Serve hot."
        ]
    },
    "Rosemary Vegetable Roast": {
        "benefits": [
            "Carrot provides beta-carotene.",
            "Zucchini provides fibre and hydration.",
            "Capsicum provides vitamin C."
        ],
        "tips": [
            "Use fresh, firm vegetables.",
            "Cut vegetables into similar sizes.",
            "Add rosemary sparingly."
        ],
        "instructions": [
            "Wash and cut all vegetables.",
            "Add rosemary and seasonings.",
            "Toss evenly.",
            "Roast until lightly browned.",
            "Turn vegetables halfway through.",
            "Cook until tender.",
            "Serve warm."
        ]
    },

    # 29. Italian Basil
    "Basil Tomato Pasta": {
        "benefits": [
            "Tomato provides lycopene and vitamin C.",
            "Basil provides antioxidants.",
            "Capsicum contributes vitamin C and fibre."
        ],
        "tips": [
            "Use ripe tomatoes and fresh basil.",
            "Add basil near the end to preserve its aroma.",
            "Cook pasta until just tender."
        ],
        "instructions": [
            "Cook pasta until al dente.",
            "Sauté chopped tomato and capsicum.",
            "Add seasonings and cook until soft.",
            "Add cooked pasta.",
            "Toss well.",
            "Tear fresh basil over the pasta.",
            "Serve warm."
        ]
    },
    "Basil Vegetable Stir Fry": {
        "benefits": [
            "Zucchini provides fibre and hydration.",
            "Capsicum provides vitamin C.",
            "Mushroom provides B vitamins and minerals."
        ],
        "tips": [
            "Use fresh basil leaves.",
            "Keep vegetables slightly crisp.",
            "Add basil towards the end."
        ],
        "instructions": [
            "Slice zucchini, capsicum and mushrooms.",
            "Heat oil in a wide pan.",
            "Stir-fry mushrooms.",
            "Add zucchini and capsicum.",
            "Season with salt and spices.",
            "Add basil and toss briefly.",
            "Serve hot."
        ]
    },
    "Tomato Basil Soup": {
        "benefits": [
            "Tomatoes provide lycopene and vitamin C.",
            "Carrot provides beta-carotene.",
            "Basil contributes antioxidants."
        ],
        "tips": [
            "Use ripe tomatoes.",
            "Cook vegetables until soft before blending.",
            "Add fresh basil at the end."
        ],
        "instructions": [
            "Chop tomato and carrot.",
            "Cook until both become soft.",
            "Blend into a smooth mixture.",
            "Add water to adjust consistency.",
            "Season with salt and pepper.",
            "Simmer briefly.",
            "Add basil and serve warm."
        ]
    },

    # 30. Neem Leaves
    "Neem Flower/Lemon Rice Style": {
        "benefits": [
            "Neem leaves contain various plant compounds.",
            "Lemon provides vitamin C.",
            "Curry leaves and chilli add antioxidants and flavour."
        ],
        "tips": [
            "Use fresh, clean neem leaves.",
            "Neem has a naturally bitter taste, so use a small quantity.",
            "Add lemon after cooking."
        ],
        "instructions": [
            "Wash and dry the neem leaves.",
            "Prepare tempering with curry leaves and green chilli.",
            "Add neem leaves and sauté briefly.",
            "Add cooked rice and salt.",
            "Mix gently.",
            "Turn off the heat.",
            "Add lemon juice and serve."
        ]
    },
    "Neem Leaf Chutney": {
        "benefits": [
            "Neem leaves provide naturally occurring plant compounds.",
            "Tomato provides vitamin C.",
            "Green chilli adds antioxidants."
        ],
        "tips": [
            "Use neem leaves sparingly because of their bitterness.",
            "Roast lightly to balance the flavour.",
            "Add tomato to soften the bitterness."
        ],
        "instructions": [
            "Wash neem leaves thoroughly.",
            "Sauté neem leaves, tomato and green chilli.",
            "Cook until tomato softens.",
            "Cool the mixture.",
            "Grind with salt.",
            "Adjust consistency.",
            "Serve in small portions."
        ]
    },
    "Neem Leaf Vegetable Mix": {
        "benefits": [
            "Neem leaves provide plant compounds.",
            "Tomato provides antioxidants.",
            "Onion contributes fibre."
        ],
        "tips": [
            "Use a small quantity of neem leaves.",
            "Choose fresh onions and ripe tomatoes.",
            "Avoid overcooking the neem leaves."
        ],
        "instructions": [
            "Wash and chop the vegetables.",
            "Sauté onion.",
            "Add tomato and cook until soft.",
            "Add a small quantity of neem leaves.",
            "Add salt and spices.",
            "Stir-fry briefly.",
            "Serve as a small side dish."
        ]
    },

    # 31. Spinach
    "Spinach Dal": {
        "benefits": [
            "Spinach provides folate, iron and fibre.",
            "Dal provides plant-based protein.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Choose bright green, fresh spinach.",
            "Wash leaves thoroughly to remove soil.",
            "Avoid overcooking to retain colour."
        ],
        "instructions": [
            "Wash and chop spinach.",
            "Cook dal until soft.",
            "Sauté onion and tomato.",
            "Add spinach and cook until wilted.",
            "Add cooked dal and spices.",
            "Simmer for a few minutes.",
            "Serve warm."
        ]
    },
    "Palak Paneer Style Curry": {
        "benefits": [
            "Spinach provides folate, fibre and antioxidants.",
            "Tomato adds vitamin C.",
            "Paneer, when used, provides protein and calcium."
        ],
        "tips": [
            "Use fresh, bright green spinach.",
            "Blanch spinach briefly before blending if desired.",
            "Avoid overcooking the spinach."
        ],
        "instructions": [
            "Wash and blanch spinach briefly.",
            "Blend into a smooth puree.",
            "Sauté onion and tomato.",
            "Add spinach puree and spices.",
            "Simmer gently.",
            "Add paneer if using.",
            "Cook briefly and serve."
        ]
    },
    "Spinach Vegetable Soup": {
        "benefits": [
            "Spinach provides folate and antioxidants.",
            "Carrot adds beta-carotene.",
            "Potato provides carbohydrates and potassium."
        ],
        "tips": [
            "Use fresh spinach leaves.",
            "Chop vegetables evenly.",
            "Blend after vegetables become soft."
        ],
        "instructions": [
            "Wash and chop spinach, carrot and potato.",
            "Sauté the vegetables briefly.",
            "Add water and cook until tender.",
            "Blend until smooth.",
            "Add salt and pepper.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },

    # 32. Drumstick Leaves
    "Murungai Keerai Poriyal": {
        "benefits": [
            "Drumstick leaves provide iron, calcium and antioxidants.",
            "Coconut adds healthy fats.",
            "Onion contributes fibre."
        ],
        "tips": [
            "Choose fresh green leaves.",
            "Remove thick stems.",
            "Wash thoroughly before cooking."
        ],
        "instructions": [
            "Separate leaves from stems.",
            "Wash and drain well.",
            "Sauté onion and seasoning.",
            "Add drumstick leaves.",
            "Cook until wilted.",
            "Add coconut and salt.",
            "Mix and serve."
        ]
    },
    "Drumstick Leaf Dal": {
        "benefits": [
            "Drumstick leaves provide micronutrients and antioxidants.",
            "Dal adds plant-based protein.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Use tender green leaves.",
            "Remove tough stems.",
            "Add leaves after the dal is mostly cooked."
        ],
        "instructions": [
            "Clean and chop drumstick leaves.",
            "Cook dal until soft.",
            "Sauté onion and tomato.",
            "Add drumstick leaves.",
            "Add cooked dal and spices.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },
    "Drumstick Leaf Soup": {
        "benefits": [
            "Drumstick leaves provide iron, calcium and antioxidants.",
            "Carrot provides beta-carotene.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Use fresh leaves.",
            "Wash thoroughly.",
            "Avoid prolonged boiling."
        ],
        "instructions": [
            "Clean drumstick leaves.",
            "Chop carrot and tomato.",
            "Cook vegetables until tender.",
            "Add drumstick leaves.",
            "Blend if a smooth soup is preferred.",
            "Season with salt and pepper.",
            "Serve warm."
        ]
    },

    # 33. Fenugreek Leaves
    "Methi Dal": {
        "benefits": [
            "Methi leaves provide fibre and antioxidants.",
            "Dal provides plant protein.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Choose fresh green methi leaves.",
            "Remove thick stems.",
            "Wash thoroughly to remove soil."
        ],
        "instructions": [
            "Clean and chop methi.",
            "Cook dal until soft.",
            "Sauté onion and tomato.",
            "Add methi and cook until wilted.",
            "Add cooked dal and spices.",
            "Simmer for a few minutes.",
            "Serve warm."
        ]
    },
    "Methi Potato Curry": {
        "benefits": [
            "Methi contributes fibre and plant compounds.",
            "Potato provides energy and potassium.",
            "Tomato adds antioxidants."
        ],
        "tips": [
            "Use fresh methi leaves.",
            "Boil potato only until tender.",
            "Cook methi briefly to retain flavour."
        ],
        "instructions": [
            "Clean and chop methi.",
            "Peel and cube potatoes.",
            "Sauté tomato and spices.",
            "Add potatoes.",
            "Add methi and salt.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },
    "Methi Vegetable Stir Fry": {
        "benefits": [
            "Methi provides fibre and antioxidants.",
            "Carrot provides beta-carotene.",
            "Beans provide fibre."
        ],
        "tips": [
            "Use fresh methi.",
            "Remove tough stems.",
            "Cook vegetables until tender-crisp."
        ],
        "instructions": [
            "Clean and chop methi.",
            "Chop carrot, beans and onion.",
            "Sauté onion.",
            "Add carrot and beans.",
            "Add methi and seasonings.",
            "Stir-fry until cooked.",
            "Serve warm."
        ]
    },

    # 34. Green Amaranthus
    "Green Amaranthus Poriyal": {
        "benefits": [
            "Amaranthus provides fibre and plant nutrients.",
            "Coconut provides healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Choose fresh, bright green leaves.",
            "Remove tough stems.",
            "Wash thoroughly."
        ],
        "instructions": [
            "Clean and chop amaranthus.",
            "Sauté onion and seasoning.",
            "Add greens.",
            "Add salt and turmeric.",
            "Cook until wilted.",
            "Add coconut.",
            "Mix and serve."
        ]
    },
    "Amaranthus Dal": {
        "benefits": [
            "Amaranthus provides fibre and micronutrients.",
            "Dal provides plant protein.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Use tender leaves.",
            "Wash thoroughly.",
            "Add greens near the end of cooking."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop amaranthus.",
            "Sauté onion and tomato.",
            "Add amaranthus.",
            "Add cooked dal and spices.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },
    "Amaranthus Kootu": {
        "benefits": [
            "Amaranthus provides fibre and micronutrients.",
            "Carrot adds beta-carotene.",
            "Moong dal provides plant protein."
        ],
        "tips": [
            "Use fresh leaves.",
            "Remove thick stems.",
            "Avoid overcooking the greens."
        ],
        "instructions": [
            "Cook moong dal.",
            "Clean and chop amaranthus and carrot.",
            "Cook vegetables until tender.",
            "Add dal.",
            "Season with salt and spices.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },

    # 35. Red Amaranthus
    "Red Keerai Poriyal": {
        "benefits": [
            "Red amaranthus contains antioxidants.",
            "Coconut adds healthy fats.",
            "Onion provides fibre."
        ],
        "tips": [
            "Choose bright, fresh leaves.",
            "Wash thoroughly.",
            "Cook briefly to retain colour and texture."
        ],
        "instructions": [
            "Clean and chop red amaranthus.",
            "Sauté onion and seasoning.",
            "Add greens.",
            "Add salt and turmeric.",
            "Cook until wilted.",
            "Add coconut.",
            "Serve warm."
        ]
    },
    "Red Keerai Dal": {
        "benefits": [
            "Red amaranthus provides antioxidants and fibre.",
            "Dal provides plant protein.",
            "Tomato adds vitamin C."
        ],
        "tips": [
            "Use tender leaves.",
            "Remove tough stems.",
            "Add greens after dal is cooked."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop red amaranthus.",
            "Sauté onion and tomato.",
            "Add greens and cook briefly.",
            "Add dal and spices.",
            "Simmer.",
            "Serve hot."
        ]
    },
    "Red Keerai Kootu": {
        "benefits": [
            "Red amaranthus provides antioxidants.",
            "Carrot provides beta-carotene.",
            "Moong dal provides plant protein."
        ],
        "tips": [
            "Use fresh red amaranthus.",
            "Wash thoroughly.",
            "Do not overcook the leaves."
        ],
        "instructions": [
            "Cook moong dal.",
            "Chop greens and carrot.",
            "Cook vegetables until tender.",
            "Add cooked dal.",
            "Add salt and spices.",
            "Simmer until combined.",
            "Serve warm."
        ]
    },

    # 36. Green Lettuce
    "Lettuce Salad": {
        "benefits": [
            "Lettuce provides hydration and fibre.",
            "Cucumber adds water content.",
            "Carrot and tomato add antioxidants."
        ],
        "tips": [
            "Choose crisp, bright green leaves.",
            "Wash and dry thoroughly.",
            "Chill before serving for extra freshness."
        ],
        "instructions": [
            "Wash lettuce leaves.",
            "Chop cucumber, carrot and tomato.",
            "Tear lettuce into bite-sized pieces.",
            "Combine all vegetables.",
            "Add lemon juice and salt.",
            "Toss gently.",
            "Serve immediately."
        ]
    },
    "Lettuce Stir Fry": {
        "benefits": [
            "Lettuce provides fibre and hydration.",
            "Capsicum provides vitamin C.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Use crisp lettuce.",
            "Cook very briefly.",
            "Keep lettuce slightly crunchy."
        ],
        "instructions": [
            "Wash and roughly chop lettuce.",
            "Slice carrot and capsicum.",
            "Stir-fry carrot and capsicum.",
            "Add lettuce.",
            "Season with salt and spices.",
            "Toss for a short time.",
            "Serve immediately."
        ]
    },
    "Lettuce Wrap": {
        "benefits": [
            "Lettuce provides hydration and fibre.",
            "Cucumber and carrot add vitamins.",
            "Capsicum contributes vitamin C."
        ],
        "tips": [
            "Choose large, intact lettuce leaves.",
            "Wash and dry leaves thoroughly.",
            "Keep filling fresh and crunchy."
        ],
        "instructions": [
            "Separate and wash lettuce leaves.",
            "Slice cucumber, carrot and capsicum.",
            "Place vegetables inside each leaf.",
            "Add preferred seasoning.",
            "Fold the sides inward.",
            "Roll gently.",
            "Serve immediately."
        ]
    },

    # 37. French Beans
    "Beans Poriyal": {
        "benefits": [
            "Beans provide fibre and folate.",
            "Coconut adds healthy fats.",
            "A simple vegetable side dish."
        ],
        "tips": [
            "Choose firm, bright green beans.",
            "Snap off the ends and remove strings if needed.",
            "Cook until tender-crisp."
        ],
        "instructions": [
            "Wash and chop beans.",
            "Add seasoning to hot oil.",
            "Add beans and salt.",
            "Sprinkle a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Mix and serve."
        ]
    },
    "Beans Carrot Fry": {
        "benefits": [
            "Beans provide fibre.",
            "Carrot provides beta-carotene.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Use crisp beans and carrots.",
            "Cut both into similar sizes.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Chop beans, carrot and onion.",
            "Sauté onion.",
            "Add beans and carrot.",
            "Add salt and spices.",
            "Sprinkle water and cover.",
            "Cook until tender.",
            "Serve hot."
        ]
    },
    "Beans Peas Curry": {
        "benefits": [
            "Beans provide fibre.",
            "Green peas add plant protein.",
            "Tomato provides vitamin C."
        ],
        "tips": [
            "Use fresh, crisp beans.",
            "Use bright green peas.",
            "Cook vegetables until just tender."
        ],
        "instructions": [
            "Chop beans and tomato.",
            "Sauté tomato with spices.",
            "Add beans and peas.",
            "Add salt and water.",
            "Cover and cook.",
            "Simmer until vegetables are tender.",
            "Serve warm."
        ]
    },

    # 38. Broad Beans
    "Avarakkai Poriyal": {
        "benefits": [
            "Broad beans provide fibre and plant protein.",
            "Coconut provides healthy fats.",
            "A nutritious everyday side dish."
        ],
        "tips": [
            "Choose tender, bright green pods.",
            "Remove strings if present.",
            "Slice evenly."
        ],
        "instructions": [
            "Wash and chop broad beans.",
            "Prepare tempering.",
            "Add beans and salt.",
            "Add a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Serve."
        ]
    },
    "Avarakkai Sambar": {
        "benefits": [
            "Broad beans provide fibre.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Choose tender pods.",
            "Cut into small pieces.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop broad beans.",
            "Sauté onion and tomato.",
            "Add beans and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper.",
            "Serve."
        ]
    },
    "Broad Beans Kootu": {
        "benefits": [
            "Broad beans provide fibre and plant protein.",
            "Carrot provides beta-carotene.",
            "Moong dal adds additional protein."
        ],
        "tips": [
            "Use tender broad beans.",
            "Cut evenly.",
            "Cook until soft but not mushy."
        ],
        "instructions": [
            "Cook moong dal.",
            "Chop broad beans and carrot.",
            "Cook vegetables with spices.",
            "Add dal.",
            "Add salt and required water.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },

    # 39. Cluster Beans
    "Kothavarangai Poriyal": {
        "benefits": [
            "Cluster beans are rich in fibre.",
            "Onion provides antioxidants.",
            "Coconut adds healthy fats."
        ],
        "tips": [
            "Choose tender green cluster beans.",
            "Remove the ends and strings.",
            "Slice into small pieces."
        ],
        "instructions": [
            "Wash and chop cluster beans.",
            "Sauté onion.",
            "Add beans and salt.",
            "Add a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Mix and serve."
        ]
    },
    "Cluster Beans Sambar": {
        "benefits": [
            "Cluster beans provide fibre.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use tender cluster beans.",
            "Remove strings before cooking.",
            "Cook until soft but not mushy."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop cluster beans.",
            "Sauté onion and tomato.",
            "Add beans and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper."
        ]
    },
    "Cluster Beans Curry": {
        "benefits": [
            "Cluster beans provide dietary fibre.",
            "Potato provides energy and potassium.",
            "Tomato adds antioxidants."
        ],
        "tips": [
            "Choose fresh, tender beans.",
            "Cut potato and beans evenly.",
            "Avoid excessive water."
        ],
        "instructions": [
            "Chop cluster beans and potato.",
            "Sauté tomato and spices.",
            "Add potato and beans.",
            "Add salt and water.",
            "Cover and cook until tender.",
            "Roast briefly if needed.",
            "Serve hot."
        ]
    },

    # 40. Cowpea Beans
    "Karamani Poriyal": {
        "benefits": [
            "Cowpea provides fibre and plant protein.",
            "Coconut adds healthy fats.",
            "Onion provides antioxidants."
        ],
        "tips": [
            "Choose fresh, firm cowpea beans.",
            "Remove ends before chopping.",
            "Cook until tender."
        ],
        "instructions": [
            "Wash and chop cowpea beans.",
            "Sauté onion and seasoning.",
            "Add beans and salt.",
            "Sprinkle water and cover.",
            "Cook until tender.",
            "Add coconut.",
            "Serve."
        ]
    },
    "Karamani Kuzhambu": {
        "benefits": [
            "Cowpea provides plant protein and fibre.",
            "Tomato provides vitamin C.",
            "Small onion adds antioxidants."
        ],
        "tips": [
            "Use fresh beans.",
            "Cut beans evenly.",
            "Simmer the gravy until flavours combine."
        ],
        "instructions": [
            "Chop cowpea beans.",
            "Sauté small onion and tomato.",
            "Add beans and kuzhambu spices.",
            "Add water and salt.",
            "Bring to a boil.",
            "Simmer until beans are tender.",
            "Serve with rice."
        ]
    },
    "Karamani Vegetable Curry": {
        "benefits": [
            "Cowpea provides plant protein.",
            "Potato provides energy and potassium.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Use fresh cowpea.",
            "Cut potato and carrot evenly.",
            "Cook vegetables until tender."
        ],
        "instructions": [
            "Chop all vegetables.",
            "Sauté onion and tomato.",
            "Add cowpea, potato and carrot.",
            "Add spices and salt.",
            "Add water and cover.",
            "Cook until tender.",
            "Serve hot."
        ]
    },

    # 41. Green Peas
    "Peas Masala": {
        "benefits": [
            "Green peas provide plant protein and fibre.",
            "Tomato provides vitamin C.",
            "Onion contributes antioxidants."
        ],
        "tips": [
            "Choose bright green peas.",
            "Fresh or frozen peas can be used.",
            "Cook until tender without becoming mushy."
        ],
        "instructions": [
            "Sauté chopped onion.",
            "Add tomato and cook until soft.",
            "Add green peas.",
            "Add masala spices and salt.",
            "Add water and simmer.",
            "Cook until peas are tender.",
            "Serve warm."
        ]
    },
    "Peas Potato Curry": {
        "benefits": [
            "Peas provide fibre and plant protein.",
            "Potato provides carbohydrates and potassium.",
            "Tomato adds antioxidants."
        ],
        "tips": [
            "Use firm potatoes and fresh peas.",
            "Cut potatoes evenly.",
            "Avoid overcooking the peas."
        ],
        "instructions": [
            "Cube the potatoes.",
            "Sauté tomato and spices.",
            "Add potatoes and peas.",
            "Add salt and water.",
            "Cover and cook.",
            "Simmer until potatoes are tender.",
            "Serve hot."
        ]
    },
    "Vegetable Peas Pulao": {
        "benefits": [
            "Green peas provide fibre and plant protein.",
            "Carrot and beans add vitamins and fibre.",
            "Rice provides carbohydrates for energy."
        ],
        "tips": [
            "Use fresh or frozen peas.",
            "Rinse rice before cooking.",
            "Cut vegetables evenly."
        ],
        "instructions": [
            "Wash the rice.",
            "Sauté onion and whole spices.",
            "Add carrot, beans and peas.",
            "Add rice and mix gently.",
            "Add measured water and salt.",
            "Cook until rice is tender.",
            "Rest for a few minutes and serve."
        ]
    },

    # 42. Drumstick
    "Drumstick Sambar": {
        "benefits": [
            "Drumstick provides fibre and minerals.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Choose firm green drumsticks.",
            "Cut into medium-sized pieces.",
            "Do not overcook until the pieces completely break apart."
        ],
        "instructions": [
            "Cut and wash drumstick pieces.",
            "Cook dal until soft.",
            "Sauté tomato and small onion.",
            "Add drumstick and spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper.",
            "Serve hot."
        ]
    },
    "Drumstick Poriyal": {
        "benefits": [
            "Drumstick provides fibre and micronutrients.",
            "Coconut adds healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Select fresh, firm drumsticks.",
            "Cut into manageable pieces.",
            "Cook until tender but retain some texture."
        ],
        "instructions": [
            "Wash and cut drumstick.",
            "Sauté onion.",
            "Add drumstick and salt.",
            "Add a little water.",
            "Cover and cook.",
            "Add coconut.",
            "Mix and serve."
        ]
    },
    "Drumstick Vegetable Curry": {
        "benefits": [
            "Drumstick provides fibre and minerals.",
            "Potato provides energy.",
            "Carrot contributes beta-carotene."
        ],
        "tips": [
            "Use fresh drumstick.",
            "Cut vegetables evenly.",
            "Add tomato for balanced flavour."
        ],
        "instructions": [
            "Cut drumstick, potato and carrot.",
            "Sauté tomato.",
            "Add vegetables and spices.",
            "Add salt and water.",
            "Cover and cook until tender.",
            "Stir gently.",
            "Serve hot."
        ]
    },

    # 43. Bitter Gourd
    "Bitter Gourd Fry": {
        "benefits": [
            "Bitter gourd provides fibre and vitamin C.",
            "Onion provides antioxidants.",
            "A vegetable-rich side dish."
        ],
        "tips": [
            "Choose firm, green bitter gourds.",
            "Remove seeds if a milder taste is preferred.",
            "Thin slices cook more evenly."
        ],
        "instructions": [
            "Wash and slice bitter gourd.",
            "Remove seeds if desired.",
            "Sauté onion.",
            "Add bitter gourd and spices.",
            "Cook until tender.",
            "Roast until lightly crisp.",
            "Serve hot."
        ]
    },
    "Pavakkai Pitla": {
        "benefits": [
            "Bitter gourd provides fibre.",
            "Tomato provides antioxidants.",
            "Small onion adds fibre and flavour."
        ],
        "tips": [
            "Choose fresh, firm bitter gourd.",
            "Remove seeds for reduced bitterness.",
            "Balance bitterness with tomato and spices."
        ],
        "instructions": [
            "Slice bitter gourd.",
            "Sauté until lightly browned.",
            "Cook tomato and small onion.",
            "Add spices and cooked bitter gourd.",
            "Add cooked dal if using.",
            "Simmer until flavours combine.",
            "Serve with rice."
        ]
    },
    "Bitter Gourd Masala": {
        "benefits": [
            "Bitter gourd provides fibre and vitamin C.",
            "Tomato provides antioxidants.",
            "Onion adds plant compounds."
        ],
        "tips": [
            "Use fresh bitter gourd.",
            "Thinly slice for better roasting.",
            "Lightly salt before cooking if you prefer reduced bitterness."
        ],
        "instructions": [
            "Wash and slice bitter gourd.",
            "Sauté onion.",
            "Add tomato and cook until soft.",
            "Add bitter gourd and spices.",
            "Add salt and cook covered.",
            "Roast until tender.",
            "Serve hot."
        ]
    },

    # 44. Bottle Gourd
    "Bottle Gourd Kootu": {
        "benefits": [
            "Bottle gourd provides hydration and fibre.",
            "Moong dal provides plant protein.",
            "Tomato adds antioxidants."
        ],
        "tips": [
            "Choose firm bottle gourd with smooth skin.",
            "Check for freshness before cutting.",
            "Avoid overcooking because it softens quickly."
        ],
        "instructions": [
            "Peel and cube bottle gourd.",
            "Cook moong dal until soft.",
            "Cook bottle gourd with tomato.",
            "Add cooked dal.",
            "Add spices and salt.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Bottle Gourd Poriyal": {
        "benefits": [
            "Bottle gourd has high water content.",
            "Coconut adds healthy fats.",
            "Onion provides fibre."
        ],
        "tips": [
            "Choose firm, fresh bottle gourd.",
            "Remove thick skin and seeds if necessary.",
            "Use minimal water because the vegetable releases moisture."
        ],
        "instructions": [
            "Peel and chop bottle gourd.",
            "Sauté onion and seasoning.",
            "Add bottle gourd and salt.",
            "Cover and cook in its own moisture.",
            "Add coconut.",
            "Mix and cook briefly.",
            "Serve."
        ]
    },
    "Bottle Gourd Sambar": {
        "benefits": [
            "Bottle gourd provides hydration and fibre.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use fresh bottle gourd.",
            "Cut into medium pieces.",
            "Avoid overcooking the vegetable."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop bottle gourd, tomato and onion.",
            "Sauté onion and tomato.",
            "Add bottle gourd and sambar spices.",
            "Cook until tender.",
            "Add dal and simmer.",
            "Temper and serve."
        ]
    },

    # 45. Ridge Gourd
    "Ridge Gourd Chutney": {
        "benefits": [
            "Ridge gourd provides fibre and hydration.",
            "Tomato provides vitamin C.",
            "Green chilli adds antioxidants."
        ],
        "tips": [
            "Choose firm ridge gourds.",
            "Peel the ridges lightly.",
            "Remove very mature seeds if necessary."
        ],
        "instructions": [
            "Peel and chop ridge gourd.",
            "Sauté ridge gourd, tomato and chilli.",
            "Cook until soft.",
            "Cool the mixture.",
            "Grind with salt.",
            "Adjust consistency.",
            "Serve with dosa or rice."
        ]
    },
    "Ridge Gourd Kootu": {
        "benefits": [
            "Ridge gourd provides fibre and hydration.",
            "Moong dal provides plant protein.",
            "Carrot adds beta-carotene."
        ],
        "tips": [
            "Choose tender ridge gourd.",
            "Remove thick skin.",
            "Avoid adding too much water."
        ],
        "instructions": [
            "Peel and chop ridge gourd.",
            "Chop carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Simmer until combined.",
            "Serve warm."
        ]
    },
    "Ridge Gourd Poriyal": {
        "benefits": [
            "Ridge gourd provides fibre and water.",
            "Coconut provides healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Use tender ridge gourd.",
            "Peel only the hard ridges.",
            "Cook with minimal water."
        ],
        "instructions": [
            "Peel and chop ridge gourd.",
            "Sauté onion.",
            "Add ridge gourd and salt.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Mix well.",
            "Serve."
        ]
    },

    # 46. Snake Gourd
    "Snake Gourd Poriyal": {
        "benefits": [
            "Snake gourd provides hydration and fibre.",
            "Coconut adds healthy fats.",
            "Onion contributes antioxidants."
        ],
        "tips": [
            "Choose firm, fresh snake gourd.",
            "Remove seeds if mature.",
            "Slice evenly."
        ],
        "instructions": [
            "Wash and chop snake gourd.",
            "Sauté onion and seasoning.",
            "Add snake gourd.",
            "Add salt and a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Serve."
        ]
    },
    "Snake Gourd Kootu": {
        "benefits": [
            "Snake gourd provides fibre and hydration.",
            "Moong dal adds plant protein.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Choose tender snake gourd.",
            "Remove mature seeds.",
            "Keep the kootu thick."
        ],
        "instructions": [
            "Chop snake gourd and carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Add salt.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Snake Gourd Sambar": {
        "benefits": [
            "Snake gourd provides fibre.",
            "Tomato provides vitamin C.",
            "Dal contributes plant protein."
        ],
        "tips": [
            "Use tender snake gourd.",
            "Remove mature seeds.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Cook dal.",
            "Chop snake gourd.",
            "Sauté onion and tomato.",
            "Add snake gourd and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper.",
            "Serve."
        ]
    },

    # 47. Ash Gourd
    "Ash Gourd Mor Kuzhambu": {
        "benefits": [
            "Ash gourd provides hydration and fibre.",
            "Green chilli adds vitamin C and flavour.",
            "Coriander adds antioxidants."
        ],
        "tips": [
            "Choose firm ash gourd with fresh flesh.",
            "Remove seeds and thick skin.",
            "Cook gently until just tender."
        ],
        "instructions": [
            "Peel and cube ash gourd.",
            "Cook until tender.",
            "Prepare the curd-based mixture with spices.",
            "Add cooked ash gourd.",
            "Heat gently without vigorous boiling.",
            "Add coriander and green chilli.",
            "Serve warm."
        ]
    },
    "Ash Gourd Kootu": {
        "benefits": [
            "Ash gourd provides hydration.",
            "Moong dal adds plant protein.",
            "Coconut provides healthy fats."
        ],
        "tips": [
            "Use fresh ash gourd.",
            "Cut into even cubes.",
            "Avoid excessive water."
        ],
        "instructions": [
            "Peel and cube ash gourd.",
            "Cook moong dal.",
            "Cook ash gourd until tender.",
            "Add dal and coconut-based mixture.",
            "Add salt and spices.",
            "Simmer gently.",
            "Serve warm."
        ]
    },
    "Ash Gourd Sambar": {
        "benefits": [
            "Ash gourd provides hydration and fibre.",
            "Tomato adds antioxidants.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use firm ash gourd.",
            "Remove seeds before cooking.",
            "Add the vegetable toward the later stage to avoid overcooking."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop ash gourd, tomato and onion.",
            "Sauté onion and tomato.",
            "Add ash gourd and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper."
        ]
    },

    # 48. Ivy Gourd
    "Kovakkai Fry": {
        "benefits": [
            "Ivy gourd provides fibre.",
            "Onion provides antioxidants.",
            "A simple vegetable side dish."
        ],
        "tips": [
            "Choose firm, bright green ivy gourds.",
            "Slice evenly.",
            "Cook uncovered initially to reduce moisture."
        ],
        "instructions": [
            "Wash and slice ivy gourd.",
            "Sauté onion.",
            "Add ivy gourd.",
            "Add spices and salt.",
            "Cook until tender.",
            "Roast until lightly crisp.",
            "Serve hot."
        ]
    },
    "Kovakkai Poriyal": {
        "benefits": [
            "Ivy gourd provides fibre.",
            "Coconut provides healthy fats.",
            "Green chilli adds vitamin C."
        ],
        "tips": [
            "Choose firm, fresh ivy gourd.",
            "Slice thinly.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Wash and slice ivy gourd.",
            "Sauté green chilli and seasoning.",
            "Add ivy gourd and salt.",
            "Cook until tender.",
            "Add coconut.",
            "Mix well.",
            "Serve."
        ]
    },
    "Kovakkai Masala": {
        "benefits": [
            "Ivy gourd provides fibre.",
            "Tomato provides antioxidants.",
            "Onion adds plant compounds."
        ],
        "tips": [
            "Use fresh ivy gourd.",
            "Slice into similar sizes.",
            "Cook until tender with lightly roasted edges."
        ],
        "instructions": [
            "Slice ivy gourd.",
            "Sauté onion.",
            "Add tomato and spices.",
            "Add ivy gourd.",
            "Add salt and a little water.",
            "Cover and cook.",
            "Roast briefly and serve."
        ]
    },

    # 49. Pointed Gourd
    "Parwal Fry": {
        "benefits": [
            "Pointed gourd provides fibre.",
            "Onion adds antioxidants.",
            "A light vegetable side dish."
        ],
        "tips": [
            "Choose firm, green pointed gourds.",
            "Wash and slice evenly.",
            "Remove mature seeds if necessary."
        ],
        "instructions": [
            "Wash and slice pointed gourd.",
            "Sauté onion.",
            "Add pointed gourd.",
            "Add salt and spices.",
            "Cook until tender.",
            "Roast until lightly crisp.",
            "Serve."
        ]
    },
    "Parwal Masala": {
        "benefits": [
            "Pointed gourd provides fibre.",
            "Tomato provides vitamin C.",
            "Green chilli adds flavour and antioxidants."
        ],
        "tips": [
            "Use fresh, firm pointed gourd.",
            "Cut evenly.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Slice pointed gourd.",
            "Sauté tomato and green chilli.",
            "Add spices.",
            "Add pointed gourd and salt.",
            "Add a little water.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },
    "Parwal Potato Curry": {
        "benefits": [
            "Pointed gourd provides fibre.",
            "Potato provides carbohydrates and potassium.",
            "Tomato provides antioxidants."
        ],
        "tips": [
            "Choose firm pointed gourd.",
            "Cut potato and gourd evenly.",
            "Cook until both are tender."
        ],
        "instructions": [
            "Chop pointed gourd and potato.",
            "Sauté tomato and spices.",
            "Add potato and pointed gourd.",
            "Add salt and water.",
            "Cover and cook.",
            "Stir gently until tender.",
            "Serve hot."
        ]
    },

    # 50. Chow Chow
    "Chow Chow Kootu": {
        "benefits": [
            "Chow chow provides hydration and fibre.",
            "Moong dal provides plant protein.",
            "Carrot contributes beta-carotene."
        ],
        "tips": [
            "Choose firm, smooth chow chow.",
            "Peel and remove the core.",
            "Cut evenly for uniform cooking."
        ],
        "instructions": [
            "Peel and cube chow chow.",
            "Chop carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Chow Chow Poriyal": {
        "benefits": [
            "Chow chow provides hydration and fibre.",
            "Coconut adds healthy fats.",
            "Onion provides antioxidants."
        ],
        "tips": [
            "Choose firm chow chow.",
            "Remove the core.",
            "Avoid adding excess water."
        ],
        "instructions": [
            "Peel and chop chow chow.",
            "Sauté onion and seasoning.",
            "Add chow chow and salt.",
            "Cover and cook.",
            "Add coconut.",
            "Mix and cook briefly.",
            "Serve."
        ]
    },
    "Chow Chow Sambar": {
        "benefits": [
            "Chow chow provides fibre and hydration.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use fresh chow chow.",
            "Cut into medium pieces.",
            "Cook until tender without overcooking."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop chow chow, tomato and onion.",
            "Sauté onion and tomato.",
            "Add chow chow and sambar spices.",
            "Cook until tender.",
            "Add dal and simmer.",
            "Temper and serve."
        ]
    },

    # 51. Green Pumpkin
    "Pumpkin Poriyal": {
        "benefits": [
            "Pumpkin provides fibre and carotenoids.",
            "Coconut provides healthy fats.",
            "Green chilli adds flavour and vitamin C."
        ],
        "tips": [
            "Choose firm pumpkin flesh.",
            "Remove seeds and cut evenly.",
            "Pumpkin cooks quickly, so avoid overcooking."
        ],
        "instructions": [
            "Peel and cube pumpkin.",
            "Prepare seasoning.",
            "Add pumpkin and green chilli.",
            "Add salt and a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Serve."
        ]
    },
    "Pumpkin Kootu": {
        "benefits": [
            "Pumpkin provides carotenoids and fibre.",
            "Moong dal adds plant protein.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Use fresh, firm pumpkin.",
            "Cut pumpkin into equal pieces.",
            "Cook gently to retain its natural sweetness."
        ],
        "instructions": [
            "Cube pumpkin and carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Add salt and coconut mixture.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Pumpkin Sambar": {
        "benefits": [
            "Pumpkin provides carotenoids and fibre.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use fresh pumpkin.",
            "Remove seeds and peel if needed.",
            "Add pumpkin later to prevent overcooking."
        ],
        "instructions": [
            "Cook dal until soft.",
            "Chop pumpkin, tomato and onion.",
            "Sauté onion and tomato.",
            "Add pumpkin and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper."
        ]
    },

    # 52. Pumpkin Yellow – Cut
    "Yellow Pumpkin Sambar": {
        "benefits": [
            "Yellow pumpkin provides carotenoids and fibre.",
            "Tomato provides vitamin C.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Choose firm yellow pumpkin pieces.",
            "Remove seeds and thick skin.",
            "Cook until just tender."
        ],
        "instructions": [
            "Cut pumpkin into even pieces.",
            "Cook dal until soft.",
            "Sauté tomato and onion.",
            "Add pumpkin and sambar spices.",
            "Cook until tender.",
            "Add cooked dal.",
            "Simmer and temper."
        ]
    },

    # 54. Colocasia
    "Seppankizhangu Roast": {
        "benefits": [
            "Colocasia provides carbohydrates and fibre.",
            "Onion adds antioxidants.",
            "A filling vegetable side dish."
        ],
        "tips": [
            "Choose firm, undamaged colocasia.",
            "Cook thoroughly before roasting.",
            "Avoid eating it undercooked."
        ],
        "instructions": [
            "Wash and boil colocasia until tender.",
            "Peel and slice.",
            "Sauté onion.",
            "Add colocasia and spices.",
            "Roast until golden and crisp.",
            "Turn occasionally.",
            "Serve hot."
        ]
    },
    "Seppankizhangu Fry": {
        "benefits": [
            "Colocasia provides energy and fibre.",
            "Green chilli adds flavour.",
            "Curry leaves contribute antioxidants."
        ],
        "tips": [
            "Boil until just tender.",
            "Peel carefully after cooling.",
            "Roast well before serving."
        ],
        "instructions": [
            "Boil and peel colocasia.",
            "Slice into pieces.",
            "Heat oil and add curry leaves.",
            "Add green chilli and colocasia.",
            "Add salt and spices.",
            "Fry until crisp.",
            "Serve hot."
        ]
    },
    "Colocasia Masala": {
        "benefits": [
            "Colocasia provides carbohydrates and fibre.",
            "Tomato provides antioxidants.",
            "Onion adds fibre."
        ],
        "tips": [
            "Cook colocasia thoroughly.",
            "Avoid overboiling.",
            "Roast before adding to the masala."
        ],
        "instructions": [
            "Boil and peel colocasia.",
            "Sauté onion.",
            "Add tomato and spices.",
            "Add colocasia pieces.",
            "Add salt and mix gently.",
            "Cook until coated and lightly roasted.",
            "Serve."
        ]
    },

    # 55. Knol Khol
    "Knol Khol Poriyal": {
        "benefits": [
            "Knol khol provides fibre and vitamin C.",
            "Coconut adds healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Choose firm, smooth knol khol.",
            "Peel the outer layer.",
            "Slice evenly."
        ],
        "instructions": [
            "Peel and chop knol khol.",
            "Sauté onion and seasoning.",
            "Add knol khol and salt.",
            "Sprinkle a little water.",
            "Cover and cook until tender.",
            "Add coconut.",
            "Serve."
        ]
    },
    "Knol Khol Kootu": {
        "benefits": [
            "Knol khol provides fibre and vitamin C.",
            "Moong dal provides plant protein.",
            "Carrot adds beta-carotene."
        ],
        "tips": [
            "Choose firm knol khol.",
            "Peel thoroughly.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Peel and chop knol khol.",
            "Chop carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Simmer until creamy.",
            "Serve warm."
        ]
    },
    "Knol Khol Sambar": {
        "benefits": [
            "Knol khol provides vitamin C and fibre.",
            "Tomato provides antioxidants.",
            "Dal provides plant protein."
        ],
        "tips": [
            "Use firm knol khol.",
            "Cut into small pieces.",
            "Cook until just tender."
        ],
        "instructions": [
            "Cook dal.",
            "Peel and chop knol khol.",
            "Sauté onion and tomato.",
            "Add knol khol and sambar spices.",
            "Cook until tender.",
            "Add dal.",
            "Simmer and temper."
        ]
    },

    # 56. Banana Stem
    "Vazhaithandu Poriyal": {
        "benefits": [
            "Banana stem provides fibre.",
            "Coconut provides healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Choose a fresh, firm banana stem.",
            "Remove the outer layers.",
            "Slice finely and remove visible fibres."
        ],
        "instructions": [
            "Peel the outer layers.",
            "Slice the inner stem thinly.",
            "Remove fibres while cutting.",
            "Sauté onion and seasoning.",
            "Add banana stem and salt.",
            "Cook until tender.",
            "Add coconut and serve."
        ]
    },
    "Banana Stem Kootu": {
        "benefits": [
            "Banana stem provides dietary fibre.",
            "Moong dal provides plant protein.",
            "Carrot adds beta-carotene."
        ],
        "tips": [
            "Use fresh banana stem.",
            "Remove fibres carefully.",
            "Cut finely for faster cooking."
        ],
        "instructions": [
            "Clean and finely chop banana stem.",
            "Chop carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add dal and spices.",
            "Simmer until combined.",
            "Serve warm."
        ]
    },
    "Banana Stem Salad": {
        "benefits": [
            "Banana stem provides fibre.",
            "Cucumber provides hydration.",
            "Carrot provides beta-carotene.",
            "Lemon provides vitamin C."
        ],
        "tips": [
            "Use fresh banana stem.",
            "Slice finely.",
            "Add lemon immediately before serving."
        ],
        "instructions": [
            "Clean and finely slice banana stem.",
            "Remove visible fibres.",
            "Add cucumber and carrot.",
            "Add coriander.",
            "Squeeze fresh lemon juice.",
            "Add salt.",
            "Toss and serve immediately."
        ]
    },

    # 57. Raw Banana
    "Raw Banana Fry": {
        "benefits": [
            "Raw banana provides carbohydrates and fibre.",
            "Onion adds antioxidants.",
            "A filling vegetable side dish."
        ],
        "tips": [
            "Choose firm green raw bananas.",
            "Peel and cut just before cooking.",
            "Soak briefly in water to reduce browning."
        ],
        "instructions": [
            "Peel and slice raw banana.",
            "Sauté onion.",
            "Add banana pieces.",
            "Add turmeric, spices and salt.",
            "Cover and cook until tender.",
            "Roast until lightly crisp.",
            "Serve hot."
        ]
    },
    "Raw Banana Poriyal": {
        "benefits": [
            "Raw banana provides fibre and carbohydrates.",
            "Coconut provides healthy fats.",
            "Green chilli adds vitamin C."
        ],
        "tips": [
            "Use firm green bananas.",
            "Cut evenly.",
            "Do not overcook."
        ],
        "instructions": [
            "Peel and cube raw banana.",
            "Prepare seasoning and green chilli.",
            "Add banana and salt.",
            "Sprinkle water and cover.",
            "Cook until tender.",
            "Add coconut.",
            "Mix and serve."
        ]
    },
    "Raw Banana Masala": {
        "benefits": [
            "Raw banana provides fibre and energy.",
            "Tomato provides antioxidants.",
            "Onion adds fibre."
        ],
        "tips": [
            "Use firm raw bananas.",
            "Cut into similar-sized pieces.",
            "Cook until tender but firm."
        ],
        "instructions": [
            "Peel and cube raw banana.",
            "Sauté onion.",
            "Add tomato and spices.",
            "Add banana pieces.",
            "Add salt and water.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },

    # 58. Raw Papaya
    "Raw Papaya Poriyal": {
        "benefits": [
            "Raw papaya provides fibre and vitamin C.",
            "Coconut provides healthy fats.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Choose firm green papaya.",
            "Peel and remove seeds.",
            "Cut into small, even pieces."
        ],
        "instructions": [
            "Peel and cube raw papaya.",
            "Prepare seasoning.",
            "Add onion and sauté.",
            "Add papaya and salt.",
            "Sprinkle water and cover.",
            "Add coconut once tender.",
            "Serve."
        ]
    },
    "Raw Papaya Kootu": {
        "benefits": [
            "Raw papaya provides fibre.",
            "Moong dal provides plant protein.",
            "Carrot adds beta-carotene."
        ],
        "tips": [
            "Use firm raw papaya.",
            "Remove seeds completely.",
            "Cook until tender but not mushy."
        ],
        "instructions": [
            "Peel and chop raw papaya.",
            "Chop carrot.",
            "Cook moong dal.",
            "Cook vegetables until tender.",
            "Add cooked dal.",
            "Season and simmer.",
            "Serve warm."
        ]
    },
    "Raw Papaya Curry": {
        "benefits": [
            "Raw papaya provides fibre and vitamin C.",
            "Tomato provides antioxidants.",
            "Green chilli adds flavour and vitamin C."
        ],
        "tips": [
            "Choose firm green papaya.",
            "Cut evenly.",
            "Cook until just tender."
        ],
        "instructions": [
            "Peel, deseed and cube papaya.",
            "Sauté tomato and green chilli.",
            "Add spices and salt.",
            "Add papaya.",
            "Add a little water.",
            "Cover and cook until tender.",
            "Serve hot."
        ]
    },

    # 59. Broccoli
    "Broccoli Stir Fry": {
        "benefits": [
            "Broccoli is rich in vitamin C and fibre.",
            "Carrot provides beta-carotene.",
            "Capsicum adds additional vitamin C."
        ],
        "tips": [
            "Choose firm broccoli with compact florets.",
            "Wash thoroughly and cut into small florets.",
            "Avoid overcooking to retain crunch."
        ],
        "instructions": [
            "Cut broccoli into small florets.",
            "Slice carrot and capsicum.",
            "Stir-fry carrot briefly.",
            "Add broccoli and capsicum.",
            "Season with salt and spices.",
            "Cook until tender-crisp.",
            "Serve hot."
        ]
    },
    "Broccoli Soup": {
        "benefits": [
            "Broccoli provides vitamin C and fibre.",
            "Carrot provides beta-carotene.",
            "Potato adds energy and potassium."
        ],
        "tips": [
            "Use fresh green broccoli.",
            "Steam or cook briefly before blending.",
            "Avoid overcooking."
        ],
        "instructions": [
            "Chop broccoli, carrot and potato.",
            "Cook until tender.",
            "Blend until smooth.",
            "Add water to adjust consistency.",
            "Season with salt and pepper.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },
    "Broccoli Vegetable Roast": {
        "benefits": [
            "Broccoli provides fibre and vitamin C.",
            "Mushroom provides B vitamins and minerals.",
            "Zucchini adds hydration and fibre."
        ],
        "tips": [
            "Use firm broccoli and fresh mushrooms.",
            "Cut vegetables into similar sizes.",
            "Roast rather than over-steam for better texture."
        ],
        "instructions": [
            "Cut broccoli and vegetables.",
            "Toss with seasoning.",
            "Arrange evenly on a pan.",
            "Roast until lightly browned.",
            "Turn vegetables halfway.",
            "Cook until tender-crisp.",
            "Serve warm."
        ]
    },

    # 60. Button Mushroom
    "Mushroom Pepper Fry": {
        "benefits": [
            "Mushrooms provide B vitamins and minerals.",
            "Capsicum provides vitamin C.",
            "Onion adds fibre and antioxidants."
        ],
        "tips": [
            "Choose firm mushrooms with a clean surface.",
            "Avoid soaking mushrooms in water.",
            "Cook on high heat to remove excess moisture."
        ],
        "instructions": [
            "Clean and slice mushrooms.",
            "Slice onion and capsicum.",
            "Sauté onion.",
            "Add mushrooms and cook on high heat.",
            "Add capsicum and pepper.",
            "Season with salt.",
            "Toss and serve hot."
        ]
    },
    "Mushroom Masala": {
        "benefits": [
            "Mushrooms provide B vitamins and minerals.",
            "Tomato provides antioxidants.",
            "Onion adds fibre."
        ],
        "tips": [
            "Use fresh, firm mushrooms.",
            "Cook mushrooms before adding excess liquid.",
            "Use ripe tomatoes for better gravy."
        ],
        "instructions": [
            "Clean and slice mushrooms.",
            "Sauté onion.",
            "Add tomato and cook until soft.",
            "Add spices.",
            "Add mushrooms and salt.",
            "Cook until mushrooms are tender.",
            "Serve warm."
        ]
    },
    "Mushroom Vegetable Stir Fry": {
        "benefits": [
            "Mushrooms provide minerals and B vitamins.",
            "Broccoli provides fibre and vitamin C.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Use fresh mushrooms and crisp vegetables.",
            "Cook mushrooms first to remove moisture.",
            "Keep broccoli slightly crunchy."
        ],
        "instructions": [
            "Slice mushrooms and vegetables.",
            "Stir-fry mushrooms on high heat.",
            "Add broccoli.",
            "Add carrot and capsicum.",
            "Season with salt and spices.",
            "Toss until tender-crisp.",
            "Serve immediately."
        ]
    },

    # 61. Baby Corn
    "Baby Corn Manchurian": {
        "benefits": [
            "Baby corn provides fibre and micronutrients.",
            "Capsicum provides vitamin C.",
            "Spring onion adds plant compounds."
        ],
        "tips": [
            "Choose firm, pale-yellow baby corn.",
            "Wash thoroughly.",
            "Keep the coating crisp by serving immediately."
        ],
        "instructions": [
            "Wash and cut baby corn.",
            "Coat with a thick batter.",
            "Fry until crisp.",
            "Stir-fry capsicum and spring onion.",
            "Add the cooked baby corn.",
            "Add the prepared sauce and toss.",
            "Serve hot."
        ]
    },
    "Baby Corn Stir Fry": {
        "benefits": [
            "Baby corn provides fibre.",
            "Carrot provides beta-carotene.",
            "Beans and capsicum add vitamins and fibre."
        ],
        "tips": [
            "Choose firm baby corn.",
            "Slice vegetables evenly.",
            "Stir-fry quickly for a crunchy texture."
        ],
        "instructions": [
            "Slice baby corn and vegetables.",
            "Stir-fry beans and carrot.",
            "Add baby corn.",
            "Add capsicum.",
            "Season with salt and spices.",
            "Cook until tender-crisp.",
            "Serve hot."
        ]
    },
    "Baby Corn Vegetable Soup": {
        "benefits": [
            "Baby corn provides fibre.",
            "Carrot adds beta-carotene.",
            "Mushroom contributes B vitamins and minerals."
        ],
        "tips": [
            "Use fresh baby corn.",
            "Slice mushrooms thinly.",
            "Avoid overcooking the vegetables."
        ],
        "instructions": [
            "Slice baby corn and mushrooms.",
            "Chop carrot.",
            "Sauté the vegetables briefly.",
            "Add water or vegetable stock.",
            "Simmer until tender.",
            "Season with salt and pepper.",
            "Serve warm."
        ]
    },

    # 62. Sweet Corn Cob
    "Corn Masala": {
        "benefits": [
            "Sweet corn provides carbohydrates and fibre.",
            "Capsicum provides vitamin C.",
            "Onion adds antioxidants."
        ],
        "tips": [
            "Choose fresh, plump corn kernels.",
            "Cook corn until tender.",
            "Use fresh capsicum for crunch."
        ],
        "instructions": [
            "Remove corn kernels from the cob.",
            "Cook until tender.",
            "Sauté onion and capsicum.",
            "Add corn and spices.",
            "Add salt and mix well.",
            "Cook briefly.",
            "Serve warm."
        ]
    },
    "Corn Vegetable Soup": {
        "benefits": [
            "Corn provides fibre and carbohydrates.",
            "Carrot provides beta-carotene.",
            "Beans add fibre and micronutrients."
        ],
        "tips": [
            "Use fresh corn kernels.",
            "Cut vegetables finely for even cooking.",
            "Avoid overcooking the corn."
        ],
        "instructions": [
            "Remove corn kernels.",
            "Chop carrot and beans.",
            "Cook vegetables in water or stock.",
            "Add corn.",
            "Simmer until tender.",
            "Season with salt and pepper.",
            "Serve hot."
        ]
    },
    "Corn Chaat": {
        "benefits": [
            "Corn provides fibre and energy.",
            "Tomato provides antioxidants.",
            "Lemon provides vitamin C."
        ],
        "tips": [
            "Use freshly cooked sweet corn.",
            "Add lemon just before serving.",
            "Keep vegetables crisp."
        ],
        "instructions": [
            "Cook corn kernels until tender.",
            "Add chopped tomato and onion.",
            "Add coriander.",
            "Add chaat spices and salt.",
            "Squeeze fresh lemon juice.",
            "Toss well.",
            "Serve immediately."
        ]
    },

    # 63. Green Capsicum
    "Capsicum Masala": {
        "benefits": [
            "Capsicum is rich in vitamin C.",
            "Tomato provides lycopene.",
            "Onion contributes fibre and antioxidants."
        ],
        "tips": [
            "Choose firm, glossy capsicums.",
            "Remove seeds before cutting.",
            "Cook lightly to retain crunch."
        ],
        "instructions": [
            "Chop capsicum, onion and tomato.",
            "Sauté onion.",
            "Add tomato and spices.",
            "Add capsicum.",
            "Add salt and cook briefly.",
            "Keep capsicum slightly crunchy.",
            "Serve hot."
        ]
    },
    "Capsicum Rice": {
        "benefits": [
            "Capsicum provides vitamin C.",
            "Carrot adds beta-carotene.",
            "Green peas provide fibre and plant protein."
        ],
        "tips": [
            "Use cooled cooked rice.",
            "Choose crisp capsicum.",
            "Stir-fry vegetables quickly."
        ],
        "instructions": [
            "Cook and cool rice.",
            "Chop capsicum and carrot.",
            "Sauté vegetables and peas.",
            "Add spices and salt.",
            "Add rice.",
            "Toss gently on medium-high heat.",
            "Serve warm."
        ]
    },
    "Capsicum Potato Fry": {
        "benefits": [
            "Capsicum provides vitamin C.",
            "Potato provides energy and potassium.",
            "Onion provides fibre."
        ],
        "tips": [
            "Use firm potatoes.",
            "Cut potato into small pieces.",
            "Add capsicum later so it remains crisp."
        ],
        "instructions": [
            "Cube potatoes and capsicum.",
            "Sauté onion.",
            "Add potatoes and cook until nearly tender.",
            "Add capsicum.",
            "Add salt and spices.",
            "Roast until lightly browned.",
            "Serve hot."
        ]
    },

    # 64. Red Bell Pepper
    "Red Pepper Stir Fry": {
        "benefits": [
            "Red bell pepper is rich in vitamin C.",
            "Broccoli provides fibre and antioxidants.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Choose firm, glossy peppers.",
            "Remove seeds before slicing.",
            "Stir-fry quickly to retain colour and crunch."
        ],
        "instructions": [
            "Slice red pepper, broccoli and carrot.",
            "Heat oil in a wide pan.",
            "Stir-fry carrot and broccoli.",
            "Add red pepper.",
            "Season with salt and spices.",
            "Cook until tender-crisp.",
            "Serve immediately."
        ]
    },
    "Red Pepper Pasta": {
        "benefits": [
            "Red pepper provides vitamin C.",
            "Tomato provides lycopene.",
            "Basil contributes antioxidants."
        ],
        "tips": [
            "Use ripe red pepper and tomato.",
            "Cook pasta until al dente.",
            "Add basil at the end."
        ],
        "instructions": [
            "Cook pasta until just tender.",
            "Sauté sliced red pepper.",
            "Add tomato and cook until soft.",
            "Season with salt and herbs.",
            "Add cooked pasta.",
            "Toss well.",
            "Finish with fresh basil and serve."
        ]
    },
    "Red Pepper Vegetable Soup": {
        "benefits": [
            "Red pepper provides vitamin C.",
            "Carrot provides beta-carotene.",
            "Potato provides potassium and carbohydrates."
        ],
        "tips": [
            "Choose firm red peppers.",
            "Roast or sauté peppers for deeper flavour.",
            "Blend after vegetables become tender."
        ],
        "instructions": [
            "Chop red pepper, carrot and potato.",
            "Cook vegetables until soft.",
            "Blend until smooth.",
            "Add water to adjust consistency.",
            "Season with salt and pepper.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },

    # 65. Yellow Bell Pepper
    "Yellow Pepper Stir Fry": {
        "benefits": [
            "Yellow pepper provides vitamin C.",
            "Broccoli provides fibre.",
            "Zucchini provides hydration and fibre."
        ],
        "tips": [
            "Choose firm, bright yellow peppers.",
            "Remove seeds and slice evenly.",
            "Keep vegetables slightly crunchy."
        ],
        "instructions": [
            "Slice yellow pepper, broccoli and zucchini.",
            "Stir-fry broccoli briefly.",
            "Add zucchini.",
            "Add yellow pepper.",
            "Season with salt and spices.",
            "Cook until tender-crisp.",
            "Serve hot."
        ]
    },
    "Yellow Pepper Rice": {
        "benefits": [
            "Yellow pepper provides vitamin C.",
            "Carrot provides beta-carotene.",
            "Peas add fibre and plant protein."
        ],
        "tips": [
            "Use cooled rice.",
            "Slice pepper evenly.",
            "Stir-fry vegetables quickly."
        ],
        "instructions": [
            "Cook and cool rice.",
            "Chop yellow pepper and carrot.",
            "Sauté vegetables and peas.",
            "Add seasoning and salt.",
            "Add cooked rice.",
            "Toss gently.",
            "Serve warm."
        ]
    },
    "Yellow Pepper Soup": {
        "benefits": [
            "Yellow pepper provides vitamin C.",
            "Carrot provides beta-carotene.",
            "Potato adds energy and potassium."
        ],
        "tips": [
            "Use firm, fresh peppers.",
            "Cook vegetables until tender.",
            "Blend while warm for a smooth texture."
        ],
        "instructions": [
            "Chop yellow pepper, carrot and potato.",
            "Cook until tender.",
            "Blend into a smooth soup.",
            "Add water to adjust consistency.",
            "Season with salt and pepper.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },

    # 66. Assorted Capsicum
    "Three Pepper Stir Fry": {
        "benefits": [
            "Red, yellow and green peppers provide vitamin C.",
            "Onion adds fibre and antioxidants.",
            "A colourful, vegetable-rich side dish."
        ],
        "tips": [
            "Choose firm, glossy peppers.",
            "Slice all peppers evenly.",
            "Cook quickly to preserve colour and crunch."
        ],
        "instructions": [
            "Wash and slice all three peppers.",
            "Slice onion.",
            "Sauté onion briefly.",
            "Add the three peppers.",
            "Season with salt and spices.",
            "Stir-fry until tender-crisp.",
            "Serve hot."
        ]
    },
    "Three Pepper Fried Rice": {
        "benefits": [
            "Mixed capsicum provides vitamin C and antioxidants.",
            "Carrot provides beta-carotene.",
            "Green peas provide fibre and plant protein."
        ],
        "tips": [
            "Use cooled cooked rice.",
            "Cut all vegetables evenly.",
            "Cook vegetables quickly over high heat."
        ],
        "instructions": [
            "Cook and cool the rice.",
            "Slice all three peppers.",
            "Chop carrot and prepare peas.",
            "Stir-fry the vegetables.",
            "Add cooked rice and seasonings.",
            "Toss on high heat.",
            "Garnish and serve."
        ]
    },
    "Capsicum Pasta": {
        "benefits": [
            "Capsicum provides vitamin C.",
            "Tomato provides lycopene.",
            "Basil adds antioxidants."
        ],
        "tips": [
            "Use fresh, firm peppers.",
            "Cook pasta until al dente.",
            "Add basil just before serving."
        ],
        "instructions": [
            "Cook pasta until tender.",
            "Slice the three peppers.",
            "Sauté peppers and tomato.",
            "Add seasoning and salt.",
            "Add cooked pasta.",
            "Toss until well combined.",
            "Add fresh basil and serve."
        ]
    },

    # 67. Green Zucchini
    "Zucchini Stir Fry": {
        "benefits": [
            "Zucchini provides fibre and hydration.",
            "Capsicum provides vitamin C.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Choose firm zucchini with smooth skin.",
            "Do not peel unless necessary.",
            "Avoid overcooking because zucchini softens quickly."
        ],
        "instructions": [
            "Wash and slice zucchini.",
            "Slice capsicum and carrot.",
            "Stir-fry carrot briefly.",
            "Add zucchini and capsicum.",
            "Season with salt and spices.",
            "Cook until just tender.",
            "Serve hot."
        ]
    },
    "Zucchini Soup": {
        "benefits": [
            "Zucchini provides hydration and fibre.",
            "Potato provides potassium and carbohydrates.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Choose firm, fresh zucchini.",
            "Cut vegetables evenly.",
            "Blend only after vegetables are completely tender."
        ],
        "instructions": [
            "Wash and chop zucchini, potato and carrot.",
            "Cook vegetables until tender.",
            "Blend until smooth.",
            "Add water to adjust consistency.",
            "Season with salt and pepper.",
            "Simmer briefly.",
            "Serve warm."
        ]
    },
    "Zucchini Vegetable Roast": {
        "benefits": [
            "Zucchini provides fibre and hydration.",
            "Broccoli provides vitamin C and fibre.",
            "Mushrooms provide B vitamins and minerals."
        ],
        "tips": [
            "Use firm zucchini and fresh mushrooms.",
            "Cut vegetables into similar sizes.",
            "Roast rather than overcooking."
        ],
        "instructions": [
            "Wash and cut all vegetables.",
            "Toss with seasoning.",
            "Arrange evenly in a pan.",
            "Roast until lightly browned.",
            "Turn vegetables halfway.",
            "Cook until tender-crisp.",
            "Serve warm."
        ]
    },

    # 68. Green Moong Sprouts
    "Sprouts Salad": {
        "benefits": [
            "Moong sprouts provide plant-based protein and fibre.",
            "Cucumber provides hydration.",
            "Carrot and tomato provide antioxidants.",
            "Lemon adds vitamin C."
        ],
        "tips": [
            "Use fresh, crisp sprouts.",
            "Rinse sprouts thoroughly before use.",
            "Refrigerate and consume promptly."
        ],
        "instructions": [
            "Rinse the sprouts thoroughly.",
            "Lightly steam them if preferred.",
            "Add chopped cucumber, carrot and tomato.",
            "Add coriander.",
            "Squeeze fresh lemon juice.",
            "Add salt and toss.",
            "Serve immediately."
        ]
    },
    "Sprouts Stir Fry": {
        "benefits": [
            "Moong sprouts provide plant protein and fibre.",
            "Capsicum provides vitamin C.",
            "Carrot provides beta-carotene."
        ],
        "tips": [
            "Use fresh sprouts.",
            "Do not overcook them.",
            "Keep vegetables slightly crunchy."
        ],
        "instructions": [
            "Rinse the sprouts.",
            "Chop capsicum, carrot and onion.",
            "Sauté onion.",
            "Add carrot and capsicum.",
            "Add sprouts and seasonings.",
            "Stir-fry briefly until heated through.",
            "Serve hot."
        ]
    },
    "Sprouts Chaat": {
        "benefits": [
            "Moong sprouts provide plant protein and fibre.",
            "Tomato and coriander provide antioxidants.",
            "Lemon provides vitamin C."
        ],
        "tips": [
            "Use fresh sprouts.",
            "Lightly steam if preferred.",
            "Add lemon immediately before serving."
        ],
        "instructions": [
            "Rinse and lightly steam sprouts if desired.",
            "Add chopped tomato and onion.",
            "Add fresh coriander.",
            "Add chaat spices and salt.",
            "Squeeze lemon juice.",
            "Toss everything together.",
            "Serve immediately."
        ]
    }
}

def update_recipes():
    updated_count = 0
    for name, data in RECIPE_DETAILS.items():
        # Match recipes by exact or normalized name
        recipes = VegetableRecipe.objects.filter(name__iexact=name)
        if not recipes.exists():
            # Try matching by substring or package
            recipes = VegetableRecipe.objects.filter(name__icontains=name)
        
        for r in recipes:
            r.health_benefits = data["benefits"]
            r.health_tips = data["tips"]
            r.instructions = data["instructions"]
            if "calories" in data:
                r.calories = data["calories"]
            if "protein" in data:
                r.protein = data["protein"]
            if "carbohydrates" in data:
                r.carbohydrates = data["carbohydrates"]
            if "fiber" in data:
                r.fiber = data["fiber"]
            if "fat" in data:
                r.fat = data["fat"]
            if "servings" in data:
                r.servings = data["servings"]
            r.save()
            updated_count += 1
            print(f"Updated recipe: {r.name} (ID: {r.id}) for package: {r.package.name}")

    print(f"\n[SUCCESS] Successfully updated {updated_count} vegetable recipe records.")

if __name__ == "__main__":
    update_recipes()
