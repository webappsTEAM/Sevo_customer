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

FRIDGE_TOOLS = [
    "Digital manifold pressure gauge & 2-stage deep vacuum pump",
    "Digital multimeter & clip-on ammeter for compressor amperage",
    "High sensitivity electronic refrigerant leak detector",
    "Compressor start tester & genuine OLP/PTC relay spares",
    "Anti-bacterial steam cleaning & descaling equipment"
]

FRIDGE_READY = [
    "Refrigerator emptied of perishable food items if defrosting is needed",
    "Power switch and rear of refrigerator accessible",
    "Dry floor area around the appliance"
]

fridge_packages = [
    # Subtab 1: Refrigerator Service & Repair
    {
        "slug": "ref-srv-1",
        "name": "General Refrigerator Service",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Best Seller",
        "popular": True,
        "description": "Comprehensive 21-point refrigerator inspection, coil dusting, gasket audit & voltage test.",
        "includes": ["21-point fridge audit", "Condenser coil dusting", "Voltage & relay check", "Thermostat calibration"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Pooja M.", "rating": "5.0", "text": "Very thorough 21-point check. Cleaned rear coils and adjusted the thermostat."}],
        "faqs": [{"q": "What is covered in General Refrigerator Service?", "a": "Full electrical safety check, compressor starting amperage, condenser coil vacuuming, door gasket seal test, and temperature balancing."}]
    },
    {
        "slug": "ref-srv-2",
        "name": "Refrigerator Repair",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Expert Fix",
        "popular": True,
        "description": "Diagnostic and complete fix for cooling, electrical or mechanical issues.",
        "includes": ["Detailed root cause analysis", "Component repair", "Performance test", "60-day warranty"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Devendra K.", "rating": "5.0", "text": "Repaired the defrost timer on-site. Bottom compartment cooling restored."}],
        "faqs": [{"q": "Do you repair Inverter refrigerators?", "a": "Yes! We service LG Smart Inverter, Samsung Digital Inverter, Whirlpool, Godrej, Bosch, and Haier."}]
    },
    {
        "slug": "ref-srv-3",
        "name": "Not Cooling",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Cooling Restore",
        "popular": False,
        "description": "Thermostat check, relay replace, gas pressure audit & fan motor testing.",
        "includes": ["Relay & OLP audit", "Thermostat test", "Gas pressure scan", "Evaporator fan check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Sneha R.", "rating": "5.0", "text": "Fixed non-cooling issue in 30 minutes. Replaced the starter relay."}],
        "faqs": [{"q": "Why is the fridge running but not chilling?", "a": "A faulty start relay or low refrigerant pressure prevents the compressor from cooling the coils."}]
    },
    {
        "slug": "ref-srv-4",
        "name": "Not Turning On",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Power Fix",
        "popular": False,
        "description": "Power plug wire test, thermal fuse check & main PCB power supply repair.",
        "includes": ["Power cord continuity", "Thermal fuse check", "PCB power check", "Voltage stabilizer test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Rohan M.", "rating": "5.0", "text": "Fridge was totally dead. Repaired the mainboard fuse and power supply."}],
        "faqs": [{"q": "What causes the fridge not to turn on?", "a": "Blown thermal fuses, burnt power cords, or voltage surges damaging the control PCB."}]
    },
    {
        "slug": "ref-srv-5",
        "name": "Excessive Noise",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Noise Reduction",
        "popular": False,
        "description": "Compressor mounting pad dampening, fan blade lubrication & leveling fit.",
        "includes": ["Fan blade realignment", "Vibration pad insertion", "Compressor mount check", "Level adjustment"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Girish P.", "rating": "5.0", "text": "Vibration noise is completely gone after inserting rubber dampeners."}],
        "faqs": [{"q": "Why does the fridge hum or vibrate loudly?", "a": "Worn-out compressor rubber grommets or unbalanced condenser fan blades cause severe humming."}]
    },
    {
        "slug": "ref-srv-6",
        "name": "Water Leakage",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Leak Fix",
        "popular": False,
        "description": "Unclog drain pipe tube, empty rear water collection tray & seal gasket leaks.",
        "includes": ["Drain line vacuuming", "Tray cleanout", "Gasket seal alignment", "Drain tube flush"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Alok S.", "rating": "5.0", "text": "Water was pooling at the bottom crisper. Cleared the choked drain tube."}],
        "faqs": [{"q": "Why is water leaking under the vegetable tray?", "a": "Ice or food particles choking the defrost drain hole causes water to overflow into the fridge cabin."}]
    },

    # Subtab 2: Refrigerator Installation
    {
        "slug": "ref-inst-1",
        "name": "Refrigerator Installation",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Standard",
        "popular": True,
        "description": "Unboxing, positioning, leveling feet adjustment & safe power socket setup.",
        "includes": ["Unboxing & positioning", "Leveling alignment", "Stabilizer setup check", "Safety earthing test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Leveling feet adjusted and connected through stabilizer safely."}],
        "faqs": [{"q": "How long should I wait before turning on a newly moved fridge?", "a": "Wait at least 2 to 4 hours to allow compressor oil to settle before plugging in."}]
    },
    {
        "slug": "ref-inst-2",
        "name": "Refrigerator Reinstallation",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Relocation",
        "popular": False,
        "description": "Dismounting from old location, safe transfer & setup at new kitchen spot.",
        "includes": ["Safe dismounting", "New location placement", "Cooling cycle verification", "Door swing adjustment"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Manoj E.", "rating": "5.0", "text": "Helped move the large double door fridge to our new kitchen perfectly."}],
        "faqs": [{"q": "Do you adjust door leveling during reinstallation?", "a": "Yes! We align both fridge and freezer doors to close smoothly under gravity."}]
    },
    {
        "slug": "ref-inst-3",
        "name": "Refrigerator Uninstallation",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Safe Removal",
        "popular": False,
        "description": "Disconnecting power & water line connection, draining water tray & packaging prep.",
        "includes": ["Power disconnect", "Water line detachment", "Drain tray emptying", "Tape securing shelves"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Tanvi C.", "rating": "5.0", "text": "Secured all glass shelves and disconnected the water line before moving."}],
        "faqs": [{"q": "Do you empty the water dispenser and ice maker?", "a": "Yes! All water lines and drip trays are drained to prevent transit leakage."}]
    },
    {
        "slug": "ref-inst-4",
        "name": "New Refrigerator Setup",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "New Appliance",
        "popular": False,
        "description": "Unpacking tape removal, glass shelf insertion, ice tray alignment & initial run check.",
        "includes": ["Internal tape removal", "Glass shelf alignment", "Initial run check", "Temperature setting guidance"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Set up our new convertible fridge and explained all cooling modes clearly."}],
        "faqs": [{"q": "What temperature should the fridge and freezer be set to?", "a": "We recommend setting the fridge compartment to 3°C to 4°C and the freezer to -18°C."}]
    },
    {
        "slug": "ref-inst-5",
        "name": "Leveling & Positioning",
        "base_price": 199,
        "duration": "20 mins",
        "tag": "Balance",
        "popular": False,
        "description": "Adjusting front leg screws to eliminate fridge wobbling & ensure proper door closure.",
        "includes": ["Spirit level check", "Leg screw adjustment", "Door swing test", "Anti-skid pad fit"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Kavita J.", "rating": "5.0", "text": "Eliminated the wobbly tilt on our uneven kitchen tiles."}],
        "faqs": [{"q": "Why should a fridge be tilted slightly backwards?", "a": "A slight 2° backward tilt allows doors to swing shut automatically and ensures proper drainage."}]
    },
    {
        "slug": "ref-inst-6",
        "name": "Water Line Connection",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Dispenser Fit",
        "popular": False,
        "description": "Connecting external RO / tap water line to fridge ice maker & water dispenser.",
        "includes": ["Food-grade tubing fit", "Push-fit connector check", "Dispenser flow test", "Purge water line"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Ashok G.", "rating": "5.0", "text": "Connected our water purifier line to the side-by-side ice dispenser without any leaks."}],
        "faqs": [{"q": "Is food-grade tubing used for the water dispenser?", "a": "Yes! We use high-pressure food-grade 1/4 inch NSF-certified tubing."}]
    },

    # Subtab 3: Refrigerator Cooling
    {
        "slug": "ref-cool-1",
        "name": "Cooling Problem",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Cooling Audit",
        "popular": True,
        "description": "Thermostat sensor audit, airflow duct check, compressor relay & capacitor test.",
        "includes": ["Airflow duct scan", "Thermostat audit", "Capacitor check", "Frost pattern inspection"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Vikram S.", "rating": "5.0", "text": "Diagnosed a blocked return air damper. Cold air circulating freely now."}],
        "faqs": [{"q": "Why is the top freezer working but bottom cabin warm?", "a": "A failed defrost timer or stuck motorized air damper prevents cold air from flowing downward."}]
    },
    {
        "slug": "ref-cool-2",
        "name": "Freezer Not Cooling",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Freezer Restore",
        "popular": False,
        "description": "Defrost heater check, evaporator fan motor repair & expansion valve audit.",
        "includes": ["Evaporator fan check", "Defrost heater test", "Freezer temp check", "Capillary tube audit"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Harish B.", "rating": "5.0", "text": "Freezer was not making ice. Replaced the evaporator fan motor, freezing in 1 hour!"}],
        "faqs": [{"q": "What causes the freezer not to freeze ice?", "a": "A dead evaporator fan motor cannot circulate cold air across the cooling coils."}]
    },
    {
        "slug": "ref-cool-3",
        "name": "Uneven Cooling",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Flow Balance",
        "popular": False,
        "description": "Air damper flap motor adjustment, return air vent de-clogging & multi-flow tuning.",
        "includes": ["Air damper check", "Return vent clearing", "Temperature sync", "Multi-airflow vent check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Neelam K.", "rating": "5.0", "text": "Top shelves were freezing vegetables while bottom shelves were warm. Balanced the damper."}],
        "faqs": [{"q": "How does multi-airflow work in frost-free fridges?", "a": "A motorized damper flap opens and closes to balance cold air distribution across all shelves."}]
    },
    {
        "slug": "ref-cool-4",
        "name": "Over Cooling",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Temp Regulation",
        "popular": False,
        "description": "Fixing food freezing in fresh food compartment, thermostat calibration & sensor swap.",
        "includes": ["Thermostat calibration", "NTC sensor check", "Damper motor test", "Cutoff cycle check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Radhika S.", "rating": "5.0", "text": "Milk and vegetables were turning into ice. Replaced faulty NTC temperature sensor."}],
        "faqs": [{"q": "Why are vegetables freezing in the bottom section?", "a": "A shorted temperature sensor fails to signal the compressor to shut off, causing continuous overcooling."}]
    },
    {
        "slug": "ref-cool-5",
        "name": "Temperature Problem",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Sensor Calibration",
        "popular": False,
        "description": "Digital panel temperature display error fix, sensor probe replacement & PCB sync.",
        "includes": ["Digital panel test", "Sensor probe replace", "PCB signal check", "Error code clear"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Karthik P.", "rating": "5.0", "text": "Fixed flashing temperature display on Samsung double door fridge."}],
        "faqs": [{"q": "What does a blinking temperature bar mean?", "a": "Blinking temperature bars indicate a sensor open circuit or defrost sensor communication error."}]
    },
    {
        "slug": "ref-cool-6",
        "name": "Ice Formation Problem",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Defrost Restore",
        "popular": False,
        "description": "Fixing excessive ice buildup on evaporator coils, bi-metal thermostat & timer repair.",
        "includes": ["Bi-metal fuse check", "Defrost timer test", "Drain tube heater check", "Steam ice melt"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Melted the massive ice wall behind the panel and replaced the defrost bimetal fuse."}],
        "faqs": [{"q": "How does auto-defrost work?", "a": "Every 8 hours, the timer activates an electric heater element to melt accumulated frost on the cooling fins."}]
    },

    # Subtab 4: Refrigerator Gas & Compressor
    {
        "slug": "ref-gas-1",
        "name": "Gas Refill",
        "base_price": 1299,
        "duration": "1.5 hrs",
        "tag": "100% Gas Fill",
        "popular": True,
        "description": "R134a / R600a eco refrigerant gas charging with vacuum evacuation & leak testing.",
        "includes": ["System vacuuming", "Eco refrigerant fill", "Cooling performance test", "60-day gas warranty"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Manoj P.", "rating": "5.0", "text": "Charged pure R600a gas with digital vacuum gauge. Chilling is ice cold."}],
        "faqs": [{"q": "Is gas refilled by weight or pressure?", "a": "We use precision digital electronic scales to charge exact grams of refrigerant specified by the manufacturer."}]
    },
    {
        "slug": "ref-gas-2",
        "name": "Gas Leak Detection",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Leak Audit",
        "popular": False,
        "description": "Nitrogen pressure testing & electronic gas sniffer scan to locate microscopic leaks.",
        "includes": ["Nitrogen pressure test", "Electronic sniffer scan", "Leak location report", "Joint soap bubble check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Found the microscopic pinhole on the condenser return bend. Highly skilled."}],
        "faqs": [{"q": "Why did my previous gas refill leak within a month?", "a": "If the pinhole leak is not brazed before refilling, the new gas will escape again. We always locate and seal the leak first."}]
    },
    {
        "slug": "ref-gas-3",
        "name": "Gas Leak Repair",
        "base_price": 1199,
        "duration": "1.5 hrs",
        "tag": "Copper Braze",
        "popular": False,
        "description": "Copper brazing silver solder fix, filter dryer filter replacement & pressure holding test.",
        "includes": ["Silver solder brazing", "Filter dryer replace", "Pressure hold test", "Vacuum evacuation"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Brazed the leak and replaced the copper filter. Zero leaks since."}],
        "faqs": [{"q": "Why is replacing the filter dryer necessary during leak repair?", "a": "The copper filter dryer absorbs moisture from the air when lines are opened. Replacing it prevents ice blockage in the capillary tube."}]
    },
    {
        "slug": "ref-gas-4",
        "name": "Compressor Repair",
        "base_price": 999,
        "duration": "1.5 hrs",
        "tag": "Compressor Fix",
        "popular": False,
        "description": "Compressor terminal wire repair, overload protector swap, relay & start capacitor replace.",
        "includes": ["Terminal wire resolder", "OLP protector swap", "Start capacitor check", "Running amperage test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Saved my inverter compressor by replacing the starting relay and capacitor."}],
        "faqs": [{"q": "How can I tell if my compressor is damaged?", "a": "If the compressor is extremely hot, trips the MCB, or makes humming sounds without starting, it requires electrical diagnostic."}]
    },
    {
        "slug": "ref-gas-5",
        "name": "Compressor Replacement",
        "base_price": 1499,
        "duration": "2 hrs",
        "tag": "New Unit Fit",
        "popular": False,
        "description": "Installing brand new inverter / non-inverter compressor unit with gas charge.",
        "includes": ["Old compressor dismount", "Brand new unit fit", "Full gas recharge", "90-day compressor warranty"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Vijay K.", "rating": "5.0", "text": "Installed brand new LG inverter compressor. Runs whisper quiet."}],
        "faqs": [{"q": "Do you provide warranty on new compressor installation?", "a": "Yes! All brand new compressors come with manufacturer warranty + 90-day CalServices installation warranty."}]
    },
    {
        "slug": "ref-gas-6",
        "name": "Refrigerant Pressure Check",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "PSI Audit",
        "popular": False,
        "description": "Connecting manifold pressure gauge to check suction/discharge PSI levels.",
        "includes": ["Manifold gauge check", "Suction PSI report", "Compressor current test", "Operating delta test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Divya P.", "rating": "5.0", "text": "Checked gas pressure accurately. Verified that gas levels were optimal."}],
        "faqs": [{"q": "What is normal suction pressure for R600a?", "a": "R600a operates under slight vacuum/near-zero PSI (0 to 2 PSI), while R134a operates between 5 and 10 PSI."}]
    },

    # Subtab 5: Refrigerator Cleaning & Maintenance
    {
        "slug": "ref-cln-1",
        "name": "Refrigerator Deep Cleaning",
        "base_price": 499,
        "duration": "1 hr",
        "tag": "Hygiene Pack",
        "popular": True,
        "description": "Shelves & drawer removal wash, door gasket rubber descaling, coil vacuuming & deodorizing spray.",
        "includes": ["Shelves & drawers wash", "Gasket mold removal", "Deodorizing spray", "Back coil dusting"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Gaurav T.", "rating": "5.0", "text": "Sparkling clean! Removed old stains and sanitized all food compartments."}],
        "faqs": [{"q": "Are food-safe cleaning chemicals used?", "a": "Yes! We use 100% food-grade organic sanitizers that leave zero chemical residue or smell."}]
    },
    {
        "slug": "ref-cln-2",
        "name": "Freezer Cleaning",
        "base_price": 349,
        "duration": "45 mins",
        "tag": "Ice Cleanout",
        "popular": False,
        "description": "Steam defrosting of heavy ice buildup, internal wall sanitizing & anti-bacterial wash.",
        "includes": ["Steam ice melt", "Wall anti-bacterial wipe", "Odour removal", "Ice tray descaling"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Anil S.", "rating": "5.0", "text": "Melted 4 inches of hard ice using steam safely without scraping the coil."}],
        "faqs": [{"q": "Why should I never use a knife to scrape freezer ice?", "a": "Aluminum evaporator plates have thin refrigerant channels that puncture easily with knives, causing instant gas leaks."}]
    },
    {
        "slug": "ref-cln-3",
        "name": "Condenser Coil Cleaning",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Coil Wash",
        "popular": False,
        "description": "Vacuuming and brushing rear/bottom condenser coils to improve heat dissipation.",
        "includes": ["Coil dust vacuuming", "Fin brush cleaning", "Heat dissipation test", "Fan blade wipe"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Sunita M.", "rating": "5.0", "text": "Reduced our monthly electricity bill by cleaning choked rear coils."}],
        "faqs": [{"q": "How does clean condenser coils save electricity?", "a": "Clean coils dissipate heat faster, reducing compressor runtime by up to 30%."}]
    },
    {
        "slug": "ref-cln-4",
        "name": "Drain Cleaning",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Drain Flush",
        "popular": False,
        "description": "Pressure flushing rear condensate drain hole & cleaning drip pan tray.",
        "includes": ["Drain hole pressure flush", "Drip tray wash", "Algae treatment", "Hot water purge"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Kartik M.", "rating": "5.0", "text": "Flushed out mold sludge from the drain line. No more foul smell."}],
        "faqs": [{"q": "Where does defrost water go in a frost-free fridge?", "a": "Defrost water drains through a tube into a tray mounted on top of the warm compressor, where it naturally evaporates."}]
    },
    {
        "slug": "ref-cln-5",
        "name": "Defrost System Check",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Defrost Audit",
        "popular": False,
        "description": "Testing defrost heating element resistance, bimetal thermostat & timer sequence.",
        "includes": ["Heater resistance test", "Bi-metal continuity check", "Timer cycle verification", "Thermal fuse check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Rohit G.", "rating": "5.0", "text": "Tested all defrost components with multimeter. Pinpointed the bad bimetal."}],
        "faqs": [{"q": "How long does a defrost heating element last?", "a": "Defrost heaters typically last 5 to 8 years before the internal resistance coil burns out."}]
    },
    {
        "slug": "ref-cln-6",
        "name": "Preventive Maintenance",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Annual Care",
        "popular": False,
        "description": "Full annual tune-up: gas check, coil wash, electrical terminal tight & gasket lubricate.",
        "includes": ["Full gas pressure check", "Terminal screw tightening", "Gasket lubrication", "Motor current draw audit"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Harish B.", "rating": "5.0", "text": "Comprehensive annual maintenance. Fridge running smoothly and quietly."}],
        "faqs": [{"q": "How often should refrigerator maintenance be done?", "a": "Once a year ensures optimal cooling efficiency, lowest power bills, and longest compressor life."}]
    },

    # Subtab 6: Refrigerator Parts & Electrical Repair
    {
        "slug": "ref-prt-1",
        "name": "Thermostat Replacement",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Thermostat Swap",
        "popular": True,
        "description": "Replacing mechanical / digital temperature control thermostat capillary unit.",
        "includes": ["Capillary tube replace", "Temperature calibration", "Cut-off cycle test", "60-day warranty"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Deepak C.", "rating": "5.0", "text": "Thermostat dial was broken. Replaced with original Danfoss thermostat."}],
        "faqs": [{"q": "How does a mechanical thermostat regulate temperature?", "a": "A gas-filled capillary tube contracts or expands with temperature to open/close compressor electrical contacts."}]
    },
    {
        "slug": "ref-prt-2",
        "name": "Fan Motor Repair",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Fan Swap",
        "popular": False,
        "description": "Evaporator / condenser fan motor winding check, bushing greasing or motor replacement.",
        "includes": ["Motor winding check", "Blade balance fit", "Airflow test", "Rubber bushing fit"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Aakash L.", "rating": "5.0", "text": "Replaced the noisy freezer fan motor. Cold air circulation restored."}],
        "faqs": [{"q": "Why did the freezer fan stop spinning?", "a": "Ice obstruction or burnt motor windings are the primary causes of evaporator fan failure."}]
    },
    {
        "slug": "ref-prt-3",
        "name": "Door Seal/Gasket Replacement",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Gasket Fit",
        "popular": False,
        "description": "Removing worn magnetic door gasket & fitting brand-new food grade rubber seal.",
        "includes": ["Worn gasket removal", "Magnetic strip insert", "Air tight seal check", "Corner heat reforming"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Naveen P.", "rating": "5.0", "text": "Fitted new magnetic rubber gasket. Door seals tight like brand new."}],
        "faqs": [{"q": "How long does a replacement door gasket last?", "a": "High-grade food-safe silicone gaskets last 4 to 6 years with regular cleaning."}]
    },
    {
        "slug": "ref-prt-4",
        "name": "PCB Repair",
        "base_price": 999,
        "duration": "1.5 hrs",
        "tag": "Logic Board",
        "popular": True,
        "description": "Electronic inverter mainboard micro-controller solder repair & relay swap.",
        "includes": ["PCB diagnostic test", "Micro-controller repair", "60-day PCB warranty", "Burn-in voltage test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Arun K.", "rating": "5.0", "text": "Repaired the inverter PCB after high voltage surge. Saved Rs. 4,000 on new board."}],
        "faqs": [{"q": "Can inverter refrigerator circuit boards be repaired?", "a": "Yes! We replace burnt IPM modules, filter capacitors, and relays on the motherboard."}]
    },
    {
        "slug": "ref-prt-5",
        "name": "Temperature Sensor Replacement",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "NTC Sensor",
        "popular": False,
        "description": "Replacing faulty NTC thermistor temperature sensor probe.",
        "includes": ["NTC resistance check", "Probe replacement", "Display error code clear", "Calibration check"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Shruti B.", "rating": "5.0", "text": "Replaced the defrost sensor. Error code disappeared immediately."}],
        "faqs": [{"q": "What is an NTC thermistor in a refrigerator?", "a": "Negative Temperature Coefficient (NTC) sensors change electrical resistance with temperature to inform the mainboard."}]
    },
    {
        "slug": "ref-prt-6",
        "name": "Relay & Capacitor Replacement",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Relay Swap",
        "popular": False,
        "description": "Replacing PTC starter relay, overload protector (OLP) & start capacitor.",
        "includes": ["PTC relay swap", "OLP protector replace", "Start capacitor check", "Compressor start test"],
        "tools": FRIDGE_TOOLS,
        "ready": FRIDGE_READY,
        "reviews": [{"name": "Mohit T.", "rating": "5.0", "text": "Fixed compressor clicking issue by replacing PTC starter relay."}],
        "faqs": [{"q": "Why does a bad starter relay cause clicking noises?", "a": "The relay fails to engage the start winding, causing the thermal protector to click off due to overcurrent."}]
    }
]

# Get or create Refrigerator service
fridge_svc, _ = Service.objects.get_or_create(category=cat, slug="refrigerator", defaults={"name": "Refrigerator"})
fridge_svc.name = "Refrigerator"
fridge_svc.save()

seeded_fridge_count = 0
for p_data in fridge_packages:
    slug = p_data["slug"]
    pkg, created = Package.objects.get_or_create(
        slug=slug,
        defaults={
            "service": fridge_svc,
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
            "image": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=500&q=80&fit=crop"
        }
    )
    if not created:
        pkg.service = fridge_svc
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
    seeded_fridge_count += 1
    print(f"  [{'CREATED' if created else 'UPDATED'}] Refrigerator -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

print(f"\nSuccessfully seeded ALL {seeded_fridge_count} Refrigerator packages into Supabase!")
