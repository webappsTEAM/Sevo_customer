import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package
from django.db import connection

# Ensure sequence is aligned first
with connection.cursor() as cursor:
    cursor.execute("SELECT setval('service_requests_package_id_seq', (SELECT COALESCE(MAX(id), 1) + 1 FROM service_requests_package), false);")

cat = CatalogCategory.objects.get(slug="ac_appliance")

# Standard tools and ready items for categories
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

FRIDGE_TOOLS = [
    "Digital manifold gauge & vacuum pump",
    "Digital multimeter & clip-on ammeter for compressor amperage",
    "High sensitivity electronic refrigerant leak detector",
    "Compressor start tester & genuine OLP/relay spares",
    "Anti-bacterial steam cleaning & descaling equipment"
]

FRIDGE_READY = [
    "Refrigerator emptied of perishable food items if defrosting is needed",
    "Power switch and rear of refrigerator accessible",
    "Dry floor area around the appliance"
]

TV_TOOLS = [
    "Digital laser spirit level & stud detector",
    "Heavy duty impact hammer drill with masonry & tile drill bits",
    "Digital multimeter & LED backlight tester",
    "Anti-static ESD safety wristbands & suction cup screen lifters",
    "Cable management ties and organizer spiral casings"
]

TV_READY = [
    "Desired wall mounting height and location chosen",
    "TV remote and power connection accessible",
    "Set-top box / OTT device and HDMI cables available on site"
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

MICRO_RO_TOOLS = [
    "High-voltage test probe & microwave leakage RF meter",
    "Digital TDS (Total Dissolved Solids) calibrated water meter",
    "High-voltage capacitor discharge safety probe",
    "Water pressure gauge for booster pump PSI test",
    "Food-grade sanitizing solution & replacement filter keys"
]

MICRO_RO_READY = [
    "Direct raw water inlet connection accessible",
    "Dedicated 3-pin power point within 1 meter",
    "Glass turntable & roller ring kept aside safely"
]

services_packages = [
    # ── 1. AC Service & Cleaning (id: 62) ──
    {
        "service_slug": "ac-service-cleaning",
        "service_name": "AC Service & Cleaning",
        "packages": [
            {
                "slug": "foam-power-jet-split",
                "name": "Foam & Power Jet AC Service (Split)",
                "base_price": 499,
                "duration": "45 mins",
                "tag": "Most Popular",
                "popular": True,
                "description": "High-pressure power jet indoor blower & cooling coil foam wash, outdoor condenser cleaning, and drain tray unclogging.",
                "includes": [
                    "Indoor unit complete foam cleaning with splash jacket",
                    "High pressure power jet wash for indoor cooling fins & blower wheel",
                    "Outdoor condenser coil high-pressure water jet flush",
                    "Drain tray clearing and drain pipe chemical flushing",
                    "15-minute cooling performance & temperature drop test"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Siddharth R.", "rating": "5.0", "text": "Incredible power jet wash! AC cooling returned to ice-cold within 10 minutes."},
                    {"name": "Meera N.", "rating": "5.0", "text": "Technician used a proper splash jacket—not a single drop of water spilled on the wall."}
                ],
                "faqs": [
                    {"q": "How is power jet service different from normal cleaning?", "a": "Power jet cleaning uses 100+ PSI pressure with specialized foam to wash deep-seated dirt from internal cooling fins that normal manual brushes cannot reach."},
                    {"q": "Will water damage my wall or wallpaper?", "a": "No, our technician fits a heavy-duty waterproof servicing jacket around the AC to channel 100% of the wastewater directly into a disposal bucket."}
                ]
            },
            {
                "slug": "foam-power-jet-window",
                "name": "Foam & Power Jet AC Service (Window)",
                "base_price": 449,
                "duration": "40 mins",
                "tag": "Best Seller",
                "popular": False,
                "description": "Complete window AC dismount, chemical foam wash on cooling coil and condenser, fan lubrication, and deep tray cleaning.",
                "includes": [
                    "Window AC chassis dismount & deep internal inspection",
                    "Evaporator & condenser chemical foam power jet wash",
                    "Fan motor bearing lubrication & blower scrubbing",
                    "Base tray rust removal and drain hole clearing",
                    "Re-mounting with vibration dampening check"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Vijay K.", "rating": "5.0", "text": "Very thorough window AC service. The air smells fresh and the fan noise is gone."},
                    {"name": "Divya P.", "rating": "5.0", "text": "On time, highly professional, and cleaned the entire window area after service."}
                ],
                "faqs": [
                    {"q": "Is the window AC removed from the frame during cleaning?", "a": "Yes, we slide the internal AC chassis out of the cabinet for a full 360-degree deep wash without damaging your window woodwork."}
                ]
            },
            {
                "slug": "anti-rust-deep-clean-ac",
                "name": "Anti-Rust Deep Clean AC Service",
                "base_price": 799,
                "duration": "1 hr",
                "tag": "Coil Shield",
                "popular": True,
                "description": "Deep foam power jet wash followed by anti-corrosive chemical coating spray on indoor and outdoor coils to prevent gas leaks.",
                "includes": [
                    "Full indoor and outdoor power jet foam wash",
                    "Anti-corrosive coil protectant spray application",
                    "Condenser U-bend anti-rust barrier coating",
                    "Drain line anti-algae fungal flush",
                    "60-day service satisfaction guarantee"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Gaurav T.", "rating": "5.0", "text": "Living near coastal air rusted my old AC. This anti-rust coating solved my frequent gas leak issue!"}
                ],
                "faqs": [
                    {"q": "Why is anti-rust coating necessary?", "a": "Humid and polluted air causes galvanic corrosion on copper U-bends leading to premature gas leaks. The protective coating forms a durable shield against moisture and acid exposure."}
                ]
            },
            {
                "slug": "ac-combo-2-units",
                "name": "2-in-1 Combo AC Power Jet Service",
                "base_price": 899,
                "duration": "1.5 hrs",
                "tag": "Value Pack",
                "popular": True,
                "description": "Complete power jet foam wash for 2 Split AC units at special bundled discount.",
                "includes": [
                    "Power jet foam cleaning for 2 indoor units",
                    "Outdoor condenser power jet wash for 2 units",
                    "Drain tray clearing and drain pipe chemical flush",
                    "Full electrical amperage & airflow testing on both units"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Anil S.", "rating": "5.0", "text": "Great combo package! Saved money and both bedroom ACs were serviced within 90 minutes."}
                ],
                "faqs": [
                    {"q": "Can I combine 1 Split and 1 Window AC in this pack?", "a": "Yes! The technician will gladly service 1 Split and 1 Window AC under this combo pack."}
                ]
            },
            {
                "slug": "ac-combo-3-units",
                "name": "3-in-1 Mega AC Power Jet Service",
                "base_price": 1299,
                "duration": "2 hrs",
                "tag": "Mega Saver",
                "popular": False,
                "description": "Complete deep power jet cleaning for 3 AC units with temperature differential check.",
                "includes": [
                    "Full power jet foam wash for 3 indoor units",
                    "Outdoor condenser high pressure cleaning for 3 units",
                    "Drain line de-clogging and sanitization",
                    "Cooling temperature & gas pressure audit for all 3 ACs"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Pooja H.", "rating": "5.0", "text": "Serviced all 3 ACs in our duplex apartment. Highly efficient and polite technicians."}
                ],
                "faqs": [
                    {"q": "How often should I service my ACs?", "a": "We recommend deep power jet servicing twice a year—once before peak summer and once after the monsoon season."}
                ]
            },
            {
                "slug": "ac-filter-sanitization",
                "name": "AC Airflow & Filter Deep Sanitization",
                "base_price": 299,
                "duration": "30 mins",
                "tag": "Quick Clean",
                "popular": False,
                "description": "Anti-bacterial sanitizing mist, allergen filter deep scrub, and blower disinfection for clean, odor-free air.",
                "includes": [
                    "Dual filter removal and high pressure water wash",
                    "Anti-bacterial sanitizing mist spray on cooling fins",
                    "Blower wheel surface wiping and deodorizing",
                    "Airflow CFM testing"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Sunita M.", "rating": "5.0", "text": "Removed the musty sour smell from the AC immediately. Very happy!"}
                ],
                "faqs": [
                    {"q": "Does this remove bad mold smells?", "a": "Yes! Our enzymatic sanitizing mist kills 99.9% of mold and bacteria trapped on the wet coil surface."}
                ]
            }
        ]
    },

    # ── 2. AC Repair & Diagnostics (id: 63) ──
    {
        "service_slug": "ac-repair",
        "service_name": "AC Repair & Diagnostics",
        "packages": [
            {
                "slug": "ac-less-no-cooling-check",
                "name": "AC Less / No Cooling Diagnostics",
                "base_price": 249,
                "duration": "30 mins",
                "tag": "Expert Check",
                "popular": True,
                "description": "21-point comprehensive cooling audit covering compressor health, capacitor rating, gas pressure, and air temperature drop.",
                "includes": [
                    "Multi-meter compressor winding & capacitor test",
                    "Gas operating pressure check with digital manifold gauge",
                    "Temperature differential test across indoor coil",
                    "Itemized repair quote before commencing any part replacement"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Kartik M.", "rating": "5.0", "text": "Identified the weak start capacitor in 10 minutes. Replaced it on the spot and AC started chilling."}
                ],
                "faqs": [
                    {"q": "Is the inspection fee adjusted if I approve the repair?", "a": "Yes! When you proceed with the recommended repair, the diagnostic fee is adjusted towards your total bill."}
                ]
            },
            {
                "slug": "ac-water-leakage-repair",
                "name": "AC Water Leakage & Drain Repair",
                "base_price": 349,
                "duration": "35 mins",
                "tag": "Leak Solution",
                "popular": True,
                "description": "Drain tray crack repair, slope leveling, and high-pressure water jet de-clogging of blocked drain lines to stop indoor dripping.",
                "includes": [
                    "Indoor backplate slope & spirit level alignment",
                    "Drain tray crack seal and mold removal",
                    "High pressure water jet flushing through drain hose",
                    "Drain hose connector tightening and leak-free test"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Rohit G.", "rating": "5.0", "text": "Water was dripping down my wooden bedroom wardrobe. Technician flushed out a thick algae plug, completely fixed!"}
                ],
                "faqs": [
                    {"q": "Why does my AC indoor unit leak water inside the room?", "a": "Water leaks happen when the drain pipe is choked with slime/dust or when the indoor unit tilt loses its downward drainage gradient."}
                ]
            },
            {
                "slug": "ac-noise-vibration-check",
                "name": "AC Noise & Vibration Diagnostics",
                "base_price": 299,
                "duration": "30 mins",
                "tag": "Quiet Run",
                "popular": False,
                "description": "Indoor blower balancing, fan motor bearing inspection, and outdoor compressor rubber dampener tuning to eliminate rattling sounds.",
                "includes": [
                    "Indoor cross-flow fan blower alignment & balance check",
                    "Fan motor shaft bearing check & synthetic lubrication",
                    "Outdoor unit anti-vibration rubber base pad inspection",
                    "Cabinet sheet metal screw tightening"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Harish B.", "rating": "5.0", "text": "My outdoor AC unit was rattling against the wall. Technician replaced the worn rubber bushings and it's whisper quiet now."}
                ],
                "faqs": [
                    {"q": "What causes severe AC rattling sounds?", "a": "Loose fan motor brackets, worn-out rubber isolation pads, or unbalanced dirt buildup on the blower wheel are the most common causes."}
                ]
            },
            {
                "slug": "ac-fan-motor-repair",
                "name": "AC Fan Motor Replacement / Repair",
                "base_price": 499,
                "duration": "45 mins",
                "tag": "Motor Care",
                "popular": False,
                "description": "Indoor or outdoor fan motor bearing overhaul, capacitor replacement, or new OEM motor installation with high RPM testing.",
                "includes": [
                    "Fan motor winding resistance & thermal fuse test",
                    "Start capacitor replacement and terminal connection check",
                    "Motor dismounting & high-grade replacement fitting",
                    "Full speed RPM and current draw verification"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Deepak C.", "rating": "5.0", "text": "Outdoor fan was not spinning and compressor was tripping. Fast motor replacement and genuine spare used."}
                ],
                "faqs": [
                    {"q": "Are spare fan motors covered under warranty?", "a": "Yes! All OEM replacement fan motors carry a 60-day CalServices replacement warranty."}
                ]
            },
            {
                "slug": "ac-sensor-remote-repair",
                "name": "AC On / Off & Remote Sensor Repair",
                "base_price": 299,
                "duration": "30 mins",
                "tag": "Control Fix",
                "popular": False,
                "description": "IR remote receiver board repair, temperature sensor replacement, and display PCB circuit fix for non-responsive controls.",
                "includes": [
                    "Infrared receiver eye board diagnosis & soldering",
                    "Ambient & coil temperature thermistor probe test",
                    "Manual emergency on/off switch test",
                    "Remote signal transmission verification"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Aakash L.", "rating": "5.0", "text": "AC was not responding to remote. Repaired the small display sensor board quickly."}
                ],
                "faqs": [
                    {"q": "Can you program a universal remote if my original remote is broken?", "a": "Yes, our technicians carry compatible universal remotes configured for all major AC brands."}
                ]
            },
            {
                "slug": "ac-inverter-error-codes",
                "name": "Inverter AC Error Code Diagnostics",
                "base_price": 399,
                "duration": "40 mins",
                "tag": "Inverter Specialist",
                "popular": True,
                "description": "Advanced digital error code decoding (E1, E6, F3, etc.), communication voltage testing between units, and IPM circuit check.",
                "includes": [
                    "Digital error code lookup and diagnostic testing",
                    "Serial communication signal voltage scan between indoor/outdoor",
                    "Inverter IPM power module diode check",
                    "Detailed repair recommendation & circuit board repair options"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Naveen P.", "rating": "5.0", "text": "My Daikin inverter AC was flashing an E6 error. Technician resolved the communication wire short without expensive PCB replacement."}
                ],
                "faqs": [
                    {"q": "What does an inverter error code mean?", "a": "Inverter ACs communicate microvolt digital signals between indoor and outdoor microcontrollers. Error codes pinpoint exact sensor, voltage, or compressor drive failures."}
                ]
            }
        ]
    },

    # ── 3. AC Gas & Refrigerant (id: 64) ──
    {
        "service_slug": "ac-gas-refill",
        "service_name": "AC Gas & Refrigerant",
        "packages": [
            {
                "slug": "ac-complete-gas-refill",
                "name": "Complete AC Gas Charging (R32 / R410A / R22)",
                "base_price": 2199,
                "duration": "1 hr",
                "tag": "60-Day Warranty",
                "popular": True,
                "description": "300 PSI nitrogen leak test, pinhole brazing repair, 2-stage vacuum pump moisture evacuation, and 100% pure refrigerant recharge.",
                "includes": [
                    "High pressure nitrogen leak test to locate coil punctures",
                    "Oxy-acetylene copper brazing to seal detected leak",
                    "Deep vacuum pump evacuation to remove all internal moisture",
                    "Pure R32 / R410A / R22 refrigerant filling by weight & PSI gauge",
                    "60-day official gas warranty card"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Arun K.", "rating": "5.0", "text": "Filled R32 gas with proper vacuuming. Temperature dropped to 16 degrees in 5 minutes! Superb work."},
                    {"name": "Shruti B.", "rating": "5.0", "text": "Very transparent. Showed me the digital pressure gauge before and after charging."}
                ],
                "faqs": [
                    {"q": "Why is vacuuming necessary before gas charging?", "a": "Moisture inside copper lines reacts with compressor oil to form corrosive acid. Vacuuming removes all moisture down to 500 microns to protect your compressor."},
                    {"q": "What happens if gas leaks again within 60 days?", "a": "Our 60-day gas warranty covers free leak re-inspection, brazing, and 100% complimentary gas refill."}
                ]
            },
            {
                "slug": "ac-gas-topup",
                "name": "AC Gas Top-Up & Pressure Balancing",
                "base_price": 1299,
                "duration": "45 mins",
                "tag": "Pressure Boost",
                "popular": False,
                "description": "Manifold gauge pressure check, valve pin seal check, and precision PSI gas top-up to restore optimal cooling levels.",
                "includes": [
                    "Operating suction pressure test on outdoor service valve",
                    "Valve stem cap & Schrader core leak seal check",
                    "Gas top-up up to manufacturer recommended PSI",
                    "Compressor running amperage verification"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Mohit T.", "rating": "5.0", "text": "AC was cooling slowly. After the gas top-up and pressure balancing, it chills the entire room instantly."}
                ],
                "faqs": [
                    {"q": "Can all ACs be topped up?", "a": "R22 and R410A with minor pressure drops can be topped up. For severe leaks, we recommend our complete gas recharge with full leak brazing."}
                ]
            },
            {
                "slug": "ac-nitrogen-leak-test",
                "name": "High-Pressure Nitrogen Leak Test",
                "base_price": 499,
                "duration": "30 mins",
                "tag": "Leak Detector",
                "popular": False,
                "description": "300 PSI nitrogen holding pressure test to detect and locate invisible micro pinhole leaks across evaporator & condenser coils.",
                "includes": [
                    "High pressure dry nitrogen gas injection into copper loop",
                    "300 PSI static pressure holding test",
                    "Electronic ultrasonic sniffer probe leak scan",
                    "Soap bubble confirmation on all joints and U-bends"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Suresh J.", "rating": "5.0", "text": "Previous technicians just filled gas which leaked in a week. This team did a nitrogen test, found the exact pinhole and fixed it!"}
                ],
                "faqs": [
                    {"q": "Why use nitrogen instead of air for leak testing?", "a": "Dry nitrogen contains zero moisture and is completely non-combustible, making it 100% safe for high-pressure testing."}
                ]
            },
            {
                "slug": "ac-brazing-welding",
                "name": "Copper Coil Pinhole Brazing & Welding",
                "base_price": 599,
                "duration": "45 mins",
                "tag": "Coil Seal",
                "popular": False,
                "description": "Oxy-acetylene high temperature silver/copper brazing to permanently seal punctured cooling coils and condenser return bends.",
                "includes": [
                    "Surface sanding and chemical flux cleaning of leak area",
                    "High silver-content brazing rod application with torch",
                    "Re-testing under pressure to confirm airtight seal",
                    "Anti-corrosive protective paint touch-up"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Kishore M.", "rating": "5.0", "text": "Expert copper welding. Seamless braze joint that permanently solved my condenser leak."}
                ],
                "faqs": [
                    {"q": "Is brazing as strong as the original copper pipe?", "a": "Yes! Silver brazing forms a metallurgical bond that can withstand over 500 PSI burst pressure."}
                ]
            }
        ]
    },

    # ── 4. AC Installation & Uninstallation (id: 65) ──
    {
        "service_slug": "ac-installation",
        "service_name": "AC Installation & Uninstallation",
        "packages": [
            {
                "slug": "split-ac-installation",
                "name": "Split AC Complete Installation",
                "base_price": 1299,
                "duration": "1.5 hrs",
                "tag": "Flawless Setup",
                "popular": True,
                "description": "Indoor backplate mounting, core wall hole drilling, insulated copper pipe flaring, outdoor unit positioning, and live cooling demo.",
                "includes": [
                    "Laser spirit level backplate drilling and secure mounting",
                    "3-inch core wall drilling for pipe and drain exit",
                    "Copper pipe flaring, insulated wrapping, and flare nut torque",
                    "Vacuum purging of indoor unit and lines before gas release",
                    "Live cooling run test and airflow temperature check"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Rajesh V.", "rating": "5.0", "text": "Flawless installation! Perfect level alignment and clean wall drilling without any plaster crack."},
                    {"name": "Shalini M.", "rating": "5.0", "text": "Arrived with all professional tools. Tested the cooling thoroughly before leaving."}
                ],
                "faqs": [
                    {"q": "Are copper pipes and wall brackets included in the installation charge?", "a": "Standard labor covers mounting and connecting supplied pipes. Extra copper piping and heavy-duty outdoor wall brackets are available as itemized add-ons."},
                    {"q": "Do you perform vacuuming before starting the AC?", "a": "Yes! We always vacuum purge the indoor unit and copper lines to prevent air entrapment."}
                ]
            },
            {
                "slug": "split-ac-uninstallation",
                "name": "Split AC Safe Uninstallation",
                "base_price": 699,
                "duration": "45 mins",
                "tag": "Gas Safe",
                "popular": False,
                "description": "Gas pump-down procedure to lock all refrigerant into outdoor compressor, safe electrical disconnection, and unit dismounting.",
                "includes": [
                    "Gas pump-down procedure to save 100% refrigerant inside outdoor unit",
                    "Safe electrical wiring and breaker disconnection",
                    "Copper pipe dismounting and brass cap seal",
                    "Indoor unit & outdoor unit safe dismount and packaging"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Manoj P.", "rating": "5.0", "text": "Saved all my AC gas during house shifting! Very smooth uninstallation."}
                ],
                "faqs": [
                    {"q": "Will any refrigerant gas leak during uninstallation?", "a": "No, our technician executes a full gas pump-down procedure to lock every gram of refrigerant securely inside the outdoor compressor before uncoupling."}
                ]
            },
            {
                "slug": "split-ac-reinstallation-combo",
                "name": "Split AC Dismount & Re-Installation Combo",
                "base_price": 1799,
                "duration": "2.5 hrs",
                "tag": "Relocation Best",
                "popular": True,
                "description": "Gas pump-down dismount at old location + complete re-installation with vacuum testing at new location.",
                "includes": [
                    "Complete gas-safe uninstallation at origin site",
                    "Standard re-installation at destination site",
                    "Copper flaring and vacuum purging",
                    "Live cooling run test and 30-day installation warranty"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Priyanka S.", "rating": "5.0", "text": "Booked for shifting to a new flat. Handled both dismount and re-install with absolute perfection."}
                ],
                "faqs": [
                    {"q": "Do you provide transportation between the two houses?", "a": "You can combine this service with our CalServices Goods Transport mini truck for complete doorstep relocation!"}
                ]
            },
            {
                "slug": "window-ac-installation",
                "name": "Window AC Installation",
                "base_price": 599,
                "duration": "45 mins",
                "tag": "Quick Mount",
                "popular": False,
                "description": "Wooden frame / wall slot mounting, vibration dampening seal, AC secure locking, and cooling test.",
                "includes": [
                    "Window frame alignment and bracket positioning",
                    "Unit sliding into slot with rubber foam air seal",
                    "Security screw locking to prevent accidental dislodge",
                    "Cooling and drainage runoff check"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Sanjay D.", "rating": "5.0", "text": "Fitted my window AC perfectly into the existing wall slot without any air gaps."}
                ],
                "faqs": [
                    {"q": "Do you provide foam seals to block outdoor dust?", "a": "Yes! We seal all side gaps around the window frame with dense closed-cell weatherstrip foam."}
                ]
            },
            {
                "slug": "outdoor-wall-bracket-fit",
                "name": "Heavy-Duty Outdoor AC Wall Stand Fit",
                "base_price": 499,
                "duration": "30 mins",
                "tag": "Wall Mount",
                "popular": False,
                "description": "Powder-coated anti-rust iron angle bracket wall drilling with heavy anchor bolts and rubber vibration pads.",
                "includes": [
                    "High-strength heavy gauge bracket wall drilling",
                    "Heavy-duty metallic anchor bolt fastening",
                    "Spirit level balance verification",
                    "Anti-vibration rubber isolation pads installation"
                ],
                "tools": AC_TOOLS,
                "ready": AC_READY,
                "reviews": [
                    {"name": "Tarun K.", "rating": "5.0", "text": "Extremely sturdy bracket fitting for my 2-ton outdoor AC unit."}
                ],
                "faqs": [
                    {"q": "Can this bracket support a 2-ton AC?", "a": "Yes, our heavy-duty brackets are rated to safely support outdoor units weighing up to 80 kg."}
                ]
            }
        ]
    },

    # ── 5. Refrigerator & Fridge (id: 40) ──
    {
        "service_slug": "refrigerator",
        "service_name": "Refrigerator",
        "packages": [
            {
                "slug": "fridge-cooling-issue-check",
                "name": "Refrigerator Inspection & Diagnostics",
                "base_price": 249,
                "duration": "30 mins",
                "tag": "21-Point Check",
                "popular": True,
                "description": "Comprehensive diagnostic checkup covering compressor, thermostat, defrost timer, evaporator fan, and cooling gas pressure.",
                "includes": [
                    "Compressor start relay & overload protector test",
                    "Thermostat temperature calibration & sensor test",
                    "Defrost timer, bimetal & heater coil continuity audit",
                    "Gas operating suction pressure check",
                    "Itemized repair estimate before starting work"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Ananya D.", "rating": "5.0", "text": "Fridge was running constantly but not cooling. Technician found a jammed defrost timer in 15 mins. Highly recommended!"}
                ],
                "faqs": [
                    {"q": "Why is the freezer freezing but the bottom compartment warm?", "a": "This is almost always caused by a failure in the auto-defrost system (bimetal or timer) which leads to ice blocking the internal airflow ducts."}
                ]
            },
            {
                "slug": "fridge-single-door-gas",
                "name": "Single Door Refrigerator Gas Charging (R600a / R134a)",
                "base_price": 1499,
                "duration": "1 hr",
                "tag": "Pure Gas",
                "popular": True,
                "description": "Moisture vacuum evacuation, copper filter-drier replacement, pure R600a/R134a gas charging, and 60-day warranty.",
                "includes": [
                    "Pinhole leak detection on freezer plate & condenser coil",
                    "Silver brazing to seal copper puncture",
                    "New molecular sieve filter drier replacement",
                    "Deep vacuum pump moisture extraction",
                    "Pure R600a / R134a gas refill with 60-day warranty card"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Ramesh N.", "rating": "5.0", "text": "Accidentally punctured the freezer plate with a knife. Repaired the hole and refilled gas like brand new."}
                ],
                "faqs": [
                    {"q": "Can a knife puncture in the freezer coil be repaired?", "a": "Yes! We use specialized low-temperature aluminum/copper bonding flux to seal freezer punctures permanently before recharging gas."}
                ]
            },
            {
                "slug": "fridge-gas-refill",
                "name": "Double Door / Inverter Refrigerator Gas Charging",
                "base_price": 1799,
                "duration": "1.5 hrs",
                "tag": "Inverter Care",
                "popular": True,
                "description": "Inverter compressor gas charging, precision weight-based refrigerant refill, and cooling thermostat tuning with 60-day warranty.",
                "includes": [
                    "Nitrogen leak test on condenser & evaporator coils",
                    "Copper filter drier replacement & brazing",
                    "Precision weight-based digital scale refrigerant charging",
                    "Defrost cycle & cooling coil frost pattern verification",
                    "60-day official warranty"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Vikram T.", "rating": "5.0", "text": "My Samsung side-by-side inverter fridge stopped cooling. CalServices fixed it at half the company service center quote!"}
                ],
                "faqs": [
                    {"q": "Is R600a gas safe for home refrigerators?", "a": "Yes, R600a is an eco-friendly modern refrigerant. Our technicians follow strict safety and vacuuming standards for 100% safe charging."}
                ]
            },
            {
                "slug": "fridge-defrost-repair",
                "name": "Refrigerator Cooling & Defrost System Repair",
                "base_price": 499,
                "duration": "45 mins",
                "tag": "Ice Fix",
                "popular": False,
                "description": "Defrost heater, bimetal thermal fuse, or defrost timer replacement to fix ice buildup and restore cold air circulation.",
                "includes": [
                    "Evaporator ice de-icing with steam heat",
                    "Defrost glass heater tube & bimetal sensor replacement",
                    "Air damper flap servo motor calibration",
                    "Bottom section air flow verification"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Neelam K.", "rating": "5.0", "text": "Fixed the ice accumulation problem behind the freezer wall. Cold air is reaching the bottom vegetable crisper now."}
                ],
                "faqs": [
                    {"q": "How does defrost failure affect my fridge?", "a": "When defrost fails, a thick wall of ice chokes the cold air vents, causing the bottom fridge section to become warm."}
                ]
            },
            {
                "slug": "fridge-relay-compressor-fix",
                "name": "Compressor Relay & Overload Protector (OLP) Fix",
                "base_price": 399,
                "duration": "30 mins",
                "tag": "Starter Fix",
                "popular": False,
                "description": "PTC starter relay & thermal overload protector replacement for refrigerators making clicking sounds without turning on.",
                "includes": [
                    "PTC relay resistance audit & terminal cleaning",
                    "Thermal overload protector (OLP) replacement",
                    "Compressor starting voltage & running amperage check",
                    "Continuous cooling run verification"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Alok S.", "rating": "5.0", "text": "Compressor was making clicking sounds every 2 minutes. Replaced the relay in 15 minutes, problem solved."}
                ],
                "faqs": [
                    {"q": "What causes the clicking noise near the compressor?", "a": "A burnt PTC starter relay fails to deliver torque to the compressor motor, causing the thermal protector to click off repeatedly."}
                ]
            },
            {
                "slug": "fridge-gasket-cleaning-replace",
                "name": "Refrigerator Door Gasket Antimicrobial Clean / Replace",
                "base_price": 299,
                "duration": "30 mins",
                "tag": "Door Seal",
                "popular": False,
                "description": "Magnetic door rubber seal deep sanitization, heat reforming, or new gasket fitting to prevent cold air leakage.",
                "includes": [
                    "Rubber gasket antimicrobial deep scrub & steam clean",
                    "Heat-gun magnetic strip reforming for airtight seal",
                    "Door hinge alignment & leveling",
                    "Paper-slip airtightness test"
                ],
                "tools": FRIDGE_TOOLS,
                "ready": FRIDGE_READY,
                "reviews": [
                    {"name": "Kavita J.", "rating": "5.0", "text": "Door was not closing tightly and moisture was forming inside. The gasket realignment fixed the seal completely."}
                ],
                "faqs": [
                    {"q": "How can I tell if my fridge door gasket is leaking?", "a": "Place a sheet of paper between the door and fridge and close it. If the paper pulls out easily with zero resistance, the gasket needs servicing."}
                ]
            }
        ]
    },

    # ── 6. TV & Display (id: 42) ──
    {
        "service_slug": "tv-display",
        "service_name": "TV & Display",
        "packages": [
            {
                "slug": "tv-wall-mounting",
                "name": "LED / Smart TV Wall Mounting (Up to 43\")",
                "base_price": 349,
                "duration": "30 mins",
                "tag": "Laser Level",
                "popular": True,
                "description": "Spirit level precision wall mounting, heavy-duty anchor bolt drilling, and neat set-top box / HDMI cable organization.",
                "includes": [
                    "Laser level wall positioning & height consultation",
                    "Heavy-duty masonry drill with anchor bolt fitting",
                    "TV back bracket assembly & secure wall locking",
                    "HDMI, audio, and power cable neatening",
                    "Live picture & sound tuning"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Prashant M.", "rating": "5.0", "text": "Perfect wall mounting! Used a digital spirit level and aligned the height exactly to eye level."},
                    {"name": "Sneha L.", "rating": "5.0", "text": "Very clean drilling. No dust left on the floor."}
                ],
                "faqs": [
                    {"q": "Can you mount TV on a tile or marble wall?", "a": "Yes! Our technicians carry specialized diamond and carbide glass/tile drill bits that drill cleanly through tiles without cracking."}
                ]
            },
            {
                "slug": "tv-wall-mounting-large",
                "name": "Large LED / Smart TV Wall Mounting (49\" - 65\")",
                "base_price": 499,
                "duration": "40 mins",
                "tag": "Heavy Screen",
                "popular": True,
                "description": "Heavy-duty wall mounting with heavy gauge anchor bolts for large 4K / OLED / QLED television displays.",
                "includes": [
                    "Heavy gauge metallic wall bracket installation",
                    "4-point heavy anchor bolt fastening",
                    "Dual-person safe screen lifting & locking",
                    "Cable concealment & viewing angle optimization"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Girish V.", "rating": "5.0", "text": "Mounted my 65-inch Sony OLED screen securely. Very cautious and skilled technician."}
                ],
                "faqs": [
                    {"q": "Is the bracket strong enough for a 65-inch TV?", "a": "Yes! We use high-tensile steel mounting brackets rated for up to 50 kg load capacity."}
                ]
            },
            {
                "slug": "tv-swivel-bracket-mount",
                "name": "TV Swivel / Full Motion Bracket Installation",
                "base_price": 599,
                "duration": "45 mins",
                "tag": "Full Motion",
                "popular": False,
                "description": "Double-arm full rotation, 180-degree swivel, and tilt bracket installation for corner viewing or large living rooms.",
                "includes": [
                    "Dual-arm articulating swivel bracket wall mounting",
                    "High-strength rawl plug bolt anchoring",
                    "Smooth swivel & tilt tension adjustment",
                    "Cable slack management for full range of motion"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Nitin R.", "rating": "5.0", "text": "Mounted on a corner wall with a swivel arm. Can now watch TV from both the dining table and the sofa."}
                ],
                "faqs": [
                    {"q": "Can I tilt the TV downward to reduce window glare?", "a": "Yes! Full-motion swivel mounts allow both downward tilt (+15°/-15°) and horizontal swivel."}
                ]
            },
            {
                "slug": "tv-repair-check",
                "name": "TV Fault Diagnostics (Sound / Backlight / Display)",
                "base_price": 249,
                "duration": "30 mins",
                "tag": "Expert Check",
                "popular": True,
                "description": "Complete motherboard, T-Con board, LED backlight strip, and power supply testing for blank screen or audio faults.",
                "includes": [
                    "Power supply PCB DC output voltage testing",
                    "LED backlight strip driver voltage test",
                    "T-Con board LVDS video signal diagnosis",
                    "Itemized repair report and spare parts cost estimate"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Devendra K.", "rating": "5.0", "text": "TV had sound but no picture. Diagnosed a burnt LED backlight strip on the spot."}
                ],
                "faqs": [
                    {"q": "Can you repair TV motherboard on-site?", "a": "Power supply, capacitors, and backlight repairs can be completed on-site. Complex BGA chip rework is serviced in our clean bench lab."}
                ]
            },
            {
                "slug": "tv-backlight-repair",
                "name": "TV Backlight Strip Replacement / Repair",
                "base_price": 799,
                "duration": "1 hr",
                "tag": "Bright Screen",
                "popular": False,
                "description": "Replacement of burnt LED backlight strips to restore crystal-clear picture brightness and eliminate blue/dark patches.",
                "includes": [
                    "Careful LCD panel dismounting with suction lifters",
                    "OEM constant-current LED backlight strip replacement",
                    "Reflector sheet & optical diffuser alignment",
                    "Uniform brightness and color temperature verification",
                    "60-day replacement warranty"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Sameer B.", "rating": "5.0", "text": "Picture is bright and vivid again. Restored my LG 4K TV perfectly."}
                ],
                "faqs": [
                    {"q": "Why did my TV turn blueish or dark on one side?", "a": "LED backlight beads wear out over time, causing phosphor breakdown (blue tint) or complete string burnout (dark spots)."}
                ]
            },
            {
                "slug": "tv-power-board-repair",
                "name": "TV Power Supply / Motherboard PCB Repair",
                "base_price": 699,
                "duration": "1 hr",
                "tag": "Board Repair",
                "popular": False,
                "description": "Component-level capacitor, IC, and diode soldering for TV not turning on or standby red light blinking.",
                "includes": [
                    "Blown electrolytic capacitor replacement",
                    "PWM power management IC solder repair",
                    "Short-circuit diode & MOSFET replacement",
                    "Full load burn-in stability test"
                ],
                "tools": TV_TOOLS,
                "ready": TV_READY,
                "reviews": [
                    {"name": "Amit H.", "rating": "5.0", "text": "TV was totally dead after lightning. Repaired the power board for a fraction of a new board cost."}
                ],
                "faqs": [
                    {"q": "Why is the red standby light blinking and TV not turning on?", "a": "Blinking standby LED indicates power supply protection trip due to shorted capacitors or voltage surge damage."}
                ]
            }
        ]
    },

    # ── 7. Washing Machine (id: 41) ──
    {
        "service_slug": "washing-machine",
        "service_name": "Washing Machine",
        "packages": [
            {
                "slug": "washing-machine-repair-check",
                "name": "Washing Machine Repair & Diagnostics",
                "base_price": 249,
                "duration": "30 mins",
                "tag": "21-Point Check",
                "popular": True,
                "description": "21-point check covering spin motor, drainage pump, suspension rods, water inlet valve, and control PCB error codes.",
                "includes": [
                    "Motor winding & drive belt tension inspection",
                    "Drain pump & inlet solenoid valve flow test",
                    "Suspension spring & shock absorber balance check",
                    "Error code diagnosis (dE, OE, IE, UE, etc.)"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Bhavna P.", "rating": "5.0", "text": "Front load machine was vibrating violently during spin. Replaced the shock absorbers and now it runs silently."}
                ],
                "faqs": [
                    {"q": "Why is my washing machine giving a UE (Unbalance Error)?", "a": "Worn suspension shock absorbers or unlevel feet prevent the drum from stabilizing during high-speed spin cycles."}
                ]
            },
            {
                "slug": "washing-machine-deep-clean",
                "name": "Washing Machine Drum Jet Descaling (Top / Front Load)",
                "base_price": 599,
                "duration": "45 mins",
                "tag": "Odor & Scale Fix",
                "popular": True,
                "description": "High-temperature chemical descaling cycle, lint trap scrub, detergent tray wash, drum sterilization, and odor removal.",
                "includes": [
                    "Industrial descaling powder deep tub cleaning cycle",
                    "Rubber door bellow anti-mold scrubbing",
                    "Detergent drawer & coin filter de-clogging",
                    "High pressure rinse & drum sanitization"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Meenakshi S.", "rating": "5.0", "text": "Removed black mold spots from the front rubber door gasket and clothes smell fresh again."}
                ],
                "faqs": [
                    {"q": "How often should I descale my washing machine?", "a": "With hard water in India, descaling every 3 to 6 months prevents limescale buildup on the heater element and inner drum."}
                ]
            },
            {
                "slug": "wm-drain-inlet-pump-repair",
                "name": "Washing Machine Water Inlet / Drainage Pump Fix",
                "base_price": 399,
                "duration": "35 mins",
                "tag": "Drainage Care",
                "popular": False,
                "description": "Solenoid water valve replacement, drain motor unclogging, and OE error repair to stop water accumulation.",
                "includes": [
                    "Drain impeller pump inspection and coin/thread removal",
                    "Inlet solenoid valve mesh filter cleaning / replacement",
                    "Drain hose internal blockage flush",
                    "Fill and rapid drain cycle test"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Sunil V.", "rating": "5.0", "text": "Water was not draining and machine stopped mid-cycle. Cleaned the pump impeller and resolved in 20 minutes."}
                ],
                "faqs": [
                    {"q": "Why does water take too long to fill?", "a": "Limescale blockage inside the dual water inlet solenoid valve mesh is the most frequent cause."}
                ]
            },
            {
                "slug": "wm-spinning-vibration-fix",
                "name": "Washing Machine Spinning & Vibration Repair",
                "base_price": 499,
                "duration": "45 mins",
                "tag": "Zero Wobble",
                "popular": True,
                "description": "Suspension damper rods replacement, drum belt tension adjustment, and 4-point chassis level balancing.",
                "includes": [
                    "Heavy-duty suspension damper shock replacement",
                    "Spider arm & drum bearing wobble inspection",
                    "Drive belt tension calibration",
                    "4-corner rubber leveling foot adjustment"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Prakash J.", "rating": "5.0", "text": "Machine was literally walking across the bathroom floor. Stays completely still now during 1200 RPM spin!"}
                ],
                "faqs": [
                    {"q": "What happens if I ignore high vibration?", "a": "Severe vibration can crack the drum spider arm, shatter the front door glass, or damage the outer tub."}
                ]
            },
            {
                "slug": "wm-door-gasket-bellow",
                "name": "Front Load Door Gasket Bellow Replacement",
                "base_price": 499,
                "duration": "45 mins",
                "tag": "Water Tight",
                "popular": False,
                "description": "Replacing torn or moldy rubber door seal to stop water leakage from front door during wash cycles.",
                "includes": [
                    "Old moldy door rubber gasket dismounting",
                    "Tub rim rust cleaning & silicone seal seating",
                    "New high-grade silicone door bellow installation",
                    "Tension spring clamp locking and full-cycle leak test"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Tanvi C.", "rating": "5.0", "text": "Fixed the front door water leak. The new door seal is high quality and fitted perfectly."}
                ],
                "faqs": [
                    {"q": "Why do front load door gaskets get moldy?", "a": "Moisture trapped in rubber folds combined with leftover detergent creates black mold. Keeping the door ajar after wash cycles helps prevent mold."}
                ]
            },
            {
                "slug": "wm-install-relocate",
                "name": "Washing Machine Installation / Re-location",
                "base_price": 349,
                "duration": "30 mins",
                "tag": "Quick Setup",
                "popular": False,
                "description": "Tap adapter brass connection, anti-vibration rubber feet leveling, drain hose routing, and test cycle.",
                "includes": [
                    "Water inlet tap connector installation",
                    "Drainage pipe clamp locking",
                    "Spirit level chassis balance adjustment",
                    "Transit bolts removal (for new machines)",
                    "Short cycle spin test"
                ],
                "tools": WM_TOOLS,
                "ready": WM_READY,
                "reviews": [
                    {"name": "Rohit N.", "rating": "5.0", "text": "Removed the transit bolts and leveled the feet. Great service!"}
                ],
                "faqs": [
                    {"q": "What are transit bolts on a new washing machine?", "a": "Transit bolts lock the drum during factory shipping. They MUST be removed before first use, otherwise the machine will shake violently."}
                ]
            }
        ]
    },

    # ── 8. Microwave Oven Repair (id: 66) ──
    {
        "service_slug": "microwave",
        "service_name": "Microwave Oven Repair",
        "packages": [
            {
                "slug": "microwave-repair-check",
                "name": "Microwave Heating & Spark Diagnostics",
                "base_price": 249,
                "duration": "30 mins",
                "tag": "Expert Check",
                "popular": True,
                "description": "High voltage magnetron emission testing, mica sheet inspection, high-voltage diode & capacitor safety audit.",
                "includes": [
                    "Magnetron filament & emission test",
                    "High voltage diode & capacitor capacitance test",
                    "Mica wave-guide sheet spark inspection",
                    "Door interlock safety microswitch audit",
                    "Itemized repair estimate"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Radhika S.", "rating": "5.0", "text": "Microwave had sparks coming from the side wall. Replaced the burnt mica sheet in 10 minutes. Working safely now."}
                ],
                "faqs": [
                    {"q": "Why do sparks occur inside the microwave chamber?", "a": "Food grease splatter burning on the mica wave-guide sheet causes carbon tracks that create bright electrical sparks."}
                ]
            },
            {
                "slug": "microwave-magnetron-diode",
                "name": "Microwave Magnetron & High-Voltage Diode Replacement",
                "base_price": 599,
                "duration": "45 mins",
                "tag": "Heat Restored",
                "popular": True,
                "description": "Replacement of faulty high-voltage magnetron tube to restore instant food heating with 60-day warranty.",
                "includes": [
                    "High-voltage capacitor safe grounding discharge",
                    "OEM magnetron tube installation",
                    "High-voltage rectifier diode replacement",
                    "Microwave RF leakage radiation scan",
                    "Live 1-minute water boiling test"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Manoj E.", "rating": "5.0", "text": "Microwave was running but not heating food at all. Replaced magnetron and diode, heats like new!"}
                ],
                "faqs": [
                    {"q": "Is it safe to repair a microwave?", "a": "Yes, our technicians use specialized high-voltage discharge probes and RF radiation leakage meters to ensure 100% safety."}
                ]
            },
            {
                "slug": "microwave-keypad-membrane",
                "name": "Microwave Touch Membrane Keypad Repair",
                "base_price": 449,
                "duration": "35 mins",
                "tag": "Touch Fix",
                "popular": False,
                "description": "Touch control panel membrane replacement or microswitch button fix for unresponsive start/stop keys.",
                "includes": [
                    "Touchpad flexible ribbon cable diagnosis",
                    "Touch membrane keypad replacement / microswitch solder",
                    "Display PCB controller test",
                    "Multi-function timer & power level test"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Sujata N.", "rating": "5.0", "text": "Start button was not responding. Replaced the touch membrane sheet and all buttons work effortlessly."}
                ],
                "faqs": [
                    {"q": "Can individual buttons be repaired on a touch panel?", "a": "Most touch panels use a unified conductive membrane sheet which is replaced as a whole unit for permanent reliability."}
                ]
            },
            {
                "slug": "microwave-turntable-motor",
                "name": "Microwave Turntable Motor & Roller Ring Fix",
                "base_price": 299,
                "duration": "30 mins",
                "tag": "Smooth Turn",
                "popular": False,
                "description": "Synchronous turntable rotation motor swap or glass tray coupler fix for non-rotating glass trays.",
                "includes": [
                    "Under-chassis synchronous rotation motor testing",
                    "Drive coupler spline & roller ring inspection",
                    "OEM replacement motor installation",
                    "Glass tray rotation balance test under weight"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Karthik P.", "rating": "5.0", "text": "Glass plate stopped rotating and food was heating unevenly. Replaced the small bottom motor quickly."}
                ],
                "faqs": [
                    {"q": "Why is rotating the glass tray important?", "a": "Microwave standing waves have hot and cold spots. Rotating the plate ensures even heat distribution throughout the food."}
                ]
            },
            {
                "slug": "ro-water-purifier-service",
                "name": "Water Purifier / RO Comprehensive Service",
                "base_price": 399,
                "duration": "45 mins",
                "tag": "Pure Water",
                "popular": True,
                "description": "Pre-filter candle replacement, sediment & carbon filter flush, TDS ppm test, and pump pressure calibration.",
                "includes": [
                    "Spun PP 5-micron pre-filter candle replacement",
                    "Sediment & activated carbon filter high pressure flush",
                    "Booster pump operating pressure & leak check",
                    "Pre-filter and post-filter TDS ppm calibration",
                    "UV lamp intensity & flow sensor audit"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Ashok G.", "rating": "5.0", "text": "Very thorough RO service! Reduced water TDS from 650 ppm down to pure 80 ppm. Tastes great."}
                ],
                "faqs": [
                    {"q": "What should the ideal TDS of drinking water be?", "a": "According to WHO & BIS guidelines, safe drinking water TDS should be between 50 ppm and 150 ppm."}
                ]
            },
            {
                "slug": "ro-membrane-replacement",
                "name": "RO Membrane Replacement & Tank Sanitization",
                "base_price": 799,
                "duration": "1 hr",
                "tag": "High Rejection",
                "popular": True,
                "description": "High-rejection thin-film composite RO membrane installation, flow restrictor (FR) swap, and storage tank chemical sanitization.",
                "includes": [
                    "75/80 GPD high-rejection TFC RO membrane installation",
                    "New Flow Restrictor (FR-450) valve fitting",
                    "Water storage tank interior disinfectant scrub",
                    "Post-carbon mineralizer pH filter check"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Divya M.", "rating": "5.0", "text": "Water flow was very slow and TDS was high. The new RO membrane restored fast filtration and crystal clear taste."}
                ],
                "faqs": [
                    {"q": "How long does an RO membrane last?", "a": "A high quality RO membrane typically lasts 12 to 24 months depending on incoming water hardness and regular pre-filter changes."}
                ]
            },
            {
                "slug": "ro-booster-pump-smps",
                "name": "Water Purifier Booster Pump & SMPS Adapter Fix",
                "base_price": 499,
                "duration": "40 mins",
                "tag": "Pump Power",
                "popular": False,
                "description": "Replacement of noisy/dead DC booster pump or 24V/36V SMPS power adapter to restore high water pressure.",
                "includes": [
                    "SMPS power supply DC voltage & current test",
                    "Booster pump head diaphragm & motor overhaul",
                    "High-pressure cutoff switch (HPS/LPS) calibration",
                    "Vibration-isolated pump mounting"
                ],
                "tools": MICRO_RO_TOOLS,
                "ready": MICRO_RO_READY,
                "reviews": [
                    {"name": "Sanjay R.", "rating": "5.0", "text": "RO was dead and not turning on. Replaced the 24V SMPS adapter and it started working immediately."}
                ],
                "faqs": [
                    {"q": "Why does an RO need a booster pump?", "a": "RO membranes require 60 to 80 PSI water pressure to force water molecules through microscopic pores and reject dissolved salts."}
                ]
            }
        ]
    }
]

total_seeded = 0
for s_data in services_packages:
    s_slug = s_data["service_slug"]
    s_name = s_data["service_name"]
    service, _ = Service.objects.get_or_create(category=cat, slug=s_slug, defaults={"name": s_name})
    service.name = s_name
    service.save()

    for p_data in s_data["packages"]:
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
                "image": p_data.get("image", "https://images.unsplash.com/photo-1621905252507-b35492d04029?w=500&q=80&fit=crop")
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
        total_seeded += 1
        print(f"  [{'CREATED' if created else 'UPDATED'}] {service.name} -> {pkg.name} (Rs.{pkg.base_price})")

print(f"\nSuccessfully seeded/updated {total_seeded} comprehensive packages in Supabase for AC & Appliances!")
