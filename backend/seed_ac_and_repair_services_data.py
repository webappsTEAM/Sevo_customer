# ══════════════════════════════════════════════════════════════════════════════
# AC & APPLIANCE REPAIR SERVICES DATA
# ══════════════════════════════════════════════════════════════════════════════
AC_APPLIANCE_DATA = {
    "ac-service-cleaning": {
        "name": "AC Service & Cleaning",
        "desc": "High-pressure jet cleaning, foam wash, and comprehensive indoor/outdoor coil maintenance.",
        "order": 1,
        "packages": [
            {
                "slug": "foam-power-jet-split",
                "name": "Foam & Power Jet AC Service — Split",
                "price": 599,
                "duration": "45 mins",
                "tag": "Best Seller",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Deep foam jet cleaning of indoor cooling coils & outdoor unit for maximum cooling efficiency.",
                "includes": [
                    "2x cooling foam wash",
                    "Indoor & outdoor jet spray wash",
                    "Gas & cooling delta check",
                    "Drain tray & pipe flushing",
                    "30-day post-service warranty"
                ],
                "tools": [
                    "High-pressure specialized jet pump",
                    "Eco-friendly coil cleaner foam",
                    "Antimicrobial wash spray",
                    "Digital anemometer & airflow meter",
                    "Leakage capture jacket bag"
                ],
                "ready": [
                    "Continuous water and power supply available near the AC unit",
                    "Keep the area under the indoor unit clear of delicate furniture/electronics",
                    "Ensure safe accessibility to the outdoor compressor unit"
                ],
                "reviews": [
                    {"name": "Siddharth K.", "rating": "5.0", "text": "The power jet wash brought back freezing cold air! Cleaned out years of hidden dust without a single drop on the walls."},
                    {"name": "Revathi N.", "rating": "4.9", "text": "Extremely punctual and professional tech. Showed before and after coil conditions."}
                ],
                "faqs": [
                    {"q": "Will the water spray ruin my painted walls?", "a": "No, our technician installs a 100% waterproof AC service jacket with drain hose that channels all wash water into a bucket."},
                    {"q": "Is outdoor unit cleaning included in this package?", "a": "Yes! Both indoor deep foam wash and outdoor condenser power jet cleaning are included."}
                ]
            },
            {
                "slug": "foam-power-jet-window",
                "name": "Foam & Power Jet AC Service — Window",
                "price": 499,
                "duration": "45 mins",
                "tag": "Window Care",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "High-pressure foam jet cleaning for window AC coils, front grill & blower fan.",
                "includes": [
                    "Foam jet coil wash",
                    "Front grill sanitization",
                    "Drain tray clearout",
                    "Blower wheel detailing"
                ],
                "tools": [
                    "Pressure wash spray gun",
                    "Heavy-duty coil foaming agent",
                    "Fin straightener tool",
                    "Dry microfiber wiping towels"
                ],
                "ready": [
                    "Safe access to the window frame",
                    "Power supply and bucket of water"
                ],
                "reviews": [
                    {"name": "Karthik R.", "rating": "4.8", "text": "Quick and thorough service. Removed strong musty odor completely."}
                ],
                "faqs": [
                    {"q": "Do you need to unmount the window AC?", "a": "In most cases cleaning is performed on-site without unmounting unless deep rear coil blockage requires bench service."}
                ]
            },
            {
                "slug": "anti-rust-deep-clean-ac",
                "name": "Anti-Rust Deep Clean AC Service",
                "price": 849,
                "duration": "1 hr",
                "tag": "Max Protection",
                "popular": False,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Premium deep jet cleaning with protective anti-rust coating for high-humidity coastal and urban areas.",
                "includes": [
                    "Double foam jet spray wash",
                    "Outdoor unit protective anti-rust coating",
                    "Compressor vibration pad inspection",
                    "Thermostat & electrical safety test",
                    "60-day extended cooling warranty"
                ],
                "tools": [
                    "Anti-corrosive protective coil coating spray",
                    "High-pressure jet pump",
                    "Electronic gas leak detector",
                    "Digital temperature probe"
                ],
                "ready": [
                    "Ensure indoor and outdoor AC areas are easily accessible",
                    "Provide uninterrupted water and electricity"
                ],
                "reviews": [
                    {"name": "Vikram M.", "rating": "5.0", "text": "Great protection against rust especially living close to water bodies. Noticeably quieter compressor operation."}
                ],
                "faqs": [
                    {"q": "What is the anti-rust coating?", "a": "It is a specialized polymer sealant sprayed on the outdoor condenser coils that shields against moisture, acid rain, and oxidation."}
                ]
            }
        ]
    },
    "ac-repair": {
        "name": "AC Repair & Diagnostics",
        "desc": "Troubleshooting not cooling, abnormal noise, water leakage, and compressor tripping.",
        "order": 2,
        "packages": [
            {
                "slug": "ac-less-no-cooling-check",
                "name": "AC Less / No Cooling Diagnostics",
                "price": 299,
                "duration": "45 mins",
                "tag": "Most Booked",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Comprehensive fault diagnosis for inadequate cooling, compressor tripping or airflow bottlenecks.",
                "includes": [
                    "Compressor & capacitor health check",
                    "Refrigerant pressure measurement",
                    "PCB & sensor diagnostic",
                    "Clear cost estimate before any repair"
                ],
                "tools": [
                    "HVAC digital manifold gauge",
                    "Digital clamp multimeter",
                    "Infrared laser thermometer",
                    "Capacitor tester"
                ],
                "ready": [
                    "Keep AC remote control available",
                    "Point out how long the cooling issue has persisted"
                ],
                "reviews": [
                    {"name": "Ananya P.", "rating": "4.9", "text": "Diagnosed a faulty run capacitor in 10 minutes. Replaced it on the spot and AC started blowing chilled air immediately!"}
                ],
                "faqs": [
                    {"q": "Is repair cost included in this diagnostic fee?", "a": "The diagnosis fee covers inspection and testing. Any replacement spare parts or gas top-up costs are quoted transparently for your approval before proceeding."}
                ]
            },
            {
                "slug": "ac-water-leakage-repair",
                "name": "AC Water Leakage & Drain Repair",
                "price": 399,
                "duration": "45 mins",
                "tag": "Fix Leakage",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Resolve water dripping from indoor unit, clogged drain trays, and sloping misalignments.",
                "includes": [
                    "Drain line high-pressure backflush",
                    "Condensate tray cleaning & leveling",
                    "Insulation leak repair",
                    "30-day no-drip warranty"
                ],
                "tools": [
                    "Drain snake & pressure bulb",
                    "Antibacterial drain cleaner",
                    "Spirit level meter",
                    "Waterproof insulation tape"
                ],
                "ready": [
                    "Keep towels/bucket ready under dripping indoor unit"
                ],
                "reviews": [
                    {"name": "Deepak G.", "rating": "5.0", "text": "Completely solved our indoor dripping problem that two other local technicians couldn't fix."}
                ],
                "faqs": [
                    {"q": "Why does my AC leak water indoors?", "a": "Most indoor leaks happen due to algae sludge clogging the drain line or improper drain pipe slope."}
                ]
            }
        ]
    },
    "ac-gas-refill": {
        "name": "AC Gas & Refrigerant",
        "desc": "Leak detection, vacuuming, and complete gas charging (R32, R410A, R22).",
        "order": 3,
        "packages": [
            {
                "slug": "ac-complete-gas-refill",
                "name": "Complete AC Gas Charging (R32 / R410A)",
                "price": 2299,
                "duration": "1-1.5 hrs",
                "tag": "Full Charge",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Full refrigerant charging with nitrogen pressure testing, leak sealing, and deep vacuuming.",
                "includes": [
                    "Nitrogen pressure leak detection",
                    "Brazing / flare nut leak rectification",
                    "Two-stage rotary vacuum pump evacuation",
                    "100% pure virgin refrigerant charging by weight",
                    "60-day gas warranty"
                ],
                "tools": [
                    "Refrigerant digital charging scale",
                    "High-vacuum two-stage pump",
                    "Dual-manifold HVAC gauge set",
                    "Nitrogen cylinder & regulator",
                    "Oxygen-acetylene brazing kit"
                ],
                "ready": [
                    "Clear access to outdoor unit location",
                    "Stable electrical power supply for vacuum pump"
                ],
                "reviews": [
                    {"name": "Naveen S.", "rating": "5.0", "text": "They found the micro-leak in the flare nut, fixed it with nitrogen test, and filled genuine R32 gas. Ice cold cooling now."}
                ],
                "faqs": [
                    {"q": "Why is vacuuming necessary before gas filling?", "a": "Vacuuming removes moisture and air from inside copper pipes, preventing acid formation and ensuring maximum compressor life."}
                ]
            },
            {
                "slug": "ac-gas-topup",
                "name": "AC Gas Top-Up & Pressure Balancing",
                "price": 1299,
                "duration": "45 mins",
                "tag": "Top Up",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Top-up gas charging for minor pressure drop with suction temperature tuning.",
                "includes": [
                    "Operating pressure measurement",
                    "Flare nut tightening & leak bubble test",
                    "Precision refrigerant top-up",
                    "Sub-cooling / Superheat thermal check"
                ],
                "tools": [
                    "Manifold gauge set",
                    "Electronic leak detector",
                    "Clamp temperature sensor"
                ],
                "ready": [
                    "AC unit running for at least 15 mins prior to tech arrival if possible"
                ],
                "reviews": [
                    {"name": "Gokul K.", "rating": "4.9", "text": "Quick top up and now the room cools down in under 5 minutes."}
                ],
                "faqs": [
                    {"q": "How do I know if my AC needs gas top-up?", "a": "Symptoms include lukewarm airflow, ice formation on the thin copper pipe, or the compressor running non-stop."}
                ]
            }
        ]
    },
    "ac-installation": {
        "name": "AC Installation & Uninstallation",
        "desc": "Safe dismounting, precision bracket installation, copper piping & core drilling.",
        "order": 4,
        "packages": [
            {
                "slug": "split-ac-installation",
                "name": "Split AC Complete Installation",
                "price": 1299,
                "duration": "1.5-2 hrs",
                "tag": "Professional Fit",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Standard wall mounting of indoor unit, outdoor bracket installation, pipe connecting & commissioning.",
                "includes": [
                    "Indoor backplate level mounting",
                    "Standard wall drill for piping",
                    "Outdoor unit bracket fixing",
                    "Copper flare connection & electrical wiring",
                    "Vacuuming and cooling test run"
                ],
                "tools": [
                    "Heavy-duty rotary hammer drill",
                    "Laser level alignment tool",
                    "Copper pipe flaring & swaging kit",
                    "Torque wrench set"
                ],
                "ready": [
                    "AC unit box, copper pipes, and power cable ready",
                    "Identify desired indoor and outdoor mounting locations"
                ],
                "reviews": [
                    {"name": "Arun Kumar", "rating": "5.0", "text": "Super clean installation! Used a laser level so the unit is 100% straight and neat wiring."}
                ],
                "faqs": [
                    {"q": "Are extra copper pipes or outdoor brackets included?", "a": "Standard AC units include default pipes. If extra piping, outdoor wall brackets or core drilling is needed, they are supplied at standard transparent rates."}
                ]
            },
            {
                "slug": "split-ac-uninstallation",
                "name": "Split AC Safe Uninstallation",
                "price": 699,
                "duration": "45 mins",
                "tag": "Safe Pump Down",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Gas pump-down recovery into compressor, safe unmounting of indoor & outdoor units without gas loss.",
                "includes": [
                    "100% gas pump-down into condenser",
                    "Indoor unit electrical disconnection",
                    "Outdoor unit dismounting",
                    "Copper pipe coiling and valve cap sealing"
                ],
                "tools": [
                    "Allen key valve control set",
                    "Pressure gauges",
                    "Adjustable spanner set"
                ],
                "ready": [
                    "Power supply must be ON to perform gas pump-down before turning off breaker"
                ],
                "reviews": [
                    {"name": "Pooja V.", "rating": "4.9", "text": "Safely locked all refrigerant gas before unmounting. Saved me a costly gas refill during shifting!"}
                ],
                "faqs": [
                    {"q": "Will my gas be lost during uninstallation?", "a": "No! Our certified tech performs a full 'pump-down' procedure to lock all refrigerant inside the outdoor unit."}
                ]
            }
        ]
    },
    "refrigerator": {
        "name": "Refrigerator Service & Repair",
        "desc": "Single door, double door, side-by-side inverter fridge cooling repairs & thermostat fixes.",
        "order": 5,
        "packages": [
            {
                "slug": "fridge-cooling-issue-check",
                "name": "Refrigerator Inspection & Diagnostics",
                "price": 249,
                "duration": "30-45 mins",
                "tag": "Quick Diagnostic",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Comprehensive diagnostics for non-cooling freezer, excessive frost, water pooling or strange motor noise.",
                "includes": [
                    "Compressor starting relay & overload test",
                    "Defrost timer & bimetal sensor check",
                    "Door gasket magnetic seal test",
                    "Evaporator coil frost inspection"
                ],
                "tools": [
                    "Digital clamp meter & temperature probe",
                    "Capacitor & relay tester",
                    "Refrigerant leak sniffer"
                ],
                "ready": [
                    "Keep refrigerator plugged in and accessible from the rear"
                ],
                "reviews": [
                    {"name": "Mohan Raj", "rating": "5.0", "text": "Found that the defrost heater had failed. Replaced quickly and freezer returned to sub-zero cooling."}
                ],
                "faqs": [
                    {"q": "Why is my freezer working but bottom fridge compartment warm?", "a": "This usually indicates a blocked defrost drain or failed defrost timer/sensor preventing cool air circulation."}
                ]
            },
            {
                "slug": "fridge-gas-refill",
                "name": "Refrigerator Gas Charging (R600a / R134a)",
                "price": 1699,
                "duration": "1 hr",
                "tag": "Gas Refill",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Capillary flushing, filter dryer replacement, vacuuming, and precision R600a/R134a charging.",
                "includes": [
                    "Filter drier replacement",
                    "Capillary tube nitrogen flush",
                    "System evacuation & deep vacuum",
                    "Hydrocarbon / Refrigerant recharge with 60-day warranty"
                ],
                "tools": [
                    "Micro-refrigerant charging kit",
                    "Copper pincher & brazing torch",
                    "Vacuum gauge"
                ],
                "ready": [
                    "Clear items around the refrigerator"
                ],
                "reviews": [
                    {"name": "Divya M.", "rating": "4.9", "text": "Replaced the clogged copper filter and recharged gas. Refrigerator is freezing ice in record time."}
                ],
                "faqs": [
                    {"q": "Is R600a gas safe?", "a": "Yes, our technicians are trained in safe handling of isobutane R600a refrigerant using zero-flame tools."}
                ]
            }
        ]
    },
    "washing-machine": {
        "name": "Washing Machine Service",
        "desc": "Top load, front load, and semi-automatic repairs, drum descaling & drain pump fixes.",
        "order": 6,
        "packages": [
            {
                "slug": "washing-machine-deep-clean",
                "name": "Washing Machine Drum Jet Descaling",
                "price": 599,
                "duration": "45 mins",
                "tag": "Odor & Scale Fix",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "High-temperature chemical descaling, tub clean cycle, detergent tray & lint filter deep scrub.",
                "includes": [
                    "Eco-friendly tub descaling treatment",
                    "Detergent siphon drawer detailing",
                    "Drain coin-trap filter wash",
                    "Door rubber bellow mold sanitization"
                ],
                "tools": [
                    "High-grade enzymatic tub descaler",
                    "Bellow scrub detailing brush",
                    "Lint extractor"
                ],
                "ready": [
                    "Water inlet tap must have sufficient water pressure",
                    "Machine should be empty of laundry"
                ],
                "reviews": [
                    {"name": "Radhika S.", "rating": "5.0", "text": "Removed all the black mold and unpleasant odor from the rubber door seal. Clothes smell so fresh now!"}
                ],
                "faqs": [
                    {"q": "How often should I get drum descaling done?", "a": "In areas with hard water, descaling is recommended every 3-6 months to prevent heating element burnout."}
                ]
            },
            {
                "slug": "washing-machine-repair-check",
                "name": "Washing Machine Repair & Diagnostics",
                "price": 249,
                "duration": "30-45 mins",
                "tag": "Expert Diagnostic",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Troubleshoot spinning vibration, water not draining, error codes, and drive belt issues.",
                "includes": [
                    "Drive motor & belt inspection",
                    "Inlet solenoid valve & pressure sensor test",
                    "Drain pump blockage removal",
                    "Shock absorber / suspension check"
                ],
                "tools": [
                    "Digital multimeter",
                    "Socket wrench set",
                    "Drain pump tester"
                ],
                "ready": [
                    "Keep the machine connected to water and electricity"
                ],
                "reviews": [
                    {"name": "Prashanth T.", "rating": "4.9", "text": "Cleared a coin stuck in the drain impeller in 15 minutes. Super transparent pricing."}
                ],
                "faqs": [
                    {"q": "What if my front load washing machine vibrates excessively during spin?", "a": "This is typically caused by worn suspension dampers, unleveled feet, or unbalanced drum spider arms which our tech inspects."}
                ]
            }
        ]
    },
    "tv-display": {
        "name": "TV & Display Repair",
        "desc": "LED, LCD, OLED wall mount installation, display diagnosis, sound & backlight repair.",
        "order": 7,
        "packages": [
            {
                "slug": "tv-wall-mounting",
                "name": "LED / Smart TV Wall Mounting",
                "price": 399,
                "duration": "30-45 mins",
                "tag": "Laser Level Mounting",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Precision laser alignment mounting for 32 inch to 75 inch LED/OLED televisions with concealed wire routing.",
                "includes": [
                    "Solid masonry wall anchor installation",
                    "Heavy-gauge steel bracket fitting",
                    "Laser alignment & level lock",
                    "AV/HDMI cable organization",
                    "Safe weight load testing"
                ],
                "tools": [
                    "Laser level guide",
                    "Stud finder / wall wire scanner",
                    "Hammer drill & masonry bits",
                    "Universal wall mount brackets"
                ],
                "ready": [
                    "Keep TV, remote, and power cables accessible",
                    "Confirm desired wall location with nearby power outlet"
                ],
                "reviews": [
                    {"name": "Ajay M.", "rating": "5.0", "text": "Mounted my 65-inch Sony TV perfectly centered and used heavy-duty anchor bolts. Extremely safe."}
                ],
                "faqs": [
                    {"q": "Do you provide the wall mount bracket?", "a": "You can provide your own bracket or purchase a heavy-duty fixed/swivel bracket from our technician at standard rates."}
                ]
            },
            {
                "slug": "tv-repair-check",
                "name": "TV Fault Diagnostics (Sound / Backlight)",
                "price": 299,
                "duration": "30-45 mins",
                "tag": "Display Check",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Diagnosis for sound present but no picture (backlight), HDMI port issues, or motherboard power supply faults.",
                "includes": [
                    "SMPS power supply voltage testing",
                    "LED backlight strip testing",
                    "T-Con board & ribbon cable diagnosis",
                    "Detailed component repair quote"
                ],
                "tools": [
                    "LED backlight tester",
                    "High-precision digital multimeter",
                    "Anti-static ESD toolkit"
                ],
                "ready": [
                    "Keep remote control and set-top box ready"
                ],
                "reviews": [
                    {"name": "Suresh B.", "rating": "4.8", "text": "Accurately diagnosed a single blown capacitor on the power board. Fixed without replacing the expensive motherboard."}
                ],
                "faqs": [
                    {"q": "Can cracked screens be repaired?", "a": "Cracked or shattered LCD panels require complete panel replacement which is assessed during the diagnostic visit."}
                ]
            }
        ]
    },
    "microwave": {
        "name": "Microwave Oven Repair",
        "desc": "Solo, grill, and convection microwave spark fixes, heating issues, turntable & keypad repairs.",
        "order": 8,
        "packages": [
            {
                "slug": "microwave-repair-check",
                "name": "Microwave Heating & Spark Diagnostics",
                "price": 249,
                "duration": "30 mins",
                "tag": "Quick Fix",
                "popular": True,
                "image": "/mockups/microwave_clean.png",
                "description": "Expert repair for microwave running but not heating, internal sparking, dead touch panel, or turntable not rotating.",
                "includes": [
                    "High-voltage diode & capacitor check",
                    "Magnetron emission test",
                    "Mica waveguide sheet inspection",
                    "Door safety interlock switch test"
                ],
                "tools": [
                    "High-voltage insulated safety discharge probe",
                    "RF microwave leakage radiation detector",
                    "Digital multimeter"
                ],
                "ready": [
                    "Unplug the microwave and keep a microwave-safe cup of water nearby for test heating"
                ],
                "reviews": [
                    {"name": "Lavanya T.", "rating": "5.0", "text": "Replaced the burnt mica sheet and magnetron diode in 20 minutes. Heats food like brand new."}
                ],
                "faqs": [
                    {"q": "Why is my microwave sparking inside?", "a": "Sparking is usually caused by food splatter burning on the mica waveguide cover, which is quick and inexpensive to replace."}
                ]
            }
        ]
    }
}

# ══════════════════════════════════════════════════════════════════════════════
# ELECTRICAL, PLUMBING & CARPENTRY SERVICES DATA
# ══════════════════════════════════════════════════════════════════════════════
MAINTENANCE_DATA = {
    "electrician": {
        "name": "Electrical Services",
        "desc": "Switchboards, ceiling fans, lighting, MCB distribution boards, and complete home wiring.",
        "order": 1,
        "packages": [
            {
                "slug": "switch-socket-replacement",
                "name": "Switch / Socket Installation & Repair",
                "price": 149,
                "duration": "30 mins",
                "tag": "Essential",
                "popular": True,
                "image": "/mockups/service_electrical.png",
                "description": "Replacement or new installation of modular switches, power sockets, AC switchboards, or dimmers.",
                "includes": [
                    "Old switch/socket removal",
                    "Phase, neutral & ground polarity check",
                    "Modular board secure fitting",
                    "Load test with multimeter"
                ],
                "tools": [
                    "Insulated 1000V screwdriver set",
                    "Non-contact voltage detector",
                    "Wire stripper & crimping plier",
                    "Digital multimeter"
                ],
                "ready": [
                    "Ensure main MCB switch is accessible to turn off circuit safely",
                    "Keep new modular switch/socket plate ready or purchase from tech"
                ],
                "reviews": [
                    {"name": "Dinesh P.", "rating": "5.0", "text": "Replaced 4 burnt switches and tightened loose ground wires. Very neat and safe work."}
                ],
                "faqs": [
                    {"q": "Are switches/sockets included in the price?", "a": "Labor and safety testing are included. You can supply your preferred brand or purchase high-grade modular switches from our electrician."}
                ]
            },
            {
                "slug": "ceiling-fan-installation",
                "name": "Ceiling Fan Installation / Regulator Repair",
                "price": 249,
                "duration": "30-45 mins",
                "tag": "Most Booked",
                "popular": True,
                "image": "/mockups/service_electrical.png",
                "description": "Complete assembly, ceiling hook mounting, down-rod wiring, and blade balancing for standard and BLDC fans.",
                "includes": [
                    "Ceiling bracket & safety wire anchor fitting",
                    "Down-rod cable threading & shackle nut locking",
                    "Blade angle balancing (wobble-free)",
                    "Wall regulator or BLDC remote sync"
                ],
                "tools": [
                    "Sturdy step ladder",
                    "Phase tester & crimp tool",
                    "Blade pitch balancing clip set"
                ],
                "ready": [
                    "Keep the new fan box and accessories in the room",
                    "Keep the area under the ceiling hook clear"
                ],
                "reviews": [
                    {"name": "Meera S.", "rating": "4.9", "text": "Installed our heavy BLDC ceiling fan perfectly. Zero wobble and whisper quiet."}
                ],
                "faqs": [
                    {"q": "Do you install BLDC fans with remote?", "a": "Yes! We specialize in all brands including Atomberg, Crompton, Havells BLDC and smart fans."}
                ]
            },
            {
                "slug": "mcb-fuse-tripping-fix",
                "name": "MCB Tripping & Short Circuit Fix",
                "price": 399,
                "duration": "45 mins",
                "tag": "Emergency Safety",
                "popular": False,
                "image": "/mockups/service_electrical.png",
                "description": "Isolate short circuits, neutral ground faults, overloaded circuit breakers, and faulty RCCB/ELCB.",
                "includes": [
                    "Insulation resistance (megger) test",
                    "Circuit branch short circuit isolation",
                    "Distribution board phase balancing",
                    "Earthing leakage voltage verification"
                ],
                "tools": [
                    "Digital insulation resistance tester",
                    "Thermal camera / infra thermometer",
                    "Heavy-duty bypass jumper leads"
                ],
                "ready": [
                    "Point out which room or appliance caused the tripping"
                ],
                "reviews": [
                    {"name": "Kishore R.", "rating": "5.0", "text": "Found a hidden nail through a concealed wire that caused random tripping for months. Resolved safely!"}
                ],
                "faqs": [
                    {"q": "Why does my main MCB trip when I switch on the geyser or AC?", "a": "This indicates either an overloaded sub-circuit amp rating, poor terminal contact, or a grounded heating coil."}
                ]
            },
            {
                "slug": "full-house-electrical-audit",
                "name": "Complete Home Electrical Health Audit",
                "price": 999,
                "duration": "1.5 hrs",
                "tag": "Best Value",
                "popular": False,
                "image": "/mockups/service_electrical.png",
                "description": "Comprehensive safety inspection of all switches, sockets, DB box, earthing ground pit, and appliance loads.",
                "includes": [
                    "All room switchboards & earth pin testing",
                    "DB box thermal hotspots & MCB health check",
                    "Earthing pit resistance & leakage check",
                    "Comprehensive digital safety report"
                ],
                "tools": [
                    "Earth ground resistance clamp",
                    "True-RMS digital multimeter",
                    "Infrared thermal scanner"
                ],
                "ready": [
                    "Provide access to all rooms, balconies, and the main electrical meter/DB box"
                ],
                "reviews": [
                    {"name": "Venkatesh L.", "rating": "5.0", "text": "Very thorough audit before moving into our renovated home. Discovered a missing earth connection in the kitchen!"}
                ],
                "faqs": [
                    {"q": "Do you provide a report after the audit?", "a": "Yes, our licensed electrician provides a clear health checklist detailing any overloaded breakers, ungrounded sockets, or safety hazards."}
                ]
            }
        ]
    },
    "plumbing": {
        "name": "Plumbing Services",
        "desc": "Taps, showers, flush tanks, washbasins, pipe leakages, water tanks, and drain unclogging.",
        "order": 2,
        "packages": [
            {
                "slug": "tap-mixer-repair-replacement",
                "name": "Tap / Mixer Installation & Leak Repair",
                "price": 149,
                "duration": "30 mins",
                "tag": "Most Booked",
                "popular": True,
                "image": "/mockups/service_plumbing.png",
                "description": "Fix continuous dripping, replace ceramic spindle/cartridges, install new pillar taps, bib taps or wall mixers.",
                "includes": [
                    "Angle valve shutoff and pressure release",
                    "Spindle cartridge replacement or full tap install",
                    "PTFE teflon thread sealing (leak-proof)",
                    "Water flow aerator cleaning"
                ],
                "tools": [
                    "Adjustable plumbing wrench set",
                    "Basin wrench & pipe spanner",
                    "Premium PTFE teflon tape & silicone grease"
                ],
                "ready": [
                    "Show location of bathroom/kitchen main water inlet valve",
                    "Have replacement tap/cartridge ready or purchase on-site"
                ],
                "reviews": [
                    {"name": "Swathi N.", "rating": "5.0", "text": "Fixed our leaking mixer tap in 15 minutes without scratching the chrome finish. Great plumber."}
                ],
                "faqs": [
                    {"q": "Why is my tap still dripping after turning off tightly?", "a": "The internal rubber washer or ceramic cartridge has worn out and needs replacement."}
                ]
            },
            {
                "slug": "drain-blockage-unclogging",
                "name": "Washbasin / Sink / Floor Drain Unclogging",
                "price": 349,
                "duration": "45 mins",
                "tag": "Fast Unblock",
                "popular": True,
                "image": "/mockups/service_plumbing.png",
                "description": "High-tension drain auger clearing for water backup, food residue, soap scum, and hair clogs.",
                "includes": [
                    "Bottle trap dismantling & sanitization",
                    "Flexible heavy-gauge spring snake auger routing",
                    "Organic sludge & hair clump removal",
                    "High-volume hot flush test"
                ],
                "tools": [
                    "Manual & drill-powered drain auger snake",
                    "Pipe plunger & vacuum bulb",
                    "Enzymatic drain cleaning concentrate"
                ],
                "ready": [
                    "Keep a bucket and towel nearby under the sink"
                ],
                "reviews": [
                    {"name": "Anil M.", "rating": "4.9", "text": "Cleared our completely blocked kitchen sink quickly. Flow is 100% normal now."}
                ],
                "faqs": [
                    {"q": "Do you use corrosive acids that can damage PVC pipes?", "a": "No! We use mechanical spring augers and pipe-safe enzymatic cleaners that never damage PVC or CPVC pipe joints."}
                ]
            },
            {
                "slug": "toilet-flush-tank-repair",
                "name": "Toilet Flush Tank & Commode Leak Fix",
                "price": 299,
                "duration": "45 mins",
                "tag": "Water Saver",
                "popular": False,
                "image": "/mockups/service_plumbing.png",
                "description": "Fix non-stop water running into toilet bowl, faulty inlet siphon valve, push button, or wax seal leak.",
                "includes": [
                    "Inlet ball valve & flush valve replacement",
                    "Dual-flush push button cable adjustment",
                    "Overflow tube water level calibration",
                    "Tank base seal check"
                ],
                "tools": [
                    "Specialized flush valve wrench",
                    "Replacement silicone flapper seals",
                    "Anti-lime cleaning spray"
                ],
                "ready": [
                    "Clean commode area for comfortable technician access"
                ],
                "reviews": [
                    {"name": "Prakash K.", "rating": "5.0", "text": "Saved hundreds of liters of wasted water. Replaced the flush mechanism cleanly."}
                ],
                "faqs": [
                    {"q": "Do you service concealed flush tanks (wall hung)?", "a": "Yes! We service all standard, dual-flush, and concealed wall cisterns including Jaquar, Kohler, Hindware, Parryware."}
                ]
            }
        ]
    },
    "carpentry": {
        "name": "Carpentry Services",
        "desc": "Door locks, hinges, furniture assembly, wardrobe channels, drill & wall hanging services.",
        "order": 3,
        "packages": [
            {
                "slug": "lock-latch-replacement",
                "name": "Door Lock & Handle Installation / Repair",
                "price": 249,
                "duration": "30-45 mins",
                "tag": "Home Security",
                "popular": True,
                "image": "/mockups/service_cleaning.png",
                "description": "Mortise lock, cylindrical lock, digital door lock, tower bolt, or handle installation with precision chiseling.",
                "includes": [
                    "Old lock removal & faceplate cavity chiseling",
                    "Latch bolt alignment & strike plate fixing",
                    "Smooth key rotation & deadlock test",
                    "Handle lever spring tension adjustment"
                ],
                "tools": [
                    "Wood chisels & mallet",
                    "Hole saw drill bit set",
                    "Laser alignment line guide",
                    "Graphite keyway lubricant"
                ],
                "ready": [
                    "Keep new lock set and keys ready",
                    "Ensure door can remain open during installation"
                ],
                "reviews": [
                    {"name": "Archana G.", "rating": "5.0", "text": "Installed our Godrej mortise handle lock with absolute precision. Door closes effortlessly now."}
                ],
                "faqs": [
                    {"q": "Can you install digital / smart door locks?", "a": "Yes! We specialize in smart fingerprint and keypad lock installation on wooden and metal core doors."}
                ]
            },
            {
                "slug": "furniture-bed-wardrobe-assembly",
                "name": "Furniture Assembly / Disassembly (Bed / Wardrobe)",
                "price": 499,
                "duration": "1-1.5 hrs",
                "tag": "Most Booked",
                "popular": True,
                "image": "/mockups/service_cleaning.png",
                "description": "Expert assembly for flat-pack IKEA, Pepperfry, or custom wooden beds, wardrobes, study tables, and bookshelves.",
                "includes": [
                    "Cam-lock & dowel pin structural alignment",
                    "Hydraulic bed lift mechanism fitting",
                    "Wardrobe backboard & drawer channel alignment",
                    "Sturdiness and load balance check"
                ],
                "tools": [
                    "Cordless power drill & allen hex bit set",
                    "Rubber mallet & corner clamps",
                    "Bubble level meter"
                ],
                "ready": [
                    "Keep furniture boxes and hardware manual in the assembly room",
                    "Ensure ample floor space to assemble the pieces"
                ],
                "reviews": [
                    {"name": "Nitin B.", "rating": "5.0", "text": "Assembled our 3-door wardrobe and king storage bed in less than 2 hours. Super neat work!"}
                ],
                "faqs": [
                    {"q": "Do you disassemble furniture before shifting?", "a": "Yes, we disassemble, label all hardware in bags, and reassemble safely at your new location."}
                ]
            },
            {
                "slug": "drill-hang-wall-shelf",
                "name": "Drill & Wall Hang (Shelves, Curtains, Mirrors)",
                "price": 199,
                "duration": "30 mins",
                "tag": "Up to 3 Items",
                "popular": False,
                "image": "/mockups/service_cleaning.png",
                "description": "Secure wall drilling and heavy-duty anchor mounting for curtain rods, wall shelves, paintings, and vanity mirrors.",
                "includes": [
                    "Wall stud & electrical wiring scan",
                    "Laser horizontal leveling",
                    "Heavy-duty nylon Fischer wall plug anchor fixing",
                    "Item secure mounting and weight load test"
                ],
                "tools": [
                    "Rotary hammer drill with dust collector",
                    "Self-leveling crossline laser",
                    "Assorted wall plugs & screws"
                ],
                "ready": [
                    "Keep mirrors, curtain brackets or wall shelves ready",
                    "Decide height and positions on the wall"
                ],
                "reviews": [
                    {"name": "Deepika V.", "rating": "4.9", "text": "Hung 3 heavy mirrors and curtain rods with zero wall cracks. Perfectly level."}
                ],
                "faqs": [
                    {"q": "Can you drill into hard concrete or tiled bathroom walls?", "a": "Yes! Our technicians carry specialized diamond and masonry drill bits that drill cleanly through tiles without cracking."}
                ]
            }
        ]
    }
}
