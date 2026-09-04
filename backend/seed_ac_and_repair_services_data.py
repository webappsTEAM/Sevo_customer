# ══════════════════════════════════════════════════════════════════════════════
# AC & APPLIANCE REPAIR SERVICES DATA
# ══════════════════════════════════════════════════════════════════════════════
AC_APPLIANCE_DATA = {
    "ac-service-cleaning": {
        "name": "AC Service & Cleaning",
        "desc": "High-pressure power jet cleaning, deep foam wash, and basic filter maintenance for split and window ACs.",
        "order": 1,
        "packages": [
            {
                "slug": "general-ac-service",
                "name": "General AC Service",
                "price": 349,
                "duration": "30 mins",
                "tag": "Quick Clean",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Quick maintenance service for routine AC cleaning and basic performance checking.",
                "includes": [
                    "Air filter cleaning",
                    "Indoor unit surface cleaning",
                    "Cooling fin dust removal",
                    "Basic drain line check",
                    "Basic cooling and airflow check"
                ],
                "tools": [
                    "Soft fin cleaning brush",
                    "Air blower & vacuum",
                    "Digital laser thermometer"
                ],
                "ready": [
                    "AC remote control available"
                ],
                "reviews": [
                    {"name": "Karthik R.", "rating": "4.8", "text": "Quick standard maintenance, great for routine seasonal prep."}
                ],
                "faqs": [
                    {"q": "How often should general AC service be done?", "a": "Every 2-3 months during heavy summer usage to maintain clean airflow."}
                ],
                "addons": [
                    {"name": "Power Jet Cleaning Upgrade", "price": 250, "description": "Deep foam & power-jet cleaning", "sort_order": 1},
                    {"name": "Drain Pipe Deep Cleaning", "price": 149, "description": "For enhanced drainage cleaning", "sort_order": 2}
                ]
            },
            {
                "slug": "foam-power-jet-split",
                "name": "Foam & Power Jet AC Service — Split",
                "price": 599,
                "duration": "45 mins",
                "tag": "Best Seller",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Deep foam and power-jet cleaning of the indoor cooling coil and outdoor unit to improve cooling performance.",
                "includes": [
                    "Cooling coil foam cleaning",
                    "Indoor & outdoor power-jet cleaning",
                    "Air filter cleaning",
                    "Drain tray/basic drain cleaning",
                    "Basic cooling performance check"
                ],
                "tools": [
                    "High-pressure specialized jet pump",
                    "Anti-bacterial coil foaming agent",
                    "Waterproof service catch jacket",
                    "Digital anemometer & airflow gauge"
                ],
                "ready": [
                    "Ensure continuous water and electricity near the AC unit",
                    "Keep area underneath the indoor unit clear of delicate items"
                ],
                "reviews": [
                    {"name": "Siddharth K.", "rating": "5.0", "text": "The power jet wash brought back freezing cold air! Flushed out heavy dust without spilling a single drop."},
                    {"name": "Revathi N.", "rating": "4.9", "text": "Punctual technician. Showed before and after airflow readings."}
                ],
                "faqs": [
                    {"q": "Will water splash on my wall during jet service?", "a": "No, our technician mounts a 100% waterproof AC service jacket with an outlet hose draining directly into a bucket."},
                    {"q": "Is outdoor condenser cleaning included?", "a": "Yes! Both indoor cooling coil power jet wash and outdoor unit condenser flush are included."}
                ],
                "addons": [
                    {"name": "Deep Cleaning Upgrade", "price": 199, "description": "Intensive 2x foam soak & deep antimicrobial sanitization", "sort_order": 1},
                    {"name": "Drain Pipe Deep Cleaning", "price": 149, "description": "High-pressure chemical drain line de-clog & flush", "sort_order": 2},
                    {"name": "Anti-Rust Protection", "price": 199, "description": "Protective anti-corrosion spray coat on condenser U-bends", "sort_order": 3}
                ]
            },
            {
                "slug": "anti-rust-deep-clean-ac",
                "name": "Anti-Rust Deep Clean AC Service",
                "price": 799,
                "duration": "60 mins",
                "tag": "Ultimate Care",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Deep power-jet cleaning with protective anti-rust treatment for selected outdoor-unit components and suitable metal areas. (*Anti-rust treatment is applied only to suitable and accessible metal components. It is not a guarantee against all future corrosion).",
                "includes": [
                    "Complete deep foam & power-jet cleaning",
                    "Enhanced outdoor unit cleaning",
                    "Anti-rust protective treatment*",
                    "Basic cooling performance check",
                    "30-day service warranty"
                ],
                "tools": [
                    "Anti-corrosion protective coil coating spray",
                    "High-pressure jet machine",
                    "Dual-action enzymatic foam cleaner",
                    "Fin straightener comb tool",
                    "Electronic leak sniffer"
                ],
                "ready": [
                    "Safe accessibility to outdoor and indoor units",
                    "Water tap and electrical supply"
                ],
                "reviews": [
                    {"name": "Vikram M.", "rating": "5.0", "text": "Super deep cleaning and anti-rust protection. Noticeably quieter compressor operation."}
                ],
                "faqs": [
                    {"q": "What is the anti-rust treatment?", "a": "Anti-rust treatment is applied only to suitable and accessible metal components to shield against moisture and oxidation. It is not a guarantee against all future corrosion."}
                ],
                "addons": [
                    {"name": "Drain Pipe Deep Cleaning", "price": 149, "description": "Deep cleaning for improved water flow", "sort_order": 1},
                    {"name": "Extended Anti-Rust Protection", "price": 249, "description": "Additional protective treatment for suitable accessible outdoor metal areas", "sort_order": 2},
                    {"name": "Drain Pipe Replacement", "price": 199, "description": "Replacement of damaged or leaking drain pipe with high-grade flexible pipe", "sort_order": 3}
                ]
            }
        ]
    },
    "ac-repair": {
        "name": "AC Repair & Diagnostics",
        "desc": "Expert diagnostics and repairs for not cooling, water leakage, strange noises, and power faults.",
        "order": 2,
        "packages": [
            {
                "slug": "ac-repair-diagnosis",
                "name": "AC Repair & Diagnosis",
                "price": 399,
                "duration": "45 mins",
                "tag": "Diagnostic",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Comprehensive 21-point AC inspection, electrical voltage check, compressor health scan, and root cause diagnosis.",
                "includes": [
                    "Full 21-point system diagnostic",
                    "Electrical & refrigerant check",
                    "Compressor load & capacitor test",
                    "Detailed transparent estimate before repair"
                ],
                "tools": [
                    "HVAC manifold pressure gauge",
                    "Digital clamp multimeter",
                    "Infrared laser thermometer",
                    "Capacitor tester"
                ],
                "ready": [
                    "Keep AC remote control handy",
                    "Describe observed fault symptoms to technician"
                ],
                "reviews": [
                    {"name": "Ananya P.", "rating": "5.0", "text": "Accurately diagnosed a faulty capacitor in 10 minutes. Transparent pricing and immediate fix!"}
                ],
                "faqs": [
                    {"q": "Is the inspection fee adjusted in repair costs?", "a": "Yes, if you approve major repairs during the same visit, diagnostic inspection fee is factored into your quote."}
                ]
            },
            {
                "slug": "ac-not-cooling",
                "name": "AC Not Cooling",
                "price": 499,
                "duration": "45 mins",
                "tag": "Cooling Restore",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Specialized diagnostic for AC blowing warm air or low cooling. Compressor relay, sensor, and refrigerant level check.",
                "includes": [
                    "Cooling delta temp scan",
                    "Compressor relay & capacitor audit",
                    "Refrigerant pressure test",
                    "Thermostat sensor calibration"
                ],
                "tools": [
                    "Differential thermometer",
                    "Electronic refrigerant sniffer",
                    "Multimeter"
                ],
                "ready": [
                    "Keep AC running for 10 mins before tech arrival if possible"
                ],
                "reviews": [
                    {"name": "Deepak G.", "rating": "4.9", "text": "Fixed the low cooling issue immediately. Room is chilled again."}
                ],
                "faqs": [
                    {"q": "Why is my AC running but not cooling?", "a": "Common reasons include low refrigerant gas, a weak compressor start capacitor, or clogged cooling coils."}
                ]
            },
            {
                "slug": "ac-water-leakage",
                "name": "AC Water Leakage",
                "price": 399,
                "duration": "45 mins",
                "tag": "Leak Fix",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Fix indoor unit water dripping, drain pipe unclogging, water tray leveling, and anti-clog jet flush.",
                "includes": [
                    "High-pressure drain clearout",
                    "Water tray re-leveling & flush",
                    "Drain line slope alignment",
                    "Insulation leak check & 30-day no-drip warranty"
                ],
                "tools": [
                    "Drain vacuum bulb & snake",
                    "High-pressure flush gun",
                    "Spirit level meter"
                ],
                "ready": [
                    "Keep towels or bucket under indoor unit if dripping"
                ],
                "reviews": [
                    {"name": "Pooja V.", "rating": "5.0", "text": "Completely resolved dripping water that other technicians could not solve."}
                ],
                "faqs": [
                    {"q": "Why does indoor unit leak water inside room?", "a": "Usually due to dust sludge blocking the condensate drain pipe or an unlevel indoor unit bracket."}
                ]
            },
            {
                "slug": "ac-noise-issue",
                "name": "AC Noise Issue",
                "price": 399,
                "duration": "45 mins",
                "tag": "Acoustic Fix",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Diagnosis & resolution of grinding fan sound, indoor blower squeak, or outdoor compressor vibration noise.",
                "includes": [
                    "Blower wheel balancing",
                    "Motor bearing lubrication",
                    "Vibration dampener adjustment",
                    "Loose bracket tightening"
                ],
                "tools": [
                    "Acoustic vibration tester",
                    "Bearing lubricant spray",
                    "Torque wrench"
                ],
                "ready": [
                    "Identify whether noise comes from indoor or outdoor unit"
                ],
                "reviews": [
                    {"name": "Arun K.", "rating": "4.8", "text": "Realigned the blower wheel and vibration noise vanished completely."}
                ],
                "faqs": [
                    {"q": "What causes abnormal rattling sound in AC?", "a": "Misaligned blower fan blades, worn motor bearings, or loose outdoor bracket mountings."}
                ]
            },
            {
                "slug": "ac-power-issue",
                "name": "AC Power Issue",
                "price": 449,
                "duration": "45 mins",
                "tag": "Power Fix",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Fix AC not turning on, MCB tripping repeatedly, display panel dead, or remote receiver sensor failure.",
                "includes": [
                    "Mains supply continuity test",
                    "Display board & fuse check",
                    "Power relay inspection",
                    "Earthing and short circuit safety scan"
                ],
                "tools": [
                    "Digital electrical multimeter",
                    "Continuity tester",
                    "Insulation tester"
                ],
                "ready": [
                    "Ensure main breaker / MCB is accessible"
                ],
                "reviews": [
                    {"name": "Gokul K.", "rating": "4.9", "text": "Identified a blown surge fuse and replaced it right away. AC turned back on instantly."}
                ],
                "faqs": [
                    {"q": "Why does my AC keep tripping the MCB breaker?", "a": "A tripping MCB usually indicates compressor short circuit, faulty start capacitor, or electrical overload."}
                ]
            }
        ]
    },
    "ac-gas-refill": {
        "name": "AC Gas & Refrigerant",
        "desc": "Nitrogen leak testing, copper pipe brazing, deep vacuuming, and 100% genuine refrigerant gas refill.",
        "order": 3,
        "packages": [
            {
                "slug": "ac-gas-refill",
                "name": "AC Gas Refill",
                "price": 1499,
                "duration": "1.5 hrs",
                "tag": "100% Gas Fill",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Complete vacuum evacuation, moisture removal, and 100% certified eco-friendly refrigerant gas refill (R32 / R410A / R22).",
                "includes": [
                    "Deep two-stage vacuum evacuation",
                    "Precise weight-based gas charging",
                    "Operating delta cooling test",
                    "60-day gas warranty"
                ],
                "tools": [
                    "Digital refrigerant charging scale",
                    "Two-stage rotary vacuum pump",
                    "Dual-manifold HVAC gauge set"
                ],
                "ready": [
                    "Clear access to outdoor unit location",
                    "Power supply available for vacuum pump"
                ],
                "reviews": [
                    {"name": "Naveen S.", "rating": "5.0", "text": "Genuine virgin gas filled by weight. Cooling temperature dropped to 16°C immediately."}
                ],
                "faqs": [
                    {"q": "Why is vacuuming necessary before gas filling?", "a": "Vacuuming removes moisture and air from copper pipes, preventing acid formation and prolonging compressor life."}
                ]
            },
            {
                "slug": "gas-leak-detection",
                "name": "Gas Leak Detection",
                "price": 499,
                "duration": "45 mins",
                "tag": "Nitrogen Test",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "High-pressure nitrogen pressure testing up to 350 PSI and electronic sniffer scan to identify micro pinhole leaks.",
                "includes": [
                    "350 PSI nitrogen pressure hold",
                    "Electronic gas sniffer scan",
                    "Soap bubble joint testing",
                    "Detailed leak identification report"
                ],
                "tools": [
                    "High-pressure nitrogen cylinder & regulator",
                    "Electronic halogen/refrigerant sniffer",
                    "High-pressure manifold set"
                ],
                "ready": [
                    "Accessible indoor and outdoor units"
                ],
                "reviews": [
                    {"name": "Mohan R.", "rating": "4.9", "text": "Found a microscopic pinhole leak in the flare nut that other technicians missed."}
                ],
                "faqs": [
                    {"q": "Why use nitrogen for leak testing?", "a": "Nitrogen is dry and inert, allowing high pressure up to 350 PSI without damaging internal compressor components."}
                ]
            },
            {
                "slug": "refrigerant-leakage-repair",
                "name": "Refrigerant Leakage Repair",
                "price": 899,
                "duration": "1.5 hrs",
                "tag": "Brazing Fix",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "High-temperature silver braze welding of damaged copper coils, u-bend pinholes, flare nut repair & sealing.",
                "includes": [
                    "Silver solder braze welding",
                    "Flare joint re-flaring & tight seal",
                    "Post-repair pressure hold test",
                    "Anti-corrosive coating over repaired joints"
                ],
                "tools": [
                    "Oxygen-acetylene / MAPP gas brazing torch",
                    "Silver alloy brazing rods & flux",
                    "Heavy-duty pipe flaring tool"
                ],
                "ready": [
                    "Well-ventilated area near outdoor unit for brazing"
                ],
                "reviews": [
                    {"name": "Revathi S.", "rating": "5.0", "text": "Welded the copper u-bend leak cleanly and pressure held 100%."}
                ],
                "faqs": [
                    {"q": "Is brazing permanent?", "a": "Yes! Silver brazing fuses the copper together creating a permanent hermetic seal that withstands high operating pressures."}
                ]
            }
        ]
    },
    "ac-installation": {
        "name": "AC Installation & Uninstallation",
        "desc": "Professional wall mounting, bracket setup, zero-gas-loss uninstallation, and complete relocation.",
        "order": 4,
        "packages": [
            {
                "slug": "split-ac-installation",
                "name": "Split AC Installation",
                "price": 1299,
                "duration": "2 hrs",
                "tag": "Popular",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Professional wall backplate mounting, core hole drilling, outdoor bracket setup, copper pipe flaring & connection.",
                "includes": [
                    "Indoor & outdoor unit mounting",
                    "Wall hole core drilling",
                    "Copper pipe flaring & electrical wiring",
                    "Vacuuming & leak testing",
                    "Cooling temperature demo"
                ],
                "tools": [
                    "Heavy-duty rotary hammer drill",
                    "Laser level alignment tool",
                    "Flaring & swaging tool kit",
                    "Torque wrench"
                ],
                "ready": [
                    "AC unit box, copper pipes, and power cables available",
                    "Identify desired indoor and outdoor unit positions"
                ],
                "reviews": [
                    {"name": "Arun Kumar", "rating": "5.0", "text": "Super clean installation! Perfectly leveled with laser and neat concealed piping."}
                ],
                "faqs": [
                    {"q": "Are extra copper pipes or outdoor wall stands included?", "a": "Standard boxes include default pipe lengths. Extra copper pipe, outdoor wall stands, or electrical wiring are supplied at standard transparent catalog rates."}
                ]
            },
            {
                "slug": "window-ac-installation",
                "name": "Window AC Installation",
                "price": 799,
                "duration": "1.5 hrs",
                "tag": "Window Fit",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Window sill / wooden frame alignment, heavy bracket mounting, rubber vibration pad placement & foam insulation sealing.",
                "includes": [
                    "Window frame alignment",
                    "Bracket mounting & weight support",
                    "Rubber vibration dampener fit",
                    "Foam gap sealing & demo"
                ],
                "tools": [
                    "Spirit level",
                    "Heavy anchor screws & drill",
                    "Insulation foam strip"
                ],
                "ready": [
                    "Window sill clear of window grills / obstacles"
                ],
                "reviews": [
                    {"name": "Deepak R.", "rating": "4.8", "text": "Fitted the window unit firmly with zero vibration noise."}
                ],
                "faqs": [
                    {"q": "Do you seal gaps around the window AC?", "a": "Yes, heavy-duty insulating foam strips are placed around the chassis to prevent warm air and dust ingress."}
                ]
            },
            {
                "slug": "split-ac-uninstallation",
                "name": "Split AC Uninstallation",
                "price": 699,
                "duration": "1 hr",
                "tag": "Safe Dismount",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Safe refrigerant pump-down into compressor (zero gas loss), dismounting indoor/outdoor units, and copper pipe capping.",
                "includes": [
                    "Zero gas loss pump-down",
                    "Indoor & outdoor safe dismount",
                    "Copper pipe protective taping & brass cap sealing",
                    "Mounting bracket removal"
                ],
                "tools": [
                    "Allen key service valve key",
                    "Pressure manifold gauge",
                    "Adjustable spanner set"
                ],
                "ready": [
                    "Power supply must be ON to pump down gas before breaker disconnection"
                ],
                "reviews": [
                    {"name": "Pooja V.", "rating": "4.9", "text": "Safely locked all refrigerant gas before unmounting. Saved me a costly gas refill during shifting!"}
                ],
                "faqs": [
                    {"q": "Will my gas be lost during uninstallation?", "a": "No! Our certified technician performs a 100% pump-down procedure to lock all refrigerant safely inside the outdoor compressor."}
                ]
            },
            {
                "slug": "window-ac-uninstallation",
                "name": "Window AC Uninstallation",
                "price": 499,
                "duration": "45 mins",
                "tag": "Express Removal",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Safe removal of window AC from window frame/grill, bracket dismounting, and frame gap sealing.",
                "includes": [
                    "Safe unit removal",
                    "Bracket dismounting",
                    "Power cord safety pack"
                ],
                "tools": [
                    "Screwdriver set",
                    "Bracket spanner"
                ],
                "ready": [
                    "Clear access to window area"
                ],
                "reviews": [
                    {"name": "Siddharth K.", "rating": "4.8", "text": "Quick and clean removal."}
                ],
                "faqs": [
                    {"q": "Can the technician help pack the AC for transport?", "a": "Yes, the technician will secure the power cord and wrap the front panel safely."}
                ]
            },
            {
                "slug": "ac-relocation",
                "name": "AC Relocation",
                "price": 1799,
                "duration": "3 hrs",
                "tag": "Combo Saver",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Complete end-to-end relocation: safe gas pump-down, dismounting from old location, and full re-installation at new site.",
                "includes": [
                    "Zero gas loss pump-down",
                    "Safe dismounting & pack",
                    "New site remounting & copper pipe flaring",
                    "Deep vacuuming & cooling demo"
                ],
                "tools": [
                    "Complete HVAC tool kit",
                    "Drill, vacuum pump & manifold set"
                ],
                "ready": [
                    "Both old and new addresses accessible"
                ],
                "reviews": [
                    {"name": "Kiran N.", "rating": "5.0", "text": "Seamless relocation! Dismounted safely and reinstalled at our new house with zero gas loss."}
                ],
                "faqs": [
                    {"q": "Is transit included in relocation?", "a": "Uninstallation at origin and re-installation at destination are included. Customer transports unit or books via our goods transport service."}
                ]
            }
        ]
    },
    "ac-pcb-electrical": {
        "name": "AC PCB & Electrical",
        "desc": "Inverter/non-inverter motherboard micro-soldering, capacitor swap, contactor and wiring diagnostics.",
        "order": 5,
        "packages": [
            {
                "slug": "pcb-diagnosis",
                "name": "PCB Diagnosis",
                "price": 399,
                "duration": "45 mins",
                "tag": "PCB Scan",
                "popular": False,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Multi-meter electronic circuit diagnostic, error code scan, IPM inverter module test, and sensor resistance check.",
                "includes": [
                    "Inverter / non-inverter PCB audit",
                    "Error code interpretation",
                    "IPM module & power IC health test",
                    "Detailed repair estimate report"
                ],
                "tools": [
                    "Oscilloscope / digital multimeter",
                    "Logic probe",
                    "Thermal imaging camera"
                ],
                "ready": [
                    "Keep AC remote control available",
                    "Note down error code displayed on screen (e.g. E1, E6, F3)"
                ],
                "reviews": [
                    {"name": "Suresh B.", "rating": "5.0", "text": "Decoded the E6 communication error instantly and isolated the outdoor PCB fault."}
                ],
                "faqs": [
                    {"q": "What is an inverter PCB?", "a": "It is the intelligent microcontroller motherboard that regulates compressor DC frequency, fan speeds, and temperature sensors."}
                ]
            },
            {
                "slug": "pcb-repair",
                "name": "PCB Repair",
                "price": 899,
                "duration": "1.5 hrs",
                "tag": "Micro Soldering",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Component-level micro soldering repair: IPM module, power IC, relays, micro-controller, and circuit trace repair.",
                "includes": [
                    "Micro solder component swap",
                    "Power regulation IC & capacitor replacement",
                    "Bench testing under simulated load",
                    "60-day PCB warranty"
                ],
                "tools": [
                    "SMD rework soldering station",
                    "Conformal coating spray",
                    "Component desoldering pump"
                ],
                "ready": [
                    "Ensure main power breaker can be switched off safely"
                ],
                "reviews": [
                    {"name": "Venkat R.", "rating": "5.0", "text": "Saved me ₹8,000 compared to buying a whole new motherboard. Works flawlessly."}
                ],
                "faqs": [
                    {"q": "How long does PCB repair take?", "a": "Minor component replacements are done on-site; complex multi-layer board repairs may take 24-48 hours in our lab."}
                ]
            },
            {
                "slug": "pcb-replacement",
                "name": "PCB Replacement",
                "price": 699,
                "duration": "1 hr",
                "tag": "New Board Fit",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Installing brand new original indoor or outdoor control circuit board / universal PCB with wiring configuration.",
                "includes": [
                    "Old PCB removal",
                    "New PCB harness connection",
                    "Display & sensor sync test",
                    "Operational temperature demo"
                ],
                "tools": [
                    "Precision insulated screwdrivers",
                    "Wiring crimper set"
                ],
                "ready": [
                    "Brand new PCB board / universal kit ready or provided by tech"
                ],
                "reviews": [
                    {"name": "Raghav M.", "rating": "4.9", "text": "Replaced the outdoor PCB swiftly. Display and remote sync working 100%."}
                ],
                "faqs": [
                    {"q": "Are universal PCBs compatible with all AC brands?", "a": "Universal PCBs work with standard non-inverter ACs, while inverter models require brand-matched original boards."}
                ]
            },
            {
                "slug": "capacitor-replacement",
                "name": "Capacitor Replacement",
                "price": 299,
                "duration": "30 mins",
                "tag": "Quick Swap",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Replacing weak dual-run compressor / blower fan start capacitor with heavy-duty metalized capacitor.",
                "includes": [
                    "Microfarad (uF) capacitance test",
                    "Heavy-duty capacitor installation",
                    "Compressor startup load test",
                    "Terminal crimp insulation"
                ],
                "tools": [
                    "Digital capacitance meter",
                    "Heavy-duty terminal crimping tool"
                ],
                "ready": [
                    "Access to outdoor unit"
                ],
                "reviews": [
                    {"name": "Dinesh P.", "rating": "5.0", "text": "Swapped the dead 45uF capacitor in 15 minutes. Compressor started humming immediately!"}
                ],
                "faqs": [
                    {"q": "What does a capacitor do in an AC?", "a": "It provides the high electrical torque boost needed to start the compressor motor and fan motor smoothly."}
                ]
            },
            {
                "slug": "wiring-repair",
                "name": "Wiring Repair",
                "price": 349,
                "duration": "30 mins",
                "tag": "Electrical Care",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Repairing burnt terminal wires, loose copper thimbles, indoor-outdoor interconnecting cable, and earthing fix.",
                "includes": [
                    "Burnt wire trimming & re-crimping",
                    "High-temp insulated thimble fit",
                    "Interconnecting cable safety test",
                    "Earth voltage safety test"
                ],
                "tools": [
                    "Heavy duty wire stripper & ratchet crimper",
                    "Heat-shrink tubing & heat gun",
                    "Digital multimeter"
                ],
                "ready": [
                    "Turn off AC power supply switch"
                ],
                "reviews": [
                    {"name": "Anil S.", "rating": "4.8", "text": "Repaired loose burnt terminal thimbles. Completely safe now."}
                ],
                "faqs": [
                    {"q": "Why do AC terminal wires burn?", "a": "High running amperage through loose connector thimbles causes resistive heat that melts insulation."}
                ]
            }
        ]
    },
    "ac-parts-accessories": {
        "name": "AC Parts & Accessories",
        "desc": "Heavy-duty outdoor stands, voltage stabilizer installation, drain pipes, copper lines, and replacement remotes.",
        "order": 6,
        "packages": [
            {
                "slug": "outdoor-unit-stand",
                "name": "Outdoor Unit Stand",
                "price": 499,
                "duration": "45 mins",
                "tag": "Heavy Duty",
                "popular": True,
                "image": "/mockups/appliance_cleaning_hero.png",
                "description": "Heavy-duty powder-coated outdoor unit wall bracket or floor stand installation with anchor bolts & vibration pads.",
                "includes": [
                    "Heavy gauge metal bracket fit",
                    "Wall anchor bolt hammer drill",
                    "Anti-vibration rubber dampening pads",
                    "Spirit level alignment"
                ],
                "tools": [
                    "Rotary hammer drill with masonry bits",
                    "Spirit level",
                    "High-torque socket wrench"
                ],
                "ready": [
                    "Identify wall or balcony position for outdoor unit stand"
                ],
                "reviews": [
                    {"name": "Ramesh V.", "rating": "5.0", "text": "Solid powder coated stand. Withstands heavy compressor weight without any rattling."}
                ],
                "faqs": [
                    {"q": "Is the stand rust-proof?", "a": "Yes, made of heavy-gauge galvanised iron with anti-rust epoxy powder coating."}
                ]
            },
            {
                "slug": "stabilizer-installation",
                "name": "Stabilizer Installation",
                "price": 249,
                "duration": "30 mins",
                "tag": "Voltage Guard",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Wall mounting AC voltage stabilizer, connection to power socket, input/output voltage calibration & load test.",
                "includes": [
                    "Stabilizer wall mounting",
                    "Power cord crimping & wiring",
                    "High/low voltage cutoff calibration test",
                    "Time-delay restart test"
                ],
                "tools": [
                    "Drill with rawl plugs",
                    "Multimeter",
                    "Insulated wire strippers"
                ],
                "ready": [
                    "Keep voltage stabilizer unit and power plug ready"
                ],
                "reviews": [
                    {"name": "Gita M.", "rating": "4.9", "text": "Mounted neatly on the wall next to the AC. Tested cutoff voltages."}
                ],
                "faqs": [
                    {"q": "Do inverter ACs need stabilizers?", "a": "In areas with frequent voltage fluctuations (>270V or <160V), an external stabilizer protects sensitive inverter PCBs."}
                ]
            },
            {
                "slug": "drain-pipe-replacement",
                "name": "Drain Pipe Replacement",
                "price": 199,
                "duration": "20 mins",
                "tag": "Drainage",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Replacing cracked, leaking, or blocked AC drain hose with heavy-duty UV-resistant corrugated drain pipe.",
                "includes": [
                    "Old drain hose removal",
                    "UV-resistant corrugated pipe fit",
                    "Water flow gradient alignment",
                    "Wall clip clamping"
                ],
                "tools": [
                    "Pipe cutter",
                    "Insulation waterproof tape",
                    "Wall clamps"
                ],
                "ready": [
                    "Clear path along drain pipe route"
                ],
                "reviews": [
                    {"name": "Prakash S.", "rating": "4.8", "text": "Replaced cracked sun-damaged pipe. No more balcony dripping."}
                ],
                "faqs": [
                    {"q": "What drain pipe material is used?", "a": "High-density UV-stabilized corrugated polymer that does not crack under direct sunlight."}
                ]
            },
            {
                "slug": "copper-pipe-work",
                "name": "Copper Pipe Work",
                "price": 349,
                "duration": "30 mins",
                "tag": "Per Meter",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Insulated pure copper refrigeration pipe laying, nitrile rubber insulation sleeve wrapping, and flaring joint.",
                "includes": [
                    "100% pure copper tube flaring",
                    "Closed-cell nitrile rubber insulation sleeve",
                    "Vibration clip wall clamping",
                    "Pressure hold test"
                ],
                "tools": [
                    "Eccentric flaring cone kit",
                    "Tube bender",
                    "Pipe cutter"
                ],
                "ready": [
                    "Determine piping route length between indoor and outdoor units"
                ],
                "reviews": [
                    {"name": "Ajay K.", "rating": "5.0", "text": "Expert copper tube bending with zero kinks and neat black nitrile insulation."}
                ],
                "faqs": [
                    {"q": "Why is pure copper better than aluminium piping?", "a": "Copper offers superior thermal conductivity, higher tensile strength, and zero corrosion pinhole risks compared to aluminium."}
                ]
            },
            {
                "slug": "remote-replacement",
                "name": "Remote Replacement",
                "price": 399,
                "duration": "15 mins",
                "tag": "Universal Sync",
                "popular": False,
                "image": "/mockups/appliance_cleaning_thumb.png",
                "description": "Brand-specific or universal AC remote supply, frequency pairing, mode configuration & test.",
                "includes": [
                    "Compatible remote programming",
                    "Mode, swing, fan speed & timer sync test",
                    "Fresh battery pair included"
                ],
                "tools": [
                    "IR signal tester",
                    "Frequency programming guide"
                ],
                "ready": [
                    "Have AC brand & model name handy"
                ],
                "reviews": [
                    {"name": "Meera T.", "rating": "4.9", "text": "Synced the new remote in 2 minutes. All swing and turbo modes working!"}
                ],
                "faqs": [
                    {"q": "Does this work with inverter AC models?", "a": "Yes! Our remotes support full temperature, swing, turbo, eco and sleep modes across all major AC brands."}
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
