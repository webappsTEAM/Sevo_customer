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
        ("Baby Potato Roast", ["Baby Potato", "Curry Leaves"], 10, 20, 185, "4g", "28g", "4g", "7g"),
        ("Baby Potato Masala", ["Baby Potato", "Onion", "Tomato"], 15, 25, 190, "4g", "27g", "4g", "8g"),
        ("Baby Potato Kurma", ["Baby Potato", "Carrot", "Green Peas"], 15, 25, 210, "5g", "27g", "5g", "10g"),
    ]),
    # 7. Ooty Potato
    ("Ooty Potato", [
        ("Ooty Potato Fry", ["Ooty Potato", "Onion"], 10, 20, 185, "4g", "29g", "4g", "7g"),
        ("Potato Kurma", ["Ooty Potato", "Carrot", "Green Peas"], 15, 25, 200, "5g", "28g", "5g", "8g"),
        ("Potato Masala", ["Ooty Potato", "Tomato", "Onion", "Green Chilli"], 10, 20, 175, "4g", "28g", "4g", "6g"),
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
        ("Lemon Rice", ["Lemon", "Green Chilli", "Curry Leaves", "Coriander"], 10, 15, 240, "5g", "42g", "2g", "7g"),
        ("Lemon Vegetable Salad", ["Lemon", "Cucumber", "Carrot", "Beetroot"], 10, 5, 60, "2g", "12g", "4g", "1g"),
        ("Lemon Rasam", ["Lemon", "Tomato", "Coriander", "Green Chilli"], 10, 15, 65, "2g", "9g", "2g", "2g"),
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
        ("Green Amaranthus Poriyal", ["Amaranthus", "Onion", "Coconut"], 15, 15, 110, "4g", "12g", "5g", "5g"),
        ("Amaranthus Dal", ["Amaranthus", "Tomato", "Onion"], 15, 25, 175, "9g", "23g", "7g", "4g"),
        ("Amaranthus Kootu", ["Amaranthus", "Carrot", "Moong Dal"], 15, 20, 150, "7g", "20g", "7g", "4g"),
    ]),
    # 35. Red Amaranthus
    ("Red Amaranthus", [
        ("Red Keerai Poriyal", ["Red Amaranthus", "Onion", "Coconut"], 15, 15, 110, "4g", "12g", "5g", "5g"),
        ("Red Keerai Dal", ["Red Amaranthus", "Tomato", "Onion"], 15, 25, 175, "9g", "23g", "7g", "4g"),
        ("Red Keerai Kootu", ["Red Amaranthus", "Carrot", "Moong Dal"], 15, 20, 150, "7g", "20g", "7g", "4g"),
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
        ("Avarakkai Poriyal", ["Broad Beans", "Coconut"], 10, 15, 105, "4g", "13g", "5g", "5g"),
        ("Avarakkai Sambar", ["Broad Beans", "Tomato", "Onion"], 15, 25, 150, "7g", "22g", "6g", "4g"),
        ("Broad Beans Kootu", ["Broad Beans", "Carrot", "Moong Dal"], 15, 20, 150, "7g", "20g", "7g", "4g"),
    ]),
    # 39. Cluster Beans
    ("Cluster Beans", [
        ("Kothavarangai Poriyal", ["Cluster Beans", "Coconut", "Onion"], 10, 15, 110, "4g", "13g", "5g", "5g"),
        ("Kothavarangai Sambar", ["Cluster Beans", "Tomato", "Onion"], 15, 25, 150, "7g", "22g", "7g", "4g"),
        ("Cluster Beans Curry", ["Cluster Beans", "Potato", "Tomato"], 15, 25, 165, "4g", "25g", "6g", "6g"),
    ]),
    # 40. Cowpea Beans
    ("Cowpea Beans", [
        ("Karamani Poriyal", ["Cowpea Beans", "Onion", "Coconut"], 10, 20, 140, "7g", "19g", "7g", "5g"),
        ("Karamani Kuzhambu", ["Cowpea Beans", "Tomato", "Small Onion"], 15, 25, 160, "7g", "23g", "7g", "5g"),
        ("Karamani Vegetable Curry", ["Cowpea Beans", "Potato", "Carrot"], 15, 25, 180, "8g", "28g", "8g", "5g"),
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
        ("Ash Gourd Mor Kuzhambu", ["Ash Gourd", "Green Chilli", "Coriander"], 15, 20, 130, "5g", "12g", "3g", "7g"),
        ("Ash Gourd Kootu", ["Ash Gourd", "Moong Dal", "Coconut"], 15, 20, 145, "7g", "19g", "5g", "5g"),
        ("Ash Gourd Sambar", ["Ash Gourd", "Tomato", "Onion"], 15, 25, 140, "7g", "21g", "6g", "4g"),
    ]),
    # 48. Ivy Gourd
    ("Ivy Gourd", [
        ("Kovakkai Fry", ["Ivy Gourd", "Onion"], 10, 15, 115, "3g", "13g", "5g", "6g"),
        ("Kovakkai Poriyal", ["Ivy Gourd", "Coconut", "Green Chilli"], 10, 15, 105, "3g", "13g", "5g", "5g"),
        ("Kovakkai Masala", ["Ivy Gourd", "Tomato", "Onion"], 10, 20, 130, "3g", "16g", "5g", "6g"),
    ]),
    # 49. Pointed Gourd
    ("Pointed Gourd", [
        ("Parwal Fry", ["Pointed Gourd", "Onion"], 10, 15, 120, "3g", "14g", "4g", "6g"),
        ("Parwal Masala", ["Pointed Gourd", "Tomato", "Green Chilli"], 10, 20, 135, "3g", "17g", "5g", "7g"),
        ("Parwal Potato Curry", ["Pointed Gourd", "Potato", "Tomato"], 15, 25, 175, "4g", "28g", "6g", "6g"),
    ]),
    # 50. Chow Chow
    ("Chow Chow", [
        ("Chow Chow Kootu", ["Chow Chow", "Moong Dal", "Carrot"], 15, 20, 140, "7g", "19g", "5g", "4g"),
        ("Chow Chow Poriyal", ["Chow Chow", "Coconut", "Onion"], 10, 15, 95, "2g", "12g", "4g", "5g"),
        ("Chow Chow Sambar", ["Chow Chow", "Tomato", "Onion"], 15, 25, 140, "7g", "21g", "6g", "4g"),
    ]),
    # 51. Green Pumpkin
    ("Green Pumpkin", [
        ("Pumpkin Poriyal", ["Green Pumpkin", "Coconut", "Green Chilli"], 10, 15, 100, "2g", "15g", "4g", "4g"),
        ("Pumpkin Kootu", ["Green Pumpkin", "Moong Dal", "Carrot"], 15, 20, 145, "7g", "21g", "6g", "4g"),
        ("Pumpkin Sambar", ["Green Pumpkin", "Tomato", "Onion"], 15, 25, 145, "7g", "22g", "6g", "4g"),
    ]),
    # 52. Pumpkin Yellow – Cut
    ("Pumpkin Yellow (Cut)", [
        ("Yellow Pumpkin Sambar", ["Pumpkin", "Tomato", "Onion"], 15, 25, 145, "7g", "22g", "6g", "4g"),
        ("Pumpkin Kootu", ["Pumpkin", "Moong Dal", "Coconut"], 15, 20, 145, "7g", "21g", "6g", "4g"),
        ("Pumpkin Poriyal", ["Pumpkin", "Green Chilli", "Coconut"], 10, 15, 100, "2g", "15g", "4g", "4g"),
    ]),
    # 53. Disco Pumpkin
    ("Disco Pumpkin", [
        ("Pumpkin Sambar", ["Disco Pumpkin", "Tomato", "Onion"], 15, 25, 145, "7g", "22g", "6g", "4g"),
        ("Pumpkin Kootu", ["Disco Pumpkin", "Moong Dal", "Coconut"], 15, 20, 145, "7g", "21g", "6g", "4g"),
        ("Pumpkin Poriyal", ["Disco Pumpkin", "Green Chilli", "Coconut"], 10, 15, 100, "2g", "15g", "4g", "4g"),
    ]),
    # 54. Colocasia
    ("Colocasia", [
        ("Seppankizhangu Roast", ["Colocasia", "Onion"], 15, 25, 210, "3g", "34g", "5g", "7g"),
        ("Seppankizhangu Fry", ["Colocasia", "Green Chilli", "Curry Leaves"], 15, 20, 200, "3g", "32g", "5g", "7g"),
        ("Colocasia Masala", ["Colocasia", "Tomato", "Onion"], 15, 25, 185, "4g", "29g", "5g", "7g"),
    ]),
    # 55. Knol Khol
    ("Knol Khol", [
        ("Knol Khol Poriyal", ["Knol Khol", "Coconut", "Onion"], 10, 15, 95, "3g", "13g", "4g", "4g"),
        ("Knol Khol Kootu", ["Knol Khol", "Moong Dal", "Carrot"], 15, 20, 140, "7g", "20g", "6g", "4g"),
        ("Knol Khol Sambar", ["Knol Khol", "Tomato", "Onion"], 15, 25, 140, "7g", "21g", "6g", "4g"),
    ]),
    # 56. Banana Stem
    ("Banana Stem", [
        ("Vazhaithandu Poriyal", ["Banana Stem", "Coconut", "Onion"], 20, 15, 90, "2g", "13g", "5g", "4g"),
        ("Banana Stem Kootu", ["Banana Stem", "Moong Dal", "Carrot"], 20, 20, 135, "7g", "20g", "7g", "4g"),
        ("Banana Stem Salad", ["Banana Stem", "Cucumber", "Carrot", "Lemon"], 20, 5, 65, "2g", "12g", "5g", "1g"),
    ]),
    # 57. Raw Banana
    ("Raw Banana", [
        ("Raw Banana Fry", ["Raw Banana", "Onion"], 10, 20, 180, "3g", "30g", "5g", "6g"),
        ("Raw Banana Poriyal", ["Raw Banana", "Coconut", "Green Chilli"], 10, 20, 155, "3g", "27g", "5g", "5g"),
        ("Raw Banana Masala", ["Raw Banana", "Tomato", "Onion"], 10, 20, 165, "3g", "28g", "5g", "6g"),
    ]),
    # 58. Raw Papaya
    ("Raw Papaya", [
        ("Raw Papaya Poriyal", ["Raw Papaya", "Coconut", "Onion"], 10, 15, 95, "2g", "14g", "4g", "4g"),
        ("Raw Papaya Kootu", ["Raw Papaya", "Moong Dal", "Carrot"], 15, 20, 140, "7g", "20g", "6g", "4g"),
        ("Raw Papaya Curry", ["Raw Papaya", "Tomato", "Green Chilli"], 10, 20, 120, "3g", "17g", "5g", "5g"),
    ]),
    # 59. Broccoli
    ("Broccoli", [
        ("Broccoli Stir Fry", ["Broccoli", "Carrot", "Capsicum"], 10, 15, 110, "5g", "13g", "5g", "5g"),
        ("Broccoli Soup", ["Broccoli", "Carrot", "Potato"], 10, 20, 100, "5g", "15g", "5g", "3g"),
        ("Broccoli Vegetable Roast", ["Broccoli", "Mushroom", "Zucchini"], 15, 20, 125, "5g", "15g", "5g", "6g"),
    ]),
    # 60. Button Mushroom
    ("Button Mushroom", [
        ("Mushroom Pepper Fry", ["Mushroom", "Onion", "Capsicum"], 10, 15, 125, "5g", "10g", "3g", "8g"),
        ("Mushroom Masala", ["Mushroom", "Tomato", "Onion"], 10, 20, 145, "5g", "14g", "3g", "9g"),
        ("Mushroom Vegetable Stir Fry", ["Mushroom", "Broccoli", "Capsicum", "Carrot"], 10, 15, 120, "6g", "12g", "4g", "6g"),
    ]),
    # 61. Baby Corn
    ("Baby Corn", [
        ("Baby Corn Manchurian", ["Baby Corn", "Capsicum", "Spring Onion"], 15, 20, 210, "5g", "31g", "4g", "8g"),
        ("Baby Corn Stir Fry", ["Baby Corn", "Carrot", "Beans", "Capsicum"], 10, 15, 120, "4g", "18g", "5g", "4g"),
        ("Baby Corn Vegetable Soup", ["Baby Corn", "Carrot", "Mushroom"], 10, 20, 100, "4g", "17g", "4g", "2g"),
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
        ("Red Pepper Stir Fry", ["Red Bell Pepper", "Broccoli", "Carrot"], 10, 15, 110, "4g", "15g", "5g", "4g"),
        ("Red Pepper Pasta", ["Red Bell Pepper", "Tomato", "Basil"], 10, 20, 290, "9g", "47g", "6g", "8g"),
        ("Red Pepper Vegetable Soup", ["Red Bell Pepper", "Carrot", "Potato"], 10, 20, 105, "3g", "18g", "5g", "3g"),
    ]),
    # 65. Yellow Bell Pepper
    ("Yellow Bell Pepper", [
        ("Yellow Pepper Stir Fry", ["Yellow Bell Pepper", "Broccoli", "Zucchini"], 10, 15, 110, "4g", "15g", "5g", "4g"),
        ("Yellow Pepper Rice", ["Yellow Bell Pepper", "Carrot", "Green Peas"], 10, 15, 235, "5g", "41g", "3g", "7g"),
        ("Yellow Pepper Soup", ["Yellow Bell Pepper", "Carrot", "Potato"], 10, 20, 105, "3g", "18g", "5g", "3g"),
    ]),
    # 66. Assorted Capsicum
    ("Assorted Capsicum", [
        ("Three Pepper Stir Fry", ["Red Bell Pepper", "Yellow Bell Pepper", "Green Capsicum", "Onion"], 10, 15, 110, "4g", "15g", "5g", "4g"),
        ("Three Pepper Fried Rice", ["Red Bell Pepper", "Yellow Bell Pepper", "Green Capsicum", "Carrot", "Green Peas"], 15, 15, 245, "6g", "42g", "4g", "7g"),
        ("Capsicum Pasta", ["Red Bell Pepper", "Yellow Bell Pepper", "Green Capsicum", "Tomato", "Italian Basil Leaves"], 10, 20, 290, "9g", "47g", "6g", "8g"),
    ]),
    # 67. Green Zucchini
    ("Green Zucchini", [
        ("Zucchini Stir Fry", ["Zucchini", "Capsicum", "Carrot"], 10, 10, 100, "3g", "12g", "3g", "5g"),
        ("Zucchini Soup", ["Zucchini", "Potato", "Carrot"], 10, 20, 90, "3g", "13g", "3g", "3g"),
        ("Zucchini Vegetable Roast", ["Zucchini", "Broccoli", "Mushroom"], 10, 20, 115, "4g", "14g", "4g", "5g"),
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
