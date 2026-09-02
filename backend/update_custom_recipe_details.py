import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "quicktims.settings")
django.setup()

from service_requests.models import VegetableRecipe

RECIPE_DETAILS = {
    # 1. Tomato
    "Tomato Rasam": {
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
            "Wash and chop the tomatoes.",
            "Cook them until soft and mash well.",
            "Add water, rasam spices, turmeric and salt.",
            "Simmer until the rasam becomes aromatic.",
            "Add a tempering of mustard seeds and curry leaves.",
            "Finish with chopped coriander and serve hot."
        ]
    },
    "Tomato Onion Curry": {
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
            "Chop tomatoes, onion and green chilli.",
            "Heat oil and sauté onion and chilli.",
            "Add tomatoes and cook until soft.",
            "Add turmeric, chilli powder and salt.",
            "Cook until the mixture thickens.",
            "Serve hot with rice or chapati."
        ]
    },
    "Tomato Vegetable Kurma": {
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
            "Chop tomato, potato, carrot and onion.",
            "Sauté onion until lightly golden.",
            "Add tomato and cook until soft.",
            "Add potato, carrot and peas.",
            "Add kurma spices and enough water.",
            "Cover and cook until vegetables are tender.",
            "Serve warm with chapati, dosa or rice."
        ]
    },

    # 2. Onion
    "Onion Sambar": {
        "benefits": [
            "Onions provide antioxidants and fibre.",
            "Drumstick adds vitamins, minerals and fibre.",
            "A balanced accompaniment when prepared with dal."
        ],
        "tips": [
            "Choose firm onions without soft spots.",
            "Use fresh drumstick pieces.",
            "Avoid overcooking the drumstick to retain texture."
        ],
        "instructions": [
            "Peel and cut the onions and drumstick.",
            "Cook the dal separately until soft.",
            "Sauté onion and add chopped tomato.",
            "Add drumstick and cook with water.",
            "Add sambar powder, turmeric and salt.",
            "Mix in the cooked dal and simmer.",
            "Add tempering and serve hot."
        ]
    },
    "Onion Tomato Curry": {
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
            "Chop onion, tomato and green chilli.",
            "Heat oil and sauté onion and chilli.",
            "Add tomatoes and cook until soft.",
            "Add turmeric, chilli powder and salt.",
            "Cook until the mixture becomes thick.",
            "Serve with rice, dosa or chapati."
        ]
    },
    "Onion Pakoda": {
        "benefits": [
            "Onion provides fibre and plant compounds.",
            "Fresh coriander adds flavour and micronutrients.",
            "Best enjoyed as an occasional snack."
        ],
        "tips": [
            "Use fresh, firm onions.",
            "Slice onions thinly for crisp pakodas.",
            "Do not make the batter too watery."
        ],
        "instructions": [
            "Thinly slice the onions.",
            "Add green chilli and chopped coriander.",
            "Mix with gram flour, spices and salt.",
            "Sprinkle a little water and form a thick mixture.",
            "Drop small portions into hot oil.",
            "Fry until crisp and golden.",
            "Drain and serve hot."
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
            r.save()
            updated_count += 1
            print(f"Updated recipe: {r.name} (ID: {r.id}) for package: {r.package.name}")

    print(f"\n[SUCCESS] Successfully updated {updated_count} vegetable recipe records.")

if __name__ == "__main__":
    update_recipes()
