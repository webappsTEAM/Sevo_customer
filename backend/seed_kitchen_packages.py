import os
import sys
import django
from django.db.models import Max

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
django.setup()

from service_requests.models import CatalogCategory, Service, Package, PackageStatus

KITCHEN_PACKAGES_DATA = [
    # Full Kitchen Packages
    {
        "slug": "occ-basic",
        "name": "Full Kitchen cleaning(Basic)",
        "price": 1459,
        "duration": "2 hrs",
        "description": "Complete surface cleaning of tiles, slab, gas stove, and sink.",
        "image": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80&fit=crop",
        "includes": [
            "Kitchen tiles, floor & slab cleaning + Mopping",
            "Gas stove / hob cleaning",
            "Sink & under-sink cleaning",
            "Exhaust fan cleaning",
            "Windows & switchboards cleaning",
            "Cabinet exterior cleaning",
            "Dining table cleaning",
            "Utensil removal / rearrangement not included"
        ]
    },
    {
        "slug": "occ-deep",
        "name": "Full Kitchen Cleaning – Deep Clean",
        "price": 1959,
        "duration": "3 hrs",
        "description": "Deep steam sanitization of kitchen counters, cabinets, chimney, and hobs.",
        "image": "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=600&q=80&fit=crop",
        "includes": [
            "Includes everything in Basic, plus:",
            "Cabinet interior & exterior cleaning",
            "Exhaust fan deep cleaning",
            "Utensil removal & rearrangement"
        ]
    },
    {
        "slug": "empty-kitchen",
        "name": "Empty Kitchen Cleaning",
        "price": 849,
        "duration": "1.5 hrs",
        "description": "Thorough deep cleaning of empty kitchen spaces before moving in or after moving out.",
        "image": "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&q=80&fit=crop",
        "includes": [
            "Thorough degreasing of wall tiles, countertops, and exhaust fans",
            "Detailed cleaning of kitchen floors, windows, switchboards, and cabinets (exterior)",
            "Deep sanitization of sink and under-sink area (utensils removal not included)"
        ],
        "tools": [
            "Commercial-grade kitchen degreaser spray",
            "Microfibre scrubbing pads & mops",
            "Steam-based tile cleaning equipment",
            "Exhaust fan brush set & cleaning solution",
            "Eco-safe surface sanitizer for food-contact areas"
        ],
        "ready": [
            "Ensure the kitchen is completely empty of utensils and food items",
            "Provide access to a water connection near the kitchen",
            "Keep pets and children away from the kitchen during the service",
            "Ensure adequate ventilation (open windows/exhaust) during cleaning"
        ],
        "reviews": [
            {
                "name": "Meena Suresh",
                "rating": 5,
                "text": "We booked this before moving into our new apartment and the kitchen was spotless. The team cleaned every corner — tiles, exhaust, cabinets — everything looked brand new. Highly recommend!"
            },
            {
                "name": "Ramesh Iyer",
                "rating": 4,
                "text": "Very thorough cleaning. The team was punctual and professional. The tiles and sink area came out gleaming. Only minor suggestion: bring their own water supply for buildings without water connection."
            }
        ],
        "faqs": [
            {
                "q": "Is this service suitable for a kitchen that has never been cleaned before?",
                "a": "Yes, this service is specifically designed for empty kitchens — including newly constructed or long-unoccupied ones. The team uses industrial-grade degreasers suitable for heavy grime."
            },
            {
                "q": "Do I need to be present during the cleaning?",
                "a": "You do not need to be present throughout, but we recommend being available at the start and end to guide the team and inspect the results before they leave."
            },
            {
                "q": "Are utensils and appliances moved during cleaning?",
                "a": "No, utensil removal or rearrangement is not included in this package. The kitchen should ideally be empty of utensils and appliances for the best results."
            },
            {
                "q": "How long does the service typically take?",
                "a": "The service takes approximately 2.5 hours for a standard-sized kitchen. Larger kitchens or heavily soiled surfaces may require additional time."
            },
            {
                "q": "What cleaning products and equipment are used?",
                "a": "We use eco-friendly, commercial-grade degreasers, scrubbing pads, microfibre mops, and steam equipment where needed. All products are safe for food-contact surfaces once dried."
            },
            {
                "q": "Is the service available for rented apartments or only owned properties?",
                "a": "The service is available for both rented and owned properties. It is commonly booked during move-in or move-out situations regardless of ownership."
            },
            {
                "q": "What if I am not satisfied with the cleaning?",
                "a": "We offer a re-clean guarantee. If you are not satisfied with any part of the service, contact us within 24 hours and we will send the team back to address the issue at no extra charge."
            }
        ]
    },
    # Cabinet & Tile Care
    {
        "slug": "kitchen-tiles-slabs",
        "name": "Kitchen Tiles and Slabs Cleaning",
        "price": 299,
        "duration": "45 mins",
        "description": "Oil & grease stain removal from backsplash, tiles, counter, and slab.",
        "includes": [
            "Tile and slab cleaning: Remove oil and grease stains",
            "Degreases tiles & slabs and deep cleans grout for a fresh kitchen"
        ]
    },
    {
        "slug": "cabinet-trolley-clean",
        "name": "Cabinet & Trolley Cleaning (Interior & exterior)",
        "price": 899,
        "duration": "1.5 hrs",
        "description": "Thorough inside-out degreasing, sanitization, and dust-wipe of all kitchen cabinets & trolleys.",
        "includes": [
            "Interior & exterior cabinet wet-wiping & degreasing",
            "Removal of food residue, spills & accumulated oil layers",
            "Trolley tracks vacuuming, wiping & structural sanitization"
        ]
    },
    # Appliances
    {
        "slug": "fridge-single",
        "name": "Fridge cleaning - Single door",
        "price": 399,
        "duration": "30 mins",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "fridge-double",
        "name": "Fridge cleaning - Double door",
        "price": 549,
        "duration": "1 hr",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "fridge-triple",
        "name": "Fridge cleaning - Side by side/ Triple door",
        "price": 799,
        "duration": "1 hr",
        "description": "Thorough interior defrosting and rack-by-rack deep cleaning.",
        "includes": [
            "Interior & exterior cleaning",
            "Shelves, trays & compartments cleaning",
            "Door seal & stain cleaning"
        ]
    },
    {
        "slug": "kitchen-microwave-clean",
        "name": "Microwave cleaning",
        "price": 199,
        "duration": "15 mins",
        "description": "Complete interior grease removal and sanitization of turntable.",
        "includes": [
            "Interior & exterior cleaning",
            "Turntable & glass door cleaning",
            "Food stain & grease removal"
        ]
    },
    {
        "slug": "chimney-clean",
        "name": "Chimney Cleaning",
        "price": 399,
        "duration": "45 mins",
        "description": "Deep filter degreasing and external hood surface cleaning.",
        "image": "/mockups/chimney_clean.png",
        "includes": [
            "Filter & exterior cleaning",
            "Grease & oil buildup removal",
            "Hood & accessible surface cleaning"
        ]
    },
    {
        "slug": "chimney-stove-clean",
        "name": "Chimney & stove cleaning",
        "price": 499,
        "duration": "1 hr 10 mins",
        "description": "Combined steam deep cleaning of kitchen chimney and gas stove.",
        "image": "/mockups/chimney_stove_clean.png",
        "includes": [
            "Stovetops, burners, mesh & filter cleaning with steam",
            "Includes motor cleaning, repair & automatic chimney cleaning"
        ]
    },
    {
        "slug": "stove-2b",
        "name": "Gas stove cleaning - 2 burners",
        "price": 99,
        "duration": "30 mins",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "stove-3b",
        "name": "Gas stove cleaning - 3 burners",
        "price": 149,
        "duration": "45 mins",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "stove-4b",
        "name": "Gas stove cleaning - 4+ burners",
        "price": 199,
        "duration": "1 hr",
        "description": "Surface cleaning of gas stove burners and knobs to remove grease.",
        "includes": [
            "Stove / hob surface cleaning",
            "Burner & knob cleaning",
            "Grease & food stain removal"
        ]
    },
    {
        "slug": "dishwasher-clean",
        "name": "Dishwasher Cleaning",
        "price": 599,
        "duration": "1 hr",
        "description": "Thorough interior rack wash and food debris clearing.",
        "includes": [
            "Interior & exterior cleaning",
            "Filter, racks & tray cleaning",
            "Food residue & buildup removal"
        ]
    },
    {
        "slug": "air-fryer-clean",
        "name": "Air fryer cleaning",
        "price": 199,
        "duration": "30 mins",
        "description": "Air fryer interior wet wipe and tray wash.",
        "includes": [
            "Wet wiping of interior to remove oil stains & odour",
            "Cleaning of tray to remove food spills"
        ]
    },
    {
        "slug": "otg-clean",
        "name": "OTG cleaning",
        "price": 399,
        "duration": "50 mins",
        "description": "Oven interior crumb removal and grease wipe down.",
        "includes": [
            "Cleaning of interior to remove food crumbs & spills",
            "Exterior & back panel cleaning to remove oil & grease"
        ]
    },
    {
        "slug": "sandwich-clean",
        "name": "Sandwich Maker/Griller cleaning",
        "price": 99,
        "duration": "15 mins",
        "description": "Sandwich maker deep cleaning to remove charred food spills.",
        "image": "/mockups/sandwich_griller.png",
        "includes": [
            "Deep cleaning of plates to remove stuck food & char marks",
            "Exterior wipe to remove oil, grease & food stains"
        ]
    },
    # Quick Extra Services
    {
        "slug": "quick-sink-under-sink",
        "name": "Sink & under sink cleaning",
        "price": 129,
        "duration": "20 mins",
        "description": "Deep scrubbing of sink and under-sink sanitization.",
        "includes": [
            "Deep scrub & sanitization of kitchen sink and under-sink cabinet"
        ]
    },
    {
        "slug": "quick-kitchen-window",
        "name": "Kitchen Window Cleaning",
        "price": 399,
        "duration": "30 mins",
        "description": "Detailed glass panel and frame grease cleaning.",
        "image": "/mockups/window_cleaning.png",
        "includes": [
            "Detailed glass panes, frames, sill, and tracks cleaning"
        ]
    },
    {
        "slug": "quick-dining-table",
        "name": "Dining Table & Chairs Cleaning",
        "price": 449,
        "duration": "30 mins",
        "description": "Detailed dining table surface cleaning and grease removal.",
        "image": "https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&q=80&fit=crop",
        "includes": [
            "Surface cleaning, sanitation, and wood/glass polishing"
        ]
    },
    {
        "slug": "quick-fan-clean",
        "name": "Ceiling Fan Cleaning",
        "price": 89,
        "duration": "15 mins",
        "description": "Detailed ceiling fan dusting and blade wipe down.",
        "includes": [
            "Fan blades, motor housing, and cover deep dusting"
        ]
    },
    {
        "slug": "quick-exhaust-fan-clean",
        "name": "Kitchen Exhaust Fan Cleaning",
        "price": 99,
        "duration": "30 mins",
        "description": "Kitchen exhaust fan degreasing and grill dusting.",
        "image": "/mockups/exhaust_fan.png",
        "includes": [
            "Exhaust fan blades, cover, and grill grease removal"
        ]
    },
    {
        "slug": "quick-balcony-upto-4ft",
        "name": "Balcony Cleaning: Upto 4 ft Width",
        "price": 399,
        "duration": "30 mins",
        "description": "Washing and scrubbing of balcony floor and railings.",
        "image": "/mockups/balcony_cleaning.png",
        "includes": [
            "Balcony floor washing, scrubbing, and railing dusting"
        ]
    },
    {
        "slug": "quick-balcony-above-4ft",
        "name": "Balcony Cleaning: Above 4 ft Width",
        "price": 549,
        "duration": "50 mins",
        "description": "Deep floor scrubbing and mesh cleaning for large balconies.",
        "image": "/mockups/balcony_cleaning.png",
        "includes": [
            "Balcony floor washing, scrubbing, and railing dusting"
        ]
    },
    {
        "slug": "quick-door-clean",
        "name": "Door Cleaning",
        "price": 89,
        "duration": "10 mins",
        "description": "Thorough wiping and dusting of doors to remove fingerprints and dirt.",
        "image": "/mockups/door_cleaning.png",
        "includes": [
            "Door frames, panels, hinges dusting, and handle polishing"
        ]
    }
]

def seed():
    print("Seeding kitchen packages...")
    category = CatalogCategory.objects.filter(slug="home_pest_control").first()
    if not category:
        print("ERROR: 'home_pest_control' category not found.")
        return

    service, _ = Service.objects.get_or_create(
        slug="kitchen-cleaning",
        defaults={
            "category": category,
            "name": "Kitchen Cleaning",
            "description": "Complete kitchen deep cleaning, cabinet organization & appliance service.",
            "is_active": True,
            "sort_order": 5
        }
    )

    # Delete legacy packages if any
    Package.objects.filter(slug__in=["empty-kitchen-small", "empty-kitchen-large"]).delete()

    # Get max ID to avoid sequence issues
    max_id = Package.objects.aggregate(Max('id'))['id__max'] or 0

    def get_fallback_details(slug):
        # Fallback values aligned with frontend static detail data
        if "fridge" in slug:
            return {
                "tools": ["Food-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
                "ready": ["Remove food items before cleaning", "Keep the refrigerator accessible", "Keep a power connection available"],
                "reviews": [
                    {"name": "Priya R.", "rating": 5, "text": "The inside of my refrigerator is clean, fresh, and free from any spills. Excellent job!"},
                    {"name": "Amit K.", "rating": 4.8, "text": "Professional cleaning. They defrosted, scrubbed the trays, and cleaned the door gaskets thoroughly."}
                ],
                "faqs": [
                    {"q": "Do I need to empty the fridge beforehand?", "a": "Yes, please remove all food items, vessels, and trays before the service starts."},
                    {"q": "Do you clean the freezer?", "a": "Yes, complete deep cleaning and sanitization of the freezer compartment is included."},
                    {"q": "Will this remove strong odours?", "a": "Cleaning food spills and sanitizing shelves helps reduce odors significantly."},
                    {"q": "Are your cleaning agents food-safe?", "a": "Yes, we use eco-certified, non-toxic, and food-safe sanitizers for all internal shelves."},
                    {"q": "How long after the service can I turn the fridge on?", "a": "You can turn it back on and restore your food items within 15-20 minutes after completion."},
                    {"q": "Is exterior cleaning included?", "a": "Yes, thorough wiping of the outer body, door seals, and handle is included."}
                ]
            }
        elif "stove" in slug or "burner" in slug:
            return {
                "tools": ["Stove-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
                "ready": ["Switch off the stove before cleaning", "Remove vessels and cookware", "Keep the stove area accessible"],
                "reviews": [
                    {"name": "Harish L.", "rating": 4.9, "text": "The gas stove burners and knobs are super clean now. Great service!"},
                    {"name": "Ruchi A.", "rating": 4.8, "text": "Deep grease stains were completely steam cleaned from the hob. Highly professional."}
                ],
                "faqs": [
                    {"q": "Will you clean the burners?", "a": "Yes, the burner tops and surroundings are scrubbed to remove surface soot and grease."},
                    {"q": "Will you remove gas blockages?", "a": "No, this is a cleaning service; mechanical repairs or burner tuning are not covered."},
                    {"q": "Are the knobs cleaned?", "a": "Yes, we remove and clean the knobs, and sanitize the surrounding panel."},
                    {"q": "Do you use scratch-free sponges?", "a": "Yes, we use non-abrasive scrub pads suitable for steel and glass hobs."},
                    {"q": "Will this remove heavy burnt marks?", "a": "We use professional degreasers that lift most carbon deposits, but permanent heat stains may not fade completely."},
                    {"q": "How long does stove cleaning take?", "a": "It typically takes around 30 to 45 minutes depending on the soil level."}
                ]
            }
        elif "chimney" in slug:
            return {
                "tools": ["Grease-removing cleaning products", "Microfiber cloths", "Soft scrubbers", "Cleaning brushes"],
                "ready": ["Keep the chimney area accessible", "Clear items around the stove", "Ensure a power connection is available"],
                "reviews": [
                    {"name": "Karthik M.", "rating": 5.0, "text": "The grease on my chimney filter was cleaned properly. Excellent job!"},
                    {"name": "Ananya S.", "rating": 4.8, "text": "Good cleaning service. The chimney filter looks much cleaner now."}
                ],
                "faqs": [
                    {"q": "Will you clean the chimney filter?", "a": "Yes, we deep clean baffle/mesh filters to remove accumulated oil and grease."},
                    {"q": "Do you clean the chimney motor?", "a": "Outer dusting is included, but internal motor repair or deep servicing is not part of this."},
                    {"q": "Do you repair gas burner blockages?", "a": "No, we offer deep surface cleaning; mechanical repairs are not included."},
                    {"q": "Will steam cleaning damage the stove knobs?", "a": "No, we use controlled steam pressure safe for metal/plastic knobs."},
                    {"q": "How often should I get this done?", "a": "We recommend deep cleaning your chimney and stove every 3 to 6 months."},
                    {"q": "Do you bring your own cleaning agents?", "a": "Yes, we bring heavy-duty food-safe degreasers and scrubbing brushes."}
                ]
            }
        elif "dishwasher" in slug:
            return {
                "tools": ["Dishwasher cleaners", "Microfiber cloths", "Detail cleaning brushes"],
                "ready": ["Empty the dishwasher before cleaning", "Keep the appliance accessible"],
                "reviews": [
                    {"name": "Neha G.", "rating": 5, "text": "The filter was clogged with food waste and they cleaned it perfectly. Smells fresh now."},
                    {"name": "Vikram P.", "rating": 4.8, "text": "Great cleaning of the interior racks and salt dispenser area. Highly satisfied."}
                ],
                "faqs": [
                    {"q": "Do I need to remove the dishes?", "a": "Yes, please empty all plates, cutlery, and trays before the service starts."},
                    {"q": "Do you clean the spray arms?", "a": "Yes, we inspect and clean the water spray nozzles to ensure proper flow."},
                    {"q": "Do you refill salt or rinse aid?", "a": "No, we only provide deep cleaning; refilling consumables is not included."},
                    {"q": "Will this resolve drainage issues?", "a": "We clean the food trap filter, but plumbing blockages are not covered."},
                    {"q": "What parts of the dishwasher are cleaned?", "a": "The door gasket, filter, spray arms, racks, and internal walls."},
                    {"q": "Is exterior body cleaning included?", "a": "Yes, the front panel and control buttons are wiped and sanitized."}
                ]
            }
        elif "air-fryer" in slug or "airfryer" in slug:
            return {
                "tools": ["Food-safe interior sanitizers", "Microfiber cloths", "Detail cleaning brushes"],
                "ready": ["Keep the air fryer accessible and unplugged", "Ensure power outlet is nearby for testing"],
                "reviews": [
                    {"name": "Sneha J.", "rating": 4.9, "text": "Cleaned the baking trays and heating coils perfectly. No grease left."},
                    {"name": "Mahesh B.", "rating": 4.8, "text": "Removed the charred food residues from my air fryer tray without scratching it."}
                ],
                "faqs": [
                    {"q": "Will cleaning scratch the non-stick coating?", "a": "No, we use soft microfibre cloths and non-scratch sponges."},
                    {"q": "Do you clean the heating coils?", "a": "Yes, we gently wipe the heating element to remove accumulated oil fumes."},
                    {"q": "Do you clean the baking accessories?", "a": "Yes, we wash removable trays, racks, and crumb trays."},
                    {"q": "Is the appliance ready to use immediately?", "a": "We recommend letting it air-dry for 10 minutes before turning it on."},
                    {"q": "Will this remove burnt-on grease?", "a": "Yes, we use specialized grease-dissolving sprays safe for heating appliances."},
                    {"q": "Do I need to keep anything ready?", "a": "Please ensure the appliance is unplugged and has cooled down completely."}
                ]
            }
        elif "otg" in slug:
            return {
                "tools": ["OTG safe degreasers", "Microfiber cleaning cloths", "Crevice cleaning brushes"],
                "ready": ["Unplug the OTG and keep it accessible", "Empty any trays or racks inside"],
                "reviews": [
                    {"name": "Siddharth N.", "rating": 4.9, "text": "Removed all grease stains from the glass door and walls. Excellent OTG service!"},
                    {"name": "Deepa K.", "rating": 4.8, "text": "Quick and efficient. Removed the dark stuck food particles from the tray."}
                ],
                "faqs": [
                    {"q": "Will cleaning scratch the interior coating?", "a": "No, we use soft microfibre cloths and non-scratch sponges."},
                    {"q": "Do you clean the heating coils?", "a": "Yes, we gently wipe the heating element to remove accumulated oil fumes."},
                    {"q": "Do you clean the baking accessories?", "a": "Yes, we wash removable trays, racks, and crumb trays."},
                    {"q": "Is the appliance ready to use immediately?", "a": "We recommend letting it air-dry for 10 minutes before turning it on."},
                    {"q": "Will this remove burnt-on grease?", "a": "Yes, we use specialized grease-dissolving sprays safe for heating appliances."},
                    {"q": "Do I need to keep anything ready?", "a": "Please ensure the appliance is unplugged and has cooled down completely."}
                ]
            }
        elif "sandwich" in slug:
            return {
                "tools": ["Food-safe surface wipes", "Detangled cleaning brushes"],
                "ready": ["Keep the sandwich maker/griller accessible and unplugged"],
                "reviews": [
                    {"name": "Deepa K.", "rating": 4.8, "text": "Quick and efficient. Removed the dark stuck food particles from the grill plates."},
                    {"name": "Amit S.", "rating": 4.7, "text": "The plates are clean and the greasy feel is completely gone. Satisfied."}
                ],
                "faqs": [
                    {"q": "Will cleaning scratch the plates?", "a": "No, we use soft microfibre cloths and non-scratch sponges."},
                    {"q": "Do you clean the heating coils?", "a": "Yes, we gently wipe the heating element to remove accumulated oil fumes."},
                    {"q": "Do you clean the accessories?", "a": "Yes, we wash removable trays, racks, and crumb trays."},
                    {"q": "Is the appliance ready to use immediately?", "a": "We recommend letting it air-dry for 10 minutes before turning it on."},
                    {"q": "Will this remove burnt-on grease?", "a": "Yes, we use specialized grease-dissolving sprays safe for heating appliances."},
                    {"q": "Do I need to keep anything ready?", "a": "Please ensure the appliance is unplugged and has cooled down completely."}
                ]
            }
        elif "microwave" in slug:
            return {
                "tools": ["Appliance-safe cleaning products", "Microfiber cloths", "Soft scrubbers", "Small cleaning brushes"],
                "ready": ["Remove food and containers", "Keep the microwave accessible", "Ensure the appliance is switched off"],
                "reviews": [
                    {"name": "Priya R.", "rating": 5.0, "text": "The inside of my microwave was cleaned really well. Burnt grease is gone!"},
                    {"name": "Karthik M.", "rating": 4.9, "text": "Quick and neat service. The food stains on the turntable were removed properly."}
                ],
                "faqs": [
                    {"q": "Do you clean the turntable plate?", "a": "Yes, the glass turntable is removed, washed separately, and placed back."},
                    {"q": "Will this remove old oil and burnt stains?", "a": "Our specialized non-abrasive cleaners dissolve tough grease and carbon stains."},
                    {"q": "Is it safe for the heating element?", "a": "Yes, we clean carefully around the heating coils without using direct liquids to prevent damage."},
                    {"q": "Do I need to unplug the microwave?", "a": "Yes, for safety, our team will unplug the appliance before starting the service."},
                    {"q": "How long does microwave cleaning take?", "a": "It takes approximately 15 to 20 minutes to complete."},
                    {"q": "What products do you use?", "a": "We use mild, food-safe degreasers that do not leave any toxic residue behind."}
                ]
            }
        elif "sink" in slug:
            return {
                "tools": ["Scrubbing brushes", "Disinfectant sanitizers", "Odour removal sprays"],
                "ready": ["Clear any vessels from the sink before the professional arrives"],
                "reviews": [
                    {"name": "Kunal T.", "rating": 4.9, "text": "The sink shines like new, and the under-sink smell is totally gone."},
                    {"name": "Ritu G.", "rating": 4.8, "text": "Great scrubbing work on the hard water stains in the sink."}
                ],
                "faqs": [
                    {"q": "Do you clean inside the under-sink cabinet?", "a": "Yes, we empty, scrub, and sanitize the internal walls of the under-sink cabinet."},
                    {"q": "Will this clear major drain blockages?", "a": "We provide sanitization and minor grease removal; plumbing blockages are not covered."},
                    {"q": "Do you remove rust stains?", "a": "We treat surface rust, but deep corrosion on metal pipes may not be completely removable."},
                    {"q": "What sanitizing products do you use?", "a": "We use food-safe, organic sanitizing sprays that eliminate bacteria and bad odors."},
                    {"q": "How long does the sink cleaning take?", "a": "It takes approximately 20 minutes to complete."},
                    {"q": "Will this remove silicon mold on the edges?", "a": "We scrub and treat mold stains, but deeply embedded mold in old silicon may remain."}
                ]
            }
        elif "window" in slug:
            return {
                "tools": ["Glass squeegee", "Microfiber cloths", "Glass cleaners", "Degreasing wipes"],
                "ready": ["Clear the window sill and remove any curtains or blinds if possible"],
                "reviews": [
                    {"name": "Neeta P.", "rating": 4.9, "text": "Cleaned the sticky kitchen window glass and channels very thoroughly. Spotless!"},
                    {"name": "Rohit V.", "rating": 4.8, "text": "The oily kitchen grime on the window frames was completely scrubbed off. Highly recommended."}
                ],
                "faqs": [
                    {"q": "Do you clean the window mesh/screen?", "a": "Yes, we remove, wash, and reinstall the window mesh screen."},
                    {"q": "Will this remove sticky oil layer?", "a": "Yes, we use specialized degreasers to dissolve grease from frames and glass."},
                    {"q": "Do you clean the sliding tracks/channels?", "a": "Yes, we vacuum and scrub the sliding tracks to ensure smooth operation."},
                    {"q": "Is exterior window cleaning included?", "a": "Yes, if accessible safely from the inside, we clean both sides of the glass."},
                    {"q": "How long does it take per window?", "a": "It takes approximately 30 minutes."},
                    {"q": "What if my window is very high up?", "a": "We clean accessible areas safely; high-reach outer windows are subject to safety limits."}
                ]
            }
        elif "dining" in slug:
            return {
                "tools": ["Premium wood polish", "Sanitizing sprays", "Soft microfiber cloths"],
                "ready": ["Clear all plates, cutlery, and table runners from the dining table"],
                "reviews": [
                    {"name": "Anita J.", "rating": 4.8, "text": "Cleaned our glass dining table and chairs. The wood polish they used made it look brand new!"},
                    {"name": "Karan M.", "rating": 4.7, "text": "Great job cleaning the food crumbs and sanitizing the dining chairs. Quick and efficient."}
                ],
                "faqs": [
                    {"q": "Do you clean chair cushions?", "a": "We perform dry dusting and wiping; wet shampooing of upholstered chairs is not included."},
                    {"q": "What types of table materials do you clean?", "a": "We clean wooden, glass, marble, acrylic, and laminate dining tables."},
                    {"q": "Do you apply polish to wooden tables?", "a": "Yes, we apply a gentle wood conditioner or polish to restore wood shine."},
                    {"q": "Will this remove food stains from marble?", "a": "We clean and sanitize, but deep acid stains or etching on marble require polishing."},
                    {"q": "How long does table and chair cleaning take?", "a": "It takes approximately 30 minutes."},
                    {"q": "Do you clean under the table?", "a": "Yes, we dust and wipe the table legs and under-table structure."}
                ]
            }
        elif "fan" in slug and "exhaust" not in slug:
            return {
                "tools": ["Long-handle fan duster", "Microfiber cloths", "All-purpose cleaners", "Step ladder"],
                "ready": ["Ensure the fan is switched off and clear the area directly beneath the fan"],
                "reviews": [
                    {"name": "Suresh R.", "rating": 4.9, "text": "Excellent job! The oily kitchen soot on the ceiling fan was cleaned perfectly without any mess."},
                    {"name": "Meera N.", "rating": 4.8, "text": "Very professional. They used a fan cover so no dust fell on the kitchen floor."}
                ],
                "faqs": [
                    {"q": "How do you prevent dust from falling on the floor?", "a": "We use specialized fan duster bags and drop sheets to catch falling dust."},
                    {"q": "Will this clean sticky grease on fan blades?", "a": "Yes, kitchen fans accumulate oily soot which we clean using degreasing agents."},
                    {"q": "Do you clean the fan regulator or motor?", "a": "Wiping the motor housing exterior and the fan regulator switch safely is included."},
                    {"q": "Do you repair noisy fans?", "a": "No, this is purely a cleaning service; electrical repairs are not included."},
                    {"q": "How long does it take per fan?", "a": "It takes approximately 15 minutes."},
                    {"q": "Is a step ladder required?", "a": "No, our professionals carry their own foldable ladders."}
                ]
            }
        elif "exhaust" in slug:
            return {
                "tools": ["Heavy-duty degreaser", "Wire brushes", "Microfiber towels", "Scrubbing pads"],
                "ready": ["Keep the exhaust fan switched off and clear the area around it"],
                "reviews": [
                    {"name": "Devendra K.", "rating": 5.0, "text": "Cleaned the sticky grease from the exhaust fan blades. It rotates much faster and works quietly now!"},
                    {"name": "Kavita T.", "rating": 4.8, "text": "Highly satisfied. The thick layer of oil on the fan mesh was completely removed."}
                ],
                "faqs": [
                    {"q": "Do you dismantle the exhaust fan?", "a": "Yes, we remove the fan blades and mesh guard for thorough deep cleaning."},
                    {"q": "Will this remove old grease?", "a": "Yes, we soak blades in grease-dissolving solution to remove oil build-up."},
                    {"q": "Do you clean the external duct?", "a": "This service covers the exhaust unit and mesh; deep duct pipe cleaning is not included."},
                    {"q": "Is it safe for the fan motor?", "a": "Yes, we protect the motor with waterproof covers before applying cleaning sprays."},
                    {"q": "How long does the service take?", "a": "It takes approximately 30 to 40 minutes."},
                    {"q": "How often should it be cleaned?", "a": "We recommend cleaning kitchen exhaust fans every 2 to 3 months due to oil soot."}
                ]
            }
        elif "balcony" in slug:
            return {
                "tools": ["Floor scrubbing brushes", "Balcony floor cleaner", "Wiper", "Microfiber cloths"],
                "ready": ["Clear plants, clothes drying racks, and outdoor furniture from the balcony floor"],
                "reviews": [
                    {"name": "Manish P.", "rating": 4.9, "text": "The balcony floor tiles and railing are sparkling clean. Great dust and pigeon dropping removal!"},
                    {"name": "Swati D.", "rating": 4.8, "text": "Quick and efficient pressure wash. Removed all the hard dirt from the balcony corners."}
                ],
                "faqs": [
                    {"q": "Do you clean pigeon droppings?", "a": "Yes, we scrape, disinfect, and wash areas affected by bird droppings."},
                    {"q": "Will you clean the balcony glass railing?", "a": "Yes, deep cleaning of glass panels and steel/iron railings is included."},
                    {"q": "Is water outlet required?", "a": "Yes, access to water (a tap) is required to wash the balcony floor."},
                    {"q": "Do you clean wall tiles in the balcony?", "a": "Yes, we wipe and scrub accessible balcony wall tiles up to shoulder height."},
                    {"q": "How long does it take?", "a": "It takes approximately 30 to 45 minutes depending on balcony size."},
                    {"q": "Do you clean balcony ceiling fans?", "a": "Dusting is included; deep fan cleaning can be added as a separate service."}
                ]
            }
        elif "door" in slug:
            return {
                "tools": ["Wood cleaners", "Steel/brass polish", "Soft microfiber cloths"],
                "ready": ["Ensure access to both sides of the door and keep the entrance clear"],
                "reviews": [
                    {"name": "Rajeev S.", "rating": 4.8, "text": "Cleaned the main door and polished the handle. Looks very clean and shining."},
                    {"name": "Gauri K.", "rating": 4.7, "text": "Removed the fingerprint marks and stains from the kitchen door. Very neat job."}
                ],
                "faqs": [
                    {"q": "Do you polish metal handles?", "a": "Yes, we wipe and apply metal polish to restore shine to brass or steel handles."},
                    {"q": "Do you clean mesh doors?", "a": "Yes, mesh doors can be cleaned by dusting and light wiping."},
                    {"q": "Will this remove permanent paint stains?", "a": "We treat surface stains, but old dried paint drips may not come off completely."},
                    {"q": "How long does it take per door?", "a": "It takes approximately 15 minutes."},
                    {"q": "What products do you use?", "a": "We use gentle, non-corrosive wood cleaners and soft cloth wipes."},
                    {"q": "Do you clean the door frame?", "a": "Yes, the door frame and hinges are dusted and wiped."}
                ]
            }
        # General kitchen details
        return {
            "tools": ["Kitchen-safe degreasers", "Microfiber cloths", "Non-abrasive scrubbers", "Detail cleaning brushes", "Floor and surface cleaning tools"],
            "ready": ["Continuous water supply", "Working power connection", "Kitchen area accessible for cleaning", "Fragile items and valuables kept safely"],
            "reviews": [
                {"name": "Ananya S.", "rating": 5.0, "text": "The kitchen was cleaned very neatly. The stove, sink and tiles looked fresh after the service."},
                {"name": "Rahul K.", "rating": 4.8, "text": "Good service for regular kitchen cleaning. The team was quick and professional."}
            ],
            "faqs": [
                {"q": "Will you move utensils from the cabinets?", "a": "No. Utensil removal and rearrangement are not included in the Basic package."},
                {"q": "Do I need to provide cleaning products?", "a": "No. Our professionals bring all the required environment-friendly cleaning tools and products."},
                {"q": "Is chimney cleaning included in the Basic package?", "a": "No. Chimney cleaning can be booked separately under Single Appliance & Specific Area Cleaning."},
                {"q": "Can I add appliance cleaning to this package?", "a": "Yes. You can add individual appliance cleaning as an additional service."},
                {"q": "How long does the service take?", "a": "The Basic package takes approximately 2 hours, depending on the kitchen size and condition."},
                {"q": "Do you clean the exhaust fan in basic cleaning?", "a": "No, exhaust fan cleaning is part of our deep cleaning package or can be booked separately as a quick service."}
            ]
        }

    for pkg_data in KITCHEN_PACKAGES_DATA:
        # Check if already exists
        pkg = Package.objects.filter(slug=pkg_data["slug"]).first()
        fallbacks = get_fallback_details(pkg_data["slug"])
        
        tools_val = pkg_data.get("tools") or fallbacks["tools"]
        ready_val = pkg_data.get("ready") or fallbacks["ready"]

        if pkg:
            # Update fields
            pkg.service = service
            pkg.name = pkg_data["name"]
            pkg.base_price = pkg_data["price"]
            pkg.duration = pkg_data["duration"]
            pkg.description = pkg_data["description"]
            pkg.image = pkg_data.get("image") or ""
            pkg.includes = pkg_data["includes"]
            pkg.tools = tools_val
            pkg.ready = ready_val
            pkg.reviews = pkg_data.get("reviews") or fallbacks.get("reviews") or []
            pkg.faqs = pkg_data.get("faqs") or fallbacks.get("faqs") or []
            pkg.status = PackageStatus.ACTIVE
            pkg.save()
            print(f"-> Updated package: {pkg.name}")
        else:
            # Create manually assigning id
            max_id += 1
            pkg = Package.objects.create(
                id=max_id,
                slug=pkg_data["slug"],
                service=service,
                name=pkg_data["name"],
                base_price=pkg_data["price"],
                duration=pkg_data["duration"],
                description=pkg_data["description"],
                image=pkg_data.get("image") or "",
                includes=pkg_data["includes"],
                tools=tools_val,
                ready=ready_val,
                reviews=pkg_data.get("reviews") or fallbacks.get("reviews") or [],
                faqs=pkg_data.get("faqs") or fallbacks.get("faqs") or [],
                status=PackageStatus.ACTIVE
            )
            print(f"-> Created package (ID: {pkg.id}): {pkg.name}")

    print("Kitchen packages seeded successfully.")

if __name__ == '__main__':
    seed()
