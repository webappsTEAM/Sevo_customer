import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus, PaymentPolicy

SERVICES_STRUCTURE = [
    {
        "category": {
            "name": "Goods & Transports",
            "slug": "goods_transports",
            "icon": "Truck",
            "image": "/mockups/category_goods_transports.png",
            "description": "Mini trucks, two-wheelers & full house packers and movers relocation across Hosur & beyond",
            "sort_order": 1
        },
        "services": [
            {
                "name": "Truck",
                "slug": "truck",
                "icon": "Truck",
                "image": "/mockups/service_truck.png",
                "description": "Instant mini truck booking (Tata Ace, Pickup 8ft, Tata 407) for goods transport",
                "sort_order": 1,
                "packages": [
                    {"name": "Tata Ace (Up to 750 kg)", "slug": "tata-ace-750kg", "base_price": 350, "offer_price": 299, "duration": "Instant (15 mins)"},
                    {"name": "Pickup 8ft (Up to 1.2 Ton)", "slug": "pickup-8ft-1-2ton", "base_price": 550, "offer_price": 499, "duration": "Instant (20 mins)"},
                    {"name": "Tata 407 (Up to 2.5 Ton)", "slug": "tata-407-2-5ton", "base_price": 950, "offer_price": 850, "duration": "Instant (30 mins)"},
                ]
            },
            {
                "name": "Two Wheeler",
                "slug": "two-wheeler",
                "icon": "Bike",
                "image": "/mockups/service_two_wheeler.png",
                "description": "Fast doorstep package, document & parcel delivery via bike couriers",
                "sort_order": 2,
                "packages": [
                    {"name": "Instant Bike Courier (Up to 20 kg)", "slug": "instant-bike-courier", "base_price": 60, "offer_price": 49, "duration": "15-30 mins"},
                    {"name": "Document & Fragile Delivery", "slug": "doc-fragile-delivery", "base_price": 80, "offer_price": 65, "duration": "15-30 mins"},
                ]
            },
            {
                "name": "Packers & Movers",
                "slug": "packers-movers",
                "icon": "Boxes",
                "image": "/mockups/service_packers_movers.png",
                "description": "Full household & corporate office shifting with verified crew, bubble packing & on-time transport",
                "sort_order": 3,
                "packages": [
                    {"name": "1 RK / 1 BHK Shifting", "slug": "1bhk-shifting", "base_price": 1799, "offer_price": 1499, "duration": "Same Day (2-4 hrs)"},
                    {"name": "2 BHK / 3 BHK Shifting", "slug": "2bhk-3bhk-shifting", "base_price": 3499, "offer_price": 2999, "duration": "Same Day (4-6 hrs)"},
                    {"name": "Villa / Office Relocation", "slug": "villa-office-relocation", "base_price": 5499, "offer_price": 4499, "duration": "Dedicated Schedule"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Food and Health",
            "slug": "food_health",
            "icon": "Apple",
            "image": "/mockups/category_food_health.png",
            "description": "Farm-fresh organic green vegetables and daily grocery essentials with quick doorstep delivery",
            "sort_order": 2
        },
        "services": [
            {
                "name": "Farm-Fresh Vegetables",
                "slug": "vegetables",
                "icon": "Carrot",
                "image": "/mockups/vegetables_realistic.png",
                "description": "100% farm-fresh, organic local vegetables harvested daily and delivered in 8-15 mins",
                "sort_order": 1,
                "packages": [
                    {"name": "Daily Veggie Basket (5 kg Essentials)", "slug": "daily-veggie-basket-5kg", "base_price": 249, "offer_price": 199, "duration": "8-15 mins"},
                    {"name": "Organic Leafy & Salad Box", "slug": "organic-leafy-salad-box", "base_price": 179, "offer_price": 149, "duration": "8-15 mins"},
                    {"name": "Exotic Veggies & Gourds Pack", "slug": "exotic-veggies-pack", "base_price": 299, "offer_price": 249, "duration": "8-15 mins"},
                ]
            },
            {
                "name": "Groceries",
                "slug": "groceries",
                "icon": "ShoppingBag",
                "image": "/mockups/groceries_realistic.png",
                "description": "Atta, rice, dals, oils, spices and daily grocery staples",
                "sort_order": 2,
                "packages": [
                    {"name": "Monthly Kitchen Staples Pack", "slug": "monthly-kitchen-staples", "base_price": 999, "offer_price": 849, "duration": "Coming Soon"},
                    {"name": "Essential Dals & Grains Combo", "slug": "essential-dals-grains", "base_price": 499, "offer_price": 429, "duration": "Coming Soon"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Electrical",
            "slug": "electrical",
            "icon": "Zap",
            "image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80&fit=crop",
            "description": "Wiring, panels, switches & fixture installations",
            "sort_order": 3
        },
        "services": [
            {
                "name": "Electrician",
                "slug": "electrician",
                "icon": "Zap",
                "image": "/mockups/service_electrician.png",
                "description": "Certified expert electricians for switches, ceiling fans, short circuits & rewiring",
                "sort_order": 1,
                "packages": [
                    {"name": "Ceiling Fan Repair & Installation", "slug": "fan-repair-install", "base_price": 249, "offer_price": 199, "duration": "30-45 mins"},
                    {"name": "Switchboard & Socket Repair", "slug": "switchboard-socket-repair", "base_price": 199, "offer_price": 149, "duration": "30 mins"},
                    {"name": "MCB & Fusebox Replacement", "slug": "mcb-fusebox-replacement", "base_price": 399, "offer_price": 349, "duration": "1 hr"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Plumbing",
            "slug": "plumbing",
            "icon": "Wrench",
            "image": "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500&q=80&fit=crop",
            "description": "Pipe leaks, faucets, showers & drainage unclogging",
            "sort_order": 4
        },
        "services": [
            {
                "name": "Plumber",
                "slug": "plumber",
                "icon": "Wrench",
                "image": "/mockups/service_plumber.png",
                "description": "Experienced plumbers for tap leaks, water heaters, toilet repairs & pipe blockages",
                "sort_order": 1,
                "packages": [
                    {"name": "Tap / Faucet Repair & Replacement", "slug": "tap-faucet-repair", "base_price": 249, "offer_price": 199, "duration": "30 mins"},
                    {"name": "Drainage Block & Clog Clearance", "slug": "drain-clog-clearance", "base_price": 499, "offer_price": 399, "duration": "1 hr"},
                    {"name": "Wash Basin & Sink Fitting", "slug": "wash-basin-sink-fitting", "base_price": 349, "offer_price": 299, "duration": "45 mins"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Carpentry",
            "slug": "carpentry",
            "icon": "Hammer",
            "image": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=500&q=80&fit=crop",
            "description": "Furniture repair, modular fittings & door lock changes",
            "sort_order": 5
        },
        "services": [
            {
                "name": "Carpentry",
                "slug": "carpentry",
                "icon": "Hammer",
                "image": "/mockups/service_carpenter.png",
                "description": "Skilled carpenters for furniture assembly, cot frame repair, wardrobe latches & door alignment",
                "sort_order": 1,
                "packages": [
                    {"name": "Door Lock & Handle Installation", "slug": "door-lock-handle-install", "base_price": 299, "offer_price": 249, "duration": "45 mins"},
                    {"name": "Furniture Assembly & Bed Dismantling", "slug": "furniture-assembly-dismantling", "base_price": 499, "offer_price": 399, "duration": "1.5 hrs"},
                    {"name": "Cupboard / Wardrobe Hinge Repair", "slug": "wardrobe-hinge-repair", "base_price": 299, "offer_price": 249, "duration": "45 mins"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "AC & Heating",
            "slug": "hvac",
            "icon": "Wind",
            "image": "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500&q=80&fit=crop",
            "description": "AC servicing, deep foam cleaning & gas refills",
            "sort_order": 6
        },
        "services": [
            {
                "name": "Air Conditioner",
                "slug": "air-conditioner",
                "icon": "Wind",
                "image": "/mockups/service_ac.png",
                "description": "Split and window AC deep jet pump cleaning, gas top-up & cooling diagnostics",
                "sort_order": 1,
                "packages": [
                    {"name": "AC Deep Power Jet Service", "slug": "ac-deep-power-jet-service", "base_price": 699, "offer_price": 599, "duration": "1 hr"},
                    {"name": "AC Gas Refill & Leak Check", "slug": "ac-gas-refill-leak-check", "base_price": 2199, "offer_price": 1899, "duration": "1.5 hrs"},
                    {"name": "AC Complete Installation", "slug": "ac-complete-installation", "base_price": 1499, "offer_price": 1299, "duration": "2 hrs"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Appliances",
            "slug": "appliance_repair",
            "icon": "Tv",
            "image": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=500&q=80&fit=crop",
            "description": "Refrigerators, washing machines, microwaves and TV repairs",
            "sort_order": 7
        },
        "services": [
            {
                "name": "Refrigerator",
                "slug": "refrigerator",
                "icon": "Box",
                "image": "/mockups/service_fridge.png",
                "description": "Single & double door fridge cooling diagnostics, thermostat & compressor servicing",
                "sort_order": 1,
                "packages": [
                    {"name": "Single Door Fridge Checkup", "slug": "single-door-fridge-checkup", "base_price": 349, "offer_price": 299, "duration": "45 mins"},
                    {"name": "Double Door / Frost-Free Repair", "slug": "double-door-frost-free-repair", "base_price": 499, "offer_price": 449, "duration": "1 hr"},
                ]
            },
            {
                "name": "Washing Machine",
                "slug": "washing-machine",
                "icon": "Disc",
                "image": "/mockups/service_washing.png",
                "description": "Top load, front load & semi-automatic washing machine repair & drum descaling",
                "sort_order": 2,
                "packages": [
                    {"name": "Top Load Machine Checkup & Repair", "slug": "top-load-machine-repair", "base_price": 399, "offer_price": 349, "duration": "1 hr"},
                    {"name": "Front Load Advanced Diagnostics", "slug": "front-load-advanced-diagnostics", "base_price": 499, "offer_price": 449, "duration": "1 hr"},
                ]
            },
            {
                "name": "TV & Display",
                "slug": "tv-display",
                "icon": "Tv",
                "image": "/mockups/service_tv.png",
                "description": "LED, LCD & smart TV wall mounting, display backlight fixing & speaker repair",
                "sort_order": 3,
                "packages": [
                    {"name": "TV Wall Mount Installation (Up to 55 inch)", "slug": "tv-wall-mount-install", "base_price": 449, "offer_price": 399, "duration": "45 mins"},
                    {"name": "Smart TV Audio / Video Diagnostics", "slug": "smart-tv-diagnostics", "base_price": 399, "offer_price": 349, "duration": "45 mins"},
                ]
            },
            {
                "name": "Microwave Oven",
                "slug": "microwave-oven",
                "icon": "Zap",
                "image": "/mockups/service_microwave.png",
                "description": "Solo, grill & convection microwave heating issues, magnetron repair & plate spinning fixes",
                "sort_order": 4,
                "packages": [
                    {"name": "Microwave Not Heating Checkup", "slug": "microwave-heating-checkup", "base_price": 349, "offer_price": 299, "duration": "45 mins"},
                    {"name": "Complete Microwave Servicing", "slug": "complete-microwave-service", "base_price": 449, "offer_price": 399, "duration": "1 hr"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Painting",
            "slug": "painting",
            "icon": "Palette",
            "image": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500&q=80&fit=crop",
            "description": "Walls, ceilings, waterproofing & texture designs",
            "sort_order": 8
        },
        "services": [
            {
                "name": "Interior Painting",
                "slug": "interior-painting",
                "icon": "Home",
                "image": "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&q=80&fit=crop",
                "description": "Premium interior wall painting with putty primer & 2 coats of luxury emulsion",
                "sort_order": 1,
                "packages": [
                    {"name": "1 BHK Interior Full Repaint", "slug": "1bhk-interior-repaint", "base_price": 7999, "offer_price": 6999, "duration": "1-2 Days"},
                    {"name": "2 BHK / 3 BHK Luxury Interior Painting", "slug": "2bhk-3bhk-luxury-interior", "base_price": 15999, "offer_price": 13999, "duration": "3-4 Days"},
                ]
            },
            {
                "name": "Exterior Painting",
                "slug": "exterior-painting",
                "icon": "Sun",
                "image": "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&q=80&fit=crop",
                "description": "Weather-proof, anti-fungal exterior wall coating for homes and commercial buildings",
                "sort_order": 2,
                "packages": [
                    {"name": "Exterior Weather Guard Coat", "slug": "exterior-weather-guard", "base_price": 12999, "offer_price": 10999, "duration": "3-5 Days"},
                ]
            },
            {
                "name": "Waterproofing",
                "slug": "waterproofing",
                "icon": "Droplet",
                "image": "https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=300&q=80&fit=crop",
                "description": "Terrace, bathroom & wall seepage protection with elastomeric polymer sealants",
                "sort_order": 3,
                "packages": [
                    {"name": "Terrace Waterproofing Solution", "slug": "terrace-waterproofing", "base_price": 4999, "offer_price": 4499, "duration": "1-2 Days"},
                ]
            },
            {
                "name": "Wood & Metal",
                "slug": "wood-metal",
                "icon": "Layers",
                "image": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=300&q=80&fit=crop",
                "description": "Enamel painting for grills, gates, doors and wood polishing",
                "sort_order": 4,
                "packages": [
                    {"name": "Grill & Main Gate Enamel Coat", "slug": "grill-gate-enamel", "base_price": 1999, "offer_price": 1699, "duration": "1 Day"},
                ]
            },
            {
                "name": "Texture Decor",
                "slug": "texture-decor",
                "icon": "Sparkles",
                "image": "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?w=300&q=80&fit=crop",
                "description": "Designer accent walls, stencil art and metallic texture painting",
                "sort_order": 5,
                "packages": [
                    {"name": "Feature Accent Wall Texture", "slug": "feature-accent-wall-texture", "base_price": 3499, "offer_price": 2999, "duration": "1 Day"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Home Cleaning",
            "slug": "cleaning",
            "icon": "Sparkles",
            "image": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&q=80&fit=crop",
            "description": "Deep home cleaning, bathroom sanitization & kitchen scrubbing",
            "sort_order": 9
        },
        "services": [
            {
                "name": "Full House Cleaning",
                "slug": "full-house-cleaning",
                "icon": "Home",
                "image": "/mockups/service_deep_cleaning.png",
                "description": "Complete move-in / deep house sanitization, floor scrubbing, cobweb removal & glass buffing",
                "sort_order": 1,
                "packages": [
                    {"name": "1 BHK Complete Deep Cleaning", "slug": "1bhk-full-house-cleaning", "base_price": 2199, "offer_price": 1899, "duration": "3-4 hrs"},
                    {"name": "2 BHK / 3 BHK Deep House Scrubbing", "slug": "2bhk-3bhk-deep-cleaning", "base_price": 3499, "offer_price": 2999, "duration": "5-6 hrs"},
                ]
            },
            {
                "name": "Bathroom Cleaning",
                "slug": "bathroom-cleaning",
                "icon": "Droplet",
                "image": "/mockups/service_bathroom.png",
                "description": "Intense tile scaling, hard water stain removal, WC sanitization & tap shining",
                "sort_order": 2,
                "packages": [
                    {"name": "Single Bathroom Deep Stain Removal", "slug": "single-bathroom-cleaning", "base_price": 499, "offer_price": 399, "duration": "1 hr"},
                    {"name": "2x Bathrooms Deep Scrubbing", "slug": "2x-bathroom-cleaning", "base_price": 899, "offer_price": 749, "duration": "2 hrs"},
                ]
            },
            {
                "name": "Kitchen Cleaning",
                "slug": "kitchen-cleaning",
                "icon": "Coffee",
                "image": "/mockups/service_kitchen.png",
                "description": "Oil & grease degreasing, chimney exterior, exhaust fan & slab buffing",
                "sort_order": 3,
                "packages": [
                    {"name": "Standard Kitchen Degreasing", "slug": "standard-kitchen-degreasing", "base_price": 799, "offer_price": 699, "duration": "2 hrs"},
                ]
            },
            {
                "name": "Sofa Cleaning",
                "slug": "sofa-cleaning",
                "icon": "Layers",
                "image": "/mockups/service_sofa.png",
                "description": "Fabric & leather sofa vacuuming, stain spot treatment & shampoo extraction",
                "sort_order": 4,
                "packages": [
                    {"name": "3-Seater Sofa Shampoo Extraction", "slug": "3seater-sofa-cleaning", "base_price": 699, "offer_price": 599, "duration": "1.5 hrs"},
                    {"name": "5-Seater / L-Shape Sofa Spa", "slug": "5seater-sofa-spa", "base_price": 1099, "offer_price": 899, "duration": "2 hrs"},
                ]
            }
        ]
    },
    {
        "category": {
            "name": "Pest Control",
            "slug": "pest_control",
            "icon": "Shield",
            "image": "https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=500&q=80&fit=crop",
            "description": "Odorless herbal gel treatments for cockroaches, termites and bedbugs",
            "sort_order": 10
        },
        "services": [
            {
                "name": "Cockroach Control",
                "slug": "cockroach-control",
                "icon": "ShieldAlert",
                "image": "/mockups/service_pest_control.png",
                "description": "Odorless herbal gel baiting & spray across kitchen cabinets, drain pipes & corners",
                "sort_order": 1,
                "packages": [
                    {"name": "1-2 BHK Herbal Gel Cockroach Treatment", "slug": "1-2bhk-cockroach-treatment", "base_price": 899, "offer_price": 749, "duration": "45 mins"},
                ]
            },
            {
                "name": "Termite Control",
                "slug": "termite-control",
                "icon": "Shield",
                "image": "/mockups/termite_control.jpg",
                "description": "Drill-fill-seal chemical barrier protection for doors, frames & wooden furniture",
                "sort_order": 2,
                "packages": [
                    {"name": "Home Termite Chemical Barrier", "slug": "home-termite-barrier", "base_price": 1799, "offer_price": 1499, "duration": "2 hrs"},
                ]
            },
            {
                "name": "Ants & Bed Bugs Control",
                "slug": "ants-bed-bugs-control",
                "icon": "ShieldCheck",
                "image": "/mockups/bedbugs_control.jpg",
                "description": "Targeted insecticidal spray for mattresses, cot cracks & wall crevices",
                "sort_order": 3,
                "packages": [
                    {"name": "2-Stage Bedbug Elimination Treatment", "slug": "2stage-bedbug-treatment", "base_price": 1499, "offer_price": 1299, "duration": "1.5 hrs"},
                ]
            }
        ]
    }
]

def run_sync():
    print("Starting sync of Customer Services to Admin Catalog...")
    for item in SERVICES_STRUCTURE:
        cat_info = item["category"]
        category, _ = CatalogCategory.objects.update_or_create(
            slug=cat_info["slug"],
            defaults={
                "name": cat_info["name"],
                "icon": cat_info.get("icon", ""),
                "image": cat_info.get("image", ""),
                "description": cat_info.get("description", ""),
                "sort_order": cat_info.get("sort_order", 0),
                "is_active": True
            }
        )
        print(f"Synced Category: {category.name} ({category.slug})")

        for srv_info in item.get("services", []):
            service, _ = Service.objects.update_or_create(
                slug=srv_info["slug"],
                defaults={
                    "category": category,
                    "name": srv_info["name"],
                    "icon": srv_info.get("icon", ""),
                    "image": srv_info.get("image", ""),
                    "description": srv_info.get("description", ""),
                    "sort_order": srv_info.get("sort_order", 0),
                    "is_active": True
                }
            )
            print(f"  -> Synced Service: {service.name} (under {category.name})")

            for pkg_info in srv_info.get("packages", []):
                package, _ = Package.objects.update_or_create(
                    slug=pkg_info["slug"],
                    defaults={
                        "service": service,
                        "name": pkg_info["name"],
                        "description": f"Standard {pkg_info['name']} package with verified quality assurance",
                        "base_price": Decimal(str(pkg_info.get("base_price", 299))),
                        "offer_price": Decimal(str(pkg_info.get("offer_price", 249))) if pkg_info.get("offer_price") else None,
                        "duration": pkg_info.get("duration", "1 hr"),
                        "status": PackageStatus.ACTIVE,
                        "payment_policy": PaymentPolicy.BOTH,
                        "popular": True
                    }
                )
                print(f"     * Synced Package: {package.name} (INR {package.base_price})")

    print("\nSuccessfully synced all customer services & categories to Admin Catalog!")

if __name__ == '__main__':
    run_sync()
