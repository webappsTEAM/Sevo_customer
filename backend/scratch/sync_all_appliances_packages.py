import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package
from django.db import connection

# Ensure sequence alignment
with connection.cursor() as cursor:
    cursor.execute("SELECT setval('service_requests_package_id_seq', (SELECT COALESCE(MAX(id), 1) + 1 FROM service_requests_package), false);")

cat = CatalogCategory.objects.get(slug="ac_appliance")

AC_TOOLS = [
    "High pressure power jet cleaner with splash-proof servicing jacket",
    "Specialized non-corrosive chemical foam cleaning agents",
    "Digital manifold pressure gauge & electronic leak detector",
    "Anemometer airflow & digital laser temperature thermometer",
    "Two-stage deep vacuum pump & R32/R410A charging manifold"
]

AC_READY = [
    "Continuous water tap and 16A power point access",
    "Area below indoor unit cleared of electronics & valuables",
    "Outdoor unit accessible via balcony, terrace, or window"
]

WM_TOOLS = [
    "Specialized drum puller wrench & bearing dismounting tools",
    "Digital multimeter & motor capacitor tester",
    "High pressure water jet cleaner & descaling powder",
    "Heavy duty water inlet & outlet hose clamp tighteners",
    "Spirit level for 4-point machine chassis balance"
]

WM_READY = [
    "Water tap and dedicated electrical socket accessible",
    "Laundry area free of excess water",
    "Machine emptied of all clothes and detergent residues"
]

hvac_packages = [
    # AC Service & Cleaning
    {
        "service_slug": "ac-service-cleaning",
        "slug": "hvac-fj-split",
        "name": "Foam & Power Jet AC Service — Split",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Best Seller",
        "popular": True,
        "description": "Deep foam jet cleaning of indoor cooling coils & outdoor unit for maximum cooling efficiency.",
        "includes": ["2x cooling foam wash", "Indoor & outdoor jet spray", "Gas & cooling delta check"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Siddharth R.", "rating": "5.0", "text": "Deep foam jet cleaning restored cooling instantly!"}],
        "faqs": [{"q": "How does foam power jet work?", "a": "High pressure chemical foam dissolves stubborn dirt and mold between coil fins."}]
    },
    {
        "service_slug": "ac-service-cleaning",
        "slug": "hvac-fj-win",
        "name": "Foam & Power Jet AC Service — Window",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Window Care",
        "popular": False,
        "description": "High-pressure foam jet cleaning for window AC coils, front grill & blower fan.",
        "includes": ["Foam jet coil wash", "Front grill sanitization", "Drain tray clearout"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Vijay K.", "rating": "5.0", "text": "Very clean window AC foam wash."}],
        "faqs": [{"q": "Is window AC removed for washing?", "a": "Yes, we slide out the chassis for 360-degree deep washing."}]
    },
    {
        "service_slug": "ac-service-cleaning",
        "slug": "hvac-pj-split",
        "name": "Power Jet AC Service — Split",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "High Pressure",
        "popular": False,
        "description": "High-pressure power jet water wash to flush stubborn coil dust, dirt & drain blockages.",
        "includes": ["High pressure jet wash", "Blower wheel cleaning", "Drain tray flush"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Gaurav T.", "rating": "5.0", "text": "Great power jet water wash."}],
        "faqs": [{"q": "Does power jet wash include outdoor unit?", "a": "Yes! Both indoor coil and outdoor condenser are washed."}]
    },
    {
        "service_slug": "ac-service-cleaning",
        "slug": "hvac-pj-win",
        "name": "Power Jet AC Service — Window",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Express Clean",
        "popular": False,
        "description": "Water jet spray cleaning for window AC condenser fins and mesh filters.",
        "includes": ["Condenser fins wash", "Mesh filter descaling", "Airflow test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Anil S.", "rating": "5.0", "text": "Quick and thorough window AC wash."}],
        "faqs": [{"q": "How long does power jet wash take?", "a": "Takes 30 to 45 minutes per window AC."}]
    },
    {
        "service_slug": "ac-service-cleaning",
        "slug": "hvac-ar-3",
        "name": "Anti-Rust Deep Clean AC Service",
        "base_price": 799,
        "duration": "1 hr",
        "tag": "Ultimate Care",
        "popular": True,
        "description": "Power jet deep cleaning combined with anti-rust protective spray application on U-bends & coils.",
        "includes": ["Power jet foam wash", "Anti-rust protective coat", "30-day warranty"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Pooja H.", "rating": "5.0", "text": "Anti-rust coating protects the coils from coastal humidity."}],
        "faqs": [{"q": "How does anti-rust coating protect the AC?", "a": "Forms a polymer moisture barrier that prevents acid and salt corrosion on copper bends."}]
    },

    # AC Repair
    {
        "service_slug": "ac-repair",
        "slug": "hvac-rep-1",
        "name": "AC Repair — Split/Window",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Expert Fix",
        "popular": True,
        "description": "Comprehensive diagnostic and repair for electrical, mechanical, noise or cooling failure.",
        "includes": ["Full system diagnostic", "Faulty component repair", "Safety voltage test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Kartik M.", "rating": "5.0", "text": "Diagnosed and fixed the electrical trip issue."}],
        "faqs": [{"q": "What is covered in AC repair?", "a": "Complete diagnostic of compressor, capacitor, PCB, and cooling components."}]
    },
    {
        "service_slug": "ac-repair",
        "slug": "hvac-rep-2",
        "name": "Less/No Cooling",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Cooling Restore",
        "popular": True,
        "description": "Diagnostic for AC running without cooling. Refrigerant level scan, compressor relay & fan motor check.",
        "includes": ["Refrigerant PSI scan", "Compressor relay audit", "Filter airflow test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Rohit G.", "rating": "5.0", "text": "Restored ice-cold cooling in 30 minutes."}],
        "faqs": [{"q": "Why is the AC blower blowing warm air?", "a": "Weak starting capacitor or low refrigerant pressure prevents compressor engagement."}]
    },
    {
        "service_slug": "ac-repair",
        "slug": "hvac-rep-3",
        "name": "Power Issue",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Power Audit",
        "popular": False,
        "description": "Fix AC not turning on, MCB tripping, display light dead, or remote receiver failure.",
        "includes": ["Mains voltage test", "Display PCB power check", "Fuse replacement"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Harish B.", "rating": "5.0", "text": "Fixed power tripping problem quickly."}],
        "faqs": [{"q": "Why does the AC trip the MCB when switched on?", "a": "Compressor winding short or burnt start capacitor causes excessive current draw."}]
    },
    {
        "service_slug": "ac-repair",
        "slug": "hvac-rep-4",
        "name": "Water Leakage",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Leak Fix",
        "popular": False,
        "description": "Fix indoor unit water dripping from front or back tray, drain pipe unclogging & tray realignment.",
        "includes": ["Drain pipe jet flush", "Indoor unit tray re-leveling", "Insulation check"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Stopped water dripping on my wooden floor."}],
        "faqs": [{"q": "Why does the indoor AC leak water?", "a": "Algae slime choking the drain pipe forces water to spill over the internal condensate tray."}]
    },
    {
        "service_slug": "ac-repair",
        "slug": "hvac-rep-5",
        "name": "Unwanted Noise/Smell",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Noise & Odor",
        "popular": False,
        "description": "Eliminate squeaking fan noise, motor bearing grinding, or foul moldy odor from vents.",
        "includes": ["Blower motor greasing", "Coil anti-bacterial spray", "Vibration dampening"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Noise is completely gone after motor bearing lubrication."}],
        "faqs": [{"q": "What causes the sour smell from the AC?", "a": "Bacteria and mold multiplying on wet cooling coil fins."}]
    },

    # AC Gas & Refrigerant
    {
        "service_slug": "ac-gas-refill",
        "slug": "hvac-gas-1",
        "name": "Gas Leak Fix & Refill",
        "base_price": 1799,
        "duration": "2 hrs",
        "tag": "Full Gas Fill",
        "popular": True,
        "description": "Nitrogen pressure leak detection, copper brazing solder fix, vacuuming & 100% gas refill.",
        "includes": ["Nitrogen pressure test", "Copper brazing solder fix", "100% Freon / R32 gas refill", "60-day gas warranty"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Arun K.", "rating": "5.0", "text": "Found and brazed the leak. Refilled pure gas with 60-day warranty."}],
        "faqs": [{"q": "Is gas warranty provided?", "a": "Yes! Full 60-day leak and gas refill warranty is provided."}]
    },
    {
        "service_slug": "ac-gas-refill",
        "slug": "hvac-gas-2",
        "name": "Gas Charging",
        "base_price": 1499,
        "duration": "1.5 hrs",
        "tag": "Top-Up Fill",
        "popular": False,
        "description": "Standard R32 / R410a / R22 eco refrigerant gas charging with vacuum evacuation.",
        "includes": ["System vacuum evacuation", "Precise PSI gas charging", "Cooling performance test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Shruti B.", "rating": "5.0", "text": "Standard gas charging done accurately by PSI gauge."}],
        "faqs": [{"q": "Which gas is used?", "a": "100% pure R32, R410A, or R22 cylinders calibrated to OEM specs."}]
    },
    {
        "service_slug": "ac-gas-refill",
        "slug": "hvac-gas-3",
        "name": "Service Valve Replacement",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Valve Swap",
        "popular": False,
        "description": "Replacing brass outdoor unit service valve flare nut and sealing pin.",
        "includes": ["Brass valve replace", "Copper flare fitting", "Pressure leak test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Mohit T.", "rating": "5.0", "text": "Replaced leaking brass service valve core."}],
        "faqs": [{"q": "Why do service valves leak?", "a": "Internal Teflon seals wear out over time from temperature cycles."}]
    },
    {
        "service_slug": "ac-gas-refill",
        "slug": "hvac-gas-4",
        "name": "Cooling Coil / Condenser Coil Repair",
        "base_price": 899,
        "duration": "1.5 hrs",
        "tag": "Coil Repair",
        "popular": False,
        "description": "Aluminum to copper coil braze repair or u-bend pinhole leak soldering.",
        "includes": ["Coil leak pressure scan", "Copper silver brazing", "Anti-corrosion coat"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Suresh J.", "rating": "5.0", "text": "Brazed copper U-bend pinholes seamlessly."}],
        "faqs": [{"q": "Can copper-aluminum hybrid joints be brazed?", "a": "Yes! We use specialized low-temperature Al-Cu flux-cored brazing rods."}]
    },

    # AC Installation & Uninstallation
    {
        "service_slug": "ac-installation",
        "slug": "hvac-inst-split",
        "name": "Split AC Installation",
        "base_price": 1299,
        "duration": "2 hrs",
        "tag": "Popular",
        "popular": True,
        "description": "Professional indoor unit plate mounting, core wall drilling, outdoor bracket setup, and copper pipe connection.",
        "includes": ["Indoor & outdoor mounting", "Core wall hole drilling", "Vacuuming & leak test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Kishore M.", "rating": "5.0", "text": "Flawless split AC installation with laser level."}],
        "faqs": [{"q": "Is core wall drilling included?", "a": "Yes! 3-inch wall core drilling for copper pipe exit is included."}]
    },
    {
        "service_slug": "ac-installation",
        "slug": "hvac-inst-win",
        "name": "Window AC Installation",
        "base_price": 799,
        "duration": "1.5 hrs",
        "tag": "Window Fit",
        "popular": False,
        "description": "Window frame alignment, wooden/iron bracket mounting, and side foam insulation sealing.",
        "includes": ["Window frame alignment", "Rubber vibration pad fit", "Foam gap seal"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Fitted window AC securely with foam weather sealing."}],
        "faqs": [{"q": "Do you provide side gap insulation?", "a": "Yes! We seal side gaps with high-density weather foam."}]
    },
    {
        "service_slug": "ac-installation",
        "slug": "hvac-uninst-1",
        "name": "AC Uninstallation",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Safe Removal",
        "popular": False,
        "description": "Safe gas pump-down into compressor, dismounting indoor/outdoor units, and copper pipe sealing.",
        "includes": ["Gas pump down", "Units dismounting", "Copper pipe packaging"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Safely locked all refrigerant before dismounting."}],
        "faqs": [{"q": "Will gas leak during uninstallation?", "a": "No, gas pump-down saves 100% of the refrigerant inside the compressor."}]
    },
    {
        "service_slug": "ac-installation",
        "slug": "hvac-reinst-ind",
        "name": "Indoor Unit Reinstallation",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Indoor Fit",
        "popular": False,
        "description": "Remounting split AC indoor unit on backplate, drain hose routing & flare jointing.",
        "includes": ["Backplate mounting", "Flare joint tightening", "Drain test"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Re-mounted the indoor unit cleanly on new bedroom wall."}],
        "faqs": [{"q": "Can the indoor unit be moved to a different wall?", "a": "Yes! We can extend the copper piping to reach your new desired wall."}]
    },
    {
        "service_slug": "ac-installation",
        "slug": "hvac-reinst-out",
        "name": "Outdoor Unit Reinstallation",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Outdoor Fit",
        "popular": False,
        "description": "Remounting heavy outdoor compressor unit on wall stand with anti-vibration rubber pads.",
        "includes": ["Wall stand anchor fit", "Rubber pad placement", "Service valve jointing"],
        "tools": AC_TOOLS, "ready": AC_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Remounted outdoor unit on balcony wall stand securely."}],
        "faqs": [{"q": "Are anti-vibration rubber pads included?", "a": "Yes! Rubber vibration dampening pads are included."}]
    }
]

# Seed HVAC packages into corresponding services
for p_data in hvac_packages:
    s_slug = p_data["service_slug"]
    service = Service.objects.get(category=cat, slug=s_slug)
    slug = p_data["slug"]
    pkg, created = Package.objects.get_or_create(
        slug=slug,
        defaults={
            "service": service,
            "name": p_data["name"],
            "base_price": p_data["base_price"],
            "duration": p_data["duration"],
            "tag": p_data["tag"],
            "popular": p_data.get("popular", False),
            "description": p_data["description"],
            "includes": p_data["includes"],
            "tools": p_data["tools"],
            "ready": p_data["ready"],
            "reviews": p_data["reviews"],
            "faqs": p_data["faqs"],
            "status": "ACTIVE",
            "image": "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=500&q=80&fit=crop"
        }
    )
    if not created:
        pkg.service = service
        pkg.name = p_data["name"]
        pkg.base_price = p_data["base_price"]
        pkg.duration = p_data["duration"]
        pkg.tag = p_data["tag"]
        pkg.popular = p_data.get("popular", False)
        pkg.description = p_data["description"]
        pkg.includes = p_data["includes"]
        pkg.tools = p_data["tools"]
        pkg.ready = p_data["ready"]
        pkg.reviews = p_data["reviews"]
        pkg.faqs = p_data["faqs"]
        pkg.status = "ACTIVE"
        pkg.save()
    print(f"  [{'CREATED' if created else 'UPDATED'}] {service.name} -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

# ── Washing Machine packages in BookingPage.jsx ──
wm_svc = Service.objects.get(category=cat, slug="washing-machine")
wm_packages = [
    {
        "slug": "wm-jet-1",
        "name": "Washing Machine Jet Service",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Best Seller",
        "popular": True,
        "description": "High-pressure foam & water jet deep cleaning for inner steel tub, outer drum scale & lint filter.",
        "includes": ["High pressure foam jet wash", "Chemical tub descaling", "30-day service warranty"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Meenakshi S.", "rating": "5.0", "text": "High pressure jet foam wash descaled the drum completely."}],
        "faqs": [{"q": "How does jet wash descale the drum?", "a": "High-pressure water jets reach behind the outer tub to flush away accumulated detergent sludge."}]
    },
    {
        "slug": "wm-chk-1",
        "name": "Washing Machine Check-up",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Diagnostic",
        "popular": False,
        "description": "Complete 21-point system check-up, drum spin balance audit, water flow & electrical safety inspection.",
        "includes": ["21-point system diagnostic", "Fault inspection report", "Repair cost estimate"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Very thorough check-up. Pinpointed the drain valve issue."}],
        "faqs": [{"q": "What is inspected in check-up?", "a": "Motor winding, suspension balance, inlet solenoid valve, drainage pump, and control PCB."}]
    },
    {
        "slug": "wm-inst-1",
        "name": "Washing Machine Installation",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Popular",
        "popular": True,
        "description": "Professional top load / front load unboxing, inlet pipe tap adapter fitting, drain hose setup & demo.",
        "includes": ["Unboxing & positioning", "Inlet & outlet pipe connection", "Live run demo"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Rohit N.", "rating": "5.0", "text": "Installed front load washer and leveled the feet perfectly."}],
        "faqs": [{"q": "Are tap adapters provided?", "a": "Yes, brass multi-thread tap adapters are included."}]
    },
    {
        "slug": "wm-inst-2",
        "name": "Washing Machine Uninstallation",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Safe Dismount",
        "popular": False,
        "description": "Safe disconnection of water inlet hose, power cord, drain pipe & transit safety bolt fitting.",
        "includes": ["Water line disconnection", "Drain hose detachment", "Transit bolt fit"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Tanvi C.", "rating": "5.0", "text": "Fitted transit safety bolts before moving."}],
        "faqs": [{"q": "Why are transit bolts important?", "a": "They lock the suspension drum to prevent internal chassis damage during transport."}]
    },
    {
        "slug": "wm-rep-1",
        "name": "Washer Spinning Abnormally",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Spin Fix",
        "popular": True,
        "description": "Fix uneven tub rotation, spin drum vibration, shock absorber check, or drive belt tension adjustment.",
        "includes": ["Shock absorber inspection", "Drive belt tension check", "Drum spin test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Bhavna P.", "rating": "5.0", "text": "Replaced the shock absorbers and machine spins silently."}],
        "faqs": [{"q": "What causes severe spinning vibration?", "a": "Worn suspension shock absorbers or broken spider arms cause uneven drum wobble."}]
    },
    {
        "slug": "wm-rep-2",
        "name": "Machine Making Sound",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Noise Fix",
        "popular": False,
        "description": "Diagnosis & fix for loud grinding, squeaking, or thumping sounds during wash/spin cycles.",
        "includes": ["Coin trap clearance", "Motor pulley check", "Bearing noise test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Cleared coins stuck in the coin trap impeller."}],
        "faqs": [{"q": "Why does the machine make grinding noise?", "a": "Foreign objects (coins, hairpins) caught in the drain pump or worn drum bearings cause grinding."}]
    },
    {
        "slug": "wm-rep-3",
        "name": "Other / Other Issue",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "General Fix",
        "popular": False,
        "description": "General diagnosis for water inlet leak, PCB error codes, door lock failure, or timer issues.",
        "includes": ["Full system diagnostic", "Faulty component fix", "Safety circuit check"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Fixed the front door lock microswitch."}],
        "faqs": [{"q": "Why does the door not unlock after cycle?", "a": "A failed thermal door lock mechanism or water left in drum prevents the door from releasing."}]
    }
]

for p_data in wm_packages:
    slug = p_data["slug"]
    pkg, created = Package.objects.get_or_create(
        slug=slug,
        defaults={
            "service": wm_svc,
            "name": p_data["name"],
            "base_price": p_data["base_price"],
            "duration": p_data["duration"],
            "tag": p_data["tag"],
            "popular": p_data.get("popular", False),
            "description": p_data["description"],
            "includes": p_data["includes"],
            "tools": p_data["tools"],
            "ready": p_data["ready"],
            "reviews": p_data["reviews"],
            "faqs": p_data["faqs"],
            "status": "ACTIVE",
            "image": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&q=80&fit=crop"
        }
    )
    if not created:
        pkg.service = wm_svc
        pkg.name = p_data["name"]
        pkg.base_price = p_data["base_price"]
        pkg.duration = p_data["duration"]
        pkg.tag = p_data["tag"]
        pkg.popular = p_data.get("popular", False)
        pkg.description = p_data["description"]
        pkg.includes = p_data["includes"]
        pkg.tools = p_data["tools"]
        pkg.ready = p_data["ready"]
        pkg.reviews = p_data["reviews"]
        pkg.faqs = p_data["faqs"]
        pkg.status = "ACTIVE"
        pkg.save()
    print(f"  [{'CREATED' if created else 'UPDATED'}] Washing Machine -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

print("\nALL HVAC and Washing Machine packages successfully synchronized in Supabase!")
