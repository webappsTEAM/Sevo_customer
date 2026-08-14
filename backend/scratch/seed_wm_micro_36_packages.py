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

WM_TOOLS = [
    "Specialized drum puller wrench & bearing dismounting gear",
    "Digital multimeter & motor capacitor tester",
    "High pressure water jet cleaner & descaling chemical powder",
    "Heavy duty water inlet & outlet hose clamp tighteners",
    "Spirit level for 4-point machine chassis balance",
    "Silicone sealant & rubber bellow fitting clamp pliers"
]

WM_READY = [
    "Water tap and dedicated electrical socket accessible",
    "Laundry area free of excess water",
    "Machine emptied of all clothes and detergent residues",
    "Drainage drain pipe accessible"
]

MICRO_RO_TOOLS = [
    "High-voltage test probe & microwave leakage RF meter",
    "Digital TDS (Total Dissolved Solids) calibrated water meter",
    "High-voltage capacitor discharge safety probe",
    "Water pressure gauge for booster pump PSI test",
    "Food-grade sanitizing solution & replacement filter keys",
    "High-rejection membrane insertion tool"
]

MICRO_RO_READY = [
    "Direct raw water inlet connection accessible",
    "Dedicated 3-pin power point within 1 meter",
    "Glass turntable & roller ring kept aside safely",
    "Storage tank access cleared"
]

# ── ALL 36 WASHING MACHINE PACKAGES ──
wm_packages = [
    # 1. Washing Machine Service & Cleaning (6 pkgs)
    {
        "slug": "wm-cln-1",
        "name": "Washing Machine Drum Jet Descaling (Top / Front Load)",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Best Seller",
        "popular": True,
        "description": "High-pressure chemical descaling cycle, lint trap scrub, detergent tray wash, drum sterilization & odor removal.",
        "includes": ["Chemical tub descaling cycle", "Rubber door bellow mold scrub", "Detergent drawer & coin filter flush", "High pressure drum rinse"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Meenakshi S.", "rating": "5.0", "text": "Removed black mold from front rubber gasket and clothes smell fresh."}],
        "faqs": [{"q": "How often should I descale?", "a": "Every 3 to 6 months to prevent limescale on the heating element and tub."}]
    },
    {
        "slug": "wm-cln-2",
        "name": "Washing Machine 21-Point System Check-up",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Diagnostic",
        "popular": True,
        "description": "21-point system check-up covering spin motor, drainage pump, suspension balance, inlet valve & error codes.",
        "includes": ["Motor current & drive belt test", "Drain pump & inlet solenoid flow test", "Suspension balance check", "Full diagnostic report"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Very thorough check-up. Pinpointed the drain valve issue."}],
        "faqs": [{"q": "Is diagnostic fee adjusted in repair?", "a": "Yes! When you approve the repair, the inspection fee is adjusted towards your bill."}]
    },
    {
        "slug": "wm-cln-3",
        "name": "Deep Chemical Tub Wash & Sanitization",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Deep Clean",
        "popular": False,
        "description": "Inner and outer tub chemical flush, high-temp bacteria elimination, and pulsator plate removal cleaning.",
        "includes": ["Pulsator plate removal", "Under-drum sludge wash", "Anti-bacterial disinfectant cycle", "Filter mesh cleaning"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Pooja H.", "rating": "5.0", "text": "Removed years of dirt trapped under the bottom pulsator plate."}],
        "faqs": [{"q": "Is the pulsator removed?", "a": "Yes, we remove the bottom plate to wash accumulated lint underneath."}]
    },
    {
        "slug": "wm-cln-4",
        "name": "Rubber Door Bellow Anti-Mold Treatment",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Mold Fix",
        "popular": False,
        "description": "Intensive anti-fungal chemical scrub of front load door rubber gasket to remove black spots and foul smells.",
        "includes": ["Enzymatic mold remover application", "Gasket fold deep scrub", "Steam sanitization", "Silicone protective coat"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Kavita J.", "rating": "5.0", "text": "Cleaned the stubborn black mold completely."}],
        "faqs": [{"q": "Will this remove black mold permanently?", "a": "Yes! Our enzymatic treatment eliminates 99.9% of mold spores."}]
    },
    {
        "slug": "wm-cln-5",
        "name": "Coin Trap & Drain Line High Pressure Flush",
        "base_price": 249,
        "duration": "25 mins",
        "tag": "Quick Clean",
        "popular": False,
        "description": "Opening front coin filter trap, removing foreign objects (pins/coins), and high-pressure drain line flush.",
        "includes": ["Coin trap unscrewing & cleaning", "Foreign object removal", "Drain pipe pressure flush", "O-ring seal check"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Found hairpins jamming the coin trap. Water drains fast now."}],
        "faqs": [{"q": "Why does the machine show OE/E2 error?", "a": "A choked coin filter blocks water from reaching the drain pump."}]
    },
    {
        "slug": "wm-cln-6",
        "name": "Preventive Annual Washing Machine Maintenance",
        "base_price": 799,
        "duration": "1.5 hrs",
        "tag": "Annual Care",
        "popular": False,
        "description": "Full annual tune-up: descaling cycle, shock absorber check, belt tensioning, wiring audit & gasket lubricate.",
        "includes": ["Full tub descaling", "Drive belt tensioning", "Suspension greasing", "Terminal tightening"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Harish B.", "rating": "5.0", "text": "Annual service keeps our machine running like brand new."}],
        "faqs": [{"q": "How often should annual maintenance be done?", "a": "Once a year ensures longest motor lifespan and zero sudden breakdowns."}]
    },

    # 2. Washing Machine Installation & Setup (6 pkgs)
    {
        "slug": "wm-inst-1",
        "name": "Washing Machine Installation (Top / Front Load)",
        "base_price": 349,
        "duration": "45 mins",
        "tag": "Popular",
        "popular": True,
        "description": "Professional unboxing, transit safety bolts removal, inlet tap brass adapter fitting, drain hose routing & demo.",
        "includes": ["Transit bolts removal", "Tap connector brass fitting", "Leveling balance adjustment", "Live run demo"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Rohit N.", "rating": "5.0", "text": "Removed transit bolts and leveled feet. Tested spin cycle perfectly."}],
        "faqs": [{"q": "What are transit bolts on a new machine?", "a": "They lock the drum during shipping and MUST be removed before first use."}]
    },
    {
        "slug": "wm-inst-2",
        "name": "Washing Machine Uninstallation",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Safe Dismount",
        "popular": False,
        "description": "Safe disconnection of water inlet hose, power cord, drain pipe & transit safety bolt fitting for moving.",
        "includes": ["Water line disconnection", "Drain hose detachment", "Transit bolt fit", "Packaging prep"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Tanvi C.", "rating": "5.0", "text": "Fitted transit bolts before relocation safely."}],
        "faqs": [{"q": "Do you provide replacement transit bolts?", "a": "Yes, universal transit lock bolts are available if originals were misplaced."}]
    },
    {
        "slug": "wm-inst-3",
        "name": "Washing Machine Reinstallation Combo",
        "base_price": 599,
        "duration": "1.5 hrs",
        "tag": "Relocation Best",
        "popular": True,
        "description": "Safe dismount at old location + complete re-installation with balance leveling at new location.",
        "includes": ["Dismount from origin", "New spot installation", "Tap adapter fit", "30-day warranty"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Handled dismount and reinstallation during our flat shifting."}],
        "faqs": [{"q": "Can you extend inlet and outlet pipes?", "a": "Yes! Extra heavy-duty braided inlet pipes and corrugated drain hoses are available."}]
    },
    {
        "slug": "wm-inst-4",
        "name": "Anti-Vibration Rubber Feet Stand Installation",
        "base_price": 249,
        "duration": "25 mins",
        "tag": "Floor Stand",
        "popular": False,
        "description": "Heavy-duty shock absorbing rubber damper feet or metal trolley stand assembly to prevent machine walking.",
        "includes": ["Rubber dampener pad insertion", "Trolley stand wheel lock fit", "Spirit level 4-point balance"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Girish V.", "rating": "5.0", "text": "Fitted rubber isolation pads. Machine does not vibrate or move at all."}],
        "faqs": [{"q": "Do rubber pads prevent floor tiles cracking?", "a": "Yes! Shock absorbing rubber pads absorb 95% of high-speed spin vibration."}]
    },
    {
        "slug": "wm-inst-5",
        "name": "Water Inlet Brass Tap Adapter & Hose Fit",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Leak Free",
        "popular": False,
        "description": "Multi-thread brass tap connector fitting, Teflon leak seal, and braided inlet pipe connection.",
        "includes": ["Brass tap adapter fit", "Teflon tape seal", "Braided inlet pipe connect", "Water pressure leak test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Ashok G.", "rating": "5.0", "text": "Replaced plastic leaking tap connector with heavy brass adapter."}],
        "faqs": [{"q": "Does this work on all tap sizes?", "a": "Yes! Our brass adapter fits standard 1/2 inch and 3/4 inch threaded taps."}]
    },
    {
        "slug": "wm-inst-6",
        "name": "Drainage Hose Extension & Clamp Routing",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Drain Routing",
        "popular": False,
        "description": "Extending drain pipe length, wall clamp routing, and stainless steel clamp joint tightening.",
        "includes": ["Drain hose extension", "Stainless steel worm clamp fit", "Gradient slope check", "Drain flow test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Extended drain pipe to the balcony drain neatly."}],
        "faqs": [{"q": "Why is proper drain hose height important?", "a": "Front load washers require the drain pipe to loop up to drum height to prevent siphon water loss."}]
    },

    # 3. Washing Machine Spinning & Vibration (6 pkgs)
    {
        "slug": "wm-spin-1",
        "name": "Suspension Damper Rods Replacement (Set of 4)",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Zero Wobble",
        "popular": True,
        "description": "Replacing worn-out top load suspension damper rods to eliminate severe tub banging against the cabinet.",
        "includes": ["4x suspension damper swap", "Grease damping application", "Drum center alignment", "1200 RPM spin test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Bhavna P.", "rating": "5.0", "text": "Tub was banging loudly during spin. Replaced all 4 damper rods, runs smooth now!"}],
        "faqs": [{"q": "Why does the drum bang against the walls during spin?", "a": "Worn suspension springs lose hydraulic damping, causing the drum to bounce violently."}]
    },
    {
        "slug": "wm-spin-2",
        "name": "Front Load Shock Absorber Replacement",
        "base_price": 549,
        "duration": "45 mins",
        "tag": "Shock Absorber",
        "popular": True,
        "description": "Replacing bottom hydraulic friction shock absorbers on front load washer to stop machine floor walking.",
        "includes": ["Friction strut shock swap", "Mounting pin secure locking", "Chassis level balance", "60-day warranty"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Machine was literally jumping across the room. New shock absorbers fixed it completely."}],
        "faqs": [{"q": "How many shock absorbers does a front load washer have?", "a": "Most front load machines use 2 or 3 heavy-duty friction shock absorbers."}]
    },
    {
        "slug": "wm-spin-3",
        "name": "Drive Belt Replacement & Tension Calibration",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Belt Swap",
        "popular": False,
        "description": "Replacing loose, cracked, or squeaking V-ribbed motor drive belt with OEM heat-resistant belt.",
        "includes": ["Old belt dismount", "OEM drive belt fitting", "Motor pulley alignment", "Tension torque check"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Fixed belt slipping noise during spin cycle."}],
        "faqs": [{"q": "How to tell if the drive belt is loose?", "a": "If the motor hums but the drum turns sluggishly or makes squealing sounds, the belt is loose."}]
    },
    {
        "slug": "wm-spin-4",
        "name": "Drum Spider Arm & Bearing Inspection",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Bearing Audit",
        "popular": False,
        "description": "Full diagnostic check of stainless steel drum spider support bracket and rear double-sealed bearings.",
        "includes": ["Rear pulley play test", "Spider arm corrosion check", "Bearing noise assessment", "Itemized estimate"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Manoj P.", "rating": "5.0", "text": "Diagnosed a cracked spider arm before it caused drum rupture. Very honest work."}],
        "faqs": [{"q": "What causes the loud airplane jet engine sound during spin?", "a": "Corroded ball bearings or broken spider arms cause severe rumbling roar sounds."}]
    },
    {
        "slug": "wm-spin-5",
        "name": "Unbalance Error (UE / uB) Diagnostic & Sensor Fix",
        "base_price": 399,
        "duration": "35 mins",
        "tag": "UE Fix",
        "popular": False,
        "description": "Diagnosing repeated UE error codes, unbalance switch calibration, and leveling adjustment.",
        "includes": ["Unbalance sensor microswitch test", "Safety lever adjustment", "Leveling foot calibration", "Load distribution test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Ananya D.", "rating": "5.0", "text": "Fixed the repeated UE pause error during rinse."}],
        "faqs": [{"q": "Why does the machine keep pausing at the spin cycle?", "a": "Safety unbalance switches pause the motor if excessive drum tilt is detected."}]
    },
    {
        "slug": "wm-spin-6",
        "name": "Pulsator Plate Replacement & Spline Gear Fix",
        "base_price": 399,
        "duration": "35 mins",
        "tag": "Pulsator Fix",
        "popular": False,
        "description": "Replacing stripped plastic/metal pulsator center spline gear to restore powerful water vortex agitation.",
        "includes": ["Pulsator center bolt removal", "Spline teeth gear inspection", "New pulsator plate fit", "Wash agitation test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Ramesh N.", "rating": "5.0", "text": "Clothes were not moving during wash. Replaced stripped pulsator gear."}],
        "faqs": [{"q": "Why does the motor spin but clothes do not rotate?", "a": "Stripped teeth on the pulsator center bushing prevent the motor shaft from rotating the plate."}]
    },

    # 4. Washing Machine Water & Drainage (6 pkgs)
    {
        "slug": "wm-wtr-1",
        "name": "Water Inlet Solenoid Valve Replacement",
        "base_price": 399,
        "duration": "35 mins",
        "tag": "Inlet Fix",
        "popular": True,
        "description": "Replacing dual/single coil 220V water inlet solenoid valve for slow filling or continuous water flow issues.",
        "includes": ["Inlet valve continuity test", "New OEM solenoid valve fit", "Mesh filter seal", "Fill cutoff test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Water was trickling very slowly. Replaced the solenoid valve, fills in 5 mins."}],
        "faqs": [{"q": "Why does water keep filling even when machine is switched off?", "a": "A jammed diaphragm inside the inlet solenoid valve fails to mechanically close."}]
    },
    {
        "slug": "wm-wtr-2",
        "name": "Drainage Pump Motor Replacement",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Pump Swap",
        "popular": True,
        "description": "Replacing burnt or jammed magnetic drainage pump motor to resolve OE / E2 water drain errors.",
        "includes": ["Old pump dismount", "OEM synchronous drain pump fit", "Hose clamp seal", "Rapid drain cycle test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Replaced dead drain pump. Water drains in 60 seconds now."}],
        "faqs": [{"q": "What causes the drain pump to burn out?", "a": "Coins, pins, or baby socks caught in the impeller stall the motor and burn the windings."}]
    },
    {
        "slug": "wm-wtr-3",
        "name": "Water Level Pressure Sensor (Pressure Switch) Fix",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Sensor Fix",
        "popular": False,
        "description": "Replacing electronic water level pressure transducer sensor or unblocking pressure tube to fix PE / 1E errors.",
        "includes": ["Air pressure tube flush", "Pressure sensor transducer test", "Water level calibration", "Error clear"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Vijay K.", "rating": "5.0", "text": "Fixed PE error code by replacing the electronic pressure sensor."}],
        "faqs": [{"q": "How does a washing machine sense water level?", "a": "Rising water compresses air inside a rubber tube connected to an electronic frequency sensor."}]
    },
    {
        "slug": "wm-wtr-4",
        "name": "Front Load Door Rubber Gasket Bellow Replacement",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Door Seal",
        "popular": True,
        "description": "Replacing torn, punctured, or moldy rubber door seal to stop front door water leaks during wash cycles.",
        "includes": ["Old gasket removal", "Tub rim rust cleanup", "New silicone door bellow fit", "Clamp spring lock & leak test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Divya P.", "rating": "5.0", "text": "Replaced torn front door rubber gasket. Zero water leakage."}],
        "faqs": [{"q": "Can a torn door gasket be patched?", "a": "No, high spin speeds and hot water will tear patches. We install brand new factory door gaskets."}]
    },
    {
        "slug": "wm-wtr-5",
        "name": "Internal Tub Hose & Siphon Pipe Leak Fix",
        "base_price": 349,
        "duration": "35 mins",
        "tag": "Internal Leak",
        "popular": False,
        "description": "Repairing or replacing cracked tub-to-pump corrugated rubber hose or detergent dispenser funnel siphon.",
        "includes": ["Chassis panel dismount", "Cracked hose replacement", "Heavy duty clamp fit", "Full load leak check"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Gaurav T.", "rating": "5.0", "text": "Found a pinhole in the bottom black tub hose. Replaced quickly."}],
        "faqs": [{"q": "Why is water leaking from underneath the machine?", "a": "Cracked tub-to-pump accordion hoses or loose clamp joints cause bottom water pooling."}]
    },
    {
        "slug": "wm-wtr-6",
        "name": "Hard Water Inline Descaling Filter Installation",
        "base_price": 299,
        "duration": "20 mins",
        "tag": "Water Filter",
        "popular": False,
        "description": "Fitting polyphosphate anti-scale magnetic cartridge on water inlet tap to protect heater and keep clothes soft.",
        "includes": ["Inline filter adapter mount", "Anti-scale cartridge fit", "Flow rate check", "Filter cartridge maintenance guide"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Anil S.", "rating": "5.0", "text": "Great filter for hard borewell water in our apartment."}],
        "faqs": [{"q": "Does this filter prevent white powder residue on clothes?", "a": "Yes! Polyphosphate crystals condition calcium and magnesium salts to prevent fabric stiffness."}]
    },

    # 5. Washing Machine Electrical & PCB Repair (6 pkgs)
    {
        "slug": "wm-elec-1",
        "name": "Washing Machine Main Control PCB Repair",
        "base_price": 899,
        "duration": "1.5 hrs",
        "tag": "Logic Board",
        "popular": True,
        "description": "Component-level repair of microcontroller PCB, triac motor drivers, display IC, and power supply circuit.",
        "includes": ["PCB diagnostic scan", "Motor triac & relay swap", "Burned trace resolder", "60-day PCB warranty"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Naveen P.", "rating": "5.0", "text": "Repaired the inverter PCB logic board. Saved Rs. 5,000 on new board."}],
        "faqs": [{"q": "Can inverter washing machine control boards be repaired?", "a": "Yes! We replace blown IPM modules, power ICs, and switching relays on the PCB."}]
    },
    {
        "slug": "wm-elec-2",
        "name": "Door Safety Lock (Interlock Switch) Replacement",
        "base_price": 399,
        "duration": "30 mins",
        "tag": "Door Lock",
        "popular": True,
        "description": "Replacing thermal PTC door lock interlock switch to fix dE / Door Error and enable machine startup.",
        "includes": ["Door interlock switch test", "New OEM safety lock fit", "Latching & release test", "Child lock verification"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Arun K.", "rating": "5.0", "text": "Door was not locking and machine showed dE error. Replaced lock in 20 mins."}],
        "faqs": [{"q": "Why does the machine beep and not start?", "a": "If the safety door lock fails to engage, the controller aborts the cycle for child safety."}]
    },
    {
        "slug": "wm-elec-3",
        "name": "Motor Start Capacitor Replacement",
        "base_price": 299,
        "duration": "25 mins",
        "tag": "Capacitor Swap",
        "popular": False,
        "description": "Replacing weak dual 10uF / 12uF motor capacitor with heavy-duty metalized capacitor for full spin torque.",
        "includes": ["Capacitance microfarad test", "Heavy-duty capacitor swap", "Motor torque startup test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Shruti B.", "rating": "5.0", "text": "Motor was humming without spinning. Replaced capacitor, runs powerful now."}],
        "faqs": [{"q": "How to tell if the capacitor is weak?", "a": "The motor hums or struggles to rotate under a full load of wet clothes."}]
    },
    {
        "slug": "wm-elec-4",
        "name": "Water Heating Element (Heater Coil) Replacement",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Hot Wash",
        "popular": False,
        "description": "Replacing burnt or limescale-encrusted 2000W heating element and NTC thermistor sensor on front load washer.",
        "includes": ["Heater resistance test", "New 2000W stainless element fit", "NTC sensor swap", "60°C hot wash cycle test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Mohit T.", "rating": "5.0", "text": "Water was not heating in 60-degree wash mode. New heating element works great."}],
        "faqs": [{"q": "Why is hot water wash important?", "a": "Hot water (40°C - 60°C) sanitizes clothes, kills dust mites, and dissolves detergent effectively."}]
    },
    {
        "slug": "wm-elec-5",
        "name": "Display Touch Panel & Membrane Keypad Fix",
        "base_price": 499,
        "duration": "40 mins",
        "tag": "Touch Panel",
        "popular": False,
        "description": "Repairing non-responsive touch panel buttons, start switch failure, or digital cycle selector dial.",
        "includes": ["Touch ribbon cable test", "Microswitch push button solder", "Display LED check", "Cycle program test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Suresh J.", "rating": "5.0", "text": "Start button was stuck. Replaced the microswitch button on the panel."}],
        "faqs": [{"q": "Can individual buttons on the panel be fixed?", "a": "Yes, we resolder worn push microswitches behind the front fascia panel."}]
    },
    {
        "slug": "wm-elec-6",
        "name": "Mains Wiring Harness & Rat Bite Cable Repair",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Wiring Care",
        "popular": False,
        "description": "Tracing and repairing rat-bitten internal wiring harness, terminal crimping, and protective sleeve wrapping.",
        "includes": ["Wire continuity tracing", "Heat-shrink terminal soldering", "Protective corrugated loom fit", "Earthing safety test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Kishore M.", "rating": "5.0", "text": "Rats chewed the motor wires. Repaired with protective conduit sleeve."}],
        "faqs": [{"q": "Do you install rat mesh covers?", "a": "Yes! We can fit a bottom anti-rodent plastic/metal mesh cover to prevent future rat damage."}]
    },

    # 6. Washing Machine Motor & Mechanical Repair (6 pkgs)
    {
        "slug": "wm-mech-1",
        "name": "Direct Drive (DD) / Inverter Motor Diagnostic",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Inverter Motor",
        "popular": True,
        "description": "Diagnostic testing of brushless direct drive (DD) inverter motor stator windings and Hall effect position sensor.",
        "includes": ["3-phase stator resistance test", "Hall sensor (RPS) test", "Rotor permanent magnet inspection", "LE error fix"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Resolved LE error on LG Direct Drive washer. Replaced Hall effect sensor."}],
        "faqs": [{"q": "What does LE error mean on a Direct Drive washer?", "a": "LE (Locked Error) indicates the Hall effect rotor position sensor is unable to detect motor rotation."}]
    },
    {
        "slug": "wm-mech-2",
        "name": "Gearbox / Transmission Assembly Replacement",
        "base_price": 899,
        "duration": "1.5 hrs",
        "tag": "Gearbox Swap",
        "popular": False,
        "description": "Replacing worn top load reduction gearbox assembly to eliminate grinding sounds and restore spin power.",
        "includes": ["Old gearbox dismount", "OEM reduction gearbox installation", "Clutch brake spring fit", "Agitation & spin test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Fitted new gearbox. Washing and spinning work like a brand new machine."}],
        "faqs": [{"q": "How to tell if the gearbox has failed?", "a": "Loud grinding gears during wash cycle or oil leaking under the pulsator indicates gearbox failure."}]
    },
    {
        "slug": "wm-mech-3",
        "name": "Drain Valve Actuator / Motor Replacement",
        "base_price": 449,
        "duration": "35 mins",
        "tag": "Actuator Fix",
        "popular": False,
        "description": "Replacing motorized drain torque actuator that pulls the drain rubber seal and shifts gear into spin mode.",
        "includes": ["Drain motor actuator test", "Brake lever engagement check", "New synchronous actuator fit", "Drain & spin cycle test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Replaced the drain actuator motor. Machine shifts into spin mode smoothly."}],
        "faqs": [{"q": "What is the function of the drain actuator?", "a": "The actuator pulls open the drain valve and simultaneously disengages the clutch brake for high-speed spinning."}]
    },
    {
        "slug": "wm-mech-4",
        "name": "Clutch Brake Spring & Mechanism Overhaul",
        "base_price": 449,
        "duration": "40 mins",
        "tag": "Clutch Fix",
        "popular": False,
        "description": "Replacing clutch spring, ratchet gear pawl, and brake lining to resolve half-spin or slipping drum problems.",
        "includes": ["Clutch spring replacement", "Ratchet pawl greasing", "Brake band alignment", "Braking stop test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Fixed the clutch slip problem. Drum stops immediately when lid is opened."}],
        "faqs": [{"q": "Why does the drum take too long to stop spinning?", "a": "Worn clutch brake bands fail to engage braking friction when the lid is lifted."}]
    },
    {
        "slug": "wm-mech-5",
        "name": "Motor Carbon Brush Replacement (Front Load)",
        "base_price": 399,
        "duration": "40 mins",
        "tag": "Carbon Brush",
        "popular": False,
        "description": "Replacing worn carbon brushes on universal motor to restore drum rotation and eliminate motor sparking.",
        "includes": ["Motor dismounting", "2x OEM carbon brush replacement", "Commutator copper cleaning", "High-speed spin test"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Tarun K.", "rating": "5.0", "text": "Replaced worn carbon brushes on Bosch front load washer. Motor runs smoothly."}],
        "faqs": [{"q": "How long do motor carbon brushes last?", "a": "Carbon brushes typically last 4 to 7 years in front load universal motors before wearing down."}]
    },
    {
        "slug": "wm-mech-6",
        "name": "Drum Pulley & Locking Nut Tightening",
        "base_price": 249,
        "duration": "25 mins",
        "tag": "Pulley Fix",
        "popular": False,
        "description": "Tightening loose aluminum rear drum pulley bolt, thread-locking compound application, and alignment check.",
        "includes": ["Rear chassis panel removal", "Pulley bolt torque tightening", "Thread-lock compound application", "Belt run alignment"],
        "tools": WM_TOOLS, "ready": WM_READY,
        "reviews": [{"name": "Ananya D.", "rating": "5.0", "text": "Tightened loose rear pulley that was making a clanking sound."}],
        "faqs": [{"q": "Why does the rear pulley become loose?", "a": "Continuous spin vibration can loosen the center locking bolt over time."}]
    }
]

# ── ALL 36 MICROWAVE & WATER PURIFIER PACKAGES ──
micro_packages = [
    # 1. Microwave Heating & Magnetron Repair (6 pkgs)
    {
        "slug": "micro-mag-1",
        "name": "Microwave Heating & Spark Diagnostics",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Expert Check",
        "popular": True,
        "description": "High voltage magnetron emission testing, mica sheet inspection, high-voltage diode & capacitor safety audit.",
        "includes": ["Magnetron filament & emission test", "High voltage diode & capacitor capacitance test", "Mica wave-guide sheet spark inspection", "Safety microswitch audit"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Radhika S.", "rating": "5.0", "text": "Replaced the burnt mica sheet in 10 minutes. Working safely."}],
        "faqs": [{"q": "Why do sparks occur inside the microwave chamber?", "a": "Food grease splatter burning on the mica wave-guide sheet causes carbon tracks that spark."}]
    },
    {
        "slug": "micro-mag-2",
        "name": "Microwave Magnetron & High-Voltage Diode Replacement",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Heat Restored",
        "popular": True,
        "description": "Replacement of faulty high-voltage magnetron tube to restore instant food heating with 60-day warranty.",
        "includes": ["High-voltage capacitor safe discharge", "OEM magnetron tube installation", "High-voltage rectifier diode replacement", "RF leakage scan", "1-min boil test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Manoj E.", "rating": "5.0", "text": "Replaced magnetron and diode, heats food in 30 seconds!"}],
        "faqs": [{"q": "Is microwave repair safe?", "a": "Yes! Our technicians use specialized high-voltage discharge safety probes and RF radiation meters."}]
    },
    {
        "slug": "micro-mag-3",
        "name": "High Voltage Capacitor & Transformer Replacement",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "High Voltage",
        "popular": False,
        "description": "Replacing high voltage 2100V step-up transformer or oil-filled high voltage capacitor with internal bleeder resistor.",
        "includes": ["HV transformer winding resistance test", "HV capacitor replacement", "Terminal crimp insulation", "Full power test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Fixed transformer humming issue. Replaced high voltage capacitor."}],
        "faqs": [{"q": "What does a loud humming noise in a microwave mean?", "a": "A shorted high-voltage diode or failing step-up transformer causes loud humming without heat."}]
    },
    {
        "slug": "micro-mag-4",
        "name": "Mica Waveguide Sheet & Cover Replacement",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Spark Guard",
        "popular": False,
        "description": "Replacing burnt, greasy, or cracked mica wave-guide insulator sheet to eliminate electrical sparking.",
        "includes": ["Burnt mica sheet removal", "Cavity waveguide port degreasing", "Custom cut high-density mica plate fit", "Spark test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Bhavna P.", "rating": "5.0", "text": "Fitted new mica sheet. No more lightning sparks inside."}],
        "faqs": [{"q": "Can I use the microwave with a burnt mica sheet?", "a": "No, continuing to run with a burnt mica sheet can crack the magnetron antenna dome."}]
    },
    {
        "slug": "micro-mag-5",
        "name": "Grill & Convection Heating Element Repair",
        "base_price": 399,
        "duration": "35 mins",
        "tag": "Grill & Bake",
        "popular": False,
        "description": "Replacing quartz / stainless steel top grill heating element or rear convection blower heating coil.",
        "includes": ["Element continuity resistance test", "Quartz grill tube replacement", "Thermal limit switch check", "200°C convection preheat test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Replaced top grill quartz tube. Baking and grilling restored."}],
        "faqs": [{"q": "Why is the microwave baking unevenly?", "a": "A burnt convection heating element or faulty rear fan prevents hot air circulation."}]
    },
    {
        "slug": "micro-mag-6",
        "name": "Microwave Deep Cavity Cleaning & Deodorizing",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Clean Cavity",
        "popular": False,
        "description": "Steam degreasing of stainless steel/ceramic enamel cavity walls, grease splatter wipe, and deodorization.",
        "includes": ["Food-grade steam degreasing", "Turntable glass & roller scrub", "Waveguide port wipe", "Lemon deodorizing cycle"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Tanvi C.", "rating": "5.0", "text": "Removed baked-on oil stains and burnt food odors completely."}],
        "faqs": [{"q": "Are food-safe cleaning agents used?", "a": "Yes! We use 100% non-toxic organic steam sanitizers safe for food contact."}]
    },

    # 2. Microwave Electrical, Touchpad & PCB (6 pkgs)
    {
        "slug": "micro-elec-1",
        "name": "Touch Membrane Keypad Replacement",
        "base_price": 449,
        "duration": "35 mins",
        "tag": "Touch Fix",
        "popular": True,
        "description": "Touch control panel membrane replacement or microswitch button fix for unresponsive start/stop keys.",
        "includes": ["Ribbon cable test", "New touch membrane keypad fit", "Microcontroller signal check", "All button response test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sujata N.", "rating": "5.0", "text": "Start button was dead. Replaced touch membrane sheet, works effortlessly."}],
        "faqs": [{"q": "Can touch buttons be repaired?", "a": "Most touch panels use a unified conductive membrane sheet which is replaced for permanent reliability."}]
    },
    {
        "slug": "micro-elec-2",
        "name": "Main Control PCB Motherboard Repair",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Board Fix",
        "popular": False,
        "description": "Electronic control board repair, relay replacement, display microcontroller soldering, and power fix.",
        "includes": ["PCB diagnostic test", "Switching relay swap", "Display IC resolder", "60-day PCB warranty"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Repaired control board after voltage surge. Display and timer working."}],
        "faqs": [{"q": "What causes the microwave display to turn off completely?", "a": "A blown ceramic thermal fuse or power supply transformer failure on the main PCB."}]
    },
    {
        "slug": "micro-elec-3",
        "name": "Door Safety Interlock Microswitch Replacement (Set of 3)",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Safety Switch",
        "popular": True,
        "description": "Replacing primary, secondary, and monitor door safety microswitches to fix door opening trips and no-run issues.",
        "includes": ["3x microswitch continuity audit", "New OEM safety switch installation", "Door latch hook alignment", "Door open trip test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Vijay K.", "rating": "5.0", "text": "Microwave tripped the MCB whenever the door was opened. Replaced interlock switch, fixed!"}],
        "faqs": [{"q": "Why does opening the microwave door trip the circuit breaker?", "a": "A shorted door monitor microswitch shorts the mains line to ground if out of sequence."}]
    },
    {
        "slug": "micro-elec-4",
        "name": "Ceramic Thermal Fuse Replacement",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Fuse Swap",
        "popular": False,
        "description": "Replacing blown 15A / 20A ceramic high-temperature safety fuse or magnetron thermal cutout switch.",
        "includes": ["Fuse continuity test", "Cavity over-temperature cutoff test", "Ceramic fast-blow fuse replacement", "Power stability test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Divya P.", "rating": "5.0", "text": "Replaced blown thermal fuse on-site in 15 mins."}],
        "faqs": [{"q": "Why did the internal fuse blow?", "a": "Voltage spikes, stuck door switches, or magnetron overheating trip the ceramic fuse."}]
    },
    {
        "slug": "micro-elec-5",
        "name": "Digital LED Display Board Repair",
        "base_price": 399,
        "duration": "35 mins",
        "tag": "Display Fix",
        "popular": False,
        "description": "Fixing missing LED segments on clock timer display, segment driver IC soldering, or display board swap.",
        "includes": ["7-segment display driver test", "Cold solder joint rework", "Clock timer accuracy test", "Dim display fix"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Gaurav T.", "rating": "5.0", "text": "Fixed missing numbers on the digital timer display."}],
        "faqs": [{"q": "Can dim digital displays be brightened?", "a": "Yes! Resoldering degraded filtering capacitors restores full display brightness."}]
    },
    {
        "slug": "micro-elec-6",
        "name": "Microwave Internal Cooling Fan Motor Fix",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Cooling Fan",
        "popular": False,
        "description": "Cooling fan blower motor repair or capacitor replacement to prevent magnetron thermal shutdown.",
        "includes": ["Blower fan motor winding check", "Bearing lubrication", "Airflow duct clearout", "Continuous run heat test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Anil S.", "rating": "5.0", "text": "Microwave was shutting off after 2 mins due to fan failure. Fixed fan motor."}],
        "faqs": [{"q": "Why does the microwave turn off automatically after 2 minutes?", "a": "If the cooling fan fails, the magnetron overheats and trips the thermal cutoff safety."}]
    },

    # 3. Microwave Mechanical, Turntable & Door (6 pkgs)
    {
        "slug": "micro-mech-1",
        "name": "Turntable Synchronous Motor Replacement",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Smooth Turn",
        "popular": True,
        "description": "Synchronous turntable rotation motor swap or glass tray coupler fix for non-rotating glass trays.",
        "includes": ["Under-chassis motor test", "Drive coupler spline inspection", "OEM replacement motor fit", "Glass tray rotation test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Karthik P.", "rating": "5.0", "text": "Glass plate rotates smoothly now. Food heats evenly."}],
        "faqs": [{"q": "Why is rotating the glass tray important?", "a": "Microwaves have hot and cold wave nodes. Rotating ensures even heat distribution."}]
    },
    {
        "slug": "micro-mech-2",
        "name": "Glass Turntable Tray & Roller Ring Replacement",
        "base_price": 249,
        "duration": "15 mins",
        "tag": "Tray Fit",
        "popular": False,
        "description": "Fitting high-temperature borosilicate glass turntable plate and 3-wheel rotation roller ring.",
        "includes": ["Borosilicate glass plate fit", "Triple wheel roller ring alignment", "Smooth glide test", "Heat shock test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Provided original heavy glass plate matching our model perfectly."}],
        "faqs": [{"q": "Can any glass plate be used?", "a": "No, only tempered thermal-shock resistant borosilicate microwave glass can withstand microwave radiation."}]
    },
    {
        "slug": "micro-mech-3",
        "name": "Door Latch Hook & Handle Repair",
        "base_price": 299,
        "duration": "25 mins",
        "tag": "Door Latch",
        "popular": False,
        "description": "Replacing snapped door latch plastic hook, door release push button spring, or door handle assembly.",
        "includes": ["Door inner panel unfastening", "High-strength latch hook replacement", "Push button spring tension fix", "Door seal lock test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Door latch was broken and door wouldn't stay closed. Replaced hook in 20 mins."}],
        "faqs": [{"q": "Why won't the microwave start if the door isn't tightly closed?", "a": "Safety interlock switches require the door latch hooks to fully engage before allowing power."}]
    },
    {
        "slug": "micro-mech-4",
        "name": "Door Hinge Alignment & RF Radiation Leak Scan",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Safety Scan",
        "popular": False,
        "description": "Door hinge alignment, door choke mesh seal inspection, and digital RF radiation leakage scan for family safety.",
        "includes": ["Door hinge leveling", "1/4 wave door choke seal inspection", "Electronic RF radiation detector scan", "Safety certification"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Tarun K.", "rating": "5.0", "text": "Aligned the sagging door and checked RF radiation leakage. Certified 100% safe."}],
        "faqs": [{"q": "How do you test for microwave radiation leakage?", "a": "We use calibrated electromagnetic survey meters along all door perimeter seals."}]
    },
    {
        "slug": "micro-mech-5",
        "name": "Rotary Encoder Knob / Dial Replacement",
        "base_price": 299,
        "duration": "25 mins",
        "tag": "Dial Fix",
        "popular": False,
        "description": "Replacing slipping or skipping digital time/weight rotary dial encoder knob on convection microwaves.",
        "includes": ["Rotary pulse encoder desolder", "New digital encoder fit", "Knob grip alignment", "Time step increment test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Ananya D.", "rating": "5.0", "text": "Timer knob was jumping randomly. Replaced the rotary dial, smooth operation."}],
        "faqs": [{"q": "Why does the timer skip backwards when turning the dial?", "a": "Worn internal pulse contacts on the rotary encoder cause erratic time jumps."}]
    },
    {
        "slug": "micro-mech-6",
        "name": "Internal Cavity Bulb / LED Replacement",
        "base_price": 199,
        "duration": "15 mins",
        "tag": "Light Fix",
        "popular": False,
        "description": "Replacing burnt high-temperature internal chamber incandescent / LED viewing bulb.",
        "includes": ["Chassis safety dismount", "T170 high-heat bulb replacement", "Terminal clip seal", "Door open lighting test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Ramesh N.", "rating": "5.0", "text": "Replaced the internal light bulb. Can view cooking clearly now."}],
        "faqs": [{"q": "Can standard home light bulbs be used?", "a": "No, microwaves require specialized high-temperature vibration-resistant T170 appliance bulbs."}]
    },

    # 4. Water Purifier / RO Service & Filter Change (6 pkgs)
    {
        "slug": "ro-srv-1",
        "name": "Water Purifier / RO Comprehensive Service",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Pure Water",
        "popular": True,
        "description": "Pre-filter candle replacement, sediment & carbon filter flush, TDS ppm test, and pump pressure calibration.",
        "includes": ["5-micron PP spun candle replace", "Sediment & carbon filter high pressure flush", "Booster pump PSI check", "TDS ppm calibration", "UV lamp audit"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Ashok G.", "rating": "5.0", "text": "Reduced TDS from 650 down to pure 80 ppm. Tastes crystal clear."}],
        "faqs": [{"q": "What is the ideal drinking water TDS?", "a": "WHO and BIS recommend drinking water TDS between 50 ppm and 150 ppm."}]
    },
    {
        "slug": "ro-srv-2",
        "name": "Pre-Filter Spun Candle & Housing Replacement",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "Sediment Guard",
        "popular": True,
        "description": "Replacing external sediment pre-filter housing bowl and high-density 5-micron PP spun candle to block mud and rust.",
        "includes": ["Old choked pre-filter removal", "Housing bowl interior wash", "5-micron PP spun filter candle fit", "Push-fit connector check"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Pooja M.", "rating": "5.0", "text": "Replaced dirty pre-filter candle. Great water flow."}],
        "faqs": [{"q": "How often should pre-filter candle be changed?", "a": "Every 3 to 4 months to protect the internal RO membrane from silt and mud."}]
    },
    {
        "slug": "ro-srv-3",
        "name": "Sediment & Activated Carbon Filter Pack Swap",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Filter Pack",
        "popular": False,
        "description": "Replacing internal inline spun sediment filter and coconut-shell granular activated carbon filter for odor and chlorine removal.",
        "includes": ["Inline sediment filter replacement", "Silver impregnated carbon block fit", "Pre-carbon high pressure flush", "Taste test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Devendra K.", "rating": "5.0", "text": "Removed chlorine chemical smell completely. Pure natural water taste."}],
        "faqs": [{"q": "Why is activated carbon necessary?", "a": "Activated carbon adsorbs chlorine, pesticides, VOC chemicals, and foul odors."}]
    },
    {
        "slug": "ro-srv-4",
        "name": "Alkaline & Mineralizer Cartridge Addition",
        "base_price": 499,
        "duration": "30 mins",
        "tag": "Alkaline Boost",
        "popular": True,
        "description": "Adding post-RO alkaline mineral cartridge to enrich purified water with calcium, magnesium, potassium and balance pH to 8.5.",
        "includes": ["Alkaline bio-ceramic cartridge fit", "pH level test (pH 7.5 - 8.5)", "Essential mineral enrichment check", "Taste calibration"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sneha R.", "rating": "5.0", "text": "Water pH balanced to 8.2 alkaline. Tastes sweet and healthy."}],
        "faqs": [{"q": "What are the benefits of alkaline mineral water?", "a": "Alkaline water neutralizes body acidity, improves hydration, and restores essential minerals removed by RO."}]
    },
    {
        "slug": "ro-srv-5",
        "name": "RO Water Storage Tank Sanitization & Descaling",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Tank Clean",
        "popular": False,
        "description": "Food-grade chemical sanitization of internal water storage tank to eliminate biofilm, algae, and bacterial growth.",
        "includes": ["Tank drain & interior scrub", "Food-grade disinfectant wash", "Float valve auto cutoff test", "Dispenser tap sanitization"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Rohan M.", "rating": "5.0", "text": "Sanitized the storage tank. Water is fresh and odor-free."}],
        "faqs": [{"q": "Why does stored RO water develop a smell?", "a": "Biofilm bacteria can colonize plastic tanks over time if not sanitized every 6 months."}]
    },
    {
        "slug": "ro-srv-6",
        "name": "UV Lamp & Quartz Glass Sleeve Replacement",
        "base_price": 449,
        "duration": "30 mins",
        "tag": "UV Chamber",
        "popular": False,
        "description": "Replacing 11W germicidal UV disinfection lamp tube and cleaning quartz glass barrier sleeve to kill 99.99% pathogens.",
        "includes": ["Quartz glass sleeve descaling", "Philips/OEM 11W UV lamp replacement", "UV ballast choke test", "Pathogen sterilization check"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Girish P.", "rating": "5.0", "text": "Replaced dead UV tube and ballast choke. 100% germ-free water."}],
        "faqs": [{"q": "How does the UV stage purify water?", "a": "Ultraviolet UV-C rays destroy the DNA of bacteria and viruses to sterilize water without chemicals."}]
    },

    # 5. RO Membrane, Pump & Electrical Repair (6 pkgs)
    {
        "slug": "ro-pmp-1",
        "name": "High-Rejection RO Membrane (75/80 GPD) Replacement",
        "base_price": 799,
        "duration": "1 hr",
        "tag": "High Rejection",
        "popular": True,
        "description": "Installation of thin-film composite (TFC) high-rejection RO membrane and new Flow Restrictor (FR) valve with 90-day warranty.",
        "includes": ["Old membrane housing flush", "75/80 GPD TFC RO membrane fit", "New Flow Restrictor (FR-450) valve", "95%+ salt rejection test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Divya M.", "rating": "5.0", "text": "Water flow was very slow and TDS was high. New membrane restored fast flow and pure taste."}],
        "faqs": [{"q": "What is the lifespan of an RO membrane?", "a": "Typically 12 to 24 months depending on incoming water hardness and pre-filter maintenance."}]
    },
    {
        "slug": "ro-pmp-2",
        "name": "RO Booster Pump Overhaul / Replacement",
        "base_price": 549,
        "duration": "45 mins",
        "tag": "Pump Power",
        "popular": True,
        "description": "Overhaul of 24V / 36V DC booster pump head, diaphragm seal replacement, or new heavy-duty 100 GPD pump installation.",
        "includes": ["Booster pump PSI pressure test", "Pump head diaphragm replacement", "Vibration damping mount", "Leak-free pressure test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Alok S.", "rating": "5.0", "text": "Pump was making rattling noise and low pressure. Repaired pump head, runs silent."}],
        "faqs": [{"q": "Why does an RO need high water pressure?", "a": "RO membranes require 60-80 PSI pressure to push water molecules through microscopic pores."}]
    },
    {
        "slug": "ro-pmp-3",
        "name": "SMPS Power Supply Adapter (24V / 36V) Replacement",
        "base_price": 399,
        "duration": "30 mins",
        "tag": "Power Supply",
        "popular": False,
        "description": "Replacing blown SMPS DC power adapter with copper-wound surge-protected 24V/36V 2.5A power supply.",
        "includes": ["Input AC voltage test", "Copper-wound 2.5A SMPS replacement", "DC output voltage test", "60-day replacement warranty"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sanjay R.", "rating": "5.0", "text": "RO was dead after power cut. Replaced 24V SMPS adapter, started immediately."}],
        "faqs": [{"q": "Why do RO SMPS adapters burn out?", "a": "High voltage surges and continuous pump load can overheat low-quality power adapters."}]
    },
    {
        "slug": "ro-pmp-4",
        "name": "Automatic High Pressure & Low Pressure Switch (HPS/LPS) Fix",
        "base_price": 299,
        "duration": "25 mins",
        "tag": "Auto Cutoff",
        "popular": False,
        "description": "Replacing faulty HPS/LPS automatic cutoff microswitches to stop continuous water overflow or pump dry running.",
        "includes": ["HPS tank full cutoff test", "LPS dry run protection test", "New microswitch calibration", "Auto on/off verification"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Manoj P.", "rating": "5.0", "text": "Pump was running continuously even when tank was full. Replaced HPS switch."}],
        "faqs": [{"q": "What is the role of the High Pressure Switch (HPS)?", "a": "The HPS automatically turns off the pump when the storage tank is completely full."}]
    },
    {
        "slug": "ro-pmp-5",
        "name": "Electronic Solenoid Valve (SV) Replacement",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "SV Valve",
        "popular": False,
        "description": "Replacing 24V DC electronic inlet solenoid valve (SV) to stop continuous reject water drain leakage when tank is full.",
        "includes": ["SV coil continuity test", "New 24V DC solenoid valve fit", "Zero reject drain bypass test", "Push-fit connector seal"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Waste water pipe was leaking continuously. Replaced SV valve, stopped immediately."}],
        "faqs": [{"q": "Why does waste water keep draining when the RO is off?", "a": "A jammed solenoid valve fails to cut off the raw water supply when the pump stops."}]
    },
    {
        "slug": "ro-pmp-6",
        "name": "TDS Controller & Modulator Valve Calibration",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "TDS Balance",
        "popular": False,
        "description": "Adjusting manual / electronic TDS modulator valve to achieve perfectly balanced drinking water mineral levels.",
        "includes": ["Digital TDS calibrated scan", "TDS modulator needle valve tuning", "Pre-filtered mineral blend test", "Sweet taste balance"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Calibrated TDS from bitter 25 ppm up to sweet 90 ppm. Perfect taste."}],
        "faqs": [{"q": "Can pure RO water taste too bitter?", "a": "Yes! When TDS drops below 30 ppm, water tastes flat or slightly bitter, resolved by TDS modulation."}]
    },

    # 6. Water Purifier Installation & Plumbing Setup (6 pkgs)
    {
        "slug": "ro-inst-1",
        "name": "Water Purifier / RO Installation",
        "base_price": 349,
        "duration": "45 mins",
        "tag": "Wall Mount",
        "popular": True,
        "description": "Laser level wall mounting, raw water inlet brass diverter valve connection, reject drain line routing & demo.",
        "includes": ["Wall bracket drilling & mounting", "Brass diverter tap connector fit", "Food-grade inlet & reject line routing", "TDS testing & demo"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Neat wall mounting and zero plumbing leak. Tested TDS before leaving."}],
        "faqs": [{"q": "Are diverter valves and Teflon tape included?", "a": "Yes! Standard brass diverter valve connector and Teflon seal tape are included."}]
    },
    {
        "slug": "ro-inst-2",
        "name": "Water Purifier Uninstallation",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Safe Dismount",
        "popular": False,
        "description": "Safe unmounting from wall, raw water tap brass plug sealing, water line detachment & drainage packaging.",
        "includes": ["Wall unmounting", "Tap diverter detachment & brass plug fit", "Internal tank draining", "Tubing packaging"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Vijay K.", "rating": "5.0", "text": "Dismounted cleanly before shifting flat."}],
        "faqs": [{"q": "Will my kitchen tap work normally after uninstallation?", "a": "Yes! We remove the diverter valve and restore your kitchen tap to standard operation."}]
    },
    {
        "slug": "ro-inst-3",
        "name": "Water Purifier Reinstallation Combo",
        "base_price": 549,
        "duration": "1.5 hrs",
        "tag": "Relocation Best",
        "popular": True,
        "description": "Safe dismount at old location + complete re-installation with plumbing setup at new location.",
        "includes": ["Dismount from origin", "New kitchen wall mounting", "Plumbing connection", "30-day installation warranty"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Divya P.", "rating": "5.0", "text": "Relocated our RO system to our new flat seamlessly."}],
        "faqs": [{"q": "Can you install RO under the kitchen sink?", "a": "Yes! We install both wall-mounted and under-the-counter (UTC) RO systems."}]
    },
    {
        "slug": "ro-inst-4",
        "name": "Kitchen Sink Brass Diverter Valve Fitting",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Tap Diverter",
        "popular": False,
        "description": "Fitting heavy chrome-plated brass 2-way diverter valve onto kitchen sink mixer / angle valve.",
        "includes": ["Brass 2-way diverter valve fit", "Teflon thread leak seal", "Quarter turn valve operation check", "Pressure test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Gaurav T.", "rating": "5.0", "text": "Replaced leaking plastic diverter with solid brass 2-way valve."}],
        "faqs": [{"q": "Why is a brass diverter valve better than plastic?", "a": "Solid brass withstands continuous high mains water pressure without cracking."}]
    },
    {
        "slug": "ro-inst-5",
        "name": "Food-Grade Tubing Pipe Extension (Per 5 Meters)",
        "base_price": 149,
        "duration": "15 mins",
        "tag": "Pipe Extension",
        "popular": False,
        "description": "Extending 1/4 inch or 3/8 inch food-grade blue/white/orange NSF certified water line tubing.",
        "includes": ["5 meters NSF certified tubing", "Quick push-fit union connectors", "Wall cable clip routing", "High pressure leak test"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Anil S.", "rating": "5.0", "text": "Extended the water inlet pipe 5 meters neatly along kitchen tiles."}],
        "faqs": [{"q": "Is food-grade tubing safe for drinking water?", "a": "Yes! 100% virgin food-grade polyethylene tubing prevents any plastic leaching."}]
    },
    {
        "slug": "ro-inst-6",
        "name": "Reject Waste Water Storage / Garden Pipe Setup",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Save Water",
        "popular": False,
        "description": "Routing RO reject waste water line into dedicated storage bucket or balcony plants for zero water wastage.",
        "includes": ["Reject water pipe routing", "Ball valve flow controller fit", "Bucket clip attachment", "Eco water conservation setup"],
        "tools": MICRO_RO_TOOLS, "ready": MICRO_RO_READY,
        "reviews": [{"name": "Sunita M.", "rating": "5.0", "text": "Routed reject water to balcony plants. Great eco-friendly setup."}],
        "faqs": [{"q": "Can RO reject water be used for plants and mopping?", "a": "Yes! RO reject water is excellent for mopping floors, washing utensils, and watering plants."}]
    }
]

# ── Seed all Washing Machine packages ──
wm_svc, _ = Service.objects.get_or_create(category=cat, slug="washing-machine", defaults={"name": "Washing Machine"})
wm_svc.name = "Washing Machine"
wm_svc.save()

seeded_wm = 0
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
    seeded_wm += 1
    print(f"  [{'CREATED' if created else 'UPDATED'}] Washing Machine -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

# ── Seed all Microwave Oven & Water Purifier packages ──
micro_svc, _ = Service.objects.get_or_create(category=cat, slug="microwave", defaults={"name": "Microwave Oven Repair"})
micro_svc.name = "Microwave Oven Repair"
micro_svc.save()

seeded_micro = 0
for p_data in micro_packages:
    slug = p_data["slug"]
    pkg, created = Package.objects.get_or_create(
        slug=slug,
        defaults={
            "service": micro_svc,
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
            "image": "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80&fit=crop"
        }
    )
    if not created:
        pkg.service = micro_svc
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
    seeded_micro += 1
    print(f"  [{'CREATED' if created else 'UPDATED'}] Microwave & RO -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

print(f"\nSuccessfully seeded ALL {seeded_wm} Washing Machine and {seeded_micro} Microwave & Water Purifier packages into Supabase!")
