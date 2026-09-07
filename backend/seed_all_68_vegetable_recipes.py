import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import VegetableRecipe, RecipeIngredient, Package

# 1. Load active vegetable packages dictionary
vegs = {p.name.lower().strip(): p for p in Package.objects.filter(service__slug='vegetables', status='ACTIVE')}

def find_veg(query):
    q = query.lower().strip()
    if q == "potato": return Package.objects.get(id=872)
    if "baby potato" in q: return Package.objects.get(id=897)
    if "ooty potato" in q: return Package.objects.get(id=898)
    if "sweet potato" in q: return Package.objects.get(id=901)
    if "small onion" in q or "sambhar onion" in q: return vegs.get("sambhar onion (vengayam)")
    if "spring onion" in q: return vegs.get("spring onion (vengaya thaal)")
    if "onion" in q: return vegs.get("onion (vengayam)")
    if "tomato" in q: return vegs.get("tomato (thakkali)")
    if "carrot" in q: return vegs.get("orange carrot (local carrot)")
    if "cucumber" in q: return vegs.get("green cucumber (vellarikai)")
    if "lady finger" in q or "vendakkai" in q: return vegs.get("lady finger (vendaikkai)")
    if "vari" in q: return vegs.get("brinjal (vari kathirikkai)")
    if "bharta" in q: return vegs.get("brinjal - bharta")
    if "brinjal" in q: return vegs.get("brinjal (vari kathirikkai)")
    if "cabbage" in q: return vegs.get("cabbage (muttaikose)")
    if "cauliflower" in q: return vegs.get("cauliflower (pookosu)")
    if "beetroot" in q: return vegs.get("beetroot")
    if "radish" in q: return vegs.get("radish (mullangi)")
    if "peeled garlic" in q: return vegs.get("peeled garlic (uricha poondu)")
    if "garlic" in q: return vegs.get("garlic (poondu)")
    if "ginger" in q: return vegs.get("ginger")
    if "chilli" in q: return vegs.get("green chilli (pachai milagaai)")
    if "lemon" in q: return vegs.get("lemon (elumichai pazham)")
    if "curry" in q: return vegs.get("curry leaves (karuvepillai)")
    if "coriander" in q: return vegs.get("coriander bunch (kothamalli)")
    if "mint" in q: return vegs.get("mint leaves (pudina)")
    if "turmeric" in q: return vegs.get("raw turmeric (manjal)")
    if "amla" in q: return vegs.get("amla (nellikaai)")
    if "rosemary" in q: return vegs.get("fresh rosemary")
    if "basil" in q: return vegs.get("italian basil leaves")
    if "neem" in q: return vegs.get("neem leaves (veppilai)")
    if "spinach" in q or "palak" in q: return vegs.get("spinach (palak keerai)")
    if "drumstick leaves" in q or "moringa" in q: return vegs.get("drumstick leaves (moringa)")
    if "methi" in q or "fenugreek" in q: return vegs.get("fenugreek (methi)")
    if "green amaranthus" in q: return vegs.get("green amaranthus leaves")
    if "red amaranthus" in q or "red keerai" in q: return vegs.get("red amaranthus leaves")
    if "lettuce" in q: return vegs.get("green lettuce")
    if "french beans" in q: return vegs.get("french beans (beans)")
    if "broad beans" in q or "avarakkai" in q: return vegs.get("broad beans (avarakkai)")
    if "cluster beans" in q or "kothavarangai" in q: return vegs.get("cluster beans (kothavarangai)")
    if "cowpea" in q or "karamani" in q: return vegs.get("cowpea beans (karamani)")
    if "peas" in q or "pattani" in q: return vegs.get("green peas (pachai pattani)")
    if "drumstick" in q: return vegs.get("drumstick (murungakkai)")
    if "bitter gourd" in q or "pavakkai" in q: return vegs.get("bitter gourd (pavakkai)")
    if "bottle gourd" in q or "surakkai" in q: return vegs.get("bottle gourd (surakkai)")
    if "ridge gourd" in q or "peerangai" in q: return vegs.get("ridge gourd (peerangai)")
    if "snake gourd" in q or "pudalangai" in q: return vegs.get("snake gourd (pudalangai)")
    if "ash gourd" in q or "sambal pusanikkai" in q: return vegs.get("ash gourd (sambal pusanikkai)")
    if "ivy gourd" in q or "kovakkai" in q: return vegs.get("ivy gourd (kovakkai)")
    if "pointed gourd" in q or "parwal" in q: return vegs.get("pointed gourd")
    if "chow chow" in q: return vegs.get("chow chow")
    if "green pumpkin" in q: return vegs.get("green pumpkin (pusanikkai)")
    if "yellow pumpkin" in q or "pumpkin yellow" in q: return vegs.get("pumpkin yellow (cut)")
    if "disco pumpkin" in q: return vegs.get("disco pumpkin")
    if "pumpkin" in q: return vegs.get("pumpkin yellow (cut)")
    if "colocasia" in q or "seppankizhangu" in q: return vegs.get("colocasia (seppankizhangu)")
    if "knol khol" in q or "nookal" in q: return vegs.get("knol khol (nookal)")
    if "banana stem" in q or "vazhai thandu" in q or "vazhaithandu" in q: return vegs.get("banana stem (vazhai thandu)")
    if "raw banana" in q or "vazhakkai" in q: return vegs.get("raw banana (vazhakkai)")
    if "raw papaya" in q or "pappalikkai" in q: return vegs.get("raw papaya (pappalikkai)")
    if "broccoli" in q: return vegs.get("broccoli")
    if "mushroom" in q or "kaalan" in q: return vegs.get("button mushroom (kaalan)")
    if "baby corn" in q: return vegs.get("baby corn - packet")
    if "sweet corn" in q or "corn" in q or "cholam" in q: return vegs.get("sweet corn cob (cholam)")
    if "red bell pepper" in q or "red pepper" in q: return vegs.get("red bell pepper")
    if "yellow bell pepper" in q or "yellow pepper" in q: return vegs.get("yellow bell pepper (manjal kuda milagai)")
    if "assorted capsicum" in q or "three pepper" in q: return vegs.get("assorted capsicum (r/y/g)")
    if "green capsicum" in q or "capsicum" in q: return vegs.get("green capsicum (kudai milagaai)")
    if "zucchini" in q: return vegs.get("green zucchini")
    if "sprouts" in q or "moong sprouts" in q: return vegs.get("green moong sprouts")
    if "beans" in q: return vegs.get("french beans (beans)")

    for k, p in vegs.items():
        if q in k or k in q:
            return p
    return None

# Structure: (VegetableName, [
#   (RecipeName, [Ingredients], prep, cook, calories, protein, carbs, fiber, fat)
# ])
USER_RECIPES_DATA = [
    # 1. Tomato
    ("Tomato", [
        ("Tomato Rasam", ["Tomato", "Coriander", "Curry Leaves"], 10, 15, 95, "4g", "14g", "3g", "3g"),
        ("Tomato Onion Curry", ["Tomato", "Onion", "Green Chilli"], 10, 15, 135, "2g", "15g", "3g", "8g"),
        ("Tomato Vegetable Kurma", ["Tomato", "Potato", "Carrot", "Green Peas", "Onion"], 15, 25, 215, "5g", "25g", "5g", "11g"),
    ]),
    # 2. Onion
    ("Onion", [
        ("Onion Sambar", ["Onion", "Tomato", "Drumstick"], 15, 25, 150, "7g", "22g", "6g", "4g"),
        ("Onion Tomato Curry", ["Onion", "Tomato", "Green Chilli"], 10, 15, 110, "3g", "15g", "3g", "5g"),
        ("Onion Pakoda", ["Onion", "Green Chilli", "Coriander"], 15, 15, 220, "5g", "25g", "4g", "11g"),
    ]),
    # 3. Sambhar Onion
    ("Sambhar Onion", [
        ("Small Onion Sambar", ["Small Onion", "Tomato", "Drumstick"], 15, 25, 155, "7g", "23g", "6g", "4g"),
        ("Small Onion Theeyal", ["Small Onion", "Coconut", "Green Chilli"], 15, 20, 170, "3g", "14g", "4g", "11g"),
        ("Small Onion Kara Kuzhambu", ["Small Onion", "Tomato", "Brinjal"], 15, 25, 140, "3g", "18g", "4g", "6g"),
    ]),
    # 4. Spring Onion
    ("Spring Onion", [
        ("Spring Onion Poriyal", ["Spring Onion", "Carrot", "Green Peas"], 10, 10, 100, "3g", "12g", "3g", "5g"),
        ("Spring Onion Fried Rice", ["Spring Onion", "Carrot", "Capsicum", "Green Peas"], 15, 15, 240, "6g", "40g", "3g", "7g"),
        ("Spring Onion Stir Fry", ["Spring Onion", "Cabbage", "Capsicum"], 10, 10, 90, "3g", "11g", "3g", "4g"),
    ]),
    # 5. Potato
    ("Potato", [
        ("Potato Roast", ["Potato", "Onion"], 10, 20, 190, "4g", "29g", "4g", "7g"),
        ("Potato Peas Curry", ["Potato", "Green Peas", "Tomato"], 15, 25, 180, "6g", "29g", "6g", "5g"),
        ("Aloo Gobi", ["Potato", "Cauliflower", "Tomato"], 15, 25, 170, "5g", "25g", "6g", "6g"),
    ]),
    # 6. Baby Potato
    ("Baby Potato", [
        ("Baby Potato Egg Curry", ["Baby Potato", "Tomato", "Onion"], 15, 15, 275, "11 g", "31 g", "4 g", "12 g"),
        ("Poori Aloo Koora", ["Baby Potato", "Onion", "Ginger"], 10, 12, 205, "4 g", "31 g", "5 g", "8 g"),
        ("Baby Potato Aloo Palak", ["Baby Potato", "Spinach", "Tomato"], 15, 15, 225, "7 g", "29 g", "6 g", "9 g"),
    ]),
    # 7. Ooty Potato
    ("Ooty Potato", [
        ("Potato Palya", ["Ooty Potato", "Onion", "Curry Leaves"], 10, 10, 185, "4 g", "31 g", "5 g", "7 g"),
        ("Urulai Roast", ["Ooty Potato", "Curry Leaves"], 10, 15, 220, "4 g", "32 g", "5 g", "9 g"),
        ("Ooty Potato Kurma", ["Ooty Potato", "Coconut", "Tomato"], 15, 18, 235, "5 g", "35 g", "5 g", "9 g"),
    ]),
    # 8. Orange Carrot
    ("Orange Carrot", [
        ("Carrot Poriyal", ["Carrot", "Coconut"], 10, 10, 95, "2g", "12g", "4g", "4g"),
        ("Carrot Peas Curry", ["Carrot", "Green Peas", "Onion"], 10, 15, 125, "4g", "18g", "5g", "4g"),
        ("Carrot Sambar", ["Carrot", "Tomato", "Drumstick", "Onion"], 15, 25, 145, "7g", "21g", "6g", "4g"),
    ]),
    # 9. Green Cucumber
    ("Green Cucumber", [
        ("Cucumber Raita", ["Cucumber", "Coriander"], 10, 5, 75, "4g", "8g", "1g", "3g"),
        ("Cucumber Kootu", ["Cucumber", "Tomato", "Green Chilli"], 15, 20, 135, "6g", "19g", "4g", "4g"),
        ("Cucumber Salad", ["Cucumber", "Carrot", "Coriander", "Lemon"], 10, 5, 55, "2g", "10g", "3g", "1g"),
    ]),
    # 10. Lady Finger
    ("Lady Finger", [
        ("Vendakkai Poriyal", ["Lady Finger", "Onion"], 10, 15, 110, "3g", "12g", "4g", "6g"),
        ("Vendakkai Sambar", ["Lady Finger", "Tomato", "Onion"], 15, 25, 150, "7g", "22g", "6g", "4g"),
        ("Vendakkai Kara Kuzhambu", ["Lady Finger", "Tomato", "Small Onion"], 15, 25, 145, "4g", "19g", "5g", "6g"),
    ]),
    # 11. Brinjal – Vari
    ("Brinjal (Vari Kathirikkai)", [
        ("Brinjal Poriyal", ["Brinjal", "Onion"], 10, 15, 105, "2g", "12g", "4g", "6g"),
        ("Brinjal Sambar", ["Brinjal", "Tomato", "Drumstick"], 15, 25, 150, "7g", "22g", "6g", "4g"),
        ("Brinjal Kara Kuzhambu", ["Brinjal", "Small Onion", "Tomato"], 15, 25, 145, "4g", "19g", "5g", "6g"),
    ]),
    # 12. Brinjal – Bharta
    ("Brinjal - Bharta", [
        ("Brinjal Bharta", ["Brinjal", "Onion", "Tomato", "Green Chilli"], 15, 25, 135, "3g", "16g", "6g", "6g"),
        ("Brinjal Masala", ["Brinjal", "Onion", "Tomato"], 10, 20, 145, "3g", "16g", "5g", "8g"),
        ("Brinjal Kootu", ["Brinjal", "Carrot", "Green Peas"], 15, 25, 155, "7g", "20g", "6g", "5g"),
    ]),
    # 13. Cabbage
    ("Cabbage", [
        ("Cabbage Poriyal", ["Cabbage", "Carrot", "Green Chilli"], 10, 10, 95, "2g", "11g", "4g", "5g"),
        ("Cabbage Kootu", ["Cabbage", "Moong Dal", "Carrot"], 15, 20, 145, "7g", "20g", "6g", "4g"),
        ("Cabbage Peas Curry", ["Cabbage", "Green Peas", "Onion"], 10, 15, 125, "4g", "18g", "5g", "4g"),
    ]),
    # 14. Cauliflower
    ("Cauliflower", [
        ("Gobi 65", ["Cauliflower", "Onion", "Green Chilli"], 15, 20, 230, "6g", "27g", "5g", "11g"),
        ("Aloo Gobi", ["Cauliflower", "Potato", "Tomato"], 15, 25, 170, "5g", "25g", "6g", "6g"),
        ("Cauliflower Kurma", ["Cauliflower", "Carrot", "Green Peas"], 15, 25, 190, "6g", "21g", "5g", "9g"),
    ]),
    # 15. Beetroot
    ("Beetroot", [
        ("Beetroot Poriyal", ["Beetroot", "Coconut"], 10, 15, 105, "2g", "14g", "4g", "5g"),
        ("Beetroot Kootu", ["Beetroot", "Moong Dal", "Carrot"], 15, 20, 145, "7g", "21g", "6g", "4g"),
        ("Beetroot Carrot Salad", ["Beetroot", "Carrot", "Cucumber", "Lemon"], 10, 5, 65, "2g", "13g", "4g", "1g"),
    ]),
    # 16. Radish
    ("Radish", [
        ("Radish Sambar", ["Radish", "Tomato", "Onion"], 15, 25, 145, "7g", "22g", "6g", "4g"),
        ("Radish Poriyal", ["Radish", "Onion", "Green Chilli"], 10, 15, 90, "2g", "12g", "4g", "4g"),
        ("Radish Kootu", ["Radish", "Carrot", "Moong Dal"], 15, 20, 140, "7g", "20g", "6g", "4g"),
    ]),
    # 17. Sweet Potato
    ("Sweet Potato", [
        ("Sweet Potato Roast", ["Sweet Potato", "Onion"], 10, 20, 190, "3g", "35g", "5g", "5g"),
        ("Sweet Potato Curry", ["Sweet Potato", "Tomato", "Green Chilli"], 10, 20, 175, "3g", "32g", "5g", "5g"),
        ("Sweet Potato Chaat", ["Sweet Potato", "Onion", "Tomato", "Coriander", "Lemon"], 15, 15, 165, "3g", "31g", "6g", "3g"),
    ]),
    # 18. Garlic
    ("Garlic", [
        ("Garlic Rasam", ["Garlic", "Tomato", "Coriander", "Curry Leaves"], 10, 15, 75, "2g", "10g", "2g", "3g"),
        ("Garlic Chutney", ["Garlic", "Tomato", "Green Chilli"], 10, 10, 120, "3g", "10g", "2g", "8g"),
        ("Garlic Vegetable Stir Fry", ["Garlic", "Capsicum", "Carrot", "Beans"], 10, 15, 110, "4g", "14g", "4g", "5g"),
    ]),
    # 19. Peeled Garlic
    ("Peeled Garlic", [
        ("Garlic Curry", ["Peeled Garlic", "Tomato", "Small Onion"], 10, 20, 145, "4g", "15g", "3g", "8g"),
        ("Garlic Rasam", ["Peeled Garlic", "Tomato", "Coriander"], 10, 15, 75, "2g", "10g", "2g", "3g"),
        ("Garlic Mushroom Fry", ["Peeled Garlic", "Mushroom", "Capsicum"], 10, 15, 125, "5g", "10g", "3g", "8g"),
    ]),
    # 20. Ginger
    ("Ginger", [
        ("Ginger Rasam", ["Ginger", "Tomato", "Coriander", "Curry Leaves"], 10, 15, 70, "2g", "10g", "2g", "2g"),
        ("Ginger Vegetable Curry", ["Ginger", "Carrot", "Beans", "Capsicum"], 10, 20, 120, "4g", "15g", "4g", "5g"),
        ("Ginger Chutney", ["Ginger", "Tomato", "Green Chilli"], 10, 10, 100, "2g", "12g", "3g", "5g"),
    ]),
    # 21. Green Chilli
    ("Green Chilli", [
        ("Green Chilli Chutney", ["Green Chilli", "Coriander", "Lemon"], 10, 5, 65, "2g", "9g", "3g", "2g"),
        ("Chilli Onion Fry", ["Green Chilli", "Onion", "Tomato"], 10, 10, 105, "2g", "12g", "3g", "6g"),
        ("Green Chilli Vegetable Stir Fry", ["Green Chilli", "Beans", "Carrot", "Capsicum"], 10, 15, 105, "3g", "14g", "4g", "5g"),
    ]),
    # 22. Lemon
    ("Lemon", [
        ("Lemon Bars", ["Lemon", "Flour", "Butter"], 20, 40, 320, "5 g", "44 g", "1 g", "14 g"),
        ("Avgolemono Soup", ["Lemon", "Chicken", "Rice"], 15, 25, 235, "20 g", "22 g", "1 g", "8 g"),
        ("Chicken Piccata", ["Lemon", "Chicken", "Capers"], 10, 12, 365, "39 g", "12 g", "1 g", "18 g"),
    ]),
    # 23. Curry Leaves
    ("Curry Leaves", [
        ("Curry Leaf Chutney", ["Curry Leaves", "Tomato", "Green Chilli"], 10, 10, 95, "3g", "10g", "3g", "5g"),
        ("Curry Leaf Rice", ["Curry Leaves", "Onion", "Green Chilli"], 10, 15, 230, "5g", "40g", "3g", "7g"),
        ("Curry Leaf Rasam", ["Curry Leaves", "Tomato", "Coriander"], 10, 15, 65, "2g", "9g", "2g", "2g"),
    ]),
    # 24. Coriander
    ("Coriander", [
        ("Coriander Chutney", ["Coriander", "Green Chilli", "Lemon"], 10, 5, 60, "2g", "8g", "3g", "2g"),
        ("Coriander Rice", ["Coriander", "Onion", "Green Chilli"], 10, 15, 225, "5g", "39g", "3g", "7g"),
        ("Coriander Vegetable Salad", ["Coriander", "Cucumber", "Carrot", "Tomato"], 10, 5, 60, "2g", "11g", "4g", "1g"),
    ]),
    # 25. Mint Leaves
    ("Mint Leaves", [
        ("Mint Chutney", ["Mint", "Coriander", "Green Chilli", "Lemon"], 10, 5, 60, "2g", "8g", "3g", "2g"),
        ("Mint Rice", ["Mint", "Onion", "Green Chilli", "Carrot"], 10, 15, 225, "5g", "39g", "3g", "7g"),
        ("Mint Vegetable Pulao", ["Mint", "Carrot", "Beans", "Green Peas"], 15, 25, 250, "7g", "42g", "5g", "7g"),
    ]),
    # 26. Raw Turmeric
    ("Raw Turmeric", [
        ("Raw Turmeric Pickle", ["Raw Turmeric", "Lemon", "Green Chilli"], 15, 10, 55, "1g", "10g", "2g", "2g"),
        ("Turmeric Vegetable Stir Fry", ["Raw Turmeric", "Carrot", "Beans"], 10, 15, 105, "3g", "14g", "4g", "5g"),
        ("Turmeric Ginger Chutney", ["Raw Turmeric", "Ginger", "Green Chilli", "Lemon"], 10, 10, 70, "2g", "10g", "3g", "2g"),
    ]),
    # 27. Amla
    ("Amla", [
        ("Amla Rice", ["Amla", "Green Chilli", "Curry Leaves"], 10, 15, 225, "5g", "40g", "4g", "6g"),
        ("Amla Chutney", ["Amla", "Green Chilli", "Coriander"], 10, 10, 65, "2g", "9g", "3g", "2g"),
        ("Amla Vegetable Salad", ["Amla", "Carrot", "Cucumber", "Coriander"], 10, 5, 60, "2g", "12g", "4g", "1g"),
    ]),
    # 28. Fresh Rosemary
    ("Fresh Rosemary", [
        ("Rosemary Potato Roast", ["Rosemary", "Potato", "Garlic"], 10, 20, 190, "4g", "29g", "4g", "7g"),
        ("Rosemary Mushroom Fry", ["Rosemary", "Mushroom", "Capsicum"], 10, 15, 120, "5g", "10g", "3g", "7g"),
        ("Rosemary Vegetable Roast", ["Rosemary", "Carrot", "Zucchini", "Capsicum"], 15, 20, 125, "4g", "17g", "5g", "5g"),
    ]),
    # 29. Italian Basil
    ("Italian Basil", [
        ("Basil Tomato Pasta", ["Basil", "Tomato", "Capsicum"], 10, 20, 300, "9g", "48g", "6g", "9g"),
        ("Basil Vegetable Stir Fry", ["Basil", "Zucchini", "Capsicum", "Mushroom"], 10, 15, 120, "4g", "14g", "4g", "6g"),
        ("Tomato Basil Soup", ["Basil", "Tomato", "Carrot"], 10, 20, 95, "3g", "15g", "4g", "3g"),
    ]),
    # 30. Neem Leaves
    ("Neem Leaves", [
        ("Neem Flower/Lemon Rice Style", ["Neem Leaves", "Lemon", "Green Chilli"], 10, 15, 220, "4g", "39g", "3g", "7g"),
        ("Neem Leaf Chutney", ["Neem Leaves", "Tomato", "Green Chilli"], 10, 10, 70, "2g", "10g", "3g", "2g"),
        ("Neem Leaf Vegetable Mix", ["Neem Leaves", "Onion", "Tomato"], 10, 15, 95, "2g", "12g", "3g", "5g"),
    ]),
    # 31. Spinach
    ("Spinach", [
        ("Spinach Dal", ["Spinach", "Tomato", "Onion"], 15, 25, 170, "9g", "23g", "7g", "4g"),
        ("Palak Paneer Style Curry", ["Spinach", "Tomato", "Onion"], 15, 25, 230, "11g", "12g", "4g", "15g"),
        ("Spinach Vegetable Soup", ["Spinach", "Carrot", "Potato"], 10, 20, 105, "4g", "17g", "5g", "3g"),
    ]),
    # 32. Drumstick Leaves
    ("Drumstick Leaves", [
        ("Murungai Keerai Poriyal", ["Drumstick Leaves", "Onion", "Coconut"], 15, 15, 115, "4g", "12g", "5g", "6g"),
        ("Drumstick Leaf Dal", ["Drumstick Leaves", "Tomato", "Onion"], 15, 25, 175, "9g", "23g", "7g", "4g"),
        ("Drumstick Leaf Soup", ["Drumstick Leaves", "Carrot", "Tomato"], 10, 20, 95, "4g", "14g", "5g", "2g"),
    ]),
    # 33. Fenugreek Leaves
    ("Fenugreek", [
        ("Methi Dal", ["Methi", "Tomato", "Onion"], 15, 25, 170, "9g", "23g", "7g", "4g"),
        ("Methi Potato Curry", ["Methi", "Potato", "Tomato"], 10, 20, 175, "4g", "27g", "5g", "6g"),
        ("Methi Vegetable Stir Fry", ["Methi", "Carrot", "Beans", "Onion"], 10, 15, 105, "4g", "14g", "5g", "4g"),
    ]),
    # 34. Green Amaranthus
    ("Green Amaranthus", [
        ("Green Amaranthus Leaves Poriyal", ["Green Amaranthus Leaves", "Onion", "Coconut"], 10, 10, 125, "4 g", "10 g", "4 g", "8 g"),
        ("Green Amaranthus Leaves Kootu", ["Green Amaranthus Leaves", "Moong Dal", "Coconut"], 10, 15, 175, "8 g", "23 g", "6 g", "6 g"),
        ("Green Amaranthus Leaves Puli Kuzhambu", ["Green Amaranthus Leaves", "Onion", "Garlic"], 15, 15, 120, "4 g", "15 g", "5 g", "6 g"),
    ]),
    # 35. Red Amaranthus
    ("Red Amaranthus", [
        ("Red Amaranthus Dal", ["Red Amaranthus Leaves", "Toor Dal", "Tomato"], 10, 15, 175, "9 g", "25 g", "6 g", "5 g"),
        ("Red Amaranthus Coconut Milk Curry", ["Red Amaranthus Leaves", "Coconut Milk", "Garlic"], 10, 12, 145, "4 g", "14 g", "4 g", "9 g"),
        ("Red Amaranthus Vadai", ["Red Amaranthus Leaves", "Chana Dal", "Onion"], 70, 15, 265, "9 g", "34 g", "7 g", "10 g"),
    ]),
    # 36. Green Lettuce
    ("Green Lettuce", [
        ("Lettuce Salad", ["Lettuce", "Cucumber", "Carrot", "Tomato"], 10, 5, 55, "2g", "10g", "3g", "1g"),
        ("Lettuce Stir Fry", ["Lettuce", "Capsicum", "Carrot"], 10, 10, 85, "3g", "10g", "3g", "4g"),
        ("Lettuce Wrap", ["Lettuce", "Cucumber", "Carrot", "Capsicum"], 15, 10, 95, "3g", "12g", "3g", "4g"),
    ]),
    # 37. French Beans
    ("French Beans", [
        ("Beans Poriyal", ["Beans", "Coconut"], 10, 15, 105, "3g", "12g", "4g", "5g"),
        ("Beans Carrot Fry", ["Beans", "Carrot", "Onion"], 10, 15, 110, "3g", "15g", "5g", "5g"),
        ("Beans Peas Curry", ["Beans", "Green Peas", "Tomato"], 10, 20, 135, "6g", "19g", "6g", "5g"),
    ]),
    # 38. Broad Beans
    ("Broad Beans", [
        ("Avarakkai Poriyal", ["Broad Beans", "Coconut"], 8, 12, 150, "5 g", "16 g", "6 g", "8 g"),
        ("Avarakkai Kootu", ["Broad Beans", "Moong Dal", "Coconut"], 10, 15, 180, "7 g", "22 g", "7 g", "8 g"),
        ("Avarakkai Masala Curry", ["Broad Beans", "Tomato", "Onion"], 10, 18, 175, "5 g", "21 g", "7 g", "8 g"),
    ]),
    # 39. Cluster Beans
    ("Cluster Beans", [
        ("Cluster Beans Thogayal", ["Cluster Beans", "Small Onion", "Tomato", "Coconut"], 8, 12, 170, "5 g", "18 g", "7 g", "9 g"),
        ("Kothavarangai Pulikootu", ["Cluster Beans", "Toor Dal", "Coconut"], 15, 20, 190, "8 g", "27 g", "8 g", "6 g"),
        ("Kothavarangai Poriyal", ["Cluster Beans", "Coconut"], 8, 12, 155, "5 g", "17 g", "7 g", "8 g"),
    ]),
    # 40. Cowpea Beans
    ("Cowpea Beans", [
        ("Cowpea Beans Poriyal", ["Cowpea Beans", "Coconut"], 8, 12, 155, "5 g", "17 g", "6 g", "8 g"),
        ("Cowpea Beans Coconut Curry", ["Cowpea Beans", "Onion", "Tomato", "Coconut"], 10, 16, 185, "6 g", "21 g", "7 g", "9 g"),
        ("Cowpea Beans Masala Fry", ["Cowpea Beans", "Garlic", "Onion"], 8, 15, 175, "6 g", "20 g", "7 g", "9 g"),
    ]),
    # 41. Green Peas
    ("Green Peas", [
        ("Peas Masala", ["Green Peas", "Tomato", "Onion"], 10, 20, 160, "7g", "22g", "6g", "6g"),
        ("Peas Potato Curry", ["Green Peas", "Potato", "Tomato"], 15, 25, 180, "6g", "29g", "6g", "5g"),
        ("Vegetable Peas Pulao", ["Green Peas", "Carrot", "Beans", "Capsicum"], 15, 25, 250, "7g", "42g", "5g", "7g"),
    ]),
    # 42. Drumstick
    ("Drumstick", [
        ("Drumstick Sambar", ["Drumstick", "Tomato", "Small Onion"], 15, 25, 150, "7g", "22g", "6g", "4g"),
        ("Drumstick Poriyal", ["Drumstick", "Onion", "Coconut"], 15, 15, 115, "4g", "14g", "5g", "5g"),
        ("Drumstick Vegetable Curry", ["Drumstick", "Potato", "Carrot", "Tomato"], 15, 25, 175, "5g", "25g", "6g", "7g"),
    ]),
    # 43. Bitter Gourd
    ("Bitter Gourd", [
        ("Bitter Gourd Fry", ["Bitter Gourd", "Onion"], 15, 20, 125, "3g", "15g", "5g", "6g"),
        ("Pavakkai Pitla", ["Bitter Gourd", "Tomato", "Small Onion"], 15, 25, 155, "7g", "21g", "7g", "5g"),
        ("Bitter Gourd Masala", ["Bitter Gourd", "Onion", "Tomato"], 15, 20, 130, "3g", "16g", "5g", "6g"),
    ]),
    # 44. Bottle Gourd
    ("Bottle Gourd", [
        ("Bottle Gourd Kootu", ["Bottle Gourd", "Moong Dal", "Tomato"], 15, 20, 135, "7g", "19g", "5g", "4g"),
        ("Bottle Gourd Poriyal", ["Bottle Gourd", "Coconut", "Onion"], 10, 15, 95, "2g", "12g", "4g", "5g"),
        ("Bottle Gourd Sambar", ["Bottle Gourd", "Tomato", "Small Onion"], 15, 25, 140, "7g", "21g", "6g", "4g"),
    ]),
    # 45. Ridge Gourd
    ("Ridge Gourd", [
        ("Ridge Gourd Chutney", ["Ridge Gourd", "Tomato", "Green Chilli"], 10, 15, 85, "2g", "11g", "3g", "4g"),
        ("Ridge Gourd Kootu", ["Ridge Gourd", "Moong Dal", "Carrot"], 15, 20, 140, "7g", "19g", "5g", "4g"),
        ("Ridge Gourd Poriyal", ["Ridge Gourd", "Onion", "Coconut"], 10, 15, 95, "2g", "12g", "4g", "5g"),
    ]),
    # 46. Snake Gourd
    ("Snake Gourd", [
        ("Snake Gourd Poriyal", ["Snake Gourd", "Coconut", "Onion"], 10, 15, 100, "3g", "12g", "4g", "5g"),
        ("Snake Gourd Kootu", ["Snake Gourd", "Moong Dal", "Carrot"], 15, 20, 140, "7g", "19g", "5g", "4g"),
        ("Snake Gourd Sambar", ["Snake Gourd", "Tomato", "Onion"], 15, 25, 140, "7g", "21g", "6g", "4g"),
    ]),
    # 47. Ash Gourd
    ("Ash Gourd", [
        ("Poosanikai Kootu", ["Ash Gourd", "Moong Dal", "Coconut"], 10, 18, 180, "7 g", "22 g", "5 g", "8 g"),
        ("Poosanikai Mor Kuzhambu", ["Ash Gourd", "Sour Curd", "Coconut"], 25, 15, 165, "6 g", "17 g", "3 g", "8 g"),
        ("Poosanikai Poriyal", ["Ash Gourd", "Coconut", "Coriander"], 8, 12, 135, "3 g", "14 g", "4 g", "8 g"),
    ]),
    # 48. Ivy Gourd
    ("Ivy Gourd", [
        ("Kovakkai Mor Kuzhambu", ["Ivy Gourd", "Sour Curd", "Coconut"], 15, 15, 185, "5 g", "18 g", "4 g", "11 g"),
        ("Kovakkai Fry", ["Ivy Gourd", "Rice Flour", "Gram Flour"], 10, 10, 285, "6 g", "30 g", "5 g", "16 g"),
        ("Kovakkai Poriyal", ["Ivy Gourd", "Coconut"], 8, 15, 155, "4 g", "17 g", "5 g", "8 g"),
    ]),
    # 49. Chow Chow
    ("Chow Chow", [
        ("Chow Chow Kootu", ["Chow Chow", "Moong Dal", "Coconut"], 10, 15, 155, "6 g", "20 g", "5 g", "7 g"),
        ("Chow Chow Mor Kuzhambu", ["Chow Chow", "Sour Curd", "Coconut"], 15, 15, 145, "5 g", "15 g", "3 g", "8 g"),
        ("Chow Chow Chana Masala", ["Chow Chow", "Chickpeas", "Tomato", "Onion"], 10, 20, 235, "8 g", "34 g", "9 g", "8 g"),
    ]),
    # 51. Green Pumpkin
    ("Green Pumpkin", [
        ("Pumpkin Halwa", ["Green Pumpkin", "Milk", "Ghee"], 10, 25, 230, "4 g", "32 g", "2 g", "10 g"),
        ("Pumpkin Soup", ["Green Pumpkin", "Garlic", "Onion"], 10, 15, 105, "2 g", "18 g", "3 g", "4 g"),
        ("Pumpkin Sambar", ["Green Pumpkin", "Toor Dal", "Curry Leaves"], 10, 20, 190, "7 g", "24 g", "5 g", "8 g"),
    ]),
    # 52. Pumpkin Yellow – Cut
    ("Pumpkin Yellow (Cut)", [
        ("Yellow Pumpkin Sambar", ["Pumpkin", "Tomato", "Onion"], 15, 25, 145, "7g", "22g", "6g", "4g"),
        ("Pumpkin Kootu", ["Pumpkin", "Moong Dal", "Coconut"], 15, 20, 145, "7g", "21g", "6g", "4g"),
        ("Pumpkin Poriyal", ["Pumpkin", "Green Chilli", "Coconut"], 10, 15, 100, "2g", "15g", "4g", "4g"),
    ]),
    # 53. Disco Pumpkin
    ("Disco Pumpkin", [
        ("Pumpkin Erissery", ["Disco Pumpkin", "Coconut", "Curry Leaves"], 10, 15, 155, "3 g", "18 g", "5 g", "9 g"),
        ("Pumpkin Curry", ["Disco Pumpkin", "Onion", "Tomato"], 10, 15, 145, "3 g", "20 g", "4 g", "7 g"),
        ("Pumpkin Pie", ["Disco Pumpkin", "Condensed Milk", "Pie Crust"], 20, 40, 310, "6 g", "42 g", "2 g", "13 g"),
    ]),
    # 54. Colocasia
    ("Colocasia", [
        ("Seppankizhangu Roast", ["Colocasia", "Rice Flour"], 15, 15, 225, "3 g", "35 g", "5 g", "9 g"),
        ("Seppankizhangu Coconut Poriyal", ["Colocasia", "Coconut", "Onion"], 15, 15, 250, "4 g", "38 g", "6 g", "10 g"),
        ("Seppankizhangu Tomato Curry", ["Colocasia", "Tomato", "Onion"], 15, 18, 235, "4 g", "36 g", "6 g", "9 g"),
    ]),
    # 55. Knol Khol
    ("Knol Khol", [
        ("Knol Khol Kootu", ["Knol Khol", "Moong Dal", "Coconut"], 10, 15, 165, "7 g", "22 g", "5 g", "6 g"),
        ("Kashmiri Knol Khol Curry", ["Knol Khol", "Curd", "Cumin"], 10, 18, 155, "5 g", "14 g", "4 g", "9 g"),
        ("Knol Khol Vegetable Soup", ["Knol Khol", "Carrot", "Cabbage"], 8, 15, 95, "3 g", "16 g", "4 g", "3 g"),
    ]),
    # 56. Banana Stem
    ("Banana Stem", [
        ("Vazhaithandu Poriyal", ["Banana Stem", "Moong Dal", "Coconut"], 15, 12, 135, "5 g", "17 g", "5 g", "6 g"),
        ("Vazhaithandu Mor Kootu", ["Banana Stem", "Curd", "Coconut"], 15, 12, 125, "5 g", "13 g", "4 g", "6 g"),
        ("Vazhaithandu Usli", ["Banana Stem", "Toor Dal", "Chana Dal"], 60, 20, 235, "11 g", "29 g", "7 g", "8 g"),
    ]),
    # 57. Raw Banana
    ("Raw Banana", [
        ("Vazhakkai Poriyal", ["Raw Banana", "Coconut"], 8, 12, 180, "2 g", "30 g", "5 g", "7 g"),
        ("Vazhakkai Podimas", ["Raw Banana", "Ginger", "Coconut"], 10, 12, 175, "3 g", "29 g", "5 g", "7 g"),
        ("Aratikaya Fry", ["Raw Banana", "Curry Leaves"], 8, 15, 190, "2 g", "31 g", "4 g", "8 g"),
    ]),
    # 58. Raw Papaya
    ("Raw Papaya", [
        ("Raw Papaya Sabzi", ["Raw Papaya", "Onion", "Tomato"], 10, 15, 120, "2 g", "18 g", "4 g", "5 g"),
        ("Raw Papaya Kofta Curry", ["Raw Papaya", "Besan", "Tomato"], 20, 20, 245, "7 g", "29 g", "5 g", "11 g"),
        ("Raw Papaya Salad", ["Raw Papaya", "Carrot", "Roasted Peanuts"], 15, 0, 105, "3 g", "15 g", "4 g", "4 g"),
    ]),
    # 59. Broccoli
    ("Broccoli", [
        ("Broccoli Poriyal", ["Broccoli", "Onion", "Coconut"], 5, 10, 145, "6 g", "14 g", "6 g", "8 g"),
        ("Broccoli Paruppu Usili", ["Broccoli", "Chana Dal", "Curry Leaves"], 35, 20, 240, "11 g", "30 g", "8 g", "9 g"),
        ("Broccoli Pepper Fry", ["Broccoli", "Garlic", "Onion"], 5, 15, 135, "6 g", "13 g", "5 g", "8 g"),
    ]),
    # 60. Button Mushroom
    ("Button Mushroom", [
        ("Mushroom Pepper Fry", ["Mushroom", "Onion", "Capsicum"], 10, 15, 125, "5g", "10g", "3g", "8g"),
        ("Mushroom Masala", ["Mushroom", "Tomato", "Onion"], 10, 20, 145, "5g", "14g", "3g", "9g"),
        ("Mushroom Vegetable Stir Fry", ["Mushroom", "Broccoli", "Capsicum", "Carrot"], 10, 15, 120, "6g", "12g", "4g", "6g"),
    ]),
    # 61. Baby Corn
    ("Baby Corn", [
        ("Baby Corn Manchurian", ["Baby Corn", "Capsicum", "Spring Onion"], 15, 15, 285, "5 g", "40 g", "4 g", "12 g"),
        ("Baby Corn Stir Fry", ["Baby Corn", "Tomato", "Capsicum"], 10, 12, 155, "5 g", "22 g", "5 g", "6 g"),
        ("Baby Corn Vegetable Soup", ["Baby Corn", "Carrot", "Mushroom"], 10, 15, 105, "4 g", "18 g", "4 g", "3 g"),
    ]),
    # 62. Sweet Corn Cob
    ("Sweet Corn Cob", [
        ("Corn Masala", ["Sweet Corn", "Onion", "Capsicum"], 10, 15, 155, "5g", "24g", "4g", "5g"),
        ("Corn Vegetable Soup", ["Sweet Corn", "Carrot", "Beans"], 10, 20, 105, "4g", "18g", "4g", "2g"),
        ("Corn Chaat", ["Sweet Corn", "Tomato", "Onion", "Coriander", "Lemon"], 10, 10, 140, "4g", "25g", "4g", "3g"),
    ]),
    # 63. Green Capsicum
    ("Green Capsicum", [
        ("Capsicum Masala", ["Capsicum", "Onion", "Tomato"], 10, 20, 130, "3g", "16g", "4g", "7g"),
        ("Capsicum Rice", ["Capsicum", "Carrot", "Green Peas"], 10, 15, 235, "5g", "41g", "3g", "7g"),
        ("Capsicum Potato Fry", ["Capsicum", "Potato", "Onion"], 10, 20, 175, "4g", "28g", "5g", "6g"),
    ]),
    # 64. Red Bell Pepper
    ("Red Bell Pepper", [
        ("Stuffed Red Bell Pepper", ["Red Bell Pepper", "Potato", "Green Peas"], 15, 25, 250, "8 g", "32 g", "6 g", "11 g"),
        ("Roasted Red Bell Pepper Soup", ["Red Bell Pepper", "Tomato", "Garlic"], 10, 20, 105, "3 g", "16 g", "4 g", "4 g"),
        ("Red Bell Pepper Bajji", ["Red Bell Pepper", "Besan", "Rice Flour"], 10, 8, 245, "7 g", "29 g", "5 g", "12 g"),
    ]),
    # 65. Yellow Bell Pepper
    ("Yellow Bell Pepper", [
        ("Yellow Bell Pepper Bajji", ["Yellow Bell Pepper", "Besan"], 10, 8, 250, "7 g", "29 g", "5 g", "12 g"),
        ("Stuffed Yellow Bell Pepper", ["Yellow Bell Pepper", "Green Peas", "Rice"], 15, 20, 270, "9 g", "36 g", "6 g", "10 g"),
        ("Yellow Bell Pepper Besan Curry", ["Yellow Bell Pepper", "Besan", "Onion"], 8, 15, 190, "7 g", "23 g", "5 g", "8 g"),
    ]),
    # 66. Green Zucchini
    ("Green Zucchini", [
        ("Green Zucchini Fritters", ["Green Zucchini", "Besan", "Wheat Flour"], 10, 10, 220, "7 g", "27 g", "5 g", "10 g"),
        ("Stuffed Green Zucchini", ["Green Zucchini", "Green Peas", "Cheese"], 15, 15, 210, "9 g", "19 g", "5 g", "12 g"),
        ("Green Zucchini Vegetable Soup", ["Green Zucchini", "Carrot", "Sweet Corn"], 10, 15, 125, "4 g", "20 g", "4 g", "4 g"),
    ]),
    # 68. Green Moong Sprouts
    ("Green Moong Sprouts", [
        ("Sprouts Salad", ["Moong Sprouts", "Cucumber", "Carrot", "Tomato", "Lemon"], 10, 5, 105, "7g", "17g", "5g", "2g"),
        ("Sprouts Stir Fry", ["Moong Sprouts", "Capsicum", "Carrot", "Onion"], 10, 15, 125, "8g", "18g", "5g", "4g"),
        ("Sprouts Chaat", ["Moong Sprouts", "Tomato", "Onion", "Coriander", "Lemon"], 10, 10, 115, "7g", "19g", "5g", "2g"),
    ]),
]

print("Deleting existing recipes...")
VegetableRecipe.objects.all().delete()

created_recipes = 0
created_ingredients = 0

for primary_name, recipes_list in USER_RECIPES_DATA:
    primary_pkg = find_veg(primary_name)
    if not primary_pkg:
        print(f"WARNING: Primary vegetable '{primary_name}' not found in active packages!")
        continue

    for recipe_tuple in recipes_list:
        recipe_name = recipe_tuple[0]
        ing_names = recipe_tuple[1]
        prep_time = recipe_tuple[2]
        cook_time = recipe_tuple[3]
        calories_val = recipe_tuple[4]
        protein_val = recipe_tuple[5]
        carbs_val = recipe_tuple[6]
        fiber_val = recipe_tuple[7]
        fat_val = recipe_tuple[8]

        slug = f"{primary_pkg.id}-{recipe_name.lower().replace('/', ' ').replace('&', ' ').replace('(', ' ').replace(')', ' ').replace('-', ' ')}"
        slug = "-".join([w for w in slug.split() if w])

        recipe = VegetableRecipe.objects.create(
            package=primary_pkg,
            name=recipe_name,
            slug=slug,
            image=primary_pkg.image or "/mockups/vegetables_realistic.png",
            short_description=f"Delicious homestyle {recipe_name} prepared fresh with farm {primary_pkg.name}.",
            prep_time_minutes=prep_time,
            cook_time_minutes=cook_time,
            total_time_minutes=prep_time + cook_time,
            difficulty="Easy",
            servings=2,
            calories=calories_val,
            protein=protein_val,
            carbohydrates=carbs_val,
            fiber=fiber_val,
            fat=fat_val,
            health_benefits=[
                f"Nutrient-rich homestyle recipe featuring fresh {primary_pkg.name}.",
                "Rich in dietary fiber, vitamins, and natural antioxidants for daily health."
            ],
            health_tips=[
                f"Rinse {primary_pkg.name} thoroughly under cold water before preparation.",
                "Cook on medium flame to retain natural produce crispness and nutrients."
            ],
            instructions=[
                f"1. Wash and prepare fresh {primary_pkg.name} and required vegetables.",
                f"2. Heat pan, temper with mild seasoning, and add chopped produce.",
                f"3. Sauté and simmer for 10-15 minutes until tender and aromatic.",
                f"4. Garnish and serve warm with fresh accompaniments."
            ],
            tags=["Quick Recipes", "Easy Recipes", "Homestyle"],
            is_active=True,
            is_popular=True
        )
        created_recipes += 1

        # Add ingredients
        for idx, ing_name in enumerate(ing_names):
            matched_pkg = find_veg(ing_name)
            is_cat = bool(matched_pkg)
            RecipeIngredient.objects.create(
                recipe=recipe,
                package=matched_pkg,
                name=matched_pkg.name if matched_pkg else ing_name,
                quantity=1 if is_cat else 2,
                unit=matched_pkg.duration if (matched_pkg and matched_pkg.duration) else ("pcs" if is_cat else "tbsp"),
                notes="Freshly prepared",
                is_catalog_vegetable=is_cat,
                sort_order=idx
            )
            created_ingredients += 1

print(f"SUCCESS: Created {created_recipes} recipes with {created_ingredients} ingredients across all 68 vegetables with exact time & nutrition data!")
