from django.core.management.base import BaseCommand
from inventory.models import Vegetable, VegetableCategory
from companies.models import Company


class Command(BaseCommand):
    help = "Seed standard vegetable categories and map existing vegetables"

    def handle(self, *args, **options):
        org = Company.objects.first()
        categories_data = [
            {
                'name': 'Daily Staples & Aromatics',
                'slug': 'daily-staples',
                'description': 'Essential kitchen bases: onions, potatoes, tomatoes, ginger, garlic, chillies, and cooking aromatics',
                'sort_order': 1,
                'image': '/mockups/veg_onion.png'
            },
            {
                'name': 'Leafy Greens & Herbs',
                'slug': 'leafy-greens',
                'description': 'Freshly harvested greens, palak, methi, mint, coriander, moringa, amaranthus, and culinary herbs',
                'sort_order': 2,
                'image': '/mockups/veg_palak.png'
            },
            {
                'name': 'Root Vegetables & Tubers',
                'slug': 'root-vegetables',
                'description': 'Nutritious carrots, beetroots, radishes, sweet potatoes, colocasia, and knol khol',
                'sort_order': 3,
                'image': '/mockups/veg_carrot.png'
            },
            {
                'name': 'Gourds & Squashes',
                'slug': 'gourds-squashes',
                'description': 'Hydrating bottle gourds, ridge gourds, bitter gourds, snake gourds, ash gourds, ivy gourds, and pumpkins',
                'sort_order': 4,
                'image': '/mockups/veg_bottle_gourd.png'
            },
            {
                'name': 'Beans, Peas & Pods',
                'slug': 'beans-peas-pods',
                'description': 'Crisp french beans, broad beans, cluster beans, cowpea beans, green peas, and drumsticks',
                'sort_order': 5,
                'image': '/mockups/veg_beans.png'
            },
            {
                'name': 'Daily Cooking Veggies',
                'slug': 'daily-cooking-veggies',
                'description': 'Fresh brinjals, lady fingers, cabbages, cauliflowers, capsicums, cucumbers, raw bananas, and sweet corn',
                'sort_order': 6,
                'image': '/mockups/veg_ladies_finger.png'
            },
            {
                'name': 'Exotics & Special Produce',
                'slug': 'exotics-special-produce',
                'description': 'Gourmet broccoli, button mushrooms, green zucchinis, baby corn, and colored bell peppers',
                'sort_order': 7,
                'image': '/mockups/veg_broccoli.png'
            },
        ]

        cat_objs = {}
        for cd in categories_data:
            cat, _ = VegetableCategory.objects.get_or_create(
                slug=cd['slug'],
                defaults={
                    'name': cd['name'],
                    'description': cd['description'],
                    'sort_order': cd['sort_order'],
                    'image': cd['image'],
                    'org': org,
                    'is_active': True,
                }
            )
            cat_objs[cd['slug']] = cat

        cat_map = {
            "daily-staples": [
                "Onion (Vengayam)", "Sambhar Onion (Vengayam)", "Potato (Urulaikizhangu)", "Baby Potato (Urulaikizhangu)",
                "Ooty Potato", "Tomato (Thakkali)", "Ginger", "Garlic (Poondu)", "Peeled Garlic (Uricha Poondu)",
                "Green Chilli (Pachai Milagaai)", "Lemon (Elumichai Pazham)", "Curry Leaves (Karuvepillai)", "Raw Turmeric (Manjal)"
            ],
            "leafy-greens": [
                "Spinach (Palak Keerai)", "Fenugreek (Methi)", "Mint Leaves (Pudina)", "Coriander Bunch (Kothamalli)",
                "Spring Onion (Vengaya Thaal)", "Green Lettuce", "Green Amaranthus Leaves", "Red Amaranthus Leaves",
                "Neem Leaves (Veppilai)", "Drumstick Leaves (Moringa)", "Italian Basil Leaves", "Fresh Rosemary"
            ],
            "root-vegetables": [
                "Orange Carrot (Local Carrot)", "Beetroot", "Radish (Mullangi)", "Sweet Potato (Chakkara Valli)",
                "Knol Khol (Nookal)", "Colocasia (Seppankizhangu)"
            ],
            "gourds-squashes": [
                "Ash Gourd (Sambal Pusanikkai)", "Bottle Gourd (Surakkai)", "Ridge Gourd (Peerangai)", "Bitter Gourd (Pavakkai)",
                "Snake Gourd (Pudalangai)", "Ivy Gourd (Kovakkai)", "Chow Chow", "Pointed Gourd",
                "Green Pumpkin (Pusanikkai)", "Disco Pumpkin", "Pumpkin Yellow (Cut)"
            ],
            "beans-peas-pods": [
                "French Beans (Beans)", "Broad Beans (Avarakkai)", "Cluster Beans (Kothavarangai)", "Cowpea Beans (Karamani)",
                "Green Peas (Pachai Pattani)", "Drumstick (Murungakkai)", "Green Moong Sprouts"
            ],
            "daily-cooking-veggies": [
                "Lady Finger (Vendaikkai)", "Brinjal (Vari Kathirikkai)", "Brinjal - Bharta", "Cabbage (Muttaikose)",
                "Cauliflower (Pookosu)", "Green Capsicum (Kudai Milagaai)", "Green Cucumber (Vellarikai)",
                "Raw Banana (Vazhakkai)", "Banana Stem (Vazhai Thandu)", "Raw Papaya (Pappalikkai)",
                "Sweet Corn Cob (Cholam)"
            ],
            "exotics-special-produce": [
                "Broccoli", "Button Mushroom (Kaalan)", "Green Zucchini", "Baby Corn - Packet",
                "Red Bell Pepper", "Yellow Bell Pepper (Manjal Kuda Milagai)"
            ],
        }

        # Map all 67 vegetables
        for slug, item_names in cat_map.items():
            cat = cat_objs[slug]
            for name in item_names:
                vegs = Vegetable.objects.filter(name__icontains=name) | Vegetable.objects.filter(package__name__iexact=name)
                for v in vegs:
                    v.category = cat
                    v.save(update_fields=['category'])

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {VegetableCategory.objects.count()} categories and mapped {Vegetable.objects.count()} vegetables."))
