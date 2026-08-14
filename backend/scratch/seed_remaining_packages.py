import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

category, _ = CatalogCategory.objects.get_or_create(
    slug="electrician_plumbing_carpentry",
    defaults={"name": "Electrician, Plumbing & Carpentry", "is_active": True}
)

MORE_SERVICES_DATA = {
    "plumbing": {
        "name": "Plumbing",
        "packages": [
            # Bath Fittings
            {
                "slug": "plum-bf-1", "name": "Bath Accessory Installation", "base_price": 199, "duration": "20 mins", "tag": "Fitting",
                "description": "Towel rod, soap dish, robe hook, tumbler holder or mirror bracket wall mounting.",
                "includes": ["Tile drilling with precision", "Rawl plug anchor fit", "Leveling check", "Accessory screw fastening"],
                "tools": ["Tile diamond drill bit", "Spirit level", "Anchor plug kit"],
                "ready": ["Keep accessories and brackets ready in bathroom"],
                "reviews": [{"name": "Sneha R.", "rating": "5.0", "text": "Hung 4 towel rods and soap dispensers without cracking any tile."}],
                "faqs": [{"q": "Do you drill into ceramic and vitrified tiles?", "a": "Yes, we use specialized diamond drill bits designed to drill cleanly through hard tiles without cracking."}]
            },
            {
                "slug": "plum-bf-2", "name": "Shower Fitting Installation", "base_price": 299, "duration": "30 mins", "tag": "Shower Fit",
                "description": "Rain shower head, shower arm extension or hand shower sliding rail fitting.",
                "includes": ["Shower arm connection", "Flange placement", "Spray nozzle check", "Teflon seal"],
                "tools": ["Strap wrench", "PTFE tape", "Level"],
                "ready": ["Keep shower fittings ready"],
                "reviews": [{"name": "Kunal T.", "rating": "4.9", "text": "Installed ceiling rain shower head cleanly."}],
                "faqs": [{"q": "Do you install concealed shower valves?", "a": "Yes, we install and service both exposed and concealed thermostatic shower valves."}]
            },
            {
                "slug": "plum-bf-3", "name": "Bathroom Fitting Repair", "base_price": 249, "duration": "30 mins", "tag": "Repair",
                "description": "Fixing loose bathroom fixtures, leaking angle valves, or damaged flanges.",
                "includes": ["Loose screw tightening", "Washer replacement", "Sealing check", "Angle valve fix"],
                "tools": ["Spanner set", "Teflon tape", "Gasket pack"],
                "ready": ["Point out loose or leaking bathroom fixtures"],
                "reviews": [{"name": "Manoj T.", "rating": "4.8", "text": "Tightened loose towel rails and replaced leaking angle cock."}],
                "faqs": [{"q": "Can damaged tile screw anchors be refixed?", "a": "Yes, we use high-grip nylon expanders and epoxy plugs to anchor loose fittings."}]
            },
            {
                "slug": "plum-bf-4", "name": "Bathroom Fitting Replacement", "base_price": 349, "duration": "45 mins", "tag": "Upgrade",
                "description": "Complete replacement of old worn out bathroom metallic/CP accessories with new fixtures.",
                "includes": ["Dismounting old fittings", "New accessory fitting", "Alignment test", "Silicone seal"],
                "tools": ["Drill machine", "Spanner set", "Sealant gun"],
                "ready": ["Keep new CP bath accessory set ready"],
                "reviews": [{"name": "Deepika S.", "rating": "5.0", "text": "Replaced entire bathroom accessories set with matte black fittings."}],
                "faqs": [{"q": "Do you remove old rusted screws?", "a": "Yes, we extract rusted screws safely and fit rust-proof stainless steel screws."}]
            },
            # Water Tank
            {
                "slug": "plum-wt-1", "name": "Overhead Water Tank Installation", "base_price": 1499, "duration": "2 hrs", "tag": "Heavy Duty",
                "description": "500L/1000L PVC water tank positioning, inlet/outlet tank nipple fitting, and overflow pipe setup.",
                "includes": ["Tank alignment", "Tank nipple sealing", "Ball valve & overflow fit", "Rooftop base leveling"],
                "tools": ["Hole saw for plastic tanks", "Heavy pipe wrenches", "Teflon thread sealant"],
                "ready": ["Ensure clear rooftop / loft space for water tank placement"],
                "reviews": [{"name": "Venkatesh L.", "rating": "5.0", "text": "Installed 1000L Sintex overhead tank with brass ball valve."}],
                "faqs": [{"q": "Do you install automatic water level controllers?", "a": "Yes, we wire float ball switches and magnetic level sensors to prevent tank overflow."}]
            },
            {
                "slug": "plum-wt-2", "name": "Water Tank Repair", "base_price": 599, "duration": "1 hr", "tag": "Leak Fix",
                "description": "Fixing crack leaks in plastic water tanks using thermal plastic welding or leak proof sealant.",
                "includes": ["Crack surface prep", "Thermal welding / sealant", "Water fill test", "Nipple leak fix"],
                "tools": ["Plastic hot air welding kit", "Polymer sealant", "Sandpaper"],
                "ready": ["Drain the tank to below the crack level before technician arrives"],
                "reviews": [{"name": "Prakash K.", "rating": "4.9", "text": "Welded bottom crack in rooftop water tank. No leaks since then."}],
                "faqs": [{"q": "Is plastic welding permanent?", "a": "Yes, hot air thermal fusion welds virgin HDPE/LLDPE plastic permanently."}]
            },
            {
                "slug": "plum-wt-4", "name": "Motor Air Cavity Removal", "base_price": 399, "duration": "45 mins", "tag": "Air Lock",
                "description": "Resolving motor air lock issues, suction line priming, and foot valve air bleeding.",
                "includes": ["Suction line priming", "Air bleed valve opening", "Water pumping test", "Foot valve check"],
                "tools": ["Priming funnel", "Spanners", "Pressure gauge"],
                "ready": ["Ensure water source is available for priming the pump suction line"],
                "reviews": [{"name": "Sunil G.", "rating": "5.0", "text": "Cleared air lock in monoblock pump. Water pumping restored instantly."}],
                "faqs": [{"q": "Why does water motor run without pumping water?", "a": "Usually caused by air sucked into the suction pipe or a faulty non-return foot valve."}]
            },
            # Water Filters & Grouting
            {
                "slug": "plum-wf-1", "name": "Shower Filter Installation", "base_price": 249, "duration": "25 mins", "tag": "Hard Water",
                "description": "Connecting anti-scale hard water filter cartridge to shower arm or tap.",
                "includes": ["Filter adapter attachment", "Cartridge insert", "Flow check", "Teflon seal"],
                "tools": ["Strap wrench", "PTFE tape"],
                "ready": ["Keep shower filter ready"],
                "reviews": [{"name": "Ananya S.", "rating": "5.0", "text": "Installed Waterscience hard water filter for bathroom shower."}],
                "faqs": [{"q": "Does it reduce chlorine and hard water salts?", "a": "Yes, multi-layer KDF and polyphosphate cartridges condition hard water minerals."}]
            },
            {
                "slug": "plum-wf-2", "name": "Washing Machine Filter Installation", "base_price": 299, "duration": "30 mins", "tag": "Appliance Care",
                "description": "Inline hard water descaling filter connection to washing machine water inlet tap.",
                "includes": ["Tap adapter fitting", "Inline filter installation", "Leak check", "Pressure test"],
                "tools": ["Spanners", "Teflon tape"],
                "ready": ["Keep washing machine inlet filter ready"],
                "reviews": [{"name": "Rahul K.", "rating": "4.9", "text": "Fitted anti-scaling filter behind top load washer."}],
                "faqs": [{"q": "How often should filter candle be replaced?", "a": "Typically every 6 to 9 months depending on your municipal/borewell water hardness."}]
            },
            {
                "slug": "plum-gr-1", "name": "Bathroom Tile Grouting", "base_price": 699, "duration": "1 hr", "tag": "Waterproof Seal",
                "description": "Scraping old damaged grout lines and applying epoxy / waterproof white cement grout in bathroom tiles.",
                "includes": ["Tile joint scraping", "Waterproof epoxy grout application", "Tile surface sponge clean", "Mildew resistant seal"],
                "tools": ["Grout scraper tool", "Rubber float", "Sponge", "Epoxy grout mix"],
                "ready": ["Ensure bathroom floor is dry before the service"],
                "reviews": [{"name": "Archana G.", "rating": "5.0", "text": "Re-grouted entire shower cubicle with waterproof epoxy. Stopped seepage downstairs!"}],
                "faqs": [{"q": "Does epoxy grouting stop water seepage to lower floors?", "a": "Yes, 100% waterproof epoxy seals tile crevices completely and halts ceiling seepage below."}]
            },
            {
                "slug": "plum-gr-2", "name": "Kitchen Tile Grouting", "base_price": 599, "duration": "1 hr", "tag": "Hygienic Seal",
                "description": "Sealing kitchen wall & counter tile joints with anti-bacterial stain-proof grout.",
                "includes": ["Joint cleaning & degreasing", "Stain-proof epoxy grout fill", "Sponge finishing", "Corner silicone seal"],
                "tools": ["Grout scraper", "Rubber squeegee", "Cleaning sponge"],
                "ready": ["Clear kitchen countertop near tiles"],
                "reviews": [{"name": "Kavita M.", "rating": "4.9", "text": "Clean white epoxy grouting behind kitchen stove."}],
                "faqs": [{"q": "Is epoxy grout oil and stain resistant?", "a": "Yes, epoxy resin does not absorb turmeric, oil, or food stains."}]
            },
            {
                "slug": "plum-od-2", "name": "Hourly Plumber Service", "base_price": 399, "duration": "1 hr", "tag": "Flexible Labor",
                "description": "Hourly plumbing labor for multiple custom repair jobs, piping work, or fixture replacements.",
                "includes": ["1 hr professional plumber labor", "Multiple small tasks handled", "Tools included", "Quality test"],
                "tools": ["Master plumbing toolkit"],
                "ready": ["List all plumbing repairs needed around the house"],
                "reviews": [{"name": "Naveen P.", "rating": "5.0", "text": "Fixed 3 taps, a shower diverter and unclogged a drain in 1 hour."}],
                "faqs": [{"q": "Can I book multiple consecutive hours?", "a": "Yes, you can extend hourly service as needed on-site."}]
            },
            {
                "slug": "plum-od-3", "name": "Full-Day Plumber Booking", "base_price": 1999, "duration": "8 hrs", "tag": "Full Day Care",
                "description": "Full 8-hour dedicated plumber booking for new home setup, bathroom renovation, or major pipe work.",
                "includes": ["8 hrs dedicated master plumber", "Complete plumbing overhaul", "Daily progress check", "Piping & fixture fitting"],
                "tools": ["Full commercial plumbing machinery"],
                "ready": ["Ensure all pipes and fixtures are delivered on-site"],
                "reviews": [{"name": "Santosh B.", "rating": "5.0", "text": "Great full-day plumbing work for our entire 2BHK flat renovation."}],
                "faqs": [{"q": "Are pipe cutting and solvent welding included?", "a": "Yes, all CPVC, UPVC, and SWR piping labor is fully included."}]
            }
        ]
    },
    "carpentry": {
        "name": "Carpentry Services",
        "packages": [
            # Kitchen Fittings
            {
                "slug": "carp-kit-1", "name": "Pull-Out Drawer Repair / Replacement", "base_price": 349, "duration": "45 mins", "tag": "Kitchen Care",
                "description": "Modular kitchen stainless steel wire pull-out drawer repair, channel alignment, or basket replacement.",
                "includes": ["Basket channel alignment", "Roller wheel replace", "Load test", "Smooth pull calibration"],
                "tools": ["Screwdriver set", "Channel alignment jig", "Lubricant"],
                "ready": ["Empty the pull-out basket of spices/bottles"],
                "reviews": [{"name": "Deepika V.", "rating": "5.0", "text": "Realigned stuck tandem wire basket. Glides effortlessly now."}],
                "faqs": [{"q": "Do you repair soft-close tandem boxes?", "a": "Yes, we service Blum, Hettich, Hafele, and Ebco soft-close kitchen drawers."}]
            },
            {
                "slug": "carp-kit-2", "name": "Cabinet Hinges Replacement", "base_price": 199, "duration": "30 mins", "tag": "Hinge Fit",
                "description": "Replacing loose, squeaking, or rusted auto-close cabinet hinges on modular kitchen doors.",
                "includes": ["Auto-close hinge swap", "Door gap adjustment", "Closing test", "3D screw alignment"],
                "tools": ["35mm hinge drill bit", "Cordless drill", "Level"],
                "ready": ["Keep new auto-close hinges ready if pre-purchased"],
                "reviews": [{"name": "Pooja N.", "rating": "4.9", "text": "Replaced 4 rusted hinges on kitchen sink cabinet doors."}],
                "faqs": [{"q": "What hinges are best for kitchen?", "a": "Stainless steel SS304 soft-close hydraulic hinges resist moisture and rust."}]
            },
            {
                "slug": "carp-kit-3", "name": "Cabinet Hydraulic Repair", "base_price": 299, "duration": "45 mins", "tag": "Hydraulic",
                "description": "Replacing weak gas lift struts and hydraulic stay arms for overhead kitchen cabinets.",
                "includes": ["Gas strut replacement", "Pressure bracket mount", "Lift & stay test", "Door stay angle tune"],
                "tools": ["Cordless screwdriver", "Strut bracket kit"],
                "ready": ["Empty overhead kitchen cabinet"],
                "reviews": [{"name": "Arun K.", "rating": "5.0", "text": "Replaced 100N gas pumps. Overhead shutter stays open perfectly."}],
                "faqs": [{"q": "What hydraulic pump power is needed?", "a": "We match 60N, 80N, 100N, 120N, or 150N gas struts based on your shutter weight."}]
            },
            # Hangers & Drying
            {
                "slug": "carp-hng-1", "name": "Ceiling-Mounted Hanger Installation", "base_price": 499, "duration": "1 hr", "tag": "Best Seller",
                "description": "Installing 6-pipe pulley ceiling cloth drying hanger with smooth rope hoisting mechanism.",
                "includes": ["Ceiling anchor drilling", "Pulley wheel alignment", "Hoisting rope test", "Individual pipe load test"],
                "tools": ["Rotary hammer drill", "Ceiling fasteners", "Crossline laser"],
                "ready": ["Keep ceiling cloth hanger set in balcony"],
                "reviews": [{"name": "Nitin B.", "rating": "5.0", "text": "Installed 6-pipe stainless steel ceiling cloth hanger in balcony."}],
                "faqs": [{"q": "Can it be installed in POP / false ceilings?", "a": "We anchor into the true concrete ceiling slab above the false ceiling for full weight safety."}]
            },
            {
                "slug": "carp-hng-2", "name": "Wall Hanger Installation", "base_price": 249, "duration": "30 mins", "tag": "Wall Fit",
                "description": "Foldable wall-mounted cloth drying rack installation for balcony or utility area.",
                "includes": ["Wall bracket drilling", "Foldable rack fit", "Weight test", "Anchor fastening"],
                "tools": ["Hammer drill", "Wall anchors", "Spirit level"],
                "ready": ["Keep foldable wall rack ready"],
                "reviews": [{"name": "Archana G.", "rating": "4.9", "text": "Mounted heavy foldable stainless steel drying stand on balcony wall."}],
                "faqs": [{"q": "What weight can it support?", "a": "Properly wall-anchored steel drying racks support up to 25kg of wet clothes."}]
            },
            # Doors & Windows
            {
                "slug": "carp-door-2", "name": "Door Alignment & Shaving", "base_price": 299, "duration": "45 mins", "tag": "Smooth Close",
                "description": "Planing / shaving jammed wooden doors swelling in monsoon, hinge tightening, and smooth latching.",
                "includes": ["Door edge planing", "Hinge screw tightening", "Latch clearance check", "Floor clearance adjustment"],
                "tools": ["Electric wood planer", "Hand smoothing plane", "Screwdriver set"],
                "ready": ["Ensure door area is clear for planing and shaving"],
                "reviews": [{"name": "Sunil G.", "rating": "5.0", "text": "Planed swollen bedroom door that was scraping against tile floor. Closes effortlessly now!"}],
                "faqs": [{"q": "Will shaving ruin door polish?", "a": "We shave only the hidden bottom/side edges and apply protective touch-up oil."}]
            },
            {
                "slug": "carp-door-4", "name": "Door Stopper & Rubber Buffer Fit", "base_price": 149, "duration": "20 mins", "tag": "Wall Safety",
                "description": "Floor or wall door stopper installation with rubber buffer to prevent door handle wall damage.",
                "includes": ["Floor anchor drilling", "Stopper screw fit", "Impact check", "Rubber buffer alignment"],
                "tools": ["Tile drill bit", "Cordless screwdriver"],
                "ready": ["Keep door stoppers ready"],
                "reviews": [{"name": "Meera R.", "rating": "4.9", "text": "Installed magnetic floor door stoppers in all 3 bedrooms."}],
                "faqs": [{"q": "Do magnetic stoppers hold heavy doors open in windy weather?", "a": "Yes, heavy-duty neodymium magnetic door stoppers keep doors securely open in strong winds."}]
            },
            {
                "slug": "carp-od-2", "name": "Full-Day Carpenter Booking", "base_price": 1999, "duration": "8 hrs", "tag": "Full Day Care",
                "description": "Full 8-hour dedicated master carpenter booking for home renovation, custom woodworking, or major repairs.",
                "includes": ["8 hrs dedicated master carpenter", "Complete carpentry service", "Tools included", "Precision craftsmanship"],
                "tools": ["Full commercial woodworking machinery and power tools"],
                "ready": ["Keep materials (plywood, laminate, hardware) ready on-site"],
                "reviews": [{"name": "Karthik R.", "rating": "5.0", "text": "Excellent full-day master carpenter work for our living room TV unit partition."}],
                "faqs": [{"q": "Can custom woodwork be built on-site?", "a": "Yes, our master carpenter handles custom wood cutting, joinery, edge-banding, and laminate installation."}]
            }
        ]
    }
}

for s_slug, s_data in MORE_SERVICES_DATA.items():
    service = Service.objects.get(slug=s_slug, category=category)
    for p_data in s_data["packages"]:
        pkg, created = Package.objects.get_or_create(
            slug=p_data["slug"],
            service=service,
            defaults={
                "name": p_data["name"],
                "base_price": p_data["base_price"],
                "duration": p_data["duration"],
                "tag": p_data["tag"],
                "description": p_data["description"],
                "includes": p_data["includes"],
                "tools": p_data["tools"],
                "ready": p_data["ready"],
                "reviews": p_data["reviews"],
                "faqs": p_data["faqs"],
                "status": "ACTIVE",
                "popular": "popular" in p_data["tag"].lower() or "seller" in p_data["tag"].lower() or "booked" in p_data["tag"].lower()
            }
        )
        if not created:
            pkg.name = p_data["name"]
            pkg.base_price = p_data["base_price"]
            pkg.duration = p_data["duration"]
            pkg.tag = p_data["tag"]
            pkg.description = p_data["description"]
            pkg.includes = p_data["includes"]
            pkg.tools = p_data["tools"]
            pkg.ready = p_data["ready"]
            pkg.reviews = p_data["reviews"]
            pkg.faqs = p_data["faqs"]
            pkg.status = "ACTIVE"
            pkg.popular = "popular" in p_data["tag"].lower() or "seller" in p_data["tag"].lower() or "booked" in p_data["tag"].lower()
            pkg.save()
        print(f"  [{'CREATED' if created else 'UPDATED'}] {pkg.name} (Rs.{pkg.base_price})")

print("\nAll remaining services and packages successfully seeded into Supabase!")
