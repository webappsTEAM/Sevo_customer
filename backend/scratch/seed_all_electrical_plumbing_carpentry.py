import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'quicktims.settings')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
django.setup()

from service_requests.models import CatalogCategory, Service, Package

category, _ = CatalogCategory.objects.get_or_create(
    slug="electrician_plumbing_carpentry",
    defaults={"name": "Electrician, Plumbing & Carpentry", "is_active": True}
)

ALL_SERVICES_DATA = {
    "electrician": {
        "name": "Electrician",
        "description": "Certified residential electrical repair, switchboards, MCB, inverter wiring, fans & lights.",
        "packages": [
            # Switches & Sockets
            {
                "slug": "elec-sw-1", "name": "Modular Switch Replacement", "base_price": 199, "duration": "20 mins", "tag": "Popular",
                "description": "Removing faulty switch and fitting premium brand modular switch plate.",
                "includes": ["Old switch removal", "New modular switch fit", "Live wire test", "Safety insulation"],
                "tools": ["1000V Insulated screwdriver set", "Non-contact voltage detector", "Wire stripper & crimper", "Digital multimeter"],
                "ready": ["Ensure main switchboard area is easily accessible", "Keep spare modular switch plate ready if pre-purchased"],
                "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Replaced 3 arcing switches quickly and neatly. Very professional!"}],
                "faqs": [{"q": "Are switches included?", "a": "Labor and safety testing are included. Modular switches can be supplied by you or purchased from our electrician."}]
            },
            {
                "slug": "elec-sw-2", "name": "5/15A Socket Replacement", "base_price": 199, "duration": "20 mins", "tag": "Essential",
                "description": "Safe 5A or 15A wall socket replacement with shutter mechanism.",
                "includes": ["Socket removal", "ISI marked socket fit", "Earth continuity check", "Polarity testing"],
                "tools": ["Insulated screwdriver set", "Digital multimeter", "Phase tester"],
                "ready": ["Ensure main MCB switch can be turned off safely"],
                "reviews": [{"name": "Kavita M.", "rating": "4.9", "text": "Fixed a loose socket that was sparking. Works smoothly now."}],
                "faqs": [{"q": "Do you check earth connection?", "a": "Yes, we verify earth continuity and polarity with a multimeter."}]
            },
            {
                "slug": "elec-sw-3", "name": "16A Heavy Duty Socket for AC/Geyser", "base_price": 249, "duration": "25 mins", "tag": "Safety",
                "description": "Heavy gauge 16A moulded socket fitting for high-power appliances.",
                "includes": ["16A socket fit", "Earthing check", "Load test", "Heat-resistant terminal tightening"],
                "tools": ["Heavy duty wire stripper", "Insulated pliers", "Voltage tester"],
                "ready": ["Keep geyser/AC power point area accessible"],
                "reviews": [{"name": "Deepak S.", "rating": "5.0", "text": "Installed 16A socket for our new geyser. High quality wiring."}],
                "faqs": [{"q": "Can this handle a 2-ton AC?", "a": "Yes, our 16A heavy-duty sockets are rated for appliances up to 3500W."}]
            },
            {
                "slug": "elec-sw-4", "name": "Switchboard Installation", "base_price": 349, "duration": "30 mins", "tag": "New Board",
                "description": "New modular switchboard fitting with up to 4 switch/socket positions.",
                "includes": ["Board frame fit", "Wiring connection", "Safety check", "Wall anchor mounting"],
                "tools": ["Spirit level", "Concealed wall anchor set", "Multimeter"],
                "ready": ["Provide access to the wall area where the switchboard will be installed"],
                "reviews": [{"name": "Arun K.", "rating": "4.8", "text": "Clean installation of 8-module switchboard in living room."}],
                "faqs": [{"q": "How many modules are included?", "a": "Standard pricing covers boards up to 8 modules. Larger 12/18 module boards take slightly longer."}]
            },
            {
                "slug": "elec-sw-5", "name": "USB Charging Socket Fit", "base_price": 299, "duration": "25 mins", "tag": "Smart Home",
                "description": "Dual USB + 5A socket combo fitting for bedside or office desk.",
                "includes": ["USB socket installation", "Flush mount fitting", "Charging test", "Surge protection check"],
                "tools": ["Precision screwdriver set", "Multimeter", "USB test load"],
                "ready": ["Keep bedside or work desk socket accessible"],
                "reviews": [{"name": "Sneha R.", "rating": "5.0", "text": "Very convenient for charging phones by the bedside table."}],
                "faqs": [{"q": "Does it support fast charging?", "a": "Yes, compatible with standard 2.4A and 3.0A USB fast charging modules."}]
            },
            {
                "slug": "elec-sw-6", "name": "Faulty Switch Diagnosis", "base_price": 149, "duration": "15 mins", "tag": "Quick Fix",
                "description": "Multi-meter testing to identify tripped, arcing, or loose contact switches.",
                "includes": ["Multi-meter test", "Arc trace check", "Fix or replace advice", "Terminal tightening"],
                "tools": ["True-RMS Multimeter", "Thermal sniffer", "Phase tester"],
                "ready": ["Point out which switches or sockets are acting faulty"],
                "reviews": [{"name": "Manoj T.", "rating": "4.9", "text": "Found a loose neutral wire that was causing intermittent flickering."}],
                "faqs": [{"q": "Is diagnostic fee waived if I repair?", "a": "Yes, diagnostic fee merges into the final repair total."}]
            },
            # Fan & Lighting
            {
                "slug": "elec-fan-1", "name": "Ceiling Fan Installation", "base_price": 249, "duration": "30 mins", "tag": "Standard Fit",
                "description": "Safe hook bolt ceiling fit, blade balancing and speed regulator connection.",
                "includes": ["Hook bolt ceiling fit", "Blade balance", "Regulator wiring", "Dynamic anti-wobble check"],
                "tools": ["Step ladder", "Blade balancing clip kit", "Multimeter"],
                "ready": ["Keep fan unit in the room", "Ensure clear ceiling clearance"],
                "reviews": [{"name": "Aarav Sharma", "rating": "5.0", "text": "Installed our BLDC fan smoothly with zero vibration."}],
                "faqs": [{"q": "Do you balance wobbly fan blades?", "a": "Yes, we dynamic balance blades using precision counterweight clips."}]
            },
            {
                "slug": "elec-fan-2", "name": "Ceiling Fan Repair", "base_price": 299, "duration": "30 mins", "tag": "Expert Fix",
                "description": "Fan capacitor replacement, bearing lubrication or speed problem fix.",
                "includes": ["Capacitor replacement", "Bearing lubrication", "Speed test", "Shaft alignment"],
                "tools": ["Capacitance meter", "Lubricant spray", "Insulated pliers"],
                "ready": ["Ensure the fan switch is reachable"],
                "reviews": [{"name": "Pooja N.", "rating": "4.8", "text": "Replaced the weak capacitor and restored full 5th speed."}],
                "faqs": [{"q": "Why is my fan spinning slowly?", "a": "Usually a depleted run capacitor (2.5uF/3.15uF). Replacing it restores full factory speed."}]
            },
            {
                "slug": "elec-fan-3", "name": "Exhaust Fan Installation", "base_price": 199, "duration": "25 mins", "tag": "Ventilation",
                "description": "Kitchen or bathroom exhaust fan wall/ceiling fitting with louvre cover.",
                "includes": ["Hole cutting if needed", "Fan bracket fit", "Power connection", "Vibration damping"],
                "tools": ["Masonry drill", "Insulated screwdriver", "Silicone sealant"],
                "ready": ["Keep exhaust fan unit ready near the kitchen/bathroom outlet duct"],
                "reviews": [{"name": "Suresh V.", "rating": "4.9", "text": "Fitted exhaust fan in kitchen window panel cleanly."}],
                "faqs": [{"q": "Can you install in glass windows?", "a": "Yes, if a round circular cutout already exists in the glass."}]
            },
            {
                "slug": "elec-fan-4", "name": "LED Light Installation", "base_price": 149, "duration": "15 mins", "tag": "Energy Save",
                "description": "Panel light, spot light or batten fitting with safe driver connection.",
                "includes": ["Driver connection", "Flush panel fit", "Brightness test", "Concealed spring clamp fit"],
                "tools": ["Wire stripper", "Voltage tester", "Step ladder"],
                "ready": ["Keep LED lights / batten tubes ready"],
                "reviews": [{"name": "Ananya S.", "rating": "5.0", "text": "Installed 4 false-ceiling spot lights in 20 minutes."}],
                "faqs": [{"q": "Do you install false ceiling lights?", "a": "Yes, we install round/square COB spot and panel lights in Gypsum/POP ceilings."}]
            },
            {
                "slug": "elec-fan-5", "name": "Fan Regulator Replacement", "base_price": 149, "duration": "15 mins", "tag": "Speed Control",
                "description": "Replacing faulty step regulator or electronic dimmer with new unit.",
                "includes": ["Old regulator removal", "New regulator fit", "Speed step test", "Rotary knob calibration"],
                "tools": ["Screwdriver set", "Wire stripper", "Tester"],
                "ready": ["Keep new modular regulator ready if pre-purchased"],
                "reviews": [{"name": "Rahul K.", "rating": "4.8", "text": "Fixed continuous high-speed humming by replacing the regulator."}],
                "faqs": [{"q": "Do you support step regulators?", "a": "Yes, we install 4-step, 5-step, and rotary electronic fan dimmers."}]
            },
            {
                "slug": "elec-fan-6", "name": "Light Fixture Replacement", "base_price": 199, "duration": "20 mins", "tag": "Upgrade",
                "description": "Removing old bulb holder and fitting new LED bulb holder or batten light.",
                "includes": ["Holder removal", "New fixture fit", "Wire connection", "Batten clip mounting"],
                "tools": ["Drill machine", "Screwdriver set", "Voltage detector"],
                "ready": ["Keep new light fixture ready for mounting"],
                "reviews": [{"name": "Karthik M.", "rating": "4.9", "text": "Replaced old fluorescent choke tube with modern LED batten."}],
                "faqs": [{"q": "Do you remove old holders?", "a": "Yes, old holders and chokes are safely dismantled."}]
            },
            # MCB & Wiring
            {
                "slug": "elec-mcb-1", "name": "MCB Replacement", "base_price": 299, "duration": "25 mins", "tag": "Safety",
                "description": "Replacing tripped or faulty MCB with new ISI marked circuit breaker.",
                "includes": ["MCB rating check", "New MCB installation", "Trip test", "Busbar terminal torque check"],
                "tools": ["Insulated torque screwdriver", "Multimeter", "Thermal imaging gun"],
                "ready": ["Keep main DB box accessible"],
                "reviews": [{"name": "Venkatesh L.", "rating": "5.0", "text": "Replaced our 32A AC breaker that was overheating."}],
                "faqs": [{"q": "How to choose MCB rating?", "a": "Our technician calculates the sub-circuit load (B/C curve, 6A-63A) to match your wiring gauge."}]
            },
            {
                "slug": "elec-mcb-2", "name": "Main DB Box Inspection", "base_price": 249, "duration": "30 mins", "tag": "Safety Audit",
                "description": "Full distribution board inspection, terminal tightening and leakage check.",
                "includes": ["Terminal tightening", "RCCB/ELCB test", "Wiring health audit", "Neutral busbar cleaning"],
                "tools": ["Insulated tool set", "Digital Megohmmeter", "Phase sequence tester"],
                "ready": ["Provide access to the main distribution panel"],
                "reviews": [{"name": "Sunil G.", "rating": "4.9", "text": "Found two loose neutral wires that were creating sparks in DB box."}],
                "faqs": [{"q": "How often should DB box be inspected?", "a": "At least once a year to prevent electrical fire hazards from thermal loosening."}]
            },
            {
                "slug": "elec-mcb-3", "name": "Earthing Check & Repair", "base_price": 349, "duration": "30 mins", "tag": "Grounding",
                "description": "Earth continuity resistance test and earthing wire repair.",
                "includes": ["Resistance measurement", "Earth wire tracing", "Safe earth restoration", "Earth pin voltage audit"],
                "tools": ["Earth ground resistance clamp meter", "Multimeter"],
                "ready": ["Keep the main earthing pit or meter board accessible"],
                "reviews": [{"name": "Naveen P.", "rating": "5.0", "text": "Eliminated mild electric shocks from washing machine metallic body."}],
                "faqs": [{"q": "Why do I feel mild shocks on appliances?", "a": "This happens when earthing continuity is broken or resistance exceeds 5 Ohms."}]
            },
            {
                "slug": "elec-mcb-4", "name": "Short Circuit Repair", "base_price": 499, "duration": "45 mins", "tag": "Emergency",
                "description": "Tracing and repairing burnt wire short circuits causing repeated MCB trips.",
                "includes": ["Fault circuit tracing", "Burnt wire replacement", "MCB reset test", "Insulation test"],
                "tools": ["Megger insulation tester", "Cable tracer", "Thermal camera"],
                "ready": ["Inform technician which appliance or switch triggered the short circuit"],
                "reviews": [{"name": "Kishore R.", "rating": "5.0", "text": "Located a hidden shorted wire behind a tiled wall and fixed it safely."}],
                "faqs": [{"q": "Is emergency repair covered 24/7?", "a": "We prioritize short circuit and power cut appointments immediately."}]
            },
            {
                "slug": "elec-mcb-5", "name": "New Point Wiring", "base_price": 599, "duration": "1 hr", "tag": "New Connection",
                "description": "Adding a new electrical power point with conduit wiring from nearest junction.",
                "includes": ["Conduit routing", "3-core wire pull", "Socket/switch fit", "Load testing"],
                "tools": ["Rotary hammer drill", "Fish tape wire puller", "Cable cutter"],
                "ready": ["Decide exact location for the new power point"],
                "reviews": [{"name": "Meera R.", "rating": "4.9", "text": "Neat casing conduit wiring for our balcony washing machine."}],
                "faqs": [{"q": "Is surface casing or concealed wiring done?", "a": "We do both PVC casing-capping surface wiring and wall-groove concealed wiring."}]
            },
            {
                "slug": "elec-mcb-6", "name": "RCCB / ELCB Installation", "base_price": 799, "duration": "45 mins", "tag": "Protection",
                "description": "Residual current circuit breaker installation for shock protection.",
                "includes": ["RCCB rating selection", "DB box fitting", "Leakage trip test", "Neutral isolation check"],
                "tools": ["Torque screwdriver", "ELCB trip time tester", "Multimeter"],
                "ready": ["Keep DB panel cover clear"],
                "reviews": [{"name": "Dinesh P.", "rating": "5.0", "text": "Installed 30mA RCCB for whole house electrical shock safety."}],
                "faqs": [{"q": "Why is RCCB necessary?", "a": "It trips within 30 milliseconds in case of human contact with live wire or water leakage."}]
            },
            # Inverter & Heavy Appliance
            {
                "slug": "elec-inv-1", "name": "Inverter Battery Checkup", "base_price": 299, "duration": "30 mins", "tag": "Battery Audit",
                "description": "Battery water level check, terminal cleaning, charging current test & backup estimate.",
                "includes": ["Electrolyte level check", "Terminal cleaning", "Charging voltage test", "Specific gravity test"],
                "tools": ["Battery hydrometer", "Wire brush", "Petroleum jelly", "DC clamp meter"],
                "ready": ["Keep inverter unit accessible with good ventilation"],
                "reviews": [{"name": "Prakash K.", "rating": "4.9", "text": "Cleaned corroded terminals and topped up distilled water."}],
                "faqs": [{"q": "What water should be added to inverter battery?", "a": "Only pure de-mineralized distilled water, never tap or RO water."}]
            },
            {
                "slug": "elec-inv-2", "name": "Inverter Repair", "base_price": 599, "duration": "1 hr", "tag": "Expert Fix",
                "description": "Inverter PCB repair, MOSFET replacement, charger fault or display board fix.",
                "includes": ["PCB diagnostic", "Faulty component replace", "Output voltage test", "Overload relay check"],
                "tools": ["Soldering station", "Oscilloscope", "MOSFET tester"],
                "ready": ["Keep the inverter manual and warranty card handy if available"],
                "reviews": [{"name": "Santosh B.", "rating": "5.0", "text": "Fixed the continuous overload buzzer alarm in our Luminous inverter."}],
                "faqs": [{"q": "Do you repair pure sine wave inverters?", "a": "Yes, we service all Microtek, Luminous, Exide, and Sukam sine wave models."}]
            },
            {
                "slug": "elec-inv-3", "name": "Inverter Wiring", "base_price": 399, "duration": "45 mins", "tag": "Safe Wiring",
                "description": "Safe inverter bypass wiring for selected power points in the home.",
                "includes": ["Bypass circuit routing", "3-core inverter wire", "Load test", "Neutral loop check"],
                "tools": ["Wire puller", "Conduit clips", "Multimeter"],
                "ready": ["Decide which fans and lights need backup power during power cuts"],
                "reviews": [{"name": "Nitin B.", "rating": "4.9", "text": "Separated inverter phase cleanly without any neutral backfeed."}],
                "faqs": [{"q": "Can I connect refrigerator to inverter?", "a": "Yes, if your inverter is rated 1100VA or higher."}]
            },
            {
                "slug": "elec-inv-4", "name": "Geyser Installation", "base_price": 399, "duration": "45 mins", "tag": "Hot Water",
                "description": "Wall mounting bracket fitting, plumbing inlet/outlet & 16A socket connection.",
                "includes": ["Bracket wall mount", "Inlet/outlet pipe fit", "16A socket connection", "Pressure release check"],
                "tools": ["Heavy duty hammer drill", "Plumbing spanners", "Teflon tape"],
                "ready": ["Keep geyser in bathroom with angle valves accessible"],
                "reviews": [{"name": "Archana G.", "rating": "5.0", "text": "Installed our 25L AO Smith geyser securely on concrete wall."}],
                "faqs": [{"q": "Are inlet connection pipes included?", "a": "Braided steel inlet/outlet pipes can be supplied by you or purchased from technician."}]
            },
            {
                "slug": "elec-inv-5", "name": "Geyser Repair", "base_price": 499, "duration": "45 mins", "tag": "Element Fix",
                "description": "Heating element resistance test, thermostat replacement or pressure valve fix.",
                "includes": ["Element resistance check", "Thermostat swap", "Pressure valve check", "Tank descaling"],
                "tools": ["Multimeter", "Socket wrench set", "Scale scraper"],
                "ready": ["Switch off geyser power at least 1 hour before appointment to let water cool"],
                "reviews": [{"name": "Karthik R.", "rating": "4.9", "text": "Replaced blown heating element and cleaned mineral sediment."}],
                "faqs": [{"q": "Why is geyser not heating water?", "a": "Usually caused by burnt copper heating coil or tripped auto-cutoff thermostat."}]
            },
            {
                "slug": "elec-inv-6", "name": "Voltage Stabilizer Installation", "base_price": 299, "duration": "30 mins", "tag": "Protection",
                "description": "Stabilizer wall/shelf mounting with dedicated input wiring & load test.",
                "includes": ["Shelf/wall mounting", "Input wiring", "Voltage regulation test", "High/low voltage cutoff check"],
                "tools": ["Drill machine", "Multimeter", "Insulated tools"],
                "ready": ["Keep stabilizer unit near the AC or Refrigerator"],
                "reviews": [{"name": "Anil M.", "rating": "4.8", "text": "Installed V-Guard stabilizer for 1.5 ton AC."}],
                "faqs": [{"q": "Do modern inverter ACs need stabilizers?", "a": "In areas with frequent voltage swings below 150V or above 270V, an external stabilizer provides critical protection."}]
            }
        ]
    },
    "plumbing": {
        "name": "Plumbing",
        "description": "Expert leak repair, tap & mixer fitting, toilet commode fix, drainage unclogging & water motors.",
        "packages": [
            # Tap & Mixer
            {
                "slug": "plum-tap-1", "name": "Tap Repair", "base_price": 149, "duration": "30 mins", "tag": "Value",
                "description": "Fix dripping taps, washer replacement, spindle fix, or internal seal tuning.",
                "includes": ["Washer & spindle replace", "Leak tightness test", "Water flow check", "O-ring lubrication"],
                "tools": ["Adjustable wrench", "Spindle key", "PTFE Teflon tape", "Silicone grease"],
                "ready": ["Point out location of main water inlet valve"],
                "reviews": [{"name": "Priya R.", "rating": "5.0", "text": "Fixed continuous dripping in kitchen sink tap in 15 minutes."}],
                "faqs": [{"q": "Do you carry spare spindles?", "a": "Yes, our plumbers carry half-inch and three-quarter inch brass and ceramic disc spindles."}]
            },
            {
                "slug": "plum-tap-2", "name": "Tap Installation / Replacement", "base_price": 199, "duration": "30 mins", "tag": "Essential",
                "description": "Unmounting old tap and fitting new sink/basin/wall tap with Teflon thread sealing.",
                "includes": ["Old tap dismount", "New tap fitting", "Teflon seal check", "Flange adjustment"],
                "tools": ["Pipe wrench", "PTFE tape", "Thread sealant"],
                "ready": ["Keep new tap and wall flange ready"],
                "reviews": [{"name": "Deepak S.", "rating": "4.9", "text": "Replaced bathroom bibcock tap cleanly with zero leaks."}],
                "faqs": [{"q": "Do you install pillar taps on granite counters?", "a": "Yes, we install both wall-mounted bibcock taps and counter-mounted pillar taps."}]
            },
            {
                "slug": "plum-tap-3", "name": "Tap Accessory Installation", "base_price": 149, "duration": "20 mins", "tag": "Quick Fit",
                "description": "Fitting aerators, extension nozzles, foamers, or water filter adapters on taps.",
                "includes": ["Accessory mounting", "Aerator cleaning", "Spray test", "Thread adapter fit"],
                "tools": ["Strap wrench", "Thread adapter kit"],
                "ready": ["Keep aerator or spray extension ready"],
                "reviews": [{"name": "Meera V.", "rating": "5.0", "text": "Installed 360-degree rotating foamer nozzle on kitchen tap."}],
                "faqs": [{"q": "Does aerator save water?", "a": "Yes, modern foam aerators reduce water consumption by up to 40% while maintaining spray pressure."}]
            },
            {
                "slug": "plum-tap-4", "name": "Mixer Repair", "base_price": 399, "duration": "45 mins", "tag": "Expert Fix",
                "description": "Hot & cold water mixer valve cartridge replacement, shower diverter repair, and thread sealing.",
                "includes": ["Internal cartridge fix", "Teflon tape seal", "Flow pressure test", "Diverter lever tuning"],
                "tools": ["Hex Allen key set", "Cartridge puller", "Plumbing spanner"],
                "ready": ["Ensure both hot and cold water supplies can be isolated"],
                "reviews": [{"name": "Karthik M.", "rating": "5.0", "text": "Repaired our Jaquar wall mixer diverter that was stuck."}],
                "faqs": [{"q": "Do you service single lever basin mixers?", "a": "Yes, we service 35mm and 40mm ceramic disc cartridges for all luxury brands."}]
            },
            {
                "slug": "plum-tap-5", "name": "Mixer Installation", "base_price": 499, "duration": "1 hr", "tag": "New Fit",
                "description": "Wall mixer or counter-top mixer installation with hot & cold braided pipe connection.",
                "includes": ["Hot/cold alignment", "Wall flange fit", "Pressure leak test", "Crutch fitting"],
                "tools": ["Level gauge", "Offset connector wrench", "PTFE tape"],
                "ready": ["Keep wall mixer unit and S-connectors ready"],
                "reviews": [{"name": "Aarav M.", "rating": "4.9", "text": "Installed 3-in-1 wall mixer with overhead shower connection."}],
                "faqs": [{"q": "What if wall inlet pipe centers do not match?", "a": "We use adjustable brass S-connectors (crutches) to compensate for uneven inlet spacing."}]
            },
            {
                "slug": "plum-tap-6", "name": "Shower Installation", "base_price": 299, "duration": "30 mins", "tag": "Shower Fit",
                "description": "Overhead shower arm mounting, hand shower bracket fitting, and flow test.",
                "includes": ["Shower arm fit", "Teflon thread seal", "Spray pattern check", "Flange tightening"],
                "tools": ["Strap wrench", "PTFE tape"],
                "ready": ["Keep shower head and arm ready"],
                "reviews": [{"name": "Siddharth N.", "rating": "5.0", "text": "Installed 8-inch rain shower head. Water pressure is awesome."}],
                "faqs": [{"q": "Do you clean clogged shower nozzles?", "a": "Yes, we descale mineral buildup from rubber spray jets."}]
            },
            # Toilet
            {
                "slug": "plum-toil-1", "name": "Jet Spray Repair / Replacement", "base_price": 199, "duration": "25 mins", "tag": "Popular",
                "description": "Fix leaking health faucet jet spray, trigger replacement or new hose installation.",
                "includes": ["Trigger repair/replace", "Braided hose connection", "Pressure test", "Washer seal"],
                "tools": ["Adjustable wrench", "Gasket kit"],
                "ready": ["Ensure 2-way angle valve near commode is accessible"],
                "reviews": [{"name": "Pooja V.", "rating": "4.9", "text": "Replaced cracked flexible hose with stainless steel braided pipe."}],
                "faqs": [{"q": "Why does jet spray leak from trigger?", "a": "Internal silicone pressure seal gets worn over time. Replacing the spray head resolves it instantly."}]
            },
            {
                "slug": "plum-toil-2", "name": "Jet Spray Installation", "base_price": 249, "duration": "30 mins", "tag": "Essential",
                "description": "New health faucet jet spray wall bracket fitting and 2-way angle valve connection.",
                "includes": ["Wall bracket drill & fit", "Angle valve connection", "Leakage test", "Braided hose setup"],
                "tools": ["Masonry drill", "Tile drill bit", "Spanner set"],
                "ready": ["Keep health faucet and wall bracket ready"],
                "reviews": [{"name": "Naveen K.", "rating": "5.0", "text": "Drilled bathroom tile without any cracks and installed jet spray neatly."}],
                "faqs": [{"q": "Do you supply 2-way angle valve?", "a": "Yes, brass heavy-duty 2-way angle valves can be purchased directly from the plumber."}]
            },
            {
                "slug": "plum-toil-3", "name": "Toilet Seat Cover Installation", "base_price": 199, "duration": "20 mins", "tag": "Quick Fit",
                "description": "Removing old damaged seat cover and installing new soft-close hydraulic toilet seat cover.",
                "includes": ["Old cover removal", "Hinge bolt alignment", "Soft-close test", "Top/bottom bolt fastening"],
                "tools": ["Socket wrench", "Screwdriver set"],
                "ready": ["Keep new seat cover box in bathroom"],
                "reviews": [{"name": "Kavita R.", "rating": "4.8", "text": "Installed European standard soft-close seat cover perfectly."}],
                "faqs": [{"q": "Are oval and square seat covers supported?", "a": "Yes, we install standard, D-shape, round, and square commode seat covers."}]
            },
            {
                "slug": "plum-toil-4", "name": "Flush Tank Repair", "base_price": 399, "duration": "45 mins", "tag": "Best Seller",
                "description": "Fix continuous flushing water leakage, syphon kit change, or float valve adjustment.",
                "includes": ["Syphon kit check", "Float valve adjustment", "Leak tightness check", "Inlet valve seal"],
                "tools": ["Flush tank wrench", "Silicone flapper seals", "Float valve tool"],
                "ready": ["Clean surrounding area for comfortable technician access"],
                "reviews": [{"name": "Prakash K.", "rating": "5.0", "text": "Saved hundreds of liters of wasted water. Replaced the flush mechanism cleanly."}],
                "faqs": [{"q": "Do you service concealed wall cisterns?", "a": "Yes, we service all standard, dual-flush, and concealed wall cisterns including Jaquar, Kohler, Hindware, Parryware."}]
            },
            {
                "slug": "plum-toil-5", "name": "Flush Tank Replacement", "base_price": 699, "duration": "1 hr", "tag": "Full Kit",
                "description": "Dismounting old flush tank and installing new PVC single/dual flush tank assembly.",
                "includes": ["Old tank removal", "New tank mounting", "Dual flush calibration", "Flush bend pipe seal"],
                "tools": ["Masonry drill", "Spanner set", "Teflon tape"],
                "ready": ["Keep new flush tank assembly ready"],
                "reviews": [{"name": "Deepak G.", "rating": "4.9", "text": "Replaced cracked old flush tank with modern dual-flush unit."}],
                "faqs": [{"q": "Does dual flush save water?", "a": "Yes, dual-flush uses 3L for liquid flush and 6L for solid flush, saving up to 50% water."}]
            },
            {
                "slug": "plum-toil-6", "name": "Western Toilet Replacement", "base_price": 1299, "duration": "1.5 hrs", "tag": "Heavy Fit",
                "description": "Dismounting old commode, wax seal ring installation, floor bolt fixing, and silicone sealing.",
                "includes": ["Old commode dismount", "Wax ring & gasket seal", "Floor anchorage & silicone seal", "Waste outlet coupling"],
                "tools": ["Hammer drill", "Wax ring gasket", "Anti-fungal silicone gun", "Level"],
                "ready": ["Keep new floor-mount or wall-hung commode ready"],
                "reviews": [{"name": "Venkatesh L.", "rating": "5.0", "text": "Removed old commode and installed rimless one-piece commode. Completely odor free!"}],
                "faqs": [{"q": "How long until toilet can be used?", "a": "Silicone floor seal requires 4 to 6 hours to cure completely."}]
            },
            {
                "slug": "plum-toil-7", "name": "Indian Toilet Installation", "base_price": 1499, "duration": "2 hrs", "tag": "Sanitary Fit",
                "description": "Squatting pan alignment, P-trap sealing, cement joint packing, and flush connection.",
                "includes": ["P-trap alignment", "Cement mortar packing", "Flush pipe seal", "Foot rest positioning"],
                "tools": ["Trowel", "Mortar mixer", "Spirit level"],
                "ready": ["Provide water access and cement mixture if minor masonry needed"],
                "reviews": [{"name": "Suresh B.", "rating": "4.8", "text": "Solid installation of Orissa pan squatting toilet."}],
                "faqs": [{"q": "Do you check P-trap water seal?", "a": "Yes, we ensure the water trap holds sufficient depth to prevent sewer gas backdraft."}]
            },
            {
                "slug": "plum-toil-8", "name": "Toilet Pot Blockage Removal", "base_price": 499, "duration": "45 mins", "tag": "Emergency",
                "description": "High-pressure auger drain snake clearing for toilet pot blockage and waste line backup.",
                "includes": ["Drain snake clearing", "Pressure flush test", "Sanitizing cleanup", "Waste line clearance"],
                "tools": ["Heavy duty toilet auger snake", "Vacuum plunger", "Rubber protective gear"],
                "ready": ["Avoid flushing repeatedly to prevent toilet bowl overflow"],
                "reviews": [{"name": "Anil M.", "rating": "5.0", "text": "Cleared stubborn blockage in 20 minutes cleanly without any mess."}],
                "faqs": [{"q": "Does this damage porcelain ceramic?", "a": "No, our toilet augers have vinyl protective sleeves that safeguard ceramic bowl glaze."}]
            },
            # Basin & Sink
            {
                "slug": "plum-bs-1", "name": "Wash Basin Installation", "base_price": 499, "duration": "45 mins", "tag": "Recommended",
                "description": "Wall bracket mounting, ceramic wash basin positioning, waste coupling, and pillar tap fit.",
                "includes": ["Wall bracket drilling", "Basin positioning & leveling", "Waste coupling seal", "Bottle trap connection"],
                "tools": ["Rotary drill", "Heavy duty bracket bolts", "Spirit level", "Silicone sealant"],
                "ready": ["Keep basin, brackets, and tap ready in bathroom/dining area"],
                "reviews": [{"name": "Deepika S.", "rating": "5.0", "text": "Hung our designer dining washbasin with laser straight leveling."}],
                "faqs": [{"q": "Do you install counter-top vanity basins?", "a": "Yes, we install wall-hung, table-top vanity, and pedestal wash basins."}]
            },
            {
                "slug": "plum-bs-2", "name": "Waste Pipe Replacement", "base_price": 199, "duration": "25 mins", "tag": "Quick Fix",
                "description": "Replacing cracked or leaking flexible corrugated waste pipe under sink/basin.",
                "includes": ["Old pipe removal", "Heavy duty flexible hose fit", "Drain flush check", "Rubber washer seal"],
                "tools": ["Pipe cutter", "Gasket seal kit"],
                "ready": ["Keep a small bucket under the sink"],
                "reviews": [{"name": "Rajesh N.", "rating": "4.9", "text": "Replaced smelly old drain pipe with expandable heavy-duty waste pipe."}],
                "faqs": [{"q": "Does new pipe prevent bad smell?", "a": "Yes, creating a bottle trap loop in the flexible pipe blocks foul sewer odors."}]
            },
            {
                "slug": "plum-bs-3", "name": "Sink Drainage Removal", "base_price": 349, "duration": "30 mins", "tag": "De-clog",
                "description": "Clearing food sludge, grease buildup, and debris in kitchen sink bottle trap or drain line.",
                "includes": ["Bottle trap dismount & clean", "Spring snake clearing", "Water drain flush", "Grease breakdown treatment"],
                "tools": ["Flexible spring auger snake", "Pipe wrench", "Catch basin"],
                "ready": ["Clear dishes and vessels from the kitchen sink"],
                "reviews": [{"name": "Ananya S.", "rating": "5.0", "text": "Cleared completely clogged kitchen sink. Water drains fast now."}],
                "faqs": [{"q": "Do you use chemical acids?", "a": "No, we use mechanical spring snakes and enzyme drain openers that are 100% safe on PVC pipes."}]
            },
            {
                "slug": "plum-bs-4", "name": "Waste Coupling Installation", "base_price": 249, "duration": "30 mins", "tag": "Essential",
                "description": "Brass or stainless steel waste coupling installation with rubber gasket and pop-up plug.",
                "includes": ["Old coupling removal", "Rubber gasket positioning", "Leak-free tightness test", "Pop-up mechanism calibration"],
                "tools": ["Coupling wrench", "Plumber putty", "Teflon tape"],
                "ready": ["Keep new waste coupling ready"],
                "reviews": [{"name": "Manoj T.", "rating": "4.8", "text": "Installed pop-up brass waste coupling on vanity basin."}],
                "faqs": [{"q": "Do you support pop-up bounce couplings?", "a": "Yes, we install both standard grid strainers and push-bounce pop-up waste couplings."}]
            },
            # Drainage & Water Motors
            {
                "slug": "plum-dr-1", "name": "Drain Blockage Removal", "base_price": 399, "duration": "45 mins", "tag": "Best Seller",
                "description": "High pressure water jet flushing or heavy rotary snake clearing for clogged bathroom floor drains.",
                "includes": ["Rotary spring snake clear", "Grease & hair extraction", "Drain flush test", "Nahani trap deodorize"],
                "tools": ["Rotary drain snake (up to 25ft)", "High pressure jet nozzle", "Drain grabber claw"],
                "ready": ["Keep bathroom floor clear"],
                "reviews": [{"name": "Karthik R.", "rating": "5.0", "text": "Extracted huge hair ball and soap clog from bathroom drain in 20 mins."}],
                "faqs": [{"q": "How deep can the drain snake reach?", "a": "Our professional cable snakes reach up to 25 feet into main drainage lines."}]
            },
            {
                "slug": "plum-wt-3", "name": "Motor Installation", "base_price": 799, "duration": "1 hr", "tag": "Motor Fit",
                "description": "Submersible or monoblock water pump motor piping connection, check valve, and union fitting.",
                "includes": ["Inlet/outlet pipe jointing", "Non-return valve fit", "Priming & run test", "Vibration pad mounting"],
                "tools": ["Heavy pipe wrenches", "CPVC/UPVC solvent cement", "Pressure test gauge"],
                "ready": ["Keep water pump motor near the sump or borewell inlet"],
                "reviews": [{"name": "Santosh B.", "rating": "5.0", "text": "Connected 1HP water pump motor with brass non-return valve."}],
                "faqs": [{"q": "Do you install non-return valves (NRV)?", "a": "Yes, NRV is mandatory to maintain water prime and prevent pump dry run."}]
            },
            {
                "slug": "plum-od-1", "name": "30-Minute Plumber Service", "base_price": 199, "duration": "30 mins", "tag": "Express Fix",
                "description": "On-demand expert plumber for quick minor repairs, leak inspection, or small fittings.",
                "includes": ["Rapid response plumber", "30 mins dedicated labor", "Diagnostic & minor fix"],
                "tools": ["Full master plumbing toolkit"],
                "ready": ["Keep list of small plumbing tasks ready"],
                "reviews": [{"name": "Deepa K.", "rating": "5.0", "text": "Fixed 2 small leaks and adjusted kitchen tap in 30 mins."}],
                "faqs": [{"q": "Can multiple small tasks be combined?", "a": "Yes, any minor repairs that fit within 30 minutes are covered."}]
            }
        ]
    },
    "carpentry": {
        "name": "Carpentry Services",
        "description": "Master carpenter services for door locks, custom furniture assembly, wall drilling, modular kitchen & repairs.",
        "packages": [
            # Locks & Handles
            {
                "slug": "carp-lock-1", "name": "Main Door Lock / Handle Installation", "base_price": 199, "duration": "30 mins", "tag": "Essential",
                "description": "Mortise lock fitting, cylindrical lock replace, latch alignment, key smooth turn check.",
                "includes": ["Lock slot chisel & fit", "Latch strike plate alignment", "Key smooth test", "Handle spindle tightening"],
                "tools": ["Wood chisels set", "Hole saw drill bit set", "Rubber mallet", "Screwdriver set"],
                "ready": ["Keep new lock set and keys ready", "Ensure door can remain open during installation"],
                "reviews": [{"name": "Archana G.", "rating": "5.0", "text": "Installed our Godrej mortise handle lock with absolute precision."}],
                "faqs": [{"q": "Can you install digital / smart door locks?", "a": "Yes! We specialize in smart fingerprint and keypad lock installation on wooden and metal core doors."}]
            },
            {
                "slug": "carp-lock-2", "name": "Mortise Lock Repair & Replacement", "base_price": 299, "duration": "45 mins", "tag": "Heavy Lock",
                "description": "Repairing or replacing heavy mortise door locks, handles, and key cylinders.",
                "includes": ["Chisel mortise pocket", "Key cylinder alignment", "Latching check", "Door strike adjustment"],
                "tools": ["Chisel set", "Mortise jig", "Cordless drill"],
                "ready": ["Keep keys and replacement lock ready"],
                "reviews": [{"name": "Nitin B.", "rating": "4.9", "text": "Repaired loose main door handle and sticky cylinder."}],
                "faqs": [{"q": "Why is my door key hard to turn?", "a": "Misaligned strike plate or dried brass cylinder pins. Alignment and graphite lubrication fixes it."}]
            },
            {
                "slug": "carp-lock-3", "name": "Cylindrical Door Lock Installation", "base_price": 249, "duration": "30 mins", "tag": "Popular",
                "description": "Fitting cylindrical knob / lever lock for bedroom and office wooden doors.",
                "includes": ["Hole saw drilling", "Latch mechanism fit", "Key test", "Rose plate tightening"],
                "tools": ["54mm hole saw", "25mm spade bit", "Chisel"],
                "ready": ["Keep cylindrical lock set ready"],
                "reviews": [{"name": "Sunil G.", "rating": "5.0", "text": "Installed round knob lock for bedroom door in 20 minutes."}],
                "faqs": [{"q": "Are privacy push-button locks supported?", "a": "Yes, we install keyless privacy bathroom locks and keyed entrance locks."}]
            },
            {
                "slug": "carp-lock-4", "name": "Door Latch & Tower Bolt Fitting", "base_price": 149, "duration": "20 mins", "tag": "Quick Fit",
                "description": "Installing brass/steel tower bolts, aldrop latches, or magnetic door catchers.",
                "includes": ["Screw pilot drilling", "Tower bolt fit", "Latching check", "Magnetic catcher fit"],
                "tools": ["Cordless screwdriver", "Pilot drill bits", "Level"],
                "ready": ["Keep tower bolts / latches ready"],
                "reviews": [{"name": "Pooja N.", "rating": "4.8", "text": "Installed top and bottom tower bolts on balcony door."}],
                "faqs": [{"q": "Do you install heavy-duty aldrop locks?", "a": "Yes, we install 10-inch to 14-inch heavy brass and stainless steel aldrops."}]
            },
            # Cupboards & Drawers
            {
                "slug": "carp-cup-1", "name": "Cupboard Repair", "base_price": 299, "duration": "45 mins", "tag": "Popular",
                "description": "Fixing sagging cupboard shelves, loose wooden joints, door misalignment, and latch fixes.",
                "includes": ["Shelf support reinforcement", "Hinge adjustment", "Joint glue & screw", "Magnetic catch fit"],
                "tools": ["Wood clamps", "Polyurethane wood glue", "Cordless drill", "Hinges tool"],
                "ready": ["Clear items from the cupboard shelves that need repair"],
                "reviews": [{"name": "Kavita M.", "rating": "5.0", "text": "Reinforced sagging heavy wardrobe shelves. Very sturdy now."}],
                "faqs": [{"q": "Can you fix misaligned wardrobe doors?", "a": "Yes, we adjust European 3D auto-close hinges to eliminate uneven door gaps."}]
            },
            {
                "slug": "carp-cup-4", "name": "Drawer Channel Slide Replacement", "base_price": 199, "duration": "25 mins", "tag": "Smooth Slide",
                "description": "Replacing rusty or broken ball-bearing drawer telescopic channels for quiet sliding.",
                "includes": ["Old channel dismount", "Heavy-duty channel fit", "Slide alignment test", "Ball-bearing lubrication"],
                "tools": ["Screwdriver", "Channel alignment jig", "Level"],
                "ready": ["Empty the drawer and keep new telescopic channels ready"],
                "reviews": [{"name": "Aarav M.", "rating": "5.0", "text": "Replaced sticky kitchen drawer channels. Slides like butter now."}],
                "faqs": [{"q": "What size channels do you install?", "a": "We install 12, 14, 16, 18, 20, and 24-inch telescopic ball-bearing slides."}]
            },
            # Furniture & Assembly
            {
                "slug": "carp-furn-3", "name": "Furniture Assembly", "base_price": 499, "duration": "1 hr", "tag": "Flatpack Assembly",
                "description": "Professional IKEA / Pepperfry flatpack furniture unboxing, cam lock assembly, and leveling.",
                "includes": ["Unboxing & hardware sort", "Cam lock structural assembly", "Stability check", "Felt floor pad fit"],
                "tools": ["Cordless screwdriver with hex bit set", "Rubber mallet", "Spirit level"],
                "ready": ["Keep furniture boxes in the room where assembly will take place", "Ensure ample floor clearance"],
                "reviews": [{"name": "Nitin B.", "rating": "5.0", "text": "Assembled our 3-door wardrobe and king storage bed in less than 2 hours. Super neat work!"}],
                "faqs": [{"q": "Do you assemble hydraulic storage beds?", "a": "Yes, we assemble heavy hydraulic lift beds, study desks, shoe racks, and multi-door wardrobes."}]
            },
            {
                "slug": "carp-furn-1", "name": "Furniture Repair", "base_price": 399, "duration": "1 hr", "tag": "Expert Fix",
                "description": "Tighten loose joints, replace broken wooden slats, wardrobe door realignment, or sofa frame repair.",
                "includes": ["Joint tightening & glueing", "Leveling check", "30-day warranty", "Structural bracing"],
                "tools": ["Corner clamps", "Heavy duty wood screws", "Chisels"],
                "ready": ["Keep damaged furniture accessible"],
                "reviews": [{"name": "Suresh V.", "rating": "4.9", "text": "Repaired 4 wobbly dining chairs. Rock solid now."}],
                "faqs": [{"q": "Can you fix broken wooden bed slats?", "a": "Yes, we replace cracked plywood and hardwood bed support slats."}]
            },
            # Drill & Hanging
            {
                "slug": "carp-drill-1", "name": "Wall Shelf / TV Bracket Mounting", "base_price": 249, "duration": "30 mins", "tag": "Quick Drill",
                "description": "Laser level drilling, rawl plug anchor insertion, heavy concealed bracket shelf fitting.",
                "includes": ["Laser leveling check", "Concealed bracket fitting", "Weight test", "Anchor fastening"],
                "tools": ["Self-leveling crossline laser", "Hammer drill with dust collector", "Heavy wall plugs"],
                "ready": ["Keep shelves or brackets ready", "Decide height and positions on the wall"],
                "reviews": [{"name": "Deepika V.", "rating": "4.9", "text": "Hung 3 heavy mirrors and curtain rods with zero wall cracks. Perfectly level."}],
                "faqs": [{"q": "Can you drill into hard concrete or tiled bathroom walls?", "a": "Yes! Our technicians carry specialized diamond and masonry drill bits that drill cleanly through tiles without cracking."}]
            },
            {
                "slug": "carp-drill-3", "name": "Curtain Rod & Blind Installation", "base_price": 199, "duration": "25 mins", "tag": "Curtain Fit",
                "description": "Single/Double curtain rod bracket drilling, roller blind, or wooden Venetian blind mounting.",
                "includes": ["Rod bracket anchor drilling", "Finial alignment", "Smooth pull check", "Wall anchors"],
                "tools": ["Laser level", "Drill machine", "Measuring tape"],
                "ready": ["Keep curtain rods, finials and brackets ready"],
                "reviews": [{"name": "Meera R.", "rating": "5.0", "text": "Installed 4 window curtain rods perfectly aligned with window frames."}],
                "faqs": [{"q": "Do you install motorized roller blinds?", "a": "Yes, we install manual pull-cord and motorized roller/zebra blinds."}]
            },
            {
                "slug": "carp-od-1", "name": "30-Minute Carpenter Service", "base_price": 199, "duration": "30 mins", "tag": "Express Fix",
                "description": "On-demand expert carpenter for quick minor wood repairs, hinge tuning, or small drill jobs.",
                "includes": ["Rapid response carpenter", "30 mins dedicated labor", "Diagnostic & minor fix"],
                "tools": ["Full master carpentry toolkit"],
                "ready": ["Keep list of small wood/drill tasks ready"],
                "reviews": [{"name": "Anil M.", "rating": "5.0", "text": "Adjusted 3 sticky doors and hung 2 wall clocks in 30 minutes."}],
                "faqs": [{"q": "Can I combine drilling and door adjustments?", "a": "Yes, all small tasks within the 30-minute window are included."}]
            }
        ]
    }
}

total_added = 0
for s_slug, s_data in ALL_SERVICES_DATA.items():
    service, _ = Service.objects.get_or_create(
        slug=s_slug,
        category=category,
        defaults={"name": s_data["name"], "description": s_data["description"], "is_active": True}
    )
    service.name = s_data["name"]
    service.description = s_data["description"]
    service.is_active = True
    service.save()
    print(f"Service: {service.name} (ID: {service.id})")

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
        total_added += 1
        print(f"  [{'CREATED' if created else 'UPDATED'}] {pkg.name} (Rs.{pkg.base_price})")

print(f"\nSuccessfully seeded {total_added} packages across Electrician, Plumbing & Carpentry into Supabase!")
