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

TV_TOOLS = [
    "Digital laser spirit level & wall stud detector",
    "Heavy duty impact hammer drill with diamond masonry & tile drill bits",
    "Digital multimeter & constant current LED backlight strip tester",
    "Anti-static ESD safety wristbands & suction cup LCD panel lifters",
    "Hot air SMD rework station & solder wire for PCB repairs",
    "Cable management ties and organizer spiral casings"
]

TV_READY = [
    "Desired wall mounting height and location chosen",
    "TV remote and working power connection accessible",
    "Set-top box / OTT streaming device and HDMI cables available on site",
    "Surrounding area cleared of fragile items"
]

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

# ── ALL 36 TV & DISPLAY PACKAGES ──
tv_packages = [
    # Subtab 1: TV Service & Repair
    {
        "slug": "tv-srv-1",
        "name": "TV General Service",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Best Seller",
        "popular": True,
        "description": "Complete 21-point TV diagnostic test, panel dust cleaning, port cleaning & voltage stability check.",
        "includes": ["21-point TV audit", "Port & panel cleaning", "Voltage stability check", "Picture & sound calibration"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Prashant M.", "rating": "5.0", "text": "Very detailed 21-point check. Screen picture and sound calibrated perfectly."}],
        "faqs": [{"q": "What is included in TV General Service?", "a": "Internal dust extraction from motherboard, HDMI/USB port contacts cleaning, power supply voltage stability test, and picture color tuning."}]
    },
    {
        "slug": "tv-srv-2",
        "name": "TV Repair",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Expert Fix",
        "popular": True,
        "description": "Comprehensive diagnosis and repair for LED/OLED/QLED TV audio, display or power board issues.",
        "includes": ["Full TV diagnostic", "Faulty component fix", "Safety circuit check", "60-day service warranty"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Girish V.", "rating": "5.0", "text": "Repaired the display signal fault in 45 mins. Outstanding service."}],
        "faqs": [{"q": "Do you repair all TV brands?", "a": "Yes! We service Sony, Samsung, LG, Mi, OnePlus, TCL, Panasonic, and all Smart TV brands."}]
    },
    {
        "slug": "tv-srv-3",
        "name": "TV Not Turning On",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Power Audit",
        "popular": False,
        "description": "Power supply board test, standby red light audit, fuse replacement & main PCB power fix.",
        "includes": ["SMPS power board test", "Fuse & diode replace", "Standby circuit fix", "Burn-in test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Sneha L.", "rating": "5.0", "text": "TV was completely dead with no red light. Fixed power capacitor on-site!"}],
        "faqs": [{"q": "Why is the red light blinking but TV not turning on?", "a": "A blinking red light indicates an internal power supply trip protecting the mainboard from short circuits."}]
    },
    {
        "slug": "tv-srv-4",
        "name": "No Picture Problem",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Display Audit",
        "popular": False,
        "description": "Dark screen with audio diagnostic, LED backlight voltage check, T-Con board test & panel ribbon audit.",
        "includes": ["LED backlight voltage check", "T-Con board test", "Panel ribbon audit", "Backlight tester scan"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Amit H.", "rating": "5.0", "text": "Had sound but completely black screen. Diagnosed backlight driver issue in 20 mins."}],
        "faqs": [{"q": "Can I hear sound even if the picture is completely black?", "a": "Yes! If the LED backlight strips fail, the audio still works but the display appears dark."}]
    },
    {
        "slug": "tv-srv-5",
        "name": "No Sound Problem",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Audio Audit",
        "popular": False,
        "description": "Internal speaker coil test, audio IC audit, auxiliary jack & optical audio output repair.",
        "includes": ["Speaker coil test", "Audio IC testing", "Aux/Optical jack check", "Stereo balance test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Devendra K.", "rating": "5.0", "text": "Fixed the muffled sound and replaced the crackling internal speaker."}],
        "faqs": [{"q": "Why is the TV audio crackling at high volume?", "a": "Torn speaker paper cones or loose voice coils cause audio distortion and need speaker replacement."}]
    },
    {
        "slug": "tv-srv-6",
        "name": "Screen Flickering Problem",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Flicker Fix",
        "popular": False,
        "description": "Panel ribbon connector cleaning, COF IC test, voltage regulator check & flickering fix.",
        "includes": ["COF IC diagnostic", "Ribbon connector clean", "Voltage regulator fix", "Frame stability test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Sameer B.", "rating": "5.0", "text": "Screen stopped flickering. Cleaned the LVDS display cable contacts."}],
        "faqs": [{"q": "What causes the screen to flicker continuously?", "a": "Oxidized display ribbon cables or unstable backlight inverter voltage cause rapid brightness fluctuations."}]
    },

    # Subtab 2: TV Installation & Setup
    {
        "slug": "tv-inst-1",
        "name": "TV Installation",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Recommended",
        "popular": True,
        "description": "Fixed / Tilt wall bracket installation, drill mounting, level verification & cable connections.",
        "includes": ["Wall drilling & bracket fit", "Level balance verification", "HDMI & power setup", "Demo run"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Manoj E.", "rating": "5.0", "text": "Clean wall installation with laser leveling. Great work."}],
        "faqs": [{"q": "Are wall plugs and screws included?", "a": "Yes! Heavy-duty anchor plugs and screws are included in standard installation."}]
    },
    {
        "slug": "tv-inst-2",
        "name": "TV Wall Mounting",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Heavy Mount",
        "popular": True,
        "description": "Heavy-duty drill wall mounting for 32\" to 75\" TVs, heavy anchor fit & wire concealing.",
        "includes": ["Heavy anchor drilling", "Up to 75\" TV support", "Wire layout setup", "Weight stress test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Mounted my 55-inch 4K TV securely on drywall with toggle bolts."}],
        "faqs": [{"q": "Can you mount TV on hollow/drywall partitions?", "a": "Yes! We use heavy-duty toggle anchors designed specifically for hollow cavity and drywall walls."}]
    },
    {
        "slug": "tv-inst-3",
        "name": "TV Uninstallation",
        "base_price": 249,
        "duration": "30 mins",
        "tag": "Safe Dismount",
        "popular": False,
        "description": "Safe removal of TV from wall bracket, wire detachment & bracket dismounting.",
        "includes": ["Wall bracket unmounting", "Cable detachment", "Packaging prep", "Wall hole tidy up"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Radhika S.", "rating": "5.0", "text": "Safely dismounted the TV before our house shifting. Zero scratches."}],
        "faqs": [{"q": "Do you also remove the metal bracket from the wall?", "a": "Yes! We remove the TV and safely unscrew the wall plate without damaging surrounding paint."}]
    },
    {
        "slug": "tv-inst-4",
        "name": "TV Reinstallation",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "Relocate",
        "popular": False,
        "description": "Safe dismounting from old location and new wall bracket drill installation at new spot.",
        "includes": ["Dismount from old spot", "New wall drill installation", "Cable connection & test", "30-day warranty"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Nitin R.", "rating": "5.0", "text": "Relocated TV from living room to master bedroom seamlessly."}],
        "faqs": [{"q": "Can I reuse my existing wall bracket?", "a": "Yes! If your existing bracket is in good structural condition, the technician will remount using it."}]
    },
    {
        "slug": "tv-inst-5",
        "name": "TV Stand Installation",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Table Stand",
        "popular": False,
        "description": "Table top glass / metal leg stand assembly & rubber foot grip fitting.",
        "includes": ["Leg stand screws fit", "Rubber pad alignment", "Table balance check", "Cable clip tidy"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Ashok G.", "rating": "5.0", "text": "Assembled base legs for our new Sony Bravia TV. Level and sturdy."}],
        "faqs": [{"q": "Can you provide replacement table top legs if originals are lost?", "a": "Yes, we offer universal VESA table top pedestal stands as an add-on."}]
    },
    {
        "slug": "tv-inst-6",
        "name": "Smart TV Setup",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Smart Setup",
        "popular": False,
        "description": "Wi-Fi setup, OTT app login, HDMI ARC / eARC setup & voice remote pairing.",
        "includes": ["Wi-Fi network connection", "OTT apps login", "ARC audio link", "Picture profile setup"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Pooja H.", "rating": "5.0", "text": "Configured our soundbar eARC, Netflix 4K HDR and paired the voice remote."}],
        "faqs": [{"q": "Will the technician help connect soundbar and set-top box?", "a": "Yes! Full multi-device input setup and universal HDMI CEC configuration is included."}]
    },

    # Subtab 3: TV Screen & Display
    {
        "slug": "tv-scr-1",
        "name": "Screen Replacement",
        "base_price": 1499,
        "duration": "2 hrs",
        "tag": "Major Panel",
        "popular": False,
        "description": "Original LED/OLED panel assembly replacement with COF bonding & color calibration.",
        "includes": ["Original panel fit", "COF bonding check", "Color & gamma test", "90-day panel warranty"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Karthik P.", "rating": "5.0", "text": "Replaced cracked 43-inch display with original OEM panel. Crystal clear."}],
        "faqs": [{"q": "Is panel replacement cost provided upfront?", "a": "Yes! The technician inspects the exact screen model number and provides a transparent quote before ordering."}]
    },
    {
        "slug": "tv-scr-2",
        "name": "Display Panel Repair",
        "base_price": 999,
        "duration": "1.5 hrs",
        "tag": "Panel Fix",
        "popular": True,
        "description": "Panel T-Con logic board repair, ribbon COF bonding repair & display driver IC fix.",
        "includes": ["T-Con board repair", "COF ribbon bonding", "Display driver IC swap", "Gamma calibration"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Rohan P.", "rating": "5.0", "text": "Repaired the T-Con board without needing an expensive panel replacement!"}],
        "faqs": [{"q": "What is the function of the T-Con board?", "a": "The Timing Controller (T-Con) board converts video signals into vertical and horizontal pixel driving voltages."}]
    },
    {
        "slug": "tv-scr-3",
        "name": "Backlight Repair",
        "base_price": 899,
        "duration": "1.5 hrs",
        "tag": "Brightness",
        "popular": True,
        "description": "Full set replacement of burnt LED backlight strips to restore uniform 100% screen brightness.",
        "includes": ["Diffuser removal", "Full LED strip swap", "Uniform brightness check", "60-day warranty"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Tanvi C.", "rating": "5.0", "text": "Fixed dark patches on screen. All LED strips replaced with genuine parts."}],
        "faqs": [{"q": "Do you replace all LED strips or just the burnt one?", "a": "We always replace the entire set of LED strips to ensure perfectly uniform brightness and long lifespan."}]
    },
    {
        "slug": "tv-scr-4",
        "name": "Screen Flickering Repair",
        "base_price": 699,
        "duration": "1 hr",
        "tag": "Flicker Free",
        "popular": False,
        "description": "Fix display flickering, horizontal jitter lines, backlight voltage drop & panel refresh fix.",
        "includes": ["Backlight driver test", "Jitter filter fix", "Panel refresh test", "Burn-in check"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Vikram S.", "rating": "5.0", "text": "Resolved horizontal screen jitter. Replaced faulty filtering capacitor on T-Con board."}],
        "faqs": [{"q": "What causes horizontal jitter lines?", "a": "Unstable clock signals or gate driver IC failure causes horizontal line flickering."}]
    },
    {
        "slug": "tv-scr-5",
        "name": "Vertical/Horizontal Line Repair",
        "base_price": 799,
        "duration": "1.5 hrs",
        "tag": "Line Fix",
        "popular": False,
        "description": "Fix single or multiple vertical/horizontal lines on screen via tab bonding & COF fix.",
        "includes": ["Tab bonding repair", "COF IC bonding", "Line removal verification", "Color bar test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Neelam K.", "rating": "5.0", "text": "Removed a green vertical line running down the middle of the screen. Excellent technician."}],
        "faqs": [{"q": "Can single colored vertical lines be fixed?", "a": "Yes! Vertical lines are usually caused by loose Chip-On-Film (COF) bonding ribbons which are re-bonded."}]
    },
    {
        "slug": "tv-scr-6",
        "name": "Display Color Problem",
        "base_price": 599,
        "duration": "45 mins",
        "tag": "Color Tuning",
        "popular": False,
        "description": "Fix inverted colors, negative screen display, magenta tint, or gamma voltage IC repair.",
        "includes": ["Gamma IC voltage check", "Inverted screen code fix", "Color balance calibration", "Factory color reset"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Alok S.", "rating": "5.0", "text": "Screen turned into negative ghost colors. Repaired gamma IC and colors are perfect."}],
        "faqs": [{"q": "Why does my TV look like a negative x-ray film?", "a": "A faulty gamma reference IC on the T-Con board distorts grayscale luminance values into negative colors."}]
    },

    # Subtab 4: TV Sound & Speaker
    {
        "slug": "tv-snd-1",
        "name": "Speaker Repair",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Speaker Fix",
        "popular": True,
        "description": "Internal stereo speaker coil repair, paper cone replacement or new speaker unit fit.",
        "includes": ["Speaker coil rewinding", "Paper cone replace", "Stereo balance test", "Vibration damping"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Kavita J.", "rating": "5.0", "text": "Fitted new OEM internal speakers. Sound is crisp and loud."}],
        "faqs": [{"q": "Are replacement speakers original?", "a": "Yes, we use brand-matched stereo speaker drivers matching exact ohms and wattage specifications."}]
    },
    {
        "slug": "tv-snd-2",
        "name": "No Sound Repair",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Audio Restore",
        "popular": False,
        "description": "Audio amplifier IC replacement, mute circuit reset & audio line trace repair.",
        "includes": ["Audio amp IC replace", "Mute switch reset", "Line trace repair", "Headphone jack test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Harish B.", "rating": "5.0", "text": "TV was muted even when volume was 100. Replaced the audio IC on motherboard."}],
        "faqs": [{"q": "Why is there picture but zero audio?", "a": "Audio amplifier IC failure or stuck headphone sensing microswitches are common causes."}]
    },
    {
        "slug": "tv-snd-3",
        "name": "Distorted Sound Repair",
        "base_price": 449,
        "duration": "45 mins",
        "tag": "Clarity Fix",
        "popular": False,
        "description": "Fix cracking/buzzing audio, speaker vibration dampening & voice coil alignment.",
        "includes": ["Vibration pad damping", "Voice coil centering", "High volume test", "Bass distortion test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Naveen P.", "rating": "5.0", "text": "Removed annoying buzzing vibrations during bass scenes."}],
        "faqs": [{"q": "Why does the TV cabinet vibrate when actors speak?", "a": "Loose internal speaker mounting brackets or cracked speaker enclosures cause cabinet rattling."}]
    },
    {
        "slug": "tv-snd-4",
        "name": "Audio Port Repair",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Port Repair",
        "popular": False,
        "description": "3.5mm Aux jack solder repair, Optical TOSLINK port swap & HDMI ARC audio fix.",
        "includes": ["3.5mm Aux jack solder", "Optical port swap", "ARC signal check", "Gold pin continuity test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Arun K.", "rating": "5.0", "text": "Optical audio port had snapped off. Soldered a new TOSLINK jack in 30 mins."}],
        "faqs": [{"q": "Can you fix broken optical audio flaps?", "a": "Yes, we replace the entire optical transmitter block on the TV motherboard."}]
    },
    {
        "slug": "tv-snd-5",
        "name": "Sound System Setup",
        "base_price": 499,
        "duration": "45 mins",
        "tag": "Soundbar Fit",
        "popular": False,
        "description": "Soundbar wall mounting, optical / HDMI eARC cable setup, subwoofer placement & surround tuning.",
        "includes": ["Soundbar wall fit", "Optical / eARC setup", "Surround sound test", "Dolby Atmos check"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Shruti B.", "rating": "5.0", "text": "Mounted our 5.1 Dolby Atmos soundbar with hidden wiring. Cinematic experience!"}],
        "faqs": [{"q": "Do you configure Dolby Atmos eARC audio?", "a": "Yes! We enable uncompressed passthrough audio formats in TV expert audio settings."}]
    },
    {
        "slug": "tv-snd-6",
        "name": "Bluetooth Audio Setup",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "Wireless",
        "popular": False,
        "description": "Pairing wireless Bluetooth headphones / soundbars & low latency audio sync.",
        "includes": ["Bluetooth pairing", "Latency sync check", "Multi-device test", "Range verification"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Mohit T.", "rating": "5.0", "text": "Paired wireless Bluetooth headphones for late-night TV viewing with zero audio delay."}],
        "faqs": [{"q": "Can older TVs without Bluetooth connect to wireless headphones?", "a": "Yes! We can install a compact optical-to-Bluetooth transmitter on your TV."}]
    },

    # Subtab 5: TV Software & Smart Features
    {
        "slug": "tv-soft-1",
        "name": "Smart TV Setup",
        "base_price": 349,
        "duration": "30 mins",
        "tag": "Smart Features",
        "popular": True,
        "description": "Complete Android TV / Tizen / WebOS setup, account sync & picture mode tuning.",
        "includes": ["OS initial configuration", "Account sign in", "Picture mode tuning", "Audio profile calibration"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Suresh J.", "rating": "5.0", "text": "Configured Google Assistant voice commands and tuned 4K HDR picture mode."}],
        "faqs": [{"q": "Will the technician set up Disney+ Hotstar and Prime Video?", "a": "Yes! We install and log in all your preferred streaming applications."}]
    },
    {
        "slug": "tv-soft-2",
        "name": "Software Update",
        "base_price": 299,
        "duration": "25 mins",
        "tag": "Firmware",
        "popular": False,
        "description": "Firmware flashing via USB/OTA to fix app crashes, boot loops & sluggish OS.",
        "includes": ["Latest OS firmware flash", "Cache wipe", "Boot speed test", "App compatibility check"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Kishore M.", "rating": "5.0", "text": "TV was stuck on loading logo. Flashed official recovery firmware and saved the TV."}],
        "faqs": [{"q": "Can firmware updates fix TV reboot loops?", "a": "Yes! Re-flashing clean factory firmware over USB resolves corrupted boot partitions."}]
    },
    {
        "slug": "tv-soft-3",
        "name": "App Installation",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "App Store",
        "popular": False,
        "description": "Installation & configuration of Netflix, Prime, YouTube, Hotstar & IPTV streaming apps.",
        "includes": ["OTT apps install", "Sideloading support", "4K playback test", "App organizer setup"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Rajesh V.", "rating": "5.0", "text": "Installed regional media player apps and set up fast home screen shortcuts."}],
        "faqs": [{"q": "Can you sideload apps not available on the official store?", "a": "Yes, our technicians can safely sideload certified Android TV APK packages."}]
    },
    {
        "slug": "tv-soft-4",
        "name": "Wi-Fi Connection Setup",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "Network",
        "popular": False,
        "description": "Dual band 2.4GHz / 5GHz Wi-Fi connection fix, DNS configuration & network speed test.",
        "includes": ["Wi-Fi module test", "Custom DNS config", "Bandwidth speed check", "Static IP setup if needed"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Shalini M.", "rating": "5.0", "text": "Fixed frequent Wi-Fi disconnection issue on our Samsung Smart TV."}],
        "faqs": [{"q": "Why does my TV keep disconnecting from Wi-Fi?", "a": "Weak 5GHz signal drops or DNS resolver timeouts cause disconnects, fixed by configuring custom high-speed DNS."}]
    },
    {
        "slug": "tv-soft-5",
        "name": "Remote Pairing",
        "base_price": 199,
        "duration": "15 mins",
        "tag": "Remote Pair",
        "popular": False,
        "description": "Smart Bluetooth / RF voice remote pairing & IR blaster universal code setup.",
        "includes": ["Bluetooth remote sync", "Voice search config", "IR code programming", "Battery health test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Priyanka S.", "rating": "5.0", "text": "Paired new Magic Remote with LG OLED TV. Voice search works seamlessly."}],
        "faqs": [{"q": "Can one remote control both TV and setup box?", "a": "Yes! Universal HDMI-CEC and IR blaster pairing allows a single remote to control both."}]
    },
    {
        "slug": "tv-soft-6",
        "name": "Factory Reset & Configuration",
        "base_price": 299,
        "duration": "30 mins",
        "tag": "Master Reset",
        "popular": False,
        "description": "Full factory master reset, memory cache clearing & user preferences setup.",
        "includes": ["Master system reset", "Memory wipe", "Initial wizard setup", "Network & app re-sync"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Sanjay D.", "rating": "5.0", "text": "Cleared 4 years of cached storage. TV runs fast and snappy like brand new."}],
        "faqs": [{"q": "Will factory reset speed up a sluggish TV?", "a": "Yes! Clearing corrupted app cache and background telemetry frees up internal RAM."}]
    },

    # Subtab 6: TV Parts & Electrical Repair
    {
        "slug": "tv-prt-1",
        "name": "Power Supply Repair",
        "base_price": 799,
        "duration": "1 hr",
        "tag": "SMPS Fix",
        "popular": True,
        "description": "SMPS power supply board repair, burst capacitor replacement, diode & fuse fix.",
        "includes": ["SMPS board repair", "High voltage diode replace", "Voltage regulator fix", "60-day warranty"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Tarun K.", "rating": "5.0", "text": "Repaired the blown power board after voltage spike. Saved thousands on new board."}],
        "faqs": [{"q": "Are surge protector repairs covered by warranty?", "a": "Yes! All power supply component repairs carry a 60-day replacement warranty."}]
    },
    {
        "slug": "tv-prt-2",
        "name": "Motherboard Repair",
        "base_price": 999,
        "duration": "1.5 hrs",
        "tag": "Logic Board",
        "popular": True,
        "description": "Main logic board BGA CPU reballing, HDMI controller IC swap & EEPROM firmware fix.",
        "includes": ["CPU BGA check", "HDMI controller swap", "EEPROM IC flash", "Full port diagnostic"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Ananya D.", "rating": "5.0", "text": "Repaired motherboard HDMI IC after lightning surge. All 3 ports working."}],
        "faqs": [{"q": "Can HDMI ports burnt by lightning be repaired?", "a": "Yes! We desolder the shorted HDMI ESD protector IC and replace damaged controller chips."}]
    },
    {
        "slug": "tv-prt-3",
        "name": "HDMI Port Repair",
        "base_price": 599,
        "duration": "1 hr",
        "tag": "HDMI Swap",
        "popular": False,
        "description": "Desoldering broken 4K HDMI port connector & soldering brand new gold-plated female jack.",
        "includes": ["Broken port desolder", "4K HDMI jack solder", "Signal continuity test", "4K 60Hz video test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Ramesh N.", "rating": "5.0", "text": "Gold plated replacement HDMI port soldered with precision. PlayStation 5 detects 4K HDR."}],
        "faqs": [{"q": "Do you support HDMI 2.1 120Hz ports?", "a": "Yes! We solder OEM HDMI 2.0 and HDMI 2.1 high-bandwidth gold connectors."}]
    },
    {
        "slug": "tv-prt-4",
        "name": "USB Port Repair",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "USB Swap",
        "popular": False,
        "description": "Replacing damaged USB 2.0 / 3.0 ports on TV mainboard for media playback.",
        "includes": ["USB jack replacement", "Power pin solder", "Flash drive test", "Current protection check"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Bhavna P.", "rating": "5.0", "text": "Fixed the loose USB port that was disconnecting hard drives."}],
        "faqs": [{"q": "Can broken plastic pins inside USB ports be replaced?", "a": "Yes, we replace the entire soldered USB metal connector block."}]
    },
    {
        "slug": "tv-prt-5",
        "name": "Remote Repair",
        "base_price": 249,
        "duration": "20 mins",
        "tag": "Remote Fix",
        "popular": False,
        "description": "Remote keypad membrane cleaning, IR transmitter LED solder & battery terminal fix.",
        "includes": ["Keypad carbon clean", "IR LED resolder", "Battery terminal descaling", "Signal power test"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Meenakshi S.", "rating": "5.0", "text": "Cleaned sticky remote buttons and soldered loose battery contact. Works like new."}],
        "faqs": [{"q": "Why do some buttons on the remote stop responding?", "a": "Conductive carbon pads on the silicone rubber membrane wear out over time and can be restored."}]
    },
    {
        "slug": "tv-prt-6",
        "name": "Capacitor & Component Replacement",
        "base_price": 399,
        "duration": "45 mins",
        "tag": "Component Swap",
        "popular": False,
        "description": "Metalized film & electrolytic capacitor replacement on TV boards.",
        "includes": ["Capacitor microfarad audit", "Low-ESR capacitor swap", "Circuit stress test", "Clean board wash"],
        "tools": TV_TOOLS,
        "ready": TV_READY,
        "reviews": [{"name": "Sunil V.", "rating": "5.0", "text": "Swapped bulging capacitors on the inverter board. TV boots instantly now."}],
        "faqs": [{"q": "How do bulging capacitors affect a TV?", "a": "Aging electrolytic capacitors lose charge, causing slow startup, clicking noises, or sudden power cuts."}]
    }
]

# Get or create TV service
tv_svc, _ = Service.objects.get_or_create(category=cat, slug="tv-display", defaults={"name": "TV & Display"})
tv_svc.name = "TV & Display"
tv_svc.save()

seeded_count = 0
for p_data in tv_packages:
    slug = p_data["slug"]
    pkg, created = Package.objects.get_or_create(
        slug=slug,
        defaults={
            "service": tv_svc,
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
            "image": "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&q=80&fit=crop"
        }
    )
    if not created:
        pkg.service = tv_svc
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
    seeded_count += 1
    print(f"  [{'CREATED' if created else 'UPDATED'}] TV & Display -> {pkg.name} (slug: {slug}, Rs.{pkg.base_price})")

print(f"\nSuccessfully seeded ALL {seeded_count} TV & Display packages into Supabase!")
